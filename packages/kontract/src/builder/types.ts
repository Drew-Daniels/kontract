/**
 * OpenAPI 3.1.0 specification types.
 * Minimal subset needed for the builder.
 */

export type OpenApiVersion = '3.1.0' | '3.0.3'

export interface OpenApiDocument {
  openapi: OpenApiVersion
  info: OpenApiInfo
  servers?: OpenApiServer[]
  paths: Record<string, OpenApiPathItem>
  components?: {
    schemas?: Record<string, OpenApiSchema>
    securitySchemes?: Record<string, OpenApiSecurityScheme>
  }
  tags?: OpenApiTag[]
  security?: Array<Record<string, string[]>>
}

export interface OpenApiInfo {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: {
    name?: string
    url?: string
    email?: string
  }
  license?: {
    name: string
    url?: string
  }
}

export interface OpenApiServer {
  url: string
  description?: string
}

export interface OpenApiTag {
  name: string
  description?: string
}

export interface OpenApiPathItem {
  get?: OpenApiOperation
  post?: OpenApiOperation
  put?: OpenApiOperation
  patch?: OpenApiOperation
  delete?: OpenApiOperation
  parameters?: OpenApiParameter[]
}

export interface OpenApiOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  security?: Array<Record<string, string[]>>
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
}

export interface OpenApiParameter {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  description?: string
  required?: boolean
  deprecated?: boolean
  schema?: OpenApiSchema
}

export interface OpenApiRequestBody {
  description?: string
  required?: boolean
  content: Record<string, OpenApiMediaType>
}

export interface OpenApiResponse {
  description: string
  content?: Record<string, OpenApiMediaType>
  headers?: Record<string, OpenApiHeader>
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema | { $ref: string }
  example?: unknown
  examples?: Record<string, { value: unknown; summary?: string }>
}

export interface OpenApiHeader {
  description?: string
  required?: boolean
  schema?: OpenApiSchema
}

export interface OpenApiSchema {
  type?: string
  format?: string
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  const?: unknown
  nullable?: boolean
  readOnly?: boolean
  writeOnly?: boolean
  deprecated?: boolean
  example?: unknown
  // Object properties
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  additionalProperties?: boolean | OpenApiSchema
  // Array properties
  items?: OpenApiSchema
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  // String properties
  minLength?: number
  maxLength?: number
  pattern?: string
  // Number properties
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  // Composition
  allOf?: OpenApiSchema[]
  anyOf?: OpenApiSchema[]
  oneOf?: OpenApiSchema[]
  not?: OpenApiSchema
  // Reference
  $ref?: string
}

export interface OpenApiSecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: OpenApiOAuthFlows
  openIdConnectUrl?: string
}

export interface OpenApiOAuthFlows {
  implicit?: OpenApiOAuthFlow
  password?: OpenApiOAuthFlow
  clientCredentials?: OpenApiOAuthFlow
  authorizationCode?: OpenApiOAuthFlow
}

export interface OpenApiOAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}
