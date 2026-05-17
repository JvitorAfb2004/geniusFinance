import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { SpendingLimit, ContextType } from '../types';
import { SECTION_LABELS } from '../lib/categories';
import { X, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function SpendingLimitModal({
  onClose,
  initialData,
}: {
  onClose: () => void;
  initialData?: SpendingLimit;
}) {
  const { addSpendingLimit, updateSpendingLimit, deleteSpendingLimit, categories, activeScope } = useFinance();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(initialData?.name || '');
  const [amountStr, setAmountStr] = useState(() => {
    if (initialData?.limitAmount) {
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(initialData.limitAmount);
    }
    return '';
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialData?.categoryIds || []);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const context: ContextType = activeScope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS';

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const groupedCategories = useMemo(() => {
    const sections = ['RECEITA', 'CUSTOS', 'DESPESAS'] as const;
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Informe um nome para o limite.');
    if (selectedCategoryIds.length === 0) return alert('Selecione ao menos uma categoria.');
    const val = getNumericAmount();
    if (isNaN(val) || val <= 0) return alert('Valor inválido.');

    setSubmitting(true);
    try {
      if (initialData) {
        await updateSpendingLimit(initialData.id, { name: name.trim(), limitAmount: val, categoryIds: selectedCategoryIds });
      } else {
        await addSpendingLimit({ name: name.trim(), limitAmount: val, categoryIds: selectedCategoryIds, context });
      }
      onClose();
    } catch {
      // handled by handleFirestoreError
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (!confirm('Excluir este limite de gasto?')) return;
    setSubmitting(true);
    try {
      await deleteSpendingLimit(initialData.id);
      onClose();
    } catch {
      // handled by handleFirestoreError
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
        className="bg-surface rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold font-sans text-text-primary">
              {initialData ? 'Editar Limite' : 'Novo Limite de Gasto'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {initialData ? 'Atualize os dados do limite' : 'Defina um teto de gastos por categoria'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="border-b border-border mx-6" />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Nome do Limite</label>
            <input
              required
              type="text"
              placeholder="Ex: Alimentação, Lazer..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-text-muted bg-surface"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Valor Limite (R$)</label>
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={amountStr}
              onChange={handleAmountChange}
              className="w-full border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-text-muted bg-surface"
            />
          </div>

          <div className="space-y-1.5" ref={categoryDropdownRef}>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Categorias</label>
            <div className="relative">
              <div className="flex items-center border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all bg-surface">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar categorias..."
                  value={showCategoryDropdown ? categorySearch : ''}
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
              </div>

              {showCategoryDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {groupedCategories.map((group) =>
                    group.items.length > 0 ? (
                      <div key={group.section}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase bg-gray-50">
                          {group.label}
                        </div>
                        {group.items.map((cat) => {
                          const selected = selectedCategoryIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-2 ${
                                selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              <input type="checkbox" checked={selected} readOnly className="rounded" />
                              {cat.name}
                            </button>
                          );
                        })}
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

            {selectedCategoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedCategoryIds.map((id) => {
                  const cat = categories.find((c) => c.id === id);
                  if (!cat) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {cat.name}
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryIds((prev) => prev.filter((cid) => cid !== id))}
                        className="hover:text-blue-900 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-6 pb-2 flex gap-3">
            {initialData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-3.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition-all cursor-pointer"
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary disabled:opacity-60 disabled:cursor-not-allowed border-none text-surface font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-primary/20 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
