import React from 'react';

interface StatsCardsProps {
    stats: {
        total: number;
        active: number;
        blocked: number;
        mrr: number;
    };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex overflow-hidden group">
                <div className="w-20 bg-emerald-500 flex items-center justify-center text-white text-3xl">
                    <i className="fa-solid fa-money-bill-trend-up"></i>
                </div>
                <div className="p-6 flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MRR (MENSAL)</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">
                        {stats.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex overflow-hidden">
                <div className="w-20 bg-blue-500 flex items-center justify-center text-white text-3xl">
                    <i className="fa-solid fa-ban"></i>
                </div>
                <div className="p-6 flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">BLOQUEADOS/INAT.</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">{stats.blocked}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex overflow-hidden">
                <div className="w-20 bg-orange-500 flex items-center justify-center text-white text-3xl">
                    <i className="fa-solid fa-building-circle-check"></i>
                </div>
                <div className="p-6 flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">EMPRESAS ATIVAS</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">{stats.active}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex overflow-hidden">
                <div className="w-20 bg-rose-500 flex items-center justify-center text-white text-3xl">
                    <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div className="p-6 flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL EMPRESAS</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">{stats.total}</h3>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
