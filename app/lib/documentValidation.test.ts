import { describe, expect, it } from 'vitest';
import {
  buildValidationUrl,
  isValidValidationCode,
  newValidationCode,
  normalizeValidationCode,
  VALIDATION_CODE_LENGTH,
} from './documentValidation';

describe('newValidationCode', () => {
  it('gera 5 caracteres do alfabeto sem ambíguos', () => {
    const code = newValidationCode(() => 0);
    expect(code).toHaveLength(VALIDATION_CODE_LENGTH);
    expect(code).toBe('AAAAA');
    expect(isValidValidationCode(code)).toBe(true);
  });

  it('respeita o índice do gerador injetado', () => {
    const picks = [1, 2, 3, 4, 5];
    expect(newValidationCode(() => picks.shift() ?? 0)).toBe('BCDEF');
  });

  it('não usa I, L, O, 0 nem 1', () => {
    const code = newValidationCode(() => 30);
    expect(code).toBe('99999');
    expect(isValidValidationCode(code)).toBe(true);
  });
});

describe('normalizeValidationCode', () => {
  it('remove espaços e sobe para maiúsculas', () => {
    expect(normalizeValidationCode(' 7k2f9 ')).toBe('7K2F9');
  });
});

describe('isValidValidationCode', () => {
  it('rejeita caracteres ambíguos e tamanho errado', () => {
    expect(isValidValidationCode('ABC0E')).toBe(false);
    expect(isValidValidationCode('ABCD')).toBe(false);
    expect(isValidValidationCode('abcde')).toBe(false);
  });
});

describe('buildValidationUrl', () => {
  it('monta a URL pública sem barra duplicada', () => {
    expect(buildValidationUrl('7k2f9', 'https://hub.geniusweb.online/'))
      .toBe('https://hub.geniusweb.online/validar/7K2F9');
  });
});
