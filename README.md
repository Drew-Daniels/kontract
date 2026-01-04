# Kontract

Type-safe API contracts for Node.js with TypeBox schema support.

## Packages

| Package | Description |
|---------|-------------|
| [`kontract`](./packages/kontract) | Core framework |
| [`@kontract/ajv`](./packages/kontract-ajv) | AJV validation adapter |
| [`@kontract/client`](./packages/kontract-client) | Type-safe HTTP client |
| [`@kontract/adonis`](./packages/kontract-adonis) | AdonisJS adapter |
| [`@kontract/express`](./packages/kontract-express) | Express adapter |
| [`@kontract/fastify`](./packages/kontract-fastify) | Fastify adapter |
| [`@kontract/hono`](./packages/kontract-hono) | Hono adapter |

## Quick Start

```bash
npm install kontract @kontract/hono @sinclair/typebox
```

```typescript
import { Type } from '@sinclair/typebox'
import { get, defineController, registerController } from '@kontract/hono'
import { Hono } from 'hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

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

const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1' },
  { getUser }
)

const app = new Hono()
registerController(app, usersController)
```

## Documentation

Visit [kontract documentation](https://drew-daniels.github.io/kontract/) for full documentation.

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Run linter
npm run lint

# Start docs dev server
npm run docs:dev
```

## License

MIT
