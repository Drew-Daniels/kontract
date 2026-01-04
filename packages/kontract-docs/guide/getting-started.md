# Getting Started

This guide walks you through installing Kontract and creating your first type-safe API endpoint.

## Installation

Choose the installation based on your framework:

::: code-group

```bash [Hono]
npm install kontract kontract-hono kontract-ajv @sinclair/typebox
```

```bash [Fastify]
npm install kontract kontract-fastify @sinclair/typebox
```

```bash [Express]
npm install kontract kontract-express kontract-ajv @sinclair/typebox
```

```bash [AdonisJS]
npm install kontract-adonis @sinclair/typebox
```

:::

## Quick Start

### 1. Define Your Schemas

Create TypeBox schemas for your data:

```typescript
// schemas/user.ts
import { Type, Static } from '@sinclair/typebox'

export const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  createdAt: Type.String({ format: 'date-time' }),
}, { $id: 'User' })

export type UserType = Static<typeof User>

export const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
}, { $id: 'CreateUserRequest' })

export type CreateUserRequestType = Static<typeof CreateUserRequest>
```

### 2. Create Your Routes

Use the method helpers to define type-safe endpoints:

::: code-group

```typescript [Hono]
// controllers/users.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-hono'
import { User, CreateUserRequest } from '../schemas/user.js'

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get a user by ID',
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
        summary: 'Create a new user',
        auth: 'required',
        body: CreateUserRequest,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound('User not found')
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),
  }
)
```

```typescript [Fastify]
// controllers/users.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-fastify'
import { User, CreateUserRequest } from '../schemas/user.js'

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get a user by ID',
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
        summary: 'Create a new user',
        auth: 'required',
        body: CreateUserRequest,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound('User not found')
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),
  }
)
```

```typescript [Express]
// controllers/users.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-express'
import { User, CreateUserRequest } from '../schemas/user.js'

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get a user by ID',
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
        summary: 'Create a new user',
        auth: 'required',
        body: CreateUserRequest,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound('User not found')
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),
  }
)
```

```typescript [AdonisJS]
// controllers/users.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-adonis'
import { User, CreateUserRequest } from '../schemas/user.js'

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List all users',
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get a user by ID',
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
        summary: 'Create a new user',
        auth: 'required',
        body: CreateUserRequest,
        responses: { 201: { schema: User }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound('User not found')
        return reply.noContent()
      },
      {
        summary: 'Delete a user',
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),
  }
)
```

:::

### 3. Register Routes with Your Framework

::: code-group

```typescript [Hono]
// app.ts
import { Hono } from 'hono'
import { registerController, createErrorHandler } from 'kontract-hono'
import { usersController } from './controllers/users.js'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, usersController)

export default app
```

```typescript [Fastify]
// app.ts
import Fastify from 'fastify'
import { registerController, registerErrorHandler } from 'kontract-fastify'
import { usersController } from './controllers/users.js'

const app = Fastify()

registerErrorHandler(app)
registerController(app, usersController)

await app.listen({ port: 3000 })
```

```typescript [Express]
// app.ts
import express from 'express'
import { registerController, createErrorHandler } from 'kontract-express'
import { usersController } from './controllers/users.js'

const app = express()
app.use(express.json())

registerController(app, usersController)
app.use(createErrorHandler())

app.listen(3000)
```

```typescript [AdonisJS]
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { registerController } from 'kontract-adonis'
import { usersController } from '#controllers/users'

registerController(router, usersController)
```

:::

### 4. Generate OpenAPI Spec

Generate your OpenAPI specification:

```typescript
import { buildOpenApiSpec } from 'kontract-hono' // or your adapter
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [usersController, postsController],
})

// Serve at /docs/json or write to file
```

## Next Steps

- [Schemas](/guide/core-concepts/schemas) - Learn TypeBox schema patterns
- [Routes](/guide/core-concepts/routes) - All route helper functions
- [Responses](/guide/core-concepts/responses) - Response helper functions
- [Validation](/guide/core-concepts/validation) - Request and response validation
- [Your Framework Adapter](/adapters/) - Framework-specific features
