import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AUTH_THROTTLE } from '../common/guards/throttle.config';
import { WalletRateLimitGuard } from '../common/rate-limit.guard';

const THROTTLER_TTL = 'THROTTLER:TTL';
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';

describe('Auth endpoint rate limiting (#1218)', () => {
  it('should apply @Throttle to POST /auth/signup with 5 requests per 15 minutes', () => {
    const signupHandler = AuthController.prototype.signup as unknown;
    const ttl = Reflect.getMetadata(THROTTLER_TTL + 'auth', signupHandler);
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + 'auth', signupHandler);
    expect(ttl).toBe(15 * 60 * 1000);
    expect(limit).toBe(5);
    expect(AUTH_THROTTLE).toEqual({
      auth: { limit: 5, ttl: 15 * 60 * 1000 },
    });
  });

  it('should apply @Throttle to POST /auth/forgot-password with 5 requests per 15 minutes', () => {
    const forgotHandler = AuthController.prototype.forgotPassword as unknown;
    const ttl = Reflect.getMetadata(THROTTLER_TTL + 'auth', forgotHandler);
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + 'auth', forgotHandler);
    expect(ttl).toBe(15 * 60 * 1000);
    expect(limit).toBe(5);
  });

  describe('WalletRateLimitGuard execution', () => {
    let guard: WalletRateLimitGuard;
    let storage: jest.Mocked<ThrottlerStorage>;

    const makeContext = () => {
      const req = { ip: '203.0.113.7', body: {}, user: undefined };
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => ({ header: jest.fn() }),
        }),
        getHandler: () =>
          AuthController.prototype.signup as unknown,
        getClass: () => AuthController,
      } as unknown as ExecutionContext;
      return ctx;
    };

    beforeEach(async () => {
      storage = {
        increment: jest.fn(),
      };
      guard = new WalletRateLimitGuard(
        {
          throttlers: [
            { name: 'default', ttl: 60_000, limit: 100 },
            { name: 'auth', ttl: 15 * 60 * 1000, limit: 5 },
          ],
        },
        storage,
        new Reflector(),
      );
      await guard.onModuleInit();
    });

    it('should allow requests while the limit is not exceeded', async () => {
      storage.increment.mockResolvedValue({
        totalHits: 3,
        timeToExpire: 800_000,
        isBlocked: false,
        timeToBlockExpire: 0,
      });

      const ctx = makeContext();
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(storage.increment).toHaveBeenCalled();
    });

    it('should throw 429 Too Many Requests when the limit is exceeded', async () => {
      storage.increment.mockResolvedValue({
        totalHits: 5,
        timeToExpire: 800_000,
        isBlocked: true,
        timeToBlockExpire: 800_000,
      });

      const ctx = makeContext();
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        ThrottlerException,
      );
    });
  });
});
