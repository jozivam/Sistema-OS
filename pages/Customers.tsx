
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storageService } from '../services/storageService';
// Fixed: Removed non-existent OrderType import
import { Customer, ServiceOrder, OrderStatus, UserRole } from '../types';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const Customers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(storageService.getData());
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [openOSNow, setOpenOSNow] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenNewModal();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    number: '',
    sector: '',
    notes: ''
  });

  const [initialOS, setInitialOS] = useState({
    description: '',
    type: data.settings.orderTypes[0] || 'Suporte',
    createdAt: getCurrentDateTime(),
    scheduledDate: '',
    techId: data.users.find(u => u.role === UserRole.TECH)?.id || data.currentUser?.id || ''
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

  const uniqueCities = Array.from(new Set(data.customers.map(c => c.city).filter(Boolean))).sort();

  const filteredCustomers = data.customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCity = !selectedCity || c.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const handleOpenNewModal = () => {
    setEditingCustomer(null);
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      city: customer.city,
      address: customer.address,
      number: customer.number || '',
      sector: customer.sector || '',
      notes: customer.notes
    });
    setOpenOSNow(false);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCustomers = [...data.customers];
    let updatedOrders = [...data.orders];
    let targetCustomerId = '';

    if (editingCustomer) {
      targetCustomerId = editingCustomer.id;
      updatedCustomers = updatedCustomers.map(c => 
        c.id === editingCustomer.id ? { ...c, ...formData } : c
      );
      updatedOrders = updatedOrders.map(o => 
        o.customerId === editingCustomer.id ? { ...o, customerName: formData.name } : o
      );
    } else {
      targetCustomerId = Date.now().toString();
      const customer: Customer = { ...formData, id: targetCustomerId, createdAt: new Date().toISOString(), companyId: data.currentUser?.companyId || '' };
      updatedCustomers = [customer, ...updatedCustomers];

      if (openOSNow && initialOS.description) {
        const tech = data.users.find(u => u.id === initialOS.techId) || data.currentUser;
        // Fixed: Added missing companyId property to ServiceOrder
        const newOrder: ServiceOrder = {
          id: (Date.now() + 1).toString(),
          companyId: data.currentUser?.companyId || '',
          customerId: targetCustomerId,
          customerName: customer.name,
          techId: tech?.id || '',
          techName: tech?.name || '',
          type: initialOS.type,
          description: initialOS.description,
          scheduledDate: initialOS.scheduledDate ? new Date(initialOS.scheduledDate).toISOString() : undefined,
          aiReport: '',
          status: OrderStatus.OPEN,
          createdAt: new Date(initialOS.createdAt).toISOString(),
          posts: []
        };
        updatedOrders = [newOrder, ...updatedOrders];
      }
    }
    
    const updatedData = { ...data, customers: updatedCustomers, orders: updatedOrders };
    storageService.saveData(updatedData);
    setData(updatedData);
    setModalOpen(false);
    resetForm();
    setToast({ 
      message: editingCustomer ? 'Dados atualizados!' : (openOSNow ? 'Cliente e OS cadastrados!' : 'Cliente cadastrado com sucesso!'), 
      type: 'success' 
    });
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', city: '', address: '', number: '', sector: '', notes: '' });
    setInitialOS({ 
      description: '', 
      type: data.settings.orderTypes[0] || 'Suporte',
      createdAt: getCurrentDateTime(), 
      scheduledDate: '', 
      techId: data.users.find(u => u.role === UserRole.TECH)?.id || data.currentUser?.id || '' 
    });
    setOpenOSNow(false);
  };

  const confirmDelete = () => {
    if (!customerToDelete) return;
    const updatedData = { ...data, customers: data.customers.filter(c => c.id !== customerToDelete) };
    storageService.saveData(updatedData);
    setData(updatedData);
    setCustomerToDelete(null);
    setToast({ message: 'Cliente removido.', type: 'error' });
  };

  return (
    <div className="relative">
      <ConfirmModal 
        isOpen={!!customerToDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente permanentemente? Histórico será preservado mas sem vínculo."
        onConfirm={confirmDelete}
        onCancel={() => setCustomerToDelete(null)}
        variant="danger"
        confirmText="Excluir"
      />

      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 border ${
          toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-trash-can'} text-xl`}></i>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 font-medium">Controle de base cadastral e serviços.</p>
        </div>
        <button 
          onClick={handleOpenNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-user-plus"></i> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Nome ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 min-w-[200px]">
            <i className="fa-solid fa-filter text-slate-400 text-sm"></i>
            <select 
              className="flex-1 bg-white border border-slate-200 rounded-lg py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">Todas Regiões</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Endereço</th>
                <th className="px-6 py-4">Cidade / Região</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link to={`/clientes/${customer.id}`} className="font-bold text-slate-900 group-hover:text-blue-600 hover:underline flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <i className="fa-solid fa-user text-xs"></i>
                      </div>
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-bold font-mono tracking-tight">{customer.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-700">{customer.address}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{customer.number ? `Nº ${customer.number}` : 'S/N'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-700">{customer.city}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{customer.sector || 'S/ Bairro'}</div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => handleOpenEditModal(customer)} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg transition-colors inline-block" title="Editar"><i className="fa-solid fa-pen-to-square"></i></button>
                    <Link to={`/ordens?search=${customer.name}`} className="text-slate-400 hover:text-blue-500 p-2 rounded-lg transition-colors inline-block" title="Ver Histórico"><i className="fa-solid fa-file-invoice"></i></Link>
                    <button onClick={() => setCustomerToDelete(customer.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors" title="Remover"><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimized Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCustomer ? 'Alterar Cadastro' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-transform hover:rotate-90">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {/* Personal Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 flex items-center gap-2 text-[11px] uppercase tracking-widest border-l-4 border-blue-500 pl-3">
                   Dados Principais
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome Completo</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">WhatsApp / Fone</label>
                    <input type="text" required maxLength={14} placeholder="(00)00000-0000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-600" value={formData.phone} onChange={handlePhoneChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cidade e UF</label>
                    <input type="text" required placeholder="Ex: Palmas/TO" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 flex items-center gap-2 text-[11px] uppercase tracking-widest border-l-4 border-blue-500 pl-3">
                   Localização de Atendimento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Logradouro (Rua/Av)</label>
                    <input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Número / Complemento</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bairro / Setor</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas de Acesso / Obs. Internas</label>
                    <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" rows={2} placeholder="Ex: Cerca elétrica no muro, cachorro bravo, ligar antes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                  </div>
                </div>
              </div>

              {!editingCustomer && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${openOSNow ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                        <i className="fa-solid fa-file-circle-plus text-lg"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-none">Agendar primeira OS agora?</h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Cria o cliente e já agenda o primeiro atendimento.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={openOSNow} onChange={e => setOpenOSNow(e.target.checked)} />
                      <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                  {openOSNow && (
                    <div className="grid grid-cols-1 gap-5 animate-in slide-in-from-top-4 duration-300 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Descrição Técnica do Pedido</label>
                        <textarea required={openOSNow} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none bg-white font-medium" rows={2} placeholder="O que o cliente solicitou?" value={initialOS.description} onChange={e => setInitialOS({...initialOS, description: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Natureza</label>
                            <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold" value={initialOS.type} onChange={e => setInitialOS({...initialOS, type: e.target.value})}>
                              {data.settings.orderTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Responsável</label>
                            <select className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold" value={initialOS.techId} onChange={e => setInitialOS({...initialOS, techId: e.target.value})}>
                              {data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                         </div>
                         <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Data/Hora</label>
                            <input type="datetime-local" required={openOSNow} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold text-blue-600" value={initialOS.scheduledDate} onChange={e => setInitialOS({...initialOS, scheduledDate: e.target.value})} />
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">Descartar</button>
                <button type="submit" className="flex-2 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-check"></i>
                  {editingCustomer ? 'Salvar Alterações' : (openOSNow ? 'Criar Cliente e Agendar OS' : 'Confirmar Cadastro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
