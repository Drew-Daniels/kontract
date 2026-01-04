/**
 * Test runner for kontract-adonis
 *
 * Runs both unit tests and integration tests.
 * Integration tests use a real HTTP server.
 */

import { configure, processCLIArgs, run } from '@japa/runner'
import { plugins, runnerHooks, configureSuite } from '../tests/bootstrap.js'

processCLIArgs(process.argv.slice(2))

configure({
  files: ['tests/**/*.spec.ts'],
  plugins,
  ...runnerHooks,
  configureSuite,
})

run()
