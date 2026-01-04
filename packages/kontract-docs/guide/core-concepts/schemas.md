# Schemas

Kontract uses [TypeBox](https://github.com/sinclairzx81/typebox) for schema definitions. TypeBox provides a JSON Schema compatible type builder that generates TypeScript types automatically.

## Why TypeBox?

- **Single source of truth** - Schema defines both runtime validation and TypeScript types
- **JSON Schema compatible** - Works with standard validators like AJV
- **Zero dependencies** - Lightweight and fast
- **Excellent inference** - TypeScript types are inferred automatically

## Basic Types

```typescript
import { Type, Static } from '@sinclair/typebox'

// Primitives
const name = Type.String()
const age = Type.Number()
const isActive = Type.Boolean()

// With constraints
const email = Type.String({ format: 'email' })
const count = Type.Integer({ minimum: 0, maximum: 100 })
const uuid = Type.String({ format: 'uuid' })

// Optional and nullable
const nickname = Type.Optional(Type.String())
const deletedAt = Type.Union([Type.String({ format: 'date-time' }), Type.Null()])
```

## Objects

```typescript
const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 })),
  createdAt: Type.String({ format: 'date-time' }),
}, {
  $id: 'User',  // Required for OpenAPI references
  description: 'A user account',
})

// Get TypeScript type
type UserType = Static<typeof User>
// { id: string; name: string; email: string; age?: number; createdAt: string }
```

## Arrays

```typescript
const Tags = Type.Array(Type.String())

const UserList = Type.Array(User)

// With constraints
const Permissions = Type.Array(Type.String(), {
  minItems: 1,
  maxItems: 10,
  uniqueItems: true,
})
```

## Unions and Enums

```typescript
// String enum
const Status = Type.Union([
  Type.Literal('pending'),
  Type.Literal('active'),
  Type.Literal('inactive'),
])

// Or use StringEnum helper
const Role = Type.Union([
  Type.Literal('admin'),
  Type.Literal('user'),
  Type.Literal('guest'),
])

// Discriminated union
const Event = Type.Union([
  Type.Object({
    type: Type.Literal('created'),
    data: User,
  }),
  Type.Object({
    type: Type.Literal('deleted'),
    userId: Type.String(),
  }),
])
```

## Common Patterns

### Request Schemas

```typescript
// Path parameters
const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

// Query parameters with defaults
const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sort: Type.Optional(Type.String()),
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
})

// Request body
const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
}, { $id: 'CreateUserRequest' })

// Partial update
const UpdateUserRequest = Type.Partial(
  Type.Pick(CreateUserRequest, ['name', 'email'])
)
```

### Response Schemas

```typescript
// Success response
const UserResponse = Type.Object({
  data: User,
})

// List with pagination
const UserListResponse = Type.Object({
  data: Type.Array(User),
  meta: Type.Object({
    total: Type.Integer(),
    page: Type.Integer(),
    limit: Type.Integer(),
    totalPages: Type.Integer(),
  }),
})

// Error response (built-in ApiErrorBody is available)
import { ApiErrorBody } from 'kontract'
```

### Composition

```typescript
// Extend with Intersect
const AdminUser = Type.Intersect([
  User,
  Type.Object({
    permissions: Type.Array(Type.String()),
  }),
])

// Pick specific fields
const UserSummary = Type.Pick(User, ['id', 'name'])

// Omit fields
const CreateUser = Type.Omit(User, ['id', 'createdAt'])

// Make all fields optional
const PatchUser = Type.Partial(User)
```

## OpenAPI Metadata

Add descriptions and examples for better documentation:

```typescript
const Book = Type.Object({
  id: Type.String({
    description: 'Unique book identifier',
    examples: ['550e8400-e29b-41d4-a716-446655440000'],
  }),
  title: Type.String({
    description: 'Book title',
    examples: ['The Great Gatsby'],
    minLength: 1,
    maxLength: 200,
  }),
  isbn: Type.String({
    description: 'ISBN-13 identifier',
    pattern: '^978-\\d{10}$',
    examples: ['978-0743273565'],
  }),
  publishedAt: Type.String({
    format: 'date',
    description: 'Publication date in ISO format',
    examples: ['1925-04-10'],
  }),
}, {
  $id: 'Book',
  description: 'A book in the catalog',
  examples: [{
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'The Great Gatsby',
    isbn: '978-0743273565',
    publishedAt: '1925-04-10',
  }],
})
```

## Type Inference

TypeBox infers TypeScript types automatically:

```typescript
import { Type, Static } from '@sinclair/typebox'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.Optional(Type.String()),
})

// Infer the type
type User = Static<typeof User>
// Equivalent to:
// { id: string; name: string; email?: string }

// Use in functions
function createUser(data: Static<typeof CreateUserRequest>): User {
  return { id: generateId(), ...data }
}
```

## Best Practices

1. **Always set `$id`** on schemas used in responses for proper OpenAPI references
2. **Add descriptions** for better documentation
3. **Use format validators** like `email`, `uuid`, `date-time` for built-in validation
4. **Prefer composition** (`Pick`, `Omit`, `Partial`) over duplication
5. **Keep schemas in separate files** for reusability
6. **Export both schema and type** using `Static<typeof Schema>`
