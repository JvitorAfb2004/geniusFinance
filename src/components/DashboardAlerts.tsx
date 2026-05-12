import React, { useMemo, useState } from 'react';
import { addDays, format, isEqual, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CalendarClock, CheckCircle2, X } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { cn, formatCurrency } from '../lib/utils';
import type { Transaction } from '../types';

const ALERTS_KEY = 'dashboard_alerts_enabled';

function alertsEnabled() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) !== false : true;
  } catch {
    return true;
  }
}

export function DashboardAlerts() {
  const { transactions, activeContext, toggleStatus } = useFinance();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const { paymentAlerts, todayIncomeAlerts } = useMemo(() => {
    if (!alertsEnabled()) return { paymentAlerts: [] as Transaction[], todayIncomeAlerts: [] as Transaction[] };

    const today = startOfDay(new Date());
    const upcomingLimit = addDays(today, 3);

    const contextTxs = transactions
      .filter((tx) => tx.context === activeContext && tx.status === 'PENDING')
      .filter((tx) => !dismissedIds.includes(tx.id));

    const expenses = contextTxs
      .filter((tx) => tx.type !== 'INCOME')
      .filter((tx) => {
        const txDate = startOfDay(parseISO(tx.date));
        return (isSameDay(txDate, today) || (txDate > today && txDate <= upcomingLimit));
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
  }, [transactions, activeContext, dismissedIds]);

  if (paymentAlerts.length === 0 && todayIncomeAlerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {paymentAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 mb-3">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-bold">Despesas/Custos próximos do pagamento</h3>
          </div>
          <div className="space-y-2">
            {paymentAlerts.map((tx) => (
              <div key={tx.id} className="bg-white border border-amber-100 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500">
                    Vence em {format(parseISO(tx.date), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600">{formatCurrency(tx.amount)}</span>
                  <button onClick={() => setDismissedIds((prev) => [...prev, tx.id])} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
          <div className="flex items-center gap-2 text-emerald-800 mb-3">
            <CalendarClock className="w-4 h-4" />
            <h3 className="text-sm font-bold">Recebimentos para hoje</h3>
          </div>
          <div className="space-y-2">
            {todayIncomeAlerts.map((tx) => (
              <div key={tx.id} className="bg-white border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500">Hoje • {formatCurrency(tx.amount)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(tx.id)}
                    className={cn("px-2.5 py-1 text-xs rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer flex items-center gap-1")}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar
                  </button>
                  <button onClick={() => setDismissedIds((prev) => [...prev, tx.id])} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
