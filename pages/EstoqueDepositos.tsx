import React, { useState } from 'react';
import { Archive, Plus, Search, AlertTriangle, ArrowRightLeft, MapPin, Edit2, History, X } from 'lucide-react';
import { appendMovimentacaoMock, getMovimentacoesMock } from './EstoqueMovimentacoes';

const MOCK_DEPOSITOS = [
    { id: '1', nome: 'Estoque Central', localizacao: 'Sede Principal', tipo: 'Fixo' },
    { id: '2', nome: 'Veículo Pablo', localizacao: 'Rota Sul', tipo: 'Veículo' },
    { id: '3', nome: 'Veículo Antonio', localizacao: 'Rota Norte', tipo: 'Veículo' },
];

const MOCK_SALDOS = [
    { id: '1', produto: 'Conector RJ45', sku: 'NET-001', qtd_atual: 450, qtd_minima: 500, deposito_id: '1' },
    { id: '2', produto: 'Cabo de Rede CAT6', sku: 'CAB-002', qtd_atual: 1200, qtd_minima: 300, deposito_id: '1' },
    { id: '3', produto: 'Roteador Wi-Fi AC1200', sku: 'WIFI-003', qtd_atual: 45, qtd_minima: 20, deposito_id: '1' },
    { id: '4', produto: 'Conector RJ45', sku: 'NET-001', qtd_atual: 50, qtd_minima: 20, deposito_id: '2' },
    { id: '5', produto: 'Alicate Crimpador', sku: 'FER-001', qtd_atual: 1, qtd_minima: 1, deposito_id: '2' },
];

