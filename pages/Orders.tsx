
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import {
  isTrialUser, getTrialOrders, getTrialCustomers, saveTrialOrders, saveTrialCustomers,
  TRIAL_COMPANY_ID, TRIAL_ADMIN_ID, TRIAL_TECH_ID
} from '../services/trialService';
import { OrderStatus, ServiceOrder, UserRole, OrderAttachment, User, Customer, Company } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

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

  const [filters, setFilters] = useState({
    status: '',
    tech: '',
    search: ''
  });

  const [newOrder, setNewOrder] = useState({
    customerId: searchParams.get('clientId') || '',
    techId: '',
    type: '',
    description: '',
    createdAt: '',
    scheduledDate: '',
    attachments: [] as OrderAttachment[]
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
        setNewOrder(prev => ({
          ...prev,
          techId: TRIAL_TECH_ID,
          type: trialCompany.settings.orderTypes[0],
          createdAt: getCurrentDateTime()
        }));
      } else {
        const [fetchedOrders, fetchedCustomers, fetchedUsers, fetchedCompany] = await Promise.all([
          dbService.getOrders(user.companyId),
          dbService.getCustomers(user.companyId),
          dbService.getUsers(user.companyId),
          dbService.getCompany(user.companyId)
        ]);

        setOrders(fetchedOrders);
        setCustomers(fetchedCustomers);
        setUsers(fetchedUsers);
        setCompany(fetchedCompany);

        const defaultType = fetchedCompany?.settings.orderTypes[0] || 'Suporte';
        setNewOrder(prev => ({
          ...prev,
          techId: user.role === UserRole.TECH ? user.id : '',
          type: defaultType,
          createdAt: getCurrentDateTime()
        }));
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
  }, [searchParams]);

  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.DEVELOPER || isTrialUser(currentUser);
  const settings = company?.settings || (window as any).initialData?.settings;

  const filteredOrders = orders.filter(order => {
    const matchesUser = isAdmin || order.techId === currentUser?.id;
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesTech = !filters.tech || order.techId === filters.tech;
    const matchesSearch = !filters.search ||
      order.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.id.toLowerCase().includes(filters.search.toLowerCase());

    return matchesUser && matchesStatus && matchesTech && matchesSearch;
  });

  const visibleOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 10);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const attachment: OrderAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64,
          createdAt: new Date().toISOString()
        };
        setNewOrder(prev => ({
          ...prev,
          attachments: [...prev.attachments, attachment]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingAttachment = (id: string) => {
    setNewOrder(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customer = customers.find(c => c.id === newOrder.customerId);
      const tech = users.find(u => u.id === newOrder.techId);

      if (!customer || !tech) {
        alert('Selecione um cliente e um técnico válidos.');
        return;
      }

      if (isTrialUser(currentUser)) {
        const newTrialOrder: ServiceOrder = {
          id: 'trial-order-' + Date.now(),
          companyId: TRIAL_COMPANY_ID,
          customerId: customer.id,
          customerName: customer.name,
          techId: tech.id,
          techName: tech.name,
          type: newOrder.type,
          description: newOrder.description,
          scheduledDate: newOrder.scheduledDate,
          aiReport: '',
          status: OrderStatus.OPEN,
          createdAt: new Date().toISOString(),
          posts: [],
          attachments: newOrder.attachments
        };
        const updated = [newTrialOrder, ...orders];
        saveTrialOrders(updated);
        setOrders(updated);
      } else {
        const orderData: Omit<ServiceOrder, 'id' | 'createdAt'> = {
          companyId: currentUser?.companyId || '',
          customerId: customer.id,
          customerName: customer.name,
          techId: tech.id,
          techName: tech.name,
          type: newOrder.type,
          description: newOrder.description,
          scheduledDate: newOrder.scheduledDate,
          aiReport: '',
          status: OrderStatus.OPEN,
          posts: [],
          attachments: newOrder.attachments
        };
        const createdOrder = await dbService.createOrder(orderData);
        setOrders(prev => [createdOrder, ...prev]);
      }

      setModalOpen(false);
      setNewOrder({
        customerId: '',
        techId: isTrialUser(currentUser) ? TRIAL_TECH_ID : (currentUser?.role === UserRole.TECH ? currentUser.id : ''),
        type: company?.settings.orderTypes[0] || 'Suporte',
        description: '',
        createdAt: getCurrentDateTime(),
        scheduledDate: '',
        attachments: []
      });
    } catch (error) {
      console.error("Erro ao criar OS:", error);
      alert("Erro ao criar OS. Tente novamente.");
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
    setNewOrder(prev => ({ ...prev, customerId: saved.id }));
    setShowCustomerForm(false);
    setEditingCustomerInline(null);
  };

  // Handler: save new/edited tech from inline form
  const handleTechSaved = (saved: User) => {
    setUsers(prev => {
      const exists = prev.find(u => u.id === saved.id);
      if (exists) return prev.map(u => u.id === saved.id ? saved : u);
      return [...prev, saved];
    });
    setNewOrder(prev => ({ ...prev, techId: saved.id }));
    setShowTechForm(false);
    setEditingTechInline(null);
  };

  const selectedCustomer = customers.find(c => c.id === newOrder.customerId);
  const selectedTech = users.find(u => u.id === newOrder.techId);

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
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ordens de Serviço</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão de atendimentos e produtividade</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-file-circle-plus"></i> Abrir Nova OS
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Buscar por cliente ou ID..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="flex-1 lg:flex-none px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black uppercase tracking-widest"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as OrderStatus })}
            >
              <option value="">Todos Status</option>
              {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            {isAdmin && (
              <select
                className="flex-1 lg:flex-none px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black uppercase tracking-widest"
                value={filters.tech}
                onChange={(e) => setFilters({ ...filters, tech: e.target.value })}
              >
                <option value="">Todos Técnicos</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="p-1 md:p-2">
          <div className="border-2 border-blue-500/30 rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black">
                    <th className="px-6 py-5">Status / Natureza</th>
                    <th className="px-6 py-5">Identificação</th>
                    <th className="px-6 py-5">Responsável</th>
                    <th className="px-6 py-5">Cronograma</th>
                    <th className="px-6 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            {order.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm leading-none mb-1">{order.customerName}</div>
                        <div className="text-[9px] text-slate-400 font-bold">ID: #{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-user-gear"></i>
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{order.techName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Criação: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          {order.scheduledDate && (
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                              Agendado: {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <button
                              onClick={() => setOrderToDelete(order.id)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Excluir OS"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                          <Link
                            to={`/ordens/${order.id}`}
                            className="inline-flex items-center gap-2 bg-slate-100/80 hover:bg-blue-600 hover:text-white text-slate-500 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            <span>Ver OS</span>
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
          <div className="p-6 bg-slate-50/30 border-t border-slate-100">
            <button
              onClick={() => setShowAllOrders(!showAllOrders)}
              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
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

      {/* Modal - Nova OS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300">

            {/* Header do Modal */}
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Nova Ordem de Serviço</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Preencha os dados do atendimento</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-900 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

              {/* Seção: Cliente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">
                    <i className="fa-solid fa-user mr-2"></i>Cliente Final
                  </h4>
                  <div className="flex gap-2">
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => { setEditingCustomerInline(selectedCustomer); setShowCustomerForm(true); }}
                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                        title="Editar cliente selecionado"
                      >
                        <i className="fa-solid fa-pen-to-square"></i> Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditingCustomerInline(null); setShowCustomerForm(true); }}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                      title="Adicionar novo cliente"
                    >
                      <i className="fa-solid fa-user-plus"></i> Novo
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                    value={newOrder.customerId}
                    onChange={e => setNewOrder({ ...newOrder, customerId: e.target.value })}
                  >
                    <option value="">— Selecione o Cliente —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                </div>

                {/* Preview do cliente selecionado */}
                {selectedCustomer && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 animate-in fade-in duration-200">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-user text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm tracking-tight">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                        <i className="fa-solid fa-phone mr-1"></i>{selectedCustomer.phone}
                        {selectedCustomer.city && <span className="ml-3"><i className="fa-solid fa-map-marker-alt mr-1"></i>{selectedCustomer.city}</span>}
                      </p>
                      {(selectedCustomer.address) && (
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">
                          <i className="fa-solid fa-location-dot mr-1"></i>
                          {selectedCustomer.address}{selectedCustomer.number ? `, ${selectedCustomer.number}` : ''}
                          {selectedCustomer.sector ? ` — ${selectedCustomer.sector}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção: Técnico + Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] border-l-4 border-violet-500 pl-3">
                      <i className="fa-solid fa-user-gear mr-2"></i>Responsável
                    </h4>
                    <div className="flex gap-2">
                      {selectedTech && !isTrialUser(currentUser) && (
                        <button
                          type="button"
                          onClick={() => { setEditingTechInline(selectedTech); setShowTechForm(true); }}
                          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Editar
                        </button>
                      )}
                      {!isTrialUser(currentUser) && currentUser?.role !== UserRole.TECH && (
                        <button
                          type="button"
                          onClick={() => { setEditingTechInline(null); setShowTechForm(true); }}
                          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-plus"></i> Novo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                      value={newOrder.techId}
                      onChange={e => setNewOrder({ ...newOrder, techId: e.target.value })}
                      disabled={currentUser?.role === UserRole.TECH}
                    >
                      <option value="">— Definir Técnico —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                  </div>
                  {selectedTech && (
                    <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 animate-in fade-in duration-200">
                      <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                        <i className="fa-solid fa-user-gear text-[10px]"></i>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[11px] tracking-tight">{selectedTech.name}</p>
                        {selectedTech.city && <p className="text-[9px] text-violet-500 font-bold">{selectedTech.city}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-slate-300 pl-3">
                    <i className="fa-solid fa-tag mr-2"></i>Natureza
                  </h4>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                      value={newOrder.type}
                      onChange={e => setNewOrder({ ...newOrder, type: e.target.value })}
                    >
                      {settings?.orderTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                  </div>
                </div>
              </div>

              {/* Seção: Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    <i className="fa-solid fa-calendar-day mr-1.5"></i>Data Abertura
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black text-slate-700"
                    value={newOrder.createdAt}
                    onChange={e => setNewOrder({ ...newOrder, createdAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    <i className="fa-solid fa-calendar-check mr-1.5"></i>Agendamento (Prazo)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black text-blue-600"
                    value={newOrder.scheduledDate}
                    onChange={e => setNewOrder({ ...newOrder, scheduledDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Seção: Descrição */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  <i className="fa-solid fa-file-lines mr-1.5"></i>Relato do Cliente / Diagnóstico Inicial
                </label>
                <textarea
                  required
                  placeholder="Descreva o que foi solicitado, o problema reportado pelo cliente..."
                  rows={4}
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-medium leading-relaxed bg-slate-50/50"
                  value={newOrder.description}
                  onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                />
              </div>

              {/* Seção: Anexos */}
              {settings?.enableAttachments && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                    <i className="fa-solid fa-paperclip mr-1.5"></i>Documentação Prévia (Opcional)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {newOrder.attachments.map(att => (
                      <div key={att.id} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                        <i className="fa-solid fa-file text-blue-500"></i>
                        <span className="truncate max-w-[100px]">{att.name}</span>
                        <button type="button" onClick={() => removePendingAttachment(att.id)} className="text-red-500 hover:scale-125 transition-transform">
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-50"
                  >
                    <i className="fa-solid fa-cloud-arrow-up text-2xl mb-1"></i>
                    Enviar fotos ou documentos
                  </button>
                </div>
              )}

              {/* Botões */}
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  <i className="fa-solid fa-file-circle-check mr-2"></i>
                  Gerar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
