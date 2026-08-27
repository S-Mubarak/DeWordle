const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "privateKey",
  "ssn",
  "creditCard",
]);

const MASK = "***REDACTED***";

/**
 * Recursively masks sensitive fields in an object before audit logging.
 */
export function sanitizeForAuditLog(data: unknown): unknown {
  if (data === null || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeForAuditLog);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.has(key) ? MASK : sanitizeForAuditLog(value);
  }
  return result;
}