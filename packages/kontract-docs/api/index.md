# API Reference

This section provides comprehensive API documentation for all Kontract packages.

## Packages

| Package | Description |
|---------|-------------|
| [@kontract/ajv](/api/kontract-ajv) | AJV-based validation for TypeBox schemas |

See [Client Generation](/api/client-generation) for generating type-safe API clients from your OpenAPI specs.

## Quick Reference

### Adapter Imports

Each adapter re-exports everything you need from the core `kontract` package:

```typescript
// Hono
import {
  get, post, put, patch, del,
  defineController,
  registerController,
  createErrorHandler,
  buildOpenApiSpec,
} from '@kontract/hono'

// Fastify
import {
  get, post, put, patch, del,
  defineController,
  registerController,
  registerErrorHandler,
  buildOpenApiSpec,
} from '@kontract/fastify'

// Express
import {
  get, post, put, patch, del,
  defineController,
  registerController,
  createErrorHandler,
  buildOpenApiSpec,
} from '@kontract/express'
```

### Validation Imports

```typescript
import {
  validate,
  createAjvValidator,
  AjvValidationError,
} from '@kontract/ajv'
```

## Type Reference

### Response Types

```typescript
// Success response
interface ApiResponse<TStatus, TData> {
  status: TStatus
  data: TData
}

// Binary response (file downloads)
interface BinaryResponse<TStatus> {
  status: TStatus
  binary: true
  contentType: string
  data: Buffer | Uint8Array
  filename?: string
}

// Standard error body
interface ApiErrorBody {
  status: number
  code: string
  message: string
  errors?: Array<{ field: string; message: string }>
}
```

### Metadata Types

```typescript
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
type AuthLevel = 'required' | 'optional' | 'none'

interface ControllerOptions {
  tag: string
  description?: string
  prefix?: string
}

interface RouteOptions {
  summary?: string
  description?: string
  operationId?: string
  deprecated?: boolean
  auth?: AuthLevel
  body?: TSchema
  query?: TSchema
  params?: TSchema
  file?: FileUploadConfig
  responses: Record<number, ResponseDefinition>
  middleware?: unknown[]
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `E_BAD_REQUEST` | 400 | Invalid request |
| `E_UNAUTHORIZED` | 401 | Authentication required |
| `E_FORBIDDEN` | 403 | Access denied |
| `E_NOT_FOUND` | 404 | Resource not found |
| `E_CONFLICT` | 409 | Resource conflict |
| `E_VALIDATION_ERROR` | 422 | Validation failed |
| `E_TOO_MANY_REQUESTS` | 429 | Rate limited |
| `E_INTERNAL_ERROR` | 500 | Server error |
| `E_BAD_GATEWAY` | 502 | External API error |
| `E_SERVICE_UNAVAILABLE` | 503 | Service down |
