import { describe, expect, it } from 'vitest'
import { ApiError } from './api/calculatorApi'
import { describeError } from './errorMessages'

describe('describeError', () => {
  it('uses a friendly message for known math errors', () => {
    const error = new ApiError('division_by_zero', 'division by zero', 422)
    expect(describeError(error)).toBe('Cannot divide by zero.')
  })

  it('falls back to the ApiError message for other codes', () => {
    const error = new ApiError('network_error', 'Could not reach the server.')
    expect(describeError(error)).toBe('Could not reach the server.')
  })

  it('hides details of unexpected errors', () => {
    expect(describeError(new Error('boom'))).toBe('Something went wrong. Please try again.')
  })
})