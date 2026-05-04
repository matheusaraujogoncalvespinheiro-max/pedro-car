import React, { useState, useEffect, useMemo } from 'react';
import { Printer, ChevronRight, Plus, CheckCircle2, MessageCircle, X, Trash2, Search } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';

function ServicesView({ services, setServices, inventory, vehicles = [], triggerNew, onTriggerComplete }) {
  const [printingService, setPrintingService] = useState(null);
  const [isEmittingNFE, setIsEmittingNFE] = useState(false);

  // Estados para o Modal de Nova OS
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newService, setNewService] = useState({ client: '', cpf: '', phone: '', car: '', plate: '', km: '' });
  const [items, setItems] = useState([{ id: 1, type: 'service', description: '', price: '', qty: 1, sku: null }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  useEffect(() => {
    if (triggerNew) {
      handleOpenModal();
      if (onTriggerComplete) onTriggerComplete();
    }
  }, [triggerNew, onTriggerComplete]);

  const handleOpenModal = () => {
    if (!vehicles || vehicles.length === 0) {
      alert("Para abrir uma Ordem de Serviço, você precisa ter pelo menos um carro cadastrado no sistema (através de um orçamento ou OS anterior).");
      return;
    }
    setIsModalOpen(true);
  };

  const handleVehicleSelect = (e) => {
    const selectedPlate = e.target.value;
    if (!selectedPlate) {
      setNewService({ client: '', cpf: '', phone: '', car: '', plate: '', km: '' });
      return;
    }
    const v = vehicles.find(v => v.plate === selectedPlate);
    if (v) {
      let phone = '';
      const lastService = services.find(s => s.plate === selectedPlate && s.phone);
      if (lastService) phone = lastService.phone;
      setNewService({ client: v.owner || '', cpf: v.cpf || '', phone: phone, car: v.model || '', plate: v.plate || '', km: '' });
    }
  };

  const formatKm = (value) => {
    const numbersOnly = value.replace(/\D/g, '');
    if (!numbersOnly) return '';
    return parseInt(numbersOnly, 10).toLocaleString('pt-BR');
  };

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return inventory.filter(p => (p.name || '').toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query));
  }, [searchQuery, inventory]);

  const handleAddItem = (type) => setItems([...items, { id: Date.now(), type, description: '', price: '', qty: 1, sku: null }]);
  const handleRemoveItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, value) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const selectInventoryItem = (itemId, product) => {
    setItems(items.map(i => i.id === itemId ? { ...i, description: product.name, price: product.price, sku: product.sku } : i));
    setSearchQuery('');
    setActiveItemIndex(null);
  };

  const totalService = items.reduce((acc, curr) => acc + ((parseFloat(curr.price) || 0) * (parseInt(curr.qty) || 1)), 0);

  const handleSaveOS = async (e) => {
    e.preventDefault();
    if (!newService.plate) return alert('Selecione um carro cadastrado.');
    if (items.length === 0) return alert('Adicione pelo menos um item à Ordem de Serviço.');

    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    try {
      for (const item of items) {
        if (item.type === 'product' && item.sku) {
          const invItem = inventory.find(i => i.sku === item.sku);
          if (invItem) {
            const invRef = doc(db, 'inventory', invItem.id);
            await updateDoc(invRef, {
              qty: Math.max(0, invItem.qty - item.qty),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await addDoc(collection(db, 'services'), {
        client: newService.client,
        cpf: newService.cpf,
        phone: newService.phone,
        car: newService.car,
        plate: newService.plate.toUpperCase(),
        km: newService.km.replace(/\D/g, ''),
        description: items.map(i => i.description).join(', '),
        items: items.map(i => ({...i, price: parseFloat(i.price) || 0, qty: parseInt(i.qty) || 1})),
        total: totalService,
        status: 'Em Execução',
        date: formattedDate,
        createdAt: serverTimestamp()
      });
      
      setIsModalOpen(false);
      setNewService({ client: '', cpf: '', phone: '', car: '', plate: '', km: '' });
      setItems([{ id: 1, type: 'service', description: '', price: '', qty: 1, sku: null }]);
    } catch (err) {
      console.error("Erro ao salvar OS:", err);
    }
  };

  const handleFinishService = async (id) => {
    try {
      const serviceRef = doc(db, 'services', id);
      await updateDoc(serviceRef, {
        status: 'Finalizado',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Erro ao finalizar serviço:", err);
    }
  };

  const handleEmitNFE = () => {
    setIsEmittingNFE(true);
    
    // Simula comunicação com a SEFAZ
    setTimeout(async () => {
      const today = new Date();
      
      // Gera dados fake de Sefaz
      const nfeData = {
        accessKey: '1723 1000 0000 0000 1234 5500 1000 0000 1234 5678 9012', 
        protocol: `117${Math.floor(Math.random() * 100000000000)}`,
        date: today.toLocaleString('pt-BR'),
        status: 'AUTORIZADO O USO DA NF-E'
      };

      try {
        const serviceRef = doc(db, 'services', printingService.id);
        await updateDoc(serviceRef, {
          nfe: nfeData,
          updatedAt: serverTimestamp()
        });
        
        // Atualiza modal local via objeto atualizado
        setPrintingService({ ...printingService, nfe: nfeData });
        setIsEmittingNFE(false);
      } catch (err) {
        console.error("Erro ao emitir NFe no Firestore:", err);
        setIsEmittingNFE(false);
      }
    }, 2500);
  };

  const handleWhatsAppNotify = (s) => {
    if (!s.phone) {
      alert("O telefone do cliente não foi preenchido neste serviço!");
      return;
    }
    const numbersOnly = s.phone.replace(/\D/g, '');
    let wppNumber = numbersOnly;
    // Se não tiver código do país, assume BR (+55)
    if (numbersOnly.length <= 11) {
      wppNumber = `55${numbersOnly}`;
    }
    
    // Texto pré-definido para notificar que o carro está pronto
    const text = encodeURIComponent(`Olá ${s.client}! 👋\n\nQueria te avisar que o seu carro (*${s.car} - ${s.plate}*) já está pronto e liberado aqui na *Oficina Pedro Car*.\n\nO valor total do serviço ficou em *R$ ${Number(s.total || 0).toFixed(2)}*.\n\nJá pode vir buscar! Qualquer dúvida, estamos à disposição. 🚗💨`);
    
    // Abre em nova aba
    window.open(`https://wa.me/${wppNumber}?text=${text}`, '_blank');
  };

  return (
    <>
      <div className="mb-6 animate-in slide-in-from-left-2 duration-300 print:hidden">
         <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Ordens de <span className="text-red-600">Serviço</span></h3>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 ${printingService ? 'hidden print:grid' : ''} print:hidden`}>
        {services.map(s => (
        <Card key={s.id} className="hover:shadow-2xl transition-all border-l-4 border-l-red-600 group">
          <div className="p-6">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <Badge status={s.status}>{s.status}</Badge>
                   <h5 className="text-xl font-black italic mt-2 uppercase tracking-tighter">{s.car}</h5>
                   <p className="text-xs font-bold text-slate-400">{s.plate} • {s.client}</p>
                </div>
                 <div className="flex gap-2 transition-opacity">
                   {/* Só exibe o Zap se a OS existir e preferencialmente já acabou (ou pra contatar durante a OS) */}
                   {s.phone && (
                      <button onClick={(e) => { e.stopPropagation(); handleWhatsAppNotify(s); }} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Avisar por WhatsApp">
                        <MessageCircle size={16}/>
                      </button>
                   )}
                   <button onClick={() => setPrintingService(s)} className="p-2 bg-slate-100 rounded-lg hover:bg-black hover:text-white transition-all" title="Imprimir Recibo">
                     <Printer size={16}/>
                   </button>
                 </div>
              </div>
              
              <div className="flex flex-col gap-3 py-4 border-y border-slate-50 mb-4">
                 <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>Resumo da OS</span>
                    <span>Mão de Obra + Peças</span>
                 </div>
                 <p className="text-xs text-slate-600 italic">"{s.description || 'Serviços Gerais Prestados'}"</p>
              </div>

             <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Orçamento</p>
                   <p className="text-2xl font-black text-red-600">R$ {Number(s.total || 0).toFixed(2)}</p>
                </div>
                <div className="text-[10px] font-bold text-slate-400">{s.date}</div>
             </div>
          </div>
          
          {s.status === 'Em Execução' ? (
            <div 
              onClick={() => handleFinishService(s.id)}
              className="bg-emerald-500 px-6 py-4 flex justify-between items-center hover:bg-black transition-all cursor-pointer group/btn mt-auto"
            >
               <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                 <CheckCircle2 size={16} /> Finalizar Serviço
               </span>
               <ChevronRight className="text-emerald-200 group-hover/btn:text-white transition-all transform group-hover/btn:translate-x-1" size={16} />
            </div>
          ) : (
            <div 
              onClick={() => setPrintingService(s)}
              className="bg-slate-50 px-6 py-4 flex justify-between items-center group-hover:bg-slate-100 transition-all cursor-pointer mt-auto border-t border-slate-100"
            >
               <span className="text-xs font-black uppercase text-slate-400">Gerar Nota Fiscal</span>
               <ChevronRight className="text-slate-300" size={16} />
            </div>
          )}
        </Card>
      ))}
      <div onClick={handleOpenModal} className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-10 hover:border-red-600 hover:bg-red-50 transition-all cursor-pointer group">
         <Plus className="text-slate-300 group-hover:text-red-600 mb-2" size={40} />
         <p className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-red-600">Nova Ordem de Serviço</p>
      </div>
      </div>

      {/* Modal Nova Ordem de Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 shadow-xl border-none overflow-hidden">
            <div className="p-6 bg-black text-white flex justify-between items-center shrink-0">
              <h3 className="font-black italic uppercase tracking-tighter text-xl">Nova Ordem de Serviço</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveOS} className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
              <div className="p-6 space-y-6 flex-1">
                {/* Seleção de Veículo */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Selecione um Veículo Cadastrado</label>
                  <select 
                    required
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-red-600 outline-none"
                    value={newService.plate}
                    onChange={handleVehicleSelect}
                  >
                    <option value="">-- Escolha um veículo --</option>
                    {vehicles.map(v => (
                      <option key={v.plate} value={v.plate}>{v.plate} - {v.model} ({v.owner})</option>
                    ))}
                  </select>
                </div>

                {/* Info do Veículo / Cliente preenchida */}
                {newService.plate && (
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 relative opacity-70">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">CPF do Cliente</label>
                      <input type="text" readOnly className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 text-slate-500" value={newService.cpf} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome do Cliente</label>
                      <input type="text" readOnly className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 text-slate-500" value={newService.client} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Telefone</label>
                      <input type="text" readOnly className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 text-slate-500" value={newService.phone} />
                    </div>
                    
                    <div className="md:col-span-2 mt-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Veículo / Modelo</label>
                      <input type="text" readOnly className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 text-slate-500" value={newService.car} />
                    </div>
                    <div className="md:col-span-1 mt-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Placa</label>
                      <input type="text" readOnly className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 text-slate-500" value={newService.plate} />
                    </div>
                    <div className="md:col-span-1 mt-2 opacity-100 bg-white">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Km Atual</label>
                      <input required type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-red-600 outline-none text-slate-900" placeholder="10.500" value={newService.km} onChange={e => setNewService({...newService, km: formatKm(e.target.value)})} />
                    </div>
                  </div>
                )}

                {/* Lista de Itens (Serviços / Peças) */}
                {newService.plate && (
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-800">Itens da Ordem de Serviço</h4>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="text-xs py-1.5 px-3" onClick={() => handleAddItem('service')}>+ Serviço</Button>
                        <Button type="button" variant="outline" className="text-xs py-1.5 px-3 border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleAddItem('product')}>+ Peça (Estoque)</Button>
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
                        {items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center relative">
                            <div className="col-span-1 flex justify-center">
                              {item.type === 'service' ? (
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded font-bold uppercase" title="Mão de Obra">MO</span>
                              ) : (
                                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded font-bold uppercase" title="Peça do Estoque">PÇ</span>
                              )}
                            </div>
                            
                            <div className="col-span-6 relative">
                              {item.type === 'product' ? (
                                <>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-red-400" size={12} />
                                    <input 
                                      type="text" 
                                      required
                                      className="w-full border-none bg-red-50 rounded p-1.5 pl-7 text-xs font-bold text-red-900 focus:ring-1 focus:ring-red-600 outline-none placeholder:text-red-300 placeholder:font-normal" 
                                      placeholder="Buscar peça no estoque..." 
                                      value={activeItemIndex === item.id ? searchQuery : (item.description || searchQuery)} 
                                      onChange={(e) => {
                                        setActiveItemIndex(item.id);
                                        setSearchQuery(e.target.value);
                                        updateItem(item.id, 'description', e.target.value);
                                      }}
                                      onFocus={() => {
                                        setActiveItemIndex(item.id);
                                        setSearchQuery(item.description);
                                      }}
                                    />
                                  </div>
                                  {activeItemIndex === item.id && searchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-[200] max-h-48 overflow-y-auto">
                                      {filteredInventory.length > 0 ? (
                                        filteredInventory.map(inv => (
                                          <div 
                                            key={inv.id} 
                                            className="p-2 border-b border-slate-50 hover:bg-red-50 cursor-pointer text-xs"
                                            onClick={() => selectInventoryItem(item.id, inv)}
                                          >
                                            <div className="font-bold text-slate-800">{inv.name}</div>
                                            <div className="flex justify-between mt-1">
                                              <span className="text-[10px] text-slate-400 font-mono">{inv.sku}</span>
                                              <span className="text-[10px] text-red-600 font-bold">Estoque: {inv.qty}</span>
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
                )}
              </div>

              {/* Rodapé fixo com total e botões */}
              <div className="bg-white border-t border-slate-200 p-6 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Total Calculado</p>
                  <p className="text-3xl font-black text-red-600">R$ {(Number(totalService) || 0).toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <button type="submit" disabled={!newService.plate} className="px-6 py-3 rounded-lg font-black transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    Abrir Ordem de Serviço
                  </button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal de Impressão de Nota Fiscal */}
      {printingService && (
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
                    <h1 className="text-3xl font-black text-rose-600 italic uppercase">Nota Fiscal</h1>
                    <p className="text-sm font-black text-slate-400 mt-1 uppercase tracking-widest">Nº {String(printingService.id).padStart(4, '0')}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">OS Data: {printingService.date}</p>
                 </div>
              </div>

              {/* Client Info (Emphasized CPF and Plate) */}
              <div className="mb-8 p-6 bg-slate-50 rounded-xl print:bg-transparent print:p-0 border border-slate-100 print:border-none">
                 <div className="grid grid-cols-2 gap-8 mb-4 pb-4 border-b border-slate-200 print:border-slate-300">
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Destinatário / Cliente</p>
                      <p className="text-xl font-black text-slate-800 uppercase leading-none mb-2">{printingService.client}</p>
                      <div className="inline-block bg-white print:bg-slate-100 border border-slate-200 print:border-none rounded px-3 py-1.5 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase mr-2">CPF:</span>
                        <span className="font-mono text-sm font-bold text-slate-800">{printingService.cpf || 'NÃO INFORMADO'}</span>
                      </div>
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Veículo / Objeto do Serviço</p>
                      <p className="text-xl font-black text-slate-800 uppercase leading-none mb-2">{printingService.car}</p>
                      <div className="inline-block bg-white print:bg-slate-100 border border-slate-200 print:border-none rounded px-3 py-1.5 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase mr-2">PLACA:</span>
                        <span className="font-mono text-sm font-bold text-slate-800">{printingService.plate}</span>
                      </div>
                   </div>
                 </div>
                 
                  <div className="grid grid-cols-2 gap-4 pt-2">
                     <div>
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">KM Registrado</p>
                         <p className="text-sm font-bold text-slate-600 font-mono">{printingService.km ? printingService.km + ' km' : 'Não Inf.'}</p>
                     </div>
                     {!printingService.nfe && (
                       <div>
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Autorização</p>
                           <p className="text-sm font-bold text-emerald-600">Serviço Autorizado e Concluído</p>
                       </div>
                     )}
                  </div>
              </div>

              {/* Informações Fiscais oficiais SEFAZ-TO */}
              {printingService.nfe && (
                <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl print:border-none print:bg-transparent">
                   <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-sm mb-4">
                      <CheckCircle2 size={18} />
                      {printingService.nfe.status}
                   </div>
                   
                   <div className="space-y-3">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Chave de Acesso da NF-e</p>
                        <p className="font-mono text-sm font-bold tracking-widest text-slate-800 break-all">
                          {printingService.nfe.accessKey}
                        </p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Protocolo de Autorização</p>
                          <p className="font-mono text-xs font-bold text-slate-800">{printingService.nfe.protocol}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Data e Hora de Autorização</p>
                          <p className="font-mono text-xs font-bold text-slate-800">{printingService.nfe.date}</p>
                        </div>
                     </div>
                   </div>
                   <p className="text-[10px] italic text-slate-500 mt-4 max-w-xl">
                      Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizadora.
                   </p>
                </div>
              )}

              {/* Items Table */}
              <div className="mb-8">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest print:bg-slate-100">
                          <th className="py-3 px-4 rounded-tl-lg">Item / Serviço Executado</th>
                          <th className="py-3 px-4 text-center">Qt.</th>
                          <th className="py-3 px-4 text-right">V. Unit.</th>
                          <th className="py-3 px-4 text-right rounded-tr-lg">Total</th>
                       </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700">
                       {printingService.items && printingService.items.length > 0 ? (
                         printingService.items.map((it, idx) => (
                           <tr key={idx} className="border-b border-slate-100">
                              <td className="py-4 px-4 font-bold uppercase text-xs">
                                {it.description} 
                                {it.type === 'product' && <span className="text-[10px] bg-rose-100 text-rose-700 font-black px-1.5 py-0.5 rounded ml-2 align-middle">PEÇA</span>}
                              </td>
                              <td className="py-4 px-4 text-center font-mono text-xs">{it.qty}</td>
                              <td className="py-4 px-4 text-right text-slate-500 font-mono text-xs">R$ {Number(it.price || 0).toFixed(2)}</td>
                              <td className="py-4 px-4 text-right font-black text-slate-800 font-mono text-sm">R$ {Number((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan="4" className="py-8 px-4 text-sm text-slate-800 font-bold uppercase text-center">
                             {printingService.description || 'Serviços Gerais Prestados'}
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* Total Calculation & Signatures Side-by-Side */}
              <div className="flex flex-col md:flex-row print:flex-row justify-between items-end gap-12 mt-12 pt-8 border-t border-slate-100">
                 
                 {/* Signatures */}
                 <div className="flex-1 w-full flex items-center h-full pb-4">
                    <p className="text-[11px] text-slate-500 font-bold italic w-full">
                      "Declaro que os serviços e produtos listados acima, vinculados ao veículo placa <strong>{printingService.plate}</strong>, foram prestados e conferidos satisfatoriamente."
                    </p>
                 </div>

                 {/* Total Calculation */}
                 <div className="w-80 shrink-0 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-slate-50 print:border print:border-slate-100">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-2">
                       <span>Total Bruto</span>
                       <span className="font-mono">R$ {Number(printingService.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-end">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total a Pagar</span>
                       <span className="text-2xl font-black text-rose-600 font-mono">R$ {Number(printingService.total || 0).toFixed(2)}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Painel de Controle Fixado P/ Impressão (Não aparece no papel) */}
           <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-center gap-4 print:hidden z-[220]">
              <Button variant="outline" onClick={() => setPrintingService(null)}>Voltar p/ Sistema</Button>
              
              {!printingService.nfe && (
                <Button 
                  variant="primary" 
                  onClick={handleEmitNFE} 
                  disabled={isEmittingNFE}
                  className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 focus:ring-emerald-600/20"
                >
                  {isEmittingNFE ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-t-white border-r-white border-b-white/30 border-l-white/30 animate-spin mr-2"></div>
                      Transmitindo para SEFAZ-TO...
                    </>
                  ) : 'Emitir NF-e (SEFAZ-TO)'}
                </Button>
              )}
              
              <Button variant="primary" icon={Printer} onClick={() => window.print()} className="bg-rose-600 hover:bg-rose-700 border-rose-600 focus:ring-rose-600/20">
                Imprimir NFs / PDF
              </Button>
           </div>
        </div>
      )}
    </>
  );
}

export default ServicesView;