import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Company, AppNotification, NotificationType, Customer, ServiceOrder, OrderStatus } from '../types';
import { authService } from '../services/authService';
import { dbService } from '../services/dbService';
import { isTrialUser, cleanupTrial, getTrialGlobalSearch } from '../services/trialService';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  company: Company | null;
  onUserChange: (user: User | null) => void;
  onCompanyChange: (company: Company | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, company, onUserChange, onCompanyChange }) => {
  const isTrial = isTrialUser(user);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ customers: Customer[], orders: ServiceOrder[], users: User[] }>({ customers: [], orders: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ customers: [], orders: [], users: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        if (isTrial) {
          const results = getTrialGlobalSearch(searchQuery);
          setSearchResults(results);
        } else if (user?.companyId) {
          const results = await dbService.globalSearch(user.companyId, searchQuery, user.role);
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Erro na busca global:", error);
      } finally {
        setIsSearching(false);
        setShowSearchDropdown(true);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isTrial, user?.companyId, user?.role]);

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
      if (isTrial) {
        cleanupTrial();
        onUserChange(null);
        navigate('/');
        return;
      }
      await authService.signOut();
      onUserChange(null);
      navigate('/');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleContratar = () => {
    cleanupTrial();
    onUserChange(null);
    // Usamos um pequeno timeout para garantir que a mudança de estado do usuário ocorra primeiro
    // e o redirecionamento aconteça de forma limpa
    setTimeout(() => {
      window.location.href = '/#/?scrollTo=pricing';
    }, 50);
  };


  const navItems = [];

  if (isDev) {
    navItems.push({ path: '/developer', label: 'Empresas', icon: 'fa-building' });
    navItems.push({ path: '/developer?tab=support', label: 'Atendimento', icon: 'fa-comments' });
    navItems.push({ path: '/developer/pagamentos', label: 'Pagamentos', icon: 'fa-file-invoice-dollar' });
    navItems.push({ path: '/dashboard', label: 'Monitoramento', icon: 'fa-desktop' });
    navItems.push({ path: '/developer?tab=backup', label: 'Backups', icon: 'fa-database' });
    navItems.push({ path: '/developer?tab=sessions', label: 'Sessões', icon: 'fa-users-gear' });
    navItems.push({ path: '/developer?tab=api', label: 'API do Sistema', icon: 'fa-code' });
    navItems.push({ path: '/developer/configuracoes', label: 'Configurações', icon: 'fa-gears' });
  } else {
    navItems.push({ path: '/dashboard', label: 'Painel', icon: 'fa-chart-line' });

    // Chat: visível se ativo na empresa OU se é trial (demo sempre mostra)
    if (company?.settings.enableChat || isTrial) {
      navItems.push({ path: '/chat', label: 'Mensagens', icon: 'fa-comments' });
    }

    if (isAdmin || isTrial) {
      navItems.push({ path: '/clientes', label: 'Clientes', icon: 'fa-users' });
      // Relatórios: visível se IA ativa na empresa OU se é trial
      if (company?.settings.enableAI || isTrial) {
        navItems.push({ path: '/relatorios', label: 'Relatórios', icon: 'fa-chart-pie' });
      }
    }
    navItems.push({ path: '/ordens', label: 'Ordens de Serviço', icon: 'fa-file-invoice' });
    if (isAdmin || isTrial) {
      navItems.push({ path: '/usuarios', label: 'Usuários', icon: 'fa-user-gear' });
      navItems.push({ path: '/configuracoes', label: 'Configurações', icon: 'fa-sliders' });
    }
  }

  const isActive = (path: string) => {
    const [targetPath, targetSearch] = path.split('?');
    const isPathMatch = location.pathname === targetPath;

    if (targetSearch) {
      return isPathMatch && location.search.includes(targetSearch);
    }

    // Se o item não tem busca, mas o atual tem (e o atual não é o 'padrão' de empresas)
    if (location.search && !targetSearch && location.pathname === '/developer') {
      return false;
    }

    return isPathMatch;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)]">

      {/* ─── Trial Banner ─── */}
      {isTrial && (
        <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between px-4 md:px-8 py-2 z-[100] shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold">
            <i className="fa-solid fa-flask text-white/80" />
            <span>AMBIENTE DE DEMONSTRAÇÃO — Os dados criados aqui não são salvos.</span>
          </div>
          <button
            onClick={handleContratar}
            className="hidden md:flex items-center gap-2 bg-white text-orange-600 rounded-lg px-4 py-1 text-sm font-black hover:bg-orange-50 transition-all shadow"
          >
            <i className="fa-solid fa-file-signature" />
            Contratar agora
          </button>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 ${isTrial ? '' : ''}`}>
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 bg-[#0F172A] text-white p-4 flex justify-between items-center z-[60] shadow-lg" style={{ top: isTrial ? '40px' : '0' }}>
          <h1 className="text-lg font-black flex items-center gap-2 tracking-tighter uppercase">
            <i className="fa-solid fa-microchip text-blue-500"></i> {isDev ? 'OsRepo' : (company?.tradeName || company?.name || 'Sistema OS')}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800">
              <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl text-blue-500`}></i>
            </button>
          </div>
        </header>

        {/* Sidebar */}
        <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w=[280px] lg:w-72 bg-white text-[var(--text-primary)] transition-transform duration-300 flex flex-col shrink-0 border-r border-[var(--border-color)] shadow-sm
      `}>
          <div className="p-8 hidden md:block border-b border-[var(--border-color)]">
            <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tighter">
              <div className="w-10 h-10 rounded-2xl bg-[var(--blue-primary)] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <i className="fa-solid fa-layer-group text-lg"></i>
              </div>
              <span className="truncate tracking-tight">{isDev ? 'OsRepo' : (company?.tradeName || company?.name || 'Sistema OS')}</span>
            </h1>
          </div>

          <div className="px-6 py-4">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2 ml-2">Menu Principal</p>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-colors font-medium text-sm group relative
                  ${isActive(item.path)
                    ? 'sidebar-link-active'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-50'
                  }
                `}
              >
                <div className={`w-6 h-6 flex items-center justify-center transition-colors
                   ${isActive(item.path) ? 'text-[var(--blue-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}
                `}>
                  <i className={`fa-solid ${item.icon} text-[16px]`}></i>
                </div>
                <span className="truncate tracking-tight">{item.label}</span>
              </Link>
            ))}

            {/* Role Switcher — apenas no trial */}
          </nav>

          <div className="p-6 mt-auto border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--blue-primary)] to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--text-primary)] font-bold text-sm truncate">{user.name}</p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">{user.role}</p>
              </div>
            </div>

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 font-semibold text-sm transition-all group border border-transparent hover:border-red-100">
              <i className="fa-solid fa-right-from-bracket group-hover:-translate-x-1 transition-transform"></i>
              <span>Deslogar</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden mt-[72px] md:mt-0 bg-[var(--bg-main)]">
          {/* Top Header / Breadcrumb - Structural Clean */}
          <header className="hidden md:flex h-20 px-8 items-center justify-between shrink-0 bg-[var(--bg-main)] border-b border-[var(--border-color)]/50">
            <div className="flex-1 flex items-center gap-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)] capitalize tracking-tight">
                {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
              </h2>
            </div>

            <div className="flex-1 max-w-lg px-8 hidden lg:block" ref={searchRef}>
              <div className="relative">
                <i className={`fa-solid ${isSearching ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'} absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]`}></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length > 0) setShowSearchDropdown(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
                  }}
                  placeholder="Pesquisar em todo o sistema..."
                  className="w-full bg-white border border-[var(--border-color)] rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-[var(--text-primary)] shadow-sm transition-shadow"
                />

                {/* Dropdown de Resultados */}
                {showSearchDropdown && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                      {/* Lista de Resultados */}
                      {isSearching && (
                        <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i>Buscando...
                        </div>
                      )}
                      {!isSearching && searchResults.orders.length === 0 && searchResults.customers.length === 0 && searchResults.users.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          <i className="fa-solid fa-magnifying-glass text-3xl mb-3 opacity-20"></i>
                          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Nenhum resultado encontrado</p>
                          <p className="text-xs text-[var(--text-muted)]">Tente buscar por termos diferentes</p>
                        </div>
                      )}
                      {!isSearching && (
                        <>
                          {searchResults.orders.length > 0 && (
                            <div className="mb-2">
                              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mb-1">
                                Ordens de Serviço ({searchResults.orders.length})
                              </div>
                              {searchResults.orders.map(order => (
                                <div key={order.id} onClick={() => { setShowSearchDropdown(false); navigate(`/ordens/${order.id}`); }} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                      <i className="fa-solid fa-file-invoice"></i>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">#{order.id.slice(-6).toUpperCase()} - {order.customerName}</p>
                                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{order.type}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] whitespace-nowrap font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase">
                                    {order.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {searchResults.customers.length > 0 && (
                            <div className="mb-2">
                              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mb-1">
                                Clientes ({searchResults.customers.length})
                              </div>
                              {searchResults.customers.map(customer => (
                                <div key={customer.id} onClick={() => { setShowSearchDropdown(false); navigate(`/clientes?search=${encodeURIComponent(customer.name)}`); }} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center gap-3 group">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-users"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">{customer.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{customer.city || 'Sem cidade'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {searchResults.users.length > 0 && (
                            <div>
                              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mb-1">
                                Usuários ({searchResults.users.length})
                              </div>
                              {searchResults.users.map(user => (
                                <div key={user.id} onClick={() => { setShowSearchDropdown(false); navigate(`/usuarios`); }} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center gap-3 group">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-user-gear"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">{user.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-end gap-5">
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
              <div className="flex items-center gap-3 pl-5 border-l border-[var(--border-color)] cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{user.role}</p>
                </div>
                <i className="fa-solid fa-chevron-down text-xs text-[var(--text-muted)] ml-1"></i>
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
      </div> {/* end inner flex */}
    </div>
  );
};

export default Layout;
