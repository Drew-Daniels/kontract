/**
 * Register route definitions (from defineRoute/defineController) with Koa.
 *
 * This provides an alternative to decorator-based route registration with
 * full TypeScript type inference.
 */
import type Router from '@koa/router'
import type { Context, Next, Middleware } from 'koa'
import type { TSchema, Static } from '@sinclair/typebox'
import { validate as defaultValidate } from '@kontract/ajv'
import {
  type ControllerDefinition,
  type RouteDefinition,
  type AnyRouteDefinition,
  type RouteConfig,
  type AnyResponse,
  type HttpMethod,
  type RouteString,
  type ResponsesConfig,
  type ReplyHelpers,
  type ErrorHelpers,
  type ParamsFromPath,
  getControllerRoutes,
  isBinaryResponse,
  parseRouteString,
  normalizeResponses,
  createResponseHelpers,
  isApiResponse,
  noContent,
  getParamsSchema,
} from 'kontract'

// Re-export shared types and helpers for convenience
export type { ReplyHelpers, ErrorHelpers }
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
   * Optional authentication function.
   * Called when route has auth: 'required' or 'optional'.
   * Should return user data or throw an error with status property.
   */
  authenticate?: (ctx: Context) => Promise<unknown>
}

// ============================================================================
// Koa Handler Context
// ============================================================================

/**
 * Extended handler context for Koa with typed body, query, params,
 * AND namespaced response helpers derived from the responses config.
 *
 * Path parameters are automatically inferred from the route path when
 * no explicit params schema is provided.
 */
export interface KoaHandlerContext<
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
  /** Validated path parameters (inferred from path or explicit schema) */
  params: TParams extends TSchema ? Static<TParams> : ParamsFromPath<TPath>
  /** Authenticated user (available when auth is 'required' or 'optional') */
  user: unknown
  /** Raw Koa context (framework-specific) */
  raw: Context
  /** Koa context (alias for raw, Koa convention) */
  ctx: Context

  /** Success response helpers (2xx) - methods typed from responses config */
  reply: ReplyHelpers<TResponses>
  /** Error response helpers (4xx/5xx) - methods typed from responses config */
  error: ErrorHelpers<TResponses>
}

/**
 * Handler function type for Koa routes.
 */
export type KoaRouteHandler<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = (ctx: KoaHandlerContext<TPath, TBody, TQuery, TParams, TResponses>) => Promise<AnyResponse> | AnyResponse

/**
 * Extended RouteConfig for Koa.
 */
export interface KoaRouteConfig<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> extends RouteConfig<RouteString, TBody, TQuery, TParams> {
  /** Response definitions for this route */
  responses: TResponses
}

/**
 * Extended RouteDefinition for Koa.
 */
export interface KoaRouteDefinition<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> extends RouteDefinition<TPath, TBody, TQuery, TParams> {}

/**
 * Handle the response from a route handler.
 * Koa uses assignment to ctx.body instead of method calls.
 */
function handleResponse(ctx: Context, result: unknown): void {
  // Binary response (file downloads)
  if (isBinaryResponse(result)) {
    ctx.type = result.contentType
    if (result.filename) {
      ctx.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    }
    ctx.status = result.status
    ctx.body = result.data
    return
  }

  // Structured API response
  if (isApiResponse(result)) {
    ctx.status = result.status
    if (result.status === 204) {
      ctx.body = null
    } else {
      ctx.body = result.data
    }
    return
  }

  // Raw result (fallback)
  ctx.body = result
}

// ============================================================================
// Define Route Builder
// ============================================================================

/**
 * Define a Koa route with properly typed context and response helpers.
 *
 * This is a wrapper that provides Koa-specific typed context including
 * `ctx` and pre-typed namespaced response helpers based on the responses config.
 *
 * @example
 * ```typescript
 * import { defineRoute, defineController } from '@kontract/koa'
 *
 * const getUser = defineRoute({
 *   route: 'GET /api/v1/users/:id',
 *   params: UserParams,
 *   responses: {
 *     200: { schema: UserResponse },
 *     404: { schema: ApiError, description: 'User not found' },
 *   },
 * }, async ({ params, reply, error }) => {
 *   const user = await findUser(params.id)
 *   if (!user) return error.notFound()
 *   return reply.ok(user)
 * })
 * ```
 */
