import React, { useState } from 'react';
import { ShoppingCart, Search, User, CreditCard, Banknote, QrCode, X, Plus, Minus, Tag, Store } from 'lucide-react';
import { Customer } from '../types';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    stock: number;
}

const MOCK_PRODUCTS: CartItem[] = [
    { id: '1', name: 'Roteador Wi-Fi 6', price: 299.90, quantity: 1, stock: 15 },
    { id: '2', name: 'Conector RJ45 (Pacote 100)', price: 45.00, quantity: 1, stock: 50 },
    { id: '3', name: 'Cabo de Rede CAT6 (Metro)', price: 3.50, quantity: 1, stock: 1000 },
    { id: '4', name: 'Antena Externa 5Ghz', price: 150.00, quantity: 1, stock: 8 },
];

const Pdv: React.FC = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [customerDoc, setCustomerDoc] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<'PIX' | 'CREDIT' | 'DEBIT' | 'CASH'>('PIX');

    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);

    const addToCart = (product: CartItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleFinishSale = () => {
        if (cart.length === 0) return;
        setShowCheckout(true);
    };

    const confirmPayment = () => {
        // Aqui vai a integração real de persistência Financeira e Estoque
        setCheckoutSuccess(true);
        setTimeout(() => {
            setCart([]);
            setCustomerDoc('');
            setCustomerName('');
            setCheckoutSuccess(false);
            setShowCheckout(false);
        }, 3000);
    };

    // Filtro simples de mock
    const filteredProducts = MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="h-[calc(100vh-80px)] md:h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">

            {/* ── Esquerda: Produtos e Busca (70%) ── */}
            <div className="flex-[3] flex flex-col h-full overflow-hidden border-r border-slate-200 bg-slate-50/50">

                {/* Topbar Busca */}
                <div className="p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-4 max-w-2xl">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                            <Store className="w-6 h-6" />
                        </div>
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar produto por nome ou código de barras..."
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* Grade de Produtos */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left flex flex-col gap-3 group"
                            >
                                <div className="w-full aspect-video bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                    <Tag className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[40px]">{product.name}</h3>
                                    <div className="mt-2 flex items-end justify-between">
                                        <span className="font-black text-indigo-600 text-lg">R$ {product.price.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{product.stock} em est.</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Direita: Carrinho e Checkout (30%) ── */}
            <div className="flex-[2] md:max-w-md w-full bg-white flex flex-col h-full shadow-2xl relative z-20">

                {/* Cabeçalho Carrinho */}
                <div className="p-6 border-b border-slate-100 shrink-0 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6 text-indigo-400" />
                        <h2 className="font-black text-xl tracking-tight">Caixa Livre</h2>
                    </div>
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{totalItems} itens</span>
                </div>

                {/* Cliente Avançado */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Identificação (Opcional)</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="CPF / CNPJ"
                            value={customerDoc}
                            onChange={e => setCustomerDoc(e.target.value)}
                            className="w-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Nome do Cliente Balcão"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Itens do Carrinho */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                            <ShoppingCart className="w-16 h-16 opacity-50" />
                            <p className="font-semibold text-sm">O carrinho está vazio</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                                        <span className="text-indigo-600 font-black text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><Minus className="w-3 h-3" /></button>
                                            <span className="w-8 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><Plus className="w-3 h-3" /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Área de Total e Botão Pagar */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Total a Pagar</span>
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">
                            <span className="text-lg mr-1 text-slate-400 font-bold">R$</span>
                            {cartTotal.toFixed(2)}
                        </span>
                    </div>

                    <button
                        onClick={handleFinishSale}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/30 transition-all flex justify-center items-center gap-3 transform active:scale-[0.98]"
                    >
                        FINALIZAR VENDA <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>

            {/* ── Modal de Checkout (Pagamento) ── */}
            {showCheckout && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop Escuro */}
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !checkoutSuccess && setShowCheckout(false)} />

                    <div className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">

                        {!checkoutSuccess ? (
                            <>
                                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                                    <h2 className="text-2xl font-black flex items-center gap-3"><ShoppingCart className="w-6 h-6" /> Pagamento</h2>
                                    <button onClick={() => setShowCheckout(false)} className="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-8 flex gap-8">
                                    {/* Opções de Pagamento */}
                                    <div className="flex-1 space-y-3">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Método de Pagamento</h3>

                                        <button onClick={() => setSelectedPayment('PIX')} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedPayment === 'PIX' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-600'}`}>
                                            <QrCode className={`w-6 h-6 ${selectedPayment === 'PIX' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-lg">PIX Instântaneo</span>
                                            {selectedPayment === 'PIX' && <i className="fa-solid fa-circle-check text-indigo-600 ml-auto"></i>}
                                        </button>

                                        <button onClick={() => setSelectedPayment('CREDIT')} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedPayment === 'CREDIT' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-600'}`}>
                                            <CreditCard className={`w-6 h-6 ${selectedPayment === 'CREDIT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-lg">Cartão de Crédito</span>
                                            {selectedPayment === 'CREDIT' && <i className="fa-solid fa-circle-check text-indigo-600 ml-auto"></i>}
                                        </button>

                                        <button onClick={() => setSelectedPayment('DEBIT')} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedPayment === 'DEBIT' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-600'}`}>
                                            <CreditCard className={`w-6 h-6 ${selectedPayment === 'DEBIT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-lg">Cartão de Débito</span>
                                            {selectedPayment === 'DEBIT' && <i className="fa-solid fa-circle-check text-indigo-600 ml-auto"></i>}
                                        </button>

                                        <button onClick={() => setSelectedPayment('CASH')} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedPayment === 'CASH' ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-600'}`}>
                                            <Banknote className={`w-6 h-6 ${selectedPayment === 'CASH' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className="font-bold text-lg">Dinheiro</span>
                                            {selectedPayment === 'CASH' && <i className="fa-solid fa-circle-check text-indigo-600 ml-auto"></i>}
                                        </button>
                                    </div>

                                    {/* Resumo da Venda */}
                                    <div className="w-[280px] bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <p className="text-center text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Valor a Pagar</p>
                                            <p className="text-center text-5xl font-black text-slate-800 tracking-tighter mb-6">
                                                <span className="text-xl text-slate-400 mr-1">R$</span>{cartTotal.toFixed(2)}
                                            </p>

                                            <div className="space-y-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                                    <span className="font-bold text-slate-800">R$ {cartTotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-b border-dashed border-slate-200 pb-4">
                                                    <span className="text-slate-500 font-medium">Itens</span>
                                                    <span className="font-bold text-slate-800">{totalItems} unid.</span>
                                                </div>
                                                {customerName && (
                                                    <div className="pt-2">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Cliente Vinculado</span>
                                                        <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 block truncate">{customerName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button onClick={confirmPayment} className="w-full py-4 mt-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all text-lg transform active:scale-95">
                                            CONFIRMAR PAGAMENTO
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-16 flex flex-col items-center justify-center text-center bg-white">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <i className="fa-solid fa-check text-5xl"></i>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Venda Concluída!</h2>
                                <p className="text-slate-500 font-medium max-w-xs leading-relaxed">A transação financeira e a baixa de estoque foram registradas com sucesso.</p>

                                <p className="mt-8 text-xs font-bold text-slate-300 uppercase tracking-widest animate-pulse">Retornando ao caixa...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default Pdv;
