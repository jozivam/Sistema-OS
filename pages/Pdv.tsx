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

// Mocks
interface Product {
    id: string;
    name: string;
    sku: string;
    brand: string;
    weight: string;
    size: string;
    stock: number;
    price: number;
    imageUrl?: string;
}

const MOCK_PRODUCTS: Product[] = [
    { id: '1', name: 'Roteador Wi-Fi 6 AX1500', sku: 'RT-1500', brand: 'TP-Link', weight: '0.5 kg', size: '20x15 cm', stock: 12, price: 349.90 },
    { id: '2', name: 'Bobina de Cabo de Rede CAT6 (Metro)', sku: 'CB-CAT6', brand: 'Furukawa', weight: '0.1 kg', size: 'Métrico', stock: 1540, price: 4.50 },
    { id: '3', name: 'Conector RJ45 CAT6 (Pacote 100)', sku: 'RJ-100P', brand: 'Intelbras', weight: '0.2 kg', size: 'Padrão', stock: 25, price: 85.00 },
];

interface CartItem extends Product {
    cartId: string;
    quantity: number;
    discount: number;
    subtotal: number;
}

const Pdv: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'produto' | 'cliente' | 'pagamento'>('produto');
    const [barcodeReader, setBarcodeReader] = useState(true);

    // Produto State
    const [productSearch, setProductSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [inputQuantity, setInputQuantity] = useState<string>('1.00');
    const [inputDiscount, setInputDiscount] = useState<string>('0.00');
    const [inputComment, setInputComment] = useState('');

    // Cliente State
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const user = await authService.getCurrentUser();
                if (!user) return;
                const trial = isTrialUser(user);
                if (trial) {
                    setCustomersList(getTrialCustomers());
                } else if (user.companyId) {
                    const fetchedCustomers = await dbService.getCustomers(user.companyId);
                    setCustomersList(fetchedCustomers);
                }
            } catch (error) {
                console.error("Erro ao carregar clientes do PDV:", error);
            }
        };
        loadCustomers();
    }, []);

    // Pagamento State
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO' | null>(null);
    const [creditMachineFee, setCreditMachineFee] = useState<string>('0.00');
    const [creditInstallments, setCreditInstallments] = useState(1);

    // Global Cart
    const [cart, setCart] = useState<CartItem[]>([]);

    // Cálculos Atuais do Produto
    const parsedQty = parseFloat(inputQuantity.replace(',', '.')) || 1;
    const parsedDisc = parseFloat(inputDiscount.replace(',', '.')) || 0;
    const currentPrice = selectedProduct?.price || 0;
    const discountValue = currentPrice * (parsedDisc / 100);
    const finalUnitPrice = currentPrice - discountValue;
    const currentSubtotal = finalUnitPrice * parsedQty;

    // Ações de Busca
    const filteredProducts = productSearch.trim().length > 0
        ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        : [];

    const filteredCustomers = customerSearch.trim().length > 0
        ? customersList.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.document && c.document.replace(/\D/g, '').includes(customerSearch.replace(/\D/g, ''))))
        : [];

    const handleSelectProduct = (p: Product) => {
        setSelectedProduct(p);
        setProductSearch('');
        setInputQuantity('1.00');
        setInputDiscount('0.00');
    };

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setCustomerSearch('');
    };

    const handleAddToCart = () => {
        if (!selectedProduct) return;
        setCart(prev => [...prev, {
            ...selectedProduct,
            cartId: Math.random().toString(36).substr(2, 9),
            quantity: parsedQty,
            discount: parsedDisc,
            subtotal: currentSubtotal
        }]);
        // Reset inputs
        setSelectedProduct(null);
        setInputQuantity('1.00');
        setInputDiscount('0.00');
        setInputComment('');
    };

    const headCartTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
    const feePercentage = parseFloat(creditMachineFee.replace(',', '.')) || 0;
    const addedFee = selectedPaymentMode === 'CREDITO' ? (headCartTotal * feePercentage) / 100 : 0;
    const ultimateTotal = headCartTotal + addedFee;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col font-sans bg-[#e6ecef]">

            {/* Top Header - Main Indigo Bar */}
            <div className="bg-indigo-600 h-[52px] flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
                <div className="text-white font-bold text-xl tracking-wide">Venda</div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded h-8 px-2 w-[350px]">
                        <input
                            type="text"
                            placeholder="Buscar venda..."
                            className="flex-1 border-none outline-none text-sm text-gray-700 bg-transparent"
                        />
                        <Search size={16} className="text-indigo-600 cursor-pointer" />
                    </div>

                    <button className="bg-white text-indigo-600 px-4 h-8 rounded font-bold text-sm hover:bg-gray-50 flex items-center shadow-sm">
                        Nova venda
                    </button>

                    <button className="text-white hover:bg-white/20 rounded p-1 flex items-center justify-center transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
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
                                {/* Row 1: Lista e Leitor */}
                                <div className="flex justify-between items-end mb-5">
                                    <div className="w-[45%]">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Lista de preço</label>
                                        <select className="w-full border-2 border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-600 appearance-none font-medium bg-white">
                                            <option>Tabela Padrão (Geral)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Leitor de código de barras</label>
                                        <div
                                            className="flex items-center gap-2 cursor-pointer self-end"
                                            onClick={() => setBarcodeReader(!barcodeReader)}
                                        >
                                            {barcodeReader ?
                                                <ToggleRight className="text-indigo-600" size={36} strokeWidth={1.5} /> :
                                                <ToggleLeft className="text-gray-400" size={36} strokeWidth={1.5} />
                                            }
                                            <span className="text-[13px] font-semibold text-gray-500 select-none">
                                                {barcodeReader ? 'Ativado' : 'Desativado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Busca Universal c/ Sugestões */}
                                <div className="relative mb-2 shrink-0">
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
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
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm">{p.name}</h4>
                                                        <span className="text-[11px] font-mono font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase">SKU: {p.sku}</span>
                                                    </div>
                                                    <span className="font-black text-slate-800">R$ {p.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Row 3: Botoes Pesquisa/Favoritos */}
                                <div className="flex justify-between items-center mb-6 mt-4">
                                    <button className="flex items-center gap-2 border-2 border-slate-200 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                                        <Star size={18} /> Ver favoritos
                                    </button>
                                    <button className="flex items-center gap-1.5 text-indigo-600 text-sm font-bold hover:opacity-80 transition-opacity">
                                        <Search size={16} /> Pesquisa avançada
                                    </button>
                                </div>

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
                                            <div className="w-48 h-48 border border-slate-200 rounded-xl flex items-center justify-center bg-white shrink-0 overflow-hidden shadow-sm relative group p-2">
                                                <ImageIcon className="text-slate-200" size={64} />
                                                <div className="absolute inset-x-0 bottom-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1">
                                                    Imagem Indisponível
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tight">{selectedProduct.name}</h2>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded uppercase tracking-wider">SKU: {selectedProduct.sku}</span>
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded uppercase tracking-wider">Estoque: {selectedProduct.stock} cx</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-2 text-sm mt-2">
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Marca:</span> <span className="font-bold text-slate-700">{selectedProduct.brand}</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Peso:</span> <span className="font-bold text-slate-700">{selectedProduct.weight}</span></div>
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-slate-500">Tamanho:</span> <span className="font-bold text-slate-700">{selectedProduct.size}</span></div>
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
                                            <input type="text" className="w-full h-full border-2 border-slate-200 bg-slate-100 rounded-lg px-3 text-right text-sm font-bold outline-none text-slate-500 cursor-not-allowed" value={finalUnitPrice.toFixed(2)} readOnly />
                                        </div>
                                    </div>

                                    {/* Sub T */}
                                    <div>
                                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Sub total líquido</label>
                                        <div className="h-[38px] shadow-sm relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                                            <input type="text" className="w-full h-full border-2 border-slate-200 bg-emerald-50 text-emerald-700 rounded-lg pl-8 pr-3 text-right text-lg font-black outline-none cursor-not-allowed" value={currentSubtotal.toFixed(2)} readOnly />
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

                                <div className="text-center mb-8">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total a Receber</p>
                                    <p className="text-6xl font-black text-indigo-600 tracking-tighter">
                                        <span className="text-2xl text-indigo-400 mr-1">R$</span>{ultimateTotal.toFixed(2)}
                                    </p>
                                </div>

                                <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">Opções de Pagamento</h3>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <button
                                        onClick={() => setSelectedPaymentMode('DINHEIRO')}
                                        className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${selectedPaymentMode === 'DINHEIRO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <Banknote size={28} /> Dinheiro
                                    </button>
                                    <button
                                        onClick={() => setSelectedPaymentMode('PIX')}
                                        className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${selectedPaymentMode === 'PIX' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <QrCode size={28} /> PIX Direto
                                    </button>
                                    <button
                                        onClick={() => setSelectedPaymentMode('DEBITO')}
                                        className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${selectedPaymentMode === 'DEBITO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <CreditCard size={28} /> C. Débito
                                    </button>
                                    <button
                                        onClick={() => setSelectedPaymentMode('CREDITO')}
                                        className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${selectedPaymentMode === 'CREDITO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <CreditCard size={28} /> C. Crédito
                                    </button>
                                </div>

                                {/* Configuração Extra Maquininha (Cartão de Crédito) */}
                                {selectedPaymentMode === 'CREDITO' && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner animate-in slide-in-from-top-4 fade-in duration-300 mt-[-10px] relative z-0">
                                        <div className="mb-4">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Taxa da Máquina de Cartão (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={creditMachineFee}
                                                    onChange={e => setCreditMachineFee(e.target.value.replace(/[^0-9.,]/g, ''))}
                                                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    placeholder="Ex: 2,5"
                                                />
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1.5">Esse percentual será adicionado ao total e repassado ao cliente.</p>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Opção de Parcelamento</label>
                                            <select
                                                value={creditInstallments}
                                                onChange={e => setCreditInstallments(Number(e.target.value))}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                    <option key={n} value={n}>{n}x de R$ {(ultimateTotal / n).toFixed(2)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Bottom Buttons Action */}
                    <div className="border-t border-gray-200 px-6 py-4 flex gap-4 bg-white shrink-0 z-20">
                        <button className="flex-1 border-2 border-slate-300 text-slate-600 bg-white rounded-xl h-14 font-bold tracking-wide hover:border-slate-400 hover:bg-slate-50 transition-colors shadow-sm">
                            Excluir Venda
                        </button>
                        <button className="flex-[2] bg-indigo-600 text-white rounded-xl h-14 font-black tracking-wide hover:bg-indigo-700 transition-colors shadow-[0_5px_15px_rgba(79,70,229,0.3)] hover:shadow-[0_5px_15px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center gap-2">
                            <CheckCircle2 strokeWidth={3} /> FINALIZAR VENDA
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
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.quantity} un x R$ {item.price.toFixed(2)}</span>
                                                <span className="font-black text-slate-800 text-[15px]">R$ {item.subtotal.toFixed(2)}</span>
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
                            <span className="text-xl text-slate-400 mr-1">R$</span>{ultimateTotal.toFixed(2)}
                        </span>
                    </div>

                </div>

            </div>

        </div>
    );
};

export default Pdv;
