import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../api/calculatorApi'
import { deferred } from '../test/helpers'
import KeypadCalculator from './KeypadCalculator'

vi.mock('../api/calculatorApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/calculatorApi')>()
  return { ...actual, calculate: vi.fn() }
})

const calculateMock = vi.mocked(calculate)

function display(): HTMLElement {
  return screen.getByLabelText('Display')
}

async function expectDisplay(text: string) {
  await waitFor(() => expect(display().textContent).toBe(text))
}

/** Clicks keys by their accessible name, in order. */
async function press(user: UserEvent, ...names: string[]) {
  for (const name of names) {
    await user.click(screen.getByRole('button', { name }))
  }
}

beforeEach(() => {
  calculateMock.mockReset()
})

describe('KeypadCalculator', () => {
  describe('entering numbers', () => {
    it('starts at zero', () => {
      render(<KeypadCalculator />)

      expect(display().textContent).toBe('0')
    })

    it('types digits and decimals', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '1', '2', 'Decimal point', '5')

      expect(display().textContent).toBe('12.5')
    })

    it('edits with backspace, change sign and clear', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '1', '2', '3', 'Backspace')
      expect(display().textContent).toBe('12')

      await press(user, 'Change sign')
      expect(display().textContent).toBe('-12')

      await press(user, 'Clear')
      expect(display().textContent).toBe('0')
    })

    it('shrinks the font for long numbers', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await user.keyboard('12345678901')
      expect(display()).not.toHaveClass('display-long')

      await user.keyboard('2')
      expect(display()).toHaveClass('display-long')
    })
  })

  describe('operations', () => {
    it('sends a binary operation on equals and shows the result', async () => {
      calculateMock.mockResolvedValue(8)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', '3', 'Equals')

      await expectDisplay('8')
      expect(calculateMock).toHaveBeenCalledWith('add', 5, 3)
    })

    it('shows the pending operation above the display', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add')

      expect(screen.getByText('5 +')).toBeInTheDocument()
    })

    it('chains operations: a second operator evaluates the first', async () => {
      calculateMock.mockResolvedValueOnce(5).mockResolvedValueOnce(9)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '2', 'Add', '3', 'Add')

      await expectDisplay('5')
      expect(calculateMock).toHaveBeenNthCalledWith(1, 'add', 2, 3)
      expect(screen.getByText('5 +')).toBeInTheDocument()

      await press(user, '4', 'Equals')

      await expectDisplay('9')
      expect(calculateMock).toHaveBeenNthCalledWith(2, 'add', 5, 4)
    })

    it('swaps the operator when another one is pressed right away', async () => {
      calculateMock.mockResolvedValue(15)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', 'Multiply', '3', 'Equals')

      await expectDisplay('15')
      expect(calculateMock).toHaveBeenCalledTimes(1)
      expect(calculateMock).toHaveBeenCalledWith('multiply', 5, 3)
    })

    it('applies square root immediately', async () => {
      calculateMock.mockResolvedValue(3)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '9', 'Square root')

      await expectDisplay('3')
      expect(calculateMock).toHaveBeenCalledWith('sqrt', 9)
    })

    it('keeps a pending operation when square root is applied to the second operand', async () => {
      calculateMock.mockResolvedValueOnce(3).mockResolvedValueOnce(8)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', '9', 'Square root')
      await expectDisplay('3')

      await press(user, 'Equals')

      await expectDisplay('8')
      expect(calculateMock).toHaveBeenLastCalledWith('add', 5, 3)
    })

    it('computes percentages as "b percent of a"', async () => {
      calculateMock.mockResolvedValue(20)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '2', '0', '0', 'Percentage', '1', '0', 'Equals')

      await expectDisplay('20')
      expect(calculateMock).toHaveBeenCalledWith('percentage', 200, 10)
    })

    it('starts a new number after a result', async () => {
      calculateMock.mockResolvedValue(8)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', '3', 'Equals')
      await expectDisplay('8')

      await press(user, '2')

      expect(display().textContent).toBe('2')
    })

    it('does nothing on equals without a second operand', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Equals')
      expect(display().textContent).toBe('5')

      await press(user, 'Add', 'Equals')
      expect(display().textContent).toBe('5')

      expect(calculateMock).not.toHaveBeenCalled()
    })
  })

  describe('errors and loading', () => {
    it('shows a friendly error, resets, and clears the error on the next key', async () => {
      calculateMock.mockRejectedValue(new ApiError('division_by_zero', 'division by zero', 422))
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '1', '0', 'Divide', '0', 'Equals')

      expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.')
      expect(display().textContent).toBe('0')

      await press(user, '7')

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(display().textContent).toBe('7')
    })

    it('disables the keys and ignores the keyboard while a request is in flight', async () => {
      const pending = deferred<number>()
      calculateMock.mockReturnValue(pending.promise)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', '3', 'Equals')

      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
      await user.keyboard('9')
      expect(display().textContent).toBe('3')

      pending.resolve(8)

      await expectDisplay('8')
      expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()
    })
  })

  describe('physical keyboard', () => {
    it('types and evaluates with the keyboard', async () => {
      calculateMock.mockResolvedValue(42)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await user.keyboard('7*6{Enter}')

      await expectDisplay('42')
      expect(calculateMock).toHaveBeenCalledWith('multiply', 7, 6)
    })

    it('supports decimal point, backspace and escape', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await user.keyboard('1.25{Backspace}')
      expect(display().textContent).toBe('1.2')

      await user.keyboard('{Escape}')
      expect(display().textContent).toBe('0')
    })

    it('ignores shortcuts that use modifier keys', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await user.keyboard('5{Control>}c{/Control}')

      expect(display().textContent).toBe('5')
    })

    it('ignores keys without a meaning', async () => {
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await user.keyboard('a')

      expect(display().textContent).toBe('0')
    })

    it('does not trigger a focused button twice when Enter is pressed', async () => {
      calculateMock.mockResolvedValue(8)
      const user = userEvent.setup()
      render(<KeypadCalculator />)

      await press(user, '5', 'Add', '3')
      screen.getByRole('button', { name: 'Equals' }).focus()
      await user.keyboard('{Enter}')

      await expectDisplay('8')
      expect(calculateMock).toHaveBeenCalledTimes(1)
    })

    it('stops listening when it unmounts', () => {
      const remove = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<KeypadCalculator />)

      unmount()

      expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
      remove.mockRestore()
    })
  })
})