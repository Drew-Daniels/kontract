# Development

This document covers the development workflow for contributing to Kontract.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

## Setup

```bash
# Clone the repository
git clone https://github.com/Drew-Daniels/kontract.git
cd kontract

# Install dependencies
npm install

# Build all packages
npm run build
```

## Commands

```bash
npm run build       # Build all packages
npm run test        # Run all tests
npm run lint        # Run linter
npm run lint:fix    # Fix lint errors
npm run typecheck   # Type check all packages
npm run clean       # Clean build artifacts
npm run docs:dev    # Start docs dev server
npm run docs:build  # Build documentation
```

### Package-specific commands

```bash
# Build a single package
npx nx build kontract
npx nx build @kontract/express

# Test a single package
npx nx test kontract
npx nx test @kontract/hono

# Run demo server (available in some adapter packages)
npm run demo --workspace=@kontract/express
npm run demo --workspace=@kontract/hono
```

## Project Structure

```
packages/
├── kontract/           # Core library (framework-agnostic)
├── kontract-ajv/       # AJV validation adapter
├── kontract-adonis/    # AdonisJS adapter
├── kontract-express/   # Express adapter
├── kontract-fastify/   # Fastify adapter
├── kontract-hono/      # Hono adapter
├── kontract-koa/       # Koa adapter
└── kontract-docs/      # Documentation site
```

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### 1. Create a Changeset

When you make changes that should be released, create a changeset:

```bash
npm run changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the semver bump type (patch/minor/major)
3. Write a summary of the changes

A markdown file will be created in `.changeset/` describing the change.

### 2. Commit the Changeset

Commit the changeset file along with your code changes:

```bash
git add .
git commit -m "feat: add new feature"
```

### 3. Version Packages (Maintainers)

When ready to release, run:

```bash
npm run version
```

This will:
- Consume all changesets in `.changeset/`
- Bump package versions accordingly
- Update `CHANGELOG.md` files
- Update inter-package dependencies

Review and commit the version changes:

```bash
git add .
git commit -m "chore: version packages"
git push
```

### 4. Publish to npm (Maintainers)

```bash
npm run release
```

This will:
1. Build all packages
2. Publish changed packages to npm

### Changeset Guidelines

**Patch** (0.0.x) - Bug fixes, documentation updates:
```
fix: correct validation error message
docs: update README examples
```

**Minor** (0.x.0) - New features, non-breaking changes:
```
feat: add support for file uploads
feat: add new response helper
```

**Major** (x.0.0) - Breaking changes:
```
feat!: change response helper API
BREAKING CHANGE: remove deprecated method
```

## Code Style

- ESM modules (`"type": "module"`)
- No semicolons
- Single quotes
- 2-space indentation
- Strict TypeScript

The project uses ESLint with `@stylistic/eslint-plugin` for formatting and `@cspell/eslint-plugin` for spell checking.

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

Scope is optional but encouraged for package-specific changes:

```
feat(express): add middleware support
fix(ajv): handle nested schema validation
```
