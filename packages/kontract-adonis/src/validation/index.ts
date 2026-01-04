// Re-export all validation utilities from the shared package
export {
  createAjvValidator,
  validate,
  stripNestedIds,
  getDefaultValidator,
  resetDefaultValidator,
  AjvValidationError,
  type AjvValidatorOptions,
  type Validator,
  type CompiledValidator,
  type ValidatorOptions,
  type ValidationErrorDetail,
} from '@kontract/ajv'
