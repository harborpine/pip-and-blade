import { describe, expect, it } from 'vitest';
import { createEngine } from './index';
import { fullContent } from './testing/fixtures';
import { randomRun } from './testing/harness';

describe('speed', () => {
  it('a full run of random legal actions averages well under 5 ms', () => {
    const engine = createEngine(fullContent());
    const g0 = engine.newGame();
    const play = (n: number, tag: string): number => {
      let steps = 0;
      for (let i = 0; i < n; i++) {
        const start = engine.apply(g0, { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0, seed: `${tag}${i}` }).game;
        steps += randomRun(engine, start, `${tag}-bot-${i}`, 20000).steps;
      }
      return steps;
    };
    play(300, 'warm');
    const t = performance.now();
    const steps = play(2000, 'perf');
    const ms = (performance.now() - t) / 2000;
    console.log(`engine speed: ${ms.toFixed(3)} ms per random run (${(steps / 2000).toFixed(0)} actions per run)`);
    expect(ms).toBeLessThan(5);
  });
});
