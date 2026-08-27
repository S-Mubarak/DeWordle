//! Reward calculation helpers for the rewards contract.
//!
//! REW-1208: Token reward values are ultimately stored as `u32`, but all
//! intermediate arithmetic (scaling, ratios, rounding) must stay in `u64`
//! so large token calculations never silently truncate. The final amount
//! is converted with a checked conversion that fails loudly instead of
//! wrapping.

/// Errors raised by reward calculations.
#[derive(Debug, PartialEq, Eq)]
pub enum RewardCalcError {
    /// The ratio denominator was zero.
    ZeroDenominator,
    /// An intermediate `u64` multiplication overflowed.
    Overflow,
    /// The final token amount does not fit in `u32`.
    OutOfRange,
}

/// Calculates the token reward for `base_points` scaled by the ratio
/// `multiplier / denominator`.
///
/// All intermediate arithmetic is performed in `u64` (no premature casts),
/// and the final amount is converted to the `u32` token amount via
/// [`u32::try_from`], which rejects values that no longer fit instead of
/// truncating them.
///
/// * `base_points` – the base reward in points (u64, e.g. emission config).
/// * `multiplier`  – numerator of the scaling ratio (u64).
/// * `denominator` – denominator of the scaling ratio (u64, non-zero).
/// * `round_up`    – when `true`, fractional results round up (ceil);
///                   otherwise they round down (floor).
pub fn calculate_reward(
    base_points: u64,
    multiplier: u64,
    denominator: u64,
    round_up: bool,
) -> Result<u32, RewardCalcError> {
    if denominator == 0 {
        return Err(RewardCalcError::ZeroDenominator);
    }

    // Keep u64 precision across every intermediate step.
    let scaled = base_points
        .checked_mul(multiplier)
        .ok_or(RewardCalcError::Overflow)?;
    let mut amount = scaled / denominator;
    if round_up && scaled % denominator != 0 {
        amount = amount
            .checked_add(1)
            .ok_or(RewardCalcError::Overflow)?;
    }

    // Only the final amount is narrowed to u32, and only via a checked
    // conversion so out-of-range values error rather than truncate.
    u32::try_from(amount).map_err(|_| RewardCalcError::OutOfRange)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_ratio_rounds_down() {
        assert_eq!(calculate_reward(100, 1, 1, false), Ok(100));
        assert_eq!(calculate_reward(100, 1, 3, false), Ok(33));
    }

    #[test]
    fn round_up_ceil_behavior() {
        assert_eq!(calculate_reward(100, 1, 3, true), Ok(34));
        assert_eq!(calculate_reward(100, 1, 3, false), Ok(33));
    }

    #[test]
    fn zero_denominator_is_rejected() {
        assert_eq!(
            calculate_reward(100, 1, 0, false),
            Err(RewardCalcError::ZeroDenominator)
        );
    }

    #[test]
    fn intermediate_values_that_exceed_u32_stay_precise() {
        // 5_000_000_000 does not fit in u32, but halving it does.
        let base: u64 = 5_000_000_000;
        assert!(base > u32::MAX as u64);
        // A naive u32 intermediate cast would truncate 5_000_000_000;
        // u64 arithmetic keeps the full precision through the division.
        assert_eq!(calculate_reward(base, 1, 2, false), Ok(2_500_000_000));
    }

    #[test]
    fn large_token_calculation_matches_u64_expectation() {
        // Large values: base points near u64/u32 boundaries scaled by a
        // ratio, with the final result still within u32.
        let base: u64 = 3_000_000_000;
        let multiplier: u64 = 1_000;
        let denominator: u64 = 1_500;
        let expected = (base * multiplier) / denominator; // 2_000_000_000
        assert_eq!(expected, 2_000_000_000);
        assert_eq!(
            calculate_reward(base, multiplier, denominator, false),
            Ok(2_000_000_000)
        );
    }

    #[test]
    fn final_amount_over_u32_max_is_rejected_not_truncated() {
        // 4_294_967_296 = u32::MAX + 1; must error instead of wrapping.
        assert_eq!(
            calculate_reward(4_294_967_296, 1, 1, false),
            Err(RewardCalcError::OutOfRange)
        );
        assert_eq!(
            calculate_reward(10_000_000_000, 1, 1, false),
            Err(RewardCalcError::OutOfRange)
        );
    }

    #[test]
    fn u64_intermediate_multiplication_overflow_is_detected() {
        // u64::MAX * 2 overflows even though the final division would
        // bring the result back into range — must error, not wrap.
        assert_eq!(
            calculate_reward(u64::MAX, 2, 4, false),
            Err(RewardCalcError::Overflow)
        );
    }

    #[test]
    fn exact_division_keeps_precision() {
        assert_eq!(calculate_reward(u32::MAX as u64, 2, 2, false), Ok(u32::MAX));
    }
}
