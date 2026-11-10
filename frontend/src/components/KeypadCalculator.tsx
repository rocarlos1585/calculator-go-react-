import { useEffect } from 'react'
import { formatResult } from '../format'
import { commandForKey } from '../keypad/keyboard'
import { useKeypad } from '../keypad/useKeypad'
import type { KeypadCommand } from '../keypad/useKeypad'
import { OPERATIONS } from '../operations'
import type { Operation } from '../operations'

interface KeyDef {
  label: string
  name: string
  command: KeypadCommand
  className: string
}

function digitKey(digit: string): KeyDef {
  return { label: digit, name: digit, command: { type: 'digit', digit }, className: 'key key-digit' }
}

function operatorKey(operation: Operation): KeyDef {
  const { symbol, label } = OPERATIONS[operation]
  return { label: symbol, name: label, command: { type: 'operator', operation }, className: 'key key-operator' }
}

const KEYS: KeyDef[] = [
  { label: 'C', name: 'Clear', command: { type: 'clear' }, className: 'key key-function' },
  { label: '⌫', name: 'Backspace', command: { type: 'backspace' }, className: 'key key-function' },
  { label: '±', name: 'Change sign', command: { type: 'negate' }, className: 'key key-function' },
  operatorKey('divide'),
  operatorKey('sqrt'),
  operatorKey('power'),
  operatorKey('percentage'),
  operatorKey('multiply'),
  digitKey('7'),
  digitKey('8'),
  digitKey('9'),
  operatorKey('subtract'),
  digitKey('4'),
  digitKey('5'),
  digitKey('6'),
  operatorKey('add'),
  digitKey('1'),
  digitKey('2'),
  digitKey('3'),
  { label: '=', name: 'Equals', command: { type: 'equals' }, className: 'key key-equals' },
  { ...digitKey('0'), className: 'key key-digit key-wide' },
  { label: '.', name: 'Decimal point', command: { type: 'decimal' }, className: 'key key-digit' },
]

export default function KeypadCalculator() {
  const { state, execute } = useKeypad()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      // A focused button already reacts to Enter/Space through its click.
      const onButton = event.target instanceof HTMLButtonElement
      if (onButton && (event.key === 'Enter' || event.key === ' ')) {
        return
      }

      const command = commandForKey(event.key)
      if (command === null) {
        return
      }
      event.preventDefault()
      execute(command)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [execute])

  const pending =
    state.operation !== null && state.left !== null
      ? `${formatResult(state.left)} ${OPERATIONS[state.operation].symbol}`
      : ''

  return (
    <div className="keypad-calculator">
      <div className="screen">
        <div className="expression" aria-hidden="true">
          {pending}
        </div>
        <output
          className={state.display.length > 11 ? 'display display-long' : 'display'}
          aria-label="Display"
        >
          {state.display}
        </output>
      </div>

      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="keys">
        {KEYS.map((key) => (
          <button
            key={key.name}
            type="button"
            className={key.className}
            aria-label={key.name}
            disabled={state.busy}
            onClick={() => execute(key.command)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  )
}