
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { OrderStatus, Customer, UserRole, ServiceOrder, User } from '../types';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    number: '',
    sector: '',
    notes: ''
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const [customerData, allOrders] = await Promise.all([
        dbService.getCustomer(id),
        dbService.getOrders(user.companyId)
      ]);

      if (customerData) {
        setCustomer(customerData);
        setFormData({
          name: customerData.name,
          phone: customerData.phone,
          city: customerData.city,
          address: customerData.address,
          number: customerData.number || '',
          sector: customerData.sector || '',
          notes: customerData.notes
        });
      }

      setOrders(allOrders.filter(o => o.customerId === id));
    } catch (error) {
      console.error("Erro ao carregar detalhes do cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <i className="fa-solid fa-user-slash text-5xl text-slate-300 mb-4"></i>
        <h2 className="text-2xl font-bold text-slate-900">Cliente não encontrado</h2>
        <Link to="/clientes" className="text-blue-600 font-bold mt-4 inline-block">Voltar para listagem</Link>
      </div>
    );
  }

  const finishedOrders = orders.filter(o => o.status === OrderStatus.FINISHED)
    .sort((a, b) => (b.finishedAt || b.createdAt).localeCompare(a.finishedAt || a.createdAt));

  const activeOrders = orders.filter(o => o.status !== OrderStatus.FINISHED)
    .sort((a, b) => {
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)})${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = maskPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await dbService.updateCustomer(id, formData);
      setCustomer({ ...customer, ...formData });

      // Sincronizar nome nas OS (Isso pode ser feito no lado do servidor ou em massa se necessário)
      // No Supabase, se usamos relacionamentos, o nome do cliente deveria vir do JOIN.
      // Se estamos desnormalizando, precisamos atualizar as OS.
      // Para manter a funcionalidade original de atualizar a lista local:
      setOrders(prev => prev.map(o => o.customerId === id ? { ...o, customerName: formData.name } : o));

      setEditModalOpen(false);
      setToast({ message: 'Dados do cliente atualizados com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      setToast({ message: 'Erro ao atualizar dados do cliente.', type: 'error' });
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 border ${toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
          }`}>
          <i className={`fa-solid fa-check-circle text-xl`}></i>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/clientes" className="text-sm font-bold text-blue-600 flex items-center gap-1 mb-2 hover:underline">
            <i className="fa-solid fa-arrow-left"></i> Voltar para Clientes
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditModalOpen(true)}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-all"
          >
            <i className="fa-solid fa-user-pen"></i> Alterar Dados
          </button>
          <Link
            to={`/ordens?clientId=${customer.id}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <i className="fa-solid fa-calendar-plus"></i> Novo Agendamento / OS
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 border-b pb-3">
              <i className="fa-solid fa-address-book text-blue-500"></i> Ficha do Cliente
            </h2>
            <div className="space-y-5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Telefone / WhatsApp</p>
                <div className="flex items-center gap-2">
                  <i className="fa-brands fa-whatsapp text-green-500"></i>
                  <p className="text-slate-900 font-bold text-lg">{customer.phone}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Local de Atendimento</p>
                <div className="flex gap-3">
                  <i className="fa-solid fa-location-dot text-red-500 mt-1"></i>
                  <div>
                    <p className="text-slate-900 font-bold leading-tight">
                      {customer.address}, {customer.number || 'S/N'}
                    </p>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      {customer.sector || 'Setor não informado'}
                    </p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                      {customer.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Observações / Notas Internas</p>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800 text-sm italic leading-relaxed">
                  "{customer.notes || 'Nenhuma observação cadastrada para este cliente.'}"
                </div>
              </div>

              <div className="pt-4 border-t text-[10px] text-slate-400 flex justify-between items-center">
                <span className="font-medium uppercase tracking-tighter">No sistema desde:</span>
                <span className="font-bold text-slate-600">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {activeOrders.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <i className="fa-solid fa-clock text-blue-500"></i> Agendamentos e Em Aberto
              </h2>
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">OS #{order.id.slice(-6)}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{order.type}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mt-1 line-clamp-2 leading-snug">{order.description}</h3>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase whitespace-nowrap ${order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                        {order.status}
                      </span>
                    </div>
                    {order.scheduledDate && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-bold mt-3 bg-white w-fit px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                        <i className="fa-solid fa-calendar-day text-blue-500"></i>
                        Prazo: {new Date(order.scheduledDate).toLocaleString('pt-BR')}
                      </div>
                    )}
                    <Link to={`/ordens/${order.id}`} className="mt-4 block text-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 py-2 rounded-lg hover:shadow-sm transition-all">
                      Abrir Detalhes do Atendimento →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
              <i className="fa-solid fa-clipboard-check text-green-600"></i> Histórico de Serviços Concluídos
            </h2>

            <div className="space-y-6">
              {finishedOrders.map(order => (
                <div key={order.id} className="border-b border-slate-100 pb-6 last:border-0 hover:bg-slate-50/50 p-3 rounded-xl transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OS #{order.id.slice(-6)}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{order.type}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Concluído: {order.finishedAt ? new Date(order.finishedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </div>

                  <p className="font-bold text-slate-700 text-lg mb-3 line-clamp-2 leading-tight">{order.description}</p>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-user-check"></i> Técnico: <span className="text-slate-500 font-bold">{order.techName}</span>
                    </span>
                    <Link to={`/ordens/${order.id}`} className="text-blue-600 hover:text-blue-800 font-bold hover:underline ml-auto flex items-center gap-1">
                      Ver Relatório <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    </Link>
                  </div>
                </div>
              ))}
              {finishedOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-medium italic border-2 border-dashed border-slate-50 rounded-2xl">
                  Nenhum serviço finalizado para este cliente ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-900">Alterar Cadastro do Cliente</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input type="text" required maxLength={14} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-600" value={formData.phone} onChange={handlePhoneChange} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade / Região</label>
                  <input type="text" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Endereço (Rua/Av)</label>
                  <input type="text" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número / Apto</label>
                  <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Setor / Bairro</label>
                  <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Observação / Notas Internas</label>
                  <textarea className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
