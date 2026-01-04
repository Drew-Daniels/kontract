# kontract-ajv

AJV-based validation package for TypeBox schemas. Used by Express and Hono adapters.

## Installation

```bash
npm install kontract-ajv @sinclair/typebox
```

::: tip Not needed for Fastify
The Fastify adapter uses Fastify's built-in AJV validation, so you don't need this package.
:::

## Quick Start

```typescript
import { validate, createAjvValidator } from 'kontract-ajv'
import { Type } from '@sinclair/typebox'

const UserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 })),
})

// Simple validation (throws on error)
const user = validate(UserSchema, data)

// Custom validator
const validator = createAjvValidator({
  coerceTypes: true,
  removeAdditional: true,
})
```

## API Reference

### validate(schema, data)

Validates data against a TypeBox schema. Throws `AjvValidationError` on failure.

```typescript
import { validate } from 'kontract-ajv'

try {
  const validated = validate(UserSchema, input)
  // validated is typed as Static<typeof UserSchema>
} catch (error) {
  if (error instanceof AjvValidationError) {
    console.log(error.errors)
  }
}
```

**Parameters:**
- `schema` - TypeBox schema
- `data` - Data to validate

**Returns:** Validated and typed data

**Throws:** `AjvValidationError` if validation fails

### createAjvValidator(options?)

Creates a customized AJV validator instance.

```typescript
import { createAjvValidator } from 'kontract-ajv'

const validator = createAjvValidator({
  coerceTypes: true,
  removeAdditional: true,
  useDefaults: true,
  allErrors: true,
  formats: {
    'phone': /^\+?[1-9]\d{1,14}$/,
    'slug': /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `coerceTypes` | `boolean` | `true` | Convert strings to numbers/booleans |
| `removeAdditional` | `boolean` | `true` | Remove unknown properties |
| `useDefaults` | `boolean` | `true` | Apply default values |
| `allErrors` | `boolean` | `true` | Return all errors, not just first |
| `formats` | `Record<string, RegExp \| Function>` | `{}` | Custom format validators |
| `ajvOptions` | `AjvOptions` | `{}` | Additional AJV options |

### Validator Instance

The validator instance provides multiple methods:

```typescript
const validator = createAjvValidator()

// Validate and return result
const result = validator.validate(schema, data)
if (!result.valid) {
  console.log(result.errors)
}

// Validate or throw
const validated = validator.validateOrThrow(schema, data)

// Pre-compile for performance
const compiled = validator.compile(schema)
compiled.validate(data)     // Returns { valid, errors }
compiled.validateOrThrow(data)  // Throws on error
```

### getDefaultValidator()

Gets or creates the singleton validator instance:

```typescript
import { getDefaultValidator } from 'kontract-ajv'

const validator = getDefaultValidator()
```

### resetDefaultValidator()

Resets the default validator (useful for testing):

```typescript
import { resetDefaultValidator } from 'kontract-ajv'

beforeEach(() => {
  resetDefaultValidator()
})
```

### stripNestedIds(schema)

Removes `$id` from nested schemas to prevent AJV conflicts:

```typescript
import { stripNestedIds } from 'kontract-ajv'

const cleanedSchema = stripNestedIds(complexSchema)
```

## AjvValidationError

Error thrown when validation fails:

```typescript
import { AjvValidationError } from 'kontract-ajv'

try {
  validate(schema, data)
} catch (error) {
  if (error instanceof AjvValidationError) {
    error.status   // 422
    error.code     // 'E_VALIDATION_ERROR'
    error.message  // 'Validation failed'
    error.errors   // [{ field: 'email', message: 'must match format "email"' }]
  }
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `status` | `number` | HTTP status (422) |
| `code` | `string` | Error code |
| `message` | `string` | Error message |
| `errors` | `ValidationErrorDetail[]` | Field-level errors |

## Built-in Formats

AJV supports these formats by default:

| Format | Description | Example |
|--------|-------------|---------|
| `email` | Email address | `user@example.com` |
| `uri` | Full URI | `https://example.com/path` |
| `url` | URL | `https://example.com` |
| `uuid` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `date` | ISO 8601 date | `2024-01-15` |
| `time` | ISO 8601 time | `14:30:00` |
| `date-time` | ISO 8601 datetime | `2024-01-15T14:30:00Z` |
| `ipv4` | IPv4 address | `192.168.1.1` |
| `ipv6` | IPv6 address | `::1` |
| `hostname` | Hostname | `example.com` |
| `regex` | Valid regex | `^[a-z]+$` |

## Custom Formats

Add custom format validators:

```typescript
const validator = createAjvValidator({
  formats: {
    // RegExp format
    'phone': /^\+?[1-9]\d{1,14}$/,

    // Function format
    'slug': (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),

    // Async format (with compile: true)
    'unique-email': {
      async: true,
      validate: async (email: string) => {
        const exists = await checkEmailExists(email)
        return !exists
      },
    },
  },
})
```

Usage in schema:

```typescript
const Contact = Type.Object({
  phone: Type.String({ format: 'phone' }),
  slug: Type.String({ format: 'slug' }),
})
```

## Type Coercion

When `coerceTypes: true` (default), values are coerced:

| Target Type | Input | Output |
|-------------|-------|--------|
| `number` | `"123"` | `123` |
| `integer` | `"42"` | `42` |
| `boolean` | `"true"` | `true` |
| `boolean` | `"false"` | `false` |
| `boolean` | `"1"` | `true` |
| `boolean` | `"0"` | `false` |

This is especially useful for query parameters:

```typescript
const listUsers = get('/',
  async ({ query, reply }) => reply.ok(users),
  {
    query: Type.Object({
      page: Type.Integer({ minimum: 1 }),    // "1" → 1
      active: Type.Boolean(),                // "true" → true
    }),
    responses: { 200: { schema: Type.Array(User) } },
  }
)
```

## Remove Additional Properties

When `removeAdditional: true` (default), unknown properties are stripped:

```typescript
const schema = Type.Object({
  name: Type.String(),
})

const input = { name: 'John', extra: 'field' }
const validated = validate(schema, input)
// { name: 'John' } - 'extra' is removed
```

## Compiled Validators

For performance-critical paths, pre-compile validators:

```typescript
const validator = createAjvValidator()

// Compile once at startup
const validateUser = validator.compile(UserSchema)
const validatePost = validator.compile(PostSchema)

// Use in hot path
function handleRequest(data: unknown) {
  const user = validateUser.validateOrThrow(data)
  // ... use user
}
```

## Types

```typescript
import type {
  Validator,
  CompiledValidator,
  ValidatorOptions,
  ValidationErrorDetail,
  AjvValidatorOptions,
} from 'kontract-ajv'
```
