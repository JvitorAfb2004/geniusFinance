import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('firestore monthly closing rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  it('allows monthly closings in personal and account scopes', () => {
    expect(rules).toContain('match /users/{userId}/monthly-closings/{closingId}');
    expect(rules).toContain('match /accounts/{accountId}/monthly-closings/{closingId}');
  });
});
