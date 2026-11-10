import { ApiError } from './api/calculatorApi'

const FRIENDLY_MESSAGES: Record<string, string> = {
  division_by_zero: 'Cannot divide by zero.',
  negative_sqrt: 'Cannot take the square root of a negative number.',
  invalid_result: 'The result is too large or not a real number.',
}

/** Turns anything thrown while calling the API into a message fit for the UI. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return FRIENDLY_MESSAGES[error.code] ?? error.message
  }
  return 'Something went wrong. Please try again.'
}