import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { format, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Pencil, Search } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import ConfirmModal from './ConfirmModal';
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
  const { transactions, activeContext, selectedMonth, toggleStatus, deleteTransaction, categories, tags } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'CREDIT_CARD'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ tx: Transaction; future: boolean } | null>(null);

  const visibleTransactions = transactions
    .filter(t => t.context === activeContext)
    .filter(t => isSameMonth(parseISO(t.date), selectedMonth))
    .filter(t => forceFilter ? t.type === forceFilter : (filterType === 'ALL' || t.type === filterType))
    .filter(t => fixedOnly ? t.isFixed : true)
    .filter(t => categoryFilterId ? t.categoryId === categoryFilterId : true)
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return txTypeLabel(null);
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : txTypeLabel(null);
  };

  const txTypeLabel = (type: string | null) => {
    if (type === 'INCOME') return 'Entrada';
    if (type === 'EXPENSE') return 'Fixo/Avulso';
    if (type === 'CREDIT_CARD') return 'Cartao';
    return 'Geral';
  };

  const handleCreate = () => {
    setEditingTx(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-surface rounded-2xl border border-slate-100 flex flex-col flex-1 min-h-[300px] shadow-[0_1px_3px_rgba(0,0,0,0.015),0_1px_2px_rgba(0,0,0,0.005)]">
      <div className="p-4.5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between z-10 gap-4 flex-wrap">
        {!hideHeaderTitle && <span className="text-slate-800 font-bold text-[0.95rem] tracking-tight">Transações Recentes</span>}
        
        <div className="flex items-center gap-3 w-full md:w-auto ml-auto">
          <div className="relative flex-1 md:w-48">
             <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Buscar..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full text-[0.78rem] border border-slate-200 rounded-xl focus:border-primary pl-9 pr-3 py-1.5 outline-none font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50/50"
             />
          </div>

          {!forceFilter && (
            <select
              className="text-[0.78rem] border-slate-200 rounded-xl focus:border-primary px-3 py-1.5 border bg-white outline-none font-medium text-slate-600 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">Todas</option>
              <option value="INCOME">Entradas</option>
              <option value="EXPENSE">Despesas</option>
              <option value="CREDIT_CARD">Cartão</option>
            </select>
          )}
          <select
            className="text-[0.78rem] border-slate-200 rounded-xl focus:border-primary px-3 py-1.5 border bg-white outline-none font-medium text-slate-600 cursor-pointer max-w-[140px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            value={categoryFilterId}
            onChange={(e) => setCategoryFilterId(e.target.value)}
          >
            <option value="">Todas categorias</option>
            {categories
              .sort((a, b) => a.order - b.order)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
          </select>
          <button 
            onClick={handleCreate}
            className="text-[0.76rem] text-primary hover:text-primary-hover bg-slate-50 border border-slate-100 hover:border-slate-200 px-3.5 py-1.5 rounded-xl cursor-pointer font-bold transition-all whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
          >
            + Lançamento
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse text-[0.85rem] min-w-[600px]">
          <thead className="sticky top-0 bg-slate-50/70 z-10">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Data</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Descrição</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Categoria</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 text-right whitespace-nowrap">Valor</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 whitespace-nowrap">Status</th>
              <th className="py-3 px-4 font-bold text-slate-500 text-[0.72rem] uppercase tracking-wider border-b border-slate-100 text-center w-20 whitespace-nowrap"></th>
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
                  {(tx.tagIds && tx.tagIds.length > 0) && (
                    <span className="flex flex-wrap gap-1 mt-1">
                      {tx.tagIds.map((tid) => {
                        const tag = tags.find((t) => t.id === tid);
                        if (!tag) return null;
                        return (
                          <span key={tid} className="text-[0.6rem] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {tx.installmentInfo && (
                    <span className="ml-2 text-[0.7rem] font-normal text-[#64748b] bg-[#e2e8f0] px-1.5 py-0.5 rounded">
                      {tx.installmentInfo}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 border-b border-[#e2e8f0] font-sans text-[#64748b]">
                  {getCategoryName(tx.categoryId)}
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
                        setConfirmDelete({ tx, future: false });
                      } else {
                        setConfirmDelete({ tx, future: false });
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

      {confirmDelete && !confirmDelete.tx.groupId && (
        <ConfirmModal
          title="Excluir lancamento"
          message={`Deseja excluir "${confirmDelete.tx.title}"? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => { deleteTransaction(confirmDelete.tx.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDelete && confirmDelete.tx.groupId && confirmDelete.tx.isFixed && (
        <ConfirmModal
          title="Excluir recorrencia"
          message={`Deseja excluir apenas "${confirmDelete.tx.title}" deste mes ou este e os proximos meses?`}
          confirmLabel="Este e proximos"
          cancelLabel="Apenas este"
          variant="warning"
          onConfirm={() => { deleteTransaction(confirmDelete.tx.id, true); setConfirmDelete(null); }}
          onCancel={() => { deleteTransaction(confirmDelete.tx.id, false); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
