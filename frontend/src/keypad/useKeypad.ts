import { useReducer } from 'react'
import { calculate } from '../api/calculatorApi'
import { describeError } from '../errorMessages'
import { OPERATIONS } from '../operations'
import type { Operation } from '../operations'
import { initialKeypadState, isReadyToEvaluate, keypadReducer } from './keypadReducer'
import type { KeypadAction } from './keypadReducer'

export type KeypadCommand =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'backspace' }
  | { type: 'negate' }
  | { type: 'clear' }
  | { type: 'operator'; operation: Operation }
  | { type: 'equals' }

export function useKeypad() {
  const [state, dispatch] = useReducer(keypadReducer, initialKeypadState)

  /** Runs a request against the API and reports the outcome to the reducer. */
  async function request(
    compute: () => Promise<number>,
    toAction: (result: number) => KeypadAction,
  ) {
    dispatch({ type: 'started' })
    try {
      dispatch(toAction(await compute()))
    } catch (error) {
      dispatch({ type: 'failed', message: describeError(error) })
    }
  }

  /** Sends the pending binary operation; `next` chains another operator after it. */
  function evaluate(next?: Operation) {
    const { operation, left } = state
    if (operation === null || left === null) {
      return
    }
    const right = Number(state.display)
    void request(
      () => calculate(operation, left, right),
      (result) => ({ type: 'resolved', result, next }),
    )
  }

  function execute(command: KeypadCommand) {
    if (state.busy) {
      return
    }

    switch (command.type) {
      case 'digit':
      case 'decimal':
      case 'backspace':
      case 'negate':
      case 'clear':
        dispatch(command)
        return

      case 'operator': {
        const { operation } = command
        if (OPERATIONS[operation].unary) {
          const value = Number(state.display)
          void request(
            () => calculate(operation, value),
            (result) => ({ type: 'unaryResolved', result }),
          )
        } else if (isReadyToEvaluate(state)) {
          evaluate(operation)
        } else {
          dispatch(command)
        }
        return
      }

      case 'equals':
        if (isReadyToEvaluate(state)) {
          evaluate()
        }
        return
    }
  }

  return { state, execute }
}