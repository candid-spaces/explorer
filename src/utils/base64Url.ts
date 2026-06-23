/**
 * Converts a standard Base64 string to a URL-safe Base64 string.
 * - Replaces '+' with '-'
 * - Replaces '/' with '_'
 * - Strips trailing '=' padding characters
 */
export function toUrlSafeBase64(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converts a URL-safe Base64 string back to standard Base64.
 * - Replaces '-' with '+'
 * - Replaces '_' with '/'
 * - Restores trailing '=' padding characters based on string length
 */
export function fromUrlSafeBase64(urlSafeBase64: string): string {
  const base64 = urlSafeBase64
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padLength = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padLength);
}
