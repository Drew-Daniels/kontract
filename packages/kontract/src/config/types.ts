import type { TSchema } from '@sinclair/typebox'
import type { ValidationErrorDetail } from '../errors/validation.js'

/**
 * OpenAPI document base information.
 */
export interface OpenApiInfo {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: {
    name?: string
    url?: string
    email?: string
  }
  license?: {
    name: string
    url?: string
  }
}

/**
 * OpenAPI server configuration.
 */
export interface OpenApiServer {
  url: string
  description?: string
}

/**
 * Validator function type.
 * Should return validation errors or undefined/void if valid.
 */
export type ValidatorFn = (schema: TSchema, data: unknown) => ValidationErrorDetail[] | void

/**
 * Serializer function type.
 * Transforms data before validation and response.
 */
export type SerializerFn<T = unknown> = (data: T) => unknown

/**
 * Serializer registration with type guard.
 */
export interface SerializerRegistration<T = unknown> {
  /** Type guard to check if data should use this serializer */
  check: (data: unknown) => data is T
  /** Serialization function */
  serialize: SerializerFn<T>
  /** Optional priority (higher = checked first) */
  priority?: number
}

/**
 * Complete framework configuration.
 */
export interface OpenApiDecoratorConfig {
  /**
   * OpenAPI document information.
   */
  openapi: {
    info: OpenApiInfo
    servers?: OpenApiServer[]
  }

  /**
   * Runtime behavior options.
   */
  runtime: {
    /**
     * Validate responses against schemas in development.
     * Recommended: true in dev, false in production.
     * @default false
     */
    validateResponses?: boolean

    /**
     * Validate request body, query, and params.
     * @default true
     */
    validateRequests?: boolean

    /**
     * Strip unknown properties from request data.
     * @default false
     */
    stripUnknownProperties?: boolean
  }

  /**
   * Custom validator implementation.
   * If not provided, responses won't be validated at runtime.
   */
  validator?: ValidatorFn

  /**
   * Custom serializers for transforming data before validation.
   */
  serializers?: SerializerRegistration[]
}

/**
 * Partial config for user input (most fields optional).
 */
export type UserConfig = {
  openapi: {
    info: OpenApiInfo
    servers?: OpenApiServer[]
  }
  runtime?: Partial<OpenApiDecoratorConfig['runtime']>
  validator?: ValidatorFn
  serializers?: SerializerRegistration[]
}
