package api

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// do sends a request through the real router and returns the recorded response.
func do(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	NewRouter().ServeHTTP(rec, req)
	return rec
}

func TestHealth(t *testing.T) {
	rec := do(t, http.MethodGet, "/health", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	var got map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if got["status"] != "ok" {
		t.Errorf("status field = %q, want %q", got["status"], "ok")
	}
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, 5},
		{"subtract", `{"operation":"subtract","a":5,"b":8}`, -3},
		{"multiply", `{"operation":"multiply","a":4,"b":2.5}`, 10},
		{"divide", `{"operation":"divide","a":10,"b":4}`, 2.5},
		{"power", `{"operation":"power","a":2,"b":10}`, 1024},
		{"sqrt ignores b", `{"operation":"sqrt","a":9}`, 3},
		{"percentage", `{"operation":"percentage","a":200,"b":10}`, 20},
		{"zero operands are valid", `{"operation":"add","a":0,"b":0}`, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, http.MethodPost, "/api/v1/calculate", tc.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}
			var resp calculateResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decoding response: %v", err)
			}
			if math.Abs(resp.Result-tc.want) > 1e-9 {
				t.Errorf("result = %v, want %v", resp.Result, tc.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"malformed json", `{"operation":`, http.StatusBadRequest, "invalid_json"},
		{"empty body", ``, http.StatusBadRequest, "invalid_json"},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, http.StatusBadRequest, "invalid_json"},
		{"operand wrong type", `{"operation":"add","a":"x","b":2}`, http.StatusBadRequest, "invalid_json"},
		{"number out of range", `{"operation":"add","a":1e999,"b":1}`, http.StatusBadRequest, "invalid_json"},
		{"unknown operation", `{"operation":"modulo","a":1,"b":2}`, http.StatusBadRequest, "unknown_operation"},
		{"missing operation", `{"a":1,"b":2}`, http.StatusBadRequest, "unknown_operation"},
		{"missing a", `{"operation":"add","b":2}`, http.StatusBadRequest, "missing_operand"},
		{"missing b", `{"operation":"add","a":2}`, http.StatusBadRequest, "missing_operand"},
		{"division by zero", `{"operation":"divide","a":10,"b":0}`, http.StatusUnprocessableEntity, "division_by_zero"},
		{"negative sqrt", `{"operation":"sqrt","a":-4}`, http.StatusUnprocessableEntity, "negative_sqrt"},
		{"overflow", `{"operation":"multiply","a":1e308,"b":10}`, http.StatusUnprocessableEntity, "invalid_result"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, http.MethodPost, "/api/v1/calculate", tc.body)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d; body: %s", rec.Code, tc.wantStatus, rec.Body)
			}
			var resp errorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decoding error response: %v", err)
			}
			if resp.Error.Code != tc.wantCode {
				t.Errorf("error code = %q, want %q", resp.Error.Code, tc.wantCode)
			}
			if resp.Error.Message == "" {
				t.Error("error message should not be empty")
			}
		})
	}
}

func TestRouting(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{"wrong method", http.MethodGet, "/api/v1/calculate", http.StatusMethodNotAllowed},
		{"unknown path", http.MethodPost, "/api/v1/nope", http.StatusNotFound},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, tc.method, tc.path, "")
			if rec.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
		})
	}
}

func TestClassifyUnexpectedError(t *testing.T) {
	status, code := classify(errors.New("boom"))

	if status != http.StatusInternalServerError || code != "internal_error" {
		t.Errorf("classify() = (%d, %q), want (500, \"internal_error\")", status, code)
	}
}
