/** The eight heroes. Each is parts (base, legs, torso, head, headgear, prop) plus a colour set. */
import { addBase, arm, boots, eyes, FEET, head, legs, slab, torso } from './parts';
import { Model } from './voxel';

type Recipe = () => Model;
const F = FEET;

function bulwark(): Model {
  const C = { steel: 'g', navy: 'n', cream: 'c', shield: 'b', wood: 'u', plume: 'r' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 1, C.navy, { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  boots(m, F, C.steel, 1, 2, 2);
  torso(m, F + 2, F + 6, 3, 2, C.navy);
  m.box(2, -1, F + 2, 2, 1, F + 5, C.cream); // tabard
  m.box(-2, -3, F + 2, 2, 3, F + 2, C.steel); // belt
  m.box(-1, -4, F + 6, 1, 4, F + 6, C.steel); // pauldrons
  // bucket helm: steel, cream rim, wide eye slit, plume
  head(m, F + 7, F + 11, 3, 3, C.steel);
  m.box(3, -3, F + 7, 3, 3, F + 7, C.cream);
  m.box(3, -2, F + 9, 3, 2, F + 9, 'k');
  m.box(3, 0, F + 10, 3, 0, F + 11, C.steel);
  m.box(3, 0, F + 8, 3, 0, F + 8, 'k');
  m.box(-1, -3, F + 12, 1, 3, F + 12, C.steel);
  m.box(-3, 0, F + 13, 2, 0, F + 14, C.plume);
  m.box(-4, 0, F + 14, -3, 0, F + 16, C.plume);
  // tower shield held out to the near side, clear of the body
  m.box(1, 4, F + 3, 1, 5, F + 4, C.steel);
  for (const y of [6, 7]) slab(m, y, -3, 3, F, F + 10, y === 7 ? C.shield : C.cream, C.cream);
  m.box(-1, 7, F + 4, 1, 7, F + 7, C.cream);
  m.set(0, 7, F + 5, 'y'); m.set(0, 7, F + 6, 'y');
  // mace on the far side
  m.box(2, -4, F + 3, 2, -4, F + 8, C.wood);
  m.box(1, -5, F + 9, 3, -3, F + 11, C.steel);
  m.set(2, -4, F + 12, 'w'); m.set(4, -4, F + 10, 'w'); m.set(0, -4, F + 10, 'w'); m.set(2, -6, F + 10, 'w');
  return m;
}

function duelist(): Model {
  const C = { coat: 'r', cape: 'x', pants: 'k', skin: 'h', hat: 'k', band: 'r', blade: 'g', hilt: 'y' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 2, C.pants, { x0: -1, x1: 0, yIn: 1, yOut: 1 });
  boots(m, F, 'k', 1, 1, 1);
  torso(m, F + 3, F + 6, 2, 1, C.coat);
  m.box(-1, -2, F + 3, 1, 2, F + 3, 'k'); // belt
  // half cape from the near shoulder
  m.box(-2, -1, F + 1, -2, 3, F + 7, C.cape);
  m.box(-1, 3, F + 4, 0, 3, F + 6, C.coat);
  arm(m, -1, F + 4, F + 6, C.coat, 3, 0, 0);
  head(m, F + 7, F + 10, 3, 3, C.skin);
  eyes(m, 3, F + 9, 2);
  m.box(3, -1, F + 7, 3, 1, F + 7, 'x');
  // wide feathered hat
  m.cyl(0, 0, F + 11, F + 11, 5, C.hat);
  m.cyl(0, 0, F + 12, F + 13, 2, C.hat);
  m.cyl(0, 0, F + 12, F + 12, 3, C.band);
  m.set(-3, 0, F + 13, 'w'); m.set(-4, 0, F + 14, 'w'); m.set(-5, 0, F + 15, 'w'); m.set(-6, 0, F + 15, 'q');
  // rapier held forward
  m.box(2, 3, F + 5, 2, 3, F + 6, C.coat);
  m.box(3, 2, F + 6, 3, 4, F + 6, C.hilt);
  m.box(4, 3, F + 6, 15, 3, F + 6, 'w');
  m.box(4, 3, F + 7, 14, 3, F + 7, 'g');
  return m;
}

function herbalist(): Model {
  const C = { hood: 'e', tunic: 'l', skin: 'h', pack: 'u', bag: 'h', leaf: 'l', flower: 'q' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 1, 'u', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  torso(m, F + 2, F + 6, 2, 2, C.tunic);
  m.box(-2, -2, F + 2, 2, 2, F + 2, 'u');
  m.box(-1, 3, F + 2, 1, 3, F + 4, C.bag); // satchel
  m.box(-1, 3, F + 5, 0, 3, F + 6, C.tunic);
  head(m, F + 7, F + 11, 3, 3, C.hood);
  m.box(-2, -2, F + 12, 2, 2, F + 12, C.hood);
  m.box(-3, -1, F + 12, -3, 1, F + 13, C.hood);
  m.box(3, -2, F + 8, 3, 2, F + 10, C.skin);
  eyes(m, 3, F + 9, 1);
  // big backpack with plants
  m.box(-5, -3, F + 2, -3, 3, F + 8, C.pack);
  m.box(-5, -3, F + 9, -3, 3, F + 9, 'z');
  for (const [y, z, c] of [[-2, 10, C.leaf], [-2, 11, C.leaf], [0, 10, C.leaf], [0, 11, C.leaf], [0, 12, C.leaf], [2, 10, C.leaf], [2, 11, C.leaf]] as [number, number, string][]) {
    m.set(-4, y, F + z, c);
  }
  m.set(-5, -2, F + 12, C.flower); m.set(-5, 0, F + 13, C.flower); m.set(-5, 2, F + 12, C.flower);
  m.set(-3, 0, F + 11, C.leaf); m.set(-4, 1, F + 11, 'e'); m.set(-4, -1, F + 11, 'e');
  // sickle
  m.box(2, 4, F + 3, 2, 4, F + 6, 'u');
  m.box(2, 4, F + 7, 3, 4, F + 7, 'g');
  m.box(4, 4, F + 7, 4, 4, F + 8, 'g');
  m.set(4, 4, F + 9, 'w');
  return m;
}

function gambler(): Model {
  const C = { coat: 'v', pants: 'i', skin: 'h', hat: 'i', band: 'y', card: 'w', pip: 'r', coin: 'y' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 1, C.pants, { x0: -1, x1: 0, yIn: 1, yOut: 2 });
  boots(m, F, 'k', 1, 2, 1);
  // long coat that flares
  torso(m, F + 4, F + 6, 2, 2, C.coat);
  m.box(-2, -3, F + 1, 2, 3, F + 3, C.coat);
  m.box(-3, -2, F + 1, -3, 2, F + 3, C.coat);
  m.box(2, 0, F + 2, 2, 0, F + 6, 'y'); // gold buttons line
  m.box(2, -1, F + 6, 2, 1, F + 6, 'w');
  head(m, F + 7, F + 10, 3, 3, C.skin);
  eyes(m, 3, F + 9, 2);
  m.box(3, -2, F + 7, 3, 2, F + 7, 'z'); // moustache
  // top hat
  m.cyl(0, 0, F + 11, F + 11, 4, C.hat);
  m.cyl(0, 0, F + 12, F + 15, 2, C.hat);
  m.cyl(0, 0, F + 12, F + 12, 3, C.band);
  m.set(0, 0, F + 16, C.hat);
  // fan of cards in the near hand
  m.box(0, 3, F + 4, 1, 3, F + 5, C.coat);
  const heights = [3, 4, 5, 4, 3];
  heights.forEach((h, i) => {
    const x = i - 2;
    m.box(x, 5, F + 5, x, 5, F + 5 + h, ['w', 'y', 'r', 'b', 'w'][i] as string);
    m.set(x, 5, F + 5 + h, i % 2 === 0 ? C.pip : 'k');
  });
  // coin in the far hand
  m.box(1, -4, F + 4, 1, -4, F + 5, C.coat);
  m.box(2, -6, F + 6, 2, -4, F + 8, C.coin);
  m.set(2, -5, F + 7, 'o');
  return m;
}

function redhand(): Model {
  const C = { skin: 'h', fur: 'c', helm: 'x', horn: 'c', cloth: 'x', handle: 'u', axe: 'g' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 1, 'u', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  torso(m, F + 2, F + 6, 3, 2, C.skin);
  m.box(-2, -3, F + 2, 2, 3, F + 2, 'u');
  m.box(2, -1, F + 0, 3, 1, F + 2, C.cloth);
  arm(m, -1, F + 3, F + 6, C.skin, 4, -1, 1);
  arm(m, 1, F + 3, F + 6, C.skin, 4, -1, 1);
  m.box(-2, -3, F + 7, 2, 3, F + 7, C.fur);
  m.box(2, -2, F + 6, 3, 2, F + 6, C.fur);
  head(m, F + 8, F + 11, 3, 3, C.skin);
  eyes(m, 3, F + 10, 2);
  m.box(3, -2, F + 8, 3, 2, F + 9, 'x');
  m.box(-3, -3, F + 11, 3, 3, F + 12, C.helm);
  m.cut(3, -3, F + 11, 3, 3, F + 11);
  for (const s of [-1, 1]) {
    m.box(0, s * 4, F + 11, 0, s * 4, F + 12, C.horn);
    m.box(0, s * 5, F + 13, 0, s * 5, F + 14, C.horn);
    m.set(0, s * 5, F + 15, 'w');
  }
  // great axe: long haft with a big flared head on the near side
  m.box(1, 6, F, 1, 6, F + 15, C.handle);
  for (let x = 1; x <= 9; x++) {
    const half = 1 + Math.round((x - 1) * 0.6);
    for (let z = F + 11 - half; z <= F + 11 + half; z++) {
      m.set(x, 6, z, x >= 9 ? 'w' : C.axe);
      m.set(x, 7, z, x >= 9 ? 'w' : C.axe);
    }
  }
  m.cut(1, 6, F + 5, 3, 7, F + 9);
  m.set(1, 6, F + 16, 'g');
  m.box(1, 6, F + 9, 1, 6, F + 9, C.handle);
  return m;
}

function automaton(): Model {
  const C = { brass: 'h', trim: 'y', teal: 't', steel: 'g' };
  const m = new Model();
  addBase(m, 'hero', 6);
  legs(m, F, F + 1, C.steel, { x0: -1, x1: 0, yIn: 1, yOut: 2 });
  boots(m, F, C.trim, 1, 2, 2);
  torso(m, F + 2, F + 6, 3, 3, C.brass);
  m.box(3, -2, F + 3, 3, 2, F + 5, C.teal);
  m.box(3, 0, F + 4, 3, 0, F + 4, 'w');
  for (const [y, z] of [[-3, 2], [3, 2], [-3, 6], [3, 6]] as [number, number][]) m.set(3, y, F + z, C.trim);
  arm(m, -1, F + 3, F + 6, C.steel, 4, -1, 0);
  m.box(-1, 4, F + 2, 1, 5, F + 3, C.trim); // piston fist
  m.box(0, 4, F + 4, 0, 4, F + 6, C.steel);
  head(m, F + 7, F + 11, 3, 3, C.brass);
  m.box(3, -1, F + 8, 3, 1, F + 10, 'k'); // lens eye
  m.set(3, 0, F + 9, C.teal);
  m.set(3, 0, F + 10, 'w');
  m.box(0, 0, F + 12, 0, 0, F + 13, C.trim);
  m.set(0, 0, F + 14, 'r');
  // winding key on the back
  m.box(-5, 0, F + 4, -4, 0, F + 5, C.trim);
  m.box(-6, -2, F + 6, -6, 2, F + 8, C.trim);
  m.cut(-6, -1, F + 7, -6, 1, F + 7);
  return m;
}

function grower(): Model {
  const C = { shell: 'e', plate: 'f', skin: 'l', brown: 'u', leaf: 'l', can: 'b' };
  const m = new Model();
  addBase(m, 'hero', 6);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) m.box(sx * 2 - (sx > 0 ? 0 : 1), sy * 3 - (sy > 0 ? 0 : 0), F, sx * 2 + (sx > 0 ? 1 : 0), sy * 3 + (sy > 0 ? 1 : -1), F + 1, C.brown);
  m.ellip(-1, 0, F + 4, 5, 4, 3, C.shell);
  m.cut(-7, -6, 0, 6, 6, F - 1);
  m.cut(-7, -6, F, 6, 6, F + 1);
  m.box(-2, -3, F + 2, 2, 3, F + 2, 'h'); // belly
  m.box(-3, -2, F + 1, 3, 2, F + 1, 'h');
  m.box(-4, -3, F, 4, 3, F + 1, 'h');
  m.ellip(-1, 0, F + 4, 5, 4, 3, C.shell);
  m.cut(-7, -6, 0, 6, 6, F - 1);
  for (let x = -5; x <= 3; x++) for (let y = -4; y <= 4; y++) for (let z = F + 4; z <= F + 8; z++) {
    if (m.has(x, y, z) && !m.has(x, y, z + 1) && (x + y) % 3 === 0) m.set(x, y, z, C.plate);
  }
  head(m, F + 3, F + 7, 2, 3, C.skin, 4);
  eyes(m, 7, F + 6, 1);
  m.box(7, -1, F + 4, 7, 1, F + 4, 'u');
  // sapling
  m.box(-1, 0, F + 8, -1, 0, F + 12, C.brown);
  m.ellip(-3, 0, F + 13, 2, 1.5, 1, C.leaf);
  m.ellip(1, 0, F + 14, 2, 1.5, 1, C.leaf);
  m.set(-1, 0, F + 14, 'y');
  m.set(-1, 0, F + 13, C.leaf);
  // watering can
  m.box(2, 5, F + 2, 4, 6, F + 4, C.can);
  m.box(5, 5, F + 4, 5, 5, F + 5, 'g');
  m.box(6, 5, F + 5, 6, 5, F + 6, 'g');
  m.box(2, 7, F + 3, 2, 7, F + 5, C.can);
  return m;
}

function hexer(): Model {
  const C = { robe: 'v', dark: 'i', mask: 'p', orb: 'm', glow: 'p' };
  const m = new Model();
  addBase(m, 'hero', 6);
  m.cyl(0, 0, F, F + 1, 3, C.dark);
  m.cyl(0, 0, F + 2, F + 5, 2.4, C.robe);
  m.cyl(0, 0, F + 6, F + 7, 2, C.robe);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (i % 3 === 0) m.del(Math.round(Math.cos(a) * 3), Math.round(Math.sin(a) * 3), F);
  }
  m.box(2, -3, F + 3, 2, 3, F + 3, 'y'); // gold sash
  m.box(1, 3, F + 5, 2, 3, F + 6, C.robe);
  m.set(3, 3, F + 6, C.mask);
  m.box(0, -3, F + 5, 0, -3, F + 7, C.robe);
  m.cyl(0, 0, F + 8, F + 9, 3, C.dark);
  m.cyl(0, 0, F + 10, F + 11, 2.4, C.dark);
  m.cyl(0, 0, F + 12, F + 13, 1.6, C.dark);
  m.set(0, 0, F + 14, C.dark);
  m.set(-1, 0, F + 15, C.dark); m.set(-2, 0, F + 15, C.dark);
  m.box(3, -2, F + 8, 3, 2, F + 12, C.mask);
  m.box(3, -2, F + 10, 3, -1, F + 10, 'k'); m.box(3, 1, F + 10, 3, 2, F + 10, 'k');
  m.set(3, 0, F + 8, 'k');
  // big bright floating orb
  m.ellip(5, -6, F + 11, 3, 3, 3, C.orb);
  m.ellip(5, -6, F + 12, 2, 2, 2, 'q');
  m.set(7, -6, F + 13, 'w'); m.set(7, -7, F + 13, 'w'); m.set(6, -6, F + 14, 'w');
  m.line(0, -3, F + 7, 4, -5, F + 9, 'p');
  return m;
}

export const HERO_RECIPES: Record<string, Recipe> = { bulwark, duelist, herbalist, gambler, redhand, automaton, grower, hexer };

/** Main body colour per hero: used for the hero's die. */
export const HERO_DIE_COLOR: Record<string, string> = {
  bulwark: 'b', duelist: 'r', herbalist: 'e', gambler: 'v', redhand: 'x', automaton: 'y', grower: 'l', hexer: 'i',
};
