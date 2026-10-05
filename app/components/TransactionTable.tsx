import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { addMonths, format, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, cn } from '../lib/utils';
import { Trash2, Pencil, Search, Forward, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { MoveTransactionModal } from './MoveTransactionModal';
import ConfirmModal from './ConfirmModal';
import { Transaction } from '../types';
import { isRecurringTransaction } from '../lib/transactionActions';

export function TransactionTable({ 
  hideHeaderTitle,
  forceFilter,
  fixedOnly
}: { 
  hideHeaderTitle?: boolean;
  forceFilter?: 'ALL' | 'INCOME' | 'EXPENSE';
  fixedOnly?: boolean;
}) {
  const { transactions, activeContext, activeScope, accounts, selectedMonth, toggleStatus, deleteTransaction, updateTransaction, categories, tags } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [moveTx, setMoveTx] = useState<Transaction | undefined>(undefined);
  const canMove = accounts.length > 0 || activeScope.type === 'ACCOUNT';
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [confirmDelete, setConfirmDelete] = useState<{ tx: Transaction; future: boolean } | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: 'date' | 'amount' }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const visibleTransactions = transactions
    .filter(t => t.context === activeContext)
    .filter(t => isSameMonth(parseISO(t.date), selectedMonth))
    .filter(t => forceFilter ? t.type === forceFilter : (filterType === 'ALL' || t.type === filterType))
    .filter(t => fixedOnly ? t.isFixed : true)
    .filter(t => categoryFilterId ? t.categoryId === categoryFilterId : true)
    .filter(t => statusFilter === 'ALL' ? true : t.status === statusFilter)
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortField === 'date') {
        const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleMoveToNextMonth = (tx: Transaction) => {
    const currentDate = parseISO(tx.date);
    const nextMonthDate = addMonths(currentDate, 1);
    const newDate = format(nextMonthDate, 'yyyy-MM-dd');
    updateTransaction(tx.id, { date: newDate });
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return txTypeLabel(null);
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : txTypeLabel(null);
  };

  const txTypeLabel = (type: string | null) => {
    if (type === 'INCOME') return 'Entrada';
    if (type === 'EXPENSE') return 'Fixo/Avulso';
    return 'Geral';
  };

  const handleCreate = () => {
    setEditingTx(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white flex flex-col flex-1 min-h-[300px]">
      <div className="px-1 py-3 border-b border-[#f3f4f2] flex flex-col sm:flex-row sm:items-center sm:justify-between z-10 gap-3">
        {!hideHeaderTitle && <span className="text-slate-700 font-bold text-[0.85rem] tracking-tight shrink-0">Transações</span>}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:ml-auto min-w-0">
          <div className="relative flex-1 sm:flex-none sm:w-32 min-w-[100px]">
             <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
                aria-label="Buscar lançamentos"
                placeholder="Buscar..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
                className="clay-input w-full text-[0.78rem] pl-9 pr-3 py-1.5 font-medium text-slate-700 placeholder:text-slate-400"
             />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
          {!forceFilter && (
            <select
              aria-label="Filtrar tipo de lançamento"
              className="clay-input text-[0.72rem] px-2 py-1.5 font-medium text-slate-600 cursor-pointer shrink-0"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="ALL">Todas</option>
              <option value="INCOME">Entradas</option>
              <option value="EXPENSE">Despesas</option>

            </select>
          )}
          <select
            aria-label="Filtrar status"
            className="clay-input text-[0.72rem] px-2 py-1.5 font-medium text-slate-600 cursor-pointer shrink-0"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PAID' | 'PENDING')}
          >
            <option value="ALL">Status</option>
            <option value="PAID">Pago</option>
            <option value="PENDING">Pendente</option>
          </select>
          <select
            aria-label="Filtrar categoria"
            className="clay-input text-[0.72rem] px-2 py-1.5 font-medium text-slate-600 cursor-pointer shrink-0 max-w-[110px]"
            value={categoryFilterId}
            onChange={(e) => setCategoryFilterId(e.target.value)}
          >
            <option value="">Categorias</option>
            {categories
              .sort((a, b) => a.order - b.order)
              .map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
          </select>
          <button
            onClick={handleCreate}
            type="button"
            className="clay-btn-primary text-[0.72rem] px-2.5 py-1.5 cursor-pointer font-bold whitespace-nowrap shrink-0"
          >
            + Lançamento
          </button>
          </div>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1 hidden md:block">
        <table className="w-full text-left border-collapse text-[0.9rem] min-w-[640px]">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th scope="col" className="py-3.5 pr-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] whitespace-nowrap">
                <button type="button" onClick={() => toggleSort('date')} aria-label={`Ordenar por data, ${sortDir === 'asc' ? 'crescente' : 'decrescente'}`} className="inline-flex items-center gap-1 bg-transparent border-none text-inherit cursor-pointer uppercase">
                  Data <SortIcon field="date" />
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] whitespace-nowrap">Descrição</th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] whitespace-nowrap">Categoria</th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] text-right whitespace-nowrap">
                <button type="button" onClick={() => toggleSort('amount')} aria-label={`Ordenar por valor, ${sortDir === 'asc' ? 'crescente' : 'decrescente'}`} className="inline-flex items-center gap-1 justify-end bg-transparent border-none text-inherit cursor-pointer uppercase">
                  Valor <SortIcon field="amount" />
                </button>
              </th>
              <th scope="col" className="py-3.5 px-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] whitespace-nowrap">Status</th>
              <th scope="col" aria-label="Ações" className="py-3.5 px-4 font-semibold text-[#9aa1ac] text-[0.68rem] uppercase tracking-[0.06em] border-b border-[#f3f4f2] text-center w-20 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <span className="text-slate-400">Nenhum lançamento encontrado.</span>
                </td>
              </tr>
            ) : visibleTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#fafaf9] transition-colors duration-150">
                <td className="py-4 pr-4 border-b border-[#f3f4f2] text-[#5f6672] whitespace-nowrap text-[0.85rem]">
                  {format(parseISO(tx.date), "dd/MM/yyyy")}
                </td>
                <td className="py-4 px-4 border-b border-[#f3f4f2] font-semibold text-[#1a1d21] text-[0.9rem]">
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
                    <span className="ml-2 text-[0.7rem] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tx.installmentInfo}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 border-b border-[#f3f4f2] text-[#5f6672] text-[0.85rem]">
                  {getCategoryName(tx.categoryId)}
                </td>
                <td className="py-4 px-4 border-b border-[#f3f4f2] text-right">
                  <span className={cn(
                    "font-bold whitespace-nowrap tabular-nums text-[0.9rem]",
                    tx.type === 'INCOME' ? 'text-[#1a1d21]' : 'text-[#1a1d21]'
                  )}>
                    {tx.type === 'INCOME' ? '' : '- '}
                    {formatCurrency(tx.amount)}
                  </span>
                </td>
                <td className="py-4 px-4 border-b border-[#f3f4f2]">
                    <button
                    type="button"
                    aria-label={`Marcar ${tx.title} como ${tx.status === 'PAID' ? 'pendente' : 'pago'}`}
                    onClick={() => toggleStatus(tx.id)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold cursor-pointer border-none transition-all active:scale-95 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
                      tx.status === 'PAID'
                        ? 'bg-success-light text-success-dark'
                        : 'bg-warning-light text-warning-dark'
                    )}
                  >
                    {tx.status === 'PAID' ? 'Pago' : 'Pendente'}
                  </button>
                </td>
                <td className="py-4 px-4 border-b border-[#f3f4f2] text-center whitespace-nowrap">
                  {canMove && (
                    <button
                      type="button"
                      onClick={() => setMoveTx(tx)}
                      title="Mover para outra conta"
                      aria-label={`Mover ${tx.title} para outra conta`}
                      className="text-[#9aa1ac] hover:text-[#1a1d21] p-2 cursor-pointer bg-transparent border-none rounded-lg hover:bg-[#f6f7f9]"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMoveToNextMonth(tx)}
                    title="Passar para o próximo mês"
                    aria-label={`Passar ${tx.title} para o próximo mês`}
                    className="text-[#9aa1ac] hover:text-[#1a1d21] p-2 cursor-pointer bg-transparent border-none rounded-lg hover:bg-[#f6f7f9]"
                  >
                    <Forward className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(tx)}
                    aria-label={`Editar ${tx.title}`}
                    className="text-[#9aa1ac] hover:text-primary p-2 cursor-pointer bg-transparent border-none rounded-lg hover:bg-[#f6f7f9]"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({ tx, future: isRecurringTransaction(tx) });
                    }}
                    aria-label={`Excluir ${tx.title}`}
                    className="text-[#9aa1ac] hover:text-danger p-2 cursor-pointer ml-1 bg-transparent border-none rounded-lg hover:bg-[#f6f7f9]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card List */}
      <div className="md:hidden flex-1 overflow-y-auto pb-2">
        {visibleTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <span className="text-[#9aa1ac] text-sm">Nenhum lançamento encontrado.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-3">
            {visibleTransactions.map((tx) => (
              <div key={tx.id} className="bg-[#f7f8f7] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9aa1ac] font-medium">{format(parseISO(tx.date), "dd/MM/yyyy")}</p>
                    <p className="text-[0.95rem] font-bold text-[#1a1d21] mt-0.5 truncate">{tx.title}</p>
                    {tx.installmentInfo && (
                      <span className="text-[0.65rem] text-[#5f6672] bg-white px-2 py-0.5 rounded-full mt-1 inline-block">{tx.installmentInfo}</span>
                    )}
                  </div>
                  <span className="text-[0.95rem] font-bold tabular-nums whitespace-nowrap shrink-0 text-[#1a1d21]">
                    {tx.type === 'INCOME' ? '' : '- '}{formatCurrency(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[0.7rem] text-[#5f6672] bg-white px-2 py-1 rounded-full truncate max-w-[120px]">{getCategoryName(tx.categoryId)}</span>
                    {tx.tagIds && tx.tagIds.length > 0 && tx.tagIds.slice(0, 2).map((tid) => {
                      const tag = tags.find((t) => t.id === tid);
                      if (!tag) return null;
                        return (
                        <span key={tid} className="text-[0.55rem] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Marcar ${tx.title} como ${tx.status === 'PAID' ? 'pendente' : 'pago'}`}
                      onClick={() => toggleStatus(tx.id)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[0.6rem] font-semibold cursor-pointer border-none transition-all active:scale-95 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
                        tx.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {tx.status === 'PAID' ? 'Pago' : 'Pendente'}
                    </button>
                    {canMove && (
                      <button type="button" onClick={() => setMoveTx(tx)} title="Mover para outra conta" aria-label={`Mover ${tx.title} para outra conta`} className="text-[#9aa1ac] hover:text-[#1a1d21] p-2 cursor-pointer bg-white rounded-full border-none">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => handleMoveToNextMonth(tx)} title="Passar para o próximo mês" aria-label={`Passar ${tx.title} para o próximo mês`} className="text-[#9aa1ac] hover:text-[#1a1d21] p-2 cursor-pointer bg-white rounded-full border-none">
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleEdit(tx)} aria-label={`Editar ${tx.title}`} className="text-[#9aa1ac] hover:text-primary p-2 cursor-pointer bg-white rounded-full border-none">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => {
                      setConfirmDelete({ tx, future: isRecurringTransaction(tx) });
                    }} type="button" aria-label={`Excluir ${tx.title}`} className="text-[#9aa1ac] hover:text-danger p-2 cursor-pointer bg-white rounded-full border-none">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && <TransactionModal initialData={editingTx} onClose={() => setIsModalOpen(false)} />}

      {moveTx && <MoveTransactionModal tx={moveTx} onClose={() => setMoveTx(undefined)} />}

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
