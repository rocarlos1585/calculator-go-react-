import { OPERATIONS } from '../operations'
import type { Operation } from '../operations'

const ENDPOINT = '/api/v1/calculate'

/** Error returned by the API, or a client-side failure talking to it. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number | undefined

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readError(data: unknown, status: number): { code: string; message: string } {
  if (isRecord(data) && isRecord(data.error)) {
    const { code, message } = data.error
    if (typeof code === 'string' && typeof message === 'string') {
      return { code, message }
    }
  }
  return { code: 'http_error', message: `Request failed with status ${status}.` }
}

/**
 * Asks the backend to compute `operation` on the given operands.
 * Resolves with the numeric result or rejects with an ApiError.
 */
export async function calculate(operation: Operation, a: number, b?: number): Promise<number> {
  const payload = { operation, a, b: OPERATIONS[operation].unary ? undefined : b }

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ApiError('network_error', 'Could not reach the server. Please try again.')
  }

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const { code, message } = readError(data, response.status)
    throw new ApiError(code, message, response.status)
  }
  if (isRecord(data) && typeof data.result === 'number') {
    return data.result
  }
  throw new ApiError('invalid_response', 'Unexpected response from the server.', response.status)
}