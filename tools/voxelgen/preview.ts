/**
 * Review helper: `npm run art -- --sheet <prefix> <outfile.png> [scale] [cols]` is handled in main.ts.
 * This module builds the contact sheet for sprites whose id starts with a prefix.
 */
import { writeFileSync } from 'node:fs';
import { contactSheet } from './sheet';
import type { Sprite } from './sheet';

export function writeSheet(all: Map<string, Sprite>, prefix: string, file: string, scale = 3, cols = 6, bg = 'g'): void {
  const items = [...all.entries()].filter(([id]) => id.startsWith(prefix)).map(([, s]) => s);
  if (items.length === 0) throw new Error(`no sprites match "${prefix}"`);
  writeFileSync(file, contactSheet(items, { scale, cols, bg }).encode());
}
