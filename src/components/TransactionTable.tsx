import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { format, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Pencil, Search } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { Transaction } from '../types';

export function TransactionTable({ 
  hideHeaderTitle,
  forceFilter,
  fixedOnly
}: { 
  hideHeaderTitle?: boolean;
  forceFilter?: 'ALL' | 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
  fixedOnly?: boolean;
}) {
  const { transactions, activeContext, selectedMonth, toggleStatus, deleteTransaction } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'CREDIT_CARD'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const visibleTransactions = transactions
    .filter(t => t.context === activeContext)
    .filter(t => isSameMonth(parseISO(t.date), selectedMonth))
    .filter(t => forceFilter ? t.type === forceFilter : (filterType === 'ALL' || t.type === filterType))
    .filter(t => fixedOnly ? t.isFixed : true)
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTx(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] flex flex-col flex-1 min-h-[300px]">
      <div className="p-4 border-b border-[#e2e8f0] flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm z-10 gap-4 flex-wrap">
        {!hideHeaderTitle && <span className="text-[#1e293b] font-bold">Transações Recentes</span>}
        
        <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
          <div className="relative flex-1 md:w-48">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Buscar..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full text-[0.75rem] border border-[#e2e8f0] rounded-md focus:border-[#3b82f6] pl-9 pr-2 py-1.5 outline-none font-medium text-[#1e293b] placeholder:text-gray-400"
             />
          </div>

          {!forceFilter && (
            <select 
              className="text-[0.75rem] border-[#e2e8f0] rounded-md focus:border-[#3b82f6] px-2 py-1.5 border bg-white outline-none font-medium text-[#64748b]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">Todas</option>
              <option value="INCOME">Entradas</option>
              <option value="EXPENSE">Despesas</option>
              <option value="CREDIT_CARD">Cartão</option>
            </select>
          )}
          <button 
            onClick={handleCreate}
            className="text-[0.75rem] text-[#3b82f6] border-none bg-transparent cursor-pointer font-bold hover:underline whitespace-nowrap"
          >
            + Nova Entrada/Saída
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse text-[0.85rem] min-w-[600px]">
          <thead className="sticky top-0 bg-[#f8fafc] z-10">
            <tr>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] whitespace-nowrap">Data</th>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] whitespace-nowrap">Descrição</th>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] whitespace-nowrap">Categoria</th>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] text-right whitespace-nowrap">Valor</th>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] whitespace-nowrap">Status</th>
              <th className="py-3 px-4 font-semibold text-[#64748b] border-b border-[#e2e8f0] text-center w-20 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#64748b]">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : visibleTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#f4f6f8]/50 transition-colors">
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] font-sans text-[#64748b] whitespace-nowrap">
                  {format(parseISO(tx.date), "dd/MM/yyyy")}
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] font-sans font-medium text-[#1e293b]">
                  {tx.title}
                  {tx.installmentInfo && (
                    <span className="ml-2 text-[0.7rem] font-normal text-[#64748b] bg-[#e2e8f0] px-1.5 py-0.5 rounded">
                      {tx.installmentInfo}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] font-sans text-[#64748b]">
                  {tx.type === 'INCOME' ? 'Entrada' : tx.type === 'EXPENSE' ? 'Fixo/Avulso' : 'Cartão'}
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] text-right">
                  <span className={cn(
                    "font-mono font-bold whitespace-nowrap",
                    tx.type === 'INCOME' ? 'text-[#10b981]' : 'text-[#ef4444]'
                  )}>
                    {tx.type === 'INCOME' ? '' : '- '}
                    {formatCurrency(tx.amount)}
                  </span>
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0]">
                  <button 
                    onClick={() => toggleStatus(tx.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[0.7rem] font-bold uppercase cursor-pointer border-none transition-transform active:scale-95",
                      tx.status === 'PAID' 
                        ? 'bg-[#dcfce7] text-[#166534]' 
                        : 'bg-[#fef9c3] text-[#854d0e]'
                    )}
                  >
                    {tx.status === 'PAID' ? 'Pago' : 'Pendente'}
                  </button>
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] text-center whitespace-nowrap">
                  <button 
                    onClick={() => handleEdit(tx)}
                    className="text-[#64748b] hover:text-[#3b82f6] transition-colors p-1 bg-transparent border-none cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (tx.groupId && tx.isFixed) {
                        const delFuture = window.confirm("Excluir apenas este mês ou este e os próximos?");
                        deleteTransaction(tx.id, delFuture);
                      } else {
                        deleteTransaction(tx.id);
                      }
                    }}
                    className="text-[#64748b] hover:text-[#ef4444] transition-colors p-1 bg-transparent border-none cursor-pointer ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && <TransactionModal initialData={editingTx} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
