/**
 * Kontract AdonisJS Demo
 *
 * A demo API showcasing @kontract/adonis capabilities.
 *
 * Run with: npm run demo
 * API docs: http://localhost:3003/docs
 * OpenAPI spec: http://localhost:3003/docs/json
 */
import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

// Set port via environment variable (AdonisJS reads HOST and PORT from env)
process.env.PORT = '3003'
process.env.HOST = '0.0.0.0'

const APP_ROOT = new URL('../', import.meta.url)

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .then(() => {
    console.log('')
    console.log('='.repeat(50))
    console.log('  Kontract AdonisJS Demo')
    console.log('='.repeat(50))
    console.log('  API:      http://localhost:3003/api/v1/users')
    console.log('  Docs:     http://localhost:3003/docs')
    console.log('  OpenAPI:  http://localhost:3003/docs/json')
    console.log('='.repeat(50))
    console.log('')
  })
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
