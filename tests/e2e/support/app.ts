/**
 * Shared test helpers: opening the app, reading state through the debug hook, collecting
 * console / network problems, and a node-side copy of the engine used to PREDICT what each tap
 * should do (so the specs can compare what the UI really did against the rules).
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CONTENT } from '@content';
import { createEngine } from '@engine';
import type { Action, GameState, HeroId, SaveFile } from '@shared';

export const eng = createEngine(CONTENT);
export const STARTERS = CONTENT.heroes.filter((h) => h.starter).map((h) => h.id) as HeroId[];
export const PARTY = STARTERS.slice(0, 3) as [HeroId, HeroId, HeroId];

export const ORIGIN = process.env.PIP_E2E_ORIGIN ?? 'http://127.0.0.1:47613';
export const OFFERED_KEY = 'pip-and-blade.tutorialOffered';
export const PREFS_KEY = 'pip-and-blade.prefs';

interface PipHook {
  getState(): GameState | null;
  getSave(): SaveFile | null;
  screen(): string;
  dispatch(a: Action): unknown;
  startRun(heroes: HeroId[], tier?: number, seed?: string): unknown;
  waitIdle(): Promise<void>;
  isIdle(): boolean;
}

export interface Problems {
  console: string[];
  pageErrors: string[];
  failedRequests: string[];
  foreignRequests: string[];
  assertClean(): void;
}

/** Start collecting console errors, page errors, failed requests and requests that leave the origin. */
export function watch(page: Page): Problems {
  const p: Problems = {
    console: [],
    pageErrors: [],
    failedRequests: [],
    foreignRequests: [],
    assertClean() {
      expect(p.pageErrors, 'uncaught page errors').toEqual([]);
      expect(p.console, 'console errors').toEqual([]);
      expect(p.failedRequests, 'failed requests').toEqual([]);
      expect(p.foreignRequests, 'requests that left the origin').toEqual([]);
    },
  };
  page.on('console', (m) => {
    if (m.type() === 'error') p.console.push(m.text());
  });
  page.on('pageerror', (e) => p.pageErrors.push(String(e)));
  page.on('requestfailed', (r) => p.failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => {
    if (r.status() >= 400) p.failedRequests.push(`${r.url()} HTTP ${r.status()}`);
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return;
    if (u.origin !== ORIGIN) p.foreignRequests.push(r.url());
  });
  return p;
}

export interface OpenOptions {
  /** Leave the "New here?" tutorial offer alone (default: pre-mark it as already offered). */
  offerTutorial?: boolean;
  /** Extra init script source to run before the app starts. */
  init?: string;
  /**
   * Interface preferences written before the app starts (localStorage `pip-and-blade.prefs`).
   * Default hides the one-time Home Screen install tip; pass `null` to leave prefs untouched (fresh install).
   */
  prefs?: Record<string, unknown> | null;
  /** Start from this saved game instead of a fresh profile (only used if nothing is stored yet). */
  save?: SaveFile;
}

/** Open the app and wait for it to finish booting. */
export async function openApp(page: Page, opts: OpenOptions = {}): Promise<void> {
  if (!opts.offerTutorial) {
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
    }, OFFERED_KEY);
  }
  if (opts.prefs !== null) {
    await page.addInitScript(
      ([key, value]) => {
        try {
          if (!localStorage.getItem(key as string)) localStorage.setItem(key as string, value as string);
        } catch {
          /* ignore */
        }
      },
      [PREFS_KEY, JSON.stringify(opts.prefs ?? { installTipDismissed: true })],
    );
  }
  if (opts.save) {
    const text = eng.save(opts.save);
    await page.addInitScript(
      ([t]) => {
        try {
          if (!localStorage.getItem('pip-and-blade.save')) localStorage.setItem('pip-and-blade.save', JSON.stringify({ t: Date.now(), text: t }));
        } catch {
          /* ignore */
        }
      },
      [text],
    );
  }
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto('./');
  await waitBooted(page);
}

export async function waitBooted(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as unknown as { __pip?: { getState(): unknown } };
    return document.body.dataset['screen'] !== 'boot' && !!w.__pip && w.__pip.getState() !== null;
  });
  await idle(page);
}

