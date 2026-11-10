import type { Operation } from '../operations'
import type { KeypadCommand } from './useKeypad'

const OPERATOR_KEYS = new Map<string, Operation>([
  ['+', 'add'],
  ['-', 'subtract'],
  ['*', 'multiply'],
  ['/', 'divide'],
  ['^', 'power'],
  ['%', 'percentage'],
])

/** Translates a KeyboardEvent.key value into a keypad command, if it has one. */
export function commandForKey(key: string): KeypadCommand | null {
  if (/^\d$/.test(key)) {
    return { type: 'digit', digit: key }
  }

  const operation = OPERATOR_KEYS.get(key)
  if (operation !== undefined) {
    return { type: 'operator', operation }
  }

  switch (key) {
    case '.':
    case ',':
      return { type: 'decimal' }
    case 'Backspace':
      return { type: 'backspace' }
    case 'Escape':
    case 'c':
    case 'C':
      return { type: 'clear' }
    case 'Enter':
    case '=':
      return { type: 'equals' }
    default:
      return null
  }
}