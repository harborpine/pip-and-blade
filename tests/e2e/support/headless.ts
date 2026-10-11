import type { HeroId } from '@shared';
import { eng } from './app';
import { DEFAULT_BOT, nextAction } from './bot';

export interface Outcome {
  won: boolean;
  steps: number;
  fights: number;
  act: number;
  /** Every run phase the bot passed through. */
  visited: string[];
}

/** Play a whole run with the bot against the engine alone (no browser). */
export function playHeadless(heroes: [HeroId, HeroId, HeroId], seed: string, tier = 0): Outcome {
  let g = eng.newGame();
  g = eng.apply(g, { type: 'startRun', heroes, tier, seed }).game;
  let steps = 0;
  const visited = new Set<string>();
  while (g.run && g.run.phase !== 'victory' && g.run.phase !== 'defeat' && steps < 4000) {
    visited.add(g.run.phase);
    g = eng.apply(g, nextAction(eng, g, DEFAULT_BOT)).game;
    steps += 1;
  }
  const r = g.run;
  return { won: r?.phase === 'victory', steps, fights: r?.fightsWon ?? 0, act: r?.act ?? 0, visited: [...visited] };
}
