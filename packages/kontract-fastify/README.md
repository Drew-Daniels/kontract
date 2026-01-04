# @kontract/fastify

Fastify adapter for `kontract` that leverages **Fastify's native validation** for maximum performance.

## Why Use This?

### The Problem with Raw Fastify Schemas

Fastify's native approach requires defining JSON Schema objects for every route:

```typescript
// ❌ Traditional Fastify approach - verbose and error-prone
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
      },
    },
    querystring: {
      type: 'object',
      properties: {
        includeProfile: { type: 'boolean', default: false },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  // No type inference - you're on your own
  const body = request.body as { name: string; email: string }
  // ...
})
```

**Problems:**
- Verbose JSON Schema syntax
- No TypeScript type inference
- Schema and types can drift apart
- Hard to reuse schemas across routes
- OpenAPI generation requires separate tooling

### The Solution: TypeBox Decorators

```typescript
// ✅ With kontract-fastify
import { Type, Static } from '@sinclair/typebox'
import { Api, Endpoint, ok, created } from 'kontract'

const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
}, { $id: 'CreateUserRequest' })

const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String(),
}, { $id: 'User' })

@Api({ tag: 'Users' })
class UsersController {
  @Endpoint('POST /users', {
    summary: 'Create a user',
    body: CreateUserRequest,
    responses: { 201: { schema: User } },
  })
  async store(req: ValidatedRequest, body: Static<typeof CreateUserRequest>) {
    // ✅ body is fully typed: { name: string; email: string }
    const user = await createUser(body)
    return created(User, user) // ✅ Response validated at compile time
  }
}
```

**Benefits:**
- **Concise TypeBox syntax** - Less boilerplate than JSON Schema
- **Full type inference** - TypeScript knows your request/response types
- **Single source of truth** - Schema = Type = Validation = OpenAPI docs
- **Reusable schemas** - Define once, use everywhere
- **Automatic OpenAPI** - Generate specs from decorators

## Features

- **Native Fastify validation** - Schemas passed directly to Fastify (compiled once at startup)
- **fast-json-stringify** - Response schemas enable 2x faster serialization
- **No manual validation** - Unlike Express/Hono adapters, no `validate` function needed
- **Type-safe responses** - `ok()`, `created()`, `apiError.notFound()` helpers
- **OpenAPI generation** - Generate OpenAPI 3.0/3.1 specs from decorators

## Installation

```bash
npm install @kontract/fastify kontract @sinclair/typebox fastify
```

> **Note:** Unlike Express/Hono adapters, you don't need `@kontract/ajv` - Fastify has built-in AJV validation.

## Quick Start

```typescript
import Fastify from 'fastify'
import {
  registerDecoratorRoutes,
  registerErrorHandler,
  OpenApiBuilder
} from '@kontract/fastify'

// Import controllers to trigger decorator registration
import './controllers/users_controller.js'

const app = Fastify()

// Register error handler FIRST (before routes)
registerErrorHandler(app, { logErrors: true })

// Register all decorated routes - no validate function needed!
registerDecoratorRoutes(app, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    }
    return verifyToken(token)
  },
})

// OpenAPI spec endpoint
app.get('/docs/json', () => {
  const builder = new OpenApiBuilder({
    title: 'My API',
    version: '1.0.0',
  })
  return builder.build()
})

app.listen({ port: 3000 })
```

## Defining Controllers

