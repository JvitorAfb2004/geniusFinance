import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import { SpendingLimit } from '../types';
import { SpendingLimitModal } from './SpendingLimitModal';
import { isSameMonth, parseISO, getMonth, getYear } from 'date-fns';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SpendingLimitsView() {
  const { spendingLimits, categories, transactions, activeContext, selectedMonth, deleteSpendingLimit } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<SpendingLimit | undefined>(undefined);

  const visibleLimits = useMemo(() => {
    const currentMonth = getMonth(selectedMonth) + 1;
    const currentYear = getYear(selectedMonth);
    return spendingLimits.filter((limit) => {
      if (!limit.month) return true; // ongoing limit, always visible
      return limit.month === currentMonth && (!limit.year || limit.year === currentYear);
    });
  }, [spendingLimits, selectedMonth]);

  const currentSpending = useMemo(() => {
    const map = new Map<string, number>();
    const monthTxs = transactions.filter(
      (tx) =>
        tx.context === activeContext &&
        (tx.type === 'EXPENSE' || tx.type === 'CREDIT_CARD') &&
        tx.status === 'PAID' &&
        isSameMonth(parseISO(tx.date), selectedMonth)
    );
    for (const limit of spendingLimits) {
      const total = monthTxs
        .filter((tx) => tx.categoryId && limit.categoryIds.includes(tx.categoryId))
        .reduce((sum, tx) => sum + tx.amount, 0);
      map.set(limit.id, total);
    }
    return map;
  }, [transactions, activeContext, selectedMonth, spendingLimits]);

  const handleEdit = (limit: SpendingLimit) => {
    setEditingLimit(limit);
    setShowModal(true);
  };

  const handleDelete = async (limit: SpendingLimit) => {
    if (!confirm(`Excluir o limite "${limit.name}"?`)) return;
    try {
      await deleteSpendingLimit(limit.id);
    } catch {
      // handled by handleFirestoreError
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLimit(undefined);
  };

  if (visibleLimits.length === 0 && !showModal) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Limites de Gasto</h2>
            <p className="text-sm text-slate-500">Defina tetos de gasto por categoria para controlar seu orçamento.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Limite
          </button>
        </div>
        <div className="flex items-center justify-center h-64 text-slate-400">
          {spendingLimits.length === 0
            ? 'Nenhum limite de gasto configurado.'
            : 'Nenhum limite para este mês.'}
        </div>
        <AnimatePresence>
          {showModal && <SpendingLimitModal onClose={handleCloseModal} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Limites de Gasto</h2>
          <p className="text-sm text-slate-500">Acompanhe seus tetos de gasto por categoria.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Limite
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleLimits.map((limit) => {
          const spent = currentSpending.get(limit.id) || 0;
          const pct = limit.limitAmount > 0 ? (spent / limit.limitAmount) * 100 : 0;
          const barColor =
            pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';

          return (
            <div
              key={limit.id}
              className="clay clay-hover p-5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{limit.name}</h3>
                  {limit.month && (
                    <span className="text-xs text-slate-400">
                      {MONTH_LABELS[limit.month - 1]}/{limit.year || ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(limit)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(limit)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {limit.categoryIds.map((cid) => {
                  const cat = categories.find((c) => c.id === cid);
                  return cat ? (
                    <span
                      key={cid}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                    >
                      {cat.name}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs text-slate-400">Gasto no mês</p>
                  <p className="text-lg font-bold text-slate-800"><AnimatedNumber value={spent} /></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Limite</p>
                  <p className="text-lg font-semibold text-slate-500"><AnimatedNumber value={limit.limitAmount} /></p>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
              <p className={`text-xs mt-1 font-medium ${pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {pct.toFixed(0)}% utilizado
                {pct >= 100 ? ' — Limite estourado!' : pct >= 80 ? ' — Próximo do limite' : ''}
              </p>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <SpendingLimitModal onClose={handleCloseModal} initialData={editingLimit} />
        )}
      </AnimatePresence>
    </div>
  );
}
