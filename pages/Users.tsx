
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { isTrialUser, TRIAL_ADMIN_ID, TRIAL_TECH_ID, TRIAL_COMPANY_ID } from '../services/trialService';
import { User, UserRole } from '../types';
import { Link } from 'react-router-dom';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [forceLogoutToast, setForceLogoutToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.TECH,
    city: '',
    isBlocked: false
  });

  const [isTrial, setIsTrial] = useState(false);

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);
      const trial = isTrialUser(user);
      setIsTrial(trial);

      if (trial) {
        // Modo trial: exibe os dois usuários demo
        const demoUsers: User[] = [
          { id: TRIAL_ADMIN_ID, name: user.name + ' (Admin)', email: 'admin@demo.com', phone: '(11)99999-9999', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID, city: 'São Paulo', isBlocked: false },
          { id: TRIAL_TECH_ID, name: user.name + ' (Técnico)', email: 'tecnico@demo.com', phone: '(11)98888-8888', role: UserRole.TRIAL, companyId: TRIAL_COMPANY_ID, city: 'São Paulo', isBlocked: false },
        ];
        setUsers(demoUsers);
      } else {
        const fetchedUsers = await dbService.getUsers(user.companyId);
        setUsers(fetchedUsers);
      }
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
    if (isTrial) {
      setModalOpen(false);
      alert('Modo demonstração: o gerenciamento de usuários está disponível no sistema completo.');
      return;
    }
    try {
      if (editingUserId) {
        await dbService.updateUser(editingUserId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          city: formData.city,
          isBlocked: formData.isBlocked,
          ...(formData.password && { password: formData.password })
        });
        setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...formData } : u));
        alert("Usuário atualizado com sucesso!");
      } else {
        setLoading(true);
        // Automação: Cria no Auth e na Tabela Pública via Edge Function
        const { user: newUserAuth, password: finalPassword } = await authService.adminCreateUser({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          company_id: currentUser?.companyId || ''
        });

        // O trigger no banco já cria o registro em public.users, 
        // mas vamos atualizar o estado local para exibir imediatamente
        const newUser: User = {
          id: newUserAuth.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          companyId: currentUser?.companyId || '',
          city: formData.city,
          isBlocked: false
        };

        setUsers(prev => [...prev, newUser]);
        alert(`Usuário cadastrado com sucesso!\n\nE-mail: ${formData.email}\nSenha: ${finalPassword}`);
      }
      setModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      alert(`Erro ao salvar usuário: ${error.message || 'Verifique se a Edge Function foi implantada.'}`);
    } finally {
      setLoading(false);
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

  const handleForceLogout = async (userId: string, userName: string) => {
    if (!window.confirm(`Encerrar a sessão ativa de "${userName}"? O usuário será desconectado assim que tentar acessar o sistema.`)) return;
    try {
      await authService.forceLogoutUser(userId);
      setForceLogoutToast(`Sessão de ${userName} encerrada.`);
      setTimeout(() => setForceLogoutToast(null), 3000);
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      alert('Erro ao encerrar sessão do usuário.');
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
      {forceLogoutToast && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-orange-400"></i> {forceLogoutToast}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Usuários</h1>
          <p className="text-[var(--text-secondary)] font-bold text-xs mt-1">Gerencie técnicos e administradores do sistema.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 btn-pill-hover flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Novo Usuário
        </button>
      </div>

      <div className="saas-card overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] bg-white/50 flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 min-w-[200px]">
            <i className="fa-solid fa-map-location-dot text-[var(--text-secondary)] text-sm"></i>
            <select
              className="flex-1 px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--blue-primary)] text-sm font-semibold text-[var(--text-primary)] transition-colors"
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
                    <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <i className={`fa-solid fa-circle-user ${user.isBlocked ? 'text-red-300' : 'text-slate-300'}`}></i>
                      <span className={user.isBlocked ? 'line-through text-slate-400' : 'text-[var(--blue-primary)]'}>{user.name}</span>
                    </div>
                    <div className="ml-8 mt-1">
                      <span className="text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest">
                        {user.city || 'Sem Região'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[var(--text-primary)] text-sm font-bold tracking-tight">{user.email}</div>
                    <div className="text-[var(--text-secondary)] text-xs font-semibold">{user.phone || 'Sem telefone'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-[var(--text-secondary)]'
                      }`}>
                      {user.role}
                    </span>
                    {user.isBlocked && (
                      <div className="text-[8px] font-black text-red-500 uppercase mt-1 tracking-widest">Bloqueado</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Botão Encerrar Sessão — apenas para Desenvolvedor */}
                      {currentUser?.role === UserRole.DEVELOPER && user.id !== currentUser.id && (
                        <button
                          onClick={() => handleForceLogout(user.id, user.name)}
                          className="text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition-colors"
                          title="Encerrar Sessão Ativa"
                        >
                          <i className="fa-solid fa-power-off"></i>
                        </button>
                      )}
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
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]">
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-secondary)] hover:text-slate-800 p-2 transition-transform w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/50">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
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

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white m-0 p-8 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-4 border border-[var(--border-color)] rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-[var(--blue-primary)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-[var(--blue-hover)] btn-pill-hover flex items-center justify-center gap-2"
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
