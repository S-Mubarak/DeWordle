//! Canonical event fixture definitions for core_game contract.
//! These fixtures document the expected event topic/payload shapes.

/// Event: session_started
/// topic: ("session", "started", player: Address, day_id: u32)
/// payload: session_id: BytesN<32>
pub const TOPIC_SESSION_STARTED: (&str, &str) = ("session", "started");

/// Event: guess_submitted
/// topic: ("guess", "submitted", session_id: BytesN<32>)
/// payload: (guess_commitment: BytesN<32>, result: GuessResult)
pub const TOPIC_GUESS_SUBMITTED: (&str, &str) = ("guess", "submitted");

/// Event: session_finalized
/// topic: ("session", "finalized", session_id: BytesN<32>)
/// payload: player: Address
pub const TOPIC_SESSION_FINALIZED: (&str, &str) = ("session", "finalized");

/// Event: day_published
/// topic: ("day", "published", day_id: u32)
/// payload: DayConfig
pub const TOPIC_DAY_PUBLISHED: (&str, &str) = ("day", "published");

/// Event: streak_updated
/// topic: ("streak", "updated", player: Address)
/// payload: PlayerStreak
pub const TOPIC_STREAK_UPDATED: (&str, &str) = ("streak", "updated");

/// Event: core_game_paused
/// topic: ("core_game", "paused")
/// payload: bool
pub const TOPIC_CORE_GAME_PAUSED: (&str, &str) = ("core_game", "paused");

/// Event: core_game_initialized
/// topic: ("core_game", "initialized")
/// payload: admin: Address
pub const TOPIC_CORE_GAME_INITIALIZED: (&str, &str) = ("core_game", "initialized");

