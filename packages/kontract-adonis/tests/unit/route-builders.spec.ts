/**
 * Unit tests for route builders (get, post, put, patch, del).
 */
import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import { get, post, put, patch, del } from '../../src/index.js'

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
})

const QuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
})

test.group('Route Builders - get()', () => {
  test('creates a GET route definition', ({ assert }) => {
    const route = get('/users',
      async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      { responses: { 200: { schema: UserSchema } } },
    )

    assert.equal(route.__type, 'route')
    assert.equal(route.method, 'get')
    assert.equal(route.path, '/users')
    assert.isFunction(route.handler)
  })

  test('infers path params from route', ({ assert }) => {
    const route = get('/users/:id',
      async ({ params, reply }) => {
        // params.id should be inferred as string
        return reply.ok({ id: params.id, name: 'Test' })
      },
      { responses: { 200: { schema: UserSchema } } },
    )

    assert.equal(route.path, '/users/:id')
  })

  test('accepts query schema', ({ assert }) => {
    const route = get('/users',
      async ({ query, reply }) => reply.ok({ id: '1', name: 'Test' }),
      {
        query: QuerySchema,
        responses: { 200: { schema: UserSchema } },
      },
    )

    assert.equal(route.config.query, QuerySchema)
  })

  test('accepts middleware', ({ assert }) => {
    const middleware = [() => {}]
    const route = get('/users',
      async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      {
        middleware,
        responses: { 200: { schema: UserSchema } },
      },
    )

    assert.deepEqual(route.middleware, middleware)
  })
})

test.group('Route Builders - post()', () => {
  test('creates a POST route definition', ({ assert }) => {
    const route = post('/users',
      async ({ body, reply }) => reply.created({ id: '1', name: body.name }),
      {
        body: CreateUserSchema,
        responses: { 201: { schema: UserSchema } },
      },
    )

    assert.equal(route.__type, 'route')
    assert.equal(route.method, 'post')
    assert.equal(route.path, '/users')
    assert.equal(route.config.body, CreateUserSchema)
  })
})

test.group('Route Builders - put()', () => {
  test('creates a PUT route definition', ({ assert }) => {
    const route = put('/users/:id',
      async ({ params, body, reply }) => reply.ok({ id: params.id, name: body.name }),
      {
        body: CreateUserSchema,
        responses: { 200: { schema: UserSchema } },
      },
    )

    assert.equal(route.__type, 'route')
    assert.equal(route.method, 'put')
    assert.equal(route.path, '/users/:id')
  })
})

test.group('Route Builders - patch()', () => {
  test('creates a PATCH route definition', ({ assert }) => {
    const route = patch('/users/:id',
      async ({ params, body, reply }) => reply.ok({ id: params.id, name: body.name }),
      {
        body: CreateUserSchema,
        responses: { 200: { schema: UserSchema } },
      },
    )

    assert.equal(route.__type, 'route')
    assert.equal(route.method, 'patch')
    assert.equal(route.path, '/users/:id')
  })
})

test.group('Route Builders - del()', () => {
  test('creates a DELETE route definition', ({ assert }) => {
    const route = del('/users/:id',
      async () => {
        // Return noContent response
        return { __type: 'response' as const, status: 204, data: null }
      },
      { responses: { 204: null } },
    )

    assert.equal(route.__type, 'route')
    assert.equal(route.method, 'delete')
    assert.equal(route.path, '/users/:id')
  })
})
