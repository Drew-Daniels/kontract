import type { TSchema } from '@sinclair/typebox'
import { OpenApiDecoratorError } from './base.js'

/**
 * Validation error detail for a single field.
 */
export interface ValidationErrorDetail {
  field: string
  message: string
  code?: string
}

/**
 * Response format for validation errors.
 */
export interface ValidationErrorResponse {
  status: number
  code: string
  message: string
  errors: ValidationErrorDetail[]
}

/**
 * Error thrown when request validation fails.
 */
export class RequestValidationError extends OpenApiDecoratorError {
  public readonly status = 422
  public readonly errors: ValidationErrorDetail[]
  public readonly schema: TSchema
  public readonly data: unknown
  public readonly source: 'body' | 'query' | 'params'

  constructor(
    schema: TSchema,
    data: unknown,
    errors: ValidationErrorDetail[],
    source: 'body' | 'query' | 'params',
  ) {
    const schemaName = schema.$id ?? schema.title ?? 'Request'
    const errorSummary = errors.map((e) => `${e.field}: ${e.message}`).join(', ')
    super('E_VALIDATION_ERROR', `${source} validation failed for ${schemaName}: ${errorSummary}`)

    this.name = 'RequestValidationError'
    this.schema = schema
    this.data = data
    this.errors = errors
    this.source = source
  }

  /**
   * Convert to a response object suitable for sending to the client.
   */
  toResponse(): ValidationErrorResponse {
    return {
      status: this.status,
      code: this.code,
      message: 'Validation failed',
      errors: this.errors,
    }
  }
}

/**
 * Error thrown when response validation fails (development only).
 * This indicates a bug in the handler - the returned data doesn't match the declared schema.
 */
export class ResponseValidationError extends OpenApiDecoratorError {
  public readonly status = 500
  public readonly errors: ValidationErrorDetail[]
  public readonly schema: TSchema
  public readonly data: unknown

  constructor(
    schema: TSchema,
    data: unknown,
    errors: ValidationErrorDetail[],
  ) {
    const schemaName = schema.$id ?? schema.title ?? 'Response'
    const errorSummary = errors.map((e) => `${e.field}: ${e.message}`).join(', ')
    super('E_RESPONSE_VALIDATION', `Response validation failed for ${schemaName}: ${errorSummary}`)

    this.name = 'ResponseValidationError'
    this.schema = schema
    this.data = data
    this.errors = errors
  }
}
