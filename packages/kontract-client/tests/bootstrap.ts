import { assert } from '@japa/assert'
import type { Config } from '@japa/runner/types'

/**
 * Configure Japa plugins.
 */
export const plugins: Config['plugins'] = [
  assert(),
]

/**
 * Configure test runner.
 */
export const runnerHooks: Config['setup'] = []
