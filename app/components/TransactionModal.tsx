import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../hooks/useFinance';
import { TransactionType, TransactionStatus, Transaction, DRESection } from '../types';
import { format } from 'date-fns';
import { SECTION_LABELS } from '../lib/categories';
import {
  backspaceCalculator,
  CalculatorOperator,
  clearCalculator,
  createCalculatorState,
  formatCalculatorValueForCurrency,
  inputCalculatorDigit,
  pressCalculatorEquals,
  pressCalculatorOperator,
} from '../lib/calculator';
import { X, Search, Plus, ArrowUpCircle, ArrowDownCircle, CheckCircle, Clock, Calculator } from 'lucide-react';
import { motion } from 'motion/react';

export function TransactionModal({ 
  onClose, 
  initialData,
  onSaved,
}: { 
  onClose: () => void;
  initialData?: Transaction;
  onSaved?: (newId: string) => void;
}) {
  const { addTransaction, updateTransaction, activeContext, categories, addCategory, selectedMonth, tags, activeScope, transactions, monthlyClosings } = useFinance();
  const [submitting, setSubmitting] = useState(false);
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [amountStr, setAmountStr] = useState(() => {
    if (initialData && initialData.amount) {
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(initialData.amount);
    }
    return '';
  });
  const [date, setDate] = useState(() => {
    if (initialData) return initialData.date;
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [status, setStatus] = useState<TransactionStatus>(initialData?.status || 'PAID');
  
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySection, setNewCategorySection] = useState<DRESection>('DESPESAS');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);
  const calculatorButtonRef = useRef<HTMLButtonElement>(null);

  const [recurrenceConfig, setRecurrenceConfig] = useState<'ONE_TIME' | 'FIXED' | 'INSTALLMENTS'>('ONE_TIME');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [hasEndDate, setHasEndDate] = useState(!!initialData?.endDate);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialData?.tagIds || []);
  const [applyToFuture, setApplyToFuture] = useState(false);

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorState, setCalculatorState] = useState(() => createCalculatorState());
  const [calculatorRect, setCalculatorRect] = useState<DOMRect | null>(null);
  const calcDisplay = calculatorState.display;
  const calcOperator = calculatorState.operator;

  const selectedCatName = categories.find((c) => c.id === categoryId)?.name || '';
  const suggestedCategoryId = useMemo(() => {
    const description = title.trim().toLowerCase();
    if (description.length < 3) return '';
    const words = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    if (words.length === 0) return '';

    const pointsByCategory = new Map<string, number>();
    const contextTxs = transactions.filter((t) => t.context === activeContext && t.categoryId && t.title);
    for (const tx of contextTxs) {
      const normalizedTxTitle = tx.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let points = 0;
      for (const word of words) {
        if (normalizedTxTitle.includes(word)) points += 1;
      }
      if (points > 0 && tx.categoryId) {
        pointsByCategory.set(tx.categoryId, (pointsByCategory.get(tx.categoryId) || 0) + points);
      }
    }

    let bestCategoryId = '';
    let bestScore = 0;
    for (const [candidateId, score] of pointsByCategory.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestCategoryId = candidateId;
      }
    }
    return bestCategoryId;
  }, [title, transactions, activeContext]);
  const suggestedCategoryName = categories.find((c) => c.id === suggestedCategoryId)?.name || '';

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const groupedCategories = useMemo(() => {
    const sections: DRESection[] = ['RECEITA', 'CUSTOS', 'DESPESAS'];
    return sections.map((section) => ({
      section,
      label: SECTION_LABELS[section],
      items: filteredCategories
        .filter((c) => c.section === section)
        .sort((a, b) => a.order - b.order),
    }));
  }, [filteredCategories]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showCalculator) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCalculator, onClose]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (
        showCalculator &&
        calculatorRef.current &&
        calculatorButtonRef.current &&
        !calculatorRef.current.contains(e.target as Node) &&
        !calculatorButtonRef.current.contains(e.target as Node)
      ) {
        setShowCalculator(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalculator]);

  useEffect(() => {
    if (!showCalculator) return;
    calculatorRef.current?.focus();

    const handleCalculatorKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^\d$/.test(key)) {
        e.preventDefault();
        setCalculatorState(prev => inputCalculatorDigit(prev, key));
      } else if (key === ',' || key === '.') {
        e.preventDefault();
        setCalculatorState(prev => inputCalculatorDigit(prev, key));
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        e.preventDefault();
        setCalculatorState(prev => pressCalculatorOperator(prev, key as CalculatorOperator));
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        setCalculatorState(prev => pressCalculatorEquals(prev));
      } else if (key === 'Backspace') {
        e.preventDefault();
        setCalculatorState(prev => backspaceCalculator(prev));
      } else if (key === 'Escape') {
        e.preventDefault();
        setShowCalculator(false);
      }
    };

    document.addEventListener('keydown', handleCalculatorKeyDown);
    return () => document.removeEventListener('keydown', handleCalculatorKeyDown);
  }, [showCalculator]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim(), newCategorySection);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

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

  // Calculator helpers
  const handleCalcDigit = (digit: string) => {
    setCalculatorState(prev => inputCalculatorDigit(prev, digit));
  };

  const handleCalcOperator = (op: CalculatorOperator) => {
    setCalculatorState(prev => pressCalculatorOperator(prev, op));
  };

  const handleCalcEquals = () => {
    setCalculatorState(prev => pressCalculatorEquals(prev));
  };

  const handleCalcClear = () => {
    setCalculatorState(clearCalculator());
  };

  const handleCalcApply = () => {
    const formatted = formatCalculatorValueForCurrency(calcDisplay);
    if (formatted) {
      setAmountStr(formatted);
    }
    setShowCalculator(false);
  };

  const handleCalcUseCurrentValue = () => {
    if (!amountStr) return;
    const stripped = amountStr.replace(/\./g, '');
    setCalculatorState(createCalculatorState(stripped));
  };

  const toggleCalculator = () => {
    const nextOpen = !showCalculator;
    setShowCalculator(nextOpen);
    if (nextOpen && calculatorButtonRef.current) {
      setCalculatorRect(calculatorButtonRef.current.getBoundingClientRect());
    }
    // Prevent modal scroll to bottom when opening calculator
    if (nextOpen) {
      requestAnimationFrame(() => {
        calculatorButtonRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  };

  const getCalculatorStyle = (): React.CSSProperties => {
    if (!calculatorRect) return {};
    const width = 256;
    const left = Math.min(
      Math.max(16, calculatorRect.right - width),
      window.innerWidth - width - 16
    );
    return {
      left,
      top: calculatorRect.bottom + 6,
      width,
      maxHeight: Math.min(360, window.innerHeight - calculatorRect.bottom - 24),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = getNumericAmount();
    if (isNaN(val) || val <= 0) return alert('Valor inválido');

    if (activeScope.type === 'ACCOUNT') {
      if (title.trim().length < 5) return alert('No modo Empresa, use uma descrição mais clara (mínimo 5 caracteres).');
      if (!categoryId) return alert('No modo Empresa, selecione uma categoria (DRE).');
      if (selectedTagIds.length === 0) return alert('No modo Empresa, selecione ao menos 1 tag.');
    }

    setSubmitting(true);
    try {
      const baseTx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        amount: val,
        date,
        type,
        status,
        context: activeContext,
        tagIds: selectedTagIds,
      };
      if (categoryId) baseTx.categoryId = categoryId;
      if (hasEndDate && endDate) baseTx.endDate = endDate;

      if (initialData?.id) {
        await updateTransaction(initialData.id, baseTx, applyToFuture);
      } else {
        if (recurrenceConfig === 'ONE_TIME') {
          const newId = await addTransaction(baseTx);
          if (newId) onSaved?.(newId);
        } else if (recurrenceConfig === 'FIXED') {
          await addTransaction(baseTx, 'FIXED');
        } else if (recurrenceConfig === 'INSTALLMENTS') {
          await addTransaction(baseTx, 'INSTALLMENTS', installmentsCount);
        }
      }

      onClose();
    } catch {
      // Error handled by handleFirestoreError
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
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 24 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex justify-between items-center shrink-0">
          <div className="min-w-0">
            <h3 className="text-[1.05rem] font-bold tracking-tight text-[#1a1d21]">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-xs text-[#9aa1ac] mt-0.5">
              {initialData ? 'Atualize os dados do lançamento' : 'Registre uma nova movimentação'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#f6f7f9] hover:bg-[#eef0f2] rounded-full text-[#5f6672] hover:text-[#1a1d21] transition-colors cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="border-b border-[#f3f4f2] mx-5" />

        <form
          onSubmit={handleSubmit}
          onScroll={() => setShowCalculator(false)}
          className="px-5 py-4 space-y-4 overflow-y-auto"
        >
          {(() => {
            const d = new Date(date + 'T00:00:00');
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const closed = monthlyClosings.find(
              (c) => c.context === activeContext && c.year === y && c.month === m && c.status === 'CLOSED'
            );
            if (!closed) return null;
            return (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Atenção: a competência {String(m).padStart(2, '0')}/{y} está fechada. Esta alteração pode impactar o fechamento já registrado.
              </div>
            );
          })()}
          <div className="space-y-1.5">
            <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'INCOME', label: 'Entrada', icon: ArrowUpCircle, activeClass: 'bg-emerald-50 text-emerald-700' },
                { id: 'EXPENSE', label: 'Saída', icon: ArrowDownCircle, activeClass: 'bg-red-50 text-red-700' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id as TransactionType)}
                   className={`py-3 px-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-xl ${
                     type === opt.id
                       ? `${opt.activeClass}`
                       : 'bg-[#f6f7f9] text-[#9aa1ac] hover:text-[#1a1d21]'
                   }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PAID', label: 'Pago', icon: CheckCircle, activeClass: 'bg-emerald-50 text-emerald-700' },
                { id: 'PENDING', label: 'Pendente', icon: Clock, activeClass: 'bg-[#fff9ec] text-amber-700' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id as TransactionStatus)}
                   className={`py-3 px-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-xl ${
                     status === opt.id
                       ? `${opt.activeClass}`
                       : 'bg-[#f6f7f9] text-[#9aa1ac] hover:text-[#1a1d21]'
                   }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Categoria (DRE)</label>
              <div className="relative">
                <div className="clay-input flex items-center">
                  <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                  <input
                    ref={categoryInputRef}
                    type="text"
                    placeholder={selectedCatName || 'Buscar ou selecionar categoria...'}
                    value={showCategoryDropdown ? categorySearch : (selectedCatName || '')}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      if (!showCategoryDropdown) setShowCategoryDropdown(true);
                    }}
                    onFocus={() => {
                      setShowCategoryDropdown(true);
                      setCategorySearch('');
                    }}
                    className="w-full px-3 py-2.5 outline-none text-sm bg-transparent"
                  />
                  {categoryId && (
                    <button
                      type="button"
                      onClick={() => { setCategoryId(''); setCategorySearch(''); }}
                      className="text-gray-400 hover:text-gray-600 pr-3 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showCategoryDropdown && (
                  <div ref={categoryDropdownRef} className="absolute z-20 mt-1 w-full bg-white border border-[#f0f1ee] rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                    {/* New category button */}
                    {!showNewCategory ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(true)}
                        className="w-full px-3 py-2 text-sm text-[#1a1d21] hover:bg-[#f6f7f9] flex items-center gap-2 border-b border-[#f3f4f2] cursor-pointer font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Nova categoria
                      </button>
                    ) : (
                      <div className="p-3 border-b border-[#f3f4f2] bg-[#f6f7f9] space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nome da categoria"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#f0f1ee] rounded-xl text-sm outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowNewCategory(false); }}
                          />
                          <select
                            value={newCategorySection}
                            onChange={(e) => setNewCategorySection(e.target.value as DRESection)}
                            className="px-2 py-1.5 bg-white border border-[#f0f1ee] rounded-xl text-xs outline-none"
                          >
                            <option value="RECEITA">Receita</option>
                            <option value="CUSTOS">Custos</option>
                            <option value="DESPESAS">Despesas</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim()}
                            className="text-xs px-3 py-1.5 bg-[#1a1d21] text-white rounded-full hover:opacity-90 disabled:opacity-50 cursor-pointer font-bold"
                          >
                            Adicionar
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewCategory(false)}
                            className="text-xs px-3 py-1.5 text-[#9aa1ac] hover:text-[#1a1d21] cursor-pointer font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {categoryId && (
                      <button
                        type="button"
                        onClick={() => { setCategoryId(''); setCategorySearch(''); setShowCategoryDropdown(false); }}
                        className="w-full px-3 py-2 text-sm text-[#5f6672] hover:bg-[#f6f7f9] text-left border-b border-[#f3f4f2] cursor-pointer"
                      >
                        Limpar seleção
                      </button>
                    )}

                    {groupedCategories.map((group) =>
                      group.items.length > 0 ? (
                        <div key={group.section}>
                          <div className="px-3 py-1.5 text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em] bg-[#f6f7f9]">
                            {group.label}
                          </div>
                          {group.items.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryId(cat.id);
                                setCategorySearch('');
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-[#f6f7f9] cursor-pointer transition-colors ${
                                categoryId === cat.id ? 'bg-[#f0f1ee] text-[#1a1d21] font-bold' : 'text-[#1a1d21]'
                              }`}
                            >
                              {cat.name}
                              {cat.isDefault ? '' : ' *'}
                            </button>
                          ))}
                        </div>
                      ) : null
                    )}

                    {filteredCategories.length === 0 && categorySearch && (
                      <div className="px-3 py-3 text-sm text-[#9aa1ac] text-center">
                        Nenhuma categoria encontrada.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!categoryId && suggestedCategoryId && suggestedCategoryName && (
            <div className="-mt-1 rounded-xl bg-[#f6f7f9] px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-[#5f6672]">
Sugestão pela descrição: <strong className="text-[#1a1d21]">{suggestedCategoryName}</strong>
              </p>
              <button
                type="button"
                onClick={() => setCategoryId(suggestedCategoryId)}
                className="text-xs font-bold text-[#1a1d21] underline underline-offset-2 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTagIds((prev) =>
                        active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      )}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-colors cursor-pointer ${
                        active
                          ? 'border-transparent text-white'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                      style={active ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Descrição</label>
            <input
              required
              type="text"
              placeholder="Ex: Salário, Aluguel, Supermercado..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full clay-input px-4 py-3 outline-none transition-all placeholder:text-text-muted text-[0.95rem] font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Valor (R$)</label>
              <div className="relative flex gap-1">
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full clay-input px-4 py-2.5 outline-none transition-all placeholder:text-text-muted"
                />
                <button
                  ref={calculatorButtonRef}
                  type="button"
                  onClick={toggleCalculator}
                  className={`w-10 h-10 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                    showCalculator ? 'clay-btn-primary text-white' : 'clay-btn border-none text-text-muted hover:text-text-primary hover:brightness-95'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                </button>

                {showCalculator && (
                  <div
                    ref={calculatorRef}
                    tabIndex={-1}
                    className="fixed z-[70] bg-surface border border-border rounded-xl shadow-2xl p-3 outline-none overflow-y-auto"
                    style={getCalculatorStyle()}
                  >
                    <div className="bg-bg rounded-lg px-3 py-2 mb-1 text-right font-mono text-lg font-semibold text-text-primary min-h-[2.5rem] flex items-center justify-end overflow-hidden border border-border/60">
                      {calcDisplay}
                    </div>
                    <p className="mb-2 text-[0.65rem] text-text-muted text-right">Use o teclado numérico, Enter para = e Esc para fechar</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['7','8','9','/','4','5','6','*','1','2','3','-','0',',','C','+'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === 'C') handleCalcClear();
                            else if (key === '/' || key === '*' || key === '-' || key === '+') handleCalcOperator(key);
                            else handleCalcDigit(key);
                          }}
                          className={`py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                            key === 'C'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : key === '/' || key === '*' || key === '-' || key === '+'
                                ? calcOperator === key
                                  ? 'bg-primary text-white ring-2 ring-primary/25 shadow-sm'
                                  : 'bg-primary-light text-primary hover:bg-primary/20'
                                : 'bg-bg text-text-primary hover:bg-border'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleCalcEquals}
                        className="py-2 text-sm font-bold rounded-lg cursor-pointer transition-colors bg-primary text-white hover:bg-primary-hover"
                      >
                        =
                      </button>
                      <button
                        type="button"
                        onClick={handleCalcApply}
                        className="col-span-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Usar resultado
                      </button>
                      {initialData && amountStr && (
                        <button
                          type="button"
                          onClick={handleCalcUseCurrentValue}
                          className="col-span-4 mt-0.5 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Puxar valor atual (R$ {amountStr})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Data Base</label>
              <input
                required
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full clay-input px-4 py-3 outline-none transition-all text-[0.95rem]"
              />
            </div>
          </div>

          {!initialData ? (
            <div className="space-y-2 pt-1">
              <label className="text-[0.68rem] font-bold text-[#9aa1ac] uppercase tracking-[0.06em]">Recorrência</label>
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
                    className={`py-2.5 px-3 text-sm font-bold cursor-pointer transition-colors rounded-xl ${
                      recurrenceConfig === opt.id
                        ? 'bg-[#1a1d21] text-white'
                        : 'bg-[#f6f7f9] text-[#9aa1ac] hover:text-[#1a1d21]'
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
                    className="w-full clay-input px-4 py-2.5 outline-none transition-all"
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    O valor total de R$ {amountStr || '0,00'} será dividido em {installmentsCount} vezes de R$ {(getNumericAmount() / installmentsCount).toFixed(2).replace('.', ',')}.
                  </p>
                </div>
              )}
              
               {recurrenceConfig === 'FIXED' && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs bg-[#f6f7f9] text-[#1a1d21] font-medium p-3 rounded-xl">
                    Um lançamento será criado para os próximos meses.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasEndDate}
                      onChange={(e) => setHasEndDate(e.target.checked)}
                      className="rounded accent-[#1a1d21]"
                    />
                    <span className="text-xs text-[#5f6672] font-medium">Definir data fim</span>
                  </label>
                  {hasEndDate && (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full clay-input px-4 py-2.5 outline-none transition-all text-sm"
                      min={date}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            initialData.groupId && initialData.isFixed && (
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-3.5 bg-[#f6f7f9] rounded-xl transition-colors">
                  <input 
                    type="checkbox" 
                    checked={applyToFuture}
                    onChange={(e) => setApplyToFuture(e.target.checked)}
                    className="rounded accent-[#1a1d21]"
                  />
                  <span className="text-sm font-semibold text-[#1a1d21]">
                    Aplicar para as próximas recorrências.
                  </span>
                </label>
              </div>
            )
          )}

          {initialData && (
            <div className="text-xs text-gray-400 space-y-0.5 pt-2">
              {initialData.createdAt && <p>Criado em: {format(new Date(initialData.createdAt), "dd/MM/yyyy 'as' HH:mm")}</p>}
              {initialData.updatedAt && <p>Alterado em: {format(new Date(initialData.updatedAt), "dd/MM/yyyy 'as' HH:mm")}</p>}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 -mb-4 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-[#f3f4f2]">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1a1d21] hover:opacity-90 font-bold py-3.5 rounded-xl text-white text-[0.95rem] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-opacity"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
}
