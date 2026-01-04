import type { TSchema, Static } from '@sinclair/typebox'

/**
 * HTTP methods supported by the framework.
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Authentication requirement levels for endpoints.
 */
export type AuthLevel = 'required' | 'optional' | 'none'

/**
 * Route string format: "METHOD /path" (path must start with /)
 * @example "GET /api/v1/users"
 * @example "POST /api/v1/users/:id"
 */
export type RouteString = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /${string}`

/**
 * Example value for documentation.
 * Used in response definitions to provide sample data for OpenAPI docs.
 */
export interface ResponseExample<T = unknown> {
  /** Example value matching the response schema */
  value: T
  /** Short summary of what this example demonstrates */
  summary?: string
}

/**
 * Response header definition for OpenAPI.
 * Describes headers returned in the response.
 */
export interface ResponseHeader {
  /** Header description */
  description?: string
  /** Header schema (typically Type.String() or Type.Number()) */
  schema: TSchema
  /** Whether this header is required (default: false) */
  required?: boolean
}

/**
 * Response definition for an endpoint.
 * Generic parameter T is inferred from the schema for type-safe examples.
 *
 * @example Basic usage
 * ```typescript
 * responses: {
 *   200: { schema: UserSchema, description: 'User found' }
 * }
 * ```
 *
 * @example With type-safe examples
 * ```typescript
 * responses: {
 *   200: {
 *     schema: UserSchema,
 *     description: 'User found',
 *     example: { id: '1', name: 'John' }  // TypeScript will validate this matches UserSchema
 *   }
 * }
 * ```
 */
export interface ResponseDefinition<T extends TSchema | null = TSchema | null> {
  /** The TypeBox schema for the response body, or null for empty responses */
  schema: T
  /** Description of this response (for OpenAPI docs) */
  description?: string
  /** Response headers */
  headers?: Record<string, ResponseHeader>
  /** Multiple named examples (type-checked against schema) */
  examples?: T extends TSchema ? Record<string, ResponseExample<Static<T>>> : never
  /** Single example value (type-checked against schema) */
  example?: T extends TSchema ? Static<T> : never
}

/**
 * File upload configuration for multipart/form-data endpoints.
 */
export interface FileUploadConfig {
  /** Field name for the file input */
  fieldName: string
  /** Description for the file field */
  description?: string
  /** Allowed file extensions (e.g., ['csv', 'json']) */
  allowedExtensions?: string[]
  /** Maximum file size (e.g., '10mb') */
  maxSize?: string
  /** Whether to accept multiple files (default: false) */
  multiple?: boolean
}

/**
 * Metadata for a controller class decorated with @Api.
 */
export interface ApiMetadata {
  /** OpenAPI tag for grouping endpoints */
  tag: string
  /** Description of the API group */
  description?: string
  /** Optional path prefix for all endpoints in this controller */
  prefix?: string
}

/**
 * Metadata for an endpoint method decorated with @Endpoint.
 */
export interface EndpointMetadata {
  /** HTTP method (lowercase) */
  method: HttpMethod
  /** URL path pattern */
  path: string
  /** Name of the decorated method */
  methodName: string
  /** Short summary for OpenAPI */
  summary?: string
  /** Detailed description for OpenAPI */
  description?: string
  /** Unique operation ID for OpenAPI */
  operationId?: string
  /** Whether this endpoint is deprecated */
  deprecated?: boolean
  /** Authentication requirement */
  auth: AuthLevel
  /** Request body schema */
  body?: TSchema
  /** Query parameters schema */
  query?: TSchema
  /** Path parameters schema */
  params?: TSchema
  /** File upload configuration */
  file?: FileUploadConfig
  /** Response definitions by status code */
  responses: Record<number, ResponseDefinition>
  /** Framework-specific middleware (opaque to core) */
  middleware?: unknown[]
}

/**
 * Combined metadata for a controller with all its endpoints.
 */
export interface ControllerMetadata {
  /** The controller class constructor */
  controller: object
  /** Controller-level metadata */
  api: ApiMetadata
  /** All endpoint metadata for this controller */
  endpoints: EndpointMetadata[]
}
