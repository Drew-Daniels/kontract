# Error Handling Example

Patterns for handling errors, custom error responses, and validation feedback.

## Standard Error Format

Kontract uses a consistent error format:

```typescript
interface ApiErrorBody {
  status: number
  code: string
  message: string
  errors?: Array<{ field: string; message: string }>
}
```

## Using Reply Helpers

The simplest way to return errors using the reply helpers:

```typescript
import { get, post, defineController } from 'kontract-hono'

const getResource = get('/:id',
  async ({ params, reply }) => {
    const resource = await findResource(params.id)
    if (!resource) {
      return reply.notFound('Resource not found')
    }
    return reply.ok(resource)
  },
  { /* options */ }
)
```

Available error helpers:
- `reply.badRequest(message)` - 400
- `reply.unauthorized(message)` - 401
- `reply.forbidden(message)` - 403
- `reply.notFound(message)` - 404
- `reply.conflict(message)` - 409
- `reply.validationError(errors)` - 422
- `reply.internalError(message)` - 500

## Custom Error Responses

For full control over error response data:

```typescript
import { Type } from '@sinclair/typebox'
import { get, defineController } from 'kontract-hono'

// Define custom error schema
const CustomError = Type.Object({
  message: Type.String(),
  code: Type.String(),
  details: Type.Optional(Type.Object({
    resourceType: Type.String(),
    resourceId: Type.String(),
  })),
})

const getResource = get('/:id',
  async ({ params, reply }) => {
    const resource = await findResource(params.id)
    if (!resource) {
      return reply.custom(404, {
        message: 'Resource not found',
        code: 'RESOURCE_NOT_FOUND',
        details: {
          resourceType: 'Resource',
          resourceId: params.id,
        },
      })
    }
    return reply.ok(resource)
  },
  {
    params: Type.Object({ id: Type.String() }),
    responses: {
      200: { schema: Resource },
      404: { schema: CustomError },
    },
  }
)
```

## Validation Error Patterns

### Field-Level Validation

```typescript
const createUser = post('/',
  async ({ body, reply }) => {
    const errors: Array<{ field: string; message: string }> = []

    // Custom validation beyond schema
    if (body.password !== body.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
      })
    }

    const existingUser = await findUserByEmail(body.email)
    if (existingUser) {
      errors.push({
        field: 'email',
        message: 'Email already registered',
      })
    }

    if (errors.length > 0) {
      return reply.validationError(errors)
    }

    const user = await createUser(body)
    return reply.created(user)
  },
  {
    body: CreateUserRequest,
    responses: {
      201: { schema: User },
      422: null,  // Uses standard ApiErrorBody
    },
  }
)
```

### Cross-Field Validation

```typescript
const DateRangeRequest = Type.Object({
  startDate: Type.String({ format: 'date' }),
  endDate: Type.String({ format: 'date' }),
})

const generateReport = post('/reports',
  async ({ body, reply }) => {
    const start = new Date(body.startDate)
    const end = new Date(body.endDate)

    if (end < start) {
      return reply.validationError([
        { field: 'endDate', message: 'End date must be after start date' },
      ])
    }

    if ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) > 365) {
      return reply.validationError([
        { field: 'endDate', message: 'Date range cannot exceed 1 year' },
      ])
    }

    const report = await generateReport(start, end)
    return reply.ok(report)
  },
  {
    body: DateRangeRequest,
    responses: { 200: { schema: Report }, 422: null },
  }
)
```

## Business Logic Errors

```typescript
const createOrder = post('/orders',
  async ({ body, user, reply }) => {
    // Check inventory
    for (const item of body.items) {
      const product = await findProduct(item.productId)
      if (!product) {
        return reply.badRequest(`Product ${item.productId} not found`)
      }
      if (product.stock < item.quantity) {
        return reply.badRequest(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        )
      }
    }

    // Check user's order limit
    const activeOrders = await countActiveOrders(user.id)
    if (activeOrders >= 5) {
      return reply.badRequest(
        'Maximum of 5 active orders allowed. Complete or cancel existing orders.'
      )
    }

    const order = await createOrder(user.id, body)
    return reply.created(order)
  },
  {
    auth: 'required',
    body: CreateOrderRequest,
    responses: {
      201: { schema: Order },
      400: null,  // Business logic errors
      422: null,  // Validation errors
    },
  }
)
```

## External API Errors

```typescript
const getWeather = get('/weather/:city',
  async ({ params, reply }) => {
    try {
      const weather = await weatherApi.get(params.city)
      return reply.ok(weather)
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return reply.serviceUnavailable('Weather service is temporarily unavailable')
      }
      if (error.response?.status === 404) {
        return reply.notFound(`City "${params.city}" not found`)
      }
      return reply.badGateway('Failed to fetch weather data')
    }
  },
  {
    params: Type.Object({ city: Type.String() }),
    responses: {
      200: { schema: Weather },
      502: null,  // External API error
      503: null,  // Service unavailable
    },
  }
)
```

## Rate Limiting

```typescript
const expensiveOperation = post('/api/expensive-operation',
  async ({ user, reply }) => {
    const key = `rate:${user.id}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, 60)  // 1 minute window
    }

    if (count > 10) {  // 10 requests per minute
      return reply.tooManyRequests(
        'Rate limit exceeded. Please wait before retrying.'
      )
    }

    const result = await performExpensiveOperation()
    return reply.ok(result)
  },
  {
    auth: 'required',
    responses: {
      200: { schema: Result },
      429: null,
    },
  }
)
```

## Error Handler Configuration

::: code-group

```typescript [Hono]
import { Hono } from 'hono'
import { createErrorHandler } from 'kontract-hono'

const app = new Hono()

app.onError(createErrorHandler({
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, c) => {
    // Custom logging
    logger.error({
      error: error.message,
      stack: error.stack,
      path: c.req.path,
      method: c.req.method,
    })

    // Error tracking
    Sentry.captureException(error)
  },
}))
```

```typescript [Fastify]
import Fastify from 'fastify'
import { registerErrorHandler } from 'kontract-fastify'

const app = Fastify()

registerErrorHandler(app, {
  logErrors: true,
  onError: (error, request) => {
    app.log.error(error)
    Sentry.captureException(error)
  },
})
```

```typescript [Express]
import express from 'express'
import { createErrorHandler } from 'kontract-express'

const app = express()

// Error handler must be registered AFTER routes
app.use(createErrorHandler({
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development',
  onError: (error, req) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    })
    Sentry.captureException(error)
  },
}))
```

:::

## Error Response Examples

### 400 Bad Request
```json
{
  "status": 400,
  "code": "E_BAD_REQUEST",
  "message": "Invalid request format"
}
```

### 401 Unauthorized
```json
{
  "status": 401,
  "code": "E_UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 422 Validation Error
```json
{
  "status": 422,
  "code": "E_VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "age", "message": "Must be at least 18" }
  ]
}
```

### 429 Rate Limited
```json
{
  "status": 429,
  "code": "E_TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Please wait before retrying."
}
```

### 500 Internal Error
```json
{
  "status": 500,
  "code": "E_INTERNAL_ERROR",
  "message": "Internal server error"
}
```

### 502 Bad Gateway
```json
{
  "status": 502,
  "code": "E_BAD_GATEWAY",
  "message": "External API error"
}
```
