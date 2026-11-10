import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { calculate } from '../api/calculatorApi'
import { describeError } from '../errorMessages'
import { formatResult, parseOperand } from '../format'
import { OPERATION_LIST, OPERATIONS } from '../operations'
import type { Operation } from '../operations'
import NumberField from './NumberField'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: string }
  | { kind: 'error'; message: string }

interface FieldErrors {
  a?: string
  b?: string
}

const INVALID_NUMBER = 'Enter a valid number.'

export default function FormCalculator() {
  const [operation, setOperation] = useState<Operation>('add')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const id = useId()

  const unary = OPERATIONS[operation].unary

  function handleOperationChange(next: Operation) {
    setOperation(next)
    setFieldErrors({})
    setStatus({ kind: 'idle' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const valueA = parseOperand(a)
    const valueB = unary ? undefined : parseOperand(b)

    if (valueA === null || valueB === null) {
      setFieldErrors({
        a: valueA === null ? INVALID_NUMBER : undefined,
        b: valueB === null ? INVALID_NUMBER : undefined,
      })
      setStatus({ kind: 'idle' })
      return
    }

    setFieldErrors({})
    setStatus({ kind: 'loading' })
    try {
      const result = await calculate(operation, valueA, valueB)
      setStatus({ kind: 'success', result: formatResult(result) })
    } catch (error) {
      setStatus({ kind: 'error', message: describeError(error) })
    }
  }

  return (
    <form className="form-calculator" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-operation`}>Operation</label>
        <select
          id={`${id}-operation`}
          value={operation}
          onChange={(event) => handleOperationChange(event.target.value as Operation)}
        >
          {OPERATION_LIST.map((op) => (
            <option key={op} value={op}>
              {OPERATIONS[op].label} ({OPERATIONS[op].symbol})
            </option>
          ))}
        </select>
        {operation === 'percentage' && (
          <p className="hint">Computes the second number as a percentage of the first.</p>
        )}
      </div>

      <NumberField
        id={`${id}-a`}
        label={unary ? 'Number' : 'First number'}
        value={a}
        onChange={setA}
        error={fieldErrors.a}
      />
      {!unary && (
        <NumberField
          id={`${id}-b`}
          label="Second number"
          value={b}
          onChange={setB}
          error={fieldErrors.b}
        />
      )}

      <button type="submit" disabled={status.kind === 'loading'}>
        {status.kind === 'loading' ? 'Calculating…' : 'Calculate'}
      </button>

      <div className="result" aria-live="polite">
        {status.kind === 'success' && (
          <p>
            Result: <output>{status.result}</output>
          </p>
        )}
        {status.kind === 'error' && (
          <p className="error" role="alert">
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}