export function defineKoaRoute<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  config: KoaRouteConfig<TBody, TQuery, TParams, TResponses>,
  handler: KoaRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, TBody, TQuery, TParams> {
  const [method, path] = parseRouteString(config.route as RouteString)

  return {
    __type: 'route',
    method: method as HttpMethod,
    path: path as TPath,
    config,
    responses: normalizeResponses(config.responses),
    // Cast handler to the generic RouteHandler type
    // The actual context will be KoaHandlerContext at runtime
    handler: handler as unknown as RouteDefinition<TPath, TBody, TQuery, TParams>['handler'],
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
> = Omit<KoaRouteConfig<undefined, TQuery, TParams, TResponses>, 'route' | 'body'>

/**
 * Options for POST, PUT, PATCH routes (with body).
 */
export type BodyRouteOptions<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = Omit<KoaRouteConfig<TBody, TQuery, TParams, TResponses>, 'route'>

/**
 * Define a GET route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const listUsers = get('/api/v1/users',
 *   async ({ query, reply }) => {
 *     const users = await User.findAll({ page: query.page })
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
  handler: KoaRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
  options: GetRouteOptions<TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineKoaRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `GET ${path}` } as KoaRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler as KoaRouteHandler<string, undefined, TQuery, TParams, TResponses>,
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
  handler: KoaRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineKoaRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `POST ${path}` } as KoaRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as KoaRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a PUT route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const updateUser = put('/api/v1/users/:id',
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id)
 *     Object.assign(user, body)
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
  handler: KoaRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineKoaRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PUT ${path}` } as KoaRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as KoaRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a PATCH route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const patchUser = patch('/api/v1/users/:id',
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id)
 *     Object.assign(user, body)
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
  handler: KoaRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineKoaRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PATCH ${path}` } as KoaRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as KoaRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a DELETE route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const deleteUser = del('/api/v1/users/:id',
 *   async ({ params, reply }) => {
 *     const user = await User.findById(params.id)
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
  handler: KoaRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
  options: GetRouteOptions<TQuery, TParams, TResponses>,
): KoaRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineKoaRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `DELETE ${path}` } as KoaRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler as KoaRouteHandler<string, undefined, TQuery, TParams, TResponses>,
  )
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create a Koa middleware handler for a route definition.
 */
function createHandler(
  route: AnyRouteDefinition,
  options: RegisterControllerOptions,
): Middleware {
  const validate = options.validate ?? defaultValidate
  const { authenticate } = options

  return async (ctx: Context, _next: Next) => {
    // 1. Authentication
    let user: unknown
    if (route.config.auth === 'required') {
      if (!authenticate) {
        throw Object.assign(
          new Error('Authentication required but no authenticate function provided'),
          { status: 500 },
        )
      }
      user = await authenticate(ctx)
    } else if (route.config.auth === 'optional' && authenticate) {
      try {
        user = await authenticate(ctx)
      } catch {
        // Ignore auth errors for optional auth
      }
    }

    // 2. Validation
    let body: unknown
    let query: unknown
    let params: unknown

    if (route.config.body) {
      // Koa uses ctx.request.body for parsed body (via koa-bodyparser)
      body = validate(route.config.body, ctx.request.body)
    }
    if (route.config.query) {
      query = validate(route.config.query, ctx.query)
    }
    // Use explicit params schema or auto-generate from path
    const paramsSchema = getParamsSchema(route.path, route.config.params)
    if (paramsSchema) {
      // @koa/router puts params on ctx.params
      params = validate(paramsSchema, ctx.params)
    }

    // 3. Create namespaced response helpers
    const { reply, error } = createResponseHelpers(route.responses)

    // 4. Build handler context with Koa extensions and response helpers
    const handlerCtx: KoaHandlerContext = {
      body: body as never,
      query: query as never,
      params: params as never,
      user,
      raw: ctx,
      ctx,
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
    const result = await route.handler(handlerCtx as never)

    // 6. Handle response
    handleResponse(ctx, result)
  }
}

/**
 * Register a single route definition with Koa router.
 */
function registerRoute(
  router: Router,
  route: AnyRouteDefinition,
  path: string,
  options: RegisterControllerOptions,
): void {
  const handler = createHandler(route, options)

  switch (route.method) {
    case 'get':
      router.get(path, handler)
      break
    case 'post':
      router.post(path, handler)
      break
    case 'put':
      router.put(path, handler)
      break
    case 'patch':
      router.patch(path, handler)
      break
    case 'delete':
      router.delete(path, handler)
      break
    default:
      throw new Error(`Unsupported HTTP method: ${route.method}`)
  }
}

/**
 * Register all routes from a controller definition with Koa router.
 *
 * Uses the function-based `defineRoute`/`defineController` API.
 *
 * @example
 * ```typescript
 * import Koa from 'koa'
 * import Router from '@koa/router'
 * import bodyParser from 'koa-bodyparser'
 * import { registerController, createErrorHandler } from '@kontract/koa'
 * import { usersController } from './controllers/users.js'
 *
 * const app = new Koa()
 * const router = new Router()
 *
 * app.use(bodyParser())
 * app.use(createErrorHandler())
 *
 * // Register controller routes (options parameter is optional)
 * registerController(router, usersController)
 *
 * app.use(router.routes())
 * app.use(router.allowedMethods())
 *
 * app.listen(3000)
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
