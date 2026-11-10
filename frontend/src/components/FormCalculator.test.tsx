import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../api/calculatorApi'
import FormCalculator from './FormCalculator'

vi.mock('../api/calculatorApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/calculatorApi')>()
  return { ...actual, calculate: vi.fn() }
})

const calculateMock = vi.mocked(calculate)

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function fillAndSubmit(user: UserEvent, a: string, b: string) {
  if (a) await user.type(screen.getByLabelText('First number'), a)
  if (b) await user.type(screen.getByLabelText('Second number'), b)
  await user.click(screen.getByRole('button', { name: 'Calculate' }))
}

beforeEach(() => {
  calculateMock.mockReset()
})

describe('FormCalculator', () => {
  it('renders the operation selector, both operands and the submit button', () => {
    render(<FormCalculator />)

    expect(screen.getByRole('combobox', { name: 'Operation' })).toBeInTheDocument()
    expect(screen.getByLabelText('First number')).toBeInTheDocument()
    expect(screen.getByLabelText('Second number')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeEnabled()
  })

  it('sends the operands to the API and shows the result', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, '2', '3')

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(calculateMock).toHaveBeenCalledWith('add', 2, 3)
  })

  it('rounds floating point noise before displaying the result', async () => {
    calculateMock.mockResolvedValue(0.1 + 0.2)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, '0.1', '0.2')

    expect(await screen.findByText('0.3')).toBeInTheDocument()
  })

  it('uses the selected operation', async () => {
    calculateMock.mockResolvedValue(6)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'multiply')
    await fillAndSubmit(user, '2', '3')

    await screen.findByText('6')
    expect(calculateMock).toHaveBeenCalledWith('multiply', 2, 3)
  })

  it('hides the second operand for unary operations', async () => {
    calculateMock.mockResolvedValue(3)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'sqrt')

    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Number'), '9')
    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    await screen.findByText('3')
    expect(calculateMock).toHaveBeenCalledWith('sqrt', 9, undefined)
  })

  it('explains what percentage computes', async () => {
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'percentage')

    expect(screen.getByText(/percentage of the first/i)).toBeInTheDocument()
  })

  it('validates both operands before calling the API', async () => {
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.click(screen.getByRole('button', { name: 'Calculate' }))

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('flags only the operand that is invalid', async () => {
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, 'abc', '3')

    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Second number')).not.toHaveAttribute('aria-invalid')
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('clears validation errors once the input is fixed', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.click(screen.getByRole('button', { name: 'Calculate' }))
    expect(screen.getAllByRole('alert')).toHaveLength(2)

    await fillAndSubmit(user, '2', '3')

    await screen.findByText('5')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a friendly message when the API rejects the operation', async () => {
    calculateMock.mockRejectedValue(new ApiError('division_by_zero', 'division by zero', 422))
    const user = userEvent.setup()
    render(<FormCalculator />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'divide')
    await fillAndSubmit(user, '10', '0')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.')
  })

  it('shows a generic message for unexpected failures', async () => {
    calculateMock.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, '1', '2')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('disables the button while the request is in flight', async () => {
    const pending = deferred<number>()
    calculateMock.mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, '2', '3')

    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled()

    pending.resolve(5)

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeEnabled()
  })

  it('clears the previous result when the operation changes', async () => {
    calculateMock.mockResolvedValue(5)
    const user = userEvent.setup()
    render(<FormCalculator />)

    await fillAndSubmit(user, '2', '3')
    await screen.findByText('5')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Operation' }), 'subtract')

    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })
})