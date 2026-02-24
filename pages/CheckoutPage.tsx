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

    const [formData, setFormData] = useState({
        companyName: '',
        document: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        userName: '',
        adminEmail: '',
        password: '',
        cardHolder: '',
        cardNumber: '',
        expiryDate: '',
        cvv: ''
    });

    const prices: any = {
        OURO: { MENSAL: 97, TRIMESTRAL: 276.45, SEMESTRAL: 523.80, ANUAL: 989.40 },
        DIAMANTE: { MENSAL: 197, TRIMESTRAL: 561.45, SEMESTRAL: 1063.80, ANUAL: 2009.40 }
    };

    const currentPrice = prices[plan]?.[period] || 0;

    // MÁSCARAS DE FORMATAÇÃO
    const formatDocument = (v: string) => {
        const val = v.replace(/\D/g, '');
        if (val.length <= 11) {
            return val.replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .substring(0, 14);
        }
        return val.replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .substring(0, 18);
    };

    const formatPhone = (v: string) => {
        const val = v.replace(/\D/g, '');
        return val.replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'document') finalValue = formatDocument(value);
        if (name === 'phone') finalValue = formatPhone(value);

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleProcessOrder = async () => {
        setLoading(true);
        try {
            const { supabase } = await import('../services/dbService').then(m => m.dbService as any);

            const { data, error } = await supabase.functions.invoke('process-checkout', {
                body: {
                    companyData: {
                        name: formData.companyName,
                        document: formData.document,
                        email: formData.email,
                        phone: formData.phone,
                        address: `${formData.address}${formData.city ? ', ' + formData.city : ''}`,
                        plan: plan
                    },
                    userData: {
                        name: formData.userName,
                        adminEmail: formData.adminEmail,
                        password: formData.password
                    },
                    paymentData: {
                        method: paymentMethod,
                        cardHolder: formData.cardHolder,
                        cardNumber: formData.cardNumber ? formData.cardNumber.replace(/\s/g, '') : '',
                        expiryDate: formData.expiryDate,
                        brand: 'Visa',
                        period: period,
                        amount: currentPrice
                    }
                }
            });

            if (error) {
                console.error("Erro da Edge Function (Raw):", error);

                // Tentar extrair detalhes do corpo da resposta (se disponível)
                let errorMsg = error.message;
                if (error instanceof Error && (error as any).context) {
                    try {
                        const body = await (error as any).context.json();
                        if (body && body.details) errorMsg = `${body.error}: ${body.details}`;
                        else if (body && body.error) errorMsg = body.error;
                    } catch (e) {
                        console.warn("Não foi possível processar o corpo do erro:", e);
                    }
                }
                throw new Error(errorMsg || "Erro desconhecido ao processar.");
            }

            setStep(3);
        } catch (error: any) {
            console.error("Erro no checkout:", error);
            alert("Erro ao processar: " + (error.message || "Verifique os dados e tente novamente."));
        } finally {
            setLoading(false);
        }
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
                                            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-bold" placeholder="Ex: TechReparo LTDA" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">CNPJ / CPF</label>
                                            <input type="text" name="document" value={formData.document} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="000.000.000-00 ou 0.000.000/0000-00" maxLength={18} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">E-mail Administrativo</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all lowercase" placeholder="adm@empresa.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">WhatsApp / Telefone</label>
                                            <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="(00) 00000-0000" maxLength={15} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Endereço</label>
                                            <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="Rua, Número, Bairro" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Cidade</label>
                                            <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="Ex: São Paulo" />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 space-y-6">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <i className="fa-solid fa-user-shield text-blue-500" /> Acesso ao Sistema
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Nome Completo (Admin)</label>
                                                <input type="text" name="userName" value={formData.userName} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="Seu Nome" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">E-mail de Acesso (Login)</label>
                                                <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all lowercase" placeholder="Ex: admin@seu-login.com" />
                                                <p className="text-[10px] text-blue-400 mt-1 italic">* Use este e-mail para entrar no sistema.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Senha de Acesso</label>
                                                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all" placeholder="••••••••" />
                                            </div>
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
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Nome no Cartão</label>
                                                <input type="text" name="cardHolder" value={formData.cardHolder} onChange={handleInputChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all uppercase" placeholder="NOME COMO NO CARTÃO" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Número do Cartão</label>
                                                <input type="text" name="cardNumber" value={formData.cardNumber} onChange={(e) => {
                                                    const v = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                                                    setFormData({ ...formData, cardNumber: v });
                                                }} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="0000 0000 0000 0000" maxLength={19} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Validade</label>
                                                    <input type="text" name="expiryDate" value={formData.expiryDate} onChange={(e) => {
                                                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1/');
                                                        setFormData({ ...formData, expiryDate: v });
                                                    }} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="MM/AA" maxLength={5} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">CVV</label>
                                                    <input type="text" name="cvv" value={formData.cvv} onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono" placeholder="123" maxLength={4} />
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
