# Migration Guide

This guide covers migrating from other API documentation and validation approaches to Kontract.

## From Manual OpenAPI

If you're maintaining OpenAPI specs manually alongside your code:

### Before

```yaml
# openapi.yaml
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

```typescript
// controller.ts
app.get('/users/:id', async (req, res) => {
  const user = await findUser(req.params.id)
  res.json(user)
})
```

### After

```typescript
import { Type } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
}, { $id: 'User' })

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        return reply.ok(user)
      },
      {
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

Benefits:
- Schema and route in one place
- Automatic type inference
- Validation included
- OpenAPI generated automatically

## From Express Validator

### Before

```typescript
import { body, param, validationResult } from 'express-validator'

app.post('/users',
  body('email').isEmail(),
  body('name').isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    const user = await createUser(req.body)
    res.status(201).json(user)
  }
)
```

### After

```typescript
import { Type } from '@sinclair/typebox'
import { post, defineController } from '@kontract/express'

const CreateUser = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1 }),
})

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    createUser: post('/',
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      },
      {
        body: CreateUser,
        responses: { 201: { schema: User }, 422: null },
      }
    ),
  }
)
```

## From Zod

### Before

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>

app.get('/users/:id', async (req, res) => {
  const user = await findUser(req.params.id)
  const validated = UserSchema.parse(user)
  res.json(validated)
})
```

### After

```typescript
import { Type, Static } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

type UserType = Static<typeof User>

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        return reply.ok(user)
      },
      {
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

### Type Mapping

| Zod | TypeBox |
|-----|---------|
| `z.string()` | `Type.String()` |
| `z.number()` | `Type.Number()` |
| `z.boolean()` | `Type.Boolean()` |
| `z.array(z.string())` | `Type.Array(Type.String())` |
| `z.object({})` | `Type.Object({})` |
| `z.optional()` | `Type.Optional()` |
| `z.nullable()` | `Type.Union([T, Type.Null()])` |
| `z.enum(['a', 'b'])` | `Type.Union([Type.Literal('a'), Type.Literal('b')])` |
| `z.string().email()` | `Type.String({ format: 'email' })` |
| `z.string().min(1)` | `Type.String({ minLength: 1 })` |
| `z.number().min(0)` | `Type.Number({ minimum: 0 })` |
| `z.infer<typeof S>` | `Static<typeof S>` |

## From NestJS

If you're familiar with NestJS, Kontract's approach will feel similar but more concise:

### NestJS

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  @ApiOperation({ summary: 'Get user' })
  @ApiResponse({ status: 200, type: UserDto })
  async findOne(@Param('id') id: string): Promise<UserDto> {
    return this.usersService.findOne(id)
  }
}
```

### Kontract

```typescript
import { Type } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await usersService.findOne(params.id)
        return reply.ok(user)
      },
      {
        summary: 'Get user',
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

Key differences:
- Single route definition combines routing and documentation
- TypeBox schemas replace DTOs
- Reply helpers (`reply.ok`, `reply.created`) for responses
- Validation is automatic

## From Fastify Schema

### Before

```typescript
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 1 },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  const user = await createUser(request.body)
  reply.status(201).send(user)
})
```

### After

```typescript
import { Type } from '@sinclair/typebox'
import { post, defineController } from '@kontract/fastify'

const CreateUser = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1 }),
})

const User = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
}, { $id: 'User' })

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    createUser: post('/',
      async ({ body, reply }) => {
        const user = await userService.create(body)
        return reply.created(user)
      },
      {
        body: CreateUser,
        responses: { 201: { schema: User } },
      }
    ),
  }
)
```

Benefits with Kontract:
- TypeBox is more concise than raw JSON Schema
- Full TypeScript inference
- Automatic OpenAPI generation
- Same validation performance (Fastify adapter uses native validation)

## Incremental Migration

You don't need to migrate everything at once. Kontract routes can coexist with existing routes:

```typescript
// Existing route (keep working)
app.get('/legacy/users', legacyHandler)

// New Kontract routes
export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v2/users' },
  {
    listUsers: get('/',
      async ({ reply }) => reply.ok(await userService.findAll()),
      { responses: { 200: { schema: Type.Array(User) } } }
    ),
  }
)

// Register Kontract controller
registerController(app, usersController)
```

Migrate gradually by:
1. Adding Kontract to new endpoints
2. Migrating high-traffic endpoints first
3. Converting legacy endpoints over time
4. Deprecating old endpoints with proper versioning
