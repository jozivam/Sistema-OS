import React, { useState, useMemo, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { AppState, User, UserRole } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const DeveloperSettings: React.FC = () => {
  const [devUsers, setDevUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const allUsers = await dbService.getUsers();
      setDevUsers(allUsers.filter(u => u.role === UserRole.DEVELOPER));
    } catch (error) {
      console.error("Erro ao carregar configurações do dev:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        password: '', // Password is not returned from DB
        phone: user.phone || ''
      });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', email: '', password: '', phone: '' });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const updates: any = {
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
        };
        if (userFormData.password) updates.password = userFormData.password;

        await dbService.updateUser(editingUser.id, updates);

        setDevUsers(prev => prev.map(u =>
          u.id === editingUser.id ? { ...u, ...updates } : u
        ));

        // Se estiver editando o próprio perfil
        if (currentUser && editingUser.id === currentUser.id) {
          setToast({ message: 'Alteração salva! Por segurança, faça login novamente.', type: 'success' });
          setTimeout(() => {
            authService.signOut().then(() => {
              window.location.href = '#/';
              window.location.reload();
            });
          }, 1500);
          return;
        }

        setToast({ message: 'Dados do desenvolvedor atualizados!', type: 'success' });
      } else {
        const newUser = await dbService.createUser({
          id: BYPASS_AUTH ? crypto.randomUUID() : undefined,
          name: userFormData.name,
          email: userFormData.email,
          password: userFormData.password,
          phone: userFormData.phone,
          role: UserRole.DEVELOPER,
          companyId: currentUser?.companyId || '00000000-0000-0000-0000-000000000000', // Default para empresa dev
          isBlocked: false,
          city: ''
        });
        setDevUsers(prev => [...prev, newUser]);
        setToast({ message: 'Novo desenvolvedor cadastrado!', type: 'success' });
      }

      setUserModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Erro ao salvar desenvolvedor:", error);
      setToast({ message: 'Erro ao salvar desenvolvedor.', type: 'error' });
    }
  };

  const deleteDevUser = async () => {
    if (!userToDelete) return;
    if (devUsers.length <= 1) {
      setToast({ message: 'O sistema deve possuir pelo menos um desenvolvedor.', type: 'error' });
      setUserToDelete(null);
      return;
    }

    try {
      await dbService.deleteUser(userToDelete.id);
      setDevUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
      setToast({ message: 'Usuário desenvolvedor removido.', type: 'success' });
    } catch (error) {
      console.error("Erro ao excluir desenvolvedor:", error);
      setToast({ message: 'Erro ao excluir desenvolvedor.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-green-500' : 'bg-red-600 text-white border-red-400'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Remover Acesso"
        message={`Tem certeza que deseja excluir o acesso de "${userToDelete?.name}"? Esta ação removerá permanentemente as credenciais de acesso ao painel.`}
        onConfirm={deleteDevUser}
        onCancel={() => setUserToDelete(null)}
        variant="danger"
        confirmText="Sim, Remover"
      />

      <div className="flex flex-col">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Configurações do Painel</h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Gestão de acessos administrativos e segurança do sistema</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-12 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
              <i className="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Equipe Desenvolvedora</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de quem acessa este painel de controle</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenUserModal()}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> Novo Desenvolvedor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                <th className="px-12 py-6">Usuário / Identificação</th>
                <th className="px-12 py-6">E-mail / Login</th>
                <th className="px-12 py-6">Telefone</th>
                <th className="px-12 py-6">Credenciais</th>
                <th className="px-12 py-6 text-right">Gerenciar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-12 py-6">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{user.name}</span>
                    {currentUser?.id === user.id && (
                      <span className="ml-2 bg-blue-100 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Você</span>
                    )}
                  </td>
                  <td className="px-12 py-6">
                    <span className="text-xs font-medium text-slate-600 lowercase">{user.email}</span>
                  </td>
                  <td className="px-12 py-6">
                    <span className="text-xs font-bold text-slate-400">{user.phone || 'N/A'}</span>
                  </td>
                  <td className="px-12 py-6">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black font-mono border border-orange-100 shadow-inner">
                        {user.password || '******'}
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(user.password || '')} className="text-slate-300 hover:text-blue-500 transition-colors">
                        <i className="fa-solid fa-copy text-[10px]"></i>
                      </button>
                    </div>
                  </td>
                  <td className="px-12 py-6 text-right space-x-3">
                    <button
                      onClick={() => handleOpenUserModal(user)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                      title="Editar Acesso"
                    >
                      <i className="fa-solid fa-user-pen"></i>
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-30"
                      disabled={devUsers.length <= 1}
                      title="Excluir Acesso"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 p-12 rounded-[2.5rem] text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] text-center border border-slate-800 shadow-2xl">
        GESTÃO ONLINE &copy; 2026 — SEGURANÇA E ACESSO RESTRITO
      </div>

      {/* Modal Usuário Desenvolvedor */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                {editingUser ? 'Editar Acesso Dev' : 'Novo Usuário Desenvolvedor'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome Completo</label>
                  <input
                    type="text" required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm uppercase tracking-tight"
                    placeholder="EX: JOÃO DA SILVA"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-mail / Login</label>
                    <input
                      type="email" required
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm lowercase"
                      placeholder="contato@sistema.com"
                      value={userFormData.email}
                      onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Senha de Acesso</label>
                    <input
                      type="text" required
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-sm text-blue-600 font-mono"
                      placeholder="••••••••"
                      value={userFormData.password}
                      onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefone de Recuperação (Opcional)</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    placeholder="(00) 00000-0000"
                    value={userFormData.phone}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button type="button" onClick={() => setUserModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">
                  {editingUser ? 'Salvar Alterações' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperSettings;
