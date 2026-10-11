/** The three bosses: bigger models on a large dark base. Rendered mirrored like enemies. */
import { addBase, eyes, FEET, hash3 } from './parts';
import { Model } from './voxel';

const F = FEET;
const boss = (): Model => {
  const m = new Model();
  addBase(m, 'boss', 9);
  return m;
};

function bramble_king(): Model {
  const m = boss();
  // trunk body
  m.cyl(0, 0, F, F + 3, 5, 'z');
  m.cyl(0, 0, F + 4, F + 11, 4.4, 'z');
  m.cyl(0, 0, F + 12, F + 15, 5, 'z');
  for (let z = F; z <= F + 15; z++) for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 4.6);
    const y = Math.round(Math.sin(t) * 4.6);
    if (m.has(x, y, z) && hash3(x, y, z, 3) < 0.28) m.set(x, y, z, 'u');
  }
  // root legs
  for (const [x, y] of [[5, 3], [5, -3], [-1, 6], [-1, -6], [-5, 3], [-5, -3]] as [number, number][]) { m.box(x, y, F, x, y, F + 2, 'z'); m.set(x + Math.sign(x), y + Math.sign(y), F, 'z'); }
  // face
  eyes(m, 5, F + 11, 2, 'y', true);
  m.box(5, -2, F + 8, 5, 2, F + 9, 'k'); m.set(5, -1, F + 10, 'k'); m.set(5, 1, F + 10, 'k');
  m.box(5, -2, F + 9, 5, 2, F + 9, 'k'); for (const y of [-2, 0, 2]) m.set(5, y, F + 9, 'w');
  // thorn crown
  for (let a = 0; a < 10; a++) {
    const t = (a / 10) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 4);
    const y = Math.round(Math.sin(t) * 4);
    m.set(x, y, F + 16, 'f'); m.set(x, y, F + 17, 'e');
    if (a % 2 === 0) { m.set(x, y, F + 18, 'e'); m.set(x, y, F + 19, 'l'); }
    if (a % 3 === 0) m.set(Math.round(x * 0.5), Math.round(y * 0.5), F + 17, 'r');
  }
  m.box(-2, -2, F + 16, 2, 2, F + 16, 'f');
  // red berries on the body
  for (const [x, y, z] of [[5, 3, 6], [5, -3, 5], [3, 5, 8], [-2, 5, 10], [4, -4, 13]] as [number, number, number][]) m.set(x, y, F + z, 'r');
  // long arms and the vine whip on the near side
  m.box(0, 5, F + 9, 1, 8, F + 10, 'z');
  m.box(0, -5, F + 9, 1, -7, F + 10, 'z');
  for (let i = 0; i < 12; i++) {
    const x = 2 + i;
    const y = 8 + Math.round(Math.sin(i / 2) * 2);
    m.set(x, y, F + 9 + Math.round(Math.cos(i / 2)), 'e');
    if (i % 3 === 1) m.set(x, y, F + 11, 'r');
  }
  m.set(14, 8, F + 9, 'r');
  return m;
}

