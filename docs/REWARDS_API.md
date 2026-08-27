# Rewards and Achievement API

> Resolves #1298

## Overview

DeWordle distributes rewards (points) and achievements through on-chain Soroban contracts, with a backend projection API for reading summaries.

## Backend REST API

### GET `/api/v1/rewards/:player` — Reward Summary

Returns accrued, claimed, and pending-claim token totals for a player.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `player` | string | Stellar wallet address (e.g., `GABC...XYZ`) |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `network` | string | `testnet` | Stellar network (`testnet` or `mainnet`) |

**Response (200):**

```json
{
  "player": "GABC...XYZ",
  "accrued": 250,
  "claimed": 100,
  "pendingClaim": 250,
  "state": "available"
}
```

| State | Meaning |
|-------|---------|
| `available` | Projection data exists for this player |
| `unavailable` | No projection rows — player hasn't played yet |

---

## Soroban Rewards Contract

**Contract:** `soroban/contracts/rewards/`

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `init(admin)` | Deploy-time | Initialize with admin address |
| `set_emission(day_id, win_points, participation_points)` | Admin | Set daily reward amounts |
| `accrue(player, points, nonce, reason)` | Admin | Credit points to a player |
| `claim(player)` | Player (auth) | Claim accumulated points |
| `balance_of(player)` | Public | Read current point balance |
| `claimed_total(player)` | Public | Read lifetime claimed total |
| `get_emission(day_id)` | Public | Read emission config for a day |

### Emission Configuration

```rust
struct EmissionConfig {
    day_id: u32,
    win_points: u64,
    participation_points: u64,
}
```

Example: Admin sets 100 points for a win, 10 for participation:
```bash
soroban contract invoke --id <REWARDS> --fn set_emission \
  --arg day_id 1 \
  --arg win_points 100 \
  --arg participation_points 10
```

### Points Flow

1. Admin calls `set_emission()` to configure daily rewards
2. After session finalization, indexer calls `accrue()` with appropriate points
3. Player calls `claim()` to transfer points to their balance
4. `balance_of()` returns current unclaimed balance

---

## Soroban Achievements Contract

**Contract:** `soroban/contracts/achievements/`

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `init(admin)` | Deploy-time | Initialize with admin address |
| `define(id, metric, threshold, enabled)` | Admin | Create an achievement definition |
| `unlock(player, id, nonce)` | Admin | Unlock an achievement for a player |
| `get_definition(id)` | Public | Read achievement definition |
| `get_unlocked(player, id)` | Public | Check if player has unlocked |

### Achievement Definition

```rust
struct AchievementDefinition {
    id: Symbol,        // e.g., "first_win", "streak_5"
    metric: Symbol,    // e.g., "wins", "streak"
    threshold: u32,    // e.g., 1, 5
    enabled: bool,
}
```

### Achievement Unlock

```rust
struct AchievementUnlock {
    player: Address,
    id: Symbol,
    unlocked_at: u64,  // ledger timestamp
    nonce: u64,        // replay protection
}
```

### Example: Define and Unlock

```bash
# Define "first win" achievement
soroban contract invoke --id <ACHIEVEMENTS> --fn define \
  --arg id first_win \
  --arg metric wins \
  --arg threshold 1 \
  --arg enabled true

# Unlock for a player
soroban contract invoke --id <ACHIEVEMENTS> --fn unlock \
  --arg player GABC...XYZ \
  --arg id first_win \
  --arg nonce 1
```

---

## Event Topics

| Topic | Contract | Payload |
|-------|----------|---------|
| `accrued` | rewards | `(points, nonce)` |
| `claimed` | rewards | `balance` |
| `emission_set` | rewards | `EmissionConfig` |
| `achievement_defined` | achievements | `AchievementDefinition` |
| `achievement_unlocked` | achievements | `AchievementUnlock` |

See [Event Payload Schemas](./EVENT_PAYLOAD_SCHEMAS.md) for full details.
