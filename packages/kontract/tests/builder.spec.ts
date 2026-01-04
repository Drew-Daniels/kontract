import { test } from '@japa/runner'
import { Type, Static } from '@sinclair/typebox'
import {
  defineRoute,
  defineController,
  isRouteDefinition,
  isControllerDefinition,
  getControllerRoutes,
  ok,
  created,
  noContent,
} from '../src/index.js'

// Test schemas
const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
})

const CreateUserRequest = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
})

const UserParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

const PaginationQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
})

test.group('defineRoute', () => {
  test('parses route string correctly', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users',
      responses: { 200: { schema: UserSchema } },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.equal(endpoint.method, 'get')
    assert.equal(endpoint.path, '/api/users')
  })

  test('parses different HTTP methods', ({ assert }) => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

    for (const method of methods) {
      const endpoint = defineRoute({
        route: `${method} /test` as `${typeof method} /test`,
        responses: { 200: null },
      }, async () => noContent())

      assert.equal(endpoint.method, method.toLowerCase())
    }
  })

  test('stores body schema', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'POST /api/users',
      body: CreateUserRequest,
      responses: { 201: { schema: UserSchema } },
    }, async () => created(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.deepEqual(endpoint.config.body, CreateUserRequest)
  })

  test('stores query schema', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users',
      query: PaginationQuery,
      responses: { 200: { schema: UserSchema } },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.deepEqual(endpoint.config.query, PaginationQuery)
  })

  test('stores params schema', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users/:id',
      params: UserParams,
      responses: { 200: { schema: UserSchema } },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.deepEqual(endpoint.config.params, UserParams)
  })

  test('stores auth level', ({ assert }) => {
    const required = defineRoute({
      route: 'GET /protected',
      auth: 'required',
      responses: { 200: null },
    }, async () => noContent())

    const optional = defineRoute({
      route: 'GET /optional',
      auth: 'optional',
      responses: { 200: null },
    }, async () => noContent())

    assert.equal(required.config.auth, 'required')
    assert.equal(optional.config.auth, 'optional')
  })

  test('normalizes response definitions', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users/:id',
      responses: {
        200: { schema: UserSchema, description: 'The user' },
        204: null,
        404: UserSchema, // Shorthand
      },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.deepEqual(endpoint.responses[200], { schema: UserSchema, description: 'The user' })
    assert.deepEqual(endpoint.responses[204], { schema: null })
    assert.deepEqual(endpoint.responses[404], { schema: UserSchema })
  })

  test('stores summary and description', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users',
      summary: 'List users',
      description: 'Returns a paginated list of users',
      responses: { 200: { schema: UserSchema } },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    assert.equal(endpoint.config.summary, 'List users')
    assert.equal(endpoint.config.description, 'Returns a paginated list of users')
  })

  test('stores deprecated flag', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/legacy',
      deprecated: true,
      responses: { 200: null },
    }, async () => noContent())

    assert.isTrue(endpoint.config.deprecated)
  })

  test('has __type discriminator', ({ assert }) => {
    const route = defineRoute({
      route: 'GET /test',
      responses: { 200: null },
    }, async () => noContent())

    assert.equal(route.__type, 'route')
  })

  test('handler is callable', async ({ assert }) => {
    const endpoint = defineRoute({
      route: 'POST /api/users',
      body: CreateUserRequest,
      responses: { 201: { schema: UserSchema } },
    }, async ({ body }) => {
      return created(UserSchema, {
        id: '123',
        name: body.name,
        email: body.email,
      })
    })

    const result = await endpoint.handler({
      body: { name: 'John', email: 'john@test.com' },
      query: undefined,
      params: undefined,
      user: undefined,
      raw: {},
    })

    assert.equal(result.status, 201)
    assert.deepEqual(result.data, {
      id: '123',
      name: 'John',
      email: 'john@test.com',
    })
  })
})

test.group('isRouteDefinition', () => {
  test('returns true for endpoint definitions', ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /test',
      responses: { 200: null },
    }, async () => noContent())

    assert.isTrue(isRouteDefinition(endpoint))
  })

  test('returns false for non-endpoint values', ({ assert }) => {
    assert.isFalse(isRouteDefinition(null))
    assert.isFalse(isRouteDefinition(undefined))
    assert.isFalse(isRouteDefinition({}))
    assert.isFalse(isRouteDefinition({ __type: 'other' }))
  })
})