export default function DepositosSaldos() {
    const [depositos, setDepositos] = useState(MOCK_DEPOSITOS);
    const [saldos, setSaldos] = useState(MOCK_SALDOS);
    const [depositoAtivo, setDepositoAtivo] = useState(MOCK_DEPOSITOS[0].id);
    const [searchTerm, setSearchTerm] = useState('');

    const [isNovoDepositoModalOpen, setIsNovoDepositoModalOpen] = useState(false);
    const [novoDepositoForm, setNovoDepositoForm] = useState({ nome: '', localizacao: '' });

    const [itemOperacao, setItemOperacao] = useState<any>(null);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({ quantidade: '', destino: '' });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ qtd_atual: '', qtd_minima: '' });

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const saldoAtual = saldos.filter(s => s.deposito_id === depositoAtivo);
    const filteredSaldo = saldoAtual.filter(s =>
        s.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddDeposito = () => {
        if (novoDepositoForm.nome) {
            setDepositos([...depositos, {
                id: String(Date.now()),
                nome: novoDepositoForm.nome,
                localizacao: novoDepositoForm.localizacao || "ND",
                tipo: 'Fixo'
            }]);
            setIsNovoDepositoModalOpen(false);
            setNovoDepositoForm({ nome: '', localizacao: '' });
        }
    };

    const handleTransfer = () => {
        const qtd = Number(transferForm.quantidade);
        const destinoId = transferForm.destino;
        if (!qtd || qtd <= 0 || !destinoId || !itemOperacao) return;

        if (qtd > itemOperacao.qtd_atual) {
            alert("Quantidade insuficiente para transferência.");
            return;
        }

        let newSaldos = [...saldos];
        // 1. Reduzir da origem
        const origemIndex = newSaldos.findIndex(s => s.id === itemOperacao.id);
        newSaldos[origemIndex] = { ...newSaldos[origemIndex], qtd_atual: newSaldos[origemIndex].qtd_atual - qtd };

        // 2. Adicionar ao destino
        const destinoIndex = newSaldos.findIndex(s => s.produto === itemOperacao.produto && s.deposito_id === destinoId);
        if (destinoIndex >= 0) {
            newSaldos[destinoIndex] = { ...newSaldos[destinoIndex], qtd_atual: newSaldos[destinoIndex].qtd_atual + qtd };
        } else {
            newSaldos.push({
                ...itemOperacao,
                id: String(Date.now()),
                deposito_id: destinoId,
                qtd_atual: qtd
            });
        }

        setSaldos(newSaldos);

        // Log movement
        appendMovimentacaoMock({
            id: String(Date.now()),
            data: new Date(),
            tipo: 'TRANSFERENCIA',
            produto: itemOperacao.produto,
            sku: itemOperacao.sku,
            quantidade: qtd,
            deposito_origem: depositos.find(d => d.id === depositoAtivo)?.nome || 'Origem',
            deposito_destino: depositos.find(d => d.id === destinoId)?.nome || 'Destino',
            responsavel: 'Admin Tech',
            os: null,
            obs: 'Transferência manual pelo painel'
        });

        setIsTransferModalOpen(false);
        setTransferForm({ quantidade: '', destino: '' });
        setItemOperacao(null);
    };

    const handleEdit = () => {
        if (!itemOperacao) return;
        const newSaldos = saldos.map(s => {
            if (s.id === itemOperacao.id) {
                const newData = {
                    ...s,
                    qtd_atual: editForm.qtd_atual !== '' ? Number(editForm.qtd_atual) : s.qtd_atual,
                    qtd_minima: editForm.qtd_minima !== '' ? Number(editForm.qtd_minima) : s.qtd_minima,
                };

                // Track an adjustment movement if current quantity is changed
                if (newData.qtd_atual !== s.qtd_atual) {
                    const diff = newData.qtd_atual - s.qtd_atual;
                    appendMovimentacaoMock({
                        id: String(Date.now()),
                        data: new Date(),
                        tipo: diff > 0 ? 'ENTRADA' : 'SAIDA', // Using standard types or AJUSTE if preferable
                        produto: itemOperacao.produto,
                        sku: itemOperacao.sku,
                        quantidade: Math.abs(diff),
                        deposito_origem: diff < 0 ? (depositos.find(d => d.id === depositoAtivo)?.nome || 'Origem') : null,
                        deposito_destino: diff > 0 ? (depositos.find(d => d.id === depositoAtivo)?.nome || 'Destino') : null,
                        responsavel: 'Admin Tech',
                        os: null,
                        obs: 'Ajuste manual de estoque'
                    });
                }
                return newData;
            }
            return s;
        });
        setSaldos(newSaldos);
        setIsEditModalOpen(false);
        setEditForm({ qtd_atual: '', qtd_minima: '' });
        setItemOperacao(null);
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Top Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Depósitos & Saldos</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Controle distribuído de inventário e alertas de reposição</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setIsNovoDepositoModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm">
                        <Plus size={18} />
                        Novo Depósito
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Lista de Depósitos (Sidebar Esquerda) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit">
                    <div className="font-bold text-gray-900 mb-4 px-2 uppercase text-xs tracking-wider">Locais de Armazenamento</div>
                    <div className="space-y-2">
                        {depositos.map((dep) => (
                            <button
                                key={dep.id}
                                onClick={() => setDepositoAtivo(dep.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${depositoAtivo === dep.id
                                    ? 'bg-blue-600 shadow-md transform scale-[1.02] text-white'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                                    }`}
                            >
                                <div className={`font-bold ${depositoAtivo === dep.id ? 'text-white' : 'text-gray-900'}`}>
                                    {dep.nome}
                                </div>
                                <div className="flex items-center gap-1 mt-1 opacity-80">
                                    <MapPin size={12} />
                                    <span className="text-[11px] font-semibold uppercase">{dep.localizacao}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Visão do Saldo (Direita) */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">

                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Archive size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    {depositos.find(d => d.id === depositoAtivo)?.nome}
                                    <button onClick={() => setIsHistoryModalOpen(true)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-200 rounded-md transition-colors" title="Ver Histórico de Uso">
                                        <History size={16} />
                                    </button>
                                </h3>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Saldo Atual</p>
                            </div>
                        </div>

                        <div className="relative max-w-sm w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search size={18} className="text-gray-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar produto neste depósito..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-gray-700 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produto / SKU</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Qtd Atual</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status Mínimo</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {filteredSaldo.map((item) => {
                                    const isAbaixoMinimo = item.qtd_atual < item.qtd_minima;
                                    return (
                                        <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${isAbaixoMinimo ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{item.produto}</div>
                                                <div className="text-[11px] font-bold text-gray-400 mt-0.5">{item.sku}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-lg font-black text-gray-900">{item.qtd_atual}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    {isAbaixoMinimo ? (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg border border-red-200 shadow-sm">
                                                            <AlertTriangle size={14} className="animate-pulse" />
                                                            <span className="text-[11px] font-black uppercase tracking-wide">Repor (Mín: {item.qtd_minima})</span>
                                                        </div>
                                                    ) : (
                                                        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100/50">
                                                            <span className="text-[11px] font-black uppercase tracking-wide">Regular (Mín: {item.qtd_minima})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setItemOperacao(item);
                                                            setEditForm({ qtd_atual: String(item.qtd_atual), qtd_minima: String(item.qtd_minima) });
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                                                        title="Alterar Estoque"
                                                    >
                                                        <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setItemOperacao(item);
                                                            setIsTransferModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors group"
                                                        title="Transferir Estoque"
                                                    >
                                                        <ArrowRightLeft size={16} className="group-hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredSaldo.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                                            Nenhum produto com saldo neste depósito.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
            {/* Modal Novo Depósito */}
            {isNovoDepositoModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsNovoDepositoModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Novo Depósito</h3>
                            <button onClick={() => setIsNovoDepositoModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Nome</label>
                                <input type="text" value={novoDepositoForm.nome} onChange={(e) => setNovoDepositoForm({ ...novoDepositoForm, nome: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Ex: Veículo João" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Localização</label>
                                <input type="text" value={novoDepositoForm.localizacao} onChange={(e) => setNovoDepositoForm({ ...novoDepositoForm, localizacao: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Ex: Rota Sul" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button onClick={() => setIsNovoDepositoModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
                            <button onClick={handleAddDeposito} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Transferir */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Transferir Estoque</h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                                <div className="text-xs font-bold text-gray-500">PRODUTO</div>
                                <div className="text-sm font-bold text-gray-900">{itemOperacao?.produto}</div>
                                <div className="text-xs text-gray-500 mt-1">Disponível na Origem: <span className="font-bold text-blue-600">{itemOperacao?.qtd_atual}</span></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Quantidade a Transferir</label>
                                <input type="number" value={transferForm.quantidade} onChange={(e) => setTransferForm({ ...transferForm, quantidade: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Depósito Destino</label>
                                <select value={transferForm.destino} onChange={(e) => setTransferForm({ ...transferForm, destino: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                                    <option value="">Selecione um destino...</option>
                                    {depositos.filter(d => d.id !== depositoAtivo).map(d => (
                                        <option key={d.id} value={d.id}>{d.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button onClick={() => setIsTransferModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
                            <button onClick={handleTransfer} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Confirmar Transferência</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Alterar Estoque */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Alterar Estoque</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                                <div className="text-xs font-bold text-gray-500">PRODUTO</div>
                                <div className="text-sm font-bold text-gray-900">{itemOperacao?.produto}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Nova Quantidade Atual</label>
                                <input type="number" value={editForm.qtd_atual} onChange={(e) => setEditForm({ ...editForm, qtd_atual: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Novo Status Mínimo</label>
                                <input type="number" value={editForm.qtd_minima} onChange={(e) => setEditForm({ ...editForm, qtd_minima: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="0" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
                            <button onClick={handleEdit} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Histórico de Movimentações</h3>
                                <p className="text-xs font-medium text-gray-500 mt-1">Registros deste depósito</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                                {(() => {
                                    const depName = depositos.find(d => d.id === depositoAtivo)?.nome;
                                    const relatedMoves = getMovimentacoesMock().filter((m: any) => m.deposito_origem === depName || m.deposito_destino === depName);

                                    if (relatedMoves.length === 0) {
                                        return <div className="pl-6 text-sm text-gray-500">Nenhuma movimentação para este depósito.</div>;
                                    }

                                    return relatedMoves.slice(0, 10).map((mov: any, index: number) => (
                                        <div key={mov.id || index} className="relative pl-6">
                                            <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
                                            <div className="text-[11px] font-bold text-gray-400 mb-1">{mov.data.toLocaleDateString('pt-BR')} - {mov.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <div className="font-bold text-gray-900 text-sm mb-1">{mov.tipo === 'SAIDA' ? 'Saída/Baixa' : mov.tipo === 'ENTRADA' ? 'Entrada' : 'Transferência'}</div>
                                                <div className="text-xs font-medium text-blue-600 mb-3 hover:underline cursor-pointer">{mov.os || 'Sem OS vinculada'} - {mov.responsavel}</div>
                                                <ul className="space-y-2">
                                                    <li className="flex justify-between items-center text-sm font-medium text-gray-600">
                                                        <span>{mov.produto}</span>
                                                        <span className={`font-bold ${mov.deposito_destino === depName ? 'text-emerald-600' : 'text-rose-600'}`}>{mov.deposito_destino === depName ? '+' : '-'}{Math.abs(mov.quantidade)}</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
