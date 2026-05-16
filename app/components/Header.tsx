import React from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { ActiveScope } from '../types';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Menu, Building2, User } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Header({
  onOpenMenu,
  dashboardValuesVisible = true,
  onToggleDashboardValues,
}: {
  onOpenMenu?: () => void;
  dashboardValuesVisible?: boolean;
  onToggleDashboardValues?: () => void;
}) {
  const { activeScope, setActiveScope, accounts, user, selectedMonth, setSelectedMonth } = useFinance();

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

  const currentLabel = activeScope.type === 'PERSONAL'
    ? 'Pessoal'
    : activeScope.accountName;

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-4 sm:py-5 shrink-0 w-full bg-bg gap-4">
      <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-2 text-[#64748b] hover:text-[#1e293b]"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-[1.3rem] sm:text-[1.8rem] font-bold text-text-primary tracking-tight">Visão Geral</h1>

        {/* Month Selector */}
        <div className="flex items-center gap-2 sm:gap-3 text-sm font-medium bg-white/40 px-2 py-1 rounded-lg border border-border ml-auto sm:ml-0">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 text-text-secondary hover:text-text-primary rounded-md transition-colors border-none bg-transparent cursor-pointer hidden sm:block"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-20 sm:w-24 text-center capitalize text-text-primary font-semibold text-[0.85rem]">
            {format(selectedMonth, 'MMM/yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="p-1 text-text-secondary hover:text-text-primary rounded-md transition-colors border-none bg-transparent cursor-pointer hidden sm:block"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto items-center">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl flex-1 sm:flex-none justify-center">
          {scopeOptions.map((opt) => {
            const isActive = opt.scope.type === 'PERSONAL'
              ? activeScope.type === 'PERSONAL'
              : activeScope.type === 'ACCOUNT' && activeScope.accountId === (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId;

            return (
              <button
                key={opt.scope.type === 'PERSONAL' ? 'personal' : (opt.scope as { type: 'ACCOUNT'; accountId: string }).accountId}
                onClick={() => setActiveScope(opt.scope)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[0.85rem] font-semibold transition-all border-none cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-surface shadow-sm'
                    : 'bg-transparent text-text-secondary hover:bg-bg'
                }`}
              >
                {opt.scope.type === 'PERSONAL' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                {opt.label}
                {opt.role && (
                  <span className="text-[0.6rem] opacity-60 ml-0.5">
                    ({opt.role === 'owner' ? 'dono' : opt.role === 'admin' ? 'admin' : 'membro'})
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggleDashboardValues}
          className="h-10 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/70 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          title={dashboardValuesVisible ? 'Ocultar valores do dashboard' : 'Mostrar valores do dashboard'}
        >
          {dashboardValuesVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {dashboardValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
        </button>
      </div>
    </header>
  );
}
