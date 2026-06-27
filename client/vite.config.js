import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // recharts is intentionally NOT a manual chunk: it's only imported by the
        // lazily-loaded FuelTrendChart, so letting Vite split it automatically
        // keeps it (and its deps) entirely out of the entry's static graph —
        // forcing it into a named chunk made a shared submodule land there and
        // the entry static-import it, eagerly preloading ~106KB on first paint.
        manualChunks: {
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
