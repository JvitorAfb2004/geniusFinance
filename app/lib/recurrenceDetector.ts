import type { Transaction } from '../types';
import { addMonths, format, parseISO } from 'date-fns';

interface RecurrenceSuggestion {
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
  months: string[];
  confidence: number;
}

export function detectRecurring(transactions: Transaction[]): RecurrenceSuggestion[] {
  // Filter non-fixed, non-installment transactions
  const regular = transactions.filter((t) => !t.isFixed && !t.installmentInfo);

  // Group by normalized title
  const groups = new Map<string, Transaction[]>();
  for (const tx of regular) {
    const key = normalize(tx.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const suggestions: RecurrenceSuggestion[] = [];

  for (const [, txs] of groups) {
    if (txs.length < 2) continue;

    // Sort by date
    txs.sort((a, b) => a.date.localeCompare(b.date));

    // Check if same type and similar amounts
    const types = new Set(txs.map((t) => t.type));
    if (types.size > 1) continue;

    const amounts = txs.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmount) / (avgAmount || 1)));
    if (maxDev > 0.05) continue; // More than 5% deviation = probably not recurring

    // Check if they appear in consecutive or near-consecutive months (year-aware)
    const monthKeys = txs.map((t) => {
      const d = parseISO(t.date);
      return d.getFullYear() * 12 + d.getMonth();
    });
    const uniqueMonthKeys = [...new Set(monthKeys)].sort((a, b) => a - b);
    const consecutiveCount = countConsecutive(uniqueMonthKeys);
    const confidence = Math.min(consecutiveCount / Math.max(uniqueMonthKeys.length, 3), 1);

    if (consecutiveCount >= 2) {
      suggestions.push({
        title: txs[0].title,
        amount: Math.round(avgAmount * 100) / 100,
        type: txs[0].type,
        months: txs.map((t) => t.date),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  return suggestions.filter((s) => s.confidence >= 0.5).sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

function normalize(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countConsecutive(months: number[]): number {
  if (months.length <= 1) return months.length;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < months.length; i++) {
    const diff = months[i] - months[i - 1];
    if (diff === 1 || diff === -11) { // Consecutive or year wrap (Dec->Jan)
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  return maxRun;
}
