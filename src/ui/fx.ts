/** Small visual effects. CSS transforms and opacity only. Each one runs once and ends: nothing loops. */
import { animate } from './anim';
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
export function floatText(host: HTMLElement, text: string, kind: 'dmg' | 'heal' | 'shield' | 'status' | 'info', delay = 0): Promise<void> {
  const el = h('div', { class: `float float-${kind}`, text, attrs: { 'aria-hidden': 'true' } });
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
