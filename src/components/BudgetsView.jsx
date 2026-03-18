import { Printer, ChevronRight, Plus, CalendarClock, X, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

function BudgetsView({ budgets, setBudgets, inventory, setInventory, services, setServices, triggerNew, onTriggerComplete }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printingBudget, setPrintingBudget] = useState(null);
  
  // Efeito para escutar o click no botão do header global
  useEffect(() => {
    if (triggerNew) {
      setIsModalOpen(true);
      if (onTriggerComplete) onTriggerComplete();
    }
  }, [triggerNew, onTriggerComplete]);

  // Estado do formulário
  const [newBudget, setNewBudget] = useState({
    client: '',
    cpf: '',
    phone: '',
    car: '',
    plate: '',
    km: ''
  });

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatName = (value) => {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Não capitaliza preposições comuns
        if (['de', 'da', 'do', 'dos', 'das', 'e'].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const formatKm = (value) => {
    const numbersOnly = value.replace(/\D/g, '');
    if (!numbersOnly) return '';
    return parseInt(numbersOnly, 10).toLocaleString('pt-BR');
  };

  const handleCpfChange = (e) => {
    const formattedCpf = formatCPF(e.target.value);
    const numericCpf = formattedCpf.replace(/\D/g, ''); // Para a busca no histórico usamos apensa números ou o formato completo, dependendo de como salvamos.
    
    // Como os CPFs passados podem estar formatados ou não, vamos buscar pela string contendo só números para garantir
    if (numericCpf.length === 11) {
      // Tenta achar em serviços antigos (comparando o CPF numérico)
      let match = services.slice().reverse().find(s => (s.cpf || '').replace(/\D/g, '') === numericCpf);
      if (!match) {
         match = budgets.slice().reverse().find(b => (b.cpf || '').replace(/\D/g, '') === numericCpf);
      }

      if (match) {
         setNewBudget(prev => ({
           ...prev,
           cpf: formattedCpf,
           client: match.client || prev.client,
           phone: match.phone || prev.phone,
           car: match.car || prev.car,
           plate: match.plate || prev.plate
         }));
         return;
      }
    }
    
    setNewBudget(prev => ({ ...prev, cpf: formattedCpf }));
  };

  const handlePhoneChange = (e) => {
    setNewBudget(prev => ({ ...prev, phone: formatPhone(e.target.value) }));
  };

  // Itens dinâmicos que substituirão a 'description' antiga
  const [items, setItems] = useState([
    { id: 1, type: 'service', description: '', price: '', qty: 1, sku: null }
  ]);
  
  // Estado para busca dinâmica no estoque
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  // Filtra inventário para o dropdown
  const filteredInventory = useMemo(() => {
    if (!searchQuery) return [];
    return inventory.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, inventory]);

  const handleAddItem = (type) => {
    setItems([
      ...items,
      { id: Date.now(), type, description: '', price: '', qty: 1, sku: null }
    ]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const selectInventoryItem = (itemId, product) => {
    setItems(items.map(i => 
      i.id === itemId 
        ? { ...i, description: product.name, price: product.price, sku: product.sku } 
        : i
    ));
    setSearchQuery('');
    setActiveItemIndex(null);
  };

  const totalBudget = items.reduce((acc, curr) => acc + ((parseFloat(curr.price) || 0) * (parseInt(curr.qty) || 1)), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if(items.length === 0) return alert('Adicione pelo menos um item ao orçamento.');

    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    try {
      await addDoc(collection(db, 'budgets'), {
        client: newBudget.client,
        cpf: newBudget.cpf,
        phone: newBudget.phone,
        car: newBudget.car,
        plate: newBudget.plate.toUpperCase(),
        km: newBudget.km.replace(/\D/g, ''),
        description: items.map(i => i.description).join(', '),
        items: items.map(i => ({...i, price: parseFloat(i.price) || 0, qty: parseInt(i.qty) || 1})),
        total: totalBudget,
        status: 'Pendente',
        date: formattedDate,
        createdAt: serverTimestamp()
      });
      
      setIsModalOpen(false);
      setNewBudget({ client: '', cpf: '', phone: '', car: '', plate: '', km: '' });
      setItems([{ id: 1, type: 'service', description: '', price: '', qty: 1, sku: null }]);
    } catch (err) {
      console.error("Erro ao salvar orçamento:", err);
    }
  };

  const approveBudget = async (budget) => {
    try {
      // 1. Descontar os itens de produto do estoque no Firestore
      for (const budgetItem of budget.items) {
        if (budgetItem.type === 'product' && budgetItem.sku) {
          const invItem = inventory.find(i => i.sku === budgetItem.sku);
          if (invItem) {
            const invRef = doc(db, 'inventory', invItem.id);
            await updateDoc(invRef, {
              qty: Math.max(0, invItem.qty - budgetItem.qty),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      // 2. Criar uma OS nos 'services' no Firestore
      const { id, ...budgetData } = budget; // Remove o ID antigo do orçamento
      await addDoc(collection(db, 'services'), {
        ...budgetData,
        status: 'Em Execução',
        createdAt: serverTimestamp()
      });

      // 3. Remover o orçamento do Firestore
      await deleteDoc(doc(db, 'budgets', budget.id));
    } catch (err) {
      console.error("Erro ao aprovar orçamento:", err);
    }
  };


  return (
    <>
      <div className="mb-6 animate-in slide-in-from-left-2 duration-300 print:hidden">
         <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Orçamentos <span className="text-amber-500">Abertos</span></h3>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 ${printingBudget ? 'hidden print:grid' : ''} print:hidden`}>
        {budgets.map(b => (
          <Card key={b.id} className="hover:shadow-2xl transition-all border-l-4 border-l-amber-500 group flex flex-col">
            <div className="p-6 flex-1">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <Badge status={b.status}>{b.status}</Badge>
                     <h5 className="text-xl font-black italic mt-2 uppercase tracking-tighter">{b.car}</h5>
                     <p className="text-xs font-bold text-slate-400">{b.plate} • {b.km ? `${b.km} KM` : 'KM ñ inf.'} • {b.client}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => setPrintingBudget(b)}
                       className="p-2 bg-slate-100 rounded-lg hover:bg-black hover:text-white transition-all"
                     >
                       <Printer size={16}/>
                     </button>
                  </div>
               </div>
               
               <div className="flex flex-col gap-2 py-4 border-y border-slate-50 mb-4 h-32 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase sticky top-0 bg-white pb-2 shadow-[0_4px_4px_-4px_rgba(0,0,0,0.05)]">
                     <span>Item</span>
                     <span>Qtd x Val</span>
                  </div>
                  {b.items && b.items.length > 0 ? (
                    b.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs items-center gap-2">
                         <span className={`truncate ${item.type === 'product' ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                           {item.type === 'product' ? `📦 ${item.description}` : `🔧 ${item.description}`}
                         </span>
                          <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                            {item.qty} x {(item.price || 0).toFixed(2)}
                          </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-600 italic">"{b.description}"</p> // Fallback para dados velhos mockados s/ items
                  )}
               </div>

               <div className="flex justify-between items-end mt-auto">
                  <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Projetado</p>
                   <p className="text-2xl font-black text-amber-600">R$ {(b.total || 0).toFixed(2)}</p>
                </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <CalendarClock size={12} /> {b.date}
                  </div>
               </div>
            </div>
            <div 
              onClick={() => approveBudget(b)}
              className="mt-auto bg-amber-500 px-6 py-4 flex justify-between items-center hover:bg-black transition-all cursor-pointer group/btn"
            >
               <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                 <CheckCircle2 size={16} /> Aprovar e Gerar OS
               </span>
               <ChevronRight className="text-amber-200 group-hover/btn:text-white transition-all transform group-hover/btn:translate-x-1" size={16} />
            </div>
          </Card>
        ))}
        
        <div 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-10 min-h-[300px] hover:border-amber-500 hover:bg-amber-50 transition-all cursor-pointer group"
        >
           <Plus className="text-slate-300 group-hover:text-amber-500 mb-2" size={40} />
           <p className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-amber-500">Novo Orçamento</p>
        </div>
      </div>

      {/* Modal Novo Orçamento Avançado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 shadow-xl border-none overflow-hidden">
            <div className="p-6 bg-black text-white flex justify-between items-center shrink-0">
              <h3 className="font-black italic uppercase tracking-tighter text-xl">Criar Novo Orçamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                {/* Info do Veículo / Cliente */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">CPF do Cliente</label>
                    <input type="text" maxLength="14" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="000.000.000-00" value={newBudget.cpf} onChange={handleCpfChange} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Cliente</label>
                    <input required type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: João da Silva" value={newBudget.client} onChange={e => setNewBudget({...newBudget, client: formatName(e.target.value)})} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Telefone / WhatsApp</label>
                    <input type="text" maxLength="15" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="(00) 00000-0000" value={newBudget.phone} onChange={handlePhoneChange} />
                  </div>
                  
                  <div className="md:col-span-2 mt-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Veículo / Modelo</label>
                    <input required type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: Golf" value={newBudget.car} onChange={e => setNewBudget({...newBudget, car: e.target.value})} />
                  </div>
                  <div className="md:col-span-1 mt-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Placa</label>
                    <input required type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none uppercase placeholder:normal-case" placeholder="ABC-1234" value={newBudget.plate} onChange={e => setNewBudget({...newBudget, plate: e.target.value})} />
                  </div>
                  <div className="md:col-span-1 mt-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Km Atual</label>
                    <input required type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="10.500" value={newBudget.km} onChange={e => setNewBudget({...newBudget, km: formatKm(e.target.value)})} />
                  </div>
                </div>

                {/* Lista de Itens (Serviços / Peças) */}
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-800">Itens do Orçamento</h4>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="text-xs py-1.5 px-3" onClick={() => handleAddItem('service')}>+ Serviço</Button>
                      <Button type="button" variant="outline" className="text-xs py-1.5 px-3 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => handleAddItem('product')}>+ Peça (Estoque)</Button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-visible">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 p-3 border-b border-slate-50 bg-slate-50 rounded-t-xl">
                       <div className="col-span-1 text-center">Tipo</div>
                       <div className="col-span-6">Descrição / Peça</div>
                       <div className="col-span-2 text-center">Valor Unit.</div>
                       <div className="col-span-2 text-center">Qtd</div>
                       <div className="col-span-1 text-center">Ação</div>
                    </div>
                    
                    <div className="divide-y divide-slate-50">
                      {items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center relative">
                          <div className="col-span-1 flex justify-center">
                            {item.type === 'service' ? (
                              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded font-bold uppercase" title="Mão de Obra">MO</span>
                            ) : (
                              <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-1 rounded font-bold uppercase" title="Peça do Estoque">PÇ</span>
                            )}
                          </div>
                          
                          <div className="col-span-6 relative">
                            {item.type === 'product' ? (
                              <>
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-400" size={12} />
                                  <input 
                                    type="text" 
                                    required
                                    className="w-full border-none bg-amber-50 rounded p-1.5 pl-7 text-xs font-bold text-amber-900 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-amber-300 placeholder:font-normal" 
                                    placeholder="Buscar peça no estoque..." 
                                    value={activeItemIndex === item.id ? searchQuery : (item.description || searchQuery)} 
                                    onChange={(e) => {
                                      setActiveItemIndex(item.id);
                                      setSearchQuery(e.target.value);
                                      updateItem(item.id, 'description', e.target.value); // Temporário p input visual
                                    }}
                                    onFocus={() => {
                                      setActiveItemIndex(item.id);
                                      setSearchQuery(item.description);
                                    }}
                                  />
                                </div>
                                {/* Dropdown de busca (Visível apenas se esse for o item ativo e tiver texto) */}
                                {activeItemIndex === item.id && searchQuery && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[200] max-h-48 overflow-y-auto">
                                    {filteredInventory.length > 0 ? (
                                      filteredInventory.map(inv => (
                                        <div 
                                          key={inv.id} 
                                          className="p-2 border-b border-slate-50 hover:bg-amber-50 cursor-pointer text-xs"
                                          onClick={() => selectInventoryItem(item.id, inv)}
                                        >
                                          <div className="font-bold text-slate-800">{inv.name}</div>
                                          <div className="flex justify-between mt-1">
                                            <span className="text-[10px] text-slate-400 font-mono">{inv.sku}</span>
                                            <span className="text-[10px] text-amber-600 font-bold">Estoque: {inv.qty}</span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                       <div className="p-3 text-xs text-center text-slate-400">Nenhuma peça encontrada.</div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <input 
                                type="text" 
                                required
                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-bold focus:ring-1 focus:ring-slate-400 outline-none" 
                                placeholder="Descreva o serviço..." 
                                value={item.description} 
                                onChange={e => updateItem(item.id, 'description', e.target.value)} 
                              />
                            )}
                          </div>
                          
                          <div className="col-span-2 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                            <input 
                              type="number" 
                              required
                              step="0.01"
                              className="w-full border border-slate-200 rounded p-1.5 pl-6 text-xs font-bold focus:ring-1 focus:ring-slate-400 outline-none text-right" 
                              placeholder="0.00" 
                              value={item.price} 
                              onChange={e => updateItem(item.id, 'price', e.target.value)} 
                            />
                          </div>
                          
                          <div className="col-span-2">
                             <input 
                                type="number" 
                                required
                                min="1"
                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-bold focus:ring-1 focus:ring-slate-400 outline-none text-center" 
                                value={item.qty} 
                                onChange={e => updateItem(item.id, 'qty', e.target.value)} 
                              />
                          </div>
                          
                          <div className="col-span-1 flex justify-center">
                            <button 
                              type="button" 
                              className="text-slate-300 hover:text-red-600 transition-colors p-1"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {items.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        Nenhum item adicionado. Use os botões acima.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé fixo com total e botões */}
              <div className="bg-white border-t border-slate-200 p-6 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Total Calculado</p>
                <p className="text-3xl font-black text-amber-600">R$ {(totalBudget || 0).toFixed(2)}</p>
              </div>
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <button type="submit" className="px-6 py-3 rounded-lg font-black transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-900/20">
                    Registrar Orçamento
                  </button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal de Impressão de Orçamento Detalhado */}
      {printingBudget && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto print:static print:inset-auto print:overflow-visible print:block animate-in fade-in duration-300">
           <div className="max-w-3xl mx-auto p-10 print:p-0 print:m-0 print:max-w-full print:w-full relative font-sans text-slate-800 pb-32 print:pb-0 print:mb-0">
              {/* Header Invoice */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                 <div className="flex items-center gap-4">
                    <div className="bg-black p-2 rounded-lg">
                      <img src="/logo.png" alt="Pedro Car" className="w-24 object-contain" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black italic uppercase tracking-tighter">Pedro Car Oficina</h2>
                       <p className="text-xs text-slate-500 font-bold">Av. Principal, S/N<br/>Contato: (00) 0000-0000</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <h1 className="text-3xl font-black text-amber-600 italic uppercase">Orçamento</h1>
                    <p className="text-sm font-black text-slate-400 mt-1 uppercase tracking-widest">Nº {String(printingBudget.id).padStart(4, '0')}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Data: {printingBudget.date}</p>
                 </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 rounded-xl print:bg-transparent print:p-0 border border-slate-100 print:border-none">
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Cliente</p>
                    <p className="text-lg font-black text-slate-800 uppercase">{printingBudget.client}</p>
                    {printingBudget.cpf && <p className="text-sm font-bold text-slate-500 mt-1">CPF: {printingBudget.cpf}</p>}
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Veículo</p>
                       <p className="text-sm font-bold text-slate-800 uppercase">{printingBudget.car}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Placa</p>
                       <p className="text-sm font-bold text-slate-800 uppercase">{printingBudget.plate}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">KM Atual</p>
                       <p className="text-sm font-bold text-amber-600">{printingBudget.km || 'N/I'}</p>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest print:bg-slate-100">
                          <th className="py-3 px-4 rounded-tl-lg">Item / Serviço</th>
                          <th className="py-3 px-4 text-center">Qtd</th>
                          <th className="py-3 px-4 text-right">V. Unitário</th>
                          <th className="py-3 px-4 text-right rounded-tr-lg">Subtotal</th>
                       </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                       {printingBudget.items && printingBudget.items.length > 0 ? (
                         printingBudget.items.map((it, idx) => (
                           <tr key={idx} className="border-b border-slate-100">
                              <td className="py-4 px-4 font-bold uppercase text-xs">
                                {it.description} 
                                {it.type === 'product' && <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded ml-2 align-middle">PEÇA</span>}
                              </td>
                              <td className="py-4 px-4 text-center font-mono text-xs">{it.qty}</td>
                              <td className="py-4 px-4 text-right text-slate-500 font-mono text-xs">R$ {(it.price || 0).toFixed(2)}</td>
                              <td className="py-4 px-4 text-right font-black text-slate-800 font-mono text-sm">R$ {((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan="4" className="py-8 px-4 text-sm text-slate-500 italic text-center">
                             {printingBudget.description || 'Nenhum item detalhado neste orçamento.'}
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* Total Calculation & Message Side-by-Side */}
              <div className="flex flex-col md:flex-row print:flex-row justify-between items-end gap-12 mt-16 pt-8 border-t border-slate-100">
                 
                 {/* Message */}
                 <div className="flex-1 w-full flex items-center h-full pb-4">
                    <p className="text-[11px] text-slate-500 font-bold italic w-full">
                      "Autorizo a execução dos serviços e a aplicação das peças descritas neste orçamento."
                    </p>
                 </div>

                 {/* Total Calculation */}
                  <div className="w-80 shrink-0 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-slate-50 print:border print:border-slate-100">
                     <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-2">
                        <span>Soma Base</span>
                        <span className="font-mono">R$ {(printingBudget.total || 0).toFixed(2)}</span>
                     </div>
                     <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total do Orçamento</span>
                        <span className="text-2xl font-black text-amber-600 font-mono">R$ {(printingBudget.total || 0).toFixed(2)}</span>
                     </div>
                  </div>
              </div>
           </div>

           {/* Painel de Controle Fixado P/ Impressão (Não aparece no papel) */}
           <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-center gap-4 print:hidden z-[220]">
              <Button variant="outline" onClick={() => setPrintingBudget(null)}>Fechar Visualização</Button>
              <Button variant="primary" icon={Printer} onClick={() => window.print()}>
                Confirmar Impressão
              </Button>
           </div>
        </div>
      )}
    </>
  );
}

export default BudgetsView;
