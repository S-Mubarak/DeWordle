import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestEntity } from './entities/test.entity';
import { SessionProjectionEntity } from './indexer/entities/session-projection.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GamesModule } from './games/games.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { WordsModule } from './dewordle/words/words.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsModule } from './dewordle/metrics/metrics.module';
import { MetricsController } from './dewordle/metrics/metrics.controller';
import { IndexerModule } from './indexer/indexer.module';
import { ReadApiController } from './common/read-api.controller';
import { DeprecationController } from './common/deprecation.controller';
import { WalletRateLimitGuard } from './common/rate-limit.guard';
import { AppCacheModule } from './common/cache.module';
import { CacheMetricsService } from './common/cache-metrics.service';
import { CacheLoggerService } from './common/cache-logger.service';
import { VersioningModule } from './common/versioning.module';
import { JobModule } from './common/job.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      load: [databaseConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_AUTH') ?? '5',
              10,
            ),
          },
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_GAME_SESSIONS') ?? '30',
              10,
            ),
          },
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_READ_API') ?? '100',
              10,
            ),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    GameSessionsModule,
    // Issue #1221: TypeORM options now come from the dedicated
    // database config factory (src/config/database.config.ts).
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const database =
          configService.get<ReturnType<typeof databaseConfig>>('database');
        if (!database) {
          throw new Error('Database configuration is not loaded');
        }
        return database;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TestEntity, SessionProjectionEntity]),
    AuthModule,
    UserModule,
    GamesModule,
    WordsModule,
    MetricsModule,
    IndexerModule,
    AppCacheModule,
    VersioningModule,
    JobModule,
    AdminModule,
  ],
  controllers: [
    AppController,
    MetricsController,
    ReadApiController,
    DeprecationController,
  ],
  providers: [
    AppService,
    CacheLoggerService,
    CacheMetricsService,
    {
      provide: 'APP_GUARD',
      useClass: WalletRateLimitGuard,
    },
  ],
})
export class AppModule {}
