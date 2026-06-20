import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom gives the lib helpers that read window/localStorage (filters.js) a
    // browser-like environment; pure helpers don't care either way.
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}', 'test/**/*.test.{js,jsx}'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './test-results/junit.xml' },
  },
});
