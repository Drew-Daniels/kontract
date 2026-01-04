import { test } from '@japa/runner'
import {
  isLucidModel,
  isTypedModel,
  isPaginator,
  hasSerialize,
  serializeTypedModel,
  serializeLucidModel,
  serializePaginator,
  typedModelSerializer,
  lucidModelSerializer,
  paginatorSerializer,
  serializableSerializer,
  lucidSerializers,
} from '../src/serializers/lucid.js'

test.group('Type Guards', () => {
  test('isLucidModel returns true for objects with serialize method', ({ assert }) => {
    const model = {
      serialize: () => ({ id: 1 }),
    }

    assert.isTrue(isLucidModel(model))
  })

  test('isLucidModel returns false for plain objects', ({ assert }) => {
    assert.isFalse(isLucidModel({ id: 1 }))
    assert.isFalse(isLucidModel(null))
    assert.isFalse(isLucidModel(undefined))
  })

  test('isTypedModel returns true for objects with toResponse method', ({ assert }) => {
    const model = {
      toResponse: () => ({ id: 1, name: 'Test' }),
    }

    assert.isTrue(isTypedModel(model))
  })

  test('isTypedModel returns false for plain objects', ({ assert }) => {
    assert.isFalse(isTypedModel({ id: 1 }))
    assert.isFalse(isTypedModel(null))
  })

  test('isPaginator returns true for paginator-like objects', ({ assert }) => {
    const paginator = {
      all: () => [],
      total: 100,
      perPage: 10,
      currentPage: 1,
      lastPage: 10,
      firstPage: 1,
    }

    assert.isTrue(isPaginator(paginator))
  })

  test('isPaginator returns false for incomplete objects', ({ assert }) => {
    assert.isFalse(isPaginator({ total: 100 }))
    assert.isFalse(isPaginator({ all: () => [] }))
    assert.isFalse(isPaginator(null))
  })

  test('hasSerialize returns true for objects with serialize method', ({ assert }) => {
    const obj = {
      serialize: () => ({ data: 'test' }),
    }

    assert.isTrue(hasSerialize(obj))
  })

  test('hasSerialize returns false for plain objects', ({ assert }) => {
    assert.isFalse(hasSerialize({ data: 'test' }))
    assert.isFalse(hasSerialize(null))
  })
})

test.group('Serializers', () => {
  test('serializeTypedModel calls toResponse', ({ assert }) => {
    const model = {
      toResponse: () => ({ id: 1, name: 'Test' }),
    }

    const result = serializeTypedModel(model)

    assert.deepEqual(result, { id: 1, name: 'Test' })
  })

  test('serializeLucidModel calls serialize', ({ assert }) => {
    const model = {
      serialize: () => ({ id: 1, createdAt: '2024-01-01' }),
    }

    const result = serializeLucidModel(model)

    assert.deepEqual(result, { id: 1, createdAt: '2024-01-01' })
  })

  test('serializePaginator returns paginated response format', ({ assert }) => {
    const paginator = {
      all: () => [{ id: 1 }, { id: 2 }],
      total: 50,
      perPage: 10,
      currentPage: 1,
      lastPage: 5,
      firstPage: 1,
    }

    const result = serializePaginator(paginator) as {
      data: unknown[]
      meta: Record<string, unknown>
    }

    assert.isArray(result.data)
    assert.lengthOf(result.data, 2)
    assert.equal(result.meta.total, 50)
    assert.equal(result.meta.perPage, 10)
    assert.equal(result.meta.currentPage, 1)
    assert.equal(result.meta.lastPage, 5)
    assert.equal(result.meta.firstPage, 1)
  })

  test('serializePaginator calls toResponse on TypedModel items', ({ assert }) => {
    const typedModel = {
      toResponse: () => ({ serialized: true }),
    }

    const paginator = {
      all: () => [typedModel],
      total: 1,
      perPage: 10,
      currentPage: 1,
      lastPage: 1,
      firstPage: 1,
    }

    const result = serializePaginator(paginator) as { data: unknown[] }

    assert.deepEqual(result.data[0], { serialized: true })
  })

  test('serializePaginator calls serialize on LucidModel items', ({ assert }) => {
    const lucidModel = {
      serialize: () => ({ fromLucid: true }),
    }

    const paginator = {
      all: () => [lucidModel],
      total: 1,
      perPage: 10,
      currentPage: 1,
      lastPage: 1,
      firstPage: 1,
    }

    const result = serializePaginator(paginator) as { data: unknown[] }

    assert.deepEqual(result.data[0], { fromLucid: true })
  })

  test('serializePaginator passes through plain objects', ({ assert }) => {
    const paginator = {
      all: () => [{ plain: true }],
      total: 1,
      perPage: 10,
      currentPage: 1,
      lastPage: 1,
      firstPage: 1,
    }

    const result = serializePaginator(paginator) as { data: unknown[] }

    assert.deepEqual(result.data[0], { plain: true })
  })
})

test.group('Serializer Registrations', () => {
  test('typedModelSerializer has correct structure', ({ assert }) => {
    assert.isFunction(typedModelSerializer.check)
    assert.isFunction(typedModelSerializer.serialize)
    assert.equal(typedModelSerializer.priority, 100)
  })

  test('lucidModelSerializer has correct structure', ({ assert }) => {
    assert.isFunction(lucidModelSerializer.check)
    assert.isFunction(lucidModelSerializer.serialize)
    assert.equal(lucidModelSerializer.priority, 50)
  })

  test('paginatorSerializer has correct structure', ({ assert }) => {
    assert.isFunction(paginatorSerializer.check)
    assert.isFunction(paginatorSerializer.serialize)
    assert.equal(paginatorSerializer.priority, 150)
  })

  test('serializableSerializer has correct structure', ({ assert }) => {
    assert.isFunction(serializableSerializer.check)
    assert.isFunction(serializableSerializer.serialize)
    assert.equal(serializableSerializer.priority, 25)
  })

  test('lucidSerializers contains all serializers', ({ assert }) => {
    assert.lengthOf(lucidSerializers, 4)
    assert.include(lucidSerializers, paginatorSerializer)
    assert.include(lucidSerializers, typedModelSerializer)
    assert.include(lucidSerializers, lucidModelSerializer)
    assert.include(lucidSerializers, serializableSerializer)
  })

  test('serializer priorities are ordered correctly', ({ assert }) => {
    // Higher priority should be checked first
    // paginator > typedModel > lucidModel > serializable
    assert.isTrue(paginatorSerializer.priority > typedModelSerializer.priority)
    assert.isTrue(typedModelSerializer.priority > lucidModelSerializer.priority)
    assert.isTrue(lucidModelSerializer.priority > serializableSerializer.priority)
  })
})
