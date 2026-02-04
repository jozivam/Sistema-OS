
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { OrderStatus, UserRole, ServiceOrder, AppState } from '../types';

const Reports: React.FC = () => {
  const [data] = useState<AppState>(storageService.getData());
  const [showAllDetails, setShowAllDetails] = useState(false);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const isAdmin = data.currentUser?.role === UserRole.ADMIN;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <i className="fa-solid fa-lock text-3xl"></i>
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Acesso Restrito</h2>
        <Link to="/dashboard" className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20">Voltar para Home</Link>
      </div>
    );
  }

  const stats = useMemo(() => {
    const filterBase = (o: ServiceOrder) => {
      const matchesTech = selectedTechId === 'all' || o.techId === selectedTechId;
      const matchesType = selectedType === 'all' || o.type === selectedType;
      return matchesTech && matchesType;
    };

    // Filtro para ordens finalizadas no período selecionado
    const finishedInPeriod = data.orders.filter(o => {
      if (!o.finishedAt) return false;
      const fDateStr = o.finishedAt.split('T')[0];
      return filterBase(o) && fDateStr >= startDate && fDateStr <= endDate;
    });

    // Cálculo de Pendentes
    const totalPending = data.orders.filter(o => {
      const isPending = o.status === OrderStatus.OPEN || o.status === OrderStatus.IN_PROGRESS || o.status === OrderStatus.PAUSED;
      return isPending && filterBase(o);
    }).length;

    // Cálculo de Ordens em Atraso
    const totalOverdue = data.orders.filter(o => {
      const isPending = o.status !== OrderStatus.FINISHED && o.status !== OrderStatus.CANCELLED;
      if (!isPending || !o.scheduledDate) return false;
      const sDate = new Date(o.scheduledDate);
      return sDate < now && filterBase(o);
    }).length;

    const totalFinished = finishedInPeriod.length;

    const yearToUse = parseInt(selectedYear);
    const totalFinishedYear = data.orders.filter(o => {
      if (!o.finishedAt) return false;
      const fYear = new Date(o.finishedAt).getFullYear();
      return filterBase(o) && fYear === yearToUse;
    }).length;

    const natureMap: Record<string, number> = {};
    finishedInPeriod.forEach(o => {
      natureMap[o.type] = (natureMap[o.type] || 0) + 1;
    });
    const natureRanking = Object.entries(natureMap).sort((a, b) => b[1] - a[1]);
    const totalNature = totalFinished || 1;

    const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData = monthsNames.map((month, index) => {
      const count = data.orders.filter(o => {
        if (!o.finishedAt) return false;
        const fDate = new Date(o.finishedAt);
        return filterBase(o) && fDate.getMonth() === index && fDate.getFullYear() === yearToUse;
      }).length;
      return [month, count] as [string, number];
    });

    const maxMonthlyVal = Math.max(...monthlyData.map(d => d[1]), 1);

    return {
      totalFinished,
      totalPending,
      totalOverdue,
      totalFinishedYear,
      natureRanking,
      totalNature,
      lineChartData: monthlyData,
      maxMonthlyVal,
      finishedOrders: finishedInPeriod.sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))
    };
  }, [startDate, endDate, selectedTechId, selectedType, selectedYear, data.orders]);

  const visibleFinishedOrders = showAllDetails ? stats.finishedOrders : stats.finishedOrders.slice(0, 5);

  const yearsOptions = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearsOptions.push(y.toString());
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 px-2">
        {/* Título com a moldura azul solicitada no screenshot */}
        <div className="border-[3px] border-blue-600 px-6 py-4 rounded-xl inline-block bg-white/50 backdrop-blur-sm">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Relatório</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Análise estratégica de desempenho operacional</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Filtro Técnico */}
          <div className="relative group w-full lg:w-48 xl:w-56">
            <i className="fa-solid fa-user-tie absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"></i>
            <select 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              <option value="all">Equipe Consolidada</option>
              {data.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px]"></i>
          </div>

          {/* Filtro Natureza do Serviço */}
          <div className="relative group w-full lg:w-48 xl:w-56">
            <i className="fa-solid fa-tags absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"></i>
            <select 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Todas Naturezas</option>
              {data.settings.orderTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px]"></i>
          </div>

          {/* Filtro de Período com Filtro de Ano Abaixo */}
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full lg:w-auto">
              <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase">Início</span>
                <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 px-3">
                <span className="text-[8px] font-black text-slate-400 uppercase">Fim</span>
                <input type="date" className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            
            {/* Seletor de Ano (Abaixo do Período) */}
            <div className="relative group w-full">
              <i className="fa-solid fa-calendar-days absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <select 
                className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {yearsOptions.map(year => (
                  <option key={year} value={year}>Ano Referência: {year}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'MÊS', value: stats.totalFinished, icon: 'fa-check-double', color: 'text-blue-600', highlight: true },
          { label: 'PENDENTES', value: stats.totalPending, icon: 'fa-hourglass-half', color: 'text-indigo-600' },
          { label: 'EM ATRASO', value: stats.totalOverdue, icon: 'fa-clock-rotate-left', color: 'text-rose-600' },
          { label: 'ANO', value: stats.totalFinishedYear, icon: 'fa-calendar-check', color: 'text-slate-900' },
        ].map((kpi, i) => (
          <div key={i} className={`bg-white p-8 rounded-[2.5rem] shadow-sm border transition-all duration-500 group hover:shadow-xl flex items-center gap-5 ${kpi.highlight ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-100'}`}>
            <div className={`w-14 h-14 rounded-2xl bg-slate-50 ${kpi.color} flex items-center justify-center text-2xl shadow-sm border border-slate-100 shrink-0`}>
              <i className={`fa-solid ${kpi.icon}`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 truncate">{kpi.label}</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tighter truncate">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Produção Mensal */}
        <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-visible">
          <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-tighter">
            <i className="fa-solid fa-chart-bar text-blue-600"></i> PRODUÇÃO MENSAL ({selectedYear})
          </h2>
          
          <div className="relative h-72 flex flex-col justify-between px-4">
            <div className="absolute inset-0 top-2 bottom-12 flex flex-col justify-between pointer-events-none px-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full border-t border-slate-100 relative">
                   <span className="absolute -left-8 -top-2 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                     {Math.round((stats.maxMonthlyVal / 4) * (4 - i))}
                   </span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between h-full gap-2 md:gap-4 relative z-10 pt-2 pb-12 overflow-visible">
              {stats.lineChartData.map(([month, value]) => (
                <div key={month} className="flex-1 flex flex-col items-center h-full group relative">
                  <div className="relative w-full h-full flex flex-col justify-end bg-slate-50/50 rounded-t-xl">
                    <div 
                      className="w-full bg-blue-600 rounded-t-xl transition-all duration-700 group-hover:bg-blue-500 shadow-xl shadow-blue-500/10 relative"
                      style={{ height: `${(value / stats.maxMonthlyVal) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-lg shadow-2xl transition-all duration-300 z-50 whitespace-nowrap pointer-events-none translate-y-2 group-hover:translate-y-0">
                        {value} {value === 1 ? 'ATENDIMENTO' : 'ATENDIMENTOS'}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <span className="absolute bottom-0 text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-4">{month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mix de Serviços */}
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-tighter">
            <i className="fa-solid fa-chart-pie text-indigo-600"></i> MIX DE SERVIÇOS
          </h2>
          <div className="space-y-6">
            {stats.natureRanking.map(([type, count]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{type}</span>
                  <span className="text-slate-900">{count} OS</span>
                </div>
                <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-indigo-500 rounded-full shadow-sm"
                    style={{ width: `${(count / stats.totalNature) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OS Details Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
           <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <i className="fa-solid fa-list-check text-emerald-600"></i> DETALHAMENTO DE CONCLUSÕES
           </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black">
                <th className="px-8 py-5">Técnico</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Natureza</th>
                <th className="px-8 py-5">Finalização</th>
                <th className="px-8 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleFinishedOrders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{o.techName}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{o.customerName}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">{o.type}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-slate-400">{o.finishedAt ? new Date(o.finishedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link to={`/ordens/${o.id}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                      <i className="fa-solid fa-arrow-right-long"></i>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {stats.finishedOrders.length > 5 && (
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all font-black text-[10px] uppercase tracking-widest"
              >
                {showAllDetails ? (
                  <><i className="fa-solid fa-chevron-up mr-2"></i> Mostrar Menos</>
                ) : (
                  <><i className="fa-solid fa-chevron-down mr-2"></i> Ver mais {stats.finishedOrders.length - 5} conclusões</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
