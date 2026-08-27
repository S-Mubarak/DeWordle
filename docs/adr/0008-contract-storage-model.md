# ADR 0008: Contract Storage Model

## Status

Proposed

## Context

DeWordle's Soroban contracts store on-chain state using `soroban_sdk::storage`. Soroban provides three storage types with different persistence and cost characteristics:

| Storage Type | Persistence | Rent Cost | Use Case |
|-------------|-------------|-----------|----------|
| `instance` | Across all invocations | Higher | Shared config, admin addresses |
| `persistent` | Across all invocations | Lower per key | Game state, user data |
| `temporary` | Single transaction | Lowest | Ephemeral computation |

All four contracts (`core_game`, `rewards`, `achievements`, `admin_registry`) currently use `instance` and `persistent` storage. This ADR formalizes the storage strategy.

## Decision

### 1. `instance` Storage for Shared Configuration

Use `instance` storage for data shared across all contract invocations:

- **Admin addresses** (e.g., `DataKey::Admin` in rewards, achievements, admin_registry)
- **Initialization flags** (preventing double-init)
- **Pause state** (`DataKey::Paused` in core_game)

Rationale: Instance storage is accessible from all contract methods and is the appropriate tier for global contract configuration.

### 2. `persistent` Storage for Game State

Use `persistent` storage for all game-related data that must survive across transactions:

| Contract | Key Pattern | Data |
|----------|-------------|------|
| `core_game` | `DataKey::DayConfig(u32)` | Daily puzzle configuration |
| `core_game` | `DataKey::Session(BytesN<32>)` | Game session state |
| `core_game` | `DataKey::SessionNonce(Address, u32)` | Nonce replay protection |
| `core_game` | `DataKey::Streak(Address)` | Player streak data |
| `rewards` | `DataKey::Balance(Address)` | Player point balance |
| `rewards` | `DataKey::Claimed(Address)` | Lifetime claimed total |
| `rewards` | `DataKey::Emission(u32)` | Daily emission config |
| `achievements` | `DataKey::Definition(Symbol)` | Achievement definitions |
| `achievements` | `DataKey::Unlocked(Address, Symbol)` | Player achievement unlocks |
| `admin_registry` | `DataKey::Contract(Symbol)` | Registered contract addresses |
| `admin_registry` | `DataKey::Role(Symbol, Address)` | Role assignments |

### 3. No `temporary` Storage

None of the contracts use `temporary` storage. Game state must persist across multiple transactions (session creation → guesses → finalization). Temporary storage would lose state between calls.

### 4. `DataKey` Enum Pattern

Every contract defines a `DataKey` enum with `#[contracttype]`:

```rust
#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    Session(BytesN<32>),
    DayConfig(u32),
    // ...
}
```

This provides type-safe storage access and prevents key collisions.

### 5. Nonce-Based Replay Protection

Both `rewards` and `achievements` contracts use nonce keys to prevent replay attacks:

```rust
// Store nonce after use
env.storage().persistent().set(&DataKey::Nonce(player, nonce), &true);

// Check before processing
if env.storage().persistent().has(&DataKey::Nonce(player, nonce)) {
    panic_with_error!(env, Error::InvalidNonce);
}
```

`core_game` uses `SessionNonce(Address, u32)` for the same purpose.

### 6. Session ID Derivation

Session IDs are derived deterministically via SHA-256:

```rust
fn derive_session_id(env: &Env, player: &Address, day_id: u32, nonce: u32) -> BytesN<32> {
    let preimage = (player.clone(), day_id, nonce, env.ledger().sequence(), env.ledger().timestamp());
    let bytes = preimage.to_xdr(env);
    env.crypto().sha256(&bytes).into()
}
```

This ensures uniqueness without storing a separate counter.

## Consequences

- All game state survives across transactions as required by the game flow.
- The `DataKey` enum pattern provides compile-time safety for storage access.
- Nonce replay protection prevents double-crediting of rewards/achievements.
- Instance storage is reserved for truly global config, keeping rent costs manageable.
- The pattern is consistent across all four contracts, making it easy for contributors to follow.

## Migration Notes

- No changes to existing contracts — this ADR documents the current pattern.
- New contracts should follow the same `DataKey` enum + persistent storage pattern.
- Storage rent costs should be monitored as the player base grows.
