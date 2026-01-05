/**
 * Type-safe route builder with automatic type inference.
 *
 * Unlike decorators, this function-based API provides full TypeScript
 * type inference for body, query, and params without manual annotations.
 *
 * @example
 * ```typescript
 * const createUser = defineRoute({
 *   route: 'POST /api/users',
 *   body: CreateUserRequest,
 *   responses: { 201: { schema: User } },
 * }, async ({ body }) => {
 *   // body is automatically typed as Static<typeof CreateUserRequest>
 *   return created(User, await db.users.create(body))
 * })
 * ```
 */
import type { TSchema, Static } from '@sinclair/typebox'
import type { AnyResponse } from '../response/types.js'
import type { HttpMethod, AuthLevel, ResponseDefinition, RequestHeader } from '../metadata/types.js'

/**
 * Route string format: "METHOD /path"
 */
type RouteString = `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /${string}`

/**
 * Extract the path portion from a route string.
 * @example ExtractPathFromRoute<'GET /users/:id'> = '/users/:id'
 */
type ExtractPathFromRoute<T extends string> = T extends `${string} ${infer Path}` ? Path : string

/**
 * Response configuration for routes.
 */
type ResponsesConfig = Record<number, TSchema | null | { schema: TSchema | null; description?: string }>

/**
 * Configuration for defineRoute.
 *
 * @typeParam TRoute - The route string type (e.g., 'GET /users/:id') for path param inference
 */
export interface RouteConfig<
  TRoute extends RouteString = RouteString,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> {
  /** Route in format "METHOD /path" (e.g., "POST /api/users") */
  route: TRoute
  /** Short summary for OpenAPI docs */
  summary?: string
  /** Detailed description for OpenAPI docs */
  description?: string
  /** Unique operation ID for OpenAPI */
  operationId?: string
  /** Mark route as deprecated */
  deprecated?: boolean
  /** Authentication requirement */
  auth?: AuthLevel
  /** Request body schema */
  body?: TBody
  /** Query parameters schema */
  query?: TQuery
  /** Path parameters schema */
  params?: TParams
  /** Request headers (custom headers beyond Authorization) */
  headers?: RequestHeader[]
  /**
   * Mark this route as multipart/form-data for file uploads.
   * When true:
   * - OpenAPI spec uses multipart/form-data content type
   * - Body validation is skipped (files handled by framework's file upload mechanism)
   */
  multipart?: boolean
  /** Response definitions by status code */
  responses: ResponsesConfig
}

/**
 * Context object passed to route handlers.
 * Types are automatically inferred from the route configuration.
 */
export interface HandlerContext<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> {
  /** Validated request body (typed from body schema) */
  body: TBody extends TSchema ? Static<TBody> : undefined
  /** Validated query parameters (typed from query schema) */
  query: TQuery extends TSchema ? Static<TQuery> : undefined
  /** Validated path parameters (typed from params schema) */
  params: TParams extends TSchema ? Static<TParams> : undefined
  /** Authenticated user (available when auth is 'required' or 'optional') */
  user: unknown
  /** Raw framework request object (FastifyRequest, Hono Context, etc.) */
  raw: unknown
}

/**
 * Handler function type with inferred parameter types.
 */
export type RouteHandler<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> = (ctx: HandlerContext<TBody, TQuery, TParams>) => Promise<AnyResponse> | AnyResponse

/**
 * Route definition returned by defineRoute.
 * Contains configuration and optionally a handler for registration with adapters.
 *
 * When used without a handler, the route is a "contract" that can be shared
 * with clients for type-safe API calls.
 *
 * @typeParam TPath - The route path as a literal string type (e.g., '/users/:id')
 *   Used for path parameter inference when TParams is not explicitly provided.
 */
export interface RouteDefinition<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> {
  /** Type discriminator */
  readonly __type: 'route'
  /** Parsed HTTP method */
  readonly method: HttpMethod
  /** Parsed path (typed as literal for param inference) */
  readonly path: TPath
  /** Original configuration */
  readonly config: RouteConfig<RouteString, TBody, TQuery, TParams>
  /** Normalized response definitions */
  readonly responses: Record<number, ResponseDefinition>
  /** Handler function (optional - omitted for contract-only definitions) */
  readonly handler?: RouteHandler<TBody, TQuery, TParams>
}

