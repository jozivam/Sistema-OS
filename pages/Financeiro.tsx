
import React, { useState, useEffect } from 'react';
import {
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Plus,
    Filter,
    Search,
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    Calendar,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    XCircle,
    User,
    Building2,
    Star
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Financeiro: React.FC = () => {
    // States
    const [accounts, setAccounts] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'credits'>('overview');
    const [customersWithCredit, setCustomersWithCredit] = useState<any[]>([]);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [selectedCustomerForCredit, setSelectedCustomerForCredit] = useState<string>('');
    const [creditAmountInput, setCreditAmountInput] = useState('0.00');


    // Summary States
    const [totalBalance, setTotalBalance] = useState(0);
    const [totalIncomes, setTotalIncomes] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const currentUser = await (await import('../services/authService')).authService.getCurrentUser();
        if (!currentUser?.companyId) return;

        setLoading(true);
        try {
            const companyId = currentUser.companyId;

            // Carregar Contas
            try {
                const fetchedAccounts = await dbService.getFinanceAccounts(companyId);
                setAccounts(fetchedAccounts);
                const balance = (fetchedAccounts || []).reduce((acc, curr) => acc + (Number(curr.current_balance) || 0), 0);
                setTotalBalance(balance);
            } catch (err) {
                console.warn("Tabela finance_accounts não encontrada.");
                setAccounts([]);
                setTotalBalance(0);
            }

            // Carregar Transações
            try {
                const fetchedTransactions = await dbService.getFinanceTransactions(companyId);
                setTransactions(fetchedTransactions);

                const incomes = (fetchedTransactions || [])
                    .filter(t => t.type === 'INCOME' && t.status === 'PAID')
                    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                setTotalIncomes(incomes);

                const expenses = (fetchedTransactions || [])
                    .filter(t => t.type === 'EXPENSE' && t.status === 'PAID')
                    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                setTotalExpenses(expenses);
            } catch (err) {
                console.warn("Tabela finance_transactions não encontrada.");
                setTransactions([]);
                setTotalIncomes(0);
                setTotalExpenses(0);
            }


            // Carregar Clientes com Crédito
            const allCustomers = await dbService.getCustomers(companyId);
            setCustomersWithCredit(allCustomers.filter(c => (Number((c as any).credit_balance) || 0) !== 0));
            setAllCustomers(allCustomers);

        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCredit = async () => {

        if (!selectedCustomerForCredit || Number(creditAmountInput) <= 0) return;

        try {
            const customer = allCustomers.find(c => c.id === selectedCustomerForCredit);
            if (!customer) {
                alert('Cliente não encontrado.');
                return;
            }
            const currentCredit = Number((customer as any).credit_balance || 0);
            const newBalance = currentCredit + Number(creditAmountInput);

            await dbService.updateCustomerCredit(selectedCustomerForCredit, newBalance);

            // Logar uma transação de entrada para rastreio
            await dbService.createFinanceTransaction({
                company_id: customer.companyId,
                type: 'INCOME',
                category_id: (await dbService.getFinanceCategories(customer.companyId)).find(cat => cat.name === 'OUTROS')?.id,
                amount: Number(creditAmountInput),
                description: `CRÉDITO AVULSO: ${customer.name}`,
                due_date: new Date().toISOString(),
                status: 'PAID'
            });

            setIsCreditModalOpen(false);
            setCreditAmountInput('0.00');
            loadData();
        } catch (error) {
            alert('Erro ao salvar crédito.');
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Finanças...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">

            {/* Header / Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Saldo Geral */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                <Wallet size={24} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-indigo-100">Patrimônio Líquido</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter mb-1">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                        <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 mt-4">
                            <TrendingUp size={14} /> +12.5% este mês
                        </div>
                    </div>
                </div>

                {/* Receitas */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group hover:border-emerald-200 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                <ArrowUpCircle size={24} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 transition-all">Receitas do Mês</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">R$ {totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    </div>
                    <div className="mt-6 flex gap-2">
                        <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[65%]" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">Previsão: 80%</span>
                    </div>
                </div>

                {/* Despesas */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group hover:border-rose-200 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                                <ArrowDownCircle size={24} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-400 group-hover:text-rose-600 transition-all">Despesas do Mês</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                    </div>
                    <div className="mt-6 flex gap-2">
                        <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[40%]" />
                        </div>
                        <span className="text-[10px] font-black text-rose-600 uppercase">Gasto: 40%</span>
                    </div>
                </div>

            </div>

            {/* Sub-tab Navigation */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveSection('overview')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeSection === 'overview' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Visão Geral
                    {activeSection === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />}
                </button>
                <button
                    onClick={() => setActiveSection('credits')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeSection === 'credits' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Créditos de Clientes
                    {activeSection === 'credits' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />}
                </button>
            </div>

            {activeSection === 'overview' ? (
                <div className="flex flex-col gap-8 animate-in slide-in-from-left duration-500">
                    {/* Sub-Section: Accounts Carousel & Fast Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Accounts List */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    Minhas Contas <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{accounts.length}</span>
                                </h3>
                                <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                    Gerenciar Contas <ArrowRightLeft size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {accounts.map(acc => (
                                    <div key={acc.id} className="bg-white border-2 border-slate-100 p-5 rounded-2xl hover:border-indigo-100 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-lg ${acc.type === 'BANK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {acc.type === 'BANK' ? <Building2 size={18} /> : <Wallet size={18} />}
                                            </div>
                                            <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal size={18} /></button>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{acc.name}</p>
                                        <h4 className="text-xl font-black text-slate-800 tracking-tight">R$ {acc.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                    </div>
                                ))}
                                <button className="border-2 border-dashed border-slate-200 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">Nova Conta</span>
                                </button>
                            </div>
                        </div>

                        {/* Fast Actions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight px-2">Ações Rápidas</h3>
                            <button className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                                <Plus size={20} strokeWidth={3} /> Nova Receita
                            </button>
                            <button className="w-full h-16 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <ArrowDownCircle size={20} strokeWidth={3} /> Nova Despesa
                            </button>
                        </div>
                    </div>

                    {/* Main Transactions Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        {/* Table Header / Filters */}
                        <div className="p-8 border-b border-slate-50 flex flex-wrap justify-between items-center gap-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Movimentações</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fluxo de caixa consolidado de todas as contas</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar transação..."
                                        className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 w-60 transition-all"
                                    />
                                </div>
                                <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                    <Filter size={18} /> Filtros
                                </button>
                                <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                    <Calendar size={18} /> Março
                                </button>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data Venc.</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transactions.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {t.type === 'INCOME' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{t.description}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ref ID: {t.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{t.category?.name || 'Geral'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-bold text-slate-600">{t.account?.name || '---'}</p>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <p className="text-xs font-bold text-slate-600">{format(new Date(t.due_date), 'dd MMM', { locale: ptBR })}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    {t.status === 'PAID' ? (
                                                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                            <CheckCircle2 size={12} strokeWidth={3} /> Pago
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                            <Clock size={12} strokeWidth={3} /> Pendente
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-8 py-5 text-right font-black text-sm tracking-tight ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'} R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Pagination */}
                        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center px-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mostrando {transactions.length} transações</p>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">Anterior</button>
                                <button className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">Próximo</button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in slide-in-from-right duration-500">
                    {/* Seção de Créditos de Clientes */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-amber-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Créditos de Clientes</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gerencie saldos de devoluções e adiantamentos</p>
                            </div>
                            <button
                                onClick={() => setIsCreditModalOpen(true)}
                                className="h-12 bg-amber-500 hover:bg-amber-600 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-100 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} /> Gerar Novo Crédito
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Atualização</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo Disponível</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {customersWithCredit.map(c => (
                                        <tr key={c.id} className="hover:bg-amber-50/30 transition-colors cursor-pointer group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                                        <User size={18} />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">{c.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="text-xs font-bold text-slate-500">{c.document}</span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="text-xs font-bold text-slate-400 italic">Automático via Sistema</span>
                                            </td>
                                            <td className="px-8 py-5 text-right align-middle">
                                                <span className="font-black text-amber-600 text-lg">R$ {Number((c as any).credit_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {customersWithCredit.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                                                Nenhum cliente com saldo de crédito no momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Crédito Premium */}
            {isCreditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-gradient-to-br from-amber-500 to-amber-600 text-white relative">
                            <h3 className="text-2xl font-black tracking-tight mb-1">Novo Vale Crédito</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Adicione saldo na carteira interna do cliente</p>
                            <button
                                onClick={() => setIsCreditModalOpen(false)}
                                className="absolute top-8 right-8 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Selecionar Cliente</label>
                                <select
                                    value={selectedCustomerForCredit}
                                    onChange={(e) => setSelectedCustomerForCredit(e.target.value)}
                                    className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-700 outline-none focus:border-amber-500 transition-all"
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {allCustomers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor do Crédito (R$)</label>
                                <input
                                    type="text"
                                    value={creditAmountInput}
                                    onChange={(e) => setCreditAmountInput(e.target.value)}
                                    className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-black text-2xl text-slate-800 outline-none focus:border-amber-500 transition-all text-center"
                                    placeholder="0,00"
                                />
                            </div>

                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                                <Clock className="text-amber-600 shrink-0" size={18} />
                                <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                                    Este valor ficará disponível imediatamente para uso no PDV como forma de pagamento "VALE".
                                </p>
                            </div>

                            <button
                                onClick={handleSaveCredit}
                                disabled={!selectedCustomerForCredit || Number(creditAmountInput) <= 0}
                                className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-95"
                            >
                                Confirmar e Liberar Crédito
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financeiro;

