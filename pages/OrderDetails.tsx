
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
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<OrderAttachment | null>(null);
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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isSpecialPurchaseOpen, setIsSpecialPurchaseOpen] = useState(false);
  const [specialPurchaseForm, setSpecialPurchaseForm] = useState({ productName: '', quantity: 1, price: 0, supplierName: '' });

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

  const handleSpecialPurchase = async () => {
    // Aqui vai a lógica (Simulada no mock por enquanto, logo com real DB interactions)
    if (!specialPurchaseForm.productName || !specialPurchaseForm.supplierName || specialPurchaseForm.price <= 0) {
      setToast({ message: 'Preencha todos os campos da compra.', type: 'error' });
      return;
    }

    // Simulate flow:
    // 1. Create Supplier if not exists (mocked or real DB logic)
    // 2. Add Expense to financial_transactions 
    // 3. Inform success
    setToast({ message: `Compra de ${specialPurchaseForm.quantity}x ${specialPurchaseForm.productName} registrada e vinculada! Sobra no estoque do técnico.`, type: 'success' });
    setIsSpecialPurchaseOpen(false);
    setSpecialPurchaseForm({ productName: '', quantity: 1, price: 0, supplierName: '' });
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
    let updatedAttachments = [];

    if (attachmentToDelete === 'bulk') {
      updatedAttachments = currentAttachments.filter(a => !selectedAttachments.includes(a.id));
      setSelectedAttachments([]);
    } else {
      updatedAttachments = currentAttachments.filter(a => a.id !== attachmentToDelete);
    }

    await persistChanges({ ...order, attachments: updatedAttachments });
    setAttachmentToDelete(null);
    setToast({ message: attachmentToDelete === 'bulk' ? 'Arquivos selecionados removidos!' : 'Arquivo removido!', type: 'success' });
  };

  const handleDownloadSelected = async () => {
    const currentAttachments = order.attachments || [];
    const attsToDownload = selectedAttachments.length > 0
      ? currentAttachments.filter(a => selectedAttachments.includes(a.id))
      : currentAttachments;

    if (attsToDownload.length === 0) return;

    try {
      const JSZip = (window as any).JSZip;
      const saveAs = (window as any).saveAs;
      if (!JSZip || !saveAs) return;
      const zip = new JSZip();
      attsToDownload.forEach((att) => {
        const base64Data = att.data.split(',')[1] || att.data;
        zip.file(att.name, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `OS-${order.id.slice(-4)}-anexos.zip`);

      // Auto-clear selection after download
      if (selectedAttachments.length > 0) setSelectedAttachments([]);
      setToast({ message: 'Download iniciado!', type: 'success' });
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
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 mb-1 border-b border-slate-100 pb-2 flex-wrap items-center">
                  <button
                    onClick={() => {
                      const currentAttachments = order.attachments || [];
                      if (selectedAttachments.length === currentAttachments.length && currentAttachments.length > 0) {
                        setSelectedAttachments([]);
                      } else {
                        setSelectedAttachments(currentAttachments.map(a => a.id));
                      }
                    }}
                    className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-100 transition-colors mr-2"
                  >
                    <i className={`fa-regular ${selectedAttachments.length === (order.attachments || []).length && (order.attachments || []).length > 0 ? 'fa-square-check' : 'fa-square'}`}></i> Marcar Todos
                  </button>

                  {selectedAttachments.length > 0 && (
                    <>
                      <button onClick={handleDownloadSelected} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                        <i className="fa-solid fa-download"></i> Baixar ({selectedAttachments.length})
                      </button>
                      {!isLocked && (
                        <button onClick={() => handleDeleteAttachment('bulk')} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-rose-100 transition-colors">
                          <i className="fa-solid fa-trash"></i> Excluir ({selectedAttachments.length})
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  {visibleAttachments.map((att: OrderAttachment) => (
                    <div key={att.id} className="relative group flex flex-col items-center gap-1.5 w-16">
                      <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm cursor-pointer group-hover:border-blue-300 transition-colors" onClick={() => setPreviewAttachment(att)}>
                        {att.mimeType.startsWith('image/') ? (
                          <img src={att.data} className="w-full h-full object-cover" alt={att.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white">
                            <i className={`fa-solid ${getFileIcon(att.mimeType)} text-2xl text-slate-400`}></i>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <i className="fa-solid fa-eye text-white bg-slate-900/50 w-7 h-7 rounded-full flex items-center justify-center text-[10px]"></i>
                        </div>
                      </div>

                      <div className="flex items-center w-full justify-between gap-1 px-1">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 text-blue-600 rounded bg-slate-50 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          checked={selectedAttachments.includes(att.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedAttachments([...selectedAttachments, att.id]);
                            else setSelectedAttachments(selectedAttachments.filter(id => id !== att.id));
                          }}
                        />
                        <button onClick={() => { setSelectedAttachments([att.id]); setTimeout(handleDownloadSelected, 50) }} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"><i className="fa-solid fa-download text-[10px]"></i></button>
                      </div>
                    </div>
                  ))}

                  {attachments.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum arquivo</span>}

                  {!showAllAttachments && attachments.length > 5 && (
                    <button onClick={() => setShowAllAttachments(true)} className="relative w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center mb-6 shadow-sm group">
                      <div className="flex flex-col items-center text-slate-500 group-hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-layer-group text-lg mb-1"></i>
                        <span className="text-[10px] font-black uppercase">+{attachments.length - 5}</span>
                      </div>
                    </button>
                  )}

                  {showAllAttachments && attachments.length > 5 && (
                    <button onClick={() => setShowAllAttachments(false)} className="relative w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center mb-6 shadow-sm group">
                      <div className="flex flex-col items-center text-slate-500 group-hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-chevron-up text-lg mb-1"></i>
                        <span className="text-[9px] font-black uppercase">Ver Menos</span>
                      </div>
                    </button>
                  )}

                  {!isLocked && (
                    <div className="flex items-center ml-2 mb-6">
                      <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-slate-50 transition-colors shadow-sm">
                        {isUploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up text-xl"></i>}
                      </button>
                    </div>
                  )}
                </div>
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

        {/* ════ COLUNA DIREITA — Estoque e Materiais da OS ════ */}
        <div className="order-2 lg:col-span-4 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          {/* Título */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-slate-50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-800 text-sm tracking-tight uppercase">Materiais e Estoque</h2>
              <p className="text-[10px] text-slate-500 font-medium">Itens atrelados a esta Ordem de Serviço</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <i className="fa-solid fa-box-open text-xs"></i>
            </div>
          </div>

          {/* Lista de Materiais Mock (Em breve DB real) */}
          <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
            {/* Simulação de um Item Adicionado */}
            <div className="space-y-4">
              {/* Item 1 */}
              <div className="group relative border border-slate-100 rounded-xl p-3 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Conector RJ45 (NET-001)</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retirado do: Veículo Pablo</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-black text-xs px-2 py-0.5 rounded border border-emerald-100/50 block">5 un</span>
                </div>
                <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition-colors uppercase tracking-wider">Devolver</button>
                </div>
              </div>

              {/* Add Botão Grande (Placeholder) */}
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => setToast({ message: 'Nova interface de Venda/Uso de estoque em breve!', type: 'success' })} className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 rounded-xl transition-all font-semibold text-xs flex flex-col items-center justify-center gap-1 group">
                  <i className="fa-solid fa-plus text-base group-hover:scale-110 transition-transform"></i>
                  <span>Adicionar Material do Estoque</span>
                </button>
                <button onClick={() => setIsSpecialPurchaseOpen(true)} className="w-full py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-2 group">
                  <i className="fa-solid fa-cart-shopping text-sm group-hover:scale-110 transition-transform"></i>
                  Registrar Compra Externa (Avulsa)
                </button>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100/50 mt-4">
                <div className="flex gap-2">
                  <i className="fa-solid fa-lightbulb text-amber-500 text-xs mt-0.5"></i>
                  <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                    Cliente quer comprar um roteador? Você poderá transferir diretamente do seu estoque para o estoque do cliente, ou usar o PDV para abater os materiais utilizados no serviço.
                  </p>
                </div>
              </div>
            </div>
          </div>
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

      {/* ── Modal de Compra Externa ── */}
      {isSpecialPurchaseOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i className="fa-solid fa-cart-arrow-down"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Compra de Suprimento</h3>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">Urgência em Campo</p>
                </div>
              </div>
              <button onClick={() => setIsSpecialPurchaseOpen(false)} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors shadow-sm">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-50/30">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100/50 flex gap-3 text-amber-800">
                <i className="fa-solid fa-circle-info mt-0.5 text-amber-500"></i>
                <p className="text-xs font-medium leading-relaxed">
                  Utilize isto quando o técnico precisar comprar materiais num fornecedor externo (Ex: Casa de Ferragem) para finalizar esta OS. <br />
                  <strong className="mt-1 block">O valor será lançado como DESPESA no Financeiro. O material será injetado na OS e a sobra vai para o estoque do técnico.</strong>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Fornecedor / Loja</label>
                  <input type="text" placeholder="Ex: Loja do Parafuso" value={specialPurchaseForm.supplierName} onChange={e => setSpecialPurchaseForm({ ...specialPurchaseForm, supplierName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Material Comprado</label>
                  <input type="text" placeholder="Ex: Parafuso Sextavado 6mm" value={specialPurchaseForm.productName} onChange={e => setSpecialPurchaseForm({ ...specialPurchaseForm, productName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Quantidade</label>
                    <input type="number" min="1" value={specialPurchaseForm.quantity} onChange={e => setSpecialPurchaseForm({ ...specialPurchaseForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Valor Total Pago (R$)</label>
                    <input type="number" min="0" step="0.01" value={specialPurchaseForm.price} onChange={e => setSpecialPurchaseForm({ ...specialPurchaseForm, price: Number(e.target.value) })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsSpecialPurchaseOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSpecialPurchase} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <i className="fa-solid fa-check"></i>
                Lançar Compra Externa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Preview ── */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4">
          {/* Topbar do Modal */}
          <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
            <div className="flex items-center gap-3">
              <i className={`fa-solid ${getFileIcon(previewAttachment.mimeType)} text-2xl`}></i>
              <div>
                <h3 className="font-bold">{previewAttachment.name}</h3>
                <p className="text-xs text-slate-300">{(previewAttachment.size / 1024).toFixed(1)} KB • {new Date(previewAttachment.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={previewAttachment.data} download={previewAttachment.name} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-download"></i>
              </a>
              <button onClick={() => setPreviewAttachment(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="w-full max-w-5xl flex-1 max-h-[80vh] bg-white rounded-2xl overflow-hidden flex items-center justify-center relative shadow-2xl">
            {previewAttachment.mimeType.startsWith('image/') ? (
              <img src={previewAttachment.data} alt={previewAttachment.name} className="max-w-full max-h-full object-contain" />
            ) : previewAttachment.mimeType === 'application/pdf' ? (
              <iframe src={previewAttachment.data} className="w-full h-full border-0" title={previewAttachment.name} />
            ) : (
              <div className="text-center p-8 bg-slate-50 flex flex-col items-center justify-center w-full h-full">
                <i className={`fa-solid ${getFileIcon(previewAttachment.mimeType)} text-6xl text-slate-300 mb-4`}></i>
                <p className="text-slate-500 font-semibold mb-2">Visualização não disponível para este formato ({previewAttachment.mimeType})</p>
                <a href={previewAttachment.data} download={previewAttachment.name} className="text-blue-600 hover:underline font-bold text-sm">
                  Baixar o Arquivo
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Offcanvas Comentários ── */}
      {isCommentsOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end pointer-events-none h-full">
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10 pointer-events-auto border-l border-slate-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Comentários da OS</h3>
                <p className="text-xs font-medium text-gray-500 mt-1">Histórico e anotações</p>
              </div>
              <button onClick={() => setIsCommentsOpen(false)} className="text-gray-400 hover:text-gray-500 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><i className="fa-solid fa-xmark"></i></button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar bg-slate-50/30">
              {(order.posts || []).length === 0 && (
                <div className="text-center mt-12">
                  <i className="fa-regular fa-comments text-4xl text-slate-200 mb-3"></i>
                  <p className="text-xs text-slate-400 font-medium">Nenhum comentário ainda.</p>
                </div>
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
                    <div className="flex-1 min-w-0 bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-baseline gap-2 mb-1 border-b border-slate-50 pb-1.5">
                        <span className="font-bold text-xs text-slate-800">{post.userName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{timeAgo(post.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{post.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Área de composição */}
            {!isLocked ? (
              <div className="px-4 pt-3 pb-6 border-t border-gray-100 shrink-0 bg-white">
                <div className="flex gap-3 flex-col">
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[90px] bg-slate-50/50 focus:bg-white transition-colors"
                    placeholder="Escreva um comentário..."
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddPost(); } }}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleAddPost()}
                      disabled={!newPostContent.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow hover:shadow-md transition-all disabled:opacity-50 uppercase tracking-widest flex items-center gap-2"
                    >
                      <span>Enviar</span>
                      <i className="fa-solid fa-paper-plane text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 border-t border-gray-100 shrink-0 text-center bg-white">
                <div className="inline-flex items-center justify-center gap-2 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-slate-100">
                  <i className="fa-solid fa-lock"></i> Comentários encerrados
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Botão Flutuante (FAB) Comentários ── */}
      <button
        onClick={() => setIsCommentsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all z-50 hover:scale-105 active:scale-95 group border-4 border-white"
        title="Ver Comentários"
      >
        <i className="fa-solid fa-comments text-xl group-hover:-translate-y-0.5 transition-transform"></i>
        {(order.posts && order.posts.length > 0) && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 border-2 border-white rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
            {order.posts.length}
          </span>
        )}
      </button>

    </div>
  );
};

export default OrderDetails;

