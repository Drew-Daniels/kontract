/**
 * kontract-express
 *
 * Express adapter for kontract.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import {
 *   get,
 *   defineController,
 *   registerController,
 *   createErrorHandler,
 *   Type,
 * } from '@kontract/express'
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
 * const app = express()
 * app.use(express.json())
 * // No options needed - uses built-in AJV validator by default
 * registerController(app, usersController)
 * app.use(createErrorHandler())
 * app.listen(3000)
 * ```
 */

// ============ TypeBox re-exports for schema definitions ============
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

// Re-export validation for convenience
export {
  validate,
  createAjvValidator,
  AjvValidationError,
  type AjvValidatorOptions,
} from '@kontract/ajv'

// ============ Adapters ============
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
  type ExpressHandlerContext,
  type ExpressRouteHandler,
  type ExpressRouteConfig,
  type ExpressRouteDefinition,
  type GetRouteOptions,
  type BodyRouteOptions,
  type ReplyHelpers,
  type ErrorHelpers,
} from './adapters/index.js'

// ============ Middleware ============
export {
  createErrorHandler,
  type ErrorHandlerOptions,
} from './middleware/index.js'

// ============ Builder ============
export { OpenApiBuilder, type OpenApiBuilderOptions } from './builder/index.js'
