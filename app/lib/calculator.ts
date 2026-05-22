export type CalculatorOperator = '+' | '-' | '*' | '/';

export interface CalculatorState {
  display: string;
  firstOperand: number | null;
  operator: CalculatorOperator | null;
  waitingForSecond: boolean;
}

export function createCalculatorState(display = '0'): CalculatorState {
  return {
    display,
    firstOperand: null,
    operator: null,
    waitingForSecond: false,
  };
}

function parseCalculatorDisplay(display: string) {
  return parseFloat(display.replace(',', '.'));
}

function formatCalculatorDisplay(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round((value + Number.EPSILON) * 100000000) / 100000000;
  return String(rounded).replace('.', ',');
}

export function computeCalculatorResult(a: number, b: number, operator: CalculatorOperator) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
  }
}

export function inputCalculatorDigit(state: CalculatorState, digit: string): CalculatorState {
  const normalizedDigit = digit === '.' ? ',' : digit;
  if (normalizedDigit === ',') {
    if (state.waitingForSecond) {
      return { ...state, display: '0,', waitingForSecond: false };
    }
    if (state.display.includes(',')) return state;
    return { ...state, display: `${state.display || '0'},` };
  }

  if (!/^\d$/.test(normalizedDigit)) return state;

  if (state.waitingForSecond) {
    return { ...state, display: normalizedDigit, waitingForSecond: false };
  }

  return {
    ...state,
    display: state.display === '0' ? normalizedDigit : `${state.display}${normalizedDigit}`,
  };
}

export function pressCalculatorOperator(state: CalculatorState, operator: CalculatorOperator): CalculatorState {
  const current = parseCalculatorDisplay(state.display);
  if (state.firstOperand === null) {
    return {
      ...state,
      firstOperand: Number.isNaN(current) ? 0 : current,
      operator,
      waitingForSecond: true,
    };
  }

  if (state.operator && !state.waitingForSecond) {
    const result = computeCalculatorResult(state.firstOperand, current, state.operator);
    return {
      display: formatCalculatorDisplay(result),
      firstOperand: result,
      operator,
      waitingForSecond: true,
    };
  }

  return { ...state, operator, waitingForSecond: true };
}

export function pressCalculatorEquals(state: CalculatorState): CalculatorState {
  if (state.firstOperand === null || !state.operator) return state;
  const current = parseCalculatorDisplay(state.display);
  const result = computeCalculatorResult(state.firstOperand, Number.isNaN(current) ? 0 : current, state.operator);
  return {
    display: formatCalculatorDisplay(result),
    firstOperand: null,
    operator: null,
    waitingForSecond: false,
  };
}

export function clearCalculator(): CalculatorState {
  return createCalculatorState();
}

export function backspaceCalculator(state: CalculatorState): CalculatorState {
  if (state.waitingForSecond) return { ...state, display: '0', waitingForSecond: false };
  if (state.display.length <= 1) return { ...state, display: '0' };
  return { ...state, display: state.display.slice(0, -1) };
}

export function formatCalculatorValueForCurrency(display: string) {
  const value = parseCalculatorDisplay(display);
  if (Number.isNaN(value) || value <= 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
