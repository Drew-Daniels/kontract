# Express Adapter

The Express adapter provides middleware-based integration for Express.js applications.

## Installation

```bash
npm install @kontract/express @sinclair/typebox express
```

## Quick Start

```typescript
import express from 'express'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  del,
  defineController,
  registerController,
  createErrorHandler,
  buildOpenApiSpec,
} from '@kontract/express'

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
        summary: 'List users',
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
const app = express()
app.use(express.json())

registerController(app, usersController, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')
    return verifyToken(token)
  },
})

// Error handler must be last
app.use(createErrorHandler())

// OpenAPI spec
const spec = buildOpenApiSpec({
  info: { title: 'My API', version: '1.0.0' },
  controllers: [usersController],
})
app.get('/docs/json', (req, res) => res.json(spec))

app.listen(3000)
```

## Defining Routes

Use the method helpers to define type-safe routes:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/express'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
})

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await findAllUsers()
        return reply.ok(users)
      },
      {
        summary: 'List users',
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
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      },
      {
        summary: 'Create user',
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
        summary: 'Delete user',
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),
  }
)
```

## Registration Options

### registerController

```typescript
import { registerController } from '@kontract/express'

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
```

### registerControllers

Register multiple controllers at once:

```typescript
import { registerControllers } from '@kontract/express'
import { usersController, postsController } from './controllers/index.js'

registerControllers(app, [usersController, postsController], {
  authenticate: async (req) => verifyToken(req.headers.authorization),
})
```

## Error Handling

### Error Handler Middleware

**Must be registered after all routes:**

```typescript
import { createErrorHandler } from '@kontract/express'

app.use(createErrorHandler({
  logErrors: process.env.NODE_ENV === 'development',
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, req) => {
    // Custom error logging
    logger.error(error, { path: req.path })
  },
}))
```

### Error Response Format

Validation errors:
```json
{
  "status": 422,
  "code": "E_VALIDATION_ERROR",
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
  "message": "Authentication required"
}
```

## Handler Context

The handler receives a fully-typed context:

```typescript
// Path params like :id are automatically inferred
const updateUser = patch('/users/:id',
  async ({ params, query, body, user, reply, req }) => {
    // params.id - auto-inferred as string from path
    // query - validated query parameters (typed)
    // body - validated request body (typed)
    // user - authenticated user (when auth is set)
    // reply - response helpers
    // req - original Express request

    return reply.ok(updatedUser)
  },
  {
    query: Type.Object({ notify: Type.Optional(Type.Boolean()) }),
    body: UpdateUserRequest,
    responses: { 200: { schema: User } },
  }
)
```

## Middleware Integration

Add Express middleware to specific routes:

```typescript
import rateLimit from 'express-rate-limit'

const login = post('/auth/login',
  async ({ body, reply }) => {
    const token = await authService.login(body)
    return reply.ok({ token })
  },
  {
    middleware: [
      rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
    ],
    body: LoginRequest,
    responses: { 200: { schema: TokenResponse } },
  }
)
```

## OpenAPI Generation

```typescript
import { buildOpenApiSpec } from '@kontract/express'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [usersController, postsController],
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
})

app.get('/docs/json', (req, res) => res.json(spec))
```

## Complete Example

```typescript
import express from 'express'
import cors from 'cors'
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
} from '@kontract/express'

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
const app = express()

app.use(cors())
app.use(express.json())

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
    title: 'My Express API',
    version: '1.0.0',
    description: 'Express API with Kontract',
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

app.get('/docs/json', (req, res) => res.json(spec))

// Error handler (must be last)
app.use(createErrorHandler({ logErrors: true }))

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
  buildOpenApiSpec,

  // Types
  type ExpressRouteHandler,
  type ExpressRouteDefinition,
  type RegisterOptions,
} from '@kontract/express'
```

## Migration from Existing Routes

Gradually migrate existing Express routes:

```typescript
// Existing route (keep working)
app.get('/legacy/users', legacyUsersHandler)

// New kontract routes
const usersController = defineController(
  { tag: 'Users', prefix: '/api/v2/users' },
  { listUsers, getUser, createUser }
)

// Register new routes alongside legacy
registerController(app, usersController)
```
