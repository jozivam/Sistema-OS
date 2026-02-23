import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const CheckoutPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const plan = searchParams.get('plan') || 'DIAMANTE';
    const period = searchParams.get('period') || 'MENSAL';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PIX' | 'BOLETO'>('CARD');

    // Mock prices matching LandingPage
    const prices: any = {
        OURO: { MENSAL: 97, TRIMESTRAL: 276.45, SEMESTRAL: 523.80, ANUAL: 989.40 },
        DIAMANTE: { MENSAL: 197, TRIMESTRAL: 561.45, SEMESTRAL: 1063.80, ANUAL: 2009.40 }
    };

    const currentPrice = prices[plan]?.[period] || 0;
    const periodLabel = { MENSAL: 'mês', TRIMESTRAL: 'trimestre', SEMESTRAL: 'semestre', ANUAL: 'ano' }[period as keyof typeof prices.OURO] || 'mês';

    const handleProcessOrder = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStep(3);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white selection:bg-blue-500/30">
            {/* Header / Nav Simples */}
            <nav className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-folder-tree text-white text-sm" />
                    </div>
                    <span className="font-black text-lg tracking-tighter">OsRepo</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${step >= 1 ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700 text-slate-500'}`}>1</div>
                    <div className="h-px w-4 bg-slate-800" />
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${step >= 2 ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700 text-slate-500'}`}>2</div>
                    <div className="h-px w-4 bg-slate-800" />
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${step >= 3 ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700 text-slate-500'}`}>3</div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6 py-12 lg:py-20">

                {step < 3 && (
                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Coluna Esquerda: Formulário */}
                        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-black mb-2">Finalizar Contratação</h1>
                                <p className="text-slate-400">Complete os dados abaixo para ativar sua licença profissional.</p>
                            </div>

                            {step === 1 ? (
                                <section className="space-y-6 bg-white/5 border border-white/10 p-8 rounded-2xl">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <i className="fa-solid fa-building text-blue-500" /> Dados da Empresa
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Nome da Empresa</label>
                                            <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="Ex: TechReparo LTDA" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">CNPJ</label>
                                            <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="00.000.000/0000-00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">E-mail Administrativo</label>
                                            <input type="email" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="adm@empresa.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">WhatsApp / Telefone</label>
                                            <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="(00) 00000-0000" />
                                        </div>
                                    </div>
                                    <button onClick={() => setStep(2)} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 transition-all">
                                        Ir para Pagamento <i className="fa-solid fa-arrow-right ml-2" />
                                    </button>
                                </section>
                            ) : (
                                <section className="space-y-6 bg-white/5 border border-white/10 p-8 rounded-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <i className="fa-solid fa-credit-card text-blue-500" /> Forma de Pagamento
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <button onClick={() => setPaymentMethod('CARD')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'CARD' ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}>
                                            <i className="fa-solid fa-credit-card text-xl" />
                                            <span className="text-xs font-bold">Cartão</span>
                                        </button>
                                        <button onClick={() => setPaymentMethod('PIX')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'PIX' ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}>
                                            <i className="fa-brands fa-pix text-xl" />
                                            <span className="text-xs font-bold">PIX</span>
                                        </button>
                                        <button onClick={() => setPaymentMethod('BOLETO')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'BOLETO' ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}>
                                            <i className="fa-solid fa-barcode text-xl" />
                                            <span className="text-xs font-bold">Boleto</span>
                                        </button>
                                    </div>

                                    {paymentMethod === 'CARD' && (
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Número do Cartão</label>
                                                <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="0000 0000 0000 0000" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Validade</label>
                                                    <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="MM/AA" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">CVV</label>
                                                    <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="123" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'PIX' && (
                                        <div className="p-6 bg-slate-900/80 border border-white/5 rounded-2xl text-center space-y-4">
                                            <div className="w-32 h-32 bg-white mx-auto rounded-xl flex items-center justify-center">
                                                <i className="fa-solid fa-qrcode text-6xl text-slate-900" />
                                            </div>
                                            <p className="text-xs text-slate-400">O QR Code será gerado após clicar em concluir.</p>
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-white/10 font-bold text-xs uppercase hover:bg-white/5 transition-all">
                                            Voltar
                                        </button>
                                        <button onClick={handleProcessOrder} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50">
                                            {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2" /> Processando...</> : 'Finalizar e Ativar Plano'}
                                        </button>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Coluna Direita: Resumo */}
                        <div className="w-full lg:w-80 shrink-0">
                            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 p-6 rounded-2xl sticky top-24">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Resumo do Pedido</h3>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-blue-400">Plano {plan}</p>
                                            <p className="text-xs text-slate-500 capitalize">Recorrência {period.toLowerCase()}</p>
                                        </div>
                                        <p className="font-bold">R$ {currentPrice.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Taxa de Ativação</span>
                                        <span className="text-green-400 font-bold uppercase text-[10px]">Grátis</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="font-bold">Total Hoje</span>
                                        <span className="text-2xl font-black text-white">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tighter">O que está incluso:</p>
                                    <ul className="space-y-2">
                                        <li className="text-xs flex items-center gap-2 text-slate-300">
                                            <i className="fa-solid fa-check text-green-500 text-[10px]" />
                                            {plan === 'OURO' ? '2 Administradores' : '5 Administradores'}
                                        </li>
                                        <li className="text-xs flex items-center gap-2 text-slate-300">
                                            <i className="fa-solid fa-check text-green-500 text-[10px]" />
                                            Acesso Cloud Imediato
                                        </li>
                                        <li className="text-xs flex items-center gap-2 text-slate-300">
                                            <i className="fa-solid fa-check text-green-500 text-[10px]" />
                                            Suporte Técnico
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="max-w-xl mx-auto text-center py-20 animate-in zoom-in-95 duration-700">
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                            <i className="fa-solid fa-check text-4xl text-green-500" />
                        </div>
                        <h1 className="text-4xl font-black mb-4">Negócio Fechado!</h1>
                        <p className="text-slate-400 text-lg mb-10">
                            Parabéns! Sua empresa agora conta com o poder do **OsRepo**.
                            Enviamos os detalhes do acesso para o e-mail cadastrado.
                        </p>
                        <div className="space-y-4">
                            <button onClick={() => navigate('/login')} className="w-full bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-600/20 transition-all">
                                Acessar meu Painel Agora
                            </button>
                            <button onClick={() => navigate('/')} className="w-full p-5 text-slate-500 font-bold hover:text-white transition-colors">
                                Voltar para Home
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer className="max-w-6xl mx-auto p-6 pt-0 pb-12 text-center text-slate-600 text-xs">
                <div className="flex justify-center gap-8 mb-4">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-shield-halved" /> Ambiente 100% Seguro</span>
                    <span className="flex items-center gap-2"><i className="fa-solid fa-lock" /> SSL Encrypted</span>
                    <span className="flex items-center gap-2"><i className="fa-solid fa-medal" /> Garantia OsRepo</span>
                </div>
                <p>© 2026 OsRepo — Soluções Inteligentes para Prestadores de Serviço.</p>
            </footer>
        </div>
    );
};

export default CheckoutPage;
