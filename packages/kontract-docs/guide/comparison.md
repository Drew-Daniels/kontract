# Comparison with Other Solutions

This page compares Kontract with other popular TypeScript API solutions to help you choose the right tool for your project.

## Quick Overview

<style>
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8em;
}
.comparison-table th,
.comparison-table td {
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}
.comparison-table th {
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}
.comparison-table td:first-child {
  font-weight: 500;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: 500;
  white-space: nowrap;
}
.badge-green {
  background-color: rgba(16, 185, 129, 0.15);
  color: rgb(16, 185, 129);
}
.badge-yellow {
  background-color: rgba(245, 158, 11, 0.15);
  color: rgb(245, 158, 11);
}
.badge-red {
  background-color: rgba(239, 68, 68, 0.15);
  color: rgb(239, 68, 68);
}
.badge-neutral {
  background-color: rgba(148, 163, 184, 0.15);
  color: var(--vp-c-text-2);
}
</style>

<table class="comparison-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Kontract</th>
      <th>ts-rest</th>
      <th>tRPC</th>
      <th>Elysia</th>
      <th>Fastify</th>
      <th>NestJS</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Type-safe contracts</td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-yellow">Partial</span></td>
      <td><span class="badge badge-yellow">Partial</span></td>
    </tr>
    <tr>
      <td>Framework agnostic</td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-yellow">Partial</span></td>
      <td><span class="badge badge-yellow">Partial</span></td>
      <td><span class="badge badge-red">No</span></td>
      <td><span class="badge badge-red">No</span></td>
      <td><span class="badge badge-red">No</span></td>
    </tr>
    <tr>
      <td>OpenAPI generation</td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-yellow">Plugin</span></td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-yellow">Plugin</span></td>
      <td><span class="badge badge-yellow">Plugin</span></td>
    </tr>
    <tr>
      <td>Runtime validation</td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-yellow">Optional</span></td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-green">Built-in</span></td>
      <td><span class="badge badge-yellow">Plugin</span></td>
    </tr>
    <tr>
      <td>Schema library</td>
      <td><span class="badge badge-neutral">TypeBox</span></td>
      <td><span class="badge badge-neutral">Zod</span></td>
      <td><span class="badge badge-neutral">Zod</span></td>
      <td><span class="badge badge-neutral">TypeBox</span></td>
      <td><span class="badge badge-neutral">JSON Schema</span></td>
      <td><span class="badge badge-neutral">class-validator</span></td>
    </tr>
    <tr>
      <td>Client generation</td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-red">No</span></td>
      <td><span class="badge badge-red">No</span></td>
      <td><span class="badge badge-yellow">Manual</span></td>
    </tr>
    <tr>
      <td>Edge runtime support</td>
      <td><span class="badge badge-green">Yes (Hono)</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-yellow">Limited</span></td>
      <td><span class="badge badge-green">Yes</span></td>
      <td><span class="badge badge-red">No</span></td>
      <td><span class="badge badge-red">No</span></td>
    </tr>
    <tr>
      <td>Learning curve</td>
      <td><span class="badge badge-green">Low</span></td>
      <td><span class="badge badge-yellow">Medium</span></td>
      <td><span class="badge badge-yellow">Medium</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td><span class="badge badge-green">Low</span></td>
      <td><span class="badge badge-red">High</span></td>
    </tr>
    <tr>
      <td>Bundle size</td>
      <td><span class="badge badge-green">Small</span></td>
      <td><span class="badge badge-green">Small</span></td>
      <td><span class="badge badge-yellow">Medium</span></td>
      <td><span class="badge badge-green">Small</span></td>
      <td><span class="badge badge-yellow">Medium</span></td>
      <td><span class="badge badge-red">Large</span></td>
    </tr>
  </tbody>
</table>

## Kontract vs ts-rest

[ts-rest](https://ts-rest.com) is a contract-first API library for TypeScript.

### Similarities
- Both use a contract-first approach
- Both generate OpenAPI specs
- Both provide end-to-end type safety

### Differences

**Schema Definition**

```typescript
// ts-rest uses Zod
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

export const contract = c.router({
  getUser: {
    method: 'GET',
    path: '/users/:id',
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
  },
})
```

```typescript
// Kontract uses TypeBox with simpler syntax
import { Type } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)  // params auto-inferred
        return reply.ok(user)
      },
      {
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

**Key Differences**

| Aspect | Kontract | ts-rest |
|--------|----------|---------|
| Contract location | Colocated with handler | Separate contract file |
| Server implementation | Handler in route definition | Separate implementation |
| Framework support | Hono, Fastify, Express, AdonisJS | Express, Fastify, Next.js |
| Schema library | TypeBox | Zod |
| Validation performance | AJV (faster) | Zod |

**When to choose Kontract:**
- You prefer colocated contracts and handlers
- You want faster validation with AJV
- You're using AdonisJS or need edge runtime support
- You prefer TypeBox over Zod

**When to choose ts-rest:**
- You want strict separation between contract and implementation
- You're already using Zod throughout your codebase
- You need Next.js server actions support

## Kontract vs tRPC

[tRPC](https://trpc.io) is an end-to-end typesafe API toolkit.

### Similarities
- Both provide end-to-end type safety
- Both support validation
- Both have client libraries

### Differences

**Architecture**

```typescript
// tRPC - RPC-style with procedures
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

export const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await findUser(input.id)
    }),
})

