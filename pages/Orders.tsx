
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { OrderStatus, ServiceOrder, UserRole, OrderAttachment } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const Orders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(storageService.getData());
  const [isModalOpen, setModalOpen] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState({
    status: '',
    tech: '',
    search: ''
  });

  const currentUser = data.currentUser;
  const company = data.companies.find(c => c.id === currentUser?.companyId);
  const settings = company?.settings || data.settings;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [newOrder, setNewOrder] = useState({
    customerId: searchParams.get('clientId') || '',
    techId: currentUser?.role === UserRole.TECH ? currentUser.id : '',
    type: settings.orderTypes[0] || 'Suporte',
    description: '',
    createdAt: getCurrentDateTime(),
    scheduledDate: '',
    attachments: [] as OrderAttachment[]
  });

  useEffect(() => {
    if (searchParams.get('clientId')) setModalOpen(true);
  }, [searchParams]);

  const filteredOrders = data.orders.filter(order => {
    const matchesUser = isAdmin || order.techId === currentUser?.id;
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesTech = !filters.tech || order.techId === filters.tech;
    const matchesSearch = !filters.search || 
      order.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.id.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesUser && matchesStatus && matchesTech && matchesSearch;
  });

  const visibleOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 10);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const attachment: OrderAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64,
          createdAt: new Date().toISOString()
        };
        setNewOrder(prev => ({
          ...prev,
          attachments: [...prev.attachments, attachment]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingAttachment = (id: string) => {
    setNewOrder(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = data.customers.find(c => c.id === newOrder.customerId);
    const tech = data.users.find(u => u.id === newOrder.techId);

    if (!customer || !tech) {
      alert('Selecione um cliente e um técnico válidos.');
      return;
    }

    const order: ServiceOrder = {
      id: Date.now().toString(),
      companyId: currentUser?.companyId || '',
      customerId: customer.id,
      customerName: customer.name,
      techId: tech.id,
      techName: tech.name,
      type: newOrder.type,
      description: newOrder.description,
      scheduledDate: newOrder.scheduledDate,
      aiReport: '',
      status: OrderStatus.OPEN,
      createdAt: new Date(newOrder.createdAt).toISOString(),
      posts: [],
      attachments: newOrder.attachments
    };

    const updatedData = { ...data, orders: [order, ...data.orders] };
    storageService.saveData(updatedData);
    setData(updatedData);
    setModalOpen(false);
    setNewOrder({ 
      customerId: '', 
      techId: currentUser?.role === UserRole.TECH ? currentUser.id : '', 
      type: settings.orderTypes[0] || 'Suporte',
      description: '', 
      createdAt: getCurrentDateTime(), 
      scheduledDate: '',
      attachments: []
    });
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    const updatedOrders = data.orders.filter(o => o.id !== orderToDelete);
    const updatedData = { ...data, orders: updatedOrders };
    storageService.saveData(updatedData);
    setData(updatedData);
    setOrderToDelete(null);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <ConfirmModal 
        isOpen={!!orderToDelete}
        title="Excluir Atendimento"
        message="Deseja realmente remover esta Ordem de Serviço permanentemente? Esta ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setOrderToDelete(null)}
        variant="danger"
        confirmText="Excluir OS"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ordens de Serviço</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão de atendimentos e produtividade</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-file-circle-plus"></i> Abrir Nova OS
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Filtros Responsivos */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Buscar por cliente ou ID..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="flex-1 lg:flex-none px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black uppercase tracking-widest"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos Status</option>
              {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className="p-1 md:p-2">
          <div className="border-2 border-blue-500/30 rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black">
                    <th className="px-6 py-5">Status / Natureza</th>
                    <th className="px-6 py-5">Identificação</th>
                    <th className="px-6 py-5">Responsável</th>
                    <th className="px-6 py-5">Cronograma</th>
                    <th className="px-6 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${
                            order.status === OrderStatus.FINISHED ? 'bg-green-50 text-green-700 border-green-100' :
                            order.status === OrderStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            order.status === OrderStatus.CANCELLED ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            {order.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm leading-none mb-1">{order.customerName}</div>
                        <div className="text-[9px] text-slate-400 font-bold">ID: #{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                              <i className="fa-solid fa-user-gear"></i>
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{order.techName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Criação: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          {order.scheduledDate && (
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                              Agendado: {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <button 
                              onClick={() => setOrderToDelete(order.id)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Excluir OS"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                          <Link 
                            to={`/ordens/${order.id}`}
                            className="inline-flex items-center gap-2 bg-slate-100/80 hover:bg-blue-600 hover:text-white text-slate-500 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            <span>Ver OS</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="opacity-30">
                          <i className="fa-solid fa-magnifying-glass text-4xl mb-3"></i>
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma ordem encontrada</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {filteredOrders.length > 10 && (
          <div className="p-6 bg-slate-50/30 border-t border-slate-100">
            <button 
              onClick={() => setShowAllOrders(!showAllOrders)}
              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
            >
              {showAllOrders ? (
                <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
              ) : (
                <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {filteredOrders.length - 10} ordens de serviço</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal - Otimizado para Mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Nova Ordem de Serviço</h3>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Cliente Final</label>
                  <select 
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black uppercase tracking-tight"
                    value={newOrder.customerId}
                    onChange={e => setNewOrder({...newOrder, customerId: e.target.value})}
                  >
                    <option value="">Selecione o Cliente</option>
                    {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Natureza do Atendimento</label>
                  <select 
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black uppercase tracking-tight"
                    value={newOrder.type}
                    onChange={e => setNewOrder({...newOrder, type: e.target.value})}
                  >
                    {settings.orderTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Responsável</label>
                  <select 
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black uppercase tracking-tight"
                    value={newOrder.techId}
                    onChange={e => setNewOrder({...newOrder, techId: e.target.value})}
                    disabled={currentUser?.role === UserRole.TECH}
                  >
                    <option value="">Definir Técnico</option>
                    {data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Data Abertura</label>
                  <input 
                    type="datetime-local"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black text-slate-700"
                    value={newOrder.createdAt}
                    onChange={e => setNewOrder({...newOrder, createdAt: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Agendamento (Prazo)</label>
                  <input 
                    type="datetime-local"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-black text-blue-600"
                    value={newOrder.scheduledDate}
                    onChange={e => setNewOrder({...newOrder, scheduledDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Relato do Cliente / Diagnóstico Inicial</label>
                <textarea 
                  required
                  placeholder="Descreva o que foi solicitado..."
                  rows={3}
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-medium leading-relaxed bg-slate-50/50"
                  value={newOrder.description}
                  onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                />
              </div>

              {/* Anexos condicional ao Módulo */}
              {settings.enableAttachments && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Documentação Prévia (Opcional)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {newOrder.attachments.map(att => (
                      <div key={att.id} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                        <span className="truncate max-w-[100px]">{att.name}</span>
                        <button type="button" onClick={() => removePendingAttachment(att.id)} className="text-red-500 hover:scale-125 transition-transform">
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    multiple 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-50"
                  >
                    <i className="fa-solid fa-cloud-arrow-up text-2xl mb-1"></i>
                    Enviar fotos ou documentos
                  </button>
                </div>
              )}

              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  Gerar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
