import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: (user: any) => void;
  sessionError?: string | null;
  onClearSessionError?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, sessionError, onClearSessionError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline] = useState(authService.isPlaceholderClient());
  const navigate = useNavigate();

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
      if (err.message === 'Invalid login credentials' || err.message.includes('incorretos')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Ocorreu um erro ao realizar o login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'fa-gauge-high', text: 'Dashboard em tempo real' },
    { icon: 'fa-brain', text: 'Relatórios gerados por IA' },
    { icon: 'fa-users', text: 'Gestão multi-usuário e permissões' },
    { icon: 'fa-cloud', text: 'Acesso seguro em qualquer lugar' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">

      {/* ─── Painel esquerdo ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
              <i className="fa-solid fa-microchip text-white text-lg" />
            </div>
            <span className="text-white font-black text-xl tracking-tighter">Sistema OS</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
            <i className="fa-solid fa-shield-check text-blue-400 text-sm" />
            <span className="text-blue-300 text-sm font-bold tracking-wide">ÁREA DE ACESSO RESTRITO</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Gerencie sua operação<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">com inteligência</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm mb-10">
            Acesse sua plataforma completa de gestão de serviços e automação empresarial.
          </p>

          <div className="flex flex-col gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <i className={`fa - solid ${f.icon} text - blue - 400 text - sm`} />
                </div>
                <span className="text-slate-300 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">
          © 2025 Sistema OS — Todos os direitos reservados.
        </p>
      </div>

      {/* ─── Painel direito — login ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* badge mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-microchip text-white text-sm" />
            </div>
            <span className="text-white font-black text-lg tracking-tighter">Sistema OS</span>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">

            {/* header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-slate-400 text-sm">
                Informe suas credenciais para acessar o painel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* alertas de erro */}
              {sessionError && (
                <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 p-4 rounded-xl text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <i className="fa-solid fa-user-lock mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold uppercase text-[10px] tracking-widest mb-1">Sessão em Uso</p>
                    <p className="text-slate-300 normal-case leading-relaxed">{sessionError}</p>
                  </div>
                  {onClearSessionError && (
                    <button type="button" onClick={onClearSessionError} className="text-orange-400/50 hover:text-orange-400 transition-colors">
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              )}

              {isOffline && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-xs flex items-start gap-3 mb-4">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold uppercase text-[10px] tracking-widest mb-1">Modo Offline</p>
                    <p className="text-slate-300 normal-case leading-relaxed">Instância Supabase não configurada. Use as credenciais de demonstração.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                  <p className="text-slate-300 font-medium">{error}</p>
                </div>
              )}

              {/* email */}
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">
                  Seu e-mail
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
                  <input
                    type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* senha */}
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">
                  Senha secreta
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
                  <input
                    type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* botão login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl py-3.5 shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Verificando acesso...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket" />
                    Acessar Painel
                  </>
                )}
              </button>

              {/* link trial */}
              <div className="text-center pt-2">
                <a href="#/trial" className="text-slate-400 text-sm hover:text-white transition-colors">
                  Não tem acesso?{' '}
                  <span className="text-blue-400 font-bold">Experimentar demonstração</span>
                </a>
              </div>
            </form>
          </div>

          {/* voltar */}
          <div className="text-center mt-6">
            <a href="#/" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
              <i className="fa-solid fa-arrow-left mr-2 text-xs" />
              Voltar para a página inicial
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
