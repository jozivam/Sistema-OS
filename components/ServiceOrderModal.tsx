
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import {
    isTrialUser, saveTrialOrders, TRIAL_COMPANY_ID, TRIAL_TECH_ID
} from '../services/trialService';
import { OrderStatus, ServiceOrder, UserRole, OrderAttachment, User, Customer, Company } from '../types';

interface ServiceOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    editingOrder: ServiceOrder | null;
    currentUser: User | null;
    company: Company | null;
    customers: Customer[];
    users: User[];
    allOrders: ServiceOrder[];
    onOrdersUpdate: (orders: ServiceOrder[]) => void;
    initialClientId?: string;
    onAddCustomer?: () => void;
    onEditCustomer?: (customer: Customer) => void;
    onAddTech?: () => void;
    onEditTech?: (tech: User) => void;
}

const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingOrder,
    currentUser,
    company,
    customers,
    users,
    allOrders,
    onOrdersUpdate,
    initialClientId,
    onAddCustomer,
    onEditCustomer,
    onAddTech,
    onEditTech
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const [form, setForm] = useState({
        customerId: initialClientId || '',
        techId: '',
        type: '',
        description: '',
        createdAt: getCurrentDateTime(),
        scheduledDate: '',
        attachments: [] as OrderAttachment[]
    });

    const selectedCustomer = customers.find(c => c.id === form.customerId);
    const selectedTech = users.find(u => u.id === form.techId);

    useEffect(() => {
        if (editingOrder) {
            setForm({
                customerId: editingOrder.customerId,
                techId: editingOrder.techId || '',
                type: editingOrder.type,
                description: editingOrder.description,
                createdAt: editingOrder.createdAt.slice(0, 16),
                scheduledDate: editingOrder.scheduledDate ? editingOrder.scheduledDate.slice(0, 16) : '',
                attachments: editingOrder.attachments || []
            });
        } else {
            const defaultTechId = isTrialUser(currentUser)
                ? TRIAL_TECH_ID
                : (currentUser?.role === UserRole.TECH ? currentUser.id : '');

            setForm({
                customerId: initialClientId || '',
                techId: defaultTechId,
                type: company?.settings.orderTypes[0] || 'Suporte',
                description: '',
                createdAt: getCurrentDateTime(),
                scheduledDate: '',
                attachments: []
            });
        }
    }, [editingOrder, isOpen, initialClientId, company, currentUser]);

    if (!isOpen) return null;

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
                setForm(prev => ({
                    ...prev,
                    attachments: [...prev.attachments, attachment]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (id: string) => {
        setForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter(a => a.id !== id)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const customer = customers.find(c => c.id === form.customerId);
            const tech = users.find(u => u.id === form.techId);

            if (!customer || !tech) {
                setError('Selecione um cliente e um técnico válidos.');
                setLoading(false);
                return;
            }

            if (isTrialUser(currentUser)) {
                if (editingOrder) {
                    const updated: ServiceOrder = {
                        ...editingOrder,
                        customerId: customer.id,
                        customerName: customer.name,
                        techId: tech.id,
                        techName: tech.name,
                        type: form.type,
                        description: form.description,
                        scheduledDate: form.scheduledDate,
                        attachments: form.attachments
                    };
                    const updatedList = allOrders.map(o => o.id === editingOrder.id ? updated : o);
                    saveTrialOrders(updatedList);
                    onOrdersUpdate(updatedList);
                } else {
                    const newOrder: ServiceOrder = {
                        id: 'trial-order-' + Date.now(),
                        companyId: TRIAL_COMPANY_ID,
                        customerId: customer.id,
                        customerName: customer.name,
                        techId: tech.id,
                        techName: tech.name,
                        type: form.type,
                        description: form.description,
                        scheduledDate: form.scheduledDate,
                        aiReport: '',
                        status: OrderStatus.OPEN,
                        createdAt: new Date().toISOString(),
                        posts: [],
                        attachments: form.attachments
                    };
                    const updatedList = [newOrder, ...allOrders];
                    saveTrialOrders(updatedList);
                    onOrdersUpdate(updatedList);
                }
            } else {
                if (editingOrder) {
                    const updates: Partial<ServiceOrder> = {
                        customerId: customer.id,
                        customerName: customer.name,
                        techId: tech.id,
                        techName: tech.name,
                        type: form.type,
                        description: form.description,
                        scheduledDate: form.scheduledDate,
                        attachments: form.attachments
                    };
                    await dbService.updateOrder(editingOrder.id, updates);
                    onOrdersUpdate(allOrders.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o));
                } else {
                    const orderData: Omit<ServiceOrder, 'id' | 'createdAt'> = {
                        companyId: currentUser?.companyId || '',
                        customerId: customer.id,
                        customerName: customer.name,
                        techId: tech.id,
                        techName: tech.name,
                        type: form.type,
                        description: form.description,
                        scheduledDate: form.scheduledDate,
                        aiReport: '',
                        status: OrderStatus.OPEN,
                        posts: [],
                        attachments: form.attachments
                    };
                    const created = await dbService.createOrder(orderData);
                    onOrdersUpdate([created, ...allOrders]);
                }
            }

            onSuccess(editingOrder ? "Ordem de Serviço atualizada!" : "Ordem de Serviço criada com sucesso!");
            onClose();
        } catch (err: any) {
            console.error("Erro ao salvar OS:", err);
            setError(`Erro ao salvar: ${err.message || 'Falha na comunicação'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4 transition-all">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="px-8 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">
                            {editingOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
                        </h3>
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-0.5">
                            {editingOrder ? `OS #${editingOrder.id.slice(-6).toUpperCase()}` : 'Preencha os dados do atendimento'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-900 transition-all">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in duration-300">
                            <i className="fa-solid fa-circle-exclamation text-lg"></i>
                            <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {/* Cliente */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">
                                <i className="fa-solid fa-user mr-2"></i>Cliente Final
                            </h4>
                            <div className="flex gap-2">
                                {selectedCustomer && onEditCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => onEditCustomer(selectedCustomer)}
                                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        <i className="fa-solid fa-pen-to-square"></i> Editar
                                    </button>
                                )}
                                {onAddCustomer && (
                                    <button
                                        type="button"
                                        onClick={onAddCustomer}
                                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        <i className="fa-solid fa-user-plus"></i> Novo
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <select
                                required
                                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                                value={form.customerId}
                                onChange={e => setForm({ ...form, customerId: e.target.value })}
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

                    {/* Técnico e Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Definir Responsável</h4>
                                <div className="flex gap-2">
                                    {selectedTech && onEditTech && !isTrialUser(currentUser) && (
                                        <button
                                            type="button"
                                            onClick={() => onEditTech(selectedTech)}
                                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <i className="fa-solid fa-pen-to-square"></i> Editar
                                        </button>
                                    )}
                                    {onAddTech && !isTrialUser(currentUser) && currentUser?.role !== UserRole.TECH && (
                                        <button
                                            type="button"
                                            onClick={onAddTech}
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
                                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                                    value={form.techId}
                                    onChange={e => setForm({ ...form, techId: e.target.value })}
                                >
                                    <option value="">— Atribuir Técnico —</option>
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
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Natureza do Serviço</h4>
                            <div className="relative">
                                <select
                                    required
                                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight appearance-none pr-10"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    <option value="">— Tipo de OS —</option>
                                    {company?.settings.orderTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                            </div>
                        </div>
                    </div>

                    {/* Agendamento */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Data Recomendada / Agendamento</h4>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold uppercase tracking-tight"
                            value={form.scheduledDate}
                            onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Instrução de Serviço</h4>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-sm font-medium placeholder:text-slate-400 resize-none transition-all focus:bg-white"
                            placeholder="Descreva detalhadamente o que deve ser feito..."
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    {/* Anexos */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Arquivos ou Fotos Anexas</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {form.attachments.map(att => (
                                <div key={att.id} className="relative group w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm animate-in zoom-in duration-200">
                                    {att.mimeType.startsWith('image/') ? (
                                        <img src={att.data} className="w-full h-full object-cover" alt={att.name} />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                            <i className="fa-solid fa-file text-xl text-slate-300 mb-1"></i>
                                            <span className="text-[8px] font-black uppercase text-slate-400 truncate w-full">{att.name}</span>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i className="fa-solid fa-xmark text-[10px]"></i>
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

                    {/* Botões */}
                    <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 border border-[var(--border-color)] rounded-2xl font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 bg-[var(--blue-primary)] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-[var(--blue-hover)] btn-pill-hover active:scale-[0.98] disabled:opacity-50"
                        >
                            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-file-circle-check'} mr-2`}></i>
                            {editingOrder ? 'Salvar Alterações' : 'Gerar Ordem de Serviço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceOrderModal;
