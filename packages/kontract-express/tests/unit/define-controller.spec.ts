/**
 * Unit tests for defineController.
 */
import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import { defineController, get, post } from '../../src/index.js'

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
})

test.group('defineController', () => {
  test('creates a controller with config', ({ assert }) => {
    const controller = defineController({
      tag: 'Users',
      description: 'User management',
    }, {
      list: get('/users',
        { responses: { 200: { schema: UserSchema } } },
        async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      ),
    })

    assert.equal(controller.__type, 'controller')
    assert.equal(controller.config.tag, 'Users')
    assert.equal(controller.config.description, 'User management')
  })

  test('includes all routes in the controller', ({ assert }) => {
    const controller = defineController({
      tag: 'Users',
    }, {
      list: get('/users',
        { responses: { 200: { schema: UserSchema } } },
        async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      ),
      create: post('/users',
        { body: Type.Object({ name: Type.String() }), responses: { 201: { schema: UserSchema } } },
        async ({ reply }) => reply.created({ id: '1', name: 'Test' }),
      ),
    })

    assert.property(controller.routes, 'list')
    assert.property(controller.routes, 'create')
  })

  test('stores prefix in config', ({ assert }) => {
    const controller = defineController({
      tag: 'API',
      prefix: '/api/v1',
    }, {
      health: get('/health',
        { responses: { 200: { schema: UserSchema } } },
        async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      ),
    })

    assert.equal(controller.config.prefix, '/api/v1')
  })

  test('routes have correct __type marker', ({ assert }) => {
    const controller = defineController({
      tag: 'Test',
    }, {
      list: get('/items',
        { responses: { 200: { schema: UserSchema } } },
        async ({ reply }) => reply.ok({ id: '1', name: 'Test' }),
      ),
    })

    assert.equal(controller.routes.list.__type, 'route')
  })
})
