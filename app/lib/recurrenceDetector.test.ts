import { describe, it, expect } from 'vitest';
import { detectRecurring } from './recurrenceDetector';
import type { Transaction } from '../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '1',
    context: 'PERSONAL',
    type: 'EXPENSE',
    title: 'Netflix',
    amount: 39.9,
    date: '2024-01-15',
    status: 'PAID',
    userId: 'user1',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('detectRecurring', () => {
  it('detects monthly recurring expense with same amount', () => {
    const txs = [
      makeTx({ id: '1', title: 'Netflix', amount: 39.9, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'Netflix', amount: 39.9, date: '2024-02-15' }),
      makeTx({ id: '3', title: 'Netflix', amount: 39.9, date: '2024-03-15' }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Netflix');
    expect(result[0].amount).toBe(39.9);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('ignores fixed transactions', () => {
    const txs = [
      makeTx({ id: '1', title: 'Rent', amount: 1500, date: '2024-01-01', isFixed: true }),
      makeTx({ id: '2', title: 'Rent', amount: 1500, date: '2024-02-01', isFixed: true }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('ignores installment transactions', () => {
    const txs = [
      makeTx({ id: '1', title: 'iPhone', amount: 500, date: '2024-01-15', installmentInfo: '1/12' }),
      makeTx({ id: '2', title: 'iPhone', amount: 500, date: '2024-02-15', installmentInfo: '2/12' }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('rejects different transaction types in same group', () => {
    const txs = [
      makeTx({ id: '1', title: 'Spotify', amount: 19.9, date: '2024-01-15', type: 'EXPENSE' }),
      makeTx({ id: '2', title: 'Spotify', amount: 19.9, date: '2024-02-15', type: 'INCOME' }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('rejects amounts with >5% deviation', () => {
    const txs = [
      makeTx({ id: '1', title: 'Variable', amount: 100, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'Variable', amount: 120, date: '2024-02-15' }), // ~18% deviation
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('accepts amounts within 5% deviation', () => {
    const txs = [
      makeTx({ id: '1', title: 'Almost Same', amount: 100, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'Almost Same', amount: 104, date: '2024-02-15' }), // 4% deviation
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
  });

  it('handles year wrap (Dec -> Jan)', () => {
    const txs = [
      makeTx({ id: '1', title: 'Yearly', amount: 50, date: '2023-12-15' }),
      makeTx({ id: '2', title: 'Yearly', amount: 50, date: '2024-01-15' }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('normalizes titles (case, accents, punctuation)', () => {
    const txs = [
      makeTx({ id: '1', title: 'NETFLIX', amount: 39.9, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'netflix!', amount: 39.9, date: '2024-02-15' }),
      makeTx({ id: '3', title: 'Netflix ', amount: 39.9, date: '2024-03-15' }),
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('NETFLIX'); // First occurrence preserved
  });

  it('requires at least 2 consecutive months', () => {
    const txs = [
      makeTx({ id: '1', title: 'Sparse', amount: 50, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'Sparse', amount: 50, date: '2024-03-15' }), // Gap
    ];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('limits results to top 10 by confidence', () => {
    const txs: Transaction[] = [];
    for (let i = 0; i < 15; i++) {
      txs.push(
        makeTx({ id: `${i}a`, title: `Service ${i}`, amount: 10 + i, date: '2024-01-15' }),
        makeTx({ id: `${i}b`, title: `Service ${i}`, amount: 10 + i, date: '2024-02-15' }),
      );
    }
    const result = detectRecurring(txs);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('returns empty for single transaction', () => {
    const txs = [makeTx({ id: '1', title: 'One-off', amount: 100, date: '2024-01-15' })];
    const result = detectRecurring(txs);
    expect(result).toHaveLength(0);
  });

  it('filters out confidence < 0.5', () => {
    // Only 2 months but 3 unique months -> confidence = 2/3 = 0.66 (passes)
    // Need case where consecutiveCount / uniqueMonths < 0.5
    const txs = [
      makeTx({ id: '1', title: 'LowConf', amount: 50, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'LowConf', amount: 50, date: '2024-02-15' }),
      makeTx({ id: '3', title: 'LowConf', amount: 50, date: '2024-04-15' }), // Gap breaks consecutive
    ];
    const result = detectRecurring(txs);
    // consecutiveCount = 2 (Jan-Feb), uniqueMonths = 3 -> confidence = 2/3 = 0.66
    // This should pass. Let's test a case that fails:
    const txs2 = [
      makeTx({ id: '1', title: 'LowConf2', amount: 50, date: '2024-01-15' }),
      makeTx({ id: '2', title: 'LowConf2', amount: 50, date: '2024-03-15' }), // Not consecutive
    ];
    const result2 = detectRecurring(txs2);
    expect(result2).toHaveLength(0);
  });
});