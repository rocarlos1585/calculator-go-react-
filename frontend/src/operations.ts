export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'

interface OperationInfo {
  label: string
  symbol: string
  /** Unary operations only use the first operand. */
  unary: boolean
}

export const OPERATIONS: Record<Operation, OperationInfo> = {
  add: { label: 'Add', symbol: '+', unary: false },
  subtract: { label: 'Subtract', symbol: '-', unary: false },
  multiply: { label: 'Multiply', symbol: '×', unary: false },
  divide: { label: 'Divide', symbol: '÷', unary: false },
  power: { label: 'Power', symbol: '^', unary: false },
  sqrt: { label: 'Square root', symbol: '√', unary: true },
  percentage: { label: 'Percentage', symbol: '%', unary: false },
}

export const OPERATION_LIST = Object.keys(OPERATIONS) as Operation[]