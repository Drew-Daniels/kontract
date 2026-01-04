/**
 * Unit tests for registerController.
 */
import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import { defineController, get, post, del, registerController } from '../../src/index.js'

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
})

// Create a test controller
const testController = defineController({
  tag: 'Test',
  description: 'Test controller',
}, {
  listUsers: get('/api/users',
    { responses: { 200: { schema: UserSchema } } },
    async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
  ),
  createUser: post('/api/users',
    { body: CreateUserSchema, responses: { 201: { schema: UserSchema } } },
    async ({ body, reply }) => reply.created({ id: '1', name: body.name }),
  ),
  deleteUser: del('/api/users/:id',
    { responses: { 204: null } },
    async () => ({ __type: 'response' as const, status: 204, data: null }),
  ),
})

/**
 * Create a mock AdonisJS router that tracks registered routes.
 */
function createMockRouter() {
  const registeredRoutes: Array<{
    method: string
    path: string
    handler: unknown
  }> = []

  const createMethod = (method: string) => (path: string, handler: unknown) => {
    registeredRoutes.push({ method, path, handler })
    return { use: () => {} }
  }

  return {
    registeredRoutes,
    get: createMethod('get'),
    post: createMethod('post'),
    put: createMethod('put'),
    patch: createMethod('patch'),
    delete: createMethod('delete'),
  }
}

test.group('registerController', () => {
  test('registers all routes from a controller', ({ assert }) => {
    const router = createMockRouter()

    // @ts-expect-error - mock router doesn't fully implement Router interface
    registerController(router, testController)

    assert.lengthOf(router.registeredRoutes, 3)
  })

  test('registers routes with correct methods', ({ assert }) => {
    const router = createMockRouter()

    // @ts-expect-error - mock router doesn't fully implement Router interface
    registerController(router, testController)

    const methods = router.registeredRoutes.map((r) => r.method)
    assert.includeMembers(methods, ['get', 'post', 'delete'])
  })

  test('registers routes with correct paths', ({ assert }) => {
    const router = createMockRouter()

    // @ts-expect-error - mock router doesn't fully implement Router interface
    registerController(router, testController)

    const paths = router.registeredRoutes.map((r) => r.path)
    assert.includeMembers(paths, ['/api/users', '/api/users', '/api/users/:id'])
  })

  test('creates handlers for each route', ({ assert }) => {
    const router = createMockRouter()

    // @ts-expect-error - mock router doesn't fully implement Router interface
    registerController(router, testController)

    for (const route of router.registeredRoutes) {
      assert.isFunction(route.handler)
    }
  })
})

test.group('registerController - with prefix', () => {
  test('applies controller prefix to routes', ({ assert }) => {
    const prefixedController = defineController({
      tag: 'Prefixed',
      prefix: '/v2',
    }, {
      list: get('/items',
        { responses: { 200: { schema: UserSchema } } },
        async ({ reply }) => reply.ok({ id: '1', name: 'Item' }),
      ),
    })

    const router = createMockRouter()

    // @ts-expect-error - mock router doesn't fully implement Router interface
    registerController(router, prefixedController)

    assert.equal(router.registeredRoutes[0].path, '/v2/items')
  })
})
