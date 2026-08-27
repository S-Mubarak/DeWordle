import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { applySecurityHeaders, HSTS_MAX_AGE_SECONDS } from './security-headers';

@Controller()
class ProbeController {
  @Get()
  root() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('applySecurityHeaders (Issue #1212)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applySecurityHeaders(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('injects the Strict-Transport-Security header with max-age and includeSubDomains', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(
        'strict-transport-security',
        `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
      );
  });
});
