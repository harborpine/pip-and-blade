/**
 * Seeded randomness. Every random number is a pure hash of (seed, streamName, counter).
 * Counters for the incrementing streams live in RunState.rng, so state stays plain JSON.
 */
import type { RunState } from '@shared';

/** FNV-1a over a string, continuing from `h`. */
export function hashStr(s: string, h = 2166136261): number {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A uniform 32-bit unsigned integer for (seed, stream, counter). */
export function rand32(seed: string, stream: string, counter: number): number {
  const h = hashStr(stream, hashStr('|', hashStr(seed)));
  return mix(mix(h ^ Math.imul(counter + 1, 0x9e3779b1)) + 0x6d2b79f5);
}

/** Pure pick in [0, n) with an explicit counter (no state touched). */
export function pureInt(seed: string, stream: string, counter: number, n: number): number {
  return n <= 1 ? 0 : Math.floor((rand32(seed, stream, counter) / 4294967296) * n);
}

/** Next integer in [0, n) from a counted stream of the run. Advances the stream's counter. */
export function nextInt(run: RunState, stream: string, n: number): number {
  const k = run.rng[stream] ?? 0;
  run.rng[stream] = k + 1;
  return pureInt(run.seed, stream, k, n);
}

export const diceStream = (run: RunState): string => `dice:${run.act}.${run.slot}`;
export const aiStream = (run: RunState): string => `ai:${run.act}.${run.slot}`;
export const mapStream = (act: number): string => `map:${act}`;
export const rewardStream = (run: RunState): string => `reward:${run.act}.${run.slot}`;
export const shopStream = (run: RunState): string => `shop:${run.act}.${run.slot}`;
export const eventStream = (run: RunState): string => `event:${run.act}.${run.slot}`;
