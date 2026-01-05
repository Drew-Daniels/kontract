/**
 * kontract-adonis
 *
 * AdonisJS adapter for kontract.
 *
 * @example
 * ```typescript
 * // Using Elysia-style route builders (recommended)
 * import { get, post, Type, registerController, defineController } from '@kontract/adonis'
 *
 * const getUser = get('/api/v1/users/:id',
 *   {
 *     params: Type.Object({ id: Type.String() }),
 *     responses: {
 *       200: { schema: UserResponse },
 *       404: { schema: ApiError },
 *     },
 *   },
 *   async ({ params, reply, error }) => {
 *     const user = await User.find(params.id)
 *     if (!user) return error.notFound('User not found')
 *     return reply.ok(user.serialize())
 *   }
 * )
 *
 * const usersController = defineController({ tag: 'Users' }, { getUser })
 * ```
 */

// ============ TypeBox re-exports for schema definitions ============
export { Type, type Static } from '@sinclair/typebox'

// Re-export core helpers and types from kontract
export {
  binary,
  defineConfig,
  getConfig,
  defineController,
  // Response helpers
  ok,
  created,
  accepted,
  noContent,
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
  type RegisterControllerOptions,
  type AdonisHandlerContext,
  type AdonisRouteHandler,
  type AdonisRouteConfig,
  type AdonisRouteDefinition,
  type GetRouteOptions,
  type BodyRouteOptions,
} from './adapters/controller-registrar.js'

// ============ Validation ============
export {
  createAjvValidator,
  validate,
  stripNestedIds,
  getDefaultValidator,
  resetDefaultValidator,
  AjvValidationError,
  type AjvValidatorOptions,
} from './validation/index.js'

// ============ Builder ============
export { OpenApiBuilder, type OpenApiBuilderOptions } from './builder/index.js'
