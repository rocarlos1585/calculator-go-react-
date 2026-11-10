# Backend Prompts

## 1.  Project skeleton and local git

> Set up the skeleton for a Go backend inside a monorepo (`backend/` and `frontend/`). Initialize git locally on `main` and do not push anywhere yet. Create the module `sezzle-calculator/backend` with `cmd/server`, `internal/calculator` and `internal/api`. Add a hello-world `main.go` to verify the toolchain, a root `.gitignore` covering Go and Node artifacts (coverage output, `node_modules`, `dist`), and make the first commit. Acceptance: `go run ./cmd/server` prints a message and `gofmt -l` prints nothing.

## 2. Calculator logic (`calculator` package)

> Implement `internal/calculator` as pure logic with no HTTP. Operations: add, subtract, multiply, divide, power, sqrt and percentage (defined as "b percent of a"). Use a typed `Operation`, sentinel errors wrapped with `%w` (division by zero, negative square root, unknown operation, non-finite result), and reject `NaN`/`Inf` results. Expose `IsValid` and `IsUnary` helpers for the API layer and a single entry point `Calculate(op, a, b) (float64, error)`. Acceptance: `go build ./...` and `go vet ./...` are clean.

## 3. Logic tests

> Write table-driven unit tests for `calculator`, including the helper methods. Cover the happy path, float comparison with a tolerance (`0.1 + 0.2`), and the edge cases: divide by zero, negative sqrt, overflow, `0^-1`, negative base with a fractional exponent, and an unknown operation. Use `errors.Is` for error assertions. Target 100% coverage and explain `t.Run`, `t.Fatalf` vs `t.Errorf` and the tolerance. Acceptance: `go test -cover ./...` reports 100% for the package.

## 4. HTTP layer (handlers)

> Build `internal/api` with only `net/http` (Go 1.22 method routing): `POST /api/v1/calculate` with `{operation, a, b}` and `GET /health`. Use pointer operands to tell "missing" from `0`, cap the body size, and reject unknown JSON fields. Validate in this order: JSON, operation, operands (`b` is optional for unary operations). Return errors as `{"error":{"code","message"}}` with stable codes: `400` for malformed requests, `422` for mathematically invalid ones, and `500` that hides internals and logs them. Keep the math out of this package. 

## 5. API tests

> Write handler tests with `httptest` that go through the real router. Cover a success case for every operation (including unary and zero operands), a table of error cases asserting both status and error code, `404`/`405` routing, and the classification of an unexpected error as `500`.

## 6. Server and manual verification

> Wire `cmd/server/main.go`: `PORT` env variable with `8080` as default, an `http.Server` with timeouts, and graceful shutdown on SIGINT/SIGTERM with a 10-second deadline, using a `run()` function that returns an error. Then give me `curl` commands for success, a unary operation, division by zero and a missing operand, with the expected outputs.

## 7. Closure and final verification

> Run the final backend checks: `gofmt`, `go vet`, `go test -cover ./...`, and generate an HTML coverage report. Lower the `go` directive in `go.mod` to 1.22 so reviewers don't need a very recent toolchain, and confirm the tests still pass. Then document the API (operations table, error table, `curl` examples) in the README.

## Verification prompt repeated at each step

> After each step I will run the commands you give me and paste the real output. Don't move to the next step until I confirm it builds, passes its tests and is formatted.





# Frontend prompts

## 1. Frontend project and tooling

> Create the frontend in `frontend/` with Vite, React and TypeScript. Add Vitest with jsdom and Testing Library (react, user-event, jest-dom), plus coverage with v8. Configure a dev proxy so `/api` goes to `http://localhost:8080` (no CORS setup needed). Add a test setup file that registers the jest-dom matchers and cleans up after each test, add `test`, `test:watch` and `coverage` scripts, and remove the template boilerplate. Acceptance: `npm run dev` serves a title, a `curl` to `/api/v1/calculate` through the dev server returns the backend response, and `npm run build` passes.

## 2. Shared operations and API client

> Create a single source of truth for the operations: an `Operation` union type plus label, symbol and unary flag in a `Record`, so a missing entry fails to compile. Then write a typed API client for `POST /api/v1/calculate` with an `ApiError` that carries the backend's stable `code` and the HTTP `status`. Treat the response as `unknown` and validate it. Handle network failures, non-JSON error bodies and malformed `200` responses with their own error codes, and never send `b` for unary operations. Respect the project's strict tsconfig (`verbatimModuleSyntax`, `erasableSyntaxOnly`). Write tests that stub `fetch` for: success, unary payload, API error, unrecognized error body, network failure and malformed success. Acceptance: lint, build and tests pass.

