import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { TransactionType, TransactionStatus, Transaction, DRESection } from '../types';
import { format } from 'date-fns';
import { SECTION_LABELS } from '../lib/categories';
import { X, Search, Plus, ArrowUpCircle, ArrowDownCircle, CreditCard, CheckCircle, Clock, Check, Calculator } from 'lucide-react';
import { motion } from 'motion/react';

export function TransactionModal({ 
  onClose, 
  initialData 
}: { 
  onClose: () => void;
  initialData?: Transaction;
}) {
  const { addTransaction, updateTransaction, activeContext, categories, addCategory, selectedMonth, tags, activeScope, transactions } = useFinance();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [amountStr, setAmountStr] = useState(() => {
    if (initialData && initialData.amount) {
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(initialData.amount);
    }
    return '';
  });
  const [date, setDate] = useState(() => {
    if (initialData) return initialData.date;
    return format(selectedMonth, 'yyyy-MM-dd');
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

  const [recurrenceConfig, setRecurrenceConfig] = useState<'ONE_TIME' | 'FIXED' | 'INSTALLMENTS'>('ONE_TIME');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [hasEndDate, setHasEndDate] = useState(!!initialData?.endDate);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialData?.tagIds || []);
  const [applyToFuture, setApplyToFuture] = useState(false);

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFirstOperand, setCalcFirstOperand] = useState<number | null>(null);
  const [calcOperator, setCalcOperator] = useState<string | null>(null);
  const [calcWaitingForSecond, setCalcWaitingForSecond] = useState(false);

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
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (calculatorRef.current && !calculatorRef.current.contains(e.target as Node)) {
        setShowCalculator(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (calcWaitingForSecond) {
      setCalcDisplay(digit);
      setCalcWaitingForSecond(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
    }
  };

  const handleCalcOperator = (op: string) => {
    const current = parseFloat(calcDisplay.replace(',', '.'));
    if (calcFirstOperand === null) {
      setCalcFirstOperand(current);
    } else if (calcOperator && !calcWaitingForSecond) {
      const result = computeResult(calcFirstOperand, current, calcOperator);
      setCalcFirstOperand(result);
      setCalcDisplay(String(result).replace('.', ','));
    }
    setCalcOperator(op);
    setCalcWaitingForSecond(true);
  };

  const computeResult = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleCalcEquals = () => {
    if (calcFirstOperand === null || !calcOperator) return;
    const current = parseFloat(calcDisplay.replace(',', '.'));
    const result = computeResult(calcFirstOperand, current, calcOperator);
    setCalcDisplay(String(result).replace('.', ','));
    setCalcFirstOperand(null);
    setCalcOperator(null);
    setCalcWaitingForSecond(false);
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcFirstOperand(null);
    setCalcOperator(null);
    setCalcWaitingForSecond(false);
  };

  const handleCalcApply = () => {
    const val = parseFloat(calcDisplay.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
      setAmountStr(formatted);
    }
    setShowCalculator(false);
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
      const baseTx: Record<string, unknown> = {
        title: title.trim(),
        amount: val,
        date,
        type,
        status,
        context: activeContext,
      };
      if (categoryId) baseTx.categoryId = categoryId;
      if (hasEndDate && endDate) baseTx.endDate = endDate;
      if (selectedTagIds.length > 0) baseTx.tagIds = selectedTagIds;

      if (initialData) {
        await updateTransaction(initialData.id, baseTx, applyToFuture);
      } else {
        if (recurrenceConfig === 'ONE_TIME') {
          await addTransaction(baseTx);
        } else if (recurrenceConfig === 'FIXED') {
          await addTransaction(baseTx, 'FIXED');
        } else if (recurrenceConfig === 'INSTALLMENTS') {
          await addTransaction(baseTx, 'INSTALLMENTS', installmentsCount);
        }
      }

      setShowSuccess(true);
      setTimeout(() => onClose(), 800);
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
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold font-sans text-text-primary">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {initialData ? 'Atualize os dados do lançamento' : 'Registre uma nova movimentação financeira'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg transition-colors cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="border-b border-border mx-6" />

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'INCOME', label: 'Entrada', icon: ArrowUpCircle, activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                { id: 'EXPENSE', label: 'Saída', icon: ArrowDownCircle, activeClass: 'border-red-400 bg-red-50 text-red-700' },
                { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard, activeClass: 'border-purple-400 bg-purple-50 text-purple-700' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id as TransactionType)}
                  className={`py-2.5 px-3 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center gap-1 ${
                    type === opt.id
                      ? opt.activeClass
                      : 'border-border text-text-secondary hover:bg-bg bg-surface'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PAID', label: 'Pago / Recebido', icon: CheckCircle, activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                { id: 'PENDING', label: 'Pendente', icon: Clock, activeClass: 'border-amber-400 bg-amber-50 text-amber-700' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id as TransactionStatus)}
                  className={`py-2.5 px-3 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    status === opt.id
                      ? opt.activeClass
                      : 'border-border text-text-secondary hover:bg-bg bg-surface'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1.5" ref={categoryDropdownRef}>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Categoria (DRE)</label>
              <div className="relative">
                <div className="flex items-center border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all bg-surface">
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
                  <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {/* New category button */}
                    {!showNewCategory ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(true)}
                        className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100 cursor-pointer font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Nova categoria
                      </button>
                    ) : (
                      <div className="p-3 border-b border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nome da categoria"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-400"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowNewCategory(false); }}
                          />
                          <select
                            value={newCategorySection}
                            onChange={(e) => setNewCategorySection(e.target.value as DRESection)}
                            className="px-2 py-1.5 border border-gray-300 rounded text-xs outline-none"
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
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                          >
                            Adicionar
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewCategory(false)}
                            className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 cursor-pointer"
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
                        className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left border-b border-gray-100 cursor-pointer"
                      >
                        Limpar seleção
                      </button>
                    )}

                    {groupedCategories.map((group) =>
                      group.items.length > 0 ? (
                        <div key={group.section}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase bg-gray-50">
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
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 cursor-pointer transition-colors ${
                                categoryId === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
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
                      <div className="px-3 py-3 text-sm text-gray-400 text-center">
                        Nenhuma categoria encontrada.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!categoryId && suggestedCategoryId && suggestedCategoryName && (
            <div className="-mt-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-blue-700">
                Sugestão pela descrição: <strong>{suggestedCategoryName}</strong>
              </p>
              <button
                type="button"
                onClick={() => setCategoryId(suggestedCategoryId)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          )}

          {tags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Tags</label>
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
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Descrição</label>
            <input
              required
              type="text"
              placeholder="Ex: Salário, Aluguel, Supermercado..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-text-muted bg-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Valor (R$)</label>
              <div className="relative flex gap-1">
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-text-muted bg-surface"
                />
                <button
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
                    showCalculator ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:text-text-primary hover:bg-bg'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                </button>

                {showCalculator && (
                  <div ref={calculatorRef} className="absolute top-full mt-1 right-0 z-30 bg-surface border border-border rounded-xl shadow-lg p-3 w-56">
                    <div className="bg-bg rounded-lg px-3 py-2 mb-2 text-right font-mono text-lg font-semibold text-text-primary min-h-[2.5rem] flex items-center justify-end overflow-hidden">
                      {calcDisplay}
                    </div>
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
                                ? 'bg-primary-light text-primary hover:bg-primary/20'
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
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Data Base</label>
              <input
                required
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface transition-all"
              />
            </div>
          </div>

          {!initialData ? (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recorrência</label>
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
                    className={`py-2.5 px-3 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all ${
                      recurrenceConfig === opt.id
                        ? 'border-primary bg-primary-light text-primary-dark'
                        : 'border-border text-text-secondary hover:bg-bg bg-surface'
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
                    className="w-full border border-border rounded-lg px-4 py-2.5 bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    O valor total de R$ {amountStr || '0,00'} será dividido em {installmentsCount} vezes de R$ {(getNumericAmount() / installmentsCount).toFixed(2).replace('.', ',')}.
                  </p>
                </div>
              )}
              
               {recurrenceConfig === 'FIXED' && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs bg-primary-light/50 text-primary-dark p-2.5 rounded-lg border border-primary/20">
                    Um lançamento será criado para os próximos meses.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasEndDate}
                      onChange={(e) => setHasEndDate(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">Definir data fim</span>
                  </label>
                  {hasEndDate && (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      min={date}
                    />
                  )}
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

          {initialData && (
            <div className="text-xs text-gray-400 space-y-0.5 pt-2">
              <p>Criado em: {format(new Date(initialData.createdAt), "dd/MM/yyyy 'as' HH:mm")}</p>
              <p>Alterado em: {format(new Date(initialData.updatedAt), "dd/MM/yyyy 'as' HH:mm")}</p>
            </div>
          )}

          <div className="pt-6 pb-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary disabled:opacity-60 disabled:cursor-not-allowed border-none text-surface font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-primary/20 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
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

          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-surface/90 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-lg"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}
