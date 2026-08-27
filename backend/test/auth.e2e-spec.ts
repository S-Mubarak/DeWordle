import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/user/user.service';
import { PasswordReset } from '../src/auth/entities/password-reset.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { AuthSession } from '../src/auth/entities/auth-session.entity';
import { EmailService } from '../src/auth/email.service';
import { RefreshTokenService } from '../src/auth/refresh-token.service';

const JWT_TEST_SECRET = 'e2e-test-secret';

interface StoredUser {
  id: number;
  email: string;
  password: string;
  username: string;
  role: 'user' | 'admin';
}

interface StoredRefreshToken {
  id: number;
  tokenHash: string;
  walletAddress: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent?: string;
  ipAddress?: string;
  user?: StoredUser;
}

interface StoredAuthSession {
  id: number;
  walletAddress: string;
  isActive: boolean;
  createdAt: Date;
  user?: StoredUser;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let users: Map<string, StoredUser>;
  let refreshTokens: Map<string, StoredRefreshToken>;
  let sessions: Map<string, StoredAuthSession>;
  let nextId: () => number;

  const makeUserService = () => ({
    findByEmail: jest.fn(async (email: string) => {
      const user = users.get(email.toLowerCase().trim());
      return user ? { ...user } : null;
    }),
    findByUserName: jest.fn(async (username: string) => {
      for (const user of users.values()) {
        if (user.username === username) return { ...user };
      }
      return null;
    }),
    findById: jest.fn(async (id: number) => {
      for (const user of users.values()) {
        if (user.id === id) return { ...user };
      }
      return null;
    }),
    create: jest.fn(async (dto: Partial<StoredUser>) => {
      const user: StoredUser = {
        id: nextId(),
        email: (dto.email as string).toLowerCase().trim(),
        password: dto.password as string,
        username: dto.username as string,
        role: (dto.role as 'user') ?? 'user',
      };
      users.set(user.email, user);
      return { ...user };
    }),
  });

  const makeRefreshTokenRepo = () => ({
    create: jest.fn((dto: Partial<StoredRefreshToken>) => ({
      id: nextId(),
      ...dto,
    })),
    save: jest.fn(async (token: StoredRefreshToken) => {
      const existing = refreshTokens.get(token.tokenHash);
      if (existing) {
        Object.assign(existing, token);
        return { ...existing };
      }
      const stored = { ...token };
      refreshTokens.set(stored.tokenHash, stored);
      return { ...stored };
    }),
    findOne: jest.fn(async (opts: {
      where: {
        tokenHash?: string;
        expiresAt?: unknown;
        revokedAt?: null;
      };
      relations?: string[];
    }) => {
      const { tokenHash, expiresAt, revokedAt } = opts.where;
      for (const token of refreshTokens.values()) {
        if (tokenHash !== undefined && token.tokenHash !== tokenHash) continue;
        if (revokedAt === null && token.revokedAt != null) continue;
        if (expiresAt !== undefined) {
          const operator = expiresAt as { value: Date };
          if (!(token.expiresAt > operator.value)) continue;
        }
        const result = { ...token };
        if (opts.relations?.includes('user') && token.user) {
          result.user = { ...token.user };
        }
        return result;
      }
      return null;
    }),
    update: jest.fn(async (criteria: unknown, patch: Partial<StoredRefreshToken>) => {
      for (const token of refreshTokens.values()) {
        if (
          criteria &&
          typeof criteria === 'object' &&
          'tokenHash' in criteria &&
          (criteria as { tokenHash: string }).tokenHash === token.tokenHash
        ) {
          Object.assign(token, patch);
        }
      }
      return { affected: 1 };
    }),
    delete: jest.fn(async () => ({ affected: 0 })),
  });

  const makeAuthSessionRepo = () => ({
    create: jest.fn((dto: Partial<StoredAuthSession>) => ({
      id: nextId(),
      isActive: true,
      createdAt: new Date(),
      ...dto,
    })),
    save: jest.fn(async (session: StoredAuthSession) => {
      const key = String(session.id);
      sessions.set(key, { ...session });
      return { ...session };
    }),
    find: jest.fn(async (opts: {
      where: { walletAddress: string; isActive: boolean };
      order?: { createdAt: 'ASC' | 'DESC' };
    }) => {
      const results: StoredAuthSession[] = [];
      for (const session of sessions.values()) {
        if (session.walletAddress === opts.where.walletAddress &&
            session.isActive === opts.where.isActive) {
          results.push({ ...session });
        }
      }
      results.sort((a, b) =>
        opts.order?.createdAt === 'DESC'
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : a.createdAt.getTime() - b.createdAt.getTime(),
      );
      return results;
    }),
    update: jest.fn(async () => ({ affected: 1 })),
  });

  beforeEach(async () => {
    users = new Map();
    refreshTokens = new Map();
    sessions = new Map();
    let counter = 1;
    nextId = () => counter++;

    const userService = makeUserService();
    const refreshTokenRepo = makeRefreshTokenRepo();
    const authSessionRepo = makeAuthSessionRepo();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: JWT_TEST_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: getRepositoryToken(PasswordReset), useValue: {} },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(AuthSession), useValue: authSessionRepo },
        {
          provide: EmailService,
          useValue: { sendMail: jest.fn().mockResolvedValue(true) },
        },
        RefreshTokenService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const seedUser = async (email: string, password: string) => {
    const hashed = await bcrypt.hash(password, 4);
    const user: StoredUser = {
      id: nextId(),
      email: email.toLowerCase().trim(),
      password: hashed,
      username: 'tester',
      role: 'user',
    };
    users.set(user.email, user);
    return user;
  };

  it('POST /auth/login returns access and refresh tokens for valid credentials', async () => {
    await seedUser('player@example.com', 'password123');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.access_token).toBeDefined();
    expect(typeof response.body.access_token).toBe('string');
    expect(response.body.refresh_token).toBeDefined();
    expect(typeof response.body.refresh_token).toBe('string');
    expect(response.body.user.email).toBe('player@example.com');
  });

  it('POST /auth/login rejects invalid credentials with 401', async () => {
    await seedUser('player@example.com', 'password123');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login rejects unknown emails with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' })
      .expect(401);
  });

  it('POST /auth/refresh rotates tokens for a valid refresh token', async () => {
    await seedUser('player@example.com', 'password123');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: 'password123' })
      .expect(200);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refresh_token })
      .expect(200);

    expect(refreshResponse.body.access_token).toBeDefined();
    expect(refreshResponse.body.refresh_token).toBeDefined();
    expect(refreshResponse.body.refresh_token).not.toBe(
      loginResponse.body.refresh_token,
    );
  });

  it('POST /auth/refresh rejects an expired refresh token with 401', async () => {
    await seedUser('player@example.com', 'password123');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@example.com', password: 'password123' })
      .expect(200);

    // Expire the stored token so validation must fail.
    const tokenHash = crypto
      .createHash('sha256')
      .update(loginResponse.body.refresh_token as string)
      .digest('hex');
    const stored = refreshTokens.get(tokenHash);
    expect(stored).toBeDefined();
    stored.expiresAt = new Date(Date.now() - 60_000);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refresh_token })
      .expect(401);
  });

  it('POST /auth/refresh rejects an unknown token with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'totally-made-up-token' })
      .expect(401);
  });
});
