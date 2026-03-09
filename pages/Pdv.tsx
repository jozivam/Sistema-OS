import React, { useState, useMemo, useEffect } from 'react';
import { Search, Star, MoreHorizontal, Image as ImageIcon, Plus, Minus, ToggleRight, ToggleLeft, User, CreditCard, Banknote, QrCode, Percent, Trash2, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { isTrialUser, getTrialCustomers } from '../services/trialService';
import { Customer } from '../types';

const AwningIcon = () => (
    <svg width="180" height="180" viewBox="0 0 24 24" fill="#e0e7ff" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 8.5L4 3.5C4.2 2.8 4.8 2.5 5.5 2.5h13c.7 0 1.3.3 1.5 1L21.5 8.5v1.5A3.5 3.5 0 0 1 18 13.5a3.5 3.5 0 0 1-2.5-1A3.5 3.5 0 0 1 13 13.5a3.5 3.5 0 0 1-2.6-1.1c-.6.6-1.5 1.1-2.4 1.1A3.5 3.5 0 0 1 5.5 12.5a3.5 3.5 0 0 1-3-3.5V8.5z" />
        <path d="M5.5 12.5V19C5.5 20.1 6.4 21 7.5 21h9c1.1 0 2-.9 2-2v-6.5h-3v4H8.5v-4h-3z" />
    </svg>
);

// Removendo mocks antigos

interface CartItem {
    id: string;
    cartId: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    unidadeMedida: string;
    origem_id: string; // Depósito de onde sai o item
}

const Pdv: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'produto' | 'cliente' | 'pagamento'>('produto');
    const [companyId, setCompanyId] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [financeAccounts, setFinanceAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');




    // Produto State
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [inputQuantity, setInputQuantity] = useState<string>('1.00');
    const [inputDiscount, setInputDiscount] = useState<string>('0.00');
    const [inputComment, setInputComment] = useState('');
    const [isItemGarantia, setIsItemGarantia] = useState(false);

    // Vendas State (Busca na tarja azul)
    const [vendaSearch, setVendaSearch] = useState('');
    const [historySales, setHistorySales] = useState<any[]>([]);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Cliente State
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customersList, setCustomersList] = useState<Customer[]>([]);
    const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
    const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);


    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const user = await authService.getCurrentUser();
                if (!user) return;
                setCurrentUser(user);
                setCompanyId(user.companyId || '');

                // Carregamento direto dos produtos da tabela (Fonte: EstoqueProdutos)
                try {
                    const pData = await dbService.getProducts(user.companyId!);
                    setProductsList(pData || []);
                } catch (err) {
                    console.error("Erro ao carregar produtos:", err);
                }



                try {
                    const accData = await dbService.getFinanceAccounts(user.companyId!);
                    setFinanceAccounts(accData || []);
                    if (accData && accData.length > 0) setSelectedAccountId(accData[0].id);
                } catch (err) {
                    console.warn("Módulo financeiro ainda não configurado ou tabelas ausentes:", err);
                }



                const trial = isTrialUser(user);
                if (trial) {
                    setCustomersList(getTrialCustomers());
                } else if (user.companyId) {
                    const [fetchedCustomers, fetchedVendas] = await Promise.all([
                        dbService.getCustomers(user.companyId),
                        dbService.getVendas(user.companyId)
                    ]);
                    setCustomersList(fetchedCustomers || []);
                    setHistorySales(fetchedVendas || []);
                }

                // Busca Locais de Estoque para Saída do PDV
                try {
                    const locs = await dbService.getStorageLocations(user.companyId!);
                    const mainLoc = locs.find(l => l.nome.toLowerCase().includes('matriz') || l.nome.toLowerCase().includes('sede')) || locs[0];
                    if (mainLoc) (window as any)._defaultPdvDepositId = mainLoc.id;
                } catch (err) {
                    console.error("Erro ao carregar locais de estoque:", err);
                }
            } catch (error) {
                console.error("Erro ao carregar dados do PDV:", error);
            }
        };
        loadInitialData();
    }, []);

    // Pagamento State
    const [selectedPayments, setSelectedPayments] = useState<{ mode: string, amount: number, account_id: string }[]>([]);

    const [paymentAmountInput, setPaymentAmountInput] = useState<string>('0.00');
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO' | 'VALE' | null>(null);
    const [creditMachineFee, setCreditMachineFee] = useState<string>('0.00');
    const [creditInstallments, setCreditInstallments] = useState(1);

    // Global Cart
    const [cart, setCart] = useState<CartItem[]>([]);

    // Cálculos Atuais do Produto
    const parsedQty = parseFloat(inputQuantity.replace(',', '.')) || 1;
    const parsedDisc = parseFloat(inputDiscount.replace(',', '.')) || 0;
    const currentPrice = isItemGarantia ? 0 : (selectedProduct?.price || 0);
    const discountValue = currentPrice * (parsedDisc / 100);
    const finalUnitPrice = currentPrice - discountValue;
    const currentSubtotal = finalUnitPrice * parsedQty;


    // Cálculos do Carrinho e Pagamento
    const headCartTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
    const feePercentage = parseFloat(creditMachineFee.replace(',', '.')) || 0;
    const addedFee = selectedPaymentMode === 'CREDITO' ? (headCartTotal * feePercentage) / 100 : 0;
    const ultimateTotal = headCartTotal + addedFee;


    // Histórico de Preço
    const lastPriceBought = useMemo(() => {
        if (!selectedCustomer || !selectedProduct || !historySales.length) return null;

        // Busca em todas as vendas pelo cliente (v.cliente_id vindo do Supabase sem mapeamento)
        const customerSales = historySales.filter(v => (v.cliente_id || v.customer_id) === selectedCustomer.id);

        for (const sale of customerSales) {
            // v.venda_itens incluído via query no dbService
            const items = sale.venda_itens || sale.itens || [];
            const item = items.find((i: any) => (i.product_id || i.produto_id) === selectedProduct.id);
            if (item) return parseFloat(item.preco_unitario || item.precoUnitario || 0);
        }
        return null;
    }, [selectedCustomer, selectedProduct, historySales]);


    // Lógica de Pagamentos Mistos
    const totalPaid = selectedPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const balanceRemaining = Math.max(0, ultimateTotal - totalPaid);

    const handleAddPayment = () => {
        if (!selectedPaymentMode) return;
        const amount = parseFloat(paymentAmountInput.replace(',', '.')) || 0;
        if (amount <= 0) return;

        // Validação de Crédito Interno
        if (selectedPaymentMode === 'VALE') {
            if (!selectedCustomer) {
                alert('Selecione um cliente para utilizar Crédito Interno.');
                return;
            }
            const credit = (selectedCustomer as any).credit_balance || 0;
            if (amount > credit) {
                alert(`Saldo insuficiente! Crédito disponível: R$ ${credit.toFixed(2)}`);
                return;
            }
        }

        setSelectedPayments(prev => [...prev, {
            mode: selectedPaymentMode,
            amount,
            account_id: selectedAccountId
        }]);
        setPaymentAmountInput('0.00');
    };


    const removePayment = (index: number) => {
        setSelectedPayments(prev => prev.filter((_, i) => i !== index));
    };

    // Ações de Busca
    const filteredProducts = (productSearch.trim().length > 0 || isProductSearchFocused)
        ? productsList.filter(p =>
            p.nome.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        )
        : [];

    const filteredCustomers = (customerSearch.trim().length > 0 || isCustomerSearchFocused)
        ? customersList.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.document && c.document.replace(/\D/g, '').includes(customerSearch.replace(/\D/g, ''))))
        : [];


    const filteredVendas = vendaSearch.trim().length > 0
        ? historySales.filter(v =>
            v.id.toLowerCase().includes(vendaSearch.toLowerCase()) ||
            (v.customers?.name && v.customers.name.toLowerCase().includes(vendaSearch.toLowerCase()))
        )
        : [];

    // Helper para extrair primeira imagem de forma robusta
    const getProductFirstImage = (p: any) => {
        if (!p.imagens) return null;
        if (Array.isArray(p.imagens) && p.imagens.length > 0) return p.imagens[0];
        if (typeof p.imagens === 'string') {
            if (p.imagens.startsWith('[')) {
                try {
                    const parsed = JSON.parse(p.imagens);
                    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
                } catch { return null; }
            }
            return p.imagens.length > 0 ? p.imagens : null;
        }
        return null;
    };

    const handleSelectProduct = (p: any) => {
        // Parsing de todas as imagens para os detalhes
        let allImgs: string[] = [];
        if (Array.isArray(p.imagens)) {
            allImgs = p.imagens;
        } else if (typeof p.imagens === 'string') {
            if (p.imagens.startsWith('[')) {
                try {
                    const parsed = JSON.parse(p.imagens);
                    allImgs = Array.isArray(parsed) ? parsed : [p.imagens];
                } catch { allImgs = [p.imagens]; }
            } else if (p.imagens.length > 0) {
                allImgs = [p.imagens];
            }
        }

        setSelectedProduct({
            id: p.id,
            name: p.nome,
            sku: p.sku || 'N/A',
            brand: p.marca || '---',
            weight: p.peso ? `${p.peso}kg` : '---',
            size: (p.altura && p.largura) ? `${p.altura}x${p.largura}x${p.comprimento || 0}cm` : '---',
            stock: Number(p.quantidadeEstoque ?? p.quantidade_estoque) || 0,
            price: Number(p.precoVenda) || 0,
            unidadeMedida: p.unidadeMedida || 'UN',
            imagens: allImgs
        } as any);

        setProductSearch('');
        setIsProductSearchFocused(false);
        setInputQuantity('1.00');
        setInputDiscount('0.00');
    };




    const handleCancelVenda = () => {
        if (cart.length > 0 && !window.confirm('Deseja realmente cancelar a venda atual? Todos os itens serão removidos.')) {
            return;
        }
        setCart([]);
        setSelectedCustomer(null);
        setSelectedProduct(null);
        setSelectedPayments([]);
        setProductSearch('');
        setIsProductSearchFocused(false);
        setInputQuantity('1.00');
        setInputDiscount('0.00');
        setCreditMachineFee('0.00');
        setCreditInstallments(1);
        setActiveTab('produto');
    };


    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setCustomerSearch('');
        setIsCustomerSearchFocused(false);
    };

    const handleAddToCart = () => {
        if (!selectedProduct) {
            alert("Selecione um produto para adicionar ao carrinho.");
            return;
        }

        if (parsedQty > (selectedProduct.stock || 0)) {
            alert(`Estoque insuficiente! Saldo disponível: ${selectedProduct.stock}`);
            return;
        }


        // Verifica se já tem no carrinho
        const existingIdx = cart.findIndex(c => c.id === selectedProduct.id);

        if (existingIdx >= 0) {
            const updatedCart = [...cart];
            const newTotalQty = updatedCart[existingIdx].quantity + parsedQty;

            if (newTotalQty > (selectedProduct.stock || 0)) {
                alert(`A soma dos itens no carrinho excede o estoque disponível (${selectedProduct.stock})`);
                return;
            }

            updatedCart[existingIdx].quantity = newTotalQty;
            updatedCart[existingIdx].subtotal = (updatedCart[existingIdx].price * (1 - updatedCart[existingIdx].discount / 100)) * updatedCart[existingIdx].quantity;
            setCart(updatedCart);
        } else {
            setCart(prev => [...prev, {
                id: selectedProduct.id,
                cartId: Math.random().toString(36).substr(2, 9),
                name: selectedProduct.name,
                price: currentPrice, // Usa o preço calculado (0 se garantia)
                unidadeMedida: (selectedProduct as any).unidadeMedida,
                quantity: parsedQty,
                discount: parsedDisc,
                subtotal: currentSubtotal,
                isGarantia: isItemGarantia
            }]);
        }

        // Reset inputs
        setSelectedProduct(null);
        setProductSearch('');
        setInputQuantity('1.00');
        setInputDiscount('0.00');
        setInputComment('');
        setIsItemGarantia(false);
    };

    const [isFinalizing, setIsFinalizing] = useState(false);
    const handleFinalizarVenda = async () => {
        if (cart.length === 0) return;
        if (balanceRemaining > 0.01) {
            alert(`Ainda resta R$ ${balanceRemaining.toFixed(2)} a ser pago.`);
            return;
        }

        try {
            setIsFinalizing(true);
            const total = ultimateTotal;

            const vendaData = {
                company_id: companyId,
                customer_id: selectedCustomer?.id || null,
                subtotal: headCartTotal,
                desconto_total: cart.reduce((acc, item) => acc + (item.price * (item.discount / 100) * item.quantity), 0),
                total: total,
                status: 'confirmada',
                payment_methods: selectedPayments, // Enviando array de pagamentos
                user_id: currentUser?.id,
                user_name: currentUser?.name
            };

            await dbService.createVenda(vendaData, cart.map(item => ({
                produto_id: item.id,
                quantidade: item.quantity,
                preco_unitario: item.price,
                desconto: item.discount,
                total: item.subtotal,
                origem_id: (window as any)._defaultPdvDepositId || null
            })));


            alert('Venda finalizada com sucesso!');

            // Reset UI
            setCart([]);
            setSelectedCustomer(null);
            setSelectedPayments([]);
            setPaymentAmountInput('0.00');
            setSelectedPaymentMode(null);
            setActiveTab('produto');

            // Recarrega produtos para ver o estoque novo
            const pData = await dbService.getProducts(companyId);
            setProductsList(pData);

        } catch (error: any) {
            console.error("Erro completo ao finalizar venda:", error);
            alert("Erro ao finalizar venda. " + (error?.message || error?.details || ''));
        } finally {
            setIsFinalizing(false);
        }
    };




    return (
        <div className="h-[calc(100vh-80px)] flex flex-col font-sans bg-[#e6ecef]">

            {/* Top Header - Main Indigo Bar */}
            <div className="bg-indigo-600 h-[52px] flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
                <div className="text-white font-bold text-xl tracking-wide">Venda</div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 bg-indigo-700/50 p-1 px-3 rounded-lg border border-white/10 w-[400px] relative">
                        <input
                            type="text"
                            placeholder="Buscar venda por cliente ou ID..."
                            className="bg-transparent border-none text-white placeholder:text-indigo-200 text-sm w-full outline-none font-medium"
                            value={vendaSearch}
                            onChange={e => setVendaSearch(e.target.value)}
                        />
                        <Search size={16} className="text-white opacity-70 cursor-pointer hover:opacity-100" />

                        {/* Dropdown de Resultados de Vendas */}
                        {filteredVendas.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-80 overflow-y-auto">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendas Encontradas</span>
                                </div>
                                {filteredVendas.map(v => (
                                    <div
                                        key={v.id}
                                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors group"
                                        onClick={() => {
                                            alert(`Carregando venda: ${v.id.slice(0, 8)}... (Feature em dev)`);
                                            setVendaSearch('');
                                        }}
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{v.customers?.name || 'Cliente Balcão'}</h4>
                                            <p className="text-[11px] font-medium text-slate-500">ID: {v.id.slice(0, 8)} • {new Date(v.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-indigo-600 text-sm">R$ {parseFloat(v.total).toFixed(2)}</p>
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">{v.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="text-white hover:bg-white/20 rounded p-1.5 flex items-center justify-center transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Split Content */}
            <div className="flex flex-1 overflow-hidden bg-white">

                {/* LEFT PANEL */}
                <div className="flex-[1.1] flex flex-col border-r border-gray-300 min-w-[500px] bg-white z-10">

                    {/* Tabs / Breadcrumbs (Chevron Arrow Format) */}
                    <div className="flex h-10 px-4 mt-4 select-none shrink-0">
                        <button
                            onClick={() => setActiveTab('produto')}
                            className={`flex-1 flex flex-col justify-center items-center font-bold text-sm relative transition-colors ${activeTab === 'produto' ? 'bg-indigo-600 text-white z-20 shadow-md' : 'bg-[#e2e8f0] text-gray-500 hover:bg-[#cbd5e1] z-10 border border-transparent hover:border-slate-300'}`}
                            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)' }}
                        >
                            Produto
                        </button>

                        <button
                            onClick={() => setActiveTab('cliente')}
                            className={`flex-1 flex flex-col justify-center items-center font-bold text-sm relative -ml-4 transition-colors ${activeTab === 'cliente' ? 'bg-indigo-600 text-white z-20 shadow-md' : 'bg-[#e2e8f0] text-gray-500 hover:bg-[#cbd5e1] z-10 border border-transparent hover:border-slate-300'}`}
                            style={{ clipPath: 'polygon(16px 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0 50%)' }}
                        >
                            <span className="ml-2">Cliente</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('pagamento')}
                            className={`flex-1 flex flex-col justify-center items-center font-bold text-sm relative -ml-4 transition-colors ${activeTab === 'pagamento' ? 'bg-indigo-600 text-white z-20 shadow-md' : 'bg-[#e2e8f0] text-gray-500 hover:bg-[#cbd5e1] z-0 border border-transparent hover:border-slate-300'}`}
                            style={{ clipPath: 'polygon(16px 0, 100% 0, 100% 100%, 16px 100%, 0 50%)' }}
                        >
                            <span className="ml-2">Pagamento</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 pr-6 custom-scrollbar relative">

                        {/* ==================================================== */}
                        {/* ABA DE PRODUTO */}
                        {/* ==================================================== */}
                        {activeTab === 'produto' && (
                            <div className="flex flex-col h-full animate-in fade-in duration-200">
                                <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0">
                                            <Search size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Seleção de Itens</h3>
                                        </div>

                                    </div>

                                    <div className="h-8 w-px bg-slate-200" />

                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Modo PDV</span>
                                        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-emerald-200">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On-line
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Busca Universal c/ Sugestões */}
                                <div className="relative mb-2 shrink-0">
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        onFocus={() => setIsProductSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsProductSearchFocused(false), 200)}
                                        placeholder="Pesquise por código, descrição ou GTIN"
                                        className="w-full border-2 border-slate-200 rounded-lg pl-4 pr-10 py-3 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium placeholder:text-gray-400"
                                    />

                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600" size={20} />

                                    {/* Lista de Sugestões de Produto */}
                                    {filteredProducts.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {filteredProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleSelectProduct(p)}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                            {getProductFirstImage(p) ? (
                                                                <img src={getProductFirstImage(p)!} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon size={16} className="text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 text-sm leading-tight">{p.nome}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">SKU: {p.sku || 'N/A'}</span>
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${Number(p.quantidadeEstoque) <= 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                    Estoque: {p.quantidadeEstoque} {p.unidadeMedida || 'UN'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-800 text-sm">R$ {(p.precoVenda || 0).toFixed(2)}</p>
                                                    </div>
                                                </div>

                                            ))}
                                        </div>
                                    )}

                                </div>

                                {/* Removendo Row 3 antiga e adicionando cabeçalho de detalhes se produto selecionado */}
                                {selectedProduct && (
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Detalhes do Produto</h3>
                                        </div>
                                        <button
                                            onClick={() => setIsDetailsOpen(true)}
                                            className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <MoreHorizontal size={16} /> Ver ficha técnica completa
                                        </button>
                                    </div>
                                )}

                                {/* Row 4: Área Detalhes Produto Selecionado vs Placeholder */}
                                <div className="flex gap-6 mb-8 min-h-[224px] border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                                    {!selectedProduct ? (
                                        <>
                                            <div className="w-48 h-48 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white shrink-0 shadow-sm">
                                                <ImageIcon className="text-gray-300" size={64} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                                <Search size={32} className="mb-2 opacity-50" />
                                                <span className="text-sm font-medium text-center">Pesquise ou bipe um produto<br />para exibir os detalhes da ficha técnica.</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-48 h-48 border border-slate-200 rounded-xl flex items-center justify-center bg-white shrink-0 overflow-hidden shadow-sm relative group p-1">
                                                {selectedProduct.imagens && selectedProduct.imagens.length > 0 ? (
                                                    <img
                                                        src={selectedProduct.imagens[0]}
                                                        alt={selectedProduct.name}
                                                        className="w-full h-full object-contain rounded-lg"
                                                    />
                                                ) : (
                                                    <>
                                                        <ImageIcon className="text-slate-200" size={64} />
                                                        <div className="absolute inset-x-0 bottom-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1">
                                                            Imagem Indisponível
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="flex justify-between items-start">
                                                    <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tight">{selectedProduct.name}</h2>
                                                    {lastPriceBought !== null && (
                                                        <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-right">
                                                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Última compra do cliente</p>
                                                            <p className="text-sm font-black text-amber-700">R$ {Number(lastPriceBought).toFixed(2)}</p>
                                                        </div>
                                                    )}

                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded uppercase tracking-wider">SKU: {selectedProduct.sku}</span>
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded uppercase tracking-wider">Estoque: {selectedProduct.stock} cx</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-2 text-sm mt-2">
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Marca:</span> <span className="font-bold text-slate-700">{selectedProduct.brand}</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Peso:</span> <span className="font-bold text-slate-700">{selectedProduct.weight}</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Tamanho:</span> <span className="font-bold text-slate-700">{selectedProduct.size}</span></div>

                                                    {/* Toggle Garantia */}
                                                    <div className="flex items-center gap-3 mt-2 col-span-2 pt-2 border-t border-slate-100">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={isItemGarantia} onChange={() => setIsItemGarantia(!isItemGarantia)} />
                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                                            <span className="ml-3 text-xs font-black text-slate-700 uppercase tracking-widest">Ativar Garantia (R$ 0,00)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Row 5: Quantificadores Oficiais */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {/* Quantidade */}
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5 flex justify-between">
                                            Quantidade
                                            <span className="text-[10px] text-indigo-500">{selectedProduct ? `(Máx: ${selectedProduct.stock})` : ''}</span>
                                        </label>
                                        <div className="flex h-[38px] w-full shadow-sm">
                                            <button
                                                onClick={() => {
                                                    const val = Math.max(1, parseFloat(inputQuantity) - 1);
                                                    setInputQuantity(val.toFixed(2));
                                                }}
                                                disabled={!selectedProduct}
                                                className="w-10 border-y-2 border-l-2 border-slate-200 bg-white rounded-l-lg flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-colors disabled:text-slate-300 disabled:bg-slate-50">
                                                <Minus size={16} strokeWidth={2.5} />
                                            </button>
                                            <input
                                                type="text"
                                                className="w-[calc(100%-80px)] border-2 border-slate-200 bg-white focus:bg-indigo-50 focus:border-indigo-500 text-center text-sm font-bold text-slate-800 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                                value={inputQuantity}
                                                onChange={e => setInputQuantity(e.target.value.replace(/[^0-9.,]/g, ''))}
                                                onFocus={e => { if (e.target.value === '1.00') setInputQuantity(''); }}
                                                onBlur={e => { if (!e.target.value) setInputQuantity('1.00'); }}
                                                disabled={!selectedProduct}
                                            />
                                            <button
                                                onClick={() => {
                                                    const val = Math.min(selectedProduct?.stock || 999, parseFloat(inputQuantity) + 1);
                                                    setInputQuantity(val.toFixed(2));
                                                }}
                                                disabled={!selectedProduct}
                                                className="w-10 border-y-2 border-r-2 border-slate-200 bg-white rounded-r-lg flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-colors disabled:text-slate-300 disabled:bg-slate-50">
                                                <Plus size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desconto */}
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Desconto</label>
                                        <div className="flex h-[38px] shadow-sm">
                                            <input
                                                type="text"
                                                value={inputDiscount}
                                                onChange={e => setInputDiscount(e.target.value.replace(/[^0-9.,]/g, ''))}
                                                onFocus={e => { if (e.target.value === '0.00') setInputDiscount(''); }}
                                                onBlur={e => { if (!e.target.value) setInputDiscount('0.00'); }}
                                                disabled={!selectedProduct}
                                                className="w-full border-y-2 border-l-2 border-slate-200 bg-white rounded-l-lg px-3 text-right text-sm font-bold outline-none focus:border-indigo-600 focus:bg-indigo-50 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                            />
                                            <div className="w-10 shrink-0 border-y-2 border-r-2 border-slate-200 bg-slate-50 rounded-r-lg flex items-center justify-center text-slate-400 font-bold text-sm">
                                                %
                                            </div>
                                        </div>
                                    </div>

                                    {/* Valor Un */}
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Valor unitário</label>
                                        <div className="h-[38px] shadow-sm">
                                            <input type="text" className="w-full h-full border-2 border-slate-200 bg-slate-100 rounded-lg px-3 text-right text-sm font-bold outline-none text-slate-500 cursor-not-allowed" value={(finalUnitPrice || 0).toFixed(2)} readOnly />
                                        </div>
                                    </div>

                                    {/* Sub T */}
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Sub total líquido</label>
                                        <div className="h-[38px] shadow-sm relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                            <input type="text" className="w-full h-full border-2 border-slate-200 bg-emerald-50 text-emerald-700 rounded-lg pl-8 pr-3 text-right text-lg font-black outline-none cursor-not-allowed" value={(currentSubtotal || 0).toFixed(2)} readOnly />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 6: Comment & Action Button */}
                                <div className="flex flex-col gap-4 mt-auto">
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Comentário Específico</label>
                                        <textarea
                                            className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-medium outline-none resize-none h-16 focus:border-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
                                            placeholder="Detalhes opcionais para este item na OS/Nota..."
                                            value={inputComment}
                                            onChange={e => setInputComment(e.target.value)}
                                            disabled={!selectedProduct}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={!selectedProduct}
                                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-lg rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        <Plus size={24} strokeWidth={3} /> INCLUIR ITEM NA COMPRA
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* ABA DE CLIENTE */}
                        {/* ==================================================== */}
                        {activeTab === 'cliente' && (
                            <div className="flex flex-col h-full animate-in fade-in duration-200">

                                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-6 flex items-start gap-4">
                                    <div className="mt-1 bg-white p-2 rounded-lg text-indigo-600 shadow-sm shrink-0"><User size={24} /></div>
                                    <div>
                                        <h3 className="font-black text-indigo-900 mb-1">Identificação do Comprador</h3>
                                        <p className="text-sm font-medium text-indigo-700">Pesquise o cliente registrado para vincular os produtos e facilitar a emissão de nota fiscal ou ordem de serviço conjunta.</p>
                                    </div>
                                </div>

                                {/* Busca Cliente */}
                                <div className="relative mb-6">
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        onFocus={() => setIsCustomerSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 200)}
                                        placeholder="Pesquise por Nome Completo, Razão Social, ou CPF/CNPJ..."
                                        className="w-full border-2 border-slate-200 rounded-xl pl-4 pr-10 py-4 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-semibold placeholder:text-gray-400"
                                    />

                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600" size={24} />

                                    {/* Lista de Sugestões de Clientes */}
                                    {filteredCustomers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {filteredCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => handleSelectCustomer(c)}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center group"
                                                >
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                                                        <p className="text-[12px] font-medium text-slate-500 mt-0.5">Doc: {c.document} | Tel: {c.phone}</p>
                                                    </div>
                                                    <button className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Selecionar</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Cliente Selecionado Card */}
                                {selectedCustomer ? (
                                    <div className="border-2 border-emerald-500 bg-emerald-50 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                                            Cliente Vinculado
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-white border-2 border-emerald-200 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                                                <User size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedCustomer.name}</h2>
                                                <div className="space-y-1 mt-3 text-sm font-medium text-slate-600">
                                                    <p><span className="font-bold text-slate-400 mr-2 uppercase text-[10px] tracking-widest">Documento</span> {selectedCustomer.document}</p>
                                                    <p><span className="font-bold text-slate-400 mr-2 uppercase text-[10px] tracking-widest">Contato</span> {selectedCustomer.phone}</p>
                                                    <p><span className="font-bold text-slate-400 mr-2 uppercase text-[10px] tracking-widest">Endereço</span> {selectedCustomer.address}</p>

                                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Crédito Interno Disponível</p>
                                                            <p className="text-xl font-black text-amber-700">R$ {(selectedCustomer as any).credit_balance?.toFixed(2) || '0.00'}</p>
                                                        </div>
                                                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                                                            <Star size={20} fill="currentColor" />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCustomer(null)}
                                            className="mt-6 w-full py-2.5 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all text-sm"
                                        >
                                            Remover Vínculo de Cliente
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 p-8 text-center">
                                        <User size={48} className="mb-4 opacity-50" />
                                        <p className="font-bold text-slate-600 mb-1">Nenhum cliente vinculado</p>
                                        <p className="text-sm font-medium">Você pode faturar como Cliente Balcão diretamente ou pesquisar acima para associar.</p>
                                    </div>
                                )}

                            </div>
                        )}

                        {/* ==================================================== */}
                        {/* ABA DE PAGAMENTO */}
                        {/* ==================================================== */}
                        {activeTab === 'pagamento' && (
                            <div className="flex flex-col h-full animate-in fade-in duration-200">

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-1 text-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Receber</p>
                                            <p className="text-3xl font-black text-indigo-600">R$ {(ultimateTotal || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="flex-1 text-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Restante</p>
                                            <p className={`text-3xl font-black ${balanceRemaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                R$ {balanceRemaining.toFixed(2)}
                                            </p>
                                        </div>
                                        {totalPaid > ultimateTotal + 0.01 && (
                                            <div className="flex-1 text-center bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm animate-bounce-short">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Troco</p>
                                                <p className="text-3xl font-black text-emerald-700">R$ {(totalPaid - ultimateTotal).toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>


                                    <div>
                                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center">
                                            Formas de Pagamento
                                            {totalPaid > 0 && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px]">Pago: R$ {totalPaid.toFixed(2)}</span>}
                                        </h3>
                                        <div className="grid grid-cols-5 gap-2 mb-4">
                                            <button onClick={() => { setSelectedPaymentMode('DINHEIRO'); setPaymentAmountInput(balanceRemaining.toFixed(2)); }} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${selectedPaymentMode === 'DINHEIRO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                                <Banknote size={20} /> <span className="text-[10px] font-bold">Dinheiro</span>
                                            </button>
                                            <button onClick={() => { setSelectedPaymentMode('PIX'); setPaymentAmountInput(balanceRemaining.toFixed(2)); }} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${selectedPaymentMode === 'PIX' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                                <QrCode size={20} /> <span className="text-[10px] font-bold">PIX</span>
                                            </button>
                                            <button onClick={() => { setSelectedPaymentMode('DEBITO'); setPaymentAmountInput(balanceRemaining.toFixed(2)); }} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${selectedPaymentMode === 'DEBITO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                                <CreditCard size={20} /> <span className="text-[10px] font-bold">Débito</span>
                                            </button>
                                            <button onClick={() => { setSelectedPaymentMode('CREDITO'); setPaymentAmountInput(balanceRemaining.toFixed(2)); }} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${selectedPaymentMode === 'CREDITO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                                <CreditCard size={20} /> <span className="text-[10px] font-bold">Crédito</span>
                                            </button>
                                            <button onClick={() => { setSelectedPaymentMode('VALE'); setPaymentAmountInput(balanceRemaining.toFixed(2)); }} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${selectedPaymentMode === 'VALE' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                                <User size={20} /> <span className="text-[10px] font-bold">Vale/Crédito</span>
                                            </button>
                                        </div>

                                        {selectedPaymentMode && (
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex gap-3 items-end">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor para {selectedPaymentMode}</label>
                                                        <input
                                                            type="text"
                                                            value={paymentAmountInput}
                                                            onChange={e => setPaymentAmountInput(e.target.value)}
                                                            className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 font-black text-slate-700 outline-none focus:border-indigo-600"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleAddPayment}
                                                        className="h-[44px] px-6 bg-indigo-600 text-white font-black rounded-lg hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest shadow-lg shadow-indigo-200"
                                                    >
                                                        Adicionar
                                                    </button>
                                                </div>

                                                {selectedPaymentMode === 'CREDITO' && (
                                                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Parcelas</label>
                                                            <select value={creditInstallments} onChange={e => setCreditInstallments(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold font-mono">
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Taxa (%)</label>
                                                            <input type="text" value={creditMachineFee} onChange={e => setCreditMachineFee(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold font-mono" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-4 border-t border-slate-200 pt-4">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Conta Financeira (Destino)</label>
                                                    <select
                                                        value={selectedAccountId}
                                                        onChange={e => setSelectedAccountId(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold text-slate-700"
                                                    >
                                                        {financeAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name} (Sal: R$ {acc.current_balance?.toFixed(2)})</option>
                                                        ))}
                                                        {financeAccounts.length === 0 && <option value="">Nenhuma conta ativa</option>}
                                                    </select>
                                                </div>

                                            </div>
                                        )}

                                        {/* Lista de Pagamentos Adicionados */}
                                        <div className="space-y-2">
                                            {selectedPayments.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                                            {p.mode === 'DINHEIRO' ? <Banknote size={16} /> : p.mode === 'PIX' ? <QrCode size={16} /> : p.mode === 'VALE' ? <User size={16} /> : <CreditCard size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{p.mode}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">Confirmado</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-800">R$ {p.amount.toFixed(2)}</span>
                                                        <button onClick={() => removePayment(i)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Bottom Buttons Action */}
                    <div className="border-t border-gray-200 px-6 py-4 flex gap-4 bg-white shrink-0 z-20">
                        <button
                            onClick={handleCancelVenda}
                            className="flex-1 border-2 border-slate-300 text-slate-600 bg-white rounded-xl h-14 font-bold tracking-wide hover:border-slate-400 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Excluir Venda
                        </button>

                        <button
                            onClick={handleFinalizarVenda}
                            disabled={isFinalizing || cart.length === 0}
                            className="flex-[2] bg-indigo-600 text-white rounded-xl h-14 font-black tracking-wide hover:bg-indigo-700 transition-colors shadow-[0_5px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_5px_15px_rgba(79,70_229,0.5)] active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isFinalizing ? (
                                <span className="animate-pulse">FINALIZANDO...</span>
                            ) : (
                                <><CheckCircle2 size={24} strokeWidth={3} /> Finalizar Venda Total</>

                            )}
                        </button>
                    </div>

                </div>

                {/* RIGHT PANEL - CART & RECEIPT */}
                <div className="flex-[0.9] flex flex-col bg-slate-50 relative z-0">

                    {/* Items List Area */}
                    <div className="flex-1 flex flex-col pt-4 overflow-y-auto custom-scrollbar relative">
                        {cart.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center opacity-70">
                                <AwningIcon />
                            </div>
                        ) : (
                            <div className="px-6 space-y-3 pb-8">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4 bg-slate-200/50 py-1 rounded-full">Itens da Compra ({cart.length})</h3>
                                {cart.map((item, idx) => (
                                    <div key={item.cartId} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex gap-3 relative group">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{item.name}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.quantity} un x R$ {(item.price || 0).toFixed(2)}</span>
                                                <span className="font-black text-slate-800 text-[15px]">R$ {(item.subtotal || 0).toFixed(2)}</span>
                                            </div>
                                            {item.discount > 0 && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase">Desconto aplicado: {item.discount}%</p>}
                                        </div>
                                        <button
                                            onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))}
                                            className="absolute right-2 top-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedCustomer && cart.length > 0 && (
                        <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2">
                            <User size={14} className="text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-900 truncate">Vínculo: {selectedCustomer.name}</span>
                        </div>
                    )}

                    {/* Cart Footer */}
                    <div className="border-t border-slate-200 px-8 py-6 shrink-0 flex items-end justify-between bg-white shadow-[0_-5px_25px_-10px_rgba(0,0,0,0.1)] relative z-20 rounded-tl-3xl">
                        <div>
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest block mb-1">Total da Venda</span>
                            {addedFee > 0 && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Inclui {creditMachineFee}% máq. cartão</span>}
                        </div>
                        <span className="text-[3.5rem] leading-none font-black text-slate-800 tracking-tighter">
                            <span className="text-xl text-slate-400 mr-1">R$</span>{(ultimateTotal || 0).toFixed(2)}
                        </span>
                    </div>

                </div>

            </div>

            {/* ==================================================== */}
            {/* DRAWER LATERAL DE DETALHES DO PRODUTO */}
            {/* ==================================================== */}
            <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.15)] z-[100] transform transition-transform duration-500 ease-out border-l border-slate-200 ${isDetailsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedProduct && (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-indigo-900 text-xl tracking-tighter">FICHA TÉCNICA</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Especificações Completas</p>
                            </div>
                            <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {/* Imagem em Destaque */}
                            <div className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-8 overflow-hidden group relative">
                                {selectedProduct.imagens && selectedProduct.imagens.length > 0 ? (
                                    <img src={selectedProduct.imagens[0]} alt={selectedProduct.name} className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon size={80} className="text-slate-200" />
                                )}
                            </div>

                            {/* Informações Primárias */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px] block mb-1">Nome Comercial</label>
                                    <h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedProduct.name}</h2>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">SKU do Sistema</label>
                                        <p className="font-mono font-bold text-slate-700">{selectedProduct.sku}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Marca / Fabricante</label>
                                        <p className="font-bold text-slate-700 uppercase">{selectedProduct.brand}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Star size={14} className="text-amber-400 fill-amber-400" /> ATRIBUTOS FÍSICOS
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-medium text-slate-500">Peso Estimado</span>
                                            <span className="text-sm font-black text-slate-800">{selectedProduct.weight}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-medium text-slate-500">Dimensões (AxLxC)</span>
                                            <span className="text-sm font-black text-slate-800">{selectedProduct.size}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-sm font-medium text-slate-500">Unidade de Medida</span>
                                            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedProduct.unidadeMedida}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Banknote size={14} className="text-emerald-500" /> INFORMAÇÕES DE VENDA
                                    </h4>
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                                        <span className="text-sm font-bold text-emerald-700">Preço de Venda Unitário</span>
                                        <span className="text-xl font-black text-emerald-800">R$ {selectedProduct.price.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                        <span className="text-sm font-bold text-indigo-700">Saldo Disponível (Matriz)</span>
                                        <span className="text-xl font-black text-indigo-800">{selectedProduct.stock} {selectedProduct.unidadeMedida}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="w-full py-4 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-900 transition-all shadow-lg active:scale-[0.98]"
                            >
                                FECHAR DETALHES
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay para fechar drawer ao clicar fora */}
            {isDetailsOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[90] animate-in fade-in duration-300"
                    onClick={() => setIsDetailsOpen(false)}
                />
            )}
        </div>
    );
};

export default Pdv;
