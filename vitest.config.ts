import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    maxWorkers: 2,
  },
});
