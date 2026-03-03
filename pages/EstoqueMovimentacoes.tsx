import React, { useState } from 'react';
import { RefreshCcw, Search, Plus, ArrowDownRight, ArrowUpRight, ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';

// Mock de movimentações reais para visualizar o sistema funcionando
const MOCK_MOVIMENTACOES = [
    {
        id: '1',
        data: new Date('2026-03-02T14:30:00'),
        tipo: 'SAIDA',
        produto: 'Conector RJ45',
        sku: 'NET-001',
        quantidade: 50,
        deposito_origem: 'Estoque Central',
        deposito_destino: null,
        responsavel: 'Pablo (Técnico)',
        os: '#C54078',
        obs: 'Instalação cliente Roberta Mendes'
    },
    {
        id: '2',
        data: new Date('2026-03-02T10:15:00'),
        tipo: 'ENTRADA',
        produto: 'Roteador Wi-Fi AC1200',
        sku: 'WIFI-003',
        quantidade: 100,
        deposito_origem: null,
        deposito_destino: 'Estoque Central',
        responsavel: 'Admin Tech',
        os: null,
        obs: 'Compra Fornecedor X (NF 149302)'
    },
    {
        id: '3',
        data: new Date('2026-03-01T16:45:00'),
        tipo: 'TRANSFERENCIA',
        produto: 'Cabo de Rede CAT6',
        sku: 'CAB-002',
        quantidade: 300,
        deposito_origem: 'Estoque Central',
        deposito_destino: 'Veículo Antonio',
        responsavel: 'Admin Tech',
        os: null,
        obs: 'Abastecimento carro técnico para rotas'
    },
    {
        id: '4',
        data: new Date('2026-03-01T09:20:00'),
        tipo: 'AJUSTE',
        produto: 'Conector RJ45',
        sku: 'NET-001',
        quantidade: -5,
        deposito_origem: 'Estoque Central',
        deposito_destino: null,
        responsavel: 'Admin Tech',
        os: null,
        obs: 'Ajuste de inventário (Danificados)'
    },
];

export const getMovimentacoesMock = () => {
    const saved = localStorage.getItem('MOCK_MOVIMENTACOES');
    if (saved) {
        return JSON.parse(saved).map((m: any) => ({ ...m, data: new Date(m.data) }));
    }
    localStorage.setItem('MOCK_MOVIMENTACOES', JSON.stringify(MOCK_MOVIMENTACOES));
    return MOCK_MOVIMENTACOES;
};

export const appendMovimentacaoMock = (novo: any) => {
    const current = getMovimentacoesMock();
    const updated = [novo, ...current];
    localStorage.setItem('MOCK_MOVIMENTACOES', JSON.stringify(updated));
    return updated;
};


const TipoTag = ({ tipo }: { tipo: string }) => {
    switch (tipo) {
        case 'ENTRADA':
            return <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold"><ArrowDownRight size={14} /> ENTRADA</span>;
        case 'SAIDA':
            return <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-[11px] font-bold"><ArrowUpRight size={14} /> SAÍDA</span>;
        case 'TRANSFERENCIA':
            return <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full text-[11px] font-bold"><ArrowRightLeft size={14} /> TRANSF.</span>;
        case 'AJUSTE':
            return <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold"><SlidersHorizontal size={14} /> AJUSTE</span>;
        default:
            return null;
    }
};

export default function Movimentacoes() {
    const [movimentacoes, setMovimentacoes] = useState(getMovimentacoesMock());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tipoModal, setTipoModal] = useState<'ENTRADA' | 'TRANSFERENCIA' | 'SAIDA'>('ENTRADA');
    const [novoMov, setNovoMov] = useState({ produto: '', quantidade: '', origem: 'Estoque Central', destino: 'Estoque Central', obs: '' });

    const handleConfirmar = () => {
        const qt = Number(novoMov.quantidade) || 0;
        const novoItem = {
            id: String(Date.now()),
            data: new Date(),
            tipo: tipoModal === 'SAIDA' ? 'AJUSTE' : tipoModal,
            produto: novoMov.produto || 'Produto Padrão',
            sku: 'SKU-NEW',
            quantidade: (tipoModal === 'SAIDA') ? -Math.abs(qt) : Math.abs(qt),
            deposito_origem: (tipoModal === 'SAIDA' || tipoModal === 'TRANSFERENCIA') ? novoMov.origem : null,
            deposito_destino: (tipoModal === 'ENTRADA' || tipoModal === 'TRANSFERENCIA') ? novoMov.destino : null,
            responsavel: 'Admin',
            os: null,
            obs: novoMov.obs || 'Criada via sistema'
        };
        const updatedList = appendMovimentacaoMock(novoItem);
        setMovimentacoes(updatedList);
        setIsModalOpen(false);
        setNovoMov({ produto: '', quantidade: '', origem: 'Estoque Central', destino: 'Estoque Central', obs: '' });
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Movimentações</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Histórico de entradas, saídas e transferências</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm"
                    >
                        <Plus size={18} />
                        Nova Movimentação
                    </button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Toolbar */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative max-w-md w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search size={18} className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por produto, responsável ou OS..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700"
                        />
                    </div>
                </div>

                {/* Table itself */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data / Hora</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Qtd</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rotas / Depósitos</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Responsável/Vínculo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {movimentacoes.map((mov) => (
                                <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{format(mov.data, 'dd/MM/yyyy')}</div>
                                        <div className="text-xs font-semibold text-gray-500">{format(mov.data, 'HH:mm')}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <TipoTag tipo={mov.tipo} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{mov.produto}</div>
                                        <div className="text-xs font-medium text-gray-500">{mov.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-bold ${mov.tipo === 'ENTRADA' ? 'text-emerald-600' : mov.tipo === 'SAIDA' ? 'text-rose-600' : 'text-gray-900'}`}>
                                            {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SAIDA' ? '-' : ''}
                                            {Math.abs(mov.quantidade)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {mov.tipo === 'TRANSFERENCIA' ? (
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <span>{mov.deposito_origem}</span>
                                                <ArrowRightLeft size={14} className="text-gray-400" />
                                                <span>{mov.deposito_destino}</span>
                                            </div>
                                        ) : (
                                            <div className="text-sm font-semibold text-gray-700">
                                                {mov.deposito_destino || mov.deposito_origem}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{mov.responsavel}</div>
                                        {mov.os ? (
                                            <div className="text-[11px] font-bold text-blue-600 mt-0.5 cursor-pointer hover:underline">OS {mov.os}</div>
                                        ) : (
                                            <div className="text-[11px] font-medium text-gray-400 mt-0.5 truncate max-w-[150px]" title={mov.obs}>{mov.obs}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nova Movimentacao */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Registrar Movimentação</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Tipo de Movimentação</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setTipoModal('ENTRADA')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tipoModal === 'ENTRADA' ? 'border-2 border-emerald-500 text-emerald-700 bg-emerald-50' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Entrada</button>
                                    <button onClick={() => setTipoModal('TRANSFERENCIA')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tipoModal === 'TRANSFERENCIA' ? 'border-2 border-blue-500 text-blue-700 bg-blue-50' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Transferência</button>
                                    <button onClick={() => setTipoModal('SAIDA')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tipoModal === 'SAIDA' ? 'border-2 border-rose-500 text-rose-700 bg-rose-50' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Ajuste/Saída</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Produto</label>
                                <select value={novoMov.produto} onChange={(e) => setNovoMov({ ...novoMov, produto: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all">
                                    <option value="">Selecione um produto...</option>
                                    <option value="Conector RJ45">Conector RJ45 (NET-001)</option>
                                    <option value="Cabo de Rede CAT6">Cabo de Rede CAT6 (CAB-002)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Quantidade</label>
                                    <input type="number" value={novoMov.quantidade} onChange={(e) => setNovoMov({ ...novoMov, quantidade: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="0" />
                                </div>
                                {tipoModal !== 'ENTRADA' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Depósito Origem</label>
                                        <select value={novoMov.origem} onChange={(e) => setNovoMov({ ...novoMov, origem: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all">
                                            <option value="Estoque Central">Estoque Central</option>
                                            <option value="Veículo Pablo">Veículo Pablo</option>
                                        </select>
                                    </div>
                                )}
                                {tipoModal !== 'SAIDA' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Depósito Destino</label>
                                        <select value={novoMov.destino} onChange={(e) => setNovoMov({ ...novoMov, destino: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all">
                                            <option value="Estoque Central">Estoque Central</option>
                                            <option value="Veículo Pablo">Veículo Pablo</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Observação / NF</label>
                                <textarea value={novoMov.obs} onChange={(e) => setNovoMov({ ...novoMov, obs: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" rows={2} placeholder="Número da NF, motivo do ajuste, etc." />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                                onClick={handleConfirmar}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
