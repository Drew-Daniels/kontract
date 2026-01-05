/**
 * Register route definitions (from defineRoute/defineController) with Express.
 *
 * This provides an alternative to decorator-based route registration with
 * full TypeScript type inference.
 */
import type { Router, Request, Response, NextFunction } from 'express'
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
  authenticate?: (req: Request) => Promise<unknown>
}

// ============================================================================
// Express Handler Context
// ============================================================================

/**
 * Extended handler context for Express with typed body, query, params,
 * AND namespaced response helpers derived from the responses config.
 *
 * Path parameters are automatically inferred from the route path when
 * no explicit params schema is provided.
 */
export interface ExpressHandlerContext<
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
  /** Raw Express request (framework-specific) */
  raw: Request
  /** Express request (alias for raw) */
  req: Request

  /** Success response helpers (2xx) - methods typed from responses config */
  reply: ReplyHelpers<TResponses>
  /** Error response helpers (4xx/5xx) - methods typed from responses config */
  error: ErrorHelpers<TResponses>
}

/**
 * Handler function type for Express routes.
 */
export type ExpressRouteHandler<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = (ctx: ExpressHandlerContext<TPath, TBody, TQuery, TParams, TResponses>) => Promise<AnyResponse> | AnyResponse

/**
 * Extended RouteConfig for Express.
 */
export interface ExpressRouteConfig<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> extends RouteConfig<RouteString, TBody, TQuery, TParams> {
  /** Response definitions for this route */
  responses: TResponses
}

/**
 * Extended RouteDefinition for Express.
 */
export interface ExpressRouteDefinition<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> extends RouteDefinition<TPath, TBody, TQuery, TParams> {}

/**
 * Handle the response from a route handler.
 */
function handleResponse(res: Response, result: unknown): void {
  // Binary response (file downloads)
  if (isBinaryResponse(result)) {
    res.setHeader('Content-Type', result.contentType)
    if (result.filename) {
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    }
    res.status(result.status).send(result.data)
    return
  }

  // Structured API response
  if (isApiResponse(result)) {
    if (result.status === 204) {
      res.status(204).end()
      return
    }
    res.status(result.status).json(result.data)
    return
  }

  // Raw result (fallback)
  res.json(result)
}

// ============================================================================
// Define Route Builder
// ============================================================================

/**
 * Define an Express route with properly typed context and response helpers.
 *
 * This is a wrapper that provides Express-specific typed context including
 * `req` and pre-typed namespaced response helpers based on the responses config.
 *
 * @example
 * ```typescript
 * import { defineRoute, defineController } from '@kontract/express'
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
export function defineExpressRoute<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  config: ExpressRouteConfig<TBody, TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, TBody, TQuery, TParams> {
  const [method, path] = parseRouteString(config.route as RouteString)

  return {
    __type: 'route',
    method: method as HttpMethod,
    path: path as TPath,
    config,
    responses: normalizeResponses(config.responses),
    // Cast handler to the generic RouteHandler type
    // The actual context will be ExpressHandlerContext at runtime
    handler: handler as unknown as RouteDefinition<TPath, TBody, TQuery, TParams>['handler'],
  }
}

// ============================================================================
// Elysia-Style Route Builders (method-specific)
// ============================================================================

/**
 * Options for GET and DELETE routes (no body).
 * Explicitly defines all properties to ensure proper generic inference.
 */
export interface GetRouteOptions<
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> {
  /** Short summary for OpenAPI docs */
  summary?: string
  /** Detailed description for OpenAPI docs */
  description?: string
  /** Unique operation ID for OpenAPI */
  operationId?: string
  /** Mark route as deprecated */
  deprecated?: boolean
  /** Authentication requirement */
  auth?: 'required' | 'optional' | 'none'
  /** Query parameters schema */
  query?: TQuery
  /** Path parameters schema (optional - auto-inferred from path) */
  params?: TParams
  /** Response definitions for this route - REQUIRED for proper type inference */
  responses: TResponses
}

/**
 * Options for POST, PUT, PATCH routes (with body).
 * Explicitly defines all properties to ensure proper generic inference.
 */
export interface BodyRouteOptions<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> {
  /** Short summary for OpenAPI docs */
  summary?: string
  /** Detailed description for OpenAPI docs */
  description?: string
  /** Unique operation ID for OpenAPI */
  operationId?: string
  /** Mark route as deprecated */
  deprecated?: boolean
  /** Authentication requirement */
  auth?: 'required' | 'optional' | 'none'
  /** Request body schema */
  body?: TBody
  /** Query parameters schema */
  query?: TQuery
  /** Path parameters schema (optional - auto-inferred from path) */
  params?: TParams
  /** Response definitions for this route - REQUIRED for proper type inference */
  responses: TResponses
}

