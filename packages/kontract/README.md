# kontract

Framework-agnostic OpenAPI decorator system with TypeBox schema support.

## Features

- **Unified `@Endpoint` decorator** - Define route, auth, schemas, and responses in one place
- **Type-safe response helpers** - `ok()`, `created()`, `notFound()` with compile-time validation
- **Framework-agnostic** - Core library has no framework dependencies
- **OpenAPI 3.1.0 & 3.0.3** - Generate specs for either version
- **TypeBox integration** - Native support for TypeBox schemas

## Installation

**For AdonisJS projects**, use the adapter package instead (it includes this package):
```bash
npm install @kontract/adonis @sinclair/typebox ajv ajv-formats
```

**For other frameworks** or custom integrations:
```bash
npm install kontract @sinclair/typebox
```

## Quick Start

```typescript
import { Api, Endpoint, ok, apiError } from 'kontract'
import { Type, Static } from '@sinclair/typebox'

// 1. Define your schemas
const User = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

type UserType = Static<typeof User>

// 2. Decorate your controllers
@Api({ tag: 'Users', description: 'User management endpoints' })
class UsersController {
  @Endpoint('GET /api/v1/users/:id', {
    summary: 'Get a user by ID',
    params: Type.Object({ id: Type.String() }),
    responses: {
      200: { schema: User, description: 'The user' },
      404: null,
    },
  })
  async show(ctx: unknown, body: unknown, query: unknown, params: { id: string }) {
    const user = await findUser(params.id)
    if (!user) {
      return apiError.notFound('User not found')
    }
    return ok(User, user)
  }
}
```

## Decorators

### `@Api(options)`

Class decorator for controllers. Groups endpoints under an OpenAPI tag.

```typescript
interface ApiOptions {
  tag: string           // OpenAPI tag for grouping endpoints
  description?: string  // Description of the API group
  prefix?: string       // Optional path prefix for all endpoints
}
```

**Example:**

```typescript
@Api({
  tag: 'Books',
  description: 'Book management endpoints',
  prefix: '/api/v1'
})
class BooksController { }
```

### `@Endpoint(route, options)`

Method decorator for endpoints. Defines the route, validation schemas, and OpenAPI documentation.

```typescript
interface EndpointOptions {
  summary?: string           // Short summary for OpenAPI docs
  description?: string       // Detailed description
  operationId?: string       // Unique operation ID (auto-generated if not provided)
  deprecated?: boolean       // Mark endpoint as deprecated
  auth?: 'required' | 'optional' | 'none'  // Authentication requirement
  body?: TSchema             // Request body schema (TypeBox)
  query?: TSchema            // Query parameters schema
  params?: TSchema           // Path parameters schema
  file?: FileUploadConfig    // File upload configuration
  responses: Record<number, TSchema | null | { schema: TSchema | null; description?: string }>
  middleware?: unknown[]     // Framework-specific middleware
}
```

**Examples:**

```typescript
// GET with path parameters
@Endpoint('GET /api/v1/books/:id', {
  summary: 'Get a book by ID',
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  responses: {
    200: { schema: Book, description: 'The book' },
    404: null,
  },
})
async show() { }

// POST with body and authentication
@Endpoint('POST /api/v1/books', {
  summary: 'Create a new book',
  auth: 'required',
  body: CreateBookRequest,
  responses: {
    201: { schema: Book, description: 'Book created' },
    422: { schema: ValidationError },
  },
})
async store() { }

// GET with query parameters
@Endpoint('GET /api/v1/books', {
  summary: 'List books',
  query: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
    search: Type.Optional(Type.String()),
  }),
  responses: {
    200: { schema: BookListResponse },
  },
})
async index() { }

// DELETE with no response body
@Endpoint('DELETE /api/v1/books/:id', {
  summary: 'Delete a book',
  auth: 'required',
  params: Type.Object({ id: Type.String() }),
  responses: {
    204: null,
    404: null,
  },
})
async destroy() { }

// File upload
@Endpoint('POST /api/v1/books/:id/cover', {
  summary: 'Upload book cover',
  auth: 'required',
  file: { fieldName: 'cover', multiple: false },
  responses: {
    200: { schema: Book },
  },
})
async uploadCover() { }
```

## Response Helpers

Response helpers create typed API responses. They return a structured object with `status` and `data` properties.

### Success Responses

```typescript
import { ok, created, accepted, noContent } from 'kontract'

// 200 OK
return ok(UserSchema, { id: 1, name: 'John' })

// 201 Created
return created(UserSchema, { id: 1, name: 'John' })

// 202 Accepted
return accepted(JobSchema, { jobId: 'abc123' })

// 204 No Content
return noContent()
```

### Error Responses

For full control over error response data:

```typescript
import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  badGateway,
  serviceUnavailable
} from 'kontract'

// All error helpers follow the same pattern: (schema, data)
return notFound(ErrorSchema, { message: 'Book not found' })
return unauthorized(ErrorSchema, { message: 'Invalid token' })
```

### Unified `apiError` Helper

For common error patterns with sensible defaults. Uses a standard `ApiErrorBody` structure:

```typescript
import { apiError } from 'kontract'

// Use defaults
return apiError.notFound()              // "Resource not found"
return apiError.unauthorized()          // "Authentication required"
return apiError.forbidden()             // "Access denied"

// Override message
return apiError.notFound('Book not found')
return apiError.serviceUnavailable('External API is down')

// Validation errors with field details
return apiError.validation([
  { field: 'email', message: 'Invalid email format' },
  { field: 'age', message: 'Must be a positive number' },
])
```

