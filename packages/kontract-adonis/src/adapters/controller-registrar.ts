/**
 * Register route definitions (from defineRoute/defineController) with AdonisJS.
 *
 * This provides an alternative to decorator-based route registration with
 * full TypeScript type inference.
 */
import type { Router, HttpContext } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'
import type { TSchema, Static } from '@sinclair/typebox'
import { validate as defaultValidate } from '@kontract/ajv'
import {
  type ControllerDefinition,
  type RouteDefinition,
  type AnyRouteDefinition,
  type RouteConfig,
  type HandlerContext,
  type AnyResponse,
  type ApiResponse,
  type HttpMethod,
  type RouteString,
  type ResponsesConfig,
  getControllerRoutes,
  isBinaryResponse,
  type ParamsFromPath,
  getParamsSchema,
  parseRouteString,
  normalizeResponses,
  createResponseHelpers,
  isApiResponse,
  noContent,
} from 'kontract'

// Re-export noContent for convenience
export { noContent }

/**
 * Validate function signature.
 * Takes a schema and data, returns validated/coerced data or throws.
 */
export type ValidateFn = <T extends TSchema>(schema: T, data: unknown) => Static<T>

/**
 * Options for registerController.
 */
export interface RegisterControllerOptions {
  /**
   * Validation function that validates and coerces data against a schema.
   * Should throw on validation failure.
   *
   * Optional - uses built-in AJV validator by default.
   */
  validate?: ValidateFn

  /**
   * Optional AdonisJS container for dependency injection.
   * If provided, services can be resolved using container.make()
   */
  container?: ApplicationService['container']
}

// Import shared type helpers from kontract
import type { ResponseSchemaFor } from 'kontract'

// ============================================================================
// AdonisJS-Specific Type Helpers
// ============================================================================

/**
 * Helper type to create a typed response function for a specific status code.
 */
type TypedHelper<TResponses, Status extends number>
  = ResponseSchemaFor<TResponses, Status> extends TSchema
    ? (data: Static<ResponseSchemaFor<TResponses, Status>>) => ApiResponse<Status, Static<ResponseSchemaFor<TResponses, Status>>>
    : never

/**
 * Error helper that accepts:
 * - No args: use description from response definition as message
 * - A string: use as message, auto-fill status and code
 * - An object: merge with defaults (status, code, description as message)
 */
type TypedErrorHelper<TResponses, Status extends number>
  = ResponseSchemaFor<TResponses, Status> extends TSchema
    ? (dataOrMessage?: string | Partial<Static<ResponseSchemaFor<TResponses, Status>>>)
    => ApiResponse<Status, Static<ResponseSchemaFor<TResponses, Status>>>
    : never

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
// AdonisJS Handler Context
// ============================================================================

/**
 * Extended handler context for AdonisJS with typed body, query, params,
 * AND namespaced response helpers derived from the responses config.
 *
 * Path parameters are automatically inferred from the route path when not
 * explicitly provided. For example, `/users/:id` will infer `{ id: string }`.
 */
export interface AdonisHandlerContext<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> {
  /** Validated request body (typed from body schema) */
  body: TBody extends TSchema ? Static<TBody> : undefined
  /** Validated query parameters (typed from query schema) */
  query: TQuery extends TSchema ? Static<TQuery> : undefined
  /** Validated path parameters (inferred from path or explicit params schema) */
  params: TParams extends TSchema ? Static<TParams> : ParamsFromPath<TPath>
  /** Authenticated user (available when auth is 'required' or 'optional') */
  user: unknown
  /** Full AdonisJS HttpContext */
  ctx: HttpContext
  /** Raw context (alias for ctx, for compatibility with generic HandlerContext) */
  raw: HttpContext
  /** AdonisJS container for service resolution */
  container?: ApplicationService['container']

  /** Success response helpers (2xx) - methods typed from responses config */
  reply: ReplyHelpers<TResponses>
  /** Error response helpers (4xx/5xx) - methods typed from responses config */
  error: ErrorHelpers<TResponses>
}

/**
 * Handler function type for AdonisJS routes.
 * Path parameters are automatically inferred from TPath when TParams is undefined.
 */
export type AdonisRouteHandler<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = (ctx: AdonisHandlerContext<TPath, TBody, TQuery, TParams, TResponses>) => Promise<AnyResponse> | AnyResponse

/**
 * AdonisJS middleware type (from route.use())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Middleware = any

/**
 * Extended RouteConfig for AdonisJS with middleware support.
 */
export interface AdonisRouteConfig<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> extends RouteConfig<RouteString, TBody, TQuery, TParams> {
  /** AdonisJS middleware to apply to this route */
  middleware?: Middleware[]
  /** Response definitions for this route */
  responses: TResponses
}

/**
 * Extended RouteDefinition that includes middleware.
 */
export interface AdonisRouteDefinition<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> extends RouteDefinition<TPath, TBody, TQuery, TParams> {
  /** AdonisJS middleware to apply to this route */
  middleware?: Middleware[]
}

