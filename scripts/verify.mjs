// `npm run verify`: the single source of truth for "done".
// Runs every gate in order and stops at the first failure. Do not add ways to skip steps.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const node = process.execPath;

/** @type {{ name: string, args: string[] }[]} */
const steps = [
  { name: 'Type check', args: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.json'] },
  { name: 'Lint', args: ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'] },
  { name: 'Unit tests', args: ['node_modules/vitest/vitest.mjs', 'run'] },
  { name: 'Content check', args: ['node_modules/tsx/dist/cli.mjs', 'tools/check-content.ts'] },
  { name: 'Balance simulation', args: ['node_modules/tsx/dist/cli.mjs', 'tools/sim/main.ts'] },
  { name: 'Production build', args: ['node_modules/vite/bin/vite.js', 'build'] },
  { name: 'Playwright (iPhone WebKit)', args: ['node_modules/@playwright/test/cli.js', 'test'] },
];

const results = [];
let failed = false;

for (const [i, step] of steps.entries()) {
  const label = `[${i + 1}/${steps.length}] ${step.name}`;
  console.log(`\n=== ${label} ===`);
  if (!existsSync(step.args[0])) {
    console.error(`Missing tool: ${step.args[0]} (run "npm install")`);
    results.push({ label, ok: false, seconds: 0 });
    failed = true;
    break;
  }
  const started = Date.now();
  const run = spawnSync(node, step.args, { stdio: 'inherit' });
  const seconds = Math.round((Date.now() - started) / 1000);
  const ok = run.status === 0;
  results.push({ label, ok, seconds });
  if (!ok) {
    failed = true;
    break;
  }
}

console.log('\n=== verify summary ===');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}  (${r.seconds}s)`);
for (const step of steps.slice(results.length)) console.log(`SKIP  ${step.name}  (not reached)`);
console.log(failed ? '\nverify: FAILED' : '\nverify: ALL PASSED');
process.exit(failed ? 1 : 0);
