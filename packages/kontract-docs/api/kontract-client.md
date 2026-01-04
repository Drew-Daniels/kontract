# @kontract/client

Type-safe HTTP client for consuming Kontract APIs. Generate fully-typed API clients from your route definitions without a separate code generation step.

## Installation

```bash
npm install @kontract/client
```

## Quick Start

```typescript
import { createClient } from '@kontract/client'
import { usersController, postsController } from './api/controllers.js'

const api = createClient({
  baseUrl: 'http://localhost:3000',
  controllers: {
    users: usersController,
    posts: postsController,
  },
})

// Fully typed API calls
const user = await api.users.getUser({ params: { id: '123' } })
const posts = await api.posts.listPosts({ query: { page: 1 } })
```

## API Reference

### createClient(config)

Creates a type-safe HTTP client from controller definitions.

```typescript
import { createClient } from '@kontract/client'

const api = createClient({
  baseUrl: 'http://localhost:3000',
  controllers: {
    users: usersController,
    posts: postsController,
  },
  headers: {
    'Authorization': 'Bearer token',
    'X-API-Key': 'key',
  },
  fetch: customFetch, // Optional custom fetch
})
```

**Config Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseUrl` | `string` | Yes | Base URL for API requests |
| `controllers` | `Record<string, Controller>` | Yes | Controller definitions |
| `headers` | `Record<string, string>` | No | Default headers |
| `fetch` | `typeof fetch` | No | Custom fetch implementation |

### Client Methods

Each route in your controllers becomes a typed method:

```typescript
// From route definition:
const getUser = defineRoute({
  route: 'GET /users/:id',
  params: Type.Object({ id: Type.String() }),
  query: Type.Object({ include: Type.Optional(Type.String()) }),
  responses: {
    200: { schema: User },
    404: null,
  },
})

// Client usage:
const result = await api.users.getUser({
  params: { id: '123' },           // Required
  query: { include: 'profile' },   // Optional
})
```

### Request Options

Each method accepts an options object:

```typescript
interface RequestOptions<TParams, TQuery, TBody> {
  params?: TParams      // Path parameters
  query?: TQuery        // Query string parameters
  body?: TBody          // Request body
  headers?: Record<string, string>  // Additional headers
  signal?: AbortSignal  // For request cancellation
}
```

### Response Type

Responses are fully typed based on your route definitions:

```typescript
// Route with multiple response types
const getUser = defineRoute({
  route: 'GET /users/:id',
  responses: {
    200: { schema: User },
    404: null,
  },
})

// Response is typed as:
// { status: 200, data: User } | { status: 404, data: null }
const result = await api.users.getUser({ params: { id: '123' } })

if (result.status === 200) {
  console.log(result.data.name)  // User type
} else {
  console.log('Not found')       // 404
}
```

## URL Building

### buildUrl(base, path, params?, query?)

Builds a complete URL with path parameters and query string:

```typescript
import { buildUrl } from '@kontract/client'

const url = buildUrl(
  'http://api.example.com',
  '/users/:id/posts',
  { id: '123' },
  { page: 1, limit: 20 }
)
// 'http://api.example.com/users/123/posts?page=1&limit=20'
```

### substitutePath(path, params)

Substitutes path parameters:

```typescript
import { substitutePath } from '@kontract/client'

const path = substitutePath('/users/:id/posts/:postId', {
  id: '123',
  postId: '456',
})
// '/users/123/posts/456'
```

### buildQueryString(params)

Builds a URL query string:

```typescript
import { buildQueryString } from '@kontract/client'

const qs = buildQueryString({
  page: 1,
  tags: ['a', 'b'],
  filter: { status: 'active' },
})
// 'page=1&tags=a&tags=b&filter[status]=active'
```

## Error Handling

```typescript
try {
  const user = await api.users.getUser({ params: { id: '123' } })
} catch (error) {
  if (error instanceof Error) {
    console.error('Request failed:', error.message)
  }
}
```

For type-safe error handling with known error responses:

```typescript
const result = await api.users.getUser({ params: { id: '123' } })

switch (result.status) {
  case 200:
    return result.data  // User
  case 404:
    throw new Error('User not found')
  case 401:
    redirect('/login')
    break
}
```

## Request Cancellation

```typescript
const controller = new AbortController()

const promise = api.users.listUsers({
  signal: controller.signal,
})

// Cancel the request
controller.abort()
```

## Custom Headers

```typescript
// Per-request headers
const user = await api.users.getUser({
  params: { id: '123' },
  headers: {
    'X-Request-Id': 'abc123',
  },
})

// Or set default headers on client creation
const api = createClient({
  baseUrl: 'http://localhost:3000',
  controllers: { users: usersController },
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
```

## Custom Fetch

Use a custom fetch implementation (e.g., for interceptors):

```typescript
import { createClient } from '@kontract/client'

const customFetch: typeof fetch = async (url, options) => {
  // Add logging, retry logic, etc.
  console.log('Fetching:', url)

  const response = await fetch(url, options)

  if (response.status === 401) {
    // Handle token refresh
    await refreshToken()
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${newToken}`,
      },
    })
  }

  return response
}

const api = createClient({
  baseUrl: 'http://localhost:3000',
  controllers: { users: usersController },
  fetch: customFetch,
})
```

## Complete Example

```typescript
// api/client.ts
import { createClient } from '@kontract/client'
import { usersController, postsController, authController } from './controllers.js'

let authToken: string | null = null

export const api = createClient({
  baseUrl: import.meta.env.VITE_API_URL,
  controllers: {
    auth: authController,
    users: usersController,
    posts: postsController,
  },
  headers: {
    'Content-Type': 'application/json',
  },
  fetch: async (url, options) => {
    const headers = new Headers(options?.headers)

    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    return fetch(url, { ...options, headers })
  },
})

export function setAuthToken(token: string | null) {
  authToken = token
}

// Usage
import { api, setAuthToken } from './api/client.js'

// Login
const loginResult = await api.auth.login({
  body: { email: 'user@example.com', password: 'secret' },
})

if (loginResult.status === 200) {
  setAuthToken(loginResult.data.token)
}

// Authenticated requests
const users = await api.users.listUsers({ query: { page: 1 } })
const user = await api.users.getUser({ params: { id: '123' } })
```

## Types

```typescript
import type {
  ClientConfig,
  ClientOptions,
  ClientResponse,
  RequestOptions,
  Client,
  InferRequestOptions,
  InferResponse,
  InferControllerClient,
} from '@kontract/client'
```
