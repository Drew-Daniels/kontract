import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import {
  RequestValidationError,
  ConfigurationError,
} from '../src/errors/index.js'

test.group('RequestValidationError', () => {
  test('creates error with schema, data, and errors', ({ assert }) => {
    const schema = Type.Object({ email: Type.String({ format: 'email' }) })
    const data = { email: 'invalid' }
    const errors = [{ field: 'email', message: 'Invalid email format' }]

    const error = new RequestValidationError(schema, data, errors, 'body')

    assert.instanceOf(error, Error)
    assert.equal(error.name, 'RequestValidationError')
    assert.equal(error.status, 422)
    assert.equal(error.code, 'E_VALIDATION_ERROR')
    assert.equal(error.source, 'body')
    assert.deepEqual(error.schema, schema)
    assert.deepEqual(error.data, data)
    assert.deepEqual(error.errors, errors)
  })

  test('message includes source and schema info', ({ assert }) => {
    const schema = Type.Object({ email: Type.String() }, { $id: 'UserInput' })
    const errors = [{ field: 'email', message: 'Required' }]

    const error = new RequestValidationError(schema, {}, errors, 'body')

    assert.include(error.message, 'body')
    assert.include(error.message, 'UserInput')
  })

  test('supports query source', ({ assert }) => {
    const schema = Type.Object({ page: Type.Integer() })
    const data = { page: 'abc' }
    const errors = [{ field: 'page', message: 'Must be an integer' }]

    const error = new RequestValidationError(schema, data, errors, 'query')

    assert.equal(error.source, 'query')
  })

  test('supports params source', ({ assert }) => {
    const schema = Type.Object({ id: Type.String({ format: 'uuid' }) })
    const data = { id: 'not-a-uuid' }
    const errors = [{ field: 'id', message: 'Must be a valid UUID' }]

    const error = new RequestValidationError(schema, data, errors, 'params')

    assert.equal(error.source, 'params')
  })

  test('toResponse() returns structured error response', ({ assert }) => {
    const schema = Type.Object({ name: Type.String() })
    const data = {}
    const errors = [{ field: 'name', message: 'Required field' }]

    const error = new RequestValidationError(schema, data, errors, 'body')
    const response = error.toResponse()

    assert.equal(response.status, 422)
    assert.equal(response.code, 'E_VALIDATION_ERROR')
    assert.equal(response.message, 'Validation failed')
    assert.deepEqual(response.errors, errors)
  })

  test('handles multiple validation errors', ({ assert }) => {
    const schema = Type.Object({
      email: Type.String({ format: 'email' }),
      age: Type.Integer({ minimum: 0 }),
    })
    const data = { email: 'bad', age: -5 }
    const errors = [
      { field: 'email', message: 'Invalid email format' },
      { field: 'age', message: 'Must be at least 0' },
    ]

    const error = new RequestValidationError(schema, data, errors, 'body')

    assert.lengthOf(error.errors, 2)
  })
})

test.group('ConfigurationError', () => {
  test('creates error with message', ({ assert }) => {
    const error = new ConfigurationError('Missing required configuration')

    assert.instanceOf(error, Error)
    assert.equal(error.name, 'ConfigurationError')
    assert.equal(error.message, 'Missing required configuration')
    assert.equal(error.code, 'E_CONFIGURATION')
  })

  test('includes config key in message', ({ assert }) => {
    const error = new ConfigurationError('Invalid value for "apiKey"')

    assert.include(error.message, 'apiKey')
  })
})
