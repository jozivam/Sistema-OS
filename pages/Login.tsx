
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { UserRole, CompanyPlan } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginWithCredentials = (userEmail: string, userPass: string) => {
    const data = storageService.getData();
    const user = data.users.find(u => u.email === userEmail && u.password === userPass);

    if (user) {
      // Verificar se a empresa está ativa (exceto para desenvolvedores)
      if (user.role !== UserRole.DEVELOPER) {
        const company = data.companies.find(c => c.id === user.companyId);

        if (company) {
          // Verificação de Status Manual
          if (company.status === 'BLOCKED') {
            setError('O acesso da sua empresa está temporariamente suspenso. Entre em contato com o suporte.');
            return;
          }

          // Verificação de Expiração de Plano
          if (company.plan !== CompanyPlan.LIVRE && company.expiresAt) {
            const expirationDate = new Date(company.expiresAt);
            if (new Date() > expirationDate) {
              setError(`O seu plano (${company.plan}) expirou em ${expirationDate.toLocaleDateString('pt-BR')}. O sistema está bloqueado, por favor realize a renovação.`);
              return;
            }
          }
        }
      }

      if (user.isBlocked) {
        setError('Este usuário está bloqueado.');
        return;
      }

      const { password: _, ...userWithoutPassword } = user;
      data.currentUser = userWithoutPassword as any;
      storageService.saveData(data);
      onLogin(data.currentUser);
    } else {
      setError('Credenciais incorretas.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginWithCredentials(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
              <i className="fa-solid fa-microchip text-3xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Sistema OS</h1>
            <p className="text-slate-500 mt-2 font-bold text-[10px] uppercase tracking-widest">Plataforma de Gestão Multi-Empresa</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-xs font-black uppercase flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail de Acesso</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Senha</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
