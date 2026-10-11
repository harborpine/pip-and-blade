/** 16 px icons: symbols, face effects, keyword badges, statuses, set badges. Flat pixel art in the shared palette. */
import type { Canvas } from './canvas';
import { asciiIcon, icon } from './canvas';
import type { Sprite } from './sheet';

const S = 16;
const A = (rows: string[], legend: Record<string, string> = {}): Canvas => asciiIcon(S, rows, legend);
const sp = (canvas: Canvas): Sprite => ({ canvas, ax: canvas.w / 2, ay: canvas.h / 2 });

// ------------------------------------------------------------------ reusable shapes
export const HEART = (c: string): string[] => [
  '..CCC..CCC..'.replaceAll('C', c),
  '.CLLCCCCCCC.'.replaceAll('C', c).replaceAll('L', c.toUpperCase()),
  'CLLCCCCCCCCC'.replaceAll('C', c).replaceAll('L', c.toUpperCase()),
  'CLCCCCCCCCCC'.replaceAll('C', c).replaceAll('L', c.toUpperCase()),
  '.CCCCCCCCCC.'.replaceAll('C', c),
  '..CCCCCCCC..'.replaceAll('C', c),
  '...CCCCCC...'.replaceAll('C', c),
  '....CCCC....'.replaceAll('C', c),
  '.....CC.....'.replaceAll('C', c),
];

export const SHIELD = (c: string, rim: string, mark = 'w'): string[] =>
  [
    'RRRRRRRRRR',
    'RLLLLCCCCR',
    'RLCCCCCCCR',
    'RLCCMMCCCR',
    'RLCCMMCCCR',
    'RCCCCCCCCR',
    '.RCCCCCCR.',
    '.RCCCCCCR.',
    '..RCCCCR..',
    '...RCCR...',
    '....RR....',
  ].map((r) => r.replaceAll('R', '@').replaceAll('L', '#').replaceAll('C', c).replaceAll('M', mark).replaceAll('@', rim).replaceAll('#', c.toUpperCase()));

export const SKULL = (c: string): string[] =>
  [
    '..CCCCCCCC..',
    '.CLLCCCCCCC.',
    'CLCCCCCCCCCC',
    'CCkkCCCCkkCC',
    'CCkkCCCCkkCC',
    'CCCCCkkCCCCC',
    '.CCCCCCCCCC.',
    '..CCCCCCCC..',
    '...CkCkCkC..',
    '...CCCCCCC..',
  ].map((r) => r.replaceAll('C', c).replaceAll('L', c.toUpperCase()));

export const STAR4 = (c: string, core = 'w'): string[] =>
  [
    '......C......',
    '......C......',
    '.....CLC.....',
    '.....CLC.....',
    '....CCLCC....',
    'CCCCCLLLCCCCC',
    '.CCCCLMLCCCC.',
    'CCCCCLLLCCCCC',
    '....CCLCC....',
    '.....CLC.....',
    '.....CLC.....',
    '......C......',
    '......C......',
  ].map((r) => r.replaceAll('C', c).replaceAll('L', c.toUpperCase()).replaceAll('M', core));

export const DROP = (c: string): string[] =>
  [
    '.....C.....',
    '.....C.....',
    '....CCC....',
    '....CCC....',
    '...CLCCC...',
    '..CLLCCCC..',
    '..CLCCCCC..',
    '.CCCCCCCCC.',
    '.CCCCCCCCC.',
    '.CCCCCCCCC.',
    '..CCCCCCC..',
    '...CCCCC...',
  ].map((r) => r.replaceAll('C', c).replaceAll('L', c.toUpperCase()));

export function sword(c: Canvas, x0: number, y0: number, x1: number, y1: number, blade: string, hilt = 'y'): void {
  // blade from the guard (x0,y0) to the tip (x1,y1)
  c.line(x0, y0, x1, y1, blade, 2);
  c.line(x0 + 1, y0 - 1, x1 + 1, y1 - 1, `${blade[0]}+`, 1);
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  // guard perpendicular
  c.line(x0 - dy * 3, y0 + dx * 3, x0 + dy * 3 + 1, y0 - dx * 3 + 1, hilt, 1);
  c.line(x0 - dy * 3, y0 + dx * 3 + 1, x0 + dy * 3 + 1, y0 - dx * 3 + 2, hilt, 1);
  // grip and pommel
  c.line(x0 - dx, y0 - dy, x0 - dx * 3, y0 - dy * 3, 'u', 2);
  c.set(x0 - dx * 4, y0 - dy * 4, hilt);
  c.set(x0 - dx * 4 + 1, y0 - dy * 4, hilt);
}

