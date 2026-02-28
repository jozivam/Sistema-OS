
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import {
  isTrialUser, getTrialOrders, getTrialCustomers, saveTrialOrders,
  TRIAL_COMPANY_ID, TRIAL_ADMIN_ID, TRIAL_TECH_ID
} from '../services/trialService';
import { OrderStatus, ServiceOrder, UserRole, OrderPost, OrderAttachment, User, Company } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex border-b border-slate-100 last:border-0">
    <div className="w-44 shrink-0 bg-slate-50 border-r border-slate-100 px-5 py-4 text-sm text-slate-500 flex items-start">
      {label}
    </div>
    <div className="flex-1 px-5 py-4 text-sm text-slate-800">
      {children}
    </div>
  </div>
);

const OptimizedTextarea = ({
  value,
  onChange,
  placeholder,
  disabled,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <textarea
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
    />
  );
};

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [customer, setCustomer] = useState<any>(null); // Usando any por enquanto ou Customer
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [showAllAttachments, setShowAllAttachments] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  const [editedDescription, setEditedDescription] = useState('');
  const [editedHistory, setEditedHistory] = useState('');
  const [editedAIReport, setEditedAIReport] = useState('');
  const [editedScheduledDate, setEditedScheduledDate] = useState('');
  const [editedType, setEditedType] = useState<string>('');
  const [editedTechId, setEditedTechId] = useState('');

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishReport, setFinishReport] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'reports' | 'settings'>('details');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadOrderData = async () => {
    if (!id) return;
    try {
      const fetchedUser = await authService.getCurrentUser();
      setCurrentUser(fetchedUser);

      if (isTrialUser(fetchedUser)) {
        // Modo trial: busca ordem do sessionStorage
        const allOrders = getTrialOrders();
        const foundOrder = allOrders.find(o => o.id === id) || null;
        if (foundOrder) {
          setOrder(foundOrder);
          setEditedDescription(foundOrder.description || '');
          setEditedHistory(foundOrder.dailyHistory || '');
          setEditedAIReport(foundOrder.aiReport || '');
          if (foundOrder.scheduledDate) {
            const date = new Date(foundOrder.scheduledDate);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            setEditedScheduledDate(date.toISOString().slice(0, 16));
          }
          setEditedType(foundOrder.type);
          setEditedTechId(foundOrder.techId || '');
          const trialCustomers = getTrialCustomers();
          const foundCustomer = trialCustomers.find(c => c.id === foundOrder.customerId);
          setCustomer(foundCustomer);
          // UsuÃ¡rios disponÃ­veis para o select de tÃ©cnico
          setUsers([
            { id: TRIAL_ADMIN_ID, name: fetchedUser!.name + ' (Admin)', email: 'admin@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
            { id: TRIAL_TECH_ID, name: fetchedUser!.name + ' (TÃ©cnico)', email: 'tecnico@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
          ]);
          const trialCompany: Company = {
            id: TRIAL_COMPANY_ID, name: 'Demo', corporateName: 'Demo', tradeName: 'Demo',
            document: '', email: '', phone: '', address: '', city: '',
            plan: 'DIAMANTE' as any, period: 'MENSAL' as any, monthlyFee: 0,
            status: 'ACTIVE', createdAt: new Date().toISOString(),
            settings: { enableAI: true, enableAttachments: true, enableChat: true, enableHistory: true, orderTypes: ['InstalaÃ§Ã£o', 'ManutenÃ§Ã£o', 'Reparo', 'ConfiguraÃ§Ã£o', 'Visita TÃ©cnica'] }
          };
          setCompany(trialCompany);
        }
      } else {
        const fetchedOrder = await dbService.getOrder(id);
        if (fetchedOrder) {
          setOrder(fetchedOrder);
          setEditedDescription(fetchedOrder.description || '');
          setEditedHistory(fetchedOrder.dailyHistory || '');
          setEditedAIReport(fetchedOrder.aiReport || '');

          if (fetchedOrder.scheduledDate) {
            const date = new Date(fetchedOrder.scheduledDate);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            setEditedScheduledDate(date.toISOString().slice(0, 16));
          }
          setEditedType(fetchedOrder.type);
          setEditedTechId(fetchedOrder.techId || '');

          if (fetchedUser?.companyId) {
            const [fetchedCustomers, fetchedUsers, fetchedCompany] = await Promise.all([
              dbService.getCustomers(fetchedUser.companyId),
              dbService.getUsers(fetchedUser.companyId),
              dbService.getCompany(fetchedUser.companyId)
            ]);

            setUsers(fetchedUsers);
            setCompany(fetchedCompany);

            const foundCustomer = fetchedCustomers.find(c => c.id === fetchedOrder.customerId);
            setCustomer(foundCustomer);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes da OS:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderData();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [order?.posts]);

  // Auto-dismiss toast after 2.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isAdmin = currentUser?.role === UserRole.ADMIN || isTrialUser(currentUser);
  const settings = company?.settings || (window as any).initialData?.settings; // Fallback se necessÃ¡rio

  if (loading) return (
    <div className="flex items-center justify-center p-24">
      <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
    </div>
  );

  if (!order) return <div className="text-center py-20 font-black text-slate-400 uppercase">Atendimento nÃ£o encontrado.</div>;

  const isLocked = order.status === OrderStatus.FINISHED || order.status === OrderStatus.CANCELLED;

  const persistChanges = async (updatedOrder: ServiceOrder) => {
    try {
      if (isTrialUser(currentUser)) {
        // Modo trial: salva no sessionStorage
        const allOrders = getTrialOrders();
        const idx = allOrders.findIndex(o => o.id === updatedOrder.id);
        if (idx >= 0) allOrders[idx] = updatedOrder;
        else allOrders.unshift(updatedOrder);
        saveTrialOrders(allOrders);
        setOrder(updatedOrder);
      } else {
        await dbService.updateOrder(updatedOrder.id, updatedOrder);
        setOrder(updatedOrder);
      }
    } catch (error) {
      console.error("Erro ao persistir mudanÃ§as na OS:", error);
      setToast({ message: 'Erro ao salvar mudanÃ§as.', type: 'error' });
    }
  };

  const handleGenerateAI = async () => {
    if (!id || !editedDescription) {
      setToast({ message: 'A InstruÃ§Ã£o de ServiÃ§o original Ã© obrigatÃ³ria para a IA.', type: 'error' });
      return;
    }
    setIsGeneratingAI(true);
    try {
      const generatedText = await dbService.generateAIReport(id, editedDescription, editedHistory);
      setEditedAIReport(generatedText);
      setToast({ message: 'RelatÃ³rio IA gerado com sucesso! NÃ£o esqueÃ§a de Salvar.', type: 'success' });
    } catch (error) {
      console.error("Erro na geraÃ§Ã£o de IA:", error);
      setToast({ message: 'Erro ao contactar a InteligÃªncia Artificial.', type: 'error' });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = async (type: 'all' | 'desc' | 'report' | 'ai' | 'none' = 'all') => {
    // Se estiver bloqueado e tentando salvar alterações (não status), retorna
    if (isLocked && type !== 'none') return;

    if (type === 'desc') setIsSavingDesc(true);
    else if (type === 'report') setIsSavingReport(true);
    else if (type === 'ai') setIsSavingReport(true);
    else setIsSaving(true);

    try {
      const selectedTech = users.find(u => u.id === editedTechId);

      const updatedOrder: ServiceOrder = {
        ...order,
        description: editedDescription,
        dailyHistory: editedHistory,
        aiReport: editedAIReport,
        scheduledDate: editedScheduledDate ? new Date(editedScheduledDate).toISOString() : null,
        type: editedType,
        techId: editedTechId,
        techName: selectedTech?.name || order.techName
      };

      if (isTrialUser(currentUser)) {
        // Modo trial: atualiza estado E persiste no sessionStorage
        const allOrders = getTrialOrders();
        const idx = allOrders.findIndex(o => o.id === updatedOrder.id);
        if (idx >= 0) allOrders[idx] = updatedOrder;
        else allOrders.unshift(updatedOrder);
        saveTrialOrders(allOrders);
        setOrder(updatedOrder);
        if (type !== 'none') setToast({ message: 'Dados da OS salvos!', type: 'success' });
        setIsSaving(false); setIsSavingDesc(false); setIsSavingReport(false);
        return updatedOrder;
      }

      await dbService.updateOrder(order.id, updatedOrder);
      setOrder(updatedOrder);

      if (type !== 'none') {
        setToast({ message: 'Dados da OS salvos!', type: 'success' });
      }
      return updatedOrder;
    } catch (error) {
      console.error("Erro ao salvar OS:", error);
      setToast({ message: 'Erro ao salvar OS.', type: 'error' });
      throw error;
    } finally {
      setIsSaving(false);
      setIsSavingDesc(false);
      setIsSavingReport(false);
    }
  };



  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      // Primeiro salva qualquer alteraÃ§Ã£o pendente nos campos
      const currentOrder = await handleSave('none');

      const updatedOrder: ServiceOrder = {
        ...currentOrder,
        status: newStatus,
        finishedAt: newStatus === OrderStatus.FINISHED ? new Date().toISOString() : undefined
      };

      await persistChanges(updatedOrder);

      let message = `Status alterado para ${newStatus}`;
      if (newStatus === OrderStatus.OPEN) message = 'Ordem reaberta!';
      if (newStatus === OrderStatus.IN_PROGRESS && order.status === OrderStatus.PAUSED) message = 'ServiÃ§o retomado!';
      if (newStatus === OrderStatus.PAUSED) message = 'ServiÃ§o pausado!';

      setToast({ message, type: 'success' });
    } catch (error) {
      console.error("Erro ao mudar status:", error);
    }
  };

  const handleOpenFinishModal = async () => {
    // Primeiro salva qualquer alteraÃ§Ã£o pendente nos campos
    await handleSave('none');
    setIsFinishModalOpen(true);
  };

  const confirmFinish = async () => {
    if (!finishReport.trim()) {
      setToast({ message: 'Por favor, descreva o serviÃ§o realizado.', type: 'error' });
      return;
    }

    try {
      const reportText = `[RELATÓRIO DE FINALIZAÇÃO - ${new Date().toLocaleDateString('pt-BR')}]:\n${finishReport}`;
      const updatedOrder: ServiceOrder = {
        ...order!,
        status: OrderStatus.FINISHED,
        finishedAt: new Date().toISOString(),
        dailyHistory: (order!.dailyHistory || '') +
          (order!.dailyHistory ? '\n\n' : '') +
          reportText
      };

      await persistChanges(updatedOrder);
      setEditedHistory(updatedOrder.dailyHistory || ''); // Sincroniza o campo de texto na tela
      setIsFinishModalOpen(false);
      setFinishReport('');
      setToast({ message: 'Ordem de serviço finalizada com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao finalizar OS:", error);
      setToast({ message: 'Erro ao finalizar serviÃ§o.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || isLocked) return;
    setIsUploading(true);

    const newAttachments: OrderAttachment[] = [];
    let processed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        newAttachments.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64,
          createdAt: new Date().toISOString()
        });
        processed++;

        if (processed === files.length) {
          const updatedOrder = { ...order, attachments: [...(order.attachments || []), ...newAttachments] };
          await persistChanges(updatedOrder);
          setIsUploading(false);
          setToast({ message: 'Arquivos anexados!', type: 'success' });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (isLocked) return;
    setAttachmentToDelete(attachmentId);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete || !order) return;
    const currentAttachments = order.attachments || [];
    const updatedAttachments = currentAttachments.filter(a => a.id !== attachmentToDelete);
    await persistChanges({ ...order, attachments: updatedAttachments });
    setAttachmentToDelete(null);
    setToast({ message: 'Arquivo removido!', type: 'success' });
  };

  const handleDownloadAll = async () => {
    const currentAttachments = order.attachments || [];
    if (currentAttachments.length === 0) return;
    try {
      const JSZip = (window as any).JSZip;
      const saveAs = (window as any).saveAs;
      if (!JSZip || !saveAs) return;
      const zip = new JSZip();
      currentAttachments.forEach((att) => {
        const base64Data = att.data.split(',')[1] || att.data;
        zip.file(att.name, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `OS-${order.id.slice(-4)}-anexos.zip`);
    } catch (error) { console.error(error); }
  };

  const handleAddPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPostContent.trim() || isLocked) return;
    const newPost: OrderPost = { id: Date.now().toString(), userId: currentUser?.id || '', userName: currentUser?.name || 'Sistema', content: newPostContent, createdAt: new Date().toISOString() };
    await persistChanges({ ...order, posts: [newPost, ...(order.posts || [])] });
    setNewPostContent('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copiado para Ã¡rea de transferÃªncia!', type: 'success' });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (mimeType.includes('image')) return 'fa-image text-blue-500';
    return 'fa-file text-slate-300';
  };

  const attachments = order.attachments || [];
  const visibleAttachments = showAllAttachments ? attachments : attachments.slice(0, 5);

  const user = currentUser; // Alias para compatibilidade com o JSX abaixo

  // Helper: timestamp relativo
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    return `${days} dia${days > 1 ? 's' : ''} atrás`;
  };

  // Cores de avatar por index
  const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500'];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="relative pb-24 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4">
          <i className="fa-solid fa-circle-check text-green-500 mr-2"></i> {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!attachmentToDelete}
        title="Excluir Arquivo"
        message="Tem certeza que deseja excluir este arquivo?"
        onConfirm={confirmDeleteAttachment}
        onCancel={() => setAttachmentToDelete(null)}
        variant="danger"
        confirmText="Excluir"
      />

      {/* ── Header compacto ── */}
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/ordens" className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm shrink-0">
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-800">OS #{order.id.slice(-4)}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${order.status === OrderStatus.FINISHED ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : order.status === OrderStatus.PAUSED ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{order.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {!isLocked ? (<>
            {order.status === OrderStatus.OPEN && (
              <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5">
                <i className="fa-solid fa-play text-[10px]"></i> Iniciar
              </button>
            )}
            {order.status === OrderStatus.PAUSED && (
              <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5">
                <i className="fa-solid fa-play text-[10px]"></i> Retomar
              </button>
            )}
            {order.status === OrderStatus.IN_PROGRESS && (
              <button onClick={() => handleStatusChange(OrderStatus.PAUSED)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5">
                <i className="fa-solid fa-pause text-[10px]"></i> Pausar
              </button>
            )}
            <button onClick={() => handleSave('all')} disabled={isSaving} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5">
              {isSaving ? <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> : <i className="fa-solid fa-floppy-disk text-[10px]"></i>} Salvar
            </button>
            <button onClick={handleOpenFinishModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5">
              <i className="fa-solid fa-check text-[10px]"></i> Finalizar
            </button>
          </>) : (isAdmin && (
            <button onClick={() => handleStatusChange(OrderStatus.OPEN)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5">
              <i className="fa-solid fa-rotate-left text-[10px]"></i> Reabrir
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ════ COLUNA ESQUERDA — Tabela de Detalhes ════ */}
        <div className="order-1 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Número da OS */}
          <Row label="Número da OS">
            <span className="font-semibold text-blue-600">#{order.id.slice(-4)}</span>
          </Row>

          {/* Cliente */}
          <Row label="Cliente">
            {customer ? (
              <div className="flex items-center gap-2">
                <i className="fa-regular fa-user text-blue-500 text-xs"></i>
                <span className="font-semibold text-blue-600">{customer.name}</span>
              </div>
            ) : <span className="text-slate-400 italic text-xs">Não informado</span>}
          </Row>

          {/* Contato */}
          <Row label="Contato">
            {customer ? (
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-phone text-slate-400 text-xs"></i>
                <span className="text-slate-600">{customer.phone}</span>
              </div>
            ) : <span className="text-slate-400 italic text-xs">Sem contato</span>}
          </Row>

          {/* Localização */}
          <Row label="Localização">
            {customer ? (
              <div className="space-y-0.5">
                {customer.address && <p className="text-slate-700">{customer.address}{customer.number ? `, ${customer.number}` : ''}</p>}
                {customer.city && <p className="text-slate-500 text-xs">{customer.city}</p>}
                {!customer.address && !customer.city && <span className="text-slate-400 italic text-xs">Não informado</span>}
              </div>
            ) : <span className="text-slate-400 italic text-xs">—</span>}
          </Row>

          {/* Tipo de Serviço */}
          <Row label="Tipo de Serviço">
            <select
              disabled={isLocked || !isAdmin}
              className="bg-transparent border-0 outline-none text-slate-800 text-sm w-full max-w-xs cursor-pointer disabled:cursor-default"
              value={editedType}
              onChange={e => setEditedType(e.target.value)}
            >
              <option value="">Selecione...</option>
              {settings?.orderTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>

          {/* Técnico Responsável */}
          {isAdmin && (
            <Row label="Responsável">
              <select
                disabled={isLocked}
                className="bg-transparent border-0 outline-none text-slate-800 text-sm w-full max-w-xs cursor-pointer disabled:cursor-default"
                value={editedTechId}
                onChange={e => setEditedTechId(e.target.value)}
              >
                <option value="">Nenhum atribuído</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Row>
          )}

          {/* Prazo */}
          <Row label="Prazo">
            <input
              type="datetime-local"
              disabled={isLocked || !isAdmin}
              className="bg-transparent border-0 outline-none text-slate-800 text-sm"
              value={editedScheduledDate}
              onChange={e => setEditedScheduledDate(e.target.value)}
            />
          </Row>

          {/* Instruções */}
          <Row label="Instruções">
            <OptimizedTextarea
              disabled={isLocked}
              className="w-full bg-transparent border-0 outline-none text-slate-700 text-sm resize-none min-h-[100px] leading-relaxed"
              placeholder="Descreva o problema ou solicitação original..."
              value={editedDescription}
              onChange={setEditedDescription}
            />
          </Row>

          {/* Anexos */}
          {settings?.enableAttachments && (
            <Row label="Anexos">
              <div className="flex flex-wrap gap-2 items-center">
                {order.attachments?.map((att: OrderAttachment) => (
                  <div key={att.id} className="relative group w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shadow-sm">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.data} className="w-full h-full object-cover" alt={att.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className={`fa-solid ${getFileIcon(att.mimeType)} text-lg text-slate-400`}></i>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/70 flex gap-1 justify-center items-center opacity-0 group-hover:opacity-100 transition-all">
                      <a href={att.data} download={att.name} className="w-5 h-5 bg-white rounded flex items-center justify-center text-blue-600"><i className="fa-solid fa-download text-[9px]"></i></a>
                      {!isLocked && <button onClick={() => handleDeleteAttachment(att.id)} className="w-5 h-5 bg-white rounded flex items-center justify-center text-rose-500"><i className="fa-solid fa-trash text-[9px]"></i></button>}
                    </div>
                  </div>
                ))}
                {(order.attachments || []).length === 0 && <span className="text-xs text-slate-400 italic">Nenhum arquivo</span>}
                {!isLocked && (
                  <>
                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                      {isUploading ? <i className="fa-solid fa-spinner fa-spin text-xs"></i> : <i className="fa-solid fa-plus text-xs"></i>}
                    </button>
                  </>
                )}
              </div>
            </Row>
          )}

          {/* Relatório de Serviço */}
          {(isAdmin || isLocked) && (
            <Row label="Relatório">
              <OptimizedTextarea
                disabled={isLocked || !isAdmin}
                className="w-full bg-transparent border-0 outline-none text-slate-700 text-sm resize-none min-h-[100px] leading-relaxed"
                placeholder="Detalhes técnicos da execução..."
                value={editedHistory}
                onChange={setEditedHistory}
              />
            </Row>
          )}
        </div>

        {/* ════ COLUNA DIREITA — Comentários ════ */}
        <div className="order-2 lg:col-span-4 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Título */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <h2 className="font-semibold text-slate-800 text-base">Comentários</h2>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
            {(order.posts || []).length === 0 && (
              <p className="text-xs text-slate-400 italic text-center mt-8">Nenhum comentário ainda.</p>
            )}
            {(order.posts || []).map((post: OrderPost) => {
              const isSystem = post.userId === 'ai-assistant';
              const initial = isSystem ? '🤖' : post.userName.charAt(0).toUpperCase();
              const color = isSystem ? 'bg-indigo-100 text-indigo-600' : `${getAvatarColor(post.userName)} text-white`;
              return (
                <div key={post.id} className="flex gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-sm ${color}`}>
                    {isSystem ? <i className="fa-solid fa-robot text-xs"></i> : initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-slate-800">{post.userName}</span>
                      <span className="text-xs text-slate-400">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{post.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Área de composição */}
          {!isLocked ? (
            <div className="px-4 py-4 border-t border-slate-100 shrink-0 space-y-3">
              <div className="flex gap-3">
                {/* Avatar do usuário atual */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-sm ${currentUser ? `${getAvatarColor(currentUser.name)} text-white` : 'bg-slate-200 text-slate-500'}`}>
                  {currentUser?.name.charAt(0).toUpperCase() || '?'}
                </div>
                <textarea
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[72px] bg-white shadow-sm"
                  placeholder="Escreva um comentário para fechar o atendimento ou enviar à gestão"
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddPost(); } }}
                />
              </div>
              <div className="flex items-center gap-2 pl-12">
                <button
                  onClick={() => handleAddPost()}
                  disabled={!newPostContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  Adicionar Comentário
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 border-t border-slate-100 shrink-0 text-center">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-2"><i className="fa-solid fa-lock"></i> Comentários encerrados</p>
            </div>
          )}
        </div>

      </div>

      {/* ── Modal Finalizar ── */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-50/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-file-signature"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Relatório de Encerramento</h3>
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">Obrigatório para finalizar</p>
                </div>
              </div>
              <button onClick={() => setIsFinishModalOpen(false)} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors shadow-sm">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <textarea
                autoFocus required
                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm min-h-[200px] resize-none leading-relaxed shadow-inner"
                placeholder="Relate detalhadamente o que foi feito, peças trocadas, observações importantes..."
                value={finishReport}
                onChange={e => setFinishReport(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setIsFinishModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-50 transition-all">
                  Continuar Editando
                </button>
                <button onClick={confirmFinish} disabled={isSaving || !finishReport.trim()} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  Finalizar e Salvar Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;

