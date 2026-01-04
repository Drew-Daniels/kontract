/**
 * Tests for path parameter extraction utilities.
 */
import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import {
  extractParamNames,
  createParamsSchema,
  getParamsSchema,
  type ExtractRouteParams,
  type HasPathParams,
  type ParamsFromPath,
} from '../src/builder/path-params.js'

// =============================================================================
// Type-Level Tests (compile-time validation)
// =============================================================================

// These types are tested at compile time - if they're wrong, TypeScript will error
type _TestExtractSingle = ExtractRouteParams<'/users/:id'> extends 'id' ? true : false
type _TestExtractMultiple = ExtractRouteParams<'/users/:userId/posts/:postId'> extends 'userId' | 'postId' ? true : false
type _TestExtractNone = ExtractRouteParams<'/users'> extends never ? true : false

type _TestHasParamsTrue = HasPathParams<'/users/:id'> extends true ? true : false
type _TestHasParamsFalse = HasPathParams<'/users'> extends false ? true : false

type _TestParamsFromPathSingle = ParamsFromPath<'/users/:id'> extends { id: string } ? true : false
type _TestParamsFromPathMulti = ParamsFromPath<'/users/:userId/posts/:postId'> extends { userId: string; postId: string } ? true : false
type _TestParamsFromPathNone = ParamsFromPath<'/users'> extends undefined ? true : false

// Ensure the tests pass at compile time
const _typeTests: [
  _TestExtractSingle,
  _TestExtractMultiple,
  _TestExtractNone,
  _TestHasParamsTrue,
  _TestHasParamsFalse,
  _TestParamsFromPathSingle,
  _TestParamsFromPathMulti,
  _TestParamsFromPathNone,
] = [true, true, true, true, true, true, true, true]

// =============================================================================
// Runtime Tests
// =============================================================================

test.group('extractParamNames', () => {
  test('extracts single param', ({ assert }) => {
    assert.deepEqual(extractParamNames('/users/:id'), ['id'])
  })

  test('extracts multiple params', ({ assert }) => {
    assert.deepEqual(extractParamNames('/users/:userId/posts/:postId'), ['userId', 'postId'])
  })

  test('returns empty array for paths without params', ({ assert }) => {
    assert.deepEqual(extractParamNames('/users'), [])
  })

  test('handles params at the end of path', ({ assert }) => {
    assert.deepEqual(extractParamNames('/api/v1/users/:id'), ['id'])
  })

  test('handles multiple segments between params', ({ assert }) => {
    assert.deepEqual(
      extractParamNames('/users/:userId/posts/:postId/comments/:commentId'),
      ['userId', 'postId', 'commentId'],
    )
  })

  test('handles param at start of path', ({ assert }) => {
    assert.deepEqual(extractParamNames('/:version/users'), ['version'])
  })
})

test.group('createParamsSchema', () => {
  test('creates schema for single param', ({ assert }) => {
    const schema = createParamsSchema(['id'])
    assert.isDefined(schema)
    assert.property(schema?.properties ?? {}, 'id')
    assert.equal((schema?.properties as Record<string, { type: string }>).id?.type, 'string')
  })

  test('creates schema for multiple params', ({ assert }) => {
    const schema = createParamsSchema(['userId', 'postId'])
    assert.isDefined(schema)
    assert.property(schema?.properties ?? {}, 'userId')
    assert.property(schema?.properties ?? {}, 'postId')
  })

  test('returns undefined for empty array', ({ assert }) => {
    const schema = createParamsSchema([])
    assert.isUndefined(schema)
  })

  test('marks all properties as required', ({ assert }) => {
    const schema = createParamsSchema(['id', 'name'])
    assert.include(schema?.required ?? [], 'id')
    assert.include(schema?.required ?? [], 'name')
  })
})

test.group('getParamsSchema', () => {
  test('returns explicit schema when provided', ({ assert }) => {
    const explicit = Type.Object({ id: Type.String({ format: 'uuid' }) })
    const schema = getParamsSchema('/users/:id', explicit)
    assert.strictEqual(schema, explicit)
  })

  test('generates schema from path when no explicit schema', ({ assert }) => {
    const schema = getParamsSchema('/users/:id')
    assert.isDefined(schema)
    assert.property(schema?.properties ?? {}, 'id')
  })

  test('returns undefined for paths without params and no explicit schema', ({ assert }) => {
    const schema = getParamsSchema('/users')
    assert.isUndefined(schema)
  })
})
