import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, MapPin, Building2, Phone } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Supplier } from '../types';
import { authService } from '../services/authService';
import { maskDocument, maskPhone, maskCEP } from '../utils/format';

export default function EstoqueFornecedores() {
    const [companyId, setCompanyId] = useState<string | null>(null);

    const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const formInicial = {
        name: '',
        corporateName: '',
        document: '',
        phone: '',
        email: '',
        zipCode: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => {
        carregarCompanyId();
    }, []);

    const carregarCompanyId = async () => {
        const currentUser = await authService.getCurrentUser();
        if (currentUser?.companyId) {
            setCompanyId(currentUser.companyId);
        }
    };

    useEffect(() => {
        if (companyId) {
            carregarFornecedores();
        }
    }, [companyId]);

    const carregarFornecedores = async () => {
        try {
            setIsLoading(true);
            const data = await dbService.getSuppliers(companyId);
            setFornecedores(data);
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
            alert('Erro ao carregar lista de fornecedores.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await dbService.updateSupplier(isEditing, formData);
            } else {
                await dbService.createSupplier({
                    ...formData,
                    companyId: companyId!,
                    status: 'ACTIVE'
                });
            }
            await carregarFornecedores();
            fecharModal();
        } catch (error) {
            console.error("Erro ao salvar fornecedor:", error);
            alert("Erro ao salvar fornecedor.");
        }
    };

    const handleEdit = (fornecedor: Supplier) => {
        setFormData({
            ...formInicial,
            name: fornecedor.name || '',
            corporateName: fornecedor.corporateName || '',
            document: fornecedor.document || '',
            phone: fornecedor.phone || '',
            email: fornecedor.email || '',
            zipCode: fornecedor.zipCode || '',
            address: fornecedor.address || '',
            number: fornecedor.number || '',
            complement: fornecedor.complement || '',
            neighborhood: fornecedor.neighborhood || '',
            city: fornecedor.city || '',
            state: fornecedor.state || ''
        });
        setIsEditing(fornecedor.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
            try {
                await dbService.deleteSupplier(id);
                await carregarFornecedores();
            } catch (error) {
                console.error("Erro ao deletar fornecedor:", error);
                alert("Erro ao excluir fornecedor.");
            }
        }
    };

    const fecharModal = () => {
        setFormData(formInicial);
        setIsEditing(null);
        setIsModalOpen(false);
    };

    const filteredFornecedores = fornecedores.filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.document?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Top Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gerenciar Fornecedores</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Cadastro de fornecedores com dados para NF-e</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setFormData(formInicial);
                            setIsEditing(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm hover:shadow"
                    >
                        <Plus size={18} />
                        Novo Fornecedor
                    </button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative max-w-md w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search size={18} className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nome ou documento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-medium text-gray-700 placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fornecedor</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Localidade</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-gray-500">Carregando fornecedores...</td>
                                </tr>
                            ) : filteredFornecedores.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-gray-500">Nenhum fornecedor encontrado.</td>
                                </tr>
                            ) : filteredFornecedores.map((f) => (
                                <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 border-b-2 inline-block border-transparent hover:border-blue-500 cursor-pointer">{f.name}</div>
                                        <div className="text-xs font-semibold text-gray-500 mt-0.5">{f.corporateName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">{f.document || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                                        <div className="flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {f.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                                        {f.city ? `${f.city}/${f.state}` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 ${f.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {f.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                                        <button onClick={() => handleEdit(f)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(f.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Fornecedor */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={fecharModal} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h3>
                            <button onClick={fecharModal} className="text-gray-400 hover:text-gray-500 p-1">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-6">
                                {/* Seção 1: Dados Principais */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b pb-2 mb-4">
                                        <Building2 size={16} className="text-blue-600" />
                                        Dados da Empresa
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Nome Fantasia / Apelido *</label>
                                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Razão Social</label>
                                            <input type="text" value={formData.corporateName} onChange={e => setFormData({ ...formData, corporateName: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">CNPJ / CPF</label>
                                            <input type="text" value={formData.document} onChange={e => setFormData({ ...formData, document: maskDocument(e.target.value) })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" placeholder="Apenas números ou formatado" />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção 2: Contato */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b pb-2 mb-4">
                                        <Phone size={16} className="text-blue-600" />
                                        Contato
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Telefone / WhatsApp</label>
                                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">E-mail</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção 3: Endereço (NF-e) */}
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b pb-2 mb-4">
                                        <MapPin size={16} className="text-blue-600" />
                                        Endereço Fiscal (NF-e)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">CEP</label>
                                            <input type="text" value={formData.zipCode} onChange={e => setFormData({ ...formData, zipCode: maskCEP(e.target.value) })} onBlur={handleCepBlur} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" placeholder="Ex: 01001-000" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Logradouro / Rua</label>
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Número</label>
                                            <input type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Complemento</label>
                                            <input type="text" value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" placeholder="Sala, Apto..." />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Bairro</label>
                                            <input type="text" value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Município / Cidade</label>
                                            <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">UF</label>
                                            <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} maxLength={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-sm font-medium uppercase" placeholder="SP" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 flex gap-3 border-t border-gray-100 justify-end">
                                <button type="button" onClick={fecharModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

