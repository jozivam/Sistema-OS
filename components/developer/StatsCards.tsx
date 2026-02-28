import React from 'react';

interface StatsCardsProps {
    stats: {
        total: number;
        active: number;
        blocked: number;
        mrr: number;
    };
    showValues: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, showValues }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Vendas Totais / MRR */}
            <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-5 flex items-center shadow-sm">
                <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-money-bill-wave text-xl text-emerald-500"></i>
                </div>
                <div className="ml-4 truncate">
                    <h4 className="text-[13px] font-semibold text-slate-500 truncate">Receita Recorrente</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                        {showValues ? stats.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
                    </p>
                </div>
            </div>

            {/* Total Orders / Empresas */}
            <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-5 flex items-center shadow-sm">
                <div className="w-[52px] h-[52px] rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-cart-shopping text-xl"></i>
                </div>
                <div className="ml-4 truncate">
                    <h4 className="text-[13px] font-semibold text-slate-500 truncate">Total de Sistemas</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                        {showValues ? stats.total.toLocaleString() : '****'}
                    </p>
                </div>
            </div>

            {/* Customers / Ativas */}
            <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-5 flex items-center shadow-sm">
                <div className="w-[52px] h-[52px] rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-users text-xl text-blue-500"></i>
                </div>
                <div className="ml-4 truncate">
                    <h4 className="text-[13px] font-semibold text-slate-500 truncate">Clientes Ativos</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                        {showValues ? stats.active.toLocaleString() : '****'}
                    </p>
                </div>
            </div>

            {/* Low Stock / Bloqueados */}
            <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-5 flex items-center shadow-sm">
                <div className="w-[52px] h-[52px] rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 relative overflow-hidden">
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></div>
                    <i className="fa-solid fa-circle-exclamation text-xl"></i>
                </div>
                <div className="ml-4 truncate">
                    <h4 className="text-[13px] font-semibold text-slate-500 truncate">Inadimplentes</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                        {showValues ? stats.blocked.toLocaleString() : '****'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StatsCards;
