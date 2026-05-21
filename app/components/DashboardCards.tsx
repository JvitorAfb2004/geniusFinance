import React, { useEffect, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { addDays, endOfDay, isSameMonth, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Settings2, Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, Percent, ArrowDownToLine, ArrowUpToLine, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';

const DEFAULT_WIDGETS = [
  'month_balance',
  'income_received',
  'income_pending',
  'expense_paid',
  'expense_pending',
  'payable_7d',
  'receivable_7d',
];

function loadWidgets(): string[] {
  try { const saved = localStorage.getItem('dashboard_widgets'); return saved ? JSON.parse(saved) : DEFAULT_WIDGETS; }
  catch { return DEFAULT_WIDGETS; }
}

function saveWidgets(ids: string[]) { localStorage.setItem('dashboard_widgets', JSON.stringify(ids)); }

const ALL_WIDGETS = [
  { id: 'month_balance', label: 'Saldo do Mes' },
  { id: 'balance', label: 'Saldo Disponivel' },
  { id: 'income', label: 'Receitas (Mes)' },
  { id: 'income_received', label: 'Recebidos (Mes)' },
  { id: 'income_pending', label: 'Nao recebidos (Mes)' },
  { id: 'expense', label: 'Despesas (Mes)' },
  { id: 'expense_paid', label: 'Pagos (Mes)' },
  { id: 'expense_pending', label: 'Nao pagos (Mes)' },
  { id: 'credit_card', label: 'Cartao (Mes)' },
  { id: 'payable_7d', label: 'A pagar (7 dias)' },
  { id: 'receivable_7d', label: 'A receber (7 dias)' },
  { id: 'net_profit', label: 'Lucro Liquido' },
  { id: 'margin', label: 'Margem Liquida' },
];

export function DashboardCards({ valuesVisible = true }: { valuesVisible?: boolean }) {
  const { transactions, activeContext, selectedMonth, activeScope } = useFinance();
  const [widgets, setWidgets] = useState<string[]>(loadWidgets);
  const [editing, setEditing] = useState(false);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const scopeLabel = activeScope.type === 'PERSONAL' ? 'Pessoal' : 'Empresa';

  const currentMonthTxs = transactions.filter((t) =>
    t.context === activeContext && isSameMonth(parseISO(t.date), selectedMonth)
  );

  const incomes = currentMonthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expenses = currentMonthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const creditCard = currentMonthTxs.filter((t) => t.type === 'CREDIT_CARD').reduce((s, t) => s + t.amount, 0);
  const incomesReceived = currentMonthTxs
    .filter((t) => t.type === 'INCOME' && t.status === 'PAID')
    .reduce((sum, t) => sum + t.amount, 0);
  const incomesPending = currentMonthTxs
    .filter((t) => t.type === 'INCOME' && t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0);
  const expensesPaid = currentMonthTxs
    .filter((t) => t.type !== 'INCOME' && t.status === 'PAID')
    .reduce((sum, t) => sum + t.amount, 0);
  const expensesPending = currentMonthTxs
    .filter((t) => t.type !== 'INCOME' && t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenses + creditCard;
  const monthBalance = incomes - totalExpenses;

  const today = startOfDay(new Date());
  const nextWeek = endOfDay(addDays(today, 7));
  const upcomingTxs = transactions.filter((t) =>
    t.context === activeContext &&
    t.status === 'PENDING' &&
    isWithinInterval(parseISO(t.date), { start: today, end: nextWeek })
  );
  const payable7d = upcomingTxs.filter((t) => t.type !== 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const receivable7d = upcomingTxs.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);

  const toggleWidget = (id: string) => {
    const next = widgets.includes(id) ? widgets.filter((w) => w !== id) : [...widgets, id];
    setWidgets(next); saveWidgets(next);
  };

  const reorderWidgets = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const fromIndex = widgets.indexOf(draggedId);
    const toIndex = widgets.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...widgets];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setWidgets(next);
    saveWidgets(next);
  };

  function getCard(id: string) {
    switch (id) {
      case 'month_balance': return {
        title: `Saldo do Mês (${scopeLabel})`, value: monthBalance,
        color: monthBalance >= 0 ? 'text-success' : 'text-danger', icon: Wallet,
        iconBg: monthBalance >= 0 ? 'bg-success-light' : 'bg-danger-light',
        iconColor: monthBalance >= 0 ? 'text-success' : 'text-danger',
        accentBar: monthBalance >= 0
          ? 'bg-gradient-to-r from-success to-emerald-400'
          : 'bg-gradient-to-r from-danger to-rose-400'
      };
      case 'balance': return {
        title: `Saldo Disponível (${scopeLabel})`, value: incomesReceived - expensesPaid,
        color: 'text-text-primary', icon: Wallet,
        iconBg: 'bg-primary-light', iconColor: 'text-primary',
        accentBar: 'bg-gradient-to-r from-primary to-blue-400'
      };
      case 'income': return {
        title: 'Receitas (Mês)', value: incomes,
        color: 'text-success', icon: TrendingUp,
        iconBg: 'bg-success-light', iconColor: 'text-success',
        accentBar: 'bg-gradient-to-r from-success to-emerald-400'
      };
      case 'income_received': return {
        title: 'Já recebidos (Mês)', value: incomesReceived,
        color: 'text-success', icon: ArrowUpToLine,
        iconBg: 'bg-success-light', iconColor: 'text-success',
        accentBar: 'bg-gradient-to-r from-success to-emerald-400'
      };
      case 'income_pending': return {
        title: 'Não recebidos (Mês)', value: incomesPending,
        color: 'text-warning', icon: CalendarDays,
        iconBg: 'bg-warning-light', iconColor: 'text-warning',
        accentBar: 'bg-gradient-to-r from-warning to-amber-400'
      };
      case 'expense': return {
        title: 'Despesas (Mês)', value: totalExpenses,
        color: 'text-danger', icon: TrendingDown,
        iconBg: 'bg-danger-light', iconColor: 'text-danger',
        accentBar: 'bg-gradient-to-r from-danger to-rose-400'
      };
      case 'expense_paid': return {
        title: 'Já pagos (Mês)', value: expensesPaid,
        color: 'text-danger', icon: CheckCircle2,
        iconBg: 'bg-danger-light', iconColor: 'text-danger',
        accentBar: 'bg-gradient-to-r from-danger to-rose-400'
      };
      case 'expense_pending': return {
        title: 'Não pagos (Mês)', value: expensesPending,
        color: 'text-warning', icon: Clock3,
        iconBg: 'bg-warning-light', iconColor: 'text-warning',
        accentBar: 'bg-gradient-to-r from-warning to-amber-400'
      };
      case 'credit_card': return {
        title: 'Cartão (Mês)', value: creditCard,
        color: 'text-warning', icon: CreditCard,
        iconBg: 'bg-warning-light', iconColor: 'text-warning',
        accentBar: 'bg-gradient-to-r from-warning to-amber-400'
      };
      case 'payable_7d': return {
        title: 'A pagar (7 dias)', value: payable7d,
        color: 'text-danger', icon: ArrowDownToLine,
        iconBg: 'bg-danger-light', iconColor: 'text-danger',
        accentBar: 'bg-gradient-to-r from-danger to-rose-400'
      };
      case 'receivable_7d': return {
        title: 'A receber (7 dias)', value: receivable7d,
        color: 'text-success', icon: ArrowUpToLine,
        iconBg: 'bg-success-light', iconColor: 'text-success',
        accentBar: 'bg-gradient-to-r from-success to-emerald-400'
      };
      case 'net_profit': return {
        title: 'Lucro Líquido', value: incomes - totalExpenses,
        color: incomes - totalExpenses >= 0 ? 'text-success' : 'text-danger',
        icon: DollarSign,
        iconBg: incomes - totalExpenses >= 0 ? 'bg-success-light' : 'bg-danger-light',
        iconColor: incomes - totalExpenses >= 0 ? 'text-success' : 'text-danger',
        accentBar: incomes - totalExpenses >= 0
          ? 'bg-gradient-to-r from-success to-emerald-400'
          : 'bg-gradient-to-r from-danger to-rose-400'
      };
      case 'margin': return {
        title: 'Margem Líquida', value: incomes > 0 ? ((incomes - totalExpenses) / incomes) * 100 : 0,
        color: 'text-purple-600', isPercent: true,
        icon: Percent,
        iconBg: 'bg-purple-50', iconColor: 'text-purple-600',
        accentBar: 'bg-gradient-to-r from-purple-500 to-violet-400'
      };
      default: return null;
    }
  }

  const cards = widgets
    .map((id) => {
      const card = getCard(id);
      return card ? { id, ...card } : null;
    })
    .filter(Boolean) as { id: string; title: string; value: number; color: string; isPercent?: boolean; icon: React.ElementType; iconBg: string; iconColor: string; accentBar: string }[];
  const [animatedValues, setAnimatedValues] = useState<number[]>(cards.map(() => 0));

  useEffect(() => {
    setAnimatedValues(cards.map((card) => (valuesVisible ? card.value : 0)));
  }, [cards.length]);

  useEffect(() => {
    if (!valuesVisible) {
      setAnimatedValues(cards.map(() => 0));
      return;
    }

    let rafId = 0;
    const duration = 650;
    const start = performance.now();
    const targets = cards.map((card) => card.value);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValues(targets.map((target) => target * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [valuesVisible, transactions, activeContext, selectedMonth, widgets.join('|'), scopeLabel]);

  return (
    <div>
      <button
        onClick={() => setEditing(!editing)}
        className="text-xs text-text-muted hover:text-text-secondary cursor-pointer flex items-center gap-1 mb-2 ml-auto"
      >
        <Settings2 className="w-3 h-3" />
        {editing ? 'Concluir' : 'Personalizar'}
      </button>

      {editing && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-surface border border-border rounded-xl">
          {ALL_WIDGETS.map((w) => (
            <button
              key={w.id}
              onClick={() => toggleWidget(w.id)}
              className={`text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                widgets.includes(w.id) ? 'bg-primary text-surface border-primary' : 'bg-surface text-text-secondary border-border hover:border-primary/50'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${cards.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : cards.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            draggable
            onDragStart={() => setDraggingWidgetId(card.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingWidgetId) reorderWidgets(draggingWidgetId, card.id);
              setDraggingWidgetId(null);
            }}
            onDragEnd={() => setDraggingWidgetId(null)}
            className={cn(
              "bg-surface p-4 rounded-xl border border-border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden group",
              "cursor-grab active:cursor-grabbing",
              draggingWidgetId === card.id && "opacity-60"
            )}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accentBar}`} />
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-secondary uppercase tracking-wider mb-1.5 font-semibold">{card.title}</div>
                <div className={cn('text-2xl font-bold font-mono tracking-tight', card.color)}>
                  {valuesVisible
                    ? (card.isPercent ? `${(animatedValues[index] ?? 0).toFixed(1)}%` : formatCurrency(animatedValues[index] ?? 0))
                    : '••••••'}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