## 3. Utilities and form view

> Add display utilities: `parseOperand` (strict regex, finite numbers only, rejecting empty input, hex, commas, `Infinity` and `1e999`), `formatResult` (round to 12 significant digits to hide float noise) and `describeError` (map the backend error codes to friendly messages). Then build the form view: an operation select, one or two operand fields depending on the operation, its own validation (text inputs with `inputMode="decimal"` and `noValidate`), a discriminated-union status (idle/loading/success/error), a submit button disabled while loading, and accessible errors and results (labels, `aria-invalid`, `aria-describedby`, `role="alert"`, `aria-live`). Unit-test the utilities. Acceptance: manual checks for `2+3`, `0.1+0.2`, divide by zero, negative sqrt, invalid text and backend down.

## 4. Form view tests

> Write Testing Library tests for the form view, mocking only the API client (keep the real `ApiError`). Cover: initial render, successful submit, float rounding, operation selection, hiding the second operand for unary operations, the percentage hint, validation of both/one operands and recovery after fixing them, friendly and generic API errors, the in-flight state (use a manually resolved promise), and clearing the result when the operation changes. Query by role and label, as a user would. Acceptance: all green, with near-100% coverage on the component.

## 5. Keypad logic (reducer) and its tests

> Design the keypad as a pure reducer with no React, network or async code. State: `{display, left, operation, fresh, awaiting, busy, error}`. Actions: digit, decimal, backspace, negate, clear, operator, started, resolved (with an optional chained operator), unary-resolved and failed. Rules: 15-digit cap, no double decimal point, no `-0`, operator swapping when pressed twice in a row, unary results keep a pending operation (`5 + 9 √ =` gives 8), errors reset the calculator, and any input clears the error. Export `isReadyToEvaluate`. Then write a `run(...actions)` test helper and tests for every rule above. Acceptance: tests green, reducer coverage near 100%.

## 6. Hook, keypad UI and view switcher

> Connect the reducer to the API with a `useKeypad` hook that turns commands into dispatches and async requests: unary operators evaluate immediately, a binary operator with both operands ready evaluates and chains, equals does nothing without a second operand, and all input is ignored while busy. Build the keypad UI from a data table of keys (accessible names taken from the operations table) and show the pending operation above the display. Support the physical keyboard through a tested key-to-command map: ignore Ctrl/Cmd/Alt shortcuts, don't double-fire Enter on a focused button, and clean up the listener on unmount. Add an `App` shell that switches between keypad and form with `aria-pressed` buttons. Acceptance: manual checks for chained operations, `5 + 9 √ =`, divide by zero, backend down and keyboard use.

## 7. Responsive styles and fixed width

> Style both views: a responsive mobile-first layout, CSS variables, automatic dark mode, a 4-column keypad grid (`=` spanning two rows, `0` spanning two columns), visible `:focus-visible`, reduced-motion support and good contrast. Requirement: the calculator must always have the same width as if the maximum number of digits (15 digits plus sign and decimal point) were on screen, in both views, regardless of the content. Long numbers must shrink the font and clip on the left so the latest digits stay visible. Acceptance: checked at desktop, 375px and 320px widths, in light and dark mode, with 3 digits vs. the maximum.

## 8. Keypad and App tests

> Write Testing Library tests for the keypad and the `App` shell, mocking only the API client. Cover: typing and editing, shrinking long numbers, a binary operation, the pending-operation display, chaining, operator swapping, unary operations (also with a pending operation), percentage, starting a new number after a result, equals with nothing pending, friendly error and recovery, disabled keys and ignored keyboard while a request is in flight, typing with the physical keyboard, modifier shortcuts being ignored, no double-firing on a focused button, and listener cleanup. For `App`, check the title, the default view, and switching back and forth through `aria-pressed`. Move the shared promise helper to `src/test/helpers.ts`. Acceptance: all green, coverage near 100%.

## 9. Final checks

> Run the final frontend checks: `npm run lint`, `npm run build`, `npm test` and `npm run coverage`. Report the coverage numbers, list any uncovered lines and say why they are acceptable. Then document the frontend in the README: setup, project structure, keyboard shortcuts, design decisions (reducer and hook split, text inputs, proxy instead of CORS, 12-digit display rounding, left-to-right chaining) and known limitations.

## Verification prompt used at every step

> After each step I will run the commands you give me and paste the real output. Don't move to the next step until I confirm it builds, passes its tests and is formatted.