# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kontract is a TypeScript framework for building type-safe API contracts using TypeBox schemas. It provides framework-agnostic core types with adapters for popular Node.js frameworks (Hono, Fastify, Express, AdonisJS, Koa).

## Commands

```bash
# Install dependencies (npm workspaces)
npm install

# Build all packages (uses Nx)
npm run build

# Run all tests
npm run test

# Run linter
npm run lint
npm run lint:fix

# Type check
npm run typecheck

# Run tests for a single package
nx test kontract
nx test @kontract/hono

# Build a single package
nx build kontract

# Run demo server (Hono)
npm run demo --workspace=@kontract/hono

# Docs dev server
npm run docs:dev
```

## Architecture

### Package Structure

- **`kontract`** - Core package with framework-agnostic types, route/controller builders, response helpers, and OpenAPI generation
- **`@kontract/ajv`** - AJV validation adapter for TypeBox schemas
- **`@kontract/hono`**, **`@kontract/fastify`**, **`@kontract/express`**, **`@kontract/adonis`**, **`@kontract/koa`** - Framework adapters

### Core Concepts

1. **Routes** are defined with `defineRoute()` which takes a config object (method, path, schemas, responses) and an optional handler
2. **Controllers** group routes via `defineController({ tag, prefix }, { routeName: route })`
3. Framework adapters provide `registerController(app, controller)` to wire routes to the framework
4. Response helpers (`ok()`, `created()`, `notFound()`, etc.) create typed `ApiResponse` objects
5. Path params are auto-inferred from route paths (e.g., `/users/:id` infers `{ id: string }`)

### Key Files

- `packages/kontract/src/builder/define-route.ts` - Route definition and type inference
- `packages/kontract/src/builder/define-controller.ts` - Controller grouping
- `packages/kontract/src/runtime/response-helpers.ts` - Typed response helper factory
- `packages/kontract-hono/src/adapters/endpoint-registrar.ts` - Example adapter implementation

### Testing

Tests use Japa runner with `tsx`. Each package has a `bin/test.ts` entry point and `tests/` directory. Run a single test file:

```bash
cd packages/kontract && npx tsx bin/test.ts tests/builder.spec.ts
```

## Code Style

- ESM modules (`"type": "module"`)
- No semicolons, single quotes, 2-space indent
- `@stylistic/eslint-plugin` for formatting
- Spell checking via `@cspell/eslint-plugin`
- Conventional commits enforced via commitlint
