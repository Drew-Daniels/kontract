import type { OpenApiDecoratorConfig, UserConfig } from './types.js'
import { mergeWithDefaults } from './defaults.js'
import { configureResponses } from '../response/helpers.js'
import { ConfigurationError } from '../errors/configuration.js'

/**
 * Global configuration store.
 */
let globalConfig: OpenApiDecoratorConfig | null = null

/**
 * Define and register the OpenAPI decorator configuration.
 *
 * This function should be called once at application startup,
 * before any decorated controllers are loaded.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'kontract'
 *
 * defineConfig({
 *   openapi: {
 *     info: {
 *       title: 'My API',
 *       version: '1.0.0',
 *       description: 'A great API',
 *     },
 *     servers: [
 *       { url: 'https://api.example.com', description: 'Production' },
 *     ],
 *   },
 *   runtime: {
 *     validateResponses: process.env.NODE_ENV !== 'production',
 *     validateRequests: true,
 *   },
 *   validator: myAjvValidator,
 * })
 * ```
 */
export function defineConfig(userConfig: UserConfig): OpenApiDecoratorConfig {
  const config = mergeWithDefaults(userConfig)

  // Configure response helpers with validation settings
  configureResponses({
    validateResponses: config.runtime.validateResponses ?? false,
    validator: config.validator,
  })

  globalConfig = config
  return config
}

/**
 * Get the current configuration.
 * @throws ConfigurationError if config hasn't been set
 */
export function getConfig(): OpenApiDecoratorConfig {
  if (!globalConfig) {
    throw new ConfigurationError(
      'Configuration not initialized. Call defineConfig() before using decorators.',
    )
  }
  return globalConfig
}

/**
 * Get the current configuration, or undefined if not set.
 * Useful for checking if the library has been configured.
 */
export function getConfigOrUndefined(): OpenApiDecoratorConfig | undefined {
  return globalConfig ?? undefined
}

/**
 * Check if the library has been configured.
 */
export function isConfigured(): boolean {
  return globalConfig !== null
}

/**
 * Reset configuration (useful for testing).
 */
export function resetConfig(): void {
  globalConfig = null
  configureResponses({
    validateResponses: false,
    validator: undefined,
  })
}
