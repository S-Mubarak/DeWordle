import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { JwtStrategy } from './jwt-strategy';

describe('SEC-1220: JwtStrategy payload validation', () => {
  const userService = {
    findById: jest.fn(),
  } as unknown as UserService;

  const configService = {
    get: jest.fn((key: string) =>
      key === 'JWT_SECRET' ? 'test-secret' : undefined,
    ),
  } as unknown as ConfigService;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(userService, configService);
  });

  it('accepts a well-formed payload and loads the user', async () => {
    userService.findById = jest.fn().mockResolvedValue({ id: 1 });
    const user = await strategy.validate({
      sub: 1,
      email: 'player@example.com',
      roles: ['user'],
    });
    expect(user).toEqual({ id: 1 });
    expect(userService.findById).toHaveBeenCalledWith(1);
  });

  it('rejects a payload missing sub', async () => {
    await expect(
      strategy.validate({ email: 'player@example.com', roles: ['user'] }),
    ).rejects.toThrow(UnauthorizedException);
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('rejects a payload missing email', async () => {
    await expect(
      strategy.validate({ sub: 1, roles: ['user'] }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a payload missing roles', async () => {
    await expect(
      strategy.validate({ sub: 1, email: 'player@example.com' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a payload with a malformed email', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        email: 'not-an-email',
        roles: ['user'],
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a payload with a non-numeric sub', async () => {
    await expect(
      strategy.validate({
        sub: 'one',
        email: 'player@example.com',
        roles: ['user'],
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a payload with non-array roles', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        email: 'player@example.com',
        roles: 'user',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns null when the user no longer exists', async () => {
    userService.findById = jest.fn().mockResolvedValue(null);
    await expect(
      strategy.validate({
        sub: 999,
        email: 'ghost@example.com',
        roles: ['user'],
      }),
    ).resolves.toBeNull();
  });
});
