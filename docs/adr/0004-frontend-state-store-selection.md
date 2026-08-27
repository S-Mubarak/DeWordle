# ADR 0004: Frontend State Store Selection

## Status

Proposed

## Context

The DeWordle frontend uses Next.js 14 with React 18. Global state management is currently handled through React Context providers:

- `AuthProvider` — authentication state (user, token, login/logout)
- `StellarWalletProvider` — wallet connection, network, transaction status
- `SettingsProvider` — user preferences (theme, notifications)
- `OnboardingProvider` — first-run experience state

No Redux, Zustand, or other state management libraries are currently installed. As features grow (rewards, achievements, real-time game updates), the team needs a clear strategy for state management.

## Decision

### 1. React Context + useReducer for Simple Global State

Continue using React Context for auth, settings, wallet, and onboarding state. These are low-frequency updates that benefit from React's built-in context without additional dependencies.

- Auth state changes on login/logout (rare)
- Settings change on user preference updates (rare)
- Wallet state changes on connect/disconnect (rare)
- Onboarding progresses through a fixed flow (rare)

### 2. React Query for Server-State Caching

Use `@tanstack/react-query` (or SWR) for any data fetched from the backend API:

- Session history
- Leaderboard data
- Reward summaries
- Achievement lists

This avoids duplicating API data in Redux/Zustand and provides automatic caching, refetching, and error handling.

### 3. No Redux or Zustand at This Stage

Introducing a full state management library would add bundle complexity disproportionate to current needs. If state management requirements grow significantly (e.g., complex offline game state, optimistic updates, undo/redo), revisit this decision with an ADR update.

### 4. Local Component State for UI

Use `useState` and `useReducer` for UI-only state:

- Modal open/close
- Form inputs
- Loading spinners
- Keyboard state

### 5. Wallet State Stays in Context

The `StellarWalletProvider` manages connected address, network, and transaction lifecycle. This is the most complex context but remains appropriate because:

- It's the single source of truth for wallet state
- It's consumed by many components across the app
- It interacts with Freighter and Stellar SDKs

### 6. Future Consideration

If the following conditions are met, consider adding Zustand (preferred over Redux for bundle size):

- More than 5 Context providers with overlapping consumers
- Need for cross-context state dependencies
- Complex optimistic update patterns
- Offline-first requirements

## Consequences

- Minimal bundle size — no state management library overhead.
- Clear separation: Context for auth/wallet/settings, React Query for server data, useState for UI.
- Contributors familiar with React can onboard without learning Redux/Zustand.
- If state complexity grows, Zustand can be introduced incrementally without rewriting existing Context providers.

## Migration Notes

- No existing code changes required.
- New features should use React Query for API data instead of Context.
- Document any Context provider additions in `frontend/src/providers/`.
