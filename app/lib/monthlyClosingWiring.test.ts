import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('monthly closing state wiring', () => {
  it('subscribes useFinance to monthly closings', () => {
    const source = readFileSync('app/hooks/useFinance.tsx', 'utf8');
    expect(source).toContain("useCollectionListener(user, activeScope, 'monthly-closings', setMonthlyClosings)");
  });
});
