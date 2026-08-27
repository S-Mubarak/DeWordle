import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/** HSTS max-age in seconds (1 year) — Issue #1212. */
export const HSTS_MAX_AGE_SECONDS = 31536000;

/**
 * Apply security headers to the API application (Issue #1212).
 *
 * Helmet injects the `Strict-Transport-Security` header with a one-year
 * max-age and `includeSubDomains` so browsers mandate HTTPS for the API
 * and all of its subdomains.
 */
export function applySecurityHeaders(app: INestApplication): void {
  app.use(
    helmet({
      hsts: {
        maxAge: HSTS_MAX_AGE_SECONDS,
        includeSubDomains: true,
      },
    }),
  );
}
