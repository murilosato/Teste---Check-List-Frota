
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import { User, ChecklistEntry, Shift, ChecklistType, ItemStatus, Vehicle, ChecklistItem, Approval } from './types';
import { CHECKLIST_ITEMS as INITIAL_ITEMS } from './constants';
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
  XCircleIcon
} from '@heroicons/react/24/outline';

// --- Componentes Auxiliares ---

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
        <div className="absolute top-2 right-2"><button type="button" onClick={clear} className="text-[10px] bg-gray-100 px-3 py-1 rounded font-bold hover:bg-red-50 hover:text-red-600 border border-gray-200 uppercase">Limpar</button></div>
      </div>
    </div>
  );
};

// --- App Principal ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'FORM' | 'DETAIL' | 'ADMIN'>('LOGIN');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [criteria] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [selectedEntry, setSelectedEntry] = useState<ChecklistEntry | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('solurb_user');
    const savedEntries = localStorage.getItem('solurb_entries');
    const savedUsersList = localStorage.getItem('solurb_users_list');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    
    if (savedUsersList) {
      setUsers(JSON.parse(savedUsersList));
    } else {
      const defaultUsers: User[] = [
        { id: '1', name: 'Administrador Principal', role: 'ADMIN', username: 'admin', matricula: '001' },
        { id: '2', name: 'Operador Padrão', role: 'OPERADOR', username: 'operador', matricula: '123' }
      ];
      setUsers(defaultUsers);
    }
    fetchCloudData();
  }, []);

  const fetchCloudData = async () => {
    if (!supabase) return;
    try {
      const { data: eData } = await supabase.from('checklist_entries').select('entry_data');
      if (eData) {
        const cloudEntries = eData.map(d => d.entry_data as ChecklistEntry);
        setEntries(prev => {
          const merged = [...cloudEntries];
          prev.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
          const sorted = merged.sort((a, b) => b.createdAt - a.createdAt);
          localStorage.setItem('solurb_entries', JSON.stringify(sorted));
          return sorted;
        });
      }
    } catch (err) { console.warn("Modo offline."); }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const loginInput = (formData.get('username') as string).trim();
    const passwordInput = (formData.get('password') as string).trim();
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
      try { await supabase.from('checklist_entries').insert([{ id: entry.id, entry_data: entry }]); }
      catch (err) { console.error("Erro no backup:", err); }
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="bg-blue-600 p-1.5 rounded-lg"><ClipboardDocumentCheckIcon className="w-6 h-6 text-white" /></div>
            <h1 className="font-bold text-gray-900">EcoCheck <span className="text-blue-600">Solurb</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{user?.name}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase leading-none">{user?.role}</p>
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
        {view === 'FORM' && <ChecklistForm user={user!} criteria={criteria} onCancel={() => setView('DASHBOARD')} onSave={saveEntry} />}
        {view === 'DETAIL' && selectedEntry && <EntryDetail entry={selectedEntry} onBack={() => setView('DASHBOARD')} />}
        {view === 'ADMIN' && <AdminPanel entries={entries} onRefresh={fetchCloudData} />}
      </main>
    </div>
  );
};

// --- Sub-Componentes ---

const LoginScreen: React.FC<{ onLogin: (e: any) => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-blue-600">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div className="text-center">
        <ClipboardDocumentCheckIcon className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-2xl font-bold mt-2">EcoCheck Solurb</h2>
      </div>
      <form onSubmit={onLogin} className="space-y-4">
        <input required name="username" className="w-full p-4 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Usuário" />
        <input name="password" type="password" className="w-full p-4 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Senha/Matrícula" />
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">Acessar Sistema</button>
      </form>
    </div>
  </div>
);

