# @kontract/hono

Hono adapter for `kontract` - use TypeBox decorators to define routes, validation, and OpenAPI documentation.

## Features

- **Decorator-based routing** - Define routes with `@Endpoint` decorator
- **Automatic validation** - Request body, query, and path parameters validated via AJV
- **Type-safe responses** - `ok()`, `created()`, `apiError.notFound()` helpers
- **OpenAPI generation** - Generate OpenAPI 3.0/3.1 specs from decorators
- **Authentication support** - Built-in `auth: 'required' | 'optional'` handling

## Installation

```bash
npm install @kontract/hono kontract @kontract/ajv @sinclair/typebox hono
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import {
  registerDecoratorRoutes,
  createErrorHandler,
  OpenApiBuilder
} from '@kontract/hono'
import { validate } from '@kontract/ajv'

// Import controllers to trigger decorator registration
import './controllers/users_controller.js'

const app = new Hono()

// Register all decorated routes
registerDecoratorRoutes(app, {
  validate,
  authenticate: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    }
    return verifyToken(token)
  },
})

// Register error handler
app.onError(createErrorHandler({ logErrors: true }))

// OpenAPI spec endpoint
app.get('/docs/json', (c) => {
  const builder = new OpenApiBuilder({
    title: 'My API',
    version: '1.0.0',
  })
  return c.json(builder.build())
})

serve({ fetch: app.fetch, port: 3000 })
```

## Defining Controllers

```typescript
import { Type, Static } from '@sinclair/typebox'
import { Api, Endpoint, ok, created, noContent, apiError } from 'kontract'
import type { ValidatedRequest } from '@kontract/hono'

// Define schemas
const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
}, { $id: 'CreateUserRequest' })

const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
}, { $id: 'UserParams' })

// Define controller
@Api({ tag: 'Users', description: 'User management' })
export default class UsersController {
  @Endpoint('GET /api/users/:id', {
    summary: 'Get user by ID',
    params: UserParams,
    responses: {
      200: { schema: User },
      404: null,
    },
  })
  async show(
    req: ValidatedRequest,
    body: unknown,
    query: unknown,
    params: Static<typeof UserParams>
  ) {
    const user = await findUser(params.id)
    if (!user) {
      return apiError.notFound('User not found')
    }
    return ok(User, user)
  }

  @Endpoint('POST /api/users', {
    summary: 'Create a user',
    auth: 'required',
    body: CreateUserRequest,
    responses: {
      201: { schema: User },
      422: null,
    },
  })
  async store(
    req: ValidatedRequest,
    body: Static<typeof CreateUserRequest>
  ) {
    const user = await createUser(body)
    return created(User, user)
  }

  @Endpoint('DELETE /api/users/:id', {
    summary: 'Delete a user',
    auth: 'required',
    params: UserParams,
    responses: { 204: null },
  })
  async destroy() {
    return noContent()
  }
}
```

## API Reference

### `registerDecoratorRoutes(app, options)`

Registers all decorated controller routes with a Hono app.

```typescript
interface RegisterRoutesOptions {
  /** Validation function (required) */
  validate: <T extends TSchema>(schema: T, data: unknown) => Static<T>

  /** Authentication function (optional) */
  authenticate?: (c: Context) => Promise<unknown>

  /** Controller resolver for DI (optional) */
  resolveController?: <T>(Controller: new () => T) => T | Promise<T>
}
```

### `createErrorHandler(options)`

Creates an error handler for `app.onError()`.

```typescript
interface ErrorHandlerOptions {
  /** Log errors to console (default: true in dev) */
  logErrors?: boolean
  /** Include stack traces (default: true in dev) */
  includeStack?: boolean
  /** Custom error callback */
  onError?: (error: Error, c: Context) => void
}
```

### `ValidatedRequest`

Request object passed to controller methods:

```typescript
interface ValidatedRequest {
  raw: Context              // Original Hono Context
  user?: unknown            // Authenticated user (if auth performed)
  validatedBody?: unknown   // Validated request body
  validatedQuery?: unknown  // Validated query parameters
  validatedParams?: unknown // Validated path parameters
}
```

### `OpenApiBuilder`

Re-exported from `kontract` for convenience:

```typescript
const builder = new OpenApiBuilder({
  title: 'My API',
  description: 'API description',
  version: '1.0.0',
  servers: [{ url: 'http://localhost:3000' }],
})

const spec = builder.build() // OpenAPI 3.1.0 document
```

## Error Handling

Validation errors return a structured response:

```json
{
  "status": 422,
  "code": "E_VALIDATION",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "must match format \"email\"" }
  ]
}
```

Authentication errors return:

```json
{
  "status": 401,
  "code": "E_UNAUTHORIZED",
  "message": "Unauthorized"
}
```

## Exports

```typescript
// Main exports
import {
  registerDecoratorRoutes,
  createErrorHandler,
  OpenApiBuilder,
  type RegisterRoutesOptions,
  type ValidatedRequest,
  type ErrorHandlerOptions,
} from '@kontract/hono'

// Sub-path exports
import { registerDecoratorRoutes } from '@kontract/hono/adapters'
import { createErrorHandler } from '@kontract/hono/middleware'
import { OpenApiBuilder } from '@kontract/hono/builder'
```

## License

MIT
