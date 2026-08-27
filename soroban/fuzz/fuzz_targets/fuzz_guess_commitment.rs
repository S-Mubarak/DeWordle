#![no_main]

//! Fuzz target for the core_game `submit_guess` path.
//!
//! Feeds arbitrary byte sequences (including non-ASCII, multi-byte, and
//! control characters) into the guess-processing entry point and asserts the
//! contract either accepts the guess or returns a controlled contract error —
//! never an unexpected panic.
//!
//! Run with:
//!   cargo +nightly fuzz run fuzz_guess_commitment --manifest-path soroban/fuzz/Cargo.toml

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    core_game_fuzz::exercise_guess_input(data);
});