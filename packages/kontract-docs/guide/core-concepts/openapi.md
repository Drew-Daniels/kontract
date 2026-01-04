# OpenAPI Generation

Kontract automatically generates OpenAPI specifications from your controllers. No manual spec writing required.

## Basic Usage

```typescript
import { buildOpenApiSpec } from 'kontract-hono'
import { usersController, postsController } from './controllers/index.js'

const spec = buildOpenApiSpec({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },
  controllers: [usersController, postsController],
})
```

## Serving the Spec

### As JSON Endpoint

::: code-group

```typescript [Hono]
app.get('/docs/json', (c) => c.json(spec))
```

```typescript [Fastify]
app.get('/docs/json', () => spec)
```

```typescript [Express]
app.get('/docs/json', (req, res) => res.json(spec))
```

```typescript [AdonisJS]
router.get('/docs/json', async () => spec)
```

:::

### With Scalar UI

[Scalar](https://scalar.com) provides a modern API documentation UI:

```typescript
// Express
import { apiReference } from '@scalar/express-api-reference'

app.use('/docs', apiReference({
  spec: { url: '/docs/json' },
  theme: 'purple',
}))
```

### With Swagger UI

```typescript
import swaggerUi from 'swagger-ui-express'

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))
```

## Configuration Options

```typescript
const spec = buildOpenApiSpec({
  // Required
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API for managing resources',
    termsOfService: 'https://example.com/terms',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
      url: 'https://example.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },

  // Controllers to include
  controllers: [usersController, postsController],

  // Optional: Server URLs
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'https://staging-api.example.com', description: 'Staging' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],

  // Optional: OpenAPI version
  version: '3.1.0',  // or '3.0.3'

  // Optional: Security schemes
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    },
  },
})
```

## OpenAPI Versions

Kontract supports both OpenAPI 3.0.3 and 3.1.0:

```typescript
// OpenAPI 3.1.0 (default)
const spec = buildOpenApiSpec({
  version: '3.1.0',
  info: { title: 'API', version: '1.0.0' },
  controllers: [usersController],
})

// OpenAPI 3.0.3 (for broader compatibility)
const spec = buildOpenApiSpec({
  version: '3.0.3',
  info: { title: 'API', version: '1.0.0' },
  controllers: [usersController],
})
```

### Differences

| Feature | 3.0.3 | 3.1.0 |
|---------|-------|-------|
| JSON Schema | Draft 4 | 2020-12 |
| `nullable` | `nullable: true` | `type: ['string', 'null']` |
| `examples` | `example` only | `examples` array |
| `const` | Not supported | Supported |

## Schema References

Schemas with `$id` are referenced in the spec:

```typescript
// Define schema with $id
const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
}, { $id: 'User' })

// In OpenAPI spec:
// components.schemas.User referenced as $ref: '#/components/schemas/User'
```

Without `$id`, schemas are inlined.

## Adding Metadata

Enhance your documentation with descriptions and examples:

### Controller Level

```typescript
export const usersController = defineController(
  {
    tag: 'Users',
    description: 'Endpoints for managing user accounts',
    prefix: '/api/users',
  },
  { listUsers, getUser, createUser }
)
```

### Route Level

```typescript
const getUser = get('/:id',
  async ({ params, reply }) => { /* ... */ },
  {
    summary: 'Get a user by ID',
    description: 'Retrieves a single user by their unique identifier. Returns 404 if not found.',
    operationId: 'getUserById',
    deprecated: false,
    params: Type.Object({ id: Type.String() }),
    responses: { 200: { schema: User }, 404: null },
  }
)
```

### Schema Level

```typescript
const User = Type.Object({
  id: Type.String({
    description: 'Unique user identifier',
    examples: ['usr_abc123'],
  }),
  email: Type.String({
    format: 'email',
    description: 'User email address',
    examples: ['john@example.com'],
  }),
}, {
  $id: 'User',
  description: 'A user account',
})
```

### Response Level

```typescript
responses: {
  200: {
    schema: User,
    description: 'The requested user',
    examples: {
      basic: {
        summary: 'Basic user',
        value: { id: 'usr_123', email: 'john@example.com' },
      },
      admin: {
        summary: 'Admin user',
        value: { id: 'usr_456', email: 'admin@example.com', role: 'admin' },
      },
    },
  },
  404: {
    schema: null,
    description: 'User not found',
  },
}
```

## Operation IDs

Operation IDs are auto-generated from the route variable name:

| Variable Name | Operation ID |
|---------------|--------------|
| `listUsers` | `listUsers` |
| `getUser` | `getUser` |
| `createUser` | `createUser` |
| `updateUser` | `updateUser` |
| `deleteUser` | `deleteUser` |

Override with explicit `operationId`:

```typescript
const getCurrentUser = get('/me',
  async ({ user, reply }) => reply.ok(user),
  {
    operationId: 'getCurrentUser',
    auth: 'required',
    responses: { 200: { schema: User } },
  }
)
```

## Security

### Authentication Schemes

```typescript
const spec = buildOpenApiSpec({
  info: { title: 'API', version: '1.0.0' },
  controllers: [usersController],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT token from /auth/login',
    },
  },
})
```

### Per-Route Security

Routes with `auth: 'required'` get security applied. Routes without auth are marked as public:

```typescript
// Public endpoint - no security in spec
const listBooks = get('/',
  async ({ reply }) => reply.ok(books),
  { responses: { 200: { schema: Type.Array(Book) } } }
)

// Protected endpoint - security applied
const createBook = post('/',
  async ({ body, reply }) => reply.created(book),
  {
    auth: 'required',
    body: CreateBook,
    responses: { 201: { schema: Book } },
  }
)
```

## File Uploads

File uploads are documented automatically:

```typescript
const uploadAvatar = post('/:id/avatar',
  async ({ params, file, reply }) => { /* ... */ },
  {
    params: Type.Object({ id: Type.String() }),
    file: {
      fieldName: 'avatar',
      description: 'User avatar image',
      allowedExtensions: ['jpg', 'png', 'webp'],
      maxSize: '5MB',
    },
    responses: { 200: { schema: User } },
  }
)
```

Generates:

```yaml
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          avatar:
            type: string
            format: binary
            description: User avatar image
```

## Exporting the Spec

### To File

```typescript
import { writeFileSync } from 'node:fs'

writeFileSync('openapi.json', JSON.stringify(spec, null, 2))
```

### CLI Generation

```bash
# AdonisJS
node ace generate:openapi

# Custom script
node scripts/generate-openapi.js
```

## Validation

Validate your generated spec:

```bash
# Using swagger-cli
npx swagger-cli validate openapi.json

# Using vacuum
npx @quobix/vacuum lint openapi.json
```

## Complete Example

```typescript
import { Hono } from 'hono'
import { Type } from '@sinclair/typebox'
import {
  get,
  post,
  defineController,
  registerController,
  buildOpenApiSpec,
} from 'kontract-hono'

// Schemas
const Book = Type.Object({
  id: Type.String({ description: 'Book ID' }),
  title: Type.String({ description: 'Book title' }),
  author: Type.String({ description: 'Author name' }),
}, { $id: 'Book', description: 'A book in the catalog' })

// Controller with inline routes
export const booksController = defineController(
  { tag: 'Books', description: 'Book catalog', prefix: '/api/books' },
  {
    listBooks: get('/',
      async ({ reply }) => reply.ok(await bookService.findAll()),
      {
        summary: 'List all books',
        responses: { 200: { schema: Type.Array(Book) } },
      }
    ),

    getBook: get('/:id',
      async ({ params, reply }) => {
        const book = await bookService.find(params.id)
        if (!book) return reply.notFound()
        return reply.ok(book)
      },
      {
        summary: 'Get book by ID',
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: Book }, 404: null },
      }
    ),
  }
)

// App setup
const app = new Hono()
registerController(app, booksController)

// Generate spec
const spec = buildOpenApiSpec({
  info: {
    title: 'Bookstore API',
    version: '2.0.0',
    description: 'API for managing a bookstore catalog',
    contact: { name: 'API Team', email: 'api@bookstore.com' },
  },
  controllers: [booksController],
  servers: [
    { url: 'https://api.bookstore.com/v2', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local' },
  ],
  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
})

// Serve spec
app.get('/docs/json', (c) => c.json(spec))
```
