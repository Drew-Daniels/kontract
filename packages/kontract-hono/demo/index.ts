/**
 * Kontract Hono Demo
 *
 * A demo API showcasing @kontract/hono capabilities.
 *
 * Run with: npm run demo
 * API docs: http://localhost:3001/docs
 * OpenAPI spec: http://localhost:3001/docs/json
 */
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { registerController, createErrorHandler, validate, OpenApiBuilder } from '../src/index.js'
import { usersController } from './controllers/users.js'

const PORT = 3001

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

const app = new Hono()

// Register error handler
app.onError(createErrorHandler({ logErrors: true }))

// Register the users controller
registerController(app, usersController, { validate })

// OpenAPI JSON endpoint
app.get('/docs/json', (c) => {
  const builder = new OpenApiBuilder({
    title: 'Kontract Hono Demo',
    description: 'Demo API showcasing @kontract/hono capabilities with TypeBox schema validation and automatic OpenAPI generation.',
    version: '1.0.0',
    servers: [{ url: `http://localhost:${PORT}`, description: 'Demo server' }],
  })
  builder.addController(usersController)
  return c.json(builder.build())
})

// Scalar API Reference UI
app.get('/docs', (c) => {
  return c.html(getScalarHtml('/docs/json', 'Kontract Hono Demo'))
})

// Start server
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log('')
  console.log('='.repeat(50))
  console.log('  Kontract Hono Demo')
  console.log('='.repeat(50))
  console.log(`  API:      http://localhost:${PORT}/api/v1/users`)
  console.log(`  Docs:     http://localhost:${PORT}/docs`)
  console.log(`  OpenAPI:  http://localhost:${PORT}/docs/json`)
  console.log('='.repeat(50))
  console.log('')
})
