export {
  createAjvValidator,
  validate,
  stripNestedIds,
  getDefaultValidator,
  resetDefaultValidator,
  AjvValidationError,
  type AjvValidatorOptions,
} from './ajv.js'

// Re-export types from core package for convenience
export type {
  Validator,
  CompiledValidator,
  ValidatorOptions,
  ValidationErrorDetail,
} from 'kontract'