const Dashboard: React.FC<{ entries: ChecklistEntry[]; onNew: () => void; onView: (e: ChecklistEntry) => void }> = ({ entries, onNew, onView }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Painel de Vistorias</h2>
      <button onClick={onNew} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"><PlusIcon className="w-5 h-5"/> Nova Vistoria</button>
    </div>
    <div className="grid gap-3">
      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border-2 border-dashed rounded-3xl">
          <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="font-bold">Nenhum registro encontrado</p>
          <p className="text-xs">Clique em "Nova Vistoria" para começar</p>
        </div>
      ) : entries.map(entry => (
        <div key={entry.id} onClick={() => onView(entry)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${entry.hasIssues ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {entry.hasIssues ? <ExclamationCircleIcon className="w-6 h-6"/> : <CheckCircleIcon className="w-6 h-6"/>}
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg uppercase leading-tight">{entry.prefix}</p>
              <p className="text-xs text-gray-400 font-medium">{entry.date} • {entry.driverName}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-300"/>
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
      alert("Preencha o prefixo, condutor e assine para finalizar."); 
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
      {/* Cabeçalho do Formulário */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center space-y-2">
         <button onClick={onCancel} className="flex items-center gap-1 text-red-500 font-black uppercase text-xs hover:bg-red-50 px-3 py-1 rounded-full transition-colors">
            <XCircleIcon className="w-4 h-4"/> Cancelar
         </button>
         <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Formulário de Vistoria</h2>
         <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
               <div key={i} className={`h-1.5 w-8 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`}/>
            ))}
         </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
        {step === 1 && (
          <div className="p-8 space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Passo 1: Dados do Veículo</h3>
            <div className="space-y-5">
              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Condutor do Veículo</label>
                <input placeholder="Ex: João da Silva" onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Prefixo (Identificação)</label>
                <input placeholder="Ex: SOL-001" onChange={e => setFormData({...formData, prefix: e.target.value, vehicleId: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">KM Atual</label>
                  <input type="number" placeholder="0" onChange={e => setFormData({...formData, km: Number(e.target.value)})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Horímetro</label>
                  <input type="number" placeholder="0" onChange={e => setFormData({...formData, horimetro: Number(e.target.value)})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-bold" />
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all mt-4">Próximo Passo</button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-[75vh]">
            <div className="p-6 border-b bg-gray-50/50">
               <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Passo 2: Vistoria Técnica</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Marque o estado de cada componente abaixo</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tighter bg-gray-100 py-1.5 px-4 rounded-full inline-block">{category}</h4>
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <p className="text-sm font-black text-gray-700 leading-tight uppercase">{item.label}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.OK)} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-[10px] font-black transition-all ${formData.items?.[item.id]?.status === ItemStatus.OK ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                            <CheckIcon className="w-5 h-5" /> OK
                          </button>
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.FALTA)} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-[10px] font-black transition-all ${formData.items?.[item.id]?.status === ItemStatus.FALTA ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                            <XMarkIcon className="w-5 h-5" /> FALTA
                          </button>
                          <button onClick={() => handleItemStatus(item.id, ItemStatus.DEFEITUOSO)} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-[10px] font-black transition-all ${formData.items?.[item.id]?.status === ItemStatus.DEFEITUOSO ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                            <WrenchIcon className="w-5 h-5" /> DEFEITO
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-white flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs transition-all">Voltar</button>
              <button onClick={() => setStep(3)} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg transition-all">Ir para Assinatura</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-8 space-y-8">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2">Passo 3: Finalização</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Observações Gerais</label>
                <textarea rows={3} placeholder="Relate algo importante aqui..." onChange={e => setFormData({...formData, generalObservations: e.target.value})} className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Assinatura Digital</label>
                <SignaturePad hasSignature={!!signature} onSave={setSignature} onClear={() => setSignature(undefined)} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-black uppercase text-xs transition-all">Voltar</button>
              <button onClick={handleSave} className="flex-[2] bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all">Finalizar Tudo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EntryDetail: React.FC<{ entry: ChecklistEntry; onBack: () => void }> = ({ entry, onBack }) => (
  <div className="max-w-2xl mx-auto space-y-6">
    <button onClick={onBack} className="bg-white px-5 py-2.5 rounded-xl border font-black uppercase text-[10px] text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-all shadow-sm">← Voltar para lista</button>
    <div className="bg-white p-10 rounded-3xl border shadow-xl space-y-8">
      <div className="flex justify-between items-start border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-4xl font-black text-blue-600 uppercase tracking-tighter leading-none">{entry.prefix}</h2>
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">{entry.type} • {entry.date}</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${entry.hasIssues ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
          {entry.hasIssues ? 'Pendências Detectadas' : 'Sem Observações'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-10">
        <div><p className="text-gray-400 uppercase text-[10px] font-black mb-1.5">Condutor Responsável</p><p className="font-black text-gray-800 text-lg leading-tight uppercase">{entry.driverName}</p></div>
        <div><p className="text-gray-400 uppercase text-[10px] font-black mb-1.5">Métrica do Veículo</p><p className="font-black text-gray-800 text-lg leading-tight uppercase">{entry.km} KM • {entry.horimetro} H</p></div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Relatório de Irregularidades</h4>
        <div className="grid gap-2">
          {Object.entries(entry.items).map(([id, info]) => {
            const item = INITIAL_ITEMS.find(i => i.id === Number(id));
            if (info.status === ItemStatus.OK) return null;
            return (
              <div key={id} className="flex justify-between items-center text-xs p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="font-black text-gray-700 uppercase">{item?.label}</span>
                <span className={`font-black uppercase px-3 py-1 rounded-full text-[9px] ${info.status === ItemStatus.DEFEITUOSO ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  {info.status}
                </span>
              </div>
            );
          })}
          {Object.values(entry.items).every(i => i.status === ItemStatus.OK) && (
            <p className="text-xs text-green-600 font-bold bg-green-50 p-4 rounded-2xl border border-green-100">✓ Todos os componentes operando em conformidade técnica.</p>
          )}
        </div>
      </div>

      {entry.operatorSignature && (
        <div className="pt-8 border-t border-gray-100">
          <p className="text-gray-400 uppercase text-[10px] font-black mb-3">Autenticação Digital (Operador)</p>
          <img src={entry.operatorSignature} className="h-28 border bg-gray-50 rounded-2xl p-4 shadow-inner" alt="Assinatura" />
        </div>
      )}
    </div>
  </div>
);

const AdminPanel: React.FC<any> = ({ entries, onRefresh }) => (
  <div className="max-w-2xl mx-auto space-y-6 text-center">
    <div className="bg-white p-10 rounded-3xl border shadow-xl">
      <h2 className="text-2xl font-black uppercase text-gray-900 mb-2">Painel do Administrador</h2>
      <p className="text-sm text-gray-500 mb-10 font-medium">Gestão centralizada e sincronização de dados</p>
      
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm">
          <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Total Vistorias</p>
          <p className="text-5xl font-black text-blue-600 mt-2">{entries.length}</p>
        </div>
        <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-sm">
          <p className="text-[10px] text-red-400 uppercase font-black tracking-widest">Com Falhas</p>
          <p className="text-5xl font-black text-red-600 mt-2">{entries.filter((e: any) => e.hasIssues).length}</p>
        </div>
      </div>

      <button onClick={onRefresh} className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200">
        <ArrowPathIcon className="w-6 h-6"/> Atualizar da Nuvem
      </button>
      
      {!supabase && (
        <div className="mt-8 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
           <ExclamationCircleIcon className="w-4 h-4 text-red-500"/>
           <p className="text-[10px] text-red-500 font-black uppercase">Ambiente de Pré-visualização: Sincronização Desabilitada</p>
        </div>
      )}
    </div>
  </div>
);

export default App;
