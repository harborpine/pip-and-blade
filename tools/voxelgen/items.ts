/** The 40 item icons: 24 px flat pixel objects in the shared palette. */
import type { Canvas } from './canvas';
import { icon } from './canvas';
import type { Sprite } from './sheet';

const S = 24;
type Draw = (c: Canvas) => void;

function cube(c: Canvas, x: number, y: number, s: number, body: string): void {
  c.rect(x, y, s, s, body);
  c.rect(x, y, s, 2, `${body}+`);
  c.rect(x + s - 2, y + 2, 2, s - 2, `${body}-`);
}
function pip(c: Canvas, x: number, y: number, col = 'k', r = 1): void {
  c.rect(x, y, r + 1, r + 1, col);
}
function star(c: Canvas, x: number, y: number, col: string): void {
  c.rect(x - 1, y - 3, 3, 7, col);
  c.rect(x - 3, y - 1, 7, 3, col);
  c.set(x, y, 'w');
}

const ITEMS: Record<string, Draw> = {
  whetstone: (c) => {
    c.poly([[3, 14], [6, 9], [20, 9], [21, 14], [18, 19], [5, 19]], 'g');
    c.rect(6, 9, 14, 2, 'g+');
    c.rect(5, 17, 13, 2, 's');
    for (const x of [8, 12, 16]) c.rect(x, 13, 3, 1, 's');
    star(c, 18, 5, 'y');
  },
  oak_buckler: (c) => {
    c.disc(11.5, 11.5, 9.5, 'u');
    c.disc(11.5, 11.5, 7.5, 'h');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; c.rect(Math.round(11 + Math.cos(a) * 8), Math.round(11 + Math.sin(a) * 8), 1, 1, 'g'); }
    c.rect(4, 11, 15, 1, 'u');
    c.disc(11.5, 11.5, 3.6, 'g');
    c.disc(11.5, 11.5, 1.6, 'g+');
  },
  healers_satchel: (c) => {
    c.line(6, 8, 11, 2, 'z', 2); c.line(17, 8, 12, 2, 'z', 2);
    c.rect(3, 8, 18, 13, 'u');
    c.rect(3, 8, 18, 5, 'h');
    c.rect(3, 12, 18, 1, 'z');
    c.rect(10, 11, 4, 4, 'y');
    c.rect(11, 14, 2, 3, 'e'); c.rect(9, 16, 6, 2, 'e'); c.rect(11, 15, 2, 5, 'e');
    c.rect(3, 19, 18, 2, 'z');
  },
  lucky_coin: (c) => {
    c.disc(11.5, 11.5, 9.5, 'y');
    c.disc(11.5, 11.5, 7.5, 'o');
    c.disc(11.5, 11.5, 6.5, 'y');
    for (const [x, y] of [[9, 9], [14, 9], [9, 14], [14, 14]] as [number, number][]) c.disc(x, y, 2, 'e');
    c.rect(11, 12, 2, 7, 'f');
    c.rect(5, 4, 3, 2, 'y+');
  },
  hollow_die: (c) => {
    cube(c, 3, 3, 18, 'g');
    c.rect(5, 5, 12, 12, 's');
    for (const [x, y] of [[8, 8], [14, 14]] as [number, number][]) c.rect(x, y, 3, 3, 'k');
    c.line(14, 3, 11, 9, 'k', 2); c.line(11, 9, 14, 14, 'k', 2); c.line(14, 14, 10, 20, 'k', 2);
    c.rect(5, 5, 12, 1, 'g'); c.rect(5, 5, 1, 12, 'g');
  },
  loaded_pip: (c) => {
    cube(c, 3, 3, 18, 'w');
    c.disc(10.5, 10.5, 4.5, 'r');
    c.disc(10.5, 10.5, 2.5, 'x');
    c.rect(8, 8, 2, 2, 'r+');
    for (const [x, y] of [[16, 16]] as [number, number][]) pip(c, x, y, 'g');
  },
  first_pick_glove: (c) => {
    cube(c, 8, 2, 8, 'w');
    pip(c, 10, 4); pip(c, 13, 7);
    c.rect(6, 11, 12, 10, 'u');
    for (const x of [6, 9, 12, 15]) c.rect(x, 9 + (x === 9 || x === 12 ? -1 : 1), 3, 4, 'u');
    c.rect(6, 11, 12, 2, 'h');
    c.rect(4, 14, 3, 5, 'u');
    c.rect(6, 19, 12, 2, 'z');
    c.rect(7, 17, 10, 1, 'h');
  },
  thorn_mail: (c) => {
    c.poly([[5, 4], [9, 6], [15, 6], [19, 4], [21, 10], [17, 12], [17, 20], [7, 20], [7, 12], [3, 10]], 'e');
    c.rect(9, 6, 6, 2, 'f');
    c.rect(7, 13, 10, 1, 'f'); c.rect(7, 17, 10, 1, 'f');
    for (const [x, y] of [[4, 2], [20, 2], [1, 9], [22, 9], [10, 21], [14, 21], [12, 14], [8, 10], [16, 10]] as [number, number][]) { c.rect(x, y, 2, 2, 'l'); c.set(x, y, 'w'); }
  },
  venom_vial: (c) => {
    c.rect(9, 2, 6, 3, 'u');
    c.rect(10, 5, 4, 5, 'g');
    c.disc(11.5, 15, 7, 'g');
    c.disc(11.5, 15.5, 5.6, 'e');
    c.rect(6, 15, 12, 5, 'e');
    c.rect(7, 12, 10, 3, 'k');
    c.rect(7, 12, 10, 3, 'f');
    c.disc(9, 16, 1.3, 'l'); c.disc(14, 18, 1, 'l'); c.set(12, 14, 'l+');
    c.set(8, 11, 'w');
  },
  twin_charm: (c) => {
    c.ellipse(8, 12, 6.5, 8, 'y');
    c.ellipse(16, 12, 6.5, 8, 'o');
    for (const [cx, col] of [[8, 'y'], [16, 'o']] as [number, string][]) {
      for (let y = 7; y <= 17; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        const dx = (x - cx) / 3.6; const dy = (y - 12) / 5;
        if (dx * dx + dy * dy <= 1) c.clear(x, y);
      }
      void col;
    }
    c.rect(5, 7, 2, 1, 'y+'); c.rect(13, 7, 2, 1, 'o+');
    c.rect(11, 9, 2, 2, 'y'); c.rect(11, 14, 2, 2, 'o');
  },
  crown_of_three: (c) => {
    c.poly([[2, 18], [2, 6], [7, 11], [12, 3], [17, 11], [22, 6], [22, 18]], 'y');
    c.rect(2, 16, 20, 4, 'y');
    c.rect(2, 16, 20, 1, 'y+');
    c.rect(2, 19, 20, 1, 'o');
    c.rect(6, 12, 3, 3, 'r'); c.rect(10, 11, 4, 4, 'b'); c.rect(15, 12, 3, 3, 'e');
    c.set(11, 12, 'w');
  },
  patient_hourglass: (c) => {
    c.rect(4, 1, 16, 3, 'u'); c.rect(4, 20, 16, 3, 'u');
    c.rect(5, 4, 2, 16, 'h'); c.rect(17, 4, 2, 16, 'h');
    c.poly([[7, 4], [17, 4], [13, 12], [17, 20], [7, 20], [11, 12]], 'c');
    c.poly([[8, 5], [16, 5], [13, 10], [11, 10]], 'b');
    c.poly([[8, 19], [16, 19], [13, 15], [11, 15]], 'b');
    c.rect(11, 11, 2, 4, 'b');
  },
  gamblers_ante: (c) => {
    const chip = (y: number, col: string): void => {
      c.ellipse(11.5, y, 8.5, 4, col);
      c.rect(3, y, 17, 4, col);
      c.ellipse(11.5, y + 4, 8.5, 4, `${col}-`);
      c.rect(3, y, 17, 4, col);
      c.ellipse(11.5, y, 8.5, 4, `${col}+`);
      c.ellipse(11.5, y, 5, 2, col);
      for (const x of [4, 18]) c.rect(x, y, 2, 2, 'w');
    };
    chip(16, 'r'); chip(11, 'b'); chip(6, 'w');
  },
  iron_ration: (c) => {
    c.rect(3, 6, 15, 14, 'g');
    c.ellipse(10.5, 6, 7.5, 2.4, 'g+');
    c.rect(3, 10, 15, 6, 'r');
    c.rect(7, 12, 7, 2, 'w');
    c.rect(15, 6, 3, 14, 's');
    c.line(18, 4, 21, 20, 'h', 1); c.rect(20, 3, 2, 3, 'h');
    c.rect(19, 3, 1, 3, 'h');
  },
  seedling_pot: (c) => {
    c.poly([[4, 13], [20, 13], [17, 22], [7, 22]], 'o');
    c.rect(3, 11, 18, 3, 'o'); c.rect(3, 11, 18, 1, 'o+'); c.rect(3, 13, 18, 1, 'u');
    c.rect(5, 14, 3, 7, 'o+');
    c.rect(11, 6, 2, 6, 'e');
    c.ellipse(7, 6, 4, 2.4, 'l'); c.ellipse(17, 4, 4, 2.4, 'l');
    c.rect(4, 5, 7, 1, 'e');
  },
  red_bandana: (c) => {
    c.poly([[2, 8], [22, 8], [22, 14], [2, 14]], 'r');
    c.rect(2, 8, 20, 2, 'r+'); c.rect(2, 13, 20, 1, 'x');
    for (const x of [5, 9, 13, 17]) { c.set(x, 11, 'w'); c.set(x + 1, 12, 'w'); }
    c.disc(19, 14, 3, 'x'); c.rect(18, 14, 3, 7, 'r'); c.rect(21, 14, 2, 6, 'x');
    c.rect(17, 19, 2, 3, 'r');
  },
  mirror_shard: (c) => {
    c.poly([[10, 1], [20, 9], [16, 22], [6, 17], [3, 8]], 'b');
    c.poly([[10, 3], [17, 9], [13, 11], [8, 8]], 'b+');
    c.poly([[13, 11], [16, 21], [7, 17]], 'n');
    c.line(10, 5, 13, 8, 'w', 1);
    star(c, 18, 4, 'w');
  },
  ward_stone: (c) => {
    c.ellipse(11.5, 12, 9, 8, 's');
    c.ellipse(10.5, 10.5, 7.5, 6.4, 'g');
    c.ellipse(9, 8, 4, 3, 'g+');
    c.rect(11, 8, 2, 9, 'b'); c.rect(8, 10, 8, 2, 'b'); c.rect(9, 15, 2, 2, 'b'); c.rect(14, 15, 2, 2, 'b');
  },
  bone_charm: (c) => {
    c.line(7, 2, 3, 8, 'u', 1); c.line(16, 2, 20, 8, 'u', 1); c.rect(7, 1, 10, 1, 'u');
    c.ellipse(11.5, 12, 7, 6, 'c');
    c.rect(7, 16, 10, 5, 'c');
    c.rect(6, 12, 12, 2, 'c');
    c.rect(7, 9, 3, 4, 'k'); c.rect(14, 9, 3, 4, 'k'); c.rect(11, 14, 2, 2, 'k');
    for (const x of [8, 11, 14]) c.rect(x, 19, 1, 2, 'k');
    c.rect(7, 6, 4, 1, 'w');
  },
  unjam_oil: (c) => {
    c.rect(4, 11, 13, 10, 'y'); c.rect(4, 11, 13, 2, 'y+'); c.rect(4, 19, 13, 2, 'o');
    c.rect(7, 8, 7, 3, 'y');
    c.line(16, 10, 21, 5, 'y', 2); c.rect(21, 4, 2, 2, 'y');
    c.rect(2, 12, 2, 6, 'o'); c.rect(1, 12, 2, 1, 'o');
    c.rect(8, 14, 5, 3, 'k');
    c.rect(21, 8, 2, 4, 'k'); c.rect(21, 12, 2, 2, 'k');
  },
  purse_string: (c) => {
    c.disc(11.5, 15, 8, 'u');
    c.rect(7, 6, 10, 5, 'u');
    c.rect(6, 9, 12, 2, 'z');
    c.rect(5, 4, 3, 5, 'u'); c.rect(16, 4, 3, 5, 'u');
    c.rect(7, 10, 10, 1, 'y');
    c.disc(11.5, 16, 3, 'y'); c.disc(11.5, 16, 1.5, 'o');
    c.rect(7, 12, 3, 3, 'h');
    c.line(8, 10, 5, 14, 'y', 1);
  },
  spiked_pommel: (c) => {
    c.rect(10, 9, 4, 8, 'u');
    for (const y of [10, 12, 14]) c.rect(10, y, 4, 1, 'z');
    c.rect(3, 6, 18, 3, 'y'); c.rect(3, 6, 18, 1, 'y+');
    c.rect(9, 2, 6, 4, 'g'); c.rect(10, 2, 4, 1, 'g+');
    c.disc(11.5, 19, 3.4, 'g'); c.set(10, 18, 'g+');
    c.poly([[10, 21], [14, 21], [12, 24]], 'w');
  },
  leech_fang: (c) => {
    c.poly([[6, 2], [18, 2], [16, 8], [13, 15], [11, 22], [10, 15], [8, 8]], 'w');
    c.poly([[8, 3], [11, 3], [10, 14], [9, 8]], 'w');
    c.poly([[12, 9], [16, 8], [13, 15], [11, 22]], 'r');
    c.rect(5, 2, 14, 3, 'x'); c.rect(5, 2, 14, 1, 'r');
    c.rect(8, 6, 1, 3, 'r'); c.set(14, 5, 'r');
  },
  battle_drum: (c) => {
    c.rect(4, 8, 16, 11, 'r');
    c.ellipse(11.5, 8, 8.5, 3.4, 'c');
    c.ellipse(11.5, 19, 8.5, 3.4, 'x');
    c.rect(4, 8, 16, 11, 'r');
    c.ellipse(11.5, 8, 8, 3, 'c'); c.ellipse(11.5, 8, 5, 1.6, 'w');
    for (const x of [6, 10, 14, 18]) { c.line(x, 9, x + 2, 19, 'x', 1); }
    c.line(4, 2, 12, 8, 'h', 2); c.line(19, 2, 11, 8, 'h', 2);
    c.rect(3, 1, 3, 3, 'h'); c.rect(18, 1, 3, 3, 'h');
  },
  last_word: (c) => {
    c.rect(3, 4, 18, 14, 'c');
    c.rect(3, 4, 18, 2, 'w');
    c.rect(1, 3, 3, 16, 'h'); c.rect(20, 3, 3, 16, 'h');
    for (const y of [8, 11, 14]) c.rect(6, y, 12, 1, 'g');
    c.disc(15, 19, 3.6, 'r'); c.set(14, 18, 'r+');
    c.rect(11, 18, 2, 5, 'x'); c.rect(15, 20, 2, 3, 'x');
  },
  cleaver_hook: (c) => {
    c.poly([[2, 5], [19, 5], [20, 16], [2, 16]], 'g');
    c.rect(2, 5, 17, 2, 'g+');
    c.rect(2, 14, 18, 2, 's');
    c.rect(4, 8, 10, 1, 's');
    c.poly([[17, 15], [22, 17], [22, 22], [19, 22], [19, 19], [17, 18]], 'g');
    c.rect(2, 16, 8, 6, 'u'); c.rect(2, 16, 8, 1, 'h');
    c.rect(4, 9, 2, 2, 'k'); c.rect(8, 9, 2, 2, 'k');
  },
  field_medic_kit: (c) => {
    c.rect(8, 2, 8, 3, 'g'); c.rect(8, 2, 2, 5, 'g'); c.rect(14, 2, 2, 5, 'g');
    c.rect(2, 7, 20, 14, 'w');
    c.rect(2, 7, 20, 2, 'c'); c.rect(2, 19, 20, 2, 'g');
    c.rect(2, 12, 20, 1, 'g');
    c.disc(9.5, 15, 2.2, 'r'); c.disc(14.5, 15, 2.2, 'r'); c.poly([[7, 16], [17, 16], [12, 21]], 'r');
  },
  merchants_scale: (c) => {
    c.rect(11, 3, 2, 17, 'y'); c.rect(7, 20, 10, 3, 'o'); c.rect(8, 20, 8, 1, 'y+');
    c.rect(2, 5, 20, 2, 'y'); c.disc(12, 3.5, 2.4, 'y+');
    c.line(3, 7, 2, 14, 'h', 1); c.line(3, 7, 7, 14, 'h', 1);
    c.line(20, 7, 17, 14, 'h', 1); c.line(20, 7, 22, 14, 'h', 1);
    c.poly([[1, 14], [8, 14], [6, 17], [3, 17]], 'y'); c.poly([[16, 14], [23, 14], [21, 17], [18, 17]], 'y');
    c.disc(4.5, 13, 1.6, 'o');
  },
  void_pip: (c) => {
    c.rect(1, 1, 22, 22, 'v');
    c.rect(2, 2, 20, 20, 'i');
    cube(c, 3, 3, 18, 'k');
    c.rect(3, 3, 18, 1, 'v'); c.rect(3, 3, 1, 18, 'v');
    c.disc(11.5, 11.5, 3, 'v'); c.disc(11.5, 11.5, 1.4, 'p');
    c.clear(0, 0);
  },
  echo_bell: (c) => {
    c.poly([[6, 18], [7, 9], [10, 4], [14, 4], [17, 9], [18, 18]], 'g');
    c.rect(5, 17, 14, 3, 'g+'); c.rect(11, 2, 2, 3, 'y');
    c.rect(8, 8, 2, 8, 'w');
    c.disc(11.5, 21, 2, 's');
    for (const [x, r] of [[2, 4], [21, 4]] as [number, number][]) { c.rect(x, 10, 1, r, 'p'); }
    c.rect(0, 12, 1, 6, 'p'); c.rect(23, 12, 1, 6, 'p'); c.rect(2, 11, 1, 8, 'p'); c.rect(21, 11, 1, 8, 'p');
  },
  reckless_idol: (c) => {
    c.rect(6, 8, 12, 14, 'r'); c.rect(6, 8, 12, 2, 'r+'); c.rect(15, 10, 3, 12, 'x');
    c.rect(4, 4, 3, 5, 'c'); c.rect(17, 4, 3, 5, 'c'); c.rect(3, 2, 2, 3, 'c'); c.rect(19, 2, 2, 3, 'c');
    c.rect(8, 11, 3, 3, 'k'); c.rect(13, 11, 3, 3, 'k'); c.set(9, 12, 'y'); c.set(14, 12, 'y');
    c.rect(8, 17, 8, 3, 'k'); for (const x of [9, 11, 13]) c.rect(x, 17, 1, 1, 'w');
    c.rect(5, 21, 14, 2, 'x');
  },
  executioners_hood: (c) => {
    c.poly([[12, 1], [18, 6], [20, 22], [4, 22], [6, 6]], 's');
    c.poly([[12, 3], [16, 7], [17, 20], [12, 21]], 'k');
    c.rect(7, 9, 10, 6, 'k');
    c.rect(8, 11, 3, 2, 'w'); c.rect(13, 11, 3, 2, 'w');
    c.rect(9, 11, 1, 2, 'r'); c.rect(14, 11, 1, 2, 'r');
    c.rect(7, 4, 2, 10, 'g'); c.rect(5, 20, 14, 2, 'k');
  },
  rainbow_prism: (c) => {
    c.poly([[10, 3], [19, 19], [1, 19]], 'w');
    c.poly([[10, 6], [16, 17], [4, 17]], 'c');
    c.poly([[10, 3], [10, 19], [1, 19]], 'w');
    c.line(0, 13, 7, 13, 'w', 1);
    const cols = ['r', 'o', 'y', 'e', 'b', 'v'];
    cols.forEach((col, i) => c.line(14, 12 + i * 0, 22, 6 + i * 2.4, col, 1));
    cols.forEach((col, i) => c.rect(18, 7 + i * 2 - 1, 5, 2, col));
  },
  pip_magnet: (c) => {
    for (let a = 0; a <= 180; a += 5) {
      const t = (a * Math.PI) / 180;
      c.disc(11.5 - Math.cos(t) * 7, 12 - Math.sin(t) * 8 + 1, 2.4, 'r');
    }
    c.rect(2, 11, 5, 8, 'r'); c.rect(16, 11, 5, 8, 'r');
    c.rect(2, 16, 5, 4, 'w'); c.rect(16, 16, 5, 4, 'w');
    c.rect(9, 20, 5, 4, 'w'); c.set(11, 21, 'k'); c.set(12, 22, 'k');
    c.rect(4, 5, 2, 2, 'r+');
  },
  glass_cannon: (c) => {
    c.poly([[3, 10], [18, 6], [21, 12], [5, 16]], 'b');
    c.poly([[3, 10], [18, 6], [19, 8], [4, 12]], 'w');
    c.ellipse(20, 9, 2.6, 3.4, 'p');
    c.disc(9, 18, 4.5, 'b'); c.disc(9, 18, 2.4, 'p'); c.disc(9, 18, 0.8, 'w');
    c.rect(2, 17, 4, 4, 'b+'); c.rect(0, 18, 2, 2, 'o');
    c.set(23, 7, 'y');
    c.line(5, 13, 16, 10, 'w', 1);
  },
  tortoise_shell: (c) => {
    c.ellipse(11.5, 13, 10, 8, 'e');
    c.rect(1, 13, 21, 9, 'k'); c.clear(0, 0);
    c.ellipse(11.5, 13, 10, 8, 'e');
    c.rect(0, 14, 24, 10, 'e'); c.rect(0, 14, 24, 10, 'f');
    c.rect(1, 14, 22, 3, 'f'); c.rect(2, 17, 20, 3, 'u');
    c.ellipse(11.5, 13, 9, 7, 'e');
    c.rect(2, 13, 20, 2, 'f');
    for (const [x, y] of [[8, 6], [13, 6], [5, 10], [11, 10], [17, 10]] as [number, number][]) c.rect(x, y, 4, 3, 'l');
    for (const x of [3, 8, 13, 18]) c.rect(x, 17, 3, 3, 'h');
    c.rect(3, 6, 4, 1, 'l+');
  },
  plague_censer: (c) => {
    c.line(12, 1, 12, 7, 'g', 1);
    c.rect(11, 0, 3, 2, 'y');
    c.ellipse(11.5, 14, 8, 6.5, 'g');
    c.rect(3, 14, 18, 3, 'g'); c.rect(3, 8, 18, 7, 'g');
    c.ellipse(11.5, 8, 8, 2.4, 'g+'); c.ellipse(11.5, 8, 5, 1.2, 'f');
    for (const x of [6, 9, 12, 15]) c.rect(x, 12, 2, 2, 'k');
    c.rect(7, 18, 10, 3, 's');
    c.rect(10, 4, 4, 4, 'l'); c.rect(14, 1, 3, 4, 'l'); c.rect(7, 2, 3, 3, 'e');
  },
  double_or_nothing: (c) => {
    cube(c, 1, 8, 12, 'w'); pip(c, 3, 11); pip(c, 8, 16);
    cube(c, 11, 3, 12, 'k');
    c.rect(11, 3, 12, 1, 'g'); c.rect(11, 3, 1, 12, 'g');
    pip(c, 14, 6, 'w'); pip(c, 19, 11, 'w'); pip(c, 16, 9, 'y');
    c.rect(13, 17, 8, 2, 'y');
  },
  phoenix_feather: (c) => {
    c.poly([[20, 2], [10, 5], [5, 13], [4, 20], [9, 16], [16, 10]], 'o');
    c.poly([[20, 2], [13, 7], [8, 14], [5, 19]], 'r');
    c.poly([[18, 3], [12, 5], [9, 9]], 'y');
    c.line(4, 21, 18, 4, 'y', 1);
    c.poly([[19, 1], [23, 0], [22, 5], [20, 4]], 'y'); c.rect(21, 1, 1, 2, 'w');
  },
  kings_die: (c) => {
    cube(c, 2, 5, 18, 'y');
    c.rect(2, 5, 18, 1, 'y+');
    c.poly([[6, 11], [6, 7], [8, 9], [11, 6], [14, 9], [16, 7], [16, 11]], 'r');
    c.rect(6, 11, 11, 2, 'o');
    c.rect(11, 8, 1, 1, 'w');
    pip(c, 4, 16, 'o'); pip(c, 15, 16, 'o'); pip(c, 15, 9, 'o');
  },
};

export function buildItems(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  for (const [id, draw] of Object.entries(ITEMS)) {
    const canvas = icon(S, draw);
    out.set(`item.${id}`, { canvas, ax: S / 2, ay: S / 2 });
  }
  return out;
}
