
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authService.signIn(email, password);

      if (user.isBlocked) {
        throw new Error('Este usuário está bloqueado.');
      }

      onLogin(user);
    } catch (err: any) {
      console.error('Erro no login:', err);
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao realizar o login.');
      }
    } finally {
      setLoading(false);
    }
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
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm disabled:opacity-50"
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
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Autenticando...</span>
                </>
              ) : (
                'Entrar no Painel'
              )}
            </button>

            {/* Link de cadastro removido por solicitação - Cadastro agora é apenas via Developer Panel */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
