# AdonisJS Adapter

The AdonisJS adapter provides deep integration with AdonisJS v6, including Lucid ORM serialization, authentication, and dependency injection.

## Installation

```bash
npm install @kontract/adonis @sinclair/typebox
```

The adapter re-exports common items from the core package, so you can import everything from one place.

## Quick Start

### 1. Define Your Routes

```typescript
// app/controllers/books_controller.ts
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from '@kontract/adonis'
import Book from '#models/book'

const BookSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  author: Type.String(),
}, { $id: 'Book' })

const CreateBookRequest = Type.Object({
  title: Type.String({ minLength: 1 }),
  author: Type.String({ minLength: 1 }),
}, { $id: 'CreateBookRequest' })

export const booksController = defineController(
  { tag: 'Books', description: 'Book management', prefix: '/api/v1/books' },
  {
    listBooks: get('/',
      async ({ reply }) => {
        const books = await Book.all()
        return reply.ok(books)
      },
      {
        summary: 'List all books',
        responses: { 200: { schema: Type.Array(BookSchema) } },
      }
    ),

    createBook: post('/',
      async ({ body, reply }) => {
        const book = await Book.create(body)
        return reply.created(book)
      },
      {
        summary: 'Create a book',
        auth: 'required',
        body: CreateBookRequest,
        responses: { 201: { schema: BookSchema }, 422: null },
      }
    ),
  }
)
```

### 2. Register Routes

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { registerController } from '@kontract/adonis'
import { booksController } from '#controllers/books_controller'
import { usersController } from '#controllers/users_controller'

registerController(router, booksController)
registerController(router, usersController)
```

### 3. Serve OpenAPI Spec

```typescript
// start/routes.ts
import { buildOpenApiSpec } from '@kontract/adonis'
import { booksController, usersController } from '#controllers/index'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [booksController, usersController],
})

router.get('/docs/json', async () => spec)
```

## Defining Routes

Use the method helpers to define type-safe routes:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/adonis'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
})

const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
})

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1/users' },
  {
    listUsers: get('/',
      async ({ query, reply }) => {
        const users = await User.query().paginate(query.page, query.limit)
        return reply.ok(users)
      },
      {
        summary: 'List users',
        query: PaginationQuery,
        responses: { 200: { schema: Type.Array(User) } },
      }
    ),

    // Path params like :id are automatically inferred as strings
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await User.find(params.id)  // params.id is typed
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => {
        const user = await User.create(body)
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
        const user = await User.find(params.id)
        if (!user) return reply.notFound()
        await user.delete()
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

## Lucid ORM Integration

The adapter automatically serializes Lucid models and paginators.

### Model Serialization

Lucid models are serialized using their `serialize()` method or `toResponse()` if defined:

```typescript
// app/models/book.ts
export default class Book extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  // Custom serialization
  toResponse() {
    return {
      id: this.id,
      title: this.title,
      url: `/books/${this.id}`,
    }
  }
}
```

### Paginator Support

Lucid paginators are automatically serialized:

```typescript
const listBooks = get('/',
  async ({ query, reply }) => {
    const books = await Book.query().paginate(query.page, 20)
    return reply.ok(books)
  },
  {
    query: Type.Object({
      page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    }),
    responses: { 200: { schema: PaginatedBooks } },
  }
)
```

Output:
```json
{
  "data": [{ "id": "1", "title": "..." }],
  "meta": {
    "total": 100,
    "perPage": 20,
    "currentPage": 1,
    "lastPage": 5
  }
}
```

## Authentication

Routes with `auth: 'required'` require authentication:

```typescript
const createBook = post('/',
  async ({ body, user, reply }) => {
    // user is available when auth is required
    const book = await user.related('books').create(body)
    return reply.created(book)
  },
  {
    auth: 'required',
    body: CreateBookRequest,
    responses: { 201: { schema: BookSchema } },
  }
)
```

Authentication is handled via AdonisJS's auth system. Configure it in your auth middleware.

## Handler Context

The handler receives a fully-typed context:

```typescript
// Path params like :id are automatically inferred
const updateUser = patch('/:id',
  async ({ params, query, body, user, reply, ctx }) => {
    // params.id - auto-inferred as string from path
    // query - validated query parameters (typed)
    // body - validated request body (typed)
    // user - authenticated user (when auth is set)
    // reply - response helpers
    // ctx - original AdonisJS HttpContext

    return reply.ok(updatedUser)
  },
  {
    query: Type.Object({ notify: Type.Optional(Type.Boolean()) }),
    body: UpdateUserRequest,
    responses: { 200: { schema: User } },
  }
)
```

## Response Validation

Enable response validation in development:

```typescript
// providers/app_provider.ts
import { defineConfig } from 'kontract'
import { createAjvValidator } from '@kontract/adonis'

export default class AppProvider {
  async boot() {
    const validator = createAjvValidator()

    defineConfig({
      runtime: {
        validateResponses: process.env.NODE_ENV !== 'production',
      },
      validator: (schema, data) => validator.validate(schema, data),
    })
  }
}
```

## Serializers

Built-in serializers handle common data types:

| Serializer | Priority | Handles |
|------------|----------|---------|
| `paginatorSerializer` | 150 | Lucid paginators |
| `typedModelSerializer` | 100 | Objects with `toResponse()` |
| `lucidModelSerializer` | 50 | Lucid models |
| `serializableSerializer` | 25 | Objects with `serialize()` |

Access serializers:

```typescript
import {
  isLucidModel,
  isTypedModel,
  isPaginator,
  lucidSerializers,
} from '@kontract/adonis'
```

## OpenAPI Generation

```typescript
import { buildOpenApiSpec } from '@kontract/adonis'
import { usersController, booksController } from '#controllers/index'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },
  controllers: [usersController, booksController],
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3333', description: 'Development' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
})
```

## Complete Example

```typescript
// app/controllers/users_controller.ts
import { Type } from '@sinclair/typebox'
import { get, post, patch, del, defineController } from '@kontract/adonis'
import User from '#models/user'
import UserService from '#services/user_service'
import { inject } from '@adonisjs/core'

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
})

// Controller with inline routes using injected service - path params are auto-inferred
const userService = await inject(UserService)

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1/users' },
  {
    listUsers: get('/',
      async ({ reply }) => {
        const users = await userService.findAll()
        return reply.ok(users)
      },
      {
        summary: 'List users',
        responses: { 200: { schema: Type.Array(UserSchema) } },
      }
    ),

    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)  // params.id auto-inferred
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: UserSchema }, 404: null },
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
        responses: { 201: { schema: UserSchema }, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) return reply.notFound()
        return reply.noContent()
      },
      {
        summary: 'Delete user',
        auth: 'required',
        responses: { 204: null, 404: null },
      }
    ),
  }
)
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

  // Validation
  validate, createAjvValidator, AjvValidationError,

  // Serializers
  isLucidModel, isTypedModel, isPaginator,
  lucidSerializers,

  // OpenAPI
  buildOpenApiSpec,

  // Configuration
  defineConfig, getConfig,

  // TypeBox re-export
  Type,
} from '@kontract/adonis'
```

## Peer Dependencies

- `@adonisjs/core` ^6.0.0
- `@sinclair/typebox` >=0.32.0
- `@adonisjs/lucid` ^21.0.0 (optional, for serializers)
