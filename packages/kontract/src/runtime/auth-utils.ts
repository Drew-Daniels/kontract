/**
 * Auth-related runtime helpers shared by adapters.
 */

/**
 * Check if an error represents an authentication/authorization failure.
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown }
  return status === 401 || status === 403 || statusCode === 401 || statusCode === 403
}
