/** Six door icons for the map choice screen: 32 px arched doors in the shared palette. */
import type { Canvas } from './canvas';
import { icon } from './canvas';
import type { Sprite } from './sheet';

const S = 32;

/** Stone arch frame; returns nothing. The door leaf is drawn inside x 8..23, y 6..30. */
function frame(c: Canvas, leaf: string, leafLight: string): void {
  c.rect(3, 8, 26, 23, 'g');
  c.ellipse(15.5, 9, 13, 8, 'g');
  c.rect(3, 8, 4, 23, 's'); c.rect(25, 8, 4, 23, 's');
  c.rect(3, 29, 26, 2, 's');
  c.ellipse(15.5, 10, 9.5, 8, leaf);
  c.rect(6, 10, 20, 20, leaf);
  c.rect(6, 10, 2, 20, leafLight);
  c.ellipse(15.5, 10, 9.5, 8, leaf);
  c.rect(6, 10, 20, 19, leaf);
  c.rect(6, 10, 3, 19, leafLight);
  c.rect(15, 2, 2, 3, 'g+'); // keystone
  c.rect(14, 3, 4, 3, 'g+');
}

const DOORS: Record<string, (c: Canvas) => void> = {
  elite: (c) => {
    frame(c, 's', 'g');
    for (const y of [14, 22]) c.rect(6, y, 20, 2, 'k');
    for (const [x, y] of [[8, 13], [22, 13], [8, 21], [22, 21], [8, 27], [22, 27]] as [number, number][]) c.rect(x, y, 2, 2, 'g+');
    c.disc(15.5, 18, 4.4, 'r');
    c.rect(12, 20, 8, 4, 'r'); c.rect(11, 15, 2, 2, 'x');
    c.rect(12, 17, 3, 3, 'k'); c.rect(17, 17, 3, 3, 'k'); c.rect(15, 20, 2, 2, 'k');
    for (const x of [13, 15, 17, 19]) c.rect(x, 23, 1, 1, 'k');
    c.rect(13, 12, 2, 2, 'r+');
  },
  rest: (c) => {
    frame(c, 'u', 'h');
    for (const x of [11, 15, 19, 23]) c.rect(x, 12, 1, 17, 'z');
    c.rect(6, 22, 20, 1, 'z');
    c.rect(10, 12, 12, 11, 'c'); c.rect(10, 12, 12, 1, 'w'); c.rect(10, 22, 12, 1, 'h');
    c.poly([[16, 14], [19, 18], [18, 21], [13, 21], [12, 18], [14, 17]], 'o');
    c.poly([[16, 16], [18, 19], [17, 21], [14, 21], [14, 19]], 'y');
    c.rect(12, 21, 8, 1, 'u');
  },
  shop: (c) => {
    frame(c, 'h', 'c');
    for (let i = 0; i < 6; i++) c.rect(3 + i * 4.5, 8, 5, 4, i % 2 ? 'w' : 'r');
    c.rect(3, 12, 26, 1, 'x');
    for (let i = 0; i < 6; i++) { c.rect(3 + i * 4.5, 12, 5, 1, i % 2 ? 'c' : 'x'); }
    c.rect(11, 18, 10, 10, 'u'); c.rect(11, 18, 10, 1, 'z');
    c.disc(15.5, 15, 3.4, 'y'); c.disc(15.5, 15, 2.2, 'o'); c.rect(15, 13, 1, 4, 'y');
    c.rect(9, 19, 2, 9, 'h'); c.rect(22, 19, 2, 9, 'h');
  },
  event: (c) => {
    frame(c, 'v', 'p');
    c.rect(6, 14, 20, 1, 'i'); c.rect(6, 25, 20, 1, 'i');
    c.rect(12, 12, 8, 3, 'w'); c.rect(18, 14, 3, 5, 'w'); c.rect(15, 18, 4, 3, 'w'); c.rect(14, 20, 3, 3, 'w'); c.rect(14, 25, 3, 3, 'w');
    c.set(12, 11, 'p'); c.set(22, 12, 'y'); c.set(9, 16, 'y'); c.set(22, 24, 'p');
  },
  treasure: (c) => {
    frame(c, 'y', 'y+');
    for (const y of [14, 25]) c.rect(6, y, 20, 2, 'o');
    c.rect(10, 17, 12, 8, 'u'); c.rect(10, 17, 12, 3, 'h');
    c.rect(10, 20, 12, 1, 'k');
    c.rect(15, 20, 2, 3, 'y');
    c.rect(10, 17, 1, 8, 'z'); c.rect(21, 17, 1, 8, 'z');
    c.set(13, 15, 'w'); c.set(19, 16, 'w');
  },
  onward: (c) => {
    c.rect(3, 8, 26, 23, 'g');
    c.ellipse(15.5, 9, 13, 8, 'g');
    c.rect(3, 8, 4, 23, 's'); c.rect(25, 8, 4, 23, 's'); c.rect(3, 29, 26, 2, 's');
    c.ellipse(15.5, 10, 9.5, 8, 'a');
    c.rect(6, 10, 20, 19, 'a');
    c.ellipse(15.5, 12, 6.5, 6, 'b');
    c.rect(9, 12, 14, 17, 'b');
    c.rect(9, 12, 14, 17, 'a-');
    c.ellipse(15.5, 12, 6.5, 6, 'a-');
    c.rect(9, 12, 14, 17, 'a-');
    c.rect(11, 17, 8, 3, 'y'); c.poly([[19, 13], [25, 18.5], [19, 24]], 'y');
    c.rect(15, 2, 2, 3, 'g+'); c.rect(14, 3, 4, 3, 'g+');
  },
};

export function buildDoors(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  for (const [id, draw] of Object.entries(DOORS)) out.set(`door.${id}`, { canvas: icon(S, draw), ax: S / 2, ay: S / 2 });
  return out;
}
