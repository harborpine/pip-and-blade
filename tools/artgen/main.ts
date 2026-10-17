/**
 * The flat-style art generator (0.3.0). Everything is SVG built by code; deterministic; offline.
 *   tsx tools/artgen/main.ts               full build (see build.ts)
 *   tsx tools/artgen/main.ts --staged      the same, but the manifest goes to manifest-flat.json and
 *                                          the old PNGs stay (used before the cut-over)
 *   tsx tools/artgen/main.ts --stylesheet  review sheets in tools/artgen/stylesheet/ only
 *   tsx tools/artgen/main.ts --sheet <prefix> <out.png>   a contact sheet of ids with that prefix
 */
import { fileURLToPath } from 'node:url';
import { buildAll } from './build';
import { finishBuild } from './finish';
import { writeContactSheet, writeStyleSheet, writeTokenActs } from './stylesheet';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../..', import.meta.url));

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--stylesheet')) {
    const files = await writeStyleSheet(`${here}stylesheet`);
    console.log(`artgen: wrote ${files.length} style-sheet files to tools/artgen/stylesheet/`);
    return;
  }
  if (args[0] === '--sheet') {
    await writeContactSheet(args[1] ?? '', args[2] ?? 'sheet.png', Number(args[3] ?? 64));
    console.log(`artgen: wrote ${args[2]}`);
    return;
  }
  if (args[0] === '--tokens') {
    await writeTokenActs(args[1] ?? 'tokens.png');
    console.log(`artgen: wrote ${args[1]}`);
    return;
  }
  const staged = args.includes('--staged');
  const r = buildAll({ root, manifestName: staged ? 'manifest-flat.json' : 'manifest.json', removePngs: !staged });
  await finishBuild(root, r.manifest, !staged);
  const counts = new Map<string, number>();
  for (const id of r.written) counts.set(id.split('.')[0]!, (counts.get(id.split('.')[0]!) ?? 0) + 1);
  console.log(`artgen: ${r.written.length} SVGs written${staged ? ' (staged manifest)' : ''}`);
  console.log([...counts.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  if (r.missing.length > 0) {
    console.error(`MISSING ${r.missing.length}: ${r.missing.join(', ')}`);
    if (!args.includes('--allow-missing')) process.exitCode = 1;
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