test.group('defineController', () => {
  test('stores configuration', ({ assert }) => {
    const controller = defineController({
      tag: 'Users',
      description: 'User management',
      prefix: '/api/v1',
    }, {})

    assert.equal(controller.config.tag, 'Users')
    assert.equal(controller.config.description, 'User management')
    assert.equal(controller.config.prefix, '/api/v1')
  })

  test('stores endpoints', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: { 200: { schema: UserSchema } },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    const createUser = defineRoute({
      route: 'POST /users',
      body: CreateUserRequest,
      responses: { 201: { schema: UserSchema } },
    }, async () => created(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    const controller = defineController({
      tag: 'Users',
    }, {
      getUser,
      createUser,
    })

    assert.property(controller.routes, 'getUser')
    assert.property(controller.routes, 'createUser')
    assert.equal(controller.routes.getUser.method, 'get')
    assert.equal(controller.routes.createUser.method, 'post')
  })

  test('has __type discriminator', ({ assert }) => {
    const controller = defineController({
      tag: 'Test',
    }, {})

    assert.equal(controller.__type, 'controller')
  })
})

test.group('isControllerDefinition', () => {
  test('returns true for controller definitions', ({ assert }) => {
    const controller = defineController({
      tag: 'Test',
    }, {})

    assert.isTrue(isControllerDefinition(controller))
  })

  test('returns false for non-controller values', ({ assert }) => {
    assert.isFalse(isControllerDefinition(null))
    assert.isFalse(isControllerDefinition(undefined))
    assert.isFalse(isControllerDefinition({}))
    assert.isFalse(isControllerDefinition({ __type: 'route' }))
  })
})

test.group('getControllerRoutes', () => {
  test('returns endpoints with full paths', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: { 200: null },
    }, async () => noContent())

    const controller = defineController({
      tag: 'Users',
    }, {
      getUser,
    })

    const endpoints = getControllerRoutes(controller)

    assert.lengthOf(endpoints, 1)
    assert.equal(endpoints[0].name, 'getUser')
    assert.equal(endpoints[0].fullPath, '/users/:id')
  })

  test('applies prefix to paths', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: { 200: null },
    }, async () => noContent())

    const controller = defineController({
      tag: 'Users',
      prefix: '/api/v1',
    }, {
      getUser,
    })

    const endpoints = getControllerRoutes(controller)

    assert.equal(endpoints[0].fullPath, '/api/v1/users/:id')
  })
})

test.group('Type Inference (compile-time)', () => {
  // These tests verify that TypeScript correctly infers types.
  // They will fail at compile time if type inference is broken.

  test('body type is inferred from schema', async ({ assert }) => {
    const endpoint = defineRoute({
      route: 'POST /api/users',
      body: CreateUserRequest,
      responses: { 201: { schema: UserSchema } },
    }, async ({ body }) => {
      // TypeScript should infer body as { name: string; email: string }
      const _name: string = body.name
      const _email: string = body.email
      return created(UserSchema, { id: '1', name: body.name, email: body.email })
    })

    assert.exists(endpoint)
  })

  test('query type is inferred from schema', async ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users',
      query: PaginationQuery,
      responses: { 200: { schema: UserSchema } },
    }, async ({ query }) => {
      // TypeScript should infer query as { page?: number; limit?: number }
      const _page: number | undefined = query.page
      const _limit: number | undefined = query.limit
      return ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' })
    })

    assert.exists(endpoint)
  })

  test('params type is inferred from schema', async ({ assert }) => {
    const endpoint = defineRoute({
      route: 'GET /api/users/:id',
      params: UserParams,
      responses: { 200: { schema: UserSchema } },
    }, async ({ params }) => {
      // TypeScript should infer params as { id: string }
      const _id: string = params.id
      return ok(UserSchema, { id: params.id, name: 'Test', email: 'test@test.com' })
    })

    assert.exists(endpoint)
  })

  test('all context properties are typed together', async ({ assert }) => {
    const endpoint = defineRoute({
      route: 'POST /api/users/:id',
      body: CreateUserRequest,
      query: PaginationQuery,
      params: UserParams,
      responses: { 200: { schema: UserSchema } },
    }, async ({ body, query, params }) => {
      // All should be correctly typed
      const _name: string = body.name
      const _page: number | undefined = query.page
      const _id: string = params.id
      return ok(UserSchema, { id: params.id, name: body.name, email: body.email })
    })

    assert.exists(endpoint)
  })
})
