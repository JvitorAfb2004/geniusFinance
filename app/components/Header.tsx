import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useFinance } from '../hooks/useFinance';
import { ActiveScope } from '../types';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Menu, Building2, User } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScopeSwitchModal } from './ScopeSwitchModal';

export function Header({
  onOpenMenu,
  dashboardValuesVisible = true,
  onToggleDashboardValues,
}: {
  onOpenMenu?: () => void;
  dashboardValuesVisible?: boolean;
  onToggleDashboardValues?: () => void;
}) {
  const { activeScope, setActiveScope, accounts, user, selectedMonth, setSelectedMonth, loading } = useFinance();
  const location = useLocation();
  const [switchingLabel, setSwitchingLabel] = useState<string | null>(null);

  // Dismiss switch modal when loading completes
  useEffect(() => {
    if (switchingLabel && !loading) {
      setSwitchingLabel(null);
    }
  }, [loading, switchingLabel]);

  const handleScopeSwitch = (opt: { label: string; scope: ActiveScope }) => {
    setSwitchingLabel(opt.label);
    setActiveScope(opt.scope);
  };

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Visão Geral',
    '/transactions': 'Entradas / Saídas',
    '/cash-calendar': 'Calendário',
    '/fixed-monthly': 'Fixos Mensais',
    '/credit-cards': 'Cartões de Crédito',
    '/dre': 'DRE',
    '/budget': 'Orçamento',
    '/spending-limits': 'Limites',
    '/sales': 'Vendas',
    '/goals': 'Metas',
    '/reports': 'Relatórios Anuais',
    '/subscription': 'Assinatura',
    '/report-issue': 'Reportar Problema',
    '/commercial': 'Leads',
    '/projects': 'Projetos',
    '/service-types': 'Tipos de Serviço',
    '/settings': 'Configurações',
    '/admin/plans': 'Planos',
    '/admin/subscriptions': 'Assinaturas',
    '/admin/reports': 'Reports',
  };

  const pageTitle = pageTitles[location.pathname] || 'Genius Finance';

  const scopeOptions: { label: string; scope: ActiveScope; role?: string }[] = [
    { label: 'Pessoal', scope: { type: 'PERSONAL', userId: user?.uid || '' } },
  ];

  for (const acc of accounts) {
    const role: 'owner' | 'admin' | 'member' = acc.memberRole || (acc.ownerId === user?.uid ? 'owner' : 'member');
    scopeOptions.push({
      label: acc.name,
      scope: { type: 'ACCOUNT', accountId: acc.id, accountName: acc.name, role },
      role,
    });
  }

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 w-full gap-4 bg-surface border-b border-border transition-colors">
      <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          </button>
        
        <div className="flex items-center gap-2.5">
          <h1 className="text-[1.2rem] sm:text-[1.4rem] font-semibold text-slate-900 tracking-tight">{pageTitle}</h1>
          {activeScope.type === 'ACCOUNT' && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[0.62rem] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Corporativo
            </span>
          )}
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 text-sm font-medium clay-btn px-1.5 py-1 ml-auto sm:ml-0">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-20 sm:w-22 text-center capitalize text-slate-700 font-medium text-[0.82rem] select-none">
            {format(selectedMonth, 'MMM / yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto items-center">
        <div className="flex-1 min-w-0 sm:flex-none flex gap-1 p-1 clay-btn overflow-x-auto">
          {scopeOptions.map((opt) => {
            const isActive = opt.scope.type === 'PERSONAL'
              ? activeScope.type === 'PERSONAL'
              : activeScope.type === 'ACCOUNT' && activeScope.accountId === (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId;

            return (
              <button
                key={opt.scope.type === 'PERSONAL' ? 'personal' : (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId}
                onClick={() => handleScopeSwitch(opt)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-md text-[0.8rem] font-medium transition-colors border-none cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-slate-100 text-text-primary font-semibold'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {opt.scope.type === 'PERSONAL' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[100px] sm:max-w-none">{opt.label}</span>
                {opt.role && (
                  <span className="text-[0.62rem] opacity-60 font-medium">
                    ({opt.role === 'owner' ? 'dono' : opt.role === 'admin' ? 'admin' : 'membro'})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleDashboardValues}
          className="h-[36px] shrink-0 px-2.5 sm:px-3 clay-btn text-[0.78rem] font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          title={dashboardValuesVisible ? 'Ocultar valores do dashboard' : 'Mostrar valores do dashboard'}
        >
          {dashboardValuesVisible ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
          <span className="hidden md:inline">{dashboardValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}</span>
        </button>
      </div>

      {switchingLabel && <ScopeSwitchModal targetLabel={switchingLabel} />}
    </header>
  );
}
