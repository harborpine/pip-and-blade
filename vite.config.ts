import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { aliases } from './aliases.ts';

// Served from https://<user>.github.io/pip-and-blade/ on GitHub Pages.
export const BASE = '/pip-and-blade/';

export default defineConfig({
  base: BASE,
  resolve: { alias: aliases },
  build: {
    target: ['es2022', 'safari16'],
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: { host: true, port: 5173 },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  plugins: [
    VitePWA({
      // The web manifest is a static file owned by ui: public/manifest.webmanifest
      manifest: false,
      registerType: 'autoUpdate',
      // Registration is done by src/ui (with error handling), not by an injected script.
      injectRegister: false,
      workbox: {
        // Precache everything so the game is fully playable offline after the first load.
        globPatterns: ['**/*.{js,css,html,png,json,webmanifest,ico,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
