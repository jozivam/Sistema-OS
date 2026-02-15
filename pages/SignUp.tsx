import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const SignUp: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authService.signUp(email, password, name);
            setSuccess(true);
            setTimeout(() => navigate('/'), 3000);
        } catch (err: any) {
            console.error('Erro no cadastro:', err);
            setError(err.message || 'Ocorreu um erro ao realizar o cadastro.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                        <i className="fa-solid fa-check text-3xl"></i>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Conta Criada!</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">
                        Seu cadastro foi realizado com sucesso. Você será redirecionado para o login em instantes...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                            <i className="fa-solid fa-user-plus text-3xl"></i>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Criar Conta</h1>
                        <p className="text-slate-500 mt-2 font-bold text-[10px] uppercase tracking-widest">Junte-se ao Sistema OS</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-xs font-black uppercase flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
                                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
                                {error === 'EMAIL_SIGNUP_DISABLED' ? (
                                    <span>
                                        <strong>ERRO: CADASTROS DESATIVADOS</strong><br />
                                        O desenvolvedor precisa ativar o provedor de e-mail no painel do Supabase.<br />
                                        <Link to="/" className="underline mt-2 inline-block">Voltar para o Login</Link>
                                    </span>
                                ) : (
                                    <span>{error}</span>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                            <input
                                type="text"
                                required
                                disabled={loading}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm disabled:opacity-50"
                                placeholder="Seu nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
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
                                    <span>Processando...</span>
                                </>
                            ) : (
                                'Cadastrar e Entrar'
                            )}
                        </button>

                        <div className="text-center mt-6">
                            <Link to="/" className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
                                Já tem uma conta? Faust o login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
