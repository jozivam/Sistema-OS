import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { startTrial } from '../services/trialService';

interface TrialPageProps {
    onLogin: (user: User) => void;
}

const TrialPage: React.FC<TrialPageProps> = ({ onLogin }) => {
    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim() || !userName.trim()) return;
        setLoading(true);

        setTimeout(() => {
            const user = startTrial(userName.trim(), companyName.trim());
            onLogin(user);
            navigate('/dashboard');
        }, 700);
    };

    const features = [
        { icon: 'fa-database', text: 'Dados fictícios pré-carregados' },
        { icon: 'fa-shuffle', text: 'Alterne entre Admin e Técnico' },
        { icon: 'fa-shield-halved', text: 'Nenhum dado é salvo no servidor' },
        { icon: 'fa-bolt', text: 'Acesso imediato, sem senhas' },
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

                    <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
                        <i className="fa-solid fa-flask text-orange-400 text-sm" />
                        <span className="text-orange-300 text-sm font-bold tracking-wide">DEMONSTRAÇÃO GRATUITA</span>
                    </div>

                    <h1 className="text-4xl font-black text-white leading-tight mb-4">
                        Explore o sistema<br />
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">sem se cadastrar</span>
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-sm mb-10">
                        Veja tudo em funcionamento — ordens de serviço, clientes, dashboards, relatórios — em um ambiente 100% seguro.
                    </p>

                    <div className="flex flex-col gap-4">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <i className={`fa-solid ${f.icon} text-blue-400 text-xs`} />
                                </div>
                                <span className="text-slate-300 text-sm font-medium">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-slate-600 text-xs">
                    © 2025 Sistema OS — Demonstração não vincula contrato.
                </p>
            </div>

            {/* ─── Painel direito — formulário ─── */}
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
                            <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1 mb-4">
                                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                                <span className="text-orange-300 text-xs font-bold tracking-wider">MODO TRIAL</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Iniciar demonstração</h2>
                            <p className="text-slate-400 text-sm">
                                Preencha e explore o sistema completo em segundos.
                            </p>
                        </div>

                        <form onSubmit={handleStart} className="space-y-5">
                            {/* seu nome */}
                            <div>
                                <label className="block text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">
                                    Seu nome <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="Ex: Carlos Oliveira"
                                        value={userName}
                                        onChange={e => setUserName(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* empresa */}
                            <div>
                                <label className="block text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">
                                    Nome da empresa <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="Ex: TechReparo Assistência Técnica"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* botão */}
                            <button
                                type="submit"
                                disabled={loading || !companyName.trim() || !userName.trim()}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl py-3.5 shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin" />
                                        Preparando ambiente...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-flask" />
                                        Iniciar demonstração gratuita
                                    </>
                                )}
                            </button>

                            {/* link login */}
                            <div className="text-center pt-2">
                                <a href="#/login" className="text-slate-400 text-sm hover:text-white transition-colors">
                                    Já tem uma conta?{' '}
                                    <span className="text-blue-400 font-bold">Fazer login</span>
                                </a>
                            </div>
                        </form>

                        {/* aviso */}
                        <div className="mt-6 flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <i className="fa-solid fa-shield-halved text-emerald-400 text-sm mt-0.5 shrink-0" />
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Ambiente <strong className="text-slate-300">100% isolado</strong>. Os dados que você criar aqui são apagados ao sair e <strong className="text-slate-300">jamais chegam ao servidor</strong>.
                            </p>
                        </div>
                    </div>

                    {/* voltar */}
                    <div className="text-center mt-4">
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

export default TrialPage;
