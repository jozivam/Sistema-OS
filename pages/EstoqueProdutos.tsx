import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

// Dados simulados para preencher a tabela inicialmente
const MOCK_PRODUTOS = [
    { id: '1', nome: 'Conector RJ45', categoria: 'Redes', sku: 'NET-001', unidade: 'UN', custo: 0.50, preco: 1.50, status: 'Ativo' },
    { id: '2', nome: 'Cabo de Rede CAT6', categoria: 'Cabeamento', sku: 'CAB-002', unidade: 'Metros', custo: 2.15, preco: 4.50, status: 'Ativo' },
    { id: '3', nome: 'Roteador Wi-Fi AC1200', categoria: 'Equipamentos', sku: 'WIFI-003', unidade: 'UN', custo: 120.00, preco: 250.00, status: 'Ativo' },
];

export default function Produtos() {
    const [produtos, setProdutos] = useState(MOCK_PRODUTOS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [novoForm, setNovoForm] = useState({ nome: '', categoria: 'Equipamentos', sku: '', custo: '', preco: '' });

    const filteredProdutos = produtos.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        const novo = {
            id: String(Date.now()),
            nome: novoForm.nome || 'Novo Produto',
            categoria: novoForm.categoria,
            sku: novoForm.sku || `SKU-${Math.floor(Math.random() * 1000)}`,
            unidade: 'UN',
            custo: parseFloat(novoForm.custo) || 0,
            preco: parseFloat(novoForm.preco) || 0,
            status: 'Ativo'
        };
        setProdutos([...produtos, novo]);
        setIsModalOpen(false);
        setNovoForm({ nome: '', categoria: 'Equipamentos', sku: '', custo: '', preco: '' });
    };

    const handleDelete = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este produto?")) {
            setProdutos(produtos.filter(p => p.id !== id));
        }
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Top Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gerenciar Produtos</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Catálogo completo de materiais e equipamentos</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm shadow-sm">
                        <Filter size={16} />
                        Filtrar
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm hover:shadow"
                    >
                        <Plus size={18} />
                        Novo Produto
                    </button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Table Toolbar / Search */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative max-w-md w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search size={18} className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nome, SKU ou categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700 placeholder-gray-400"
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-semibold px-2">
                        Total de {filteredProdutos.length} itens
                    </div>
                </div>

                {/* Table itself */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Custo Médio</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preço Final</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredProdutos.map((produto) => (
                                <tr key={produto.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{produto.nome}</div>
                                        <div className="text-sm font-medium text-gray-500 mt-0.5">Un: {produto.unidade}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">{produto.categoria}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-500">{produto.sku}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {produto.custo.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600">R$ {produto.preco.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 bg-emerald-50 text-emerald-700">
                                            {produto.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(produto.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo Produto (Simples) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Novo Produto</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Nome do Produto</label>
                                <input type="text" value={novoForm.nome} onChange={(e) => setNovoForm({ ...novoForm, nome: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="Ex: Roteador Wi-Fi" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Categoria</label>
                                    <input list="categorias-list" value={novoForm.categoria} onChange={(e) => setNovoForm({ ...novoForm, categoria: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="Selecione ou digite uma nova..." />
                                    <datalist id="categorias-list">
                                        <option value="Equipamentos" />
                                        <option value="Redes" />
                                        <option value="Ferramentas" />
                                        <option value="Cabeamento" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">SKU</label>
                                    <input type="text" value={novoForm.sku} onChange={(e) => setNovoForm({ ...novoForm, sku: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="Ex: EQ-001" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Custo Base (R$)</label>
                                    <input type="number" value={novoForm.custo} onChange={(e) => setNovoForm({ ...novoForm, custo: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Preço de Venda (R$)</label>
                                    <input type="number" value={novoForm.preco} onChange={(e) => setNovoForm({ ...novoForm, preco: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white text-sm font-medium transition-all" placeholder="0.00" />
                                </div>
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
                                onClick={handleAdd}
                            >
                                Cadastrar Produto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
