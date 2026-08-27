# Troubleshooting FAQ: Common Monorepo Build Errors

> Resolves #1308

## Quick Reset

```bash
npm run install:all
```

---

## Rust / Soroban

### `error[E0463]: can't find crate for core`
```bash
rustup target add wasm32-unknown-unknown
```

### `soroban-sdk` version mismatch
Check workspace `Cargo.toml` pins `soroban-sdk = "22.0.1"`. All contracts inherit via `soroban-sdk.workspace = true`.

### Auth errors in tests
Add `env.mock_all_auths()` to your test `setup()` function.

### Wasm build fails
Ensure `#![no_std]` at the top of contract `lib.rs`.

---

## Backend (NestJS)

### `Cannot find module` during build
```bash
cd backend && rm -rf node_modules && npm install
```

### TypeORM migration errors
```bash
cd backend
npx typeorm schema:drop -d dist/data-source.js
npx typeorm migration:run -d dist/data-source.js
```

### `ECONNREFUSED` on PostgreSQL
Check `.env` has correct `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`. Or start via Docker:
```bash
docker-compose up -d postgres
```

### Indexer tests fail
```bash
cd backend && npm run test:ci -- --testPathIgnorePatterns=indexer-worker.soak.spec.ts
```

---

## Frontend (Next.js)

### Module not found after install
```bash
cd frontend && rm -rf node_modules .next && npm install
```

### Font errors
Ensure font files exist in `frontend/src/fonts/`.

### API URL not reaching backend
Check `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```
Backend runs on port 3000, frontend on 3001:
```bash
cd backend && npm run start:dev        # port 3000
cd frontend && PORT=3001 npm run dev   # port 3001
```

### Wallet connection fails
1. Install Freighter extension
2. Switch to Stellar Testnet
3. Check `NEXT_PUBLIC_FEATURE_REWARDS` and `NEXT_PUBLIC_FEATURE_ACHIEVEMENTS`

---

## Docker

### `docker-compose up` fails
```bash
docker-compose down -v
docker-compose up -d postgres
```

---

## CI / Scripts

### `ci-local.sh` fails
Run from the repo root directory.

### Broken markdown links
```bash
npm run docs:linkcheck
```

---

## Still Stuck?

1. [Contributor Cheatsheet](./CONTRIBUTOR_CHEATSHEET.md)
2. [Environment Variables](./ENVIRONMENT.md)
3. Ask in the project discussion channel
