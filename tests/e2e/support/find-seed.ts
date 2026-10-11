/**
 * Headless seed search: plays the bot against the engine and prints the seeds it wins.
 *   node node_modules/tsx/dist/cli.mjs tests/e2e/support/find-seed.ts [from] [count] [prefix]
 * Used to pin the seed in tests/e2e/pinned.ts. Re-run it if content changes make that seed lose.
 */
import type { HeroId } from '@shared';
import { CONTENT } from '@content';
import { playHeadless } from './headless';

const from = Number(process.argv[2] ?? 0);
const count = Number(process.argv[3] ?? 200);
const prefix = process.argv[4] ?? 'qa';
const starters = CONTENT.heroes.filter((h) => h.starter).map((h) => h.id) as HeroId[];
const party = starters.slice(0, 3) as [HeroId, HeroId, HeroId];
let wins = 0;
const winSeeds: { seed: string; steps: number }[] = [];
const byFights = new Map<number, number>();
for (let i = from; i < from + count; i++) {
  const seed = `${prefix}-${i}`;
  const o = playHeadless(party, seed);
  byFights.set(o.fights, (byFights.get(o.fights) ?? 0) + 1);
  const full = ['reward', 'doors', 'rest', 'shop', 'event'].every((v) => o.visited.includes(v));
  if (o.won && full) {
    wins += 1;
    winSeeds.push({ seed, steps: o.steps });
  }
}
console.log(`party ${party.join(',')}  runs ${count}  wins ${wins}`);
console.log('fights won histogram', [...byFights.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' '));
winSeeds.sort((a, b) => a.steps - b.steps);
console.log('shortest winning seeds that also visit reward, doors, rest, shop and event:', winSeeds.slice(0, 8).map((w) => `${w.seed} (${w.steps} steps)`).join(', ') || 'none');
