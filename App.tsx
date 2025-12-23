
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ChecklistEntry, Shift, ChecklistType, ItemStatus, Vehicle, ChecklistItem, Approval } from './types';
import { CHECKLIST_ITEMS as INITIAL_ITEMS } from './constants';
import { 
  ClipboardDocumentCheckIcon, 
  ArrowRightOnRectangleIcon, 
  PlusIcon,
  TruckIcon,
  CalendarIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  UsersIcon,
  ListBulletIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  Squares2X2Icon,
  NoSymbolIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  LockClosedIcon,
  FunnelIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Helper para exportação Excel (XLSX disponível via window)
declare const XLSX: any;

// Componente de Assinatura Melhorado
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL());
    }
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
        <canvas
          ref={canvasRef}
          className="w-full h-[150px] cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
        <div className="absolute top-2 right-2 flex gap-2">
          {hasSignature && (
            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3"/> CAPTURADA
            </div>
          )}
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); clear(); }}
            className="text-[10px] bg-gray-100 px-3 py-1 rounded font-bold hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
          >
            LIMPAR
          </button>
        </div>
        {!hasSignature && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <PencilIcon className="w-12 h-12 text-gray-400" />
             <span className="text-sm font-bold text-gray-400 ml-2">Assine aqui</span>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'FORM' | 'DETAIL' | 'ADMIN'>('LOGIN');
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [criteria, setCriteria] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [selectedEntry, setSelectedEntry] = useState<ChecklistEntry | null>(null);

  useEffect(() => {
    const savedEntries = localStorage.getItem('solurb_entries');
    if (savedEntries) setEntries(JSON.parse(savedEntries));

    const savedVehicles = localStorage.getItem('solurb_vehicles');
    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));

    const savedUsers = localStorage.getItem('solurb_users');
    if (savedUsers) setUsers(JSON.parse(savedUsers));

    const savedCriteria = localStorage.getItem('solurb_criteria');
    if (savedCriteria) setCriteria(JSON.parse(savedCriteria));

    const savedUser = localStorage.getItem('solurb_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('solurb_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('solurb_users', JSON.stringify(users));
    localStorage.setItem('solurb_criteria', JSON.stringify(criteria));
    localStorage.setItem('solurb_entries', JSON.stringify(entries));
  }, [vehicles, users, criteria, entries]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const loginInput = (formData.get('username') as string).trim();
    const passwordInput = (formData.get('password') as string).trim();
    
    let loggedUser = users.find(u => 
      u.username.toLowerCase() === loginInput.toLowerCase() || 
      u.name.toLowerCase() === loginInput.toLowerCase()
    );
    
    if (!loggedUser && loginInput.toLowerCase() === 'admin') {
      loggedUser = { id: 'admin-1', name: 'Administrador Principal', username: 'admin', role: 'ADMIN' };
      if (!users.find(u => u.username === 'admin')) {
         setUsers(prev => [...prev, loggedUser!]);
      }
    }

    if (loggedUser) {
      if (loggedUser.role === 'OPERADOR') {
        if (loggedUser.matricula !== passwordInput) {
          alert("Matrícula incorreta para este operador.");
          return;
        }
      }

      setUser(loggedUser);
      localStorage.setItem('solurb_user', JSON.stringify(loggedUser));
      setView('DASHBOARD');
    } else {
      alert("Usuário ou Nome não encontrado.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('solurb_user');
    setView('LOGIN');
  };

  const saveEntry = (entry: ChecklistEntry) => {
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    
    setVehicles(prev => prev.map(v => 
      v.id === entry.vehicleId 
        ? { ...v, currentKm: entry.km, currentHorimetro: entry.horimetro, lastUpdated: Date.now() }
        : v
    ));

    setView('DASHBOARD');
  };

  const handleApprove = (entryId: string, role: 'MANUTENCAO' | 'OPERACAO') => {
    if (!user) return;
    const approval: Approval = {
      userId: user.id,
      userName: user.name,
      timestamp: Date.now()
    };

    setEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          ...(role === 'MANUTENCAO' ? { maintenanceApproval: approval } : { operationApproval: approval })
        };
      }
      return entry;
    }));
    
    if (selectedEntry?.id === entryId) {
      setSelectedEntry(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...(role === 'MANUTENCAO' ? { maintenanceApproval: approval } : { operationApproval: approval })
        };
      });
    }
  };

  if (!user && view === 'LOGIN') return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-900 leading-tight">EcoCheck</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Solurb Operação</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
               <button onClick={() => setView('DASHBOARD')} title="Painel de Controle" className={`p-2 rounded-md transition-all ${view === 'DASHBOARD' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><Squares2X2Icon className="w-4 h-4"/></button>
               {user?.role === 'ADMIN' && (
                 <button onClick={() => setView('ADMIN')} title="Configurações Admin" className={`p-2 rounded-md transition-all ${view === 'ADMIN' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><Cog6ToothIcon className="w-4 h-4"/></button>
               )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-20">
        {view === 'DASHBOARD' && (
          <Dashboard 
            user={user!}
            entries={entries} 
            onNew={() => setView('FORM')} 
            onView={(entry) => {
              setSelectedEntry(entry);
              setView('DETAIL');
            }}
          />
        )}
        {view === 'FORM' && (
          <ChecklistForm 
            user={user!} 
            vehicles={vehicles}
            criteria={criteria}
            onCancel={() => setView('DASHBOARD')} 
            onSave={saveEntry}
          />
        )}
        {view === 'DETAIL' && selectedEntry && (
          <EntryDetail 
            user={user!}
            entry={selectedEntry} 
            criteria={criteria} 
            onBack={() => setView('DASHBOARD')} 
            onApprove={(role) => handleApprove(selectedEntry.id, role)}
          />
        )}
        {view === 'ADMIN' && (
          <AdminPanel 
            vehicles={vehicles} 
            setVehicles={setVehicles}
            users={users}
            setUsers={setUsers}
            criteria={criteria}
            setCriteria={setCriteria}
            entries={entries}
          />
        )}
      </main>
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (e: React.FormEvent<HTMLFormElement>) => void }> = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-gray-100">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-blue-600 p-8 text-center">
        <ClipboardDocumentCheckIcon className="w-16 h-16 text-white mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">EcoCheck Solurb</h1>
        <p className="text-blue-100 mt-2">Gestão Digital de Frota</p>
      </div>
      <form onSubmit={onLogin} className="p-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário ou Nome Completo</label>
            <div className="relative">
              <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input required name="username" type="text" className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Login ou Nome do Operador" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha ou Matrícula <span className="text-[10px] text-gray-400 font-normal">(Obrigatória para Operadores)</span></label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="password" type="password" className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Matrícula do Condutor" />
            </div>
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all">
          Acessar Sistema
        </button>
      </form>
    </div>
  </div>
);

