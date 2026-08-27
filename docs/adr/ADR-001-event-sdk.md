# ADR-001: Shared TypeScript Event SDK Design

**Status:** Accepted
**Date:** 2026-08-27

## Context

Multiple services emit and consume domain events. Without a shared contract,
event shapes drift across services causing runtime errors.

## Decision

Create a shared `@dewordle/events` TypeScript package containing:
- Event type definitions (interfaces)
- A typed event emitter wrapper
- Zod schemas for runtime validation

## Structure

```
packages/events/
  src/
    types.ts       # Event interfaces
    schemas.ts     # Zod validation schemas
    emitter.ts     # Typed emitter helper
  index.ts
  package.json
```

## Consequences

**Positive:**
- Single source of truth for event shapes
- TypeScript catches mismatches at compile time
- Easy to version and publish

**Negative:**
- All services must update when event shapes change
- Adds a shared package dependency

## Alternatives Considered

- Duplicating types per service — rejected due to drift risk
- Using a JSON schema registry — deferred for later