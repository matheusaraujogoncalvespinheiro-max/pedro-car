import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Download, Plus } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

function FinancesView({ transactions }) {
  const stats = useMemo(() => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const income = safeTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expense = safeTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-2">
        <div>
           <h3 className="text-xl font-black uppercase italic tracking-tighter">Resumo Financeiro</h3>
           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Mês Atual</p>
        </div>
        <Button variant="primary" icon={Download} onClick={handlePrint} className="print:hidden">
          Gerar Relatório Mensal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-50 border-emerald-100 border-b-4 border-b-emerald-500 group">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all"><TrendingUp size={24}/></div>
             <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-100 px-2 py-1 rounded">Entradas</span>
          </div>
          <p className="text-sm font-black text-slate-400 mb-1">Total de Receitas</p>
          <h4 className="text-3xl font-black text-emerald-600">R$ {Number(stats.income || 0).toFixed(2)}</h4>
        </Card>

        <Card className="p-6 bg-slate-50 border-red-100 border-b-4 border-b-red-600 group">
           <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-all"><TrendingDown size={24}/></div>
             <span className="text-[10px] font-black uppercase text-red-600 tracking-widest bg-red-100 px-2 py-1 rounded">Saídas</span>
          </div>
          <p className="text-sm font-black text-slate-400 mb-1">Total de Despesas / Custos</p>
          <h4 className="text-3xl font-black text-red-600">R$ {Number(stats.expense || 0).toFixed(2)}</h4>
        </Card>

        <Card className="p-6 bg-black text-white shadow-xl shadow-black/20 group">
           <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-zinc-800 text-white rounded-lg group-hover:bg-white group-hover:text-black transition-all"><DollarSign size={24}/></div>
             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border border-zinc-800 px-2 py-1 rounded">Saldo Líquido</span>
          </div>
          <p className="text-sm font-black text-zinc-500 mb-1">Balanço do Mês</p>
          <h4 className="text-3xl font-black text-white">R$ {Number(stats.balance || 0).toFixed(2)}</h4>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="overflow-hidden mt-4">
        <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center print:hidden">
          <h4 className="font-black uppercase flex items-center gap-2">
            <div className="w-1 h-5 bg-red-600"></div>
            Histórico de Transações
          </h4>
          <Button variant="outline" icon={Plus} className="text-xs py-1.5 px-3">Novo Lançamento</Button>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {transactions.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-4 font-bold text-slate-500">{t.date}</td>
                <td className="px-6 py-4 font-black uppercase text-slate-800">{t.description}</td>
                <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded font-bold uppercase tracking-tighter">{t.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {t.type === 'income' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default FinancesView;
