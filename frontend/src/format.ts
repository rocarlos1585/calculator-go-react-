const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

/** Parses user input into a finite number, or returns null if it is not a valid number. */
export function parseOperand(raw: string): number | null {
  const text = raw.trim()
  if (!NUMBER_PATTERN.test(text)) {
    return null
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** Rounds away floating point noise (0.1 + 0.2) so results look the way people expect. */
export function formatResult(value: number): string {
  return String(Number(value.toPrecision(12)))
}