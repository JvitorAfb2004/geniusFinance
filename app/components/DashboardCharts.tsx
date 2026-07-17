import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] px-3 py-2.5 text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-mono font-bold text-text-primary">
            R$ {Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardCharts() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  // Monthly breakdown for the current year
  const monthlyData = useMemo(() => {
    const yearStart = new Date(selectedMonth.getFullYear(), 0, 1);
    const data = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(yearStart, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTxs = transactions.filter(t => 
        t.type !== 'CREDIT_CARD' && t.context === activeContext &&
        parseISO(t.date) >= monthStart && 
        parseISO(t.date) <= monthEnd
      );

      const receitas = monthTxs.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
      const despesasFixas = monthTxs.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
      const despesas = despesasFixas;

      data.push({
        name: format(monthDate, 'MMM', { locale: ptBR }),
        receitas,
        despesas,
        saldo: receitas - despesas
      });
    }
    return data;
  }, [transactions, activeContext, selectedMonth]);

  // Next 12 months forecast (including current balance)
  const forecastData = useMemo(() => {
    const data = [];
    
    // Calculate initial accumulated balance up to the start of current month
    const pastTxs = transactions.filter(t => 
      t.type !== 'CREDIT_CARD' && t.context === activeContext &&
      parseISO(t.date) < startOfMonth(selectedMonth)
    );
    let accumulatedBalance = pastTxs.reduce((acc, t) => {
      const amount = t.type === 'INCOME' ? t.amount : -t.amount;
      return acc + amount;
    }, 0);

    for (let i = 0; i < 6; i++) {
      const mDate = addMonths(selectedMonth, i);
      const mStart = startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);

      const mtxs = transactions.filter(t => 
        t.type !== 'CREDIT_CARD' && t.context === activeContext &&
        parseISO(t.date) >= mStart && 
        parseISO(t.date) <= mEnd
      );

      const monthNet = mtxs.reduce((acc, t) => {
         return acc + (t.type === 'INCOME' ? t.amount : -t.amount);
      }, 0);

      accumulatedBalance += monthNet;

      data.push({
        name: format(mDate, 'MMM/yy', { locale: ptBR }),
        saldoAcumulado: accumulatedBalance
      });
    }
    return data;
  }, [transactions, activeContext, selectedMonth]);

  return (
    <div className="flex flex-col gap-4">
      <div className="clay flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-[0.82rem] text-slate-700 tracking-tight">
          Receitas vs Despesas (Ano)
        </div>
        <div className="px-4 py-4 overflow-hidden" style={{ minHeight: 140 }}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barSize={18}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={8} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#64748b'}} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f4f6f8'}} />
              <Bar dataKey="receitas" name="Receitas" fill="url(#incomeGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="url(#expenseGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="clay flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 font-bold text-[0.82rem] text-slate-700 tracking-tight">
          Previsão de Saldo Acumulado
        </div>
        <div className="px-4 py-4 overflow-hidden" style={{ minHeight: 140 }}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={forecastData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b7def" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#5b7def" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={8} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#64748b'}} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
                name="Saldo Previsto"
                stroke="#5b7def"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2.5, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
