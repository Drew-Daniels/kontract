# What is Kontract?

Kontract is a framework-agnostic library for building type-safe, documented APIs in Node.js. It provides a unified system for defining API contracts using TypeBox schemas, with automatic request validation, response typing, and OpenAPI documentation generation.

## Why Kontract?

### The Problem

Building APIs typically involves:
- Writing validation logic separately from your route handlers
- Manually keeping OpenAPI documentation in sync with your code
- Type-casting request data because TypeScript doesn't know the shape at runtime
- Duplicating type definitions between validation schemas and TypeScript types

### The Solution

Kontract solves these problems by making your schema definitions the single source of truth:

```typescript
import { Type } from '@sinclair/typebox'
import { get, defineController } from 'kontract-hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
})

const getUser = get('/users/:id',
  async ({ params, reply }) => {
    // params.id is typed as string - automatically inferred
    const user = await userService.find(params.id)
    if (!user) return reply.notFound()
    return reply.ok(user)
  },
  {
    params: Type.Object({ id: Type.String() }),
    responses: { 200: { schema: User }, 404: null },
  }
)

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1' },
  { getUser }
)
```

From this single definition, you get:
- **Runtime validation** of the `id` path parameter
- **TypeScript types** for `params.id` inferred automatically
- **OpenAPI documentation** generated automatically
- **Response validation** (optional) to catch contract violations in development

## Key Features

### Schema-First Design

Define your API contract using [TypeBox](https://github.com/sinclairzx81/typebox) schemas. TypeBox provides a JSON Schema compatible type builder that generates TypeScript types automatically.

### Full Type Inference

Handler parameters are typed automatically based on your schemas. No manual type annotations or `Static<typeof Schema>` casts required.

```typescript
const createUser = post('/users',
  async ({ body, reply }) => {
    // body is typed as { name: string; email: string }
    const user = await userService.create(body)
    return reply.created(user)
  },
  {
    body: Type.Object({
      name: Type.String(),
      email: Type.String({ format: 'email' }),
    }),
    responses: { 201: { schema: User } },
  }
)
```

### Framework Agnostic

The core library has no framework dependencies. Use the adapter for your framework of choice:
- [Hono](/adapters/hono) - Lightweight adapter for edge runtimes
- [Fastify](/adapters/fastify) - Native validation with best performance
- [Express](/adapters/express) - Middleware-based adapter
- [AdonisJS](/adapters/adonis) - Full-featured adapter with Lucid ORM support

### Automatic OpenAPI Generation

Generate OpenAPI 3.0.3 or 3.1.0 specifications from your route definitions. The spec includes:
- Path parameters, query strings, and request bodies
- Response schemas with status codes
- Authentication requirements
- File upload handling
- Examples and descriptions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│  Route helpers: get, post, put, patch, del              │
│  Controller grouping: defineController                   │
├─────────────────────────────────────────────────────────┤
│                   kontract (core)                        │
│  - TypeBox schema integration                            │
│  - Response helpers (ok, created, notFound, etc.)       │
│  - OpenAPI generation                                    │
├─────────────────────────────────────────────────────────┤
│              Framework Adapter                           │
│  kontract-hono | kontract-fastify | kontract-express    │
│  - Route registration                                    │
│  - Request validation                                    │
│  - Response handling                                     │
├─────────────────────────────────────────────────────────┤
│              kontract-ajv (validation)                   │
│  - AJV-based schema validation                          │
│  - Type coercion and format validation                  │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

- [Getting Started](/guide/getting-started) - Install and create your first routes
- [Core Concepts](/guide/core-concepts/) - Deep dive into schemas, routes, and responses
- [Adapters](/adapters/) - Choose and configure your framework adapter
