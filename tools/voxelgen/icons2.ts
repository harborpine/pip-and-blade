/** 16 px icons: enemy intents and interface icons. */
import type { Canvas } from './canvas';
import { asciiIcon, icon } from './canvas';
import { arrow, HEART, plus, SHIELD, SKULL, sword } from './icons1';
import type { Sprite } from './sheet';

const S = 16;
const A = (rows: string[], legend: Record<string, string> = {}): Canvas => asciiIcon(S, rows, legend);
const sp = (canvas: Canvas): Sprite => ({ canvas, ax: canvas.w / 2, ay: canvas.h / 2 });

function dieFace(c: Canvas, x: number, y: number, size: number, body = 'w', pip = 'k'): void {
  c.rect(x, y, size, size, body);
  c.rect(x, y, size, 1, `${body}+`);
  c.rect(x + size - 1, y + 1, 1, size - 1, `${body}-`);
  c.rect(x + 1, y + 1, 2, 2, pip);
  c.rect(x + size - 4, y + size - 4, 2, 2, pip);
}

function padlock(c: Canvas, x: number, y: number, col = 'y'): void {
  c.rect(x + 1, y, 1, 3, 'g'); c.rect(x + 4, y, 1, 3, 'g'); c.rect(x + 2, y, 2, 1, 'g');
  c.rect(x, y + 3, 6, 5, col);
  c.rect(x, y + 3, 6, 1, `${col}+`);
  c.rect(x + 2, y + 5, 2, 2, 'k');
}

export const intents = (): Record<string, Sprite> => ({
  attack: sp(icon(S, (c) => {
    sword(c, 8, 4, 8, 14, 'r');
  })),
  attack_all: sp(icon(S, (c) => {
    c.line(8, 2, 2, 14, 'r', 2);
    c.line(8, 2, 13, 14, 'r', 2);
    c.line(8, 1, 8, 14, 'r+', 2);
    c.rect(5, 3, 7, 2, 'y');
    c.rect(7, 0, 3, 2, 'u');
  })),
  shield: sp(A(SHIELD('b', 'n'))),
  heal: sp(icon(S, (c) => {
    plus(c, 8, 8, 6, 'e');
    c.rect(7, 3, 1, 9, 'l'); c.rect(3, 7, 9, 1, 'l');
  })),
  buff: sp(icon(S, (c) => {
    arrow(c, 6, 8, 'up', 'o', 12);
    c.rect(11, 1, 2, 6, 'y'); c.rect(9, 3, 6, 2, 'y');
    c.set(11, 3, 'w');
  })),
  debuff: sp(icon(S, (c) => {
    arrow(c, 8, 8, 'down', 'v', 12);
    c.rect(7, 2, 2, 4, 'p');
  })),
  lockDie: sp(icon(S, (c) => {
    dieFace(c, 1, 5, 10);
    c.line(1, 12, 13, 4, 'g', 2);
    c.line(1, 8, 12, 14, 'g', 1);
    padlock(c, 9, 7);
  })),
  curseFace: sp(icon(S, (c) => {
    dieFace(c, 2, 2, 12);
    c.rect(6, 4, 2, 2, 'v'); c.rect(7, 6, 2, 2, 'v'); c.rect(8, 8, 2, 2, 'v'); c.rect(7, 10, 2, 2, 'v');
    c.rect(9, 3, 4, 4, 'i'); c.rect(10, 4, 2, 2, 'v');
    c.rect(9, 9, 4, 4, 'i');
  })),
  stealReroll: sp(icon(S, (c) => {
    c.ellipse(9, 7, 5, 5, 'y');
    c.ellipse(9, 7, 2.6, 2.6, 'k');
    c.clear(9, 7);
    c.rect(9, 0, 5, 3, 'k'); // gap for arrowhead
    c.poly([[14, 0], [14, 5], [9, 2.5]], 'o');
    // grabbing hand
    c.rect(1, 8, 7, 5, 'h');
    c.rect(1, 8, 7, 1, 'h+');
    c.rect(6, 6, 2, 3, 'h'); c.rect(8, 6, 1, 4, 'h');
    c.rect(2, 13, 4, 2, 'h');
    c.rect(0, 9, 2, 3, 'h');
  })),
  summon: sp(icon(S, (c) => {
    c.ellipse(6, 9, 4, 4, 'v');
    c.rect(3, 4, 2, 3, 'v'); c.rect(8, 4, 2, 3, 'v');
    c.rect(4, 8, 1, 1, 'w'); c.rect(7, 8, 1, 1, 'w');
    c.rect(4, 13, 2, 2, 'v'); c.rect(8, 13, 2, 2, 'v');
    plus(c, 12, 4, 3, 'e');
  })),
  charge: sp(icon(S, (c) => {
    c.rect(3, 1, 10, 2, 'c'); c.rect(3, 13, 10, 2, 'c');
    c.poly([[4, 3], [12, 3], [9, 8], [12, 13], [4, 13], [7, 8]], 'r');
    c.poly([[5, 3], [11, 3], [8, 6]], 'o');
    c.poly([[5, 13], [11, 13], [8, 10]], 'y');
    c.rect(7, 7, 2, 2, 'w');
    c.set(1, 5, 'r'); c.set(14, 5, 'r'); c.set(1, 11, 'r'); c.set(14, 11, 'r');
  })),
});