export const idle = (page: Page): Promise<void> => page.evaluate(() => (window as unknown as { __pip: PipHook }).__pip.waitIdle());

/** Wait until every finite CSS/Web animation and transition on the page has finished (fades, slides). */
export const settle = (page: Page): Promise<void> =>
  page
    .evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.then(() => undefined, () => undefined)),
      );
    })
    .then(() => idle(page));

export const state = (page: Page): Promise<GameState> =>
  page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as { __pip: PipHook }).__pip.getState())) as GameState);

export const saveFile = (page: Page): Promise<SaveFile> =>
  page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as { __pip: PipHook }).__pip.getSave())) as SaveFile);

export const screen = (page: Page): Promise<string> => page.evaluate(() => (window as unknown as { __pip: PipHook }).__pip.screen());

export async function expectScreen(page: Page, name: string): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-screen', name);
  await expect(page.getByTestId(`screen-${name}`)).toBeVisible();
}

/** Start a seeded standard run through the debug hook (hero select is covered by its own test). */
export async function startRun(page: Page, seed: string, heroes: HeroId[] = PARTY, tier = 0): Promise<void> {
  await page.evaluate(([h, t, s]) => (window as unknown as { __pip: PipHook }).__pip.startRun(h as HeroId[], t as number, s as string), [heroes, tier, seed] as const);
  await idle(page);
  await expectScreen(page, 'fight');
}

export async function dispatchRaw(page: Page, a: Action): Promise<void> {
  await page.evaluate((act) => (window as unknown as { __pip: PipHook }).__pip.dispatch(act), a);
  await idle(page);
}

const tapCounts = new WeakMap<Page, number>();

/** How many real taps this helper has made on `page` so far (used to test the tap budget). */
export const tapsSoFar = (page: Page): number => tapCounts.get(page) ?? 0;

/** Real tap on a test id (counted). */
export async function tap(page: Page, testid: string, opts: { force?: boolean } = {}): Promise<void> {
  tapCounts.set(page, tapsSoFar(page) + 1);
  await page.getByTestId(testid).first().tap(opts);
}

/** Read the interface preferences record from the page. */
export const readPrefs = (page: Page): Promise<Record<string, unknown>> =>
  page.evaluate((k) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }, PREFS_KEY);

/** Make sure `a` and `b` are the same game, reporting a readable diff on failure. */
export function expectSameGame(actual: GameState, expected: GameState, what: string): void {
  expect(JSON.stringify(actual) === JSON.stringify(expected), what).toBe(true);
}

/** Pretty one-line description of a state for messages. */
export function describe(g: GameState): string {
  const r = g.run;
  if (!r) return 'no run';
  return `act ${r.act} slot ${r.slot} phase ${r.phase} turn ${r.fight?.turn ?? '-'} hp ${r.heroes.map((h) => h.hp).join('/')}`;
}

/** A profile that has played a while: everything unlocked and seen, some feats done, a few runs on record. */
export function richSave(): SaveFile {
  const f = eng.newSave();
  const p = f.game.profile;
  p.unlockedHeroes = CONTENT.heroes.map((h) => h.id);
  p.unlockedItems = CONTENT.items.map((i) => i.id);
  p.featsDone = CONTENT.feats.slice(0, 6).map((x) => x.id);
  p.maxTier = 2;
  p.tutorialDone = true;
  p.seen.heroes = CONTENT.heroes.map((h) => h.id);
  p.seen.items = CONTENT.items.filter((_, i) => i % 2 === 0).map((i) => i.id);
  p.seen.enemies = CONTENT.enemies.filter((_, i) => i % 3 !== 0).map((e) => e.id);
  p.stats.runsPlayed = 14;
  p.stats.runsWon = 3;
  p.stats.winStreak = 1;
  p.stats.bestStreak = 2;
  p.stats.tierWon = 1;
  p.stats.dailyWins = 1;
  p.stats.perHero = { [CONTENT.heroes[0]!.id]: { runs: 9, wins: 2 } };
  p.daily = { '2026-09-30': { attempts: 2, bestScore: 41, won: false }, '2026-10-01': { attempts: 1, bestScore: 77, won: true } };
  return f;
}
