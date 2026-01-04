# Examples

This section provides practical examples for common API patterns using Kontract.

## Available Examples

| Example | Description |
|---------|-------------|
| [Basic CRUD](/examples/basic-crud) | Standard create, read, update, delete operations |
| [File Uploads](/examples/file-uploads) | Handling file uploads with validation |
| [Authentication](/examples/authentication) | JWT authentication patterns |
| [Error Handling](/examples/error-handling) | Custom error responses and validation |

## Example Structure

Each example includes:
- Complete schema definitions
- Controller implementation using short method helpers
- Registration code
- Sample requests and responses

## Running the Examples

All examples use the same basic setup. Adapt to your framework:

::: code-group

```typescript [Hono]
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { registerController, createErrorHandler } from '@kontract/hono'
import { usersController } from './controllers/users.js'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, usersController, {
  authenticate: async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    return verifyToken(token)
  },
})

serve({ fetch: app.fetch, port: 3000 })
```

```typescript [Fastify]
import Fastify from 'fastify'
import { registerController, registerErrorHandler } from '@kontract/fastify'
import { usersController } from './controllers/users.js'

const app = Fastify()

registerErrorHandler(app)

registerController(app, usersController, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    return verifyToken(token)
  },
})

app.listen({ port: 3000 })
```

```typescript [Express]
import express from 'express'
import { registerController, createErrorHandler } from '@kontract/express'
import { usersController } from './controllers/users.js'

const app = express()
app.use(express.json())

registerController(app, usersController, {
  authenticate: async (req) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    return verifyToken(token)
  },
})

app.use(createErrorHandler())
app.listen(3000)
```

:::
