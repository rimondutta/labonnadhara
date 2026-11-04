/**
 * Safe API error response helper.
 *
 * In production, raw error messages must never be exposed to API consumers —
 * they may contain database schema details, file paths, or connection strings.
 * Internal details are always preserved in server-side logs via console.error.
 */

/** Error class names whose messages are pre-sanitised and safe to surface. */
const SAFE_ERROR_CLASSES = new Set([
  'ZodError',
  'ValidationError', // Mongoose validation errors
]);

/**
 * Returns a client-safe error message string.
 *
 * - In development: returns the full error.message for easier debugging.
 * - In production: returns a generic message unless the error class is on the
 *   safe allowlist.
 */
export function getSafeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV !== 'production') {
    return error instanceof Error ? error.message : String(error);
  }

  if (error instanceof Error && SAFE_ERROR_CLASSES.has(error.constructor.name)) {
    return error.message;
  }

  return 'Internal Server Error';
}

/**
 * Logs the full error server-side and returns a sanitised error payload
 * suitable for JSON API responses.
 *
 * @param error   The caught error (unknown type).
 * @param context A label for the log message, e.g. 'GET /api/admin/products'.
 */
export function logAndSanitize(
  error: unknown,
  context: string,
): { error: string } {
  console.error(`[${context}]`, error);
  return { error: getSafeErrorMessage(error) };
}

