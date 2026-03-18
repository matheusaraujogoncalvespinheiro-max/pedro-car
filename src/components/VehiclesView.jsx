import React, { useState } from 'react';
import { Car, Gauge, ClipboardCheck, Fuel, X, FileText, Wrench, CalendarClock } from 'lucide-react';
import Card from './ui/Card';

function VehiclesView({ vehicles, services = [], budgets = [] }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const getVehicleHistory = (plate) => {
    const sList = services.filter(s => s.plate === plate).map(s => ({ ...s, historyType: 'Serviço', icon: Wrench }));
    const bList = budgets.filter(b => b.plate === plate).map(b => ({ ...b, historyType: 'Orçamento', icon: FileText }));
    
    // Sort combined by date string simply (assuming DD/MM/YYYY)
    return [...sList, ...bList].sort((a, b) => {
      const da = (a.date || '').split('/').reverse().join('') || '00000000';
      const db = (b.date || '').split('/').reverse().join('') || '00000000';
      return db.localeCompare(da);
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
      {vehicles.map(v => (
        <Card key={v.id} className="border-none shadow-xl">
          <div className="bg-black text-white p-8 relative flex flex-col justify-end min-h-[160px]">
             <Car className="absolute top-4 right-4 text-red-600/20" size={120} />
             <div className="relative z-10">
                <h4 className="text-3xl font-black italic uppercase tracking-tighter">{v.brand} {v.model}</h4>
                <div className="flex gap-4 mt-2">
                   <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase tracking-widest">
                      <Gauge size={14}/> {v.year}
                   </div>
                   <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase tracking-widest">
                      <ClipboardCheck size={14}/> {v.plate}
                   </div>
                </div>
             </div>
          </div>
          <div className="p-8">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white"><Car size={20}/></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proprietário</p>
                   <p className="font-black text-slate-800 uppercase">{v.owner}</p>
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                   <ClipboardCheck className="text-red-600" size={18} />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avaliação Técnica de Entrada</p>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">
                   {v.evaluation}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pintura: OK</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Óleo: Troca</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Fuel className="text-slate-400" size={14} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Combustível: 1/4</span>
                   </div>
                </div>
             </div>
             
             <button 
               onClick={() => setSelectedVehicle(v)}
               className="w-full mt-6 py-3 border-2 border-black text-black font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all rounded-lg"
             >
                Ver Histórico Completo
             </button>
          </div>
        </Card>
      ))}
      </div>

      {/* Modal de Histórico Completo */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 shadow-xl border-none overflow-hidden">
            <div className="p-6 bg-black text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-600 rounded-lg text-white"><Car size={24}/></div>
                 <div>
                    <h3 className="font-black italic uppercase tracking-tighter text-xl leading-none">{selectedVehicle.model} <span className="text-sm font-bold text-red-500"> {selectedVehicle.plate}</span></h3>
                    <p className="text-xs font-bold text-zinc-400 mt-1 uppercase">Proprietário: {selectedVehicle.owner} {selectedVehicle.cpf && `(CPF: ${selectedVehicle.cpf})`}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-zinc-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 relative p-8">
               <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                 <CalendarClock size={16}/> Linha do Tempo de Atendimentos
               </h4>

               <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                  {getVehicleHistory(selectedVehicle.plate).length === 0 ? (
                    <p className="pl-8 text-sm text-slate-500 italic">Nenhum histórico encontrado para este veículo.</p>
                  ) : (
                    getVehicleHistory(selectedVehicle.plate).map((item, idx) => (
                      <div key={`${item.historyType}-${item.id}-${idx}`} className="relative pl-8 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                         <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center text-white border-4 border-slate-50 ${item.historyType === 'Serviço' ? 'bg-red-600' : 'bg-amber-500'}`}>
                            <item.icon size={12} />
                         </div>
                         
                         <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${item.historyType === 'Serviço' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {item.historyType}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{item.date}</span>
                                  </div>
                                  <h5 className="font-black text-slate-800 uppercase">{item.description || 'Itens diversos'}</h5>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase">Valor</p>
                                  <p className="font-bold font-mono text-slate-800">R$ {(item.total || 0).toFixed(2)}</p>
                               </div>
                            </div>
                            
                            {/* Itens detalhados */}
                            {item.items && item.items.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Detalhes Executados</p>
                                <ul className="space-y-1">
                                  {item.items.map((it, iIdx) => (
                                    <li key={iIdx} className="text-xs text-slate-600 flex justify-between">
                                      <span><span className="font-bold text-slate-400 mr-1">{it.qty || 1}x</span> {it.description}</span>
                                      <span className="font-mono text-slate-400">R$ {((it.price || 0) * (it.qty || 1)).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="mt-4 flex gap-2 pt-2 border-t border-slate-50">
                               <p className="text-[10px] font-bold text-slate-400">
                                  Status Atual: <span className="font-black text-slate-600 uppercase">{item.status}</span>
                               </p>
                               {item.km && (
                                 <p className="text-[10px] font-bold text-slate-400 ml-4">
                                    KM da Época: <span className="font-black text-slate-600 font-mono">{item.km}</span>
                                 </p>
                               )}
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default VehiclesView;