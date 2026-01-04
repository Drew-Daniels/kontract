import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  typescript: true,

  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
  ],

  preloads: [
    () => import('./start/routes.js'),
    () => import('./start/kernel.js'),
  ],
})
