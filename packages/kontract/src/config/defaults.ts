import type { OpenApiDecoratorConfig } from './types.js'

/**
 * Default runtime configuration values.
 */
export const defaultRuntimeConfig: Required<OpenApiDecoratorConfig['runtime']> = {
  validateResponses: false,
  validateRequests: true,
  stripUnknownProperties: false,
}

/**
 * Merge user config with defaults.
 */
export function mergeWithDefaults(
  userConfig: Partial<OpenApiDecoratorConfig>,
): OpenApiDecoratorConfig {
  return {
    openapi: userConfig.openapi ?? {
      info: {
        title: 'API',
        version: '1.0.0',
      },
    },
    runtime: {
      ...defaultRuntimeConfig,
      ...userConfig.runtime,
    },
    validator: userConfig.validator,
    serializers: userConfig.serializers,
  }
}
