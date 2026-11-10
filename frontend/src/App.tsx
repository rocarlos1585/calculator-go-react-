import { useState } from 'react'
import FormCalculator from './components/FormCalculator'
import KeypadCalculator from './components/KeypadCalculator'

type View = 'keypad' | 'form'

const VIEWS: { id: View; label: string }[] = [
  { id: 'keypad', label: 'Keypad' },
  { id: 'form', label: 'Form' },
]

export default function App() {
  const [view, setView] = useState<View>('keypad')

  return (
    <main>
      <h1>Calculator</h1>

      <div className="view-switch" role="group" aria-label="Calculator style">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'keypad' ? <KeypadCalculator /> : <FormCalculator />}
    </main>
  )
}