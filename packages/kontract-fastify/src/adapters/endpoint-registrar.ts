/**
 * Register route definitions (from defineRoute/defineController) with Fastify.
 *
 * This provides an alternative to decorator-based route registration with
 * full TypeScript type inference.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply, HTTPMethods, RouteShorthandOptions } from 'fastify'
import type { TSchema, Static } from '@sinclair/typebox'
import {
  type ControllerDefinition,
  type RouteDefinition,
  type AnyRouteDefinition,
  type RouteConfig,
  type AnyResponse,
  type HttpMethod,
  type ParamsFromPath,
  type RouteString,
  type ResponsesConfig,
  type ReplyHelpers,
  type ErrorHelpers,
  getControllerRoutes,
  isBinaryResponse,
  getParamsSchema,
  parseRouteString,
  normalizeResponses,
  createResponseHelpers,
  noContent,
} from 'kontract'

// Re-export shared types and helpers for convenience
export type { ReplyHelpers, ErrorHelpers }
export { noContent }

/**
 * Options for registerController.
 * Note: No validate function needed - Fastify handles validation natively!
 */
export interface RegisterControllerOptions {
  /**
   * Optional authentication function.
   * Called when route has auth: 'required' or 'optional'.
   * Should throw an error with statusCode property for auth failures.
   */
  authenticate?: (req: FastifyRequest) => Promise<unknown>
}

// ============================================================================
// Fastify Handler Context
// ============================================================================

/**
 * Extended handler context for Fastify with typed body, query, params,
 * AND namespaced response helpers derived from the responses config.
 */
export interface FastifyHandlerContext<
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
  /** Validated path parameters (typed from params schema, or inferred from path) */
  params: TParams extends TSchema ? Static<TParams> : ParamsFromPath<TPath>
  /** Authenticated user (available when auth is 'required' or 'optional') */
  user: unknown
  /** Raw Fastify request (framework-specific) */
  raw: FastifyRequest
  /** Fastify request (alias for raw) */
  request: FastifyRequest

  /** Success response helpers (2xx) - methods typed from responses config */
  reply: ReplyHelpers<TResponses>
  /** Error response helpers (4xx/5xx) - methods typed from responses config */
  error: ErrorHelpers<TResponses>
}

/**
 * Handler function type for Fastify routes.
 */
export type FastifyRouteHandler<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = (ctx: FastifyHandlerContext<TPath, TBody, TQuery, TParams, TResponses>) => Promise<AnyResponse> | AnyResponse

/**
 * Extended RouteConfig for Fastify.
 */
export interface FastifyRouteConfig<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> extends RouteConfig<RouteString, TBody, TQuery, TParams> {
  /** Response definitions for this route */
  responses: TResponses
}

/**
 * Extended RouteDefinition for Fastify.
 */
export interface FastifyRouteDefinition<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
> extends RouteDefinition<TPath, TBody, TQuery, TParams> {}

// ============================================================================
// Define Route Builder
// ============================================================================

/**
 * Define a Fastify route with properly typed context and response helpers.
 *
 * This is a wrapper that provides Fastify-specific typed context including
 * `request` and pre-typed namespaced response helpers based on the responses config.
 *
 * Path parameters are automatically inferred from the route string:
 * - `/users/:id` → `params.id: string`
 * - `/users/:userId/posts/:postId` → `params.userId: string, params.postId: string`
 *
 * You can override with explicit params schema for additional validation (e.g., uuid format).
 *
 * @example
 * ```typescript
 * import { defineFastifyRoute, defineController } from '@kontract/fastify'
 *
 * const getUser = defineFastifyRoute({
 *   route: 'GET /api/v1/users/:id',
 *   // params: UserParams, // Optional - inferred from route string!
 *   responses: {
 *     200: { schema: UserResponse },
 *     404: { schema: ApiError, description: 'User not found' },
 *   },
 * }, async ({ params, reply, error }) => {
 *   const user = await findUser(params.id) // params.id is typed as string
 *   if (!user) return error.notFound()
 *   return reply.ok(user)
 * })
 * ```
 */
