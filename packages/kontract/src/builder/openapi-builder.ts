import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import type { ResponseDefinition, ResponseHeader } from '../metadata/types.js'
import type { ControllerDefinition, AnyRouteDefinition } from './define-controller.js'
import type {
  OpenApiDocument,
  OpenApiVersion,
  OpenApiOperation,
  OpenApiSchema,
  OpenApiParameter,
  OpenApiResponse,
  OpenApiSecurityScheme,
  OpenApiHeader,
} from './types.js'

/**
 * Options for building the OpenAPI document.
 */
export interface OpenApiBuilderOptions {
  title: string
  description: string
  version: string
  servers: Array<{ url: string; description: string }>
  /**
   * OpenAPI specification version.
   * @default '3.1.0'
   */
  openapiVersion?: OpenApiVersion
  /**
   * Security scheme configuration.
   * @default Bearer JWT authentication
   */
  securityScheme?: {
    name: string
    type: 'http' | 'apiKey' | 'oauth2'
    scheme?: string
    bearerFormat?: string
    description?: string
  }
  /**
   * Suppress warnings for missing response descriptions.
   * @default false
   */
  suppressDescriptionWarnings?: boolean
  /**
   * Validate examples against schemas at build time.
   * @default true
   */
  validateExamples?: boolean
}

/**
 * Builds an OpenAPI specification from controller definitions.
 *
 * @example
 * ```typescript
 * const builder = new OpenApiBuilder({
 *   title: 'My API',
 *   description: 'API description',
 *   version: '1.0.0',
 *   servers: [{ url: 'http://localhost:3333', description: 'Development' }],
 * })
 *
 * builder.addController(usersController)
 * const spec = builder.build()
 * ```
 */
export class OpenApiBuilder {
  private document: OpenApiDocument
  private schemas = new Map<string, TSchema>()
  private tags = new Map<string, string | undefined>()
  private securitySchemeName: string
  private builderControllers: ControllerDefinition[] = []
  private options: OpenApiBuilderOptions

