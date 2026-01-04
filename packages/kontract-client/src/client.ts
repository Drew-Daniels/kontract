/**
 * Type-safe HTTP client factory for kontract route definitions.
 *
 * @example
 * ```typescript
 * import { createClient } from '@kontract/client'
 * import { usersController, postsController } from './contracts'
 *
 * const api = createClient({
 *   controllers: { users: usersController, posts: postsController },
 *   baseUrl: 'http://localhost:3333',
 * })
 *
 * // Fully typed request and response
 * const result = await api.users.getUser({ params: { id: '123' } })
 * if (result.status === 200) {
 *   console.log(result.body.name) // TypeScript knows this is User
 * }
 * ```
 */
import type { ControllerDefinition, RouteRecord } from 'kontract/builder'
import { executeRequest } from './request.js'
import type {
  ClientConfig,
  ClientOptions,
  Client,
  EndpointMethod,
  ClientRouteDefinition,
  RequestOptions,
} from './types.js'

/**
 * Create a type-safe HTTP client from kontract controller definitions.
 *
 * @param config - Client configuration including controllers and base URL
 * @returns Fully typed client with methods for each endpoint
 *
 * @example Basic usage
 * ```typescript
 * const api = createClient({
 *   controllers: { users: usersController },
 *   baseUrl: 'http://localhost:3333',
 * })
 *
 * const result = await api.users.getUser({ params: { id: '123' } })
 * ```
 *
 * @example With options
 * ```typescript
 * const api = createClient({
 *   controllers: { users: usersController },
 *   baseUrl: 'http://localhost:3333',
 *   headers: { 'X-API-Key': 'secret' },
 *   credentials: 'include',
 *   validateResponse: true,
 * })
 * ```
 *
 * @example Custom fetch
 * ```typescript
 * const api = createClient({
 *   controllers: { users: usersController },
 *   baseUrl: 'http://localhost:3333',
 *   fetch: customFetch, // For testing or custom implementations
 * })
 * ```
 */
export function createClient<T extends Record<string, ControllerDefinition>>(
  config: ClientConfig<T>,
): Client<T> {
  const { controllers, baseUrl, ...options } = config

  // Build client object with namespaces for each controller
  const client = {} as Client<T>

  for (const [name, controller] of Object.entries(controllers)) {
    ;(client as Record<string, unknown>)[name] = createControllerClient(
      controller,
      baseUrl,
      options,
    )
  }

  return client
}

/**
 * Create a client namespace for a single controller.
 */
function createControllerClient(
  controller: ControllerDefinition<RouteRecord>,
  baseUrl: string,
  options: ClientOptions,
): Record<string, EndpointMethod> {
  const methods: Record<string, EndpointMethod> = {}
  const prefix = controller.config.prefix ?? ''

  for (const [operationId, route] of Object.entries(controller.routes)) {
    // Create route definition with prefixed path
    const clientRoute: ClientRouteDefinition = {
      __type: 'route',
      method: route.method,
      path: prefix + route.path,
      config: {
        body: route.config.body,
        query: route.config.query,
        params: route.config.params,
      },
      responses: route.responses,
    }

    methods[operationId] = (requestOptions: RequestOptions) =>
      executeRequest(clientRoute, baseUrl, options, requestOptions)
  }

  return methods
}
