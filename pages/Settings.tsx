
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { UserRole, AppState, Company, ServiceOrder, User, Customer } from '../types';

interface SettingsProps {
  company: Company | null;
  onCompanyChange: (company: Company | null) => void;
}

const Settings: React.FC<SettingsProps> = ({ company: initialCompany, onCompanyChange }) => {
  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [loading, setLoading] = useState(!initialCompany);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      const companyData = await dbService.getCompany(user.companyId);
      setCompany(companyData);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (!company) {
    return <div className="p-20 text-center font-bold">Empresa não encontrada.</div>;
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newType.trim();
    if (!trimmed) return;

    const orderTypes = company.settings.orderTypes || [];
    if (orderTypes.includes(trimmed)) {
      showToast('Esta natureza já existe.', 'error');
      return;
    }

    try {
      const updatedSettings = {
        ...company.settings,
        orderTypes: [...orderTypes, trimmed]
      };
      await dbService.updateCompany(company.id, { settings: updatedSettings });
      setCompany({ ...company, settings: updatedSettings });
      onCompanyChange({ ...company, settings: updatedSettings });
      setNewType('');
      showToast('Natureza cadastrada!', 'success');
    } catch (error) {
      showToast('Erro ao salvar natureza.', 'error');
    }
  };

  const handleUpdateType = async (oldType: string) => {
    const trimmed = editingTypeValue.trim();
    if (!trimmed || trimmed === oldType) {
      setEditingType(null);
      return;
    }

    const orderTypes = company.settings.orderTypes || [];
    if (orderTypes.includes(trimmed)) {
      showToast('Esta natureza já existe.', 'error');
      return;
    }

    try {
      const updatedOrderTypes = orderTypes.map(t => t === oldType ? trimmed : t);
      const updatedSettings = { ...company.settings, orderTypes: updatedOrderTypes };

      // Nota: Em um banco relacional real, atualizar 'type' em todas as OS pode ser uma transação.
      // Aqui apenas atualizamos as configurações da empresa primeiro.
      await dbService.updateCompany(company.id, { settings: updatedSettings });
      setCompany({ ...company, settings: updatedSettings });
      onCompanyChange({ ...company, settings: updatedSettings });
      setEditingType(null);
      showToast('Nomenclatura atualizada!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar natureza.', 'error');
    }
  };

  const handleRemoveType = async (type: string) => {
    const orderTypes = company.settings.orderTypes || [];
    if (orderTypes.length <= 1) {
      showToast('Mínimo de uma natureza necessária.', 'error');
      return;
    }

    try {
      const updatedSettings = {
        ...company.settings,
        orderTypes: orderTypes.filter(t => t !== type)
      };
      await dbService.updateCompany(company.id, { settings: updatedSettings });
      setCompany({ ...company, settings: updatedSettings });
      onCompanyChange({ ...company, settings: updatedSettings });
      showToast('Natureza removida.', 'success');
    } catch (error) {
      showToast('Erro ao remover natureza.', 'error');
    }
  };

  const exportData = async (format: 'json' | 'xlsx') => {
    setIsExporting(format);
    try {
      // Fetch all data from Supabase for export
      const [users, customers, orders, messages, payments] = await Promise.all([
        dbService.getUsers(company.id),
        dbService.getCustomers(company.id),
        dbService.getOrders(company.id),
        dbService.getMessages(company.id),
        dbService.getCompanyPayments(company.id)
      ]);

      const exportObj = {
        company,
        users,
        customers,
        orders,
        messages,
        payments,
        settings: company.settings,
        version: "3.0-comprehensive"
      };

      if (format === 'json') {
        const content = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_sistema_os_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        // Prepare data for Excel
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();

        // Sheet: Resumo
        const summaryData = [
          ['SISTEMA OS - RELATÓRIO CONSOLIDADO'],
          ['Data da Exportação', new Date().toLocaleString()],
          ['Empresa', company.name],
          ['Documento', company.document],
          ['E-mail', company.email],
          ['Telefone', company.phone],
          ['Plano', company.plan],
          ['Status', company.status],
          [''],
          ['ESTATÍSTICAS'],
          ['Total de Clientes', customers.length],
          ['Total de Ordens', orders.length],
          ['Total de Usuários', users.length],
          ['Total de Mensagens', messages.length],
          ['Total de Pagamentos', payments.length]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

        // Sheet: Ordens de Serviço
        const osData = orders.map(o => ({
          'ID': o.id,
          'Data': new Date(o.createdAt).toLocaleString(),
          'Cliente': o.customerName,
          'Status': o.status,
          'Técnico': o.techName,
          'Tipo': o.type,
          'Descrição': o.description,
          'Agendamento': o.scheduledDate ? new Date(o.scheduledDate).toLocaleString() : '-',
          'Finalizada em': o.finishedAt ? new Date(o.finishedAt).toLocaleString() : '-',
          'Histórico': o.dailyHistory || '-'
        }));
        const wsOS = XLSX.utils.json_to_sheet(osData);
        XLSX.utils.book_append_sheet(wb, wsOS, "Ordens de Serviço");

        // Sheet: Clientes
        const customerData = customers.map(c => ({
          'ID': c.id,
          'Nome': c.name,
          'Telefone': c.phone,
          'Cidade': c.city,
          'Endereço': `${c.address}, ${c.number || ''}`,
          'Setor': c.sector || '-',
          'Notas': c.notes || '-',
          'Criado em': new Date(c.createdAt).toLocaleString()
        }));
        const wsCustomers = XLSX.utils.json_to_sheet(customerData);
        XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");

        // Sheet: Usuários
        const userData = users.map(u => ({
          'ID': u.id,
          'Nome': u.name,
          'E-mail': u.email,
          'Telefone': u.phone || '-',
          'Cargo': u.role,
          'Cidade': u.city || '-',
          'Status': u.isBlocked ? 'Bloqueado' : 'Ativo'
        }));
        const wsUsers = XLSX.utils.json_to_sheet(userData);
        XLSX.utils.book_append_sheet(wb, wsUsers, "Usuários");

        // Sheet: Mensagens
        const msgData = messages.map(m => ({
          'Data': new Date(m.timestamp).toLocaleString(),
          'Remetente': m.senderName,
          'Mensagem': m.text
        }));
        const wsMessages = XLSX.utils.json_to_sheet(msgData);
        XLSX.utils.book_append_sheet(wb, wsMessages, "Mensagens");

        // Sheet: Pagamentos
        const payData = payments.map(p => ({
          'ID': p.id,
          'Data': new Date(p.paymentDate).toLocaleString(),
          'Valor': p.amount,
          'Plano Ref.': p.planReference,
          'Vencimento Futuro': new Date(p.expiresAtAfter).toLocaleDateString()
        }));
        const wsPayments = XLSX.utils.json_to_sheet(payData);
        XLSX.utils.book_append_sheet(wb, wsPayments, "Pagamentos");

        XLSX.writeFile(wb, `dados_completos_sistema_os_${new Date().toISOString().split('T')[0]}.xlsx`);
      }

      showToast(`Exportação ${format.toUpperCase()} concluída!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Falha na exportação.', 'error');
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
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Validação básica
        if (!data.company || !data.version) {
          showToast('Arquivo de backup inválido.', 'error');
          return;
        }

        if (data.company.id !== company.id) {
          showToast('Este backup pertence a outra empresa.', 'error');
          return;
        }

        const confirmRestore = window.confirm("ATENÇÃO: Isso irá atualizar/restaurar todos os dados deste backup no banco de dados. Deseja continuar?");
        if (!confirmRestore) return;

        setIsExporting('restoring');

        // Restauração por partes
        if (data.users && data.users.length > 0) await dbService.upsertUsers(data.users);
        if (data.customers && data.customers.length > 0) await dbService.upsertCustomers(data.customers);
        if (data.orders && data.orders.length > 0) await dbService.upsertOrders(data.orders);
        if (data.messages && data.messages.length > 0) await dbService.upsertMessages(data.messages);
        if (data.payments && data.payments.length > 0) await dbService.upsertPayments(data.payments);

        showToast('Dados restaurados com sucesso!', 'success');
        loadData(); // Recarrega os dados locais
      } catch (error) {
        console.error("Erro na restauração:", error);
        showToast('Falha ao processar arquivo de backup.', 'error');
      } finally {
        setIsExporting(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const downloadAllDocumentsAsZip = async () => {
    setIsExporting('zip');
    try {
      const [users, customers, orders, messages, payments] = await Promise.all([
        dbService.getUsers(company.id),
        dbService.getCustomers(company.id),
        dbService.getOrders(company.id),
        dbService.getMessages(company.id),
        dbService.getCompanyPayments(company.id)
      ]);

      const JSZip = (window as any).JSZip;
      const saveAs = (window as any).saveAs;
      const XLSX = await import('xlsx');

      if (!JSZip || !saveAs || !XLSX) {
        showToast('Bibliotecas não prontas.', 'error');
        return;
      }

      const zip = new JSZip();

      // Folder for Data
      const dataFolder = zip.folder("DADOS_DO_SISTEMA");

      // 1. JSON Backup
      const exportObj = {
        company,
        users,
        customers,
        orders,
        messages,
        payments,
        settings: company.settings,
        version: "3.0-consolidated"
      };
      dataFolder.file(`backup_completo_${new Date().toISOString().split('T')[0]}.json`, JSON.stringify(exportObj, null, 2));

      // 2. Excel Export
      const wb = XLSX.utils.book_new();
      // (Simplified version of Excel for the ZIP to avoid code duplication redundancy, 
      // but let's just use the same logic for consistency)

      // Sheet: Resumo
      const summaryData = [['SISTEMA OS'], ['Empresa', company.name], ['Data', new Date().toLocaleString()]];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Resumo");

      // Sheet: Ordens
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders.map(o => ({ ID: o.id, Cliente: o.customerName, Status: o.status, Descrição: o.description }))), "Ordens");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      dataFolder.file(`planilha_consolidada_${new Date().toISOString().split('T')[0]}.xlsx`, excelBuffer);

      // 3. Attachments
      let fileCount = 0;
      const attachmentsFolder = zip.folder("ANEXOS");

      orders.forEach(order => {
        if (order.attachments && order.attachments.length > 0) {
          const orderFolderName = `OS_${order.id.slice(-4)}_${order.customerName.replace(/[^a-z0-9]/gi, '_')}`;
          const folder = attachmentsFolder.folder(orderFolderName);
          order.attachments.forEach(att => {
            if (att.data) {
              const base64Data = att.data.split(',')[1] || att.data;
              folder.file(att.name, base64Data, { base64: true });
              fileCount++;
            }
          });
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `consolidado_sistema_os_${new Date().toISOString().split('T')[0]}.zip`);
      showToast(`Pacote consolidado gerado com sucesso!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao gerar pacote consolidado.', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white text-slate-900 border-green-200' : 'bg-red-600 text-white border-red-400'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Natureza do Serviço */}
        <div className="lg:col-span-6 saas-card p-8 md:p-10 h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-blue-100">
              <i className="fa-solid fa-tags"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Natureza do Serviço</h2>
              <p className="text-slate-500 text-xs font-medium">Categorias para ordens de serviço</p>
            </div>
          </div>

          <form onSubmit={handleAddType} className="mb-8 flex items-center gap-3">
            <input
              type="text"
              placeholder="Nova natureza (ex: Instalação)..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:bg-white"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              ADC
            </button>
          </form>

          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">REGISTROS DISPONÍVEIS</p>
            <div className="space-y-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
              {(company.settings.orderTypes || []).map(type => (
                <div key={type} className="group flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                  {editingType === type ? (
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingTypeValue}
                        onChange={(e) => setEditingTypeValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateType(type)}
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateType(type)} className="text-green-600 p-2 hover:bg-green-50 rounded-lg transition-colors">
                          <i className="fa-solid fa-check text-sm"></i>
                        </button>
                        <button onClick={() => setEditingType(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center text-xs group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <i className="fa-solid fa-gear"></i>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{type}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setEditingTypeValue(type);
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pencil text-[10px]"></i>
                        </button>
                        <button
                          onClick={() => handleRemoveType(type)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
                          title="Excluir"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Backup e Exportação */}
        <div className="lg:col-span-6 space-y-8">
          {/* Banco de Dados */}
          <div className="saas-card p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-indigo-100">
                <i className="fa-solid fa-server"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Banco de Dados</h2>
                <p className="text-slate-500 text-xs font-medium">Backup e restauração em nuvem</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => exportData('json')}
                disabled={!!isExporting}
                className="group flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-white rounded-2xl border border-dashed border-slate-200 hover:border-blue-500 transition-all text-center relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-cloud-arrow-down text-lg"></i>
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">Exportar JSON</span>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Backup completo da nuvem</p>
                {isExporting === 'json' && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600 animate-pulse"></div>}
              </button>

              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isExporting === 'restoring'}
                className="group flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-white rounded-2xl border border-dashed border-slate-200 hover:border-indigo-500 transition-all text-center relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 mb-3 group-hover:scale-110 transition-transform">
                  <i className={`fa-solid ${isExporting === 'restoring' ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-lg`}></i>
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">Restaurar JSON</span>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">{isExporting === 'restoring' ? 'Processando...' : 'Carregar backup anterior'}</p>
                {isExporting === 'restoring' && <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-600 animate-pulse"></div>}
              </button>
            </div>
          </div>

          {/* Arquivos e Documentos */}
          <div className="saas-card p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-emerald-100">
                <i className="fa-solid fa-file-export"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">Arquivos & Relatórios</h2>
                <p className="text-slate-500 text-xs font-medium">Exportação em formatos estruturados</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={downloadAllDocumentsAsZip}
                disabled={isExporting === 'zip'}
                className="w-full h-24 flex items-center gap-6 p-6 bg-orange-50/10 hover:bg-orange-50 transition-all rounded-2xl border border-orange-100/50 hover:border-orange-500 group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-100 group-hover:rotate-12 transition-transform">
                  <i className={`fa-solid ${isExporting === 'zip' ? 'fa-spinner fa-spin' : 'fa-file-zipper'} text-xl`}></i>
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-xs font-bold text-orange-900 uppercase tracking-tight mb-1">Backup Consolidado (.ZIP)</span>
                  <span className="text-[10px] text-orange-500 font-medium">Inclui todos os dados JSON, Planilhas e Anexos</span>
                </div>
                <i className="fa-solid fa-chevron-right text-orange-200 group-hover:translate-x-1 transition-transform"></i>
              </button>

              <button
                onClick={() => exportData('xlsx')}
                disabled={isExporting === 'xlsx'}
                className="w-full h-24 flex items-center gap-6 p-6 bg-emerald-50/10 hover:bg-emerald-50 transition-all rounded-2xl border border-emerald-100/50 hover:border-emerald-500 group"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-hover:rotate-12 transition-transform">
                  <i className={`fa-solid ${isExporting === 'xlsx' ? 'fa-spinner fa-spin' : 'fa-file-excel'} text-xl`}></i>
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-xs font-bold text-emerald-900 uppercase tracking-tight mb-1">Planilha Gerencial (.XLSX)</span>
                  <span className="text-[10px] text-emerald-500 font-medium">Dados brutos divididos em abas editáveis</span>
                </div>
                <i className="fa-solid fa-chevron-right text-emerald-200 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuvem Conectada & Sincronizada</span>
        </div>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sistema OS &copy; 2026 — Infraestrutura Premium</p>
      </div>
    </div>
  );
};

export default Settings;
