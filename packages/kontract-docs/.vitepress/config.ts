import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kontract',
  description: 'Type-safe API contracts for Node.js',

  // GitHub Pages base path
  base: '/kontract/',

  vite: {
    server: {
      port: 5177,
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
  ],

  ignoreDeadLinks: [
    /localhost/,
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Adapters', link: '/adapters/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Kontract?', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Overview', link: '/guide/core-concepts/' },
            { text: 'Schemas', link: '/guide/core-concepts/schemas' },
            { text: 'Routes', link: '/guide/core-concepts/routes' },
            { text: 'Responses', link: '/guide/core-concepts/responses' },
            { text: 'Validation', link: '/guide/core-concepts/validation' },
            { text: 'OpenAPI Generation', link: '/guide/core-concepts/openapi' },
          ],
        },
        {
          text: 'Migration',
          items: [
            { text: 'Migration Guide', link: '/guide/migration/' },
          ],
        },
        {
          text: 'Comparisons',
          items: [
            { text: 'vs Other Solutions', link: '/guide/comparison' },
          ],
        },
      ],
      '/adapters/': [
        {
          text: 'Framework Adapters',
          items: [
            { text: 'Overview', link: '/adapters/' },
            { text: 'Express', link: '/adapters/express' },
            { text: 'Fastify', link: '/adapters/fastify' },
            { text: 'Hono', link: '/adapters/hono' },
            { text: 'AdonisJS', link: '/adapters/adonis' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'kontract', link: '/api/kontract' },
            { text: '@kontract/ajv', link: '/api/kontract-ajv' },
            { text: '@kontract/client', link: '/api/kontract-client' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic CRUD', link: '/examples/basic-crud' },
            { text: 'File Uploads', link: '/examples/file-uploads' },
            { text: 'Authentication', link: '/examples/authentication' },
            { text: 'Error Handling', link: '/examples/error-handling' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Drew-Daniels/kontract' },
    ],

    editLink: {
      pattern: 'https://github.com/Drew-Daniels/kontract/edit/main/packages/kontract-docs/:path',
    },

    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
