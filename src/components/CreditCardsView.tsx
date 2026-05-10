import React from 'react';
import { useFinance } from '../hooks/useFinance';
import { TransactionTable } from './TransactionTable';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { isSameMonth, parseISO } from 'date-fns';

export function CreditCardsView() {
  const { transactions, activeContext, selectedMonth } = useFinance();

  const currentTxs = transactions.filter(t => 
    t.context === activeContext && 
    t.type === 'CREDIT_CARD' &&
    isSameMonth(parseISO(t.date), selectedMonth)
  );

  const totalPending = currentTxs.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = currentTxs.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
  const total = totalPending + totalPaid;

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Fatura Total (Mês)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Aberto / Pendente</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pago</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#e2e8f0]">
             <h2 className="text-xl font-bold font-sans text-gray-900">Transações de Cartão</h2>
             <p className="text-sm text-gray-500 mt-1">Todas as compras no cartão de crédito para o mês atual.</p>
          </div>
          <div className="flex-1 overflow-hidden p-4">
             <TransactionTable hideHeaderTitle forceFilter="CREDIT_CARD" />
          </div>
      </div>
    </div>
  );
}
