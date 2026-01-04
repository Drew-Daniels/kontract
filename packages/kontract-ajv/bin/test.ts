import { configure, run } from '@japa/runner'
import { assert } from '@japa/assert'

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert()],
})

run()
