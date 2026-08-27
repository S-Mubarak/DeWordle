import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class LeaderboardRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip: string =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (entry.count >= MAX_REQUESTS) {
      throw new HttpException("Too Many Requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count += 1;
    return true;
  }
}