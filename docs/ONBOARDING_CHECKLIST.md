# Developer Onboarding Checklist

> Resolves #1290

Use this checklist for your first contribution to DeWordle.

---

## Step 1: Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/<your-username>/DeWordle.git
cd DeWordle
git remote add upstream https://github.com/kike-alt/DeWordle.git
```

## Step 2: Install Dependencies

```bash
npm run install:all
```

This installs backend, frontend, and shared package dependencies.

## Step 3: Review the Repository Surface Map

**Before writing any code**, read [docs/REPO_SURFACE_MAP.md](./REPO_SURFACE_MAP.md). It defines which surfaces are maintained, transitional, and legacy.

## Step 4: Choose Your Workstream

| Workstream | What You'll Work On | Key Directory |
|------------|---------------------|---------------|
| Soroban Contracts | Rust smart contracts | `soroban/contracts/` |
| Backend Indexer | Event processing, projections | `backend/src/indexer/` |
| Frontend Wallet | Stellar integration, UI | `frontend/src/lib/stellar/` |
| Documentation | Guides, ADRs, API docs | `docs/` |
| DevOps/Scripts | CI, tooling, automation | `scripts/` |

## Step 5: Set Up Your Environment

Copy the environment template and configure:

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your local values

# Frontend
cp .env.example frontend/.env.local
# Edit frontend/.env.local
```

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL
- `SOROBAN_RPC_URL` — Soroban testnet RPC
- `JWT_SECRET` — Backend auth secret
- `NEXT_PUBLIC_API_URL` — Frontend API URL

## Step 6: Run Validation for Your Surface

```bash
# Soroban contracts
cd soroban && cargo check --workspace && cargo test --workspace

# Backend indexer
cd backend && npm run lint:ci && npm run test:ci

# Frontend wallet integration
cd frontend && npm run lint:ci && npm run test:ci -- src/lib/stellar src/lib/soroban
```

## Step 7: Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use prefixes: `feat/`, `fix/`, `docs/`, `chore/`.

## Step 8: Make Your Changes

- Keep changes scoped to one issue.
- Follow existing code patterns and conventions.
- Add tests for new functionality.

## Step 9: Run Full Tests

```bash
# Run all tests for your surface
cd soroban && cargo test --workspace    # for contracts
cd backend && npm run test:ci            # for backend indexer
cd frontend && npm run test:ci           # for frontend
```

## Step 10: Submit Your PR

```bash
git add .
git commit -m "feat: describe your change (#issue-number)"
git push origin feat/your-feature-name
```

Then open a pull request against `main` with:
- Clear title referencing the issue number
- Description of what changed and why
- Screenshots/recordings if UI changed

## Step 11: Respond to Code Review

- Address review comments promptly.
- Push additional commits as needed.
- Squash before merge if requested.

## Step 12: Merge

After approval, your PR will be merged. Delete your feature branch:

```bash
git checkout main
git pull upstream main
git branch -d feat/your-feature-name
```

---

## Quick Reference

| Need | Command |
|------|---------|
| Install all | `npm run install:all` |
| Lint all | `npm run lint` |
| Typecheck all | `npm run typecheck` |
| Bootstrap | `npm run bootstrap` |
| Local CI | `./scripts/ci-local.sh` |
| Help | See [CONTRIBUTING.md](../CONTRIBUTING.md) |
