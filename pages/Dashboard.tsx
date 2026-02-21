
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { OrderStatus, UserRole, ServiceOrder, Customer, User } from '../types';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpanded, setShowExpanded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);

        if (user?.companyId) {
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

  const isAdmin = currentUser?.role === UserRole.ADMIN;

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

  // Define quantas ordens exibir: 5 por padrão ou 15 se expandido
  const upcomingOrders = showExpanded ? allUpcoming.slice(0, 15) : allUpcoming.slice(0, 5);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white/80 backdrop-blur-md p-6 lg:p-7 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 group">
              <div className={`${stat.bgColor} ${stat.iconColor} w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300 relative overflow-hidden group-hover:shadow-md`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <i className={`fa-solid ${stat.icon} relative z-10`}></i>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none tracking-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 lg:p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                Próximos Atendimentos
              </h2>
              {allUpcoming.length > 5 && (
                <Link to="/ordens" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                  Ver Tudo <i className="fa-solid fa-arrow-right-long"></i>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {upcomingOrders.map(order => {
                const cust = customers.find(c => c.id === order.customerId);
                return (
                  <Link key={order.id} to={`/ordens/${order.id}`} className="group block bg-slate-50/40 hover:bg-white border border-transparent hover:border-blue-100 p-5 rounded-[2.2rem] transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1">
                    <div className="flex items-center gap-5">
                      {/* Date Badge */}
                      <div className="w-14 lg:w-16 h-14 lg:h-16 bg-white rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 group-hover:bg-white/20"></div>
                        {order.scheduledDate ? (
                          <>
                            <span className="text-[9px] font-black text-blue-600 group-hover:text-white/80 leading-none mb-0.5">{formatMonth(order.scheduledDate)}</span>
                            <span className="text-xl font-black text-slate-900 group-hover:text-white leading-none">{formatDay(order.scheduledDate)}</span>
                            <span className="text-[9px] font-bold text-slate-500 group-hover:text-white/70 leading-none mt-0.5">{formatTime(order.scheduledDate)}</span>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-calendar-plus text-slate-300 group-hover:text-white/50 text-lg mb-0.5"></i>
                            <span className="text-[7px] font-black text-slate-400 group-hover:text-white leading-none uppercase tracking-tighter text-center">A Definir</span>
                          </>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-base lg:text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">{order.customerName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                              #{order.id.slice(-4)}
                            </span>
                            <span className={`text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-600' :
                              order.status === OrderStatus.PAUSED ? 'bg-orange-100 text-orange-600' :
                                'bg-slate-200 text-slate-600'
                              }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-colors">{order.type}</span>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium truncate">
                            <i className="fa-solid fa-location-dot text-slate-300 group-hover:text-red-400 transition-colors"></i>
                            <span className="truncate">{cust?.address}, {cust?.number}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 hidden md:flex w-10 h-10 rounded-full bg-white items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-slate-100 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4">
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {allUpcoming.length > 5 && (
                <button
                  onClick={() => setShowExpanded(!showExpanded)}
                  className="w-full py-4 mt-2 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  {showExpanded ? (
                    <><i className="fa-solid fa-chevron-up mr-2"></i> Ver Menos</>
                  ) : (
                    <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {allUpcoming.length - 5} atendimentos</>
                  )}
                </button>
              )}

              {upcomingOrders.length === 0 && (
                <div className="text-center py-20 bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200 text-2xl">
                    <i className="fa-solid fa-calendar-xmark"></i>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Nenhuma ordem agendada para os próximos dias</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
                <i className="fa-solid fa-bolt text-yellow-500 animate-pulse"></i> Ações Rápidas
              </h2>

              <div className="space-y-3">
                <Link to="/ordens?action=new" className="flex items-center gap-4 p-5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-[1.5rem] border border-blue-100 hover:border-blue-600 transition-all group active:scale-95 shadow-sm hover:shadow-blue-500/20">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20 group-hover:bg-white group-hover:text-blue-600 transition-all">
                    <i className="fa-solid fa-file-circle-plus"></i>
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest">Nova Ordem</span>
                </Link>

                <Link to="/clientes?action=new" className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white rounded-[1.5rem] border border-slate-100 hover:border-slate-900 transition-all group active:scale-95 shadow-sm hover:shadow-slate-900/10">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:bg-white group-hover:text-slate-900 transition-all">
                    <i className="fa-solid fa-user-plus"></i>
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-widest">Novo Cliente</span>
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-colors"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Atividade</span>
                <i className="fa-solid fa-chart-line text-blue-400"></i>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-black mb-0.5 tracking-tight">{orders.filter(o => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Abertas Hoje</p>
                </div>
                <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-black mb-0.5 tracking-tight text-emerald-400">{orders.filter(o => o.finishedAt?.startsWith(new Date().toISOString().split('T')[0])).length}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Concluídas</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
