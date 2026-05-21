import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../lib/utils';
import { computeDRE } from '../lib/dre';
import { startOfYear, endOfYear, parseISO, isWithinInterval, eachMonthOfInterval, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatedNumber } from './AnimatedNumber';

function formatTooltipCurrency(value: unknown) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export function ReportsView() {
  const { transactions, categories, budgets, activeContext, selectedMonth } = useFinance();

  const pieData = useMemo(() => {
    const start = startOfYear(selectedMonth);
    const end = endOfYear(selectedMonth);
    const yearTxs = transactions.filter(t =>
      t.context === activeContext &&
      isWithinInterval(parseISO(t.date), { start, end }) &&
      t.type !== 'INCOME'
    );
    const expensesByTitle = yearTxs.reduce((acc, t) => {
      const title = t.title.toLowerCase().trim();
      acc[title] = (acc[title] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(expensesByTitle)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, activeContext, selectedMonth]);

  const monthlyData = useMemo(() => {
    const yearStart = startOfYear(selectedMonth);
    const months = eachMonthOfInterval({ start: yearStart, end: endOfYear(selectedMonth) });
    return months.map((m) => {
      const monthTxs = transactions.filter(
        (tx) => tx.context === activeContext && isSameMonth(parseISO(tx.date), m)
      );
      const monthBudgets = budgets.filter(
        (b) => b.context === activeContext && b.year === m.getFullYear() && b.month === m.getMonth() + 1
      );
      const d = computeDRE(monthTxs, monthBudgets, categories);
      return {
        name: format(m, 'MMM', { locale: ptBR }),
        receita: d.rows.find((r) => r.isSubtotal && r.section === 'RECEITA')?.actual || 0,
        custos: Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'CUSTOS')?.actual || 0),
        despesas: Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'DESPESAS')?.actual || 0),
      };
    });
  }, [transactions, budgets, categories, activeContext, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    const start = startOfYear(selectedMonth);
    const end = endOfYear(selectedMonth);
    const yearTxs = transactions.filter(t =>
      t.context === activeContext &&
      isWithinInterval(parseISO(t.date), { start, end })
    );

    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of yearTxs) {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const name = cat?.name || 'Sem categoria';
      if (!map.has(name)) map.set(name, { income: 0, expense: 0 });
      const entry = map.get(name)!;
      if (tx.type === 'INCOME') entry.income += tx.amount;
      else entry.expense += tx.amount;
    }

    return Array.from(map.entries())
      .map(([name, v]) => ({ name, income: v.income, expense: v.expense, net: v.income - v.expense }))
      .sort((a, b) => b.expense - a.expense);
  }, [transactions, categories, activeContext, selectedMonth]);

  const yearTotals = useMemo(() => {
    const start = startOfYear(selectedMonth);
    const end = endOfYear(selectedMonth);
    const yearTxs = transactions.filter(t =>
      t.context === activeContext &&
      isWithinInterval(parseISO(t.date), { start, end })
    );
    const income = yearTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = yearTxs.filter(t => t.type !== 'INCOME').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, count: yearTxs.length };
  }, [transactions, activeContext, selectedMonth]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Receitas</p>
          <p className="text-lg font-bold font-mono text-emerald-600"><AnimatedNumber value={yearTotals.income} /></p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Despesas</p>
          <p className="text-lg font-bold font-mono text-red-500"><AnimatedNumber value={yearTotals.expense} /></p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Resultado</p>
          <p className={`text-lg font-bold font-mono ${yearTotals.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            <AnimatedNumber value={yearTotals.net} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Transacoes</p>
          <p className="text-lg font-bold font-mono text-slate-700"><AnimatedNumber value={yearTotals.count} kind="number" /></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Evolucao Mensal</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={formatTooltipCurrency} />
                <Legend />
                <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custos" fill="#f59e0b" name="Custos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Top Despesas (Ano)</h2>
          <p className="text-sm text-gray-500 mb-4">Maiores categorias de custo identificadas.</p>
          {pieData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={2} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={formatTooltipCurrency}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Sem dados de despesa no ano atual.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="p-6 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-gray-900">Detalhamento por Categoria</h2>
          <p className="text-sm text-gray-500 mt-1">Receitas e despesas agrupadas por categoria no ano.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoria</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Receitas</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Despesas</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400">Nenhum dado no ano.</td>
                </tr>
              ) : categoryBreakdown.map((row) => (
                <tr key={row.name} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 font-medium text-gray-800">{row.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                    {row.income > 0 ? formatCurrency(row.income) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-red-500">
                    {row.expense > 0 ? formatCurrency(row.expense) : '-'}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-mono font-medium ${row.net >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                    {row.net !== 0 ? formatCurrency(row.net) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
