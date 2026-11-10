import { formatResult, parseOperand } from '../format'
import type { Operation } from '../operations'

const MAX_DIGITS = 15

export interface KeypadState {
  /** Text shown on the screen: the number being typed or the last result. */
  display: string
  /** First operand of the pending binary operation. */
  left: number | null
  /** Pending binary operation. */
  operation: Operation | null
  /** The next digit replaces the display instead of extending it. */
  fresh: boolean
  /** An operation is pending but its second operand has not been typed yet. */
  awaiting: boolean
  /** A request to the API is in flight. */
  busy: boolean
  error: string | null
}

export const initialKeypadState: KeypadState = {
  display: '0',
  left: null,
  operation: null,
  fresh: true,
  awaiting: false,
  busy: false,
  error: null,
}

export type KeypadAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'backspace' }
  | { type: 'negate' }
  | { type: 'clear' }
  | { type: 'operator'; operation: Operation }
  | { type: 'started' }
  | { type: 'resolved'; result: number; next?: Operation }
  | { type: 'unaryResolved'; result: number }
  | { type: 'failed'; message: string }

/** True when a binary operation has both operands and can be sent to the API. */
export function isReadyToEvaluate(state: KeypadState): boolean {
  return state.operation !== null && !state.awaiting
}

function countDigits(text: string): number {
  return text.replace(/\D/g, '').length
}

export function keypadReducer(state: KeypadState, action: KeypadAction): KeypadState {
  switch (action.type) {
    case 'digit': {
      if (!state.fresh && countDigits(state.display) >= MAX_DIGITS) {
        return state
      }
      const replace = state.fresh || state.display === '0'
      const display = replace ? action.digit : state.display + action.digit
      return { ...state, display, fresh: false, awaiting: false, error: null }
    }

    case 'decimal': {
      if (!state.fresh && state.display.includes('.')) {
        return state
      }
      const display = state.fresh ? '0.' : state.display + '.'
      return { ...state, display, fresh: false, awaiting: false, error: null }
    }

    case 'backspace': {
      if (state.fresh) {
        return state
      }
      const trimmed = state.display.slice(0, -1)
      const display = ['', '-', '-0'].includes(trimmed) ? '0' : trimmed
      return { ...state, display }
    }

    case 'negate': {
      if (state.awaiting || state.display === '0') {
        return state
      }
      const display = state.display.startsWith('-')
        ? state.display.slice(1)
        : `-${state.display}`
      return { ...state, display, error: null }
    }

    case 'clear':
      return initialKeypadState

    case 'operator': {
      // Changing your mind: "5 + ×" just swaps the pending operation.
      if (state.operation !== null && state.awaiting) {
        return { ...state, operation: action.operation, error: null }
      }
      // The caller must evaluate a ready operation first (see isReadyToEvaluate).
      const left = parseOperand(state.display)
      if (left === null) {
        return state
      }
      return { ...state, left, operation: action.operation, fresh: true, awaiting: true, error: null }
    }

    case 'started':
      return { ...state, busy: true }

    case 'resolved': {
      const display = formatResult(action.result)
      return {
        ...state,
        display,
        left: action.next ? Number(display) : null,
        operation: action.next ?? null,
        fresh: true,
        awaiting: action.next !== undefined,
        busy: false,
        error: null,
      }
    }

    case 'unaryResolved':
      return {
        ...state,
        display: formatResult(action.result),
        fresh: true,
        awaiting: false,
        busy: false,
        error: null,
      }

    case 'failed':
      return { ...initialKeypadState, error: action.message }
  }
}