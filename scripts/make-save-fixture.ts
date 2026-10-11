/**
 * Writes a save file exactly as the current code would store it, for "old saves still load"
 * tests. Run BEFORE changing anything a release shipped with:
 *   node node_modules/tsx/dist/cli.mjs scripts/make-save-fixture.ts <label>
 * Output: tests/fixtures/save-<label>.json (a mid-fight run on a profile with some history).
 * Deterministic: same code and label give the same file.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '@content';
import { createEngine } from '@engine';
import type { Action, GameState } from '@shared';

const label = process.argv[2] ?? 'unlabelled';
const engine = createEngine(CONTENT);

/** Small seeded picker so the script needs no Math.random. */
let state = 0x9e3779b9;
const pick = (n: number): number => {
  state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0;
  return state % n;
};

const playable = (a: Action): boolean => a.type !== 'startTutorial' && a.type !== 'undo' && a.type !== 'skipReward';

/** Plays random legal actions until `stop` says so (or the run ends, then starts another). */
const play = (start: GameState, stop: (g: GameState, steps: number) => boolean, maxSteps: number): GameState => {
  let game = start;
  for (let steps = 0; steps < maxSteps; steps++) {
    if (stop(game, steps)) return game;
    let actions = engine.legalActions(game).filter(playable);
    if (game.run === null) {
      actions = [{ type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0, seed: `fixture-${label}-${steps}` }];
    }
    if (actions.length === 0) throw new Error('no legal actions');
    // Prefer using dice over ending the turn so runs get somewhere.
    const useful = actions.filter((a) => a.type === 'useDie' || a.type === 'pickReward' || a.type === 'pickDoor');
    const pool = useful.length > 0 && pick(5) !== 0 ? useful : actions;
    game = engine.apply(game, pool[pick(pool.length)] as Action).game;
  }
  return game;
};

const save = engine.newSave();
// 1) Some history: finish at least two runs.
let game = play(save.game, (g) => g.profile.stats.runsPlayed >= 3 && g.run === null, 20_000);
// 2) Then stop mid-fight, after at least one won fight, in the acting phase with a die already used.
game = play(
  game,
  (g) => {
    const f = g.run?.fight;
    return !!g.run && g.run.fightsWon >= 2 && !!f && f.phase === 'acting' && f.diceUsed === 1 && f.turn >= 2;
  },
  20_000,
);
if (!game.run?.fight) throw new Error('fixture did not end mid-fight');

const text = engine.save({ ...save, game, settings: { reduceMotion: true } });
const out = fileURLToPath(new URL(`../tests/fixtures/save-${label}.json`, import.meta.url));
mkdirSync(fileURLToPath(new URL('../tests/fixtures/', import.meta.url)), { recursive: true });
writeFileSync(out, text);
console.log(`wrote ${out}`);
console.log(`runs played ${game.profile.stats.runsPlayed}, feats ${game.profile.featsDone.length}, unlocked heroes ${game.profile.unlockedHeroes.length}`);
console.log(`run: act ${game.run.act} slot ${game.run.slot}, fights won ${game.run.fightsWon}, turn ${game.run.fight.turn}, phase ${game.run.fight.phase}`);
