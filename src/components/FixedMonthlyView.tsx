import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { TransactionTable } from './TransactionTable';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { detectRecurring } from '../lib/recurrenceDetector';
import { isSameMonth, parseISO } from 'date-fns';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

export function FixedMonthlyView() {
  const { transactions, activeContext, selectedMonth, addTransaction } = useFinance();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const currentTxs = transactions.filter((t) =>
    t.context === activeContext &&
    t.isFixed &&
    isSameMonth(parseISO(t.date), selectedMonth)
  );

  const totalFixedIncomes = currentTxs.filter((t) => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalFixedExpenses = currentTxs.filter((t) => t.type === 'EXPENSE' || t.type === 'CREDIT_CARD').reduce((acc, t) => acc + t.amount, 0);

  const animIncomes = useAnimatedValue(totalFixedIncomes);
  const animExpenses = useAnimatedValue(totalFixedExpenses);

  const suggestions = useMemo(() => {
    const filtered = transactions.filter((t) => t.context === activeContext);
    return detectRecurring(filtered).filter((s) => !confirmed.has(s.title));
  }, [transactions, activeContext, confirmed]);

  async function handleConfirm(s: typeof suggestions[0]) {
    await addTransaction(
      { title: s.title, amount: s.amount, date: new Date().toISOString().slice(0, 7) + '-01', type: s.type, status: 'PENDING', context: activeContext },
      'FIXED',
    );
    setConfirmed((prev) => new Set(prev).add(s.title));
  }

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lançamentos Fixos (Receitas)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(animIncomes)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lançamentos Fixos (Despesas)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(animExpenses)}</p>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-purple-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold text-sm">Transações que parecem recorrentes</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.slice(0, 6).map((s) => (
              <div key={s.title} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{s.title}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(s.amount)} • {s.confidence >= 0.8 ? 'Muito provável' : 'Provável'}</p>
                </div>
                <button
                  onClick={() => handleConfirm(s)}
                  className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer flex-shrink-0"
                >
                  Confirmar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#e2e8f0]">
          <h2 className="text-xl font-bold font-sans text-gray-900">Lançamentos Fixos do Mês</h2>
          <p className="text-sm text-gray-500 mt-1">Contas e assinaturas que se repetem todos os meses.</p>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <TransactionTable hideHeaderTitle fixedOnly />
        </div>
      </div>
    </div>
  );
}
