import type { TSchema, Static } from '@sinclair/typebox'
import type { ApiResponse, BinaryResponse, ApiErrorBody } from './types.js'
import { ErrorCodes } from './types.js'
import { ResponseValidationError, type ValidationErrorDetail } from '../errors/validation.js'

/**
 * Configuration for response helpers.
 * Set by the framework configuration.
 */
export interface ResponseConfig {
  /**
   * Whether to validate responses at runtime.
   * Recommended: true in development, false in production.
   */
  validateResponses: boolean

  /**
   * Validator function for response data.
   * Should throw or return errors array on failure.
   */
  validator?: (schema: TSchema, data: unknown) => ValidationErrorDetail[] | void
}

let config: ResponseConfig = {
  validateResponses: false,
}

/**
 * Configure response helpers.
 * Called by the framework adapter during setup.
 */
export function configureResponses(newConfig: Partial<ResponseConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * Get current response configuration.
 */
export function getResponseConfig(): ResponseConfig {
  return config
}

/**
 * Core response builder with optional runtime validation.
 *
 * In development (validateResponses: true), validates that the data matches
 * the schema to catch contract violations early.
 */
export function respond<TStatus extends number, TResponseSchema extends TSchema>(
  status: TStatus,
  schema: TResponseSchema,
  data: Static<TResponseSchema>,
): ApiResponse<TStatus, Static<TResponseSchema>> {
  if (config.validateResponses && config.validator) {
    // Validate the serialized form (what actually gets sent)
    const serialized = JSON.parse(JSON.stringify(data))
    const errors = config.validator(schema, serialized)
    if (errors && errors.length > 0) {
      throw new ResponseValidationError(schema, data, errors)
    }
  }

  return { status, data }
}

// ============ Success Helpers ============

/**
 * Return 200 OK with validated response body.
 */
export function ok<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<200, Static<T>> {
  return respond(200, schema, data)
}

/**
 * Return 201 Created with validated response body.
 */
export function created<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<201, Static<T>> {
  return respond(201, schema, data)
}

/**
 * Return 202 Accepted with validated response body.
 */
export function accepted<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<202, Static<T>> {
  return respond(202, schema, data)
}

/**
 * Return 204 No Content.
 */
export function noContent(): ApiResponse<204, null> {
  return { status: 204, data: null }
}

// ============ Error Helpers ============

/**
 * Return 400 Bad Request.
 */
export function badRequest<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<400, Static<T>> {
  return respond(400, schema, data)
}

/**
 * Return 401 Unauthorized.
 */
export function unauthorized<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<401, Static<T>> {
  return respond(401, schema, data)
}

/**
 * Return 403 Forbidden.
 */
export function forbidden<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<403, Static<T>> {
  return respond(403, schema, data)
}

/**
 * Return 404 Not Found.
 */
export function notFound<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<404, Static<T>> {
  return respond(404, schema, data)
}

/**
 * Return 409 Conflict.
 */
export function conflict<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<409, Static<T>> {
  return respond(409, schema, data)
}

/**
 * Return 422 Unprocessable Entity (validation errors).
 */
export function unprocessableEntity<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<422, Static<T>> {
  return respond(422, schema, data)
}

/**
 * Return 429 Too Many Requests.
 */
export function tooManyRequests<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<429, Static<T>> {
  return respond(429, schema, data)
}

/**
 * Return 500 Internal Server Error.
 */
export function internalServerError<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<500, Static<T>> {
  return respond(500, schema, data)
}

/**
 * Return 502 Bad Gateway.
 */
export function badGateway<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<502, Static<T>> {
  return respond(502, schema, data)
}

/**
 * Return 503 Service Unavailable.
 */
export function serviceUnavailable<T extends TSchema>(
  schema: T,
  data: Static<T>,
): ApiResponse<503, Static<T>> {
  return respond(503, schema, data)
}

// ============ Binary Response ============

/**
 * Return a binary/file response for downloads.
 */
export function binary<TStatus extends number>(
  status: TStatus,
  contentType: string,
  data: Buffer | string,
  filename?: string,
): BinaryResponse<TStatus> {
  return { status, binary: true, contentType, data, filename }
}

// ============ Unified apiError Helpers ============

/**
 * Unified API error response helpers with sensible defaults.
 * Returns responses matching the standard ApiErrorBody structure.
 *
 * @example
 * ```typescript
 * // Use defaults
 * return apiError.notFound()              // "Resource not found"
 * return apiError.unauthorized()          // "Authentication required"
 *
 * // Override message
 * return apiError.notFound('Book not found')
 * return apiError.serviceUnavailable('API is not configured')
 *
 * // Validation errors
 * return apiError.validation([
 *   { field: 'email', message: 'Invalid email format' },
 * ])
 * ```
 */
export const apiError = {
  badRequest: (message = 'Bad request'): ApiResponse<400, ApiErrorBody> => ({
    status: 400,
    data: { status: 400, code: ErrorCodes.BAD_REQUEST, message },
  }),

  unauthorized: (message = 'Authentication required'): ApiResponse<401, ApiErrorBody> => ({
    status: 401,
    data: { status: 401, code: ErrorCodes.UNAUTHORIZED, message },
  }),

  forbidden: (message = 'Access denied'): ApiResponse<403, ApiErrorBody> => ({
    status: 403,
    data: { status: 403, code: ErrorCodes.FORBIDDEN, message },
  }),

  notFound: (message = 'Resource not found'): ApiResponse<404, ApiErrorBody> => ({
    status: 404,
    data: { status: 404, code: ErrorCodes.NOT_FOUND, message },
  }),

  validation: (
    errors: Array<{ field?: string; message: string; code?: string }>,
  ): ApiResponse<422, ApiErrorBody> => ({
    status: 422,
    data: {
      status: 422,
      code: ErrorCodes.VALIDATION,
      message: 'Validation failed',
      errors,
    },
  }),

  conflict: (message = 'Resource conflict'): ApiResponse<409, ApiErrorBody> => ({
    status: 409,
    data: { status: 409, code: ErrorCodes.CONFLICT, message },
  }),

  rateLimited: (message = 'Too many requests'): ApiResponse<429, ApiErrorBody> => ({
    status: 429,
    data: { status: 429, code: ErrorCodes.RATE_LIMITED, message },
  }),

  internal: (message = 'Internal server error'): ApiResponse<500, ApiErrorBody> => ({
    status: 500,
    data: { status: 500, code: ErrorCodes.INTERNAL, message },
  }),

  serviceUnavailable: (message = 'Service unavailable'): ApiResponse<503, ApiErrorBody> => ({
    status: 503,
    data: { status: 503, code: ErrorCodes.SERVICE_UNAVAILABLE, message },
  }),

  externalApi: (message = 'External API error'): ApiResponse<502, ApiErrorBody> => ({
    status: 502,
    data: { status: 502, code: ErrorCodes.EXTERNAL_API, message },
  }),
}
