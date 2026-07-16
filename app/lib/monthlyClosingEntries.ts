import type { ContextType, MonthlyClosing, Transaction } from '../types';

export interface MonthlyClosingEntry {
  year: number;
  month: number;
  closing?: MonthlyClosing;
}

export function buildMonthlyClosingEntries({
  transactions,
  monthlyClosings,
  activeContext,
  currentDate = new Date(),
}: {
  transactions: Transaction[];
  monthlyClosings: MonthlyClosing[];
  activeContext: ContextType;
  currentDate?: Date;
}): MonthlyClosingEntry[] {
  const currentKey = currentDate.getFullYear() * 100 + currentDate.getMonth() + 1;
  const months = new Set<string>();

  for (const tx of transactions) {
    if (tx.context !== activeContext) continue;
    const date = new Date(`${tx.date}T00:00:00`);
    const key = date.getFullYear() * 100 + date.getMonth() + 1;
    if (key <= currentKey) months.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
  }

  const closingMap = new Map(monthlyClosings.map((c) => [`${c.year}-${c.month}`, c]));

  return Array.from(months)
    .map((key) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month, closing: closingMap.get(key) };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);
}
