# Fastify Adapter

The Fastify adapter leverages Fastify's native validation for maximum performance. Unlike other adapters, it doesn't require a separate validation package.

## Why Fastify?

Fastify provides significant performance advantages:

| Feature | Express/Hono | Fastify |
|---------|-------------|---------|
| Validation timing | Per-request | Compiled once at startup |
| Validation library | Manual AJV call | Built-in AJV |
| Response serialization | `JSON.stringify()` | `fast-json-stringify` (2x faster) |
| Schema compilation | Every request | Once at startup |

## Installation

```bash
npm install kontract @kontract/fastify @sinclair/typebox fastify
```

::: tip No @kontract/ajv needed
Unlike Express and Hono, Fastify has built-in AJV validation, so you don't need `@kontract/ajv`.
:::

## Quick Start

```typescript
import Fastify from 'fastify'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  del,
  defineController,
  registerController,
  registerErrorHandler,
  buildOpenApiSpec,
} from '@kontract/fastify'

// Define schemas
const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

// Define controller with inline routes
export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1' },
  {
    listUsers: get('/users',
      async ({ query, reply }) => {
        const users = await userService.findAll(query.page, query.limit)
        return reply.ok(users)
      },
      {
        summary: 'List users',
        query: Type.Object({
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
        }),
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/users/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        responses: { 200: { schema: User }, 404: null },
      }
    ),
  }
)

// Create app
const app = Fastify()

// Register error handler FIRST (before routes)
registerErrorHandler(app, { logErrors: true })

// Register routes - no validate function needed!
registerController(app, usersController, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    return verifyToken(token)
  },
})

// OpenAPI spec endpoint
const spec = buildOpenApiSpec({
  info: { title: 'My API', version: '1.0.0' },
  controllers: [usersController],
})
app.get('/docs/json', () => spec)

await app.listen({ port: 3000 })
```

## Defining Routes

Use the method helpers to define type-safe routes:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/fastify'

const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1, description: 'User display name' }),
  email: Type.String({ format: 'email', description: 'User email address' }),
}, { $id: 'CreateUser' })

export const usersController = defineController(
  { tag: 'Users', description: 'User management', prefix: '/api/v1/users' },
  {
    listUsers: get('/',
      async ({ query, reply }) => {
        const users = await userService.findAll(query.page, query.limit)
        return reply.ok(users)
      },
      {
        summary: 'List users',
        query: Type.Object({
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
        }),
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      },
      {
        summary: 'Create a user',
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        await userService.delete(params.id)
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        responses: { 204: null },
      }
    ),
  }
)
```

## How Native Validation Works

Your TypeBox schemas are passed directly to Fastify's route schema option:

```typescript
// Your route definition
const createUser = post('/users', handler, {
  body: CreateUser,
  query: PaginationQuery,
  responses: { 201: { schema: User } },
})

// Registers as:
fastify.route({
  method: 'POST',
  url: '/users',
  schema: {
    body: CreateUser,           // Fastify validates automatically
    querystring: PaginationQuery,      // Type coercion included
    response: { 201: User },    // Enables fast-json-stringify
  },
  handler,
})
```

Benefits:
- Schemas compiled once at startup, not per-request
- Response schemas enable `fast-json-stringify` for 2x faster serialization
- Native type coercion for query parameters and path parameters

## Registration Options

### registerController

```typescript
registerController(app, usersController, {
  // Optional: authentication function
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    }
    return verifyToken(token)
  },
})
// Note: No validate function needed - Fastify handles it natively!
```

### registerErrorHandler

**Must be called before registering controllers:**

```typescript
registerErrorHandler(app, {
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, request) => {
    // Custom error handling
    logger.error(error)
  },
})
```

## Error Responses

Validation errors:
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

Authentication errors:
```json
{
  "status": 401,
  "code": "E_UNAUTHORIZED",
  "message": "Unauthorized"
}
```

## Handler Context

The handler receives a fully-typed context:

```typescript
// Path params like :id are automatically inferred
const updateUser = patch('/users/:id',
  async ({ params, query, body, user, reply, req }) => {
    // params.id - auto-inferred as string from path
    // query - validated query parameters (with type coercion)
    // body - validated request body (typed)
    // user - authenticated user (when auth is set)
    // reply - response helpers
    // req - original Fastify request

    return reply.ok(updatedUser)
  },
  {
    query: Type.Object({ notify: Type.Optional(Type.Boolean()) }),
    body: UpdateUserRequest,
    responses: { 200: { schema: User } },
  }
)
```

## OpenAPI Generation

```typescript
import { buildOpenApiSpec } from '@kontract/fastify'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [usersController, postsController],
  servers: [
    { url: 'http://localhost:3000' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
})

app.get('/docs/json', () => spec)
```

## Complete Example

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  patch,
  del,
  defineController,
  registerController,
  registerErrorHandler,
  buildOpenApiSpec,
} from '@kontract/fastify'

// Schemas
const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
})

// Controller with inline routes - path params are auto-inferred
const usersController = defineController(
  { tag: 'Users', description: 'User management', prefix: '/api/v1/users' },
  {
    listUsers: get('/',
      async ({ reply }) => reply.ok(await userService.findAll()),
      {
        summary: 'List users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id auto-inferred
        if (!user) return reply.notFound()
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => reply.created(await userService.create(body)),
      {
        summary: 'Create a user',
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        await userService.delete(params.id)
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        responses: { 204: null, 404: null },
      }
    ),
  }
)

// App setup
const app = Fastify({ logger: true })

await app.register(cors)

// Error handler (must be before routes)
registerErrorHandler(app, {
  logErrors: true,
  onError: (error, request) => {
    app.log.error(error)
  },
})

registerController(app, usersController, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    return await verifyJwt(token)
  },
})

// OpenAPI documentation
const spec = buildOpenApiSpec({
  info: {
    title: 'My Fastify API',
    version: '1.0.0',
    description: 'High-performance API with Kontract',
  },
  controllers: [usersController],
  servers: [{ url: 'http://localhost:3000' }],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
})

app.get('/docs/json', () => spec)

await app.listen({ port: 3000 })
console.log('Server running on http://localhost:3000')
```

## Exports

```typescript
import {
  // Route helpers
  get,
  post,
  put,
  patch,
  del,

  // Controller
  defineController,

  // Registration
  registerController,
  registerControllers,
  registerErrorHandler,

  // OpenAPI
  buildOpenApiSpec,

  // Types
  type FastifyRouteHandler,
  type FastifyRouteDefinition,
  type RegisterOptions,
} from '@kontract/fastify'
```

## Comparison with Other Adapters

| Feature | Express | Hono | Fastify |
|---------|---------|------|---------|
| Requires validation package | Yes | Yes | **No** |
| Validation library | `@kontract/ajv` | `@kontract/ajv` | **Built-in** |
| Response serialization | JSON.stringify | JSON.stringify | **fast-json-stringify** |
| Error handler | Middleware | `app.onError()` | `setErrorHandler()` |
| Schema compilation | Per-request | Per-request | **Once at startup** |
