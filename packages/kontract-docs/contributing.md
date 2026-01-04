# Contributing

Thank you for your interest in contributing to Kontract! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 24+
- npm 11+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/blog.git
   cd blog
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build all packages:
   ```bash
   npx nx run-many --target=build --all
   ```

5. Run tests:
   ```bash
   npx nx run-many --target=test --all
   ```

## Project Structure

```
packages/
├── kontract/           # Core library
├── @kontract/ajv/       # AJV validation
├── @kontract/adonis/    # AdonisJS adapter
├── @kontract/express/   # Express adapter
├── @kontract/fastify/   # Fastify adapter
├── @kontract/hono/      # Hono adapter
└── kontract-docs/      # Documentation (this site)
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes

3. Run type checking:
   ```bash
   npx nx run-many --target=typecheck --all
   ```

4. Run linting:
   ```bash
   npx nx run-many --target=lint --all
   ```

5. Run tests:
   ```bash
   npx nx run-many --target=test --all
   ```

### Testing

Each package has its own test suite:

```bash
# Run tests for a specific package
npx nx run kontract:test
npx nx run @kontract/express:test

# Run all tests
npx nx run-many --target=test --all
```

### Building

```bash
# Build a specific package
npx nx run kontract:build

# Build all packages
npx nx run-many --target=build --all
```

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true`)
- Avoid `any` - use `unknown` or proper generics
- Export types explicitly
- Use descriptive variable names

### Formatting

The project uses ESLint with `@stylistic/eslint-plugin`:

```bash
# Check linting
npx nx run-many --target=lint --all

# Fix auto-fixable issues
npx nx run kontract:lint:fix
```

### Commits

We follow conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

Examples:
```
feat(kontract): add binary response helper
fix(@kontract/express): handle validation errors correctly
docs: add file upload example
```

## Pull Requests

### Before Submitting

1. Ensure all tests pass
2. Run type checking
3. Run linting
4. Update documentation if needed
5. Add tests for new features

### PR Guidelines

- Keep PRs focused on a single change
- Include a clear description
- Reference any related issues
- Add tests for bug fixes and features

### Review Process

1. Automated checks run on PR
2. Maintainer reviews code
3. Address feedback if needed
4. Maintainer merges when approved

## Documentation

### Building Docs

```bash
# Start docs dev server
npx nx run kontract-docs:dev

# Build docs
npx nx run kontract-docs:build
```

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add to appropriate section
- Update navigation if adding pages

## Reporting Issues

### Bug Reports

Include:
- Kontract version
- Node.js version
- Framework and version
- Minimal reproduction
- Expected vs actual behavior

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered

## Questions

For questions, open a discussion on GitHub.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
