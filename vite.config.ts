/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Base path for GitHub Pages.
 *
 * Project pages live under https://USERNAME.github.io/REPO/ – so every asset
 * has to be referenced relative to `/REPO/`. The deploy workflow sets
 * BASE_PATH from the repository name automatically; for local work the
 * default below is used (and dev/preview also run under that sub path, so
 * path bugs show up before deployment, not after).
 *
 * If you rename the repository, change the fallback here or set BASE_PATH.
 */
const basePath = process.env.BASE_PATH ?? '/50hz-of-grey/';

export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    // Energy-Charts does not send CORS headers for third-party origins.
    // In development we proxy the API through Vite so "direct" live mode works
    // locally. In production the app falls back to the snapshot built by
    // GitHub Actions (see scripts/update-data.mjs and README).
    proxy: {
      '/api/energy-charts': {
        target: 'https://api.energy-charts.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/energy-charts/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
