import { describe, expect, it } from 'vitest'
import { commandForKey } from './keyboard'

describe('commandForKey', () => {
  it.each(['0', '5', '9'])('maps %s to a digit', (key) => {
    expect(commandForKey(key)).toEqual({ type: 'digit', digit: key })
  })

  it.each(['.', ','])('maps %j to the decimal point', (key) => {
    expect(commandForKey(key)).toEqual({ type: 'decimal' })
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
    ['%', 'percentage'],
  ])('maps %s to the %s operator', (key, operation) => {
    expect(commandForKey(key)).toEqual({ type: 'operator', operation })
  })

  it.each(['Enter', '='])('maps %s to equals', (key) => {
    expect(commandForKey(key)).toEqual({ type: 'equals' })
  })

  it.each(['Escape', 'c', 'C'])('maps %s to clear', (key) => {
    expect(commandForKey(key)).toEqual({ type: 'clear' })
  })

  it('maps Backspace to backspace', () => {
    expect(commandForKey('Backspace')).toEqual({ type: 'backspace' })
  })

  it.each(['a', 'Shift', 'Tab', ' ', '10', 'constructor'])('ignores %j', (key) => {
    expect(commandForKey(key)).toBeNull()
  })
})