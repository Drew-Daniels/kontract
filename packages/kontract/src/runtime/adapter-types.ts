/**
 * Shared type definitions for kontract framework adapters.
 *
 * These types are used across all framework adapters (Hono, Fastify, Express, AdonisJS)
 * to provide consistent typing for response helpers and handler contexts.
 */
import type { TSchema, Static } from '@sinclair/typebox'
import type { ApiResponse } from '../response/types.js'
import type { ResponseExample, ResponseHeader } from '../metadata/types.js'

// ============================================================================
// Response Configuration Types
// ============================================================================

/**
 * Response configuration for routes.
 * Maps HTTP status codes to schemas or response definitions.
 */
export type ResponsesConfig = Record<number, TSchema | null | {
  schema: TSchema | null
  description?: string
  headers?: Record<string, ResponseHeader>
  examples?: Record<string, ResponseExample>
  example?: unknown
}>

/**
 * Normalized response entry (internal use).
 */
export interface NormalizedResponse {
  schema: TSchema | null
  description?: string
  headers?: Record<string, ResponseHeader>
  examples?: Record<string, ResponseExample>
  example?: unknown
}

/**
 * Normalized responses map (internal use).
 */
export type NormalizedResponses = Record<number, NormalizedResponse>

// ============================================================================
// Type Helpers for Response Schema Extraction
// ============================================================================

/**
 * Extract the schema from a response definition.
 * Handles both `{ schema: T }` and raw `T` formats.
 */
export type ExtractResponseSchema<T> = T extends { schema: infer S }
  ? S extends TSchema ? S : never
  : T extends TSchema ? T : never

/**
 * Get the schema type for a specific status code, or `never` if not defined.
 */
export type ResponseSchemaFor<TResponses, Status extends number>
  = Status extends keyof TResponses
    ? ExtractResponseSchema<TResponses[Status]>
    : never

// ============================================================================
// Typed Response Helper Types
// ============================================================================

/**
 * Helper type to create a typed response function for a specific status code.
 */
export type TypedHelper<TResponses, Status extends number>
  = ResponseSchemaFor<TResponses, Status> extends TSchema
    ? (data: Static<ResponseSchemaFor<TResponses, Status>>) => ApiResponse<Status, Static<ResponseSchemaFor<TResponses, Status>>>
    : never

/**
 * Error helper that accepts:
 * - No args: use description from response definition as message
 * - A string: use as message, auto-fill status and code
 * - An object: merge with defaults (status, code, description as message)
 */
export type TypedErrorHelper<TResponses, Status extends number>
  = ResponseSchemaFor<TResponses, Status> extends TSchema
    ? (dataOrMessage?: string | Partial<Static<ResponseSchemaFor<TResponses, Status>>>)
    => ApiResponse<Status, Static<ResponseSchemaFor<TResponses, Status>>>
    : never

// ============================================================================
// Response Helper Namespaces
// ============================================================================

/**
 * Success response helpers namespace (2xx).
 * Only includes methods for status codes that are defined in responses.
 */
export type ReplyHelpers<TResponses extends ResponsesConfig>
  = & (200 extends keyof TResponses ? { ok: TypedHelper<TResponses, 200>; list: TypedHelper<TResponses, 200> } : unknown)
    & (201 extends keyof TResponses ? { created: TypedHelper<TResponses, 201> } : unknown)
    & (202 extends keyof TResponses ? { accepted: TypedHelper<TResponses, 202> } : unknown)
    & (204 extends keyof TResponses ? { noContent: () => ApiResponse<204, null> } : unknown)

/**
 * Error response helpers namespace (4xx/5xx).
 * Only includes methods for status codes that are defined in responses.
 *
 * Each method accepts:
 * - No args: `error.internal()` - uses response description as message
 * - A string: `error.badRequest('Invalid token')`
 * - An object: `error.badRequest({ message: 'Invalid', details: {...} })`
 *
 * Status, code, and message are auto-filled from sensible defaults.
 */
export type ErrorHelpers<TResponses extends ResponsesConfig>
  = & (400 extends keyof TResponses ? { badRequest: TypedErrorHelper<TResponses, 400> } : unknown)
    & (401 extends keyof TResponses ? { unauthorized: TypedErrorHelper<TResponses, 401> } : unknown)
    & (403 extends keyof TResponses ? { forbidden: TypedErrorHelper<TResponses, 403> } : unknown)
    & (404 extends keyof TResponses ? { notFound: TypedErrorHelper<TResponses, 404> } : unknown)
    & (409 extends keyof TResponses ? { conflict: TypedErrorHelper<TResponses, 409> } : unknown)
    & (422 extends keyof TResponses ? { validationError: TypedErrorHelper<TResponses, 422> } : unknown)
    & (429 extends keyof TResponses ? { tooManyRequests: TypedErrorHelper<TResponses, 429> } : unknown)
    & (500 extends keyof TResponses ? { internal: TypedErrorHelper<TResponses, 500> } : unknown)
    & (503 extends keyof TResponses ? { serviceUnavailable: TypedErrorHelper<TResponses, 503> } : unknown)

// ============================================================================
// Base Handler Context
// ============================================================================

/**
 * Base handler context interface.
 * Framework adapters extend this with their specific context properties.
 */
export interface BaseHandlerContext<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  TResponses extends ResponsesConfig = ResponsesConfig,
> {
  /** Validated request body */
  body: TBody
  /** Validated query parameters */
  query: TQuery
  /** Validated path parameters */
  params: TParams
  /** Authenticated user (available when auth is 'required' or 'optional') */
  user: unknown
  /** Success response helpers (2xx) - methods typed from responses config */
  reply: ReplyHelpers<TResponses>
  /** Error response helpers (4xx/5xx) - methods typed from responses config */
  error: ErrorHelpers<TResponses>
}
