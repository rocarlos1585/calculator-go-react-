import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './calculatorApi'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockFetch(result: Response | Error) {
  const fn =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result)
  vi.stubGlobal('fetch', fn)
  return fn
}

function sentBody(fetchMock: ReturnType<typeof mockFetch>): unknown {
  const init = fetchMock.mock.calls[0][1] as RequestInit
  return JSON.parse(init.body as string)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calculate', () => {
  it('posts the operation and returns the result', async () => {
    const fetchMock = mockFetch(json({ operation: 'add', result: 5 }))

    await expect(calculate('add', 2, 3)).resolves.toBe(5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calculate',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(sentBody(fetchMock)).toEqual({ operation: 'add', a: 2, b: 3 })
  })

  it('does not send b for unary operations', async () => {
    const fetchMock = mockFetch(json({ operation: 'sqrt', result: 3 }))

    await expect(calculate('sqrt', 9, 4)).resolves.toBe(3)

    expect(sentBody(fetchMock)).toEqual({ operation: 'sqrt', a: 9 })
  })

  it('throws an ApiError carrying the server error code', async () => {
    mockFetch(json({ error: { code: 'division_by_zero', message: 'division by zero' } }, 422))

    const promise = calculate('divide', 1, 0)

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({
      code: 'division_by_zero',
      message: 'division by zero',
      status: 422,
    })
  })

  it('falls back to a generic error when the error body is not recognised', async () => {
    mockFetch(new Response('Bad Gateway', { status: 502 }))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({
      code: 'http_error',
      status: 502,
    })
  })

  it('reports network failures', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'network_error' })
  })

  it('rejects successful responses without a numeric result', async () => {
    mockFetch(json({ nope: true }))

    await expect(calculate('add', 1, 2)).rejects.toMatchObject({ code: 'invalid_response' })
  })
})