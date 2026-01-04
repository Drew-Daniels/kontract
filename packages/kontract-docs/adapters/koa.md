# Koa Adapter

The Koa adapter provides integration for Koa, a lightweight web framework by the team behind Express.

## Installation

```bash
npm install @kontract/koa @sinclair/typebox koa @koa/router koa-bodyparser
```

::: tip Validation Included
The Koa adapter includes `@kontract/ajv` as a dependency, providing request validation out of the box.
:::

## Quick Start

```typescript
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  del,
  defineController,
  registerController,
  createErrorHandler,
  OpenApiBuilder,
} from '@kontract/koa'

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
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      },
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      }
    ),

    // Path params like :id are automatically inferred as strings
    getUser: get('/users/:id',
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id is typed
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      }
    ),
  }
)

// Create app
const app = new Koa()
const router = new Router()

app.use(bodyParser())
app.use(createErrorHandler({ logErrors: true }))  // Error handler FIRST

registerController(router, usersController)

app.use(router.routes())
app.use(router.allowedMethods())

// OpenAPI spec endpoint
const spec = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
})
spec.addController(usersController)
router.get('/docs/json', (ctx) => { ctx.body = spec.build() })

app.listen(3000)
```

## Defining Routes

Use the method helpers to define type-safe routes:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/koa'

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
      {
        summary: 'Get user by ID',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      }
    ),

    createUser: post('/users',
      {
        summary: 'Create a user',
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      },
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      }
    ),

    deleteUser: del('/users/:id',
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        responses: { 204: null },
      },
      async ({ params, reply }) => {
        await userService.delete(params.id)
        return reply.noContent()
      }
    ),
  }
)
```

## Registration Options

### registerController

```typescript
import { registerController } from '@kontract/koa'

registerController(router, usersController, {
  // Optional: authentication function
  authenticate: async (ctx) => {
    const token = ctx.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    }
    return verifyToken(token)
  },
})
```

### createErrorHandler

**Important:** In Koa, the error handler must be registered **FIRST** (before routes) so it can wrap all downstream middleware in a try/catch.

```typescript
app.use(createErrorHandler({
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, ctx) => {
    // Custom error handling
    console.error('Error:', error, ctx.path)
  },
}))
```

## Handler Context

The handler receives a fully-typed context:

```typescript
// Path params like :id are automatically inferred
const updateUser = patch('/users/:id',
  {
    query: Type.Object({ notify: Type.Optional(Type.Boolean()) }),
    body: UpdateUserRequest,
    responses: { 200: { schema: User } },
  },
  async ({ params, query, body, user, reply, ctx }) => {
    // params.id - auto-inferred as string from path
    // query - validated query parameters (typed)
    // body - validated request body (typed)
    // user - authenticated user (when auth is set)
    // reply - response helpers
    // ctx - raw Koa Context

    return reply.ok(updatedUser)
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

## Middleware Integration

Use Koa middleware:

```typescript
import cors from '@koa/cors'

const app = new Koa()

// Global middleware
app.use(cors())
app.use(bodyParser())
app.use(createErrorHandler())  // Error handler wraps everything

// Register routes after middleware
registerController(router, usersController)
app.use(router.routes())
app.use(router.allowedMethods())
```

## OpenAPI Generation

```typescript
import { OpenApiBuilder } from '@kontract/koa'
import { usersController, postsController } from './controllers/index.js'

const builder = new OpenApiBuilder({
  title: 'My API',
  version: '1.0.0',
  servers: [{ url: 'https://api.example.com' }],
  securityScheme: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
})

builder.addController(usersController)
builder.addController(postsController)

router.get('/docs/json', (ctx) => { ctx.body = builder.build() })
```

## Complete Example

```typescript
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  patch,
  del,
  defineController,
  registerController,
  createErrorHandler,
  OpenApiBuilder,
} from '@kontract/koa'

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
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      },
      async ({ reply }) => reply.ok(await userService.findAll())
    ),

    getUser: get('/:id',
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id auto-inferred
        if (!user) return reply.notFound()
        return reply.ok(user)
      }
    ),

    createUser: post('/',
      {
        summary: 'Create a user',
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      },
      async ({ body, reply }) => reply.created(await userService.create(body))
    ),

    deleteUser: del('/:id',
      {
        summary: 'Delete a user',
        auth: 'required',
        responses: { 204: null, 404: null },
      },
      async ({ params, reply }) => {
        await userService.delete(params.id)
        return reply.noContent()
      }
    ),
  }
)

// App setup
const app = new Koa()
const router = new Router()

app.use(cors())
app.use(bodyParser())
app.use(createErrorHandler({ logErrors: true }))  // FIRST - wraps everything

registerController(router, usersController, {
  authenticate: async (ctx) => {
    const token = ctx.get('Authorization')?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    return await verifyJwt(token)
  },
})

// OpenAPI documentation
const builder = new OpenApiBuilder({
  title: 'My Koa API',
  version: '1.0.0',
  description: 'API built with Kontract and Koa',
  servers: [{ url: 'http://localhost:3000' }],
  securityScheme: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
})
builder.addController(usersController)

router.get('/docs/json', (ctx) => { ctx.body = builder.build() })

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
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
  OpenApiBuilder,

  // Types
  type KoaRouteHandler,
  type KoaRouteDefinition,
  type RegisterOptions,
} from '@kontract/koa'
```

## Key Differences from Express

| Aspect | Koa | Express |
|--------|-----|---------|
| Router | Separate package (`@koa/router`) | Built-in |
| Response | `ctx.body = data` | `res.json(data)` |
| Error handler | Register FIRST | Register LAST |
| Body parser | `ctx.request.body` | `req.body` |
| Context | Single `ctx` object | `req`/`res` pair |

## Comparison

| Feature | Express | Fastify | Hono | Koa |
|---------|---------|---------|------|-----|
| Bundle size | Large | Medium | Small | Small |
| Edge runtime | No | No | Yes | No |
| Validation | @kontract/ajv | Built-in | @kontract/ajv | @kontract/ajv |
| Performance | Good | Best | Very Good | Good |
| Middleware | Extensive | Good | Growing | Moderate |
