package calculator

import (
	"errors"
	"fmt"
	"math"
)

// Operation identifies a supported calculator operation.
type Operation string

const (
	Add        Operation = "add"
	Subtract   Operation = "subtract"
	Multiply   Operation = "multiply"
	Divide     Operation = "divide"
	Power      Operation = "power"
	Sqrt       Operation = "sqrt"
	Percentage Operation = "percentage"
)

// Callers to tell why an operation failed.
var (
	ErrDivisionByZero   = errors.New("division by zero")
	ErrNegativeSqrt     = errors.New("square root of negative number")
	ErrUnknownOperation = errors.New("unknown operation")
	ErrInvalidResult    = errors.New("result is not a finit number")
)

// IsValid checks if the operation is supported.
func (o Operation) IsValid() bool {
	switch o {
	case Add, Subtract, Multiply, Divide, Power, Sqrt, Percentage:
		return true
	}
	return false
}

// IsUnary checks if the operation is unary.
func (o Operation) IsUnary() bool {
	return o == Sqrt
}

func Calculate(op Operation, a, b float64) (float64, error) {
	var result float64

	switch op {
	case Add:
		result = a + b
	case Subtract:
		result = a - b
	case Multiply:
		result = a * b
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		result = a / b
	case Power:
		result = math.Pow(a, b)
	case Sqrt:
		if a < 0 {
			return 0, ErrNegativeSqrt
		}
		result = math.Sqrt(a)
	case Percentage:
		result = a * b / 100
	default:
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, op)
	}

	//Overflows (1e308 * 10) or impossible roots (-8^0.5) yield Inf or NaN, instead of failing, and JSON cannot represent either.
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, ErrInvalidResult
	}
	return result, nil
}
