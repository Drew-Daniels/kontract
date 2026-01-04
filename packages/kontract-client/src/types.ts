/**
 * Type definitions for the kontract HTTP client.
 *
 * Provides full type inference for request/response based on route definitions.
 */
import type { TSchema, Static } from '@sinclair/typebox'
import type {
  ControllerDefinition,
  RouteDefinition,
  RouteRecord,
} from 'kontract/builder'
import type { ResponseDefinition, HttpMethod } from 'kontract/metadata'
import type { ParamsFromPath } from 'kontract'

/**
 * Configuration options for creating a client.
 */
export interface ClientConfig<T extends Record<string, ControllerDefinition>> {
  /** Map of controller names to controller definitions */
  controllers: T
  /** Base URL for API requests (e.g., 'http://localhost:3333') */
  baseUrl: string
  /** Default headers to include with every request */
  headers?: Record<string, string>
  /** Credentials mode for fetch requests */
  credentials?: RequestCredentials
  /** Enable runtime response validation using @kontract/ajv */
  validateResponse?: boolean
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch
}

/**
 * Internal options passed to the request execution layer.
 */
export interface ClientOptions {
  headers?: Record<string, string>
  credentials?: RequestCredentials
  validateResponse?: boolean
  fetch?: typeof fetch
}

/**
 * Request options for a single API call.
 * Types are inferred from the route definition.
 */
export interface RequestOptions<
  TBody = undefined,
  TQuery = undefined,
  TParams = undefined,
> {
  body?: TBody
  query?: TQuery
  params?: TParams
  headers?: Record<string, string>
}

/**
 * Response returned by all client methods.
 * A discriminated union based on HTTP status code.
 */
export interface ClientResponse<TStatus extends number, TBody> {
  /** HTTP status code */
  status: TStatus
  /** Parsed response body */
  body: TBody
  /** Response headers */
  headers: Headers
}

/**
 * Minimal route definition interface for client usage.
 * Avoids importing the full RouteDefinition with handler.
 */
export interface ClientRouteDefinition {
  readonly __type: 'route'
  readonly method: HttpMethod
  readonly path: string
  readonly config: {
    readonly body?: TSchema
    readonly query?: TSchema
    readonly params?: TSchema
  }
  readonly responses: Record<number, ResponseDefinition>
}

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Extract the body type from a route's responses configuration.
 */
type ExtractResponseBody<T> = T extends { schema: infer S extends TSchema }
  ? Static<S>
  : T extends TSchema
    ? Static<T>
    : T extends null
      ? null
      : never

/**
 * Infer the request options type from a route definition.
 * Only includes body/query/params if they are defined in the route config.
 *
 * Path parameters are inferred from the route path when no explicit params schema is provided.
 * For example, a route path '/users/:id' will infer params as { id: string }.
 */
export type InferRequestOptions<R> = R extends RouteDefinition<
  infer TPath,
  infer TBody,
  infer TQuery,
  infer TParams
>
  ? (TBody extends TSchema ? { body: Static<TBody> } : unknown)
  & (TQuery extends TSchema ? { query: Static<TQuery> } : unknown)
  & (TParams extends TSchema
    ? { params: Static<TParams> }
    : ParamsFromPath<TPath> extends undefined
      ? unknown
      : { params: ParamsFromPath<TPath> })
    & { headers?: Record<string, string> }
  : never

/**
 * Infer the response type from a route's responses config.
 * Creates a discriminated union of all possible status/body combinations.
 */
export type InferResponse<TResponses extends Record<number, ResponseDefinition>> = {
  [K in keyof TResponses & number]: ClientResponse<K, ExtractResponseBody<TResponses[K]>>
}[keyof TResponses & number]

/**
 * Infer client methods from a route record (controller's routes).
 */
export type InferControllerClient<T extends RouteRecord> = {
  [K in keyof T]: T[K] extends RouteDefinition<infer _TPath, infer _TBody, infer _TQuery, infer _TParams>
    ? (
      options: InferRequestOptions<T[K]>,
    ) => Promise<InferResponse<T[K]['responses']>>
    : never
}

/**
 * Full client type with namespaced controller methods.
 */
export type Client<T extends Record<string, ControllerDefinition>> = {
  [K in keyof T]: T[K] extends ControllerDefinition<infer TRoutes>
    ? InferControllerClient<TRoutes>
    : never
}

// =============================================================================
// Utility Types for Implementation
// =============================================================================

/**
 * Any controller definition for runtime iteration.
 */
export type AnyControllerDefinition = ControllerDefinition<RouteRecord>

/**
 * Function signature for client endpoint methods.
 */
export type EndpointMethod = (options: RequestOptions) => Promise<ClientResponse<number, unknown>>
