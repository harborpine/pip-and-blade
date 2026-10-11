/**
 * The guided first fight: five short steps. A coach card sits at the top of the fight screen
 * and every step waits for the player to actually do the thing. Skippable at any moment and
 * replayable from Settings. State is UI-only (not saved): if the app is closed mid-tutorial
 * the steps simply start again.
 */
import type { Action, GameEvent, RunState } from '@shared';
import { h } from './dom';

export type TutorialStep = 'intent' | 'lock' | 'reroll' | 'use' | 'end';

interface Step {
  id: TutorialStep;
  focus: string;
}

const STEPS: Step[] = [
  { id: 'intent', focus: '.intent' },
  { id: 'lock', focus: '.lock-btn:not(.gone)' },
  { id: 'reroll', focus: '[data-testid="btn-reroll"]' },
  { id: 'use', focus: '.die:not(.used):not(.blank)' },
  { id: 'end', focus: '[data-testid="btn-end-turn"]' },
];

/** What the fight screen is showing right now (decides the wording of the "use" step). */
export interface TutorialView {
  run: RunState;
  /** A die is lifted, waiting for its target. */
  lifted: boolean;
  /** Dice that can still be used this turn. */
  unused: number;
  rolling: boolean;
}

let step = 0;
let used = 0;
let skipped = false;
let finished = false;
let lastRoot: HTMLElement | null = null;
let lastView: TutorialView | null = null;

export function tutorialReset(): void {
  step = 0;
  used = 0;
  skipped = false;
  finished = false;
}

export const tutorialStepId = (): TutorialStep | null => (skipped || finished ? null : (STEPS[step]?.id ?? null));

function textFor(id: TutorialStep, v: TutorialView): { text: string; sub: string } {
  switch (id) {
    case 'intent':
      return { text: 'Enemies show what they will do. Tap an enemy’s bubble to read it.', sub: '' };
    case 'lock':
      return { text: 'Tap the padlock under a die to keep it.', sub: '' };
    case 'reroll':
      return { text: 'Now Reroll the rest: every die you did not keep rolls again.', sub: '' };
    case 'use':
      if (v.lifted) return { text: 'Tap who to hit: each glowing target shows exactly what will happen.', sub: 'target' };
      if (used === 0) return { text: 'Tap a die to use it. If it has only one possible target it fires at once.', sub: 'first' };
      return { text: 'Use another die. If it lifts, it has several targets: tap who to hit.', sub: 'more' };
    case 'end':
      return { text: 'End Turn shows the damage coming. Press it when you are done.', sub: '' };
  }
}

function render(root: HTMLElement, v: TutorialView): void {
  root.querySelector('.coach')?.remove();
  for (const el of root.querySelectorAll('.tut-focus')) el.classList.remove('tut-focus');
  if (v.run.mode !== 'tutorial' || skipped) return;
  if (finished) {
    const done = h('div', { class: 'coach done', testid: 'tutorial-card', attrs: { 'data-step': 'done' } },
      h('p', { testid: 'tutorial-text', text: 'That is the whole loop. Win this fight to finish the tutorial.' }),
      h('button', { class: 'btn small', testid: 'tutorial-skip', text: 'Close', onClick: () => { skipped = true; render(root, v); } }),
    );
    root.querySelector('.fight-status')?.after(done);
    return;
  }
  // The "use" step ends by itself once two dice are used or none are left.
  if (STEPS[step]?.id === 'use' && !v.rolling && !v.lifted && (used >= 2 || v.unused === 0)) step += 1;
  const s = STEPS[step];
  if (!s) return;
  const t = textFor(s.id, v);
  const card = h('div', { class: 'coach', testid: 'tutorial-card', attrs: { 'data-step': s.id, 'data-sub': t.sub, 'data-n': `${step + 1}` } },
    h('span', { class: 'coach-n', text: `${step + 1}/${STEPS.length}` }),
    h('p', { testid: 'tutorial-text', text: t.text }),
    h('button', { class: 'btn small', testid: 'tutorial-skip', text: 'Skip', onClick: () => { skipped = true; render(root, v); } }),
  );
  root.querySelector('.fight-status')?.after(card);
  // While a die is lifted its targets are already outlined in gold: no extra frame.
  const focus = s.id === 'use' && v.lifted ? '.die.selected' : s.focus;
  for (const el of root.querySelectorAll(focus)) el.classList.add('tut-focus');
}

/** Called each time the fight screen is painted. */
export function tutorialAttach(root: HTMLElement, view: TutorialView): void {
  lastRoot = root;
  lastView = view;
  render(root, view);
}

const indexOf = (id: TutorialStep): number => STEPS.findIndex((s) => s.id === id);

/** Called after painting with the events of the action that caused it: doing the thing advances the step. */
export function tutorialAfter(events: GameEvent[], action: Action | null): void {
  if (!tutorialStepId() || !action) return;
  let reach = step;
  if (events.some((e) => e.type === 'lockToggled' && e.locked)) reach = Math.max(reach, indexOf('reroll'));
  if (events.some((e) => e.type === 'diceRolled' && e.reroll)) reach = Math.max(reach, indexOf('use'));
  const usedNow = events.filter((e) => e.type === 'dieUsed').length;
  if (usedNow > 0) {
    used += usedNow;
    reach = Math.max(reach, indexOf('use'));
  }
  if (events.some((e) => e.type === 'undone')) used = Math.max(0, used - 1);
  let changed = usedNow > 0 || reach !== step;
  step = reach;
  if (action.type === 'endTurn') {
    finished = true;
    changed = true;
  }
  if (changed && lastRoot && lastView) render(lastRoot, lastView);
}

export function tutorialNoteIntentOpened(): void {
  if (tutorialStepId() !== 'intent') return;
  step += 1;
  if (lastRoot && lastView) render(lastRoot, lastView);
}

/** The "offer the tutorial once" flag is a per-device convenience, so localStorage is fine. */
export function clearTutorialOffer(): void {
  try {
    localStorage.removeItem('pip-and-blade.tutorialOffered');
  } catch {
    /* ignore */
  }
}
