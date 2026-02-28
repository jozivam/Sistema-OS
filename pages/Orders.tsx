
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import {
  isTrialUser, getTrialOrders, getTrialCustomers, saveTrialOrders, saveTrialCustomers,
  TRIAL_COMPANY_ID, TRIAL_ADMIN_ID, TRIAL_TECH_ID
} from '../services/trialService';
import { OrderStatus, ServiceOrder, UserRole, OrderAttachment, User, Customer, Company } from '../types';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ServiceOrderModal from '../components/ServiceOrderModal';

// ─── Sub-modal: Adicionar / Editar Cliente ────────────────────────────────────
interface CustomerFormProps {
  onSave: (customer: Customer) => void;
  onClose: () => void;
  companyId: string;
  editingCustomer?: Customer | null;
  isTrial?: boolean;
}

const CustomerFormModal: React.FC<CustomerFormProps> = ({ onSave, onClose, companyId, editingCustomer, isTrial }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: editingCustomer?.name || '',
    phone: editingCustomer?.phone || '',
    city: editingCustomer?.city || '',
    address: editingCustomer?.address || '',
    number: editingCustomer?.number || '',
    sector: editingCustomer?.sector || '',
    notes: editingCustomer?.notes || '',
  });

  const maskPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 2) return n;
    if (n.length <= 7) return `(${n.slice(0, 2)})${n.slice(2)}`;
    return `(${n.slice(0, 2)})${n.slice(2, 7)}-${n.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: Customer;
      if (editingCustomer) {
        await dbService.updateCustomer(editingCustomer.id, form);
        saved = { ...editingCustomer, ...form };
      } else {
        if (isTrial) {
          saved = {
            id: 'trial-cust-' + Date.now(),
            companyId,
            ...form,
            createdAt: new Date().toISOString()
          };
        } else {
          saved = await dbService.createCustomer({ companyId, ...form });
        }
      }
      onSave(saved);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-5 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {editingCustomer ? 'Atualize os dados do cliente' : 'Cadastro rápido de cliente'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-900 transition-all">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Dados básicos */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Dados do Cliente</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo *</label>
                <input
                  type="text" required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do cliente..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp / Fone *</label>
                <input
                  type="text" required maxLength={14}
                  placeholder="(00)00000-0000"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-600"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cidade / UF *</label>
                <input
                  type="text" required
                  placeholder="Ex: Palmas/TO"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-3">Localização</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Logradouro (Rua/Av) *</label>
                <input
                  type="text" required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Número</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  value={form.number}
                  onChange={e => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bairro / Setor</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  value={form.sector}
                  onChange={e => setForm({ ...form, sector: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ponto de referência, restrições de acesso..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-[2] py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : (editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Sub-modal: Adicionar / Editar Técnico ────────────────────────────────────
interface TechFormProps {
  onSave: (user: User) => void;
  onClose: () => void;
  companyId: string;
  editingUser?: User | null;
}

const TechFormModal: React.FC<TechFormProps> = ({ onSave, onClose, companyId, editingUser }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    phone: editingUser?.phone || '',
    password: '',
    city: editingUser?.city || '',
    role: editingUser?.role || UserRole.TECH,
  });

  const maskPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 2) return n;
    if (n.length <= 7) return `(${n.slice(0, 2)})${n.slice(2)}`;
    return `(${n.slice(0, 2)})${n.slice(2, 7)}-${n.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: User;
      if (editingUser) {
        const updates: Partial<User> = {
          name: form.name, email: form.email,
          phone: form.phone, city: form.city, role: form.role
        };
        if (form.password) updates.password = form.password;
        await dbService.updateUser(editingUser.id, updates);
        saved = { ...editingUser, ...updates };
      } else {
        saved = await dbService.createUser({
          companyId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          role: form.role as UserRole,
          password: form.password,
          isBlocked: false
        });
      }
      onSave(saved);
    } catch (err) {
      console.error('Erro ao salvar técnico:', err);
      alert('Erro ao salvar técnico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-5 border-b flex justify-between items-center bg-gradient-to-r from-violet-50 to-purple-50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
              {editingUser ? 'Editar Técnico' : 'Novo Técnico'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {editingUser ? 'Atualize os dados do responsável' : 'Cadastro rápido de técnico'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-900 transition-all">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {!editingUser && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                Cadastro manual de perfil. Para acesso por e-mail, o técnico deve se registrar via /signup.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo *</label>
              <input
                type="text" required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-mail *</label>
              <input
                type="email" required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefone</label>
              <input
                type="text" maxLength={14} placeholder="(00)90000-0000"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-bold text-violet-600"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cidade / Região</label>
              <input
                type="text" placeholder="Ex: Palmas/TO"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Permissão</label>
              <select
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white text-sm font-bold"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value={UserRole.TECH}>Técnico</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Senha {editingUser ? '(deixe em branco para manter)' : '*'}
              </label>
              <input
                type="text" required={!editingUser}
                placeholder="Senha de acesso"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-semibold"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-[2] py-3.5 bg-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-violet-500/20 hover:bg-violet-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : (editingUser ? 'Salvar Alterações' : 'Cadastrar Técnico')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
const Orders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setModalOpen] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-modal states
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomerInline, setEditingCustomerInline] = useState<Customer | null>(null);
  const [showTechForm, setShowTechForm] = useState(false);
  const [editingTechInline, setEditingTechInline] = useState<User | null>(null);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    tech: '',
    search: '',
    customerId: '' // Novo filtro por ID
  });

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      if (isTrialUser(user)) {
        const trialOrders = getTrialOrders();
        const trialCustomers = getTrialCustomers();
        const trialUsers: User[] = [
          { id: TRIAL_ADMIN_ID, name: user.name + ' (Admin)', email: 'admin@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
          { id: TRIAL_TECH_ID, name: user.name + ' (Técnico)', email: 'tecnico@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
        ];
        const trialCompany: Company = {
          id: TRIAL_COMPANY_ID, name: 'Demo', corporateName: 'Demo', tradeName: 'Demo',
          document: '', email: '', phone: '', address: '', city: '',
          plan: 'DIAMANTE' as any, period: 'MENSAL' as any, monthlyFee: 0,
          status: 'ACTIVE', createdAt: new Date().toISOString(),
          settings: { enableAI: true, enableAttachments: true, enableChat: true, enableHistory: true, orderTypes: ['Instalação', 'Manutenção', 'Reparo', 'Configuração', 'Visita Técnica'] }
        };
        setOrders(trialOrders);
        setCustomers(trialCustomers);
        setUsers(trialUsers);
        setCompany(trialCompany);
      } else if (user.companyId) {
        const companyIdToLoad = (user.role === UserRole.DEVELOPER) ? 'dev-corp' : user.companyId;
        const [fetchedOrders, fetchedCustomers, fetchedUsers, fetchedCompany] = await Promise.all([
          dbService.getOrders(companyIdToLoad, (user.role === UserRole.TECH) ? user.id : undefined),
          dbService.getCustomers(companyIdToLoad),
          dbService.getUsers(companyIdToLoad),
          dbService.getCompany(companyIdToLoad)
        ]);

        setOrders(fetchedOrders);
        setCustomers(fetchedCustomers);
        setUsers(fetchedUsers);
        setCompany(fetchedCompany);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de ordens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get('clientId')) setModalOpen(true);

    // Captura filtro de cliente da URL
    const custId = searchParams.get('customerId');
    if (custId) {
      setFilters(prev => ({ ...prev, customerId: custId }));
    }

    const editId = searchParams.get('edit');
    if (editId) {
      const orderToEdit = orders.find(o => o.id === editId);
      if (orderToEdit) {
        setEditingOrder(orderToEdit);
        setModalOpen(true);
      }
    }
  }, [searchParams, orders]);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER || isTrialUser(currentUser);
  const settings = company?.settings || (window as any).initialData?.settings;

  const filteredOrders = orders.filter(order => {
    const matchesUser = isAdmin || order.techId === currentUser?.id;
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesTech = !filters.tech || order.techId === filters.tech;
    const matchesCustomerId = !filters.customerId || order.customerId === filters.customerId;
    const matchesSearch = !filters.search ||
      order.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.id.toLowerCase().includes(filters.search.toLowerCase());

    return matchesUser && matchesStatus && matchesTech && matchesCustomerId && matchesSearch;
  });

  const visibleOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 10);

  // Suprimidos handlers de arquivos pois agora são internos do ServiceOrderModal

  const handleModalSuccess = (message: string) => {
    setToast({ message, type: 'success' });
    setTimeout(() => setToast(null), 3000);

    // Se havia parâmetros de busca (edit ou action), limpa-os para evitar que o modal reabra
    if (searchParams.toString()) {
      navigate('/ordens', { replace: true });
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      if (isTrialUser(currentUser)) {
        const updated = orders.filter(o => o.id !== orderToDelete);
        saveTrialOrders(updated);
        setOrders(updated);
      } else {
        await dbService.deleteOrder(orderToDelete);
        setOrders(prev => prev.filter(o => o.id !== orderToDelete));
      }
      setOrderToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      alert("Erro ao excluir OS.");
    }
  };

  // Handler: save new/edited customer from inline form
  const handleCustomerSaved = (saved: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === saved.id);
      const updated = exists
        ? prev.map(c => c.id === saved.id ? saved : c)
        : [...prev, saved];
      // Persiste no sessionStorage se for trial
      if (isTrialUser(currentUser)) saveTrialCustomers(updated);
      return updated;
    });
    setShowCustomerForm(false);
    setEditingCustomerInline(null);
  };

  const handleEditOrder = (order: ServiceOrder) => {
    setEditingOrder(order);
    setModalOpen(true);
  };

  const handleTechSaved = (saved: User) => {
    setUsers(prev => {
      const exists = prev.find(u => u.id === saved.id);
      if (exists) return prev.map(u => u.id === saved.id ? saved : u);
      return [...prev, saved];
    });
    setShowTechForm(false);
    setEditingTechInline(null);
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.FINISHED: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case OrderStatus.IN_PROGRESS: return 'bg-blue-50 text-blue-700 border-blue-100';
      case OrderStatus.CANCELLED: return 'bg-red-50 text-red-700 border-red-100';
      case OrderStatus.PAUSED: return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Excluir Atendimento"
        message="Deseja realmente remover esta Ordem de Serviço permanentemente? Esta ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setOrderToDelete(null)}
        variant="danger"
        confirmText="Excluir OS"
      />

      {/* Sub-modais */}
      {showCustomerForm && (
        <CustomerFormModal
          onSave={handleCustomerSaved}
          onClose={() => { setShowCustomerForm(false); setEditingCustomerInline(null); }}
          companyId={currentUser?.companyId || TRIAL_COMPANY_ID}
          editingCustomer={editingCustomerInline}
          isTrial={isTrialUser(currentUser)}
        />
      )}
      {showTechForm && !isTrialUser(currentUser) && (
        <TechFormModal
          onSave={handleTechSaved}
          onClose={() => { setShowTechForm(false); setEditingTechInline(null); }}
          companyId={currentUser?.companyId || ''}
          editingUser={editingTechInline}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] capitalize tracking-tight">Ordens de Serviço</h1>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Gestão de atendimentos e produtividade</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-premium flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus text-sm"></i> Abrir Nova OS
        </button>
      </div>

      {/* Tabela */}
      <div className="saas-card overflow-hidden">
        {/* Filtros */}
        <div className="p-6 border-b border-[var(--border-color)] bg-white space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"></i>
              <input
                type="text"
                placeholder="Buscar por cliente ou ID..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-[var(--border-color)] rounded-full outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm transition-shadow shadow-sm"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <select
                className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-[var(--border-color)] rounded-full outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm text-[var(--text-primary)] transition-shadow shadow-sm cursor-pointer"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as OrderStatus })}
              >
                <option value="">Todos Status</option>
                {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              {isAdmin && (
                <select
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-[var(--border-color)] rounded-full outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm text-[var(--text-primary)] transition-shadow shadow-sm cursor-pointer"
                  value={filters.tech}
                  onChange={(e) => setFilters({ ...filters, tech: e.target.value })}
                >
                  <option value="">Todos Técnicos</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {filters.customerId && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs font-bold">
                <i className="fa-solid fa-filter text-[10px]"></i>
                Filtrando por Cliente: {orders.find(o => o.customerId === filters.customerId)?.customerName || 'Carregando...'}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, customerId: '' }))}
                  className="ml-2 hover:text-blue-900 transition-colors"
                  title="Limpar filtro"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-0">
          <div className="overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)]">
                    <th className="px-6 py-4">Status / Natureza</th>
                    <th className="px-6 py-4">Identificação</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4">Cronograma</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {visibleOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group bg-white">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit whitespace-nowrap text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-xs font-medium text-[var(--text-muted)] pl-1">
                            {order.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[var(--text-primary)] text-sm leading-none mb-1">{order.customerName}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">#{order.id.slice(-6).toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs border border-slate-200">
                            <span className="font-semibold">{order.techName.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-medium text-[var(--text-secondary)]">{order.techName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-[var(--text-secondary)]">Criado: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          {order.scheduledDate && (
                            <span className="font-medium text-[var(--blue-primary)]">
                              Agendado: {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <button
                              onClick={() => setOrderToDelete(order.id)}
                              className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Excluir OS"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 transition-colors"
                            title="Editar OS"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                          </button>
                          <Link
                            to={`/ordens/${order.id}`}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 transition-colors"
                            title="Ver OS"
                          >
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="opacity-30">
                          <i className="fa-solid fa-magnifying-glass text-4xl mb-3"></i>
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma ordem encontrada</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {filteredOrders.length > 10 && (
          <div className="p-6 bg-[var(--bg-main)] border-t border-[var(--border-color)]">
            <button
              onClick={() => setShowAllOrders(!showAllOrders)}
              className="w-full py-5 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] text-[var(--text-secondary)] hover:text-[var(--blue-primary)] hover:border-[var(--blue-primary)] hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
            >
              {showAllOrders ? (
                <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
              ) : (
                <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {filteredOrders.length - 10} ordens de serviço</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal Compartilhado - Nova / Editar OS */}
      <ServiceOrderModal
        isOpen={isModalOpen}
        onClose={() => { setModalOpen(false); setEditingOrder(null); }}
        onSuccess={handleModalSuccess}
        editingOrder={editingOrder}
        currentUser={currentUser}
        company={company}
        customers={customers}
        users={users}
        allOrders={orders}
        onOrdersUpdate={setOrders}
        initialClientId={searchParams.get('clientId') || ''}
        onAddCustomer={() => { setEditingCustomerInline(null); setShowCustomerForm(true); }}
        onEditCustomer={(customer) => { setEditingCustomerInline(customer); setShowCustomerForm(true); }}
        onAddTech={() => { setEditingTechInline(null); setShowTechForm(true); }}
        onEditTech={(tech) => { setEditingTechInline(tech); setShowTechForm(true); }}
      />

      {/* Notificação Toast Premium */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`
            px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 min-w-[320px]
            ${toast.type === 'success'
              ? 'bg-emerald-500/90 border-emerald-400 text-white'
              : toast.type === 'error'
                ? 'bg-red-500/90 border-red-400 text-white'
                : 'bg-blue-500/90 border-blue-400 text-white'}
          `}>
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${toast.type === 'success' ? 'bg-white/20' : toast.type === 'error' ? 'bg-white/20' : 'bg-white/20'}
            `}>
              <i className={`fa-solid ${toast.type === 'success' ? 'fa-check' : toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-info'
                } text-lg`}></i>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Notificação do Sistema</p>
              <p className="text-sm font-bold tracking-tight">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <i className="fa-solid fa-xmark text-sm opacity-50"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
