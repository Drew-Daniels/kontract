# @kontract/adonis

AdonisJS adapter for [kontract](../kontract). Provides route registration, AJV validation, Lucid ORM serializers, and OpenAPI spec generation for AdonisJS v6.

## Features

- **Automatic route registration** - Register decorated endpoints with AdonisJS router
- **AJV validation** - TypeBox schema validation with type coercion and format support
- **Lucid serializers** - Automatic serialization of Lucid models and paginators
- **OpenAPI generation** - Build OpenAPI 3.0/3.1 specs from decorators
- **Full TypeBox support** - Validate requests against TypeBox schemas

## Installation

```bash
npm install @kontract/adonis @sinclair/typebox ajv ajv-formats
```

> **Note:** This package depends on `kontract` (the core library), which will be installed automatically. You can import from either package - the adapter re-exports all commonly used items from the core.

## Quick Start

### 1. Define Your Controller

```typescript
// app/controllers/books_controller.ts
import { Api, Endpoint, ok, apiError } from '@kontract/adonis'
import { Type, Static } from '@sinclair/typebox'
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

@Api({ tag: 'Books', description: 'Book management' })
export default class BooksController {
  @Endpoint('GET /api/v1/books', {
    summary: 'List all books',
    responses: {
      200: { schema: Type.Array(BookSchema) },
    },
  })
  async index() {
    const books = await Book.all()
    return ok(Type.Array(BookSchema), books.map(b => b.toResponse()))
  }

  @Endpoint('POST /api/v1/books', {
    summary: 'Create a book',
    auth: 'required',
    body: CreateBookRequest,
    responses: {
      201: { schema: BookSchema },
      422: null,
    },
  })
  async store(
    ctx: HttpContext,
    body: Static<typeof CreateBookRequest>
  ) {
    const book = await Book.create(body)
    return ok(BookSchema, book.toResponse())
  }
}
```

### 2. Register Routes

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { registerDecoratorRoutes, validate } from '@kontract/adonis'

// Import controllers to trigger decorator registration
import '#controllers/books_controller'
import '#controllers/users_controller'

// Register all decorated routes
registerDecoratorRoutes(router, { validate })
```

### 3. Generate OpenAPI Spec

```typescript
// commands/generate_openapi.ts
import { OpenApiBuilder } from '@kontract/adonis'

// Import controllers
import '#controllers/books_controller'
import '#controllers/users_controller'

const builder = new OpenApiBuilder({
  title: 'My API',
  description: 'API documentation',
  version: '1.0.0',
  servers: [
    { url: 'http://localhost:3333', description: 'Development' },
  ],
})

const spec = builder.build()
console.log(JSON.stringify(spec, null, 2))
```

## Runtime Validation

The packages support runtime validation for both **requests** and **responses**.

### Request Validation (Automatic)

Request validation happens automatically when you use `registerDecoratorRoutes()`. The route registrar validates `body`, `query`, and `params` against the TypeBox schemas defined in your `@Endpoint` decorators.

```typescript
@Endpoint('POST /api/v1/books', {
  body: CreateBookRequest,    // Validated at runtime
  query: PaginationQuery,     // Validated at runtime
  params: BookIdParams,       // Validated at runtime
  responses: { 201: BookSchema },
})
async store(ctx, body, query, params) {
  // body, query, params are already validated and typed
}
```

If validation fails, an `AjvValidationError` is thrown with status 422.

### Response Validation (Optional)

Response validation catches contract violations during development. Enable it by calling `defineConfig()` at application startup:

```typescript
// start/kernel.ts or providers/app_provider.ts
import { defineConfig } from 'kontract'
import { createAjvValidator } from '@kontract/adonis'

const validator = createAjvValidator()

