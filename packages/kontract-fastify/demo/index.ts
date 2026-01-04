/**
 * Kontract Fastify Demo
 *
 * A demo API showcasing @kontract/fastify capabilities.
 *
 * Run with: npm run demo
 * API docs: http://localhost:3000/docs
 * OpenAPI spec: http://localhost:3000/docs/json
 */
import Fastify from 'fastify'
import { registerController, registerErrorHandler, OpenApiBuilder } from '../src/index.js'
import { usersController } from './controllers/users.js'

const PORT = 3000

function getScalarHtml(specUrl: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="${specUrl}"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
}

async function main() {
  const app = Fastify({ logger: true })

  // Register error handler first
  registerErrorHandler(app, { logErrors: true })

  // Register the users controller
  registerController(app, usersController)

  // OpenAPI JSON endpoint
  app.get('/docs/json', () => {
    const builder = new OpenApiBuilder({
      title: 'Kontract Fastify Demo',
      description: 'Demo API showcasing @kontract/fastify capabilities with TypeBox schema validation and automatic OpenAPI generation.',
      version: '1.0.0',
      servers: [{ url: `http://localhost:${PORT}`, description: 'Demo server' }],
    })
    builder.addController(usersController)
    return builder.build()
  })

  // Scalar API Reference UI
  app.get('/docs', (request, reply) => {
    reply.type('text/html').send(getScalarHtml('/docs/json', 'Kontract Fastify Demo'))
  })

  // Start server
  await app.listen({ port: PORT, host: '0.0.0.0' })

  console.log('')
  console.log('='.repeat(50))
  console.log('  Kontract Fastify Demo')
  console.log('='.repeat(50))
  console.log(`  API:      http://localhost:${PORT}/api/v1/users`)
  console.log(`  Docs:     http://localhost:${PORT}/docs`)
  console.log(`  OpenAPI:  http://localhost:${PORT}/docs/json`)
  console.log('='.repeat(50))
  console.log('')
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