```typescript
import { Type, Static } from '@sinclair/typebox'
import { Api, Endpoint, ok, created, noContent, apiError } from 'kontract'
import type { ValidatedRequest } from '@kontract/fastify'

// Define reusable schemas
const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1, description: 'User display name' }),
  email: Type.String({ format: 'email', description: 'User email address' }),
}, { $id: 'CreateUserRequest' })

const UserParams = Type.Object({
  id: Type.String({ format: 'uuid', description: 'User UUID' }),
}, { $id: 'UserParams' })

const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
}, { $id: 'PaginationQuery' })

// Define controller with full type safety
@Api({ tag: 'Users', description: 'User management' })
export default class UsersController {
  @Endpoint('GET /api/users', {
    summary: 'List users',
    query: PaginationQuery,
    responses: {
      200: { schema: Type.Array(User) },
    },
  })
  async index(
    req: ValidatedRequest,
    body: unknown,
    query: Static<typeof PaginationQuery>  // { page?: number; limit?: number }
  ) {
    const users = await listUsers(query.page, query.limit)
    return ok(Type.Array(User), users)
  }

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
    params: Static<typeof UserParams>  // { id: string }
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
    body: Static<typeof CreateUserRequest>  // { name: string; email: string }
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

## Performance Benefits

This adapter provides performance benefits over manual validation approaches:

| Feature | Express/Hono | Fastify (this adapter) |
|---------|-------------|------------------------|
| Validation timing | Per-request | Compiled once at startup |
| Validation library | Manual AJV call | Fastify's built-in AJV |
| Response serialization | `JSON.stringify()` | `fast-json-stringify` (2x faster) |
| Schema compilation | Every request | Once at startup |

### How It Works

Your TypeBox schemas are passed directly to Fastify's route schema option:

```typescript
// Your decorator
@Endpoint('POST /users', {
  body: CreateUserRequest,
  query: PaginationQuery,
  responses: { 201: { schema: User } },
})

// Registers as:
fastify.route({
  method: 'POST',
  url: '/users',
  schema: {
    body: CreateUserRequest,        // Fastify validates automatically
    querystring: PaginationQuery,   // Type coercion included
    response: { 201: User },        // Enables fast-json-stringify
  },
  handler,
})
```

## API Reference

### `registerDecoratorRoutes(app, options)`

Registers all decorated controller routes with a Fastify instance.

```typescript
interface RegisterRoutesOptions {
  /** Authentication function (optional) */
  authenticate?: (req: FastifyRequest) => Promise<unknown>

  /** Controller resolver for DI (optional) */
  resolveController?: <T>(Controller: new () => T) => T | Promise<T>
}

// Note: No validate function needed - Fastify handles validation natively!
```

### `registerErrorHandler(app, options)`

Registers an error handler on the Fastify instance. **Must be called before `registerDecoratorRoutes`**.

```typescript
interface ErrorHandlerOptions {
  /** Log errors to console (default: true in dev) */
  logErrors?: boolean
  /** Include stack traces (default: true in dev) */
  includeStack?: boolean
  /** Custom error callback */
  onError?: (error: Error, request: FastifyRequest) => void
}
```

### `ValidatedRequest`

Request object passed to controller methods:

```typescript
interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> {
  raw: FastifyRequest    // Original Fastify request
  user?: unknown         // Authenticated user (if auth performed)
  body: TBody            // Validated request body
  query: TQuery          // Validated query parameters
  params: TParams        // Validated path parameters
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

## Comparison with Other Adapters

| Feature | Express | Hono | Fastify |
|---------|---------|------|---------|
| Requires `validate` function | Yes | Yes | **No** |
| Validation library | `@kontract/ajv` | `@kontract/ajv` | **Built-in** |
| Response serialization | JSON.stringify | JSON.stringify | **fast-json-stringify** |
| Error handler | Middleware | `app.onError()` | `setErrorHandler()` |

## Exports

```typescript
// Main exports
import {
  registerDecoratorRoutes,
  registerErrorHandler,
  OpenApiBuilder,
  type RegisterRoutesOptions,
  type ValidatedRequest,
  type ErrorHandlerOptions,
} from '@kontract/fastify'

// Sub-path exports
import { registerDecoratorRoutes } from '@kontract/fastify/adapters'
import { registerErrorHandler } from '@kontract/fastify/middleware'
import { OpenApiBuilder } from '@kontract/fastify/builder'
```

## License

MIT
