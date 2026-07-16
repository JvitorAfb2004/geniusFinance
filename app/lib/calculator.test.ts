import { describe, it, expect } from 'vitest';
import {
  createCalculatorState,
  inputCalculatorDigit,
  pressCalculatorOperator,
  pressCalculatorEquals,
  clearCalculator,
  backspaceCalculator,
  formatCalculatorValueForCurrency,
  computeCalculatorResult,
} from './calculator';
import type { CalculatorState, CalculatorOperator } from './calculator';

describe('calculator', () => {
  describe('createCalculatorState', () => {
    it('creates initial state with display 0', () => {
      const state = createCalculatorState();
      expect(state.display).toBe('0');
      expect(state.firstOperand).toBeNull();
      expect(state.operator).toBeNull();
      expect(state.waitingForSecond).toBe(false);
    });

    it('accepts custom initial display', () => {
      const state = createCalculatorState('123');
      expect(state.display).toBe('123');
    });
  });

  describe('inputCalculatorDigit', () => {
    it('replaces 0 with digit', () => {
      const state = createCalculatorState();
      const next = inputCalculatorDigit(state, '5');
      expect(next.display).toBe('5');
    });

    it('appends digits', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '2');
      state = inputCalculatorDigit(state, '3');
      expect(state.display).toBe('123');
    });

    it('handles decimal comma', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '.');
      state = inputCalculatorDigit(state, '5');
      expect(state.display).toBe('1,5');
    });

    it('ignores second decimal comma', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '.');
      state = inputCalculatorDigit(state, '.');
      expect(state.display).toBe('1,');
    });

    it('starts new number after operator', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = pressCalculatorOperator(state, '+');
      state = inputCalculatorDigit(state, '2');
      expect(state.display).toBe('2');
      expect(state.waitingForSecond).toBe(false);
    });
  });

  describe('pressCalculatorOperator', () => {
    it('stores first operand and operator', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '+');
      expect(state.firstOperand).toBe(10);
      expect(state.operator).toBe('+');
      expect(state.waitingForSecond).toBe(true);
    });

    it('chains operations when pressing operator again', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '+');
      state = inputCalculatorDigit(state, '5');
      state = pressCalculatorOperator(state, '-');
      expect(state.display).toBe('15');
      expect(state.firstOperand).toBe(15);
      expect(state.operator).toBe('-');
    });

    it('replaces operator if waiting for second', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '+');
      state = pressCalculatorOperator(state, '-');
      expect(state.operator).toBe('-');
    });
  });

  describe('pressCalculatorEquals', () => {
    it('computes addition', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '+');
      state = inputCalculatorDigit(state, '5');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('15');
      expect(state.firstOperand).toBeNull();
      expect(state.operator).toBeNull();
    });

    it('computes subtraction', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '2');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '-');
      state = inputCalculatorDigit(state, '8');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('12');
    });

    it('computes multiplication', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '6');
      state = pressCalculatorOperator(state, '*');
      state = inputCalculatorDigit(state, '7');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('42');
    });

    it('computes division', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '/');
      state = inputCalculatorDigit(state, '2');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('5');
    });

    it('handles division by zero', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorOperator(state, '/');
      state = inputCalculatorDigit(state, '0');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('0');
    });

    it('handles decimal results', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = pressCalculatorOperator(state, '/');
      state = inputCalculatorDigit(state, '3');
      state = pressCalculatorEquals(state);
      expect(state.display).toBe('0,33333333');
    });

    it('does nothing if no operator', () => {
      const state = createCalculatorState('42');
      const result = pressCalculatorEquals(state);
      expect(result.display).toBe('42');
    });
  });

  describe('clearCalculator', () => {
    it('resets to initial state', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '2');
      state = pressCalculatorOperator(state, '+');
      state = inputCalculatorDigit(state, '3');
      state = clearCalculator();
      expect(state.display).toBe('0');
      expect(state.firstOperand).toBeNull();
      expect(state.operator).toBeNull();
      expect(state.waitingForSecond).toBe(false);
    });
  });

  describe('backspaceCalculator', () => {
    it('removes last digit', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = inputCalculatorDigit(state, '2');
      state = inputCalculatorDigit(state, '3');
      state = backspaceCalculator(state);
      expect(state.display).toBe('12');
    });

    it('returns to 0 when single digit', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '5');
      state = backspaceCalculator(state);
      expect(state.display).toBe('0');
    });

    it('resets waitingForSecond', () => {
      let state = createCalculatorState();
      state = inputCalculatorDigit(state, '1');
      state = pressCalculatorOperator(state, '+');
      state = inputCalculatorDigit(state, '2');
      state = backspaceCalculator(state);
      expect(state.display).toBe('0');
      expect(state.waitingForSecond).toBe(false);
    });
  });

  describe('formatCalculatorValueForCurrency', () => {
    it('formats positive number as BRL', () => {
      expect(formatCalculatorValueForCurrency('1234,56')).toBe('1.234,56');
    });

    it('formats integer as BRL with 2 decimals', () => {
      expect(formatCalculatorValueForCurrency('100')).toBe('100,00');
    });

    it('returns empty for zero', () => {
      expect(formatCalculatorValueForCurrency('0')).toBe('');
    });

    it('returns empty for negative', () => {
      expect(formatCalculatorValueForCurrency('-50')).toBe('');
    });

    it('returns empty for NaN', () => {
      expect(formatCalculatorValueForCurrency('abc')).toBe('');
    });
  });

  describe('computeCalculatorResult', () => {
    it('adds', () => expect(computeCalculatorResult(10, 5, '+')).toBe(15));
    it('subtracts', () => expect(computeCalculatorResult(10, 5, '-')).toBe(5));
    it('multiplies', () => expect(computeCalculatorResult(10, 5, '*')).toBe(50));
    it('divides', () => expect(computeCalculatorResult(10, 5, '/')).toBe(2));
    it('returns 0 for division by zero', () => expect(computeCalculatorResult(10, 0, '/')).toBe(0));
  });
});