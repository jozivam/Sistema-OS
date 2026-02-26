
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
          // Usuários disponíveis para o select de técnico
          setUsers([
            { id: TRIAL_ADMIN_ID, name: fetchedUser!.name + ' (Admin)', email: 'admin@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
            { id: TRIAL_TECH_ID, name: fetchedUser!.name + ' (Técnico)', email: 'tecnico@demo.com', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID },
          ]);
          const trialCompany: Company = {
            id: TRIAL_COMPANY_ID, name: 'Demo', corporateName: 'Demo', tradeName: 'Demo',
            document: '', email: '', phone: '', address: '', city: '',
            plan: 'DIAMANTE' as any, period: 'MENSAL' as any, monthlyFee: 0,
            status: 'ACTIVE', createdAt: new Date().toISOString(),
            settings: { enableAI: true, enableAttachments: true, enableChat: true, enableHistory: true, orderTypes: ['Instalação', 'Manutenção', 'Reparo', 'Configuração', 'Visita Técnica'] }
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
  const settings = company?.settings || (window as any).initialData?.settings; // Fallback se necessário

  if (loading) return (
    <div className="flex items-center justify-center p-24">
      <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
    </div>
  );

  if (!order) return <div className="text-center py-20 font-black text-slate-400 uppercase">Atendimento não encontrado.</div>;

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
      console.error("Erro ao persistir mudanças na OS:", error);
      setToast({ message: 'Erro ao salvar mudanças.', type: 'error' });
    }
  };

  const handleGenerateAI = async () => {
    if (!id || !editedDescription) {
      setToast({ message: 'A Instrução de Serviço original é obrigatória para a IA.', type: 'error' });
      return;
    }
    setIsGeneratingAI(true);
    try {
      const generatedText = await dbService.generateAIReport(id, editedDescription, editedHistory);
      setEditedAIReport(generatedText);
      setToast({ message: 'Relatório IA gerado com sucesso! Não esqueça de Salvar.', type: 'success' });
    } catch (error) {
      console.error("Erro na geração de IA:", error);
      setToast({ message: 'Erro ao contactar a Inteligência Artificial.', type: 'error' });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = async (type: 'all' | 'desc' | 'report' | 'ai' | 'none' = 'all') => {
    if (isLocked) return;

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
      // Primeiro salva qualquer alteração pendente nos campos
      const currentOrder = await handleSave('none');

      const updatedOrder: ServiceOrder = {
        ...currentOrder,
        status: newStatus,
        finishedAt: newStatus === OrderStatus.FINISHED ? new Date().toISOString() : undefined
      };

      await persistChanges(updatedOrder);

      let message = `Status alterado para ${newStatus}`;
      if (newStatus === OrderStatus.OPEN) message = 'Ordem reaberta!';
      if (newStatus === OrderStatus.IN_PROGRESS && order.status === OrderStatus.PAUSED) message = 'Serviço retomado!';
      if (newStatus === OrderStatus.PAUSED) message = 'Serviço pausado!';

      setToast({ message, type: 'success' });
    } catch (error) {
      console.error("Erro ao mudar status:", error);
    }
  };

  const handleOpenFinishModal = async () => {
    // Primeiro salva qualquer alteração pendente nos campos
    await handleSave('none');
    setIsFinishModalOpen(true);
  };

  const confirmFinish = async () => {
    if (!finishReport.trim()) {
      setToast({ message: 'Por favor, descreva o serviço realizado.', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      const updatedOrder: ServiceOrder = {
        ...order!,
        status: OrderStatus.FINISHED,
        finishedAt: new Date().toISOString(),
        dailyHistory: (order!.dailyHistory || '') +
          (order!.dailyHistory ? '\n\n' : '') +
          `[RELATÓRIO DE FINALIZAÇÃO - ${new Date().toLocaleDateString('pt-BR')}]:\n${finishReport}`
      };

      await persistChanges(updatedOrder);
      setIsFinishModalOpen(false);
      setFinishReport('');
      setToast({ message: 'Ordem de serviço finalizada com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao finalizar OS:", error);
      setToast({ message: 'Erro ao finalizar serviço.', type: 'error' });
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
    setToast({ message: 'Copiado para área de transferência!', type: 'success' });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (mimeType.includes('image')) return 'fa-image text-blue-500';
    return 'fa-file text-slate-300';
  };

  const attachments = order.attachments || [];
  const visibleAttachments = showAllAttachments ? attachments : attachments.slice(0, 5);

  const user = currentUser; // Alias para compatibilidade com o JSX abaixo

  return (
    <div className="relative pb-24">
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

      {/* Header OS - Modernized with Glassmorphism */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl shadow-blue-500/5">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 shrink-0">
            <i className="fa-solid fa-file-invoice"></i>
          </div>
          <div className="min-w-0">
            <Link to="/ordens" className="text-[9px] font-black text-blue-600 flex items-center gap-1 uppercase tracking-[0.2em] hover:opacity-70 transition-all mb-1">
              <i className="fa-solid fa-arrow-left"></i> Painel de Ordens
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">OS <span className="text-blue-600">#{order.id.slice(-4)}</span></h1>
              <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase border shadow-sm backdrop-blur-md ${order.status === OrderStatus.FINISHED ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200' :
                order.status === OrderStatus.PAUSED ? 'bg-amber-100/80 text-amber-700 border-amber-200' :
                  'bg-blue-100/80 text-blue-700 border-blue-200'
                }`}>
                <i className={`fa-solid mr-1 ${order.status === OrderStatus.FINISHED ? 'fa-check' : order.status === OrderStatus.PAUSED ? 'fa-pause' : 'fa-spinner fa-spin'}`}></i>
                {order.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isLocked ? (
            <>
              {order.status === OrderStatus.OPEN && (
                <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-play"></i> INICIAR ATENDIMENTO
                </button>
              )}
              {order.status === OrderStatus.PAUSED && (
                <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-play"></i> RETOMAR SERVIÇO
                </button>
              )}
              {order.status === OrderStatus.IN_PROGRESS && (
                <button onClick={() => handleStatusChange(OrderStatus.PAUSED)} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-pause"></i> PAUSAR SERVIÇO
                </button>
              )}

              <button onClick={() => handleSave()} disabled={isSaving} className="bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black text-[10px] hover:bg-white hover:shadow-lg transition-all uppercase tracking-widest flex items-center gap-2">
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                SALVAR TUDO
              </button>
              <button onClick={handleOpenFinishModal} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-check-double"></i> FINALIZAR
              </button>
            </>
          ) : (
            isAdmin && (
              <button onClick={() => handleStatusChange(OrderStatus.OPEN)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-rotate-left"></i> REABRIR ATENDIMENTO
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* COLUNA 1 - FICHA DO CLIENTE E GESTÃO */}
        <div className="order-1 lg:order-2 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

            <h2 className="text-[10px] font-black text-slate-400 mb-8 flex items-center gap-3 uppercase tracking-[0.2em] relative z-10">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i className="fa-solid fa-address-card"></i>
              </div>
              Ficha do Cliente
            </h2>

            <div className="space-y-8 relative z-10">
              <div>
                <span className="text-[9px] font-black uppercase text-blue-600/60 block mb-1 tracking-widest">Solicitante / Empresa</span>
                <p className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">{order.customerName}</p>
              </div>

              <div className="p-6 bg-slate-50/80 rounded-3xl border border-white shadow-inner">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-3 tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-blue-500"></i> Localização
                </span>
                <p className="text-sm font-black text-slate-800 leading-relaxed mb-1">{customer?.address}, {customer?.number}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{customer?.sector} — {customer?.city}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 p-5 bg-slate-50/80 rounded-3xl border border-white shadow-inner flex items-center justify-between group/phone">
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Contato</span>
                    <p className="text-sm font-black text-slate-900 font-mono tracking-wider truncate">{customer?.phone}</p>
                  </div>
                  <button
                    onClick={() => customer && copyToClipboard(customer.phone)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 bg-white shadow-sm rounded-xl transition-all shrink-0 hover:scale-110"
                  >
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a href={`tel:${customer?.phone}`} className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-[2rem] border border-white hover:shadow-lg transition-all group active:scale-95 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-phone"></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-900/60">Ligar Agora</span>
                </a>
                <a href={`https://wa.me/${customer?.phone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 rounded-[2rem] border border-white hover:shadow-lg transition-all group active:scale-95 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <i className="fa-brands fa-whatsapp text-xl"></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900/60">WhatsApp</span>
                </a>
              </div>

              <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] shadow-2xl shadow-blue-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>

                <span className="text-[10px] font-black uppercase text-blue-200 block mb-6 tracking-[0.2em] relative z-10">Alocação Técnica</span>

                <div className="space-y-4 relative z-10">
                  {[
                    { label: 'Técnico', value: order.techName, icon: 'fa-user-gear' },
                    { label: 'Natureza', value: order.type, icon: 'fa-tags' },
                    { label: 'Abertura', value: new Date(order.createdAt).toLocaleDateString('pt-BR'), icon: 'fa-calendar-plus' },
                    { label: 'Prazo', value: order.scheduledDate ? new Date(order.scheduledDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'A definir', icon: 'fa-clock' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-black pb-3 border-b border-white/10 last:border-0 last:pb-0">
                      <span className="text-blue-200 uppercase tracking-widest flex items-center gap-2">
                        <i className={`fa-solid ${item.icon} w-4 text-center`}></i> {item.label}:
                      </span>
                      <span className="uppercase tracking-tight text-right truncate max-w-[140px]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 shadow-lg shadow-blue-500/50"></div>

              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-blue-500 backdrop-blur-sm border border-white/5">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                Controle Administrativo
              </h2>

              <div className="space-y-6 relative z-10">
                {[
                  { label: 'Técnico Responsável', value: editedTechId, setter: setEditedTechId, options: users.map(u => ({ id: u.id, name: u.name })) },
                  { label: 'Natureza do Serviço', value: editedType, setter: setEditedType, options: settings?.orderTypes?.map((t: string) => ({ id: t, name: t })) }
                ].map((field, idx) => (field.options && (
                  <div key={idx}>
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">{field.label}</label>
                    <select
                      disabled={isLocked}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                    >
                      {field.options.map(opt => <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">{opt.name}</option>)}
                    </select>
                  </div>
                )))}

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">Prazo de Execução</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      disabled={isLocked}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-blue-400 uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-all"
                      value={editedScheduledDate}
                      onChange={e => setEditedScheduledDate(e.target.value)}
                    />
                  </div>
                </div>

                {!isLocked && (
                  <button
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    Sincronizar Dados
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA 2 - CONTEÚDO TÉCNICO */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">

          {/* Anexos Grid - Modernized with Glassmorphism */}
          {settings?.enableAttachments && (
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-white/40">
              <div className="flex justify-between items-center mb-10 flex-wrap gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-sm border border-blue-100/50">
                    <i className="fa-solid fa-images"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Evidências e Mídia</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Documentação Visual do Atendimento</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {attachments.length > 0 && (
                    <button onClick={handleDownloadAll} className="bg-white/80 backdrop-blur-md text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all border border-slate-200">
                      <i className="fa-solid fa-file-zipper mr-2"></i> Baixar Tudo
                    </button>
                  )}
                  {!isLocked && (
                    <>
                      <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all">
                        {isUploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus-circle mr-2"></i>}
                        Anexar Novo Arquivo
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                {visibleAttachments.map((att: OrderAttachment) => (
                  <div key={att.id} className="group animate-in fade-in zoom-in duration-300">
                    <div className="aspect-square rounded-[2rem] bg-slate-100/50 border border-white overflow-hidden relative shadow-sm flex items-center justify-center transition-all group-hover:shadow-2xl group-hover:scale-105 group-hover:-translate-y-1">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.data} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={att.name} />
                      ) : (
                        <div className="text-center">
                          <i className={`fa-solid ${getFileIcon(att.mimeType)} text-5xl mb-2`}></i>
                          <p className="text-[8px] font-black uppercase text-slate-400 px-4 truncate">{att.mimeType.split('/')[1]}</p>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300">
                        <a href={att.data} download={att.name} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-xl hover:scale-110 transition-transform">
                          <i className="fa-solid fa-cloud-arrow-down text-lg"></i>
                        </a>
                        {!isLocked && (
                          <button onClick={() => handleDeleteAttachment(att.id)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-xl hover:scale-110 transition-transform">
                            <i className="fa-solid fa-trash-can text-lg"></i>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 px-2">
                      <p className="text-[9px] font-black text-slate-500 truncate uppercase tracking-widest">{att.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{(att.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="col-span-full py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400/60 animate-in fade-in duration-700">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner mb-4">
                      <i className="fa-solid fa-cloud-arrow-up text-4xl opacity-20"></i>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Clique acima para adicionar mídias</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Descrição Técnica - Modernized */}
          <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-white/40 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[2px_0_10px_rgba(37,99,235,0.3)]"></div>

            <div className="flex justify-between items-center mb-8 pr-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <i className="fa-solid fa-quote-left"></i>
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Instrução de Serviço</h2>
              </div>
              {!isLocked && (
                <button
                  onClick={() => handleSave('desc')}
                  disabled={isSavingDesc}
                  className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
                >
                  {isSavingDesc ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Atualizar Base'}
                </button>
              )}
            </div>

            <textarea
              disabled={isLocked}
              className="w-full p-8 bg-slate-50/50 border border-white rounded-[2rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-medium min-h-[160px] resize-none leading-relaxed shadow-inner"
              placeholder="Descreva o problema ou a solicitação original..."
              value={editedDescription}
              onChange={e => setEditedDescription(e.target.value)}
            />
          </div>

          {/* Relatório Técnico - Modernized - Visible only for Admins or if already locked */}
          {(isAdmin || isLocked) && (
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-amber-500/5 border border-white/40 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 shadow-[2px_0_10px_rgba(245,158,11,0.3)]"></div>

              <div className="flex justify-between items-center mb-8 pr-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <i className="fa-solid fa-book-open-reader"></i>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Acompanhamento Técnico</h2>
                </div>
                {!isLocked && isAdmin && (
                  <button
                    onClick={() => handleSave('report')}
                    disabled={isSavingReport}
                    className="px-6 py-2.5 bg-amber-50 text-amber-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all border border-amber-200"
                  >
                    {isSavingReport ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Confirmar Notas'}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Diário de Atividades</span>
                <textarea
                  disabled={isLocked || !isAdmin}
                  className="w-full p-8 bg-amber-50/20 border border-white rounded-[2.5rem] outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white text-sm font-medium min-h-[220px] resize-none leading-relaxed shadow-inner"
                  placeholder="Insira os detalhes técnicos da execução. Essas informações servem de base para o histórico da OS..."
                  value={editedHistory}
                  onChange={e => setEditedHistory(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Relatório Analítico de IA - Modernized */}
          {settings?.enableAI && (isAdmin || isLocked) && (
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/5 border border-white/40 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.3)]"></div>

              <div className="flex justify-between items-center mb-8 pr-2 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Relatório Analítico de IA</h2>
                </div>
                <div className="flex gap-3">
                  {!isLocked && isAdmin && (
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI || !editedDescription}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGeneratingAI ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                      Gerar com IA
                    </button>
                  )}
                  {!isLocked && isAdmin && (
                    <button
                      onClick={() => handleSave('ai')}
                      disabled={isSavingReport} // reaproveitando loading para save
                      className="px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200"
                    >
                      {isSavingReport ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Salvar Relatório'}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">SINTETIZAÇÃO GEMINI AI</span>
                <textarea
                  disabled={isLocked || !isAdmin}
                  className="w-full p-8 bg-indigo-50/20 border border-white rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-medium min-h-[220px] resize-none leading-relaxed shadow-inner text-indigo-950"
                  placeholder="O relatório gerado pela inteligência artificial aparecerá aqui. Você pode editá-lo manualmente antes de salvar."
                  value={editedAIReport}
                  onChange={e => setEditedAIReport(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Timeline / Chat - Premium Design */}
          {settings?.enableHistory && (
            <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-white/40 p-10 overflow-hidden relative">
              <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-8 mb-10 flex items-center gap-4 uppercase tracking-tighter">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <i className="fa-solid fa-comments"></i>
                </div>
                Canal de Comunicação Direto
              </h2>

              {!isLocked && (
                <div className="mb-12 relative">
                  <textarea
                    className="w-full p-6 bg-slate-50/80 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white text-sm font-medium min-h-[120px] resize-none transition-all"
                    placeholder="Envie uma atualização técnica ou observação..."
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-4">
                    <button
                      onClick={() => handleAddPost()}
                      disabled={!newPostContent.trim()}
                      className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-2"
                    >
                      <i className="fa-solid fa-paper-plane text-[12px]"></i> Enviar
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
                <div className="relative pl-12 space-y-10">
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-600/50 via-slate-100 to-slate-100/10"></div>
                  {(order.posts || []).map((post: OrderPost) => {
                    const isSystem = post.userId === 'ai-assistant';
                    return (
                      <div key={post.id} className="relative group animate-in slide-in-from-left-4 duration-500">
                        <div className={`absolute -left-[43px] top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center text-[8px] text-white ${isSystem ? 'bg-indigo-500' : 'bg-blue-600'}`}>
                          <i className={`fa-solid ${isSystem ? 'fa-wand-magic-sparkles' : 'fa-user'}`}></i>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between px-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSystem ? 'text-indigo-600' : 'text-slate-900'}`}>{post.userName}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className={`p-8 rounded-[2rem] border shadow-xl shadow-slate-200/20 text-[13px] font-medium leading-relaxed transition-all group-hover:shadow-2xl group-hover:-translate-y-0.5 ${isSystem ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100 text-indigo-950' : 'bg-white border-slate-50 text-slate-700'}`}>
                            {post.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal de Finalização Técnica */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl border border-white overflow-hidden animate-in zoom-in duration-400">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                  <i className="fa-solid fa-file-signature"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Encerramento</h3>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Obrigatório para finalizar o atendimento</p>
                </div>
              </div>
              <button onClick={() => setIsFinishModalOpen(false)} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Descrição da Atividade Executada</label>
                <textarea
                  autoFocus
                  required
                  className="w-full p-8 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white text-base font-medium min-h-[240px] resize-none leading-relaxed shadow-inner transition-all"
                  placeholder="Relate detalhadamente o que foi feito, peças trocadas, observações importantes..."
                  value={finishReport}
                  onChange={e => setFinishReport(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsFinishModalOpen(false)}
                  className="flex-1 py-5 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                >
                  Continuar Editando
                </button>
                <button
                  onClick={confirmFinish}
                  disabled={isSaving || !finishReport.trim()}
                  className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-check"></i>}
                  FINALIZAR E ENVIAR RELATÓRIO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Info */}
    </div>
  );
};

export default OrderDetails;
