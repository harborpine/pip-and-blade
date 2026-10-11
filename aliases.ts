import { fileURLToPath } from 'node:url';

const at = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/** Path aliases shared by Vite and Vitest. Keep in step with tsconfig.json "paths". */
export const aliases = [
  { find: /^@shared$/, replacement: at('./src/shared/index.ts') },
  { find: /^@shared\//, replacement: at('./src/shared/') },
  { find: /^@engine$/, replacement: at('./src/engine/index.ts') },
  { find: /^@engine\//, replacement: at('./src/engine/') },
  { find: /^@content$/, replacement: at('./src/content/index.ts') },
  { find: /^@content\//, replacement: at('./src/content/') },
  { find: /^@art$/, replacement: at('./src/art/index.ts') },
  { find: /^@art\//, replacement: at('./src/art/') },
  { find: /^@ui\//, replacement: at('./src/ui/') },
];
