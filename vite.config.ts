import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { aliases } from './aliases.ts';

// Served from https://<user>.github.io/pip-and-blade/ on GitHub Pages.
export const BASE = '/pip-and-blade/';

/** The version players see in Settings; also served as version.json so a deploy can be checked. */
export const APP_VERSION = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

const versionFile = (): Plugin => ({
  name: 'pip-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ app: 'pip-and-blade', version: APP_VERSION }) });
  },
});

export default defineConfig({
  base: BASE,
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
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
    versionFile(),
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
