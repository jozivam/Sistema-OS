
import React, { useState, useMemo, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { AppState, CompanyPayment, Company, CompanyPlan, User } from '../types';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const DeveloperPayments: React.FC = () => {
  const [companiesState, setCompaniesState] = useState<Company[]>([]);
  const [paymentsState, setPaymentsState] = useState<(CompanyPayment & { companyName?: string, company?: Company })[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'history' | 'plans'>('plans');
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');
  const [paymentToDelete, setPaymentToDelete] = useState<CompanyPayment | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Modais de Ação Rápida
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10)
  });

  const [planFormData, setPlanFormData] = useState({
    plan: CompanyPlan.MENSAL,
    monthlyFee: 0,
    expiresAt: ''
  });

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const [comps, pays] = await Promise.all([
        dbService.getCompanies(),
        dbService.getAllPayments()
      ]);

      setCompaniesState(comps);
      setPaymentsState(pays.map(p => ({
        ...p,
        company: comps.find(c => c.id === p.companyId)
      })));
    } catch (error) {
      console.error("Erro ao carregar dados de pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const companies = useMemo(() => {
    let list = companiesState.filter(c => c.id !== 'dev-corp');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => (c.tradeName || '').toLowerCase().includes(s) || (c.corporateName || '').toLowerCase().includes(s));
    }
    return list.sort((a, b) => {
      const aExp = a.expiresAt || '9999';
      const bExp = b.expiresAt || '9999';
      return aExp.localeCompare(bExp);
    });
  }, [companiesState, search]);

  const payments = useMemo(() => {
    let list = paymentsState;

    if (selectedCompanyId !== 'all') {
      list = list.filter(p => p.companyId === selectedCompanyId);
    }

    if (search && activeTab === 'history') {
      const s = search.toLowerCase();
      list = list.filter(p => (p.company?.tradeName || '').toLowerCase().includes(s) || (p.company?.corporateName || '').toLowerCase().includes(s));
    }

    return list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [paymentsState, selectedCompanyId, search, activeTab]);

  const stats = useMemo(() => {
    const total = payments.reduce((acc, p) => acc + p.amount, 0);
    const overdue = companiesState.filter(c => c.id !== 'dev-corp' && c.plan !== CompanyPlan.LIVRE && c.expiresAt && new Date() > new Date(c.expiresAt)).length;
    return { total, count: payments.length, overdue };
  }, [payments, companiesState]);

  // Ações de Pagamento
  const handleOpenPayModal = (company: Company) => {
    setSelectedCompany(company);
    setPaymentFormData({
      amount: company.monthlyFee,
      paymentDate: new Date().toISOString().slice(0, 10)
    });
    setIsPayModalOpen(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    let monthsToAdd = 0;
    switch (selectedCompany.plan) {
      case CompanyPlan.MENSAL: monthsToAdd = 1; break;
      case CompanyPlan.TRIMESTRAL: monthsToAdd = 3; break;
      case CompanyPlan.ANUAL: monthsToAdd = 12; break;
      case CompanyPlan.TESTE: monthsToAdd = 1; break;
      case CompanyPlan.LIVRE: monthsToAdd = 0; break;
    }

    let currentExpiry = selectedCompany.expiresAt ? new Date(selectedCompany.expiresAt) : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + monthsToAdd);
    const newExpiresAt = currentExpiry.toISOString();

    try {
      const newPayment = await dbService.createCompanyPayment({
        companyId: selectedCompany.id,
        amount: paymentFormData.amount,
        paymentDate: paymentFormData.paymentDate,
        planReference: selectedCompany.plan,
        expiresAtAfter: newExpiresAt
      });

      await dbService.updateCompany(selectedCompany.id, { expiresAt: newExpiresAt, status: 'ACTIVE' } as Partial<Company>);

      // Sincronizar estado local
      setCompaniesState(prev => prev.map(c =>
        c.id === selectedCompany.id ? { ...c, expiresAt: newExpiresAt, status: 'ACTIVE' } as Company : c
      ));

      setPaymentsState(prev => [{ ...newPayment, company: selectedCompany }, ...prev]);

      setIsPayModalOpen(false);
      setToast({ message: `Pagamento de ${selectedCompany.tradeName} registrado!`, type: 'success' });
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setToast({ message: 'Erro ao registrar pagamento.', type: 'error' });
    }
  };

  // Ações de Plano
  const handleOpenPlanModal = (company: Company) => {
    setSelectedCompany(company);
    setPlanFormData({
      plan: company.plan,
      monthlyFee: company.monthlyFee,
      expiresAt: company.expiresAt ? company.expiresAt.slice(0, 10) : ''
    });
    setIsPlanModalOpen(true);
  };

  const handlePlanChange = (newPlan: CompanyPlan) => {
    if (newPlan === CompanyPlan.LIVRE) {
      setPlanFormData({ ...planFormData, plan: newPlan, expiresAt: '' });
      return;
    }
    const now = new Date();
    let monthsToAdd = 1;
    switch (newPlan) {
      case CompanyPlan.MENSAL: monthsToAdd = 1; break;
      case CompanyPlan.TRIMESTRAL: monthsToAdd = 3; break;
      case CompanyPlan.ANUAL: monthsToAdd = 12; break;
      case CompanyPlan.TESTE: monthsToAdd = 1; break;
    }
    const futureDate = new Date(now.setMonth(now.getMonth() + monthsToAdd));
    setPlanFormData({ ...planFormData, plan: newPlan, expiresAt: futureDate.toISOString().slice(0, 10) });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      const updates = {
        plan: planFormData.plan,
        monthlyFee: planFormData.monthlyFee,
        expiresAt: planFormData.expiresAt ? new Date(planFormData.expiresAt + 'T12:00:00').toISOString() : undefined
      };

      await dbService.updateCompany(selectedCompany.id, updates);

      setCompaniesState(prev => prev.map(c =>
        c.id === selectedCompany.id ? { ...c, ...updates } as Company : c
      ));

      setIsPlanModalOpen(false);
      setToast({ message: `Plano de ${selectedCompany.tradeName} atualizado!`, type: 'success' });
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      setToast({ message: 'Erro ao atualizar plano.', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await dbService.deleteCompanyPayment(paymentToDelete.id);
      setPaymentsState(prev => prev.filter(p => p.id !== paymentToDelete.id));
      setPaymentToDelete(null);
      setToast({ message: 'Registro de pagamento removido.', type: 'success' });
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      setToast({ message: 'Erro ao excluir pagamento.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-green-500' : 'bg-red-600 text-white border-red-400'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Remover Registro"
        message="Deseja realmente excluir este registro de pagamento? Isso não alterará a data de vencimento atual da empresa."
        onConfirm={confirmDelete}
        onCancel={() => setPaymentToDelete(null)}
        variant="danger"
        confirmText="Excluir Registro"
      />

      {/* Header e KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">GESTÃO DE PAGAMENTOS</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">CONTROLE DE FATURAMENTO, PLANOS E INADIMPLÊNCIA</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-[#F1F3F5] px-6 py-4 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center min-w-[160px]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">INADIMPLENTES</span>
            <div className="bg-white w-full h-10 rounded-xl flex items-center justify-center shadow-inner border border-slate-100">
              <span className={`text-xl font-black ${stats.overdue > 0 ? 'text-red-500' : 'text-slate-300'}`}>{stats.overdue}</span>
            </div>
          </div>
          <div className="bg-[#04A777] text-white px-10 py-5 rounded-[1.5rem] shadow-xl shadow-emerald-500/20 flex flex-col items-end min-w-[240px] relative overflow-hidden group">
            <div className="absolute left-0 top-0 h-full w-2 bg-emerald-700/30"></div>
            <span className="text-[8px] font-black uppercase opacity-70 tracking-widest mb-1">RECEITA TOTAL</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
              <span className="text-2xl font-black tracking-tight">{stats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'plans' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Clientes e Planos
          {activeTab === 'plans' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Histórico de Faturamento
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#F8FAFC] rounded-3xl shadow-sm border border-slate-100 overflow-hidden p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="Buscar empresa..."
            className="w-full pl-14 pr-4 py-4 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {activeTab === 'history' && (
          <div className="flex gap-3">
            <select
              className="px-6 py-4 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-[10px] font-black uppercase tracking-widest shadow-inner"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="all">Todas Empresas</option>
              {companiesState.filter(c => c.id !== 'dev-corp').map(c => (
                <option key={c.id} value={c.id}>{c.tradeName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabela Principal (Clientes & Planos) */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                  <th className="px-8 py-5">Empresa Cliente</th>
                  <th className="px-8 py-5">Plano / Valor</th>
                  <th className="px-8 py-5">Vencimento</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {companies.map(company => {
                  const isOverdue = company.plan !== CompanyPlan.LIVRE && company.expiresAt && new Date() > new Date(company.expiresAt);
                  return (
                    <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{company.tradeName}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{company.document}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{company.plan}</span>
                          <span className="text-[10px] font-bold text-slate-600">{company.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-black font-mono ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          {company.plan === CompanyPlan.LIVRE ? 'ILIMITADO' : (company.expiresAt ? new Date(company.expiresAt).toLocaleDateString('pt-BR') : 'N/A')}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-full border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                          {isOverdue ? 'PENDENTE' : 'EM DIA'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenPlanModal(company)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                        >
                          <i className="fa-solid fa-arrows-rotate mr-1"></i> Alterar Plano
                        </button>
                        <button
                          onClick={() => handleOpenPayModal(company)}
                          className="px-4 py-2 bg-[#04A777] text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                        >
                          <i className="fa-solid fa-dollar-sign mr-1"></i> Registrar Pagto
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de Histórico */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black">
                  <th className="px-8 py-5">Empresa Cliente</th>
                  <th className="px-8 py-5">Data Pagto</th>
                  <th className="px-8 py-5 text-right">Valor</th>
                  <th className="px-8 py-5">Plano Ref.</th>
                  <th className="px-8 py-5">Novo Vencimento</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <Link to={`/developer/empresa/${p.companyId}`} className="flex flex-col group-hover:text-blue-600 transition-colors">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{p.company?.tradeName || 'Empresa Removida'}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{p.company?.corporateName}</span>
                      </Link>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[11px] font-bold text-slate-600">{new Date(p.paymentDate).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-[11px] font-black text-emerald-600">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">{p.planReference}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight">{new Date(p.expiresAtAfter).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Excluir Registro"
                      >
                        <i className="fa-solid fa-trash-can text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="opacity-20 flex flex-col items-center">
                        <i className="fa-solid fa-file-invoice-dollar text-6xl mb-4"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pagamento registrado no sistema</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Pagamento */}
      {isPayModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-emerald-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tighter">Confirmar Pagamento</h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">{selectedCompany.tradeName}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-emerald-400 hover:text-emerald-900">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor Recebido (R$)</label>
                  <input
                    type="number" step="0.01" required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-lg text-emerald-700"
                    value={paymentFormData.amount}
                    onChange={e => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data da Transação</label>
                  <input
                    type="date" required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    value={paymentFormData.paymentDate}
                    onChange={e => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <i className="fa-solid fa-circle-info text-blue-500 mt-0.5 shrink-0"></i>
                <p className="text-[9px] font-bold text-blue-700 leading-relaxed uppercase">
                  A confirmação estenderá o vencimento do cliente com base no plano atual ({selectedCompany.plan}).
                </p>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Confirmar e Renovar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Plano */}
      {isPlanModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-blue-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Gerenciar Plano e Contrato</h3>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">{selectedCompany.tradeName}</p>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-blue-400 hover:text-blue-900">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Plano Vigente</label>
                  <select
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]"
                    value={planFormData.plan}
                    onChange={e => handlePlanChange(e.target.value as CompanyPlan)}
                  >
                    <option value={CompanyPlan.MENSAL}>MENSAL</option>
                    <option value={CompanyPlan.TRIMESTRAL}>TRIMESTRAL</option>
                    <option value={CompanyPlan.ANUAL}>ANUAL</option>
                    <option value={CompanyPlan.TESTE}>TESTE</option>
                    <option value={CompanyPlan.LIVRE}>LIVRE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor Mensal (R$)</label>
                  <input
                    type="number" step="0.01" required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={planFormData.monthlyFee}
                    onChange={e => setPlanFormData({ ...planFormData, monthlyFee: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Vencimento</label>
                  <input
                    type="date"
                    disabled={planFormData.plan === CompanyPlan.LIVRE}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={planFormData.expiresAt}
                    onChange={e => setPlanFormData({ ...planFormData, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPayments;
