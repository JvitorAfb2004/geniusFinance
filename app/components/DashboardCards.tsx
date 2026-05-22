import React, { useEffect, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { addDays, endOfDay, isSameMonth, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Settings2, Wallet, TrendingUp, TrendingDown, CreditCard, DollarSign, Percent, ArrowDownToLine, ArrowUpToLine, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { motion } from 'motion/react';

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
        color: monthBalance >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: Wallet,
        iconBg: monthBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
        iconColor: monthBalance >= 0 ? 'text-emerald-600' : 'text-rose-600',
        accentBar: monthBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
      };
      case 'balance': return {
        title: `Saldo Disponível (${scopeLabel})`, value: incomesReceived - expensesPaid,
        color: 'text-slate-800', icon: Wallet,
        iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        accentBar: 'bg-blue-500'
      };
      case 'income': return {
        title: 'Receitas (Mês)', value: incomes,
        color: 'text-emerald-600', icon: TrendingUp,
        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        accentBar: 'bg-emerald-500'
      };
      case 'income_received': return {
        title: 'Já recebidos (Mês)', value: incomesReceived,
        color: 'text-emerald-600', icon: ArrowUpToLine,
        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        accentBar: 'bg-emerald-500'
      };
      case 'income_pending': return {
        title: 'Não recebidos (Mês)', value: incomesPending,
        color: 'text-amber-600', icon: CalendarDays,
        iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        accentBar: 'bg-amber-500'
      };
      case 'expense': return {
        title: 'Despesas (Mês)', value: totalExpenses,
        color: 'text-rose-600', icon: TrendingDown,
        iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
        accentBar: 'bg-rose-500'
      };
      case 'expense_paid': return {
        title: 'Já pagos (Mês)', value: expensesPaid,
        color: 'text-rose-600', icon: CheckCircle2,
        iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
        accentBar: 'bg-rose-500'
      };
      case 'expense_pending': return {
        title: 'Não pagos (Mês)', value: expensesPending,
        color: 'text-amber-600', icon: Clock3,
        iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        accentBar: 'bg-amber-500'
      };
      case 'credit_card': return {
        title: 'Cartão (Mês)', value: creditCard,
        color: 'text-amber-600', icon: CreditCard,
        iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        accentBar: 'bg-amber-500'
      };
      case 'payable_7d': return {
        title: 'A pagar (7 dias)', value: payable7d,
        color: 'text-rose-600', icon: ArrowDownToLine,
        iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
        accentBar: 'bg-rose-500'
      };
      case 'receivable_7d': return {
        title: 'A receber (7 dias)', value: receivable7d,
        color: 'text-emerald-600', icon: ArrowUpToLine,
        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        accentBar: 'bg-emerald-500'
      };
      case 'net_profit': return {
        title: 'Lucro Líquido', value: incomes - totalExpenses,
        color: incomes - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600',
        icon: DollarSign,
        iconBg: incomes - totalExpenses >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
        iconColor: incomes - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600',
        accentBar: incomes - totalExpenses >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
      };
      case 'margin': return {
        title: 'Margem Líquida', value: incomes > 0 ? ((incomes - totalExpenses) / incomes) * 100 : 0,
        color: 'text-indigo-600', isPercent: true,
        icon: Percent,
        iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
        accentBar: 'bg-indigo-500'
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
        className="text-[0.72rem] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1.5 mb-4 ml-auto transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        {editing ? 'Concluir Personalização' : 'Personalizar Dashboard'}
      </button>

      {editing && (
        <div className="flex flex-wrap gap-1.5 mb-4 p-4 bg-slate-50/80 border border-slate-100 rounded-3xl">
          {ALL_WIDGETS.map((w) => (
            <button
              key={w.id}
              onClick={() => toggleWidget(w.id)}
              className={`text-[0.72rem] font-semibold px-3 py-1.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                widgets.includes(w.id)
                  ? 'bg-slate-800 text-white border-slate-800 shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${cards.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : cards.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
            draggable
            onDragStart={() => setDraggingWidgetId(card.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingWidgetId) reorderWidgets(draggingWidgetId, card.id);
              setDraggingWidgetId(null);
            }}
            onDragEnd={() => setDraggingWidgetId(null)}
            className={cn(
              "bg-white p-5 pl-6 rounded-3xl border border-slate-100 transition-all duration-300 relative overflow-hidden group",
              "shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)]",
              "hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.04)] hover:border-slate-200/80",
              "cursor-grab active:cursor-grabbing",
              draggingWidgetId === card.id && "opacity-60"
            )}
          >
            <div className={`absolute top-3 bottom-3 left-0 w-[3px] rounded-full ${card.accentBar}`} />
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] text-slate-400 uppercase tracking-[0.06em] mb-2 font-semibold select-none">{card.title}</div>
                <div className={cn('text-[1.45rem] font-bold font-mono tracking-[-0.02em] leading-none', card.color)}>
                  {valuesVisible
                    ? (card.isPercent ? `${(animatedValues[index] ?? 0).toFixed(1)}%` : formatCurrency(animatedValues[index] ?? 0))
                    : '••••••'}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-2xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-[18px] h-[18px] ${card.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
