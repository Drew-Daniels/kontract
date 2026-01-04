import type { HttpMethod, EndpointMetadata } from '../metadata/types.js'
import type { AnyResponse } from '../response/types.js'

/**
 * Framework-agnostic request representation.
 */
export interface RequestContext {
  /** HTTP method (lowercase) */
  method: HttpMethod
  /** Request path */
  path: string
  /** Parsed path parameters */
  params: Record<string, string>
  /** Parsed query parameters */
  query: Record<string, unknown>
  /** Request body (parsed) */
  body: unknown
  /** Request headers */
  headers: Record<string, string | string[] | undefined>
  /** Framework-specific request object */
  raw: unknown
}

/**
 * User information from authentication.
 */
export interface AuthUser {
  id: string | number
  [key: string]: unknown
}

/**
 * Authentication result.
 */
export interface AuthResult {
  authenticated: boolean
  user?: AuthUser
}

/**
 * Route handler signature for adapter implementations.
 * @see RouteHandler from builder/define-route.ts for user-facing handler type
 */
export type AdapterRouteHandler = (ctx: RequestContext) => Promise<AnyResponse>

/**
 * Router adapter interface.
 * Implement this to integrate with a web framework.
 */
export interface RouterAdapter {
  /**
   * Register a route with the framework.
   */
  register(
    method: HttpMethod,
    path: string,
    handler: AdapterRouteHandler,
    metadata: EndpointMetadata,
  ): void

  /**
   * Get all registered routes (optional, for debugging).
   */
  getRoutes?(): Array<{ method: HttpMethod; path: string }>
}

/**
 * Authentication adapter interface.
 * Implement this to integrate with an auth system.
 */
export interface AuthAdapter {
  /**
   * Authenticate the request.
   * Should return user info if authenticated, or null/undefined otherwise.
   */
  authenticate(ctx: RequestContext): Promise<AuthResult>

  /**
   * Get the authenticated user or throw if not authenticated.
   */
  getUserOrFail(ctx: RequestContext): Promise<AuthUser>
}

/**
 * Container/DI adapter interface.
 * Implement this to integrate with a dependency injection container.
 */
export interface ContainerAdapter {
  /**
   * Resolve a class from the container.
   */
  resolve<T>(target: new (...args: unknown[]) => T): T

  /**
   * Check if a class is registered in the container.
   */
  has(target: new (...args: unknown[]) => unknown): boolean
}

/**
 * Response adapter interface.
 * Implement this to send responses through the framework.
 */
export interface ResponseAdapter {
  /**
   * Send a JSON response.
   */
  sendJson(ctx: RequestContext, status: number, data: unknown): void

  /**
   * Send a binary/file response.
   */
  sendBinary(
    ctx: RequestContext,
    status: number,
    contentType: string,
    data: Buffer | string,
    filename?: string,
  ): void

  /**
   * Send an empty response (204 No Content).
   */
  sendEmpty(ctx: RequestContext, status: number): void
}

/**
 * Logger adapter interface.
 * Implement this to integrate with a logging system.
 */
export interface LoggerAdapter {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

/**
 * Complete adapter set for a framework integration.
 */
export interface FrameworkAdapters {
  router: RouterAdapter
  auth?: AuthAdapter
  container?: ContainerAdapter
  response: ResponseAdapter
  logger?: LoggerAdapter
}
