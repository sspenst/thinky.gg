import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import nextConfig from 'eslint-config-next';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'out/**',
      'thinky-react-native/**',
      'venv/**',
      'next-env.d.ts',
      '**/*.js',
    ],
  },
  js.configs.recommended,
  ...nextConfig,
  ...tseslint.configs.recommended,
  // TODO: ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@stylistic/indent': ['warn', 2],
      '@stylistic/type-annotation-spacing': 'warn',
      // TODO: '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
      }],
      'arrow-spacing': 'warn',
      'brace-style': ['warn', '1tbs', { 'allowSingleLine': true }],
      'comma-spacing': 'warn',
      'eol-last': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'warn',
      // Temporarily disabled due to stack overflow in achievementsBrowser.tsx
      // indent: ['warn', 2],
      'jsx-quotes': ['warn', 'prefer-single'],
      'key-spacing': ['warn', {
        beforeColon: false,
      }],
      'keyword-spacing': 'warn',
      'no-multi-spaces': 'warn',
      'no-multiple-empty-lines': ['warn', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      }],
      'no-trailing-spaces': 'warn',
      'no-whitespace-before-property': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'padded-blocks': ['warn', 'never'],
      'padding-line-between-statements': ['warn', {
        blankLine: 'always',
        next: ['block', 'block-like', 'return'],
        prev: '*',
      }, {
        blankLine: 'always',
        next: '*',
        prev: ['block', 'block-like', 'const', 'import', 'let'],
      }, {
        blankLine: 'never',
        next: 'import',
        prev: 'import',
      }, {
        blankLine: 'any',
        next: ['const', 'let'],
        prev: ['const', 'let'],
      }],
      quotes: ['warn', 'single'],
      // TODO: 'react/jsx-indent': ['warn', 2, { checkAttributes: true, indentLogicalExpressions: true }],
      // Disabled due to circular fix conflicts with other spacing rules
      // 'react/jsx-newline': ['warn', { 'prevent': true }],
      'react/jsx-tag-spacing': ['warn', {
        beforeSelfClosing: 'always',
      }],
      'react/jsx-uses-react': 0,
      'react/react-in-jsx-scope': 0,
      'react/self-closing-comp': ['warn', {
        'component': true,
        'html': true
      }],
      // TODO: these react-hooks ones are good to keep on if we can
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      semi: 'warn',
      'semi-spacing': 'warn',
      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': ['warn', {
        groups: [['^\\u0000', '^@?\\w', '^[^.]', '^\\.']],
      }],
      'space-before-blocks': 'warn',
      'space-infix-ops': 'warn',
    },
  }];

export default eslintConfig;
