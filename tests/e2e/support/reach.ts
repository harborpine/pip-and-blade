/**
 * Fast-forward helpers for tests that are about a SCREEN rather than about playing (layout,
 * screenshots). The path is worked out headless with the bot, then replayed into the page with
 * the debug hook's dispatch. The acceptance specs that test play itself never use this.
 */
import type { Page } from '@playwright/test';
import type { Action, DoorKind, GameState, HeroId } from '@shared';
import { eng, idle, PARTY } from './app';
import { DEFAULT_BOT, nextAction } from './bot';

export interface PathOptions {
  heroes?: [HeroId, HeroId, HeroId];
  /** Prefer this kind of door whenever it is offered. */
  door?: DoorKind;
  /** Try exactly these seeds instead of `<prefix>-0..59`. */
  seeds?: string[];
  /** Take this action instead of the bot's when it returns one. */
  override?: (g: GameState) => Action | null;
}

export interface Path {
  seed: string;
  heroes: [HeroId, HeroId, HeroId];
  actions: Action[];
}

/** Actions (after startRun) that lead to the first state where `done` is true. */
export function pathTo(prefix: string, done: (g: GameState) => boolean, opt: PathOptions = {}): Path {
  const heroes = opt.heroes ?? PARTY;
  const seeds = opt.seeds ?? Array.from({ length: 60 }, (_, n) => `${prefix}-${n}`);
  for (const seed of seeds) {
    let g = eng.apply(eng.newGame(), { type: 'startRun', heroes, tier: 0, seed }).game;
    const actions: Action[] = [];
    for (let steps = 0; steps < 3000 && g.run && g.run.phase !== 'victory' && g.run.phase !== 'defeat'; steps++) {
      if (done(g)) return { seed, heroes, actions };
      let a = opt.override?.(g) ?? nextAction(eng, g, DEFAULT_BOT);
      if (opt.door && g.run.phase === 'doors') {
        const i = (g.run.doors ?? []).findIndex((d) => d.kind === opt.door);
        if (i >= 0) a = { type: 'pickDoor', door: i };
      }
      actions.push(a);
      g = eng.apply(g, a).game;
    }
    if (done(g)) return { seed, heroes, actions };
  }
  throw new Error(`no seed with prefix ${prefix} reaches the wanted state`);
}

/** Start the run in the page and dispatch the path. */
export async function replay(page: Page, path: Path): Promise<void> {
  await page.evaluate(
    ({ heroes, seed, actions }) => {
      const pip = (window as unknown as { __pip: { startRun(h: unknown, t: number, s: string): void; dispatch(a: unknown): unknown } }).__pip;
      pip.startRun(heroes, 0, seed);
      for (const a of actions) pip.dispatch(a);
    },
    { heroes: path.heroes, seed: path.seed, actions: path.actions },
  );
  await idle(page);
}
