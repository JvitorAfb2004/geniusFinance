import { describe, expect, it } from 'vitest';
import { buildMonthlyClosingEntries, getMonthlyClosingTransactions } from './monthlyClosingEntries';
import type { MonthlyClosing, Transaction } from '../types';

function tx(id: string, date: string, context: Transaction['context'] = 'BUSINESS'): Transaction {
  return {
    id,
    userId: 'u1',
    context,
    type: 'INCOME',
    title: id,
    amount: 100,
    date,
    status: 'PAID',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function closing(year: number, month: number): MonthlyClosing {
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    userId: 'u1',
    context: 'BUSINESS',
    year,
    month,
    status: 'CLOSED',
    totalIncome: 0,
    totalExpense: 0,
    totalCreditCard: 0,
    balance: 0,
    openingBalance: 0,
    closingBalance: 0,
    notes: '',
    closedBy: 'u1',
    closedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('buildMonthlyClosingEntries', () => {
  it('lists only months with transactions up to the current month', () => {
    const entries = buildMonthlyClosingEntries({
      transactions: [
        tx('jan', '2026-01-10'),
        tx('jul', '2026-07-01'),
        tx('aug', '2026-08-01'),
        tx('personal', '2026-06-01', 'PERSONAL'),
      ],
      monthlyClosings: [closing(2026, 5)],
      activeContext: 'BUSINESS',
      currentDate: new Date('2026-07-16T12:00:00.000Z'),
    });

    expect(entries.map((entry) => `${entry.year}-${entry.month}`)).toEqual([
      '2026-7',
      '2026-1',
    ]);
  });
});

describe('getMonthlyClosingTransactions', () => {
  it('returns active-context transactions for the selected month sorted by date', () => {
    const result = getMonthlyClosingTransactions({
      transactions: [
        tx('later', '2026-07-20'),
        tx('other-context', '2026-07-05', 'PERSONAL'),
        tx('earlier', '2026-07-01'),
        tx('other-month', '2026-06-30'),
      ],
      activeContext: 'BUSINESS',
      year: 2026,
      month: 7,
    });

    expect(result.map((item) => item.id)).toEqual(['earlier', 'later']);
  });
});
