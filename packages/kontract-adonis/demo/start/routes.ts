import router from '@adonisjs/core/services/router'
import { registerController, validate, OpenApiBuilder } from '../../src/index.js'
import { usersController } from '../app/controllers/users_controller.js'

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

registerController(router, usersController, { validate })

router.get('/docs/json', async ({ response }) => {
  const builder = new OpenApiBuilder({
    title: 'Kontract AdonisJS Demo',
    description: 'Demo API showcasing @kontract/adonis capabilities with TypeBox schema validation and automatic OpenAPI generation.',
    version: '1.0.0',
    servers: [{ url: 'http://localhost:3003', description: 'Demo server' }],
  })
  builder.addController(usersController)
  return response.json(builder.build())
})

router.get('/docs', async ({ response }) => {
  return response.send(getScalarHtml('/docs/json', 'Kontract AdonisJS Demo'))
})
