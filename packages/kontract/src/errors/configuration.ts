import { OpenApiDecoratorError } from './base.js'

/**
 * Error thrown when configuration is invalid or missing.
 */
export class ConfigurationError extends OpenApiDecoratorError {
  constructor(message: string) {
    super('E_CONFIGURATION', message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error thrown when a required adapter is not registered.
 */
export class AdapterNotFoundError extends OpenApiDecoratorError {
  public readonly adapterType: string

  constructor(adapterType: string) {
    super('E_ADAPTER_NOT_FOUND', `No ${adapterType} adapter registered. Did you forget to configure it?`)
    this.name = 'AdapterNotFoundError'
    this.adapterType = adapterType
  }
}

/**
 * Error thrown when a serializer is not found for a type.
 */
export class SerializerNotFoundError extends OpenApiDecoratorError {
  public readonly typeName: string

  constructor(typeName: string) {
    super('E_SERIALIZER_NOT_FOUND', `No serializer registered for type: ${typeName}`)
    this.name = 'SerializerNotFoundError'
    this.typeName = typeName
  }
}
