
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { Company, User, UserRole, AppState, CompanyPlan, CompanyPayment, SystemSettings } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { maskDocument, maskPhone } from '../utils/format';

const CompanyManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [companyPayments, setCompanyPayments] = useState<CompanyPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isCompanyModalOpen, setCompanyModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<CompanyPayment | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [extendDays, setExtendDays] = useState<number>(0);

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.TECH,
    phone: '',
    city: ''
  });

  const [companyFormData, setCompanyFormData] = useState({
    tradeName: '',
    corporateName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plan: CompanyPlan.MENSAL,
    monthlyFee: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED',
    expiresAt: '',
    createdAt: '',
    settings: {
      enableAI: false,
      enableAttachments: false,
      enableChat: false,
      enableHistory: false,
      orderTypes: [] as string[]
    }
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10)
  });

  const loadData = async () => {
    if (!id) return;
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const [companyData, usersData, paymentsData] = await Promise.all([
        dbService.getCompany(id),
        dbService.getUsers(id),
        dbService.getCompanyPayments(id)
      ]);

      if (companyData) {
        setCompany(companyData);
        setCompanyFormData({
          tradeName: companyData.tradeName || companyData.name,
          corporateName: companyData.corporateName || companyData.name,
          document: companyData.document,
          email: companyData.email || '',
          phone: companyData.phone || '',
          address: companyData.address || '',
          city: companyData.city || '',
          plan: companyData.plan,
          monthlyFee: companyData.monthlyFee,
          status: companyData.status,
          expiresAt: companyData.expiresAt ? companyData.expiresAt.slice(0, 10) : '',
          createdAt: companyData.createdAt ? companyData.createdAt.slice(0, 10) : new Date().toISOString().split('T')[0],
          settings: {
            enableAI: companyData.settings?.enableAI ?? false,
            enableAttachments: companyData.settings?.enableAttachments ?? false,
            enableChat: companyData.settings?.enableChat ?? false,
            enableHistory: companyData.settings?.enableHistory ?? false,
            orderTypes: companyData.settings?.orderTypes || []
          }
        });
        setPaymentFormData(prev => ({ ...prev, amount: companyData.monthlyFee }));
      }
      setCompanyUsers(usersData);
      setCompanyPayments(paymentsData);
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-xl font-black text-slate-900 uppercase">Empresa não encontrada</h2>
        <Link to="/developer" className="mt-4 inline-block text-blue-600 font-black uppercase text-xs">Voltar ao Painel</Link>
      </div>
    );
  }

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        password: user.password || '',
        role: user.role,
        phone: user.phone || '',
        city: user.city || ''
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        password: '',
        role: UserRole.TECH,
        phone: '',
        city: (company.tradeName || company.name).split(' ')[0]
      });
    }
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const updates: any = { ...userFormData };
        if (!updates.password) delete updates.password;

        await dbService.updateUser(editingUser.id, updates);
        setCompanyUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
        setToast({ message: 'Usuário atualizado com sucesso!', type: 'success' });
      } else {
        const newUser = await dbService.createUser({
          ...userFormData,
          companyId: company.id,
          isBlocked: false
        });
        setCompanyUsers(prev => [...prev, newUser]);
        setToast({ message: 'Novo usuário criado!', type: 'success' });
      }

      setModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      setToast({ message: 'Erro ao salvar usuário.', type: 'error' });
    }
  };

  const handlePlanChange = (newPlan: CompanyPlan) => {
    if (newPlan === CompanyPlan.LIVRE) {
      setCompanyFormData({ ...companyFormData, plan: newPlan, expiresAt: '' });
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
    setCompanyFormData({
      ...companyFormData,
      plan: newPlan,
      expiresAt: futureDate.toISOString().slice(0, 10)
    });
  };

  const handleToggleModule = (module: keyof Omit<SystemSettings, 'orderTypes'>) => {
    setCompanyFormData({
      ...companyFormData,
      settings: {
        ...companyFormData.settings,
        [module]: !companyFormData.settings[module]
      }
    });
  };

  const handleExtendDays = () => {
    if (!companyFormData.expiresAt) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + extendDays);
      setCompanyFormData({ ...companyFormData, expiresAt: baseDate.toISOString().slice(0, 10) });
    } else {
      const currentExpiry = new Date(companyFormData.expiresAt);
      currentExpiry.setDate(currentExpiry.getDate() + extendDays);
      setCompanyFormData({ ...companyFormData, expiresAt: currentExpiry.toISOString().slice(0, 10) });
    }
    setExtendDays(0);
    setToast({ message: `Prazo estendido em ${extendDays} dias!`, type: 'success' });
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    let monthsToAdd = 0;
    switch (company.plan) {
      case CompanyPlan.MENSAL: monthsToAdd = 1; break;
      case CompanyPlan.TRIMESTRAL: monthsToAdd = 3; break;
      case CompanyPlan.ANUAL: monthsToAdd = 12; break;
      case CompanyPlan.TESTE: monthsToAdd = 1; break;
      case CompanyPlan.LIVRE: monthsToAdd = 0; break;
    }

    let currentExpiry = company.expiresAt ? new Date(company.expiresAt) : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + monthsToAdd);
    const newExpiresAt = currentExpiry.toISOString();

    try {
      const newPayment = await dbService.createCompanyPayment({
        companyId: company.id,
        amount: paymentFormData.amount,
        paymentDate: paymentFormData.paymentDate,
        planReference: company.plan,
        expiresAtAfter: newExpiresAt
      });

      await dbService.updateCompany(company.id, { expiresAt: newExpiresAt, status: 'ACTIVE' } as Partial<Company>);

      setCompany({ ...company, expiresAt: newExpiresAt, status: 'ACTIVE' } as Company);
      setCompanyPayments(prev => [newPayment, ...prev]);

      setPaymentModalOpen(false);
      setToast({ message: 'Pagamento registrado! Vencimento estendido.', type: 'success' });
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setToast({ message: 'Erro ao registrar pagamento.', type: 'error' });
    }
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      await dbService.deleteCompanyPayment(paymentToDelete.id);
      setCompanyPayments(prev => prev.filter(p => p.id !== paymentToDelete.id));
      setPaymentToDelete(null);
      setToast({ message: 'Registro de pagamento removido.', type: 'success' });
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      setToast({ message: 'Erro ao excluir pagamento.', type: 'error' });
    }
  };

  const handleSaveCompany = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!company) return;

    try {
      const updates = {
        ...companyFormData,
        name: companyFormData.tradeName,
        expiresAt: companyFormData.expiresAt ? new Date(companyFormData.expiresAt + 'T12:00:00').toISOString() : undefined,
        createdAt: companyFormData.createdAt ? new Date(companyFormData.createdAt + 'T12:00:00').toISOString() : company.createdAt
      };

      await dbService.updateCompany(company.id, updates);

      setCompany({ ...company, ...updates } as Company);
      setCompanyModalOpen(false);
      setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      setToast({ message: 'Erro técnico ao salvar dados.', type: 'error' });
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await dbService.deleteUser(userToDelete.id);
      setCompanyUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
      setToast({ message: 'Usuário removido.', type: 'error' });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      setToast({ message: 'Erro ao excluir usuário.', type: 'error' });
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
        isOpen={!!userToDelete}
        title="Remover Usuário"
        message={`Deseja realmente excluir o usuário "${userToDelete?.name}" desta empresa?`}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        variant="danger"
        confirmText="Excluir"
      />

      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Registro de Pagamento"
        message="Deseja realmente excluir este registro de pagamento do histórico?"
        onConfirm={confirmDeletePayment}
        onCancel={() => setPaymentToDelete(null)}
        variant="danger"
        confirmText="Excluir Registro"
      />

      <div className="flex items-center justify-between">
        <div>
          <Link to="/developer" className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
            <i className="fa-solid fa-arrow-left"></i> Voltar ao Painel
          </Link>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
              <i className="fa-solid fa-building text-blue-600"></i> {company.tradeName || company.name}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{company.corporateName || company.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-file-invoice-dollar"></i> Registrar Pagamento
          </button>
          <button
            onClick={() => handleOpenUserModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            Novo Usuário
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Detalhes de Cadastro */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 h-fit relative">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes do Cadastro</h3>
              <button
                onClick={() => setCompanyModalOpen(true)}
                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                title="Editar Dados da Empresa"
              >
                <i className="fa-solid fa-pen-to-square text-xs"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status do Sistema</p>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${company.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {company.status === 'ACTIVE' ? 'ATIVO (LIBERADO)' : 'BLOQUEADO (SUSPENSO)'}
                </span>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Data de Registro</p>
                <p className="text-xs font-black text-slate-700">{company.createdAt ? new Date(company.createdAt).toLocaleDateString('pt-BR') : 'Não cadastrada'}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Vencimento do Plano</p>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${company.expiresAt && new Date() > new Date(company.expiresAt) ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {company.plan === CompanyPlan.LIVRE ? 'SEM VENCIMENTO' : (company.expiresAt ? new Date(company.expiresAt).toLocaleDateString('pt-BR') : 'N/A')}
                </span>
              </div>

              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">CNPJ / Documento</p>
                <p className="text-xs font-black text-slate-700 font-mono">{company.document}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Contato Principal</p>
                <p className="text-xs font-black text-slate-600 lowercase">{company.email || 'N/A'}</p>
                <p className="text-xs font-black text-slate-600">{company.phone || 'N/A'}</p>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Plano e Mensalidade</p>
                <p className="text-xs font-black text-blue-600 uppercase mb-1">{company.plan}</p>
                <p className="text-lg font-black text-slate-900">{company.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
          </div>

          {/* Gestão de Módulos (Renomeado e Estilizado conforme screenshot) */}
          <div className="bg-white rounded-3xl p-8 border-[3px] border-blue-600/10 shadow-sm space-y-6">
            <div className="border-b pb-4 flex items-center gap-2">
              <i className="fa-solid fa-cubes text-blue-600"></i>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Módulos da Unidade</h3>
            </div>
            <div className="space-y-4">
              {[
                { id: 'enableAI', label: 'Relatórios', icon: 'fa-chart-pie' },
                { id: 'enableChat', label: 'Central Chat', icon: 'fa-comments' },
                { id: 'enableAttachments', label: 'Arquivos/Mídia', icon: 'fa-paperclip' },
                { id: 'enableHistory', label: 'Timeline/History', icon: 'fa-clock-rotate-left' }
              ].map((mod) => (
                <div key={mod.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
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
                      checked={companyFormData.settings[mod.id as keyof Omit<SystemSettings, 'orderTypes'>]}
                      onChange={() => handleToggleModule(mod.id as keyof Omit<SystemSettings, 'orderTypes'>)}
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}

              <button
                onClick={() => handleSaveCompany()}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all mt-4"
              >
                Salvar Módulos
              </button>
            </div>
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mt-4">Novos módulos são desativados por padrão</p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Histórico de Pagamentos */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-emerald-50/30 border-b flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-history text-emerald-600"></i> Histórico de Pagamentos e Renovações
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase">{companyPayments.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-8 py-5">Data do Pagto</th>
                    <th className="px-8 py-5">Valor Recebido</th>
                    <th className="px-8 py-5">Plano Ref.</th>
                    <th className="px-8 py-5">Novo Vencimento</th>
                    <th className="px-8 py-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {companyPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-600">{new Date(p.paymentDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-5 text-[11px] font-black text-emerald-600">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-8 py-5">
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase tracking-widest border border-slate-100">{p.planReference}</span>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-black text-blue-600 uppercase tracking-tight">{new Date(p.expiresAtAfter).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => setPaymentToDelete(p)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Excluir Registro"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {companyPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest italic">
                        Aguardando registro de pagamento para validar plano...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gestão de Usuários */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Gestão de Usuários e Acessos</h3>
              <span className="text-[9px] font-black text-slate-400 uppercase">{companyUsers.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-8 py-5">Nome / Cargo</th>
                    <th className="px-8 py-5">E-mail / Login</th>
                    <th className="px-8 py-5">Senha Exposta</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {companyUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-0.5">{u.name}</p>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-600 lowercase">{u.email}</td>
                      <td className="px-8 py-5">
                        <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-black font-mono shadow-inner border border-orange-100">
                          {u.password || '******'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenUserModal(u)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Editar Usuário"
                        >
                          <i className="fa-solid fa-user-pen"></i>
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title="Remover Usuário"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Registrar Pagamento */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-emerald-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tighter">
                  Confirmar Pagamento
                </h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Extensão automática da data de vencimento</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-emerald-400 hover:text-emerald-900 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Plano Vigente:</span>
                  <span className="text-blue-600">{company.plan}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Vencimento Atual:</span>
                  <span className={`font-bold ${company.expiresAt && new Date() > new Date(company.expiresAt) ? 'text-red-500' : 'text-slate-900'}`}>
                    {company.expiresAt ? new Date(company.expiresAt).toLocaleDateString('pt-BR') : 'N/A (Novo Registro)'}
                  </span>
                </div>
              </div>

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
                <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                  O sistema adicionará o tempo do plano ({company.plan}) ao vencimento atual. Se já estiver vencido, o novo prazo conta a partir de hoje.
                </p>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all">
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Empresa Detalhado */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                  Editar Cadastro da Empresa
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Alteração de dados cadastrais e financeiros</p>
              </div>
              <button onClick={() => setCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Sessão: Identificação */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Dados Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Razão Social</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={companyFormData.corporateName}
                      onChange={e => setCompanyFormData({ ...companyFormData, corporateName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome Fantasia</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={companyFormData.tradeName}
                      onChange={e => setCompanyFormData({ ...companyFormData, tradeName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">CNPJ / Documento</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      value={companyFormData.document}
                      onChange={e => setCompanyFormData({ ...companyFormData, document: maskDocument(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Sessão: Contato e Localização */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Contato e Localização</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-mail Administrativo</label>
                    <input
                      type="email" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm lowercase"
                      value={companyFormData.email}
                      onChange={e => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefone / WhatsApp</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={companyFormData.phone}
                      onChange={e => setCompanyFormData({ ...companyFormData, phone: maskPhone(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Endereço Fiscal</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                      value={companyFormData.address}
                      onChange={e => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cidade / UF</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                      value={companyFormData.city}
                      onChange={e => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sessão: Financeiro e Status */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Sistema e Financeiro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Registro</label>
                    <input
                      type="date"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={companyFormData.createdAt}
                      onChange={e => setCompanyFormData({ ...companyFormData, createdAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Plano</label>
                    <select
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]"
                      value={companyFormData.plan}
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mensalidade (R$)</label>
                    <input
                      type="number" step="0.01" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={companyFormData.monthlyFee}
                      onChange={e => setCompanyFormData({ ...companyFormData, monthlyFee: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Vencimento</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        disabled={companyFormData.plan === CompanyPlan.LIVRE}
                        className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        value={companyFormData.expiresAt}
                        onChange={e => setCompanyFormData({ ...companyFormData, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status de Acesso</label>
                    <select
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]"
                      value={companyFormData.status}
                      onChange={e => setCompanyFormData({ ...companyFormData, status: e.target.value as 'ACTIVE' | 'BLOCKED' })}
                    >
                      <option value="ACTIVE">ATIVO (LIBERADO)</option>
                      <option value="BLOCKED">BLOQUEADO (SUSPENSO)</option>
                    </select>
                  </div>
                </div>

                {/* Opção de Extensão de Prazo */}
                {companyFormData.plan !== CompanyPlan.LIVRE && (
                  <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-3 tracking-[0.2em]">Extender Prazo (Cortesias)</label>
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                          placeholder="Dias para adicionar..."
                          value={extendDays || ''}
                          onChange={e => setExtendDays(parseInt(e.target.value) || 0)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">dias</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleExtendDays}
                        disabled={extendDays <= 0}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Aplicar Extensão
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setCompanyModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário para Empresa'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome Completo</label>
                  <input
                    type="text" required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-mail (Login)</label>
                    <input
                      type="email" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm lowercase"
                      value={userFormData.email}
                      onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Senha de Acesso</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-blue-600"
                      value={userFormData.password}
                      onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nível de Permissão</label>
                    <select
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]"
                      value={userFormData.role}
                      onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    >
                      <option value={UserRole.ADMIN}>Administrador</option>
                      <option value={UserRole.TECH}>Técnico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cidade / Região</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                      value={userFormData.city}
                      onChange={e => setUserFormData({ ...userFormData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">
                  {editingUser ? 'Salvar Alterações' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
