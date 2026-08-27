# Contributor Troubleshooting Guide

Common issues when setting up the local development environment.

## PostgreSQL

### Cannot connect to PostgreSQL
- Ensure Docker is running: `docker ps`
- Start the DB: `docker compose up -d postgres`
- Default port: 5432, user: `postgres`, password: `postgres`

### Migration errors
```bash
npx prisma migrate dev
```
If it fails, reset: `npx prisma migrate reset`

## Redis

### Redis connection refused
- Start Redis: `docker compose up -d redis`
- Default port: 6379
- Test: `redis-cli ping` (should return PONG)

### Session not persisting
- Check `REDIS_URL` in your `.env` file.
- Example: `REDIS_URL=redis://localhost:6379`

## Environment Variables

Copy the example env file and fill in values:
```bash
cp .env.example .env
```

## Port Conflicts

If port 5432 or 6379 is in use:
```bash
# Find process
netstat -ano | findstr :5432
# Kill it or change the port in docker-compose.yml
```

## Still stuck?
Open an issue or ask in the project Discord.