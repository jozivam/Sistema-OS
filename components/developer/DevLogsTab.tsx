import React, { useState, useEffect } from 'react';
import { logService, LogEntry } from '../../services/logger';

const DevLogsTab: React.FC = () => {
    const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
    const [expandedLogs, setExpandedLogs] = useState<string[]>([]);

    useEffect(() => {
        setSystemLogs(logService.getDevLogs());
    }, []);

    return (
        <div className="bg-white rounded-[1.25rem] border border-slate-200/60 shadow-sm p-6 lg:p-8 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-100">
                        <i className="fa-solid fa-rectangle-list"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">Logs Locais & Depuração</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Visão do desenvolvedor sobre eventos recentes</p>
                    </div>
                </div>
                <button
                    onClick={() => { logService.clearDevLogs(); setSystemLogs([]); }}
                    className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-trash-can"></i> Limpar Histórico
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-slate-50/50 p-4">
                {systemLogs.length === 0 ? (
                    <div className="text-center text-slate-400 py-20 font-black text-[10px] uppercase tracking-widest">
                        <i className="fa-solid fa-check-circle text-2xl text-slate-300 mb-3 block"></i>
                        Nenhum evento registrado nesta sessão
                    </div>
                ) : (
                    <div className="space-y-3">
                        {systemLogs.map(log => {
                            const isExpanded = expandedLogs.includes(log.id);
                            return (
                                <div key={log.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-slate-200">
                                    <div
                                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
                                        onClick={() => {
                                            setExpandedLogs(prev =>
                                                prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id]
                                            );
                                        }}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-widest text-white ${log.type === 'error' ? 'bg-red-500' : log.type === 'warn' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                                {log.type}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700 line-clamp-1 flex-1">{log.message}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase hidden sm:inline-block">
                                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                            {log.details && (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180 bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {log.details && isExpanded && (
                                        <div className="p-4 bg-slate-900 rounded-b-xl border-t border-slate-800">
                                            <pre className="text-[11px] text-emerald-400 font-mono whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DevLogsTab;