function drowned_bell(): Model {
  const m = boss();
  // tentacles holding the bell up
  for (const [x, y] of [[5, 0], [3, 5], [-3, 5], [-5, 0], [-3, -5], [3, -5]] as [number, number][]) {
    m.box(x, y, F, x + 1, y + 1, F + 5, 't');
    m.box(x + Math.sign(x) * 2, y + Math.sign(y) * 2, F, x + Math.sign(x) * 2, y + Math.sign(y) * 2, F + 1, 't');
    m.set(x, y, F + 6, 'a'); m.set(x + 1, y + 1, F + 6, 'a');
    m.set(x + Math.sign(x) * 3, y + Math.sign(y) * 3, F, 'a');
  }
  // glowing clapper eye under the bell
  m.ellip(0, 0, F + 4, 2.2, 2.2, 2.2, 'w');
  m.ellip(1, 0, F + 4, 1.4, 1.4, 1.4, 't');
  m.set(3, 0, F + 4, 'k');
  m.set(2, 0, F + 6, 'w');
  // smooth flared bronze bell, bottom rim at F + 7
  const prof: [number, number][] = [[8, 6.2], [9, 5.6], [10, 5.2], [11, 5], [12, 4.9], [13, 4.8], [14, 4.8], [15, 4.7], [16, 4.5], [17, 4], [18, 3.2], [19, 2]];
  for (const [dz, r] of prof) m.cyl(0, 0, F + dz, F + dz, r, dz === 8 ? 'h' : 'u');
  m.cyl(0, 0, F + 7, F + 7, 7.4, 'y');
  m.cut(-5, -5, F + 7, 5, 5, F + 7);
  m.cyl(0, 0, F + 7, F + 7, 3, 'k');
  m.box(-1, -1, F + 20, 1, 1, F + 20, 'y'); m.set(0, 0, F + 21, 'y');
  // crack running down the front
  [18, 17, 16, 15, 14, 13, 12, 11, 10, 9].forEach((dz, i) => {
    const y = i < 5 ? 0 : 1;
    for (let x = 12; x >= -12; x--) if (m.has(x, y, F + dz)) { m.set(x, y, F + dz, 'k'); break; }
  });
  for (const [dz, c] of [[9, 'y'], [12, 'y']] as [number, string][]) {
    for (const y of [-3, 3]) for (let x = 12; x >= -12; x--) if (m.has(x, y, F + dz)) { m.set(x, y, F + dz, c); break; }
  }
  return m;
}

function pip_eater(): Model {
  const m = boss();
  for (const [x, y, c] of [[-6, 4, 'w'], [5, 6, 'w'], [-5, -5, 'y']] as [number, number, string][]) {
    m.box(x - 1, y - 1, F, x + 1, y + 1, F + 2, c);
    m.set(x, y + 2, F + 1, 'r'); m.set(x + 2, y, F + 1, 'r');
  }
  m.cyl(0, 0, F, F + 1, 6, 'y');
  m.cyl(0, 0, F + 2, F + 2, 5, 'y');
  m.cyl(0, 0, F + 3, F + 5, 4.6, 'x');
  m.cyl(0, 0, F + 6, F + 8, 4, 'x');
  m.box(4, -2, F + 3, 5, 2, F + 8, 'y');
  m.box(0, -2, F + 9, 3, 2, F + 12, 'x');
  m.box(2, -3, F + 12, 7, 3, F + 16, 'x'); // skull
  m.box(8, -2, F + 13, 11, 2, F + 15, 'x'); // upper snout
  m.box(3, -2, F + 10, 10, 2, F + 11, 'u'); // lower jaw
  m.box(5, -2, F + 12, 10, 2, F + 12, 'k'); // open mouth
  for (const y of [-2, 2]) { m.set(9, y, F + 12, 'w'); m.set(10, y, F + 12, 'w'); m.set(10, y, F + 11, 'w'); }
  m.set(11, -1, F + 14, 'k'); m.set(11, 1, F + 14, 'k');
  for (const s of [-1, 1]) {
    m.set(6, s * 3, F + 15, 'y'); m.set(6, s * 3, F + 16, 'k');
    m.line(3, s * 3, F + 16, 2, s * 5, F + 19, 'c'); m.set(2, s * 5, F + 20, 'c');
  }
  m.box(9, -1, F + 12, 11, 1, F + 14, 'w'); // die clamped in the jaws
  m.set(12, 0, F + 13, 'r'); m.set(11, 1, F + 14, 'k'); m.set(11, -1, F + 12, 'k');
  for (const s of [-1, 1]) { m.box(-2, s * 3, F + 9, -2, s * 5, F + 11, 'y'); m.set(-2, s * 5, F + 12, 'y'); }
  for (let i = 0; i < 7; i++) m.set(-5 - Math.floor(i / 3), -1 + (i % 2), F + 3 + i, 'x');
  m.set(-7, 0, F + 10, 'y'); m.set(-7, 0, F + 11, 'o');
  return m;
}

export const BOSS_RECIPES: Record<string, () => Model> = { bramble_king, drowned_bell, pip_eater };
