/**
 * Replays one simulated run and prints a turn-by-turn log. For looking into odd results.
 *   node node_modules/tsx/dist/cli.mjs tools/sim/debug.ts <seed> [strategy|careless|-] [heroes a,b,c] [maxLines]
 */
import { CONTENT } from '@content';
import { createEngine } from '@engine';
import type { GameState, HeroId } from '@shared';
import { carelessBot } from './careless';
import { mixedParty } from './jobs';
import { makeRng } from './rng';
import { fullProfile } from './runner';
import { skilledBot } from './skilled';
import { STRATEGIES } from './strategies';

const [seed = 'pb1-skilled-0', strat = '-', heroesArg = '', maxArg = '400'] = process.argv.slice(2);
const engine = createEngine(CONTENT);
const profile = fullProfile(engine);
const strategy = STRATEGIES[strat] ?? null;
const party = heroesArg ? (heroesArg.split(',') as [HeroId, HeroId, HeroId]) : strategy ? strategy.party : strat === 'careless' ? (['bulwark', 'duelist', 'herbalist'] as [HeroId, HeroId, HeroId]) : mixedParty(engine, profile, seed);
const bot = strat === 'careless' ? carelessBot : skilledBot({ strategy });
const env = { engine, content: CONTENT, rng: makeRng(`bot|${seed}`) };
let game: GameState = { profile, run: null };
game = engine.apply(game, { type: 'startRun', heroes: party, tier: 0, seed }).game;
let lines = 0;
const max = Number(maxArg);
const say = (s: string): void => { if (lines++ < max) console.log(s); };
say(`party ${party.join(', ')}`);
let steps = 0;
while (game.run && game.run.phase !== 'victory' && game.run.phase !== 'defeat' && steps++ < 8000 && lines < max) {
  const run = game.run;
  const a = bot.decide(env, game);
  if (run.phase === 'fight' && a.type === 'endTurn') {
    const f = run.fight!;
    say(`A${run.act}.${run.slot} ${f.encounterId} t${f.turn} | heroes ${run.heroes.map((h, i) => `${h.heroId}:${h.downed ? 'X' : h.hp}+${f.heroes[i]!.shield + f.heroes[i]!.ward}`).join(' ')} | enemies ${f.enemies.map((e) => `${e.enemyId}:${e.hp}+${e.shield}${e.statuses.poison ? `p${e.statuses.poison}` : ''} [${e.intent?.moveId}]`).join(' ')}`);
  } else if (run.phase === 'fight' && a.type === 'useDie') {
    const d = engine.dice(game)[a.die]!;
    say(`    ${run.heroes[d.hero]!.heroId} ${d.effect} ${d.value} ${d.keywords.join('+')} -> ${a.target ? (a.target.side === 'enemy' ? `enemy#${a.target.uid}` : `hero${a.target.index}`) : '-'}`);
  } else if (run.phase !== 'fight') say(`  ${run.phase}: ${JSON.stringify(a)} gold ${run.gold} items ${run.heroes.map((h) => h.items.join('+')).join(' / ')}`);
  game = engine.apply(game, a).game;
}
say(`END phase ${game.run?.phase} act ${game.run?.act}.${game.run?.slot} turns ${game.run?.stats.run.turnsTaken}`);
