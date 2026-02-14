
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { authService } from '../services/authService';
import { UserRole, AppState, Company, ServiceOrder, User, Customer } from '../types';

const Settings: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
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
      showToast('Natureza removida.', 'success');
    } catch (error) {
      showToast('Erro ao remover natureza.', 'error');
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    setIsExporting(format);
    try {
      // Fetch all data from Supabase for export
      const [users, customers, orders] = await Promise.all([
        dbService.getUsers(company.id),
        dbService.getCustomers(company.id),
        dbService.getOrders(company.id)
      ]);

      const exportObj = {
        company,
        users,
        customers,
        orders,
        settings: company.settings,
        version: "2.0-supabase"
      };

      let content = '';
      let mimeType = '';
      let fileName = `backup_sistema_os_${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'json') {
        content = JSON.stringify(exportObj, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        const headers = 'ID,Data,Cliente,Status,Tecnico,Tipo,Descricao\n';
        const rows = orders.map(o => `${o.id},${o.createdAt},"${o.customerName}",${o.status},"${o.techName}",${o.type},"${o.description.replace(/"/g, '""')}"`).join('\n');
        content = headers + rows;
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Exportação ${format.toUpperCase()} concluída!`, 'success');
    } catch (e) {
      showToast('Falha na exportação.', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert("Restauração via arquivo JSON habilitada apenas para leitura neste momento. Entre em contato com o suporte para restauração massiva no banco de dados.");
    // No Supabase, importar dados massivos deveria ser feito com cuidado ou via Admin.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadAllDocumentsAsZip = async () => {
    setIsExporting('zip');
    try {
      const orders = await dbService.getOrders(company.id);
      const JSZip = (window as any).JSZip;
      const saveAs = (window as any).saveAs;
      if (!JSZip || !saveAs) {
        showToast('Bibliotecas não prontas.', 'error');
        return;
      }
      const zip = new JSZip();
      let fileCount = 0;
      orders.forEach(order => {
        if (order.attachments && order.attachments.length > 0) {
          const folderName = `OS_${order.id.slice(-4)}_${order.customerName.replace(/[^a-z0-9]/gi, '_')}`;
          const folder = zip.folder(folderName);
          order.attachments.forEach(att => {
            if (att.data) {
              const base64Data = att.data.split(',')[1] || att.data;
              folder.file(att.name, base64Data, { base64: true });
              fileCount++;
            }
          });
        }
      });
      if (fileCount === 0) {
        showToast('Nenhum documento encontrado no sistema.', 'error');
        return;
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `documentos_sistema_os_${new Date().toISOString().split('T')[0]}.zip`);
      showToast(`${fileCount} documentos compactados!`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao gerar pacote de documentos.', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 lg:px-0">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 border ${toast.type === 'success' ? 'bg-slate-900 text-white border-green-500' : 'bg-red-600 text-white border-red-400'
          }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-green-500' : 'fa-circle-exclamation'}`}></i>
          {toast.message}
        </div>
      )}

      <div className="text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">CONFIGURAÇÕES GERAIS</h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">GESTÃO ADMINISTRATIVA E INFRAESTRUTURA DE DADOS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Natureza do Serviço */}
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
          <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-4 uppercase tracking-tight">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-tag"></i>
            </div>
            NATUREZA DO SERVIÇO
          </h2>

          <form onSubmit={handleAddType} className="mb-10 flex items-center gap-3">
            <input
              type="text"
              placeholder="Nova natureza..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              ADC
            </button>
          </form>

          <div className="space-y-4">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-6">REGISTROS DISPONÍVEIS</span>
            <div className="grid grid-cols-1 gap-3 max-h-[450px] overflow-y-auto custom-scrollbar pr-3">
              {(company.settings.orderTypes || []).map(type => (
                <div key={type} className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-50 rounded-2xl group hover:border-blue-100 transition-all">
                  {editingType === type ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-2 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingTypeValue}
                        onChange={(e) => setEditingTypeValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateType(type)}
                      />
                      <button onClick={() => handleUpdateType(type)} className="text-green-600 p-2 hover:bg-green-50 rounded-lg">
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button onClick={() => setEditingType(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-lg">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{type}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setEditingTypeValue(type);
                          }}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-blue-500 flex items-center justify-center hover:bg-blue-50 transition-all shadow-sm"
                        >
                          <i className="fa-solid fa-pen-to-square text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleRemoveType(type)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-red-500 flex items-center justify-center hover:bg-red-50 transition-all shadow-sm"
                        >
                          <i className="fa-solid fa-trash-can text-sm"></i>
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
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full">
          <h2 className="text-xl font-black text-slate-900 mb-12 flex items-center gap-4 uppercase tracking-tight">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-database"></i>
            </div>
            BACKUP E EXPORTAÇÃO
          </h2>

          <div className="space-y-12 flex-1">
            <div className="space-y-6">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-2">BASE DE DADOS (CLOUD)</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button
                  onClick={() => exportData('json')}
                  disabled={!!isExporting}
                  className="flex flex-col items-start p-8 bg-white rounded-[2rem] border border-slate-100 hover:border-blue-500 hover:bg-slate-50 transition-all group text-left w-full shadow-sm"
                >
                  <i className="fa-solid fa-cloud-arrow-down text-blue-600 mb-6 text-2xl"></i>
                  <span className="block text-[11px] font-black uppercase text-slate-900 leading-tight tracking-tight">BACKUP (.JSON)</span>
                  <span className="text-[8px] font-black text-slate-400 tracking-widest mt-2 uppercase">Exportar Nuvem</span>
                </button>

                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-start p-8 bg-blue-50/30 rounded-[2rem] border border-blue-50 hover:border-blue-600 hover:bg-white transition-all group text-left w-full shadow-sm opacity-50 cursor-not-allowed"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-blue-600 mb-6 text-2xl"></i>
                  <span className="block text-[11px] font-black uppercase text-blue-900 leading-tight tracking-tight">RESTAURAR (.JSON)</span>
                  <span className="text-[8px] font-black text-blue-400 tracking-widest mt-2 uppercase">Bloqueado em Cloud</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-2">ARQUIVOS E MÍDIA</span>

              <div className="space-y-5">
                <button
                  onClick={downloadAllDocumentsAsZip}
                  disabled={isExporting === 'zip'}
                  className="w-full flex items-center justify-between p-8 bg-orange-50/20 rounded-[2rem] border border-orange-50 hover:border-orange-500 transition-all group shadow-sm"
                >
                  <div className="text-left flex items-center gap-6">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl">
                      {isExporting === 'zip' ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-zipper"></i>}
                    </div>
                    <div>
                      <span className="block text-[11px] font-black uppercase text-orange-900 leading-none mb-2 tracking-tight">DOWNLOAD CONSOLIDADO (.ZIP)</span>
                      <span className="text-[8px] font-black text-orange-400 tracking-widest uppercase">BAIXAR TODOS OS ANEXOS</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-orange-200 group-hover:translate-x-1 transition-transform"></i>
                </button>

                <button
                  onClick={() => exportData('csv')}
                  className="w-full flex items-center justify-between p-8 bg-green-50/20 rounded-[2rem] border border-green-50 hover:border-green-500 transition-all group shadow-sm"
                >
                  <div className="text-left flex items-center gap-6">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl">
                      <i className="fa-solid fa-table"></i>
                    </div>
                    <div>
                      <span className="block text-[11px] font-black uppercase text-green-900 leading-none mb-2 tracking-tight">TABELA GERAL (.CSV)</span>
                      <span className="text-[8px] font-black text-green-400 tracking-widest uppercase">COMPATÍVEL COM EXCEL/PLANILHAS</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-green-200 group-hover:translate-x-1 transition-transform"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-10 md:p-12 rounded-[2.5rem] text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] text-center border border-slate-800 shadow-2xl mt-10">
        Sistema OS &copy; 2026 — INFRAESTRUTURA DE DADOS SEGURA
      </div>
    </div>
  );
};

export default Settings;
