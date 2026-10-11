import { defineConfig } from 'vitest/config';
import { aliases } from './aliases.ts';

export default defineConfig({
  resolve: { alias: aliases },
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    testTimeout: 30_000,
    passWithNoTests: false,
  },
});
