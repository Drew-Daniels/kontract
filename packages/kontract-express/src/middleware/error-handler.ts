import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
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
  onError?: (error: Error, req: Request, res: Response) => void
}

/**
 * Create an Express error handler middleware for the decorator system.
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
 * import express from 'express'
 * import { createErrorHandler } from '@kontract/express'
 *
 * const app = express()
 *
 * // ... routes ...
 *
 * // Error handler must be last
 * app.use(createErrorHandler())
 * ```
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
  const isDev = process.env.NODE_ENV !== 'production'
  const logErrors = options.logErrors ?? isDev
  const includeStack = options.includeStack ?? isDev

  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log the error if enabled
    if (logErrors) {
      console.error('Error:', err)
    }

    // Call custom error handler if provided
    if (options.onError) {
      options.onError(err, req, res)
    }

    // Don't send response if already sent
    if (res.headersSent) {
      return
    }

    const httpError = err as HttpError
    const status = httpError.status ?? httpError.statusCode ?? 500

    // Handle validation errors
    if (err instanceof AjvValidationError) {
      res.status(422).json({
        status: 422,
        code: 'E_VALIDATION',
        message: err.message,
        errors: err.errors,
      })
      return
    }

    // Handle errors with status codes
    if (status === 401) {
      res.status(401).json({
        status: 401,
        code: httpError.code ?? 'E_UNAUTHORIZED',
        message: err.message || 'Unauthorized',
      })
      return
    }

    if (status === 403) {
      res.status(403).json({
        status: 403,
        code: httpError.code ?? 'E_FORBIDDEN',
        message: err.message || 'Forbidden',
      })
      return
    }

    if (status === 404) {
      res.status(404).json({
        status: 404,
        code: httpError.code ?? 'E_NOT_FOUND',
        message: err.message || 'Not Found',
      })
      return
    }

    if (status === 409) {
      res.status(409).json({
        status: 409,
        code: httpError.code ?? 'E_CONFLICT',
        message: err.message || 'Conflict',
      })
      return
    }

    if (status === 429) {
      res.status(429).json({
        status: 429,
        code: httpError.code ?? 'E_RATE_LIMITED',
        message: err.message || 'Too Many Requests',
      })
      return
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

    res.status(500).json(errorResponse)
  }
}