/**
 * Define an AdonisJS route with properly typed context and response helpers.
 *
 * This is a wrapper around `defineRoute` that provides AdonisJS-specific
 * typed context including `ctx` (HttpContext), `container`, and pre-typed
 * namespaced response helpers based on the responses config.
 *
 * @example
 * ```typescript
 * import { defineAdonisRoute, defineController } from '@kontract/adonis'
 * import StatsService from '#services/stats_service'
 *
 * const getStats = defineAdonisRoute({
 *   route: 'GET /api/v1/stats',
 *   responses: {
 *     200: { schema: StatsResponse },
 *     401: { schema: ApiError },
 *   },
 * }, async ({ ctx, reply, error }) => {
 *   // ctx is typed as HttpContext
 *   // reply.ok() and error.unauthorized() are pre-typed from responses config
 *   const statsService = await ctx.containerResolver.make(StatsService)
 *   return reply.ok(await statsService.getOverview())
 * })
 * ```
 */
export function defineAdonisRoute<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  config: AdonisRouteConfig<TBody, TQuery, TParams, TResponses>,
  handler: AdonisRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, TBody, TQuery, TParams> {
  const [method, path] = parseRouteString(config.route as RouteString)

  return {
    __type: 'route',
    method: method as HttpMethod,
    path: path as TPath,
    config,
    responses: normalizeResponses(config.responses),
    // Cast handler to the generic RouteHandler type
    // The actual context will be AdonisHandlerContext at runtime
    handler: handler as unknown as RouteDefinition<TPath, TBody, TQuery, TParams>['handler'],
    middleware: config.middleware,
  }
}

// ============================================================================
// Elysia-Style Route Builders (method-specific)
// ============================================================================

/**
 * Options for GET and DELETE routes (no body).
 */
export type GetRouteOptions<
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = Omit<AdonisRouteConfig<undefined, TQuery, TParams, TResponses>, 'route' | 'body'>

/**
 * Options for POST, PUT, PATCH routes (with body).
 */
export type BodyRouteOptions<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = Omit<AdonisRouteConfig<TBody, TQuery, TParams, TResponses>, 'route'>

/**
 * Define a GET route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const listUsers = get('/api/v1/users',
 *   async ({ query, reply }) => {
 *     const users = await User.query().paginate(query.page, query.perPage)
 *     return reply.list(users)
 *   },
 *   {
 *     summary: 'List users',
 *     query: UserQueryParams,
 *     responses: { 200: { schema: UserListResponse } },
 *   }
 * )
 * ```
 */
export function get<
  TPath extends string,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  path: TPath,
  handler: AdonisRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
  options: GetRouteOptions<TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineAdonisRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `GET ${path}` } as AdonisRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a POST route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const createUser = post('/api/v1/users',
 *   async ({ body, reply }) => {
 *     const user = await User.create(body)
 *     return reply.created(user)
 *   },
 *   {
 *     summary: 'Create a user',
 *     body: CreateUserRequest,
 *     responses: {
 *       201: { schema: UserResponse },
 *       400: { schema: ApiError },
 *     },
 *   }
 * )
 * ```
 */
export function post<
  TPath extends string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  path: TPath,
  handler: AdonisRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineAdonisRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `POST ${path}` } as AdonisRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a PUT route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const updateUser = put('/api/v1/users/:id',
 *   async ({ params, body, reply }) => {
 *     const user = await User.findOrFail(params.id)
 *     user.merge(body)
 *     await user.save()
 *     return reply.ok(user)
 *   },
 *   {
 *     summary: 'Update a user',
 *     params: IdParams,
 *     body: UpdateUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   }
 * )
 * ```
 */
export function put<
  TPath extends string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  path: TPath,
  handler: AdonisRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineAdonisRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PUT ${path}` } as AdonisRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a PATCH route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const patchUser = patch('/api/v1/users/:id',
 *   async ({ params, body, reply }) => {
 *     const user = await User.findOrFail(params.id)
 *     user.merge(body)
 *     await user.save()
 *     return reply.ok(user)
 *   },
 *   {
 *     summary: 'Partially update a user',
 *     params: IdParams,
 *     body: PatchUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   }
 * )
 * ```
 */
export function patch<
  TPath extends string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  path: TPath,
  handler: AdonisRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineAdonisRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PATCH ${path}` } as AdonisRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a DELETE route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const deleteUser = del('/api/v1/users/:id',
 *   async ({ params, reply }) => {
 *     const user = await User.findOrFail(params.id)
 *     await user.delete()
 *     return reply.noContent()
 *   },
 *   {
 *     summary: 'Delete a user',
 *     params: IdParams,
 *     responses: { 204: null },
 *   }
 * )
 * ```
 */
export function del<
  TPath extends string,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  path: TPath,
  handler: AdonisRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
  options: GetRouteOptions<TQuery, TParams, TResponses>,
): AdonisRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineAdonisRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `DELETE ${path}` } as AdonisRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler,
  )
}

// ============================================================================
// Response Handling
// ============================================================================

