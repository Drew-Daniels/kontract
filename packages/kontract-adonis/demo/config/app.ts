import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

export const appKey = new Secret('demo-app-key-for-kontract-adonis-demo-32c')

export const http = defineConfig({
  generateRequestId: false,
  allowMethodSpoofing: false,
  useAsyncLocalStorage: false,
  cookie: {},
})
