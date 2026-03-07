import React, { useState, useEffect } from 'react';
import { Archive, Plus, Search, AlertTriangle, ArrowRightLeft, MapPin, Edit2, History, X, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { StorageLocation, Product, StockMovement } from '../types';

export default function DepositosSaldos() {
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
    const [localStocks, setLocalStocks] = useState<Record<string, number>>({});
    const [deliveryDates, setDeliveryDates] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState<string | null>(null);
    const [locationForm, setLocationForm] = useState({ nome: '', localizacao: '', ativo: true });

    const [itemOperacao, setItemOperacao] = useState<Product | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({ quantidade: 0, destinoId: '', observacoes: '' });

    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentForm, setAdjustmentForm] = useState({ quantidade: 0, observacoes: '' });

    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnForm, setReturnForm] = useState({ quantidade: 0, observacoes: '' });

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm });
    };

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

    // Ao trocar o local ativo, recarrega os saldos locais
    useEffect(() => {
        if (companyId && activeLocationId) {
            loadLocalStocks();
        }
    }, [activeLocationId, companyId]);

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
            } else if (activeLocationId) {
                // Se já tinha um local ativo, recarrega o saldo dele também
                loadLocalStocks();
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLocalStocks = async () => {
        if (!companyId || !activeLocationId) return;
        try {
            const [stocks, dates] = await Promise.all([
                dbService.getStocksByLocation(companyId, activeLocationId),
                dbService.getLatestDeliveryDates(companyId, activeLocationId)
            ]);
            setLocalStocks(stocks);
            setDeliveryDates(dates);
        } catch (error) {
            console.error("Erro ao carregar saldos locais:", error);
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
            showToast("Local salvo com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao salvar local.", "error");
        }
    };

    const handleDeleteLocation = async (id: string) => {
        requestConfirm("Excluir Local", "Deseja realmente excluir este local? Todas as movimentações podem ser afetadas.", async () => {
            try {
                await dbService.deleteStorageLocation(id);
                loadData();
                setConfirmDialog(null);
                showToast("Local removido.", "success");
            } catch (e) {
                showToast("Erro ao excluir local.", "error");
            }
        });
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
            showToast("Transferência realizada com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao realizar transferência.", "error");
        }
    };

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemOperacao || returnForm.quantidade <= 0) return;

        const currentBalance = localStocks[itemOperacao.id] || 0;
        if (returnForm.quantidade > currentBalance) {
            showToast(`OPERAÇÃO BLOQUEADA. A quantidade a devolver não pode ser maior que o saldo atual (${currentBalance}).`, "error");
            return;
        }

        try {
            const user = await authService.getCurrentUser();
            // Criar movimentação de ENTRADA (volta pro central tendo o Local ativo como Origem)
            await dbService.createStockMovement({
                companyId: companyId!,
                produtoId: itemOperacao.id,
                tipo: 'ENTRADA',
                quantidade: returnForm.quantidade,
                origemId: activeLocationId!, // A origem é a viatura/depósito
                destinoId: '', // Vai pro central
                userId: user?.id || '',
                userName: user?.name || 'Sistema',
                observacoes: `Devolução de material: ${returnForm.observacoes}`
            });

            setIsReturnModalOpen(false);
            setReturnForm({ quantidade: 0, observacoes: '' });
            setItemOperacao(null);
            loadData();
            showToast("Devolução para o Estoque Central realizada com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao realizar devolução.", "error");
        }
    };

    const handleAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemOperacao) return;

        const currentBalance = localStocks[itemOperacao.id] || 0;
        const targetQtd = adjustmentForm.quantidade;
        const diff = targetQtd - currentBalance;

        if (diff === 0) {
            showToast('A quantidade informada é igual ao saldo atual.', 'warning');
            return;
        }

        try {
            const user = await authService.getCurrentUser();
            const isGain = diff > 0;

            await dbService.createStockMovement({
                companyId: companyId!,
                produtoId: itemOperacao.id,
                tipo: isGain ? 'ENTRADA' : 'SAIDA',
                quantidade: Math.abs(diff),
                origemId: isGain ? '' : activeLocationId!, // Se perdeu, sai do deposito local
                destinoId: isGain ? activeLocationId! : '', // Se ganhou, entra no deposito local
                userId: user?.id || '',
                userName: user?.name || 'Sistema',
                observacoes: `Ajuste manual de estoque. ${adjustmentForm.observacoes}`
            });

            setIsAdjustmentModalOpen(false);
            setAdjustmentForm({ quantidade: 0, observacoes: '' });
            setItemOperacao(null);
            loadData();
            showToast("Ajuste realizado com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao realizar ajuste.", "error");
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
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Entrega</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Ações Rápidas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products
                                        .filter(p => {
                                            const qtd = localStocks[p.id] || 0;
                                            if (searchTerm) {
                                                return p.nome.toLowerCase().includes(searchTerm.toLowerCase());
                                            }
                                            return qtd > 0; // Se não tem busca, esconde o que tem 0 saldo
                                        })
                                        .map(product => {
                                            const qtd = localStocks[product.id] || 0;
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
                                                        <div className="flex justify-center flex-col items-center">
                                                            {deliveryDates[product.id] ? (
                                                                <>
                                                                    <div className="text-[10px] font-black text-slate-900 uppercase">
                                                                        {new Date(deliveryDates[product.id]).toLocaleDateString('pt-BR')}
                                                                    </div>
                                                                    <div className="text-[9px] font-bold text-slate-400">
                                                                        {new Date(deliveryDates[product.id]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase italic">N/A</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => { setItemOperacao(product); setIsReturnModalOpen(true); }}
                                                                className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-2xl transition-all shadow-sm"
                                                                title="Devolver para o Estoque Central"
                                                            >
                                                                <RotateCcw size={18} />
                                                            </button>
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
                    <div className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm" onClick={() => setIsLocationModalOpen(false)} />
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
                    <div className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
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

            {isReturnModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm" onClick={() => setIsReturnModalOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-emerald-500 text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight">Devolver Estoque</h3>
                            <button onClick={() => setIsReturnModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleReturn} className="p-6 space-y-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">PRODUTO</div>
                                <div className="font-black text-slate-900 text-lg">{itemOperacao?.nome}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Quantidade a Devolver</label>
                                <input required type="number" min="1" max={localStocks[itemOperacao?.id || ''] || 0} value={returnForm.quantidade || ''} onChange={e => setReturnForm({ ...returnForm, quantidade: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-black text-center text-xl" placeholder="0" />
                                <p className="text-[10px] text-slate-400 font-bold mt-1 text-left">Ficará disponível no Estoque Central.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Observação (Opcional)</label>
                                <textarea
                                    value={returnForm.observacoes}
                                    onChange={e => setReturnForm({ ...returnForm, observacoes: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 font-bold text-xs"
                                    placeholder="Ex: Devolução de sobra da OS..."
                                    rows={2}
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 mt-4">Confirmar Devolução</button>
                        </form>
                    </div>
                </div>
            )}

            {isAdjustmentModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm" onClick={() => setIsAdjustmentModalOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight">Ajuste de Saldo</h3>
                            <button onClick={() => setIsAdjustmentModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdjustment} className="p-6 space-y-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">PRODUTO</div>
                                <div className="font-black text-slate-900 text-lg">{itemOperacao?.nome}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Quantidade Atualizada</label>
                                <div className="flex flex-col gap-1">
                                    <input required type="number" min="0" value={adjustmentForm.quantidade} onChange={e => setAdjustmentForm({ ...adjustmentForm, quantidade: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-black text-center text-xl" placeholder="0" />
                                    <p className="text-[10px] font-bold text-slate-400 italic">O saldo atual será substituído por este valor</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Motivo / Observação</label>
                                <textarea
                                    required
                                    value={adjustmentForm.observacoes}
                                    onChange={e => setAdjustmentForm({ ...adjustmentForm, observacoes: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-xs"
                                    placeholder="Ex: Correção de inventário..."
                                    rows={2}
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 mt-4">Salvar Alteração</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast e Dialog */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[999] px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-emerald-500' :
                    toast.type === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-500' :
                        'bg-rose-600 text-white border-rose-400'
                    }`}>
                    {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {toast.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                    {toast.type === 'error' && <AlertTriangle size={16} className="text-white" />}
                    {toast.message}
                </div>
            )}

            {confirmDialog && confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{confirmDialog.title}</h3>
                        <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => confirmDialog.onConfirm()}
                                className="flex-1 py-4 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200"
                            >
                                Sim, Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
