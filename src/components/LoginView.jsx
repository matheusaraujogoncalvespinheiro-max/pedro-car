import React, { useState } from 'react';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Simulação de delay para feeling premium
    setTimeout(() => {
      if (username.toLowerCase() === 'pedro' && password === '1234') {
        onLogin();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black overflow-hidden font-sans">
      {/* Background Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative w-full max-w-[440px] px-6 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="Pedro Car Logo" className="w-48 mb-6 drop-shadow-2xl" />
          <div className="h-1 w-12 bg-red-600 rounded-full mb-4"></div>
          <h2 className="text-white text-xl font-black uppercase tracking-[0.2em] italic">Acesso Restrito</h2>
        </div>

        <Card className="p-8 bg-zinc-900/50 backdrop-blur-xl border-zinc-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 group-focus-within:text-red-500 transition-colors">Usuário</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
                  <input 
                    required
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all placeholder:text-zinc-700"
                    placeholder="Nome de usuário"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 group-focus-within:text-red-500 transition-colors">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={18} />
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all placeholder:text-zinc-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Acesso negado. Verifique os dados.</p>
              </div>
            )}

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </Card>

        <p className="text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Oficina Pedro Car • © 2024
        </p>
      </div>
    </div>
  );
}
