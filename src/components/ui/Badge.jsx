import React from 'react';

const Badge = ({ children, status }) => {
  const colors = {
    Pendente: 'bg-amber-100 text-amber-700',
    'Em Execução': 'bg-blue-100 text-blue-700',
    Finalizado: 'bg-emerald-100 text-emerald-700',
    Critico: 'bg-red-600 text-white'
  };
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${colors[status] || 'bg-slate-100'}`}>
      {children}
    </span>
  );
};

export default Badge;