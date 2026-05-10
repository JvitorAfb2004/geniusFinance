import type { Transaction, Budget, Category, DRESection, DRERow } from '../types';
import { SECTION_LABELS } from './categories';

export function computeDRE(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
): { rows: DRERow[]; netProfit: number; netMargin: number } {
  const byCategoryId = new Map<string, { planned: number; actual: number }>();

  for (const cat of categories) {
    byCategoryId.set(cat.id, { planned: 0, actual: 0 });
  }

  for (const b of budgets) {
    const entry = byCategoryId.get(b.categoryId);
    if (entry) entry.planned += b.plannedAmount;
  }

  for (const tx of transactions) {
    if (!tx.categoryId) continue;
    const entry = byCategoryId.get(tx.categoryId);
    if (!entry) continue;
    const amount = tx.type === 'INCOME' ? tx.amount : -tx.amount;
    entry.actual += amount;
  }

  function sectionRows(section: DRESection): DRERow[] {
    const cats = categories
      .filter((c) => c.section === section)
      .sort((a, b) => a.order - b.order);

    const rows: DRERow[] = cats.map((cat) => {
      const v = byCategoryId.get(cat.id) || { planned: 0, actual: 0 };
      return {
        label: cat.name,
        section,
        indent: 1,
        isBold: false,
        isSubtotal: false,
        categoryId: cat.id,
        planned: v.planned,
        actual: v.actual,
        months: [],
      };
    });

    const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
    const totalActual = rows.reduce((s, r) => s + r.actual, 0);

    const prefix = section === 'RECEITA' ? '(=) ' : '(-) ';
    rows.push({
      label: `${prefix}${SECTION_LABELS[section]}`,
      section,
      indent: 0,
      isBold: true,
      isSubtotal: true,
      planned: totalPlanned,
      actual: totalActual,
      months: [],
    });

    return rows;
  }

  const receita = sectionRows('RECEITA');
  const custos = sectionRows('CUSTOS');
  const despesas = sectionRows('DESPESAS');

  const receitaLiq = receita[receita.length - 1];
  const custosTotal = custos[custos.length - 1];
  const despesasTotal = despesas[despesas.length - 1];

  const netProfit = receitaLiq.actual - custosTotal.actual - despesasTotal.actual;
  const netMargin = receitaLiq.actual !== 0 ? (netProfit / receitaLiq.actual) * 100 : 0;

  const totalRow: DRERow = {
    label: '(=) Lucro Liquido',
    section: 'TOTAL',
    indent: 0,
    isBold: true,
    isSubtotal: true,
    planned: receitaLiq.planned - custosTotal.planned - despesasTotal.planned,
    actual: netProfit,
    months: [],
  };

  const marginRow: DRERow = {
    label: 'Margem Liquida',
    section: 'TOTAL',
    indent: 0,
    isBold: false,
    isSubtotal: false,
    planned: 0,
    actual: netMargin,
    months: [],
  };

  return {
    rows: [...receita, ...custos, ...despesas, totalRow, marginRow],
    netProfit,
    netMargin,
  };
}

export function computeMonthlyDRE(
  transactionsByMonth: Map<string, Transaction[]>,
  budgetsByMonth: Map<string, Budget[]>,
  categories: Category[],
  months: { year: number; month: number }[],
): DRERow[] {
  const sectionTotals = new Map<string, { label: string; section: DRESection | 'TOTAL'; indent: number; isBold: boolean; isSubtotal: boolean; planned: number; actual: number; months: { planned: number; actual: number }[] }>();

  for (const cat of categories) {
    const emptyMonths = months.map(() => ({ planned: 0, actual: 0 }));
    sectionTotals.set(cat.id, {
      label: cat.name,
      section: cat.section,
      indent: 1,
      isBold: false,
      isSubtotal: false,
      planned: 0,
      actual: 0,
      months: emptyMonths,
    });
  }

  for (const m of months) {
    const idx = months.indexOf(m);
    const key = `${m.year}-${m.month}`;
    const txs = transactionsByMonth.get(key) || [];
    const buds = budgetsByMonth.get(key) || [];

    for (const cat of categories) {
      const entry = sectionTotals.get(cat.id)!;
      const budget = buds.filter((b) => b.categoryId === cat.id);
      entry.months[idx].planned = budget.reduce((s, b) => s + b.plannedAmount, 0);

      const relatedTxs = txs.filter((tx) => tx.categoryId === cat.id);
      entry.months[idx].actual = relatedTxs.reduce((s, tx) => {
        return s + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
      }, 0);
    }
  }

  for (const cat of categories) {
    const totals = sectionTotals.get(cat.id)!;
    totals.planned = totals.months.reduce((s, mth) => s + mth.planned, 0);
    totals.actual = totals.months.reduce((s, mth) => s + mth.actual, 0);
  }

  return Array.from(sectionTotals.values());
}
