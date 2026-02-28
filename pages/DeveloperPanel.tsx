import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { Company, CompanyPlan, CompanyPeriod, User, UserRole, ChatMessage } from '../types';
import ConfirmModal from '../components/ConfirmModal';

import StatsCards from '../components/developer/StatsCards';
import CompanyTable from '../components/developer/CompanyTable';
import CompanyInsertModal from '../components/developer/CompanyInsertModal';
import SupportTab from '../components/developer/SupportTab';
import DevLogsTab from '../components/developer/DevLogsTab';

const DeveloperPanel: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isInsertModalOpen, setInsertModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'companies' | 'support' | 'logs'>('companies');
  const [showValues, setShowValues] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'companies';

  const [newCompanyData, setNewCompanyData] = useState({
    corporateName: '',
    tradeName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    plan: CompanyPlan.OURO,
    period: CompanyPeriod.MENSAL,
    monthlyFee: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED',
    createdAt: new Date().toISOString().split('T')[0],
    expiresAt: '',
    settings: {
      enableAI: false,
      enableAttachments: false,
      enableChat: false,
      enableHistory: false,
    }
  });

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const companiesData = await dbService.getCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error("Erro ao carregar dados do painel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'support' || currentTab === 'companies' || currentTab === 'logs') {
      setActiveTab(currentTab as any);
    }
  }, [currentTab]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInsertCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.tradeName || !newCompanyData.document || !newCompanyData.corporateName) {
      setToast({ message: 'Preencha os campos obrigatórios.', type: 'error' });
      return;
    }

    try {
      const newCompany = await dbService.createCompany({
        name: newCompanyData.tradeName,
        tradeName: newCompanyData.tradeName,
        corporateName: newCompanyData.corporateName,
        document: newCompanyData.document,
        email: newCompanyData.email,
        phone: newCompanyData.phone,
        address: newCompanyData.address,
        city: newCompanyData.city,
        plan: newCompanyData.plan,
        period: newCompanyData.period,
        monthlyFee: newCompanyData.monthlyFee,
        status: newCompanyData.status,
        expiresAt: newCompanyData.expiresAt,
        settings: {
          ...newCompanyData.settings,
          orderTypes: []
        }
      });

      setCompanies(prev => [...prev, newCompany]);
      setInsertModalOpen(false);
      setToast({ message: 'Empresa cadastrada com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao inserir empresa:", error);
      setToast({ message: 'Erro ao cadastrar empresa.', type: 'error' });
    }
  };

  const updateCompanyStatus = async (id: string, status: 'ACTIVE' | 'BLOCKED') => {
    try {
      await dbService.updateCompany(id, { status } as Partial<Company>);
      setCompanies(prev => prev.map(c =>
        c.id === id ? { ...c, status } as Company : c
      ));
      setOpenMenuId(null);
      setToast({
        message: status === 'ACTIVE' ? 'Empresa liberada!' : 'Empresa bloqueada!',
        type: 'success'
      });
    } catch (error) {
      setToast({ message: 'Erro ao atualizar status.', type: 'error' });
    }
  };

  const deleteCompany = async () => {
    if (!companyToDelete) return;
    try {
      await dbService.deleteCompany(companyToDelete.id);
      setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
      setCompanyToDelete(null);
      setOpenMenuId(null);
      setToast({ message: 'Sistema excluído com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao excluir.', type: 'error' });
    }
  };

  const clientCompanies = useMemo(() => {
    return companies.filter(c => c.id !== '00000000-0000-0000-0000-000000000000');
  }, [companies]);

  const stats = useMemo(() => {
    const total = clientCompanies.length;
    const active = clientCompanies.filter(c => c.status === 'ACTIVE').length;
    const blocked = clientCompanies.filter(c => c.status === 'BLOCKED').length;
    const mrr = clientCompanies.reduce((acc, c) => acc + Math.max(0, c.monthlyFee - (c.refundedAmount || 0)), 0);
    return { total, active, blocked, mrr };
  }, [clientCompanies]);

  const filteredCompanies = useMemo(() => {
    return clientCompanies.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSearch = !searchTerm ||
        (c.tradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.corporateName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [clientCompanies, filterStatus, searchTerm]);


  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    clientCompanies.forEach(c => {
      if (c.createdAt) years.add(new Date(c.createdAt).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [clientCompanies]);

  const chartData = useMemo(() => {
    const data = Array(12).fill(0);
    clientCompanies.forEach(c => {
      if (c.createdAt) {
        const date = new Date(c.createdAt);
        if (date.getFullYear().toString() === selectedYear) {
          data[date.getMonth()] += Math.max(0, c.monthlyFee - (c.refundedAmount || 0));
        }
      }
    });
    return data;
  }, [clientCompanies, selectedYear]);

  const maxChartValue = Math.max(...chartData, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full text-slate-800">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl font-bold text-sm shadow-xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white text-emerald-600 border-emerald-100' : 'bg-white text-rose-600 border-rose-100'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`}></i>
          {toast.message}
        </div>
      )}

      <ConfirmModal
        isOpen={!!companyToDelete}
        title="Excluir Sistema Permanentemente"
        message={`Tem certeza que deseja aplicar o Purge na instância "${companyToDelete?.tradeName || companyToDelete?.name}"? Esta ação removerá TODOS OS DADOS, usuários e registros vinculados. NÃO HÁ VOLTA.`}
        onConfirm={deleteCompany}
        onCancel={() => setCompanyToDelete(null)}
        variant="danger"
        confirmText="Confirmar"
      />

      {activeTab === 'companies' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-[22px] font-bold text-slate-800 tracking-tight">
              Visão Geral do Sistema
            </h3>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200/60 shadow-sm w-fit">
              <button
                onClick={() => setShowValues(!showValues)}
                className="px-4 py-1.5 text-sm font-semibold rounded-md transition-all text-slate-500 hover:text-slate-800 flex items-center justify-center min-w-[60px]"
                title={showValues ? "Ocultar Valores" : "Exibir Valores"}
              >
                <i className={`fa-regular ${showValues ? 'fa-eye-slash' : 'fa-eye'} text-lg`}></i>
              </button>
            </div>
          </div>

          <StatsCards stats={stats} showValues={showValues} />

          {/* CHart and Top Products Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trends Chart */}
            <div className="lg:col-span-2 bg-white rounded-[1.25rem] border border-slate-200/60 p-6 flex flex-col shadow-sm">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h4 className="text-[13px] font-semibold text-slate-500">Evolução Mensal (MRR Adicionado em {selectedYear})</h4>
                  <p className="text-3xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                    {showValues ? chartData.reduce((a, b) => a + b, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
                  </p>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-50 outline-none focus:border-indigo-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col justify-end min-h-[200px] relative">
                <div className="absolute inset-0 flex items-end justify-between z-0 pointer-events-none pb-8 px-2">
                  <div className="w-full absolute bottom-8 left-0 border-t border-slate-100/80"></div>
                  <div className="w-full absolute bottom-[40%] left-0 border-t border-slate-100/80"></div>
                  <div className="w-full absolute bottom-[70%] left-0 border-t border-slate-100/80"></div>
                </div>
                <div className="flex-1 flex items-end gap-[2px] h-40 relative z-10 w-full mb-2 px-2">
                  {chartData.map((val, i) => {
                    // Min height 2% so bars are always slightly visible even if 0
                    const height = `${Math.max((val / maxChartValue) * 100, 2)}%`;
                    const isPurple = i % 2 === 0;
                    return (
                      <div key={i} className="flex-1 flex items-end justify-center group/bar cursor-pointer h-full px-1 sm:px-3">
                        <div
                          style={{ height }}
                          className={`w-full max-w-[32px] rounded-t-md transition-all duration-500
                                ${isPurple ? 'bg-indigo-700' : 'bg-sky-500'} hover:opacity-80 relative`}
                          title={showValues ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap transition-opacity pointer-events-none">
                            {showValues ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ****'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X Axis labels */}
                <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 px-2 border-t border-slate-100 pt-3">
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m) => (
                    <span key={m} className={`flex-1 text-center truncate ${new Date().getMonth() === ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(m) && selectedYear === new Date().getFullYear().toString() ? 'text-slate-900 font-extrabold' : ''}`}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-6 flex flex-col shadow-sm">
              <h4 className="text-[15px] font-bold text-slate-800 mb-6">Últimas Assinaturas</h4>
              <div className="space-y-6">
                {companies.slice(0, 4).map(prod => {
                  const planInfo = {
                    OURO: { icon: 'fa-gem', color: 'text-amber-600', bg: 'bg-amber-100', label: 'Plano Ouro' },
                    DIAMANTE: { icon: 'fa-gem', color: 'text-blue-600', bg: 'bg-blue-100', label: 'Plano Diamante' },
                    CUSTOM: { icon: 'fa-screwdriver-wrench', color: 'text-purple-600', bg: 'bg-purple-100', label: 'Customizado' },
                    PRATA: { icon: 'fa-shield', color: 'text-slate-600', bg: 'bg-slate-200', label: 'Plano Prata' },
                    LIVRE: { icon: 'fa-layer-group', color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Livre' }
                  }[prod.plan || 'OURO'] || { icon: 'fa-box', color: 'text-slate-600', bg: 'bg-slate-200', label: prod.plan };

                  return (
                    <div key={prod.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${planInfo.bg} ${planInfo.color}`}>
                          <i className={`fa-solid ${planInfo.icon} text-lg`}></i>
                        </div>
                        <div className="overflow-hidden">
                          <h5 className="text-[14px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[150px]" title={prod.tradeName || prod.name}>{prod.tradeName || prod.name}</h5>
                          <p className="text-[12px] font-semibold text-slate-500">{planInfo.label}</p>
                        </div>
                      </div>
                      <div className="text-[14px] font-bold text-slate-800 text-right">
                        <div>
                          {showValues ? Math.max(0, prod.monthlyFee - (prod.refundedAmount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '****'}
                        </div>
                        {prod.refundedAmount && prod.refundedAmount > 0 && showValues && (
                          <div className="text-[10px] text-red-500 font-semibold line-through">
                            {prod.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {companies.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-4">Nenhuma assinatura ainda.</div>
                )}
              </div>
            </div>
          </div>

          <CompanyTable
            companies={filteredCompanies}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            showValues={showValues}
            onCompanyClick={(id) => navigate('/developer/empresa/' + id)}
          />

          <CompanyInsertModal
            isOpen={isInsertModalOpen}
            onClose={() => setInsertModalOpen(false)}
            onSubmit={handleInsertCompany}
            data={newCompanyData}
            setData={setNewCompanyData}
          />
        </div>
      ) : activeTab === 'support' ? (
        <SupportTab />
      ) : activeTab === 'logs' ? (
        <DevLogsTab />
      ) : (
        <div className="bg-white rounded-[1.25rem] border border-slate-200/60 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Módulo Indisponível</h3>
          <p className="text-sm text-slate-500">Volte para a aba de Dashboard.</p>
        </div>
      )}
    </div>
  );
};

export default DeveloperPanel;
