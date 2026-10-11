import type { Page } from '@playwright/test';
import type { GameState } from '@shared';
import { PARTY, eng, idle } from './app';

/**
 * Open a fight prepared from a crafted starting position (only the starting position is edited in
 * the saved game; everything after it is done with real taps).
 */
export async function openCrafted(page: Page, mutate: (g: GameState) => void): Promise<void> {
  const g = eng.apply(eng.newGame(), { type: 'startRun', heroes: PARTY, tier: 0, seed: 'qa-fury' }).game;
  mutate(g);
  const file = eng.newSave();
  file.game = g;
  await page.evaluate((text) => localStorage.setItem('pip-and-blade.save', JSON.stringify({ t: Date.now() + 1000, text })), eng.save(file));
  await page.reload();
  await page.waitForFunction(() => document.body.dataset['screen'] === 'fight');
  await idle(page);
}

/** A fight already at `turn`, with very tough heroes, so Fury can be reached by tapping End Turn. */
export function openFury(page: Page, turn: number): Promise<void> {
  return openCrafted(page, (g) => {
    if (!g.run?.fight) throw new Error('no fight');
    g.run.fight.turn = turn;
    for (const h of g.run.heroes) {
      h.maxHp = 200;
      h.hp = 200;
    }
  });
}

/** A fight with four enemies on the field (the Bramble King's summons make this possible in play). */
export function openFourEnemies(page: Page): Promise<void> {
  return openCrafted(page, (g) => {
    const f = g.run?.fight;
    const first = f?.enemies[0];
    if (!f || !first) throw new Error('no fight');
    f.enemies.push({ ...JSON.parse(JSON.stringify(first)), uid: f.nextEnemyUid, summoned: true });
    f.nextEnemyUid += 1;
  });
}
