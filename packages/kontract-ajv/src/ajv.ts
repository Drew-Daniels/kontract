import Ajv from 'ajv'
import type { ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import type { TSchema, Static } from '@sinclair/typebox'
import {
  type Validator,
  type CompiledValidator,
  type ValidatorOptions,
  type ValidationErrorDetail,
  RequestValidationError,
} from 'kontract'

// Handle ESM/CJS compatibility for Ajv and ajv-formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (Ajv as any).default ?? Ajv
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFunc = (addFormats as any).default ?? addFormats

/**
 * Type for AJV compiled validate function.
 */
interface AjvCompiledValidator {
  (data: unknown): boolean
  errors?: ErrorObject[] | null
}

/**
 * Options for creating the AJV validator.
 */
export interface AjvValidatorOptions extends ValidatorOptions {
  /**
   * Additional AJV options.
   */
  ajvOptions?: Record<string, unknown>
}

/**
 * Create an AJV-based validator.
 */
export function createAjvValidator(options: AjvValidatorOptions = {}): Validator {
  const ajv = new AjvClass({
    allErrors: true,
    coerceTypes: options.coerceTypes ?? true,
    removeAdditional: options.removeAdditional ?? true,
    useDefaults: options.useDefaults ?? true,
    strict: false, // Disable strict mode for TypeBox compatibility
    ...options.ajvOptions,
  })

  // Add format validators
  addFormatsFunc(ajv)

  // Register custom formats
  if (options.formats) {
    for (const [name, fn] of Object.entries(options.formats)) {
      ajv.addFormat(name, fn)
    }
  }

  // Cache for compiled validators
  const validatorCache = new Map<TSchema, AjvCompiledValidator>()

  /**
   * Get or create a compiled validator for a schema.
   */
  function getCompiledValidator(schema: TSchema): AjvCompiledValidator {
    let validator = validatorCache.get(schema)
    if (!validator) {
      const schemaId = schema.$id

      // Check if schema is already registered with AJV
      if (schemaId) {
        const existing = ajv.getSchema(schemaId)
        if (existing) {
          validatorCache.set(schema, existing as AjvCompiledValidator)
          return existing as AjvCompiledValidator
        }
      }

      // Strip nested $id fields to prevent AJV conflicts
      const cleanedSchema = stripNestedIds(schema)
      validator = ajv.compile(cleanedSchema) as AjvCompiledValidator
      validatorCache.set(schema, validator)
    }
    return validator
  }

  return {
    validate(schema: TSchema, data: unknown): ValidationErrorDetail[] {
      const validator = getCompiledValidator(schema)
      const valid = validator(data)

      if (!valid && validator.errors) {
        return validator.errors.map((err: ErrorObject) => ({
          field:
            err.instancePath.replace(/^\//, '').replace(/\//g, '.')
            || (err.params as { missingProperty?: string }).missingProperty
            || 'unknown',
          message: err.message || 'Validation failed',
        }))
      }

      return []
    },

    validateOrThrow(schema: TSchema, data: unknown): void {
      const errors = this.validate(schema, data)
      if (errors.length > 0) {
        throw new RequestValidationError(schema, data, errors, 'body')
      }
    },

    compile(schema: TSchema): CompiledValidator {
      const compiled = getCompiledValidator(schema)

      return {
        validate(data: unknown): ValidationErrorDetail[] {
          const valid = compiled(data)
          if (!valid && compiled.errors) {
            return compiled.errors.map((err: ErrorObject) => ({
              field:
                err.instancePath.replace(/^\//, '').replace(/\//g, '.')
                || (err.params as { missingProperty?: string }).missingProperty
                || 'unknown',
              message: err.message || 'Validation failed',
            }))
          }
          return []
        },

        validateOrThrow(data: unknown): void {
          const errors = this.validate(data)
          if (errors.length > 0) {
            throw new RequestValidationError(schema, data, errors, 'body')
          }
        },
      }
    },
  }
}

/**
 * Simple validate function that creates a validator on demand.
 * For better performance, use createAjvValidator() and reuse the instance.
 */
let defaultValidator: Validator | null = null

export function validate<T extends TSchema>(schema: T, data: unknown): Static<T> {
  if (!defaultValidator) {
    defaultValidator = createAjvValidator()
  }

  const errors = defaultValidator.validate(schema, data)
  if (errors.length > 0) {
    throw new AjvValidationError(errors)
  }

  return data as Static<T>
}

/**
 * Validation error class for AJV errors.
 */
export class AjvValidationError extends Error {
  public readonly errors: ValidationErrorDetail[]
  public readonly status = 422
  public readonly code = 'E_VALIDATION'

  constructor(errors: ValidationErrorDetail[]) {
    super('Validation failed')
    this.name = 'AjvValidationError'
    this.errors = errors
  }
}

/**
 * Strip $id from nested schemas to prevent AJV conflicts.
 *
 * When a schema with $id is used multiple times in a parent schema,
 * AJV sees each instance as a separate schema definition with the
 * same $id, causing conflicts.
 */
export function stripNestedIds<T extends TSchema>(schema: T, isRoot = true): T {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => stripNestedIds(item, false)) as unknown as T
  }

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    // Strip $id from non-root schemas
    if (key === '$id' && !isRoot) {
      continue
    }

    if (typeof value === 'object' && value !== null) {
      result[key] = stripNestedIds(value as TSchema, false)
    } else {
      result[key] = value
    }
  }

  return result as T
}

/**
 * Get the default AJV instance for advanced use cases.
 */
export function getDefaultValidator(): Validator {
  if (!defaultValidator) {
    defaultValidator = createAjvValidator()
  }
  return defaultValidator
}

/**
 * Reset the default validator (useful for testing).
 */
export function resetDefaultValidator(): void {
  defaultValidator = null
}