export function plus(c: Canvas, cx: number, cy: number, r: number, col: string): void {
  c.rect(cx - 1, cy - r, 3, 2 * r + 1, col);
  c.rect(cx - r, cy - 1, 2 * r + 1, 3, col);
}

export function arrow(c: Canvas, cx: number, cy: number, dir: 'up' | 'down' | 'left' | 'right', col: string, len = 8): void {
  const top = cy - Math.floor(len / 2);
  const left = cx - Math.floor(len / 2);
  if (dir === 'up') {
    for (let i = 0; i < 4; i++) c.rect(cx - i, top + i, 1 + 2 * i, 1, col);
    c.rect(cx - 1, top + 4, 3, len - 4, col);
  } else if (dir === 'down') {
    const bottom = top + len - 1;
    for (let i = 0; i < 4; i++) c.rect(cx - i, bottom - i, 1 + 2 * i, 1, col);
    c.rect(cx - 1, top, 3, len - 4, col);
  } else if (dir === 'left') {
    for (let i = 0; i < 4; i++) c.rect(left + i, cy - i, 1, 1 + 2 * i, col);
    c.rect(left + 4, cy - 1, len - 4, 3, col);
  } else {
    const right = left + len - 1;
    for (let i = 0; i < 4; i++) c.rect(right - i, cy - i, 1, 1 + 2 * i, col);
    c.rect(left, cy - 1, len - 4, 3, col);
  }
}

/** An unmistakable empty face: dashed square, empty pip ring and a slash. */
export function blankIcon(): Canvas {
  return icon(S, (c) => {
    for (let i = 1; i <= 14; i++) {
      if (i % 4 === 3 || i % 4 === 0) continue;
      for (const [x, y] of [[i, 1], [i, 14], [1, i], [14, i]] as [number, number][]) c.set(x, y, 'g');
    }
    for (let a = 0; a < 360; a += 10) {
      const th = (a * Math.PI) / 180;
      c.set(7.5 + Math.cos(th) * 3.6, 7.5 + Math.sin(th) * 3.6, 'g');
    }
    c.line(3, 12, 12, 3, 'r', 2);
  }, false);
}

// ------------------------------------------------------------------ symbols
export const symbols = (): Record<string, Sprite> => ({
  blade: sp(icon(S, (c) => {
    sword(c, 5, 10, 13, 2, 'r');
  })),
  guard: sp(A(SHIELD('b', 'n'))),
  heart: sp(A(HEART('e'))),
  spark: sp(A(STAR4('y'))),
  skull: sp(A(SKULL('v'))),
});

// ------------------------------------------------------------------ face effects
export const effects = (): Record<string, Sprite> => ({
  damage: sp(icon(S, (c) => {
    for (const [x, y, x2, y2] of [[1, 12, 5, 3], [6, 14, 10, 5], [11, 14, 14, 7]] as [number, number, number, number][]) {
      c.line(x, y, x2, y2, 'r', 3);
      c.line(x + 1, y - 1, x2 + 1, y2, 'w', 1);
    }
  })),
  shield: sp(A(SHIELD('g', 's', 'b'))),
  heal: sp(icon(S, (c) => {
    plus(c, 8, 8, 5, 'e');
    c.rect(7, 4, 1, 8, 'l');
    c.rect(4, 7, 8, 1, 'l');
    c.rect(7, 7, 2, 2, 'w');
  })),
  weaken: sp(icon(S, (c) => {
    // a snapped sword: upper half knocked aside, jagged break, plus a purple down arrow
    c.rect(2, 1, 3, 5, 'g'); c.rect(2, 1, 1, 5, 'g+'); c.set(3, 0, 'g'); c.set(4, 6, 'g'); c.set(2, 6, 'g');
    c.rect(2, 8, 3, 3, 'g'); c.set(3, 7, 'g'); c.set(1, 8, 'g');
    c.line(1, 7, 5, 7, 'r', 1);
    c.rect(0, 11, 7, 2, 'y');
    c.rect(2, 13, 3, 2, 'u');
    arrow(c, 11, 8, 'down', 'v', 12);
    c.rect(10, 2, 1, 5, 'p');
  })),
  focus: sp(icon(S, (c) => {
    for (let a = 30; a <= 320; a += 5) {
      const t = (a * Math.PI) / 180;
      c.rect(Math.round(7 + Math.cos(t) * 5), Math.round(9 + Math.sin(t) * 5), 2, 2, 'y');
    }
    c.poly([[9, 0], [14, 4], [8, 5]], 'y');
    plus(c, 8, 9, 2, 'w');
  })),
  blank: sp(blankIcon()),
});

