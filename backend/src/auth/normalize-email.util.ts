/**
 * Normalizes an email address to prevent duplicate registrations
 * caused by different letter casing (e.g. User@Example.com vs user@example.com).
 */
export function normalizeEmail(email: string): string {
  if (!email) return email;
  const [local, domain] = email.split("@");
  if (!domain) return email.toLowerCase();
  // RFC 5321: local part is case-sensitive, but in practice most providers treat it as case-insensitive
  return `${local.toLowerCase()}@${domain.toLowerCase()}`;
}

/**
 * Compares two email addresses case-insensitively.
 */
export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}