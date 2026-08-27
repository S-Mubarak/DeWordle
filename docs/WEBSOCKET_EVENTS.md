# WebSocket Event Subscription Types and Payload Formats

> Resolves #1301

## Overview

DeWordle uses typed events defined in `shared/events/schemas.ts` for real-time communication between Soroban contracts and the backend. This document describes WebSocket subscription patterns for consuming these events.

## Event Families

| Family | Description | Contract |
|--------|-------------|----------|
| `core_game` | Game session lifecycle | `core_game` |
| `rewards` | Points accrual and claims | `rewards` |
| `achievements` | Achievement unlocks | `achievements` |
| `admin_registry` | Contract and role changes | `admin_registry` |

## Core Game Events

### `session_started`

Emitted when a player starts a new game session.

```json
{
  "topic": "session_started",
  "family": "core_game",
  "topics": ["session_started", "<player_address>", "<day_id>"],
  "payload": {
    "session_id": "<bytes32>"
  }
}
```

### `guess_submitted`

Emitted when a player submits a guess.

```json
{
  "topic": "guess_submitted",
  "family": "core_game",
  "topics": ["guess_submitted", "<session_id>"],
  "payload": {
    "guess_commitment": "<bytes32>",
    "attempt_no": 1,
    "outcome_code": 0,
    "is_correct": false
  }
}
```

| `outcome_code` | Meaning |
|----------------|---------|
| 0 | Incorrect guess |
| 1 | Correct guess |

### `session_finalized`

Emitted when a session is finalized (won or lost).

```json
{
  "topic": "session_finalized",
  "family": "core_game",
  "topics": ["session_finalized", "<session_id>"],
  "payload": {
    "player": "<player_address>"
  }
}
```

### `streak_updated`

Emitted when a player's streak changes.

```json
{
  "topic": "streak_updated",
  "family": "core_game",
  "topics": ["streak_updated", "<player_address>"],
  "payload": {
    "current": 5,
    "max": 12,
    "last_day_played": 42
  }
}
```

### `day_published`

Emitted when a new daily puzzle is configured.

```json
{
  "topic": "day_published",
  "family": "core_game",
  "topics": ["day_published", "<day_id>"],
  "payload": {
    "day_id": 42,
    "puzzle_commitment": "<bytes32>",
    "max_attempts": 6,
    "closes_at": 1700000000,
    "published": true
  }
}
```

### `core_game_paused`

Emitted when the contract is paused or unpaused.

```json
{
  "topic": "core_game_paused",
  "family": "core_game",
  "topics": ["core_game_paused"],
  "payload": true
}
```

## Rewards Events

| Topic | Payload |
|-------|---------|
| `accrued` | `(points: u64, nonce: u64)` |
| `claimed` | `balance: u64` |
| `emission_set` | `EmissionConfig { day_id, win_points, participation_points }` |

## Achievement Events

| Topic | Payload |
|-------|---------|
| `achievement_defined` | `AchievementDefinition { id, metric, threshold, enabled }` |
| `achievement_unlocked` | `AchievementUnlock { player, id, unlocked_at, nonce }` |

## Subscription Lifecycle

```
1. Connect to WebSocket endpoint
2. Subscribe to topic family or specific topic
3. Receive events matching subscription
4. Unsubscribe when done
```

### Topic Format

All events use the Soroban topic tuple format:

```
(topic_symbol, event_version, context_address)
```

### Replay Safety

Events are deduplicated by `(network, txHash, eventIndex)`. Reconnections receive only new events — no replay of historical events through WebSocket.

## Backend Event Processing

The indexer (`backend/src/indexer/`) processes these events through:

```
WebSocket/RPC → Event Stream → Queue → Processors → Projections → REST API
```

Processors in `backend/src/indexer/processors/` handle one family each and materialize data to PostgreSQL for REST API consumption.
