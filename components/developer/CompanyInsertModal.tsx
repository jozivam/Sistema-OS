import React from 'react';
import { CompanyPlan } from '../../types';
import { maskDocument, maskPhone } from '../../utils/format';

interface CompanyInsertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    data: any;
    setData: (data: any) => void;
}

const CompanyInsertModal: React.FC<CompanyInsertModalProps> = ({ isOpen, onClose, onSubmit, data, setData }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                            Nova Empresa Cliente
                        </h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cadastro de nova unidade de negócio</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <form onSubmit={onSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Sessão: Identificação */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Dados Principais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Razão Social</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.corporateName} onChange={e => setData({ ...data, corporateName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome Fantasia</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.tradeName} onChange={e => setData({ ...data, tradeName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">CNPJ</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" value={data.document} onChange={e => setData({ ...data, document: maskDocument(e.target.value) })} />
                            </div>
                        </div>
                    </div>

                    {/* Sessão: Contato e Localização */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Contato e Localização</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">E-mail Administrativo</label>
                                <input type="email" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm lowercase" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefone / WhatsApp</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.phone} onChange={e => setData({ ...data, phone: maskPhone(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Endereço Fiscal</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" value={data.address} onChange={e => setData({ ...data, address: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cidade / UF</label>
                                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" value={data.city} onChange={e => setData({ ...data, city: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Sessão: Financeiro */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Sistema e Financeiro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Registro</label>
                                <input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.createdAt} onChange={e => setData({ ...data, createdAt: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Plano</label>
                                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]" value={data.plan} onChange={e => setData({ ...data, plan: e.target.value as CompanyPlan })}>
                                    <option value={CompanyPlan.OURO}>OURO</option>
                                    <option value={CompanyPlan.DIAMANTE}>DIAMANTE</option>
                                    <option value={CompanyPlan.CUSTOM}>CUSTOMIZADO</option>
                                    <option value={CompanyPlan.TESTE}>TESTE</option>
                                    <option value={CompanyPlan.LIVRE}>LIVRE</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mensalidade (R$)</label>
                                <input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.monthlyFee} onChange={e => setData({ ...data, monthlyFee: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Data de Vencimento</label>
                                <input type="date" disabled={data.plan === CompanyPlan.LIVRE} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={data.expiresAt} onChange={e => setData({ ...data, expiresAt: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Status de Acesso</label>
                                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase text-[10px]" value={data.status} onChange={e => setData({ ...data, status: e.target.value as 'ACTIVE' | 'BLOCKED' })}>
                                    <option value="ACTIVE">ATIVO (LIBERADO)</option>
                                    <option value="BLOCKED">BLOQUEADO (SUSPENSO)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sessão: Módulos */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                            <i className="fa-solid fa-cubes text-blue-600 text-[10px]"></i>
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Módulos da Unidade</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { id: 'enableAI', label: 'Relatórios', icon: 'fa-chart-pie' },
                                { id: 'enableChat', label: 'Central Chat', icon: 'fa-comments' },
                                { id: 'enableAttachments', label: 'Arquivos/Mídia', icon: 'fa-paperclip' },
                                { id: 'enableHistory', label: 'Timeline/History', icon: 'fa-clock-rotate-left' }
                            ].map((mod) => (
                                <div key={mod.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400">
                                            <i className={`fa-solid ${mod.icon} text-sm`}></i>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight">{mod.label}</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={data.settings[mod.id as keyof typeof data.settings]}
                                            onChange={() => setData({
                                                ...data,
                                                settings: {
                                                    ...data.settings,
                                                    [mod.id]: !data.settings[mod.id as keyof typeof data.settings]
                                                }
                                            })}
                                        />
                                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3 sticky bottom-0 bg-white pb-2">
                        <button type="button" onClick={onClose} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                        <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Cadastrar Empresa</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyInsertModal;
