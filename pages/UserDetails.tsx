
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { OrderStatus, UserRole, User, ServiceOrder } from '../types';

const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;

      const [userData, userOrders] = await Promise.all([
        dbService.getUser(id),
        dbService.getOrders(currentUser.companyId, id)
      ]);

      setUser(userData);
      setOrders(userOrders);
    } catch (error) {
      console.error("Erro ao carregar detalhes do usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <i className="fa-solid fa-user-slash text-5xl text-slate-300 mb-4"></i>
        <h2 className="text-2xl font-bold text-slate-900">Usuário não encontrado</h2>
        <Link to="/usuarios" className="text-blue-600 font-bold mt-4 inline-block">Voltar para listagem</Link>
      </div>
    );
  }

  const finishedOrders = orders.filter(o => o.status === OrderStatus.FINISHED);
  const openOrders = orders.filter(o => o.status === OrderStatus.OPEN);
  const inProgressOrders = orders.filter(o => o.status === OrderStatus.IN_PROGRESS);

  const finishedThisMonth = finishedOrders.filter(o => {
    if (!o.finishedAt) return false;
    const date = new Date(o.finishedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: 'Total de OS', value: orders.length, icon: 'fa-file-invoice', color: 'bg-slate-500' },
    { label: 'Abertas/Em Andamento', value: openOrders.length + inProgressOrders.length, icon: 'fa-spinner', color: 'bg-orange-500' },
    { label: 'Finalizadas (Mês)', value: finishedThisMonth, icon: 'fa-check-double', color: 'bg-green-500' },
    { label: 'Taxa Conclusão', value: orders.length ? `${Math.round((finishedOrders.length / orders.length) * 100)}%` : '0%', icon: 'fa-chart-pie', color: 'bg-blue-500' },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/usuarios" className="text-sm font-bold text-blue-600 flex items-center gap-1 mb-2 hover:underline">
            <i className="fa-solid fa-arrow-left"></i> Voltar para Usuários
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
              }`}>
              {user.role}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <p className="text-slate-500 flex items-center gap-1 text-sm">
              <i className="fa-solid fa-envelope text-xs"></i> {user.email}
            </p>
            {user.phone && (
              <a
                href={`https://wa.me/${user.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-green-600 font-bold flex items-center gap-1 text-sm hover:underline"
              >
                <i className="fa-brands fa-whatsapp"></i> {user.phone}
              </a>
            )}
            <p className="text-slate-500 flex items-center gap-1 text-sm">
              <i className="fa-solid fa-map-marker-alt text-xs"></i> {user.city || 'Sem região'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${stat.color} text-white w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-blue-500"></i>
            Histórico de Atendimentos
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Abertura</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${order.status === OrderStatus.FINISHED ? 'bg-green-100 text-green-700' :
                        order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">{order.customerName}</td>
                  <td className="px-6 py-4 text-slate-600 text-sm truncate max-w-xs">{order.description}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/ordens/${order.id}`} className="text-blue-600 font-bold text-xs hover:underline">
                      Ver OS
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    Nenhuma ordem de serviço vinculada a este usuário.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
