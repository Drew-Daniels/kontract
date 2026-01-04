<p align="center">
  <img src="packages/kontract-docs/public/logo.svg" alt="Kontract Logo" width="200">
</p>

<h1 align="center">Kontract</h1>

<p align="center">Type-safe API contracts for Node.js with TypeBox schema support.</p>

## Packages

| Package | Description |
|---------|-------------|
| [`kontract`](./packages/kontract) | Core framework |
| [`@kontract/ajv`](./packages/kontract-ajv) | AJV validation adapter |
| [`@kontract/adonis`](./packages/kontract-adonis) | AdonisJS adapter |
| [`@kontract/express`](./packages/kontract-express) | Express adapter |
| [`@kontract/fastify`](./packages/kontract-fastify) | Fastify adapter |
| [`@kontract/hono`](./packages/kontract-hono) | Hono adapter |

## Quick Start

```bash
npm install kontract @kontract/express @sinclair/typebox
```

```typescript
import express from 'express'
import {
  Type,
  get,
  defineController,
  registerController,
  createErrorHandler,
} from '@kontract/express'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

const usersController = defineController({ tag: 'Users', prefix: '/api/v1' }, {
  // Path params are automatically inferred from the route path
  // params.id is typed as string without explicit schema
  getUser: get('/users/:id',
    async ({ params, reply, error }) => {
      const user = await findUser(params.id)
      if (!user) return error.notFound()
      return reply.ok(user)
    },
    { responses: { 200: { schema: User }, 404: null } },
  ),
})

const app = express()
app.use(express.json())
registerController(app, usersController)
app.use(createErrorHandler())
app.listen(3000)
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
