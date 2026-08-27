//! Canonical event fixture definitions for rewards contract.

/// Event: rewards_initialized
/// topic: ("rewards_initialized",)
/// payload: admin: Address
pub const TOPIC_REWARDS_INITIALIZED: &str = "rewards_initialized";

/// Event: emission_set
/// topic: ("emission_set", day_id: u32)
/// payload: EmissionConfig
pub const TOPIC_EMISSION_SET: &str = "emission_set";

/// Event: accrued
/// topic: ("accrued", player: Address, reason: Symbol)
/// payload: (points: u64, nonce: u64)
pub const TOPIC_ACCRUED: &str = "accrued";

/// Event: claimed
/// topic: ("claimed", player: Address)
/// payload: amount: u64
pub const TOPIC_CLAIMED: &str = "claimed";

/// Event: win_recorded
/// topic: ("win_recorded", player: Address)
/// payload: games_won: u32
pub const TOPIC_WIN_RECORDED: &str = "win_recorded";

/// Event: rank_set
/// topic: ("rank_set", player: Address)
/// payload: rank: u32
pub const TOPIC_RANK_SET: &str = "rank_set";
