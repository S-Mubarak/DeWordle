# User Authentication & Token Refresh API

## POST /api/auth/login

Authenticate a user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response 200:**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<uuid>",
  "expiresIn": 3600
}
```

## POST /api/auth/refresh

Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "<uuid>"
}
```

**Response 200:**
```json
{
  "accessToken": "<new_jwt>",
  "expiresIn": 3600
}
```

## POST /api/auth/logout

Invalidate the current refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Response 204:** No content.

## Error Codes

| Code | Meaning |
|------|---------|
| 401  | Invalid credentials or expired token |
| 403  | Token revoked |