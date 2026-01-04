import type { TSchema } from '@sinclair/typebox'
import type { ValidationErrorDetail } from '../errors/validation.js'

/**
 * Validator interface for schema validation.
 * Implement this to use a different validation library.
 */
export interface Validator {
  /**
   * Validate data against a schema.
   * @returns Array of errors, or empty array if valid
   */
  validate(schema: TSchema, data: unknown): ValidationErrorDetail[]

  /**
   * Validate and throw if invalid.
   * @throws ValidationError if validation fails
   */
  validateOrThrow(schema: TSchema, data: unknown): void

  /**
   * Compile a schema for repeated validation.
   * Optional optimization for validators that support it.
   */
  compile?(schema: TSchema): CompiledValidator
}

/**
 * Pre-compiled validator for performance.
 */
export interface CompiledValidator {
  validate(data: unknown): ValidationErrorDetail[]
  validateOrThrow(data: unknown): void
}

/**
 * Options for creating a validator.
 */
export interface ValidatorOptions {
  /**
   * Whether to remove additional properties not in schema.
   * @default false
   */
  removeAdditional?: boolean

  /**
   * Whether to coerce types (e.g., "123" to 123).
   * @default false
   */
  coerceTypes?: boolean

  /**
   * Whether to use defaults from schema.
   * @default true
   */
  useDefaults?: boolean

  /**
   * Custom formats to register.
   */
  formats?: Record<string, (value: string) => boolean>
}
