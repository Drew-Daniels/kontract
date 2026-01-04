# Frequently Asked Questions

## General

### What is Kontract?

Kontract is a framework-agnostic library for building type-safe, documented APIs in Node.js. It uses TypeBox schemas to define your API contract once and get validation, TypeScript types, and OpenAPI documentation automatically.

### Why use Kontract instead of writing schemas manually?

Kontract eliminates duplication. Without it, you typically maintain:
- TypeScript interfaces for types
- Validation schemas (Zod, Joi, etc.)
- OpenAPI documentation

With Kontract, TypeBox schemas serve as the single source of truth for all three.

### Which frameworks does Kontract support?

Kontract has official adapters for:
- Hono
- Fastify
- Express.js
- AdonisJS v6

The core library is framework-agnostic, so you can create custom adapters for other frameworks.

### Is Kontract production-ready?

Yes, Kontract is designed for production use. Enable response validation only in development to catch contract violations without impacting production performance.

## TypeBox

### Why TypeBox instead of Zod?

TypeBox provides:
- JSON Schema compatibility (works with AJV, OpenAPI)
- Zero runtime overhead for type inference
- Smaller bundle size
- Direct schema reuse without conversion

Zod is excellent but requires schema conversion for OpenAPI generation.

### Can I use Zod schemas with Kontract?

Not directly. Kontract is designed around TypeBox and JSON Schema. You would need to convert Zod schemas to TypeBox or JSON Schema format.

### How do I define optional fields?

```typescript
import { Type } from '@sinclair/typebox'

const User = Type.Object({
  name: Type.String(),
  nickname: Type.Optional(Type.String()),
  age: Type.Optional(Type.Integer()),
})
```

### How do I define nullable fields?

```typescript
const User = Type.Object({
  deletedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
})
```

## Routes

### How do I define a route?

Use the method helpers (`get`, `post`, `put`, `patch`, `del`) from your adapter:

```typescript
import { get, post, defineController } from 'kontract-hono'

const getUser = get('/users/:id',
  async ({ params, reply }) => {
    const user = await findUser(params.id)
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

### How do handler types get inferred?

TypeScript infers the handler context from your schema definitions:

```typescript
const createUser = post('/users',
  async ({ body, reply }) => {
    // body is automatically typed as { name: string; email: string }
    return reply.created(await userService.create(body))
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

No manual type annotations or `Static<typeof Schema>` casts needed.

## Validation

### Why am I getting validation errors?

Common causes:
1. **Missing format validation** - Email, UUID, etc. require format validators
2. **Type mismatch** - Query params are strings by default, enable coercion
3. **Extra properties** - Enable `removeAdditional: true` to strip unknown fields

### How do I add custom format validators?

```typescript
import { createAjvValidator } from 'kontract-ajv'

const validator = createAjvValidator({
  formats: {
    'phone': /^\+?[1-9]\d{1,14}$/,
    'slug': (value) => /^[a-z0-9-]+$/.test(value),
  },
})
```

### How do I validate query parameters as numbers?

Enable type coercion (enabled by default):

```typescript
const validator = createAjvValidator({ coerceTypes: true })

// Schema
const Query = Type.Object({
  page: Type.Integer(),  // "1" → 1
  active: Type.Boolean(), // "true" → true
})
```

### Can I validate responses in production?

We recommend against it due to performance overhead. Enable response validation only in development:

```typescript
defineConfig({
  runtime: {
    validateResponses: process.env.NODE_ENV !== 'production',
  },
})
```

## OpenAPI

### How do I serve the OpenAPI spec?

```typescript
import { buildOpenApiSpec } from 'kontract-hono'
import { usersController } from './controllers/users.js'

const spec = buildOpenApiSpec({
  info: { title: 'My API', version: '1.0.0' },
  controllers: [usersController],
})

app.get('/docs/json', (c) => c.json(spec))
```

### How do I add authentication to the spec?

```typescript
const spec = buildOpenApiSpec({
  info: { title: 'API', version: '1.0.0' },
  controllers: [usersController],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  defaultSecurity: [{ bearerAuth: [] }],
})
```

### Why are my schemas inlined instead of referenced?

Add `$id` to your schemas:

```typescript
const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
}, { $id: 'User' })  // Required for references
```

### How do I add examples to the OpenAPI spec?

Add examples to your schemas:

```typescript
const User = Type.Object({
  id: Type.String({ examples: ['usr_123'] }),
  email: Type.String({ format: 'email', examples: ['john@example.com'] }),
}, {
  $id: 'User',
  examples: [{
    id: 'usr_123',
    email: 'john@example.com',
  }],
})
```

## Framework-Specific

### Fastify: Why don't I need kontract-ajv?

Fastify has built-in AJV validation. Schemas are compiled once at startup and used for both validation and response serialization (via `fast-json-stringify`).

### AdonisJS: How do I serialize Lucid models?

The adapter handles this automatically. Models with `toResponse()` or `serialize()` methods are serialized appropriately.

### Express: How do I add middleware to specific routes?

```typescript
const protectedRoute = post('/admin/action',
  async ({ body, reply }) => {
    // handler
  },
  {
    middleware: [rateLimit({ max: 5 })],
    body: ActionRequest,
    responses: { 200: { schema: Result } },
  }
)
```

### Hono: Does it work on Cloudflare Workers?

Yes! Hono is designed for edge runtimes:

```typescript
import { Hono } from 'hono'
import { registerController } from 'kontract-hono'
import { usersController } from './controllers/users.js'

const app = new Hono()
registerController(app, usersController)

export default app
```

## Troubleshooting

### "AJV schema already exists" error

This happens when the same schema with `$id` is registered twice. Use `stripNestedIds()`:

```typescript
import { stripNestedIds } from 'kontract-ajv'

const cleanedSchema = stripNestedIds(schema)
```

### Type inference not working

Ensure you're using TypeBox's `Static` type for standalone type definitions:

```typescript
import { Type, Static } from '@sinclair/typebox'

const User = Type.Object({ name: Type.String() })
type UserType = Static<typeof User>  // { name: string }
```

Note: Handler parameters are inferred automatically from route schemas.

### Routes not registering

1. Ensure controllers are exported and imported correctly
2. Verify the controller is passed to `registerController()`
3. Check that the path prefix is correct

### OpenAPI spec missing endpoints

Controllers must be passed to the spec builder:

```typescript
import { buildOpenApiSpec } from 'kontract-hono'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: { title: 'API', version: '1.0.0' },
  controllers: [usersController, postsController],
})
```
