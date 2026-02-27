
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { isTrialUser, getTrialOrders, getTrialCustomers } from '../services/trialService';
import { OrderStatus, UserRole, ServiceOrder, Customer, User } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleUpcomingCount, setVisibleUpcomingCount] = useState(5);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(5);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);

        if (isTrialUser(user)) {
          // Modo trial: dados do sessionStorage
          setOrders(getTrialOrders());
          setCustomers(getTrialCustomers());
        } else if (user?.companyId) {
          console.log('Carregando dados para Empresa ID:', user.companyId);
          console.log('Usuário Logado:', user.name, '(ID:', user.id, '- Role:', user.role, ')');

          const [fetchedOrders, fetchedCustomers] = await Promise.all([
            dbService.getOrders(user.companyId),
            dbService.getCustomers(user.companyId)
          ]);

          console.log('Ordens encontradas:', fetchedOrders.length);
          console.log('Clientes encontrados:', fetchedCustomers.length);

          setOrders(fetchedOrders);
          setCustomers(fetchedCustomers);
        } else {
          console.warn('Usuário logado sem Company ID definido.');
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  const isAdmin = currentUser?.role === UserRole.ADMIN || isTrialUser(currentUser);

  const filteredOrders = isAdmin
    ? orders
    : orders.filter(o => o.techId === currentUser?.id);

  // Filtra e ordena as próximas ordens (não finalizadas e não canceladas)
  const allUpcoming = filteredOrders
    .filter(o => o.status !== OrderStatus.FINISHED && o.status !== OrderStatus.CANCELLED)
    .sort((a, b) => {
      if (a.scheduledDate && b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
      if (a.scheduledDate) return -1;
      if (b.scheduledDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  // Define quantas ordens exibir
  const upcomingOrders = allUpcoming.slice(0, visibleUpcomingCount);

  const todayStr = new Date().toISOString().split('T')[0];
  const completedTodayOrders = filteredOrders
    .filter(o => o.status === OrderStatus.FINISHED && o.finishedAt?.startsWith(todayStr))
    .sort((a, b) => {
      const timeA = a.finishedAt || '';
      const timeB = b.finishedAt || '';
      return timeB.localeCompare(timeA);
    });

  const stats = [
    { label: 'OS ABERTAS', value: filteredOrders.filter(o => o.status === OrderStatus.OPEN).length, icon: 'fa-folder-open', color: 'bg-orange-500', iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'EM ANDAMENTO', value: filteredOrders.filter(o => o.status === OrderStatus.IN_PROGRESS).length, icon: 'fa-spinner', color: 'bg-blue-500', iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'FINALIZADAS (MÊS)', value: filteredOrders.filter(o => o.status === OrderStatus.FINISHED).length, icon: 'fa-check-circle', color: 'bg-green-500', iconColor: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  if (isAdmin) {
    stats.push({ label: 'TOTAL CLIENTES', value: customers.length, icon: 'fa-users', color: 'bg-indigo-500', iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50' });
  }

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
  };

  const formatDay = (dateStr: string) => new Date(dateStr).getDate();
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateShort = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-8 lg:space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="saas-card p-6 flex items-center gap-6 bg-white">
              <div className={`${stat.bgColor} ${stat.iconColor} w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl shadow-sm border border-black/5`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-bold text-[var(--text-muted)] tracking-wider mb-0.5 whitespace-nowrap">{stat.label}</p>
                <p className="text-3xl font-black text-[var(--text-primary)] leading-none mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8">

        {/* Main Table Row */}
        <div className="saas-card overflow-hidden bg-white">
          <div className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Detalhes dos Atendimentos</h2>
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <>
                  <Link to="/ordens?action=new" className="px-5 py-2.5 bg-[var(--blue-primary)] text-white hover:bg-[var(--blue-hover)] rounded-xl transition-colors font-bold text-sm shadow-sm active:scale-[0.98] flex items-center gap-2">
                    <i className="fa-solid fa-plus"></i>
                    Nova OS
                  </Link>
                  <Link to="/clientes?action=new" className="px-5 py-2.5 bg-white text-[var(--text-primary)] hover:bg-slate-50 border border-[var(--border-color)] rounded-xl transition-colors font-bold text-sm active:scale-[0.98] flex items-center gap-2">
                    <i className="fa-solid fa-user-plus text-[var(--text-secondary)]"></i>
                    Novo Cliente
                  </Link>
                </>
              )}
              {allUpcoming.length > 5 && (
                <Link to="/ordens" className="text-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-2">
                  <i className="fa-solid fa-ellipsis"></i>
                </Link>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest bg-white">
                  <th className="px-8 py-5">Nome da Tarefa / Cliente</th>
                  <th className="px-8 py-5">Responsável</th>
                  <th className="px-8 py-5">Localidade</th>
                  <th className="px-8 py-5">Prioridade</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Data Agendada</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {upcomingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 bg-slate-50/30">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200 text-2xl">
                        <i className="fa-solid fa-calendar-xmark"></i>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Nenhuma ordem agendada</p>
                    </td>
                  </tr>
                ) : (
                  upcomingOrders.map((order) => {
                    const cust = customers.find(c => c.id === order.customerId);
                    return (
                      <tr key={order.id} onClick={() => navigate(`/ordens/${order.id}`)} className="hover:bg-slate-50/50 transition-colors bg-white group cursor-pointer">
                        <td className="px-8 py-5">
                          <div className="font-semibold text-sm text-[var(--text-primary)]">{order.customerName}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-1">OS #{order.id.slice(-6).toUpperCase()}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-[var(--border-color)]">
                              {order.techName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[var(--text-primary)]">{order.techName}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">Técnico</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm text-[var(--text-secondary)]">{cust?.city || 'N/A'}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">{cust?.sector || 'S/ Bairro'}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] px-3 py-1.5 rounded bg-red-50 text-red-500 font-bold uppercase tracking-widest border border-red-100/50">Alta</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] px-3 py-1.5 rounded bg-slate-50 text-slate-600 font-bold uppercase tracking-widest border border-slate-200/50">{order.type}</span>
                        </td>
                        <td className="px-8 py-5 text-sm text-[var(--text-secondary)] font-medium">
                          {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest border ${order.status === OrderStatus.IN_PROGRESS ? 'bg-orange-50 text-orange-600 border-orange-100/50' :
                            order.status === OrderStatus.PAUSED ? 'bg-yellow-50 text-yellow-600 border-yellow-100/50' :
                              order.status === OrderStatus.FINISHED ? 'bg-green-50 text-green-600 border-green-100/50' :
                                'bg-slate-50 text-slate-500 border-slate-200/50'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <Link to={`/ordens/${order.id}`} className="text-slate-300 hover:text-[var(--text-primary)] transition-colors text-lg">
                            <i className="fa-solid fa-ellipsis"></i>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {allUpcoming.length > visibleUpcomingCount && (
            <div className="p-5 border-t border-[var(--border-color)] text-center bg-white">
              <button
                onClick={() => setVisibleUpcomingCount(prev => prev + 10)}
                className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] hover:text-[var(--blue-primary)] transition-colors"
              >
                VER TODAS
              </button>
            </div>
          )}
        </div>

        {/* Bottom Cards Row */}
        {isAdmin && (
          <div className="saas-card overflow-hidden bg-white">
            <div className="p-6 md:p-8 border-b border-[var(--border-color)] flex justify-between items-center">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Resumo Diário: Concluídas Hoje</h3>
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100/50">
                {completedTodayOrders.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              {completedTodayOrders.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/30">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200 text-2xl">
                    <i className="fa-solid fa-check-double"></i>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Nenhuma ordem concluída hoje</p>
                </div>
              ) : (
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest bg-white">
                      <th className="px-8 py-4">Tarefa / Cliente</th>
                      <th className="px-8 py-4">Responsável</th>
                      <th className="px-8 py-4 text-center">Valor</th>
                      <th className="px-8 py-4 text-center">Hora</th>
                      <th className="px-8 py-4 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {completedTodayOrders.slice(0, visibleCompletedCount).map((order) => {
                      const cust = customers.find(c => c.id === order.customerId);
                      return (
                        <tr key={order.id} onClick={() => navigate(`/ordens/${order.id}`)} className="hover:bg-slate-50/50 transition-colors bg-white group cursor-pointer">
                          <td className="px-8 py-4">
                            <div className="font-semibold text-sm text-[var(--text-primary)]">{order.customerName}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">OS #{order.id.slice(-6).toUpperCase()}</div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="text-sm font-semibold text-[var(--text-primary)]">{order.techName}</div>
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-[var(--text-primary)]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount || 0)}
                          </td>
                          <td className="px-8 py-4 text-center text-sm text-[var(--text-secondary)]">
                            {order.finishedAt ? formatTime(order.finishedAt) : '-'}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <Link to={`/ordens/${order.id}`} className="text-slate-300 hover:text-[var(--text-primary)] transition-colors text-lg">
                              <i className="fa-solid fa-chevron-right text-sm"></i>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {completedTodayOrders.length > visibleCompletedCount && (
              <div className="p-5 border-t border-[var(--border-color)] text-center bg-white">
                <button
                  onClick={() => setVisibleCompletedCount(prev => prev + 10)}
                  className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] hover:text-[var(--blue-primary)] transition-colors"
                >
                  VER TODAS
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
