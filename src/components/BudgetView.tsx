import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import { SECTION_LABELS } from '../lib/categories';
import type { DRESection, Budget } from '../types';
import { isSameMonth, parseISO, eachMonthOfInterval, startOfYear, endOfYear, format, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';

type CellEdit = { categoryId: string; month: number } | null;

export default function BudgetView() {
  const { transactions, budgets, categories, activeContext, selectedMonth, upsertBudget } = useFinance();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<CellEdit>(null);
  const [editValue, setEditValue] = useState('');

  const year = selectedMonth.getFullYear();

  const months = useMemo(() =>
    eachMonthOfInterval({ start: startOfYear(selectedMonth), end: endOfYear(selectedMonth) }),
    [year]
  );

  const currentMonthIndex = getMonth(selectedMonth);

  const sectionCats = useMemo(() => {
    const sections: DRESection[] = ['RECEITA', 'CUSTOS', 'DESPESAS'];
    return sections.map((section) => ({
      section,
      label: SECTION_LABELS[section],
      categories: categories
        .filter((c) => c.section === section)
        .sort((a, b) => a.order - b.order),
    }));
  }, [categories]);

  function getCell(categoryId: string, monthIndex: number) {
    const m = months[monthIndex];
    const monthTxs = transactions.filter(
      (tx) => tx.context === activeContext && tx.categoryId === categoryId && isSameMonth(parseISO(tx.date), m)
    );
    const actual = monthTxs.reduce((sum, tx) => {
      return sum + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
    }, 0);

    const monthBudget = budgets.find(
      (b) => b.context === activeContext && b.categoryId === categoryId && b.year === getYear(m) && b.month === getMonth(m) + 1
    );
    return { planned: monthBudget?.plannedAmount || 0, actual };
  }

  function startEdit(categoryId: string, monthIndex: number, currentValue: number) {
    setEditing({ categoryId, month: monthIndex });
    setEditValue(currentValue > 0 ? currentValue.toString() : '');
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  async function confirmEdit() {
    if (!editing) return;
    const value = parseFloat(editValue.replace(',', '.')) || 0;
    await upsertBudget(editing.categoryId, value);
    setEditing(null);
    setEditValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  function toggleSection(section: string) {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function sectionTotal(section: DRESection, monthIndex: number, field: 'planned' | 'actual') {
    const cats = categories.filter((c) => c.section === section);
    return cats.reduce((sum, cat) => sum + getCell(cat.id, monthIndex)[field], 0);
  }

  function netProfitMonth(monthIndex: number) {
    const r = sectionTotal('RECEITA', monthIndex, 'actual');
    const c = sectionTotal('CUSTOS', monthIndex, 'actual');
    const d = sectionTotal('DESPESAS', monthIndex, 'actual');
    return r - c - d;
  }

  function netMarginMonth(monthIndex: number) {
    const r = sectionTotal('RECEITA', monthIndex, 'actual');
    const np = netProfitMonth(monthIndex);
    return r !== 0 ? (np / r) * 100 : 0;
  }

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Carregando categorias...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Orçamento {year}</h2>
          <p className="text-sm text-slate-500">Valores planejados por categoria. Clique em uma celula para editar.</p>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 font-semibold text-slate-600 min-w-[200px]">
                  Categoria
                </th>
                {months.map((m, i) => (
                  <th
                    key={i}
                    className={`px-2 py-2 text-center font-semibold min-w-[130px] ${
                      i === currentMonthIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    <div>{format(m, 'MMM', { locale: ptBR })}</div>
                    <div className="text-xs font-normal text-slate-400">Orçado / Real</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectionCats.map(({ section, label, categories: cats }) => {
                const isCollapsed = collapsed[section];
                return (
                  <React.Fragment key={section}>
                    {/* Section header */}
                    <tr
                      className="border-b border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSection(section)}
                    >
                      <td className="sticky left-0 z-10 bg-slate-50/50 px-3 py-2 font-semibold text-slate-700 flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {section === 'RECEITA' ? '' : '(-) '}{label}
                      </td>
                      {months.map((_, i) => {
                        const planned = sectionTotal(section, i, 'planned');
                        const actual = sectionTotal(section, i, 'actual');
                        return (
                          <td key={i} className="px-2 py-2 text-center font-mono font-semibold text-slate-700">
                            <span className={planned > 0 ? '' : 'text-slate-300'}>{formatCurrency(Math.abs(planned))}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className={actual !== 0 ? (section === 'RECEITA' ? (actual >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-red-500') : 'text-slate-300'}>
                              {formatCurrency(Math.abs(actual))}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Category rows */}
                    {!isCollapsed && cats.map((cat) => (
                      <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 pl-8 text-slate-600">
                          {cat.name}
                        </td>
                        {months.map((_, i) => {
                          const cell = getCell(cat.id, i);
                          const isEditing = editing?.categoryId === cat.id && editing?.month === i;
                          const isCurrent = i === currentMonthIndex;
                          return (
                            <td
                              key={i}
                              className={`px-2 py-1 text-center font-mono text-xs ${isCurrent ? 'bg-blue-50/30' : ''}`}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="0,00"
                                    autoFocus
                                    step="0.01"
                                  />
                                  <button onClick={confirmEdit} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={cancelEdit} className="text-red-500 hover:text-red-600 cursor-pointer">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(cat.id, i, cell.planned)}
                                  className="w-full text-left hover:bg-blue-50 rounded px-1 py-0.5 transition-colors group cursor-pointer"
                                >
                                  <span className={cell.planned > 0 ? 'font-medium text-slate-700' : 'text-slate-300'}>
                                    {cell.planned > 0 ? formatCurrency(cell.planned) : '--'}
                                  </span>
                                  <span className="text-slate-300 mx-0.5">/</span>
                                  <span className={
                                    cell.actual !== 0
                                      ? (cat.section === 'RECEITA' ? (cell.actual >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-red-500')
                                      : 'text-slate-300'
                                  }>
                                    {cell.actual !== 0 ? formatCurrency(Math.abs(cell.actual)) : '--'}
                                  </span>
                                  <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 inline ml-1" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Net Profit Row */}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-bold text-slate-800">
                  (=) Lucro Liquido
                </td>
                {months.map((_, i) => {
                  const np = netProfitMonth(i);
                  const planned = sectionTotal('RECEITA', i, 'planned') - sectionTotal('CUSTOS', i, 'planned') - sectionTotal('DESPESAS', i, 'planned');
                  return (
                    <td key={i} className="px-2 py-2 text-center font-mono font-bold">
                      <span className={planned > 0 ? 'text-slate-500' : 'text-slate-300'}>{formatCurrency(planned)}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className={np >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatCurrency(np)}</span>
                    </td>
                  );
                })}
              </tr>

              {/* Margin Row */}
              <tr className="border-b border-slate-200 bg-slate-50">
                <td className="sticky left-0 z-10 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                  Margem Liquida
                </td>
                {months.map((_, i) => {
                  const nm = netMarginMonth(i);
                  return (
                    <td key={i} className="px-2 py-1.5 text-center font-mono text-sm">
                      <span className={nm >= 0 ? 'text-purple-600' : 'text-red-500'}>
                        {nm.toFixed(1)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
