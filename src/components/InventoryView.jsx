import React, { useState } from 'react';
import { Search, Plus, Edit3, Trash2, X, AlertTriangle } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

function InventoryView({ inventory, setInventory }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: '',
    customCategory: '',
    price: '',
    qty: ''
  });

  const handleSave = (e) => {
    e.preventDefault();
    const newQty = parseInt(newItem.qty, 10) || 0;
    const newPrice = parseFloat(newItem.price) || 0;
    
    // Procura se já existe uma peça com o mesmo SKU ou o mesmo Nome Exato
    const existingItemIndex = inventory.findIndex(i => 
      i.sku.toUpperCase() === newItem.sku.toUpperCase() || 
      i.name.toUpperCase() === newItem.name.toUpperCase()
    );

    if (existingItemIndex !== -1) {
      // Se já existe, atualiza a quantidade (soma) e o preço (substitui)
      const updatedInventory = [...inventory];
      updatedInventory[existingItemIndex].qty += newQty;
      if (newPrice > 0) {
        updatedInventory[existingItemIndex].price = newPrice;
      }
      setInventory(updatedInventory);
    } else {
      // Se não existe, cria nova peça
      const newId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
      const finalCategory = newItem.category === 'Outro' ? newItem.customCategory : newItem.category;
      setInventory([
        ...inventory,
        {
          id: newId,
          name: newItem.name,
          sku: newItem.sku,
          category: finalCategory || 'Geral',
          price: newPrice,
          qty: newQty
        }
      ]);
    }
    
    setIsModalOpen(false);
    setNewItem({ name: '', sku: '', category: '', customCategory: '', price: '', qty: '' });
  };

  const attemptDelete = (e) => {
    e.preventDefault();
    if (deletePassword === '1234') {
      setInventory(inventory.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
      setDeletePassword('');
      setDeleteError(false);
    } else {
      setDeleteError(true);
    }
  };

  const cancelDelete = () => {
    setItemToDelete(null);
    setDeletePassword('');
    setDeleteError(false);
  };

  return (
    <>
      <Card className="animate-in slide-in-from-bottom-4 duration-500 relative">
        <div className="p-6 bg-black border-b border-zinc-800 flex justify-between items-center">
          <div className="relative w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
             <input className="w-full bg-zinc-900 border-none rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-red-600 outline-none" placeholder="Procurar peça..." />
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>Nova Peça</Button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-400 border-b border-slate-100">
              <th className="px-8 py-4 text-left">Peça / SKU</th>
              <th className="px-8 py-4 text-left">Categoria</th>
              <th className="px-8 py-4 text-center">Stock</th>
              <th className="px-8 py-4 text-left">Preço Unit.</th>
              <th className="px-8 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {inventory.map(i => (
              <tr key={i.id} className="border-b border-slate-50 hover:bg-red-50/20 transition-all">
                <td className="px-8 py-4">
                  <p className="font-black text-slate-800 uppercase">{i.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">{i.sku}</p>
                </td>
                <td className="px-8 py-4">
                  <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-full font-bold uppercase tracking-tighter">{i.category}</span>
                </td>
                <td className="px-8 py-4 text-center">
                  <span className={`font-black ${i.qty < 5 ? 'text-red-600 underline' : 'text-slate-700'}`}>{i.qty}</span>
                </td>
                <td className="px-8 py-4 font-black text-red-600">R$ {i.price.toFixed(2)}</td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-black transition-all"><Edit3 size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-red-600 transition-all" onClick={() => setItemToDelete(i)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal Nova Peça */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-xl border-none">
            <div className="p-6 bg-black text-white flex justify-between items-center">
              <h3 className="font-black italic uppercase tracking-tighter text-xl">Adicionar Nova Peça</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nome da Peça</label>
                <input required type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal" placeholder="Ex: Filtro de Óleo" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">SKU / Código</label>
                  <input required type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:normal-case" placeholder="Ex: FL-01" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Categoria</label>
                  <select 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all appearance-none bg-white" 
                    value={newItem.category} 
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                  >
                    <option value="" disabled>Selecione uma categoria...</option>
                    <option value="Lubrificante">Lubrificante</option>
                    <option value="Peças">Peças</option>
                    <option value="Outro">Outro (descreva)</option>
                  </select>
                  
                  {newItem.category === 'Outro' && (
                    <div className="mt-3 animate-in slide-in-from-top-2">
                       <input 
                         required 
                         type="text" 
                         className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 bg-red-50/50 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal" 
                         placeholder="Qual a categoria do produto?" 
                         value={newItem.customCategory} 
                         onChange={e => setNewItem({...newItem, customCategory: e.target.value})} 
                       />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Preço Unitário (R$)</label>
                  <input required type="number" step="0.01" className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal" placeholder="0.00" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Quantidade</label>
                  <input required type="number" className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal" placeholder="0" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit">Cadastrar Peça</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Confirmar Exclusão com Senha */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm animate-in zoom-in-95 duration-200 shadow-xl border-none">
            <div className="p-6 bg-red-600 text-white flex justify-between items-center rounded-t-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h3 className="font-black italic uppercase tracking-tighter text-lg">Confirmação Restrita</h3>
              </div>
              <button onClick={cancelDelete} className="text-white/70 hover:text-white transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={attemptDelete} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Você tem certeza que deseja excluir <strong>{itemToDelete.name}</strong> do estoque?
              </p>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Senha do Administrador</label>
                <input 
                  autoFocus 
                  required 
                  type="password" 
                  className={`w-full border rounded-lg p-3 text-sm font-bold focus:ring-2 outline-none transition-all ${deleteError ? 'border-red-500 focus:ring-red-500 text-red-600' : 'border-slate-200 focus:ring-black focus:border-black'}`} 
                  placeholder="Digite a senha (1234)" 
                  value={deletePassword} 
                  onChange={e => {
                    setDeletePassword(e.target.value);
                    setDeleteError(false);
                  }} 
                />
                {deleteError && (
                  <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <AlertTriangle size={12} /> Senha incorreta.
                  </p>
                )}
              </div>
              <div className="pt-4 flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={cancelDelete}>Cancelar</Button>
                <Button variant="danger" type="submit">Excluir Peça</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

export default InventoryView;