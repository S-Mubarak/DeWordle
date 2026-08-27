# ADR 0006: Backend Database ORM Selection

## Status

Proposed

## Context

DeWordle's backend is a NestJS application that stores game sessions, user data, projections, and audit trails in PostgreSQL. The codebase already uses TypeORM as its ORM, with entity classes in `backend/src/entities/`, `backend/src/game-sessions/entities/`, and other module directories. Schema changes are managed through TypeORM migrations in `backend/src/migrations/`.

As the Soroban migration progresses, the backend's role is shifting from primary game authority to an indexer/projection service. The question is whether to keep TypeORM, switch to a lighter alternative (Prisma, Drizzle), or eventually replace ORM-based access entirely.

## Decision

### 1. Continue Using TypeORM

TypeORM remains the ORM for the transitional and maintained backend surfaces. Rationale:

- It is already deeply integrated across all entity definitions and migrations.
- The migration cost to Prisma/Drizzle is high with no corresponding benefit during the transition period.
- TypeORM's decorator-based entity pattern maps naturally to the existing codebase.

### 2. Entity Pattern

All entities use TypeORM decorators:

```typescript
@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  dayId: number;

  @Column({ type: 'jsonb', default: '[]' })
  guesses: GuessResult[];

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3. Migrations

- Schema changes go through TypeORM migrations in `backend/src/migrations/`.
- Migrations are version-controlled and run in order.
- The data source configuration is in `backend/src/data-source.ts`.

### 4. Indexer Projections Use TypeORM

The maintained indexer surface (`backend/src/indexer/projections/`) uses TypeORM entities for materialized projections. These are query-only (read) entities that map event data to queryable tables.

### 5. No Introduction of Prisma or Drizzle

Adding a second ORM would create confusion and maintenance burden. TypeORM is sufficient for the current and projected scope.

### 6. Long-Term Migration Path

As Soroban contracts become the source of truth:
- Backend entities become projection-only (read materializations of on-chain events).
- Write operations move entirely on-chain.
- TypeORM usage naturally decreases as the indexer surface matures.
- Post-migration, the backend may become a thin projection + API layer with minimal ORM needs.

## Consequences

- No disruption to existing code — all current patterns continue working.
- Contributors familiar with TypeORM can work across all backend modules.
- The indexer projections benefit from TypeORM's query builder for complex aggregations.
- Long-term maintenance cost is bounded as ORM usage decreases with migration progress.

## Migration Notes

- No immediate code changes required.
- New features should prefer projection entities (read-only) over direct database writes.
- All writes should route through Soroban contracts where possible.
