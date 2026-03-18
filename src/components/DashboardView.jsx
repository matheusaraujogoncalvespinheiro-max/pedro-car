import React from 'react';
import { TrendingUp, AlertTriangle, Wrench, Car } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

function DashboardView({ stats, services, inventory }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-black text-white border-none shadow-xl">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Receita Mensal</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-red-600">R$ {(stats.totalRev || 0).toFixed(2)}</h3>
            <TrendingUp className="text-zinc-700" size={32} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Peças em Alerta</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black">{stats.lowStock}</h3>
            <AlertTriangle className="text-red-600" size={32} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Serviços Ativos</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black">{stats.pendentes}</h3>
            <Wrench className="text-black" size={32} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h4 className="font-black uppercase mb-6 flex items-center gap-2">
            <div className="w-1 h-5 bg-red-600"></div>
            Últimas Ordens de Serviço
          </h4>
          <div className="space-y-4">
            {services.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded border border-slate-200 text-black group-hover:bg-black group-hover:text-white transition-all"><Car size={16} /></div>
                  <div>
                    <p className="text-sm font-black">{s.client} - {s.car}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{s.plate}</p>
                  </div>
                </div>
                <Badge status={s.status}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
           <h4 className="font-black uppercase mb-6 flex items-center gap-2">
            <div className="w-1 h-5 bg-red-600"></div>
            Alertas de Reposição
          </h4>
          <div className="space-y-4">
            {inventory.filter(i => i.qty < 5).map(i => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-black text-red-900">{i.name}</p>
                  <p className="text-[10px] text-red-700">Stock Crítico: {i.qty} unidades</p>
                </div>
                <Badge status="Critico">Repor</Badge>
              </div>
            ))}
            {inventory.filter(i => i.qty < 5).length === 0 && (
              <p className="text-center py-10 text-slate-400 text-sm font-bold italic uppercase tracking-widest opacity-50">Tudo em conformidade</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardView;