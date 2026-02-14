
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { OrderStatus, ServiceOrder, User, Customer, OrderPost } from '../types';

const Chat: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarVisibleOnMobile, setIsSidebarVisibleOnMobile] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    } catch (error) {
      console.error("Erro ao carregar dados do chat:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedOrderId, orders]);

  // Filtrar ordens ativas para a barra lateral
  const activeOrders = orders.filter(o =>
    (o.status !== OrderStatus.FINISHED && o.status !== OrderStatus.CANCELLED) &&
    (currentUser?.role === 'Administrador' || currentUser?.role === 'Desenvolvedor' || o.techId === currentUser?.id) &&
    (o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.includes(searchQuery))
  );

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setIsSidebarVisibleOnMobile(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOrderId || !currentUser) return;

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    if (!selectedOrder) return;

    const newPost: OrderPost = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: newMessage,
      createdAt: new Date().toISOString()
    };

    const updatedPosts = [...(selectedOrder.posts || []), newPost];

    try {
      await dbService.updateOrder(selectedOrderId, { posts: updatedPosts });

      const updatedOrders = orders.map(o =>
        o.id === selectedOrderId ? { ...o, posts: updatedPosts } : o
      );
      setOrders(updatedOrders);
      setNewMessage('');
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const customer = customers.find(c => c.id === selectedOrder?.customerId);
  const messages = selectedOrder?.posts || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 w-full h-full">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full w-full bg-white overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar - Lista de Ordens Ativas */}
      <div className={`
        ${isSidebarVisibleOnMobile ? 'flex' : 'hidden md:flex'} 
        w-full md:w-80 border-r border-slate-100 flex-col bg-slate-50 shrink-0
      `}>
        <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Mensagens</h2>
            <span className="bg-blue-600 text-white text-[9px] px-2 py-1 rounded-full font-black uppercase">
              {activeOrders.length} Ativas
            </span>
          </div>

          <div className="relative mb-6">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              placeholder="Buscar OS ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {activeOrders.map(o => (
              <button
                key={o.id}
                onClick={() => handleSelectOrder(o.id)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group ${selectedOrderId === o.id ? 'bg-white shadow-lg border border-blue-100' : 'hover:bg-slate-200/50'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 ${selectedOrderId === o.id ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <i className="fa-solid fa-comment-dots"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight leading-none mb-1">{o.customerName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OS #{o.id.slice(-4)}</p>
                </div>
                {o.posts && o.posts.length > 0 && (
                  <div className="text-[8px] text-slate-400 font-bold">
                    {new Date(o.posts[o.posts.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </button>
            ))}
            {activeOrders.length === 0 && (
              <div className="text-center py-12 opacity-40">
                <i className="fa-solid fa-inbox text-4xl mb-3 text-slate-300"></i>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nenhum atendimento ativo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Janela de Chat Aberta */}
      <div className={`
        ${!isSidebarVisibleOnMobile ? 'flex' : 'hidden md:flex'} 
        flex-1 flex-col bg-white relative
      `}>
        {selectedOrder ? (
          <>
            {/* Header da Conversa */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => setIsSidebarVisibleOnMobile(true)}
                  className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 active:scale-95 transition-all"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-lg md:text-xl shrink-0">
                  <i className="fa-solid fa-user-gear"></i>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-black text-slate-900 truncate uppercase tracking-tight leading-none mb-1">{selectedOrder.customerName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                      <i className="fa-solid fa-wrench text-blue-500 mr-1"></i> {selectedOrder.techName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balões de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/30 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.userId === currentUser?.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${msg.userId === currentUser?.id
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : msg.userId === 'ai-assistant'
                        ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tl-none'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${msg.userId === currentUser?.id ? 'text-white/70' : 'text-slate-400'}`}>
                        {msg.userName}
                      </span>
                      <span className={`text-[8px] font-bold ${msg.userId === currentUser?.id ? 'text-white/50' : 'text-slate-300'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-6">
                  <i className="fa-solid fa-comments text-6xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">Inicie o histórico de comunicação técnica para esta OS</p>
                </div>
              )}
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="relative flex items-center gap-3 md:gap-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mensagem técnica..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-50 rounded-full flex items-center justify-center text-4xl md:text-5xl mb-6 shadow-inner text-blue-200">
              <i className="fa-solid fa-comments"></i>
            </div>
            <h3 className="text-slate-900 font-black text-lg uppercase tracking-tight mb-2">Central de Comunicação</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-xs">Selecione um atendimento na lista ao lado para visualizar a timeline e trocar mensagens</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