defineConfig({
  openapi: {
    info: { title: 'My API', version: '1.0.0' },
  },
  runtime: {
    validateResponses: process.env.NODE_ENV !== 'production',
  },
  validator: (schema, data) => validator.validate(schema, data),
})
```

When enabled, response helpers like `ok()`, `created()`, etc. will validate the response data against the schema and throw `ResponseValidationError` if it doesn't match.

```typescript
// This will throw in development if user doesn't match UserSchema
return ok(UserSchema, user)
```

## Route Registration

### registerDecoratorRoutes(router, options)

Registers all routes defined via `@Endpoint` decorators with the AdonisJS router.

```typescript
import router from '@adonisjs/core/services/router'
import { registerDecoratorRoutes, validate } from '@kontract/adonis'

registerDecoratorRoutes(router, {
  validate,  // AJV validation function
})
```

The registrar:
- Creates routes for each `@Endpoint` decorator
- Validates request body, query, and params against TypeBox schemas
- Handles authentication based on `auth` option
- Calls the controller method with validated data
- Processes API responses (status codes, JSON, binary)

### Controller Method Signature

Controller methods receive validated data as separate parameters:

```typescript
async store(
  ctx: HttpContext,        // AdonisJS context
  body: BodyType,          // Validated request body
  query: QueryType,        // Validated query parameters
  params: ParamsType       // Validated path parameters
) {
  // body, query, params are already validated
}
```

## Validation

### validate(schema, data)

Validates data against a TypeBox schema. Throws `AjvValidationError` on failure.

```typescript
import { validate } from '@kontract/adonis'
import { Type } from '@sinclair/typebox'

const schema = Type.Object({
  email: Type.String({ format: 'email' }),
  age: Type.Integer({ minimum: 0 }),
})

try {
  const data = validate(schema, { email: 'user@example.com', age: 25 })
  // data is typed and validated
} catch (error) {
  if (error instanceof AjvValidationError) {
    console.log(error.errors)
    // [{ field: 'email', message: 'must match format "email"' }]
  }
}
```

### createAjvValidator(options?)

Create a customized AJV validator instance.

```typescript
import { createAjvValidator } from '@kontract/adonis'

const validator = createAjvValidator({
  coerceTypes: true,       // Convert strings to numbers, etc.
  removeAdditional: true,  // Strip unknown properties
  useDefaults: true,       // Apply default values
  formats: {
    'custom-format': (value) => /^[A-Z]+$/.test(value),
  },
  ajvOptions: {
    // Additional AJV options
  },
})

// Validate (returns errors array)
const errors = validator.validate(schema, data)

// Validate or throw
validator.validateOrThrow(schema, data)

// Pre-compile for performance
const compiled = validator.compile(schema)
compiled.validate(data)
compiled.validateOrThrow(data)
```

### AjvValidationError

Error thrown when validation fails.

```typescript
import { AjvValidationError } from '@kontract/adonis'

try {
  validate(schema, data)
} catch (error) {
  if (error instanceof AjvValidationError) {
    error.status   // 422
    error.code     // 'E_VALIDATION_ERROR'
    error.errors   // [{ field: 'email', message: '...' }]
  }
}
```

## Serializers

Built-in serializers for Lucid models and paginators.

### Type Guards

```typescript
import {
  isLucidModel,    // Has serialize() method
  isTypedModel,    // Has toResponse() method
  isPaginator,     // Lucid paginator object
  hasSerialize,    // Generic serialize check
} from '@kontract/adonis'

if (isTypedModel(data)) {
  return data.toResponse()
}

if (isLucidModel(data)) {
  return data.serialize()
}

if (isPaginator(data)) {
  // { data: [...], meta: { total, perPage, currentPage, ... } }
}
```

### Serializer Registry

Serializers are ordered by priority (higher = checked first):

| Serializer | Priority | Checks |
|------------|----------|--------|
| `paginatorSerializer` | 150 | `isPaginator()` |
| `typedModelSerializer` | 100 | `isTypedModel()` |
| `lucidModelSerializer` | 50 | `isLucidModel()` |
| `serializableSerializer` | 25 | `hasSerialize()` |

```typescript
import { lucidSerializers } from '@kontract/adonis'

