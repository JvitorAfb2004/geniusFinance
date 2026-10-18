import { useMemo, useState } from 'react';
import { addDays, addMonths, addWeeks, startOfDay, startOfMonth } from 'date-fns';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { buildCashFlow, cashWindowLabel, type CashFlowGranularity } from '../lib/cashFlow';
import type { Transaction } from '../types';
import { AnimatedNumber } from './AnimatedNumber';

const GRANULARITIES: { id: CashFlowGranularity; label: string }[] = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensal' },
];

function formatTooltipCurrency(value: unknown) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

/** Card de Fluxo de Caixa da página de Relatórios (regime de caixa, via pagamentos reais). */
export function CashFlowCard({ transactions }: { transactions: Transaction[] }) {
  const [granularity, setGranularity] = useState<CashFlowGranularity>('daily');
  const [offset, setOffset] = useState(0);

  const reference = useMemo(() => {
    const today = new Date();
    if (granularity === 'daily') return addDays(startOfDay(today), -30 * offset);
    if (granularity === 'weekly') return addWeeks(startOfDay(today), -12 * offset);
    return startOfMonth(addMonths(today, -12 * offset));
  }, [granularity, offset]);

  const buckets = useMemo(() => buildCashFlow(transactions, granularity, reference), [transactions, granularity, reference]);

  const totals = buckets.reduce(
    (acc, bucket) => ({ inflow: acc.inflow + bucket.inflow, outflow: acc.outflow + bucket.outflow }),
    { inflow: 0, outflow: 0 },
  );
  const net = totals.inflow - totals.outflow;

  return (
    <div className="clay overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Fluxo de Caixa</h2>
          <p className="text-sm text-gray-500 mt-1">
            Dinheiro que entrou e saiu de verdade — pagamentos reais, não lançamentos futuros.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Granularidade do fluxo de caixa">
            {GRANULARITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={granularity === item.id}
                onClick={() => { setGranularity(item.id); setOffset(0); }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  granularity === item.id ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Período anterior" onClick={() => setOffset((o) => o + 1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="min-w-[8.5rem] text-center text-xs font-semibold text-gray-700">
              {cashWindowLabel(buckets, granularity)}
            </span>
            <button type="button" aria-label="Próximo período" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-6 pt-5">
        <div>
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-base font-bold font-mono text-emerald-600"><AnimatedNumber value={totals.inflow} /></p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-base font-bold font-mono text-red-500"><AnimatedNumber value={totals.outflow} /></p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-base font-bold font-mono ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}><AnimatedNumber value={net} /></p>
        </div>
      </div>

      <div className="px-6 pb-2 pt-3" style={{ height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <RechartsTooltip formatter={formatTooltipCurrency} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            <Legend />
            <Bar dataKey="inflow" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflow" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Line dataKey="net" name="Saldo" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto max-h-72 border-t border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left py-2 px-6 font-semibold text-gray-600">Período</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-600">Entradas</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-600">Saídas</th>
              <th className="text-right py-2 px-6 font-semibold text-gray-600">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {buckets.some((b) => b.inflow || b.outflow) ? (
              [...buckets].reverse().filter((b) => b.inflow || b.outflow).map((bucket) => (
                <tr key={bucket.start} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 px-6 font-medium text-gray-800">{bucket.label}</td>
                  <td className="py-2 px-4 text-right font-mono text-emerald-600">{bucket.inflow > 0 ? formatCurrency(bucket.inflow) : '-'}</td>
                  <td className="py-2 px-4 text-right font-mono text-red-500">{bucket.outflow > 0 ? formatCurrency(bucket.outflow) : '-'}</td>
                  <td className={`py-2 px-6 text-right font-mono ${bucket.net >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(bucket.net)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sem movimento de caixa no período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