/**
 * Parse a route string into method and path.
 */
function parseRoute(route: RouteString): [HttpMethod, string] {
  const spaceIndex = route.indexOf(' ')
  const method = route.slice(0, spaceIndex).toLowerCase() as HttpMethod
  const path = route.slice(spaceIndex + 1)
  return [method, path]
}

/**
 * Normalize response definitions to consistent format.
 */
function normalizeResponses(responses: ResponsesConfig): Record<number, ResponseDefinition> {
  const normalized: Record<number, ResponseDefinition> = {}

  for (const [status, value] of Object.entries(responses)) {
    if (value === null) {
      normalized[Number(status)] = { schema: null }
    } else if (typeof value === 'object' && 'schema' in value) {
      normalized[Number(status)] = value as ResponseDefinition
    } else {
      normalized[Number(status)] = { schema: value as TSchema }
    }
  }

  return normalized
}

/**
 * Define a type-safe API route with automatic type inference.
 *
 * This function-based approach provides full TypeScript type inference
 * for request body, query parameters, and path parameters without
 * requiring manual `Static<typeof Schema>` annotations.
 *
 * @param config - Route configuration including path, schemas, and responses
 * @param handler - Optional async function that handles the request.
 *   When omitted, creates a "contract-only" definition that can be shared with clients.
 * @returns RouteDefinition for registration with framework adapters or client generation
 *
 * @example Basic GET route with handler (server-side)
 * ```typescript
 * const getUser = defineRoute({
 *   route: 'GET /api/users/:id',
 *   params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
 *   responses: {
 *     200: { schema: User },
 *     404: null,
 *   },
 * }, async ({ params }) => {
 *   // params.id is typed as string
 *   const user = await findUser(params.id)
 *   return user ? ok(User, user) : apiError.notFound()
 * })
 * ```
 *
 * @example Contract-only route (for client generation)
 * ```typescript
 * // In shared contracts file - can be imported by both server and client
 * export const getUserContract = defineRoute({
 *   route: 'GET /api/users/:id',
 *   params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
 *   responses: {
 *     200: { schema: User },
 *     404: { schema: ApiError },
 *   },
 * })
 *
 * // On server - attach handler
 * const getUser = defineRoute(getUserContract.config, async ({ params }) => { ... })
 *
 * // On client - use contract for type-safe calls
 * const client = createClient({ controllers: { users: usersContracts }, ... })
 * const result = await client.users.getUser({ params: { id: '123' } })
 * ```
 *
 * @example POST with body and auth
 * ```typescript
 * const createUser = defineRoute({
 *   route: 'POST /api/users',
 *   auth: 'required',
 *   body: CreateUserRequest,
 *   responses: { 201: { schema: User } },
 * }, async ({ body, user }) => {
 *   // body is typed as { name: string; email: string }
 *   return created(User, await db.users.create(body))
 * })
 * ```
 *
 * @example GET with query parameters
 * ```typescript
 * const listUsers = defineRoute({
 *   route: 'GET /api/users',
 *   query: Type.Object({
 *     page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
 *     limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
 *   }),
 *   responses: { 200: { schema: UserList } },
 * }, async ({ query }) => {
 *   // query.page and query.limit are typed
 *   return ok(UserList, await db.users.list(query))
 * })
 * ```
 */
export function defineRoute<
  TRoute extends RouteString,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
>(
  config: RouteConfig<TRoute, TBody, TQuery, TParams>,
  handler?: RouteHandler<TBody, TQuery, TParams>,
): RouteDefinition<ExtractPathFromRoute<TRoute>, TBody, TQuery, TParams> {
  const [method, path] = parseRoute(config.route)

  return {
    __type: 'route',
    method,
    path: path as ExtractPathFromRoute<TRoute>,
    config,
    responses: normalizeResponses(config.responses),
    handler,
  }
}

/**
 * Type guard to check if a value is a RouteDefinition.
 */
export function isRouteDefinition(value: unknown): value is RouteDefinition {
  return (
    typeof value === 'object'
    && value !== null
    && '__type' in value
    && (value as { __type: unknown }).__type === 'route'
  )
}
