import { test } from '@japa/runner'
import { Type } from '@sinclair/typebox'
import {
  OpenApiBuilder,
  defineRoute,
  defineController,
  ok,
  noContent,
} from '../src/index.js'

// Simple schemas without format validators (TypeBox Value.Errors doesn't support formats by default)
const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
}, { $id: 'User' })

const ApiError = Type.Object({
  status: Type.Number(),
  code: Type.String(),
  message: Type.String(),
}, { $id: 'ApiError' })

function createBuilder(options: Partial<Parameters<typeof OpenApiBuilder['prototype']['build']>[0]> = {}) {
  return new OpenApiBuilder({
    title: 'Test API',
    description: 'Test API description',
    version: '1.0.0',
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
    suppressDescriptionWarnings: true,
    ...options,
  })
}

test.group('OpenApiBuilder - Response Headers', () => {
  test('includes response headers in spec', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: {
        200: {
          schema: UserSchema,
          description: 'User found',
          headers: {
            'X-Request-Id': {
              schema: Type.String(),
              description: 'Unique request identifier',
            },
            'X-Rate-Limit-Remaining': {
              schema: Type.Number(),
              description: 'Remaining rate limit',
              required: true,
            },
          },
        },
      },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    const controller = defineController({ tag: 'Users' }, { getUser })
    const builder = createBuilder()
    builder.addController(controller)
    const spec = builder.build()

    const response = spec.paths['/users/{id}']?.get?.responses['200']
    assert.exists(response?.headers)
    assert.exists(response?.headers?.['X-Request-Id'])
    assert.equal(response?.headers?.['X-Request-Id']?.description, 'Unique request identifier')
    assert.exists(response?.headers?.['X-Rate-Limit-Remaining'])
    assert.equal(response?.headers?.['X-Rate-Limit-Remaining']?.required, true)
  })
})

test.group('OpenApiBuilder - Response Examples', () => {
  test('includes single example in spec', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: {
        200: {
          schema: UserSchema,
          description: 'User found',
          example: { id: '123', name: 'John Doe', email: 'john@example.com' },
        },
      },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    const controller = defineController({ tag: 'Users' }, { getUser })
    const builder = createBuilder()
    builder.addController(controller)
    const spec = builder.build()

    const content = spec.paths['/users/{id}']?.get?.responses['200']?.content?.['application/json']
    assert.exists(content?.example)
    assert.deepEqual(content?.example, { id: '123', name: 'John Doe', email: 'john@example.com' })
  })

  test('includes multiple named examples in spec', ({ assert }) => {
    const getUser = defineRoute({
      route: 'GET /users/:id',
      responses: {
        200: {
          schema: UserSchema,
          description: 'User found',
          examples: {
            basic: {
              value: { id: '1', name: 'John Doe', email: 'john@example.com' },
              summary: 'Basic user',
            },
            admin: {
              value: { id: '2', name: 'Admin User', email: 'admin@example.com' },
              summary: 'Admin user',
            },
          },
        },
      },
    }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

    const controller = defineController({ tag: 'Users' }, { getUser })
    const builder = createBuilder()
    builder.addController(controller)
    const spec = builder.build()

    const content = spec.paths['/users/{id}']?.get?.responses['200']?.content?.['application/json']
    assert.exists(content?.examples)
    assert.exists(content?.examples?.basic)
    assert.equal(content?.examples?.basic?.summary, 'Basic user')
    assert.deepEqual(content?.examples?.basic?.value, { id: '1', name: 'John Doe', email: 'john@example.com' })
    assert.exists(content?.examples?.admin)
    assert.equal(content?.examples?.admin?.summary, 'Admin user')
  })
})

test.group('OpenApiBuilder - Description Warnings', () => {
  test('logs warning for missing description when not suppressed', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: { schema: UserSchema }, // No description
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: false, // Enable warnings
      })
      builder.addController(controller)
      builder.build()

      assert.isTrue(warnings.some((w) => w.includes('Missing description') && w.includes('200')))
    } finally {
      console.warn = originalWarn
    }
  })

  test('does not log warning when description is provided', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: { schema: UserSchema, description: 'User found successfully' },
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: false,
      })
      builder.addController(controller)
      builder.build()

      assert.isFalse(warnings.some((w) => w.includes('Missing description')))
    } finally {
      console.warn = originalWarn
    }
  })

  test('suppresses warnings when suppressDescriptionWarnings is true', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: { schema: UserSchema }, // No description
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: true, // Suppress warnings
      })
      builder.addController(controller)
      builder.build()

      assert.isFalse(warnings.some((w) => w.includes('Missing description')))
    } finally {
      console.warn = originalWarn
    }
  })
})

test.group('OpenApiBuilder - Example Validation', () => {
  test('logs warning for invalid example', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: {
            schema: UserSchema,
            description: 'User found',
            example: { id: 123, name: 'John', email: 'john@example.com' }, // id should be string
          },
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: true,
        validateExamples: true,
      })
      builder.addController(controller)
      builder.build()

      assert.isTrue(warnings.some((w) => w.includes("doesn't match schema")))
    } finally {
      console.warn = originalWarn
    }
  })

  test('logs warning for invalid named example', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: {
            schema: UserSchema,
            description: 'User found',
            examples: {
              invalid: {
                value: { id: 123, name: 'John', email: 456 }, // id and email should be strings
                summary: 'Invalid example',
              },
            },
          },
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: true,
        validateExamples: true,
      })
      builder.addController(controller)
      builder.build()

      assert.isTrue(warnings.some((w) => w.includes('"invalid"') && w.includes("doesn't match schema")))
    } finally {
      console.warn = originalWarn
    }
  })

  test('does not log warning for valid example', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: {
            schema: UserSchema,
            description: 'User found',
            example: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John', email: 'john@example.com' },
          },
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: true,
        validateExamples: true,
      })
      builder.addController(controller)
      builder.build()

      assert.isFalse(warnings.some((w) => w.includes("doesn't match schema")))
    } finally {
      console.warn = originalWarn
    }
  })

  test('skips validation when validateExamples is false', ({ assert }) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => warnings.push(msg)

    try {
      const getUser = defineRoute({
        route: 'GET /users/:id',
        responses: {
          200: {
            schema: UserSchema,
            description: 'User found',
            example: { id: 123, name: 'John', email: 456 }, // Invalid - numbers instead of strings
          },
        },
      }, async () => ok(UserSchema, { id: '1', name: 'Test', email: 'test@test.com' }))

      const controller = defineController({ tag: 'Users' }, { getUser })
      const builder = new OpenApiBuilder({
        title: 'Test API',
        description: 'Test',
        version: '1.0.0',
        servers: [],
        suppressDescriptionWarnings: true,
        validateExamples: false, // Disable validation
      })
      builder.addController(controller)
      builder.build()

      assert.isFalse(warnings.some((w) => w.includes("doesn't match schema")))
    } finally {
      console.warn = originalWarn
    }
  })
})

test.group('OpenApiBuilder - No Content Response', () => {
  test('handles 204 responses without headers/examples', ({ assert }) => {
    const deleteUser = defineRoute({
      route: 'DELETE /users/:id',
      responses: {
        204: { schema: null, description: 'User deleted' },
      },
    }, async () => noContent())

    const controller = defineController({ tag: 'Users' }, { deleteUser })
    const builder = createBuilder()
    builder.addController(controller)
    const spec = builder.build()

    const response = spec.paths['/users/{id}']?.delete?.responses['204']
    assert.exists(response)
    assert.equal(response?.description, 'User deleted')
    assert.notExists(response?.content)
  })
})
