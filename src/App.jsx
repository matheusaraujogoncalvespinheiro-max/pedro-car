import React, { useState, useMemo, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Wrench, 
  Car, 
  Plus,
  DollarSign
} from 'lucide-react';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import ServicesView from './components/ServicesView';
import VehiclesView from './components/VehiclesView';
import FinancesView from './components/FinancesView';
import BudgetsView from './components/BudgetsView';
import LoginView from './components/LoginView';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('pedro-car-auth') === 'true';
  });
  const [loading, setLoading] = useState(true); // New loading state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerNewAction, setTriggerNewAction] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('pedro-car-auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pedro-car-auth');
  };
  
  // Estados Globais (Carregados do Firebase)
  const [inventory, setInventory] = useState([]);
  const [services, setServices] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Sync Real-time com Firebase
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const qInventory = query(collection(db, 'inventory'), orderBy('name'));
    const qServices = query(collection(db, 'services'), orderBy('date', 'desc'));
    const qBudgets = query(collection(db, 'budgets'), orderBy('date', 'desc'));
    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'));

    const unsubInventory = onSnapshot(qInventory, 
      (snapshot) => {
        setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Erro no listener de inventário:", error)
    );

    const unsubServices = onSnapshot(qServices, 
      (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Erro no listener de serviços:", error)
    );

    const unsubBudgets = onSnapshot(qBudgets, 
      (snapshot) => {
        setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Erro no listener de orçamentos:", error)
    );

    const unsubTransactions = onSnapshot(qTransactions, 
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Erro no listener de transações:", error)
    );

    // After listeners are set up, consider loading done
    setLoading(false);

    return () => {
      unsubInventory();
      unsubServices();
      unsubBudgets();
      unsubTransactions();
    };
  }, [isAuthenticated]);

  const activeVehicles = useMemo(() => {
    const vMap = new Map();
    if (!Array.isArray(services)) return [];
    
    // Adiciona veículos das ordens de serviço
    services.forEach(s => {
      if (s && s.plate && !vMap.has(s.plate)) {
        vMap.set(s.plate, { id: `sv-${s.id}`, brand: '', model: s.car || 'Modelo N/I', owner: s.client || 'Cliente N/I', cpf: s.cpf || '', plate: s.plate, year: s.year || 'N/I', evaluation: s.evaluation || 'Veículo em atendimento.', historyIds: [] });
      }
    });
    // Adiciona veículos dos orçamentos
    if (Array.isArray(budgets)) {
      budgets.forEach(b => {
        if (b && b.plate && !vMap.has(b.plate)) {
          vMap.set(b.plate, { id: `bg-${b.id}`, brand: '', model: b.car || 'Modelo N/I', owner: b.client || 'Cliente N/I', cpf: b.cpf || '', plate: b.plate, year: b.year || 'N/I', evaluation: b.evaluation || 'Veículo orçado.', historyIds: [] });
        }
      });
    }
    return Array.from(vMap.values());
  }, [services, budgets]);

  const stats = useMemo(() => {
    const safeServices = Array.isArray(services) ? services : [];
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const safeInventory = Array.isArray(inventory) ? inventory : [];

    const totalRev = safeServices.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const lowStock = safeInventory.filter(i => (Number(i.qty) || 0) < 5).length;
    const pendentes = safeServices.filter(s => s.status !== 'Finalizado').length + safeBudgets.length;
    
    return { totalRev, lowStock, pendentes };
  }, [services, inventory, budgets]);

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl font-bold">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-black text-white fixed inset-y-0 flex flex-col z-50 print:hidden">
        <div className="p-8 flex items-center justify-center">
          <img src="/logo.png" alt="Pedro Car Logo" className="w-full max-w-[180px] object-contain" />
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'finances', label: 'Receitas & Despesas', icon: DollarSign },
            { id: 'inventory', label: 'Estoque de Peças', icon: Package },
            { id: 'budgets', label: 'Orçamentos', icon: FileText },
            { id: 'services', label: 'Ordens de Serviço', icon: Wrench },
            { id: 'vehicles', label: 'Veículos & Avaliação', icon: Car },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setTriggerNewAction(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all cursor-pointer relative z-[60] ${
                activeTab === item.id 
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' 
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-6 border-t border-zinc-900">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl">
               <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white">P</div>
               <div>
                  <p className="text-xs font-bold">Pedro Admin</p>
                  <p className="text-[10px] text-zinc-500">Oficina Pedro Car</p>
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors"
            >
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 ml-64 p-10 print:ml-0 print:p-0">
        <header className="mb-10 flex justify-between items-end print:hidden">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'finances' && 'Gestão Financeira'}
              {activeTab === 'inventory' && 'Controle de Estoque'}
              {activeTab === 'budgets' && 'Orçamentos'}
              {activeTab === 'services' && 'Ordens de Serviço'}
              {activeTab === 'vehicles' && 'Gestão de Veículos'}
            </h2>
            <div className="h-1.5 w-24 bg-red-600 mt-2 rounded-full"></div>
          </div>
          {activeTab !== 'dashboard' && (
            <div className="flex gap-3">
               <Button variant="outline">Relatórios</Button>
               {activeTab !== 'vehicles' && (
                 <Button variant="primary" icon={Plus} onClick={() => setTriggerNewAction(true)}>
                   {activeTab === 'budgets' ? 'Novo Orçamento' : 
                    activeTab === 'services' ? 'Nova OS' : 
                    activeTab === 'inventory' ? 'Nova Peça' : 'Novo Registro'}
                 </Button>
               )}
            </div>
          )}
        </header>

        {activeTab === 'dashboard' && <DashboardView stats={stats} services={services} inventory={inventory} />}
        {activeTab === 'finances' && <FinancesView transactions={transactions} />}
        {activeTab === 'inventory' && <InventoryView inventory={inventory} setInventory={setInventory} triggerNew={triggerNewAction} onTriggerComplete={() => setTriggerNewAction(false)} />}
        {activeTab === 'budgets' && <BudgetsView budgets={budgets} setBudgets={setBudgets} inventory={inventory} setInventory={setInventory} services={services} setServices={setServices} triggerNew={triggerNewAction} onTriggerComplete={() => setTriggerNewAction(false)} />}
        {activeTab === 'services' && <ServicesView services={services} setServices={setServices} inventory={inventory} />}
        {activeTab === 'vehicles' && <VehiclesView vehicles={activeVehicles} services={services} budgets={budgets} />}
      </main>
    </div>
  );
}