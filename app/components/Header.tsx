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
    '/monthly-closing': 'Fechamento Mensal',
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
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-8 py-3 sm:py-6 shrink-0 w-full gap-2.5 sm:gap-4 bg-white border-b border-[#f3f4f2] transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menu de navegação"
          className="lg:hidden p-2 -ml-2 text-[#9aa1ac] hover:text-[#1a1d21] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2.5">
          <h1 className="text-[1.15rem] sm:text-[1.65rem] font-bold text-[#1a1d21] tracking-tight truncate">{pageTitle}</h1>
          {activeScope.type === 'ACCOUNT' && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[0.62rem] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Corporativo
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm font-medium bg-[#f6f7f9] rounded-full px-1.5 sm:px-2 py-1 sm:py-1.5 ml-auto sm:ml-0 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            aria-label="Mês anterior"
            className="p-1.5 text-[#9aa1ac] hover:text-[#1a1d21] hover:bg-white rounded-full transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-[4.5rem] sm:w-22 text-center capitalize text-[#1a1d21] font-semibold text-[0.72rem] sm:text-[0.82rem] select-none">
            {format(selectedMonth, 'MMM / yyyy', { locale: ptBR })}
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            aria-label="Próximo mês"
            className="p-1.5 text-[#9aa1ac] hover:text-[#1a1d21] hover:bg-white rounded-full transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto items-center">
        <div className="flex-1 min-w-0 sm:flex-none flex gap-1 p-1 bg-[#f6f7f9] rounded-full overflow-x-auto">
          {scopeOptions.map((opt) => {
            const isActive = opt.scope.type === 'PERSONAL'
              ? activeScope.type === 'PERSONAL'
              : activeScope.type === 'ACCOUNT' && activeScope.accountId === (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId;

            return (
              <button
                key={opt.scope.type === 'PERSONAL' ? 'personal' : (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId}
                type="button"
                onClick={() => handleScopeSwitch(opt)}
                className={`whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[0.72rem] sm:text-[0.8rem] font-semibold transition-colors border-none cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white text-[#1a1d21] shadow-sm'
                    : 'bg-transparent text-[#9aa1ac] hover:text-[#1a1d21]'
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
          type="button"
          onClick={onToggleDashboardValues}
          aria-label={dashboardValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
          className="h-9 w-9 sm:h-[40px] sm:w-[40px] shrink-0 bg-[#f6f7f9] hover:bg-[#eef0f2] rounded-full text-[#5f6672] hover:text-[#1a1d21] transition-colors cursor-pointer inline-flex items-center justify-center"
          title={dashboardValuesVisible ? 'Ocultar valores do dashboard' : 'Mostrar valores do dashboard'}
        >
          {dashboardValuesVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {switchingLabel && <ScopeSwitchModal targetLabel={switchingLabel} />}
    </header>
  );
}