// ------------------------------------------------------------------ keywords
export const keywords = (): Record<string, Sprite> => ({
  cleave: sp(icon(S, (c) => {
    for (let a = 0; a <= 40; a++) {
      const t = (a / 40) * Math.PI;
      c.rect(Math.round(7 + Math.cos(t + Math.PI) * 6.5), Math.round(10 - Math.sin(t) * 7), 2, 2, 'r');
    }
    for (const x of [2, 7, 12]) c.rect(x, 11, 2, 3, 'w');
  })),
  echo: sp(icon(S, (c) => {
    c.rect(2, 2, 8, 8, 'b');
    c.rect(2, 2, 8, 1, 'b+');
    c.rect(6, 6, 8, 8, 'v');
    c.rect(6, 6, 8, 1, 'v+');
    c.rect(6, 6, 4, 4, 'p');
  })),
  growth: sp(icon(S, (c) => {
    c.rect(7, 7, 2, 7, 'e');
    c.ellipse(4, 6, 3, 1.6, 'l');
    c.ellipse(11, 5, 3, 1.6, 'l');
    c.rect(5, 13, 6, 1, 'u');
    arrow(c, 8, 3, 'up', 'y', 5);
  })),
  reckless: sp(A([
    '..rrr..rrr..',
    '.rRRrrrrrrr.',
    'rRRrrrkrrrrr',
    'rRrrrkrrrrrr',
    '.rrrrrkrrrr.',
    '..rrrkrrrr..',
    '...rrrkrr...',
    '....rrrr....',
    '.....rr.....',
  ])),
  pierce: sp(icon(S, (c) => {
    c.ascii(SHIELD('b', 'n', 'b'), 3, 2);
    c.rect(0, 7, 13, 3, 'w');
    c.rect(0, 8, 13, 1, 'g');
    c.poly([[12, 4], [16, 8.5], [12, 13]], 'y');
    c.rect(0, 5, 3, 2, 'r'); c.rect(0, 10, 3, 2, 'r');
    c.rect(1, 7, 2, 3, 'r');
  })),
  venom: sp(A(DROP('l'))),
  ward: sp(icon(S, (c) => {
    c.ascii(SHIELD('b', 'n', 'b'), 2, 2);
    c.rect(6, 7, 5, 4, 'y');
    c.rect(7, 5, 3, 3, 'y');
    c.rect(8, 6, 1, 2, 'b');
  })),
  twin: sp(icon(S, (c) => {
    c.rect(1, 2, 6, 6, 'w');
    c.rect(9, 2, 6, 6, 'w');
    c.rect(3, 4, 2, 2, 'r'); c.rect(11, 4, 2, 2, 'r');
    c.line(5, 10, 9, 14, 'y', 1); c.line(9, 10, 5, 14, 'y', 1);
    c.line(10, 10, 14, 14, 'y', 1); c.line(14, 10, 10, 14, 'y', 1);
  })),
  rally: sp(icon(S, (c) => {
    c.rect(3, 1, 2, 14, 'u');
    c.poly([[5, 2], [12, 2], [10, 5], [12, 8], [5, 8]], 'o');
    c.rect(5, 2, 7, 1, 'o+');
    plus(c, 8, 5, 2, 'w');
  })),
  momentum: sp(icon(S, (c) => {
    c.disc(9, 8, 4.5, 'o');
    c.disc(9, 8, 2, 'k');
    c.rect(9, 6, 5, 2, 'y');
    c.poly([[11, 3], [15, 5], [11, 7]], 'y');
    c.rect(0, 5, 4, 1, 'w'); c.rect(1, 8, 4, 1, 'w'); c.rect(0, 11, 4, 1, 'w');
  })),
  poised: sp(icon(S, (c) => {
    c.ellipse(8, 8, 7, 4.2, 'w');
    c.disc(8, 8, 3.2, 'b');
    c.disc(8, 8, 1.4, 'k');
    c.set(7, 7, 'w');
    c.rect(7, 1, 2, 2, 'y'); c.rect(7, 13, 2, 2, 'y');
  })),
  execute: sp(icon(S, (c) => {
    c.poly([[1, 1], [9, 0], [9, 9], [5, 7], [1, 8]], 'g');
    c.rect(1, 1, 1, 7, 'w'); c.rect(2, 1, 7, 1, 'g+');
    c.rect(8, 1, 2, 14, 'u');
    c.ascii(['.rr.ss.', 'rrrssss', 'rrrssss', '.rrsss.', '..rss..', '...s...'], 9, 9);
  })),
});

