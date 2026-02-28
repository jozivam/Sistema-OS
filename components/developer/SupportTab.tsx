import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../../services/dbService';
import { authService } from '../../services/authService';
import { ChatMessage, User } from '../../types';

interface SupportChannel {
    companyId: string;
    companyName: string;
    lastMessage: string;
    timestamp: string;
}

const SupportTab: React.FC = () => {
    const [channels, setChannels] = useState<SupportChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const user = await authService.getCurrentUser();
                setCurrentUser(user);

                const loadedChannels = await dbService.getAllSupportChannels();
                setChannels(loadedChannels || []);
            } catch (error) {
                console.error("Erro ao carregar canais:", error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!selectedChannelId) return;

        const loadMessages = async () => {
            try {
                const msgs = await dbService.getSupportMessages(selectedChannelId);
                setMessages(msgs || []);
                setTimeout(() => {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } catch (error) {
                console.error("Erro ao carregar mensagens:", error);
            }
        };

        loadMessages();

        // Polling para mensagens novas (simulando webhooks/realtime para o admin)
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [selectedChannelId]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedChannelId || !currentUser) return;

        try {
            const newMsg = {
                companyId: selectedChannelId,
                senderId: currentUser.id,
                senderName: 'Suporte Técnico',
                receiverId: 'admin',
                channelId: `support_${selectedChannelId}`,
                text: replyText
            };

            await dbService.sendMessage(newMsg);

            // Update UI optimistically
            const optimisticMsg = { ...newMsg, id: Date.now().toString(), timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, optimisticMsg as ChatMessage]);
            setReplyText('');

            setChannels(prev => prev.map(c =>
                c.companyId === selectedChannelId
                    ? { ...c, lastMessage: replyText, timestamp: new Date().toISOString() }
                    : c
            ));

            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error("Erro ao enviar resposta:", error);
            alert("Erro ao enviar mensagem.");
        }
    };

    const filteredChannels = channels.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px] animate-in slide-in-from-bottom-4 duration-500">
            {/* Channel List */}
            <div className="bg-white rounded-[1.25rem] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">Atendimento Proativo</h3>
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredChannels.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 opacity-20 text-center">
                            <i className="fa-solid fa-headset text-4xl mb-4"></i>
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma empresa encontrada</p>
                        </div>
                    ) : (
                        filteredChannels.map(channel => (
                            <button
                                key={channel.companyId}
                                onClick={() => setSelectedChannelId(channel.companyId)}
                                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 mb-2 ${selectedChannelId === channel.companyId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-50'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${selectedChannelId === channel.companyId ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                                    <i className="fa-solid fa-building"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-[10px] font-black uppercase truncate ${selectedChannelId === channel.companyId ? 'text-white' : 'text-slate-900'}`}>{channel.companyName}</h4>
                                        {channel.timestamp && (
                                            <span className={`text-[8px] font-bold shrink-0 ${selectedChannelId === channel.companyId ? 'text-white/60' : 'text-slate-400'}`}>
                                                {new Date(channel.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[9px] font-medium truncate ${selectedChannelId === channel.companyId ? 'text-white/80' : 'text-slate-500'}`}>
                                        {channel.lastMessage || 'Nenhuma mensagem ainda'}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white rounded-[1.25rem] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden relative">
                {selectedChannelId ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                                    <i className="fa-solid fa-comments-dollar"></i>
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                                        {channels.find(c => c.companyId === selectedChannelId)?.companyName}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Canal de Suporte Ativo</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center py-20">
                                    <i className="fa-solid fa-message text-5xl mb-4"></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Inicie a conversa com este cliente</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isAdmin = msg.senderId === currentUser?.id || msg.senderName === 'Suporte Técnico';
                                    return (
                                        <div key={msg.id || idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isAdmin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10' : 'bg-white border border-slate-100 text-slate-900 shadow-sm'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                        {msg.senderName}
                                                    </span>
                                                    <span className={`text-[8px] font-bold ${isAdmin ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100">
                            <form onSubmit={handleSendReply} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="DIGITE SUA RESPOSTA..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    <i className="fa-solid fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400 text-4xl mb-6">
                            <i className="fa-solid fa-headset"></i>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Selecione uma empresa</h3>
                        <p className="max-w-xs text-[10px] font-bold uppercase tracking-widest leading-loose">Escolha um canal ao lado para iniciar o atendimento ou visualizar o histórico de mensagens.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportTab;
