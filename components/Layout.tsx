import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Company, AppNotification, NotificationType } from '../types';
import { authService } from '../services/authService';
import { dbService } from '../services/dbService';
import { useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  company: Company | null;
  onUserChange: (user: User | null) => void;
  onCompanyChange: (company: Company | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, company, onUserChange, onCompanyChange }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && user.companyId) {
      loadNotifications();

      // Se for Admin, verificar vencimento do plano proativamente
      if (user.role === UserRole.ADMIN && company?.expiresAt) {
        checkPlanExpiration();
      }
    }
  }, [user, company]);

  const loadNotifications = async () => {
    const companyIdToLoad = (user?.role === UserRole.DEVELOPER) ? 'dev-corp' : user?.companyId;
    if (!companyIdToLoad) return;
    try {
      const data = await dbService.getNotifications(companyIdToLoad);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  };

  useEffect(() => {
    const { supabase } = dbService as any;
    const companyIdToListen = (user?.role === UserRole.DEVELOPER) ? 'dev-corp' : user?.companyId;
    if (!supabase || !companyIdToListen) return;

    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyIdToListen}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.companyId, user?.role]);

  const checkPlanExpiration = async () => {
    if (!company?.expiresAt || !user?.companyId) return;

    const expiryDate = new Date(company.expiresAt);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7 && diffDays > 0) {
      // Verificar se já existe uma notificação de vencimento recente para não duplicar
      const hasRecentWarning = notifications.some(n =>
        n.type === NotificationType.PLAN_EXPIRING &&
        new Date(n.createdAt).toDateString() === today.toDateString()
      );

      if (!hasRecentWarning) {
        try {
          await dbService.createNotification({
            companyId: user.companyId,
            type: NotificationType.PLAN_EXPIRING,
            title: 'Plano Vencendo',
            content: `Seu plano expira em ${diffDays} dias (${expiryDate.toLocaleDateString('pt-BR')}). Renove para evitar bloqueio.`,
            link: '/configuracoes'
          });
          loadNotifications();
        } catch (error) {
          console.error("Erro ao criar notificação de vencimento:", error);
        }
      }
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await dbService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => dbService.markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  if (!user) return <>{children}</>;

  const isDev = user.role === UserRole.DEVELOPER;
  const isAdmin = user.role === UserRole.ADMIN;

  const handleLogout = async () => {
    try {
      await authService.signOut();
      onUserChange(null);
      navigate('/');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const navItems = [];

  if (isDev) {
    navItems.push({ path: '/developer', label: 'Empresas', icon: 'fa-building' });
    navItems.push({ path: '/developer?tab=support', label: 'Atendimento', icon: 'fa-comments' });
    navItems.push({ path: '/developer/pagamentos', label: 'Pagamentos', icon: 'fa-file-invoice-dollar' });
    navItems.push({ path: '/dashboard', label: 'Monitoramento', icon: 'fa-desktop' });
    navItems.push({ path: '/developer/configuracoes', label: 'Configurações', icon: 'fa-gears' });
  } else {
    navItems.push({ path: '/dashboard', label: 'Painel', icon: 'fa-chart-line' });

    if (company?.settings.enableChat) {
      navItems.push({ path: '/chat', label: 'Mensagens', icon: 'fa-comments' });
    }

    if (isAdmin) {
      navItems.push({ path: '/clientes', label: 'Clientes', icon: 'fa-users' });
      if (company?.settings.enableAI) {
        navItems.push({ path: '/relatorios', label: 'Relatórios', icon: 'fa-chart-pie' });
      }
    }
    navItems.push({ path: '/ordens', label: 'Ordens de Serviço', icon: 'fa-file-invoice' });
    if (isAdmin) {
      navItems.push({ path: '/usuarios', label: 'Usuários', icon: 'fa-user-gear' });
      navItems.push({ path: '/configuracoes', label: 'Configurações', icon: 'fa-sliders' });
    }
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-[#0F172A] text-white p-4 flex justify-between items-center z-[60] shadow-lg">
        <h1 className="text-lg font-black flex items-center gap-2 tracking-tighter uppercase">
          <i className="fa-solid fa-microchip text-blue-500"></i> {isDev ? 'OsRepo' : (company?.tradeName || company?.name || 'Sistema OS')}
        </h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl text-blue-500`}></i>
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-400 transition-transform duration-300 flex flex-col shadow-2xl shrink-0
      `}>
        <div className="p-6 md:p-8 hidden md:block">
          <h1 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter uppercase px-2">
            <i className="fa-solid fa-microchip text-blue-500"></i>
            <span className="truncate">{isDev ? 'OsRepo' : (company?.tradeName || company?.name || 'Sistema OS')}</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-[11px] uppercase tracking-wider group ${isActive(item.path) ? 'sidebar-link-active bg-blue-600/10 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center text-sm ${isActive(item.path) ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-400'}`}></i>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="px-4 py-4 bg-slate-800/20 rounded-2xl border border-slate-700/30 mb-2">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-2">SISTEMA ATIVO</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-[11px] truncate">{user.name}</p>
                <p className="text-[9px] text-slate-500 truncate">{user.role}</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 font-semibold text-[11px] uppercase tracking-wider hover:bg-red-500/5 transition-all group">
            <i className="fa-solid fa-right-from-bracket group-hover:translate-x-1 transition-transform"></i>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden mt-[72px] md:mt-0">
        {/* Top Header / Breadcrumb */}
        <header className="hidden md:flex h-20 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Painel</Link>
            <i className="fa-solid fa-chevron-right text-[10px] opacity-50"></i>
            <span className="text-slate-900 font-bold">{location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || 'Painel'}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all rounded-xl hover:bg-slate-50"
              >
                <i className="fa-solid fa-bell text-lg"></i>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">Notificações</h4>
                      {unreadCount > 0 ? (
                        <p className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">{unreadCount} não lidas</p>
                      ) : (
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Tudo em dia</p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                        className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline active:opacity-70"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <i className="fa-solid fa-bell-slash text-2xl mb-2 opacity-20"></i>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-4 hover:bg-slate-50/80 transition-all cursor-pointer relative group flex gap-3 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                            onClick={() => {
                              if (!n.isRead) markAsRead(n.id);
                              if (n.link) navigate(n.link);
                              setShowNotifications(false);
                            }}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${n.type === NotificationType.PLAN_EXPIRING ? 'bg-orange-100 text-orange-600 border-orange-100' :
                                n.type === (NotificationType as any).NEW_MESSAGE ? 'bg-blue-100 text-blue-600 border-blue-100' :
                                  'bg-slate-100 text-slate-600 border-slate-100'
                              }`}>
                              <i className={`fa-solid ${n.type === NotificationType.PLAN_EXPIRING ? 'fa-triangle-exclamation' :
                                  n.type === (NotificationType as any).NEW_MESSAGE ? 'fa-comment-dots' :
                                    'fa-info-circle'
                                } text-sm`}></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <p className={`text-[11px] font-black leading-tight truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</p>
                                {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-medium">{n.content}</p>
                              <p className="text-[8px] text-slate-300 font-bold uppercase mt-2 tracking-tighter">
                                {new Date(n.createdAt).toLocaleDateString('pt-BR')} às {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                              <i className="fa-solid fa-chevron-right text-[8px] text-slate-300"></i>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        Exibindo últimas {notifications.length} notificações
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 leading-none mb-1">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-medium">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black border border-slate-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-12">
          <div className="max-w-7xl mx-auto w-full pb-12">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {
        isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
        )
      }
    </div >
  );
};

export default Layout;
