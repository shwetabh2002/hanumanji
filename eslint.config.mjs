// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettierConfig,
  {
    plugins: {
      perfectionist,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn', // TODO: Remove this rule once fixed,
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // '@typescript-eslint/no-floating-promises': 'error', // TODO: implement these rules, currently throwing error
      // '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-extraneous-class': 'error', // TODO: Remove this rule once fixed
      'perfectionist/sort-array-includes': [
        'warn',
        {
          groupKind: 'literals-first',
          ignoreCase: true,
          order: 'asc',
          partitionByNewLine: false,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-classes': [
        'error',
        {
          customGroups: [],
          groups: [
            'static-block',
            'index-signature',
            'static-property',
            ['protected-property', 'protected-accessor-property'],
            ['private-property', 'private-accessor-property'],
            ['property', 'accessor-property'],
            'constructor',
            'static-method',
            'protected-method',
            'private-method',
            'method',
            ['get-method', 'set-method'],
            'unknown',
          ],
          ignoreCase: true,
          order: 'asc',
          partitionByComment: false,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-enums': [
        'warn',
        {
          forceNumericSort: false,
          ignoreCase: true,
          order: 'asc',
          partitionByComment: false,
          partitionByNewLine: false,
          sortByValue: false,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-interfaces': [
        'warn',
        {
          customGroups: {},
          groups: [],
          ignoreCase: true,
          ignorePattern: [],
          order: 'asc',
          partitionByNewLine: false,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-objects': [
        'warn',
        {
          customGroups: {},
          groups: [],
          ignoreCase: true,
          ignorePattern: [],
          order: 'asc',
          partitionByComment: false,
          partitionByNewLine: false,
          styledComponents: true,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-variable-declarations': [
        'warn',
        {
          ignoreCase: true,
          order: 'asc',
          partitionByComment: false,
          partitionByNewLine: false,
          type: 'alphabetical',
        },
      ],
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
);
