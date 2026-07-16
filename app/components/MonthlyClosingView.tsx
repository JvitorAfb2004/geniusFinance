import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Unlock, Eye, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { MonthlyClosing } from '../types';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function MonthlyClosingView() {
  const { monthlyClosings, closeMonth, reopenMonth, transactions, activeContext, selectedMonth } = useFinance();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [closingTarget, setClosingTarget] = useState<{ year: number; month: number } | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const c of monthlyClosings) set.add(c.year);
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 1; y++) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [monthlyClosings]);

  const entries = useMemo(() => {
    const list: { year: number; month: number; closing?: MonthlyClosing; exists: boolean }[] = [];
    const closingMap = new Map(monthlyClosings.map((c) => [`${c.year}-${c.month}`, c]));
    for (const year of years) {
      for (let m = 12; m >= 1; m--) {
        const key = `${year}-${m}`;
        const closing = closingMap.get(key);
        list.push({ year, month: m, closing, exists: !!closing });
      }
    }
    return list;
  }, [monthlyClosings, years]);

  const contextTxs = transactions.filter((t) => t.context === activeContext);

  const computeClosingData = (year: number, month: number) => {
    const monthTxs = contextTxs.filter(
      (t) => new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() + 1 === month
    );
    const totalIncome = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const totalCreditCard = monthTxs.filter((t) => t.type === 'CREDIT_CARD').reduce((s, t) => s + t.amount, 0);
    const closedClosings = monthlyClosings.filter(
      (c) => c.context === activeContext && c.status === 'CLOSED'
    ).sort((a, b) => b.year - a.year || b.month - a.month);
    const opening = closedClosings.length > 0 ? closedClosings[0].closingBalance : 0;
    const balance = totalIncome - totalExpense - totalCreditCard;
    return { totalIncome, totalExpense, totalCreditCard, balance, openingBalance: opening, closingBalance: opening + balance };
  };

  const handleClose = async () => {
    if (!closingTarget) return;
    await closeMonth(closingTarget.year, closingTarget.month, closeNotes);
    setClosingTarget(null);
    setCloseNotes('');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="clay p-5">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Fechamento Mensal</h2>
            <p className="text-sm text-gray-500">Registre e acompanhe o fechamento de cada competência.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3">Competência</th>
                <th className="text-right py-3 px-3">Receitas</th>
                <th className="text-right py-3 px-3">Despesas</th>
                <th className="text-right py-3 px-3">Cartão</th>
                <th className="text-right py-3 px-3">Saldo</th>
                <th className="text-center py-3 px-3">Status</th>
                <th className="text-center py-3 px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const key = `${entry.year}-${entry.month}`;
                const isExpanded = expandedId === key;
                const data = entry.closing || computeClosingData(entry.year, entry.month);
                const isCurrent = entry.year === selectedMonth.getFullYear() && entry.month === selectedMonth.getMonth() + 1;

                return (
                  <React.Fragment key={key}>
                    <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${isCurrent ? 'bg-primary/5' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {MONTH_NAMES[entry.month - 1]} / {entry.year}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-mono text-xs">
                        {formatCurrency(data.totalIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-mono text-xs">
                        {formatCurrency(data.totalExpense)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-mono text-xs">
                        {formatCurrency(data.totalCreditCard)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold">
                        <span className={data.closingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(data.closingBalance)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {entry.closing?.status === 'CLOSED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-emerald-100 text-emerald-700">
                            <Lock className="w-3 h-3" /> Fechado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-100 text-amber-700">
                            Aberto
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {entry.closing?.status !== 'CLOSED' && (
                            <button
                              onClick={() => setClosingTarget({ year: entry.year, month: entry.month })}
                              className="px-2 py-1 text-[0.65rem] font-bold bg-primary text-white rounded-md hover:bg-primary-hover transition-colors cursor-pointer border-none"
                            >
                              Fechar
                            </button>
                          )}
                          {entry.closing?.status === 'CLOSED' && (
                            <button
                              onClick={() => reopenMonth(entry.year, entry.month)}
                              className="px-2 py-1 text-[0.65rem] font-bold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors cursor-pointer border-none"
                            >
                              <Unlock className="w-3 h-3 inline mr-0.5" /> Reabrir
                            </button>
                          )}
                          {entry.closing && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : key)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && entry.closing && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="py-3 px-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500 block">Saldo Inicial</span>
                              <span className="font-bold text-slate-800">{formatCurrency(entry.closing.openingBalance)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Saldo Final</span>
                              <span className="font-bold text-slate-800">{formatCurrency(entry.closing.closingBalance)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Fechado por</span>
                              <span className="font-semibold text-slate-700">{entry.closing.closedBy.slice(0, 8)}...</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Em</span>
                              <span className="font-semibold text-slate-700">
                                {entry.closing.closedAt ? format(new Date(entry.closing.closedAt), "dd/MM/yyyy HH:mm") : '-'}
                              </span>
                            </div>
                            {entry.closing.notes && (
                              <div className="col-span-full mt-1">
                                <span className="text-slate-500 block">Observações</span>
                                <span className="text-slate-700">{entry.closing.notes}</span>
                              </div>
                            )}
                            {entry.closing.reopenedAt && (
                              <div className="col-span-full mt-1">
                                <span className="text-slate-500 block">Reaberto em</span>
                                <span className="text-slate-700">
                                  {format(new Date(entry.closing.reopenedAt), "dd/MM/yyyy HH:mm")}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {closingTarget && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="clay p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Fechar {MONTH_NAMES[closingTarget.month - 1]} / {closingTarget.year}
            </h3>
            <div className="space-y-2 text-sm mb-4">
              {(() => {
                const data = computeClosingData(closingTarget.year, closingTarget.month);
                return (
                  <>
                    <div className="flex justify-between"><span className="text-slate-500">Receitas</span><span className="text-emerald-600 font-mono">{formatCurrency(data.totalIncome)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Despesas</span><span className="text-rose-600 font-mono">{formatCurrency(data.totalExpense)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Cartão</span><span className="text-amber-600 font-mono">{formatCurrency(data.totalCreditCard)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>Saldo do Mês</span><span className={data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(data.balance)}</span></div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Saldo Inicial</span><span>{formatCurrency(data.openingBalance)}</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Saldo Final</span><span className={data.closingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(data.closingBalance)}</span></div>
                  </>
                );
              })()}
            </div>
            <textarea
              placeholder="Observações (opcional)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full clay-input p-3 text-sm mb-4 resize-none border-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setClosingTarget(null); setCloseNotes(''); }}
                className="flex-1 clay-btn font-medium py-2 text-sm cursor-pointer border-none"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                className="flex-1 clay-btn-primary font-bold py-2 text-sm cursor-pointer border-none"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