export function defineFastifyRoute<
  TPath extends string = string,
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
>(
  config: FastifyRouteConfig<TBody, TQuery, TParams, TResponses>,
  handler: FastifyRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, TBody, TQuery, TParams> {
  const [method, path] = parseRouteString(config.route as RouteString)

  return {
    __type: 'route',
    method: method as HttpMethod,
    path: path as TPath,
    config,
    responses: normalizeResponses(config.responses),
    // Cast handler to the generic RouteHandler type
    // The actual context will be FastifyHandlerContext at runtime
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
> = Omit<FastifyRouteConfig<undefined, TQuery, TParams, TResponses>, 'route' | 'body'>

/**
 * Options for POST, PUT, PATCH routes (with body).
 */
export type BodyRouteOptions<
  TBody extends TSchema | undefined = undefined,
  TQuery extends TSchema | undefined = undefined,
  TParams extends TSchema | undefined = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> = Omit<FastifyRouteConfig<TBody, TQuery, TParams, TResponses>, 'route'>

/**
 * Define a GET route with Elysia-style API.
 *
 * Path parameters are automatically inferred from the path string.
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
 *
 * // Path params inferred automatically
 * const getUser = get('/api/v1/users/:id',
 *   { responses: { 200: { schema: UserResponse } } },
 *   async ({ params, reply }) => {
 *     const user = await User.find(params.id) // params.id is typed!
 *     return reply.ok(user)
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
  handler: FastifyRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineFastifyRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `GET ${path}` } as FastifyRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a POST route with Elysia-style API.
 *
 * Path parameters are automatically inferred from the path string.
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
  handler: FastifyRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineFastifyRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `POST ${path}` } as FastifyRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a PUT route with Elysia-style API.
 *
 * Path parameters are automatically inferred from the path string.
 *
 * @example
 * ```typescript
 * const updateUser = put('/api/v1/users/:id',
 *   {
 *     summary: 'Update a user',
 *     // params: IdParams, // Optional - inferred from path!
 *     body: UpdateUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   },
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id) // params.id is typed!
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
  handler: FastifyRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineFastifyRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PUT ${path}` } as FastifyRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a PATCH route with Elysia-style API.
 *
 * Path parameters are automatically inferred from the path string.
 *
 * @example
 * ```typescript
 * const patchUser = patch('/api/v1/users/:id',
 *   {
 *     summary: 'Partially update a user',
 *     // params: IdParams, // Optional - inferred from path!
 *     body: PatchUserRequest,
 *     responses: { 200: { schema: UserResponse } },
 *   },
 *   async ({ params, body, reply }) => {
 *     const user = await User.findById(params.id) // params.id is typed!
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
  handler: FastifyRouteHandler<TPath, TBody, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, TBody, TQuery, TParams> {
  return defineFastifyRoute<TPath, TBody, TQuery, TParams, TResponses>(
    { ...options, route: `PATCH ${path}` } as FastifyRouteConfig<TBody, TQuery, TParams, TResponses>,
    handler,
  )
}

/**
 * Define a DELETE route with Elysia-style API.
 *
 * Path parameters are automatically inferred from the path string.
 *
 * @example
 * ```typescript
 * const deleteUser = del('/api/v1/users/:id',
 *   {
 *     summary: 'Delete a user',
 *     // params: IdParams, // Optional - inferred from path!
 *     responses: { 204: null },
 *   },
 *   async ({ params, reply }) => {
 *     const user = await User.findById(params.id) // params.id is typed!
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
  handler: FastifyRouteHandler<TPath, undefined, TQuery, TParams, TResponses>,
): FastifyRouteDefinition<TPath, undefined, TQuery, TParams> {
  return defineFastifyRoute<TPath, undefined, TQuery, TParams, TResponses>(
    { ...options, route: `DELETE ${path}` } as FastifyRouteConfig<undefined, TQuery, TParams, TResponses>,
    handler,
  )
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register a single route definition with Fastify.
 */
function registerRoute(
  app: FastifyInstance,
  route: AnyRouteDefinition,
  path: string,
  options: RegisterControllerOptions,
): void {
  // Build Fastify schema from route config
  const schema: RouteShorthandOptions['schema'] = {}

  if (route.config.body) {
    schema.body = route.config.body
  }
  if (route.config.query) {
    schema.querystring = route.config.query
  }
  // Use explicit params schema or auto-generate from path
  const paramsSchema = getParamsSchema(route.path, route.config.params)
  if (paramsSchema) {
    schema.params = paramsSchema
  }

  // Response schemas enable fast-json-stringify
  if (route.responses) {
    const responseSchemas: Record<string, unknown> = {}
    for (const [status, response] of Object.entries(route.responses)) {
      if (response.schema) {
        responseSchemas[status] = response.schema
      }
    }
    if (Object.keys(responseSchemas).length > 0) {
      schema.response = responseSchemas
    }
  }

  // Note: OpenAPI metadata (tags, summary, description, deprecated) is NOT added
  // to the Fastify schema. It's used by OpenApiBuilder to generate the spec.
  // Fastify's schema is purely for validation and fast-json-stringify.

  const handler = createHandler(route, options)

  // Register with Fastify
  app.route({
    method: route.method.toUpperCase() as HTTPMethods,
    url: path,
    schema,
    handler,
  })
}

/**
 * Create a Fastify handler for a route definition.
 */
function createHandler(
  route: AnyRouteDefinition,
  options: RegisterControllerOptions,
) {
  return async (request: FastifyRequest, fastifyReply: FastifyReply) => {
    const { authenticate } = options

    // 1. Authentication (validation already done by Fastify!)
    let user: unknown
    if (route.config.auth === 'required') {
      if (!authenticate) {
        throw Object.assign(
          new Error('Authentication required but no authenticate function provided'),
          { statusCode: 500 },
        )
      }
      user = await authenticate(request)
    } else if (route.config.auth === 'optional' && authenticate) {
      try {
        user = await authenticate(request)
      } catch {
        // Ignore auth errors for optional auth
      }
    }

    // 2. Create namespaced response helpers
    const { reply, error } = createResponseHelpers(route.responses)

    // 3. Build handler context with Fastify extensions and response helpers
    const ctx: FastifyHandlerContext = {
      body: request.body as never,
      query: request.query as never,
      params: request.params as never,
      user,
      raw: request,
      request,
      // Namespaced response helpers
      reply: reply as never,
      error: error as never,
    }

    // 4. Execute handler
    if (!route.handler) {
      throw new Error(
        `Route ${route.method.toUpperCase()} ${route.path} has no handler. `
        + 'Contract-only routes cannot be registered with a server adapter.',
      )
    }
    const result = await route.handler(ctx as never)

    // 5. Handle response
    if (result === null || result === undefined) {
      return fastifyReply.status(204).send()
    }

    // Handle binary responses (file downloads, images, etc.)
    if (isBinaryResponse(result)) {
      fastifyReply.header('Content-Type', result.contentType)
      if (result.filename) {
        fastifyReply.header('Content-Disposition', `attachment; filename="${result.filename}"`)
      }
      return fastifyReply.status(result.status).send(result.data)
    }

    // Standard JSON response
    // Fastify uses fast-json-stringify automatically if response schema is defined
    const responseResult = result as { status: number; data: unknown }
    return fastifyReply.status(responseResult.status).send(responseResult.data)
  }
}

/**
 * Register all routes from a controller definition with Fastify.
 *
 * Uses the function-based `defineRoute`/`defineController` API.
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify'
 * import { registerController, registerErrorHandler } from '@kontract/fastify'
 * import { usersController } from './controllers/users.js'
 *
 * const app = Fastify()
 *
 * // Register error handler FIRST
 * registerErrorHandler(app)
 *
 * // Register controller routes
 * registerController(app, usersController, {
 *   authenticate: async (req) => verifyToken(req.headers.authorization),
 * })
 *
 * app.listen({ port: 3000 })
 * ```
 */
export function registerController(
  app: FastifyInstance,
  controller: ControllerDefinition,
  options: RegisterControllerOptions = {},
): void {
  const routes = getControllerRoutes(controller)

  for (const { route, fullPath } of routes) {
    registerRoute(app, route, fullPath, options)
  }
}

/**
 * Register multiple controllers at once.
 *
 * @example
 * ```typescript
 * registerControllers(app, [
 *   usersController,
 *   postsController,
 *   commentsController,
 * ], options)
 * ```
 */
export function registerControllers(
  app: FastifyInstance,
  controllers: ControllerDefinition[],
  options: RegisterControllerOptions = {},
): void {
  for (const controller of controllers) {
    registerController(app, controller, options)
  }
}
