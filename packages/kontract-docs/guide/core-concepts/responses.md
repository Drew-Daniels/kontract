# Response Helpers

Kontract provides type-safe response helpers through the `reply` object in your handler context. These helpers ensure your responses are structured consistently.

## Response Structure

All responses follow a consistent structure:

```typescript
// Success response
{ status: 200, data: { id: '1', name: 'John' } }

// Error response
{ status: 404, data: { status: 404, code: 'E_NOT_FOUND', message: 'User not found' } }

// Binary response
{ status: 200, binary: true, contentType: 'application/pdf', data: Buffer, filename: 'report.pdf' }
```

## Using Reply Helpers

The `reply` object is available in every handler context:

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-hono'

const getUser = get('/:id',
  async ({ params, reply }) => {
    const user = await findUser(params.id)
    if (!user) {
      return reply.notFound('User not found')
    }
    return reply.ok(user)
  },
  {
    params: Type.Object({ id: Type.String() }),
    responses: { 200: { schema: User }, 404: null },
  }
)
```

## Success Helpers

### reply.ok(data)

Returns a 200 OK response:

```typescript
return reply.ok({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
})
```

### reply.created(data)

Returns a 201 Created response:

```typescript
const user = await userService.create(body)
return reply.created(user)
```

### reply.accepted(data)

Returns a 202 Accepted response (for async operations):

```typescript
const job = await jobQueue.enqueue(task)
return reply.accepted({ jobId: job.id, status: 'pending' })
```

### reply.noContent()

Returns a 204 No Content response:

```typescript
await userService.delete(id)
return reply.noContent()
```

## Error Helpers

### Available Error Methods

| Method | Status | Default Message |
|--------|--------|-----------------|
| `reply.badRequest(msg?)` | 400 | "Bad request" |
| `reply.unauthorized(msg?)` | 401 | "Authentication required" |
| `reply.forbidden(msg?)` | 403 | "Access denied" |
| `reply.notFound(msg?)` | 404 | "Resource not found" |
| `reply.conflict(msg?)` | 409 | "Resource conflict" |
| `reply.validationError(errors)` | 422 | "Validation failed" |
| `reply.tooManyRequests(msg?)` | 429 | "Too many requests" |
| `reply.internalError(msg?)` | 500 | "Internal server error" |
| `reply.badGateway(msg?)` | 502 | "External API error" |
| `reply.serviceUnavailable(msg?)` | 503 | "Service unavailable" |

### Usage Examples

```typescript
// With default messages
return reply.notFound()              // "Resource not found"
return reply.unauthorized()          // "Authentication required"
return reply.forbidden()             // "Access denied"

// With custom messages
return reply.notFound('User not found')
return reply.unauthorized('Token expired')
return reply.forbidden('Admin access required')
return reply.conflict('Email already registered')
```

### Validation Errors

For field-level validation errors:

```typescript
return reply.validationError([
  { field: 'email', message: 'Invalid email format' },
  { field: 'password', message: 'Password must be at least 8 characters' },
])
```

This produces:

```json
{
  "status": 422,
  "code": "E_VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

## Custom Status Responses

For status codes not covered by helpers:

```typescript
return reply.custom(418, { message: "I'm a teapot" })
```

## Binary Responses

For file downloads and binary content:

```typescript
// PDF download
const pdf = await generatePdfReport(data)
return reply.binary('application/pdf', pdf, 'report.pdf')

// Image response
const image = await processImage(file)
return reply.binary('image/png', image)

// Excel export
const excel = await generateExcel(data)
return reply.binary(
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  excel,
  'export.xlsx'
)
```

### Binary Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | `string` | MIME type |
| `data` | `Buffer \| Uint8Array` | Binary content |
| `filename` | `string` | Optional download filename |

## Error Body Format

The standard `ApiErrorBody` schema:

```typescript
const ApiErrorBody = Type.Object({
  status: Type.Integer(),
  code: Type.String(),
  message: Type.String(),
  errors: Type.Optional(Type.Array(Type.Object({
    field: Type.String(),
    message: Type.String(),
  }))),
})
```

### Error Codes

Kontract uses standardized error codes:

| Code | Description |
|------|-------------|
| `E_BAD_REQUEST` | Invalid request |
| `E_UNAUTHORIZED` | Authentication required |
| `E_FORBIDDEN` | Access denied |
| `E_NOT_FOUND` | Resource not found |
| `E_CONFLICT` | Resource conflict |
| `E_VALIDATION_ERROR` | Validation failed |
| `E_TOO_MANY_REQUESTS` | Rate limited |
| `E_INTERNAL_ERROR` | Server error |
| `E_SERVICE_UNAVAILABLE` | Service down |
| `E_BAD_GATEWAY` | External API error |

## Complete Example

```typescript
import { Type } from '@sinclair/typebox'
import { get, post, del, defineController } from 'kontract-hono'

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
}, { $id: 'User' })

const CreateUser = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
})

export const usersController = defineController(
  { tag: 'Users', prefix: '/api/users' },
  {
    getUser: get('/:id',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) {
          return reply.notFound('User not found')
        }
        return reply.ok(user)
      },
      {
        params: Type.Object({ id: Type.String() }),
        responses: { 200: { schema: User }, 404: null },
      }
    ),

    createUser: post('/',
      async ({ body, reply }) => {
        const existing = await userService.findByEmail(body.email)
        if (existing) {
          return reply.conflict('Email already registered')
        }
        const user = await userService.create(body)
        return reply.created(user)
      },
      {
        auth: 'required',
        body: CreateUser,
        responses: { 201: { schema: User }, 409: null, 422: null },
      }
    ),

    deleteUser: del('/:id',
      async ({ params, reply }) => {
        const deleted = await userService.delete(params.id)
        if (!deleted) {
          return reply.notFound()
        }
        return reply.noContent()
      },
      {
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 204: null, 404: null },
      }
    ),

    exportUser: get('/:id/export',
      async ({ params, reply }) => {
        const user = await userService.find(params.id)
        if (!user) {
          return reply.notFound()
        }
        const pdf = await pdfService.generateUserReport(user)
        return reply.binary('application/pdf', pdf, `user-${user.id}.pdf`)
      },
      {
        auth: 'required',
        params: Type.Object({ id: Type.String() }),
        responses: { 200: null, 404: null },
      }
    ),
  }
)
```
