import React from 'react';
import { Company } from '../../types';

interface CompanyTableProps {
    companies: Company[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    showValues: boolean;
    onCompanyClick: (id: string) => void;
}

const CompanyTable: React.FC<CompanyTableProps> = ({
    companies,
    searchTerm,
    setSearchTerm,
    showValues,
    onCompanyClick
}) => {
    return (
        <div className="bg-white rounded-[1.25rem] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Última Assinaturas</h3>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 border border-slate-200 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                        Ver Todos
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white border-b border-slate-100/80">
                            <th className="px-6 py-4 font-bold text-[13px] text-slate-900">ID do Pedido</th>
                            <th className="px-6 py-4 font-bold text-[13px] text-slate-900">Cliente</th>
                            <th className="px-6 py-4 font-bold text-[13px] text-slate-900">Data</th>
                            <th className="px-6 py-4 font-bold text-[13px] text-slate-900">Valor</th>
                            <th className="px-6 py-4 font-bold text-[13px] text-slate-900 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {companies.slice(0, 10).map((company) => {
                            const isOverdue = company.expiresAt && new Date(company.expiresAt) < new Date() && company.status === 'ACTIVE';
                            const statusText = company.status === 'BLOCKED' ? 'Bloqueado' : (isOverdue ? 'Inadimplente' : 'Ativo');
                            const statusColor = company.status === 'BLOCKED' ? 'bg-rose-50 text-rose-600' : (isOverdue ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600');
                            const statusIcon = company.status === 'BLOCKED' ? 'fa-lock' : (isOverdue ? 'fa-triangle-exclamation' : 'fa-check');

                            return (
                                <tr key={company.id} onClick={() => onCompanyClick(company.id)} className="hover:bg-slate-50 transition-colors group cursor-pointer relative">
                                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-600">
                                        #{company.id.substring(0, 5).toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-900">
                                        {company.tradeName || company.name}
                                    </td>
                                    <td className="px-6 py-4 text-[13px] font-semibold text-slate-600 font-mono">
                                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString('pt-BR') : '28/05/2025'}
                                    </td>
                                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                                        {showValues ? company.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center justify-end w-full">
                                            <div className={`px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1.5 ${statusColor}`}>
                                                <i className={`fa-solid ${statusIcon} text-[10px]`}></i>
                                                {statusText}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {companies.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                                    Nenhum registro encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompanyTable;
