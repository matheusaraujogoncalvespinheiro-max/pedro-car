import React, { useState, useMemo } from 'react';
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
import Button from './components/ui/Button';
import Card from './components/ui/Card';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerNewAction, setTriggerNewAction] = useState(false);
  
  // Estados Globais (Mock Data)
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Óleo Sintético 5W30', sku: 'OL-5W30', category: 'Lubrificantes', price: 45.90, qty: 12 },
    { id: 2, name: 'Pastilha de Travão Diant.', sku: 'PT-001', category: 'Travões', price: 120.00, qty: 3 },
    { id: 3, name: 'Filtro de Ar G-III', sku: 'FA-G3', category: 'Filtros', price: 35.00, qty: 25 },
  ]);

  const [services, setServices] = useState([
    { id: 2, client: 'Maria Santos', car: 'Corolla XEI', plate: 'XYZ-9876', total: 1200.00, status: 'Finalizado', date: '10/10/2023', description: 'Troca de óleo, pastilhas de travão e revisão geral do sistema elétrico.' },
  ]);

  const [budgets, setBudgets] = useState([
    { 
      id: 1, client: 'João Silva', car: 'Golf GTI', plate: 'ABC-1234', km: '45000', total: 450.00, status: 'Pendente', date: '12/10/2023',
      items: [
        { id: 1, type: 'service', description: 'Troca de pastilhas e alinhamento', price: 450.00, qty: 1 }
      ]
    },
    { 
      id: 2, client: 'Lucas Lima', car: 'Honda Civic', plate: 'DEF-5678', km: '82100', total: 850.00, status: 'Pendente', date: '15/10/2023',
      items: [
        { id: 1, type: 'service', description: 'Mão de obra troca de embreagem', price: 500.00, qty: 1 },
        { id: 2, type: 'product', description: 'Kit Embreagem LUK', price: 350.00, qty: 1, sku: 'LUK-123' }
      ]
    }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 1, date: '15/10/2023', description: 'Serviço - Corolla XEI (Maria)', category: 'Mão de Obra', type: 'income', amount: 800.00 },
    { id: 2, date: '14/10/2023', description: 'Compra de Peças - Fornecedor A', category: 'Estoque', type: 'expense', amount: 1250.00 },
    { id: 3, date: '12/10/2023', description: 'Serviço - Golf GTI (João)', category: 'Peças e Serviço', type: 'income', amount: 450.00 },
    { id: 4, date: '05/10/2023', description: 'Conta de Luz', category: 'Custos Fixos', type: 'expense', amount: 350.00 },
  ]);

  const activeVehicles = useMemo(() => {
    const vMap = new Map();
    // Adiciona veículos das ordens de serviço
    services.forEach(s => {
      if (s.plate && !vMap.has(s.plate)) {
        vMap.set(s.plate, { id: `sv-${s.id}`, brand: '', model: s.car, owner: s.client, cpf: s.cpf, plate: s.plate, year: 'N/I', evaluation: 'Veículo em atendimento.', historyIds: [] });
      }
    });
    // Adiciona veículos dos orçamentos
    budgets.forEach(b => {
      if (b.plate && !vMap.has(b.plate)) {
        vMap.set(b.plate, { id: `bg-${b.id}`, brand: '', model: b.car, owner: b.client, cpf: b.cpf, plate: b.plate, year: 'N/I', evaluation: 'Veículo orçado.', historyIds: [] });
      }
    });
    return Array.from(vMap.values());
  }, [services, budgets]);

  const stats = useMemo(() => {
    const totalRev = services.reduce((acc, s) => acc + s.total, 0);
    const lowStock = inventory.filter(i => i.qty < 5).length;
    return { totalRev, lowStock, pendentes: services.filter(s => s.status !== 'Finalizado').length + budgets.length };
  }, [services, inventory, budgets]);

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
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
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
          <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl">
             <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">P</div>
             <div>
                <p className="text-xs font-bold">Pedro Admin</p>
                <p className="text-[10px] text-zinc-500">Oficina Pedro Car</p>
             </div>
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