/**
 * HTTP request execution layer for the kontract client.
 */
import { buildUrl } from './path-utils.js'
import type { ClientOptions, ClientRouteDefinition, RequestOptions, ClientResponse } from './types.js'

/**
 * HTTP methods that can have a request body.
 */
const METHODS_WITH_BODY = new Set(['post', 'put', 'patch'])

/**
 * Execute an HTTP request for a route.
 *
 * @param route - Route definition
 * @param baseUrl - Base URL for the API
 * @param clientOptions - Client-level options
 * @param requestOptions - Per-request options
 * @returns Response with status, body, and headers
 */
export async function executeRequest(
  route: ClientRouteDefinition,
  baseUrl: string,
  clientOptions: ClientOptions,
  requestOptions: RequestOptions = {},
): Promise<ClientResponse<number, unknown>> {
  // Build the full URL
  const url = buildUrl(
    baseUrl,
    route.path,
    requestOptions.params as Record<string, string | number> | undefined,
    requestOptions.query as Record<string, unknown> | undefined,
  )

  // Build request headers
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...clientOptions.headers,
    ...requestOptions.headers,
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: route.method.toUpperCase(),
    headers,
  }

  // Add credentials if configured
  if (clientOptions.credentials) {
    fetchOptions.credentials = clientOptions.credentials
  }

  // Add request body for appropriate methods
  if (requestOptions.body !== undefined && METHODS_WITH_BODY.has(route.method)) {
    headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(requestOptions.body)
  }

  // Execute the request
  const fetchFn = clientOptions.fetch ?? fetch
  const response = await fetchFn(url, fetchOptions)

  // Parse response body
  let body: unknown = null
  const contentType = response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    try {
      body = await response.json()
    } catch {
      // If JSON parsing fails, leave body as null
      body = null
    }
  } else if (contentType?.includes('text/')) {
    body = await response.text()
  }

  // Optional response validation
  if (clientOptions.validateResponse) {
    await validateResponse(route, response.status, body)
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
  }
}

/**
 * Validate response body against the route's response schema.
 * Only runs if validateResponse is enabled and @kontract/ajv is available.
 */
async function validateResponse(
  route: ClientRouteDefinition,
  status: number,
  body: unknown,
): Promise<void> {
  const responseDefinition = route.responses[status]

  if (!responseDefinition?.schema) {
    // No schema defined for this status code, skip validation
    return
  }

  try {
    // Dynamically import @kontract/ajv for validation
    const { validate, AjvValidationError } = await import('@kontract/ajv')

    try {
      // validate() throws AjvValidationError if validation fails
      validate(responseDefinition.schema, body)
    } catch (validationError) {
      if (validationError instanceof AjvValidationError) {
        console.warn(
          `[kontract-client] Response validation failed for ${route.method.toUpperCase()} ${route.path}:`,
          validationError.errors,
        )
      } else {
        throw validationError
      }
    }
  } catch (error) {
    // @kontract/ajv not installed, skip validation
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      console.warn(
        '[kontract-client] Response validation requires @kontract/ajv. Install it to enable validation.',
      )
    } else {
      throw error
    }
  }
}
