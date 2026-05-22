import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

export default function SalesTargetModal({ onClose }: { onClose: () => void }) {
  const { upsertSalesTarget, activeContext, selectedMonth } = useFinance();

  const [targetType, setTargetType] = useState<'GENERAL' | 'CHANNEL' | 'SELLER'>('GENERAL');
  const [channel, setChannel] = useState('');
  const [seller, setSeller] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;
  const monthName = selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAmountStr('');
      return;
    }
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseInt(numericValue, 10) / 100);
    setAmountStr(formatted);
  };

  const getNumericAmount = () => {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = getNumericAmount();
    if (isNaN(val) || val <= 0) return;

    setSubmitting(true);
    try {
      await upsertSalesTarget({
        context: activeContext,
        year,
        month,
        channel: targetType === 'CHANNEL' ? channel : undefined,
        seller: targetType === 'SELLER' ? seller : undefined,
        targetAmount: val,
      });
      onClose();
    } catch {
      // Error handled by handleFirestoreError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Definir Meta de Vendas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500">{monthName}</p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo de Meta</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'GENERAL' as const, label: 'Geral' },
                { id: 'CHANNEL' as const, label: 'Canal' },
                { id: 'SELLER' as const, label: 'Vendedor' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetType(opt.id)}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border-2 transition-colors cursor-pointer ${
                    targetType === opt.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {targetType === 'CHANNEL' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome do Canal</label>
              <input
                required
                type="text"
                placeholder="Ex: Instagram, WhatsApp, Loja..."
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          )}

          {targetType === 'SELLER' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome do Vendedor</label>
              <input
                required
                type="text"
                placeholder="Ex: Joao, Maria..."
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor da Meta (R$)</label>
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={amountStr}
              onChange={handleAmountChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-mono"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
