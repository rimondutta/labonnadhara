/**
 * Escapes special regex metacharacters in untrusted user strings
 * to protect against Regular Expression Denial of Service (ReDoS).
 *
 * @param s - The untrusted string to escape.
 * @returns A string safe to embed inside `new RegExp(...)`.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[$()*+.?[\\\]^{|}-]/g, '\\$&');
}

