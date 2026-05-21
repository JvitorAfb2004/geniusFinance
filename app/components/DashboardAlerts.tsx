import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { addDays, format, isEqual, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, CheckCircle2, Settings, X } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { cn, formatCurrency } from '../lib/utils';
import type { Transaction } from '../types';
import ConfirmModal from './ConfirmModal';

const ALERTS_KEY = 'dashboard_alerts_enabled';
const DISMISSED_ALERTS_KEY = 'dashboard_alerts_dismissed_ids';

function alertsEnabled() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) !== false : true;
  } catch {
    return true;
  }
}

export function DashboardAlerts({ valuesVisible = true }: { valuesVisible?: boolean }) {
  const { transactions, activeContext, activeScope, accounts, toggleStatus } = useFinance();
  const navigate = useNavigate();
  
  // Find current account if in ACCOUNT scope
  const activeAccount = useMemo(() => {
    if (activeScope.type !== 'ACCOUNT') return null;
    return accounts.find(a => a.id === activeScope.accountId);
  }, [accounts, activeScope]);

  const canSeePaymentAlerts = useMemo(() => {
    if (activeScope.type !== 'ACCOUNT') return true;
    const visibility = activeAccount?.settings?.dashboardAlertsVisibility || 'EVERYONE';
    if (visibility === 'EVERYONE') return true;
    if (visibility === 'ADMIN') {
      return activeScope.role === 'owner' || activeScope.role === 'admin';
    }
    return true;
  }, [activeScope, activeAccount]);

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [closingIds, setClosingIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ tx: Transaction; label: 'pagamento' | 'recebimento' } | null>(null);

  const { paymentAlerts, todayIncomeAlerts } = useMemo(() => {
    if (!alertsEnabled()) return { paymentAlerts: [] as Transaction[], todayIncomeAlerts: [] as Transaction[] };

    const today = startOfDay(new Date());
    const upcomingLimit = addDays(today, 3);

    const contextTxs = transactions
      .filter((tx) => tx.context === activeContext && tx.status === 'PENDING')
      .filter((tx) => !dismissedIds.includes(tx.id));

    const expenses = !canSeePaymentAlerts ? [] : contextTxs
      .filter((tx) => tx.type !== 'INCOME')
      .filter((tx) => {
        const txDate = startOfDay(parseISO(tx.date));
        return txDate <= upcomingLimit;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const incomesToday = contextTxs
      .filter((tx) => tx.type === 'INCOME')
      .filter((tx) => isEqual(startOfDay(parseISO(tx.date)), today))
      .sort((a, b) => b.amount - a.amount);

    return {
      paymentAlerts: expenses.slice(0, 4),
      todayIncomeAlerts: incomesToday.slice(0, 4),
    };
  }, [transactions, activeContext, dismissedIds, canSeePaymentAlerts]);

  if (paymentAlerts.length === 0 && todayIncomeAlerts.length === 0) return null;

  const closeWithEffect = (id: string) => {
    if (closingIds.includes(id)) return;
    setClosingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setDismissedIds((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(next));
        return next;
      });
      setClosingIds((prev) => prev.filter((value) => value !== id));
    }, 260);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {paymentAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 text-amber-800 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-bold">Despesas/Custos próximos do pagamento</h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/settings');
              }}
              className="text-amber-700 hover:text-amber-900 cursor-pointer relative z-10 p-1 rounded-md hover:bg-amber-100/50 transition-colors"
              title="Abrir configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {paymentAlerts.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  "bg-white border border-amber-100 rounded-lg px-3 py-2 flex items-center justify-between gap-3 transition-all duration-300",
                  closingIds.includes(tx.id) ? "opacity-0 -translate-y-1 scale-[0.98] max-h-0 overflow-hidden py-0 px-0 border-transparent" : "opacity-100 max-h-32"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500">
                    {parseISO(tx.date) < startOfDay(new Date()) ? 'Atrasada desde' : 'Vence em'}{' '}
                    {format(parseISO(tx.date), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600">{valuesVisible ? formatCurrency(tx.amount) : '••••••'}</span>
                  <button
                    onClick={() => setConfirmAction({ tx, label: 'pagamento' })}
                    className="px-2.5 py-1 text-xs rounded-md border border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    Confirmar pagamento
                  </button>
                  <button onClick={() => closeWithEffect(tx.id)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayIncomeAlerts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 text-emerald-800 mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              <h3 className="text-sm font-bold">Recebimentos para hoje</h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/settings');
              }}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer relative z-10 p-1 rounded-md hover:bg-emerald-100/50 transition-colors"
              title="Abrir configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {todayIncomeAlerts.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  "bg-white border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between gap-3 transition-all duration-300",
                  closingIds.includes(tx.id) ? "opacity-0 -translate-y-1 scale-[0.98] max-h-0 overflow-hidden py-0 px-0 border-transparent" : "opacity-100 max-h-32"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500">Hoje • {valuesVisible ? formatCurrency(tx.amount) : '••••••'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmAction({ tx, label: 'recebimento' })}
                    className={cn("px-2.5 py-1 text-xs rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer flex items-center gap-1")}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar
                  </button>
                  <button onClick={() => closeWithEffect(tx.id)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          title={`Confirmar ${confirmAction.label}`}
          message={`Deseja confirmar ${confirmAction.label} de "${confirmAction.tx.title}"?`}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          variant={confirmAction.label === 'pagamento' ? 'warning' : 'info'}
          onConfirm={async () => {
            await toggleStatus(confirmAction.tx.id);
            closeWithEffect(confirmAction.tx.id);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
