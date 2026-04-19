import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { formatCurrency } from '../lib/utils';
import { startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ReportsView() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  const data = useMemo(() => {
    // Current year transactions
    const start = startOfYear(selectedMonth);
    const end = endOfYear(selectedMonth);

    const yearTxs = transactions.filter(t => 
      t.context === activeContext &&
      isWithinInterval(parseISO(t.date), { start, end })
    );

    const expensesByTitle = yearTxs
      .filter(t => t.type !== 'INCOME')
      .reduce((acc, t) => {
        const title = t.title.toLowerCase().trim();
        acc[title] = (acc[title] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Top 8 expenses
    const pieData = Object.entries(expensesByTitle)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { pieData };
  }, [transactions, activeContext, selectedMonth]);

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 lg:w-1/2 min-h-[450px]">
        <h2 className="text-xl font-bold font-sans text-gray-900 mb-2">Top Despesas (Ano)</h2>
        <p className="text-sm text-gray-500 mb-6">Suas maiores categorias de custo identificadas por nome.</p>
        <div className="h-80 w-full flex-1">
           {data.pieData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                  <Pie
                    data={data.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
               </PieChart>
             </ResponsiveContainer>
           ) : (
             <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem dados de despesa no ano atual.</div>
           )}
        </div>
      </div>
    </div>
  );
}
