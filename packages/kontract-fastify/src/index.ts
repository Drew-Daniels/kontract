/**
 * kontract-fastify
 *
 * Fastify adapter for kontract that leverages Fastify's
 * native validation for optimal performance.
 *
 * Key differences from Express/Hono adapters:
 * - No validate function needed - Fastify handles validation natively
 * - Schemas are passed directly to Fastify's route schema option
 * - Response schemas enable fast-json-stringify for 2x faster serialization
 * - Compiled validation - schemas compiled once at startup, not per-request
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify'
 * import {
 *   get,
 *   defineController,
 *   registerController,
 *   registerErrorHandler,
 *   Type,
 * } from '@kontract/fastify'
 *
 * const UserResponse = Type.Object({
 *   id: Type.String(),
 *   name: Type.String(),
 * })
 *
 * const getUser = get('/api/v1/users/:id',
 *   async ({ params, reply, error }) => {
 *     const user = await findUser(params.id)
 *     if (!user) return error.notFound()
 *     return reply.ok(user)
 *   },
 *   {
 *     params: Type.Object({ id: Type.String() }),
 *     responses: {
 *       200: { schema: UserResponse },
 *       404: { schema: ApiError, description: 'User not found' },
 *     },
 *   }
 * )
 *
 * const usersController = defineController({ tag: 'Users' }, { getUser })
 *
 * const app = Fastify()
 * registerErrorHandler(app)
 * registerController(app, usersController)
 * app.listen({ port: 3000 })
 * ```
 */

// Re-export TypeBox for convenience
export { Type, type Static } from '@sinclair/typebox'

// Re-export core types and functions from kontract
export {
  binary,
  defineConfig,
  getConfig,
  defineController,
  defineRoute,
  isRouteDefinition,
  isControllerDefinition,
  getControllerRoutes,
  // Response helpers
  ok,
  created,
  accepted,
  noContent as noContentResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable,
  apiError,
  type ApiResponse,
  type BinaryResponse,
  type EndpointMetadata,
  type ApiMetadata,
} from 'kontract'

// Adapters
// Response helpers (reply.*, error.*) are provided via the handler context
// and pre-typed based on the route's responses config.
export {
  registerController,
  registerControllers,
  // Elysia-style route builders (method as function name)
  get,
  post,
  put,
  patch,
  del,
  noContent,
  type RegisterControllerOptions,
  type FastifyHandlerContext,
  type FastifyRouteHandler,
  type FastifyRouteConfig,
  type FastifyRouteDefinition,
  type GetRouteOptions,
  type BodyRouteOptions,
  type ReplyHelpers,
  type ErrorHelpers,
} from './adapters/index.js'

// Middleware
export { registerErrorHandler, type ErrorHandlerOptions } from './middleware/index.js'

// Builder (re-exported from core)
export { OpenApiBuilder, type OpenApiBuilderOptions } from './builder/index.js'
