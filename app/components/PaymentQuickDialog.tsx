import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/utils';

interface PaymentQuickDialogProps {
  tx: { title: string; amount: number; type: string; payments?: { amount: number }[] };
  onConfirm: (amount: number, date: string) => void;
  onClose: () => void;
}

/** Digálogo rápido: seta o valor pago/recebido parcial de um lançamento direto na lista. */
export default function PaymentQuickDialog({ tx, onConfirm, onClose }: PaymentQuickDialogProps) {
  const paid = (tx.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, tx.amount - paid);
  const today = format(new Date(), 'yyyy-MM-dd');
  const label = tx.type === 'INCOME' ? 'recebido' : 'pago';
  const [valueStr, setValueStr] = useState(
    () => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)
  );
  const [dateStr, setDateStr] = useState(today);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setValueStr('');
      return;
    }
    setValueStr(
      new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseInt(digits, 10) / 100)
    );
  };

  const handleConfirm = () => {
    const value = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(value) || value <= 0) return;
    onConfirm(value, dateStr || today);
    onClose();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/35 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-[1.05rem] font-bold text-slate-800 tracking-tight">Valor {label}</h3>
          <p className="text-[0.85rem] text-slate-500 mt-1 leading-relaxed">
            {tx.title} — {label} {formatCurrency(paid)} de {formatCurrency(tx.amount)} · resta {formatCurrency(remaining)}
          </p>
          <label className="block mt-4">
            <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.06em]">Valor {label} (R$)</span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              aria-label={`Valor ${label}`}
              value={valueStr}
              onChange={handleChange}
              className="clay-input mt-1 w-full px-4 py-2.5 outline-none transition-all"
            />
          </label>
          <label className="block mt-3">
            <span className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-[0.06em]">Data</span>
            <input
              type="date"
              aria-label={`Data do valor ${label}`}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="clay-input mt-1 w-full px-4 py-2.5 outline-none transition-all"
            />
          </label>
        </div>
        <div className="flex gap-2.5 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer text-sm font-medium">Cancelar</button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg cursor-pointer text-sm font-medium ${tx.type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Registrar {label}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
