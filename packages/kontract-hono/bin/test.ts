import { configure, run } from '@japa/runner'
import { plugins, runnerHooks } from '../tests/bootstrap.js'

configure({
  files: ['tests/**/*.spec.ts'],
  plugins,
  setup: runnerHooks,
  forceExit: true,
})

run()