export const uiIcons = (): Record<string, Sprite> => ({
  reroll: sp(icon(S, (c) => {
    for (let a = 200; a <= 340; a += 5) {
      const th = (a * Math.PI) / 180;
      c.rect(Math.round(7 + Math.cos(th) * 5.5), Math.round(8 + Math.sin(th) * 5.5), 2, 2, 'w');
    }
    for (let a = 20; a <= 160; a += 5) {
      const th = (a * Math.PI) / 180;
      c.rect(Math.round(7 + Math.cos(th) * 5.5), Math.round(8 + Math.sin(th) * 5.5), 2, 2, 'w');
    }
    c.poly([[10, 3], [15, 6], [10, 9]], 'w');
    c.poly([[6, 7], [1, 10], [6, 13]], 'w');
    c.rect(6, 7, 3, 3, 'y');
  })),
  lock: sp(icon(S, (c) => {
    c.rect(4, 1, 2, 6, 'g'); c.rect(10, 1, 2, 6, 'g'); c.rect(4, 1, 8, 2, 'g');
    c.rect(2, 7, 12, 8, 'y');
    c.rect(2, 7, 12, 1, 'y+');
    c.rect(7, 10, 2, 3, 'k');
  })),
  unlock: sp(icon(S, (c) => {
    c.rect(3, 4, 3, 5, 'g'); c.rect(3, 1, 10, 3, 'g'); c.rect(10, 0, 3, 4, 'g');
    c.rect(3, 1, 10, 1, 'g+');
    c.rect(2, 8, 12, 7, 'y');
    c.rect(2, 8, 12, 1, 'y+');
    c.rect(7, 10, 2, 3, 'k');
  })),
  undo: sp(icon(S, (c) => {
    for (let a = 190; a <= 400; a += 6) {
      const th = (a * Math.PI) / 180;
      c.rect(Math.round(7 + Math.cos(th) * 5), Math.round(8 + Math.sin(th) * 4.5), 3, 3, 'w');
    }
    c.poly([[0, 6], [8, 6], [3.5, 12]], 'w');
  })),
  end_turn: sp(icon(S, (c) => {
    c.poly([[2, 2], [8, 8], [2, 14]], 'y');
    c.poly([[8, 2], [14, 8], [8, 14]], 'y');
    c.rect(2, 2, 1, 4, 'y+');
  })),
  settings: sp(icon(S, (c) => {
    c.disc(8, 8, 5.5, 'g');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.rect(Math.round(8 + Math.cos(a) * 6.5 - 1), Math.round(8 + Math.sin(a) * 6.5 - 1), 3, 3, 'g');
    }
    c.disc(8, 8, 3.2, 'k'); c.disc(8, 8, 2, 's');
    c.rect(5, 5, 4, 1, 'g+');
  })),
  back: sp(icon(S, (c) => {
    c.poly([[10, 1], [12, 3], [7, 8], [12, 13], [10, 15], [3, 8]], 'w');
  })),
  close: sp(icon(S, (c) => {
    c.line(3, 3, 12, 12, 'w', 2); c.line(12, 3, 3, 12, 'w', 2);
  })),
  check: sp(icon(S, (c) => {
    c.line(2, 8, 6, 12, 'l', 3); c.line(6, 12, 13, 3, 'l', 3);
    c.line(3, 8, 6, 11, 'l+', 1);
  })),
  hp: sp(A(HEART('r'))),
  shield: sp(A(SHIELD('b', 'n'))),
  ward: sp(A(SHIELD('b', 'y'))),
  gold: sp(icon(S, (c) => {
    for (const cy of [10, 6, 2]) {
      c.rect(2, cy, 12, 3, 'o');
      c.ellipse(7.5, cy + 3, 6.2, 2.4, 'o');
      c.ellipse(7.5, cy, 6.2, 2.4, 'y');
      c.ellipse(7.5, cy, 3.6, 1.2, 'o');
      c.ellipse(7.5, cy, 3, 0.9, 'y+');
    }
    c.set(4, 1, 'w'); c.set(5, 1, 'w'); c.set(11, 12, 'y+');
  })),
  downed: sp(icon(S, (c) => {
    c.rect(3, 4, 9, 11, 'g');
    c.rect(4, 2, 7, 2, 'g'); c.rect(5, 1, 5, 1, 'g');
    c.rect(3, 4, 9, 1, 'g+');
    c.rect(11, 4, 1, 11, 's');
    c.rect(7, 5, 1, 5, 'k'); c.rect(5, 7, 5, 1, 'k');
    c.rect(1, 13, 14, 2, 'e');
    c.set(13, 2, 'y'); c.set(14, 3, 'y'); c.set(1, 2, 'y');
  })),
  play: sp(icon(S, (c) => {
    sword(c, 5, 8, 14, 8, 'w');
    c.rect(1, 6, 2, 5, 'u');
  })),
  daily: sp(icon(S, (c) => {
    c.rect(1, 2, 14, 13, 'w');
    c.rect(1, 2, 14, 4, 'r');
    c.rect(4, 0, 2, 3, 'g'); c.rect(10, 0, 2, 3, 'g');
    c.rect(6, 8, 4, 4, 'k');
    c.rect(7, 9, 2, 2, 'w');
    c.rect(1, 14, 14, 1, 'g');
  })),
  collection: sp(icon(S, (c) => {
    c.rect(1, 3, 6, 11, 'b'); c.rect(8, 3, 6, 11, 'b');
    c.rect(2, 4, 4, 9, 'w'); c.rect(9, 4, 4, 9, 'w');
    c.rect(7, 2, 2, 12, 'n');
    for (const y of [6, 8, 10]) { c.rect(3, y, 2, 1, 'g'); c.rect(10, y, 2, 1, 'g'); }
  })),
  stats: sp(icon(S, (c) => {
    c.rect(2, 9, 3, 5, 'b'); c.rect(6, 5, 3, 9, 'y'); c.rect(10, 2, 3, 12, 'r');
    c.rect(2, 9, 3, 1, 'b+'); c.rect(6, 5, 3, 1, 'y+'); c.rect(10, 2, 3, 1, 'r+');
    c.rect(1, 14, 14, 1, 'w');
  })),
  feat: sp(icon(S, (c) => {
    c.poly([[3, 0], [7, 0], [9, 6], [5, 6]], 'r'); c.poly([[9, 0], [13, 0], [11, 6], [7, 6]], 'b');
    c.disc(8, 10, 4.6, 'y'); c.disc(8, 10, 2.6, 'o');
    c.set(8, 9, 'w'); c.set(7, 10, 'y+');
  })),
  feat_locked: sp(icon(S, (c) => {
    c.poly([[3, 0], [7, 0], [9, 6], [5, 6]], 's'); c.poly([[9, 0], [13, 0], [11, 6], [7, 6]], 's');
    c.disc(8, 10, 4.6, 'g'); c.disc(8, 10, 2.6, 's');
    c.rect(7, 9, 2, 3, 'k');
  })),
  tutorial: sp(icon(S, (c) => {
    c.rect(3, 1, 10, 13, 'c');
    c.rect(2, 0, 12, 2, 'h'); c.rect(2, 13, 12, 2, 'h');
    c.rect(6, 3, 4, 2, 'n'); c.rect(9, 4, 2, 3, 'n'); c.rect(7, 7, 2, 2, 'n'); c.rect(7, 10, 2, 2, 'n');
  })),
  export: sp(icon(S, (c) => {
    c.rect(2, 8, 12, 7, 'u'); c.rect(2, 8, 12, 1, 'h'); c.rect(2, 8, 2, 7, 'h');
    arrow(c, 8, 4, 'up', 'y', 8);
  })),
  import: sp(icon(S, (c) => {
    c.rect(2, 8, 12, 7, 'u'); c.rect(2, 8, 12, 1, 'h'); c.rect(2, 8, 2, 7, 'h');
    arrow(c, 8, 4, 'down', 'y', 8);
  })),
  reset: sp(icon(S, (c) => {
    c.rect(5, 0, 6, 2, 'g'); c.rect(1, 2, 14, 2, 'g');
    c.rect(3, 4, 10, 11, 'g'); c.rect(3, 4, 1, 11, 'g+'); c.rect(12, 4, 1, 11, 's');
    for (const x of [5, 8, 10]) c.rect(x, 6, 1, 7, 's');
  })),
  motion: sp(icon(S, (c) => {
    c.rect(1, 3, 10, 2, 'w'); c.rect(4, 7, 11, 2, 'w'); c.rect(1, 11, 8, 2, 'w');
    c.rect(12, 3, 2, 2, 'w+');
    c.line(2, 14, 14, 1, 'r', 2);
  })),
  tier: sp(icon(S, (c) => {
    c.poly([[8, 0], [12, 5], [13, 10], [11, 14], [5, 14], [3, 10], [4, 6], [6, 8]], 'o');
    c.poly([[8, 5], [10, 9], [9, 13], [6, 13], [6, 9]], 'y');
    c.rect(5, 13, 6, 3, 'k'); c.rect(6, 14, 4, 1, 'w');
  })),
  unknown: sp(icon(S, (c) => {
    c.rect(1, 1, 14, 14, 's');
    c.rect(1, 1, 14, 1, 'g'); c.rect(14, 2, 1, 13, 'k');
    c.rect(5, 3, 6, 2, 'w'); c.rect(9, 4, 2, 3, 'w'); c.rect(7, 7, 3, 2, 'w'); c.rect(7, 9, 2, 2, 'w'); c.rect(7, 12, 2, 2, 'w');
  })),
  rotate: sp(icon(S, (c) => {
    c.rect(4, 3, 7, 11, 'g'); c.rect(5, 4, 5, 8, 'b'); c.rect(7, 13, 1, 1, 'k');
    for (let a = -60; a <= 70; a += 6) {
      const th = (a * Math.PI) / 180;
      c.rect(Math.round(7 + Math.cos(th) * 7), Math.round(8 + Math.sin(th) * 7), 2, 2, 'y');
    }
    c.poly([[9, 11], [14, 11], [13, 15]], 'y');
  })),
  info: sp(icon(S, (c) => {
    c.disc(8, 8, 7, 'b');
    c.disc(8, 8, 5.4, 'n');
    c.rect(7, 3, 2, 2, 'w'); c.rect(7, 6, 2, 7, 'w'); c.rect(6, 6, 1, 1, 'w'); c.rect(6, 12, 4, 1, 'w');
  })),
  skip: sp(icon(S, (c) => {
    c.poly([[2, 3], [7, 8], [2, 13]], 'w'); c.poly([[8, 3], [13, 8], [8, 13]], 'w');
    c.rect(14, 3, 1, 11, 'w');
  })),
  act: sp(icon(S, (c) => {
    c.rect(3, 1, 2, 14, 'u');
    c.poly([[5, 2], [13, 2], [10, 5], [13, 8], [5, 8]], 'r');
    c.rect(5, 2, 8, 1, 'r+');
  })),
  boss: sp(icon(S, (c) => {
    c.ascii(SKULL('w'), 2, 5);
    c.poly([[3, 6], [3, 1], [6, 4], [8, 0], [10, 4], [13, 1], [13, 6]], 'y');
    c.rect(3, 5, 10, 1, 'y+');
  })),
  fight: sp(icon(S, (c) => {
    c.line(2, 2, 13, 13, 'g', 2); c.line(13, 2, 2, 13, 'g', 2);
    c.rect(1, 9, 5, 2, 'y'); c.rect(10, 9, 5, 2, 'y');
    c.rect(3, 12, 2, 3, 'u'); c.rect(11, 12, 2, 3, 'u');
    c.line(3, 3, 12, 12, 'w', 1);
  })),
});
