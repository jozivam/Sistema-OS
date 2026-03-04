import React, { useState, useEffect } from 'react';
import { Archive, Plus, Search, AlertTriangle, ArrowRightLeft, MapPin, Edit2, History, X, Trash2, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { StorageLocation, Product, StockMovement } from '../types';

export default function DepositosSaldos() {
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState<string | null>(null);
    const [locationForm, setLocationForm] = useState({ nome: '', localizacao: '', ativo: true });

    const [itemOperacao, setItemOperacao] = useState<Product | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({ quantidade: 0, destinoId: '', observacoes: '' });

    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentForm, setAdjustmentForm] = useState({ quantidade: 0, observacoes: '' });

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
            const [locs, prods] = await Promise.all([
                dbService.getStorageLocations(companyId!),
                dbService.getProducts(companyId!)
            ]);
            setLocations(locs);
            setProducts(prods);
            if (locs.length > 0 && !activeLocationId) {
                setActiveLocationId(locs[0].id);
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditingLocation) {
                await dbService.updateStorageLocation(isEditingLocation, locationForm);
            } else {
                await dbService.createStorageLocation({ ...locationForm, companyId: companyId! });
            }
            setIsLocationModalOpen(false);
            setLocationForm({ nome: '', localizacao: '', ativo: true });
            setIsEditingLocation(null);
            loadData();
        } catch (error) {
            alert("Erro ao salvar local.");
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (confirm("Deseja realmente excluir este local?")) {
            await dbService.deleteStorageLocation(id);
            loadData();
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemOperacao || !transferForm.destinoId || transferForm.quantidade <= 0) return;

        try {
            const user = await authService.getCurrentUser();
            // Criar movimentação de saída da origem
            await dbService.createStockMovement({
                companyId: companyId!,
                produtoId: itemOperacao.id,
                tipo: 'TRANSFERENCIA',
                quantidade: transferForm.quantidade,
                origemId: activeLocationId!,
                destinoId: transferForm.destinoId,
                userId: user?.id || '',
                userName: user?.name || 'Sistema',
                observacoes: transferForm.observacoes
            });

            setIsTransferModalOpen(false);
            setTransferForm({ quantidade: 0, destinoId: '', observacoes: '' });
            setItemOperacao(null);
            loadData();
            alert("Transferência realizada com sucesso!");
        } catch (error) {
            alert("Erro ao realizar transferência.");
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemOperacao) return;

        try {
            const user = await authService.getCurrentUser();
            await dbService.createStockMovement({
                companyId: companyId!,
                produtoId: itemOperacao.id,
                tipo: 'AJUSTE',
                quantidade: adjustmentForm.quantidade,
                origemId: activeLocationId!,
                userId: user?.id || '',
                userName: user?.name || 'Sistema',
                observacoes: adjustmentForm.observacoes
            });

            setIsAdjustmentModalOpen(false);
            setAdjustmentForm({ quantidade: 0, observacoes: '' });
            setItemOperacao(null);
            loadData();
            alert("Ajuste realizado com sucesso!");
        } catch (error) {
            alert("Erro ao realizar ajuste.");
        }
    };

    const activeLocation = locations.find(l => l.id === activeLocationId);

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white p-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Archive className="text-blue-600" size={32} />
                        Depósitos & Locais
                    </h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        Gestão de endereçamento e saldos por canal
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsEditingLocation(null);
                        setLocationForm({ nome: '', localizacao: '', ativo: true });
                        setIsLocationModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl hover:bg-slate-50 transition-all font-black text-sm shadow-sm"
                >
                    <Plus size={20} />
                    NOVO LOCAL
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Locais */}
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 overflow-hidden">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Locais de Armazenamento</div>
                        <div className="space-y-2">
                            {locations.map(loc => (
                                <div key={loc.id} className="relative group">
                                    <button
                                        onClick={() => setActiveLocationId(loc.id)}
                                        className={`w-full text-left px-5 py-4 rounded-2xl transition-all ${activeLocationId === loc.id
                                            ? 'bg-blue-600 shadow-lg shadow-blue-200 text-white scale-[1.02] z-10'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        <div className="font-black truncate">{loc.nome}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70 ${activeLocationId === loc.id ? 'text-blue-50' : 'text-slate-400'}`}>
                                            <MapPin size={10} className="inline mr-1" />
                                            {loc.localizacao || 'Sem endereço'}
                                        </div>
                                    </button>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditingLocation(loc.id);
                                                setLocationForm({ nome: loc.nome, localizacao: loc.localizacao || '', ativo: loc.ativo });
                                                setIsLocationModalOpen(true);
                                            }}
                                            className={`p-2 rounded-lg ${activeLocationId === loc.id ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-white text-slate-400 hover:text-blue-600 shadow-sm border border-slate-100'}`}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id); }}
                                            className={`p-2 rounded-lg ${activeLocationId === loc.id ? 'bg-blue-500 text-white hover:bg-rose-400' : 'bg-white text-slate-400 hover:text-rose-600 shadow-sm border border-slate-100'}`}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid: Saldos do Local Ativo */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                    <Archive size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeLocation?.nome || 'Selecione um local'}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={12} /> {activeLocation?.localizacao || 'Endereço não informado'}
                                    </p>
                                </div>
                            </div>
                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar produto neste local..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Produto / SKU</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Saldo Atual</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Saúde</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Ações Rápidas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.filter(p => !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(product => {
                                        // Fake logic for per-location stock as we don't have location_stock table yet
                                        // For now using product.quantidadeEstoque divided or just simulating
                                        const qtd = product.quantidadeEstoque;
                                        return (
                                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-slate-900">{product.nome}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{product.sku}</div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="text-2xl font-black text-slate-900">{qtd}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-center">
                                                        {qtd < 10 ? (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-black text-[10px] uppercase tracking-wider animate-pulse">
                                                                <AlertTriangle size={12} /> BAIXO ESTOQUE
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-wider">
                                                                <CheckCircle2 size={12} /> ESTÁVEL
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setItemOperacao(product); setIsTransferModalOpen(true); }}
                                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 rounded-2xl transition-all shadow-sm"
                                                            title="Transferir para outro local"
                                                        >
                                                            <ArrowRightLeft size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setItemOperacao(product); setIsAdjustmentModalOpen(true); }}
                                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm"
                                                            title="Ajuste Manual"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals are configured similarly to the previous page but specialized for local/transfer */}
            {/* ... (Modal implementations for Novo Local, Transferência, Ajuste) ... */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setIsLocationModalOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isEditingLocation ? 'Editar Local' : 'Novo Local'}</h3>
                            <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-slate-900"><Plus size={24} className="rotate-45" /></button>
                        </div>
                        <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome do Local/Depósito *</label>
                                <input required type="text" value={locationForm.nome} onChange={e => setLocationForm({ ...locationForm, nome: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="Ex: Galpão A, Veículo 01..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Localização / Endereço</label>
                                <input type="text" value={locationForm.localizacao} onChange={e => setLocationForm({ ...locationForm, localizacao: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="Ex: Rua Central, 123 ou Placa do Veículo" />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" checked={locationForm.ativo} onChange={e => setLocationForm({ ...locationForm, ativo: e.target.checked })} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-bold text-slate-700">Local Ativo</span>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsLocationModalOpen(false)} className="flex-1 py-3.5 font-black text-slate-500 uppercase tracking-widest text-[10px]">Cancelar</button>
                                <button type="submit" className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Salvar Local</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-amber-500 text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight">Transferir Estoque</h3>
                            <button onClick={() => setIsTransferModalOpen(false)}><Plus size={24} className="rotate-45" /></button>
                        </div>
                        <form onSubmit={handleTransfer} className="p-6 space-y-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">PRODUTO</div>
                                <div className="font-black text-slate-900 text-lg">{itemOperacao?.nome}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Quantidade a Enviar</label>
                                <input required type="number" min="1" value={transferForm.quantidade} onChange={e => setTransferForm({ ...transferForm, quantidade: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-black text-center text-xl" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Depósito Destino</label>
                                <select required value={transferForm.destinoId} onChange={e => setTransferForm({ ...transferForm, destinoId: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm">
                                    <option value="">Selecione o destino...</option>
                                    {locations.filter(l => l.id !== activeLocationId).map(l => (
                                        <option key={l.id} value={l.id}>{l.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-100 mt-4">Confirmar Envio</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
