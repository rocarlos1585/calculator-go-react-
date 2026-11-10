import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
  })

  it('starts on the keypad view', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Keypad', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Form', pressed: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Display')).toBeInTheDocument()
    expect(screen.queryByLabelText('First number')).not.toBeInTheDocument()
  })

  it('switches to the form view and back', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Form' }))

    expect(screen.getByRole('button', { name: 'Form', pressed: true })).toBeInTheDocument()
    expect(screen.getByLabelText('First number')).toBeInTheDocument()
    expect(screen.queryByLabelText('Display')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Keypad' }))

    expect(screen.getByLabelText('Display')).toBeInTheDocument()
    expect(screen.queryByLabelText('First number')).not.toBeInTheDocument()
  })
})