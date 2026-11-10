import { describe, expect, it } from 'vitest'
import {
  initialKeypadState,
  isReadyToEvaluate,
  keypadReducer,
} from './keypadReducer'
import type { KeypadAction, KeypadState } from './keypadReducer'

function run(...actions: KeypadAction[]): KeypadState {
  return actions.reduce(keypadReducer, initialKeypadState)
}

/** Turns "12.5" into the key presses that would type it. */
function type(text: string): KeypadAction[] {
  return [...text].map(
    (char): KeypadAction =>
      char === '.' ? { type: 'decimal' } : { type: 'digit', digit: char },
  )
}

const add: KeypadAction = { type: 'operator', operation: 'add' }
const multiply: KeypadAction = { type: 'operator', operation: 'multiply' }

describe('entering numbers', () => {
  it('starts at zero', () => {
    expect(initialKeypadState.display).toBe('0')
  })

  it('builds a number digit by digit', () => {
    expect(run(...type('123')).display).toBe('123')
  })

  it('replaces a leading zero', () => {
    expect(run(...type('05')).display).toBe('5')
  })

  it('supports decimals', () => {
    expect(run(...type('1.5')).display).toBe('1.5')
  })

  it('starts a decimal with a leading zero', () => {
    expect(run(...type('.5')).display).toBe('0.5')
  })

  it('ignores a second decimal point', () => {
    expect(run(...type('1.5.2')).display).toBe('1.52')
  })

  it('limits the number of digits', () => {
    const state = run(...type('1234567890123456789'))
    expect(state.display).toBe('123456789012345')
  })

  it('does not count the sign or the point as digits', () => {
    const state = run(...type('1.2345678901234'), { type: 'negate' })
    expect(state.display).toBe('-1.2345678901234')
  })
})

describe('backspace', () => {
  it('removes the last character', () => {
    expect(run(...type('123'), { type: 'backspace' }).display).toBe('12')
  })

  it('falls back to zero when nothing is left', () => {
    expect(run(...type('7'), { type: 'backspace' }).display).toBe('0')
  })

  it('falls back to zero when only a sign would remain', () => {
    const state = run(...type('5'), { type: 'negate' }, { type: 'backspace' })
    expect(state.display).toBe('0')
  })

  it('does not edit a result', () => {
    const state = run(...type('5'), add, ...type('3'), { type: 'resolved', result: 8 })
    expect(keypadReducer(state, { type: 'backspace' }).display).toBe('8')
  })
})

describe('negate', () => {
  it('toggles the sign', () => {
    const negated = run(...type('5'), { type: 'negate' })
    expect(negated.display).toBe('-5')
    expect(keypadReducer(negated, { type: 'negate' }).display).toBe('5')
  })

  it('ignores zero', () => {
    expect(run({ type: 'negate' }).display).toBe('0')
  })

  it('ignores the key while waiting for the second operand', () => {
    const state = run(...type('5'), add, { type: 'negate' })
    expect(state.display).toBe('5')
  })
})

describe('clear', () => {
  it('resets everything, including errors', () => {
    const state = run(...type('5'), add, { type: 'failed', message: 'nope' }, { type: 'clear' })
    expect(state).toEqual(initialKeypadState)
  })
})

describe('operators', () => {
  it('stores the first operand and waits for the second', () => {
    const state = run(...type('5'), add)

    expect(state).toMatchObject({
      display: '5',
      left: 5,
      operation: 'add',
      fresh: true,
      awaiting: true,
    })
    expect(isReadyToEvaluate(state)).toBe(false)
  })

  it('is ready to evaluate once the second operand is typed', () => {
    const state = run(...type('5'), add, ...type('3'))

    expect(state).toMatchObject({ display: '3', left: 5, operation: 'add', awaiting: false })
    expect(isReadyToEvaluate(state)).toBe(true)
  })

  it('is not ready before any operator', () => {
    expect(isReadyToEvaluate(run(...type('5')))).toBe(false)
  })

  it('swaps the operation when another operator follows immediately', () => {
    const state = run(...type('5'), add, multiply)

    expect(state).toMatchObject({ left: 5, operation: 'multiply', awaiting: true })
  })

  it('can start from a decimal operand', () => {
    expect(run(...type('2.5'), add).left).toBe(2.5)
  })
})

describe('results', () => {
  it('shows the result and clears the pending operation', () => {
    const state = run(...type('5'), add, ...type('3'), { type: 'resolved', result: 8 })

    expect(state).toMatchObject({
      display: '8',
      left: null,
      operation: null,
      fresh: true,
      awaiting: false,
      busy: false,
    })
  })

  it('starts a new number when a digit follows a result', () => {
    const state = run(
      ...type('5'),
      add,
      ...type('3'),
      { type: 'resolved', result: 8 },
      ...type('2'),
    )

    expect(state.display).toBe('2')
  })

  it('uses the result as the first operand of the next operation', () => {
    const state = run(
      ...type('5'),
      add,
      ...type('3'),
      { type: 'resolved', result: 8 },
      multiply,
    )

    expect(state).toMatchObject({ left: 8, operation: 'multiply', awaiting: true })
  })

  it('chains operations when the result comes with a next operator', () => {
    const state = run(
      ...type('5'),
      add,
      ...type('3'),
      { type: 'resolved', result: 8, next: 'multiply' },
    )

    expect(state).toMatchObject({
      display: '8',
      left: 8,
      operation: 'multiply',
      fresh: true,
      awaiting: true,
    })
  })

  it('rounds floating point noise', () => {
    const state = run({ type: 'resolved', result: 0.1 + 0.2 })

    expect(state.display).toBe('0.3')
  })
})

describe('unary results', () => {
  it('replaces the display when nothing is pending', () => {
    const state = run(...type('9'), { type: 'unaryResolved', result: 3 })

    expect(state).toMatchObject({ display: '3', operation: null, fresh: true })
  })

  it('keeps a pending operation so it can still be evaluated', () => {
    const state = run(
      ...type('5'),
      add,
      ...type('9'),
      { type: 'unaryResolved', result: 3 },
    )

    expect(state).toMatchObject({ display: '3', left: 5, operation: 'add', awaiting: false })
    expect(isReadyToEvaluate(state)).toBe(true)
  })
})

describe('request lifecycle', () => {
  it('marks the calculator busy while a request is in flight', () => {
    expect(run({ type: 'started' }).busy).toBe(true)
  })

  it('stops being busy once the request resolves', () => {
    expect(run({ type: 'started' }, { type: 'resolved', result: 1 }).busy).toBe(false)
  })

  it('resets and keeps the message when a request fails', () => {
    const state = run(...type('5'), add, ...type('0'), { type: 'failed', message: 'Cannot divide by zero.' })

    expect(state).toEqual({ ...initialKeypadState, error: 'Cannot divide by zero.' })
  })

  it('clears the error as soon as the user types again', () => {
    const state = run({ type: 'failed', message: 'oops' }, ...type('7'))

    expect(state).toMatchObject({ display: '7', error: null })
  })
})