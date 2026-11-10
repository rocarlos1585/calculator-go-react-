# Calculator

A full-stack calculator: a React + TypeScript frontend that talks to a small Go REST API.

- **Backend**: Go, standard library only. Does all the arithmetic and validation.
- **Frontend**: React + TypeScript (Vite). Two views of the same calculator: a keypad and a form.

## Quick start

Requirements: Go 1.22+ and a current Node LTS (developed on Node 24).

```bash
# 1. Backend, on http://localhost:8080
cd backend
go run ./cmd/server

# 2. Frontend, on http://localhost:5173 (in another terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In development Vite proxies `/api` to the backend, so no CORS setup is needed. The backend port can be changed with the `PORT` environment variable.

On the keypad you can also type with your physical keyboard (`0-9 . + - * / ^ %`, `Enter`, `Backspace`, `Esc`).


## Run with Docker

```bash
docker build -t calculator .
docker run --rm -p 8080:8080 calculator
```

Open http://localhost:8080. A single container runs the Go server, which serves both the API and the built frontend (multi-stage build, minimal non-root image). Configuration through environment variables:

| variable     | default | meaning                                                          |
|--------------|---------|------------------------------------------------------------------|
| `PORT`       | `8080`  | port the server listens on                                       |
| `STATIC_DIR` | unset   | folder with the built frontend; when unset, only the API is served |

## API

### `POST /api/v1/calculate`

```json
{ "operation": "add", "a": 2, "b": 3 }
```

| operation    | needs  | result                          |
|--------------|--------|---------------------------------|
| `add`        | a, b   | a + b                           |
| `subtract`   | a, b   | a - b                           |
| `multiply`   | a, b   | a × b                           |
| `divide`     | a, b   | a ÷ b                           |
| `power`      | a, b   | a ^ b                           |
| `sqrt`       | a      | √a (`b` is ignored)             |
| `percentage` | a, b   | b percent of a (a × b / 100)    |

Examples:

```bash
curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","a":2,"b":3}'
# {"operation":"add","result":5}

curl -s -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"sqrt","a":9}'
# {"operation":"sqrt","result":3}

curl -s -i -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","a":10,"b":0}'
# HTTP/1.1 422 Unprocessable Entity
# {"error":{"code":"division_by_zero","message":"division by zero"}}
```

Errors always look like `{"error": {"code": "...", "message": "..."}}`:

| status | code                | when                                                      |
|--------|---------------------|-----------------------------------------------------------|
| 400    | `invalid_json`      | body is not valid JSON, has unknown fields or bad types   |
| 400    | `unknown_operation` | `operation` is missing or not supported                   |
| 400    | `missing_operand`   | `a` (or `b`, when the operation needs it) is missing      |
| 422    | `division_by_zero`  | dividing by zero                                          |
| 422    | `negative_sqrt`     | square root of a negative number                          |
| 422    | `invalid_result`    | result is not a finite number (overflow, `(-8)^0.5`...)   |
| 500    | `internal_error`    | unexpected failure                                        |

### `GET /health`

Returns `{"status":"ok"}`.

## Project structure

```
backend/
  cmd/server/            entry point (server, timeouts, graceful shutdown)
  internal/calculator/   pure arithmetic logic, no HTTP
  internal/api/          routes, validation, JSON, status codes
frontend/
  src/api/               API client
  src/keypad/            keypad state machine (reducer), hook, keyboard map
  src/components/        KeypadCalculator, FormCalculator, NumberField
```

## Tests and coverage

```bash
# Backend
cd backend
go test ./... -cover
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out   # HTML report

# Frontend
cd frontend
npm test
npm run coverage
```

Current coverage: backend `calculator` 100%, `api` 91.3% (the uncovered lines are defensive error branches); frontend 98%.

## Design decisions and assumptions

- **Standard library only (backend).** Go 1.22's `net/http` router handles methods and paths, so a framework adds nothing here.
- **Three layers.** `calculator` (pure functions) → `api` (validation, JSON, status codes) → `cmd/server` (wiring). The math is tested without a server.
- **One endpoint.** `POST /api/v1/calculate` with an `operation` field keeps validation and error handling in one place.
- **Error semantics.** `400` means a malformed request; `422` means a well-formed request that is mathematically impossible. Every error has a stable `code` that the UI maps to a friendly message.
- **`float64` arithmetic.** The API returns raw IEEE-754 results (`0.1 + 0.2` gives `0.30000000000000004`); the UI rounds to 12 significant digits for display. `NaN` and `Infinity` are rejected as `invalid_result`.
- **Percentage** means "b percent of a" (`200 % 10 = 20`).
- **Chained keypad operations** are evaluated left to right, like a pocket calculator: `2 + 3 × 4 = 20`, not 14.
- **Frontend state.** The keypad logic is a pure reducer (easy to test) and a hook performs the API calls. Both views share one API client and one list of operations.
- **Form inputs are text fields** with explicit validation instead of `type="number"`, which behaves inconsistently across browsers.
- **Accessibility.** Labeled fields, announced errors and results, visible focus, and light/dark themes.

## Known limitations

- No calculation history or persistence.
- Unknown paths and wrong HTTP methods return Go's default plain-text `404`/`405`, not the JSON error format.
- Switching between the keypad and the form resets the state of the view you leave.