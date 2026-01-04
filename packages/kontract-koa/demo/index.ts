/**
 * Kontract Koa Demo
 *
 * A demo API showcasing @kontract/koa capabilities.
 *
 * Run with: npm run demo
 * API docs: http://localhost:3003/docs
 * OpenAPI spec: http://localhost:3003/docs/json
 */
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { registerController, createErrorHandler, validate, OpenApiBuilder } from '../src/index.js'
import { usersController } from './controllers/users.js'

const PORT = 3003

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

const app = new Koa()
const router = new Router()

// Body parser middleware
app.use(bodyParser())

// Error handler FIRST (wraps all downstream middleware)
app.use(createErrorHandler({ logErrors: true }))

// Register the users controller
registerController(router, usersController, { validate })

// OpenAPI JSON endpoint
router.get('/docs/json', (ctx) => {
  const builder = new OpenApiBuilder({
    title: 'Kontract Koa Demo',
    description: 'Demo API showcasing @kontract/koa capabilities with TypeBox schema validation and automatic OpenAPI generation.',
    version: '1.0.0',
    servers: [{ url: `http://localhost:${PORT}`, description: 'Demo server' }],
  })
  builder.addController(usersController)
  ctx.body = builder.build()
})

// Scalar API Reference UI
router.get('/docs', (ctx) => {
  ctx.type = 'text/html'
  ctx.body = getScalarHtml('/docs/json', 'Kontract Koa Demo')
})

// Mount router
app.use(router.routes())
app.use(router.allowedMethods())

// Start server
app.listen(PORT, () => {
  console.log('')
  console.log('='.repeat(50))
  console.log('  Kontract Koa Demo')
  console.log('='.repeat(50))
  console.log(`  API:      http://localhost:${PORT}/api/v1/users`)
  console.log(`  Docs:     http://localhost:${PORT}/docs`)
  console.log(`  OpenAPI:  http://localhost:${PORT}/docs/json`)
  console.log('='.repeat(50))
  console.log('')
})
