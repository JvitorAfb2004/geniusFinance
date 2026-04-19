import React, { useState, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { TransactionType, TransactionStatus, Transaction } from '../types';
import { format } from 'date-fns';
import { X } from 'lucide-react';

export function TransactionModal({ 
  onClose, 
  initialData 
}: { 
  onClose: () => void;
  initialData?: Transaction;
}) {
  const { addTransaction, updateTransaction, activeContext } = useFinance();
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [amountStr, setAmountStr] = useState(() => {
    if (initialData && initialData.amount) {
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(initialData.amount);
    }
    return '';
  });
  const [date, setDate] = useState(initialData ? initialData.date : format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [status, setStatus] = useState<TransactionStatus>(initialData?.status || 'PAID');
  
  const [recurrenceConfig, setRecurrenceConfig] = useState<'ONE_TIME' | 'FIXED' | 'INSTALLMENTS'>('ONE_TIME');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [applyToFuture, setApplyToFuture] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (!numericValue) {
      setAmountStr('');
      return;
    }
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseInt(numericValue, 10) / 100);
    setAmountStr(formatted);
  };

  const getNumericAmount = () => {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = getNumericAmount();
    if (isNaN(val) || val <= 0) return alert('Valor inválido');

    const baseTx = {
      title,
      amount: val,
      date,
      type,
      status,
      context: activeContext
    };

    if (initialData) {
      updateTransaction(initialData.id, baseTx, applyToFuture);
    } else {
      if (recurrenceConfig === 'ONE_TIME') {
        addTransaction(baseTx);
      } else if (recurrenceConfig === 'FIXED') {
        addTransaction(baseTx, 'FIXED');
      } else if (recurrenceConfig === 'INSTALLMENTS') {
        addTransaction(baseTx, 'INSTALLMENTS', installmentsCount);
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold font-sans text-gray-900">
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'INCOME', label: 'Entrada (+)', colorClasses: type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' },
                  { id: 'EXPENSE', label: 'Saída (-)', colorClasses: type === 'EXPENSE' ? 'bg-rose-50 text-rose-700 border-rose-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' },
                  { id: 'CREDIT_CARD', label: 'Cartão', colorClasses: type === 'CREDIT_CARD' ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id as TransactionType)}
                    className={`py-2 px-1 sm:px-2 text-[0.75rem] font-bold rounded-lg border-2 transition-colors cursor-pointer ${opt.colorClasses}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'PAID', label: 'Pago / Recebido' },
                  { id: 'PENDING', label: 'Pendente' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id as TransactionStatus)}
                    className={`py-2 px-3 text-[0.8rem] font-bold rounded-lg border-2 transition-colors cursor-pointer ${
                      status === opt.id
                        ? 'border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Descrição</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Salário, Aluguel, Supermercado..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor (R$)</label>
              <input 
                required
                type="text" 
                inputMode="numeric"
                placeholder="0,00"
                value={amountStr}
                onChange={handleAmountChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Data Base</label>
              <input 
                required
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!initialData ? (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Recorrência</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ONE_TIME', label: 'Única' },
                  { id: 'FIXED', label: 'Fixa' },
                  { id: 'INSTALLMENTS', label: 'Parcelado' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecurrenceConfig(opt.id as any)}
                    className={`py-2 px-3 text-[0.8rem] font-medium rounded-lg border cursor-pointer ${
                      recurrenceConfig === opt.id 
                        ? 'border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]' 
                        : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              
              {recurrenceConfig === 'INSTALLMENTS' && (
                <div className="pt-2 animate-in slide-in-from-top-2">
                  <label className="text-xs text-gray-500 mb-1 block">Número de Parcelas</label>
                  <input 
                    type="number" 
                    min="2" max="48"
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(parseInt(e.target.value) || 2)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    O valor total de R$ {amountStr || '0,00'} será dividido em {installmentsCount} vezes de R$ {(getNumericAmount() / installmentsCount).toFixed(2).replace('.', ',')}.
                  </p>
                </div>
              )}
              
               {recurrenceConfig === 'FIXED' && (
                <div className="pt-1">
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                    Um lançamento será criado para os próximos meses automaticamente.
                  </p>
                </div>
              )}
            </div>
          ) : (
            initialData.groupId && initialData.isFixed && (
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={applyToFuture}
                    onChange={(e) => setApplyToFuture(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Aplicar para as próximas recorrências.
                  </span>
                </label>
              </div>
            )
          )}

          <div className="pt-6 pb-2">
            <button 
              type="submit"
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] border-none text-white font-semibold py-3 rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98] cursor-pointer"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
