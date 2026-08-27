# Admin Management API

> Resolves #1292

## Overview

DeWordle uses an on-chain admin registry contract for role management, plus backend admin endpoints for game operations.

## On-Chain Admin Registry

**Contract:** `soroban/contracts/admin_registry/`

The admin registry manages contract addresses and role assignments on the Stellar blockchain.

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `init(admin)` | Deploy-time | Sets the initial admin address |
| `set_contract(key, address)` | Admin only | Registers a contract address |
| `get_contract(key)` | Public | Retrieves a registered contract |
| `set_role(role, member, enabled)` | Admin only | Grants or revokes a role |
| `has_role(role, member)` | Public | Checks if a member has a role |
| `get_admin()` | Public | Returns the admin address |
| `version()` | Public | Returns contract version |

### Role Hierarchy

| Role | Permissions |
|------|------------|
| **Super Admin** | Full control over all contracts and roles |
| **Admin** | Manage games, day configs, reward emissions |
| **Moderator** | Limited admin operations |
| **Pauser** | Can pause/unpause contracts |

### Role Checking

```rust
// In any Soroban contract:
use dewordle_auth::{require_admin, has_role};

// Require admin authentication
require_admin(&env);

// Check specific role
if has_role(&env, &Symbol::new(&env, "pauser"), &caller) {
    // Allow pause operation
}
```

## Backend Admin Endpoints

The backend exposes admin endpoints under `/api/v1/admin/` (NestJS, protected by JWT + role guard).

### Indexer Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/indexer/lag` | GET | Indexer lag metrics |
| `/api/v1/indexer/health` | GET | Queue health and worker status |
| `/api/v1/indexer/events` | GET | Recent ingested events |
| `/api/v1/indexer/audit` | GET | Audit trail history |

### Game Management (Transitional)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/daily-word` | POST | Set the daily word |
| `/api/v1/admin/days/:id` | PATCH | Update day configuration |

### User Management (Transitional)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/users` | GET | List users |
| `/api/v1/admin/users/:id/role` | PATCH | Change user role |

## Authentication

All admin endpoints require:

1. **Valid JWT token** in the `Authorization: Bearer <token>` header
2. **Admin role** verified against the on-chain registry or backend role guard

## Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid token |
| `403` | Token valid but user lacks required role |
| `404` | Resource not found |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SOROBAN_CORE_GAME_CONTRACT_ID` | Core game contract address |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint |
| `SOROBAN_NETWORK` | Network (testnet/mainnet) |
