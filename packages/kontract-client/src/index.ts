/**
 * @kontract/client - Type-safe HTTP client for kontract route definitions.
 *
 * Generate fully typed HTTP clients directly from kontract controller definitions
 * without any code generation step.
 *
 * @example
 * ```typescript
 * import { createClient } from '@kontract/client'
 * import { usersController, postsController } from '@myapp/api-contracts'
 *
 * const api = createClient({
 *   controllers: { users: usersController, posts: postsController },
 *   baseUrl: 'http://localhost:3333',
 * })
 *
 * // Fully typed request and response!
 * const result = await api.users.getUser({ params: { id: '123' } })
 *
 * if (result.status === 200) {
 *   console.log(result.body.name) // TypeScript knows this is User
 * } else if (result.status === 404) {
 *   console.log(result.body.message) // TypeScript knows this is ApiError
 * }
 * ```
 *
 * @packageDocumentation
 */

// Main client factory
export { createClient } from './client.js'

// Types for consumers
export type {
  ClientConfig,
  ClientOptions,
  ClientResponse,
  RequestOptions,
  Client,
  InferRequestOptions,
  InferResponse,
  InferControllerClient,
} from './types.js'

// Path utilities (may be useful for testing/debugging)
export { buildUrl, substitutePath, buildQueryString } from './path-utils.js'
