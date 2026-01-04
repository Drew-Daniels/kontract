/**
 * Japa test runner configuration.
 */
import type { Config } from '@japa/runner/types'
import { assert } from '@japa/assert'

/**
 * Configure Japa plugins.
 */
export const plugins: Config['plugins'] = [
  assert(),
]

/**
 * Lifecycle hooks for the test runner.
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Suite configuration.
 */
export const configureSuite: Config['configureSuite'] = (_suite) => {
  // No special suite configuration needed
}
