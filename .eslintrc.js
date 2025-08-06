module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
  ],
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  globals: {
    BigInt: 'readonly',
    NodeJS: 'readonly',
  },
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // General rules
    'no-console': 'error',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Security rules for SNMP
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // n8n specific patterns (custom rules would go here)
    // These would be enforced by n8n community linting but we'll document them
    
    // SNMP security patterns
    'no-restricted-globals': ['error', {
      name: 'community',
      message: 'Community strings should only be accessed through credentials'
    }],
    
    // Async/await patterns
    'prefer-promise-reject-errors': 'error',
    'no-promise-executor-return': 'error',
  },
  overrides: [
    {
      files: ['test/**/*.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};