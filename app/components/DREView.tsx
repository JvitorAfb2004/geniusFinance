import React, { useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { computeDRE } from '../lib/dre';
import { formatCurrency } from '../lib/utils';
import type { DRERow } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { isSameMonth, parseISO, startOfYear, endOfYear, eachMonthOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, DollarSign, Percent, ArrowDownRight } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';


function formatTooltipCurrency(value: unknown) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

const COLORS = ['#ef4444', '#f59e0b', '#4fb8b2', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DREView() {
  const { transactions, budgets, categories, activeContext, selectedMonth } = useFinance();

  const dre = useMemo(() => {
    const monthTxs = transactions.filter(
      (tx) => tx.context === activeContext && isSameMonth(parseISO(tx.date), selectedMonth)
    );
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const monthBudgets = budgets.filter(
      (b) => b.context === activeContext && b.year === year && b.month === month
    );
    return computeDRE(monthTxs, monthBudgets, categories);
  }, [transactions, budgets, categories, activeContext, selectedMonth]);

  const receitaLiq = dre.rows.find((r) => r.isSubtotal && r.section === 'RECEITA');
  const custosTotal = dre.rows.find((r) => r.isSubtotal && r.section === 'CUSTOS');
  const despesasTotal = dre.rows.find((r) => r.isSubtotal && r.section === 'DESPESAS');
  const lucroLiq = dre.rows.find((r) => r.label === '(=) Lucro Líquido');
  const margemLiq = dre.rows.find((r) => r.label === 'Margem Líquida');

  const monthlyEvolution = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const months = eachMonthOfInterval({
      start: startOfYear(selectedMonth),
      end: endOfYear(selectedMonth),
    });
    return months.map((m) => {
      const monthTxs = transactions.filter(
        (tx) => tx.context === activeContext && isSameMonth(parseISO(tx.date), m)
      );
      const monthNum = m.getMonth() + 1;
      const monthBudgets = budgets.filter(
        (b) => b.context === activeContext && b.year === year && b.month === monthNum
      );
      const d = computeDRE(monthTxs, monthBudgets, categories);
      return {
        name: format(m, 'MMM', { locale: ptBR }),
        receita: receitaFromDRE(d),
        custos: custosFromDRE(d),
        despesas: despesasFromDRE(d),
        lucro: d.netProfit,
        margem: d.netMargin,
      };
    });
  }, [transactions, budgets, categories, activeContext, selectedMonth]);

  const topCustos: DRERow[] = dre.rows.filter((r) => r.section === 'CUSTOS' && !r.isSubtotal).sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual)).slice(0, 5);
  const topDespesas: DRERow[] = dre.rows.filter((r) => r.section === 'DESPESAS' && !r.isSubtotal).sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual)).slice(0, 5);

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Carregando categorias...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DRE Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <DRECard
          title="Receita Bruta"
          value={receitaLiq?.actual || 0}
          planned={receitaLiq?.planned || 0}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <DRECard
          title="(-) Custos"
          value={Math.abs(custosTotal?.actual || 0)}
          planned={custosTotal?.planned || 0}
          icon={<ArrowDownRight className="w-4 h-4" />}
          color="text-amber-600"
          bg="bg-amber-50"
          isCost
        />
        <DRECard
          title="(-) Despesas"
          value={Math.abs(despesasTotal?.actual || 0)}
          planned={despesasTotal?.planned || 0}
          icon={<ArrowDownRight className="w-4 h-4" />}
          color="text-orange-600"
          bg="bg-orange-50"
          isCost
        />
        <DRECard
          title="(=) Lucro Líquido"
          value={lucroLiq?.actual || 0}
          planned={lucroLiq?.planned || 0}
          icon={<DollarSign className="w-4 h-4" />}
          color={dre.netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}
          bg={dre.netProfit >= 0 ? 'bg-teal-50' : 'bg-red-50'}
          showSign
        />
        <DRECard
          title="Margem Líquida"
          value={margemLiq?.actual || 0}
          planned={0}
          icon={<Percent className="w-4 h-4" />}
          color={dre.netMargin >= 0 ? 'text-purple-600' : 'text-red-600'}
          bg={dre.netMargin >= 0 ? 'bg-purple-50' : 'bg-red-50'}
          isPercent
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orçado vs Real - Bar Chart */}
        <div className="clay clay-hover p-5 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Orçado vs Real</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={[
                { name: 'Receita', orcado: receitaLiq?.planned || 0, real: receitaLiq?.actual || 0 },
                { name: 'Custos', orcado: Math.abs(custosTotal?.planned || 0), real: Math.abs(custosTotal?.actual || 0) },
                { name: 'Despesas', orcado: Math.abs(despesasTotal?.planned || 0), real: Math.abs(despesasTotal?.actual || 0) },
                { name: 'Lucro Liq.', orcado: lucroLiq?.planned || 0, real: lucroLiq?.actual || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={formatTooltipCurrency} />
                <Bar dataKey="orcado" fill="#94a3b8" name="Orçado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real" fill="#4fb8b2" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Lucro Líquido - Line Chart */}
        <div className="clay clay-hover p-5 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Evolução do Lucro Líquido</h3>
          <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={formatTooltipCurrency} />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Lucro Líquido"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Previsão Anual */}
      <ForecastSection />

      {/* Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Custos */}
        <div className="clay clay-hover p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Principais Custos</h3>
          {topCustos.length === 0 ? (
            <p className="text-sm text-slate-400">Sem custos no mês.</p>
          ) : (
            <div className="space-y-2">
              {topCustos.map((row, i) => (
                <CategoryBar key={row.categoryId || `custo-${i}`} row={row} color="amber" />
              ))}
            </div>
          )}
        </div>

        {/* Top Despesas */}
        <div className="clay clay-hover p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Principais Despesas</h3>
          {topDespesas.length === 0 ? (
            <p className="text-sm text-slate-400">Sem despesas no mês.</p>
          ) : (
            <div className="space-y-2">
              {topDespesas.map((row, i) => (
                <CategoryBar key={row.categoryId || `despesa-${i}`} row={row} color="orange" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DRECard({
  title, value, planned, icon, color, bg, isCost, showSign, isPercent,
}: {
  title: string;
  value: number;
  planned: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  isCost?: boolean;
  showSign?: boolean;
  isPercent?: boolean;
}) {
  const animValue = useAnimatedValue(value);
  const displayValue = isCost ? Math.abs(animValue) : animValue;
  const formatted = isPercent ? `${value >= 0 ? '' : '-'}${Math.abs(animValue).toFixed(1)}%` : formatCurrency(displayValue);
  const prefix = showSign && value > 0 ? '+' : '';

  return (
    <div className="clay clay-hover p-4.5 flex flex-col justify-between h-full min-h-[110px]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-8 h-8 rounded-xl ${bg} bg-opacity-70 flex items-center justify-center ${color} shrink-0 border border-current border-opacity-10`}>
          {icon}
        </div>
        <span className="text-[0.72rem] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <p className={`text-lg font-bold font-mono tracking-tight ${color}`}>{prefix}{formatted}</p>
        {!isPercent && planned > 0 && (
          <p className="text-[0.68rem] text-slate-400 font-medium mt-1">
            Orçado: <span className="font-mono">{formatCurrency(isCost ? Math.abs(planned) : planned)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryBar({ row, color, key: _key }: { row: DRERow; color: string; key?: string }) {
  const maxValue = Math.abs(row.planned) || Math.abs(row.actual);
  const pct = maxValue > 0 ? (Math.abs(row.actual) / (maxValue || 1)) * 100 : 0;
  const barColor = color === 'amber' ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{row.label}</span>
        <span className="font-mono font-medium text-slate-800">{formatCurrency(Math.abs(row.actual))}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function ForecastSection() {
  const { transactions, budgets, categories, activeContext, selectedMonth } = useFinance();
  const year = selectedMonth.getFullYear();

  const forecastData = useMemo(() => {
    const months = eachMonthOfInterval({ start: startOfYear(selectedMonth), end: endOfYear(selectedMonth) });
    const now = new Date();

    return months.map((m) => {
      const monthNum = m.getMonth() + 1;
      const isPastOrCurrent = m <= now;
      const monthTxs = transactions.filter(
        (tx) => tx.context === activeContext && isSameMonth(parseISO(tx.date), m)
      );
      const monthBudgets = budgets.filter(
        (b) => b.context === activeContext && b.year === year && b.month === monthNum
      );

      const d = computeDRE(monthTxs, monthBudgets, categories);
      const receitaReal = d.rows.find((r) => r.isSubtotal && r.section === 'RECEITA')?.actual || 0;
      const receitaOrc = d.rows.find((r) => r.isSubtotal && r.section === 'RECEITA')?.planned || 0;
      const custosReal = Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'CUSTOS')?.actual || 0);
      const custosOrc = Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'CUSTOS')?.planned || 0);
      const despesasReal = Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'DESPESAS')?.actual || 0);
      const despesasOrc = Math.abs(d.rows.find((r) => r.isSubtotal && r.section === 'DESPESAS')?.planned || 0);

      return {
        name: format(m, 'MMM', { locale: ptBR }),
        receitaReal: isPastOrCurrent ? receitaReal : 0,
        receitaPrevista: isPastOrCurrent ? (receitaReal > 0 ? receitaReal : receitaOrc) : receitaOrc,
        custosReal: isPastOrCurrent ? custosReal : 0,
        custosPrevisto: isPastOrCurrent ? (custosReal > 0 ? custosReal : custosOrc) : custosOrc,
        despesasReal: isPastOrCurrent ? despesasReal : 0,
        despesasPrevista: isPastOrCurrent ? (despesasReal > 0 ? despesasReal : despesasOrc) : despesasOrc,
      };
    });
  }, [transactions, budgets, categories, activeContext, year]);

  const yearTotals = useMemo(() => {
    const t = { receita: 0, custos: 0, despesas: 0 };
    for (const m of forecastData) {
      t.receita += m.receitaPrevista;
      t.custos += m.custosPrevisto;
      t.despesas += m.despesasPrevista;
    }
    t.receita = t.receita || forecastData.reduce((s, m) => s + m.receitaReal, 0);
    return {
      ...t,
      lucro: t.receita - t.custos - t.despesas,
      margem: t.receita > 0 ? ((t.receita - t.custos - t.despesas) / t.receita) * 100 : 0,
    };
  }, [forecastData]);

  const animReceita = useAnimatedValue(yearTotals.receita);
  const animCustos = useAnimatedValue(yearTotals.custos);
  const animLucro = useAnimatedValue(yearTotals.lucro);
  const animMargem = useAnimatedValue(yearTotals.margem);

  const hasBudgetData = budgets.some((b) => b.context === activeContext && b.year === year);

  if (!hasBudgetData) {
    return (
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Previsão Anual</h3>
        <p className="text-sm text-slate-400">
          Defina valores no Orçamento para visualizar a previsão do ano.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="clay clay-hover p-4.5">
          <p className="text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Receita Projetada</p>
          <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(animReceita)}</p>
        </div>
        <div className="clay clay-hover p-4.5">
          <p className="text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Custos Projetados</p>
          <p className="text-lg font-bold font-mono text-amber-600">{formatCurrency(animCustos)}</p>
        </div>
        <div className="clay clay-hover p-4.5">
          <p className="text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Lucro Projetado</p>
          <p className={`text-lg font-bold font-mono ${yearTotals.lucro >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {formatCurrency(animLucro)}
          </p>
        </div>
        <div className="clay clay-hover p-4.5">
          <p className="text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Margem Projetada</p>
          <p className={`text-lg font-bold font-mono ${yearTotals.margem >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            {animMargem.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="clay clay-hover p-5.5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Receita Mensal: Real vs Prevista</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={formatTooltipCurrency} />
              <Bar dataKey="receitaReal" fill="#10b981" name="Receita Real" radius={[4, 4, 0, 0]} />
              <Bar dataKey="receitaPrevista" fill="#6ee7b7" name="Receita Prevista" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function receitaFromDRE(dre: ReturnType<typeof computeDRE>) {
  return dre.rows.find((r) => r.isSubtotal && r.section === 'RECEITA')?.actual || 0;
}
function custosFromDRE(dre: ReturnType<typeof computeDRE>) {
  return Math.abs(dre.rows.find((r) => r.isSubtotal && r.section === 'CUSTOS')?.actual || 0);
}
function despesasFromDRE(dre: ReturnType<typeof computeDRE>) {
  return Math.abs(dre.rows.find((r) => r.isSubtotal && r.section === 'DESPESAS')?.actual || 0);
}
