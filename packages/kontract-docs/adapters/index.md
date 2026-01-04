# Framework Adapters

Kontract's core library is framework-agnostic. Adapters bridge the gap between your route definitions and your chosen HTTP framework.

## Available Adapters

| Adapter | Framework | Validation | Best For |
|---------|-----------|------------|----------|
| [@kontract/express](/adapters/express) | Express.js | @kontract/ajv (included) | Existing Express projects, maximum ecosystem |
| [@kontract/fastify](/adapters/fastify) | Fastify | Native TypeBox | Maximum performance |
| [@kontract/hono](/adapters/hono) | Hono | @kontract/ajv (included) | Edge runtimes, serverless |
| [@kontract/adonis](/adapters/adonis) | AdonisJS v6 | @kontract/ajv (included) | Full-stack Node.js apps with Lucid ORM |

## Choosing an Adapter

### Express

Most popular and flexible option:
- Largest ecosystem of middleware
- Easy migration from existing routes
- Works with any Express middleware

```bash
npm install @kontract/express @sinclair/typebox express
```

### Fastify

Best performance due to native features:
- Schemas compiled once at startup (not per-request)
- fast-json-stringify for 2x faster responses
- Native TypeBox validation (no @kontract/ajv needed)

```bash
npm install @kontract/fastify @sinclair/typebox fastify
```

### Hono

Lightweight and edge-ready:
- Works on Cloudflare Workers, Deno, Bun
- Small bundle size
- Modern API design

```bash
npm install @kontract/hono @sinclair/typebox hono
```

### AdonisJS

Best for full-stack Node.js applications:
- Automatic Lucid model serialization
- Integrated authentication via AdonisJS auth
- Dependency injection support

```bash
npm install @kontract/adonis @sinclair/typebox
```

## Common Patterns

All adapters export route helpers and share similar registration patterns:

### Defining Routes

```typescript
import { get, post, defineController } from '@kontract/express'

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

### Registering Controllers

```typescript
import { registerController, registerControllers } from '@kontract/express'
import { usersController, postsController } from './controllers/index.js'

registerController(app, usersController)
// or
registerControllers(app, [usersController, postsController])
```

## Validation Comparison

| Feature | Express | Fastify | Hono | AdonisJS |
|---------|---------|---------|------|----------|
| Validation package | @kontract/ajv (included) | Native | @kontract/ajv (included) | @kontract/ajv (included) |
| Type coercion | Yes | Yes | Yes | Yes |
| Response serialization | JSON.stringify | fast-json-stringify | JSON.stringify | JSON.stringify |

## Authentication

All adapters support the `auth` option in route definitions:

```typescript
const createUser = post('/users',
  async ({ body, user, reply }) => {
    // user is available when auth: 'required' or 'optional'
    return reply.created(await userService.create(body))
  },
  {
    auth: 'required',  // Must be authenticated
    // auth: 'optional', // Auth checked but not required
    // auth: 'none',     // Public endpoint (default)
    body: CreateUserRequest,
    responses: { 201: { schema: User } },
  }
)
```

Configure the authentication check when registering:

```typescript
// Express/Hono
registerController(app, usersController, {
  authenticate: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    return verifyToken(token) // Return user or throw
  },
})

// Fastify
registerController(app, usersController, {
  authenticate: async (req) => {
    return verifyToken(req.headers.authorization)
  },
})

// AdonisJS - uses built-in auth system
registerController(router, usersController)
```

## OpenAPI Generation

All adapters provide a way to build the OpenAPI spec from controllers:

```typescript
import { buildOpenApiSpec } from '@kontract/express'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  controllers: [usersController, postsController],
})
```

## Next Steps

Choose your adapter and follow the detailed guide:

- [Express Adapter](/adapters/express) - Middleware setup
- [Fastify Adapter](/adapters/fastify) - Performance optimizations
- [Hono Adapter](/adapters/hono) - Edge deployment
- [AdonisJS Adapter](/adapters/adonis) - Full integration guide