// ------------------------------------------------------------------ statuses
export const statuses = (): Record<string, Sprite> => ({
  poison: sp(icon(S, (c) => {
    c.ascii(DROP('l'), 2, 2);
    c.rect(5, 8, 2, 2, 'f'); c.rect(8, 8, 2, 2, 'f'); c.rect(7, 10, 1, 1, 'f'); c.rect(6, 11, 3, 1, 'f');
  })),
  weak: sp(icon(S, (c) => {
    c.line(4, 12, 11, 4, 'g', 2);
    c.line(11, 4, 13, 8, 'g', 2);
    c.rect(1, 10, 6, 2, 'y');
    c.rect(2, 12, 2, 3, 'u');
    arrow(c, 12, 12, 'down', 'v', 5);
  })),
  strength: sp(icon(S, (c) => {
    c.rect(1, 9, 4, 5, 'h');
    c.rect(4, 7, 5, 5, 'h');
    c.disc(9, 5, 3.5, 'h');
    c.rect(9, 8, 5, 5, 'h');
    c.rect(5, 4, 4, 2, 'q');
    c.rect(1, 13, 5, 2, 'o');
    c.set(9, 4, 'h+');
  })),
  thorns: sp(icon(S, (c) => {
    c.disc(8, 8, 3.5, 'e');
    c.disc(8, 8, 1.6, 'k');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.line(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, 'l', 1);
    }
  })),
  regen: sp(icon(S, (c) => {
    c.poly([[2, 13], [3, 5], [9, 2], [14, 3], [13, 9], [7, 13]], 'e');
    c.line(3, 13, 12, 4, 'l', 1);
    plus(c, 11, 11, 2, 'w');
  })),
  mark: sp(icon(S, (c) => {
    c.disc(8, 8, 6, 'r');
    c.disc(8, 8, 4, 'k');
    c.clear(8, 8);
    c.disc(8, 8, 3, 'r');
    c.disc(8, 8, 1.2, 'w');
    c.rect(7, 0, 2, 4, 'r'); c.rect(7, 12, 2, 4, 'r');
    c.rect(0, 7, 4, 2, 'r'); c.rect(12, 7, 4, 2, 'r');
  })),
});

// ------------------------------------------------------------------ set badges
export const setBadges = (): Record<string, Sprite> => ({
  pair: sp(icon(S, (c) => {
    c.disc(4.5, 8, 3.2, 'w'); c.disc(11.5, 8, 3.2, 'w');
    c.rect(5, 7, 6, 2, 'y');
    c.disc(4.5, 8, 1, 'r'); c.disc(11.5, 8, 1, 'r');
  })),
  triple: sp(icon(S, (c) => {
    c.poly([[2, 7], [4, 4], [6, 6], [8, 2], [10, 6], [12, 4], [14, 7], [14, 9], [2, 9]], 'y');
    c.disc(4, 12, 2.2, 'w'); c.disc(8, 12, 2.2, 'w'); c.disc(12, 12, 2.2, 'w');
    c.set(4, 12, 'r'); c.set(8, 12, 'r'); c.set(12, 12, 'r');
    c.rect(2, 9, 12, 1, 'y+');
  })),
  rainbow: sp(icon(S, (c) => {
    for (let r = 0; r < 3; r++) {
      const cols = ['r', 'y', 'b'];
      for (let a = 0; a <= 16; a++) {
        const t = (a / 16) * Math.PI;
        c.set(8 - Math.cos(t) * (7 - r * 1.5), 9 - Math.sin(t) * (7 - r * 1.5), cols[r] as string);
        c.set(8 - Math.cos(t) * (7 - r * 1.5), 10 - Math.sin(t) * (7 - r * 1.5), cols[r] as string);
      }
    }
    c.disc(4, 12.5, 1.8, 'r'); c.disc(8, 12.5, 1.8, 'y'); c.disc(12, 12.5, 1.8, 'b');
  })),
});
