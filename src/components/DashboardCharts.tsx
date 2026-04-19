import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        t.context === activeContext &&
        parseISO(t.date) >= monthStart && 
        parseISO(t.date) <= monthEnd
      );

      const receitas = monthTxs.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
      const despesasFixas = monthTxs.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
      const cartao = monthTxs.filter(t => t.type === 'CREDIT_CARD').reduce((a, b) => a + b.amount, 0);
      const despesas = despesasFixas + cartao;

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
      t.context === activeContext &&
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
        t.context === activeContext &&
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
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <div className="bg-white rounded-xl border border-[#e2e8f0] flex flex-col min-h-0 flex-1">
        <div className="p-4 border-b border-[#e2e8f0] font-bold text-[#1e293b]">
          Receitas vs Despesas (Ano)
        </div>
        <div className="flex-1 p-4 overflow-hidden min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barSize={16}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={8} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#64748b'}} />
              <RechartsTooltip 
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`} 
                cursor={{fill: '#f4f6f8'}}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] flex flex-col min-h-0 flex-1">
        <div className="p-4 border-b border-[#e2e8f0] font-bold text-[#1e293b]">
          Previsão de Saldo Acumulado
        </div>
        <div className="flex-1 p-4 overflow-hidden min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={8} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#64748b'}} />
              <RechartsTooltip 
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`} 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Previsto" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
