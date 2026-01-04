/**
 * Tests for @kontract/client
 */
import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import { createClient, buildUrl, substitutePath, buildQueryString } from '../src/index.js'
import { defineController, defineRoute } from 'kontract/builder'

// =============================================================================
// Test Fixtures
// =============================================================================

const User = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
})

const CreateUserRequest = Type.Object({
  name: Type.String(),
  email: Type.String(),
})

const ApiError = Type.Object({
  message: Type.String(),
})

// =============================================================================
// Contract-Only Definitions (no handlers - can be shared with client)
// =============================================================================

const usersController = defineController({ tag: 'Users' }, {
  listUsers: defineRoute({
    route: 'GET /api/v1/users',
    query: Type.Object({
      page: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
    }),
    responses: { 200: { schema: Type.Array(User) } },
  }),

  getUser: defineRoute({
    route: 'GET /api/v1/users/:id',
    params: Type.Object({ id: Type.String() }),
    responses: {
      200: { schema: User },
      404: { schema: ApiError },
    },
  }),

  createUser: defineRoute({
    route: 'POST /api/v1/users',
    body: CreateUserRequest,
    responses: { 201: { schema: User } },
  }),

  deleteUser: defineRoute({
    route: 'DELETE /api/v1/users/:id',
    params: Type.Object({ id: Type.String() }),
    responses: { 204: null },
  }),
})

// =============================================================================
// Helper to create mock fetch
// =============================================================================

function createMockFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = []
  let response: {
    status: number
    headers: Headers
    json: () => Promise<unknown>
  }

  const mockFetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return response
  }

  mockFetch.mockResolvedValue = (res: typeof response) => {
    response = res
  }

  mockFetch.calls = calls

  return mockFetch
}

// =============================================================================
// Path Utilities Tests
// =============================================================================

test.group('substitutePath', () => {
  test('should substitute path parameters', ({ assert }) => {
    assert.equal(substitutePath('/users/:id', { id: '123' }), '/users/123')
  })

  test('should substitute multiple path parameters', ({ assert }) => {
    assert.equal(
      substitutePath('/posts/:postId/comments/:commentId', {
        postId: '1',
        commentId: '2',
      }),
      '/posts/1/comments/2',
    )
  })

  test('should encode special characters', ({ assert }) => {
    assert.equal(substitutePath('/users/:id', { id: 'foo/bar' }), '/users/foo%2Fbar')
  })

  test('should return path unchanged when no params', ({ assert }) => {
    assert.equal(substitutePath('/users', undefined), '/users')
  })

  test('should throw for missing parameters', ({ assert }) => {
    assert.throws(() => substitutePath('/users/:id', {}), 'Missing path parameter: id')
  })
})

test.group('buildQueryString', () => {
  test('should build query string from object', ({ assert }) => {
    assert.equal(buildQueryString({ page: 1, limit: 10 }), 'page=1&limit=10')
  })

  test('should handle arrays', ({ assert }) => {
    const result = buildQueryString({ tags: ['a', 'b'] })
    assert.equal(result, 'tags=a&tags=b')
  })

  test('should skip undefined values', ({ assert }) => {
    assert.equal(buildQueryString({ page: 1, limit: undefined }), 'page=1')
  })

  test('should return empty string for no params', ({ assert }) => {
    assert.equal(buildQueryString(undefined), '')
    assert.equal(buildQueryString({}), '')
  })

  test('should serialize objects as JSON', ({ assert }) => {
    const result = buildQueryString({ filter: { name: 'test' } })
    assert.equal(result, 'filter=%7B%22name%22%3A%22test%22%7D')
  })
})

test.group('buildUrl', () => {
  test('should build complete URL', ({ assert }) => {
    assert.equal(
      buildUrl('http://localhost:3333', '/users/:id', { id: '123' }, { include: 'posts' }),
      'http://localhost:3333/users/123?include=posts',
    )
  })

  test('should handle trailing slash in base URL', ({ assert }) => {
    assert.equal(
      buildUrl('http://localhost:3333/', '/users', undefined, undefined),
      'http://localhost:3333/users',
    )
  })

  test('should work without query params', ({ assert }) => {
    assert.equal(
      buildUrl('http://localhost:3333', '/users', undefined, undefined),
      'http://localhost:3333/users',
    )
  })
})

// =============================================================================
// Client Tests
// =============================================================================

test.group('createClient', () => {
  test('should create client with controller namespaces', ({ assert }) => {
    const mockFetch = createMockFetch()

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    assert.isDefined(client.users)
    assert.equal(typeof client.users.listUsers, 'function')
    assert.equal(typeof client.users.getUser, 'function')
    assert.equal(typeof client.users.createUser, 'function')
    assert.equal(typeof client.users.deleteUser, 'function')
  })

  test('should make GET request with query params', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([{ id: '1', name: 'John', email: 'john@example.com' }]),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await client.users.listUsers({ query: { page: 1, limit: 10 } })

    assert.equal(mockFetch.calls[0].url, 'http://localhost:3333/api/v1/users?page=1&limit=10')
    assert.equal(mockFetch.calls[0].init.method, 'GET')
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, [{ id: '1', name: 'John', email: 'john@example.com' }])
  })

  test('should make GET request with path params', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: '123', name: 'John', email: 'john@example.com' }),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await client.users.getUser({ params: { id: '123' } })

    assert.equal(mockFetch.calls[0].url, 'http://localhost:3333/api/v1/users/123')
    assert.equal(mockFetch.calls[0].init.method, 'GET')
    assert.equal(result.status, 200)
  })

  test('should make POST request with body', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: '1', name: 'John', email: 'john@example.com' }),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await client.users.createUser({
      body: { name: 'John', email: 'john@example.com' },
    })

    assert.equal(mockFetch.calls[0].url, 'http://localhost:3333/api/v1/users')
    assert.equal(mockFetch.calls[0].init.method, 'POST')
    assert.equal(mockFetch.calls[0].init.body, JSON.stringify({ name: 'John', email: 'john@example.com' }))
    assert.equal(result.status, 201)
  })

  test('should handle DELETE request', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 204,
      headers: new Headers(),
      json: () => Promise.resolve(null),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await client.users.deleteUser({ params: { id: '123' } })

    assert.equal(mockFetch.calls[0].url, 'http://localhost:3333/api/v1/users/123')
    assert.equal(mockFetch.calls[0].init.method, 'DELETE')
    assert.equal(result.status, 204)
    assert.isNull(result.body)
  })

  test('should include custom headers', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      headers: { Authorization: 'Bearer token123' },
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.users.listUsers({})

    const headers = mockFetch.calls[0].init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer token123')
  })

  test('should allow per-request headers', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      headers: { 'X-Client-Id': 'client1' },
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.users.listUsers({ headers: { 'X-Request-Id': 'req123' } })

    const headers = mockFetch.calls[0].init.headers as Record<string, string>
    assert.equal(headers['X-Client-Id'], 'client1')
    assert.equal(headers['X-Request-Id'], 'req123')
  })

  test('should handle 404 response', async ({ assert }) => {
    const mockFetch = createMockFetch()
    mockFetch.mockResolvedValue({
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'User not found' }),
    })

    const client = createClient({
      controllers: { users: usersController },
      baseUrl: 'http://localhost:3333',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await client.users.getUser({ params: { id: '999' } })

    assert.equal(result.status, 404)
    assert.deepEqual(result.body, { message: 'User not found' })
  })
})