Available methods:
| Method | Status | Default Message |
|--------|--------|-----------------|
| `apiError.badRequest(msg?)` | 400 | "Bad request" |
| `apiError.unauthorized(msg?)` | 401 | "Authentication required" |
| `apiError.forbidden(msg?)` | 403 | "Access denied" |
| `apiError.notFound(msg?)` | 404 | "Resource not found" |
| `apiError.conflict(msg?)` | 409 | "Resource conflict" |
| `apiError.validation(errors)` | 422 | "Validation failed" |
| `apiError.rateLimited(msg?)` | 429 | "Too many requests" |
| `apiError.internal(msg?)` | 500 | "Internal server error" |
| `apiError.serviceUnavailable(msg?)` | 503 | "Service unavailable" |
| `apiError.externalApi(msg?)` | 502 | "External API error" |

### Binary Responses

For file downloads:

```typescript
import { binary } from 'kontract'

// Return a file download
return binary(200, 'application/pdf', pdfBuffer, 'report.pdf')
return binary(200, 'image/png', imageBuffer)
```

## Metadata Access

Access registered decorator metadata programmatically:

```typescript
import {
  getRegisteredControllers,
  getApiMetadata,
  getEndpointMetadata,
  getControllerMetadata,
  getAllControllerMetadata,
  clearRegistry,
} from 'kontract'

// Get all registered controllers
const controllers = getRegisteredControllers()

// Get @Api metadata for a specific controller
const apiMeta = getApiMetadata(UsersController)
// { tag: 'Users', description: 'User management' }

// Get all @Endpoint metadata for a controller
const endpoints = getEndpointMetadata(UsersController)
// EndpointMetadata[]

// Get combined metadata
const metadata = getControllerMetadata(UsersController)
// { controller, api: ApiMetadata, endpoints: EndpointMetadata[] }

// Get all metadata at once
const allMetadata = getAllControllerMetadata()
// Array of { controller, api, endpoints }

// Clear registry (useful for testing)
clearRegistry()
```

## Error Classes

### RequestValidationError

Thrown when request validation fails:

```typescript
import { RequestValidationError } from 'kontract'

try {
  validate(schema, data)
} catch (error) {
  if (error instanceof RequestValidationError) {
    error.status   // 422
    error.code     // 'E_VALIDATION_ERROR'
    error.errors   // [{ field: 'email', message: '...' }]
    error.source   // 'body' | 'query' | 'params'
    error.schema   // The TypeBox schema that failed
    error.data     // The data that was validated

    // Get response-ready format
    const response = error.toResponse()
    // { status: 422, code: 'E_VALIDATION_ERROR', message: 'Validation failed', errors: [...] }
  }
}
```

### ResponseValidationError

Thrown when response validation fails (development mode only):

```typescript
import { ResponseValidationError } from 'kontract'
```

### Configuration Errors

```typescript
import {
  ConfigurationError,      // General configuration issue
  AdapterNotFoundError,    // Framework adapter not found
  SerializerNotFoundError  // Serializer not found for data type
} from 'kontract'
```

## Types

### Response Types

```typescript
import type {
  ApiResponse,      // { status: number, data: T }
  BinaryResponse,   // { status: number, binary: true, contentType: string, data: Buffer, filename?: string }
  AnyResponse,      // ApiResponse | BinaryResponse
  ApiErrorBody,     // { status: number, code: string, message: string, errors?: [...] }
  ErrorCode,        // Error code string type
} from 'kontract'

import { ErrorCodes, isBinaryResponse } from 'kontract'

// Check if response is binary
if (isBinaryResponse(result)) {
  // result.contentType, result.data, result.filename
}
```

### Metadata Types

```typescript
import type {
  HttpMethod,          // 'get' | 'post' | 'put' | 'patch' | 'delete'
  AuthLevel,           // 'required' | 'optional' | 'none'
  RouteString,         // 'GET /path' format
  ResponseDefinition,  // { schema: TSchema | null, description?: string }
  FileUploadConfig,    // { fieldName: string, multiple?: boolean }
  ApiMetadata,         // @Api decorator metadata
  EndpointMetadata,    // @Endpoint decorator metadata
  ControllerMetadata,  // Combined controller metadata
} from 'kontract'
```

### OpenAPI Types

```typescript
import type {
  OpenApiVersion,        // '3.0.3' | '3.1.0'
  OpenApiDocument,       // Full OpenAPI specification document
  OpenApiPathItem,       // Path item object
  OpenApiOperation,      // Operation object
  OpenApiParameter,      // Parameter object
  OpenApiRequestBody,    // Request body object
  OpenApiResponse,       // Response object
  OpenApiMediaType,      // Media type object
  OpenApiSchema,         // Schema object
  OpenApiSecurityScheme, // Security scheme object
} from 'kontract'
```

### Validation Types

```typescript
import type {
  Validator,           // Validator interface
  CompiledValidator,   // Pre-compiled validator for performance
  ValidatorOptions,    // Validator configuration options
  ValidationErrorDetail, // { field: string, message: string }
} from 'kontract'
```

### Runtime/Adapter Types

```typescript
import type {
  RequestContext,      // Generic request context
  AuthUser,            // Authenticated user type
  AuthResult,          // Authentication result
  RouteHandler,        // Route handler function
  RouterAdapter,       // Router adapter interface
  AuthAdapter,         // Authentication adapter interface
  ContainerAdapter,    // DI container adapter interface
  ResponseAdapter,     // Response adapter interface
  LoggerAdapter,       // Logger adapter interface
  FrameworkAdapters,   // All adapters combined
} from 'kontract'
```

## Framework Adapters

This is the core library. For framework-specific implementations, see:

- **AdonisJS**: [`@kontract/adonis`](../kontract-adonis)

## License

MIT
