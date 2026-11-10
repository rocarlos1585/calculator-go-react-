interface NumberFieldProps {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    error: string | undefined
  }
  
  export default function NumberField({ id, label, value, onChange, error }: NumberFieldProps) {
    const errorId = `${id}-error`
  
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }