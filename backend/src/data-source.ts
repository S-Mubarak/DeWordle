import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { TestEntity } from './entities/test.entity';
import { Word } from './entities/word.entity';
import { GameSession } from './game-sessions/entities/game-session.entity';
import { User } from './auth/entities/user.entity';
import { Game } from './games/entities/game.entity';
import { GuessHistory } from './game-sessions/entities/guess-history.entity';
import * as path from 'path';

const envPath = process.env.ENV_FILE_PATH
  ? path.resolve(process.cwd(), process.env.ENV_FILE_PATH)
  : process.env.NODE_ENV === 'production'
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(process.cwd(), '.env.development');

config({ path: envPath });

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: Number.parseInt(configService.get('DB_PORT') ?? '5432', 10),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  ssl:
    configService.get('DB_SSL') === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
  entities: [TestEntity, Word, Game, User, GameSession, GuessHistory],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  // DB-POOL-1210: graceful handling of connection pool exhaustion during
  // peak indexer activity. Acquisition timeout, query timeouts, and
  // connection recycling keep the pool from hanging under load.
  extra: {
    max: Number.parseInt(configService.get('DB_POOL_MAX') ?? '20', 10),
    min: Number.parseInt(configService.get('DB_POOL_MIN') ?? '2', 10),
    connectionTimeoutMillis: Number.parseInt(
      configService.get('DB_POOL_CONNECTION_TIMEOUT_MS') ?? '10000',
      10,
    ),
    idleTimeoutMillis: Number.parseInt(
      configService.get('DB_POOL_IDLE_TIMEOUT_MS') ?? '30000',
      10,
    ),
    statement_timeout: Number.parseInt(
      configService.get('DB_POOL_STATEMENT_TIMEOUT_MS') ?? '10000',
      10,
    ),
    query_timeout: Number.parseInt(
      configService.get('DB_POOL_QUERY_TIMEOUT_MS') ?? '10000',
      10,
    ),
    maxUses: Number.parseInt(
      configService.get('DB_POOL_MAX_USES') ?? '7500',
      10,
    ),
  },
});
