/* cspell:words paginators */

/**
 * Interface for Lucid-like models with serialize method.
 */
export interface SerializableModel {
  serialize(): Record<string, unknown>
}

/**
 * Interface for models with toResponse() method.
 * This matches the TypedModel pattern from the blog-api.
 */
export interface ResponseModel {
  toResponse(): unknown
}

/**
 * Interface for Lucid-like paginators.
 */
export interface PaginatorLike {
  all(): unknown[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

/**
 * Check if a value is a Lucid model (has serialize method).
 */
export function isLucidModel(value: unknown): value is SerializableModel {
  return (
    value !== null
    && typeof value === 'object'
    && 'serialize' in value
    && typeof (value as SerializableModel).serialize === 'function'
  )
}

/**
 * Check if a value is a TypedModel (has toResponse method).
 */
export function isTypedModel(value: unknown): value is ResponseModel {
  return (
    value !== null
    && typeof value === 'object'
    && 'toResponse' in value
    && typeof (value as ResponseModel).toResponse === 'function'
  )
}

/**
 * Check if a value is a Lucid paginator.
 */
export function isPaginator(value: unknown): value is PaginatorLike {
  return (
    value !== null
    && typeof value === 'object'
    && 'total' in value
    && 'currentPage' in value
    && 'perPage' in value
    && 'all' in value
    && typeof (value as PaginatorLike).all === 'function'
  )
}

/**
 * Serializer for TypedModel instances.
 * Calls toResponse() to get the API response format.
 */
export function serializeTypedModel(model: ResponseModel): unknown {
  return model.toResponse()
}

/**
 * Serializer for generic Lucid models.
 * Calls serialize() to get the model data.
 */
export function serializeLucidModel(model: SerializableModel): unknown {
  return model.serialize()
}

/**
 * Serializer for Lucid paginators.
 * Converts to standard paginated response format.
 */
export function serializePaginator(paginator: PaginatorLike): unknown {
  const items = paginator.all()
  const data = items.map((model) => {
    if (isTypedModel(model)) {
      return model.toResponse()
    }
    if (isLucidModel(model)) {
      return model.serialize()
    }
    return model
  })

  return {
    data,
    meta: {
      total: paginator.total,
      perPage: paginator.perPage,
      currentPage: paginator.currentPage,
      lastPage: paginator.lastPage,
      firstPage: paginator.firstPage,
    },
  }
}

/**
 * Check if a value has a serialize() method (like VersionRecord).
 */
export function hasSerialize(
  value: unknown,
): value is { serialize: () => Record<string, unknown> } {
  return (
    value !== null
    && typeof value === 'object'
    && 'serialize' in value
    && typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

/**
 * Serializer registration objects for use with defineConfig().
 */
export const typedModelSerializer = {
  check: isTypedModel,
  serialize: serializeTypedModel,
  priority: 100,
}

export const lucidModelSerializer = {
  check: isLucidModel,
  serialize: serializeLucidModel,
  priority: 50,
}

export const paginatorSerializer = {
  check: isPaginator,
  serialize: serializePaginator,
  priority: 150,
}

export const serializableSerializer = {
  check: hasSerialize,
  serialize: (obj: { serialize: () => unknown }) => obj.serialize(),
  priority: 25,
}

/**
 * All Lucid-related serializers.
 * Register these with defineConfig() to enable automatic model serialization.
 */
export const lucidSerializers = [
  paginatorSerializer,
  typedModelSerializer,
  lucidModelSerializer,
  serializableSerializer,
]
