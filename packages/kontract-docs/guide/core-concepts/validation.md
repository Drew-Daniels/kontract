# Validation

Kontract validates requests automatically using your TypeBox schemas. You can also optionally validate responses during development to catch contract violations early.

## Request Validation

When you define schemas for `params`, `query`, or `body`, incoming requests are validated automatically before your handler runs.

```typescript
import { Type } from '@sinclair/typebox'
import { post, defineController } from 'kontract-hono'

const createUser = post('/',
  async ({ body, reply }) => {
    // body is already validated and typed
    // If validation fails, a 422 response is returned automatically
    return reply.created(body)
  },
  {
    body: Type.Object({
      name: Type.String({ minLength: 1 }),
      email: Type.String({ format: 'email' }),
      age: Type.Integer({ minimum: 0 }),
    }),
    responses: { 201: { schema: User } },
  }
)
```

### Validation Behavior

| Schema | Validates | Source |
|--------|-----------|--------|
| `params` | Path parameters | URL path (`:id`) |
| `query` | Query string | URL query (`?page=1`) |
| `body` | Request body | JSON body |

### Automatic Type Coercion

Query parameters and path parameters are coerced to their declared types:

```typescript
const listUsers = get('/',
  async ({ query, reply }) => {
    // query.page is a number, not a string
    // query.active is a boolean, not a string
    return reply.ok(users)
  },
  {
    query: Type.Object({
      page: Type.Integer({ minimum: 1 }),      // "1" → 1
      active: Type.Boolean(),                  // "true" → true
      limit: Type.Optional(Type.Integer()),    // "20" → 20
    }),
    responses: { 200: { schema: Type.Array(User) } },
  }
)
```

### Validation Error Response

When validation fails, a 422 response is returned:

```json
{
  "status": 422,
  "code": "E_VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "must match format \"email\"" },
    { "field": "age", "message": "must be >= 0" }
  ]
}
```

## Validation Package

Request validation is handled by `kontract-ajv`:

```bash
npm install kontract-ajv
```

### Creating a Validator

```typescript
import { createAjvValidator } from 'kontract-ajv'

const validator = createAjvValidator({
  coerceTypes: true,      // Coerce strings to numbers/booleans
  removeAdditional: true, // Strip unknown properties
  allErrors: true,        // Return all errors, not just first
})

// Validate data
const result = validator.validate(schema, data)
if (!result.valid) {
  console.log(result.errors)
}
```

### Configuration Options

```typescript
interface AjvValidatorOptions {
  coerceTypes?: boolean       // Coerce types (default: true for query/params)
  removeAdditional?: boolean  // Remove extra properties (default: true)
  allErrors?: boolean         // Return all errors (default: true)
  formats?: Record<string, FormatDefinition>  // Custom formats
}
```

### Custom Formats

Add custom format validators:

```typescript
const validator = createAjvValidator({
  formats: {
    'phone': /^\+?[1-9]\d{1,14}$/,
    'slug': /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
})

// Use in schema
const Contact = Type.Object({
  phone: Type.String({ format: 'phone' }),
})
```

## Response Validation

Optional response validation catches contract violations during development. Enable it to ensure your handlers return data matching their declared schemas.

### Enabling Response Validation

::: code-group

```typescript [Hono]
import { registerController } from 'kontract-hono'

registerController(app, usersController, {
  validateResponses: process.env.NODE_ENV === 'development',
})
```

```typescript [Fastify]
import { registerController } from 'kontract-fastify'

// Fastify has built-in response validation via schema
registerController(app, usersController)
```

```typescript [Express]
import { registerController } from 'kontract-express'

registerController(app, usersController, {
  validateResponses: process.env.NODE_ENV === 'development',
})
```

:::

### Response Validation Error

When response validation fails, a `ResponseValidationError` is thrown:

```typescript
import { ResponseValidationError } from 'kontract'

try {
  // Handler returns invalid data
} catch (error) {
  if (error instanceof ResponseValidationError) {
    error.status     // 500
    error.code       // 'E_RESPONSE_VALIDATION'
    error.errors     // [{ field: 'email', message: '...' }]
    error.schema     // The expected schema
    error.data       // The actual response data
    error.endpoint   // Which endpoint failed
  }
}
```

::: warning
Response validation adds overhead. Only enable it in development/testing environments, not production.
:::

## Request Validation Error

Handle validation errors programmatically:

```typescript
import { RequestValidationError } from 'kontract'

try {
  validate(schema, data)
} catch (error) {
  if (error instanceof RequestValidationError) {
    error.status   // 422
    error.code     // 'E_VALIDATION_ERROR'
    error.errors   // [{ field: 'email', message: '...' }]
    error.source   // 'body' | 'query' | 'params'
    error.schema   // The TypeBox schema
    error.data     // The invalid data

    // Get response-ready format
    const response = error.toResponse()
  }
}
```

## Manual Validation

You can validate data manually:

```typescript
import { validate } from 'kontract-ajv'

const result = validate(UserSchema, data)

if (!result.valid) {
  return reply.validationError(result.errors.map(e => ({
    field: e.instancePath.slice(1) || e.params?.missingProperty,
    message: e.message,
  })))
}

// data is valid and typed
```

## Validation with Fastify

Fastify has a unique advantage: it uses the same AJV-based validation but compiles schemas at startup for better performance:

```typescript
import { registerController } from 'kontract-fastify'

// No validate function needed - Fastify handles it natively
registerController(app, usersController)
```

Benefits:
- Schemas compiled once at startup, not per-request
- Native type coercion
- 2x faster response serialization with `fast-json-stringify`

## Validation Best Practices

1. **Use appropriate constraints** - `minLength`, `minimum`, `format`, etc.
2. **Set defaults for optional fields** - Especially in query parameters
3. **Use `removeAdditional: true`** - Prevent unexpected properties
4. **Enable response validation in development** - Catch mismatches early
5. **Keep validation logic in schemas** - Don't duplicate in handlers
6. **Use custom formats sparingly** - Prefer built-in formats when possible

## Built-in Formats

AJV supports these formats out of the box:

| Format | Description |
|--------|-------------|
| `email` | Email address |
| `uri` | Full URI |
| `url` | URL |
| `uuid` | UUID v4 |
| `date` | ISO 8601 date (`2024-01-15`) |
| `time` | ISO 8601 time (`14:30:00`) |
| `date-time` | ISO 8601 datetime |
| `ipv4` | IPv4 address |
| `ipv6` | IPv6 address |
| `hostname` | Hostname |
| `regex` | Valid regex pattern |
