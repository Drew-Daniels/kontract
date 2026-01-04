import type { Context, Next, Middleware } from 'koa'
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
  onError?: (error: Error, ctx: Context) => void
}

/**
 * Create a Koa error handler middleware for the kontract system.
 *
 * IMPORTANT: This middleware should be registered FIRST (before routes)
 * so it can wrap all downstream middleware in a try/catch.
 *
 * Handles:
 * - AjvValidationError -> 422 Unprocessable Entity
 * - Errors with status 401 -> Unauthorized
 * - Errors with status 403 -> Forbidden
 * - Errors with status 404 -> Not Found
 * - All other errors -> 500 Internal Server Error
 *
 * @example
 * ```typescript
 * import Koa from 'koa'
 * import Router from '@koa/router'
 * import { createErrorHandler, registerController } from '@kontract/koa'
 *
 * const app = new Koa()
 * const router = new Router()
 *
 * // Error handler FIRST (wraps everything in try/catch)
 * app.use(createErrorHandler())
 *
 * registerController(router, usersController)
 * app.use(router.routes())
 * ```
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}): Middleware {
  const isDev = process.env.NODE_ENV !== 'production'
  const logErrors = options.logErrors ?? isDev
  const includeStack = options.includeStack ?? isDev

  return async (ctx: Context, next: Next) => {
    try {
      await next()
    } catch (err) {
      const error = err as HttpError

      // Log the error if enabled
      if (logErrors) {
        console.error('Error:', error)
      }

      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error, ctx)
      }

      const status = error.status ?? error.statusCode ?? 500

      // Handle validation errors
      if (error instanceof AjvValidationError) {
        ctx.status = 422
        ctx.body = {
          status: 422,
          code: 'E_VALIDATION',
          message: error.message,
          errors: error.errors,
        }
        return
      }

      // Handle errors with status codes
      if (status === 401) {
        ctx.status = 401
        ctx.body = {
          status: 401,
          code: error.code ?? 'E_UNAUTHORIZED',
          message: error.message || 'Unauthorized',
        }
        return
      }

      if (status === 403) {
        ctx.status = 403
        ctx.body = {
          status: 403,
          code: error.code ?? 'E_FORBIDDEN',
          message: error.message || 'Forbidden',
        }
        return
      }

      if (status === 404) {
        ctx.status = 404
        ctx.body = {
          status: 404,
          code: error.code ?? 'E_NOT_FOUND',
          message: error.message || 'Not Found',
        }
        return
      }

      if (status === 409) {
        ctx.status = 409
        ctx.body = {
          status: 409,
          code: error.code ?? 'E_CONFLICT',
          message: error.message || 'Conflict',
        }
        return
      }

      if (status === 429) {
        ctx.status = 429
        ctx.body = {
          status: 429,
          code: error.code ?? 'E_RATE_LIMITED',
          message: error.message || 'Too Many Requests',
        }
        return
      }

      // Default: Internal Server Error
      const errorResponse: Record<string, unknown> = {
        status: 500,
        code: error.code ?? 'E_INTERNAL',
        message: isDev ? error.message : 'Internal Server Error',
      }

      if (includeStack && error.stack) {
        errorResponse.stack = error.stack
      }

      ctx.status = 500
      ctx.body = errorResponse
    }
  }
}
