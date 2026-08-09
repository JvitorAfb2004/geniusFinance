import { describe, it, expect } from 'vitest';
import { pluggyTxToProvision, pluggyTypeToAppType, pluggyDateToLocalDate } from './pluggyMapping';

describe('pluggyTxToProvision', () => {
  it('maps CREDIT to INCOME with positive absolute amount', () => {
    const p = pluggyTxToProvision({ id: 't1', description: 'TED', amount: -1500, date: '2024-04-12T00:00:00.000Z', type: 'CREDIT' }, 'item1', 'acc1');
    expect(p).toMatchObject({ pluggyTransactionId: 't1', type: 'INCOME', amount: 1500, pluggyItemId: 'item1', pluggyAccountId: 'acc1' });
  });

  it('maps DEBIT to EXPENSE and keeps status', () => {
    const p = pluggyTxToProvision({ id: 't2', amount: 200, date: '2024-04-12T12:00:00.000Z', type: 'DEBIT', status: 'POSTED' }, 'item1', 'acc1');
    expect(p.type).toBe('EXPENSE');
    expect(p.amount).toBe(200);
    expect(p.status).toBe('POSTED');
  });

  it('defaults status to POSTED when missing', () => {
    const p = pluggyTxToProvision({ id: 't3', amount: 50, date: '2024-04-12T12:00:00.000Z', type: 'CREDIT' }, 'item1', 'acc1');
    expect(p.status).toBe('POSTED');
  });

  it('converts ISO UTC to BRT (UTC-3) YYYY-MM-DD', () => {
    expect(pluggyDateToLocalDate('2024-04-12T00:00:00.000Z')).toBe('2024-04-11');
    expect(pluggyDateToLocalDate('2024-04-12T12:00:00.000Z')).toBe('2024-04-12');
    expect(pluggyDateToLocalDate('garbage')).toBe('garbage');
  });

  it('pluggyTypeToAppType falls back to EXPENSE', () => {
    expect(pluggyTypeToAppType('CREDIT')).toBe('INCOME');
    expect(pluggyTypeToAppType('DEBIT')).toBe('EXPENSE');
    expect(pluggyTypeToAppType('X')).toBe('EXPENSE');
  });
});
