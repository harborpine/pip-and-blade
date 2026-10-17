/** Small visual effects. CSS transforms and opacity only. Each one runs once and ends: nothing loops. */
import { animate, motionReduced } from './anim';
import { icon } from './art';
import { h } from './dom';

export function shake(el: Element, delay = 0): Promise<void> {
  return animate(
    el,
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 260, delay, easing: 'ease-out' },
  );
}

export function flash(el: Element, delay = 0): Promise<void> {
  return animate(el, [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 220, delay });
}

/** Move toward (dx, dy) and back. */
export function hop(el: Element, dx: number, dy: number, delay = 0): Promise<void> {
  return animate(
    el,
    [{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) scale(1.06)`, offset: 0.4 }, { transform: 'translate(0,0)' }],
    { duration: 300, delay, easing: 'ease-out' },
  );
}

export function pop(el: Element, delay = 0): Promise<void> {
  return animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 260, delay });
}

/** The dice "flip": spin and land. */
export function flip(el: Element, delay = 0): Promise<void> {
  return animate(
    el,
    [
      { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translateY(-26px) rotate(180deg) scale(0.8)', opacity: 0.6, offset: 0.45 },
      { transform: 'translateY(0) rotate(360deg) scale(1.08)', opacity: 1, offset: 0.85 },
      { transform: 'translateY(0) rotate(360deg) scale(1)', opacity: 1 },
    ],
    { duration: 420, delay, easing: 'ease-out', reducedKeyframes: [{ opacity: 0.4 }, { opacity: 1 }] },
  );
}

/** A number that floats up from a unit and fades. */
export function floatText(host: HTMLElement, text: string, kind: 'dmg' | 'heal' | 'shield' | 'status' | 'info', delay = 0, iconId?: string): Promise<void> {
  const el = h('div', { class: `float float-${kind}`, attrs: { 'aria-hidden': 'true' } }, iconId ? icon(iconId, kind === 'status' ? 18 : 24) : null, h('b', { class: 'num', text }));
  el.style.opacity = '0';
  host.append(el);
  const p = animate(
    el,
    [
      { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -14px) scale(1.25)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -44px) scale(1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -60px) scale(1)', opacity: 0 },
    ],
    { duration: 800, delay, fill: 'both', easing: 'ease-out', reducedKeyframes: [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }] },
  );
  void p.then(() => el.remove());
  return p;
}

export function fadeOut(el: Element, delay = 0): Promise<void> {
  return animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay, fill: 'forwards' });
}

/**
 * A copy of a die hops, then flies on an arc from its slot to a target and shrinks into it.
 * The real die never leaves its slot. Returns the time (ms from now) at which it lands.
 */
export function flyDie(layer: HTMLElement, die: HTMLElement, target: Element, delay = 0): number {
  if (motionReduced()) return 0;
  const HOP = 90;
  const FLY = 220;
  const from = die.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const lay = layer.getBoundingClientRect();
  const ghost = die.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-testid');
  for (const el of ghost.querySelectorAll('[data-testid]')) el.removeAttribute('data-testid');
  ghost.className = 'die die-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.position = 'absolute';
  ghost.style.left = `${from.left - lay.left}px`;
  ghost.style.top = `${from.top - lay.top}px`;
  ghost.style.margin = '0';
  ghost.style.opacity = '0';
  layer.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const lift = Math.min(90, 30 + Math.abs(dx) * 0.25);
  const total = HOP + FLY;
  const a = HOP / total;
  void animate(ghost, [
    { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0, easing: 'ease-out' },
    { transform: 'translate(0,-12px) scale(1.06)', opacity: 1, offset: a * 0.6 },
    { transform: 'translate(0,0) scale(1)', opacity: 1, offset: a, easing: 'ease-in-out' },
    { transform: `translate(${dx * 0.5}px,${dy * 0.5 - lift}px) scale(0.8) rotate(160deg)`, opacity: 1, offset: a + (1 - a) * 0.5 },
    { transform: `translate(${dx}px,${dy}px) scale(0.4) rotate(320deg)`, opacity: 1, offset: 0.97 },
    { transform: `translate(${dx}px,${dy}px) scale(0.3) rotate(320deg)`, opacity: 0, offset: 1 },
  ], { duration: total, delay, fill: 'both' }).then(() => ghost.remove());
  return delay + total;
}

/** A quick ring that pops and fades over an element (impact flash / effect burst). */
export function burst(layer: HTMLElement, over: Element, kind: string, delay = 0): Promise<void> {
  const r = over.getBoundingClientRect();
  const lay = layer.getBoundingClientRect();
  const el = h('div', { class: `burst burst-${kind}`, attrs: { 'aria-hidden': 'true' } });
  const size = Math.max(36, Math.min(r.width, r.height));
  el.style.left = `${r.left - lay.left + r.width / 2 - size / 2}px`;
  el.style.top = `${r.top - lay.top + r.height / 2 - size / 2}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.opacity = '0';
  layer.append(el);
  const p = animate(el, [
    { transform: 'scale(0.3)', opacity: 0.95 },
    { transform: 'scale(1.15)', opacity: 0.7, offset: 0.6 },
    { transform: 'scale(1.4)', opacity: 0 },
  ], { duration: 240, delay, fill: 'both', easing: 'ease-out', reducedKeyframes: [{ opacity: 0.8 }, { opacity: 0 }] });
  void p.then(() => el.remove());
  return p;
}

/** A ribbon that links matching dice, with the set's name popping once above it. */
export function ribbon(layer: HTMLElement, dice: Element[], label: string, kind: string, delay = 0): Promise<void> {
  if (dice.length === 0) return Promise.resolve();
  const lay = layer.getBoundingClientRect();
  const rects = dice.map((d) => d.getBoundingClientRect());
  const xs = rects.map((r) => r.left + r.width / 2 - lay.left);
  const first = rects[0];
  // Across the tops of the dice, so it never hides a face (or crosses a die that is not in the set).
  const y = (first?.top ?? 0) - lay.top + 2;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const line = h('div', { class: `ribbon ribbon-${kind}`, attrs: { 'aria-hidden': 'true' } });
  line.style.left = `${x0}px`;
  line.style.top = `${y - 4}px`;
  line.style.width = `${Math.max(8, x1 - x0)}px`;
  line.style.opacity = '0';
  const tag = h('div', { class: `ribbon-tag ribbon-${kind}`, text: label, attrs: { 'aria-hidden': 'true' } });
  tag.style.left = `${(x0 + x1) / 2}px`;
  tag.style.top = `${(first?.top ?? 0) - lay.top - 26}px`;
  tag.style.opacity = '0';
  layer.append(line, tag);
  if (!motionReduced()) {
    void animate(line, [
      { transform: 'scaleX(0)', opacity: 1 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.35 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.8 },
      { transform: 'scaleX(1)', opacity: 0 },
    ], { duration: 520, delay, fill: 'both', easing: 'ease-out' });
    for (const d of dice) void pop(d, delay + 80);
  }
  const p = animate(tag, [
    { transform: 'translate(-50%, 6px) scale(0.6)', opacity: 0 },
    { transform: 'translate(-50%, 0) scale(1.15)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.8 },
    { transform: 'translate(-50%, -6px) scale(1)', opacity: 0 },
  ], { duration: 620, delay, fill: 'both', reducedKeyframes: [{ opacity: 1, transform: 'translate(-50%, 0)' }, { opacity: 1, transform: 'translate(-50%, 0)' }] });
  void p.then(() => {
    line.remove();
    tag.remove();
  });
  return p;
}
