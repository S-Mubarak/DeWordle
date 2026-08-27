# Guide: Running Local Soroban Contract Unit & Integration Tests

> Resolves #1305

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable (1.78+) | `rustup update stable` |
| `soroban-cli` | ≥ 22.0 | `cargo install --locked soroban-cli` |
| `wasm32` target | — | `rustup target add wasm32-unknown-unknown` |

## Project Layout

```
soroban/
├── contracts/
│   ├── core_game/        # Session management, streaks, guess validation
│   ├── rewards/          # Points accrual and claiming
│   ├── achievements/     # Achievement definitions and unlocks
│   └── admin_registry/   # On-chain role management
├── crates/
│   ├── dewordle-types/   # Shared Rust types
│   ├── dewordle-auth/    # Admin authorization helpers
│   └── dewordle-utils/   # Utility functions
├── tests/                # Integration tests
└── Cargo.toml            # Workspace root
```

## Running Tests

### Full workspace

```bash
cd soroban
cargo test --workspace
```

### Single contract

```bash
cd soroban
cargo test -p core_game
cargo test -p rewards
cargo test -p achievements
cargo test -p admin_registry
```

### Compile check (no test execution)

```bash
cd soroban
cargo check --workspace
```

## Test Structure

Each contract's `src/lib.rs` contains a `#[cfg(test)] mod tests` block with a shared `setup()` helper:

```rust
fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(ContractType, ());
    let client = ContractClient::new(&env, &contract_id);
    client.init(&admin);
    (env, admin, contract_id)
}
```

Key test utilities:

| Utility | Purpose |
|---------|---------|
| `Env::default()` | Simulated ledger |
| `env.mock_all_auths()` | Skip real auth verification |
| `Address::generate(&env)` | Unique test address |
| `env.register(Contract, ())` | Deploy contract to test ledger |
| `BytesN::from_array(&env, &[u8; 32])` | Fixed-size byte arrays |
| `Symbol::new(&env, "topic")` | Event topic symbols |

### Panic assertions

Use `#[should_panic(expected = "Error(Contract, #N)")]` where N is the error code:

```rust
#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn invalid_max_attempts_panics() {
    let (env, _, contract_id) = setup();
    let client = CoreGameContractClient::new(&env, &contract_id);
    let commitment = BytesN::from_array(&env, &[1u8; 32]);
    client.set_day_config(&1, &commitment, &21, &u64::MAX);
}
```

## Integration Tests

Located in `soroban/tests/`, these test cross-contract interactions:

```bash
cd soroban
cargo test --workspace
```

## Common Issues

| Problem | Fix |
|---------|-----|
| `error[E0463]: can't find crate for core` | `rustup target add wasm32-unknown-unknown` |
| `soroban-sdk` version mismatch | Check workspace `Cargo.toml` pins `soroban-sdk = "22.0.1"` |
| Auth errors in tests | Add `env.mock_all_auths()` to `setup()` |
