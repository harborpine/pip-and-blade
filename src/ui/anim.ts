/**
 * Animation bookkeeping. Animations run on the browser's compositor (Web Animations on
 * transform and opacity). Nothing here runs while idle: it only counts how many animations are
 * in flight so tests can wait for them (window.__pip.waitIdle()).
 */
let active = 0;
let holds = 0;
let waiters: (() => void)[] = [];
let animWaiters: (() => void)[] = [];

export function motionReduced(): boolean {
  return document.documentElement.dataset['motion'] === 'reduced';
}

function release(): void {
  active -= 1;
  if (active <= 0) {
    active = 0;
    const aw = animWaiters;
    animWaiters = [];
    for (const f of aw) f();
    settle();
  }
}

/** Register work (a promise) as an in-flight animation. */
export function track<T>(p: Promise<T>): Promise<T> {
  active += 1;
  p.then(release, release);
  return p;
}

export function isIdle(): boolean {
  return active === 0 && holds === 0;
}

function settle(): void {
  if (active === 0 && holds === 0) {
    const w = waiters;
    waiters = [];
    for (const f of w) f();
  }
}

/** Keep waitIdle() pending until the returned function is called (used for a screen swap that is still to come). */
export function hold(): () => void {
  holds += 1;
  return () => {
    holds -= 1;
    settle();
  };
}

/** Resolves when no tracked animation is running and no screen swap is pending. */
export function waitIdle(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      if (isIdle()) resolve();
      else waiters.push(resolve);
    });
  });
}

/** Resolves when no tracked animation is running (ignores pending swaps). Used by a screen that is about to be replaced. */
export function waitAnimations(): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (active === 0) resolve();
      else animWaiters.push(check);
    };
    queueMicrotask(check);
  });
}

/** Wait for ms of real time (shortened under reduced motion). Tracked. */
export function sleep(ms: number): Promise<void> {
  const real = motionReduced() ? Math.min(ms, 40) : ms;
  return track(new Promise<void>((r) => setTimeout(r, real)));
}

/** Run a Web Animation and resolve when it finishes. Under reduced motion: a short fade only. */
export function animate(el: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions & { reducedKeyframes?: Keyframe[] } = {}): Promise<void> {
  if (typeof el.animate !== 'function') return Promise.resolve();
  const { reducedKeyframes, ...o } = opts;
  const reduced = motionReduced();
  const kf = reduced ? (reducedKeyframes ?? [{ opacity: 0.6 }, { opacity: 1 }]) : keyframes;
  const options: KeyframeAnimationOptions = reduced ? { ...o, delay: 0, duration: Math.min(Number(o.duration ?? 200), 120), easing: 'linear' } : o;
  const a = el.animate(kf, options);
  return track(a.finished.then(() => undefined, () => undefined));
}

// ------------------------------------------------------------ input gate
// While an animation that the player must see is in flight (a die flying, dice still tumbling,
// the enemies acting) taps are not lost: they wait in a short queue and run when the gate opens.

let gateUntil = 0;
let queued: (() => void)[] = [];

function flushInputs(): void {
  while (queued.length > 0 && performance.now() >= gateUntil - 1) {
    const fn = queued.shift();
    fn?.();
  }
}

/** Hold player input for ms from now (no-op under reduced motion, where nothing needs watching). */
export function gateInput(ms: number): void {
  if (ms <= 0 || motionReduced()) return;
  const until = performance.now() + ms;
  if (until <= gateUntil) return;
  gateUntil = until;
  void track(new Promise<void>((resolve) => setTimeout(() => {
    flushInputs();
    resolve();
  }, ms)));
}

export function inputGated(): boolean {
  return performance.now() < gateUntil - 1 || queued.length > 0;
}

/** Run a tap handler now, or queue it until the gate opens (at most 4 wait; older ones run first). */
export function onInput(fn: () => void): void {
  if (!inputGated()) {
    fn();
    return;
  }
  if (queued.length < 4) queued.push(fn);
}

export function clearInputs(): void {
  queued = [];
  gateUntil = 0;
}
