//! Shared harness for core_game guess-input sanitization fuzzing.
//!
//! `exercise_guess_input` drives the contract's guess-processing path with
//! caller-supplied bytes. Both the cargo-fuzz target and the deterministic
//! corpus tests below use it, guaranteeing the contract returns a controlled
//! error — never an unexpected panic — for malformed byte sequences.

use core_game::{CoreGameContract, CoreGameContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env};

/// Maps fuzzer bytes into a full contract invocation.
///
/// Bytes are split into a 32-byte guess commitment plus an outcome code and a
/// correctness flag. Any truncation/padding is intentional: malformed inputs
/// must be handled gracefully by the contract.
pub fn exercise_guess_input(data: &[u8]) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(CoreGameContract, ());
    let client = CoreGameContractClient::new(&env, &contract_id);
    client.init(&admin);

    // Publish a day so sessions can be created.
    let day_commitment = BytesN::from_array(&env, &[1u8; 32]);
    client.set_day_config(&1, &day_commitment, &6, &u64::MAX);

    let player = Address::generate(&env);
    let session_id = client.create_session(&player, &1, &0);

    // Derive the 32-byte commitment from the input bytes.
    let mut commitment_bytes = [0u8; 32];
    let n = data.len().min(32);
    commitment_bytes[..n].copy_from_slice(&data[..n]);
    let commitment = BytesN::from_array(&env, &commitment_bytes);

    let outcome_code = data.get(32).copied().unwrap_or(0) as u32 % 3;
    let is_correct = data.get(33).copied().unwrap_or(0) % 2 == 1;

    // The contract must return a result or a controlled contract error, never
    // an unexpected panic. Soroban contract errors surface as HostError.
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.submit_guess(
            &player,
            &session_id,
            &commitment,
            &outcome_code,
            &is_correct,
        );
    }));

    if let Err(payload) = result {
        let downcast = payload.downcast_ref::<soroban_sdk::HostError>();
        assert!(
            downcast.is_some(),
            "unexpected panic in submit_guess: {payload:?}"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::exercise_guess_input;

    /// Malformed byte sequences: control characters, multi-byte UTF-8,
    /// invalid UTF-8, and an all-zero commitment.
    const MALFORMED_CORPUS: &[&[u8]] = &[
        // Control characters 0x00-0x1F
        &[
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
            0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
            0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
        ],
        // Multi-byte UTF-8 sequences (é, è, ê, €, 😀)
        b"\xc3\xa9\xc3\xa8\xc3\xaa\xe2\x82\xac\xf0\x9f\x98\x80",
        // Invalid/overlong UTF-8 bytes
        b"\xff\xfe\xfd\xfc\x80\x81\xc0\xc1\xf5\xf6\xf7",
        // All-zero commitment (contract's InvalidCommitment path)
        &[0u8; 32],
        // Random-ish arbitrary bytes with trailing control characters
        b"abc\x00\x7f\x80\xffxyz",
        // Empty input
        b"",
        // Over-long input (spills past the 32-byte commitment)
        &[0x41u8; 64],
    ];

    #[test]
    fn malformed_bytes_do_not_cause_unexpected_panics() {
        for (idx, input) in MALFORMED_CORPUS.iter().enumerate() {
            exercise_guess_input(input);
            // Reaching here means no unexpected panic was raised.
            assert!(true, "corpus entry {idx} exercised without unexpected panic");
        }
    }

    #[test]
    fn repeated_cycles_are_stable() {
        // Run several fuzz cycles over the same corpus to shake out any
        // stateful instability in the contract harness.
        for cycle in 0..5 {
            for input in MALFORMED_CORPUS {
                exercise_guess_input(input);
            }
            assert!(cycle < 5, "cycle {cycle} completed");
        }
    }
}
