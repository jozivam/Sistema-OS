
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
          const [fetchedOrders, fetchedCustomers] = await Promise.all([
            dbService.getOrders(user.companyId),
            dbService.getCustomers(user.companyId)
          ]);
          setOrders(fetchedOrders);
          setCustomers(fetchedCustomers);
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
    .filter(o => o.status !== OrderStatus.FINISHED && o.status !== OrderStatus.CANCELLED && o.scheduledDate)
    .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));

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
    <div className="space-y-8 lg:space-y-12 pb-12 animate-in fade-in duration-500">
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 transition-transform hover:scale-[1.02]">
              <div className={`${stat.bgColor} ${stat.iconColor} w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-sm`}>
                <i className={`fa-solid ${stat.icon}`}></i>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 lg:p-10`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              <i className="fa-solid fa-calendar-check text-blue-600"></i> Próximos Atendimentos
            </h2>
            {allUpcoming.length > 5 && (
              <Link to="/ordens" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                Ver Listagem Completa →
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {upcomingOrders.map(order => {
              const cust = customers.find(c => c.id === order.customerId);
              return (
                <Link key={order.id} to={`/ordens/${order.id}`} className="group block bg-slate-50/50 hover:bg-white border border-transparent hover:border-blue-100 p-6 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-blue-500/5">
                  <div className="flex items-center gap-6">
                    <div className="w-16 lg:w-20 h-16 lg:h-20 bg-white rounded-2xl flex flex-col items-center justify-center border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors shadow-sm">
                      <span className="text-[10px] font-black text-blue-600 group-hover:text-white/80 leading-none mb-1">{formatMonth(order.scheduledDate!)}</span>
                      <span className="text-2xl font-black text-slate-900 group-hover:text-white leading-none">{formatDay(order.scheduledDate!)}</span>
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-white/90 leading-none mt-1">{formatTime(order.scheduledDate!)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg lg:text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">{order.customerName}</h3>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                          Abertura: {formatDateShort(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-widest">{order.type}</span>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium truncate max-w-full">
                          <i className="fa-solid fa-location-dot text-red-400"></i>
                          <span className="truncate">{cust?.address}, {cust?.number} — {cust?.sector}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 hidden sm:block">
                      <span className={`text-[9px] px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-sm border ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-600 text-white border-blue-600' :
                          order.status === OrderStatus.PAUSED ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {allUpcoming.length > 5 && (
              <button
                onClick={() => setShowExpanded(!showExpanded)}
                className="w-full py-5 mt-4 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest"
              >
                {showExpanded ? (
                  <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
                ) : (
                  <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {allUpcoming.length - 5} atendimentos</>
                )}
              </button>
            )}

            {upcomingOrders.length === 0 && (
              <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <i className="fa-solid fa-calendar-xmark text-slate-200 text-6xl mb-4"></i>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma ordem agendada para os próximos dias</p>
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h2 className="text-lg lg:text-xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tight">
                <i className="fa-solid fa-bolt text-yellow-500"></i> Ações Rápidas
              </h2>

              <div className="space-y-4">
                <Link to="/ordens?action=new" className="flex items-center gap-5 p-6 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-[2rem] border border-blue-100 transition-all group active:scale-95 shadow-sm">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-file-circle-plus"></i>
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest">Nova Ordem de Serviço</span>
                </Link>

                <Link to="/clientes?action=new" className="flex items-center gap-5 p-6 bg-white hover:bg-slate-50 text-slate-600 rounded-[2rem] border border-slate-100 transition-all group active:scale-95 shadow-sm">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-user-plus"></i>
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest">Novo Cliente</span>
                </Link>
              </div>
            </div>

            <div className="bg-[#0F172A] p-8 lg:p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo de Hoje</span>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-slate-800/30 p-5 rounded-[1.5rem] border border-slate-700/30">
                  <p className="text-3xl font-black mb-1">{orders.filter(o => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Abertas Hoje</p>
                </div>
                <div className="bg-slate-800/30 p-5 rounded-[1.5rem] border border-slate-700/30">
                  <p className="text-3xl font-black mb-1 text-green-500">{orders.filter(o => o.finishedAt?.startsWith(new Date().toISOString().split('T')[0])).length}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Finalizadas Hoje</p>
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
