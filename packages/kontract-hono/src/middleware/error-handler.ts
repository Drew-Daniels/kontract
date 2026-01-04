import type { Context, ErrorHandler } from 'hono'
import { AjvValidationError } from '@kontract/ajv'

/**
 * Error with HTTP status code.
 */
interface HttpError extends Error {
  status?: number
  statusCode?: number
  code?: string
}

/**
 * Options for the error handler.
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to log errors to console.
   * Default: true in development, false in production.
   */
  logErrors?: boolean

  /**
   * Whether to include stack traces in error responses.
   * Default: true in development, false in production.
   */
  includeStack?: boolean

  /**
   * Custom error handler for unhandled errors.
   */
  onError?: (error: Error, c: Context) => void
}

/**
 * Create a Hono error handler for the decorator system.
 *
 * Handles:
 * - AjvValidationError → 422 Unprocessable Entity
 * - Errors with status 401 → Unauthorized
 * - Errors with status 403 → Forbidden
 * - Errors with status 404 → Not Found
 * - All other errors → 500 Internal Server Error
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { createErrorHandler } from '@kontract/hono'
 *
 * const app = new Hono()
 *
 * // ... routes ...
 *
 * // Register error handler
 * app.onError(createErrorHandler())
 * ```
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandler {
  const isDev = process.env.NODE_ENV !== 'production'
  const logErrors = options.logErrors ?? isDev
  const includeStack = options.includeStack ?? isDev

  return (err: Error, c: Context): Response => {
    // Log the error if enabled
    if (logErrors) {
      console.error('Error:', err)
    }

    // Call custom error handler if provided
    if (options.onError) {
      options.onError(err, c)
    }

    const httpError = err as HttpError
    const status = httpError.status ?? httpError.statusCode ?? 500

    // Handle validation errors
    if (err instanceof AjvValidationError) {
      return c.json({
        status: 422,
        code: 'E_VALIDATION',
        message: err.message,
        errors: err.errors,
      }, 422)
    }

    // Handle errors with status codes
    if (status === 401) {
      return c.json({
        status: 401,
        code: httpError.code ?? 'E_UNAUTHORIZED',
        message: err.message || 'Unauthorized',
      }, 401)
    }

    if (status === 403) {
      return c.json({
        status: 403,
        code: httpError.code ?? 'E_FORBIDDEN',
        message: err.message || 'Forbidden',
      }, 403)
    }

    if (status === 404) {
      return c.json({
        status: 404,
        code: httpError.code ?? 'E_NOT_FOUND',
        message: err.message || 'Not Found',
      }, 404)
    }

    if (status === 409) {
      return c.json({
        status: 409,
        code: httpError.code ?? 'E_CONFLICT',
        message: err.message || 'Conflict',
      }, 409)
    }

    if (status === 429) {
      return c.json({
        status: 429,
        code: httpError.code ?? 'E_RATE_LIMITED',
        message: err.message || 'Too Many Requests',
      }, 429)
    }

    // Default: Internal Server Error
    const errorResponse: Record<string, unknown> = {
      status: 500,
      code: httpError.code ?? 'E_INTERNAL',
      message: isDev ? err.message : 'Internal Server Error',
    }

    if (includeStack && err.stack) {
      errorResponse.stack = err.stack
    }

    return c.json(errorResponse, 500)
  }
}
