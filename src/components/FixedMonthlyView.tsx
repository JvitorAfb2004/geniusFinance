import React from 'react';
import { useFinance } from '../hooks/useFinance';
import { TransactionTable } from './TransactionTable';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { isSameMonth, parseISO } from 'date-fns';

export function FixedMonthlyView() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  const currentTxs = transactions.filter(t => 
    t.context === activeContext && 
    t.isFixed &&
    isSameMonth(parseISO(t.date), selectedMonth)
  );

  const totalFixedIncomes = currentTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalFixedExpenses = currentTxs.filter(t => t.type === 'EXPENSE' || t.type === 'CREDIT_CARD').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lançamentos Fixos (Receitas)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalFixedIncomes)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lançamentos Fixos (Despesas)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalFixedExpenses)}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col">
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
