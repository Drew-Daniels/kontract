/**
 * Response helper functions for kontract adapters.
 *
 * These functions create namespaced response helpers (reply.*, error.*)
 * that are pre-typed based on the route's responses configuration.
 */
import type { TSchema } from '@sinclair/typebox'
import type { NormalizedResponses } from './adapter-types.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default error codes for each HTTP status.
 */
export const ERROR_CODES: Record<number, string> = {
  400: 'E_BAD_REQUEST',
  401: 'E_UNAUTHORIZED',
  403: 'E_FORBIDDEN',
  404: 'E_NOT_FOUND',
  409: 'E_CONFLICT',
  422: 'E_VALIDATION',
  429: 'E_TOO_MANY_REQUESTS',
  500: 'E_INTERNAL_SERVER_ERROR',
  503: 'E_SERVICE_UNAVAILABLE',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success helper (just wraps data with status).
 */
export function createSuccessHelper(status: number) {
  return (data: unknown) => ({ status, data })
}

/**
 * Create an error helper with smart defaults.
 * - No args: use description from response definition as message
 * - String passed: use as message, auto-fill status and code
 * - Object passed: merge with defaults (status, code, and description as message)
 */
export function createErrorHelper(status: number, defaultCode: string, defaultMessage: string) {
  return (dataOrMessage?: unknown) => {
    // No args: error.internal() - use description as default message
    if (dataOrMessage === undefined) {
      return {
        status,
        data: { status, code: defaultCode, message: defaultMessage },
      }
    }
    // String shorthand: error.badRequest('Invalid token')
    if (typeof dataOrMessage === 'string') {
      return {
        status,
        data: { status, code: defaultCode, message: dataOrMessage },
      }
    }
    // Object: merge with defaults
    const data = dataOrMessage as Record<string, unknown>
    return {
      status,
      data: {
        status,
        code: defaultCode,
        message: defaultMessage, // Default from description
        ...data, // User can override
      },
    }
  }
}

/**
 * Get the default error message for a status code.
 * Priority: explicit description > schema description > generic fallback
 */
export function getErrorMessage(
  responses: NormalizedResponses,
  status: number,
  fallback: string,
): string {
  const response = responses[status]
  return response?.description
    ?? (response?.schema as TSchema & { description?: string } | null)?.description
    ?? fallback
}

/**
 * Create namespaced response helper functions bound to the route's response schemas.
 * These helpers don't need the schema passed - they're pre-typed at compile time.
 *
 * Returns `{ reply, error }` namespaces:
 * - `reply` contains success helpers (ok, created, accepted, noContent, list)
 * - `error` contains error helpers with smart defaults (uses schema description as default message)
 */
export function createResponseHelpers(responses: NormalizedResponses) {
  return {
    // Success responses namespace (2xx)
    reply: {
      ok: createSuccessHelper(200),
      created: createSuccessHelper(201),
      accepted: createSuccessHelper(202),
      noContent: () => ({ status: 204 as const, data: null }),
      list: createSuccessHelper(200),
    },
    // Error responses namespace (4xx/5xx) - with smart defaults
    // Default message: explicit description > schema.description > generic fallback
    error: {
      badRequest: createErrorHelper(400, ERROR_CODES[400], getErrorMessage(responses, 400, 'Bad request')),
      unauthorized: createErrorHelper(401, ERROR_CODES[401], getErrorMessage(responses, 401, 'Unauthorized')),
      forbidden: createErrorHelper(403, ERROR_CODES[403], getErrorMessage(responses, 403, 'Forbidden')),
      notFound: createErrorHelper(404, ERROR_CODES[404], getErrorMessage(responses, 404, 'Not found')),
      conflict: createErrorHelper(409, ERROR_CODES[409], getErrorMessage(responses, 409, 'Conflict')),
      validationError: createErrorHelper(422, ERROR_CODES[422], getErrorMessage(responses, 422, 'Validation failed')),
      tooManyRequests: createErrorHelper(429, ERROR_CODES[429], getErrorMessage(responses, 429, 'Too many requests')),
      internal: createErrorHelper(500, ERROR_CODES[500], getErrorMessage(responses, 500, 'Internal server error')),
      serviceUnavailable: createErrorHelper(503, ERROR_CODES[503], getErrorMessage(responses, 503, 'Service unavailable')),
    },
  }
}
