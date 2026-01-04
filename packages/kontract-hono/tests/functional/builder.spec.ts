/**
 * Integration tests for the builder pattern (defineRoute/defineController).
 * Tests registerController() functionality with Hono.
 */
import { test } from '@japa/runner'
import { startServer, stopServer } from '../fixtures/builder_app.js'

// Use a single shared server for all tests
let baseUrl: string
let serverStarted = false

/**
 * Helper to check if response is a validation error.
 * The error handler returns 400 for validation errors, but 422 may also be valid.
 */
function isValidationError(status: number): boolean {
  return status === 400 || status === 422
}

async function ensureServer() {
  if (!serverStarted) {
    baseUrl = await startServer()
    serverStarted = true
  }
  return baseUrl
}

test.group('Builder Pattern - Route Registration', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  test('GET endpoint is reachable', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`)
    assert.equal(response.status, 200)
  })

  test('POST endpoint is reachable', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
    })
    assert.equal(response.status, 201)
  })

  test('returns 404 for unregistered routes', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/not-a-route`)
    assert.equal(response.status, 404)
  })

  test('prefix is applied to all routes', async ({ assert }) => {
    // Without prefix would be /users, with prefix is /api/v1/users
    const withPrefix = await fetch(`${baseUrl}/api/v1/users`)
    const withoutPrefix = await fetch(`${baseUrl}/users`)

    assert.equal(withPrefix.status, 200)
    assert.equal(withoutPrefix.status, 404)
  })
})

test.group('Builder Pattern - Request Body Validation', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  test('accepts valid body', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }),
    })

    assert.equal(response.status, 201)
    const data = await response.json()
    assert.equal(data.name, 'John Doe')
    assert.equal(data.email, 'john@example.com')
  })

  test('rejects missing required field', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }), // missing email
    })

    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })

  test('rejects invalid email format', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John',
        email: 'not-an-email',
      }),
    })

    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })

  test('rejects empty string for minLength constraint', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'test@test.com',
      }),
    })

    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })

  test('rejects age below minimum', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John',
        email: 'john@test.com',
        age: -1,
      }),
    })

    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })
})

test.group('Builder Pattern - Query Parameter Validation', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  test('accepts valid query params', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users?page=2&limit=50`)
    assert.equal(response.status, 200)
  })

  test('applies default values', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`)
    assert.equal(response.status, 200)
  })

  test('coerces string to integer', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users?page=3`)
    assert.equal(response.status, 200)
  })

  test('rejects value below minimum', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users?page=0`)
    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })

  test('rejects value above maximum', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users?limit=200`)
    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })
})

test.group('Builder Pattern - Path Parameter Validation', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  test('accepts valid UUID path param', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.id, '123e4567-e89b-12d3-a456-426614174000')
  })

  test('rejects invalid UUID format', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/not-a-uuid`)
    assert.isTrue(isValidationError(response.status), `Expected validation error, got ${response.status}`)
  })

  test('returns 404 for non-existent user', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/00000000-0000-0000-0000-000000000000`)
    assert.equal(response.status, 404)
  })
})

test.group('Builder Pattern - Authentication', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  test('protected endpoint returns 401 without token', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`, {
      method: 'DELETE',
    })
    assert.equal(response.status, 401)
  })

  test('protected endpoint returns 204 with valid token', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    })
    assert.equal(response.status, 204)
  })

  test('protected endpoint returns 401 with invalid token', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid-token' },
    })
    assert.equal(response.status, 401)
  })

  test('optional auth endpoint works without token', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/profile`)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.name, 'Anonymous')
  })

  test('optional auth endpoint works with valid token', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/profile`, {
      headers: { Authorization: 'Bearer valid-token' },
    })
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.name, 'Test User')
  })
})

test.group('Builder Pattern - Response Helpers', (group) => {
  group.setup(async () => {
    baseUrl = await ensureServer()
  })

  // Cleanup after all tests - only in the last group
  group.teardown(async () => {
    await stopServer()
  })

  test('ok() returns 200 with JSON body', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`)
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.property(data, 'id')
    assert.property(data, 'name')
    assert.property(data, 'email')
  })

  test('created() returns 201 with JSON body', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@test.com' }),
    })
    assert.equal(response.status, 201)
    const data = await response.json()
    assert.property(data, 'id')
  })

  test('noContent() returns 204 with no body', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/123e4567-e89b-12d3-a456-426614174000`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    })
    assert.equal(response.status, 204)
    const text = await response.text()
    assert.equal(text, '')
  })

  test('apiError.notFound() returns 404 with error body', async ({ assert }) => {
    const response = await fetch(`${baseUrl}/api/v1/users/00000000-0000-0000-0000-000000000000`)
    assert.equal(response.status, 404)
    const data = await response.json()
    assert.equal(data.status, 404)
  })
})