// All serializers in priority order
lucidSerializers
```

## OpenAPI Builder

### OpenApiBuilder

Generates OpenAPI specifications from decorated controllers.

```typescript
import { OpenApiBuilder } from '@kontract/adonis'

const builder = new OpenApiBuilder({
  title: 'My API',
  description: 'API documentation',
  version: '1.0.0',
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3333', description: 'Development' },
  ],
  openapiVersion: '3.1.0',  // or '3.0.3'
  securityScheme: {
    name: 'BearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT access token',
  },
})

const spec = builder.build()
```

### OpenApiBuilderOptions

```typescript
interface OpenApiBuilderOptions {
  title: string
  description: string
  version: string
  servers: Array<{ url: string; description: string }>
  openapiVersion?: '3.0.3' | '3.1.0'  // default: '3.1.0'
  securityScheme?: {
    name: string
    type: 'http' | 'apiKey' | 'oauth2'
    scheme?: string
    bearerFormat?: string
    description?: string
  }
}
```

### Generated Features

The builder automatically:

- **Collects tags** from `@Api` decorators
- **Converts paths** (`:id` to `{id}`)
- **Generates operationIds** from method names
- **Adds security** for `auth: 'required'` endpoints
- **Adds 401 response** for authenticated endpoints
- **Registers schemas** in components
- **Handles file uploads** as multipart/form-data

### OperationId Generation

For standard CRUD method names, operationIds are auto-generated:

| Method | Path | Generated operationId |
|--------|------|----------------------|
| `index` | GET /users | `listUsers` |
| `show` | GET /users/:id | `getUser` |
| `store` | POST /users | `createUser` |
| `update` | PUT /users/:id | `updateUser` |
| `destroy` | DELETE /users/:id | `deleteUser` |

Custom method names use the method name as operationId.

## Re-exports

For convenience, the adapter re-exports common items from the core package:

```typescript
import {
  // Decorators
  Api,
  Endpoint,

  // Response helpers
  ok,
  created,
  accepted,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable,
  binary,
  apiError,

  // Configuration
  defineConfig,
  getConfig,

  // Types
  type ApiOptions,
  type EndpointOptions,
  type ApiResponse,
  type BinaryResponse,
  type EndpointMetadata,
  type ApiMetadata,
} from '@kontract/adonis'
```

## Utilities

### stripNestedIds(schema)

Removes `$id` from nested schemas to prevent AJV conflicts when the same schema is used multiple times.

```typescript
import { stripNestedIds } from '@kontract/adonis'

const cleanedSchema = stripNestedIds(schema)
```

### getDefaultValidator()

Get or create the singleton AJV validator instance.

```typescript
import { getDefaultValidator } from '@kontract/adonis'

const validator = getDefaultValidator()
```

### resetDefaultValidator()

Reset the default validator (useful for testing).

```typescript
import { resetDefaultValidator } from '@kontract/adonis'

beforeEach(() => {
  resetDefaultValidator()
})
```

## Integration Example

Complete example with AdonisJS:

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { registerDecoratorRoutes, validate, OpenApiBuilder } from '@kontract/adonis'

// Import all controllers
const controllers = import.meta.glob('../app/controllers/**/*.ts', { eager: true })

// Register decorator-based routes
registerDecoratorRoutes(router, { validate })

// Serve OpenAPI spec
router.get('/docs/json', async ({ response }) => {
  const builder = new OpenApiBuilder({
    title: 'My API',
    description: 'API documentation',
    version: '1.0.0',
    servers: [{ url: 'http://localhost:3333', description: 'Development' }],
  })

  return response.json(builder.build())
})
```

## Peer Dependencies

- `@adonisjs/core` ^6.0.0
- `@sinclair/typebox` >=0.32.0
- `ajv` ^8.0.0 (optional, required for validation)
- `@adonisjs/lucid` ^21.0.0 (optional, required for Lucid serializers)

## License

MIT
