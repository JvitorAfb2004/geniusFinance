import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('firestore monthly closing rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  it('allows monthly closings in personal and account scopes', () => {
    expect(rules).toContain('match /users/{userId}/monthly-closings/{closingId}');
    expect(rules).toContain('match /accounts/{accountId}/monthly-closings/{closingId}');
  });
});

describe('firestore document validation rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  it('expõe get público mas bloqueia list da coleção de validações', () => {
    expect(rules).toContain('match /document_validations/{code}');
    expect(rules).toContain('allow get: if true;');
    expect(rules).toContain('allow list: if false;');
  });

  it('aceita validationCode no documento gerado', () => {
    expect(rules).toContain('validationCode');
  });
});
