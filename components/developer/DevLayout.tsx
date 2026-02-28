import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from '../../types';
import { authService } from '../../services/authService';

interface DevLayoutProps {
  children: React.ReactNode;
  user: User;
  onUserChange: (user: User | null) => void;
}

const DevLayout: React.FC<DevLayoutProps> = ({ children, user, onUserChange }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      onUserChange(null);
      navigate('/');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const navItems = [
    { path: '/developer', label: 'Dashboard', icon: 'fa-chart-pie' },
    { path: '/developer?tab=support', label: 'Atendimentos', icon: 'fa-headset' },
    { path: '/developer/pagamentos', label: 'Assinaturas', icon: 'fa-file-invoice-dollar' },
    { path: '/developer?tab=logs', label: 'Logs Locais', icon: 'fa-clipboard-list' }
  ];

  const isActive = (path: string) => {
    const [targetPath, targetSearch] = path.split('?');
    const isPathMatch = location.pathname === targetPath;

    // Base dashboard
    if (path === '/developer' && location.pathname === '/developer' && !location.search) {
      return true;
    }

    if (targetSearch) {
      return isPathMatch && location.search.includes(targetSearch);
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-slate-800 font-sans">
      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile Header */}
        <header className="xl:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-[60] shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-white text-xs"></i>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">commetrix</h1>
          </div>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors">
            <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
          </button>
        </header>

        {/* Sidebar */}
        <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        xl:translate-x-0 fixed xl:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 shadow-2xl xl:shadow-none
        `}>
          <div className="p-6 hidden xl:flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <i className="fa-solid fa-code text-white text-sm"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">OsRepo</h1>
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all font-semibold text-sm group
                    ${active
                      ? 'text-slate-900 bg-slate-100 drop-shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className={`w-5 h-5 flex items-center justify-center transition-colors
                     ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}
                  `}>
                    <i className={`fa-solid ${item.icon} text-[15px]`}></i>
                  </div>
                  <span className="truncate flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-auto space-y-1">
            <Link to="/developer/configuracoes" className="px-4 py-2.5 rounded-xl text-slate-500 font-semibold text-sm flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer block">
              <i className="fa-regular fa-user text-slate-400"></i> Profile
            </Link>
            <Link to="/developer/configuracoes" className="px-4 py-2.5 rounded-xl text-slate-500 font-semibold text-sm flex items-center gap-3.5 hover:bg-slate-50 cursor-pointer block">
              <i className="fa-solid fa-gear text-slate-400"></i> Settings
            </Link>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 rounded-xl text-slate-500 font-semibold text-sm flex items-center gap-3.5 hover:bg-red-50 hover:text-red-600 transition-colors group mb-2">
              <i className="fa-solid fa-right-from-bracket text-slate-400 group-hover:text-red-500"></i> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden mt-[72px] xl:mt-0 bg-[#F9FAFB]">
          {/* Topbar similar ao do Commetrix */}
          <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 hidden md:flex">
            <div className="flex items-center gap-4 text-slate-400">
              <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-bars text-lg"></i>
              </button>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-md flex items-center justify-center text-slate-600 font-bold overflow-hidden cursor-pointer">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-6 md:p-8">
            <div className="max-w-[1400px] mx-auto w-full pb-12">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 xl:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default DevLayout;
