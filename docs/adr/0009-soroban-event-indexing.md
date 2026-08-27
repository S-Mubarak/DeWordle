# ADR 0009: Soroban Contract Event Indexing Model

## Status

Proposed

## Context

DeWordle's Soroban smart contracts emit domain events for game actions, rewards, achievements, and admin changes. The backend needs a reliable, replay-safe mechanism to consume these on-chain events and project them into queryable PostgreSQL tables for the REST API.

The event indexer sits between the Stellar network and the application database, processing events from the Soroban RPC event stream and maintaining consistency with on-chain state.

### Decision Drivers

- Events are emitted by four contracts: `core_game`, `rewards`, `achievements`, `admin_registry`
- Each event has a 3-tuple topic: `(event_name, version, caller)`
- Events must be processed exactly once (idempotency)
- The indexer must tolerate RPC downtime and catch up on restart
- Historical events must be queryable by the REST API
- Real-time event subscriptions should be possible for WebSocket consumers

## Decision

### 1. Pull-Based Event Consumption via Soroban RPC

The indexer polls the Soroban RPC `getEvents` endpoint with ledger-range queries, processing events in batches rather than using a push/subscription model. This avoids reliance on WebSocket infrastructure and simplifies replay/catch-up logic.

### 2. Ledger Cursor Persistence

The indexer stores the last successfully processed ledger sequence in a `cursor` table:

```
| last_ledger | updated_at |
|-------------|------------|
```

On startup, the indexer resumes from this cursor, fetching events from `last_ledger + 1` to the current network ledger. This ensures no events are lost during downtime.

### 3. Idempotency via Event Fingerprint

Each event is deduplicated using a composite fingerprint: `(network, txHash, eventIndex)`. Before processing, the indexer checks whether this fingerprint already exists in the processed events table. Duplicate events are skipped silently.

### 4. Event Queue with Worker Processing

Raw events from the RPC are placed into an in-memory queue. A single worker thread processes events sequentially, dispatching to family-specific processors:

```
Soroban RPC → Event Stream → Queue → Worker → Processor (by family) → PostgreSQL
```

### 5. Family-Specific Processors

Each event family has a dedicated processor in `backend/src/indexer/processors/`:

| Family | Processor | Projection Target |
|--------|-----------|-------------------|
| `core_game` | Session events processor | Sessions table |
| `rewards` | Rewards events processor | Player balances |
| `achievements` | Achievement events processor | Unlock records |
| `admin_registry` | Admin events processor | Contract registry |

### 6. Health Probes

The indexer exposes two HTTP endpoints for operational monitoring:

- `GET /api/v1/indexer/health` — liveness/readiness for load balancers
- `GET /api/v1/indexer/lag` — cursor position and lag for dashboards

### 7. Replay Safety

Events are replay-safe by design:
- The `(network, txHash, eventIndex)` fingerprint prevents double-processing
- The cursor persists across restarts
- The worker processes events sequentially, so ordering is preserved

## Alternatives Considered

| Alternative | Tradeoff | Why Not |
|-------------|----------|---------|
| WebSocket push subscription | Lower latency | Complex reconnect logic, hard to guarantee delivery |
| Per-block polling with `getBlockHeaders` | Simpler | Doesn't give us event data directly, requires extra RPC call |
| Event broker (Redis Streams) | Scalability | Adds infrastructure dependency, overkill for current scale |

## Consequences

- The indexer is resilient to RPC downtime — it catches up on restart.
- Idempotency is guaranteed by the event fingerprint deduplication.
- Adding new event families requires only a new processor — the queue and cursor infrastructure is reusable.
- Operational visibility is provided by health and lag endpoints.
- Sequential processing avoids race conditions but limits throughput to single-event-at-a-time.

## Migration Notes

- The `cursor` table is created automatically on first run.
- Historical events are backfilled by setting the cursor to a past ledger and running the indexer.
- No contract changes required — this is purely backend infrastructure.
