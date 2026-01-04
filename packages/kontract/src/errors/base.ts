/**
 * Base error class for all kontract errors.
 */
export class OpenApiDecoratorError extends Error {
  public readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'OpenApiDecoratorError'
    this.code = code
    Error.captureStackTrace?.(this, this.constructor)
  }
}
