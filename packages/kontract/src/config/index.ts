// Types
export type {
  OpenApiInfo,
  OpenApiServer,
  ValidatorFn,
  SerializerFn,
  SerializerRegistration,
  OpenApiDecoratorConfig,
  UserConfig,
} from './types.js'

// Defaults
export { defaultRuntimeConfig, mergeWithDefaults } from './defaults.js'

// Configuration helpers
export {
  defineConfig,
  getConfig,
  getConfigOrUndefined,
  isConfigured,
  resetConfig,
} from './define-config.js'
