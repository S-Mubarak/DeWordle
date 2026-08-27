# ADR 0004: Error Handling and Logging Standards

## Status

Proposed

## Context

DeWordle operates across three layers — Soroban contracts (Rust), NestJS backend (TypeScript), and Next.js frontend (React). Each layer handles errors independently with no project-wide standard. Contributors need a consistent model for error propagation, reporting, and logging.

Existing patterns: contracts use `panic_with_error!` with typed enums, backend uses NestJS `Logger` + `MetricsInterceptor`, frontend uses `react-hot-toast`.

## Decision

### 1. Soroban Contracts: Typed Error Enums

- Every contract defines `#[contracterror]` with `#[repr(u32)]`.
- Error code ranges per contract:
  - `core_game`: 1–50
  - `rewards`: 51–100
  - `achievements`: 101–150
  - `admin_registry`: 151–200
- All error paths use `panic_with_error!(&env, ContractError::Variant)`.
- Each `fixtures.rs` exports error constants for SDK/indexer consumption.

### 2. Backend: Structured Logging and Exception Filters

- Use NestJS built-in exceptions (`BadRequestException`, `UnauthorizedException`, etc.).
- Global exception filter returns consistent JSON: `{ statusCode, message, error }`.
- Use `Logger` from `@nestjs/common` with structured context strings.
- Log levels: `error` → `warn` → `info` → `debug`.
- Existing `MetricsInterceptor` captures request durations and error counts.

### 3. Frontend: Error Boundaries and Toast Notifications

- Page-level errors caught by `ErrorBoundary` component.
- User-facing errors via `toastError()` from `utils/toast.ts`.
- Never show raw error objects — map to human-readable messages.
- Wallet errors use `WalletErrorBoundary` for Stellar-specific recovery.

### 4. Cross-Layer Propagation

- Contract errors surface via indexer event `outcome_code` fields.
- Backend maps error codes to HTTP status codes.
- Frontend reads API error `message` field for display.

### 5. Logging Standards

| Layer | Tool | Format | Destination |
|-------|------|--------|-------------|
| Contracts | Soroban events | Topic + payload | On-chain |
| Backend | NestJS Logger | Structured text | stdout + OpenTelemetry |
| Frontend | Console (dev only) | — | Browser console |

## Consequences

- Single reference for error handling across all layers.
- Error code ranges prevent silent collisions.
- Integrates with existing OpenTelemetry tracing (`backend/src/telemetry/tracing.ts`).
- No new dependencies required.

## Migration Notes

- Existing contract error codes will be re-numbered into reserved ranges in a future wave.
- New contributions should follow these standards immediately.
