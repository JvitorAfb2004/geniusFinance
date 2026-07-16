import assert from 'node:assert/strict';
import {
  createCalculatorState,
  inputCalculatorDigit,
  pressCalculatorOperator,
  pressCalculatorEquals,
  backspaceCalculator,
  formatCalculatorValueForCurrency,
} from '../app/lib/calculator';

let state = createCalculatorState();
state = inputCalculatorDigit(state, '1');
state = inputCalculatorDigit(state, '2');
state = inputCalculatorDigit(state, ',');
state = inputCalculatorDigit(state, '3');
assert.equal(state.display, '12,3');

state = pressCalculatorOperator(state, '+');
assert.equal(state.operator, '+');
assert.equal(state.waitingForSecond, true);
state = inputCalculatorDigit(state, '7');
assert.equal(state.display, '7');
state = pressCalculatorEquals(state);
assert.equal(state.display, '19,3');
assert.equal(state.operator, null);

state = createCalculatorState('10');
state = pressCalculatorOperator(state, '*');
state = inputCalculatorDigit(state, '2');
state = pressCalculatorOperator(state, '-');
assert.equal(state.display, '20');
assert.equal(state.operator, '-');
state = inputCalculatorDigit(state, '5');
state = pressCalculatorEquals(state);
assert.equal(state.display, '15');

state = createCalculatorState('123');
state = backspaceCalculator(state);
assert.equal(state.display, '12');
state = backspaceCalculator(createCalculatorState('1'));
assert.equal(state.display, '0');

assert.equal(formatCalculatorValueForCurrency('1234,5'), '1.234,50');
console.log('calculator tests passed');
