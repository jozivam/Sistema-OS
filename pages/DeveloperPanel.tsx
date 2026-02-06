
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Company, CompanyPlan, AppState, User, UserRole } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { maskDocument, maskPhone } from '../utils/format';

const DeveloperPanel: React.FC = () => {
  const [data, setData] = useState<AppState>(storageService.getData());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isInsertModalOpen, setInsertModalOpen] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [newCompanyData, setNewCompanyData] = useState({
    corporateName: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plan: CompanyPlan.MENSAL,
    monthlyFee: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED',
    createdAt: new Date().toISOString().split('T')[0],
    expiresAt: '',
    settings: {
      enableAI: false,
      enableAttachments: false,
      enableChat: false,
      enableHistory: false,
    }
  });

  // Cálculo automático de vencimento ao abrir modal ou mudar plano/data
  useEffect(() => {
    if (isInsertModalOpen) {
      const expiry = calculateExpirationDate(newCompanyData.plan, newCompanyData.createdAt);
      setNewCompanyData(prev => ({
        ...prev,
        expiresAt: expiry ? expiry.split('T')[0] : ''
      }));
    }
  }, [newCompanyData.plan, newCompanyData.createdAt, isInsertModalOpen]);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filtrar para remover a empresa do desenvolvedor das métricas e listagem
  const clientCompanies = useMemo(() => {
    return data.companies.filter(c => c.id !== 'dev-corp');
  }, [data.companies]);

  const stats = useMemo(() => {
    const total = clientCompanies.length;
    const active = clientCompanies.filter(c => c.status === 'ACTIVE').length;
    const blocked = clientCompanies.filter(c => c.status === 'BLOCKED').length;
    const mrr = clientCompanies.reduce((acc, c) => acc + (c.status === 'ACTIVE' ? c.monthlyFee : 0), 0);

    return { total, active, blocked, mrr };
  }, [clientCompanies]);

  const filteredCompanies = useMemo(() => {
    return clientCompanies.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSearch = !searchTerm ||
        (c.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.corporateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.document || '').includes(searchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [clientCompanies, filterStatus, searchTerm]);

  // Aplica o limite de 5 itens caso não esteja expandido
  const visibleCompanies = showAllCompanies ? filteredCompanies : filteredCompanies.slice(0, 5);

  const updateCompanyStatus = (id: string, status: 'ACTIVE' | 'BLOCKED') => {
    const updatedCompanies = data.companies.map(c =>
      c.id === id ? { ...c, status } as Company : c
    );
    const updatedData = { ...data, companies: updatedCompanies };
    storageService.saveData(updatedData);
    setData(updatedData);
    setOpenMenuId(null);
    setToast({
      message: status === 'ACTIVE' ? 'Empresa liberada com sucesso!' : 'Empresa bloqueada com sucesso!',
      type: 'success'
    });
  };

  const calculateExpirationDate = (plan: CompanyPlan, baseDateStr: string): string | undefined => {
    if (plan === CompanyPlan.LIVRE) return undefined;

    const date = new Date(baseDateStr + 'T12:00:00');
    let monthsToAdd = 1;

    switch (plan) {
      case CompanyPlan.MENSAL: monthsToAdd = 1; break;
      case CompanyPlan.TRIMESTRAL: monthsToAdd = 3; break;
      case CompanyPlan.ANUAL: monthsToAdd = 12; break;
      case CompanyPlan.TESTE: monthsToAdd = 1; break;
    }

    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toISOString();
  };

  const handleInsertCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.tradeName || !newCompanyData.document || !newCompanyData.corporateName) {
      setToast({ message: 'Preencha os campos obrigatórios.', type: 'error' });
      return;
    }

    const expiresAt = calculateExpirationDate(newCompanyData.plan, newCompanyData.createdAt);
    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      name: newCompanyData.tradeName,
      tradeName: newCompanyData.tradeName,
      corporateName: newCompanyData.corporateName,
      document: newCompanyData.document,
      email: newCompanyData.email,
      phone: newCompanyData.phone,
      address: newCompanyData.address,
      city: newCompanyData.city,
      plan: newCompanyData.plan,
      monthlyFee: newCompanyData.monthlyFee,
      status: newCompanyData.status,
      createdAt: new Date(newCompanyData.createdAt + 'T12:00:00').toISOString(),
      expiresAt: newCompanyData.expiresAt ? new Date(newCompanyData.expiresAt + 'T12:00:00').toISOString() : undefined,
      settings: {
        ...newCompanyData.settings,
        orderTypes: data.settings.orderTypes
      }
    };

    const updatedData = { ...data, companies: [...data.companies, newCompany] };
    storageService.saveData(updatedData);
    setData(updatedData);
    setInsertModalOpen(false);
    setToast({ message: 'Empresa cadastrada com sucesso!', type: 'success' });
  };

  const deleteCompany = () => {
    if (!companyToDelete) return;

    const updatedCompanies = data.companies.filter(c => c.id !== companyToDelete.id);
    const updatedUsers = data.users.filter(u => u.companyId !== companyToDelete.id);
    const updatedCustomers = data.customers.filter(cust => cust.companyId !== companyToDelete.id);
    const updatedOrders = data.orders.filter(o => o.companyId !== companyToDelete.id);

    const updatedData = {
      ...data,
      companies: updatedCompanies,
      users: updatedUsers,
      customers: updatedCustomers,
      orders: updatedOrders
    };

    storageService.saveData(updatedData);
    setData(updatedData);
    setCompanyToDelete(null);
    setOpenMenuId(null);
    setToast({ message: 'Empresa e todos os seus dados removidos!', type: 'success' });
  };

  const getPlanBadge = (plan: CompanyPlan) => {
    switch (plan) {
      case CompanyPlan.TESTE: return 'bg-orange-100 text-orange-600';
      case CompanyPlan.LIVRE: return 'bg-emerald-100 text-emerald-600';
      case CompanyPlan.ANUAL: return 'bg-purple-100 text-purple-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-green-500' : 'bg-red-600 text-white border-red-400'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!companyToDelete}
        title="Excluir Empresa"
        message={`Tem certeza que deseja excluir permanentemente a empresa "${companyToDelete?.tradeName || companyToDelete?.name}"? Esta ação removerá todos os usuários, clientes e ordens vinculadas e NÃO poderá ser desfeita.`}
        onConfirm={deleteCompany}
        onCancel={() => setCompanyToDelete(null)}
        variant="danger"
        confirmText="Sim, Excluir Tudo"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
          <i className="fa-solid fa-chart-line text-blue-600"></i> Movimento Financeiro
        </h2>
      </div>

      {/* KPI Cards */}
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

      {/* Tabela de Empresas - Removido overflow-hidden para evitar clipping dos menus suspensos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300 relative">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInsertModalOpen(true)}
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

        {/* Adicionado um min-height para garantir que o menu Ações do último item apareça sem forçar scroll exagerado */}
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
              {visibleCompanies.map((company, index) => (
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
                  <td className="px-8 py-5 text-right relative" style={{ overflow: 'visible' }}>
                    <div className="inline-block text-left relative">
                      <button
                        onClick={(e) => toggleMenu(e, company.id)}
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

                          {company.status === 'ACTIVE' ? (
                            <button
                              onClick={() => updateCompanyStatus(company.id, 'BLOCKED')}
                              className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors"
                            >
                              <i className="fa-solid fa-lock w-4"></i> Bloquear Sistema
                            </button>
                          ) : (
                            <button
                              onClick={() => updateCompanyStatus(company.id, 'ACTIVE')}
                              className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors"
                            >
                              <i className="fa-solid fa-lock-open w-4"></i> Liberar Sistema
                            </button>
                          )}

                          <div className="h-px bg-slate-100 my-1"></div>

                          <button
                            onClick={() => {
                              setCompanyToDelete(company);
                              setOpenMenuId(null);
                            }}
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

              {/* Espaçador invisível para garantir que o menu da última linha não seja cortado */}
              {visibleCompanies.length > 0 && <tr style={{ height: openMenuId ? '160px' : '20px' }}></tr>}

              {filteredCompanies.length === 0 && (
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

        {filteredCompanies.length > 5 && (
          <div className="p-6 bg-slate-50/30 border-t border-slate-100 rounded-b-2xl">
            <button
              onClick={() => setShowAllCompanies(!showAllCompanies)}
              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
            >
              {showAllCompanies ? (
                <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
              ) : (
                <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {filteredCompanies.length - 5} empresas</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal Inserir Empresa */}
      {isInsertModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                  Nova Empresa Cliente
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cadastro de nova unidade de negócio</p>
              </div>
              <button onClick={() => setInsertModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <form onSubmit={handleInsertCompany} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Sessão: Identificação */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Dados Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Razão Social</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.corporateName} onChange={e => setNewCompanyData({ ...newCompanyData, corporateName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome Fantasia</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.tradeName} onChange={e => setNewCompanyData({ ...newCompanyData, tradeName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">CNPJ</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" value={newCompanyData.document} onChange={e => setNewCompanyData({ ...newCompanyData, document: maskDocument(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Sessão: Contato e Localização */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Contato e Localização</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-mail Administrativo</label>
                    <input type="email" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm lowercase" value={newCompanyData.email} onChange={e => setNewCompanyData({ ...newCompanyData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefone / WhatsApp</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.phone} onChange={e => setNewCompanyData({ ...newCompanyData, phone: maskPhone(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Endereço Fiscal</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" value={newCompanyData.address} onChange={e => setNewCompanyData({ ...newCompanyData, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cidade / UF</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" value={newCompanyData.city} onChange={e => setNewCompanyData({ ...newCompanyData, city: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Sessão: Financeiro */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Sistema e Financeiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Registro</label>
                    <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.createdAt} onChange={e => setNewCompanyData({ ...newCompanyData, createdAt: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Plano</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]" value={newCompanyData.plan} onChange={e => setNewCompanyData({ ...newCompanyData, plan: e.target.value as CompanyPlan })}>
                      <option value={CompanyPlan.MENSAL}>MENSAL</option>
                      <option value={CompanyPlan.TRIMESTRAL}>TRIMESTRAL</option>
                      <option value={CompanyPlan.ANUAL}>ANUAL</option>
                      <option value={CompanyPlan.TESTE}>TESTE</option>
                      <option value={CompanyPlan.LIVRE}>LIVRE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mensalidade (R$)</label>
                    <input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.monthlyFee} onChange={e => setNewCompanyData({ ...newCompanyData, monthlyFee: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Vencimento</label>
                    <input type="date" disabled={newCompanyData.plan === CompanyPlan.LIVRE} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={newCompanyData.expiresAt} onChange={e => setNewCompanyData({ ...newCompanyData, expiresAt: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status de Acesso</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]" value={newCompanyData.status} onChange={e => setNewCompanyData({ ...newCompanyData, status: e.target.value as 'ACTIVE' | 'BLOCKED' })}>
                      <option value="ACTIVE">ATIVO (LIBERADO)</option>
                      <option value="BLOCKED">BLOQUEADO (SUSPENSO)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sessão: Módulos */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                  <i className="fa-solid fa-cubes text-blue-600 text-[10px]"></i>
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Módulos da Unidade</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'enableAI', label: 'Relatórios', icon: 'fa-chart-pie' },
                    { id: 'enableChat', label: 'Central Chat', icon: 'fa-comments' },
                    { id: 'enableAttachments', label: 'Arquivos/Mídia', icon: 'fa-paperclip' },
                    { id: 'enableHistory', label: 'Timeline/History', icon: 'fa-clock-rotate-left' }
                  ].map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400">
                          <i className={`fa-solid ${mod.icon} text-sm`}></i>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight">{mod.label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={newCompanyData.settings[mod.id as keyof typeof newCompanyData.settings]}
                          onChange={() => setNewCompanyData({
                            ...newCompanyData,
                            settings: {
                              ...newCompanyData.settings,
                              [mod.id]: !newCompanyData.settings[mod.id as keyof typeof newCompanyData.settings]
                            }
                          })}
                        />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setInsertModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Cadastrar Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPanel;
