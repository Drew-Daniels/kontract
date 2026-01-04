# Routes

Kontract provides type-safe route helpers that automatically infer TypeScript types from your schemas. Each HTTP method has a dedicated helper function.

## Method Helpers

Import route helpers from your framework adapter:

```typescript
import { get, post, put, patch, del, defineController } from '@kontract/hono'
// or @kontract/express, @kontract/fastify, @kontract/adonis
```

### GET

```typescript
const listUsers = get('/api/v1/users',
  {
    summary: 'List users',
    query: Type.Object({
      page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
    }),
    responses: { 200: { schema: Type.Array(User) } },
  },
  async ({ query, reply }) => {
    const users = await User.findAll({ page: query.page })
    return reply.ok(users)
  }
)
```

### POST

```typescript
const createUser = post('/api/v1/users',
  {
    summary: 'Create a user',
    auth: 'required',
    body: CreateUserRequest,
    responses: {
      201: { schema: User },
      422: null,
    },
  },
  async ({ body, reply }) => {
    const user = await User.create(body)
    return reply.created(user)
  }
)
```

### PUT / PATCH

```typescript
// Path params like :id are automatically inferred as strings
const updateUser = patch('/api/v1/users/:id',
  {
    summary: 'Update a user',
    auth: 'required',
    body: UpdateUserRequest,
    responses: {
      200: { schema: User },
      404: null,
    },
  },
  async ({ params, body, reply }) => {
    const user = await User.findById(params.id)  // params.id is typed as string
    if (!user) return reply.notFound()
    Object.assign(user, body)
    await user.save()
    return reply.ok(user)
  }
)
```

### DELETE

```typescript
const deleteUser = del('/api/v1/users/:id',
  {
    summary: 'Delete a user',
    auth: 'required',
    responses: {
      204: null,
      404: null,
    },
  },
  async ({ params, reply }) => {
    const user = await User.findById(params.id)
    if (!user) return reply.notFound()
    await user.delete()
    return reply.noContent()
  }
)
```

## Function Signature

All method helpers follow the same pattern:

```typescript
method(path, options, handler)
```

| Argument | Type | Description |
|----------|------|-------------|
| `path` | `string` | URL path with optional `:param` placeholders |
| `options` | `object` | Route configuration and schemas |
| `handler` | `function` | Async function that handles the request |

## Route Options

| Option | Type | Description |
|--------|------|-------------|
| `summary` | `string` | Short summary for OpenAPI docs |
| `description` | `string` | Detailed description |
| `operationId` | `string` | Unique operation ID (auto-generated from function name if not provided) |
| `deprecated` | `boolean` | Mark as deprecated |
| `auth` | `'required' \| 'optional' \| 'none'` | Authentication requirement (default: `'none'`) |
| `body` | `TSchema` | Request body schema (POST, PUT, PATCH only) |
| `query` | `TSchema` | Query parameters schema |
| `params` | `TSchema` | Path parameters schema (optional - auto-inferred from path) |
| `responses` | `Record<number, ResponseDef>` | **Required.** Response definitions by status code |

## Automatic Parameter Inference

Path parameters are automatically inferred from your route path:

```typescript
// params.id and params.commentId are automatically typed as string
const getComment = get('/posts/:id/comments/:commentId',
  {
    responses: { 200: { schema: CommentSchema } },
  },
  async ({ params, reply }) => {
    // TypeScript knows: params.id: string, params.commentId: string
    const comment = await Comment.find(params.id, params.commentId)
    return reply.ok(comment)
  }
)
```

### When to Explicitly Define Params

Use explicit `params` when you need:

1. **Format validation** (UUID, email, etc.):
```typescript
get('/users/:id',
  {
    params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
    responses: { 200: { schema: User } },
  },
  handler
)
```

2. **Numeric parameters**:
```typescript
get('/posts/:page',
  {
    params: Type.Object({ page: Type.Integer({ minimum: 1 }) }),
    responses: { 200: { schema: PostList } },
  },
  handler
)
```

