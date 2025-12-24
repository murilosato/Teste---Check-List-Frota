
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
  ArrowPathIcon
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

  // Inicialização: Carrega do LocalStorage primeiro (Offline-first)
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
    
    // Lista padrão de usuários se não houver local
    if (savedUsersList) {
      setUsers(JSON.parse(savedUsersList));
    } else {
      const defaultUsers: User[] = [
        { id: '1', name: 'Admin Solurb', role: 'ADMIN', username: 'admin', matricula: '001' },
        { id: '2', name: 'João Operador', role: 'OPERADOR', username: 'joao', matricula: '123' }
      ];
      setUsers(defaultUsers);
    }

    // Tenta buscar atualizações do Supabase sem travar o App
    fetchCloudData();
  }, []);

  const fetchCloudData = async () => {
    // Guard clause: se o client for null, o app opera apenas localmente
    if (!supabase) {
      console.log("Supabase não disponível. Operando em modo offline.");
      return;
    }

    try {
      // Busca backup de checklists
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
      console.warn("Supabase inacessível no momento.");
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
      alert("Usuário não cadastrado localmente.");
    }
  };

  const saveEntry = async (entry: ChecklistEntry) => {
    // 1. SALVAR LOCALMENTE (Instantâneo - Experiência do Usuário)
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    localStorage.setItem('solurb_entries', JSON.stringify(newEntries));

    // Atualiza veículo local
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

    // 2. BACKUP NO SUPABASE (Silencioso e condicional)
    if (supabase) {
      try {
        await supabase.from('checklist_entries').insert([{ 
          id: entry.id, 
          entry_data: entry 
        }]);
        console.log("Backup na nuvem concluído.");
      } catch (err) {
        console.error("Erro no backup Supabase:", err);
      }
    } else {
      console.warn("Sincronização na nuvem ignorada (Sem credenciais).");
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
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
      <h2 className="text-xl font-bold">Minhas Vistorias</h2>
      <button onClick={onNew} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Nova</button>
    </div>
    <div className="grid gap-3">
      {entries.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">Nenhum registro encontrado.</div>
      ) : entries.map(entry => (
        <div key={entry.id} onClick={() => onView(entry)} className="bg-white p-4 rounded-xl border flex justify-between items-center cursor-pointer hover:border-blue-300">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${entry.hasIssues ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{entry.hasIssues ? <ExclamationCircleIcon className="w-5 h-5"/> : <CheckCircleIcon className="w-5 h-5"/>}</div>
            <div>
              <p className="font-bold">{entry.prefix} - {entry.type}</p>
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

  const handleSave = () => {
    if (!formData.vehicleId || !formData.driverName || !signature) { alert("Preencha todos os campos e assine."); return; }
    
    // Gerar um UUID seguro para o checklist
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);

    onSave({ 
      ...formData as ChecklistEntry, 
      id: newId, 
      createdAt: Date.now(), 
      operatorSignature: signature,
      hasIssues: false 
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        {step === 1 ? (
          <>
            <h3 className="text-lg font-bold">Informações Básicas</h3>
            <input placeholder="Nome do Condutor" onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full p-3 border rounded-xl" />
            <input placeholder="Prefixo do Veículo (Ex: SOL-01)" onChange={e => setFormData({...formData, prefix: e.target.value, vehicleId: e.target.value})} className="w-full p-3 border rounded-xl" />
            <div className="flex gap-2">
              <input type="number" placeholder="KM Atual" onChange={e => setFormData({...formData, km: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
              <input type="number" placeholder="Horímetro" onChange={e => setFormData({...formData, horimetro: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Ir para Assinatura</button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold">Assinatura Digital</h3>
            <SignaturePad hasSignature={!!signature} onSave={setSignature} onClear={() => setSignature(undefined)} />
            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">Finalizar e Salvar</button>
            <button onClick={() => setStep(1)} className="w-full text-gray-400 py-2">Voltar para dados</button>
          </>
        )}
      </div>
    </div>
  );
};

const EntryDetail: React.FC<{ user: User, entry: ChecklistEntry; criteria: ChecklistItem[]; onBack: () => void }> = ({ entry, onBack }) => (
  <div className="space-y-4">
    <button onClick={onBack} className="text-blue-600 font-bold">← Voltar para lista</button>
    <div className="bg-white p-8 rounded-2xl border shadow-lg space-y-4">
      <div className="flex justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-600">{entry.prefix}</h2>
          <p className="text-sm text-gray-500 uppercase font-bold">{entry.type} • {entry.date}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-gray-400 uppercase text-[10px] font-black">Condutor</p><p className="font-bold">{entry.driverName}</p></div>
        <div><p className="text-gray-400 uppercase text-[10px] font-black">KM / Horímetro</p><p className="font-bold">{entry.km} km / {entry.horimetro} h</p></div>
      </div>
      <div className="mt-6 border-t pt-4">
        <p className="text-gray-400 uppercase text-[10px] font-black mb-2">Assinatura do Operador</p>
        {entry.operatorSignature && <img src={entry.operatorSignature} className="h-24 border bg-gray-50 rounded-lg p-2" alt="Assinatura" />}
      </div>
    </div>
  </div>
);

const AdminPanel: React.FC<any> = ({ entries, onRefresh }) => (
  <div className="text-center space-y-6">
    <div className="bg-white p-8 rounded-2xl border shadow-sm">
      <h2 className="text-xl font-black uppercase text-gray-900 mb-2">Administração</h2>
      <p className="text-sm text-gray-500 mb-6">Controle de sincronização e dados globais.</p>
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-400 uppercase font-black">Vistorias Locais</p>
          <p className="text-3xl font-black text-blue-600">{entries.length}</p>
        </div>
      </div>

      <button 
        onClick={onRefresh} 
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-black transition-colors"
      >
        <ArrowPathIcon className="w-5 h-5"/> Sincronizar com Nuvem
      </button>
      
      {!supabase && (
        <p className="mt-4 text-[10px] text-red-500 font-bold uppercase">
          ⚠️ Modo Offline: Variáveis Supabase não configuradas neste ambiente.
        </p>
      )}
    </div>
  </div>
);

export default App;
