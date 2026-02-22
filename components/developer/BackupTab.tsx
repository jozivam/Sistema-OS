
import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { Company, CompanyPlan, UserRole } from '../../types';

interface BackupTabProps {
    toastHandler: (message: string, type: 'success' | 'error') => void;
}

const BackupTab: React.FC<BackupTabProps> = ({ toastHandler }) => {
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [backupTarget, setBackupTarget] = useState<'global' | 'company' | 'dev-system'>('global');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const data = await dbService.getCompanies();
            setCompanies(data);
            if (data.length > 0) setSelectedCompanyId(data[0].id);
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const exportData = async (format: 'json' | 'xlsx' | 'zip') => {
        setIsExporting(format);
        try {
            const targetId = backupTarget === 'company' ? selectedCompanyId : undefined;

            // Fetch relevant data based on target
            const [users, customers, orders, messages, payments] = await Promise.all([
                dbService.getUsers(targetId),
                dbService.getCustomers(targetId),
                dbService.getOrders(targetId),
                dbService.getMessages(targetId),
                dbService.getCompanyPayments(targetId)
            ]);

            // Filter companies for export
            const exportCompanies = backupTarget === 'company'
                ? companies.filter(c => c.id === selectedCompanyId)
                : companies;

            const exportObj = {
                target: backupTarget,
                targetName: backupTarget === 'company' ? companies.find(c => c.id === selectedCompanyId)?.tradeName : backupTarget,
                companies: exportCompanies,
                users,
                customers,
                orders,
                messages,
                payments,
                exportedAt: new Date().toISOString(),
                version: "3.2-refined-backup"
            };

            const fileNameBase = `backup_${backupTarget}_${new Date().toISOString().split('T')[0]}`;

            if (format === 'json') {
                const content = JSON.stringify(exportObj, null, 2);
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${fileNameBase}.json`;
                link.click();
                URL.revokeObjectURL(url);
                toastHandler(`Exportação JSON (${backupTarget}) concluída!`, 'success');
            } else if (format === 'xlsx') {
                const XLSX = await import('xlsx');
                const wb = XLSX.utils.book_new();

                const summaryData = [
                    [`SISTEMA OS - BACKUP ${backupTarget.toUpperCase()}`],
                    ['Data da Exportação', new Date().toLocaleString()],
                    ['Alvo', backupTarget],
                    ['Empresas Incluídas', exportCompanies.length]
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Resumo");

                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportCompanies.map(c => ({
                    'ID': c.id, 'Nome': c.tradeName || c.name, 'Plano': c.plan, 'Status': c.status
                }))), "Empresas");

                if (users.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), "Usuários");
                if (customers.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), "Clientes");
                if (orders.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders.map(o => ({
                    id: o.id, customer: o.customerName, status: o.status, type: o.type, description: o.description
                }))), "Ordens de Serviço");

                XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
                toastHandler(`Exportação XLSX (${backupTarget}) concluída!`, 'success');
            } else if (format === 'zip') {
                const JSZip = (window as any).JSZip;
                const saveAs = (window as any).saveAs;
                const XLSX = await import('xlsx');

                if (!JSZip || !saveAs || !XLSX) {
                    toastHandler('Bibliotecas de ZIP não carregadas.', 'error');
                    return;
                }

                const zip = new JSZip();
                const mainFolder = zip.folder(fileNameBase.toUpperCase());
                mainFolder.file("dados.json", JSON.stringify(exportObj, null, 2));

                if (orders.some(o => o.attachments?.length)) {
                    const attFolder = mainFolder.folder("ANEXOS");
                    orders.forEach(order => {
                        if (order.attachments?.length) {
                            const orderFolderName = `OS_${order.id.slice(-4)}`;
                            const folder = attFolder.folder(orderFolderName);
                            order.attachments.forEach(att => {
                                if (att.data) {
                                    const base64Data = att.data.split(',')[1] || att.data;
                                    folder.file(att.name, base64Data, { base64: true });
                                }
                            });
                        }
                    });
                }

                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `${fileNameBase}.zip`);
                toastHandler(`Backup ZIP (${backupTarget}) concluído!`, 'success');
            }
        } catch (error) {
            console.error(error);
            toastHandler('Erro ao realizar backup.', 'error');
        } finally {
            setIsExporting(null);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);

                if (!data.version || !data.companies) {
                    throw new Error("Formato de backup inválido.");
                }

                setIsExporting('import');
                toastHandler("Iniciando restauração de dados...", "success");

                // 1. Restaurar Empresas (Base)
                if (data.companies?.length) {
                    await dbService.upsertCompanies(data.companies);
                }

                // 2. Restaurar Tabelas Dependentes
                const restorationTasks = [];
                if (data.users?.length) restorationTasks.push(dbService.upsertUsers(data.users));
                if (data.customers?.length) restorationTasks.push(dbService.upsertCustomers(data.customers));
                if (data.orders?.length) restorationTasks.push(dbService.upsertOrders(data.orders));
                if (data.messages?.length) restorationTasks.push(dbService.upsertMessages(data.messages));
                if (data.payments?.length) restorationTasks.push(dbService.upsertPayments(data.payments));

                await Promise.all(restorationTasks);

                toastHandler("Restauração concluída com sucesso!", "success");
                loadCompanies(); // Atualiza lista de empresas se necessário
            } catch (error: any) {
                console.error("Erro na importação:", error);
                toastHandler(`Erro na importação: ${error.message}`, "error");
            } finally {
                setIsExporting(null);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Central de Dados</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Exportação e Importação do ecossistema</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm mr-2">
                        <button
                            onClick={() => setBackupTarget('global')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backupTarget === 'global' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => setBackupTarget('company')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backupTarget === 'company' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Por Cliente
                        </button>
                        <button
                            onClick={() => setBackupTarget('dev-system')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${backupTarget === 'dev-system' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Sistema Dev
                        </button>
                    </div>

                    <label className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
                        <i className="fa-solid fa-file-import text-sm"></i>
                        {isExporting === 'import' ? 'Restaurando...' : 'Importar Backup'}
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={!!isExporting} />
                    </label>
                </div>
            </div>

            {backupTarget === 'company' && (
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center gap-6 animate-in zoom-in-95 duration-300">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <i className="fa-solid fa-building-user text-xl"></i>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest block mb-2">Selecione o Cliente para Backup</label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-blue-500 transition-all outline-none"
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.tradeName || c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* JSON Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="mb-6 flex justify-between items-start">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                            <i className="fa-solid fa-code"></i>
                        </div>
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase tracking-tighter">Estruturado</span>
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Exportação JSON</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed mb-6">Ideal para integrações ou auditoria técnica completa.</p>
                    <button
                        onClick={() => exportData('json')}
                        disabled={!!isExporting}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                    >
                        {isExporting === 'json' ? 'Processando...' : `Baixar JSON ${backupTarget === 'company' ? 'do Cliente' : backupTarget === 'dev-system' ? 'do Sistema' : 'Global'}`}
                    </button>
                </div>

                {/* XLSX Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="mb-6 flex justify-between items-start">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:-rotate-12">
                            <i className="fa-solid fa-file-excel"></i>
                        </div>
                        <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-tighter">Relatório</span>
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Planilha Excel</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed mb-6">Visualização amigável em tabelas separadas por categoria.</p>
                    <button
                        onClick={() => exportData('xlsx')}
                        disabled={!!isExporting}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                    >
                        {isExporting === 'xlsx' ? 'Processando...' : `Baixar XLSX ${backupTarget === 'company' ? 'do Cliente' : backupTarget === 'dev-system' ? 'do Sistema' : 'Global'}`}
                    </button>
                </div>

                {/* ZIP Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="mb-6 flex justify-between items-start">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-xl group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:scale-110">
                            <i className="fa-solid fa-file-zipper"></i>
                        </div>
                        <span className="text-[8px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-full uppercase tracking-tighter">Completo</span>
                    </div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Pacote ZIP Mestre</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed mb-6">Inclui banco de dados e todos os arquivos de mídia associados.</p>
                    <button
                        onClick={() => exportData('zip')}
                        disabled={!!isExporting}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                    >
                        {isExporting === 'zip' ? 'Processando...' : `Baixar ZIP ${backupTarget === 'company' ? 'do Cliente' : backupTarget === 'dev-system' ? 'do Sistema' : 'Global'}`}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl">
                        <i className={`fa-solid ${backupTarget === 'global' ? 'fa-globe' : backupTarget === 'company' ? 'fa-building' : 'fa-gear'} text-blue-400`}></i>
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-1">
                            {backupTarget === 'global' ? 'Segurança Global Ativa' : backupTarget === 'company' ? `Backup: ${companies.find(c => c.id === selectedCompanyId)?.tradeName || '...'}` : 'Infraestrutura do Desenvolvedor'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {backupTarget === 'global' ? 'Protegendo todo o ecossistema de dados.' : 'Exportando dados específicos deste cliente.'}
                        </p>
                    </div>
                </div>
                <div className="relative z-10">
                    <div className="px-6 py-3 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        {isExporting ? 'Processando' : 'Sistema Pronto'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupTab;
