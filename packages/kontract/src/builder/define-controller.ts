/**
 * Controller builder for grouping routes under an OpenAPI tag.
 *
 * @example
 * ```typescript
 * const usersController = defineController({
 *   tag: 'Users',
 *   description: 'User management routes',
 * }, {
 *   getUser,
 *   createUser,
 *   updateUser,
 *   deleteUser,
 * })
 * ```
 */
import type { TSchema } from '@sinclair/typebox'
import type { RouteDefinition } from './define-route.js'

/**
 * Configuration for defineController.
 */
export interface ControllerConfig {
  /** OpenAPI tag for grouping routes */
  tag: string
  /** Description of the controller/API group */
  description?: string
  /** Optional path prefix for all routes */
  prefix?: string
}

/**
 * Any route definition regardless of its generic parameters.
 * Used in controller definitions to allow mixed route types.
 */
export type AnyRouteDefinition = RouteDefinition<string, TSchema | undefined, TSchema | undefined, TSchema | undefined>

/**
 * A record of route definitions.
 */
export type RouteRecord = Record<string, AnyRouteDefinition>

/**
 * Controller definition returned by defineController.
 */
export interface ControllerDefinition<T extends RouteRecord = RouteRecord> {
  /** Type discriminator */
  readonly __type: 'controller'
  /** Controller configuration (tag, description, prefix) */
  readonly config: ControllerConfig
  /** Map of route names to definitions */
  readonly routes: T
}

/**
 * Define a controller that groups routes under an OpenAPI tag.
 *
 * Controllers provide organizational structure for your API:
 * - Group related routes together
 * - Apply a common tag for OpenAPI documentation
 * - Optionally apply a path prefix to all routes
 *
 * @param config - Controller configuration
 * @param routes - Record of route definitions
 * @returns ControllerDefinition for registration with framework adapters
 *
 * @example Basic controller
 * ```typescript
 * import { defineController } from 'kontract'
 * import { getUser, createUser, updateUser, deleteUser } from './user-routes.js'
 *
 * export const usersController = defineController({
 *   tag: 'Users',
 *   description: 'User management routes',
 * }, {
 *   getUser,
 *   createUser,
 *   updateUser,
 *   deleteUser,
 * })
 * ```
 *
 * @example With path prefix
 * ```typescript
 * export const adminController = defineController({
 *   tag: 'Admin',
 *   description: 'Administrative routes',
 *   prefix: '/admin',
 * }, {
 *   listUsers: defineRoute({ route: 'GET /users', ... }, ...),
 *   // Actual path will be /admin/users
 * })
 * ```
 *
 * @example Registration with adapters
 * ```typescript
 * // Fastify
 * import { registerController } from '@kontract/fastify'
 * registerController(app, usersController, options)
 *
 * // Hono
 * import { registerController } from '@kontract/hono'
 * registerController(app, usersController, options)
 * ```
 */
export function defineController<T extends RouteRecord>(
  config: ControllerConfig,
  routes: T,
): ControllerDefinition<T> {
  return {
    __type: 'controller',
    config,
    routes,
  }
}

/**
 * Type guard to check if a value is a ControllerDefinition.
 */
export function isControllerDefinition(value: unknown): value is ControllerDefinition {
  return (
    typeof value === 'object'
    && value !== null
    && '__type' in value
    && (value as { __type: unknown }).__type === 'controller'
  )
}

/**
 * Get all routes from a controller with their full paths.
 * Applies the controller's prefix if configured.
 */
export function getControllerRoutes(
  controller: ControllerDefinition,
): Array<{ name: string; route: AnyRouteDefinition; fullPath: string }> {
  const prefix = controller.config.prefix ?? ''

  return Object.entries(controller.routes).map(([name, route]) => ({
    name,
    route,
    fullPath: prefix + route.path,
  }))
}
