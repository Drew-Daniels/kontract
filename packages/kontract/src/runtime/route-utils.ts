/**
 * Route utility functions for kontract adapters.
 *
 * These functions parse route strings and normalize response definitions.
 */
import type { TSchema } from '@sinclair/typebox'
import type { ApiResponse } from '../response/types.js'
import type { RouteString } from '../metadata/types.js'
import type { ResponsesConfig, NormalizedResponse, NormalizedResponses } from './adapter-types.js'

// Re-export RouteString for convenience
export type { RouteString } from '../metadata/types.js'

/**
 * Parse a route string into method and path.
 */
export function parseRouteString(route: RouteString): [string, string] {
  const spaceIndex = route.indexOf(' ')
  const method = route.slice(0, spaceIndex).toLowerCase()
  const path = route.slice(spaceIndex + 1)
  return [method, path]
}

/**
 * Normalize response definitions to consistent format.
 * Preserves all fields including headers, examples, and example.
 */
export function normalizeResponses(responses: ResponsesConfig): NormalizedResponses {
  const normalized: NormalizedResponses = {}

  for (const [status, value] of Object.entries(responses)) {
    if (value === null) {
      normalized[Number(status)] = { schema: null }
    } else if (typeof value === 'object' && 'schema' in value) {
      // Preserve all fields: schema, description, headers, examples, example
      normalized[Number(status)] = value as NormalizedResponse
    } else {
      normalized[Number(status)] = { schema: value as TSchema }
    }
  }

  return normalized
}

/**
 * Check if a value looks like an API response object.
 */
export function isApiResponse(value: unknown): value is ApiResponse<number, unknown> {
  return (
    value !== null
    && typeof value === 'object'
    && 'status' in value
    && typeof (value as { status: unknown }).status === 'number'
    && 'data' in value
    && !('binary' in value)
  )
}

/**
 * Return 204 No Content.
 */
export function noContent(): ApiResponse<204, null> {
  return { status: 204, data: null }
}