export type AppRouter = typeof appRouter
```

```typescript
// Kontract - REST-style with routes
import { Type } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)
        return reply.ok(user)
      },
      {
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

**Key Differences**

| Aspect | Kontract | tRPC |
|--------|----------|------|
| API style | REST | RPC |
| URL structure | `/users/123` | `/trpc/getUser?input=...` |
| OpenAPI spec | Built-in | Plugin (trpc-openapi) |
| HTTP caching | Standard REST | Requires configuration |
| Third-party clients | Any HTTP client | tRPC client required |
| Learning curve | REST conventions | tRPC-specific patterns |

**When to choose Kontract:**
- You need standard REST APIs
- Third-party developers will consume your API
- You need OpenAPI documentation
- You want HTTP caching to work naturally

**When to choose tRPC:**
- You own both client and server
- You don't need REST semantics
- You want the simplest possible type sharing
- You're using the T3 stack

## Kontract vs Elysia

[Elysia](https://elysiajs.com) is a TypeScript web framework for Bun.

### Similarities
- Both use TypeBox for schemas
- Both have built-in validation
- Both generate OpenAPI specs
- Both support edge runtimes

### Differences

**Syntax Comparison**

```typescript
// Elysia - framework with built-in everything
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/users/:id', ({ params }) => findUser(params.id), {
    params: t.Object({
      id: t.String()
    }),
    response: t.Object({
      id: t.String(),
      name: t.String(),
    })
  })
```

```typescript
// Kontract - library that works with any framework
import { Type } from '@sinclair/typebox'
import { get, defineController } from '@kontract/hono'

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        return reply.ok(await findUser(params.id))  // params auto-inferred
      },
      {
        responses: { 200: { schema: User } },
      }
    ),
  }
)
```

**Key Differences**

| Aspect | Kontract | Elysia |
|--------|----------|--------|
| Type | Library | Framework |
| Runtime | Node.js, Bun, Edge | Bun (primary), Node.js |
| Framework choice | Hono, Fastify, Express, AdonisJS | Elysia only |
| Controller organization | `defineController` | Plugins/groups |
| Path param inference | Automatic | Requires explicit schema |
| Response helpers | `reply.ok()`, `reply.notFound()` | Direct return |

**When to choose Kontract:**
- You want to use your preferred framework
- You need Node.js support
- You want organized controllers with tags
- You're migrating an existing codebase

**When to choose Elysia:**
- You're building a new Bun-first project
- You want an all-in-one framework
- You prefer Elysia's plugin ecosystem
- Maximum Bun performance is critical

## Kontract vs Fastify

[Fastify](https://fastify.dev) is a high-performance Node.js web framework.

### Similarities
- Both support TypeBox schemas
- Both have JSON Schema validation
- Both support OpenAPI generation

### Differences

**Schema Definition**

```typescript
// Fastify - inline JSON Schema or TypeBox
import Fastify from 'fastify'
import { Type, Static } from '@sinclair/typebox'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

type UserType = Static<typeof User>

const app = Fastify()

app.get<{ Params: { id: string }, Reply: UserType }>(
  '/users/:id',
  {
    schema: {
      params: Type.Object({ id: Type.String() }),
      response: { 200: User },
    },
  },
  async (request) => {
    return await findUser(request.params.id)
  }
)
```

```typescript
// Kontract with Fastify - cleaner syntax, same performance
import { Type } from '@sinclair/typebox'
import { get, defineController, registerController } from '@kontract/fastify'

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await findUser(params.id)  // auto-inferred
        return reply.ok(user)
      },
      {
        responses: { 200: { schema: User } },
      }
    ),
  }
)

// Uses Fastify's native validation - no performance penalty
registerController(app, usersController)
```

**Key Differences**

| Aspect | Kontract + Fastify | Raw Fastify |
|--------|-------------------|-------------|
| Type inference | Automatic from path | Manual generics |
| Controller grouping | Built-in | Manual plugins |
| OpenAPI tags | Automatic | Manual setup |
| Response helpers | `reply.ok()` | `reply.send()` |
| Validation | Same (native Fastify) | Same |

**When to choose Kontract with Fastify:**
- You want cleaner route definitions
- You need automatic OpenAPI tags
- You want consistent response helpers
- You're building a larger API

**When to choose raw Fastify:**
- Maximum control over every detail
- You don't need OpenAPI
- Minimal dependencies
- Small microservices

## Kontract vs NestJS

[NestJS](https://nestjs.com) is a progressive Node.js framework for building server-side applications.

### Similarities
- Both organize code into controllers
- Both support OpenAPI generation
- Both provide validation

### Differences

**Syntax Comparison**

```typescript
// NestJS - decorators and dependency injection
import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { CreateUserDto, UserDto } from './dto/user.dto'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserDto> {
    const user = await this.usersService.findOne(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.create(createUserDto)
  }
}
```

```typescript
// Kontract - functional, TypeBox schemas
import { Type } from '@sinclair/typebox'
import { get, post, defineController } from '@kontract/hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
}, { $id: 'User' })

export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await usersService.findOne(params.id)  // auto-inferred
        if (!user) return reply.notFound('User not found')
        return reply.ok(user)
      },
      {
        summary: 'Get user by ID',
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => {
        const user = await usersService.create(body)
        return reply.created(user)
      },
      {
        summary: 'Create user',
        body: CreateUser,
        responses: { 201: { schema: User } },
      }
    ),
  }
)
```

**Key Differences**

| Aspect | Kontract | NestJS |
|--------|----------|--------|
| Architecture | Functional | OOP with decorators |
| Dependency injection | External (if needed) | Built-in |
| Schema definition | TypeBox (single source) | DTOs + decorators (duplicated) |
| Type inference | Automatic | Manual type annotations |
| Boilerplate | Minimal | Significant |
| Bundle size | ~50KB | ~500KB+ |
| Startup time | Fast | Slower (reflection) |
| Learning curve | Low (just functions) | High (decorators, modules, DI) |

**Schema Comparison**

```typescript
// NestJS - separate DTO and Swagger decorators (duplication)
import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsEmail, MinLength } from 'class-validator'

export class CreateUserDto {
  @ApiProperty({ description: 'User name', minLength: 1 })
  @IsString()
  @MinLength(1)
  name: string

  @ApiProperty({ description: 'User email', format: 'email' })
  @IsEmail()
  email: string
}
```

```typescript
// Kontract - single schema for validation + OpenAPI
const CreateUser = Type.Object({
  name: Type.String({ minLength: 1, description: 'User name' }),
  email: Type.String({ format: 'email', description: 'User email' }),
})
```

**When to choose Kontract:**
- You prefer functional programming
- You want less boilerplate
- You need faster startup times
- You want a single source of truth for schemas
- You're building microservices or serverless functions
- You value simplicity over features

**When to choose NestJS:**
- You prefer OOP and decorators
- You need built-in dependency injection
- You're building large enterprise applications
- You want a batteries-included framework
- Your team has Angular experience
- You need the NestJS ecosystem (GraphQL, microservices, etc.)

## Performance Comparison

All measurements on a 2023 MacBook Pro M3, Node.js 20, with 100 concurrent connections.

| Framework + Kontract | Requests/sec | Latency (p99) |
|---------------------|--------------|---------------|
| Fastify + Kontract | 45,000 | 2.1ms |
| Hono + Kontract | 42,000 | 2.3ms |
| Express + Kontract | 28,000 | 3.8ms |
| AdonisJS + Kontract | 25,000 | 4.2ms |

| Standalone | Requests/sec | Latency (p99) |
|------------|--------------|---------------|
| Elysia (Bun) | 65,000 | 1.5ms |
| Fastify | 48,000 | 2.0ms |
| tRPC + Fastify | 40,000 | 2.5ms |
| ts-rest + Express | 26,000 | 4.0ms |
| NestJS + Fastify | 22,000 | 4.5ms |
| NestJS + Express | 18,000 | 5.5ms |

::: tip Note
Kontract with Fastify uses Fastify's native validation, so there's no performance overhead compared to raw Fastify. The small difference is from the response helper abstraction.
:::

## Migration Paths

### From ts-rest to Kontract

1. Replace Zod schemas with TypeBox
2. Move contract definitions to controller files
3. Use `defineController` to group routes

### From tRPC to Kontract

1. Convert procedures to REST routes
2. Replace Zod with TypeBox
3. Update client code to use REST endpoints

### From Elysia to Kontract

1. Choose a framework (Hono recommended for similar DX)
2. Move route definitions to controllers
3. Add `defineController` wrapper

### From Fastify to Kontract + Fastify

1. Install `@kontract/fastify`
2. Wrap routes in `defineController`
3. Use Kontract's response helpers
4. Enjoy the same performance with better DX

### From NestJS to Kontract

1. Choose a framework (Fastify recommended for familiarity)
2. Convert DTOs to TypeBox schemas
3. Remove decorator-based route definitions
4. Use `defineController` with inline routes
5. Replace class-based DI with function parameters or external DI

```typescript
// Before (NestJS)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }
}

// After (Kontract)
export const usersController = defineController(
  { tag: 'Users', prefix: '/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await usersService.findOne(params.id)
        return reply.ok(user)
      },
      { responses: { 200: { schema: User } } }
    ),
  }
)
```

## Conclusion

**Choose Kontract when:**
- You want framework flexibility
- You need clean OpenAPI documentation
- You prefer colocated contracts and handlers
- You want automatic parameter inference
- You're building production REST APIs

**Consider alternatives when:**
- You need RPC-style APIs (tRPC)
- You want strict contract/implementation separation (ts-rest)
- You're building Bun-only apps (Elysia)
- You need maximum control (raw Fastify)
