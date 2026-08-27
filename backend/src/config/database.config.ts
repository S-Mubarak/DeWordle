import { registerAs } from '@nestjs/config';

/**
 * Centralized TypeORM database configuration (Issue #1221).
 *
 * Loads connection parameters from environment variables with sensible
 * defaults so AppModule (and any script) consumes a single source of truth.
 */
export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  synchronize: boolean;
  logging: boolean;
  entities: string[];
  migrations: string[];
  migrationsTableName: string;
  retryAttempts: number;
  retryDelay: number;
}

export default registerAs('database', (): DatabaseConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'dewordle',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: nodeEnv === 'development',
    logging: nodeEnv === 'development',
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    // Retry transient connection failures during startup (TypeORM built-in).
    retryAttempts: Number.parseInt(process.env.DB_RETRY_ATTEMPTS ?? '10', 10),
    retryDelay: Number.parseInt(process.env.DB_RETRY_DELAY_MS ?? '2000', 10),
  };
});