/**
 * Handle the response from a route handler.
 */
function handleResponse(ctx: HttpContext, result: unknown): unknown {
  // Binary response (file downloads)
  if (isBinaryResponse(result)) {
    ctx.response.header('Content-Type', result.contentType)
    if (result.filename) {
      ctx.response.header('Content-Disposition', `attachment; filename="${result.filename}"`)
    }
    return ctx.response.status(result.status).send(result.data)
  }

  // Structured API response
  if (isApiResponse(result)) {
    if (result.status === 204) {
      return ctx.response.noContent()
    }
    return ctx.response.status(result.status).json(result.data)
  }

  // Raw result (fallback)
  return result
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create an AdonisJS request handler for a route definition.
 */
function createHandler(
  route: AnyRouteDefinition,
  options: RegisterControllerOptions,
) {
  const validate = options.validate ?? defaultValidate
  const { container } = options

  return async (ctx: HttpContext): Promise<unknown> => {
    // 1. Authentication
    // Auth is added by AdonisJS auth package, so we need to cast
    const authCtx = ctx as HttpContext & {
      auth: { authenticate(): Promise<void>; user?: unknown }
    }

    let user: unknown
    if (route.config.auth === 'required') {
      await authCtx.auth.authenticate()
      user = authCtx.auth.user
    } else if (route.config.auth === 'optional') {
      try {
        await authCtx.auth.authenticate()
        user = authCtx.auth.user
      } catch {
        // Ignore auth errors for optional auth
      }
    }

    // 2. Validation
    let body: unknown
    let query: unknown
    let params: unknown

    if (route.config.body) {
      body = validate(route.config.body, ctx.request.body())
    }
    if (route.config.query) {
      query = validate(route.config.query, ctx.request.qs())
    }
    // Use explicit params schema or auto-generate from path
    const paramsSchema = getParamsSchema(route.path, route.config.params)
    if (paramsSchema) {
      params = validate(paramsSchema, ctx.params)
    }

    // 3. Create namespaced response helpers
    const { reply, error } = createResponseHelpers(route.responses)

    // 4. Build handler context with AdonisJS extensions and response helpers
    const handlerCtx: AdonisHandlerContext = {
      body: body as never,
      query: query as never,
      params: params as never,
      user,
      raw: ctx,
      ctx,
      container,
      // Namespaced response helpers
      reply: reply as never,
      error: error as never,
    }

    // 5. Execute handler
    if (!route.handler) {
      throw new Error(
        `Route ${route.method.toUpperCase()} ${route.path} has no handler. `
        + 'Contract-only routes cannot be registered with a server adapter.',
      )
    }
    const result = await route.handler(handlerCtx as HandlerContext)

    // 6. Handle response
    return handleResponse(ctx, result)
  }
}

/**
 * Register a single route definition with AdonisJS router.
 */
function registerRoute(
  router: Router,
  route: AnyRouteDefinition,
  path: string,
  options: RegisterControllerOptions,
): void {
  const handler = createHandler(route, options)
  // Cast to get middleware property from AdonisRouteDefinition
  const adonisRoute = route as AdonisRouteDefinition

  let registeredRoute
  switch (route.method) {
    case 'get':
      registeredRoute = router.get(path, handler)
      break
    case 'post':
      registeredRoute = router.post(path, handler)
      break
    case 'put':
      registeredRoute = router.put(path, handler)
      break
    case 'patch':
      registeredRoute = router.patch(path, handler)
      break
    case 'delete':
      registeredRoute = router.delete(path, handler)
      break
    default:
      throw new Error(`Unsupported HTTP method: ${route.method}`)
  }

  // Apply middleware if specified
  if (adonisRoute.middleware && adonisRoute.middleware.length > 0) {
    registeredRoute.use(adonisRoute.middleware)
  }
}

/**
 * Register all routes from a controller definition with AdonisJS.
 *
 * Uses the function-based `defineRoute`/`defineController` API.
 *
 * @example
 * ```typescript
 * // start/routes.ts
 * import router from '@adonisjs/core/services/router'
 * import app from '@adonisjs/core/services/app'
 * import { registerController } from '@kontract/adonis'
 * import { usersController } from '#controllers/users'
 *
 * // Register controller routes (options parameter is optional)
 * registerController(router, usersController)
 * ```
 */
export function registerController(
  router: Router,
  controller: ControllerDefinition,
  options: RegisterControllerOptions = {},
): void {
  const routes = getControllerRoutes(controller)

  for (const { route, fullPath } of routes) {
    registerRoute(router, route, fullPath, options)
  }
}

/**
 * Register multiple controllers at once.
 *
 * @example
 * ```typescript
 * registerControllers(router, [
 *   usersController,
 *   postsController,
 *   commentsController,
 * ], options)
 * ```
 */
export function registerControllers(
  router: Router,
  controllers: ControllerDefinition[],
  options: RegisterControllerOptions = {},
): void {
  for (const controller of controllers) {
    registerController(router, controller, options)
  }
}
