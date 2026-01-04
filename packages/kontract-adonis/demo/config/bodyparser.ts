import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  form: {
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },
  json: {
    convertEmptyStringsToNull: true,
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },
  raw: {
    types: ['text/*'],
  },
  multipart: {
    autoProcess: true,
    processManually: [],
    convertEmptyStringsToNull: true,
    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
