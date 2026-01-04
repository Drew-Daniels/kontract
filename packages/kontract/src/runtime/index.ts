/**
 * Runtime utilities for kontract adapters.
 *
 * This module exports shared code used by all framework adapters
 * (Hono, Fastify, Express, AdonisJS) to reduce code duplication.
 */

// Existing runtime types (framework adapters)
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
} from './types.js'

// Adapter-specific type definitions (for response helpers)
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
} from './adapter-types.js'

// Response helpers
export {
  ERROR_CODES,
  createSuccessHelper,
  createErrorHelper,
  getErrorMessage,
  createResponseHelpers,
} from './response-helpers.js'

// Route utilities
export type { RouteString } from './route-utils.js'
export {
  parseRouteString,
  normalizeResponses,
  isApiResponse,
  noContent,
} from './route-utils.js'
