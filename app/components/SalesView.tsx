import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import type { SalesTarget } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  isSameMonth, parseISO, format, eachDayOfInterval, startOfMonth, endOfMonth,
  getDate, getDaysInMonth, isToday, isBefore,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, TrendingUp, Zap, Percent, Plus, Trash2, Users, Tag } from 'lucide-react';
import SalesTargetModal from './SalesTargetModal';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

function formatTooltipCurrency(value: unknown) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

export default function SalesView() {
  const { transactions, salesTargets, categories, activeContext, selectedMonth, deleteSalesTarget } = useFinance();
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const monthIncomes = useMemo(() =>
    transactions.filter(
      (tx) => tx.context === activeContext && tx.type === 'INCOME' && isSameMonth(parseISO(tx.date), selectedMonth)
    ),
    [transactions, activeContext, selectedMonth]
  );

  const totalSales = useMemo(() => monthIncomes.reduce((s, tx) => s + tx.amount, 0), [monthIncomes]);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;

  const monthlyTargets = useMemo(() =>
    salesTargets.filter(
      (t) => t.context === activeContext && t.year === year && t.month === month && !t.channel && !t.seller
    ),
    [salesTargets, activeContext, year, month]
  );

  const channelTargets = useMemo(() =>
    salesTargets.filter(
      (t) => t.context === activeContext && t.year === year && t.month === month && t.channel && !t.seller
    ),
    [salesTargets, activeContext, year, month]
  );

  const sellerTargets = useMemo(() =>
    salesTargets.filter(
      (t) => t.context === activeContext && t.year === year && t.month === month && t.seller
    ),
    [salesTargets, activeContext, year, month]
  );

  const mainTarget = monthlyTargets.reduce((s, t) => s + t.targetAmount, 0);
  const targetPct = mainTarget > 0 ? (totalSales / mainTarget) * 100 : 0;

  const daysInMonth = getDaysInMonth(selectedMonth);
  const today = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, today);
  const elapsedDays = isCurrentMonth ? getDate(today) : (isBefore(selectedMonth, today) ? daysInMonth : 0);
  const dailyTarget = mainTarget > 0 ? mainTarget / daysInMonth : 0;
  const dailyPace = elapsedDays > 0 ? (totalSales / elapsedDays) : 0;

  const paceStatus: 'ahead' | 'on_track' | 'behind' =
    dailyTarget > 0
      ? dailyPace >= dailyTarget * 1.05
        ? 'ahead'
        : dailyPace >= dailyTarget * 0.95
          ? 'on_track'
          : 'behind'
      : 'on_track';

  const paceLabel = { ahead: 'A frente', on_track: 'No ritmo', behind: 'Atrasado' }[paceStatus];
  const paceColor = { ahead: 'text-emerald-600', on_track: 'text-blue-600', behind: 'text-red-500' }[paceStatus];
  const paceBg = { ahead: 'bg-emerald-50', on_track: 'bg-blue-50', behind: 'bg-red-50' }[paceStatus];

  // Daily chart data
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: isCurrentMonth ? today : endOfMonth(selectedMonth),
    });
    return days.map((day) => {
      const dayTxs = monthIncomes.filter((tx) => parseISO(tx.date).getDate() === day.getDate());
      const dayTotal = dayTxs.reduce((s, tx) => s + tx.amount, 0);
      const cumTotal = days.filter((d) => d <= day).reduce((s, d) => {
        const dt = monthIncomes.filter((tx) => parseISO(tx.date).getDate() === d.getDate());
        return s + dt.reduce((sum, tx) => sum + tx.amount, 0);
      }, 0);
      return {
        dia: format(day, 'dd/MM'),
        vendas: dayTotal,
        metaDiaria: dailyTarget,
        acumulado: cumTotal,
        metaAcumulada: dailyTarget * (getDate(day)),
      };
    });
  }, [monthIncomes, selectedMonth, dailyTarget, isCurrentMonth, today]);

  // Sales by category
  const salesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthIncomes) {
      if (!tx.categoryId) continue;
      const cat = categories.find((c) => c.id === tx.categoryId);
      const name = cat ? cat.name : 'Sem categoria';
      map.set(name, (map.get(name) || 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthIncomes, categories]);

  // Sales by channel
  const salesByChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthIncomes) {
      const channel = tx.title.includes(' - ') ? tx.title.split(' - ')[0] : 'Geral';
      map.set(channel, (map.get(channel) || 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => {
        const target = channelTargets.filter((t) => t.channel === name).reduce((s, t) => s + t.targetAmount, 0);
        return { name, value, target, pct: target > 0 ? (value / target) * 100 : 0 };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthIncomes, channelTargets]);

  // Sales by seller
  const salesBySeller = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthIncomes) {
      const seller = tx.title.includes('@') ? tx.title.split('@')[1]?.trim() || 'Geral' : 'Geral';
      map.set(seller, (map.get(seller) || 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => {
        const target = sellerTargets.filter((t) => t.seller === name).reduce((s, t) => s + t.targetAmount, 0);
        return { name, value, target, pct: target > 0 ? (value / target) * 100 : 0 };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthIncomes, sellerTargets]);

  const formatCurrencyShort = (v: number) => {
    if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
    return formatCurrency(v);
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SalesCard
          title="Total de Vendas"
          value={totalSales}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
          subtitle="no mes"
        />
        <SalesCard
          title="Meta do Mes"
          value={mainTarget}
          fallback={mainTarget <= 0 ? '--' : undefined}
          icon={<Target className="w-4 h-4" />}
          color="text-blue-600"
          bg="bg-blue-50"
          subtitle={mainTarget > 0 ? `${targetPct.toFixed(1)}% atingido` : 'Nao definida'}
        />
        <SalesCard
          title="Ritmo Diario"
          value={dailyPace}
          icon={<Zap className="w-4 h-4" />}
          color={paceColor}
          bg={paceBg}
          subtitle={`${paceLabel} (meta: ${formatCurrency(dailyTarget)}/dia)`}
        />
        <SalesCard
          title="% Atingido"
          value={targetPct}
          isPercent
          fallback={mainTarget <= 0 ? '--' : undefined}
          icon={<Percent className="w-4 h-4" />}
          color={targetPct >= 100 ? 'text-emerald-600' : targetPct >= 75 ? 'text-blue-600' : 'text-amber-600'}
          bg={targetPct >= 100 ? 'bg-emerald-50' : targetPct >= 75 ? 'bg-blue-50' : 'bg-amber-50'}
          subtitle={targetPct >= 100 ? 'Meta batida!' : `Dia ${elapsedDays}/${daysInMonth}`}
        />
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Vendas Diarias vs Meta</h3>
          <button
            onClick={() => setIsTargetModalOpen(true)}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Definir Meta
          </button>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={Math.max(Math.floor(dailyData.length / 10), 1)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrencyShort} />
              <Tooltip formatter={formatTooltipCurrency} />
              <Bar dataKey="vendas" fill="#10b981" name="Vendas" radius={[3, 3, 0, 0]} />
              {mainTarget > 0 && (
                <Line type="monotone" dataKey="metaDiaria" stroke="#ef4444" strokeWidth={2} name="Meta Diaria" dot={false} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative Chart */}
      {mainTarget > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Acumulado vs Meta Acumulada</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={Math.max(Math.floor(dailyData.length / 10), 1)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrencyShort} />
                <Tooltip formatter={formatTooltipCurrency} />
                <Legend />
                <Line type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={2} name="Vendas Acumuladas" dot={false} />
                <Line type="monotone" dataKey="metaAcumulada" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Meta Acumulada" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales by Category */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            Vendas por Categoria
          </h3>
          {salesByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">Sem vendas no mes.</p>
          ) : (
            <div className="space-y-2">
              {salesByCategory.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 truncate flex-1 mr-2">{item.name}</span>
                  <span className="font-mono font-medium text-slate-800">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Channel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Meta por Canal
          </h3>
          {salesByChannel.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados de canal.</p>
          ) : (
            <div className="space-y-3">
              {salesByChannel.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                  {item.target > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${item.pct >= 100 ? 'bg-emerald-500' : item.pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                  )}
                  {item.target > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Meta: {formatCurrency(item.target)} ({item.pct.toFixed(0)}%)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Seller */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Meta por Vendedor
          </h3>
          {salesBySeller.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados de vendedor.</p>
          ) : (
            <div className="space-y-3">
              {salesBySeller.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                  {item.target > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${item.pct >= 100 ? 'bg-emerald-500' : item.pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                  )}
                  {item.target > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Meta: {formatCurrency(item.target)} ({item.pct.toFixed(0)}%)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Targets */}
      {salesTargets.filter((t) => t.context === activeContext && t.year === year && t.month === month).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Metas Ativas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Tipo</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Nome</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Meta</th>
                  <th className="text-center py-2 text-slate-500 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {salesTargets
                  .filter((t) => t.context === activeContext && t.year === year && t.month === month)
                  .map((t) => (
                    <tr key={t.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-600">
                        {t.channel && t.seller ? 'Vendedor' : t.channel ? 'Canal' : 'Geral'}
                      </td>
                      <td className="py-2 text-slate-800 font-medium">
                        {t.channel || t.seller || 'Total'}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-800">
                        {formatCurrency(t.targetAmount)}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => deleteSalesTarget(t.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isTargetModalOpen && (
        <SalesTargetModal onClose={() => setIsTargetModalOpen(false)} />
      )}
    </div>
  );
}

function SalesCard({
  title, value, icon, color, bg, subtitle, isPercent, fallback,
}: {
  title: string; value: number; icon: React.ReactNode; color: string; bg: string; subtitle: string; isPercent?: boolean; fallback?: string;
}) {
  const animValue = useAnimatedValue(value);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${color}`}>
        {fallback !== undefined ? fallback : isPercent ? `${animValue.toFixed(1)}%` : formatCurrency(animValue)}
      </p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}
