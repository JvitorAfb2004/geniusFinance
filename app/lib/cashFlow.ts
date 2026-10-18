import { addDays, addMonths, addWeeks, format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Fluxo de caixa por competição de caixa (regime de caixa):
 * conta quando o dinheiro REALMENTE se moveu.
 * - Lançamento com pagamentos registrados: cada pagamento cai na data do pagamento.
 * - Lançamento pago antigo (sem pagamentos): cai na data do lançamento.
 * Ex.: getCashEvents({ date: '2026-03-01', amount: 500, status: 'PENDING', payments: [{ amount: 250, date: '2026-05-02' }] })
 *   => [{ date: '2026-05-02', value: 250 }]
 */
export function getCashEvents(tx: {
  date: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  payments?: { amount: number; date: string }[];
}): { date: string; value: number }[] {
  if (tx.payments && tx.payments.length > 0) {
    return tx.payments.map((payment) => ({ date: payment.date, value: payment.amount }));
  }
  return tx.status === 'PAID' ? [{ date: tx.date, value: tx.amount }] : [];
}

export type CashFlowGranularity = 'daily' | 'weekly' | 'monthly';

export type CashFlowBucket = {
  /** Início do bucket (YYYY-MM-DD, inclusivo). */
  start: string;
  /** Fim do bucket (YYYY-MM-DD, inclusivo). */
  end: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
};

export type CashInput = {
  date: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  type: 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
  payments?: { amount: number; date: string }[];
};

const WINDOWS: Record<CashFlowGranularity, { count: number; buckets: number }> = {
  daily: { count: 1, buckets: 30 },
  weekly: { count: 7, buckets: 12 },
  monthly: { count: 30, buckets: 12 },
};

function bucketStart(granularity: CashFlowGranularity, index: number, reference: Date): Date {
  // index 0 = bucket mais antigo, "buckets-1" = período atual (contém a referência).
  const { count, buckets } = WINDOWS[granularity];
  const offset = index - (buckets - 1);
  const day = startOfDay(reference);
  if (granularity === 'daily') return addDays(day, count * offset);
  if (granularity === 'weekly') return startOfWeek(addDays(day, count * offset), { weekStartsOn: 0 });
  return startOfMonth(addMonths(day, offset));
}

function bucketLabel(granularity: CashFlowGranularity, start: Date): string {
  if (granularity === 'daily') return format(start, 'dd MMM', { locale: ptBR });
  if (granularity === 'weekly') return format(start, 'dd/MM', { locale: ptBR });
  return format(start, 'MMM/yy', { locale: ptBR });
}

const toKey = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Agrupa o caixa dos lançamentos em buckets (janela deslizante terminando na
 * data de referência). Diário: 30 dias; semanal: 12 semanas; mensal: 12 meses.
 * Fora da janela é ignorado.
 */
export function buildCashFlow(transactions: CashInput[], granularity: CashFlowGranularity, reference: Date): CashFlowBucket[] {
  const { count, buckets } = WINDOWS[granularity];
  const starts = Array.from({ length: buckets }, (_, index) => bucketStart(granularity, index, reference));
  const result: CashFlowBucket[] = starts.map((start, index) => {
    const nextStart = starts[index + 1] ?? addDays(start, count);
    const end = addDays(nextStart, -1);
    return { start: toKey(start), end: toKey(end), label: bucketLabel(granularity, start), inflow: 0, outflow: 0, net: 0 };
  });

  for (const tx of transactions) {
    for (const event of getCashEvents(tx)) {
      const bucket = result.find((b) => event.date >= b.start && event.date <= b.end);
      if (!bucket) continue;
      if (tx.type === 'INCOME') bucket.inflow += event.value;
      else bucket.outflow += event.value;
    }
  }

  for (const bucket of result) bucket.net = bucket.inflow - bucket.outflow;
  return result;
}

/** Rótulo do período em exibição, ex.: "16 set – 15 out"; "out/25 – out/26". */
export function cashWindowLabel(buckets: CashFlowBucket[], granularity: CashFlowGranularity): string {
  if (buckets.length === 0) return '';
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const parse = (key: string) => new Date(`${key}T12:00:00`);
  if (granularity === 'monthly') {
    return `${format(parse(first.start), 'MMM/yy', { locale: ptBR })} – ${format(parse(last.end), 'MMM/yy', { locale: ptBR })}`;
  }
  return `${format(parse(first.start), 'dd MMM', { locale: ptBR })} – ${format(parse(last.end), 'dd MMM yy', { locale: ptBR })}`;
}