3. **OpenAPI documentation** (descriptions, examples):
```typescript
get('/books/:isbn',
  {
    params: Type.Object({
      isbn: Type.String({
        description: 'ISBN-13 identifier',
        examples: ['978-0-13-468599-1'],
      }),
    }),
    responses: { 200: { schema: Book } },
  },
  handler
)
```

## Handler Context

The handler receives a fully-typed context object:

```typescript
const updateUser = patch('/api/v1/users/:id',
  { /* options */ },
  async ({ params, query, body, user, reply }) => {
    // All types are automatically inferred:
    // params.id   - string (from params schema)
    // query.field - inferred from query schema
    // body        - inferred from body schema
    // user        - authenticated user (when auth is set)
    // reply       - type-safe response helpers

    return reply.ok(data)
  }
)
```

### Context Properties

| Property | Description |
|----------|-------------|
| `params` | Validated path parameters |
| `query` | Validated query parameters |
| `body` | Validated request body |
| `user` | Authenticated user (when `auth: 'required'` or `'optional'`) |
| `reply` | Response helpers (`ok`, `created`, `notFound`, etc.) |
| `raw` | Raw framework request object |

## Response Definitions

The `responses` option maps status codes to response definitions:

```typescript
responses: {
  // Schema only
  200: { schema: User },

  // Schema with description
  201: { schema: User, description: 'User created successfully' },

  // No response body
  204: null,

  // Error responses (uses standard error format)
  404: null,
  422: null,

  // Custom error schema
  400: { schema: ValidationErrorResponse },
}
```

## Grouping Routes with defineController

Group related routes under an OpenAPI tag:

```typescript
import { get, post, patch, del, defineController } from '@kontract/hono'

export const usersController = defineController(
  {
    tag: 'Users',
    description: 'User management',
    prefix: '/api/v1',
  },
  {
    listUsers: get('/users', /* ... */),
    getUser: get('/users/:id', /* ... */),
    createUser: post('/users', /* ... */),
    updateUser: patch('/users/:id', /* ... */),
    deleteUser: del('/users/:id', /* ... */),
  }
)
```

### Controller Options

| Option | Type | Description |
|--------|------|-------------|
| `tag` | `string` | **Required.** OpenAPI tag name |
| `description` | `string` | Tag description |
| `prefix` | `string` | Path prefix prepended to all routes |

## Registering Routes

Register controllers with your framework:

```typescript
import { Hono } from 'hono'
import { registerController } from '@kontract/hono'
import { usersController, postsController } from './controllers.js'

const app = new Hono()

registerController(app, usersController)
registerController(app, postsController)
```

Or register multiple controllers at once:

```typescript
import { registerControllers } from '@kontract/hono'

registerControllers(app, [usersController, postsController])
```

## Complete Example

```typescript
import { Hono } from 'hono'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  patch,
  del,
  defineController,
  registerController,
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

const UpdateUser = Type.Partial(CreateUser)

const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
})

// Controller with inline routes
export const usersController = defineController(
  {
    tag: 'Users',
    description: 'User management endpoints',
    prefix: '/api/v1/users',
  },
  {
    listUsers: get('/',
      {
        summary: 'List all users',
        query: PaginationQuery,
        responses: { 200: { schema: Type.Array(User) } },
      },
      async ({ query, reply }) => {
        const users = await userService.findAll(query.page, query.limit)
        return reply.ok(users)
      }
    ),

    // Path params are automatically inferred - no need for explicit params schema
    getUser: get('/:id',
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id: string
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      }
    ),

    createUser: post('/',
      {
        summary: 'Create a new user',
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      },
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      }
    ),

    updateUser: patch('/:id',
      {
        summary: 'Update a user',
        auth: 'required',
        body: UpdateUser,
        responses: { 200: { schema: User }, 404: null },
      },
      async ({ params, body, reply }) => {
        const user = await userService.update(params.id, body)
        if (!user) return reply.notFound()
        return reply.ok(user)
      }
    ),

    deleteUser: del('/:id',
      {
        summary: 'Delete a user',
        auth: 'required',
        responses: { 204: null, 404: null },
      },
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound()
        return reply.noContent()
      }
    ),
  }
)

// App setup
const app = new Hono()
registerController(app, usersController)

export default app
```
