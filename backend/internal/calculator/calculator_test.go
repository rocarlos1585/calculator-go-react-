package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name    string
		op      Operation
		a, b    float64
		want    float64
		wantErr error
	}{
		{"add", Add, 2, 3, 5, nil},
		{"add floats", Add, 0.1, 0.2, 0.3, nil},
		{"subtract negative result", Subtract, 5, 8, -3, nil},
		{"multiply", Multiply, 4, 2.5, 10, nil},
		{"divide", Divide, 10, 4, 2.5, nil},
		{"divide by zero", Divide, 10, 0, 0, ErrDivisionByZero},
		{"power", Power, 2, 10, 1024, nil},
		{"power negative exponent", Power, 2, -1, 0.5, nil},
		{"power overflow", Power, 10, 1000, 0, ErrInvalidResult},
		{"power zero to negative", Power, 0, -1, 0, ErrInvalidResult},
		{"power negative base fractional exponent", Power, -8, 0.5, 0, ErrInvalidResult},
		{"multiply overflow", Multiply, 1e308, 10, 0, ErrInvalidResult},
		{"sqrt", Sqrt, 9, 0, 3, nil},
		{"sqrt negative", Sqrt, -1, 0, 0, ErrNegativeSqrt},
		{"percentage", Percentage, 200, 10, 20, nil},
		{"unknown operation", Operation("modulo"), 1, 2, 0, ErrUnknownOperation},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Calculate(tc.op, tc.a, tc.b)

			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Calculate(%q, %v, %v) error = %v, want %v", tc.op, tc.a, tc.b, err, tc.wantErr)
			}
			if err == nil && math.Abs(got-tc.want) > 1e-9 {
				t.Errorf("Calculate(%q, %v, %v) = %v, want %v", tc.op, tc.a, tc.b, got, tc.want)
			}
		})
	}
}

func TestOperationIsValid(t *testing.T) {
	valid := []Operation{Add, Subtract, Multiply, Divide, Power, Sqrt, Percentage}
	for _, op := range valid {
		if !op.IsValid() {
			t.Errorf("%q should be valid", op)
		}
	}

	invalid := []Operation{"", "modulo", "ADD"}
	for _, op := range invalid {
		if op.IsValid() {
			t.Errorf("%q should be invalid", op)
		}
	}
}

func TestOperationIsUnary(t *testing.T) {
	if !Sqrt.IsUnary() {
		t.Error("sqrt should be unary")
	}

	binary := []Operation{Add, Subtract, Multiply, Divide, Power, Percentage}
	for _, op := range binary {
		if op.IsUnary() {
			t.Errorf("%q should not be unary", op)
		}
	}
}
