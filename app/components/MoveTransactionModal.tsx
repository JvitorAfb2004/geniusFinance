import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ArrowLeftRight } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import type { ActiveScope, Transaction } from '../types';

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function MoveTransactionModal({
  tx,
  onClose,
}: {
  tx: Transaction;
  onClose: () => void;
}) {
  const { accounts, user, activeScope, moveTransaction } = useFinance();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const destinations: { key: string; label: string; scope: ActiveScope }[] = [
    ...(activeScope.type === 'PERSONAL'
      ? []
      : [{ key: 'personal', label: 'Pessoal', scope: { type: 'PERSONAL', userId: user?.uid || '' } as ActiveScope }]),
    ...accounts
      .filter((acc) => activeScope.type !== 'ACCOUNT' || acc.id !== activeScope.accountId)
      .map((acc) => ({
        key: acc.id,
        label: acc.name,
        scope: {
          type: 'ACCOUNT',
          accountId: acc.id,
          accountName: acc.name,
          role: acc.ownerId === user?.uid ? 'owner' : acc.memberRole || 'member',
        } as ActiveScope,
      })),
  ];

  const [targetKey, setTargetKey] = useState(destinations[0]?.key || '');
  const [month, setMonth] = useState(tx.date.slice(0, 7));
  const [date, setDate] = useState(tx.date);

  const originLabel = activeScope.type === 'PERSONAL' ? 'Pessoal' : activeScope.accountName;

  const handleMonthChange = (value: string) => {
    setMonth(value);
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return;
    const day = Math.min(Number(tx.date.slice(8, 10)), daysInMonth(y, m));
    setDate(`${value}-${String(day).padStart(2, '0')}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = destinations.find((d) => d.key === targetKey);
    if (!target || !date) return;
    setSubmitting(true);
    setError('');
    try {
      await moveTransaction(tx.id, target.scope, date);
      onClose();
    } catch {
      setError('Não foi possível mover o lançamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 24 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex justify-between items-center shrink-0">
          <div className="min-w-0">
            <h3 className="text-[1.05rem] font-bold tracking-tight text-[#1a1d21]">
              Mover lançamento
            </h3>
            <p className="text-xs text-[#9aa1ac] mt-0.5 truncate">
              {tx.title} • {formatCurrency(tx.amount)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#f6f7f9] hover:bg-[#eef0f2] rounded-full text-[#5f6672] hover:text-[#1a1d21] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="border-b border-[#f3f4f2] mx-5" />

        {destinations.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#5f6672]">Você ainda não tem outra conta. Crie uma empresa nas Configurações para mover lançamentos entre contas.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-[#1a1d21] text-white text-sm font-bold rounded-xl cursor-pointer">Entendi</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
            <div className="rounded-xl bg-[#f6f7f9] px-4 py-3 flex items-center gap-2 text-xs text-[#5f6672]">
              <ArrowLeftRight className="w-4 h-4 shrink-0" />
              <span>Saindo de <strong className="text-[#1a1d21]">{originLabel}</strong>. Move apenas este lançamento.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Conta de destino</label>
              <select
                value={targetKey}
                onChange={(e) => setTargetKey(e.target.value)}
                className="w-full clay-input px-4 py-3 outline-none text-[0.95rem] font-medium cursor-pointer"
              >
                {destinations.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Mês</label>
                <input
                  type="month"
                  required
                  value={month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full clay-input px-4 py-3 outline-none text-[0.95rem]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full clay-input px-4 py-3 outline-none text-[0.95rem]"
                />
              </div>
            </div>

            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

            <div className="sticky bottom-0 -mx-5 -mb-4 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-[#f3f4f2]">
              <button
                type="submit"
                disabled={submitting || !targetKey || !date}
                className="w-full bg-[#1a1d21] hover:opacity-90 font-bold py-3.5 rounded-xl text-white text-[0.95rem] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                {submitting ? 'Movendo...' : 'Mover lançamento'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
