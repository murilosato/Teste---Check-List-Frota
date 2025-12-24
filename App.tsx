
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
  FunnelIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';

declare const XLSX: any;

// --- Componentes Auxiliares ---

const LoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
    <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mb-4" />
    <p className="text-gray-500 font-bold">Sincronizando dados...</p>
  </div>
);

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [criteria, setCriteria] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [selectedEntry, setSelectedEntry] = useState<ChecklistEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inicialização
  useEffect(() => {
    const savedUser = localStorage.getItem('solurb_user');
    const savedEntries = localStorage.getItem('solurb_entries');
    const savedVehicles = localStorage.getItem('solurb_vehicles');
    const savedUsersList = localStorage.getItem('solurb_users_list');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
    
    if (savedUsersList) {
      setUsers(JSON.parse(savedUsersList));
    } else {
      const defaultUsers: User[] = [
        { id: '1', name: 'Admin Solurb', role: 'ADMIN', username: 'admin', matricula: '001' },
        { id: '2', name: 'João Operador', role: 'OPERADOR', username: 'joao', matricula: '123' }
      ];
      setUsers(defaultUsers);
    }

    fetchCloudData();
  }, []);

  const fetchCloudData = async () => {
    if (!supabase) return;
    try {
      const { data: eData, error } = await supabase.from('checklist_entries').select('entry_data');
      if (error) throw error;
      if (eData) {
        const cloudEntries = eData.map(d => d.entry_data as ChecklistEntry);
        if (cloudEntries.length > 0) {
          setEntries(prev => {
            const merged = [...cloudEntries];
            prev.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
            const sorted = merged.sort((a, b) => b.createdAt - a.createdAt);
            localStorage.setItem('solurb_entries', JSON.stringify(sorted));
            return sorted;
          });
        }
      }
    } catch (err) {
      console.warn("Sincronização offline.");
    }
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

    setVehicles(prev => {
      const updated = prev.map(v => 
        v.id === entry.vehicleId 
          ? { ...v, currentKm: entry.km, currentHorimetro: entry.horimetro, lastUpdated: Date.now() }
          : v
      );
      localStorage.setItem('solurb_vehicles', JSON.stringify(updated));
      return updated;
    });

    setView('DASHBOARD');

    if (supabase) {
      try {
        await supabase.from('checklist_entries').insert([{ id: entry.id, entry_data: entry }]);
      } catch (err) {
        console.error("Erro no backup:", err);
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('solurb_user');
    setView('LOGIN');
  };

  if (!user && view === 'LOGIN') return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="bg-blue-600 p-1.5 rounded-lg"><ClipboardDocumentCheckIcon className="w-6 h-6 text-white" /></div>
            <h1 className="font-bold text-gray-900 hidden sm:block">EcoCheck <span className="text-blue-600">Solurb</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button onClick={() => setView('DASHBOARD')} className={`p-2 rounded-md ${view === 'DASHBOARD' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Squares2X2Icon className="w-4 h-4"/></button>
               {user?.role === 'ADMIN' && <button onClick={() => setView('ADMIN')} className={`p-2 rounded-md ${view === 'ADMIN' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Cog6ToothIcon className="w-4 h-4"/></button>}
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500"><ArrowRightOnRectangleIcon className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-20">
        {view === 'DASHBOARD' && <Dashboard user={user!} entries={entries} onNew={() => setView('FORM')} onView={(e) => { setSelectedEntry(e); setView('DETAIL'); }} />}
        {view === 'FORM' && <ChecklistForm user={user!} vehicles={vehicles} criteria={criteria} onCancel={() => setView('DASHBOARD')} onSave={saveEntry} />}
        {view === 'DETAIL' && selectedEntry && <EntryDetail user={user!} entry={selectedEntry} criteria={criteria} onBack={() => setView('DASHBOARD')} />}
        {view === 'ADMIN' && <AdminPanel vehicles={vehicles} users={users} entries={entries} onRefresh={fetchCloudData} />}
      </main>
    </div>
  );
};

// --- Sub-Componentes ---

const LoginScreen: React.FC<{ onLogin: (e: any) => void, isLoading: boolean }> = ({ onLogin, isLoading }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-blue-600">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div className="text-center">
        <ClipboardDocumentCheckIcon className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-2xl font-bold mt-2">EcoCheck Solurb</h2>
      </div>
      <form onSubmit={onLogin} className="space-y-4">
        <input required name="username" className="w-full p-3 border rounded-xl" placeholder="Usuário" />
        <input name="password" type="password" className="w-full p-3 border rounded-xl" placeholder="Senha/Matrícula" />
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Entrar</button>
      </form>
    </div>
  </div>
);

const Dashboard: React.FC<{ user: User, entries: ChecklistEntry[]; onNew: () => void; onView: (e: ChecklistEntry) => void }> = ({ user, entries, onNew, onView }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold">Vistorias Realizadas</h2>
      <button onClick={onNew} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200"><PlusIcon className="w-5 h-5"/> Nova</button>
    </div>
    <div className="grid gap-3">
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white border-2 border-dashed rounded-2xl">
          <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
          Nenhum registro encontrado.
        </div>
      ) : entries.map(entry => (
        <div key={entry.id} onClick={() => onView(entry)} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${entry.hasIssues ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {entry.hasIssues ? <ExclamationCircleIcon className="w-5 h-5"/> : <CheckCircleIcon className="w-5 h-5"/>}
            </div>
            <div>
              <p className="font-bold text-gray-800">{entry.prefix} <span className="text-gray-400 font-normal">({entry.type})</span></p>
              <p className="text-xs text-gray-400">{entry.date} • {entry.driverName}</p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-300"/>
        </div>
      ))}
    </div>
  </div>
);

