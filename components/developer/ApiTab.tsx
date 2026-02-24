import React from 'react';

const ApiTab: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-book-bookmark text-blue-500"></i> Documentação Técnica e Integrações
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                    Regras de negócio, dicionário de dados e endpoints de integração do sistema.
                </p>
            </div>

            {/* Integration Rules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <i className="fa-solid fa-database"></i>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Estrutura de Multi-tenant</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Segurança via RLS</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            O sistema utiliza o <strong className="text-slate-700">RLS (Row Level Security)</strong> do Postgres para isolar dados.
                            Toda tabela possui uma coluna <code className="bg-slate-50 px-1.5 py-0.5 rounded text-blue-600 font-mono">company_id</code>.
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-[10px] text-slate-500">
                                <i className="fa-solid fa-circle-check text-green-500 mt-0.5"></i>
                                <span>Acesso automático baseado no JWT do usuário logado.</span>
                            </li>
                            <li className="flex items-start gap-2 text-[10px] text-slate-500">
                                <i className="fa-solid fa-circle-check text-green-500 mt-0.5"></i>
                                <span>Gatilhos automáticos sincronizam perfis do Auth para o Public.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <i className="fa-solid fa-shield-virus"></i>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Políticas de Roles</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase italic">Níveis de Permissão</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-50">
                            <span className="font-bold text-slate-700">Desenvolvedor</span>
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">Super Admin</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-50">
                            <span className="font-bold text-slate-700">Administrador</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase">Gestão de Empresa</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700">Técnico</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black uppercase">Operacional</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Internal Endpoints */}
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <i className="fa-solid fa-gears text-xl"></i>
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-widest">Edge Functions Internas</h4>
                            <p className="text-blue-400/60 text-xs font-bold uppercase tracking-widest italic">Lógicas de Processamento em Nuvem</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/[0.08] transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] font-black uppercase">POST</span>
                                <span className="font-mono text-sm font-bold text-white">/create-user</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                Cria um novo usuário administrativo para uma empresa, integrando Auth e Perfil Público em um único passo.
                            </p>
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-shield-halved text-amber-500 text-[10px]"></i>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requer Service Role Key</span>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl opacity-50 border-dashed">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-400 text-[10px] font-black uppercase">GET</span>
                                <span className="font-mono text-sm font-bold text-white/50">/health-check</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">
                                Endpoint planejado para monitoramento de latência e status dos serviços.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            * Para autenticação externa, utilize o fluxo de OAuth2 do Supabase ou consulte as tabelas de segurança no dashboard oficial.
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -ml-32 -mb-32 rounded-full"></div>
            </div>
        </div>
    );
};

export default ApiTab;
