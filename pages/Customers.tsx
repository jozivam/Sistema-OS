
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import {
  isTrialUser,
  getTrialCustomers,
  saveTrialCustomers,
  getTrialOrders,
  saveTrialOrders,
  TRIAL_COMPANY_ID,
  TRIAL_TECH_ID,
  TRIAL_ADMIN_ID,
} from '../services/trialService';
import { Customer, ServiceOrder, OrderStatus, UserRole, User, Company } from '../types';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const Customers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrial, setIsTrial] = useState(false);

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [openOSNow, setOpenOSNow] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // ── Carregar dados ────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      const trial = isTrialUser(user);
      setIsTrial(trial);

      if (trial) {
        // Modo trial: dados do sessionStorage
        const trialCustomers = getTrialCustomers();
        const trialUsers: User[] = [
          { id: TRIAL_ADMIN_ID, name: user!.name + ' (Admin)', email: 'admin@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID, isBlocked: false },
          { id: TRIAL_TECH_ID, name: user!.name + ' (Técnico)', email: 'tecnico@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID, isBlocked: false },
        ];
        const trialCompany: Company = {
          id: TRIAL_COMPANY_ID, name: 'Minha Empresa Demo',
          corporateName: 'Demo', tradeName: 'Demo', document: '', email: '', phone: '', address: '', city: '',
          plan: 'DIAMANTE' as any, period: 'MENSAL' as any, monthlyFee: 0,
          status: 'ACTIVE', createdAt: new Date().toISOString(),
          settings: {
            enableAI: true, enableAttachments: true, enableChat: true, enableHistory: true,
            orderTypes: ['Instalação', 'Manutenção', 'Reparo', 'Configuração', 'Visita Técnica']
          }
        };
        setCustomers(trialCustomers);
        setUsers(trialUsers);
        setCompany(trialCompany);
      } else if (user?.companyId) {
        const [fetchedCustomers, fetchedUsers, fetchedCompany] = await Promise.all([
          dbService.getCustomers(user.companyId),
          dbService.getUsers(user.companyId),
          dbService.getCompany(user.companyId)
        ]);
        setCustomers(fetchedCustomers);
        setUsers(fetchedUsers);
        setCompany(fetchedCompany);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenNewModal();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    name: '', phone: '', city: '', address: '', number: '', sector: '', notes: ''
  });

  const [initialOS, setInitialOS] = useState({
    description: '',
    type: '',
    createdAt: getCurrentDateTime(),
    scheduledDate: '',
    techId: ''
  });

  // Preenche os defaults do formulário de OS quando company/users carregam
  useEffect(() => {
    if (company && users.length > 0) {
      setInitialOS(prev => ({
        ...prev,
        type: company.settings.orderTypes[0] || 'Suporte',
        techId: users.find(u => u.role === UserRole.TECH || u.role === UserRole.TRIAL)?.id
          || users[0]?.id
          || currentUser?.id || ''
      }));
    }
  }, [company, users, currentUser]);

  const maskPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 2) return n;
    if (n.length <= 7) return `(${n.slice(0, 2)})${n.slice(2)}`;
    return `(${n.slice(0, 2)})${n.slice(2, 7)}-${n.slice(7, 11)}`;
  };

  const uniqueCities = Array.from(new Set(customers.map(c => c.city).filter(Boolean))).sort();

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCity = !selectedCity || c.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const handleOpenNewModal = () => {
    setEditingCustomer(null);
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name, phone: customer.phone, city: customer.city,
      address: customer.address, number: customer.number || '',
      sector: customer.sector || '', notes: customer.notes
    });
    setOpenOSNow(false);
    setModalOpen(true);
  };

  // ── Salvar cliente (trial ou real) ───────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isTrial) {
        // ── TRIAL: tudo local ─────────────────────────────────────────────────
        if (editingCustomer) {
          // Editar cliente existente
          const updatedCustomer: Customer = { ...editingCustomer, ...formData };
          const updatedList = customers.map(c => c.id === editingCustomer.id ? updatedCustomer : c);
          saveTrialCustomers(updatedList);
          setCustomers(updatedList);
          setToast({ message: 'Dados do cliente atualizados!', type: 'success' });
        } else {
          // Criar novo cliente
          const newCustomer: Customer = {
            id: 'trial-cust-' + Date.now(),
            companyId: TRIAL_COMPANY_ID,
            ...formData,
            createdAt: new Date().toISOString()
          };
          const updatedList = [...customers, newCustomer];
          saveTrialCustomers(updatedList);
          setCustomers(updatedList);

          // Criar OS junto se solicitado
          if (openOSNow && initialOS.description) {
            const tech = users.find(u => u.id === initialOS.techId) || users[0];
            const newOS: ServiceOrder = {
              id: 'trial-order-' + Date.now(),
              companyId: TRIAL_COMPANY_ID,
              customerId: newCustomer.id,
              customerName: newCustomer.name,
              techId: tech?.id || TRIAL_TECH_ID,
              techName: tech?.name || currentUser?.name || 'Técnico',
              type: initialOS.type || company?.settings.orderTypes[0] || 'Suporte',
              description: initialOS.description,
              scheduledDate: initialOS.scheduledDate ? new Date(initialOS.scheduledDate).toISOString() : undefined,
              aiReport: '',
              status: OrderStatus.OPEN,
              createdAt: new Date().toISOString(),
              posts: [],
              attachments: []
            };
            const updatedOrders = [...getTrialOrders(), newOS];
            saveTrialOrders(updatedOrders);
            setToast({ message: 'Cliente e OS cadastrados com sucesso!', type: 'success' });
          } else {
            setToast({ message: 'Cliente cadastrado com sucesso!', type: 'success' });
          }
        }

        setModalOpen(false);
        resetForm();

      } else {
        // ── PRODUÇÃO: Supabase ────────────────────────────────────────────────
        if (!currentUser?.companyId) return;

        if (editingCustomer) {
          await dbService.updateCustomer(editingCustomer.id, formData);
        } else {
          const newCustomer = await dbService.createCustomer({
            ...formData,
            companyId: currentUser.companyId
          });

          if (openOSNow && initialOS.description) {
            const tech = users.find(u => u.id === initialOS.techId) || currentUser;
            await dbService.createOrder({
              companyId: currentUser.companyId,
              customerId: newCustomer.id,
              customerName: newCustomer.name,
              techId: tech?.id || '',
              techName: tech?.name || '',
              type: initialOS.type,
              description: initialOS.description,
              scheduledDate: initialOS.scheduledDate ? new Date(initialOS.scheduledDate).toISOString() : undefined,
              aiReport: '',
              status: OrderStatus.OPEN,
              posts: []
            });
          }
        }

        await loadData();
        setModalOpen(false);
        resetForm();
        setToast({
          message: editingCustomer ? 'Dados atualizados!' : (openOSNow ? 'Cliente e OS cadastrados!' : 'Cliente cadastrado com sucesso!'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      setToast({ message: 'Erro ao salvar cliente.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', city: '', address: '', number: '', sector: '', notes: '' });
    setInitialOS({
      description: '',
      type: company?.settings.orderTypes[0] || 'Suporte',
      createdAt: getCurrentDateTime(),
      scheduledDate: '',
      techId: users.find(u => u.role === UserRole.TECH || u.role === UserRole.TRIAL)?.id
        || users[0]?.id || currentUser?.id || ''
    });
    setOpenOSNow(false);
  };

  // ── Excluir cliente ───────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      if (isTrial) {
        const updatedList = customers.filter(c => c.id !== customerToDelete);
        saveTrialCustomers(updatedList);
        setCustomers(updatedList);
      } else {
        await dbService.deleteCustomer(customerToDelete);
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete));
      }
      setCustomerToDelete(null);
      setToast({ message: 'Cliente removido.', type: 'error' });
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      setToast({ message: 'Erro ao remover cliente.', type: 'error' });
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="relative">
      <ConfirmModal
        isOpen={!!customerToDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente permanentemente? Histórico será preservado mas sem vínculo."
        onConfirm={confirmDelete}
        onCancel={() => setCustomerToDelete(null)}
        variant="danger"
        confirmText="Excluir"
      />

      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 border ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-trash-can'} text-xl`}></i>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize tracking-tight">Clientes</h1>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Gerencie sua base de clientes e históricos.</p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="btn-premium flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus text-sm"></i> Novo Cliente
        </button>
      </div>

      <div className="saas-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] bg-white flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"></i>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[var(--border-color)] rounded-full outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm transition-shadow shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hidden md:flex items-center gap-2 min-w-[200px]">
            <select
              className="w-full px-4 py-2.5 bg-white border border-[var(--border-color)] rounded-full outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm text-[var(--text-primary)] transition-shadow shadow-sm cursor-pointer"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">Todas as Regiões</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)]">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Endereço</th>
                <th className="px-6 py-4">Cidade / Região</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-[var(--text-muted)]">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
                      <i className="fa-solid fa-users text-2xl"></i>
                    </div>
                    <p className="text-sm">Nenhum cliente encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group bg-white">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                          <span className="text-sm font-semibold">{customer.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <Link to={`/clientes/${customer.id}`} className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--blue-primary)] hover:underline transition-colors">
                          {customer.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-[var(--text-secondary)]">{customer.phone}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-[var(--text-primary)]">{customer.address}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{customer.number ? `Nº ${customer.number}` : 'S/N'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-[var(--text-primary)]">{customer.city}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">{customer.sector || 'S/ Bairro'}</div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(customer)} className="w-8 h-8 rounded hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors" title="Editar">
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <Link to={`/ordens?customerId=${customer.id}`} className="w-8 h-8 rounded hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors" title="Ver Histórico">
                          <i className="fa-solid fa-list text-xs"></i>
                        </Link>
                        <button onClick={() => setCustomerToDelete(customer.id)} className="w-8 h-8 rounded hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors" title="Remover">
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Criar / Editar Cliente ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] sticky top-0 z-10">
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">
                {editingCustomer ? 'Alterar Cadastro' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-secondary)] hover:text-slate-800 p-2 transition-transform w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/50">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {/* Dados Principais */}
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 flex items-center gap-2 text-[11px] uppercase tracking-widest border-l-4 border-blue-500 pl-3">
                  Dados Principais
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome Completo</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">WhatsApp / Fone</label>
                    <input type="text" required maxLength={14} placeholder="(00)00000-0000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-600" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cidade e UF</label>
                    <input type="text" required placeholder="Ex: Palmas/TO" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 flex items-center gap-2 text-[11px] uppercase tracking-widest border-l-4 border-blue-500 pl-3">
                  Localização de Atendimento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Logradouro (Rua/Av)</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Número / Complemento</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bairro / Setor</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas de Acesso / Obs. Internas</label>
                    <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" rows={2} placeholder="Ex: Cerca elétrica no muro, cachorro bravo, ligar antes..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Agendar OS junto */}
              {!editingCustomer && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${openOSNow ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                        <i className="fa-solid fa-file-circle-plus text-lg"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-none">Agendar primeira OS agora?</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Cria o cliente e já agenda o primeiro atendimento.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={openOSNow} onChange={e => setOpenOSNow(e.target.checked)} />
                      <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>

                  {openOSNow && (
                    <div className="grid grid-cols-1 gap-5 animate-in slide-in-from-top-4 duration-300 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Descrição Técnica do Pedido</label>
                        <textarea
                          required={openOSNow}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-white font-medium"
                          rows={2}
                          placeholder="O que o cliente solicitou?"
                          value={initialOS.description}
                          onChange={e => setInitialOS({ ...initialOS, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Natureza</label>
                          <select
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold"
                            value={initialOS.type}
                            onChange={e => setInitialOS({ ...initialOS, type: e.target.value })}
                          >
                            {(company?.settings.orderTypes || ['Manutenção', 'Instalação', 'Reparo', 'Configuração', 'Visita Técnica']).map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Responsável</label>
                          <select
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold"
                            value={initialOS.techId}
                            onChange={e => setInitialOS({ ...initialOS, techId: e.target.value })}
                          >
                            {users.length === 0 ? (
                              <option value="">— Selecione um responsável —</option>
                            ) : (
                              users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                            )}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Data/Hora</label>
                          <input
                            type="datetime-local"
                            required={openOSNow}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold text-blue-600"
                            value={initialOS.scheduledDate}
                            onChange={e => setInitialOS({ ...initialOS, scheduledDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white m-0 p-8 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border border-[var(--border-color)] rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors">
                  Descartar
                </button>
                <button type="submit" disabled={loading} className="flex-[2] py-4 bg-[var(--blue-primary)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[var(--blue-hover)] btn-pill-hover flex items-center justify-center gap-2 disabled:opacity-50 px-8">
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  {editingCustomer ? 'Salvar Alterações' : (openOSNow ? 'Criar e Agendar OS' : 'Confirmar Cadastro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