/**
 * Define a GET route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const listUsers = get('/api/v1/users',
 *   {
 *     summary: 'List users',
 *     query: UserQueryParams,
 *     responses: { 200: { schema: UserListResponse } },
 *   },
 *   async ({ query, reply }) => {
 *     const users = await User.findAll({ page: query.page })
 *     return reply.list(users)
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
  options: GetRouteOptions<TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineExpressRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `GET ${path}` } as ExpressRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler as ExpressRouteHandler<string, undefined, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a POST route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const createUser = post('/api/v1/users',
 *   {
 *     summary: 'Create a user',
 *     body: CreateUserRequest,
 *     responses: {
 *       201: { schema: UserResponse },
 *       400: { schema: ApiError },
 *     },
 *   },
 *   async ({ body, reply }) => {
 *     const user = await User.create(body)
 *     return reply.created(user)
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
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineExpressRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `POST ${path}` } as ExpressRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as ExpressRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a PUT route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const updateUser = put('/api/v1/users/:id',
 *   {
 *     summary: 'Update a user',
 *     params: IdParams,
 *     body: UpdateUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   },
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id)
 *     Object.assign(user, body)
 *     await user.save()
 *     return reply.ok(user)
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
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineExpressRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PUT ${path}` } as ExpressRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as ExpressRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a PATCH route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const patchUser = patch('/api/v1/users/:id',
 *   {
 *     summary: 'Partially update a user',
 *     params: IdParams,
 *     body: PatchUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   },
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id)
 *     Object.assign(user, body)
 *     await user.save()
 *     return reply.ok(user)
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
  options: BodyRouteOptions<TBody, TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineExpressRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PATCH ${path}` } as ExpressRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler as ExpressRouteHandler<string, TBody, TQuery, TParams, TResponses>,
  )
}

/**
 * Define a DELETE route with Elysia-style API.
 *
 * @example
 * ```typescript
 * const deleteUser = del('/api/v1/users/:id',
 *   {
 *     summary: 'Delete a user',
 *     params: IdParams,
 *     responses: { 204: null },
 *   },
 *   async ({ params, reply }) => {
 *     const user = await User.findById(params.id)
 *     await user.delete()
 *     return reply.noContent()
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
  options: GetRouteOptions<TQuery, TParams, TResponses>,
  handler: ExpressRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
): ExpressRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineExpressRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `DELETE ${path}` } as ExpressRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler as ExpressRouteHandler<string, undefined, TQuery, TParams, TResponses>,
  )
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create an Express request handler for a route definition.
 */
function createHandler(
  route: AnyRouteDefinition,
  options: RegisterControllerOptions,
) {
  const validate = options.validate ?? defaultValidate
  const { authenticate } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Authentication
      let user: unknown
      if (route.config.auth === 'required') {
        if (!authenticate) {
          throw Object.assign(
            new Error('Authentication required but no authenticate function provided'),
            { status: 500 },
          )
        }
        user = await authenticate(req)
      } else if (route.config.auth === 'optional' && authenticate) {
        try {
          user = await authenticate(req)
        } catch {
          // Ignore auth errors for optional auth
        }
      }

      // 2. Validation
      let body: unknown
      let query: unknown
      let params: unknown

      if (route.config.body) {
        body = validate(route.config.body, req.body)
      }
      if (route.config.query) {
        query = validate(route.config.query, req.query)
      }
      if (route.config.params) {
        params = validate(route.config.params, req.params)
      }

      // 3. Create namespaced response helpers
      const { reply, error } = createResponseHelpers(route.responses)

      // 4. Build handler context with Express extensions and response helpers
      const ctx: ExpressHandlerContext = {
        body: body as never,
        query: query as never,
        params: params as never,
        user,
        raw: req,
        req,
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
      const result = await route.handler(ctx as never)

      // 6. Handle response
      handleResponse(res, result)
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Register a single route definition with Express router.
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
 * Register all routes from a controller definition with Express.
 *
 * Uses the function-based `defineRoute`/`defineController` API.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { registerController, createErrorHandler } from '@kontract/express'
 * import { usersController } from './controllers/users.js'
 *
 * const app = express()
 * app.use(express.json())
 *
 * // Register controller routes (options parameter is optional)
 * registerController(app, usersController)
 *
 * // Error handler must be last
 * app.use(createErrorHandler())
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
