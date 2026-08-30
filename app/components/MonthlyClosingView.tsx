import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Lock, Unlock, ChevronDown, ChevronUp, FileText, Plus } from 'lucide-react';
import { buildMonthlyClosingEntries, getMonthlyClosingTransactions } from '../lib/monthlyClosingEntries';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function MonthlyClosingView() {
  const { monthlyClosings, closeMonth, reopenMonth, transactions, activeContext, selectedMonth } = useFinance();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [closingTarget, setClosingTarget] = useState<{ year: number; month: number } | null>(null);
  const [showReviewTransactions, setShowReviewTransactions] = useState(false);

  const contextTxs = transactions.filter((t) => t.context === activeContext);
  const entries = useMemo(() => buildMonthlyClosingEntries({
    transactions,
    monthlyClosings,
    activeContext,
  }), [transactions, monthlyClosings, activeContext]);

  const computeClosingData = (year: number, month: number) => {
    const monthTxs = contextTxs.filter(
      (t) => t.type !== 'CREDIT_CARD' && new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() + 1 === month
    );
    const totalIncome = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const prevKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
    const prevClosing = monthlyClosings.find(
      (c) => c.context === activeContext && c.status === 'CLOSED' && `${c.year}-${c.month}` === prevKey
    );
    const opening = prevClosing ? prevClosing.closingBalance : 0;
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance, openingBalance: opening, closingBalance: opening + balance };
  };

  const handleClose = async () => {
    if (!closingTarget) return;
    await closeMonth(closingTarget.year, closingTarget.month, closeNotes);
    setClosingTarget(null);
    setCloseNotes('');
    setShowReviewTransactions(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Fechamento Mensal</h2>
              <p className="text-sm text-gray-500">Registre e acompanhe o fechamento de cada competência.</p>
            </div>
          </div>
          <Button
            label="Novo Fechamento"
            variant="primary"
            onClick={() => setClosingTarget({ year: selectedMonth.getFullYear(), month: selectedMonth.getMonth() + 1 })}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer border-none flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Fechamento
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="text-left py-3 px-3">Competência</th>
                <th className="text-right py-3 px-3">Receitas</th>
                <th className="text-right py-3 px-3">Despesas</th>

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
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold">
                        <span className={data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(data.balance)}
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
                            <Button
                              label="Fechar"
                              variant="primary"
                              onClick={() => setClosingTarget({ year: entry.year, month: entry.month })}
                              className="px-2 py-1 text-[0.65rem] font-bold rounded-md transition-colors cursor-pointer border-none"
                            >
                              Fechar
                            </Button>
                          )}
                          {entry.closing?.status === 'CLOSED' && (
                            <Button
                              label="Reabrir"
                              variant="secondary"
                              onClick={() => reopenMonth(entry.year, entry.month)}
                              className="px-2 py-1 text-[0.65rem] font-bold text-slate-700 rounded-md transition-colors cursor-pointer border-none"
                            >
                              <Unlock className="w-3 h-3 inline mr-0.5" /> Reabrir
                            </Button>
                          )}
                          {entry.closing && (
                            <IconButton
                              label={isExpanded ? 'Recolher' : 'Expandir'}
                              icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              variant="ghost"
                              onClick={() => setExpandedId(isExpanded ? null : key)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
                            />
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
      </Card>

      {closingTarget && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>Saldo do Mês</span><span className={data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(data.balance)}</span></div>
                    <div className="flex justify-between text-xs text-slate-500"><span>Saldo Inicial</span><span>{formatCurrency(data.openingBalance)}</span></div>
                    <div className="flex justify-between text-xs font-bold"><span>Saldo Final</span><span className={data.closingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(data.closingBalance)}</span></div>
                  </>
                );
              })()}
            </div>
            <Button
              label={showReviewTransactions ? 'Ocultar transações do mês' : 'Ver transações do mês'}
              variant="secondary"
              onClick={() => setShowReviewTransactions((value) => !value)}
              className="mb-3 w-full px-3 py-2 text-xs font-bold text-primary border border-primary/30 rounded-md cursor-pointer"
            >
              {showReviewTransactions ? 'Ocultar transações do mês' : 'Ver transações do mês'}
            </Button>
            {showReviewTransactions && (
              <div className="mb-4 max-h-56 overflow-auto border border-slate-200 rounded-md bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-2 py-2">Data</th>
                      <th className="text-left px-2 py-2">Descrição</th>
                      <th className="text-left px-2 py-2">Status</th>
                      <th className="text-right px-2 py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMonthlyClosingTransactions({ transactions, activeContext, year: closingTarget.year, month: closingTarget.month }).map((tx) => (
                      <tr key={tx.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{format(new Date(`${tx.date}T00:00:00`), 'dd/MM/yyyy')}</td>
                        <td className="px-2 py-1.5 text-slate-700 min-w-[140px]">{tx.title}</td>
                        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{tx.status === 'PAID' ? 'Pago' : 'Pendente'}</td>
                        <td className={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <textarea
              placeholder="Observações (opcional)"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full p-3 text-sm mb-4 resize-none border-none"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                label="Cancelar"
                variant="secondary"
                onClick={() => { setClosingTarget(null); setCloseNotes(''); setShowReviewTransactions(false); }}
                className="flex-1 font-medium py-2 text-sm cursor-pointer border-none"
              />
              <Button
                label="Confirmar Fechamento"
                variant="primary"
                onClick={handleClose}
                className="flex-1 font-bold py-2 text-sm cursor-pointer border-none"
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
