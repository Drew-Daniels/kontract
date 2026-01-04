# Framework Adapters

Kontract's core library is framework-agnostic. Adapters bridge the gap between your route definitions and your chosen HTTP framework.

## Available Adapters

| Adapter | Framework | Validation | Best For |
|---------|-----------|------------|----------|
| [kontract-hono](/adapters/hono) | Hono | kontract-ajv | Edge runtimes, serverless |
| [kontract-fastify](/adapters/fastify) | Fastify | Native (no extra package) | Maximum performance |
| [kontract-express](/adapters/express) | Express.js | kontract-ajv | Existing Express projects, maximum flexibility |
| [kontract-adonis](/adapters/adonis) | AdonisJS v6 | Built-in AJV | Full-stack Node.js apps with Lucid ORM |

## Choosing an Adapter

### Hono

Lightweight and edge-ready:
- Works on Cloudflare Workers, Deno, Bun
- Small bundle size
- Elysia-style API

```bash
npm install kontract kontract-hono kontract-ajv @sinclair/typebox
```

### Fastify

Best performance due to native features:
- Schemas compiled once at startup (not per-request)
- fast-json-stringify for 2x faster responses
- No separate validation package needed

```bash
npm install kontract kontract-fastify @sinclair/typebox
```

### Express

Most flexible option for existing projects:
- Works with any Express middleware
- Manual validation control
- Easy migration from existing routes

```bash
npm install kontract kontract-express kontract-ajv @sinclair/typebox
```

### AdonisJS

Best for full-stack Node.js applications. Includes:
- Automatic Lucid model serialization
- Integrated authentication via AdonisJS auth
- Dependency injection support

```bash
npm install kontract-adonis @sinclair/typebox
```

## Common Patterns

All adapters export route helpers and share similar registration patterns:

### Defining Routes

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

### Registering Controllers

```typescript
import { registerController, registerControllers } from 'kontract-hono'
import { usersController, postsController } from './controllers/index.js'

registerController(app, usersController)
// or
registerControllers(app, [usersController, postsController])
```

## Validation Comparison

| Feature | Hono | Fastify | Express | AdonisJS |
|---------|------|---------|---------|----------|
| Validation package | kontract-ajv | Native | kontract-ajv | Built-in |
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
// Hono/Express
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
import { buildOpenApiSpec } from 'kontract-hono'
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

- [Hono Adapter](/adapters/hono) - Edge deployment
- [Fastify Adapter](/adapters/fastify) - Performance optimizations
- [Express Adapter](/adapters/express) - Middleware setup
- [AdonisJS Adapter](/adapters/adonis) - Full integration guide
