import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Company } from '../types';
import { authService } from '../services/authService';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  company: Company | null;
  onUserChange: (user: User | null) => void;
  onCompanyChange: (company: Company | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, company, onUserChange, onCompanyChange }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    navItems.push({ path: '/developer', label: 'Painel', icon: 'fa-gauge-high' });
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] h-screen overflow-hidden font-inter">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#0F172A] text-white p-4 flex justify-between items-center sticky top-0 z-50 shrink-0 shadow-lg">
        <h1 className="text-lg font-black flex items-center gap-2 tracking-tighter uppercase">
          <i className="fa-solid fa-microchip text-blue-400"></i> {company?.tradeName || company?.name || 'Sistema OS'}
        </h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800">
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-xl text-blue-400`}></i>
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-slate-300 transition-transform duration-300 flex flex-col shadow-2xl shrink-0
      `}>
        <div className="p-8 hidden md:block border-b border-slate-800/50">
          <h1 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
            <i className="fa-solid fa-microchip text-blue-400"></i>
            {company?.tradeName || company?.name || 'Sistema OS'}
          </h1>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${isActive(item.path) ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'hover:bg-slate-800/50'}`}
            >
              <i className={`fa-solid ${item.icon} w-6 text-center text-sm ${isActive(item.path) ? 'text-white' : 'text-blue-400/60'}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800/50">
          <div className="px-5 py-4 bg-slate-800/30 rounded-2xl border border-slate-700/50 mb-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">USUÁRIO ATIVO</span>
            <p className="text-white font-black text-xs truncate uppercase tracking-tight">{user.name}</p>
            <p className="text-[8px] font-black text-blue-400 uppercase mt-0.5">{user.role.toUpperCase()}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50/10 transition-all">
            <i className="fa-solid fa-right-from-bracket"></i> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative p-4 md:p-8 lg:p-10">
        <div className="flex flex-col flex-1 h-full max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default Layout;
