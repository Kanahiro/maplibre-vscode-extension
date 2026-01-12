import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'out',
      'dist',
      '**/*.d.ts',
    ],
  },
  {
    plugins: {
      '@typescript-eslint': tsEslint,
    },
  },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
      },
    },
    rules: {
        '@typescript-eslint/naming-convention': [
            'warn',
            {
                'selector': 'import',
                'format': [ 'camelCase', 'PascalCase' ]
            }
        ],
        'curly': 'warn',
        'eqeqeq': 'warn',
        'no-throw-literal': 'warn',
    },
  },
];
