---
layout: home

hero:
  name: Kontract
  text: Type-safe API contracts for Node.js
  tagline: Define your API schema once, get validation, documentation, and type inference automatically.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Drew-Daniels/kontract
  image:
    src: /logo.svg
    alt: Kontract

features:
  - icon: "{ }"
    title: Schema-First Design
    details: Define your API contract using TypeBox schemas. Get compile-time type safety and runtime validation from a single source of truth.
  - icon: "&#9881;"
    title: Framework Agnostic
    details: Works with AdonisJS, Express, Fastify, and Hono. Same contracts, any framework - switch without rewriting your API definitions.
  - icon: "&#128196;"
    title: OpenAPI Generation
    details: Automatically generate OpenAPI 3.0/3.1 specs from your controllers. Interactive documentation included.
  - icon: "&#128274;"
    title: Full Type Inference
    details: Complete TypeScript inference for request params, query strings, bodies, and responses. No manual type annotations needed.
  - icon: "&#9989;"
    title: Request & Response Validation
    details: Validate incoming requests automatically. Optionally validate responses in development to catch contract violations early.
  - icon: "&#128640;"
    title: Minimal Boilerplate
    details: Short method helpers like get(), post(), patch() keep your code concise while maintaining full type safety.
---

## Quick Example

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, defineController } from '@kontract/hono'

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
    // Path params like :id are automatically inferred
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)  // params.id is typed as string
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
  }
)
```

## Packages

| Package | Description |
|---------|-------------|
| [`@kontract/adonis`](/adapters/adonis) | AdonisJS v6 adapter with Lucid ORM support |
| [`@kontract/express`](/adapters/express) | Express.js adapter |
| [`@kontract/fastify`](/adapters/fastify) | Fastify adapter with native validation |
| [`@kontract/hono`](/adapters/hono) | Hono adapter for edge runtimes |
| [`@kontract/ajv`](/api/kontract-ajv) | AJV-based validation (used by Express, Hono, AdonisJS) |

For generating type-safe API clients, see [Client Generation](/api/client-generation).
