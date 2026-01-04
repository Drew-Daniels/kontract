/**
 * kontract
 *
 * Framework-agnostic library for building type-safe, documented APIs with TypeBox schema support.
 *
 * @example
 * ```typescript
 * import { defineRoute, defineController } from 'kontract'
 * import { Type } from '@sinclair/typebox'
 *
 * const User = Type.Object({
 *   id: Type.Number(),
 *   name: Type.String(),
 * })
 *
 * const getUser = defineRoute({
 *   route: 'GET /api/v1/users/:id',
 *   params: Type.Object({ id: Type.String() }),
 *   responses: { 200: { schema: User }, 404: null },
 * }, async ({ params, reply }) => {
 *   const user = await findUser(params.id)
 *   if (!user) return reply.notFound()
 *   return reply.ok(user)
 * })
 *
 * export const usersController = defineController({ tag: 'Users' }, { getUser })
 * ```
 */

// ============ Metadata ============
export type {
  HttpMethod,
  AuthLevel,
  RouteString,
  ResponseDefinition,
  ResponseExample,
  ResponseHeader,
  FileUploadConfig,
  ApiMetadata,
  EndpointMetadata,
  ControllerMetadata,
} from './metadata/types.js'

// ============ Response ============
export type {
  ApiResponse,
  BinaryResponse,
  AnyResponse,
  ApiErrorBody,
  ErrorCode,
} from './response/types.js'

export { isBinaryResponse, ErrorCodes } from './response/types.js'

export {
  respond,
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
  badGateway,
  serviceUnavailable,
  binary,
  apiError,
} from './response/helpers.js'

// ============ Configuration ============
export type {
  OpenApiInfo,
  OpenApiServer,
  ValidatorFn,
  SerializerFn,
  SerializerRegistration,
  OpenApiDecoratorConfig,
  UserConfig,
} from './config/types.js'

export {
  defineConfig,
  getConfig,
  getConfigOrUndefined,
  isConfigured,
  resetConfig,
} from './config/define-config.js'

// ============ Errors ============
export { OpenApiDecoratorError } from './errors/base.js'

export {
  RequestValidationError,
  ResponseValidationError,
  type ValidationErrorDetail,
} from './errors/validation.js'

export {
  ConfigurationError,
  AdapterNotFoundError,
  SerializerNotFoundError,
} from './errors/configuration.js'

// ============ Runtime (Adapters) ============
export type {
  RequestContext,
  AuthUser,
  AuthResult,
  AdapterRouteHandler,
  RouterAdapter,
  AuthAdapter,
  ContainerAdapter,
  ResponseAdapter,
  LoggerAdapter,
  FrameworkAdapters,
} from './runtime/types.js'

// ============ Runtime (Shared Adapter Utilities) ============
// These are used by all framework adapters to reduce code duplication
export type {
  ResponsesConfig,
  NormalizedResponse,
  NormalizedResponses,
  ExtractResponseSchema,
  ResponseSchemaFor,
  TypedHelper,
  TypedErrorHelper,
  ReplyHelpers,
  ErrorHelpers,
  BaseHandlerContext,
} from './runtime/adapter-types.js'

export {
  ERROR_CODES,
  createSuccessHelper,
  createErrorHelper,
  getErrorMessage,
  createResponseHelpers,
} from './runtime/response-helpers.js'

export {
  parseRouteString,
  normalizeResponses,
  isApiResponse,
} from './runtime/route-utils.js'

// ============ Validation ============
export type {
  Validator,
  CompiledValidator,
  ValidatorOptions,
} from './validation/types.js'

// ============ Builder (OpenAPI Types) ============
export type {
  OpenApiVersion,
  OpenApiDocument,
  OpenApiPathItem,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiMediaType,
  OpenApiHeader,
  OpenApiSchema,
  OpenApiSecurityScheme,
} from './builder/types.js'

export { OpenApiBuilder, type OpenApiBuilderOptions } from './builder/openapi-builder.js'

// ============ Route Builder ============
export {
  defineRoute,
  isRouteDefinition,
  type RouteConfig,
  type HandlerContext,
  type RouteHandler,
  type RouteDefinition,
} from './builder/define-route.js'

export {
  defineController,
  isControllerDefinition,
  getControllerRoutes,
  type ControllerConfig,
  type ControllerDefinition,
  type RouteRecord,
  type AnyRouteDefinition,
} from './builder/define-controller.js'

// ============ Path Parameter Utilities ============
export {
  extractParamNames,
  createParamsSchema,
  getParamsSchema,
  type ExtractRouteParams,
  type HasPathParams,
  type ParamsFromPath,
  type InferParams,
} from './builder/path-params.js'
