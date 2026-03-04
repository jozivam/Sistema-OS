import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Camera, Package, Truck, BarChart3, Tag, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { Product, Supplier } from '../types';

export default function EstoqueProdutos() {
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const initialForm = {
        nome: '',
        descricao: '',
        sku: '',
        precoVenda: 0,
        valorCompra: 0,
        margemLucro: 0,
        quantidadeEstoque: 0,
        ean: '',
        ncm: '',
        peso: 0,
        altura: 0,
        largura: 0,
        comprimento: 0,
        categoria: 'Equipamentos',
        marca: '',
        fornecedorId: '',
        seoTitle: '',
        seoDescription: '',
        status: 'ACTIVE' as const
    };

    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        const loadInitialData = async () => {
            const user = await authService.getCurrentUser();
            if (user?.companyId) {
                setCompanyId(user.companyId);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [companyId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [pData, sData] = await Promise.all([
                dbService.getProducts(companyId!),
                dbService.getSuppliers(companyId!)
            ]);
            setProducts(pData);
            setSuppliers(sData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateSellingPrice = (buy: number, margin: number) => {
        if (!buy) return 0;
        return buy * (1 + margin / 100);
    };

    const handleBuyPriceChange = (value: number) => {
        const newPrice = calculateSellingPrice(value, formData.margemLucro);
        setFormData({ ...formData, valorCompra: value, precoVenda: Number(newPrice.toFixed(2)) });
    };

    const handleMarginChange = (value: number) => {
        const newPrice = calculateSellingPrice(formData.valorCompra, value);
        setFormData({ ...formData, margemLucro: value, precoVenda: Number(newPrice.toFixed(2)) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await dbService.updateProduct(isEditing, formData);
            } else {
                await dbService.createProduct({
                    ...formData,
                    companyId: companyId!
                });
            }
            setIsModalOpen(false);
            setFormData(initialForm);
            setIsEditing(null);
            loadData();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert("Erro ao salvar produto. Verifique se as tabelas foram criadas no Supabase.");
        }
    };

    const handleEdit = (p: Product) => {
        setFormData({
            nome: p.nome,
            descricao: p.descricao || '',
            sku: p.sku,
            precoVenda: p.precoVenda,
            valorCompra: p.valorCompra || 0,
            margemLucro: p.margemLucro || 0,
            quantidadeEstoque: p.quantidadeEstoque,
            ean: p.ean || '',
            ncm: p.ncm || '',
            peso: p.peso || 0,
            altura: p.altura || 0,
            largura: p.largura || 0,
            comprimento: p.comprimento || 0,
            categoria: p.categoria || 'Equipamentos',
            marca: p.marca || '',
            fornecedorId: p.fornecedorId || '',
            seoTitle: p.seoTitle || '',
            seoDescription: p.seoDescription || '',
            status: p.status
        });
        setIsEditing(p.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Deseja realmente excluir este produto?")) {
            await dbService.deleteProduct(id);
            loadData();
        }
    };

    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Catálogo de Produtos
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        Gestão Completa de Itens, Preços e Logística
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setFormData(initialForm);
                            setIsEditing(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-sm shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95"
                    >
                        <Plus size={20} />
                        NOVO PRODUTO
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Itens', value: products.length, icon: Package, color: 'blue' },
                    { label: 'Em Estoque', value: products.reduce((acc, p) => acc + p.quantidadeEstoque, 0), icon: BarChart3, color: 'emerald' },
                    { label: 'Categorias', value: new Set(products.map(p => p.categoria)).size, icon: Tag, color: 'amber' },
                    { label: 'Valor em Estoque', value: `R$ ${products.reduce((acc, p) => acc + (p.quantidadeEstoque * (p.valorCompra || 0)), 0).toLocaleString()}`, icon: Truck, color: 'indigo' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm">
                        <Filter size={18} />
                        Filtros Avançados
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Produto / SKU</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Categoria</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Financeiro</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Estoque</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-20 text-center font-bold text-slate-400">Carregando catálogo...</td></tr>
                            ) : filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <ImageIcon size={24} />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.nome}</div>
                                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{p.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                                            {p.categoria}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-black text-slate-900">R$ {p.precoVenda.toFixed(2)}</div>
                                        <div className="text-[10px] font-bold text-slate-400">Margem: {p.margemLucro}%</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`text-lg font-black ${p.quantidadeEstoque < 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {p.quantidadeEstoque}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {p.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(p)} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-2xl transition-all shadow-sm">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                    {isEditing ? 'Editar Produto' : 'Novo Produto'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                                    Configure todos os detalhes técnicos e comerciais
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all flex items-center justify-center">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                            {/* Sessão 1: Identificação e Fotos */}
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-4">Identificação e Apresentação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome do Produto *</label>
                                            <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm" placeholder="Ex: Roteador Wireless Gigabit AC1200" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Descrição Técnica / Benefícios</label>
                                            <textarea rows={3} value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm" placeholder="Especificações técnicas, o que acompanha, garantia..." />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Imagens (4-6 sugestão)</label>
                                        <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all cursor-pointer group">
                                            <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Upload de Fotos</span>
                                            <span className="text-[9px] font-bold mt-1 text-slate-400">Max 10MB por arquivo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 2: Financeiro */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-4">Comercial e Financeiro</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Custo de Compra (R$)</label>
                                        <input type="number" step="0.01" value={formData.valorCompra} onChange={e => handleBuyPriceChange(Number(e.target.value))} className="w-full px-5 py-3.5 bg-emerald-50/30 border-2 border-emerald-100/50 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Margem de Lucro (%)</label>
                                        <input type="number" step="0.1" value={formData.margemLucro} onChange={e => handleMarginChange(Number(e.target.value))} className="w-full px-5 py-3.5 bg-amber-50/30 border-2 border-amber-100/50 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-black text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Preço Sugerido para Venda (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-emerald-600">R$</span>
                                            <input type="number" step="0.01" value={formData.precoVenda} onChange={e => setFormData({ ...formData, precoVenda: Number(e.target.value) })} className="w-full pl-12 pr-5 py-3.5 bg-blue-600 text-white border-none rounded-2xl outline-none shadow-lg shadow-blue-200 font-black text-lg" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 3: Logística e Identificação Única */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-4">Logística e Rastreamento</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                    {['SKU', 'EAN / Barcode', 'NCM (Fiscal)', 'Quantidade'].map((label, i) => (
                                        <div key={i}>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</label>
                                            <input
                                                type={label === 'Quantidade' ? 'number' : 'text'}
                                                value={label === 'SKU' ? formData.sku : label === 'EAN / Barcode' ? formData.ean : label === 'NCM (Fiscal)' ? formData.ncm : formData.quantidadeEstoque}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (label === 'SKU') setFormData({ ...formData, sku: val });
                                                    if (label === 'EAN / Barcode') setFormData({ ...formData, ean: val });
                                                    if (label === 'NCM (Fiscal)') setFormData({ ...formData, ncm: val });
                                                    if (label === 'Quantidade') setFormData({ ...formData, quantidadeEstoque: Number(val) });
                                                }}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-bold text-center text-sm uppercase"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {['Peso (Kg)', 'Altura (cm)', 'Largura (cm)', 'Compr. (cm)'].map((label, i) => (
                                        <div key={i}>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest text-center">{label}</label>
                                            <input
                                                type="number" step="0.01"
                                                value={label.startsWith('Peso') ? formData.peso : label.startsWith('Altura') ? formData.altura : label.startsWith('Largura') ? formData.largura : formData.comprimento}
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    if (label.startsWith('Peso')) setFormData({ ...formData, peso: val });
                                                    if (label.startsWith('Altura')) setFormData({ ...formData, altura: val });
                                                    if (label.startsWith('Largura')) setFormData({ ...formData, largura: val });
                                                    if (label.startsWith('Compr.')) setFormData({ ...formData, comprimento: val });
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-center text-xs font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sessão 4: Tags e Supplier */}
                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-4">Organização e SEO</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Fornecedor Preferencial</label>
                                        <select value={formData.fornecedorId} onChange={e => setFormData({ ...formData, fornecedorId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm transition-all">
                                            <option value="">Selecione um fornecedor...</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Categoria</label>
                                        <input type="text" value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Marca</label>
                                        <input type="text" value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm" />
                                    </div>
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Meta Title (SEO)</label>
                                            <input type="text" value={formData.seoTitle} onChange={e => setFormData({ ...formData, seoTitle: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Meta Description (SEO)</label>
                                            <input type="text" value={formData.seoDescription} onChange={e => setFormData({ ...formData, seoDescription: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-400 font-bold text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3.5 font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest text-xs"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-xs shadow-lg shadow-blue-200 uppercase tracking-[0.2em] hover:scale-[1.05] active:scale-95"
                            >
                                {isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
