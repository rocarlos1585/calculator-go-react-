package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func get(h http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestNewHandlerWithoutFrontend(t *testing.T) {
	h := newHandler("")

	if rec := get(h, "/health"); rec.Code != http.StatusOK {
		t.Errorf("GET /health = %d, want %d", rec.Code, http.StatusOK)
	}
	if rec := get(h, "/"); rec.Code != http.StatusNotFound {
		t.Errorf("GET / = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestNewHandlerWithFrontend(t *testing.T) {
	dir := t.TempDir()
	page := "<h1>calculator</h1>"
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte(page), 0o600); err != nil {
		t.Fatal(err)
	}
	h := newHandler(dir)

	t.Run("serves the frontend at the root", func(t *testing.T) {
		rec := get(h, "/")

		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "calculator") {
			t.Errorf("GET / = %d %q, want 200 with the page", rec.Code, rec.Body.String())
		}
	})

	t.Run("keeps serving the health check", func(t *testing.T) {
		if rec := get(h, "/health"); rec.Code != http.StatusOK {
			t.Errorf("GET /health = %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("keeps serving the API", func(t *testing.T) {
		body := strings.NewReader(`{"operation":"add","a":2,"b":3}`)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/calculate", body))

		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"result":5`) {
			t.Errorf("POST /api/v1/calculate = %d %q", rec.Code, rec.Body.String())
		}
	})

	t.Run("returns 404 for unknown files", func(t *testing.T) {
		if rec := get(h, "/nope.js"); rec.Code != http.StatusNotFound {
			t.Errorf("GET /nope.js = %d, want %d", rec.Code, http.StatusNotFound)
		}
	})
}
