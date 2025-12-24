import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import { User, ChecklistEntry, Shift, ChecklistType, ItemStatus, Vehicle, ChecklistItem, Approval } from './types';
import { CHECKLIST_ITEMS } from './constants';
import { 
  ClipboardDocumentCheckIcon, 
  ArrowRightOnRectangleIcon, 
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  WrenchIcon,
  XCircleIcon,
  CloudIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const INITIAL_ITEMS: ChecklistItem[] = Array.isArray(CHECKLIST_ITEMS) ? CHECKLIST_ITEMS : [];

const SignaturePad: React.FC<{ onSave: (data: string) => void, onClear: () => void, hasSignature: boolean }> = ({ onSave, onClear, hasSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }, []);

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onClear();
    }
  };

  return (
    <div className="space-y-2">
      <div className={`relative border-2 rounded-xl bg-white overflow-hidden touch-none transition-all ${hasSignature ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
        <canvas ref={canvasRef} className="w-full h-[150px] cursor-crosshair" onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseMove={draw} onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw} />
        <div className="absolute top-2 right-2">
          <button type="button" onClick={clear} className="text-[10px] bg-gray-100 px-3 py-1 rounded font-bold hover:bg-red-50 hover:text-red-600 border border-gray-200 uppercase">Limpar</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'FORM' | 'DETAIL' | 'ADMIN'>('LOGIN');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [users] = useState<User[]>([
    { id: '1', name: 'Administrador Principal', role: 'ADMIN', username: 'admin', matricula: '001' },
    { id: '2', name: 'Operador Padrão', role: 'OPERADOR', username: 'operador', matricula: '123' }
  ]);
  const [selectedEntry, setSelectedEntry] = useState<ChecklistEntry | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('solurb_user');
    const savedEntries = localStorage.getItem('solurb_entries');
    
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
          setView('DASHBOARD');
        }
      } catch (e) { localStorage.removeItem('solurb_user'); }
    }
    
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        if (Array.isArray(parsed)) setEntries(parsed);
      } catch (e) { localStorage.removeItem('solurb_entries'); }
    }

    if (supabase) {
      fetchCloudData();
    }
  }, []);

  const fetchCloudData = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('checklist_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const cloudEntries = data.map(item => item.entry_data as ChecklistEntry);
        setEntries(prev => {
          const merged = [...cloudEntries];
          prev.forEach(p => { 
            if (!merged.find(m => m.id === p.id)) merged.push(p); 
          });
          const sorted = merged.sort((a, b) => b.createdAt - a.createdAt);
          localStorage.setItem('solurb_entries', JSON.stringify(sorted));
          return sorted;
        });
      }
    } catch (err) {
      console.warn("Sync falhou, operando em modo local:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const loginInput = (formData.get('username') as string || '').trim();
    const passwordInput = (formData.get('password') as string || '').trim();
    const found = users.find(u => u.username === loginInput || u.name === loginInput);
    if (found) {
      if (found.role === 'OPERADOR' && found.matricula !== passwordInput) {
        alert("Matrícula incorreta.");
        return;
      }
      setUser(found);
      localStorage.setItem('solurb_user', JSON.stringify(found));
      setView('DASHBOARD');
    } else {
      alert("Usuário não cadastrado.");
    }
  };

  const saveEntry = async (entry: ChecklistEntry) => {
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    localStorage.setItem('solurb_entries', JSON.stringify(newEntries));
    setView('DASHBOARD');

    if (supabase) {
      try {
        await supabase.from('checklist_entries').upsert({
          id: entry.id,
          entry_data: entry,
          created_at: new Date(entry.createdAt).toISOString()
        });
      } catch (err) {
        console.error("Erro ao salvar na nuvem:", err);
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('solurb_user');
    setView('LOGIN');
  };

  if (!user && view === 'LOGIN') return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="bg-blue-600 p-1.5 rounded-lg"><ClipboardDocumentCheckIcon className="w-6 h-6 text-white" /></div>
            <h1 className="font-bold text-gray-900">EcoCheck <span className="text-blue-600">Solurb</span></h1>
          </div>
          <div className="flex items-center gap-4">
            {isSyncing && <CloudIcon className="w-5 h-5 text-blue-400 animate-pulse" />}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{String(user?.name || '')}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none">{String(user?.role || '')}</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button onClick={() => setView('DASHBOARD')} className={`p-2 rounded-md ${view === 'DASHBOARD' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Squares2X2Icon className="w-4 h-4"/></button>
               {user?.role === 'ADMIN' && <button onClick={() => setView('ADMIN')} className={`p-2 rounded-md ${view === 'ADMIN' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Cog6ToothIcon className="w-4 h-4"/></button>}
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><ArrowRightOnRectangleIcon className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-20">
        {view === 'DASHBOARD' && <Dashboard entries={entries} onNew={() => setView('FORM')} onView={(e) => { setSelectedEntry(e); setView('DETAIL'); }} />}
        {view === 'FORM' && <ChecklistForm user={user!} criteria={INITIAL_ITEMS} onCancel={() => setView('DASHBOARD')} onSave={saveEntry} />}
        {view === 'DETAIL' && selectedEntry && <EntryDetail entry={selectedEntry} onBack={() => setView('DASHBOARD')} />}
        {view === 'ADMIN' && <AdminPanel entries={entries} onRefresh={fetchCloudData} isSyncing={isSyncing} />}
      </main>
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (e: any) => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-blue-800">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
      <div className="text-center">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardDocumentCheckIcon className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">EcoCheck Solurb</h2>
        <p className="text-sm text-gray-500">Gestão de Checklists de Frota</p>
      </div>
      <form onSubmit={onLogin} className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Usuário</label>
          <input required name="username" className="w-full p-4 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 font-medium" placeholder="Ex: admin" />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Senha ou Matrícula</label>
          <input name="password" type="password" className="w-full p-4 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 font-medium" placeholder="••••••••" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95">Acessar Sistema</button>
      </form>
    </div>
  </div>
);

const Dashboard: React.FC<{ entries: ChecklistEntry[]; onNew: () => void; onView: (e: ChecklistEntry) => void }> = ({ entries, onNew, onView }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Painel de Vistorias</h2>
      <button onClick={onNew} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all"><PlusIcon className="w-5 h-5"/> Nova Vistoria</button>
    </div>
    <div className="grid gap-3">
      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border-2 border-dashed rounded-3xl">
          <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="font-bold">Nenhum registro encontrado</p>
          <p className="text-xs">As vistorias aparecerão aqui após sincronização.</p>
        </div>
      ) : entries.map(entry => (
        <div key={entry.id} onClick={() => onView(entry)} className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${entry.hasIssues ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {entry.hasIssues ? <ExclamationCircleIcon className="w-6 h-6"/> : <CheckCircleIcon className="w-6 h-6"/>}
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg uppercase leading-tight">{String(entry.prefix || 'SEM PREFIXO')}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">{String(entry.date || '')} • {String(entry.driverName || 'CONDUTOR NÃO INFORMADO')}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"/>
        </div>
      ))}
    </div>
  </div>
);

const ChecklistForm: React.FC<{ user: User; criteria: ChecklistItem[]; onCancel: () => void; onSave: (entry: ChecklistEntry) => void }> = ({ user, criteria, onCancel, onSave }) => {
  const [step, setStep] = useState(1);
  const [signature, setSignature] = useState<string | undefined>();
  const [formData, setFormData] = useState<Partial<ChecklistEntry>>({
    date: new Date().toISOString().split('T')[0],
    shift: Shift.DIURNO,
    type: ChecklistType.SAIDA,
    items: {},
    generalObservations: '',
    userId: user.id
  });

  const groupedItems = useMemo(() => {
    return criteria.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);
  }, [criteria]);

  const handleItemStatus = (itemId: number, status: ItemStatus) => {
    setFormData(prev => ({
      ...prev,
      items: { ...prev.items, [itemId]: { status, vistoria: true } }
    }));
  };

  const handleSave = () => {
    if (!formData.prefix || !formData.driverName || !signature) { 
      alert("Por favor, preencha o prefixo, o condutor e assine o documento para finalizar."); 
      return; 
    }
    const hasIssues = Object.values(formData.items || {}).some(i => i.status !== ItemStatus.OK);
    const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).substring(2, 15);
    
    onSave({ 
      ...formData as ChecklistEntry, 
      id, 
      createdAt: Date.now(), 
      operatorSignature: signature,
      hasIssues 
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center space-y-2">
         <button onClick={onCancel} className="flex items-center gap-1 text-red-500 font-black uppercase text-xs hover:bg-red-50 px-3 py-1 rounded-full transition-colors">
            <XCircleIcon className="w-4 h-4"/> Cancelar Vistoria
         </button>
         <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Formulário de Vistoria</h2>
         <div className="flex gap-2">
            {[1, 2, 3].map(i => (
               <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`}/>
            ))}
         </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-xl overflow-hidden transition-all">
        {step === 1 && (
          <div className="p-8 space-y-6 animate-fadeIn">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Passo 1: Dados do Veículo</h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome do Condutor</label>
                <input placeholder="Ex: João Silva" onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none font-bold focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Prefixo do Veículo</label>
                <input placeholder="Ex: SOL-001" onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none font-bold uppercase focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">KM Atual</label>
                  <input type="number" placeholder="00000" onChange={e => setFormData({...formData, km: Number(e.target.value)})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Horímetro</label>
                  <input type="number" placeholder="000" onChange={e => setFormData({...formData, horimetro: Number(e.target.value)})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none font-bold" />
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">Continuar Checklist</button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-[75vh] animate-fadeIn">
            <div className="p-6 border-b bg-gray-50/50">
               <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Passo 2: Verificação Técnica</h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Selecione o estado de cada item abaixo</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tighter bg-gray-100 py-1.5 px-4 rounded-full inline-block">{String(category || 'GERAL')}</h4>
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <p className="text-sm font-black text-gray-700 uppercase tracking-tight leading-tight">{String(item.label || '')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.OK)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.items?.[item.id]?.status === ItemStatus.OK ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>OK</button>
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.FALTA)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.items?.[item.id]?.status === ItemStatus.FALTA ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>Falta</button>
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.DEFEITUOSO)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.items?.[item.id]?.status === ItemStatus.DEFEITUOSO ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>Defeito</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-white flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Voltar</button>
              <button onClick={() => setStep(3)} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Ir para Assinatura</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 space-y-8 animate-fadeIn">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Passo 3: Finalização</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Observações Gerais</label>
                <textarea rows={3} placeholder="Escreva aqui qualquer irregularidade adicional..." onChange={e => setFormData({...formData, generalObservations: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Assinatura do Operador</label>
                <SignaturePad hasSignature={!!signature} onSave={setSignature} onClear={() => setSignature(undefined)} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black uppercase text-xs">Voltar</button>
              <button onClick={handleSave} className="flex-[2] bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95">Salvar Vistoria</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EntryDetail: React.FC<{ entry: ChecklistEntry; onBack: () => void }> = ({ entry, onBack }) => (
  <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
    <button onClick={onBack} className="bg-white px-5 py-2.5 rounded-xl border font-black uppercase text-[10px] text-blue-600 flex items-center gap-2 hover:bg-blue-50 transition-all shadow-sm">← Voltar para Painel</button>
    <div className="bg-white p-10 rounded-3xl border shadow-xl space-y-8">
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h2 className="text-4xl font-black text-blue-600 uppercase tracking-tighter leading-none">{String(entry.prefix || 'N/A')}</h2>
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">{String(entry.date || '')} • {String(entry.type || 'SAÍDA')}</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${entry.hasIssues ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
          {entry.hasIssues ? 'Pendências Detectadas' : 'Veículo em Conformidade'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-10">
        <div>
          <p className="text-gray-400 uppercase text-[10px] font-black mb-1">Responsável</p>
          <p className="font-black text-gray-800 uppercase text-lg leading-tight">{String(entry.driverName || 'NÃO INFORMADO')}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase text-[10px] font-black mb-1">Leituras</p>
          <p className="font-black text-gray-800 uppercase text-lg leading-tight">{Number(entry.km || 0)} KM • {Number(entry.horimetro || 0)} H</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-1 tracking-widest">Relatório Técnico de Itens</h4>
        <div className="grid gap-2">
          {Object.entries(entry.items || {}).map(([id, info]) => {
            const item = INITIAL_ITEMS.find(i => i.id === Number(id));
            if (!item || !info || info.status === ItemStatus.OK) return null;
            return (
              <div key={id} className="flex justify-between items-center text-xs p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                <span className="font-black text-gray-700 uppercase tracking-tight">{String(item.label || 'Item Desconhecido')}</span>
                <span className={`font-black uppercase px-3 py-1 rounded-full text-[9px] shadow-sm ${info.status === ItemStatus.DEFEITUOSO ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  {String(info.status || 'FALTA')}
                </span>
              </div>
            );
          })}
          {!entry.hasIssues && (
            <div className="flex items-center gap-3 p-5 bg-green-50 rounded-2xl border border-green-100 text-green-700">
               <CheckCircleIcon className="w-6 h-6"/>
               <p className="text-xs font-bold uppercase tracking-tight">Vistoria realizada com sucesso: Nenhum defeito ou falta detectada.</p>
            </div>
          )}
        </div>
      </div>

      {entry.generalObservations && (
        <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100/50">
          <p className="text-gray-400 uppercase text-[10px] font-black mb-2">Observações Adicionais</p>
          <p className="text-sm font-medium text-gray-700 italic">"{String(entry.generalObservations)}"</p>
        </div>
      )}

      {entry.operatorSignature && (
        <div className="pt-8 border-t border-gray-100">
          <p className="text-gray-400 uppercase text-[10px] font-black mb-4 flex items-center gap-2">
             <CloudArrowUpIcon className="w-4 h-4"/> Autenticação Digital do Operador
          </p>
          <div className="bg-gray-50 rounded-3xl p-6 border border-dashed border-gray-300 flex justify-center shadow-inner">
             <img src={entry.operatorSignature} className="h-32 object-contain" alt="Assinatura" />
          </div>
        </div>
      )}
    </div>
  </div>
);

const AdminPanel: React.FC<any> = ({ entries, onRefresh, isSyncing }) => (
  <div className="max-w-2xl mx-auto space-y-6 text-center animate-fadeIn">
    <div className="bg-white p-10 rounded-3xl border shadow-xl">
      <h2 className="text-2xl font-black uppercase text-gray-900 mb-2 tracking-tighter leading-none">Administração de Frota</h2>
      <p className="text-xs text-gray-400 mb-8 uppercase font-bold tracking-widest">Visão Geral de Conformidade</p>
      
      <div className="grid grid-cols-2 gap-6 my-10">
        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm transition-transform hover:scale-105">
          <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Total Registrado</p>
          <p className="text-6xl font-black text-blue-600 mt-2">{entries.length}</p>
        </div>
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-sm transition-transform hover:scale-105">
          <p className="text-[10px] text-red-400 uppercase font-black tracking-widest">Com Irregularidade</p>
          <p className="text-6xl font-black text-red-600 mt-2">{entries.filter((e: any) => e.hasIssues).length}</p>
        </div>
      </div>
      
      <button 
        disabled={isSyncing}
        onClick={onRefresh} 
        className={`w-full flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black active:scale-95'}`}
      >
        <ArrowPathIcon className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`}/> 
        {isSyncing ? 'Sincronizando Nuvem...' : 'Sincronizar com Supabase'}
      </button>
      
      {!supabase && (
        <div className="mt-8 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-center gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-orange-500"/>
          <p className="text-[10px] text-orange-600 font-black uppercase tracking-tight">Ambiente de Teste: Persistência Local Ativada</p>
        </div>
      )}
    </div>
  </div>
);

export default App;