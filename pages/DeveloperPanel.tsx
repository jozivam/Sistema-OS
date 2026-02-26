import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { Company, CompanyPlan, CompanyPeriod, User, UserRole, ChatMessage } from '../types';
import ConfirmModal from '../components/ConfirmModal';

// Novos componentes refatorados
import StatsCards from '../components/developer/StatsCards';
import CompanyTable from '../components/developer/CompanyTable';
import CompanyInsertModal from '../components/developer/CompanyInsertModal';
import SupportTab from '../components/developer/SupportTab';
import BackupTab from '../components/developer/BackupTab';
import ApiTab from '../components/developer/ApiTab';

const DeveloperPanel: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isInsertModalOpen, setInsertModalOpen] = useState(false);
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [activeTab, setActiveTab] = useState<'companies' | 'support' | 'backup' | 'sessions' | 'api'>('companies');
  const [supportChannels, setSupportChannels] = useState<{ companyId: string, companyName: string, lastMessage: string, timestamp: string }[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [supportSearchTerm, setSupportSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [activeSessionUsers, setActiveSessionUsers] = useState<User[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'companies';

  const [newCompanyData, setNewCompanyData] = useState({
    corporateName: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plan: CompanyPlan.OURO,
    period: CompanyPeriod.MENSAL,
    monthlyFee: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED',
    createdAt: new Date().toISOString().split('T')[0],
    expiresAt: '',
    settings: {
      enableAI: false,
      enableAttachments: false,
      enableChat: false,
      enableHistory: false,
    }
  });

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const companiesData = await dbService.getCompanies();
      setCompanies(companiesData);

      if (user.role === UserRole.DEVELOPER) {
        const channels = await dbService.getAllSupportChannels();
        setSupportChannels(channels);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do painel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'support' || currentTab === 'backup' || currentTab === 'companies' || currentTab === 'sessions' || currentTab === 'api') {
      setActiveTab(currentTab as any);
    }
  }, [currentTab]);

  const handleTabChange = (tab: 'companies' | 'support' | 'backup' | 'sessions' | 'api') => {
    setActiveTab(tab);
    if (tab === 'companies') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams);
    if (tab === 'sessions') {
      loadActiveSessions();
    }
  };

  const loadActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const users = await dbService.getActiveSessionUsers();
      setActiveSessionUsers(users);
    } catch { }
    finally { setLoadingSessions(false); }
  };

  const handleForceLogout = async (userId: string, userName: string) => {
    try {
      await dbService.forceLogoutUser(userId);
      setActiveSessionUsers(prev => prev.filter(u => u.id !== userId));
      setToast({ message: `Sessão de ${userName} encerrada com sucesso!`, type: 'success' });
    } catch {
      setToast({ message: 'Erro ao encerrar sessão.', type: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      loadChannelMessages(selectedChannelId);
    }
  }, [selectedChannelId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Real-time listener para novos chamados
  useEffect(() => {
    const { supabase } = dbService as any;
    if (!supabase) return;

    const channel = supabase
      .channel('support-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload: any) => {
          if (payload.new.channel_id.startsWith('support_')) {
            loadData();
            setToast({ message: 'Novo chamado ou mensagem recebida!', type: 'success' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadChannelMessages = async (companyId: string) => {
    try {
      const msgs = await dbService.getSupportMessages(companyId);
      setChannelMessages(msgs);
    } catch (error) {
      console.error("Erro ao carregar mensagens do canal:", error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChannelId || !currentUser) return;

    try {
      await dbService.sendMessage({
        companyId: selectedChannelId,
        senderId: currentUser.id,
        senderName: 'Suporte Técnico',
        channelId: `support_${selectedChannelId}`,
        text: replyText
      });

      setReplyText('');
      loadChannelMessages(selectedChannelId);

      try {
        await dbService.createNotification({
          companyId: selectedChannelId,
          type: 'NEW_MESSAGE' as any,
          title: 'Suporte Técnico',
          content: 'O desenvolvedor enviou uma nova resposta para o seu chamado.',
          link: '/mensagens'
        });
      } catch (notifError) {
        console.warn("Notificação não enviada ao cliente:", notifError);
      }

      setSupportChannels(prev => prev.map(c =>
        c.companyId === selectedChannelId
          ? { ...c, lastMessage: replyText, timestamp: new Date().toISOString() }
          : c
      ));
    } catch (error) {
      console.error("Erro ao enviar resposta:", error);
      setToast({ message: 'Erro ao enviar resposta.', type: 'error' });
    }
  };

  const calculateExpirationDate = (plan: CompanyPlan, baseDateStr: string): string | undefined => {
    if (plan === CompanyPlan.LIVRE) return undefined;

    let date: Date;
    if (!baseDateStr) {
      date = new Date();
    } else {
      date = new Date(baseDateStr + 'T12:00:00');
    }

    // Safety check just in case the date parsed as Invalid Date
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    // Default: 1 month for all regular plans
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
  };

  useEffect(() => {
    if (isInsertModalOpen) {
      const expiry = calculateExpirationDate(newCompanyData.plan, newCompanyData.createdAt);
      setNewCompanyData(prev => ({
        ...prev,
        expiresAt: expiry ? expiry.split('T')[0] : ''
      }));
    }
  }, [newCompanyData.plan, newCompanyData.createdAt, isInsertModalOpen]);

  const handleInsertCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.tradeName || !newCompanyData.document || !newCompanyData.corporateName) {
      setToast({ message: 'Preencha os campos obrigatórios.', type: 'error' });
      return;
    }

    try {
      const expiresAt = calculateExpirationDate(newCompanyData.plan, newCompanyData.createdAt);
      const newCompany = await dbService.createCompany({
        name: newCompanyData.tradeName,
        tradeName: newCompanyData.tradeName,
        corporateName: newCompanyData.corporateName,
        document: newCompanyData.document,
        email: newCompanyData.email,
        phone: newCompanyData.phone,
        address: newCompanyData.address,
        city: newCompanyData.city,
        plan: newCompanyData.plan,
        period: newCompanyData.period,
        monthlyFee: newCompanyData.monthlyFee,
        status: newCompanyData.status,
        expiresAt: expiresAt,
        settings: {
          ...newCompanyData.settings,
          orderTypes: []
        }
      });

      setCompanies(prev => [...prev, newCompany]);
      setInsertModalOpen(false);
      setToast({ message: 'Empresa cadastrada com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao inserir empresa:", error);
      setToast({ message: 'Erro ao cadastrar empresa.', type: 'error' });
    }
  };

  const updateCompanyStatus = async (id: string, status: 'ACTIVE' | 'BLOCKED') => {
    try {
      await dbService.updateCompany(id, { status } as Partial<Company>);
      setCompanies(prev => prev.map(c =>
        c.id === id ? { ...c, status } as Company : c
      ));
      setOpenMenuId(null);
      setToast({
        message: status === 'ACTIVE' ? 'Empresa liberada com sucesso!' : 'Empresa bloqueada com sucesso!',
        type: 'success'
      });
    } catch (error) {
      console.error("Erro ao atualizar status da empresa:", error);
      setToast({ message: 'Erro ao atualizar status da empresa.', type: 'error' });
    }
  };

  const deleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      await dbService.deleteCompany(companyToDelete.id);
      setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
      setCompanyToDelete(null);
      setOpenMenuId(null);
      setToast({ message: 'Empresa e todos os seus dados removidos!', type: 'success' });
    } catch (error) {
      console.error("Erro ao excluir empresa:", error);
      setToast({ message: 'Erro ao excluir empresa.', type: 'error' });
    }
  };

  const clientCompanies = useMemo(() => {
    return companies.filter(c => c.id !== '00000000-0000-0000-0000-000000000000');
  }, [companies]);

  const stats = useMemo(() => {
    const total = clientCompanies.length;
    const active = clientCompanies.filter(c => c.status === 'ACTIVE').length;
    const blocked = clientCompanies.filter(c => c.status === 'BLOCKED').length;
    const mrr = clientCompanies.reduce((acc, c) => acc + (c.status === 'ACTIVE' ? c.monthlyFee : 0), 0);
    return { total, active, blocked, mrr };
  }, [clientCompanies]);

  const filteredCompanies = useMemo(() => {
    return clientCompanies.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSearch = !searchTerm ||
        (c.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.corporateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.document || '').includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [clientCompanies, filterStatus, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-green-500' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!companyToDelete}
        title="Excluir Empresa"
        message={`Tem certeza que deseja excluir permanentemente a empresa "${companyToDelete?.tradeName || companyToDelete?.name}"? Esta ação removerá todos os usuários, clientes e ordens vinculadas e NÃO poderá ser desfeita.`}
        onConfirm={deleteCompany}
        onCancel={() => setCompanyToDelete(null)}
        variant="danger"
        confirmText="Sim, Excluir Tudo"
      />

      {activeTab === 'companies' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-cash-register"></i> Movimento Financeiro
            </h3>
          </div>

          <StatsCards stats={stats} />

          <CompanyTable
            companies={filteredCompanies}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onUpdateStatus={updateCompanyStatus}
            onDeleteRequest={setCompanyToDelete}
            onOpenInsertModal={() => setInsertModalOpen(true)}
            showAll={showAllCompanies}
            setShowAll={setShowAllCompanies}
            onSupportSelect={(id) => {
              setActiveTab('support');
              setSelectedChannelId(id);
            }}
          />

          <CompanyInsertModal
            isOpen={isInsertModalOpen}
            onClose={() => setInsertModalOpen(false)}
            onSubmit={handleInsertCompany}
            data={newCompanyData}
            setData={setNewCompanyData}
          />
        </div>
      ) : activeTab === 'support' ? (
        <SupportTab
          channels={supportChannels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          messages={channelMessages}
          currentUser={currentUser}
          replyText={replyText}
          setReplyText={setReplyText}
          onSendReply={handleSendReply}
          searchTerm={supportSearchTerm}
          setSearchTerm={setSupportSearchTerm}
          chatEndRef={chatEndRef}
        />
      ) : activeTab === 'sessions' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-users-gear"></i> Sessões Ativas
            </h3>
            <button
              onClick={loadActiveSessions}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-right"></i> Atualizar
            </button>
          </div>
          {loadingSessions ? (
            <div className="flex items-center justify-center p-16">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i>
            </div>
          ) : activeSessionUsers.length === 0 ? (
            <div className="text-center py-16">
              <i className="fa-solid fa-circle-check text-4xl text-green-500 mb-3 block"></i>
              <p className="text-slate-500 font-bold text-sm">Nenhuma sessão ativa no momento.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessionUsers.map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleForceLogout(u.id, u.name)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto"
                        >
                          <i className="fa-solid fa-plug-circle-xmark"></i> Forçar Logout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'api' ? (
        <ApiTab />
      ) : (
        <BackupTab
          toastHandler={(msg, type) => setToast({ message: msg, type })}
        />
      )}
    </div>
  );
};

export default DeveloperPanel;
