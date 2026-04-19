import React from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { formatCurrency, cn } from '../lib/utils';
import { isSameMonth, parseISO } from 'date-fns';

export function DashboardCards() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  const currentMonthTxs = transactions.filter(
    t => t.context === activeContext && isSameMonth(parseISO(t.date), selectedMonth)
  );

  const calculateTotal = (filterFn: (t: typeof transactions[0]) => boolean) => 
    currentMonthTxs.filter(filterFn).reduce((acc, t) => acc + t.amount, 0);

  const confirmedIncomes = currentMonthTxs.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
  const incomes = calculateTotal(t => t.type === 'INCOME');
  const expenses = calculateTotal(t => t.type === 'EXPENSE');
  const creditCard = calculateTotal(t => t.type === 'CREDIT_CARD');
  
  const balance = confirmedIncomes - (expenses + creditCard);

  const cards = [
    { title: 'Saldo Disponível', amount: balance, color: 'text-[#1e293b]' },
    { title: 'Receitas (Mês)', amount: incomes, color: 'text-[#10b981]' },
    { title: 'Despesas (Mês)', amount: expenses, color: 'text-[#ef4444]' },
    { title: 'Cartão (Mês)', amount: creditCard, color: 'text-[#f59e0b]' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-4 rounded-xl border border-[#e2e8f0]">
          <div className="text-[0.75rem] text-[#64748b] uppercase tracking-wider mb-2 font-semibold">
            {card.title}
          </div>
          <div className={cn("text-[1.4rem] font-bold font-mono", card.color)}>
            {formatCurrency(card.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
