/**
 * The guided first fight. A coach card sits at the top of the fight screen; every step waits
 * for the player to actually do the thing. Skippable. State is UI-only (not saved): if the app
 * is closed mid-tutorial the steps simply start again.
 */
import type { Action, GameEvent, RunState } from '@shared';
import { h } from './dom';

interface Step {
  id: string;
  text: string;
  focus: string;
}

const STEPS: Step[] = [
  { id: 'intent', text: 'Enemies show what they will do next. Tap an enemy’s intent bubble to read it.', focus: '.intent' },
  { id: 'lock', text: 'Your dice are rolled. Tap a die you like to lock it: locked dice keep their face.', focus: '.die' },
  { id: 'reroll', text: 'Press Reroll to roll every die you did not lock. You get a limited number of rerolls.', focus: '[data-testid="btn-reroll"]' },
  { id: 'usemode', text: 'Happy with your dice? Press Use dice.', focus: '[data-testid="btn-use-dice"]' },
  { id: 'target', text: 'Tap a die to pick it, then tap a glowing target. The number shows exactly what will happen.', focus: '.die' },
  { id: 'end', text: 'Use your other dice the same way, then press End Turn. The numbers on your heroes show the damage coming.', focus: '[data-testid="btn-end-turn"]' },
];

let step = 0;
let skipped = false;
let finished = false;
let lastRoot: HTMLElement | null = null;
let lastRun: RunState | null = null;

export function tutorialReset(): void {
  step = 0;
  skipped = false;
  finished = false;
}

export const tutorialStepId = (): string | null => (skipped || finished ? null : (STEPS[step]?.id ?? null));

function advance(): void {
  step += 1;
  if (step >= STEPS.length) finished = true;
  if (lastRoot && lastRun) render(lastRoot, lastRun);
}

function render(root: HTMLElement, run: RunState): void {
  root.querySelector('.coach')?.remove();
  for (const el of root.querySelectorAll('.tut-focus')) el.classList.remove('tut-focus');
  if (run.mode !== 'tutorial' || skipped) return;
  if (finished) {
    const done = h('div', { class: 'coach done', testid: 'tutorial-card' },
      h('p', { text: 'That is the whole loop. Win this fight to finish the tutorial.' }),
      h('button', { class: 'btn small', testid: 'tutorial-skip', text: 'Close', onClick: () => { skipped = true; render(root, run); } }),
    );
    root.querySelector('.fight-status')?.after(done);
    return;
  }
  const s = STEPS[step];
  if (!s) return;
  const card = h('div', { class: 'coach', testid: 'tutorial-card', attrs: { 'data-step': s.id } },
    h('p', { testid: 'tutorial-text', text: s.text }),
    h('button', { class: 'btn small', testid: 'tutorial-skip', text: 'Skip', onClick: () => { skipped = true; render(root, run); } }),
  );
  root.querySelector('.fight-status')?.after(card);
  for (const el of root.querySelectorAll(s.focus)) el.classList.add('tut-focus');
}

/** Called each time the fight screen is painted. */
export function tutorialAttach(root: HTMLElement, ctx: { events: GameEvent[]; action: Action | null; run: RunState }): void {
  lastRoot = root;
  lastRun = ctx.run;
  render(root, ctx.run);
}

/** Called after painting with the events of the action that caused it. */
export function tutorialAfter(events: GameEvent[], action: Action | null): void {
  if (!tutorialStepId() || !action) return;
  let reach = 0;
  if (events.some((e) => e.type === 'lockToggled' && e.locked)) reach = 2;
  if (events.some((e) => e.type === 'diceRolled' && e.reroll)) reach = 3;
  if (events.some((e) => e.type === 'dieUsed')) reach = 5;
  if (action.type === 'endTurn') reach = 6;
  if (reach > step) {
    step = reach;
    if (step >= STEPS.length) finished = true;
    if (lastRoot && lastRun) render(lastRoot, lastRun);
  }
}

export function tutorialNoteIntentOpened(): void {
  if (tutorialStepId() === 'intent') advance();
}

export function tutorialNoteUseDice(): void {
  if (tutorialStepId() === 'usemode') advance();
}

/** The "offer the tutorial once" flag is a per-device convenience, so localStorage is fine. */
export function clearTutorialOffer(): void {
  try {
    localStorage.removeItem('pip-and-blade.tutorialOffered');
  } catch {
    /* ignore */
  }
}
