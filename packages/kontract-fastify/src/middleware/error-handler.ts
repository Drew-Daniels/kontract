/**
 * Fastify error handler for kontract.
 *
 * Handles Fastify's native validation errors and normalizes them to the
 * standard API error format used by other adapters.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError, FastifySchemaValidationError } from 'fastify'

export interface ErrorHandlerOptions {
  /** Log errors to console (default: true in dev, false in prod) */
  logErrors?: boolean
  /** Include stack traces in error responses (default: true in dev, false in prod) */
  includeStack?: boolean
  /** Custom error callback */
  onError?: (error: Error, request: FastifyRequest) => void
}

interface FastifyValidationError extends FastifyError {
  validation?: FastifySchemaValidationError[]
}

/**
 * Register error handler on a Fastify instance.
 *
 * IMPORTANT: This should be called BEFORE registering routes to ensure
 * all errors are handled properly.
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify'
 * import { registerErrorHandler, registerController } from '@kontract/fastify'
 * import { usersController } from './controllers/users.js'
 *
 * const app = Fastify()
 *
 * // Register error handler FIRST
 * registerErrorHandler(app, { logErrors: true })
 *
 * // Then register routes
 * registerController(app, usersController)
 * ```
 */
export function registerErrorHandler(
  app: FastifyInstance,
  options: ErrorHandlerOptions = {},
): void {
  const isDev = process.env.NODE_ENV !== 'production'
  const logErrors = options.logErrors ?? isDev
  const includeStack = options.includeStack ?? isDev

  app.setErrorHandler((error: FastifyValidationError, request: FastifyRequest, reply: FastifyReply) => {
    if (logErrors) {
      console.error('Error:', error)
    }

    options.onError?.(error, request)

    // Handle Fastify validation errors
    // These have error.validation array with AJV error objects
    if (error.validation) {
      const errors = error.validation.map((v) => {
        // Determine the field name
        let field: string
        const missingProperty = v.params?.missingProperty as string | undefined
        if (missingProperty) {
          // For required property errors
          const prefix = v.instancePath ? v.instancePath.replace(/^\//, '').replace(/\//g, '.') + '.' : ''
          field = prefix + missingProperty
        } else if (v.instancePath) {
          // For type/format errors on specific fields
          field = v.instancePath.replace(/^\//, '').replace(/\//g, '.')
        } else {
          field = 'unknown'
        }

        return {
          field,
          message: v.message ?? 'Validation failed',
        }
      })

      return reply.status(422).send({
        status: 422,
        code: 'E_VALIDATION',
        message: 'Validation failed',
        errors,
      })
    }

    // Handle statusCode from thrown errors
    const statusCode = error.statusCode ?? 500

    const codes: Record<number, string> = {
      400: 'E_BAD_REQUEST',
      401: 'E_UNAUTHORIZED',
      403: 'E_FORBIDDEN',
      404: 'E_NOT_FOUND',
      409: 'E_CONFLICT',
      422: 'E_VALIDATION',
      429: 'E_RATE_LIMITED',
    }

    const response: Record<string, unknown> = {
      status: statusCode,
      code: codes[statusCode] ?? 'E_INTERNAL',
      message: statusCode < 500 ? error.message : (isDev ? error.message : 'Internal Server Error'),
    }

    if (includeStack && error.stack) {
      response.stack = error.stack
    }

    return reply.status(statusCode).send(response)
  })
}