const ChecklistForm: React.FC<{ user: User; vehicles: Vehicle[]; criteria: ChecklistItem[]; onCancel: () => void; onSave: (entry: ChecklistEntry) => void }> = ({ user, vehicles, criteria, onCancel, onSave }) => {
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

  // Agrupa itens por categoria
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
      items: {
        ...prev.items,
        [itemId]: { status, vistoria: true }
      }
    }));
  };

  const handleSave = () => {
    if (!formData.vehicleId || !formData.driverName || !signature) { 
      alert("Por favor, preencha as informações básicas e assine."); 
      return; 
    }
    
    // Verifica se houve algum item com defeito ou falta
    const hasIssues = Object.values(formData.items || {}).some(i => i.status !== ItemStatus.OK);

    const newId = crypto.randomUUID();
    onSave({ 
      ...formData as ChecklistEntry, 
      id: newId, 
      createdAt: Date.now(), 
      operatorSignature: signature,
      hasIssues 
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === i ? 'bg-blue-600 text-white' : step > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{i}</div>
            {i < 3 && <div className={`w-12 h-0.5 mx-2 ${step > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900 uppercase">Informações Básicas</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Condutor</label>
                <input placeholder="Nome Completo" onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Veículo (Prefixo)</label>
                <input placeholder="Ex: SOL-123" onChange={e => setFormData({...formData, prefix: e.target.value, vehicleId: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">KM Atual</label>
                  <input type="number" placeholder="0" onChange={e => setFormData({...formData, km: Number(e.target.value)})} className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Horímetro</label>
                  <input type="number" placeholder="0" onChange={e => setFormData({...formData, horimetro: Number(e.target.value)})} className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100 mt-4 active:scale-95 transition-transform">Próximo Passo</button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col h-[70vh]">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-black text-gray-900 uppercase">Vistoria Técnica</h3>
              <p className="text-xs text-gray-500">Selecione o estado de cada item abaixo.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 py-1 px-3 rounded-full inline-block">{category}</h4>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                        <p className="text-sm font-bold text-gray-700 leading-tight">{item.label}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => handleItemStatus(item.id, ItemStatus.OK)}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.items?.[item.id]?.status === ItemStatus.OK ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                          >
                            <CheckIcon className="w-4 h-4" /> OK
                          </button>
                          <button 
                            onClick={() => handleItemStatus(item.id, ItemStatus.FALTA)}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.items?.[item.id]?.status === ItemStatus.FALTA ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                          >
                            <XMarkIcon className="w-4 h-4" /> FALTA
                          </button>
                          <button 
                            onClick={() => handleItemStatus(item.id, ItemStatus.DEFEITUOSO)}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.items?.[item.id]?.status === ItemStatus.DEFEITUOSO ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                          >
                            <WrenchIcon className="w-4 h-4" /> DEFEITO
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-white">
              <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Ir para Assinatura</button>
              <button onClick={() => setStep(1)} className="w-full py-3 text-gray-400 text-sm font-bold">Voltar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-black text-gray-900 uppercase">Assinatura Digital</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Observações Gerais</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva aqui qualquer observação adicional..."
                  onChange={e => setFormData({...formData, generalObservations: e.target.value})}
                  className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <SignaturePad hasSignature={!!signature} onSave={setSignature} onClear={() => setSignature(undefined)} />
            </div>
            <div className="space-y-2">
              <button onClick={handleSave} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-100">Finalizar Checklist</button>
              <button onClick={() => setStep(2)} className="w-full py-3 text-gray-400 text-sm font-bold">Voltar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EntryDetail: React.FC<{ user: User, entry: ChecklistEntry; criteria: ChecklistItem[]; onBack: () => void }> = ({ entry, onBack }) => (
  <div className="space-y-4">
    <button onClick={onBack} className="text-blue-600 font-bold flex items-center gap-1">← Voltar para lista</button>
    <div className="bg-white p-8 rounded-2xl border shadow-lg space-y-6">
      <div className="flex justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-600">{entry.prefix}</h2>
          <p className="text-xs text-gray-400 uppercase font-black">{entry.type} • {entry.date}</p>
        </div>
        <div className={`px-4 py-1 rounded-full h-fit text-[10px] font-black uppercase ${entry.hasIssues ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
          {entry.hasIssues ? 'Com Pendências' : 'Sem Pendências'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div><p className="text-gray-400 uppercase text-[10px] font-black mb-1">Condutor</p><p className="font-bold text-gray-800">{entry.driverName}</p></div>
        <div><p className="text-gray-400 uppercase text-[10px] font-black mb-1">KM / Horímetro</p><p className="font-bold text-gray-800">{entry.km} km / {entry.horimetro} h</p></div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-1">Resumo dos Itens</h4>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(entry.items).map(([id, info]) => {
            const item = INITIAL_ITEMS.find(i => i.id === Number(id));
            if (info.status === ItemStatus.OK) return null;
            return (
              <div key={id} className="flex justify-between items-center text-xs p-2 bg-red-50 rounded-lg border border-red-100">
                <span className="font-medium text-gray-700">{item?.label}</span>
                <span className={`font-black uppercase ${info.status === ItemStatus.DEFEITUOSO ? 'text-red-600' : 'text-orange-600'}`}>
                  {info.status}
                </span>
              </div>
            );
          })}
          {Object.values(entry.items).every(i => i.status === ItemStatus.OK) && (
            <p className="text-xs text-green-600 font-bold">✓ Todos os itens em conformidade.</p>
          )}
        </div>
      </div>

      {entry.generalObservations && (
        <div>
          <p className="text-gray-400 uppercase text-[10px] font-black mb-1">Observações</p>
          <p className="text-sm bg-gray-50 p-3 rounded-xl border italic text-gray-600">"{entry.generalObservations}"</p>
        </div>
      )}

      <div className="pt-6 border-t">
        <p className="text-gray-400 uppercase text-[10px] font-black mb-2">Assinatura Digital</p>
        {entry.operatorSignature && <img src={entry.operatorSignature} className="h-24 border bg-gray-50 rounded-lg p-2" alt="Assinatura" />}
      </div>
    </div>
  </div>
);

const AdminPanel: React.FC<any> = ({ entries, onRefresh }) => (
  <div className="text-center space-y-6">
    <div className="bg-white p-8 rounded-2xl border shadow-sm">
      <h2 className="text-xl font-black uppercase text-gray-900 mb-2">Administração</h2>
      <p className="text-sm text-gray-500 mb-6">Controle de sincronização e estatísticas.</p>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-[10px] text-blue-400 uppercase font-black">Total</p>
          <p className="text-3xl font-black text-blue-600">{entries.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-[10px] text-red-400 uppercase font-black">Com Problemas</p>
          <p className="text-3xl font-black text-red-600">{entries.filter((e: any) => e.hasIssues).length}</p>
        </div>
      </div>

      <button 
        onClick={onRefresh} 
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-4 rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-gray-200"
      >
        <ArrowPathIcon className="w-5 h-5"/> Sincronizar Nuvem
      </button>
      
      {!supabase && (
        <p className="mt-4 text-[10px] text-red-500 font-bold uppercase flex items-center justify-center gap-1">
          <ExclamationCircleIcon className="w-3 h-3"/> Modo Offline Ativo
        </p>
      )}
    </div>
  </div>
);

export default App;
