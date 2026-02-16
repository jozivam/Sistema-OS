
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { User, UserRole } from '../types';
import { Link } from 'react-router-dom';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.TECH,
    city: '',
    isBlocked: false
  });

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const fetchedUsers = await dbService.getUsers(user.companyId);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Máscara de telefone idêntica à de clientes
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

  const uniqueCities = Array.from(new Set(users.map(u => u.city).filter(Boolean))).sort();

  const filteredUsers = users.filter(u => {
    const matchesCity = !selectedCity || u.city === selectedCity;
    return matchesCity;
  });

  const openModal = (user?: User) => {
    if (user) {
      setEditingUserId(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: user.password || '',
        role: user.role,
        city: user.city || '',
        isBlocked: user.isBlocked || false
      });
    } else {
      setEditingUserId(null);
      setFormData({ name: '', email: '', phone: '', password: '', role: UserRole.TECH, city: '', isBlocked: false });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await dbService.updateUser(editingUserId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          city: formData.city,
          isBlocked: formData.isBlocked,
          ...(formData.password && { password: formData.password }) // Only send password if it's not empty
        });
        setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...formData } : u));
      } else {
        const newUser = await dbService.createUser({
          companyId: currentUser?.companyId || '',
          ...formData
        });
        setUsers(prev => [...prev, newUser]);
      }
      setModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário.");
    }
  };

  const toggleBlock = async (userId: string) => {
    if (userId === currentUser?.id) return alert('Você não pode bloquear a si mesmo!');

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newBlockedState = !user.isBlocked;
      await dbService.updateUser(userId, { isBlocked: newBlockedState });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: newBlockedState } : u));
    } catch (error) {
      console.error("Erro ao alterar bloqueio:", error);
      alert("Erro ao alterar bloqueio do usuário.");
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) return alert('Você não pode excluir a si mesmo!');
    if (!window.confirm('Excluir este usuário permanentemente?')) return;

    try {
      await dbService.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Erro ao excluir usuário.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.DEVELOPER) {
    return <div className="p-20 text-center font-bold">Acesso negado.</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-500">Gerencie técnicos e administradores do sistema.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <i className="fa-solid fa-plus"></i> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-[200px]">
            <i className="fa-solid fa-map-location-dot text-slate-400"></i>
            <select
              className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">Todas as Regiões</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Nome / Região</th>
                <th className="px-6 py-4">E-mail / Telefone</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors group ${user.isBlocked ? 'opacity-60 bg-slate-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <i className={`fa-solid fa-circle-user ${user.isBlocked ? 'text-red-300' : 'text-slate-300'}`}></i>
                      <span className={user.isBlocked ? 'line-through text-slate-400' : 'text-blue-600'}>{user.name}</span>
                    </div>
                    <div className="ml-8">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                        {user.city || 'Sem Região'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 text-sm">{user.email}</div>
                    <div className="text-slate-400 text-xs font-medium">{user.phone || 'Sem telefone'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {user.role}
                    </span>
                    {user.isBlocked && (
                      <div className="text-[8px] font-black text-red-500 uppercase mt-1">Bloqueado</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleBlock(user.id)}
                        className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-500 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`}
                        title={user.isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                      >
                        <i className={`fa-solid ${user.isBlocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                      </button>
                      <button
                        onClick={() => openModal(user)}
                        className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Editar Usuário"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Excluir Usuário"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {!editingUserId && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
                  <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                    Aviso: O cadastro manual abaixo cria apenas o perfil.
                    Para acesso por e-mail, o usuário deve se cadastrar via "/signup"
                    ou ser convidado pelo Dashboard do Supabase.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text" required
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail de Acesso</label>
                  <input
                    type="email" required
                    placeholder="carlos@empresa.com"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade / Região</label>
                  <input
                    type="text" required
                    placeholder="Ex: Palmas/TO"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="(00)90000-0000"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                <input
                  type="text" required={!editingUserId} // Password is required for new users
                  placeholder="Defina uma senha"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {editingUserId ? 'Altere para definir uma nova senha de acesso.' : 'Senha inicial para o primeiro acesso.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nível de Permissão</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.TECH}>Técnico (Acesso restrito às suas OS)</option>
                  <option value={UserRole.ADMIN}>Administrador (Acesso total)</option>
                  <option value={UserRole.DEVELOPER}>Desenvolvedor (Gestor Supremo)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="userBlocked"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  checked={formData.isBlocked}
                  onChange={e => setFormData({ ...formData, isBlocked: e.target.checked })}
                />
                <label htmlFor="userBlocked" className="text-sm font-bold text-slate-700 select-none">Bloquear acesso deste usuário (Férias/Afastamento)</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
