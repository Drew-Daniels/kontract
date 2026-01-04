import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import cspellPlugin from '@cspell/eslint-plugin'
import globals from 'globals'

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/.git/**',
      '**/.vitepress/**',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Stylistic formatting rules
  stylistic.configs.recommended,

  // CSpell spell checking
  {
    plugins: {
      '@cspell': cspellPlugin,
    },
    rules: {
      '@cspell/spellchecker': ['warn', {
        configFile: new URL('./cspell.config.json', import.meta.url).toString(),
        checkComments: true,
        checkStrings: true,
        checkStringTemplates: true,
        checkIdentifiers: true,
        ignoreImports: true,
        ignoreImportProperties: true,
        numSuggestions: 5,
        generateSuggestions: true,
        autoFix: false,
      }],
    },
  },

  // Global settings for all files
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Stylistic overrides
  {
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'none' },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
    },
  },

  // Test files - more lenient rules
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@stylistic/max-len': 'off',
      '@cspell/spellchecker': 'off',
    },
  },

  // Ignore line length in type definition files
  {
    files: ['**/*.d.ts', '**/types/**/*.ts'],
    rules: {
      '@stylistic/max-len': 'off',
    },
  },

  // Disable spell checking in config files
  {
    files: ['**/*.config.ts', '**/*.config.js'],
    rules: {
      '@cspell/spellchecker': 'off',
    },
  },
)
