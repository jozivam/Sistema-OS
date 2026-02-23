
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

      {/* Header OS */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/ordens" className="text-[10px] font-black text-blue-600 flex items-center gap-1 uppercase tracking-widest hover:underline mb-1">
            <i className="fa-solid fa-arrow-left"></i> Painel de Ordens
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase tracking-tight leading-none mb-1">ATENDIMENTO #{order.id.slice(-4)}</h1>
            <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase border shadow-sm ${order.status === OrderStatus.FINISHED ? 'bg-green-100 text-green-700 border-green-200' :
              order.status === OrderStatus.PAUSED ? 'bg-orange-50 text-white border-orange-600' :
                'bg-blue-600 text-white border-blue-700'
              }`}>{order.status}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isLocked ? (
            <>
              {order.status === OrderStatus.OPEN && (
                <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">INICIAR</button>
              )}
              {order.status === OrderStatus.PAUSED && (
                <button onClick={() => handleStatusChange(OrderStatus.IN_PROGRESS)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">
                  <i className="fa-solid fa-play mr-2"></i> RETOMAR
                </button>
              )}
              {order.status === OrderStatus.IN_PROGRESS && (
                <button onClick={() => handleStatusChange(OrderStatus.PAUSED)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">
                  <i className="fa-solid fa-pause mr-2"></i> PAUSAR
                </button>
              )}

              <button onClick={() => handleSave()} disabled={isSaving} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-black text-xs hover:border-blue-500 hover:text-blue-600 transition-all uppercase tracking-widest">
                {isSaving ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-floppy-disk mr-2"></i>}
                SALVAR TUDO
              </button>
              <button onClick={() => handleStatusChange(OrderStatus.FINISHED)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg transition-all uppercase tracking-widest">FINALIZAR</button>
            </>
          ) : (
            isAdmin && (
              <button onClick={() => handleStatusChange(OrderStatus.OPEN)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg transition-all uppercase tracking-widest">REABRIR OS</button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* COLUNA 1 - FICHA DO CLIENTE */}
        <div className="order-1 lg:order-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <h2 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <i className="fa-solid fa-address-card text-blue-600"></i> Ficha do Cliente
            </h2>

            <div className="space-y-6">
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Titular</span>
                <p className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">{order.customerName}</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Endereço de Campo</span>
                <p className="text-sm font-black text-slate-700 leading-relaxed mb-1">{customer?.address}, {customer?.number}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{customer?.sector} — {customer?.city}</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Contato Direto</span>
                  <p className="text-lg font-black text-slate-900 font-mono tracking-wider truncate">{customer?.phone}</p>
                </div>
                <button
                  onClick={() => customer && copyToClipboard(customer.phone)}
                  className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-xl transition-all shrink-0"
                >
                  <i className="fa-solid fa-copy"></i>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a href={`tel:${customer?.phone}`} className="flex flex-col items-center justify-center p-5 bg-blue-50 text-blue-600 rounded-3xl border border-blue-100 hover:bg-blue-100 transition-all group active:scale-95 shadow-sm">
                  <i className="fa-solid fa-phone text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                  <span className="text-[9px] font-black uppercase tracking-widest">Ligar</span>
                </a>
                <a href={`https://wa.me/${customer?.phone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-5 bg-green-50 text-green-600 rounded-3xl border border-green-100 hover:bg-green-100 transition-all group active:scale-95 shadow-sm">
                  <i className="fa-brands fa-whatsapp text-3xl mb-1 group-hover:scale-110 transition-transform"></i>
                  <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                </a>
              </div>

              <div className="p-6 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/20">
                <span className="text-[9px] font-black uppercase text-blue-200 block mb-6 tracking-widest">Alocação Técnica</span>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black border-b border-blue-500/50 pb-3">
                    <span className="text-blue-200 uppercase tracking-tight">Responsável:</span>
                    <span className="uppercase">{order.techName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black border-b border-blue-500/50 pb-3">
                    <span className="text-blue-200 uppercase tracking-tight">Natureza:</span>
                    <span className="uppercase">{order.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black border-b border-blue-500/50 pb-3">
                    <span className="text-blue-200 uppercase tracking-tight">Abertura:</span>
                    <span className="uppercase">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-blue-200 uppercase tracking-tight">Prazo:</span>
                    <span className="uppercase truncate max-w-[120px] text-right">{order.scheduledDate ? new Date(order.scheduledDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'A definir'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-8 flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-user-gear"></i>
                </div>
                Gestão Administrativa
              </h2>
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Responsável</label>
                  <select
                    disabled={isLocked}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={editedTechId}
                    onChange={e => setEditedTechId(e.target.value)}
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Natureza</label>
                  <select
                    disabled={isLocked}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={editedType}
                    onChange={e => setEditedType(e.target.value)}
                  >
                    {settings?.orderTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Prazo</label>
                  <input
                    type="datetime-local"
                    disabled={isLocked}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-black text-blue-400 uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={editedScheduledDate}
                    onChange={e => setEditedScheduledDate(e.target.value)}
                  />
                </div>

                {!isLocked && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA 2 - CONTEÚDO TÉCNICO */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">

          {/* Anexos Grid - Condicional ao Módulo Habilitado */}
          {settings?.enableAttachments && (
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                  <i className="fa-solid fa-folder-open text-blue-600"></i> Anexos e Mídia
                </h2>
                <div className="flex items-center gap-2">
                  {attachments.length > 0 && (
                    <button onClick={handleDownloadAll} className="bg-slate-50 text-slate-600 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">
                      <i className="fa-solid fa-cloud-arrow-down mr-2"></i> Baixar ZIP
                    </button>
                  )}
                  {!isLocked && (
                    <>
                      <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        {isUploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus mr-2"></i>}
                        Subir Arquivos
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                {visibleAttachments.map((att: OrderAttachment) => (
                  <div key={att.id} className="flex flex-col gap-2 group animate-in fade-in zoom-in duration-300">
                    <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-sm flex items-center justify-center transition-all group-hover:shadow-md">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.data} className="w-full h-full object-cover" alt={att.name} />
                      ) : (
                        <i className={`fa-solid ${getFileIcon(att.mimeType)} text-4xl`}></i>
                      )}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all">
                        <a href={att.data} download={att.name} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-lg">
                          <i className="fa-solid fa-download"></i>
                        </a>
                        {!isLocked && (
                          <button onClick={() => handleDeleteAttachment(att.id)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-lg">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 truncate text-center uppercase tracking-widest">{att.name}</p>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="col-span-full py-16 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
                    <i className="fa-solid fa-cloud-arrow-up text-5xl mb-4 opacity-10"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum anexo no atendimento</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Descrição Técnica do Pedido */}
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 border-t-8 border-t-blue-500 overflow-hidden">
            <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <i className="fa-solid fa-file-lines text-blue-600"></i> Descrição Técnica do Pedido
            </h2>
            <div className="space-y-4">
              <textarea
                disabled={isLocked}
                className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium min-h-[150px] resize-none leading-relaxed shadow-inner"
                placeholder="Descrição do problema ou solicitação do cliente..."
                value={editedDescription}
                onChange={e => setEditedDescription(e.target.value)}
              />
              {!isLocked && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave('desc')}
                    disabled={isSavingDesc}
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSavingDesc ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                    Salvar Descrição
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Relatório Técnico - Integrado com IA condicionalmente */}
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 border-t-8 border-t-orange-500 overflow-hidden">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                <i className="fa-solid fa-book-open text-orange-600"></i> Relatório de Atividade
              </h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Notas do Técnico (Base para IA)</label>
                <textarea
                  disabled={isLocked}
                  className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium min-h-[200px] resize-none leading-relaxed shadow-inner"
                  placeholder="Descreva aqui as atividades realizadas. Estas notas serão usadas pela IA para gerar o relatório final."
                  value={editedHistory}
                  onChange={e => setEditedHistory(e.target.value)}
                />
              </div>



              {!isLocked && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave('report')}
                    disabled={isSavingReport}
                    className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSavingReport ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                    Salvar Relatório
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline / Chat - Condicional ao Módulo Habilitado */}
          {settings?.enableHistory && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
                  <i className="fa-solid fa-comments text-blue-600"></i> Comunicação Técnica
                </h2>
              </div>

              {!isLocked && (
                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 shadow-inner mb-10">
                  <textarea
                    className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium min-h-[100px] resize-none"
                    placeholder="Relate atualizações importantes do serviço..."
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <button onClick={() => handleAddPost()} disabled={!newPostContent.trim()} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              <div className="relative pl-10 space-y-10">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                {(order.posts || []).map((post: OrderPost) => (
                  <div key={post.id} className="relative group">
                    <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${post.userId === 'ai-assistant' ? 'bg-indigo-500' : 'bg-blue-600'}`}></div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{post.userName}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(post.createdAt).toLocaleTimeString('pt-BR')}</span>
                      </div>
                      <div className={`p-6 rounded-3xl border shadow-sm text-sm font-medium leading-relaxed ${post.userId === 'ai-assistant' ? 'bg-indigo-50 border-indigo-100 text-indigo-900' : 'bg-white border-slate-100 text-slate-700'}`}>
                        {post.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
