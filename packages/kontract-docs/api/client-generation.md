# Client Generation

Kontract generates OpenAPI specifications from your controllers, which can be used with any OpenAPI-compatible client generator to create type-safe API clients.

## Generating OpenAPI Specs

Use the `OpenApiBuilder` to generate an OpenAPI specification from your controllers:

```typescript
import { OpenApiBuilder } from '@kontract/express'
import { usersController, postsController } from './controllers.js'

const spec = new OpenApiBuilder({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
})
  .addController(usersController)
  .addController(postsController)
  .build()

// Write to file or serve via endpoint
import fs from 'fs'
fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2))
```

## Recommended Client Generators

### openapi-ts (hey-api)

[openapi-ts](https://github.com/hey-api/openapi-ts) generates TypeScript clients with excellent type inference and modern fetch-based requests.

```bash
npm install @hey-api/openapi-ts --save-dev
```

```bash
npx @hey-api/openapi-ts -i ./openapi.json -o ./src/client
```

Features:
- Full TypeScript support with type inference
- Multiple HTTP client options (fetch, axios, etc.)
- Tree-shakable output
- Supports OpenAPI 3.0 and 3.1

### OpenAPI Generator

[OpenAPI Generator](https://openapi-generator.tech/) supports 50+ languages and frameworks, making it ideal for polyglot teams.

```bash
# Install via npm
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate -i openapi.json -g typescript-fetch -o ./src/client
```

Available TypeScript generators:
- `typescript-fetch` - Fetch API client
- `typescript-axios` - Axios-based client
- `typescript-node` - Node.js client

See the [installation guide](https://openapi-generator.tech/docs/installation/) for more options.

## Serving OpenAPI Specs

You can serve the OpenAPI spec as an endpoint for dynamic client generation:

```typescript
import express from 'express'
import { OpenApiBuilder, registerController } from '@kontract/express'
import { usersController } from './controllers.js'

const app = express()
registerController(app, usersController)

// Serve OpenAPI spec
app.get('/openapi.json', (req, res) => {
  const spec = new OpenApiBuilder({
    info: { title: 'My API', version: '1.0.0' },
  })
    .addController(usersController)
    .build()

  res.json(spec)
})
```

## CI/CD Integration

Generate clients as part of your build process:

```json
{
  "scripts": {
    "generate:spec": "tsx scripts/generate-openapi.ts",
    "generate:client": "npm run generate:spec && npx @hey-api/openapi-ts -i ./openapi.json -o ./src/client"
  }
}
```

```typescript
// scripts/generate-openapi.ts
import fs from 'fs'
import { OpenApiBuilder } from '@kontract/express'
import { usersController, postsController } from '../src/controllers.js'

const spec = new OpenApiBuilder({
  info: { title: 'My API', version: '1.0.0' },
})
  .addController(usersController)
  .addController(postsController)
  .build()

fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2))
console.log('OpenAPI spec generated: openapi.json')
```
