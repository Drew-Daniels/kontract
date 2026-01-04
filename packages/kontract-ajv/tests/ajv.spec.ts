import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import {
  createAjvValidator,
  validate,
  AjvValidationError,
  stripNestedIds,
  resetDefaultValidator,
} from '../src/index.js'

test.group('createAjvValidator', (group) => {
  group.each.setup(() => {
    resetDefaultValidator()
  })

  test('validates data against schema', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      name: Type.String(),
      age: Type.Integer(),
    })

    const errors = validator.validate(schema, { name: 'John', age: 30 })

    assert.lengthOf(errors, 0)
  })

  test('returns errors for invalid data', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      email: Type.String({ format: 'email' }),
    })

    const errors = validator.validate(schema, { email: 'not-an-email' })

    assert.isTrue(errors.length > 0)
    assert.equal(errors[0].field, 'email')
  })

  test('returns error for missing required field', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      name: Type.String(),
    })

    const errors = validator.validate(schema, {})

    assert.isTrue(errors.length > 0)
    assert.equal(errors[0].field, 'name')
  })

  test('coerces types by default', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      count: Type.Integer(),
    })

    const data = { count: '42' }
    const errors = validator.validate(schema, data)

    assert.lengthOf(errors, 0)
    assert.equal(data.count, 42) // Coerced to integer
  })

  test('removes additional properties when schema disallows them', ({ assert }) => {
    const validator = createAjvValidator()
    // additionalProperties: false is needed for removeAdditional to work
    const schema = Type.Object(
      { name: Type.String() },
      { additionalProperties: false },
    )

    const data = { name: 'John', extra: 'field' }
    validator.validate(schema, data)

    assert.isUndefined((data as Record<string, unknown>).extra)
  })

  test('applies defaults by default', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      status: Type.String({ default: 'active' }),
    })

    const data: Record<string, unknown> = {}
    validator.validate(schema, data)

    assert.equal(data.status, 'active')
  })

  test('validateOrThrow throws on invalid data', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      id: Type.String({ format: 'uuid' }),
    })

    assert.throws(
      () => validator.validateOrThrow(schema, { id: 'not-uuid' }),
      /validation failed/i,
    )
  })

  test('validateOrThrow does not throw on valid data', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      name: Type.String(),
    })

    assert.doesNotThrow(() =>
      validator.validateOrThrow(schema, { name: 'John' }),
    )
  })

  test('compile returns reusable validator', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      value: Type.Integer({ minimum: 0 }),
    })

    const compiled = validator.compile(schema)

    assert.lengthOf(compiled.validate({ value: 10 }), 0)
    assert.isTrue(compiled.validate({ value: -1 }).length > 0)
  })

  test('compiled validator validateOrThrow works', ({ assert }) => {
    const validator = createAjvValidator()
    const schema = Type.Object({
      value: Type.Integer(),
    })

    const compiled = validator.compile(schema)

    assert.throws(
      () => compiled.validateOrThrow({ value: 'not-number' }),
      /validation failed/i,
    )
  })
})

test.group('validate function', (group) => {
  group.each.setup(() => {
    resetDefaultValidator()
  })

  test('returns data on valid input', ({ assert }) => {
    const schema = Type.Object({
      name: Type.String(),
    })

    const result = validate(schema, { name: 'Test' })

    assert.deepEqual(result, { name: 'Test' })
  })

  test('throws AjvValidationError on invalid input', ({ assert }) => {
    const schema = Type.Object({
      age: Type.Integer({ minimum: 0 }),
    })

    try {
      validate(schema, { age: -5 })
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.instanceOf(error, AjvValidationError)
      assert.equal((error as AjvValidationError).status, 422)
      assert.equal((error as AjvValidationError).code, 'E_VALIDATION')
    }
  })
})

test.group('AjvValidationError', () => {
  test('has correct properties', ({ assert }) => {
    const errors = [
      { field: 'email', message: 'Invalid format' },
      { field: 'age', message: 'Must be positive' },
    ]

    const error = new AjvValidationError(errors)

    assert.equal(error.name, 'AjvValidationError')
    assert.equal(error.message, 'Validation failed')
    assert.equal(error.status, 422)
    assert.equal(error.code, 'E_VALIDATION')
    assert.deepEqual(error.errors, errors)
  })
})

test.group('stripNestedIds', () => {
  test('preserves root $id', ({ assert }) => {
    const schema = Type.Object(
      { name: Type.String() },
      { $id: 'RootSchema' },
    )

    const result = stripNestedIds(schema)

    assert.equal(result.$id, 'RootSchema')
  })

  test('removes nested $id', ({ assert }) => {
    const NestedSchema = Type.Object(
      { value: Type.String() },
      { $id: 'NestedSchema' },
    )
    const schema = Type.Object({
      nested: NestedSchema,
    })

    const result = stripNestedIds(schema)
    const nestedResult = result.properties?.nested as Record<string, unknown>

    assert.isUndefined(nestedResult.$id)
  })

  test('handles arrays', ({ assert }) => {
    const ItemSchema = Type.Object(
      { id: Type.String() },
      { $id: 'ItemSchema' },
    )
    const schema = Type.Array(ItemSchema)

    const result = stripNestedIds(schema)
    const itemsResult = result.items as Record<string, unknown>

    assert.isUndefined(itemsResult.$id)
  })

  test('handles null and primitives', ({ assert }) => {
    assert.equal(stripNestedIds(null as unknown as typeof Type.String), null)
    assert.equal(stripNestedIds('string' as unknown as typeof Type.String), 'string')
  })
})
