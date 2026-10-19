import { describe, expect, it } from 'vitest';
import { removeUndefinedFields } from './removeUndefinedFields';

describe('removeUndefinedFields', () => {
  it('remove campo opcional undefined mantendo os demais', () => {
    expect(removeUndefinedFields({ name: 'Contrato', description: undefined, body: '<p>x</p>' }))
      .toEqual({ name: 'Contrato', body: '<p>x</p>' });
  });

  it('mantém string vazia, null e false', () => {
    expect(removeUndefinedFields({ a: '', b: null, c: false })).toEqual({ a: '', b: null, c: false });
  });
});
