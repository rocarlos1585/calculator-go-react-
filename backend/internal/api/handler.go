package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"sezzle-calculator/backend/internal/calculator"
)

const maxBodyBytes = 1 << 20 // 1 MiB

type calculateRequest struct {
	Operation string   `json:"operation"`
	A         *float64 `json:"a"`
	B         *float64 `json:"b"`
}

type calculateResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewRouter registers the routes and returns the root handler.
func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("POST /api/v1/calculate", handleCalculate)
	return mux
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	var req calculateRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json",
			"body must be valid JSON with fields: operation, a, b")
		return
	}

	op := calculator.Operation(req.Operation)
	if !op.IsValid() {
		writeError(w, http.StatusBadRequest, "unknown_operation",
			"unknown operation: "+req.Operation)
		return
	}
	if req.A == nil {
		writeError(w, http.StatusBadRequest, "missing_operand", "field 'a' is required")
		return
	}
	if !op.IsUnary() && req.B == nil {
		writeError(w, http.StatusBadRequest, "missing_operand", "field 'b' is required")
		return
	}

	var b float64
	if req.B != nil {
		b = *req.B
	}

	result, err := calculator.Calculate(op, *req.A, b)
	if err != nil {
		status, code := classify(err)
		message := err.Error()
		if status == http.StatusInternalServerError {
			log.Printf("calculate failed: %v", err)
			message = "internal server error"
		}
		writeError(w, status, code, message)
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Operation: req.Operation, Result: result})
}

// classify maps domain errors to an HTTP status and a stable error code.
func classify(err error) (int, string) {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		return http.StatusUnprocessableEntity, "division_by_zero"
	case errors.Is(err, calculator.ErrNegativeSqrt):
		return http.StatusUnprocessableEntity, "negative_sqrt"
	case errors.Is(err, calculator.ErrInvalidResult):
		return http.StatusUnprocessableEntity, "invalid_result"
	case errors.Is(err, calculator.ErrUnknownOperation):
		return http.StatusBadRequest, "unknown_operation"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encoding response: %v", err)
	}
}
