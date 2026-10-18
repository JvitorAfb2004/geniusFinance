import { describe, expect, it } from 'vitest';
import { buildCashFlow, getCashEvents } from './cashFlow';

const REF = new Date('2026-10-15T12:00:00');

const base = { status: 'PENDING' as const, type: 'EXPENSE' as const };

describe('getCashEvents', () => {
  it('avulso pago antigo (sem pagamentos) cai na data do lançamento', () => {
    expect(getCashEvents({ ...base, date: '2026-03-10', amount: 300, status: 'PAID' })).toEqual([
      { date: '2026-03-10', value: 300 },
    ]);
  });
  it('cada pagamento cai na própria data (caixa parcial)', () => {
    expect(getCashEvents({ ...base, date: '2026-03-01', amount: 500, payments: [{ amount: 250, date: '2026-05-02' }] })).toEqual([
      { date: '2026-05-02', value: 250 },
    ]);
  });
  it('pendente sem pagamentos não gera caixa', () => {
    expect(getCashEvents({ ...base, date: '2026-03-10', amount: 100 })).toEqual([]);
  });
});

describe('buildCashFlow', () => {
  it('mensal: 12 buckets, agrupa por mês e calcula saldo', () => {
    const txs = [
      { ...base, type: 'INCOME' as const, date: '2026-03-10', amount: 1000, status: 'PAID' as const },
      { ...base, date: '2026-03-05', amount: 400, status: 'PAID' as const },
      { ...base, date: '2026-05-01', amount: 500, payments: [{ amount: 250, date: '2026-05-02' }] },
      { ...base, date: '2026-12-20', amount: 999, status: 'PAID' as const }, // fora da janela
    ];
    const buckets = buildCashFlow(txs, 'monthly', REF);
    expect(buckets).toHaveLength(12);
    expect(buckets.map((b) => parseFloat(b.start.slice(5, 7)))).toEqual([11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const march = buckets.find((b) => b.start === '2026-03-01')!;
    expect(march.inflow).toBe(1000);
    expect(march.outflow).toBe(400);
    expect(march.net).toBe(600);
    const may = buckets.find((b) => b.start === '2026-05-01')!;
    expect(may.outflow).toBe(250);
    expect(may.inflow).toBe(0);
  });

  it('diário: 30 buckets, evento fora da janela é ignorado', () => {
    const txs = [
      { ...base, date: '2026-10-14', amount: 50, status: 'PAID' as const },
      { ...base, date: '2026-09-01', amount: 80, status: 'PAID' as const }, // fora
    ];
    const buckets = buildCashFlow(txs, 'daily', REF);
    expect(buckets).toHaveLength(30);
    expect(buckets.reduce((sum, b) => sum + b.outflow, 0)).toBe(50);
  });

  it('saldo = entradas - saídas em toda a janela', () => {
    const txs = [
      { ...base, type: 'INCOME' as const, date: '2026-10-01', amount: 100, status: 'PAID' as const },
      { ...base, date: '2026-10-02', amount: 30, status: 'PAID' as const },
    ];
    const buckets = buildCashFlow(txs, 'monthly', REF);
    const net = buckets.reduce((sum, b) => sum + b.net, 0);
    expect(net).toBe(70);
  });
});
