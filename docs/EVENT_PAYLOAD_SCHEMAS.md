# Shared Event Payload TypeScript Schemas and Versioning Rules

> Resolves #1307

## Overview

All event schemas are defined in **`shared/events/schemas.ts`** — the single source of truth for cross-layer communication between Soroban contracts and the backend indexer.

## Schema Structure

```typescript
type EventSchema = {
  topic: string;
  family: "core_game" | "rewards" | "achievements" | "admin_registry";
  description: string;
  topicFields: EventSchemaField[];
  payloadFields: EventSchemaField[];
  version: number;
};
```

## On-Chain Event Format

Soroban events publish as `(topics_tuple, data_tuple)`:

```rust
env.events().publish(
    (Symbol::new(&env, "session_started"), player, day_id),
    session_id,
);
```

## Event Catalog

### Core Game

| Topic | Description | Version |
|-------|-------------|---------|
| `session_started` | Player begins a session | 1 |
| `guess_submitted` | Guess result broadcast | 1 |
| `session_finalized` | Session finalized (won/lost) | 1 |
| `streak_updated` | Player streak changes | 1 |
| `day_published` | New puzzle configured | 1 |
| `core_game_paused` | Contract paused/unpaused | 1 |

### Rewards

| Topic | Description | Version |
|-------|-------------|---------|
| `rewards_initialized` | Contract initialized | 1 |
| `emission_set` | Daily emission config set | 1 |
| `accrued` | Points credited to player | 1 |
| `claimed` | Player claims points | 1 |

### Achievements

| Topic | Description | Version |
|-------|-------------|---------|
| `achievements_initialized` | Contract initialized | 1 |
| `achievement_defined` | New achievement created | 1 |
| `achievement_unlocked` | Achievement unlocked | 1 |

### Admin Registry

| Topic | Description | Version |
|-------|-------------|---------|
| `registry_initialized` | Registry initialized | 1 |
| `contract_set` | Contract address registered | 1 |
| `role_set` | Role assignment changed | 1 |

## Versioning Rules

1. **Never remove or rename fields** — additive-only changes are safe.
2. **Bump `version`** when a field type changes, a required field is added, or a field is removed.
3. **Optional fields** can be added without a version bump.
4. **Backward compatibility**: indexer handles current + previous schema versions during transitions.
5. Invalid events are logged and skipped (replay-safe via `(network, txHash, eventIndex)` deduplication).

## Event Processing Pipeline

```
Soroban RPC → Event Stream → Queue → Processors → Projections → REST API
```

Processors in `backend/src/indexer/processors/` handle one contract family each.
