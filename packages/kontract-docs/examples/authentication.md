# Authentication Example

JWT-based authentication with login, token refresh, and protected routes.

## Schemas

```typescript
// schemas/auth.ts
import { Type, Static } from '@sinclair/typebox'

export const LoginRequest = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
}, { $id: 'LoginRequest' })

export const RegisterRequest = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  confirmPassword: Type.String({ minLength: 8 }),
}, { $id: 'RegisterRequest' })

export const TokenResponse = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.Integer(),
  tokenType: Type.Literal('Bearer'),
}, { $id: 'TokenResponse' })

export const RefreshTokenRequest = Type.Object({
  refreshToken: Type.String(),
}, { $id: 'RefreshTokenRequest' })

export const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  createdAt: Type.String({ format: 'date-time' }),
}, { $id: 'User' })

export const ChangePasswordRequest = Type.Object({
  currentPassword: Type.String(),
  newPassword: Type.String({ minLength: 8 }),
  confirmPassword: Type.String({ minLength: 8 }),
})
```

## Auth Controller

```typescript
// controllers/auth.controller.ts
import { Type } from '@sinclair/typebox'
import { get, post, patch, defineController } from '@kontract/hono'
import {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  RefreshTokenRequest,
  User,
  ChangePasswordRequest,
} from '../schemas/auth.js'

export const authController = defineController(
  {
    tag: 'Authentication',
    description: 'User authentication endpoints',
    prefix: '/api/v1/auth',
  },
  {
    register: post('/register',
      async ({ body, reply }) => {
        // Validate passwords match
        if (body.password !== body.confirmPassword) {
          return reply.validationError([
            { field: 'confirmPassword', message: 'Passwords do not match' },
          ])
        }

        // Check if email exists
        const existing = await findUserByEmail(body.email)
        if (existing) {
          return reply.conflict('Email already registered')
        }

        // Create user
        const user = await createUser({
          name: body.name,
          email: body.email,
          password: await hashPassword(body.password),
        })

        return reply.created({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        })
      },
      {
        summary: 'Register a new user',
        body: RegisterRequest,
        responses: {
          201: { schema: User, description: 'User created successfully' },
          409: { schema: null, description: 'Email already registered' },
          422: { schema: null, description: 'Validation error' },
        },
      }
    ),

    login: post('/login',
      async ({ body, reply }) => {
        const user = await findUserByEmail(body.email)
        if (!user) {
          return reply.unauthorized('Invalid email or password')
        }

        const valid = await verifyPassword(body.password, user.password)
        if (!valid) {
          return reply.unauthorized('Invalid email or password')
        }

        const tokens = await generateTokens(user)

        return reply.ok({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 3600,  // 1 hour
          tokenType: 'Bearer',
        })
      },
      {
        summary: 'Login with email and password',
        body: LoginRequest,
        responses: {
          200: { schema: TokenResponse, description: 'Login successful' },
          401: { schema: null, description: 'Invalid credentials' },
        },
      }
    ),

    refresh: post('/refresh',
      async ({ body, reply }) => {
        try {
          const payload = await verifyRefreshToken(body.refreshToken)
          const user = await findUser(payload.userId)

          if (!user) {
            return reply.unauthorized('User not found')
          }

          // Invalidate old refresh token
          await revokeRefreshToken(body.refreshToken)

          // Generate new tokens
          const tokens = await generateTokens(user)

          return reply.ok({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 3600,
            tokenType: 'Bearer',
          })
        } catch {
          return reply.unauthorized('Invalid refresh token')
        }
      },
      {
        summary: 'Refresh access token',
        body: RefreshTokenRequest,
        responses: {
          200: { schema: TokenResponse },
          401: { schema: null, description: 'Invalid refresh token' },
        },
      }
    ),

    logout: post('/logout',
      async ({ body, reply }) => {
        await revokeRefreshToken(body.refreshToken)
        return reply.noContent()
      },
      {
        summary: 'Logout and invalidate tokens',
        auth: 'required',
        body: RefreshTokenRequest,
        responses: { 204: null },
      }
    ),

    me: get('/me',
      async ({ user, reply }) => {
        return reply.ok({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        })
      },
      {
        summary: 'Get current user',
        auth: 'required',
        responses: { 200: { schema: User }, 401: null },
      }
    ),

    changePassword: patch('/password',
      async ({ body, user, reply }) => {
        // Validate passwords match
        if (body.newPassword !== body.confirmPassword) {
          return reply.validationError([
            { field: 'confirmPassword', message: 'Passwords do not match' },
          ])
        }

        // Verify current password
        const valid = await verifyPassword(body.currentPassword, user.password)
        if (!valid) {
          return reply.badRequest('Current password is incorrect')
        }

        // Update password
        await updateUser(user.id, {
          password: await hashPassword(body.newPassword),
        })

        // Revoke all refresh tokens
        await revokeAllUserTokens(user.id)

        return reply.noContent()
      },
      {
        summary: 'Change password',
        auth: 'required',
        body: ChangePasswordRequest,
        responses: {
          204: null,
          400: { schema: null, description: 'Current password incorrect' },
          422: null,
        },
      }
    ),
  }
)
```

## Authentication Setup

::: code-group

```typescript [Hono]
import { Hono } from 'hono'
import { registerController, createErrorHandler } from '@kontract/hono'
import { authController } from './controllers/auth.controller.js'

const app = new Hono()

app.onError(createErrorHandler())

registerController(app, authController, {
  authenticate: async (c) => {
    const header = c.req.header('Authorization')
    if (!header?.startsWith('Bearer ')) {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    }

    const token = header.slice(7)
    try {
      const payload = await verifyAccessToken(token)
      const user = await findUser(payload.userId)
      if (!user) {
        throw new Error('User not found')
      }
      return user
    } catch {
      throw Object.assign(new Error('Invalid token'), { status: 401 })
    }
  },
})
```

```typescript [Fastify]
import Fastify from 'fastify'
import { registerController, registerErrorHandler } from '@kontract/fastify'
import { authController } from './controllers/auth.controller.js'

const app = Fastify()

registerErrorHandler(app)

registerController(app, authController, {
  authenticate: async (req) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    }

    const token = header.slice(7)
    const payload = await verifyAccessToken(token)
    const user = await findUser(payload.userId)
    return user
  },
})
```

```typescript [Express]
import express from 'express'
import { registerController, createErrorHandler } from '@kontract/express'
import { authController } from './controllers/auth.controller.js'

const app = express()
app.use(express.json())

registerController(app, authController, {
  authenticate: async (req) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    }

    const token = header.slice(7)
    try {
      const payload = await verifyAccessToken(token)
      const user = await findUser(payload.userId)
      if (!user) {
        throw new Error('User not found')
      }
      return user
    } catch {
      throw Object.assign(new Error('Invalid token'), { statusCode: 401 })
    }
  },
})

app.use(createErrorHandler())
```

:::

## OpenAPI Security

```typescript
import { buildOpenApiSpec } from '@kontract/hono'
import { authController } from './controllers/auth.controller.js'

const spec = buildOpenApiSpec({
  info: { title: 'My API', version: '1.0.0' },
  controllers: [authController],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT access token from /auth/login',
    },
  },
})
```

## Sample Requests

### Register

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secretpassword",
    "confirmPassword": "secretpassword"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secretpassword"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Protected Request

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2..."
  }'
```
