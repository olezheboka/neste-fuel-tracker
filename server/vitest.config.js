const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.js'],
        // Routes/rate-limiter timers in index.js keep the event loop alive;
        // let Vitest tear the worker down rather than hang waiting on them.
        teardownTimeout: 1000,
        reporters: process.env.CI ? ['default', 'junit'] : ['default'],
        outputFile: { junit: './test-results/junit.xml' },
    },
});
