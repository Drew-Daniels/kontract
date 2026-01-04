# Git Hooks

This directory contains git hooks that can be installed to help maintain code quality and security.

## Available Hooks

### pre-commit

Runs **lint-staged** to automatically format code, check for linting issues, and scan for secrets on all staged files before allowing a commit.

**What it checks:**

1. **Linting** (auto-fixed where possible)
   - TypeScript, JavaScript files linted with ESLint
   - ESLint with @stylistic plugin handles formatting
   - Changes are automatically applied and re-staged

2. **Security Scanning** (blocks on findings)
   - API keys and tokens
   - Passwords and credentials
   - Private keys
   - Other common secret patterns

**What happens:**
- Lint/formatting issues are automatically fixed where possible
- Remaining lint errors require manual fixes before committing
- Security issues block the commit with detailed findings

### commit-msg

Validates commit messages against [Conventional Commits](https://www.conventionalcommits.org/) format using **commitlint**.

**Expected format:**
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Allowed types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `build` - Build system or external dependencies
- `ci` - CI configuration
- `chore` - Other changes that don't modify src or test files
- `revert` - Reverts a previous commit

**Examples:**
```bash
feat(client): add request retry logic
fix: resolve memory leak in router
docs: update API documentation
refactor(hono): simplify error handling
```

### pre-push

Runs **type checking** and **tests** before allowing a push to remote. This prevents broken code from reaching the repository.

**What it checks:**
1. TypeScript type checking across all packages
2. Unit tests for all packages

**Bypassing the hook:**
```bash
# Not recommended, but available for emergencies
git push --no-verify
```

## Installation

Git hooks are installed automatically when you run `npm install`. The `prepare` script in `package.json` configures Git to use the `.githooks/` directory:

```bash
git config core.hooksPath .githooks
```

### Manual Installation

If you need to set up hooks manually:

```bash
git config core.hooksPath .githooks
```

## Dependencies

The hooks require the following dependencies:

### 1. lint-staged (npm package)

**Installation:**
```bash
# Already included in package.json devDependencies
npm install
```

This orchestrates running different checks on staged files only, improving performance.

### 2. ESLint (npm package)

**Installation:**
```bash
# Already included in package.json devDependencies
npm install
```

ESLint with @stylistic plugin handles both linting and formatting for TypeScript and JavaScript files.

### 3. commitlint (npm package)

**Installation:**
```bash
# Already included in package.json devDependencies
npm install
```

Validates commit messages against conventional commit format.

### 4. gitleaks (system binary)

The pre-commit hook requires [gitleaks](https://github.com/gitleaks/gitleaks) to be installed.

**Installation:**

```bash
# macOS
brew install gitleaks

# Linux (using wget)
wget https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz
tar -xzf gitleaks_8.21.2_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/

# Windows (using Chocolatey)
choco install gitleaks
```

## Configuration

### lint-staged Configuration

The lint-staged configuration is in `package.json` at the repository root:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix"
  ],
  "*": [
    "gitleaks protect --staged --verbose --redact --config=.gitleaks.toml --log-opts="
  ]
}
```

### commitlint Configuration

The commitlint configuration is in `commitlint.config.js` at the repository root. It extends `@commitlint/config-conventional` with customized rules.

### Gitleaks Configuration

The gitleaks configuration is stored in `.gitleaks.toml` at the repository root.

#### Adding Allowlisted Patterns

If you encounter false positives, you can add them to the allowlist in `.gitleaks.toml`:

```toml
[allowlist]
regexes = [
  '''your-safe-pattern-here''',
]

paths = [
  '''path/to/safe/file\.txt$''',
]
```

## Troubleshooting

### Hook not running

```bash
# Verify the hooks path is configured
git config core.hooksPath

# Verify the hook is executable
chmod +x .githooks/pre-commit .githooks/commit-msg .githooks/pre-push

# Test the hook manually
./.githooks/pre-commit
```

### Dependencies not found

```bash
# Check if npm packages are installed
npx lint-staged --version
npx commitlint --version

# If not found, install dependencies
npm install

# Check if gitleaks is installed
which gitleaks
gitleaks version
```

### Commit message rejected

If your commit message is rejected:

```bash
# Check what's wrong with your message
echo "your commit message" | npx commitlint

# Examples of valid messages:
# feat: add user authentication
# fix(api): resolve null pointer exception
# docs: update README with setup instructions
```

### Pre-push tests failing

If tests fail during push:

```bash
# Run tests locally to see failures
npm test

# Run type checking to see errors
npx nx run-many --target=typecheck
```

## Best Practices

1. **Write meaningful commit messages** - Follow conventional commits for a clean git history
2. **Never commit secrets** - Use environment variables or secret management tools
3. **Use .env files** - Keep `.env` in `.gitignore` (already configured)
4. **Review findings** - Don't blindly bypass the hook with `--no-verify`
5. **Run tests before pushing** - The pre-push hook will catch failures, but it's faster to catch them locally first
6. **Keep dependencies updated** - Run `npm update` and `brew upgrade gitleaks` periodically

## Additional Resources

- [lint-staged Documentation](https://github.com/lint-staged/lint-staged)
- [ESLint Documentation](https://eslint.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
