# kontract

Core library providing response helpers and shared utilities used by all adapter packages.

## Installation

```bash
npm install kontract @sinclair/typebox
```

## Response Helpers

### Success Responses

```typescript
import { ok, created, accepted, noContent } from 'kontract'

// 200 OK
return ok(UserSchema, userData)

// 201 Created
return created(UserSchema, newUser)

// 202 Accepted
return accepted(JobSchema, { jobId: '123' })

// 204 No Content
return noContent()
```

### Error Responses

```typescript
import {
  badRequest,        // 400
  unauthorized,      // 401
  forbidden,         // 403
  notFound,          // 404
  conflict,          // 409
  unprocessableEntity, // 422
  tooManyRequests,   // 429
  internalServerError, // 500
  badGateway,        // 502
  serviceUnavailable, // 503
} from 'kontract'

return notFound(ErrorSchema, { message: 'Not found' })
```

### apiError Helper

Convenience methods with standard error format:

```typescript
import { apiError } from 'kontract'

// With default message
return apiError.notFound()         // "Resource not found"
return apiError.unauthorized()     // "Authentication required"

// With custom message
return apiError.notFound('User not found')

// Validation errors
return apiError.validation([
  { field: 'email', message: 'Invalid email' },
])
```

**Available methods:**
- `apiError.badRequest(msg?)`
- `apiError.unauthorized(msg?)`
- `apiError.forbidden(msg?)`
- `apiError.notFound(msg?)`
- `apiError.conflict(msg?)`
- `apiError.validation(errors)`
- `apiError.rateLimited(msg?)`
- `apiError.internal(msg?)`
- `apiError.externalApi(msg?)`
- `apiError.serviceUnavailable(msg?)`

### Binary Response

```typescript
import { binary } from 'kontract'

return binary(200, 'application/pdf', pdfBuffer, 'report.pdf')
```

**Parameters:**
- `status` - HTTP status code
- `contentType` - MIME type
- `data` - Buffer or Uint8Array
- `filename` - Optional download filename

## Configuration

```typescript
import { defineConfig, getConfig, isConfigured, resetConfig } from 'kontract'

defineConfig({
  openapi: {
    info: { title: 'API', version: '1.0.0' },
  },
  runtime: {
    validateResponses: true,
  },
  validator: (schema, data) => myValidator.validate(schema, data),
})
```

## Error Classes

```typescript
import {
  RequestValidationError,
  ResponseValidationError,
  ConfigurationError,
  AdapterNotFoundError,
  SerializerNotFoundError,
} from 'kontract'
```

### RequestValidationError

```typescript
error.status   // 422
error.code     // 'E_VALIDATION_ERROR'
error.errors   // [{ field, message }]
error.source   // 'body' | 'query' | 'params'
error.schema   // TypeBox schema
error.data     // Invalid data
error.toResponse() // Response-ready format
```

## Types

```typescript
import type {
  // Response types
  ApiResponse,
  BinaryResponse,
  AnyResponse,
  ApiErrorBody,

  // Metadata types
  HttpMethod,
  AuthLevel,
  RouteString,
  ControllerOptions,
  RouteOptions,
  ResponseDefinition,
  FileUploadConfig,

  // Handler types
  RouteConfig,
  RouteHandler,
  RouteDefinition,
  HandlerContext,
  ControllerConfig,
  ControllerDefinition,

  // OpenAPI types
  OpenApiVersion,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,

  // Runtime types
  RequestContext,
  AuthUser,
  AuthResult,
  RouterAdapter,
  AuthAdapter,
  ResponseAdapter,
  ValidatorFn,
  SerializerFn,
} from 'kontract'
```

## Utilities

```typescript
import {
  isBinaryResponse,
  isRouteDefinition,
  isControllerDefinition,
  getControllerRoutes,
  extractParamNames,
  createParamsSchema,
  ErrorCodes,
} from 'kontract'
```

## Route Options Reference

When using the short method helpers (`get`, `post`, etc.) from adapter packages, these are the available options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `summary` | `string` | No | Short description for docs |
| `description` | `string` | No | Detailed description |
| `operationId` | `string` | No | Unique operation ID |
| `deprecated` | `boolean` | No | Mark as deprecated |
| `auth` | `'required' \| 'optional' \| 'none'` | No | Auth requirement |
| `body` | `TSchema` | No | Request body schema |
| `query` | `TSchema` | No | Query parameters schema |
| `params` | `TSchema` | No | Path parameters schema |
| `file` | `FileUploadConfig` | No | File upload configuration |
| `responses` | `Record<number, ResponseDef>` | Yes | Response definitions |
| `middleware` | `unknown[]` | No | Framework-specific middleware |

## Controller Options Reference

Options for `defineController`:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `tag` | `string` | Yes | OpenAPI tag name |
| `description` | `string` | No | Tag description |
| `prefix` | `string` | No | Path prefix for all routes |
