/**
 * The 25 enemies. Models face +x and are rendered mirrored so they look towards the heroes
 * (lower-left of the frame). All stand on the dark enemy base.
 */
import { addBase, FEET, frontX } from './parts';
import { ENEMY_RECIPES_2 } from './enemies2';
import { Model } from './voxel';

type Recipe = () => Model;
const F = FEET;

function gnaw_rat(): Model {
  const m = new Model();
  addBase(m, 'enemy', 6);
  m.ellip(-1, 0, F + 3, 4.5, 3.4, 2.8, 'u');
  m.ellip(-1, 0, F + 1.5, 3.8, 2.8, 1.4, 'h');
  m.ellip(4, 0, F + 4, 2.4, 2.2, 2.2, 'u');
  m.box(6, -1, F + 3, 8, 1, F + 4, 'h'); // pointed snout
  m.set(9, 0, F + 4, 'q'); m.set(9, 0, F + 3, 'q');
  m.box(8, -1, F + 0, 8, -1, F + 2, 'w'); // big white front teeth
  m.box(8, 1, F + 0, 8, 1, F + 2, 'w');
  m.box(7, -1, F + 2, 7, 1, F + 2, 'k');
  for (const s of [-1, 1]) {
    m.box(3, s * 3, F + 6, 3, s * 3, F + 8, 'u');
    m.box(3, s * 2, F + 6, 3, s * 2, F + 7, 'q');
    m.set(7, s * 1, F + 5, 'k');
  }
  for (const sx of [-2, 2]) for (const sy of [-1, 1]) m.box(sx, sy * 2, F, sx + 1, sy * 2, F, 'h');
  // long pink tail swinging out to the side
  const tail: [number, number, number][] = [[-5, 1, 2], [-6, 2, 2], [-6, 3, 2], [-6, 4, 2], [-5, 5, 2], [-4, 6, 2], [-4, 7, 3], [-4, 7, 4], [-4, 6, 5], [-4, 5, 6]];
  for (const [x, y, z] of tail) { m.set(x, y, F + z, 'q'); m.set(x, y, F + z + 1, 'q'); }
  return m;
}

function mud_slime(): Model {
  const m = new Model();
  addBase(m, 'enemy', 6);
  m.cyl(0, 0, F, F, 5, 'z'); // puddle
  m.box(-4, -4, F + 1, 4, 4, F + 6, 'u');
  for (const z of [F + 1, F + 6]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) m.del(sx * 4, sy * 4, z);
  m.box(-3, -3, F + 7, 3, 3, F + 7, 'u'); // domed top
  m.box(-1, -1, F + 8, 1, 1, F + 8, 'u');
  m.set(0, 0, F + 9, 'z'); m.set(0, 0, F + 10, 'z'); // drip peak
  m.set(1, 1, F + 9, 'z');
  for (const [x, y] of [[4, 2], [4, -2], [2, 4], [-2, 4]] as [number, number][]) m.box(x, y, F + 1, x, y, F + 3, 'z'); // drips
  for (const s of [-1, 1]) {
    const x = 5;
    m.box(x, s * 2, F + 4, x, s * 2, F + 5, 'w'); // big eyes
    m.set(x + 1, s * 2, F + 4, 'k');
    m.set(x, s * 1, F + 5, 'w');
  }
  m.box(5, -1, F + 2, 5, 1, F + 2, 'z'); // mouth
  // bubbles
  m.set(-2, 2, F + 8, 'z'); m.set(-3, -2, F + 8, 'z');
  void frontX;
  return m;
}

function twig_archer(): Model {
  const m = new Model();
  addBase(m, 'enemy', 6);
  m.box(-1, 1, F, 0, 1, F + 3, 'u'); // twig legs
  m.box(-1, -1, F, 0, -1, F + 3, 'u');
  m.box(0, 1, F, 1, 1, F, 'z'); m.box(0, -1, F, 1, -1, F, 'z');
  m.box(-1, -1, F + 4, 0, 1, F + 7, 'u'); // thin torso
  m.set(1, 0, F + 5, 'e'); m.set(1, 0, F + 6, 'e'); // leaf vest
  m.box(0, 2, F + 5, 0, 2, F + 7, 'u');
  m.box(0, -2, F + 5, 0, -2, F + 7, 'u');
  // head
  m.box(-2, -2, F + 8, 2, 2, F + 12, 'h');
  for (const z of [F + 8, F + 12]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) m.del(sx * 2, sy * 2, z);
  m.set(2, -1, F + 10, 'k'); m.set(2, 1, F + 10, 'k');
  m.set(2, 0, F + 9, 'z');
  // leafy hair
  m.box(-2, -2, F + 13, 1, 2, F + 13, 'e');
  m.box(-1, -1, F + 14, 0, 1, F + 14, 'l');
  m.set(-3, 0, F + 13, 'l'); m.set(-3, 0, F + 12, 'e'); m.set(0, 0, F + 15, 'l');
  // bow held in the near hand
  const bow: [number, number][] = [[0, 3], [1, 4], [2, 6], [2, 8], [2, 10], [1, 12], [0, 13]];
  m.box(0, 3, F + 5, 1, 3, F + 6, 'u');
  for (const [x, z] of bow) m.set(x + 2, 4, F + z - 1, 'u');
  m.box(2, 4, F + 2, 2, 4, F + 13, 'w'); // string on the near side of the bow
  m.set(2, 4, F + 2, 'u'); m.set(2, 4, F + 13, 'u');
  m.box(3, 4, F + 7, 8, 4, F + 7, 'c'); // arrow nocked
  m.set(9, 4, F + 7, 'g');
  // quiver
  m.box(-3, -1, F + 3, -3, 0, F + 8, 'z');
  m.set(-3, -1, F + 9, 'e'); m.set(-3, 0, F + 10, 'e'); m.set(-3, 0, F + 9, 'c');
  return m;
}

export const ENEMY_RECIPES: Record<string, Recipe> = { gnaw_rat, mud_slime, twig_archer, ...ENEMY_RECIPES_2 };
