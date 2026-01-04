/**
 * Kontract Express Demo
 *
 * A demo API showcasing @kontract/express capabilities.
 *
 * Run with: npm run demo
 * API docs: http://localhost:3002/docs
 * OpenAPI spec: http://localhost:3002/docs/json
 */
import express from 'express'
import { registerController, createErrorHandler, validate, OpenApiBuilder } from '../src/index.js'
import { usersController } from './controllers/users.js'

const PORT = 3002

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

const app = express()
app.use(express.json())

// Register the users controller
registerController(app, usersController, { validate })

// OpenAPI JSON endpoint
app.get('/docs/json', (_req, res) => {
  const builder = new OpenApiBuilder({
    title: 'Kontract Express Demo',
    description: 'Demo API showcasing @kontract/express capabilities with TypeBox schema validation and automatic OpenAPI generation.',
    version: '1.0.0',
    servers: [{ url: `http://localhost:${PORT}`, description: 'Demo server' }],
  })
  builder.addController(usersController)
  res.json(builder.build())
})

// Scalar API Reference UI
app.get('/docs', (_req, res) => {
  res.type('text/html').send(getScalarHtml('/docs/json', 'Kontract Express Demo'))
})

// Error handler must be registered last
app.use(createErrorHandler({ logErrors: true }))

// Start server
app.listen(PORT, () => {
  console.log('')
  console.log('='.repeat(50))
  console.log('  Kontract Express Demo')
  console.log('='.repeat(50))
  console.log(`  API:      http://localhost:${PORT}/api/v1/users`)
  console.log(`  Docs:     http://localhost:${PORT}/docs`)
  console.log(`  OpenAPI:  http://localhost:${PORT}/docs/json`)
  console.log('='.repeat(50))
  console.log('')
})
