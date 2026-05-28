import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownToLine, ArrowUpToLine, CalendarDays } from 'lucide-react';

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function CashCalendarView() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) =>
      tx.context === activeContext &&
      isSameMonth(parseISO(tx.date), selectedMonth)
    );
  }, [transactions, activeContext, selectedMonth]);

  const totals = useMemo(() => {
    const income = monthTransactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const outcome = monthTransactions
      .filter((tx) => tx.type !== 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { income, outcome };
  }, [monthTransactions]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(selectedMonth), { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end }).map((day) => {
      const dayTransactions = monthTransactions
        .filter((tx) => isSameDay(parseISO(tx.date), day))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'INCOME' ? -1 : 1;
          return b.amount - a.amount;
        });

      const income = dayTransactions
        .filter((tx) => tx.type === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const outcome = dayTransactions
        .filter((tx) => tx.type !== 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        date: day,
        dayTransactions,
        income,
        outcome,
        isCurrentMonth: isSameMonth(day, selectedMonth),
      };
    });
  }, [monthTransactions, selectedMonth]);

  const busiestDays = useMemo(() => {
    return calendarDays
      .filter((day) => day.isCurrentMonth && day.dayTransactions.length > 0)
      .sort((a, b) => b.dayTransactions.length - a.dayTransactions.length)
      .slice(0, 5);
  }, [calendarDays]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard icon={ArrowUpToLine} label="Entradas do mês" value={totals.income} tone="emerald" />
        <SummaryCard icon={ArrowDownToLine} label="Saídas do mês" value={totals.outcome} tone="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold font-sans text-gray-900">Calendário financeiro</h2>
              <p className="text-sm text-gray-500 mt-1">
                Entradas e saídas por dia em {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 w-fit">
              <CalendarDays className="w-4 h-4" />
              {monthTransactions.length} lançamento(s)
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[0.72rem] font-bold uppercase tracking-wide text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 overflow-x-auto">
            {calendarDays.map((day) => (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "min-h-[132px] min-w-[128px] border-r border-b border-slate-100 p-2.5 flex flex-col gap-2",
                  !day.isCurrentMonth && "bg-slate-50/60 text-slate-300",
                  day.isCurrentMonth && "bg-white",
                  isToday(day.date) && "ring-2 ring-primary/30 ring-inset bg-blue-50/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-xs font-bold",
                    day.isCurrentMonth ? "text-slate-700" : "text-slate-300",
                    isToday(day.date) && "text-primary"
                  )}>
                    {format(day.date, 'd')}
                  </span>
                  {day.dayTransactions.length > 0 && (
                    <span className="text-[0.62rem] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
                      {day.dayTransactions.length}
                    </span>
                  )}
                </div>

                {day.dayTransactions.length > 0 ? (
                  <>
                    <div className="space-y-1 text-[0.68rem] font-semibold">
                      {day.income > 0 && (
                        <div className="flex justify-between gap-1 text-emerald-600">
                          <span>Entrada</span>
                          <span className="font-mono">{formatCurrency(day.income)}</span>
                        </div>
                      )}
                      {day.outcome > 0 && (
                        <div className="flex justify-between gap-1 text-rose-600">
                          <span>Saída</span>
                          <span className="font-mono">{formatCurrency(day.outcome)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto space-y-1">
                      {day.dayTransactions.slice(0, 2).map((tx) => (
                        <div key={tx.id} className="truncate rounded-lg bg-slate-50 px-2 py-1 text-[0.68rem] font-medium text-slate-600">
                          {tx.title}
                        </div>
                      ))}
                      {day.dayTransactions.length > 2 && (
                        <div className="text-[0.65rem] font-semibold text-slate-400 px-1">
                          +{day.dayTransactions.length - 2} lançamento(s)
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] h-fit">
          <h3 className="text-base font-bold text-slate-900">Dias com mais movimento</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Resumo rápido dos dias com mais lançamentos no mês.</p>

          {busiestDays.length > 0 ? (
            <div className="space-y-3">
              {busiestDays.map((day) => (
                <div key={day.date.toISOString()} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 capitalize">
                        {format(day.date, "dd 'de' MMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-slate-500">{day.dayTransactions.length} lançamento(s)</p>
                    </div>
                    <div className="text-right text-[0.7rem] font-semibold space-y-0.5">
                      {day.income > 0 && <p className="text-emerald-600">{formatCurrency(day.income)}</p>}
                      {day.outcome > 0 && <p className="text-rose-600">{formatCurrency(day.outcome)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500">
              Nenhum lançamento encontrado neste mês.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'emerald' | 'rose';
}) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)]">
      <div className={cn("p-3 rounded-xl shrink-0", toneClasses[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 font-mono truncate">{formatCurrency(value)}</p>
      </div>
    </div>
  );
}
