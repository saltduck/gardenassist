import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'functions/api/data/due-tasks.ts',
        'functions/api/data/schedule-algorithm.ts',
        'functions/api/_shared/session.ts',
        'src/lib/calendar-timezone.ts',
        'src/types/plant.ts',
      ],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
