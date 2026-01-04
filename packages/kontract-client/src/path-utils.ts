/**
 * URL building utilities for the kontract HTTP client.
 */

/**
 * Substitute path parameters in a URL pattern.
 *
 * @param path - URL pattern with :param placeholders (e.g., '/users/:id')
 * @param params - Object with parameter values
 * @returns URL with substituted parameters
 *
 * @example
 * ```typescript
 * substitutePath('/users/:id', { id: '123' })
 * // => '/users/123'
 *
 * substitutePath('/posts/:postId/comments/:commentId', { postId: '1', commentId: '2' })
 * // => '/posts/1/comments/2'
 * ```
 */
export function substitutePath(
  path: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return path

  return path.replace(/:(\w+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined) {
      throw new Error(`Missing path parameter: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

/**
 * Build a query string from an object.
 *
 * @param query - Object with query parameter values
 * @returns Query string (without leading '?') or empty string
 *
 * @example
 * ```typescript
 * buildQueryString({ page: 1, limit: 10 })
 * // => 'page=1&limit=10'
 *
 * buildQueryString({ search: 'hello world', tags: ['a', 'b'] })
 * // => 'search=hello%20world&tags=a&tags=b'
 * ```
 */
export function buildQueryString(
  query?: Record<string, unknown>,
): string {
  if (!query) return ''

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      // Handle arrays by adding multiple entries with the same key
      for (const item of value) {
        if (item !== undefined && item !== null) {
          params.append(key, String(item))
        }
      }
    } else if (typeof value === 'object') {
      // Serialize objects as JSON
      params.set(key, JSON.stringify(value))
    } else {
      params.set(key, String(value))
    }
  }

  return params.toString()
}

/**
 * Build a complete URL from base URL, path, params, and query.
 *
 * @param baseUrl - Base URL (e.g., 'http://localhost:3333')
 * @param path - URL path pattern (e.g., '/api/v1/users/:id')
 * @param params - Path parameters to substitute
 * @param query - Query parameters to append
 * @returns Complete URL
 *
 * @example
 * ```typescript
 * buildUrl('http://localhost:3333', '/users/:id', { id: '123' }, { include: 'posts' })
 * // => 'http://localhost:3333/users/123?include=posts'
 * ```
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>,
  query?: Record<string, unknown>,
): string {
  // Remove trailing slash from base URL
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // Substitute path parameters
  const substitutedPath = substitutePath(path, params)

  // Build query string
  const queryString = buildQueryString(query)

  // Combine parts
  const url = `${base}${substitutedPath}`
  return queryString ? `${url}?${queryString}` : url
}
