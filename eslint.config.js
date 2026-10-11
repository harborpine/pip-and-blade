import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const noRandom = {
  selector: "MemberExpression[object.name='Math'][property.name='random']",
  message: 'No Math.random: all randomness must come from the run seed (see docs/design.md "Randomness").',
};
const noDate = {
  selector: "NewExpression[callee.name='Date'], MemberExpression[object.name='Date'][property.name='now']",
  message: 'The engine must not read the clock. The UI passes dates in.',
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'public/**', 'src/art/generated/**', 'playwright-report/**', 'test-results/**', 'tools/sim/out/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      // TypeScript already reports undefined names; this rule only misfires on Node/browser globals.
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // The rules engine is pure: no browser, no clock, no unseeded randomness, no reaching into other layers.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', noRandom, noDate],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator', 'indexedDB', 'fetch'],
      'no-restricted-imports': ['error', { patterns: ['@content', '@content/*', '@ui/*', '@art', '@art/*', '**/content/**', '**/ui/**', '**/art/**'] }],
    },
  },
  {
    files: ['src/content/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', noRandom, noDate],
      'no-restricted-imports': ['error', { patterns: ['@engine', '@engine/*', '@ui/*', '@art', '@art/*', '**/engine/**', '**/ui/**', '**/art/**'] }],
    },
  },
  {
    files: ['tools/sim/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', noRandom] },
  },
);
