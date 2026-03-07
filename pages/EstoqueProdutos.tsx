import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Camera, Package, Truck, BarChart3, Tag, Image as ImageIcon, CheckCircle2, AlertCircle, Warehouse, Box, Scale, DollarSign, Globe, Ruler, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { Product, Supplier, StorageLocation } from '../types';
import { SearchableSelect } from '../components/SearchableSelect';
import { supabase } from '../services/supabaseClient';

export default function EstoqueProdutos() {
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeletingProduct] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

    // Controle de Menus Dropdown (Combobox)
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const catDropdownRef = useRef<HTMLDivElement>(null);
    const brandDropdownRef = useRef<HTMLDivElement>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Upload e Refs
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Listas para Autocomplete
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);

    const initialForm = {
        nome: '',
        descricao: '',
        sku: '',
        precoVenda: 0,
        valorCompra: 0,
        margemLucro: 0,
        quantidadeEstoque: 0,
        unidadeMedida: 'UN' as const,
        ean: '',
        ncm: '',
        peso: 0,
        altura: 0,
        largura: 0,
        comprimento: 0,
        categoria: 'Equipamentos',
        marca: '',
        seoTitle: '',
        seoDescription: '',
        status: 'ACTIVE' as const,
        imagens: [] as string[]
    };

    const [formData, setFormData] = useState(initialForm);

    // Modal de Entrada (Pós-Cadastro)
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
    const [entryForm, setEntryForm] = useState({
        fornecedorId: '',
        documentRef: '',
        tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
        quantidade: 1,
        barcodes: [] as string[]
    });
    const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

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
            const [pData, sData, locData] = await Promise.all([
                dbService.getProducts(companyId!),
                dbService.getSuppliers(companyId!),
                dbService.getStorageLocations(companyId!)
            ]);
            setProducts(pData);
            setSuppliers(sData);
            setStorageLocations(locData);

            // Só mostra sugestões padrão se o banco estiver vazio para essas colunas
            const dbCats = pData.map(p => p.categoria?.trim()).filter(Boolean);
            const dbBrands = pData.map(p => p.marca?.trim()).filter(Boolean);

            const defaultCats = dbCats.length === 0 ? ['Equipamentos', 'Peças', 'Acessórios', 'Infraestrutura', 'Ferramentas', 'Mão de Obra'] : [];
            const defaultBrands = dbBrands.length === 0 ? ['Própria', 'Genérica', 'S/M (Sem Marca)'] : [];

            const cats = Array.from(new Set([...defaultCats, ...dbCats])).sort();
            const brands = Array.from(new Set([...defaultBrands, ...dbBrands])).sort();

            setAvailableCategories(cats as string[]);
            setAvailableBrands(brands as string[]);
        } catch (error) {
            console.error("Erro no loadData:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) setIsCatDropdownOpen(false);
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) setIsBrandDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Lógica Financeira (Suporte a vírgula BR)
    const calculateSellingPrice = (buy: number, margin: number) => buy * (1 + margin / 100);

    const parseCurrency = (val: string): number => {
        // Remove pontos de milhar e troca vírgula por ponto
        const clean = val.replace(/\./g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    };

    const formatCurrency = (val: number): string => {
        if (!val && val !== 0) return '';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Ações de Limpeza de Autocomplete
    const handleDeleteCategory = async (e: React.MouseEvent, cat: string) => {
        e.stopPropagation();
        if (window.confirm(`Isso removerá a categoria "${cat}" de TODOS os produtos cadastrados. Deseja continuar?`)) {
            try {
                await dbService.removeCategory(cat, companyId!);
                showToast(`Categoria "${cat}" removida do catálogo.`, 'success');
                loadData();
            } catch (error) {
                showToast('Erro ao limpar categoria.', 'error');
            }
        }
    };

    const handleDeleteBrand = async (e: React.MouseEvent, brand: string) => {
        e.stopPropagation();
        if (window.confirm(`Isso removerá a marca "${brand}" de TODOS os produtos cadastrados. Deseja continuar?`)) {
            try {
                await dbService.removeBrand(brand, companyId!);
                showToast(`Marca "${brand}" removida do catálogo.`, 'success');
                loadData();
            } catch (error) {
                showToast('Erro ao limpar marca.', 'error');
            }
        }
    };

    const handleBuyPriceChange = (valStr: string) => {
        // Pega apenas os dígitos numéricos
        const digits = valStr.replace(/\D/g, '');
        // Converte para decimal (dividindo por 100 para ter as duas casas de centavos)
        const value = Number(digits) / 100;

        const newPrice = calculateSellingPrice(value, formData.margemLucro);
        setFormData({ ...formData, valorCompra: value, precoVenda: Number(newPrice.toFixed(2)) });
    };

    const handleMarginChange = (value: number) => {
        const newPrice = calculateSellingPrice(formData.valorCompra, value);
        setFormData({ ...formData, margemLucro: value, precoVenda: Number(newPrice.toFixed(2)) });
    };

    const handleSalesPriceChange = (valStr: string) => {
        const digits = valStr.replace(/\D/g, '');
        const value = Number(digits) / 100;
        setFormData({ ...formData, precoVenda: value });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${companyId}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('Sistema de OS').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('Sistema de OS').getPublicUrl(filePath);
            // Adiciona timestamp para evitar cache e forçar renderização
            const uniqueUrl = `${publicUrl}?t=${Date.now()}`;
            setFormData(p => ({ ...p, imagens: [...p.imagens, uniqueUrl] }));
        } catch (error: any) {
            showToast(`Falha ao enviar imagem: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const isDuplicateName = products.some(p => p.id !== isEditing && p.nome.toLowerCase() === formData.nome.toLowerCase());
    const isBrandRequired = isDuplicateName;
    const isFullDuplicate = products.some(p => p.id !== isEditing && p.nome.toLowerCase() === formData.nome.toLowerCase() && (p.marca || '').toLowerCase() === (formData.marca || '').toLowerCase());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isBrandRequired && !formData.marca) {
            showToast("Como já existe um produto com este nome, a Marca é obrigatória para diferenciar.", "warning");
            return;
        }

        if (isFullDuplicate) {
            showToast("Já existe um produto cadastrado com exatamente este Nome e Marca. Por favor, altere para diferenciar.", "error");
            return;
        }
        try {
            if (isEditing) {
                await dbService.updateProduct(isEditing, formData);
                setIsModalOpen(false);
                setFormData(initialForm);
                loadData();

                // Prepara modal de entrada com quantidade 0
                setCreatedProduct({ id: isEditing, ...formData } as any);
                setEntryForm(prev => ({ ...prev, quantidade: 0, barcodes: [''] }));
                setIsEntryModalOpen(true);
                setIsEditing(null);
                showToast('Alterações salvas!', 'success');
            } else {
                const newProd = await dbService.createProduct({ ...formData, companyId: companyId! });
                setIsModalOpen(false);
                setFormData(initialForm);
                loadData();

                // Prepara modal de entrada com quantidade 0
                setCreatedProduct(newProd);
                setEntryForm(prev => ({ ...prev, quantidade: 0, barcodes: [''] }));
                setIsEntryModalOpen(true);
                showToast('Produto cadastrado!', 'success');
            }
        } catch (error: any) {
            console.error("Erro ao salvar produto:", error);
            showToast(`Erro ao salvar produto: ${error.message || 'Erro desconhecido'}`, "error");
        }
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createdProduct || !companyId) return;

        // Se a quantidade for 0 ou negativa, apenas fecha o modal sem registrar movimentação
        if (Number(entryForm.quantidade) <= 0) {
            setIsEntryModalOpen(false);
            setEntryForm({
                quantidade: 0,
                tipo: 'ENTRADA',
                fornecedorId: '',
                documentRef: '',
                barcodes: ['']
            });
            return;
        }

        try {
            setIsSubmittingEntry(true);
            const user = await authService.getCurrentUser();

            // Registra a entrada
            const notasBarcodes = entryForm.barcodes.filter(b => b.trim() !== '').join(', ');
            const observacoes = `Carga Inicial.${entryForm.documentRef ? ` NF: ${entryForm.documentRef}.` : ''}${notasBarcodes ? ` Códigos: ${notasBarcodes}` : ''}`;

            await dbService.createStockMovement({
                companyId,
                produtoId: createdProduct.id,
                tipo: entryForm.tipo,
                quantidade: entryForm.quantidade,
                fornecedorId: entryForm.fornecedorId || null,
                documentRef: entryForm.documentRef || '',
                userId: user?.id,
                userName: user?.name || 'Sistema',
                observacoes
            });

            // Atualiza os seriais no produto (Módulo de Catálogo)
            if (notasBarcodes) {
                const prod = await dbService.getProduct(createdProduct.id);
                if (prod) {
                    const currentVars = prod.variacoes || {};
                    const newSeriais = [...(currentVars.seriais || []), ...entryForm.barcodes.filter(b => b.trim() !== '')];
                    await dbService.updateProduct(prod.id, { variacoes: { ...currentVars, seriais: newSeriais } });
                }
            }

            setIsEntryModalOpen(false);
            setCreatedProduct(null);
            setEntryForm({ fornecedorId: '', documentRef: '', tipo: 'ENTRADA', quantidade: 1, barcodes: [] });
            loadData();
            showToast("Produto e Estoque inicial registrados com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao registrar entrada:", error);
            showToast("Erro ao registrar entrada.", "error");
        } finally {
            setIsSubmittingEntry(false);
        }
    };

    const handleDeleteClick = (p: Product) => {
        setProductToDelete(p);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        try {
            setIsDeletingProduct(true);
            await dbService.deleteProduct(productToDelete.id);
            showToast('Produto removido com sucesso!', 'success');
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
            loadData();
        } catch (error: any) {
            console.error("Erro ao deletar produto:", error);
            if (error.code === '23503') {
                showToast("Não é possível excluir: este produto possui histórico de movimentações. Tente desativá-lo para ocultar do catálogo.", "error");
            } else {
                showToast(`Erro ao remover produto: ${error.message || 'Erro desconhecido'}`, "error");
            }
        } finally {
            setIsDeletingProduct(false);
        }
    };

    const handleEdit = (p: Product) => {
        setFormData({
            nome: p.nome,
            descricao: p.descricao || '',
            sku: p.sku || '',
            precoVenda: p.precoVenda,
            valorCompra: p.valorCompra || 0,
            margemLucro: p.margemLucro || 0,
            quantidadeEstoque: p.quantidadeEstoque,
            unidadeMedida: (p.unidadeMedida as any) || 'UN',
            ean: p.ean || '',
            ncm: p.ncm || '',
            peso: p.peso || 0,
            altura: p.altura || 0,
            largura: p.largura || 0,
            comprimento: p.comprimento || 0,
            categoria: p.categoria || 'Equipamentos',
            marca: p.marca || '',
            seoTitle: p.seoTitle || '',
            seoDescription: p.seoDescription || '',
            status: p.status,
            imagens: p.imagens || []
        });
        setIsEditing(p.id);
        setIsModalOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <button
                    onClick={async () => {
                        setFormData(initialForm);
                        setIsEditing(null);
                        setIsModalOpen(true);
                        if (companyId) {
                            const next = await dbService.getNextSku(companyId);
                            setFormData(prev => ({ ...prev, sku: next }));
                        }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-sm shadow-lg shadow-blue-200"
                >
                    <Plus size={20} /> NOVO PRODUTO
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Itens', value: products.length, icon: Package, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
                    { label: 'Em Estoque', value: products.reduce((acc, p) => acc + (p.quantidadeEstoque || 0), 0), icon: BarChart3, bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
                    { label: 'Categorias', value: new Set(products.map(p => p.categoria)).size, icon: Tag, bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
                    { label: 'Valor Total', value: `R$ ${products.reduce((acc, p) => acc + ((p.quantidadeEstoque || 0) * (p.valorCompra || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} ${stat.textColor} flex items-center justify-center`}>
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
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Produto / SKU</th>
                                <th className="px-8 py-5">Categoria</th>
                                <th className="px-8 py-5">Financeiro</th>
                                <th className="px-8 py-5 text-center">Estoque</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest">Sincronizando Catálogo...</td></tr>
                            ) : filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group italic-hover">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all border border-slate-200">
                                                {p.imagens && p.imagens[0] ? <img src={p.imagens[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={24} />}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.nome}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{p.sku || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase w-fit">{p.categoria}</span>
                                            <span className="text-[10px] font-bold text-blue-500 uppercase">{p.marca || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-black text-slate-900">R$ {p.precoVenda.toFixed(2)}</div>
                                        <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest whitespace-nowrap">Custo: R$ {p.valorCompra?.toFixed(2)}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`text-lg font-black ${p.quantidadeEstoque < 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {p.quantidadeEstoque} <span className="text-[9px] text-slate-400 uppercase">{p.unidadeMedida || 'UN'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {p.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setCreatedProduct(p);
                                                    setEntryForm(prev => ({ ...prev, quantidade: 0, tipo: 'ENTRADA' }));
                                                    setIsEntryModalOpen(true);
                                                }}
                                                title="Movimentar Estoque"
                                                className="w-10 h-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
                                            >
                                                <Truck size={18} />
                                            </button>
                                            <button onClick={() => handleEdit(p)} className="w-10 h-10 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(p)} className="w-10 h-10 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm font-black">
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

            {/* Modal de Cadastro/Edição PROFISSIONAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col border border-slate-200">

                        {/* Modal Header */}
                        <div className="p-8 border-b-2 border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                        {isEditing ? 'Editar Produto' : 'Novo Produto'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Inteligência de Estoque & Catálogo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all flex items-center justify-center shadow-sm">
                                <Plus size={28} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1 bg-white">

                            {/* SEÇÃO 1: IDENTIFICAÇÃO E FOTOS */}
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-4">I. Identificação Técnica</h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                    <div className="md:col-span-8 space-y-6">
                                        <div className="relative">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nome Comercial do Produto *</label>
                                            <input
                                                required type="text" list="products-suggestions"
                                                value={formData.nome}
                                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                                className={`w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:ring-4 transition-all font-bold text-lg ${isDuplicateName ? 'border-amber-400 bg-amber-50 focus:ring-amber-500/10' : 'border-slate-100 focus:border-blue-500 focus:ring-blue-500/10'}`}
                                                placeholder="Busque ou digite o nome..."
                                            />
                                            <datalist id="products-suggestions">
                                                {products.map(p => <option key={p.id} value={p.nome} />)}
                                            </datalist>
                                            {isDuplicateName && (
                                                <div className="flex items-center gap-2 mt-2 text-amber-600 font-bold text-[9px] uppercase ml-1 animate-pulse">
                                                    <AlertCircle size={14} /> Sugestão: Nome já em uso. Diferencie pela Marca abaixo.
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Descrição Técnica / O que acompanha</label>
                                            <textarea rows={3} value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="Especificações detalhadas do item..." />
                                        </div>
                                    </div>
                                    <div className="md:col-span-4 space-y-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1 text-center">Galeira de Fotos</label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square bg-slate-50 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 hover:text-blue-500 hover:border-blue-500/20 hover:bg-blue-50 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            {formData.imagens[0] ? (
                                                <img src={formData.imagens[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <>
                                                    <Camera size={42} className="mb-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Enviando...' : 'Adicionar Foto'}</span>
                                                </>
                                            )}
                                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {formData.imagens.slice(1, 5).map((img, i) => (
                                                <div key={i} className="aspect-square rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                            {formData.imagens.length < 5 && <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-blue-500 cursor-pointer"><Plus size={16} /></div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 2: FINANCEIRO */}
                            <div className="space-y-6 pt-6 border-t-2 border-slate-50">
                                <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-4">II. Comercial e Lucratividade</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Custo Unitário (R$)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">$</span>
                                            <input
                                                type="text"
                                                value={formatCurrency(formData.valorCompra)}
                                                onChange={e => handleBuyPriceChange(e.target.value)}
                                                className="w-full pl-8 pr-5 py-4 bg-emerald-50/20 border-2 border-emerald-100/30 rounded-2xl outline-none focus:border-emerald-500 font-black text-sm transition-all"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Margem de Lucro (%)</label>
                                        <div className="relative">
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 font-black text-xs">%</span>
                                            <input type="number" step="0.1" value={formData.margemLucro || ''} onChange={e => handleMarginChange(Number(e.target.value))} className="w-full px-5 py-4 bg-orange-50/20 border-2 border-orange-100/30 rounded-2xl outline-none focus:border-orange-500 font-black text-sm transition-all" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Preço Final de Venda (R$)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                                            <input
                                                type="text"
                                                value={formatCurrency(formData.precoVenda)}
                                                onChange={e => handleSalesPriceChange(e.target.value)}
                                                className="w-full pl-14 pr-6 py-4 bg-slate-900 text-white border-none rounded-2xl outline-none shadow-xl shadow-slate-200 font-black text-xl"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO 3: LOGÍSTICA E ESTOQUE */}
                            <div className="space-y-6 pt-6 border-t-2 border-slate-50">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-4">III. Logística e Rastreabilidade</h4>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1"><Warehouse size={12} /> Controle Físico</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">SKU / Cód. Interno</label>
                                        <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs uppercase" placeholder="GERANDO..." readOnly={!isEditing} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">EAN / Barcode</label>
                                        <input type="text" value={formData.ean} onChange={e => setFormData({ ...formData, ean: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Unidade de Medida</label>
                                        <select
                                            value={formData.unidadeMedida}
                                            onChange={e => setFormData({ ...formData, unidadeMedida: e.target.value as any })}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-black text-xs"
                                        >
                                            <option value="UN">UNIDADE (UN)</option>
                                            <option value="MT">METRO (MT)</option>
                                            <option value="KM">QUILÔMETRO (KM)</option>
                                            <option value="LT">LITRO (LT)</option>
                                            <option value="KG">QUILOGRAMA (KG)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Peso (Kg)', icon: Scale, key: 'peso' },
                                        { label: 'Alt (cm)', icon: Box, key: 'altura' },
                                        { label: 'Larg (cm)', icon: Box, key: 'largura' },
                                        { label: 'Comp (cm)', icon: Box, key: 'comprimento' }
                                    ].map((dim, i) => (
                                        <div key={i}>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest text-center">{dim.label}</label>
                                            <input type="number" step="0.01" value={(formData as any)[dim.key] || ''} onChange={e => setFormData({ ...formData, [dim.key]: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center font-bold text-xs" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SEÇÃO 4: ORGANIZAÇÃO E SEO */}
                            <div className="space-y-6 pt-6 border-t-2 border-slate-50">
                                <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] border-l-4 border-orange-500 pl-4">IV. Organização e Presença Digital</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                    <div className="space-y-2 relative" ref={catDropdownRef}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria do Item</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.categoria}
                                                onChange={e => {
                                                    setFormData({ ...formData, categoria: e.target.value });
                                                    setIsCatDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsCatDropdownOpen(true)}
                                                className="w-full px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-orange-400 focus:bg-white transition-all"
                                                placeholder="DIGITE OU SELECIONE..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-orange-500"
                                            >
                                                <ChevronDown size={20} className={`transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>

                                        {isCatDropdownOpen && (
                                            <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                {availableCategories
                                                    .filter(c => c.toLowerCase().includes((formData.categoria || '').toLowerCase()))
                                                    .map(cat => (
                                                        <div
                                                            key={cat}
                                                            className="group px-6 py-3 hover:bg-orange-50 cursor-pointer flex items-center justify-between transition-colors"
                                                            onClick={() => {
                                                                setFormData({ ...formData, categoria: cat });
                                                                setIsCatDropdownOpen(false);
                                                            }}
                                                        >
                                                            <span className="font-bold text-sm text-slate-600">{cat}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteCategory(e, cat)}
                                                                className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Remover esta categoria do sistema"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                }
                                                {formData.categoria && !availableCategories.includes(formData.categoria) && (
                                                    <div className="px-6 py-3 text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50/50">
                                                        Nova Categoria: "{formData.categoria}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 relative" ref={brandDropdownRef}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca {isBrandRequired && '*'}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.marca}
                                                onChange={e => {
                                                    setFormData({ ...formData, marca: e.target.value });
                                                    setIsBrandDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsBrandDropdownOpen(true)}
                                                className="w-full px-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-orange-400 focus:bg-white transition-all"
                                                placeholder="DIGITE OU SELECIONE..."
                                                required={isBrandRequired}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-orange-500"
                                            >
                                                <ChevronDown size={20} className={`transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>

                                        {isBrandDropdownOpen && (
                                            <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                {availableBrands
                                                    .filter(b => b.toLowerCase().includes((formData.marca || '').toLowerCase()))
                                                    .map(brand => (
                                                        <div
                                                            key={brand}
                                                            className="group px-6 py-3 hover:bg-orange-50 cursor-pointer flex items-center justify-between transition-colors"
                                                            onClick={() => {
                                                                setFormData({ ...formData, marca: brand });
                                                                setIsBrandDropdownOpen(false);
                                                            }}
                                                        >
                                                            <span className="font-bold text-sm text-slate-600">{brand}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteBrand(e, brand)}
                                                                className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Remover esta marca do sistema"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                }
                                                {formData.marca && !availableBrands.includes(formData.marca) && (
                                                    <div className="px-6 py-3 text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50/50">
                                                        Nova Marca: "{formData.marca}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                        <div>
                                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">Meta Title (SEO) <Globe size={12} /> </label>
                                            <input type="text" value={formData.seoTitle} onChange={e => setFormData({ ...formData, seoTitle: e.target.value })} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" placeholder="Título para mecanismos de busca..." />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest mr-1">Meta Description (SEO) <Globe size={12} /> </label>
                                            <input type="text" value={formData.seoDescription} onChange={e => setFormData({ ...formData, seoDescription: e.target.value })} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs" placeholder="Breve resumo para o Google..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Modal Footer Controls */}
                        <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex items-center justify-between shadow-inner">
                            <div className="flex items-center gap-2 text-slate-400 uppercase font-black text-[9px] tracking-[0.2em] italic ml-4 opacity-70">
                                <AlertCircle size={14} className="text-blue-500" /> Preencha todos os campos obrigatórios (*) para salvar.
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-xs">Cancelar</button>
                                <button onClick={handleSubmit} className="px-14 py-5 bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 transition-all font-black text-sm shadow-xl shadow-blue-500/20 uppercase tracking-[0.2em] hover:scale-[1.05] active:scale-95 flex items-center gap-3">
                                    <CheckCircle2 size={24} /> {isEditing ? 'Atualizar Catálogo' : 'Efetivar Cadastro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Entrada Inicial (Pós Cadastro) */}
            {isEntryModalOpen && createdProduct && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmittingEntry && setIsEntryModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col border border-slate-200">

                        <div className="p-8 border-b-2 border-slate-50 flex justify-between items-center bg-emerald-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Movimentar Estoque</h3>
                                        <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                                            Saldo Mestre: {createdProduct.quantidadeEstoque} {createdProduct.unidadeMedida || 'UN'}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1 italic">{createdProduct.nome}</p>
                                </div>
                            </div>
                            <button onClick={() => !isSubmittingEntry && setIsEntryModalOpen(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl flex items-center justify-center transition-all">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleEntrySubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-white flex-1">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-slate-300 pl-3">I. Tipo & Documento</h4>

                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setEntryForm({ ...entryForm, tipo: 'ENTRADA' })}
                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${entryForm.tipo === 'ENTRADA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Entrada (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEntryForm({ ...entryForm, tipo: 'SAIDA' })}
                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${entryForm.tipo === 'SAIDA' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Saída (-)
                                        </button>
                                    </div>

                                    <SearchableSelect
                                        label="Fornecedor da Carga (Opcional)"
                                        placeholder="Selecione ou deixe em branco..."
                                        value={entryForm.fornecedorId}
                                        onChange={val => setEntryForm({ ...entryForm, fornecedorId: val })}
                                        options={suppliers.map(s => ({ id: s.id, label: s.name, subLabel: s.document || '' }))}
                                    />

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nº Nota Fiscal</label>
                                        <input
                                            type="text"
                                            value={entryForm.documentRef}
                                            onChange={e => setEntryForm({ ...entryForm, documentRef: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                                            placeholder="Ex: 000.123.456"
                                        />
                                    </div>


                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Quantidade Recebida *</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step={createdProduct.unidadeMedida === 'UN' ? '1' : '0.01'}
                                            value={entryForm.quantidade}
                                            onChange={e => {
                                                const q = Number(e.target.value);
                                                setEntryForm(prev => {
                                                    const barcodes = [...prev.barcodes];
                                                    // Ajusta o tamanho do array de barcodes se for UN
                                                    if (createdProduct.unidadeMedida === 'UN') {
                                                        if (q > barcodes.length) {
                                                            while (barcodes.length < q) barcodes.push('');
                                                        } else {
                                                            barcodes.length = q;
                                                        }
                                                    }
                                                    return { ...prev, quantidade: q, barcodes };
                                                });
                                            }}
                                            className="w-full px-5 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-lg outline-none focus:border-emerald-500 transition-all text-center"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-slate-300 pl-3">II. Códigos de Barras / Seriais</h4>
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-4">
                                        Se os produtos possuírem códigos de barras ou números de série individuais, liste-os abaixo para registrar no catálogo.
                                    </p>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {createdProduct.unidadeMedida === 'UN' ? (
                                            entryForm.barcodes.map((bc, idx) => (
                                                <div key={idx} className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{(idx + 1).toString().padStart(2, '0')}</span>
                                                    <input
                                                        type="text"
                                                        value={bc}
                                                        onChange={e => {
                                                            const newBc = [...entryForm.barcodes];
                                                            newBc[idx] = e.target.value;
                                                            setEntryForm({ ...entryForm, barcodes: newBc });
                                                        }}
                                                        placeholder="Cód. Barras / Serial"
                                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 transition-all"
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={entryForm.barcodes[0] || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, barcodes: [e.target.value] })}
                                                    placeholder="Cód. Barras principal (Opcional)"
                                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex items-center justify-between">
                            <button type="button" onClick={() => { setIsEntryModalOpen(false); loadData(); }} className="px-8 py-4 font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-xs">Pular Carga Inicial</button>
                            <button onClick={handleEntrySubmit} disabled={isSubmittingEntry} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-sm shadow-xl shadow-emerald-500/20 uppercase tracking-[0.2em] flex items-center gap-2">
                                {isSubmittingEntry ? 'Registrando...' : 'Registrar Movimentação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Exclusão PREMIUM */}
            {isDeleteModalOpen && productToDelete && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-slate-200 p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto animate-bounce-subtle">
                            <AlertTriangle size={42} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Confirmar Exclusão</h3>
                            <p className="text-sm font-bold text-slate-500">
                                Você tem certeza que deseja remover o produto <br />
                                <span className="text-rose-600 font-black">"{productToDelete.nome}"</span>?<br />
                                Esta ação não pode ser desfeita.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                disabled={isDeleting}
                                onClick={handleDeleteConfirm}
                                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Excluindo...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Sim, Excluir Produto
                                    </>
                                )}
                            </button>
                            <button
                                disabled={isDeleting}
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                            >
                                Cancelar e Manter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast System */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-500 font-black text-xs uppercase tracking-widest ${toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-b-4 border-emerald-500' :
                    toast.type === 'warning' ? 'bg-slate-900 text-amber-400 border-b-4 border-amber-500' :
                        'bg-slate-900 text-rose-400 border-b-4 border-rose-500'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'warning' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
