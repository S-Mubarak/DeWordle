# Game Session Lifecycle REST API

> Resolves #1289

## Base URL

```
/api/v1/sessions
```

All endpoints require `Content-Type: application/json`.

## Endpoints

### POST `/sessions` — Create Authenticated Session

Creates a new game session for an authenticated user. Sessions are saved to the database and included in leaderboard/stats.

**Auth:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "dayId": 1,
  "metadata": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dayId` | number | Yes | The daily puzzle ID |
| `metadata` | object | No | Additional session metadata |

**Response (201):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "dayId": 1,
  "guesses": [],
  "status": "in_progress",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `401 Unauthorized` — Missing or invalid JWT
- `400 Bad Request` — Invalid day ID

---

### POST `/sessions/guest` — Create Guest Session

Creates an anonymous session. Guest sessions are excluded from leaderboard and stats.

**Auth:** Not required

**Request Body:** Same as authenticated session, with optional `guestId`:

```json
{
  "dayId": 1,
  "metadata": { "guestId": "abc-123" }
}
```

**Response (201):** Session object without `userId` association.

---

### GET `/sessions/my-sessions` — Get User Sessions

Returns all sessions for the authenticated user.

**Auth:** Required (JWT Bearer token)

**Response (200):** Array of session objects.

---

### GET `/sessions/guest-sessions?guestId=xxx` — Get Guest Sessions

Returns sessions for a specific guest ID.

**Auth:** Not required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestId` | string | Yes | The guest identifier |

**Response (200):** Array of session objects.

---

### POST `/sessions/:id/guess` — Submit a Guess

Submits a guess for an existing session. Updates attempt count and game status.

**Auth:** Required (JWT Bearer token)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Session ID |

**Request Body:**

```json
{
  "guess": "HELLO"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guess` | string | Yes | The word guess (must be valid length) |

**Response (200):** Updated session object with guess result appended.

**Errors:**
- `401 Unauthorized` — Missing or invalid JWT
- `404 Not Found` — Session not found
- `400 Bad Request` — Invalid guess, session already finalized, or attempt limit reached

---

## Authentication

Authenticated endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued by the auth system at `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.

## Session States

| State | Description |
|-------|-------------|
| `in_progress` | Session active, guesses can be submitted |
| `won` | Player guessed correctly |
| `lost` | All attempts exhausted without correct guess |
| `finalized` | Session completed and streak updated |

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid guess",
  "error": "Bad Request"
}
```
