import React, { useState, useEffect } from 'react';
import { RefreshCcw, Search, Plus, ArrowDownRight, ArrowUpRight, ArrowRightLeft, SlidersHorizontal, X, FileText, User, Calendar, MapPin, Package, Info } from 'lucide-react';
import { format } from 'date-fns';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { StockMovement, Product, StorageLocation, Supplier } from '../types';

const TipoTag = ({ tipo }: { tipo: string }) => {
    switch (tipo) {
        case 'ENTRADA':
            return <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><ArrowDownRight size={14} /> ENTRADA</span>;
        case 'SAIDA':
            return <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><ArrowUpRight size={14} /> SAÍDA</span>;
        case 'TRANSFERENCIA':
            return <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><ArrowRightLeft size={14} /> TRANSF.</span>;
        case 'AJUSTE':
            return <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"><SlidersHorizontal size={14} /> AJUSTE</span>;
        default:
            return null;
    }
};

export default function Movimentacoes() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const initialMovement = {
        tipo: 'ENTRADA' as const,
        produtoId: '',
        quantidade: 1,
        origemId: '',
        destinoId: '',
        fornecedorId: '',
        documentRef: '',
        observacoes: ''
    };

    const [formMovement, setFormMovement] = useState(initialMovement);

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
            const [mData, pData, lData, sData] = await Promise.all([
                dbService.getStockMovements(companyId!),
                dbService.getProducts(companyId!),
                dbService.getStorageLocations(companyId!),
                dbService.getSuppliers(companyId!)
            ]);
            setMovements(mData);
            setProducts(pData);
            setLocations(lData);
            setSuppliers(sData);

            // Ajuste Finos: Se for entrada e só tiver um local (Matriz), já seleciona
            const matriz = lData.find(l => l.nome === 'Estoque Matriz');
            if (matriz && !formMovement.destinoId) {
                setFormMovement(prev => ({ ...prev, destinoId: matriz.id }));
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = await authService.getCurrentUser();
            await dbService.createStockMovement({
                ...formMovement,
                companyId: companyId!,
                userId: user?.id,
                userName: user?.name || 'Sistema'
            });

            // Opcional: Atualizar a quantidade total no produto (Simpificado para este estágio)
            const product = products.find(p => p.id === formMovement.produtoId);
            if (product) {
                let newQty = product.quantidadeEstoque;
                if (formMovement.tipo === 'ENTRADA') newQty += formMovement.quantidade;
                if (formMovement.tipo === 'SAIDA') newQty -= formMovement.quantidade;
                // Em Transferência o total do produto não muda, apenas a distribuição entre locais.

                if (formMovement.tipo !== 'TRANSFERENCIA') {
                    await dbService.updateProduct(product.id, { quantidadeEstoque: newQty });
                }
            }

            setIsModalOpen(false);
            setFormMovement(initialMovement);
            loadData();
        } catch (error) {
            console.error("Erro ao realizar movimentação:", error);
        }
    };

    const getProductName = (id: string) => products.find(p => p.id === id)?.nome || 'Produto Desconhecido';
    const getProductSku = (id: string) => products.find(p => p.id === id)?.sku || '---';
    const getLocationName = (id?: string) => locations.find(l => l.id === id)?.nome || 'Externo/NF';

    const filteredMovements = movements.filter(m => {
        const pName = getProductName(m.produtoId).toLowerCase();
        return pName.includes(searchTerm.toLowerCase()) ||
            (m.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <RefreshCcw className="text-blue-600" size={32} />
                        Fluxo de Movimentações
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        Rastreabilidade completa de cada item do estoque
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-sm shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95"
                    >
                        <Plus size={20} />
                        NOVA MOVIMENTAÇÃO
                    </button>
                    <button
                        onClick={() => loadData()}
                        className="p-3 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                        title="Atualizar dados"
                    >
                        <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por produto ou responsável..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Data / Hora</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Evento</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Produto</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Quant.</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Origem / Destino</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-20 text-center font-bold text-slate-400">Carregando movimentações...</td></tr>
                            ) : filteredMovements.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest">Nenhuma movimentação encontrada</td></tr>
                            ) : filteredMovements.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900">{m.createdAt ? format(new Date(m.createdAt), 'dd/MM/yyyy') : '---'}</div>
                                        <div className="text-[10px] font-bold text-slate-400">{m.createdAt ? format(new Date(m.createdAt), 'HH:mm:ss') : '---'}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <TipoTag tipo={m.tipo} />
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900">{getProductName(m.produtoId)}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{getProductSku(m.produtoId)}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`text-xl font-black ${m.tipo === 'ENTRADA' ? 'text-emerald-600' : m.tipo === 'SAIDA' ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SAIDA' ? '-' : ''}
                                            {m.quantidade}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase">
                                            {m.tipo === 'TRANSFERENCIA' ? (
                                                <>
                                                    <span className="text-rose-500">{getLocationName(m.origemId)}</span>
                                                    <ArrowRightLeft size={12} className="text-slate-300" />
                                                    <span className="text-emerald-500">{getLocationName(m.destinoId)}</span>
                                                </>
                                            ) : m.tipo === 'ENTRADA' ? (
                                                <span className="text-emerald-500">{getLocationName(m.destinoId)}</span>
                                            ) : (
                                                <span className="text-rose-500">{getLocationName(m.origemId)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => { setSelectedMovement(m); setIsDetailsOpen(true); }}
                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm"
                                        >
                                            <Info size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Nova Movimentação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nova Movimentação</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Garantindo a integridade do seu estoque físico</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all flex items-center justify-center">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMovement} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipo de Movimento</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['ENTRADA', 'SAIDA', 'TRANSFERENCIA'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setFormMovement({ ...formMovement, tipo: t as any, origemId: '', destinoId: '' })}
                                                className={`py-4 rounded-2xl font-black text-xs transition-all border-2 ${formMovement.tipo === t ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}
                                            >
                                                {t === 'ENTRADA' ? 'ENTRADA' : t === 'SAIDA' ? 'SAÍDA' : 'TRANSF.'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Produto</label>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            value={formMovement.produtoId}
                                            onChange={e => setFormMovement({ ...formMovement, produtoId: e.target.value })}
                                            className="flex-1 px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm"
                                        >
                                            <option value="">Selecione um produto...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku}) - Saldo: {p.quantidadeEstoque}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsProductModalOpen(true)}
                                            className="p-3.5 bg-blue-50 text-blue-600 border-2 border-blue-100 rounded-2xl hover:bg-blue-100 transition-all font-black"
                                            title="Cadastrar Novo Produto"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>

                                {formMovement.tipo === 'ENTRADA' && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Fornecedor</label>
                                            <select
                                                value={formMovement.fornecedorId}
                                                onChange={e => setFormMovement({ ...formMovement, fornecedorId: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-xs"
                                            >
                                                <option value="">Selecione o Fornecedor...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nº Nota Fiscal</label>
                                            <input
                                                type="text"
                                                value={formMovement.documentRef}
                                                onChange={e => setFormMovement({ ...formMovement, documentRef: e.target.value })}
                                                placeholder="Ex: 000.123.456"
                                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm uppercase"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Quantidade</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={formMovement.quantidade}
                                        onChange={e => setFormMovement({ ...formMovement, quantidade: Number(e.target.value) })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-black text-sm text-center"
                                    />
                                </div>

                                <div className="space-y-4 col-span-2 grid grid-cols-2 gap-6">
                                    {formMovement.tipo !== 'ENTRADA' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Local de Origem</label>
                                            <select
                                                required
                                                value={formMovement.origemId}
                                                onChange={e => setFormMovement({ ...formMovement, origemId: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-rose-50 border-2 border-rose-100 rounded-2xl outline-none focus:border-rose-500 font-bold text-xs"
                                            >
                                                <option value="">De onde sai?</option>
                                                <option value="NF">FORNECEDOR / NF</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {formMovement.tipo !== 'SAIDA' && (
                                        <div className={formMovement.tipo === 'ENTRADA' ? 'col-span-2' : ''}>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Local de Destino</label>
                                            <select
                                                required
                                                value={formMovement.destinoId}
                                                onChange={e => setFormMovement({ ...formMovement, destinoId: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-xs"
                                            >
                                                <option value="">Para onde vai?</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações / Motivo</label>
                                    <textarea
                                        value={formMovement.observacoes}
                                        onChange={e => setFormMovement({ ...formMovement, observacoes: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-xs"
                                        placeholder="Ex: Recebimento de mercadoria, Saída para instalação..."
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 mt-4"
                            >
                                Registrar Movimentação
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar Detalhes (Drawer) */}
            {isDetailsOpen && selectedMovement && (
                <div className="fixed inset-0 z-[300] flex justify-end">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsDetailsOpen(false)} />
                    <div className="relative bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Detalhes do Evento</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {selectedMovement.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setIsDetailsOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                            {/* Status Header */}
                            <div className="flex justify-center">
                                <TipoTag tipo={selectedMovement.tipo} />
                            </div>

                            {/* Info Blocks */}
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</p>
                                        <p className="font-black text-slate-900">{getProductName(selectedMovement.produtoId)}</p>
                                        <p className="text-xs font-bold text-slate-500">SKU: {getProductSku(selectedMovement.produtoId)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Hora</p>
                                        <p className="font-black text-slate-900">{selectedMovement.createdAt ? format(new Date(selectedMovement.createdAt), "dd 'de' MMMM, yyyy") : '---'}</p>
                                        <p className="text-xs font-bold text-slate-500">{selectedMovement.createdAt ? format(new Date(selectedMovement.createdAt), "HH:mm:ss") : '---'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</p>
                                        <p className="font-black text-slate-900">{selectedMovement.userName}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo</p>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-xs font-black text-slate-400 uppercase">Origem</span>
                                                <span className="text-sm font-black text-slate-900">{getLocationName(selectedMovement.origemId)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-xs font-black text-slate-400 uppercase">Destino</span>
                                                <span className="text-sm font-black text-slate-900">{getLocationName(selectedMovement.destinoId)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações / NF</p>
                                        <p className="text-sm font-bold text-slate-700 mt-1 italic">
                                            {selectedMovement.observacoes || 'Nenhuma observação registrada.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t">
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-200"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro de Produto Aninhado */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsProductModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col border border-slate-200">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Novo Produto (Rápido)</h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest text-center">Cadastre o produto para que ele apareça na lista de movimentação</p>

                            <ProductQuickForm
                                companyId={companyId!}
                                suppliers={suppliers}
                                onSuccess={(newProd) => {
                                    loadData();
                                    setIsProductModalOpen(false);
                                    setFormMovement(prev => ({ ...prev, produtoId: newProd.id }));
                                }}
                                onCancel={() => setIsProductModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Componente Interno para Cadastro Rápido
function ProductQuickForm({ companyId, suppliers, onSuccess, onCancel }: { companyId: string, suppliers: Supplier[], onSuccess: (p: Product) => void, onCancel: () => void }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: '',
        sku: '',
        precoVenda: 0,
        valorCompra: 0,
        margemLucro: 0,
        fornecedorId: '',
        categoria: '',
        quantidadeEstoque: 0 // Inicia com 0, pois a movimentação dará a carga inicial
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const newProduct = await dbService.createProduct({
                ...form,
                companyId,
                status: 'ACTIVE',
                imagens: []
            });
            onSuccess(newProduct);
        } catch (error) {
            console.error("Erro ao criar produto:", error);
            alert("Erro ao criar produto. Verifique os campos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nome do Produto</label>
                <input required type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">SKU / Código</label>
                <input required type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Fornecedor Padrão</label>
                <select value={form.fornecedorId} onChange={e => setForm({ ...form, fornecedorId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-xs">
                    <option value="">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Valor de Compra (R$)</label>
                <input type="number" step="0.01" value={form.valorCompra} onChange={e => setForm({ ...form, valorCompra: Number(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold" />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Preço de Venda (R$)</label>
                <input type="number" step="0.01" value={form.precoVenda} onChange={e => setForm({ ...form, precoVenda: Number(e.target.value) })} className="w-full px-4 py-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl outline-none focus:border-emerald-500 font-bold text-emerald-700" />
            </div>
            <div className="col-span-2 pt-4 flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Produto'}
                </button>
            </div>
        </form>
    );
}
