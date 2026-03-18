import React from 'react';

const Button = ({ children, onClick, variant = 'primary', icon: Icon, className = "" }) => {
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20',
    secondary: 'bg-black text-white hover:bg-zinc-900',
    outline: 'border-2 border-slate-200 text-slate-600 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  };
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;