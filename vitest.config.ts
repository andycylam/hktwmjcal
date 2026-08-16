import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/ui/**/*.test.tsx']
  },
  coverage: {
    provider: 'c8',
    reporter: ['text', 'lcov'],
    all: true,
  },
});
