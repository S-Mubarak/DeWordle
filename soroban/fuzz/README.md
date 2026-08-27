# core_game fuzzing

Fuzz targets for input sanitization in the `core_game` contract.

## Purpose (#1205)

Guarantee the contract's guess-processing path safely handles malformed byte
sequences — non-ASCII, multi-byte UTF-8, and control characters — by either
accepting the guess or returning a controlled contract error, never panicking.

## Targets

- `fuzz_guess_commitment` — runs arbitrary bytes through `CoreGameContract::submit_guess`.

## Run with cargo-fuzz

```bash
cargo +nightly fuzz run fuzz_guess_commitment --manifest-path soroban/fuzz/Cargo.toml
```

## Corpus

Seed inputs live in `corpus/fuzz_guess_commitment/`:

- `control_chars` — raw control characters `0x00..0x1F`
- `utf8_multi_byte` — multi-byte UTF-8 sequences (é, è, ê, €, 😀)
- `invalid_utf8` — invalid/overlong UTF-8 bytes
- `zero_commitment` — a 32-byte zero commitment (contract InvalidCommitment path)

## Deterministic tests

The shared harness in `src/lib.rs` also runs the same corpus as plain unit
tests:

```bash
cargo test --manifest-path soroban/fuzz/Cargo.toml
```

This crate is standalone (not a workspace member) so the fuzz harness does not
affect the main workspace `cargo check --workspace`.