const Dashboard: React.FC<{ user: User, entries: ChecklistEntry[]; onNew: () => void; onView: (e: ChecklistEntry) => void }> = ({ user, entries, onNew, onView }) => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVARIA' | 'FALTA' | 'OK'>('ALL');

  // Lógica para veículos em operação (Saída sem Retorno posterior)
  const openVehicles = useMemo(() => {
    const latestByVehicle: Record<string, ChecklistEntry> = {};
    const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
    
    sorted.forEach(entry => {
      latestByVehicle[entry.prefix] = entry;
    });

    return Object.values(latestByVehicle).filter(e => e.type === ChecklistType.SAIDA);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let list = [...entries];

    // Regra: Operador só vê o que ele mesmo preencheu
    if (user.role === 'OPERADOR') {
      list = list.filter(e => e.userId === user.id);
    } else {
      // Outros cargos vêem tudo, mas podem filtrar por dia e status
      if (dateFilter) {
        list = list.filter(e => e.date === dateFilter);
      }

      if (statusFilter === 'AVARIA') {
        list = list.filter(e => e.hasIssues);
      } else if (statusFilter === 'FALTA') {
        list = list.filter(e => Object.values(e.items).some(it => it.status === ItemStatus.FALTA));
      } else if (statusFilter === 'OK') {
        list = list.filter(e => !e.hasIssues);
      }
    }

    // Ordenação de prioridade para Manutenção/Operação
    if (user.role === 'MANUTENCAO') {
      list.sort((a, b) => {
        const aNeeds = a.hasIssues && !a.maintenanceApproval;
        const bNeeds = b.hasIssues && !b.maintenanceApproval;
        return (aNeeds === bNeeds) ? b.createdAt - a.createdAt : aNeeds ? -1 : 1;
      });
    } else if (user.role === 'OPERACAO') {
       list.sort((a, b) => {
        const aNeeds = a.hasIssues && !a.operationApproval;
        const bNeeds = b.hasIssues && !b.operationApproval;
        return (aNeeds === bNeeds) ? b.createdAt - a.createdAt : aNeeds ? -1 : 1;
      });
    } else {
      list.sort((a, b) => b.createdAt - a.createdAt);
    }

    return list;
  }, [entries, user.role, user.id, dateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Seção de Veículos em Operação (Abertos para Retorno) - Visível para Gestores/Admin */}
      {user.role !== 'OPERADOR' && openVehicles.length > 0 && (
        <div className="bg-blue-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 animate-pulse" />
            <h3 className="font-bold text-lg">Veículos em Operação <span className="text-blue-200 font-normal text-sm">({openVehicles.length} aguardando retorno)</span></h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {openVehicles.map(v => (
              <div key={v.id} onClick={() => onView(v)} className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl min-w-[140px] cursor-pointer hover:bg-white/20 transition-all group">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-lg">{v.prefix}</span>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-blue-100 uppercase font-bold">{v.driverName.split(' ')[0]}</p>
                <p className="text-[9px] text-blue-200 mt-2 font-medium">Saída às {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Histórico de Vistorias</h2>
          <p className="text-gray-500 text-sm">{user.role === 'OPERADOR' ? 'Seus registros realizados' : 'Painel de monitoramento da frota'}</p>
        </div>
        {(user.role === 'OPERADOR' || user.role === 'ADMIN') && (
          <button onClick={onNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:bg-blue-700 transition-all active:scale-95">
            <PlusIcon className="w-5 h-5" />
            Nova Vistoria
          </button>
        )}
      </div>

      {/* Barra de Filtros para Gestores */}
      {user.role !== 'OPERADOR' && (
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
              className="bg-transparent text-xs font-bold outline-none text-gray-700"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
            {[
              { id: 'ALL', label: 'Tudo' },
              { id: 'AVARIA', label: 'Avarias' },
              { id: 'FALTA', label: 'Faltantes' },
              { id: 'OK', label: 'Tudo OK' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === f.id ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <FunnelIcon className="w-12 h-12 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 font-medium">Nenhum checklist encontrado para este filtro.</p>
          </div>
        ) : filteredEntries.map((entry) => {
          const needsMaintenance = entry.hasIssues && !entry.maintenanceApproval;
          const needsOperation = entry.hasIssues && !entry.operationApproval;
          const isPendingForUser = (user.role === 'MANUTENCAO' && needsMaintenance) || (user.role === 'OPERACAO' && needsOperation);

          return (
            <div 
              key={entry.id} 
              onClick={() => onView(entry)} 
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${isPendingForUser ? 'border-red-300 bg-red-50 ring-2 ring-red-100 shadow-lg shadow-red-100' : 'border-gray-200 hover:border-blue-300 shadow-sm'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${entry.hasIssues ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {entry.hasIssues ? <ExclamationCircleIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{entry.prefix}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${entry.type === ChecklistType.SAIDA ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {entry.type}
                    </span>
                    {entry.hasIssues && <span className="text-[10px] font-black text-red-600 uppercase">Avaria</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(entry.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className="flex items-center gap-1 font-bold text-gray-700"><UserCircleIcon className="w-3 h-3" /> {entry.driverName}</span>
                    {entry.maintenanceApproval && <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-1 rounded">MANUT. OK</span>}
                    {entry.operationApproval && <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-1 rounded">OPER. OK</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPendingForUser && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">PENDENTE</span>}
                <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminPanel: React.FC<{ 
  vehicles: Vehicle[]; 
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  criteria: ChecklistItem[];
  setCriteria: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
  entries: ChecklistEntry[];
}> = ({ vehicles, setVehicles, users, setUsers, criteria, setCriteria, entries }) => {
  const [tab, setTab] = useState<'VEHICLES' | 'USERS' | 'CRITERIA' | 'REPORTS'>('VEHICLES');
  const [newUserRole, setNewUserRole] = useState<'OPERADOR' | 'MANUTENCAO' | 'OPERACAO' | 'ADMIN'>('OPERADOR');

  const addVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setVehicles([...vehicles, {
      id: Math.random().toString(36).substr(2, 9),
      prefix: fd.get('prefix') as string,
      plate: fd.get('plate') as string,
      currentKm: Number(fd.get('km')),
      currentHorimetro: Number(fd.get('horimetro')),
      lastUpdated: Date.now()
    }]);
    e.currentTarget.reset();
  };

  const addUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const role = fd.get('role') as any;
    setUsers([...users, {
      id: Math.random().toString(36).substr(2, 9),
      name: fd.get('name') as string,
      username: fd.get('username') as string,
      role: role,
      matricula: role === 'OPERADOR' ? (fd.get('matricula') as string) : undefined
    }]);
    e.currentTarget.reset();
  };

  const addCriterion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCriteria([...criteria, {
      id: criteria.length > 0 ? Math.max(...criteria.map(c => c.id)) + 1 : 1,
      label: fd.get('label') as string,
      category: fd.get('category') as string
    }]);
    e.currentTarget.reset();
  };

  const exportToExcel = () => {
    if (entries.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const exportData = entries.map(e => {
      const row: any = {
        'ID Protocolo': e.id,
        'Data': e.date,
        'Tipo': e.type,
        'Prefixo': e.prefix,
        'Motorista': e.driverName,
        'KM': e.km,
        'Horímetro': e.horimetro,
        'Tem Avaria?': e.hasIssues ? 'SIM' : 'NÃO',
        'Visto Manutenção': e.maintenanceApproval ? `OK (${e.maintenanceApproval.userName})` : 'PENDENTE',
        'Visto Operação': e.operationApproval ? `OK (${e.operationApproval.userName})` : 'PENDENTE',
        'Obs. Gerais': e.generalObservations
      };

      criteria.forEach(c => {
        const item = e.items[c.id];
        row[`[${c.category}] ${c.label} - Status`] = (item?.status || 'N/A').toLowerCase();
        row[`[${c.category}] ${c.label} - Obs`] = item?.obs || '';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Checklists");
    
    const fileName = `Checklists_Solurb_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const stats = useMemo(() => ({
    total: entries.length,
    withIssues: entries.filter(e => e.hasIssues).length,
    pendingManut: entries.filter(e => e.hasIssues && !e.maintenanceApproval).length,
    pendingOper: entries.filter(e => e.hasIssues && !e.operationApproval).length
  }), [entries]);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: 'VEHICLES', icon: TruckIcon, label: 'Veículos' },
          { id: 'USERS', icon: UsersIcon, label: 'Usuários' },
          { id: 'CRITERIA', icon: ListBulletIcon, label: 'Critérios' },
          { id: 'REPORTS', icon: ChartBarIcon, label: 'Relatórios' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all min-w-[100px] ${tab === t.id ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'VEHICLES' && (
        <div className="space-y-6">
          <form onSubmit={addVehicle} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold">Cadastrar Novo Veículo</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="prefix" placeholder="Prefixo" required className="p-2 border rounded-lg" />
              <input name="plate" placeholder="Placa" required className="p-2 border rounded-lg" />
              <input name="km" type="number" placeholder="KM Inicial" required className="p-2 border rounded-lg" />
              <input name="horimetro" type="number" placeholder="Horímetro" required className="p-2 border rounded-lg" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">Adicionar</button>
          </form>
          <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50"><tr className="text-gray-400 uppercase text-[10px] font-black tracking-widest"><th className="p-3">Prefixo</th><th className="p-3">KM</th><th className="p-3">Horímetro</th><th className="p-3">Ação</th></tr></thead>
              <tbody className="divide-y">{vehicles.map(v => (<tr key={v.id}><td className="p-3 font-bold">{v.prefix}</td><td className="p-3">{v.currentKm}</td><td className="p-3">{v.currentHorimetro}h</td><td className="p-3"><button onClick={() => setVehicles(prev => prev.filter(x => x.id !== v.id))} className="text-red-500"><TrashIcon className="w-4 h-4"/></button></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'USERS' && (
        <div className="space-y-6">
          <form onSubmit={addUser} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold">Cadastrar Novo Usuário</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="name" placeholder="Nome Completo" required className="p-2 border rounded-lg" />
              <input name="username" placeholder="Login (Usuário)" required className="p-2 border rounded-lg" />
              <select name="role" value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="p-2 border rounded-lg">
                <option value="OPERADOR">Operador (Motorista)</option>
                <option value="MANUTENCAO">Visto Manutenção</option>
                <option value="OPERACAO">Visto Operação</option>
                <option value="ADMIN">Administrador</option>
              </select>
              {newUserRole === 'OPERADOR' && (
                <input name="matricula" placeholder="Matrícula" required className="p-2 border rounded-lg col-span-2 bg-blue-50 border-blue-200" />
              )}
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">Adicionar</button>
          </form>
          <div className="bg-white rounded-2xl border overflow-hidden">
            {users.map(u => (
              <div key={u.id} className="p-4 flex justify-between items-center border-b last:border-0">
                <div><p className="font-bold">{u.name}</p><p className="text-xs text-gray-400">@{u.username} • {u.role} {u.matricula ? `• Matrícula: ${u.matricula}` : ''}</p></div>
                <button onClick={() => setUsers(prev => prev.filter(x => x.id !== u.id))} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'CRITERIA' && (
        <div className="space-y-6">
          <form onSubmit={addCriterion} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold">Novo Critério de Inspeção</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="label" placeholder="Descrição" required className="p-2 border rounded-lg" />
              <input name="category" placeholder="Categoria" required className="p-2 border rounded-lg" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">Adicionar</button>
          </form>
          <div className="bg-white rounded-2xl border overflow-hidden">
             {Array.from(new Set(criteria.map(c => c.category))).map(cat => (
               <div key={cat} className="p-4 border-b last:border-0"><h4 className="text-xs font-black text-blue-600 uppercase mb-2">{cat}</h4>{criteria.filter(c => c.category === cat).map(item => (<div key={item.id} className="flex justify-between items-center text-sm py-1"><span>{item.label}</span><button onClick={() => setCriteria(prev => prev.filter(x => x.id !== item.id))} className="text-red-500"><TrashIcon className="w-3 h-3"/></button></div>))}</div>
             ))}
          </div>
        </div>
      )}

      {tab === 'REPORTS' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">Total Vistorias</p>
              <p className="text-2xl font-black text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-red-400 uppercase">Com Avaria</p>
              <p className="text-2xl font-black text-red-600">{stats.withIssues}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-orange-400 uppercase">Pend. Manut.</p>
              <p className="text-2xl font-black text-orange-600">{stats.pendingManut}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-blue-400 uppercase">Pend. Operação</p>
              <p className="text-2xl font-black text-blue-600">{stats.pendingOper}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-4">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <ArrowDownTrayIcon className="w-8 h-8 text-blue-600"/>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Exportar Dados para Excel</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">Baixe todos os registros de checklist realizados, incluindo detalhes de cada item avaliado.</p>
            </div>
            <button 
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <ArrowDownTrayIcon className="w-4 h-4"/>
              Baixar Planilha Completa (.xlsx)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ChecklistForm: React.FC<{ user: User; vehicles: Vehicle[]; criteria: ChecklistItem[]; onCancel: () => void; onSave: (entry: ChecklistEntry) => void }> = ({ user, vehicles, criteria, onCancel, onSave }) => {
  const [step, setStep] = useState(1);
  const [signature, setSignature] = useState<string | undefined>();
  const [formData, setFormData] = useState<Partial<ChecklistEntry>>(() => {
    const initialItems: Record<number, any> = {};
    criteria.forEach(item => { initialItems[item.id] = { vistoria: true }; });
    return {
      date: new Date().toISOString().split('T')[0],
      shift: Shift.DIURNO,
      type: ChecklistType.SAIDA,
      items: initialItems,
      generalObservations: '',
      userId: user.id
    };
  });

  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === formData.vehicleId), [vehicles, formData.vehicleId]);
  const categories = useMemo(() => Array.from(new Set(criteria.map(i => i.category))), [criteria]);

  const areItemsValid = () => criteria.every(item => !!formData.items?.[item.id]?.status);
  
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.vehicleId) errors.push("Selecione um veículo.");
    if (!formData.driverName) errors.push("Informe o nome do motorista.");
    
    if (selectedVehicle) {
      if (Number(formData.km) < selectedVehicle.currentKm) errors.push(`KM não pode ser inferior a ${selectedVehicle.currentKm}.`);
      if (Number(formData.horimetro) < selectedVehicle.currentHorimetro) errors.push(`Horímetro não pode ser inferior a ${selectedVehicle.currentHorimetro}.`);
    } else if (!formData.km || !formData.horimetro) {
      errors.push("Informe KM e Horímetro.");
    }

    if (!areItemsValid()) errors.push("Avalie todos os itens da vistoria.");
    if (!signature) errors.push("Rubrica/Assinatura é obrigatória.");
    
    return errors;
  }, [formData, signature, selectedVehicle, criteria]);

  const isFormValid = validationErrors.length === 0;

  const handleFinishVistoria = () => {
    if (!areItemsValid()) {
      alert("ATENÇÃO: Você esqueceu de avaliar algum item do veículo. Verifique os marcados em vermelho.");
      return;
    }
    setStep(3);
  };

  const handleSubmit = () => {
    if (!isFormValid) {
      alert(`Erro ao enviar:\n- ${validationErrors.join('\n- ')}`);
      return;
    }

    const hasIssues = criteria.some(item => {
      const status = formData.items?.[item.id]?.status;
      return status === ItemStatus.FALTA || status === ItemStatus.DEFEITUOSO;
    });

    onSave({
      ...formData as ChecklistEntry,
      prefix: selectedVehicle?.prefix || '',
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      operatorSignature: signature,
      hasIssues
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 underline text-sm">Cancelar Registro</button>
        <h2 className="text-xl font-black text-blue-700 uppercase tracking-tight">Novo Checklist</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex-1 space-y-2">
            <div className={`h-1.5 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <p className={`text-[9px] font-black text-center uppercase ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>Passo {s}</p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b pb-4">
            <TruckIcon className="w-6 h-6 text-blue-600"/>
            <h3 className="font-bold text-gray-800 text-lg">Informações do Veículo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase">Operação</label>
              <select name="type" value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value as any}))} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-all">
                <option value={ChecklistType.SAIDA}>Saída do Veículo</option>
                <option value={ChecklistType.RETORNO}>Retorno do Veículo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase">Selecione o Veículo*</label>
              <select name="vehicleId" value={formData.vehicleId} onChange={e => setFormData(p => ({...p, vehicleId: e.target.value}))} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none">
                <option value="">Buscar Veículo...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.prefix} - {v.plate}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase">Nome do Condutor*</label>
              <input type="text" placeholder="Nome Completo" value={formData.driverName} onChange={e => setFormData(p => ({...p, driverName: e.target.value}))} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase">KM {selectedVehicle && <span className="text-blue-600">({selectedVehicle.currentKm})</span>}</label>
                <input 
                  type="number" 
                  value={formData.km || ''} 
                  onChange={e => setFormData(p => ({...p, km: Number(e.target.value)}))} 
                  className={`w-full p-3 border-2 rounded-xl focus:ring-0 outline-none transition-all ${selectedVehicle && Number(formData.km) < selectedVehicle.currentKm ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase">Horímetro {selectedVehicle && <span className="text-blue-600">({selectedVehicle.currentHorimetro})</span>}</label>
                <input 
                  type="number" 
                  value={formData.horimetro || ''} 
                  onChange={e => setFormData(p => ({...p, horimetro: Number(e.target.value)}))} 
                  className={`w-full p-3 border-2 rounded-xl focus:ring-0 outline-none transition-all ${selectedVehicle && Number(formData.horimetro) < selectedVehicle.currentHorimetro ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                />
              </div>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button 
              onClick={() => {
                if(!formData.vehicleId || !formData.driverName || !formData.km || !formData.horimetro) {
                  alert("Preencha todos os campos obrigatórios.");
                } else if(selectedVehicle && (Number(formData.km) < selectedVehicle.currentKm || Number(formData.horimetro) < selectedVehicle.currentHorimetro)) {
                   alert("KM ou Horímetro não podem ser inferiores aos registrados anteriormente.");
                } else {
                  setStep(2);
                }
              }} 
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Iniciar Vistoria →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 pb-32">
          <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl text-blue-800 text-xs flex items-center gap-3">
            <ShieldCheckIcon className="w-6 h-6 shrink-0" />
            <p className="font-bold">Avalie todos os itens abaixo. A vistoria está pré-preenchida como <b>SIM</b>, revise se necessário.</p>
          </div>

          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="font-black text-gray-400 text-[11px] uppercase tracking-[0.3em] border-l-4 border-blue-500 pl-4">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criteria.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className={`bg-white p-4 rounded-2xl border-2 transition-all space-y-4 ${!formData.items?.[item.id]?.status ? 'border-red-100 shadow-md shadow-red-50' : 'border-gray-50 shadow-sm'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[13px] font-black text-gray-700 leading-snug">{item.label}</span>
                      <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                         <button onClick={() => setFormData(p => ({...p, items: {...p.items, [item.id]: {...p.items?.[item.id], vistoria: true}}}))} className={`px-2 py-1 text-[9px] font-black rounded-lg ${formData.items?.[item.id]?.vistoria ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>SIM</button>
                         <button onClick={() => setFormData(p => ({...p, items: {...p.items, [item.id]: {...p.items?.[item.id], vistoria: false}}}))} className={`px-2 py-1 text-[9px] font-black rounded-lg ${!formData.items?.[item.id]?.vistoria ? 'bg-white shadow text-red-600' : 'text-gray-400'}`}>NÃO</button>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      {Object.values(ItemStatus).map(s => (
                        <button key={s} onClick={() => setFormData(p => ({...p, items: {...p.items, [item.id]: {...p.items?.[item.id], status: s}}}))} className={`flex-1 py-2 text-[10px] font-black border-2 rounded-xl transition-all ${formData.items?.[item.id]?.status === s ? (s === ItemStatus.OK ? 'border-blue-500 bg-blue-50 text-blue-700' : s === ItemStatus.FALTA ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-gray-50 text-gray-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <PencilIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="Observação do item..." 
                        value={formData.items?.[item.id]?.obs || ''} 
                        onChange={(e) => setFormData(p => ({...p, items: {...p.items, [item.id]: {...p.items?.[item.id], obs: e.target.value}}}))} 
                        className="w-full text-[11px] py-2 pl-8 pr-3 bg-gray-50 border-0 border-b-2 border-gray-100 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur border-t border-gray-200 z-20 flex justify-between gap-4 max-w-4xl mx-auto shadow-2xl">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-xs uppercase hover:bg-gray-200">Voltar</button>
            <button onClick={handleFinishVistoria} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-100 hover:bg-blue-700">Revisar e Assinar</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-3xl border shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center"><PencilIcon className="w-8 h-8 text-blue-600" /></div>
            <h3 className="text-xl font-black text-gray-900 uppercase">Validação Final</h3>
            <p className="text-sm text-gray-400 text-center">Para concluir, rubrique na área abaixo e insira observações gerais da operação.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assinatura do Motorista*</label>
            <SignaturePad hasSignature={!!signature} onSave={setSignature} onClear={() => setSignature(undefined)} />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações Gerais (Ocorrencias, avarias etc.)</label>
             <textarea 
               className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none text-sm bg-gray-50 min-h-[120px] transition-all" 
               placeholder="Descreva aqui qualquer detalhe importante da saída ou do retorno..." 
               value={formData.generalObservations} 
               onChange={e => setFormData(prev => ({...prev, generalObservations: e.target.value}))} 
             />
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
               <p className="text-xs font-black text-red-600 uppercase mb-2 flex items-center gap-2">
                 <ExclamationCircleIcon className="w-4 h-4"/> Pendências:
               </p>
               <ul className="text-[11px] text-red-500 list-disc pl-4 space-y-1">
                 {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
               </ul>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs hover:bg-gray-100">Voltar aos Itens</button>
            <button 
              onClick={handleSubmit} 
              className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase transition-all ${isFormValid ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Confirmar e Enviar Checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EntryDetail: React.FC<{ 
  user: User, 
  entry: ChecklistEntry; 
  criteria: ChecklistItem[]; 
  onBack: () => void,
  onApprove: (role: 'MANUTENCAO' | 'OPERACAO') => void
}> = ({ user, entry, criteria, onBack, onApprove }) => {
  const needsMaintenance = entry.hasIssues && !entry.maintenanceApproval;
  const needsOperation = entry.hasIssues && !entry.operationApproval;
  const canApproveMaintenance = user.role === 'MANUTENCAO' || user.role === 'ADMIN';
  const canApproveOperation = user.role === 'OPERACAO' || user.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-20">
      <div className="flex justify-between items-center print:hidden">
        <button onClick={onBack} className="text-blue-600 font-bold hover:underline flex items-center gap-1">← Voltar para Painel</button>
        <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">Imprimir Relatório</button>
      </div>

      <div className="bg-white border-t-8 border-blue-600 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-blue-600">
        <div className="p-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-gray-100 pb-8">
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 leading-none">VISTORIA DE VEÍCULO OPERACIONAL</h1>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${entry.type === ChecklistType.SAIDA ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{entry.type}</span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">PROTOCOLO: #{entry.id.substring(0,8).toUpperCase()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] font-medium text-gray-600">
              <p><b>DATA:</b> {entry.date}</p>
              <p><b>TURNO:</b> {entry.shift}</p>
              <p><b>PREFIXO:</b> {entry.prefix}</p>
              <p><b>KM:</b> {entry.km}</p>
              <p><b>HORÍMETRO:</b> {entry.horimetro}h</p>
              <p><b>MOTORISTA:</b> {entry.driverName}</p>
            </div>
          </div>

          <div className="space-y-10">
            {Array.from(new Set(criteria.map(i => i.category))).map(cat => (
              <div key={cat} className="space-y-2">
                <h3 className="bg-gray-50 text-gray-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded border-l-2 border-blue-500">{cat}</h3>
                <div className="divide-y border rounded-2xl overflow-hidden border-gray-100">
                  {criteria.filter(item => item.category === cat).map(item => {
                    const it = entry.items[item.id];
                    return (
                      <div key={item.id} className="grid grid-cols-12 p-3 text-[11px] items-center gap-3 hover:bg-gray-50/50">
                        <span className="col-span-1 text-gray-300 font-black">#</span>
                        <span className="col-span-5 font-bold text-gray-800 leading-tight">{item.label}</span>
                        <div className="col-span-2 text-center">
                          <span className={`font-black uppercase px-1.5 py-0.5 rounded text-[9px] ${it?.status === ItemStatus.OK ? 'bg-blue-50 text-blue-600' : it?.status === ItemStatus.FALTA ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                            {it?.status || 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-1 text-center">{it?.vistoria ? <CheckCircleIcon className="w-3.5 h-3.5 text-blue-500 mx-auto"/> : <NoSymbolIcon className="w-3.5 h-3.5 text-red-400 mx-auto"/>}</div>
                        <span className="col-span-3 text-[9px] text-gray-400 italic truncate">{it?.obs || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Observações do Condutor</h4>
            <p className="text-xs text-gray-700 leading-relaxed italic">"{entry.generalObservations || "Nenhuma ocorrência registrada pelo condutor."}"</p>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-12 text-center">
            <div className="space-y-3">
              <div className="h-24 flex items-center justify-center border-b-2 border-gray-100 bg-gray-50/30 rounded-t-xl">
                {entry.operatorSignature ? <img src={entry.operatorSignature} className="max-h-20" alt="Assinatura" /> : <div className="text-[10px] text-gray-300 italic uppercase font-black">Não Assinado</div>}
              </div>
              <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{entry.driverName}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Motorista (Condutor)</p>
            </div>

            <div className="space-y-3">
              <div className={`h-24 flex items-center justify-center border-b-2 rounded-t-xl transition-all ${entry.maintenanceApproval ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                {entry.maintenanceApproval ? (
                  <div className="text-blue-600 flex flex-col items-center gap-1">
                    <WrenchScrewdriverIcon className="w-8 h-8"/>
                    <span className="text-[9px] font-black uppercase tracking-wider">REVISADO OK</span>
                  </div>
                ) : (
                  canApproveMaintenance && needsMaintenance ? (
                    <button onClick={() => onApprove('MANUTENCAO')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 print:hidden uppercase tracking-widest">Liberar Manutenção</button>
                  ) : <div className="text-[10px] text-gray-300 italic uppercase font-black">{entry.hasIssues ? 'Aguardando' : 'S/ Pendência'}</div>
                )}
              </div>
              <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{entry.maintenanceApproval?.userName || '...'}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Visto Manutenção</p>
            </div>

            <div className="space-y-3">
              <div className={`h-24 flex items-center justify-center border-b-2 rounded-t-xl transition-all ${entry.operationApproval ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                {entry.operationApproval ? (
                  <div className="text-blue-600 flex flex-col items-center gap-1">
                    <ShieldCheckIcon className="w-8 h-8"/>
                    <span className="text-[9px] font-black uppercase tracking-wider">LIBERADO OK</span>
                  </div>
                ) : (
                  canApproveOperation && needsOperation ? (
                    <button onClick={() => onApprove('OPERACAO')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 print:hidden uppercase tracking-widest">Liberar Operação</button>
                  ) : <div className="text-[10px] text-gray-300 italic uppercase font-black">{entry.hasIssues ? 'Aguardando' : 'S/ Pendência'}</div>
                )}
              </div>
              <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{entry.operationApproval?.userName || '...'}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Visto Operação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
