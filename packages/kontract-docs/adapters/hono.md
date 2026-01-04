# Hono Adapter

The Hono adapter provides integration for Hono, a lightweight web framework that works on edge runtimes like Cloudflare Workers, Deno, and Bun.

## Installation

```bash
npm install @kontract/hono @sinclair/typebox hono
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  del,
  defineController,
  registerController,
  createErrorHandler,
  buildOpenApiSpec,
} from '@kontract/hono'

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
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    // Path params like :id are automatically inferred as strings
    getUser: get('/users/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id is typed
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      }
    ),
  }
)

// Create app
const app = new Hono()

app.onError(createErrorHandler({ logErrors: true }))

registerController(app, usersController)

// OpenAPI spec endpoint
const spec = buildOpenApiSpec({
  info: { title: 'My API', version: '1.0.0' },
  controllers: [usersController],
})
app.get('/docs/json', (c) => c.json(spec))

serve({ fetch: app.fetch, port: 3000 })
```

## Defining Routes

Use the method helpers to define type-safe routes:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/hono'

const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
}, { $id: 'CreateUser' })

export const usersController = defineController(
  { tag: 'Users', description: 'User management', prefix: '/api/v1' },
  {
    // Use explicit params for UUID validation (auto-inference only gives string type)
    getUser: get('/users/:id',
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

    createUser: post('/users',
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

    deleteUser: del('/users/:id',
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

## Registration Options

### registerController

```typescript
import { registerController } from '@kontract/hono'

registerController(app, usersController, {
  // Optional: authentication function
  authenticate: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    }
    return verifyToken(token)
  },
})
```

### createErrorHandler

```typescript
app.onError(createErrorHandler({
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, c) => {
    // Custom error handling
    console.error('Error:', error, c.req.path)
  },
}))
```

## Handler Context

The handler receives a fully-typed context:

```typescript
// Path params like :id are automatically inferred
const updateUser = patch('/users/:id',
  async ({ params, query, body, user, reply, raw }) => {
    // params.id - auto-inferred as string from path
    // query - validated query parameters (typed)
    // body - validated request body (typed)
    // user - authenticated user (when auth is set)
    // reply - response helpers
    // raw - original Hono Context

    return reply.ok(updatedUser)
  },
  {
    query: Type.Object({ notify: Type.Optional(Type.Boolean()) }),
    body: UpdateUserRequest,
    responses: { 200: { schema: User } },
  }
)
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

## Edge Runtime Deployment

### Cloudflare Workers

```typescript
// src/index.ts
import { Hono } from 'hono'
import { registerController, createErrorHandler } from '@kontract/hono'
import { usersController } from './controllers/users.js'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, usersController)

export default app
```

```toml
# wrangler.toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
```

### Deno

```typescript
// main.ts
import { Hono } from 'hono'
import { registerController, createErrorHandler } from '@kontract/hono'
import { usersController } from './controllers/users.ts'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, usersController)

Deno.serve(app.fetch)
```

### Bun

```typescript
// index.ts
import { Hono } from 'hono'
import { registerController, createErrorHandler } from '@kontract/hono'
import { usersController } from './controllers/users.ts'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, usersController)

export default {
  port: 3000,
  fetch: app.fetch,
}
```

## Middleware Integration

Use Hono middleware:

```typescript
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors())
app.use('*', secureHeaders())

// Register routes after middleware
registerController(app, usersController)
```

## OpenAPI Generation

```typescript
import { buildOpenApiSpec } from '@kontract/hono'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [usersController, postsController],
  servers: [
    { url: 'https://api.example.com' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
})

app.get('/docs/json', (c) => c.json(spec))
```

## Complete Example

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  patch,
  del,
  defineController,
  registerController,
  createErrorHandler,
  buildOpenApiSpec,
} from '@kontract/hono'

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
        summary: 'List all users',
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
const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.onError(createErrorHandler({ logErrors: true }))

registerController(app, usersController, {
  authenticate: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    return await verifyJwt(token)
  },
})

// OpenAPI documentation
const spec = buildOpenApiSpec({
  info: {
    title: 'My Hono API',
    version: '1.0.0',
    description: 'Edge-ready API with Kontract',
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

app.get('/docs/json', (c) => c.json(spec))

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
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

  // Error handling
  createErrorHandler,

  // OpenAPI
  buildOpenApiSpec,

  // Types
  type HonoRouteHandler,
  type HonoRouteDefinition,
  type RegisterOptions,
} from '@kontract/hono'
```

## Comparison

| Feature | Express | Fastify | Hono |
|---------|---------|---------|------|
| Bundle size | Large | Medium | **Small** |
| Edge runtime support | No | No | **Yes** |
| Validation | @kontract/ajv | Built-in | @kontract/ajv |
| Performance | Good | Best | Very Good |
| Middleware ecosystem | Extensive | Good | Growing |
