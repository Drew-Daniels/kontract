/**
 * Standard API response wrapper.
 * Used by response helpers to carry status code and data together.
 */
export interface ApiResponse<TStatus extends number, TData> {
  status: TStatus
  data: TData
}

/**
 * Binary response for file downloads.
 * Bypasses JSON serialization and sends raw data.
 */
export interface BinaryResponse<TStatus extends number> {
  status: TStatus
  binary: true
  contentType: string
  filename?: string
  data: Buffer | string
}

/**
 * Union of all possible response types.
 */
export type AnyResponse = ApiResponse<number, unknown> | BinaryResponse<number>

/**
 * Type guard to check if a response is binary.
 */
export function isBinaryResponse(response: unknown): response is BinaryResponse<number> {
  return (
    response !== null
    && typeof response === 'object'
    && 'binary' in response
    && (response as BinaryResponse<number>).binary === true
  )
}

/**
 * Common error codes for API responses.
 * These can be extended by applications.
 */
export const ErrorCodes = {
  BAD_REQUEST: 'E_BAD_REQUEST',
  UNAUTHORIZED: 'E_UNAUTHORIZED',
  FORBIDDEN: 'E_FORBIDDEN',
  NOT_FOUND: 'E_NOT_FOUND',
  VALIDATION: 'E_VALIDATION',
  CONFLICT: 'E_CONFLICT',
  RATE_LIMITED: 'E_RATE_LIMITED',
  INTERNAL: 'E_INTERNAL',
  SERVICE_UNAVAILABLE: 'E_SERVICE_UNAVAILABLE',
  EXTERNAL_API: 'E_EXTERNAL_API',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Standard error response structure.
 * Applications can extend this with additional fields.
 */
export interface ApiErrorBody {
  status: number
  code: string
  message: string
  errors?: Array<{
    field?: string
    message: string
    code?: string
  }>
}
