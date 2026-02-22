import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Company, CompanyPlan } from '../../types';

interface CompanyTableProps {
    companies: Company[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    onUpdateStatus: (id: string, status: 'ACTIVE' | 'BLOCKED') => void;
    onDeleteRequest: (company: Company) => void;
    onOpenInsertModal: () => void;
    showAll: boolean;
    setShowAll: (show: boolean) => void;
    onSupportSelect: (companyId: string) => void;
}

const CompanyTable: React.FC<CompanyTableProps> = ({
    companies,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    openMenuId,
    setOpenMenuId,
    onUpdateStatus,
    onDeleteRequest,
    onOpenInsertModal,
    showAll,
    setShowAll,
    onSupportSelect
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setOpenMenuId]);

    const getPlanBadge = (plan: CompanyPlan) => {
        switch (plan) {
            case CompanyPlan.TESTE: return 'bg-orange-100 text-orange-600';
            case CompanyPlan.LIVRE: return 'bg-emerald-100 text-emerald-600';
            case CompanyPlan.ANUAL: return 'bg-purple-100 text-purple-600';
            default: return 'bg-blue-100 text-blue-600';
        }
    };

    const visibleCompanies = showAll ? companies : companies.slice(0, 5);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300 relative">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenInsertModal}
                        className="bg-blue-600 text-white border border-blue-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center gap-1 shrink-0"
                    >
                        <i className="fa-solid fa-plus"></i> Inserir Empresa
                    </button>

                    <div className="relative w-full md:w-64 lg:w-80">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input
                            type="text"
                            placeholder="BUSCAR EMPRESA OU CNPJ..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-filter"></i> Filtrar por
                    </span>
                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Status</option>
                        <option value="ACTIVE">Ativas</option>
                        <option value="BLOCKED">Bloqueadas</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible" style={{ minHeight: visibleCompanies.length > 0 ? 'auto' : '200px' }}>
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                            <th className="px-8 py-4">Status</th>
                            <th className="px-8 py-4">Empresa</th>
                            <th className="px-8 py-4">Vencimento</th>
                            <th className="px-8 py-4">Plano</th>
                            <th className="px-8 py-4">Mensalidade</th>
                            <th className="px-8 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visibleCompanies.map((company) => (
                            <tr key={company.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${company.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${company.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                                            {company.status === 'ACTIVE' ? 'ATIVO' : 'BLOQ.'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <Link to={`/developer/empresa/${company.id}`} className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight hover:text-blue-600 transition-colors">
                                            {company.tradeName || company.name}
                                        </span>
                                        <span className="text-[8px] text-slate-400 font-bold uppercase">{company.corporateName}</span>
                                    </Link>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`text-[10px] font-bold ${company.expiresAt && new Date() > new Date(company.expiresAt) ? 'text-red-600' : 'text-slate-500'} font-mono`}>
                                        {company.plan === CompanyPlan.LIVRE ? 'ILIMITADO' : (company.expiresAt ? new Date(company.expiresAt).toLocaleDateString('pt-BR') : 'N/A')}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getPlanBadge(company.plan)}`}>
                                        {company.plan}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black text-slate-700">
                                        {company.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right relative">
                                    <div className="inline-block text-left relative">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === company.id ? null : company.id);
                                            }}
                                            className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                                        >
                                            Ações <i className="fa-solid fa-chevron-down text-[8px]"></i>
                                        </button>

                                        {openMenuId === company.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-2xl z-[150] py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                                            >
                                                <Link
                                                    to={`/developer/empresa/${company.id}`}
                                                    className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <i className="fa-solid fa-screwdriver-wrench w-4 text-slate-400"></i> Gerenciar
                                                </Link>

                                                <button
                                                    onClick={() => onSupportSelect(company.id)}
                                                    className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <i className="fa-solid fa-comments w-4"></i> Atender / Conversar
                                                </button>

                                                {company.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => onUpdateStatus(company.id, 'BLOCKED')}
                                                        className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-lock w-4"></i> Bloquear Sistema
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onUpdateStatus(company.id, 'ACTIVE')}
                                                        className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-lock-open w-4"></i> Liberar Sistema
                                                    </button>
                                                )}

                                                <div className="h-px bg-slate-100 my-1"></div>

                                                <button
                                                    onClick={() => onDeleteRequest(company)}
                                                    className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <i className="fa-solid fa-trash-can w-4"></i> Excluir Empresa
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {companies.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center">
                                    <div className="opacity-20 flex flex-col items-center">
                                        <i className="fa-solid fa-magnifying-glass text-6xl mb-4"></i>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma empresa encontrada</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {companies.length > 5 && (
                <div className="p-6 bg-slate-50/30 border-t border-slate-100 rounded-b-2xl">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
                    >
                        {showAll ? (
                            <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
                        ) : (
                            <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {companies.length - 5} empresas</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CompanyTable;
