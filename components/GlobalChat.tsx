
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import {
    OrderStatus, ServiceOrder, User, Customer, OrderPost,
    ChatMessage, Company, NotificationType
} from '../types';
import { cn } from '../utils/ui';

interface GlobalChatProps {
    company: Company | null;
}

const SUPPORT_LAST_READ_KEY = 'support_last_read_ts';

const GlobalChat: React.FC<GlobalChatProps> = ({ company }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([]);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatWindowRef = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
                // Verificar se o clique não foi no botão de abrir/fechar
                const target = event.target as HTMLElement;
                if (!target.closest('.chat-toggle-button')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Carregar dados iniciais
    const loadData = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return;
            setCurrentUser(user);

            const [ordersData, customersData] = await Promise.all([
                dbService.getOrders(user.companyId),
                dbService.getCustomers(user.companyId)
            ]);

            setOrders(ordersData);
            setCustomers(customersData);

            if (user.role === 'Administrador' || user.role === 'Desenvolvedor') {
                loadUnreadSupportCount(user.companyId, user.id);
            }
        } catch (error) {
            console.error("Erro ao carregar dados do chat global:", error);
        }
    };

    const loadUnreadSupportCount = async (companyId: string, userId: string) => {
        try {
            const msgs = await dbService.getSupportMessages(companyId);
            const lastRead = sessionStorage.getItem(SUPPORT_LAST_READ_KEY);
            if (lastRead) {
                const unread = msgs.filter(m => m.timestamp > lastRead && m.senderId !== userId);
                setUnreadSupportCount(unread.length);
            } else {
                const unread = msgs.filter(m => m.senderId !== userId);
                setUnreadSupportCount(unread.length);
            }
        } catch (error) {
            console.error('Erro ao contar não lidas:', error);
        }
    };

    const loadSupportMessages = async () => {
        if (!currentUser?.companyId) return;
        try {
            const msgs = await dbService.getSupportMessages(currentUser.companyId);
            setSupportMessages(msgs);
        } catch (error) {
            console.error("Erro ao carregar mensagens de suporte:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Scroll to bottom when opening or changing chat
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isOpen, selectedOrderId, orders, supportMessages, view]);

    // Real-time listener para suporte
    useEffect(() => {
        const { supabase } = dbService as any;
        if (!supabase || !currentUser?.companyId) return;

        const channel = supabase
            .channel('global-chat-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.support_${currentUser.companyId}`
                },
                (payload: any) => {
                    if (payload.new.sender_id !== currentUser.id) {
                        if (isOpen && selectedOrderId === 'support-channel') {
                            loadSupportMessages();
                            sessionStorage.setItem(SUPPORT_LAST_READ_KEY, new Date().toISOString());
                        } else {
                            setUnreadSupportCount(prev => prev + 1);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, isOpen, selectedOrderId]);

    const activeOrders = orders.filter(o =>
        (o.status !== OrderStatus.FINISHED && o.status !== OrderStatus.CANCELLED) &&
        (currentUser?.role === 'Administrador' || currentUser?.role === 'Desenvolvedor' || o.techId === currentUser?.id) &&
        (o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.includes(searchQuery))
    );

    const handleSelectChat = (id: string) => {
        setSelectedOrderId(id);
        setView('chat');
        if (id === 'support-channel') {
            loadSupportMessages();
            sessionStorage.setItem(SUPPORT_LAST_READ_KEY, new Date().toISOString());
            setUnreadSupportCount(0);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedOrderId || !currentUser) return;

        const msgContent = newMessage;
        setNewMessage('');

        if (selectedOrderId === 'support-channel') {
            try {
                await dbService.sendMessage({
                    companyId: currentUser.companyId,
                    senderId: currentUser.id,
                    senderName: currentUser.name,
                    channelId: `support_${currentUser.companyId}`,
                    text: msgContent
                });
                loadSupportMessages();
            } catch (error) {
                console.error("Erro no chat suporte:", error);
            }
            return;
        }

        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return;

        const newPost: OrderPost = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name,
            content: msgContent,
            createdAt: new Date().toISOString()
        };

        const updatedPosts = [...(order.posts || []), newPost];
        try {
            await dbService.updateOrder(selectedOrderId, { posts: updatedPosts });
            setOrders(prev => prev.map(o => o.id === selectedOrderId ? { ...o, posts: updatedPosts } : o));
        } catch (error) {
            console.error("Erro ao enviar mensagem na OS:", error);
        }
    };

    const isSupportSelected = selectedOrderId === 'support-channel';
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const messages = isSupportSelected
        ? supportMessages.map(m => ({
            id: m.id,
            userId: m.senderId,
            userName: m.senderName,
            content: m.text,
            createdAt: m.timestamp
        }))
        : selectedOrder?.posts || [];

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={chatWindowRef}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="mb-4 w-[380px] md:w-[420px] h-[600px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col glass-card"
                    >
                        {/* Header estilo WhatsApp */}
                        <div className="bg-slate-900 dark:bg-slate-950 p-6 flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                {view === 'chat' && (
                                    <button
                                        onClick={() => setView('list')}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all mr-1"
                                    >
                                        <i className="fa-solid fa-arrow-left text-xs"></i>
                                    </button>
                                )}
                                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                                    <i className={cn("fa-solid", view === 'list' ? "fa-comments" : (isSupportSelected ? "fa-headset" : "fa-user-gear"))}></i>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-black uppercase tracking-tighter text-sm truncate">
                                        {view === 'list' ? 'Central de Mensagens' : (isSupportSelected ? 'Suporte Técnico' : selectedOrder?.customerName)}
                                    </h3>
                                    <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest">
                                        {view === 'list' ? `${activeOrders.length} atendimentos ativos` : (isSupportSelected ? 'Canal direto' : `OS #${selectedOrder?.id.slice(-4)}`)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        {/* Corpo do Chat */}
                        <div className="flex-1 overflow-hidden relative flex flex-col">
                            {view === 'list' ? (
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {/* Busca */}
                                    <div className="relative mb-6">
                                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                        <input
                                            type="text"
                                            placeholder="Buscar conversas..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    </div>

                                    {/* Canal de Suporte (Fixado no topo para Admins) */}
                                    {(currentUser?.role === 'Administrador' || currentUser?.role === 'Desenvolvedor') && (
                                        <button
                                            onClick={() => handleSelectChat('support-channel')}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                                <i className="fa-solid fa-headset text-lg"></i>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Suporte Técnico</h4>
                                                <p className="text-[9px] text-indigo-500 font-bold uppercase">Ajuda com o sistema</p>
                                            </div>
                                            {unreadSupportCount > 0 && (
                                                <span className="bg-red-500 text-white min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[9px] font-black animate-bounce">
                                                    {unreadSupportCount}
                                                </span>
                                            )}
                                        </button>
                                    )}

                                    {/* Lista de Ordens de Serviço */}
                                    <div className="pt-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Ordens de Serviço Ativas</p>
                                        <div className="space-y-2">
                                            {activeOrders.map(o => (
                                                <button
                                                    key={o.id}
                                                    onClick={() => handleSelectChat(o.id)}
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group"
                                                >
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                            <i className="fa-solid fa-comment-dots text-lg"></i>
                                                        </div>
                                                        {o.posts && o.posts.length > 0 && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{o.customerName}</h4>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">OS #{o.id.slice(-4)}</p>
                                                            {o.posts && o.posts.length > 0 && (
                                                                <span className="text-[8px] text-slate-300 font-bold">
                                                                    {new Date(o.posts[o.posts.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            {activeOrders.length === 0 && (
                                                <div className="text-center py-12 opacity-20">
                                                    <i className="fa-solid fa-inbox text-4xl mb-3"></i>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conversa ativa</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Histórico da Conversa */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 custom-scrollbar">
                                        {messages.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                                                <i className="fa-solid fa-comments text-5xl mb-4"></i>
                                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                                    Inicie esta conversa. <br />Toda a comunicação ficará registrada aqui.
                                                </p>
                                            </div>
                                        )}
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={cn("flex flex-col animate-in slide-in-from-bottom-2 duration-300", msg.userId === currentUser?.id ? "items-end" : "items-start")}>
                                                <div className={cn(
                                                    "max-w-[85%] px-4 py-3 rounded-2xl shadow-sm text-sm",
                                                    msg.userId === currentUser?.id
                                                        ? "bg-blue-600 text-white rounded-tr-none"
                                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                                )}>
                                                    <div className="flex items-center justify-between gap-4 mb-1">
                                                        <span className={cn("text-[8px] font-black uppercase tracking-widest", msg.userId === currentUser?.id ? "text-white/70" : "text-slate-400")}>
                                                            {msg.userName}
                                                        </span>
                                                        <span className={cn("text-[8px] font-bold", msg.userId === currentUser?.id ? "text-white/50" : "text-slate-300")}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="leading-relaxed font-medium">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input Estilo WhatsApp */}
                                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                        <form onSubmit={handleSend} className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Escreva sua mensagem..."
                                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim()}
                                                className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
                                            >
                                                <i className="fa-solid fa-paper-plane"></i>
                                            </button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balão Principal Flutuante */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "chat-toggle-button w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white shadow-2xl relative transition-all duration-500",
                    isOpen ? "bg-slate-800 rotate-90" : "bg-blue-600 hover:bg-blue-700"
                )}
            >
                <i className={cn("fa-solid", isOpen ? "fa-xmark" : "fa-message")}></i>
                {unreadSupportCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[22px] h-[22px] rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black shadow-lg">
                        {unreadSupportCount}
                    </span>
                )}
                {activeOrders.length > 0 && !isOpen && unreadSupportCount === 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-400 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-md"></span>
                )}
            </motion.button>
        </div>
    );
};

export default GlobalChat;
