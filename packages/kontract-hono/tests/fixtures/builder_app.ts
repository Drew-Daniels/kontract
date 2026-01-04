/**
 * Hono test app using the builder pattern (registerEndpoints).
 */
import { Hono, type Context } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { registerController, createErrorHandler, validate } from '../../src/index.js'
import { usersController } from './builder_controller.js'

let server: ServerType | null = null

// Use a fixed port for testing (different from decorator-based tests)
const TEST_PORT = 13336

/**
 * Mock authentication function.
 */
async function authenticate(c: Context) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  if (token === 'valid-token') {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test User',
      email: 'test@example.com',
    }
  }

  throw Object.assign(new Error('Invalid token'), { status: 401 })
}

/**
 * Create and configure the Hono application.
 */
export function createApp(): Hono {
  const app = new Hono()

  // Register error handler
  app.onError(createErrorHandler({ logErrors: false }))

  // Register routes from the builder-based controller
  registerController(app, usersController, {
    validate,
    authenticate,
  })

  return app
}

/**
 * Start the test server.
 */
export async function startServer(): Promise<string> {
  const app = createApp()
  server = serve({
    fetch: app.fetch,
    port: TEST_PORT,
  })

  return `http://127.0.0.1:${TEST_PORT}`
}

/**
 * Stop the test server.
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) reject(err)
        else resolve()
        server = null
      })
    } else {
      resolve()
    }
  })
}
