import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { computeDRE } from '../lib/dre';
import { formatCurrency } from '../lib/utils';
import { SECTION_LABELS } from '../lib/categories';
import { suggestSavings } from '../lib/ai';
import type { DRERow } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { isSameMonth, parseISO, startOfYear, endOfYear, eachMonthOfInterval, format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Lightbulb, Loader2 } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
  const lucroLiq = dre.rows.find((r) => r.label === '(=) Lucro Liquido');
  const margemLiq = dre.rows.find((r) => r.label === 'Margem Liquida');

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
          title="(=) Lucro Liquido"
          value={lucroLiq?.actual || 0}
          planned={lucroLiq?.planned || 0}
          icon={<DollarSign className="w-4 h-4" />}
          color={dre.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}
          bg={dre.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}
          showSign
        />
        <DRECard
          title="Margem Liquida"
          value={margemLiq?.actual || 0}
          planned={0}
          icon={<Percent className="w-4 h-4" />}
          color={dre.netMargin >= 0 ? 'text-purple-600' : 'text-red-600'}
          bg={dre.netMargin >= 0 ? 'bg-purple-50' : 'bg-red-50'}
          isPercent
        />
      </div>

      <SavingsPanel />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orçado vs Real - Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 min-w-0">
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
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="orcado" fill="#94a3b8" name="Orçado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real" fill="#3b82f6" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Lucro Líquido - Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Evolucao do Lucro Liquido</h3>
          <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Lucro Liquido"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Previsao Anual */}
      <ForecastSection />

      {/* Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Custos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Principais Custos</h3>
          {topCustos.length === 0 ? (
            <p className="text-sm text-slate-400">Sem custos no mes.</p>
          ) : (
            <div className="space-y-2">
              {topCustos.map((row) => (
                <CategoryBar key={row.label} row={row} color="amber" />
              ))}
            </div>
          )}
        </div>

        {/* Top Despesas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Principais Despesas</h3>
          {topDespesas.length === 0 ? (
            <p className="text-sm text-slate-400">Sem despesas no mes.</p>
          ) : (
            <div className="space-y-2">
              {topDespesas.map((row) => (
                <CategoryBar key={row.label} row={row} color="orange" />
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
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${color}`}>{prefix}{formatted}</p>
      {!isPercent && planned > 0 && (
        <p className="text-xs text-slate-400 mt-1">
          Orçado: {formatCurrency(isCost ? Math.abs(planned) : planned)}
        </p>
      )}
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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Previsao Anual</h3>
        <p className="text-sm text-slate-400">
          Defina valores no Orcamento para visualizar a previsao do ano.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Receita Projetada</p>
          <p className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(animReceita)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Custos Projetados</p>
          <p className="text-lg font-bold font-mono text-amber-600">{formatCurrency(animCustos)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Lucro Projetado</p>
          <p className={`text-lg font-bold font-mono ${yearTotals.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(animLucro)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Margem Projetada</p>
          <p className={`text-lg font-bold font-mono ${yearTotals.margem >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            {animMargem.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Receita Mensal: Real vs Prevista</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="receitaReal" fill="#10b981" name="Receita Real" radius={[4, 4, 0, 0]} />
              <Bar dataKey="receitaPrevista" fill="#6ee7b7" name="Receita Prevista" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SavingsPanel() {
  const { transactions, categories, activeContext, selectedMonth } = useFinance();
  const [savings, setSavings] = useState<{ category: string; currentSpending: number; suggestedReduction: number; projectedSaving: number; tip: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    setLoading(true);
    setError('');
    try {
      const monthTxs = transactions.filter(
        (t) => t.context === activeContext && isSameMonth(parseISO(t.date), selectedMonth) && t.type !== 'INCOME'
      );
      const byCategory: Record<string, { monthly: number; count: number }> = {};
      for (const t of monthTxs) {
        const cat = categories.find((c) => c.id === t.categoryId);
        const key = cat?.name || t.title;
        if (!byCategory[key]) byCategory[key] = { monthly: 0, count: 0 };
        byCategory[key].monthly += t.amount;
        byCategory[key].count += 1;
      }
      const gastos = Object.entries(byCategory).map(([name, data]) => ({
        category: name,
        monthlySpending: data.monthly,
        transactionCount: data.count,
      }));
      const result = await suggestSavings({ gastos, mes: format(selectedMonth, 'MM/yyyy'), totalGastoMes: monthTxs.reduce((s, t) => s + t.amount, 0) });
      setSavings(result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  if (!savings.length && !loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <button onClick={handleAnalyze} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg cursor-pointer transition-colors font-medium">
          <Lightbulb className="w-4 h-4" /> Analisar oportunidades de economia
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <span className="text-sm text-slate-600">Analisando gastos com IA...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-slate-800">Oportunidades de Economia</h3></div>
        <button onClick={() => setSavings([])} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Fechar</button>
      </div>
      <p className="text-xs text-slate-400 -mt-2 mb-1">Sugestões geradas por IA, podem conter imprecisões.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {savings.map((s, i) => (
          <div key={i} className="border border-amber-200 bg-amber-50/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-slate-800">{s.category}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">-{s.suggestedReduction}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Gasto atual: {formatCurrency(s.currentSpending)}</span>
              <span className="text-emerald-600 font-bold">Economia: {formatCurrency(s.projectedSaving)}/mês</span>
            </div>
            <p className="text-xs text-slate-600 italic">{s.tip}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Economia total projetada: <strong className="text-emerald-600">{formatCurrency(savings.reduce((s, r) => s + r.projectedSaving, 0))}/mês</strong> = <strong className="text-emerald-600">{formatCurrency(savings.reduce((s, r) => s + r.projectedSaving, 0) * 12)}/ano</strong>
      </p>
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
