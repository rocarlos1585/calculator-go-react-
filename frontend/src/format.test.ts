import { describe, expect, it } from 'vitest'
import { formatResult, parseOperand } from './format'

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    ['-3.5', -3.5],
    ['+7', 7],
    ['.5', 0.5],
    ['3.', 3],
    ['1e3', 1000],
    ['  12  ', 12],
  ])('parses %j as %d', (input, expected) => {
    expect(parseOperand(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '1,5', '0x10', '1.2.3', '--1', 'Infinity', '1e999'])(
    'rejects %j',
    (input) => {
      expect(parseOperand(input)).toBeNull()
    },
  )
})

describe('formatResult', () => {
  it.each([
    [5, '5'],
    [2.5, '2.5'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333'],
    [1024, '1024'],
    [-0, '0'],
    [1e21, '1e+21'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })
})