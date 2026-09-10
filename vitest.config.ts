import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/ui/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/engine/**/*.ts',
        'src/components/**/*.{ts,tsx}',
        'src/types/**/*.ts',
      ],
      exclude: [
        'src/App.tsx',
        'src/main.tsx',
      ],
      all: true,
    },
  },
});
