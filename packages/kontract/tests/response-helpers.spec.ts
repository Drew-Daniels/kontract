import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import {
  ok,
  created,
  accepted,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  internalServerError,
  respond,
  binary,
} from '../src/response/helpers.js'
import { isBinaryResponse } from '../src/response/types.js'

test.group('Response Helpers', () => {
  test('ok() returns 200 status with data', ({ assert }) => {
    const schema = Type.Object({ name: Type.String() })
    const data = { name: 'Test' }

    const result = ok(schema, data)

    assert.equal(result.status, 200)
    assert.deepEqual(result.data, data)
  })

  test('created() returns 201 status with data', ({ assert }) => {
    const schema = Type.Object({ id: Type.String() })
    const data = { id: '123' }

    const result = created(schema, data)

    assert.equal(result.status, 201)
    assert.deepEqual(result.data, data)
  })

  test('accepted() returns 202 status with data', ({ assert }) => {
    const schema = Type.Object({ jobId: Type.String() })
    const data = { jobId: 'job-123' }

    const result = accepted(schema, data)

    assert.equal(result.status, 202)
    assert.deepEqual(result.data, data)
  })

  test('noContent() returns 204 status with null data', ({ assert }) => {
    const result = noContent()

    assert.equal(result.status, 204)
    assert.isNull(result.data)
  })

  test('badRequest() returns 400 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Invalid input' }

    const result = badRequest(schema, data)

    assert.equal(result.status, 400)
    assert.deepEqual(result.data, data)
  })

  test('unauthorized() returns 401 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Authentication required' }

    const result = unauthorized(schema, data)

    assert.equal(result.status, 401)
    assert.deepEqual(result.data, data)
  })

  test('forbidden() returns 403 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Access denied' }

    const result = forbidden(schema, data)

    assert.equal(result.status, 403)
    assert.deepEqual(result.data, data)
  })

  test('notFound() returns 404 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Resource not found' }

    const result = notFound(schema, data)

    assert.equal(result.status, 404)
    assert.deepEqual(result.data, data)
  })

  test('conflict() returns 409 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Resource already exists' }

    const result = conflict(schema, data)

    assert.equal(result.status, 409)
    assert.deepEqual(result.data, data)
  })

  test('unprocessableEntity() returns 422 status with error data', ({ assert }) => {
    const schema = Type.Object({
      message: Type.String(),
      errors: Type.Array(Type.Object({ field: Type.String(), message: Type.String() })),
    })
    const data = {
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'Invalid email format' }],
    }

    const result = unprocessableEntity(schema, data)

    assert.equal(result.status, 422)
    assert.deepEqual(result.data, data)
  })

  test('internalServerError() returns 500 status with error data', ({ assert }) => {
    const schema = Type.Object({ message: Type.String() })
    const data = { message: 'Internal server error' }

    const result = internalServerError(schema, data)

    assert.equal(result.status, 500)
    assert.deepEqual(result.data, data)
  })

  test('respond() creates response with custom status', ({ assert }) => {
    const schema = Type.Object({ custom: Type.Boolean() })
    const data = { custom: true }

    const result = respond(418, schema, data)

    assert.equal(result.status, 418)
    assert.deepEqual(result.data, data)
  })

  test('binary() creates binary response with buffer', ({ assert }) => {
    const buffer = Buffer.from('test content')

    const result = binary(200, 'application/pdf', buffer)

    assert.equal(result.status, 200)
    assert.equal(result.binary, true)
    assert.equal(result.contentType, 'application/pdf')
    assert.equal(result.data, buffer)
    assert.isUndefined(result.filename)
  })

  test('binary() creates binary response with filename', ({ assert }) => {
    const buffer = Buffer.from('test content')

    const result = binary(200, 'application/pdf', buffer, 'document.pdf')

    assert.equal(result.filename, 'document.pdf')
  })

  test('binary() creates binary response with string data', ({ assert }) => {
    const content = 'plain text content'

    const result = binary(200, 'text/plain', content)

    assert.equal(result.data, content)
    assert.equal(result.contentType, 'text/plain')
  })

  test('isBinaryResponse() returns true for binary responses', ({ assert }) => {
    const buffer = Buffer.from('test')
    const response = binary(200, 'application/octet-stream', buffer)

    assert.isTrue(isBinaryResponse(response))
  })

  test('isBinaryResponse() returns false for regular responses', ({ assert }) => {
    const schema = Type.Object({ id: Type.String() })
    const response = ok(schema, { id: '123' })

    assert.isFalse(isBinaryResponse(response))
  })

  test('isBinaryResponse() returns false for null', ({ assert }) => {
    assert.isFalse(isBinaryResponse(null))
  })

  test('isBinaryResponse() returns false for undefined', ({ assert }) => {
    assert.isFalse(isBinaryResponse(undefined))
  })

  test('isBinaryResponse() returns false for plain objects', ({ assert }) => {
    assert.isFalse(isBinaryResponse({ status: 200, data: {} }))
  })

  test('isBinaryResponse() returns false for objects with binary: false', ({ assert }) => {
    assert.isFalse(isBinaryResponse({ status: 200, binary: false, data: {} }))
  })
})
