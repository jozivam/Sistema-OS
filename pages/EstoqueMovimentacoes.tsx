import React, { useState, useEffect } from 'react';
import { RefreshCcw, Search, Plus, ArrowDownRight, ArrowUpRight, ArrowRightLeft, SlidersHorizontal, X, FileText, User, Calendar, MapPin, Package, Info, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { StockMovement, Product, StorageLocation, Supplier } from '../types';
import { cn } from '../utils/ui';
import { SearchableSelect } from '../components/SearchableSelect';

// Framer Motion Variants
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { opacity: 0, scale: 0.95, y: 20 }
};

const drawerVariants = {
    hidden: { x: '100%' },
    visible: {
        x: 0,
        transition: { type: "spring", damping: 30, stiffness: 300 }
    },
    exit: { x: '100%' }
};

const TipoTag = ({ tipo }: { tipo: string }) => {
    switch (tipo) {
        case 'ENTRADA':
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-wider glow-emerald/20">
                    <ArrowDownRight size={14} className="animate-pulse" /> ENTRADA
                </div>
            );
        case 'SAIDA':
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <ArrowUpRight size={14} /> SAÍDA
                </div>
            );
        case 'TRANSFERENCIA':
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <ArrowRightLeft size={14} /> TRANSF.
                </div>
            );
        case 'AJUSTE':
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <SlidersHorizontal size={14} /> AJUSTE
                </div>
            );
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
    const [isLocationQuickModalOpen, setIsLocationQuickModalOpen] = useState(false);
    const [locationForm, setLocationForm] = useState({ nome: '', localizacao: '', ativo: true });
    const [localStocks, setLocalStocks] = useState<Record<string, number>>({});
    const [destStocks, setDestStocks] = useState<Record<string, number>>({});
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm });
    };

    const initialMovement = {
        tipo: 'ENTRADA' as const,
        produtoId: '',
        quantidade: 1,
        origemId: '',
        destinoId: '',
        fornecedorId: '',
        documentRef: '',
        observacoes: '',
        barcodes: [''] as string[]
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

            // Pré-selecionar primeiro local (Matriz) se houver
            const matriz = lData.find(l => l.nome.toUpperCase().includes('MATRIZ'));
            if (matriz) {
                setFormMovement(prev => ({ ...prev, origemId: matriz.id, destinoId: '' }));
            } else if (lData.length > 0 && !formMovement.origemId) {
                setFormMovement(prev => ({ ...prev, origemId: lData[0].id }));
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newLoc = await dbService.createStorageLocation({ ...locationForm, companyId: companyId! });
            setLocations([...locations, newLoc]);
            setIsLocationQuickModalOpen(false);
            setLocationForm({ nome: '', localizacao: '', ativo: true });
            showToast("Local criado com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao criar local.", "error");
        }
    };

    // Carregar saldos locais ao selecionar origem/ponto de saída
    useEffect(() => {
        const loadLocStocks = async () => {
            const targetLocId = (formMovement.tipo === 'SAIDA' || formMovement.tipo === 'TRANSFERENCIA') ? formMovement.origemId : '';

            if (!companyId || !targetLocId) {
                setLocalStocks({});
                return;
            }

            try {
                setLoadingStocks(true);
                const stocks = await dbService.getStocksByLocation(companyId, targetLocId);
                setLocalStocks(stocks);
            } catch (error) {
                console.error("Erro ao carregar saldos locais:", error);
            } finally {
                setLoadingStocks(false);
            }
        };

        loadLocStocks();
    }, [companyId, formMovement.origemId, formMovement.tipo]);

    useEffect(() => {
        const loadDestStocks = async () => {
            const destLocId = formMovement.tipo === 'TRANSFERENCIA' ? formMovement.destinoId : '';
            if (!companyId || !destLocId) {
                setDestStocks({});
                return;
            }
            try {
                const stocks = await dbService.getStocksByLocation(companyId, destLocId);
                setDestStocks(stocks);
            } catch (error) {
                console.error("Erro ao carregar saldos de destino:", error);
            }
        };
        loadDestStocks();
    }, [companyId, formMovement.destinoId, formMovement.tipo]);

    const handleReturnMovement = async (m: StockMovement) => {
        // 1. Prevenir duplicidade: Verificamos se já existe uma devolução para este ID nos logs
        const jaDevolvido = movements.some(mov => mov.observacoes?.includes(`Ref: ${m.id.slice(0, 8)}`));
        if (jaDevolvido) {
            showToast("Este item já foi devolvido para o estoque!", "warning");
            return;
        }

        requestConfirm("Devolver Produto", `Deseja devolver estas ${m.quantidade} unidades para o estoque da loja?`, async () => {
            try {
                setIsSubmitting(true);
                const user = await authService.getCurrentUser();

                // 2. Verificar se o local de destino (onde o produto está agora) tem saldo suficiente
                if (m.destinoId) {
                    const saldoAtual = await dbService.getProductBalance(m.produtoId, m.destinoId);
                    if (saldoAtual < m.quantidade) {
                        showToast(`O local de destino não possui saldo suficiente (${saldoAtual}) para realizar esta devolução de ${m.quantidade} unidades.`, "error");
                        setIsSubmitting(false);
                        return;
                    }
                }

                await dbService.createStockMovement({
                    companyId: companyId!,
                    produtoId: m.produtoId,
                    tipo: 'ENTRADA', // Retorno vira uma Entrada na loja
                    quantidade: m.quantidade,
                    destinoId: m.origemId, // Volta de onde saiu (Ex: Loja/Matriz se existisse, mas aqui é o campo origemId salvo)
                    origemId: m.destinoId, // Sai do técnico/local atual
                    userId: user?.id,
                    userName: user?.name || 'Sistema',
                    observacoes: `DEVOLUÇÃO AUTOMÁTICA (Ref: ${m.id.slice(0, 8)})`
                });

                await loadData();
                setIsDetailsOpen(false);
                setConfirmDialog(null);
                showToast("Produto devolvido ao estoque central!", "success");
            } catch (error: any) {
                console.error("Erro ao devolver produto:", error);
                showToast("Erro ao processar devolução.", "error");
            } finally {
                setIsSubmitting(false);
            }
        });
    };

    const handleDeleteMovement = async (id: string) => {
        requestConfirm("Excluir Movimentação", "Atenção: Excluir uma movimentação irá desfazer o impacto dela no estoque global. Deseja continuar?", async () => {
            try {
                setIsSubmitting(true);
                await dbService.deleteStockMovement(id);
                await loadData();
                setIsDetailsOpen(false);
                setConfirmDialog(null);
                showToast("Movimentação excluída e estoque sincronizado.", "success");
            } catch (error) {
                console.error("Erro ao deletar:", error);
                showToast("Erro ao deletar movimentação.", "error");
            } finally {
                setIsSubmitting(false);
            }
        });
    };

    const handleCreateMovement = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação básica
        if (!formMovement.produtoId) {
            showToast("Por favor, selecione um produto.", "error");
            return;
        }

        if (formMovement.tipo === 'ENTRADA' && formMovement.destinoId) {
            // Em ENTRADA, nunca selecionamos o Destino na UI (o destino é sempre o catálogo principal)
            formMovement.destinoId = '';
        }

        if (formMovement.tipo === 'SAIDA' && formMovement.origemId) {
            // Em SAIDA, nunca selecionamos a Origem na UI (a origem é sempre o catálogo principal)
            formMovement.origemId = '';
        }

        if (formMovement.tipo === 'TRANSFERENCIA' && (!formMovement.origemId || !formMovement.destinoId)) {
            showToast("Informe origem e destino.", "error");
            return;
        }

        if (formMovement.tipo === 'TRANSFERENCIA' && formMovement.origemId === formMovement.destinoId) {
            showToast("Locais devem ser diferentes.", "error");
            return;
        }

        // Validação de Observações Obrigatórias removida para permitir entrada 100% em branco (Origem Desconhecida)

        if (formMovement.tipo === 'SAIDA' && !formMovement.destinoId && !formMovement.observacoes) {
            showToast("Como a Saída não possui um Destino (Técnico/Cliente) especificado, é obrigatório registrar a finalidade no campo Observações.", "warning");
            return;
        }

        // Bloqueio de Saldo Negativo para SAIDA e TRANSFERENCIA
        if (formMovement.tipo === 'SAIDA' || formMovement.tipo === 'TRANSFERENCIA') {
            let saldoOrigem = 0;
            if (formMovement.tipo === 'TRANSFERENCIA' && formMovement.origemId) {
                saldoOrigem = localStocks[formMovement.produtoId] || 0;
            } else if (formMovement.tipo === 'SAIDA') {
                saldoOrigem = products.find(p => p.id === formMovement.produtoId)?.quantidadeEstoque || 0;
            }

            if (formMovement.quantidade > saldoOrigem) {
                showToast(`OPERAÇÃO BLOQUEADA. A quantidade solicitada (${formMovement.quantidade}) é maior que a disponível (${saldoOrigem}). É proibido registrar saldo negativo.`, "error");
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const user = await authService.getCurrentUser();

            if (!companyId) {
                throw new Error("ID da empresa não encontrado. Tente recarregar a página.");
            }

            // Tratar seriais
            const notasBarcodes = formMovement.barcodes.filter(b => b.trim() !== '').join(', ');
            let objObservacoes = formMovement.observacoes;
            if (notasBarcodes) {
                objObservacoes += (objObservacoes ? `\nCódigos/Seriais: ${notasBarcodes}` : `Códigos/Seriais: ${notasBarcodes}`);
            }

            await dbService.createStockMovement({
                ...formMovement,
                observacoes: objObservacoes,
                companyId,
                userId: user?.id,
                userName: user?.name || 'Sistema'
            });

            // Se for entrada e tiver seriais, ou se for saída, atualizar arrays de seriais na DB. 
            // Opcional para catálogo: (deixamos simplificado pondo nas observações p/ rastreio temporal por enquanto, 
            // no futuro a collection de Variations faria match mais forte).

            // Opcional: Atualizar a quantidade total no produto (Trigger já faz isso, mas aqui atualizamos a UI local)
            await loadData();

            setIsModalOpen(false);
            setFormMovement(initialMovement);
            showToast("Movimentação registrada com sucesso!", "success");
        } catch (error: any) {
            console.error("Erro ao realizar movimentação:", error);
            showToast("Erro ao registrar: " + (error.message || "Verifique os dados e tente novamente."), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getProductName = (id: string) => products.find(p => p.id === id)?.nome || 'Produto Desconhecido';
    const getProductSku = (id: string) => products.find(p => p.id === id)?.sku || '---';
    const getLocationName = (id?: string) => locations.find(l => l.id === id)?.nome || 'Desconhecido';

    const formatOrigemEntrada = (m: StockMovement) => {
        if (m.origemId) return getLocationName(m.origemId);
        if (m.fornecedorId) {
            const f = suppliers.find(s => s.id === m.fornecedorId);
            return f ? `FORNECEDOR: ${f.name.toUpperCase()}` : 'FORNECEDOR';
        }
        return 'ORIGEM DESCONHECIDA';
    };

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
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-sm shadow-lg shadow-blue-200"
                    >
                        <Plus size={20} />
                        NOVA MOVIMENTAÇÃO
                    </motion.button>
                    <motion.button
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => loadData()}
                        className="p-3 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                        title="Atualizar dados"
                    >
                        <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </motion.button>
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
                                            ) : m.tipo === 'SAIDA' ? (
                                                <>
                                                    <span className="text-rose-500">ESTOQUE CENTRAL</span>
                                                    <ArrowRightLeft size={12} className="text-slate-300" />
                                                    <span className="text-emerald-500">{getLocationName(m.destinoId)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-rose-500">{formatOrigemEntrada(m)}</span>
                                                    <ArrowRightLeft size={12} className="text-slate-300" />
                                                    <span className="text-emerald-500">ESTOQUE CENTRAL</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <motion.button
                                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => { setSelectedMovement(m); setIsDetailsOpen(true); }}
                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm"
                                        >
                                            <Info size={18} />
                                        </motion.button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Nova Movimentação */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm z-[190]"
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            className="relative bg-white border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col z-[200] rounded-[2.5rem]"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nova Movimentação</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronização de estoque físico</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all flex items-center justify-center hover:bg-slate-100"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                <form onSubmit={handleCreateMovement} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ação</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['ENTRADA', 'SAIDA', 'TRANSFERENCIA'].map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => {
                                                            const newTipo = t as any;
                                                            setFormMovement(prev => {
                                                                let newOrigemId = prev.origemId;
                                                                let newDestinoId = prev.destinoId;

                                                                // Clear IDs based on the new type's requirements
                                                                if (newTipo === 'ENTRADA') {
                                                                    // ENTRADA: We record where it COMES FROM (origemId). destination is implicitly the central catalog.
                                                                    newDestinoId = '';
                                                                } else if (newTipo === 'SAIDA') {
                                                                    // SAIDA: We record where it GOES TO (destinoId). origin is implicitly the central catalog.
                                                                    newOrigemId = '';
                                                                } else if (newTipo === 'TRANSFERENCIA') {
                                                                    // TRANSFERENCIA: both origemId and destinoId are internal
                                                                    // No specific clearing needed unless we want to force re-selection
                                                                }

                                                                return {
                                                                    ...prev,
                                                                    tipo: newTipo,
                                                                    origemId: newOrigemId,
                                                                    destinoId: newDestinoId
                                                                };
                                                            });
                                                        }}
                                                        className={cn(
                                                            "py-4 rounded-2xl font-black text-xs transition-premium border-2 border-transparent",
                                                            formMovement.tipo === t
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border-slate-100'
                                                        )}
                                                    >
                                                        {t === 'ENTRADA' ? 'ENTRADA' : t === 'SAIDA' ? 'SAÍDA' : 'TRANSF.'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        label="Produto"
                                                        placeholder="Escolha o produto..."
                                                        options={products
                                                            .filter(p => {
                                                                if ((formMovement.tipo === 'SAIDA' || formMovement.tipo === 'TRANSFERENCIA') && formMovement.origemId) {
                                                                    // Ocultar zerados
                                                                    return (localStocks[p.id] || 0) > 0;
                                                                }
                                                                return true;
                                                            })
                                                            .map(p => ({
                                                                id: p.id,
                                                                label: p.nome,
                                                                subLabel: `SKU: ${p.sku} | Total Global: ${p.quantidadeEstoque}${formMovement.origemId && (formMovement.tipo === 'SAIDA' || formMovement.tipo === 'TRANSFERENCIA') ? ` | Disponível Origem: ${localStocks[p.id] || 0}` : ''}`
                                                            }))}
                                                        value={formMovement.produtoId}
                                                        onChange={(id) => setFormMovement({ ...formMovement, produtoId: id })}
                                                    />
                                                    {formMovement.produtoId && (
                                                        <div className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                            <Package size={12} />
                                                            Saldo Atual: {products.find(p => p.id === formMovement.produtoId)?.quantidadeEstoque || 0}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsProductModalOpen(true)}
                                                    className="mb-0.5 p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-premium"
                                                    title="Cadastrar Novo Produto"
                                                >
                                                    <Plus size={24} />
                                                </button>
                                            </div>
                                        </div>

                                        {formMovement.tipo === 'ENTRADA' && (
                                            <>
                                                <div>
                                                    <SearchableSelect
                                                        label="Fornecedor"
                                                        placeholder="Buscar fornecedor..."
                                                        options={[{ id: '', label: '• NENHUM FORNECEDOR / DESCONHECIDO' }, ...suppliers.map(s => ({
                                                            id: s.id,
                                                            label: s.name,
                                                            subLabel: s.document || '---'
                                                        }))]}
                                                        value={formMovement.fornecedorId}
                                                        onChange={(id) => setFormMovement({ ...formMovement, fornecedorId: id })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nº Nota Fiscal</label>
                                                    <input
                                                        type="text"
                                                        value={formMovement.documentRef}
                                                        onChange={e => setFormMovement({ ...formMovement, documentRef: e.target.value })}
                                                        placeholder="Ex: 000.123.456"
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-900 uppercase placeholder:text-slate-300 focus:border-blue-500 outline-none"
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
                                                onChange={e => {
                                                    const q = Number(e.target.value);
                                                    setFormMovement(prev => {
                                                        const barcodes = [...prev.barcodes];
                                                        if (q > barcodes.length) {
                                                            while (barcodes.length < q) barcodes.push('');
                                                        } else {
                                                            barcodes.length = q;
                                                        }
                                                        return { ...prev, quantidade: q, barcodes };
                                                    });
                                                }}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm text-center text-slate-900 focus:border-blue-500 outline-none"
                                            />
                                        </div>

                                        <div className="col-span-2 grid grid-cols-1 gap-6">
                                            {/* ENTRADA: Entra no estoque principal da loja. */}
                                            {formMovement.tipo === 'ENTRADA' && (
                                                <div className="flex gap-2 items-end w-full">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            label="ORIGEM (DE ONDE ESTÁ VINDO? EX: DEVOLUÇÃO DO TÉCNICO)"
                                                            placeholder="Escolha a origem (opcional)..."
                                                            options={[{ id: '', label: '• ORIGEM DESCONHECIDA / EXTERNA' }, ...locations.map(l => ({ id: l.id, label: l.nome }))]}
                                                            value={formMovement.origemId}
                                                            onChange={(id) => setFormMovement(prev => ({ ...prev, origemId: id, destinoId: '' }))}
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => setIsLocationQuickModalOpen(true)} className="mb-0.5 p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-2xl hover:bg-blue-50 transition-premium">
                                                        <Plus size={24} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* SAIDA: Sai da loja e vai para alguém. Destino ganha o produto. */}
                                            {formMovement.tipo === 'SAIDA' && (
                                                <div className="flex gap-2 items-end w-full">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            label="PARA QUAL TÉCNICO / DESTINO VAI?"
                                                            placeholder="Escolha o destinatário..."
                                                            options={locations.map(l => ({ id: l.id, label: l.nome }))}
                                                            value={formMovement.destinoId}
                                                            onChange={(id) => setFormMovement(prev => ({ ...prev, destinoId: id, origemId: '' }))}
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => setIsLocationQuickModalOpen(true)} className="mb-0.5 p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-2xl hover:bg-blue-50 transition-premium">
                                                        <Plus size={24} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* TRANSFERENCIA: Standard dual location entry */}
                                            {formMovement.tipo === 'TRANSFERENCIA' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="relative">
                                                        <SearchableSelect
                                                            label="ORIGEM"
                                                            placeholder="De onde sai?"
                                                            options={locations.map(l => ({ id: l.id, label: l.nome }))}
                                                            value={formMovement.origemId}
                                                            onChange={(id) => setFormMovement(prev => ({ ...prev, origemId: id }))}
                                                        />
                                                        {formMovement.origemId && formMovement.produtoId && (
                                                            <div className="mt-1 px-2 py-1 bg-rose-50 text-rose-600 rounded inline-block text-[10px] font-black">
                                                                Saldo Origem: {localStocks[formMovement.produtoId] || 0}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <SearchableSelect
                                                            label="DESTINO"
                                                            placeholder="Para onde vai?"
                                                            options={locations.map(l => ({ id: l.id, label: l.nome }))}
                                                            value={formMovement.destinoId}
                                                            onChange={(id) => setFormMovement(prev => ({ ...prev, destinoId: id }))}
                                                        />
                                                        {formMovement.destinoId && formMovement.produtoId && (
                                                            <div className="mt-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded inline-block text-[10px] font-black">
                                                                Saldo Destino Atual: {destStocks[formMovement.produtoId] || 0}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex justify-between">
                                                Observações / Motivo
                                                {((formMovement.tipo === 'ENTRADA' && !formMovement.origemId && !formMovement.fornecedorId) || (formMovement.tipo === 'SAIDA' && !formMovement.destinoId)) && (
                                                    <span className="text-rose-500 font-bold">* Obrigatório neste caso</span>
                                                )}
                                            </label>
                                            <textarea
                                                value={formMovement.observacoes}
                                                onChange={e => setFormMovement({ ...formMovement, observacoes: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs text-slate-900 placeholder:text-slate-300 focus:border-blue-500 outline-none"
                                                placeholder={((formMovement.tipo === 'ENTRADA' && !formMovement.origemId && !formMovement.fornecedorId) || (formMovement.tipo === 'SAIDA' && !formMovement.destinoId)) ? "Ex: Motivo da movimentação avulsa" : "Ex: Recebimento, Saída para instalação..."}
                                                rows={2}
                                            />
                                        </div>

                                        {(formMovement.tipo === 'SAIDA' || formMovement.tipo === 'ENTRADA') && (
                                            <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Package size={16} className="text-slate-400" />
                                                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Códigos de Barras / Seriais das Unidades</h4>
                                                </div>
                                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {products.find(p => p.id === formMovement.produtoId)?.unidadeMedida === 'UN' ? (
                                                        Array.from({ length: formMovement.quantidade }).map((_, idx) => (
                                                            <div key={idx} className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{(idx + 1).toString().padStart(2, '0')}</span>
                                                                <input
                                                                    type="text"
                                                                    value={formMovement.barcodes[idx] || ''}
                                                                    onChange={e => {
                                                                        const newBc = [...formMovement.barcodes];
                                                                        newBc[idx] = e.target.value;
                                                                        setFormMovement({ ...formMovement, barcodes: newBc });
                                                                    }}
                                                                    placeholder="Bipe ou digite o Cód. Barras / Serial"
                                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
                                                                />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={formMovement.barcodes[0] || ''}
                                                                onChange={e => setFormMovement({ ...formMovement, barcodes: [e.target.value] })}
                                                                placeholder="Cód. Barras (Opcional)"
                                                                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
                                                            />
                                                        </div>
                                                    )}
                                                    {!formMovement.produtoId && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">Selecione um produto primeiro</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={cn(
                                            "w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/10 hover:bg-blue-500 transition-premium mt-4 flex items-center justify-center gap-2",
                                            isSubmitting && "opacity-70 cursor-not-allowed bg-slate-400 shadow-none"
                                        )}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCcw size={18} className="animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            'Registrar Movimentação'
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast e Dialog */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[99999] px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-emerald-500' :
                    toast.type === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-500' :
                        'bg-rose-600 text-white border-rose-400'
                    }`}>
                    {toast.type === 'success' && <Info size={16} className="text-emerald-500" />}
                    {toast.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                    {toast.type === 'error' && <AlertTriangle size={16} className="text-white" />}
                    {toast.message}
                </div>
            )}

            {confirmDialog && confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{confirmDialog.title}</h3>
                        <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmDialog.onConfirm()}
                                className="flex-1 py-4 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200"
                            >
                                Sim, Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Detalhes (Drawer) */}
            <AnimatePresence>
                {
                    isDetailsOpen && selectedMovement && (
                        <div className="fixed inset-0 z-[300] flex justify-end">
                            <motion.div
                                className="fixed inset-0 glass-overlay"
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={() => setIsDetailsOpen(false)}
                            />
                            <motion.div
                                className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-100"
                                variants={drawerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Detalhes do Evento</h3>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">ID: {selectedMovement.id.slice(0, 8)}</p>
                                    </div>
                                    <button
                                        onClick={() => setIsDetailsOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-premium hover:bg-slate-200"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-white">
                                    {/* Status Header */}
                                    <div className="flex justify-center">
                                        <TipoTag tipo={selectedMovement.tipo} />
                                    </div>

                                    {/* Info Blocks */}
                                    <div className="space-y-6">
                                        <div className="flex gap-4 group">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-premium shadow-sm">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</p>
                                                <p className="font-black text-slate-900">{getProductName(selectedMovement.produtoId)}</p>
                                                <p className="text-xs font-bold text-slate-400">SKU: {getProductSku(selectedMovement.produtoId)}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 group">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-premium shadow-sm">
                                                <Calendar size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data e Hora</p>
                                                <p className="font-black text-slate-900">{selectedMovement.createdAt ? format(new Date(selectedMovement.createdAt), "dd 'de' MMMM, yyyy") : '---'}</p>
                                                <p className="text-xs font-bold text-slate-400">{selectedMovement.createdAt ? format(new Date(selectedMovement.createdAt), "HH:mm:ss") : '---'}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 group">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-premium shadow-sm">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</p>
                                                <p className="font-black text-slate-900">{selectedMovement.userName}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 group">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-premium shadow-sm">
                                                <MapPin size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo</p>
                                                <div className="mt-2 space-y-2">
                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Origem</span>
                                                        <span className="text-xs font-black text-slate-900">
                                                            {selectedMovement.tipo === 'SAIDA' ? 'ESTOQUE CENTRAL' : formatOrigemEntrada(selectedMovement)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Destino</span>
                                                        <span className="text-xs font-black text-slate-900">
                                                            {selectedMovement.tipo === 'ENTRADA' ? 'ESTOQUE CENTRAL' : getLocationName(selectedMovement.destinoId)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 group">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-premium shadow-sm">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações / NF</p>
                                                <p className="text-sm font-bold text-slate-600 mt-1 italic leading-relaxed">
                                                    {selectedMovement.observacoes || 'Nenhuma observação registrada.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-3">
                                    {selectedMovement.tipo === 'SAIDA' && (
                                        <button
                                            type="button"
                                            onClick={() => handleReturnMovement(selectedMovement)}
                                            disabled={isSubmitting}
                                            className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:bg-orange-500 transition-premium flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={18} />
                                            Devolver para Loja
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMovement(selectedMovement.id)}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-rose-100 transition-premium flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={18} />
                                        Excluir Movimentação
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDetailsOpen(false)}
                                        className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-premium"
                                    >
                                        Fechar Detalhes
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Modal de Local Rápido */}
            <AnimatePresence>
                {
                    isLocationQuickModalOpen && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                            <motion.div
                                className="fixed inset-0 bg-slate-500/40 backdrop-blur-sm"
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={() => setIsLocationQuickModalOpen(false)}
                            />
                            <motion.div
                                className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <div className="p-6 border-b flex justify-between items-center bg-white">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Novo Local</h3>
                                    <button onClick={() => setIsLocationQuickModalOpen(false)} className="text-slate-400 hover:text-slate-900"><Plus size={24} className="rotate-45" /></button>
                                </div>
                                <form onSubmit={handleQuickLocation} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nome do Local/Depósito *</label>
                                        <input required type="text" value={locationForm.nome} onChange={e => setLocationForm({ ...locationForm, nome: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-sm" placeholder="Ex: Viatura 10, Técnico João..." />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsLocationQuickModalOpen(false)} className="flex-1 py-3.5 font-black text-slate-500 uppercase tracking-widest text-[10px]">Cancelar</button>
                                        <button type="submit" className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Criar Local</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* Modal de Cadastro de Produto Aninhado */}
            <AnimatePresence>
                {
                    isProductModalOpen && (
                        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                            <motion.div
                                className="fixed inset-0 glass-overlay"
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={() => setIsProductModalOpen(false)}
                            />
                            <motion.div
                                className="relative bg-white w-full max-w-4xl overflow-hidden shadow-2xl rounded-[2.5rem] border border-slate-100"
                                variants={modalVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Novo Produto (Rápido)</h3>
                                    <button
                                        onClick={() => setIsProductModalOpen(false)}
                                        className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-premium flex items-center justify-center hover:bg-slate-200"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-8 overflow-y-auto max-h-[80vh] custom-scrollbar bg-white">
                                    <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest text-center italic">Crie o item aqui para vinculá-lo à movimentação imediatamente</p>

                                    <ProductQuickForm
                                        companyId={companyId!}
                                        onSuccess={(newProd) => {
                                            loadData();
                                            setIsProductModalOpen(false);
                                            setFormMovement(prev => ({ ...prev, produtoId: newProd.id }));
                                        }}
                                        onCancel={() => setIsProductModalOpen(false)}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
        </div >
    )
}

// Componente Interno para Cadastro Rápido
function ProductQuickForm({ companyId, onSuccess, onCancel }: { companyId: string, onSuccess: (p: Product) => void, onCancel: () => void }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: '',
        sku: '',
        precoVenda: 0,
        valorCompra: 0,
        margemLucro: 0,
        categoria: '',
        unidadeMedida: 'UN' as any,
        quantidadeEstoque: 0
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
        <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-6">
            <div className="col-span-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome do Produto *</label>
                <input required type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" placeholder="Ex: Câmera IP 1080p" />
            </div>
            <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">SKU / Código *</label>
                <input required type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" placeholder="CAM-001" />
            </div>

            <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Unidade</label>
                <select value={form.unidadeMedida} onChange={e => setForm({ ...form, unidadeMedida: e.target.value as any })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none">
                    <option value="UN">UNIDADE (UN)</option>
                    <option value="MT">METRO (MT)</option>
                    <option value="KM">KILÔMETRO (KM)</option>
                    <option value="LT">LITRO (LT)</option>
                    <option value="KG">QUILO (KG)</option>
                    <option value="PC">PEÇA (PC)</option>
                </select>
            </div>

            <div className="col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor de Compra (R$)</label>
                <input type="number" step="0.01" value={form.valorCompra} onChange={e => setForm({ ...form, valorCompra: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div className="col-span-3">
                <label className="block text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest">Preço de Venda (R$)</label>
                <input type="number" step="0.01" value={form.precoVenda} onChange={e => setForm({ ...form, precoVenda: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-emerald-600 focus:border-emerald-500 outline-none transition-all" />
            </div>

            <div className="col-span-6 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-premium">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-premium shadow-xl shadow-blue-500/20 disabled:opacity-50">
                    {loading ? 'Processando...' : 'Cadastrar e Salvar'}
                </button>
            </div>
        </form>
    );
}