  constructor(options: OpenApiBuilderOptions) {
    this.options = options
    this.securitySchemeName = options.securityScheme?.name ?? 'BearerAuth'

    const securitySchemes: Record<string, OpenApiSecurityScheme> = {
      [this.securitySchemeName]: options.securityScheme ?? {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token obtained from /api/v1/auth/login',
      },
    }

    this.document = {
      openapi: options.openapiVersion ?? '3.1.0',
      info: {
        title: options.title,
        description: options.description,
        version: options.version,
      },
      servers: options.servers,
      tags: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes,
      },
    }
  }

  /**
   * Add a builder-based controller definition.
   * Use this for controllers created with defineController/defineRoute.
   */
  addController(controller: ControllerDefinition): this {
    this.builderControllers.push(controller)
    return this
  }

  /**
   * Build the OpenAPI document from added controllers.
   */
  build(): OpenApiDocument {
    // Process controllers
    for (const controller of this.builderControllers) {
      this.processBuilderController(controller)
    }

    // Finalize tags
    this.document.tags = Array.from(this.tags.entries())
      .map(([name, description]) => ({ name, ...(description && { description }) }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Finalize schemas
    for (const [name, schema] of this.schemas) {
      this.document.components!.schemas![name] = this.toJsonSchema(schema) as OpenApiSchema
    }

    return this.document
  }

  /**
   * Process a controller definition.
   */
  private processBuilderController(controller: ControllerDefinition): void {
    const { config, routes } = controller

    // Register tag
    this.tags.set(config.tag, config.description)

    // Process routes - pass the method name for operationId inference
    for (const [name, route] of Object.entries(routes)) {
      this.processRoute(config.tag, route, name, config.prefix)
    }
  }

  /**
   * Process a route definition.
   *
   * @param tag - OpenAPI tag for this route
   * @param route - The route definition
   * @param methodName - The method name from the controller (used as default operationId)
   * @param prefix - Optional path prefix
   */
  private processRoute(tag: string, route: AnyRouteDefinition, methodName: string, prefix?: string): void {
    const fullPath = (prefix ?? '') + route.path
    const openApiPath = fullPath.replace(/:(\w+)/g, '{$1}')

    if (!this.document.paths[openApiPath]) {
      this.document.paths[openApiPath] = {}
    }

    const routeConfig = route.config

    // Use explicit operationId if provided, otherwise use the method name from the controller
    const operation: Partial<OpenApiOperation> = {
      tags: [tag],
      summary: routeConfig.summary,
      operationId: routeConfig.operationId ?? methodName,
    }

    if (routeConfig.description) {
      operation.description = routeConfig.description
    }

    // Security
    if (routeConfig.auth === 'required') {
      operation.security = [{ [this.securitySchemeName]: [] }]
    } else {
      operation.security = []
    }

    // Parameters
    const parameters: OpenApiParameter[] = []

    // Extract path parameters from URL
    const pathParamRegex = /:(\w+)/g
    let match
    while ((match = pathParamRegex.exec(fullPath)) !== null) {
      const name = match[1]
      // Check if there's a schema for this param (cast to object schema to access properties)
      const paramsObj = routeConfig.params as { properties?: Record<string, TSchema> } | undefined
      const paramSchema = paramsObj?.properties?.[name]
      parameters.push({
        name,
        in: 'path',
        required: true,
        ...(paramSchema?.description && { description: paramSchema.description }),
        schema: paramSchema ? (this.toJsonSchema(paramSchema) as OpenApiSchema) : { type: 'string' },
      })
    }

    // Query parameters (cast to object schema to access properties)
    const queryObj = routeConfig.query as { properties?: Record<string, TSchema>; required?: string[] } | undefined
    if (queryObj?.properties) {
      const required = new Set<string>(queryObj.required ?? [])
      for (const [name, propSchema] of Object.entries(queryObj.properties)) {
        const prop = propSchema as TSchema
        parameters.push({
          name,
          in: 'query',
          required: required.has(name),
          ...(prop.description && { description: prop.description }),
          schema: this.toJsonSchema(prop) as OpenApiSchema,
        })
      }
    }

    if (parameters.length > 0) {
      operation.parameters = parameters
    }

    // Request body
    if (routeConfig.body) {
      const schemaName = this.registerSchema(routeConfig.body)
      const bodyDescription = (routeConfig.body as Record<string, unknown>).description as string | undefined
      operation.requestBody = {
        required: true,
        ...(bodyDescription && { description: bodyDescription }),
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaName}` },
          },
        },
      }
    }

    // Responses
    const responses: Record<string, OpenApiResponse> = {}
    const operationId = routeConfig.operationId ?? methodName

    for (const [status, response] of Object.entries(route.responses)) {
      const typedResponse = response as ResponseDefinition

      // Warn if description is missing
      if (!typedResponse.description && !this.options.suppressDescriptionWarnings) {
        console.warn(
          `[kontract] Missing description for ${status} response on ${operationId}`,
        )
      }

      // Validate examples against schema
      if (typedResponse.schema && this.options.validateExamples !== false) {
        this.validateResponseExamples(typedResponse, status, operationId)
      }

      const openApiResponse: OpenApiResponse = {
        description: typedResponse.description ?? this.defaultDescription(Number(status)),
      }

      if (typedResponse.schema !== null) {
        const schemaName = this.registerSchema(typedResponse.schema)
        openApiResponse.content = {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaName}` },
            ...(typedResponse.example !== undefined && { example: typedResponse.example }),
            ...(typedResponse.examples && { examples: this.formatExamples(typedResponse.examples) }),
          },
        }
      }

      // Add headers if provided
      if (typedResponse.headers) {
        openApiResponse.headers = this.buildResponseHeaders(typedResponse.headers)
      }

      responses[status] = openApiResponse
    }

    // Auto-add 401 for auth required
    if (routeConfig.auth === 'required' && !responses['401']) {
      responses['401'] = {
        description: 'Unauthorized - authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Error message' },
              },
              required: ['message'],
            },
          },
        },
      }
    }

    operation.responses = responses
    this.document.paths[openApiPath][route.method] = operation as OpenApiOperation
  }

  /**
   * Validate examples against response schema at runtime.
   */
  private validateResponseExamples(
    response: ResponseDefinition,
    status: string,
    operationId: string,
  ): void {
    if (!response.schema) return

    if (response.example !== undefined) {
      const errors = [...Value.Errors(response.schema, response.example)]
      if (errors.length > 0) {
        const errorMessages = errors.map((e) => `${e.path}: ${e.message}`).join(', ')
        console.warn(
          `[kontract] Example for ${status} response on ${operationId} doesn't match schema: ${errorMessages}`,
        )
      }
    }

    if (response.examples) {
      for (const [name, example] of Object.entries(response.examples)) {
        const errors = [...Value.Errors(response.schema, example.value)]
        if (errors.length > 0) {
          const errorMessages = errors.map((e) => `${e.path}: ${e.message}`).join(', ')
          console.warn(
            `[kontract] Example "${name}" for ${status} response on ${operationId} doesn't match schema: ${errorMessages}`,
          )
        }
      }
    }
  }

  /**
   * Build response headers for OpenAPI.
   */
  private buildResponseHeaders(headers: Record<string, ResponseHeader>): Record<string, OpenApiHeader> {
    const result: Record<string, OpenApiHeader> = {}
    for (const [name, header] of Object.entries(headers)) {
      result[name] = {
        description: header.description,
        required: header.required,
        schema: this.toJsonSchema(header.schema) as OpenApiSchema,
      }
    }
    return result
  }

  /**
   * Format examples for OpenAPI (already in correct format).
   */
  private formatExamples(examples: Record<string, { value: unknown; summary?: string }>): Record<string, { value: unknown; summary?: string }> {
    return examples
  }

  /**
   * Register a schema and return its name.
   */
  private registerSchema(schema: TSchema): string {
    const name = schema.$id ?? schema.title ?? `Schema${this.schemas.size + 1}`

    if (!this.schemas.has(name)) {
      this.schemas.set(name, schema)
      this.extractNestedSchemas(schema)
    }

    return name
  }

  /**
   * Extract and register nested schemas with $id.
   */
  private extractNestedSchemas(schema: unknown): void {
    if (!schema || typeof schema !== 'object') return

    if (Array.isArray(schema)) {
      schema.forEach((item) => this.extractNestedSchemas(item))
      return
    }

    const record = schema as Record<string, unknown>

    if (record.$id && typeof record.$id === 'string') {
      if (!this.schemas.has(record.$id)) {
        this.schemas.set(record.$id, schema as TSchema)
      }
    }

    for (const value of Object.values(record)) {
      this.extractNestedSchemas(value)
    }
  }

  /**
   * Convert TypeBox schema to JSON Schema (for OpenAPI).
   */
  private toJsonSchema(schema: TSchema): unknown {
    const result = JSON.parse(JSON.stringify(schema))
    return this.removeTypeBoxProps(result)
  }

  /**
   * Remove TypeBox-specific properties from schema.
   */
  private removeTypeBoxProps(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeTypeBoxProps(item))
    }

    const record = obj as Record<string, unknown>
    const result: Record<string, unknown> = {}

    const isSchemaDefinition
      = 'type' in record
        || 'anyOf' in record
        || 'oneOf' in record
        || 'allOf' in record

    for (const [key, value] of Object.entries(record)) {
      // Skip $id (TypeBox schema identifier)
      if (key === '$id') continue
      // Skip errorMessage in schema definitions
      if (key === 'errorMessage' && isSchemaDefinition) continue

      result[key] = this.removeTypeBoxProps(value)
    }

    return result
  }

  /**
   * Get default description for a status code.
   */
  private defaultDescription(status: number): string {
    const descriptions: Record<number, string> = {
      200: 'Successful response',
      201: 'Resource created',
      204: 'No content',
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      422: 'Validation error',
      500: 'Internal server error',
    }
    return descriptions[status] ?? 'Response'
  }
}
