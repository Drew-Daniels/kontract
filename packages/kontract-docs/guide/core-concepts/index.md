# Core Concepts

This section covers the fundamental concepts you need to understand when building APIs with Kontract.

## Overview

Kontract is built around a few key ideas:

### Single Source of Truth

Your TypeBox schemas define everything: TypeScript types, runtime validation, and OpenAPI documentation. No duplication, no sync issues.

### Contract-First Development

Define what your API accepts and returns before implementing the logic. This catches mismatches early and makes your API self-documenting.

### Full Type Inference

Unlike decorator-based approaches, Kontract's function-based API provides automatic TypeScript type inference. Your handler parameters are typed without manual annotations.

### Framework Independence

The core library knows nothing about HTTP frameworks. Adapters bridge the gap, letting you switch frameworks without changing your contracts.

## Key Components

| Component | Purpose |
|-----------|---------|
| [Schemas](/guide/core-concepts/schemas) | TypeBox schemas for request/response typing and validation |
| [Routes](/guide/core-concepts/routes) | `get`, `post`, `put`, `patch`, `del` helpers for defining endpoints |
| [Responses](/guide/core-concepts/responses) | Type-safe response helpers via `reply.ok()`, `reply.created()`, etc. |
| [Validation](/guide/core-concepts/validation) | Automatic request validation with optional response validation |
| [OpenAPI](/guide/core-concepts/openapi) | Automatic OpenAPI spec generation |

## Quick Example

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, defineController } from 'kontract-hono'

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
    responses: {
      200: { schema: User },
      404: null,
    },
  }
)

const createUser = post('/users',
  async ({ body, reply }) => {
    const user = await createUser(body)
    return reply.created(user)
  },
  {
    body: Type.Object({ name: Type.String() }),
    responses: { 201: { schema: User } },
  }
)

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/v1' },
  { getUser, createUser }
)
```

## Next Steps

Start with [Schemas](/guide/core-concepts/schemas) to learn how to define your data types.
