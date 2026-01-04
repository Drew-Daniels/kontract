/**
 * Fastify test app using the builder pattern (registerController).
 */
import Fastify, { type FastifyInstance } from 'fastify'
import { registerController, registerErrorHandler } from '../../src/index.js'
import { usersController } from './builder_controller.js'

let app: FastifyInstance | null = null

/**
 * Mock authentication function.
 */
async function authenticate(req: { headers: { authorization?: string } }) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
  }

  if (token === 'valid-token') {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test User',
      email: 'test@example.com',
    }
  }

  throw Object.assign(new Error('Invalid token'), { statusCode: 401 })
}

/**
 * Create and configure the Fastify application.
 */
export function createApp(): FastifyInstance {
  const fastify = Fastify({
    logger: false,
  })

  // Register error handler FIRST (disable logging in tests)
  registerErrorHandler(fastify, { logErrors: false })

  // Register endpoints from the builder-based controller
  registerController(fastify, usersController, {
    authenticate,
  })

  return fastify
}

/**
 * Start the test server.
 */
export async function startServer(): Promise<string> {
  app = createApp()
  const address = await app.listen({ port: 0, host: '127.0.0.1' })
  return address
}

/**
 * Stop the test server.
 */
export async function stopServer(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
}
