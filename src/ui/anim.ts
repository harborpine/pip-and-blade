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
