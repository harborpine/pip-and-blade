/** Remaining enemies (Acts 1 to 3). Same conventions as enemies.ts: face +x, rendered mirrored. */
import { addBase, eyes, FEET, hash3, head, legs, torso } from './parts';
import { Model } from './voxel';

type Recipe = () => Model;
const F = FEET;
const mk = (): Model => {
  const m = new Model();
  addBase(m, 'enemy', 6);
  return m;
};

function bramble_imp(): Model {
  const m = mk();
  legs(m, F, F + 1, 'u', { yIn: 1, yOut: 1 });
  torso(m, F + 2, F + 4, 2, 1, 'e');
  m.set(2, 0, F + 3, 'z'); m.set(0, 3, F + 4, 'z'); m.set(0, -3, F + 4, 'z'); // thorns
  head(m, F + 5, F + 9, 3, 3, 'e');
  eyes(m, 3, F + 7, 2, 'y');
  m.box(3, -1, F + 5, 3, 1, F + 5, 'k');
  for (const s of [-1, 1]) { m.box(0, s * 4, F + 7, 0, s * 6, F + 8, 'l'); m.set(0, s * 6, F + 9, 'l'); m.set(0, s * 7, F + 9, 'l'); }
  m.set(-1, 0, F + 10, 'z'); m.set(0, 0, F + 10, 'z'); m.set(-2, 0, F + 11, 'z');
  m.box(2, 4, F + 2, 2, 4, F + 12, 'u'); // twig spear
  m.box(2, 4, F + 13, 2, 4, F + 14, 'l'); m.set(2, 4, F + 15, 'l');
  m.box(1, 3, F + 3, 1, 3, F + 4, 'e');
  return m;
}

function mushroom_brute(): Model {
  const m = mk();
  m.cyl(0, 0, F, F + 3, 2.4, 'c');
  m.box(3, -1, F + 1, 3, 1, F + 2, 'c');
  m.ellip(0, 0, F + 6, 6, 6, 2.6, 'r');
  m.cut(-8, -8, F + 4, 8, 8, F + 4);
  m.cyl(0, 0, F + 4, F + 4, 5, 'r');
  m.cyl(0, 0, F + 8, F + 8, 3, 'r');
  for (const [x, y, z] of [[0, 0, 9], [3, 3, 8], [-3, 3, 8], [3, -3, 8], [-3, -3, 8], [5, 0, 7], [0, 5, 7], [-5, 0, 7]] as [number, number, number][]) m.set(x, y, F + z, 'w');
  eyes(m, 3, F + 3, 1, 'k');
  for (const s of [-1, 1]) m.box(1, s * 4, F + 1, 3, s * 5, F + 3, 'c'); // stubby fists
  return m;
}

function magpie_thief(): Model {
  const m = mk();
  m.box(-1, 1, F, 0, 1, F + 2, 'y'); m.box(-1, -1, F, 0, -1, F + 2, 'y'); // legs
  m.ellip(-1, 0, F + 5, 3.2, 2.8, 3.4, 's');
  m.ellip(0.5, 0, F + 4.5, 2.4, 2.2, 2.6, 'w'); // belly
  for (const s of [-1, 1]) m.box(-2, s * 4, F + 4, -1, s * 4, F + 7, 's'); // wings
  m.box(-6, 0, F + 5, -3, 0, F + 5, 's'); m.box(-7, 0, F + 4, -6, 0, F + 4, 'w'); // tail
  m.ellip(2, 0, F + 9, 2.6, 2.4, 2.4, 's');
  m.box(2, -2, F + 9, 4, 2, F + 9, 'k'); // mask band
  m.box(5, -1, F + 8, 6, 1, F + 8, 'y'); m.set(7, 0, F + 8, 'y'); // beak
  m.set(4, -1, F + 10, 'w'); m.set(4, 1, F + 10, 'w');
  m.box(2, 3, F + 3, 3, 4, F + 4, 'c'); m.set(3, 4, F + 5, 'y'); // shiny die in claw
  m.box(2, 3, F + 3, 3, 4, F + 4, 'c');
  m.set(4, 3, F + 4, 'k');
  return m;
}

function web_spinner(): Model {
  const m = mk();
  m.ellip(-2, 0, F + 5, 3.4, 3.2, 3, 'i');
  m.ellip(2, 0, F + 4, 2.2, 2.2, 2, 'v');
  for (const s of [-1, 1]) {
    for (const [dx, dz] of [[2, 3], [0, 4], [-2, 4], [-4, 3]] as [number, number][]) {
      m.line(dx, s * 3, F + 4, dx, s * 6, F + dz + 3, 'i');
      m.line(dx, s * 6, F + dz + 3, dx, s * 8, F, 'i');
    }
  }
  m.set(4, -1, F + 5, 'r'); m.set(4, 1, F + 5, 'r'); m.set(4, 0, F + 6, 'r');
  m.set(-2, 0, F + 8, 'w'); m.set(-1, 1, F + 8, 'w'); m.set(-2, -1, F + 8, 'w');
  m.ellip(-5, 0, F + 3, 2, 2, 2.4, 'w'); m.set(-5, 0, F + 1, 'g'); // silk bundle
  m.set(2, 0, F + 8, 'w'); // spider mark
  return m;
}

function hollow_stag(): Model {
  const m = mk();
  for (const [x, y] of [[-3, 1], [-3, -1], [3, 1], [3, -1]] as [number, number][]) m.box(x, y, F, x, y, F + 4, 'c');
  m.box(-4, -2, F + 5, 3, 2, F + 8, 'c');
  for (const x of [-3, -1, 1]) { m.cut(x, -1, F + 5, x, 1, F + 8); m.box(x, -2, F + 5, x, 2, F + 5, 'c'); }
  m.box(3, -1, F + 8, 5, 1, F + 11, 'c'); // neck
  head(m, F + 10, F + 13, 2, 2, 'c', 5);
  m.box(7, -1, F + 10, 8, 1, F + 11, 'c');
  m.set(7, -1, F + 12, 't'); m.set(7, 1, F + 12, 't');
  for (const s of [-1, 1]) { // antlers
    m.line(5, s * 2, F + 14, 4, s * 4, F + 17, 'c');
    m.line(4, s * 4, F + 17, 4, s * 6, F + 19, 'c');
    m.line(4, s * 3, F + 16, 6, s * 4, F + 18, 'c');
    m.set(4, s * 5, F + 17, 'c');
  }
  m.set(-5, 0, F + 8, 'c');
  return m;
}

function drowned_sailor(): Model {
  const m = mk();
  legs(m, F, F + 2, 'n', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  for (let z = F + 3; z <= F + 8; z++) m.box(-2, -3, z, 2, 3, z, z % 2 === 0 ? 'w' : 'n'); // striped shirt
  m.box(-3, -4, F + 6, 3, 4, F + 7, 'f'); // bloated belly tint
  for (const s of [-1, 1]) m.box(0, s * 4, F + 4, 1, s * 4, F + 7, 'f');
  head(m, F + 9, F + 13, 3, 3, 'f');
  eyes(m, 3, F + 11, 2, 'w'); m.set(3, -2, F + 11, 'k'); m.set(3, 2, F + 11, 'k');
  m.box(3, -1, F + 9, 3, 1, F + 9, 'k');
  m.box(-3, -3, F + 14, 3, 3, F + 14, 'n'); m.box(-2, -2, F + 15, 2, 2, F + 15, 'n'); // sailor cap
  m.box(2, 5, F + 3, 2, 5, F + 5, 'u');
  m.box(3, 5, F + 6, 8, 5, F + 6, 'g'); m.set(9, 5, F + 7, 'g'); // cutlass
  m.box(2, 5, F + 6, 2, 5, F + 6, 'y');
  return m;
}

function crab_knight(): Model {
  const m = mk();
  m.ellip(0, 0, F + 3, 5, 4.4, 2.4, 'o');
  for (const s of [-1, 1]) for (const x of [-2, 0, 2]) m.line(x, s * 4, F + 2, x + 1, s * 6, F, 'o');
  m.ellip(0, 0, F + 5, 3, 3, 1.4, 'r');
  m.cyl(0, 0, F + 6, F + 7, 2, 'g'); m.set(0, 0, F + 8, 'g'); m.box(1, -1, F + 7, 2, 1, F + 7, 'k'); // tiny helmet
  for (const s of [-1, 1]) { m.line(3, s * 2, F + 5, 3, s * 2, F + 8, 'o'); m.set(3, s * 2, F + 9, 'w'); m.set(4, s * 2, F + 9, 'k'); }
  // giant claw on the near side
  m.box(1, 5, F + 2, 2, 6, F + 4, 'o');
  m.box(0, 5, F + 5, 5, 8, F + 9, 'o');
  m.cut(3, 6, F + 6, 5, 7, F + 9);
  m.box(0, 5, F + 5, 5, 8, F + 5, 'o');
  m.box(0, 5, F + 9, 5, 8, F + 9, 'r');
  m.cut(5, 5, F + 5, 5, 8, F + 5);
  m.cut(4, 5, F + 9, 5, 8, F + 9);
  // small claw
  m.box(2, -5, F + 3, 3, -4, F + 5, 'o');
  return m;
}

function ink_squid(): Model {
  const m = mk();
  m.ellip(-1, 0, F + 8, 3, 3, 5, 'v');
  m.cut(-6, -6, F + 13, 6, 6, F + 16);
  m.set(-1, 0, F + 14, 'v'); m.set(-2, 0, F + 14, 'v');
  m.ellip(1, 0, F + 6, 3, 3.4, 2.4, 'v');
  for (const s of [-1, 1]) { m.box(3, s * 2, F + 6, 3, s * 2, F + 8, 'w'); m.set(4, s * 2, F + 7, 'k'); }
  for (const [x, y] of [[1, 2], [1, -2], [-2, 2], [-2, -2], [3, 0]] as [number, number][]) { m.box(x, y, F, x, y, F + 3, 'p'); m.set(x, y, F, 'v'); }
  m.ellip(1, 6, F + 4, 2.4, 2, 2, 'k'); m.set(1, 6, F + 6, 'k'); m.set(2, 7, F + 3, 'k'); // ink blob
  m.set(3, 7, F + 5, 'v');
  return m;
}

function barnacle_golem(): Model {
  const m = mk();
  legs(m, F, F + 2, 's', { x0: -1, x1: 1, yIn: 1, yOut: 3 });
  m.box(-3, -4, F + 3, 3, 4, F + 8, 's');
  m.box(-2, -3, F + 9, 2, 3, F + 10, 's');
  for (const s of [-1, 1]) { m.box(-1, s * 5, F + 3, 2, s * 7, F + 8, 's'); m.box(-1, s * 5, F, 2, s * 7, F + 2, 'g'); }
  for (const [x, y, z, v] of m.list()) {
    if (v !== 's' || z < F + 3) continue;
    const exposed = !m.has(x + 1, y, z) || !m.has(x, y + 1, z) || !m.has(x, y, z + 1);
    if (exposed && hash3(x, y, z, 7) < 0.3) m.set(x, y, z, hash3(x, y, z, 9) < 0.5 ? 'c' : 'w');
  }
  for (const [x, y, z] of [[3, 2, 6], [3, -2, 8], [0, 4, 9], [3, 0, 10], [-2, 5, 8]] as [number, number, number][]) { m.set(x, y, F + z, 'c'); m.set(x, y, F + z + 1, 'w'); }
  eyes(m, 3, F + 9, 1, 'y');
  m.box(3, -1, F + 8, 3, 1, F + 8, 'k');
  return m;
}

function eel_lancer(): Model {
  const m = mk();
  const offs = [0, 0, 1, 1, 1, 0, 0, -1, -1, 0];
  offs.forEach((o, i) => {
    m.box(-2 + o, -2, F + i, 1 + o, 1, F + i, i % 3 === 2 ? 'n' : 'y');
  });
  m.box(-3, -3, F, 2, 3, F, 'n');
  m.box(-2, -3, F + 9, 3, 3, F + 12, 'y');
  m.box(3, -2, F + 9, 5, 2, F + 11, 'y');
  for (const s of [-1, 1]) { m.set(3, s * 2, F + 11, 'w'); m.set(4, s * 2, F + 11, 'k'); }
  m.box(4, -1, F + 9, 5, 1, F + 9, 'k');
  m.box(-1, 0, F + 13, 0, 0, F + 14, 'n'); m.set(-2, 0, F + 12, 'n'); m.set(-1, 0, F + 15, 'n');
  for (const s of [-1, 1]) m.box(0, s * 4, F + 5, 1, s * 4, F + 7, 'n');
  m.box(1, -5, F + 1, 1, -5, F + 15, 'g'); // trident behind on the far side
  m.box(0, -5, F + 12, 2, -5, F + 12, 'g');
  for (const x of [0, 1, 2]) { m.set(x, -5, F + 13, 'g'); m.set(x, -5, F + 14, 'g'); }
  m.set(1, -5, F + 16, 'w'); m.set(0, -5, F + 15, 'w'); m.set(2, -5, F + 15, 'w');
  m.set(1, -5, F + 11, 'y');
  return m;
}

function bell_diver(): Model {
  const m = mk();
  legs(m, F, F + 2, 'a', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  m.box(-2, -3, F + 0, 2, 3, F + 0, 'y');
  torso(m, F + 3, F + 7, 3, 2, 'y');
  m.box(-2, -3, F + 5, 2, 3, F + 5, 'a');
  for (const s of [-1, 1]) m.box(0, s * 4, F + 4, 1, s * 4, F + 7, 'y');
  m.ellip(0, 0, F + 11, 3.6, 3.6, 3.4, 'y');
  m.box(3, -1, F + 10, 4, 1, F + 12, 'b'); m.set(4, 0, F + 11, 'w'); // window
  for (const [y, z] of [[-3, 9], [3, 9], [-3, 13], [3, 13]] as [number, number][]) m.set(2, y, F + z, 'c');
  m.box(-4, 0, F + 7, -4, 0, F + 12, 'a'); m.line(-4, 0, F + 12, -3, 0, F + 15, 'a'); m.set(-3, 0, F + 15, 'g'); // hose
  m.cyl(0, 0, F + 14, F + 14, 1, 'y');
  return m;
}

function tide_witch(): Model {
  const m = mk();
  m.cyl(0, 0, F, F + 1, 3, 't');
  m.cyl(0, 0, F + 2, F + 5, 2.4, 't');
  m.box(2, -2, F + 3, 2, 2, F + 3, 'm');
  m.box(-1, 3, F + 3, 1, 3, F + 5, 't');
  head(m, F + 6, F + 9, 3, 3, 'h');
  eyes(m, 3, F + 8, 2, 'k');
  m.box(-3, -4, F + 5, -1, 4, F + 10, 'f'); // long seaweed hair hanging
  m.box(-3, -4, F + 10, 3, 4, F + 11, 'f');
  m.box(-1, -3, F + 12, 1, 3, F + 12, 'e'); m.set(0, 0, F + 13, 'e');
  m.box(3, -4, F + 1, 3, -4, F + 8, 'u'); m.box(3, 4, F + 1, 3, 4, F + 7, 'u');
  m.ellip(3, 4, F + 10, 1.6, 1.6, 1.8, 'm'); m.set(4, 4, F + 10, 'q'); m.set(3, 4, F + 12, 'm');
  return m;
}

function coin_mimic(): Model {
  const m = mk();
  m.box(-4, -4, F, 4, 4, F + 4, 'u');
  m.box(-4, -4, F + 5, 4, 4, F + 5, 'z');
  m.box(-4, -4, F + 1, -4, 4, F + 1, 'y'); m.box(4, -4, F + 1, 4, 4, F + 1, 'y'); // bands
  m.box(-4, -4, F + 9, 4, -4, F + 11, 'u'); // open lid raised at the back
  m.box(-5, -4, F + 6, -4, 4, F + 12, 'u'); m.box(-5, -3, F + 7, -5, 3, F + 11, 'z');
  for (let y = -3; y <= 3; y += 2) { m.set(4, y, F + 5, 'w'); m.set(4, y, F + 4, 'w'); }
  m.box(4, -1, F + 3, 5, 1, F + 3, 'm'); // tongue
  m.set(4, -3, F + 7, 'y'); m.set(4, 3, F + 7, 'y');
  for (const [x, y] of [[3, 2], [3, -2], [2, 5], [0, -5]] as [number, number][]) { m.box(x, y, F + 6, x, y, F + 6, 'y'); m.set(x, y, F + 7, 'y'); }
  m.box(1, 0, F + 6, 3, 1, F + 6, 'y'); m.box(-2, -2, F + 6, 0, 0, F + 7, 'y');
  m.set(5, 2, F, 'y'); m.set(5, -3, F, 'y'); m.set(6, 0, F, 'y');
  eyes(m, 4, F + 7, 3, 'r');
  return m;
}

function anchor_hulk(): Model {
  const m = new Model();
  addBase(m, 'enemy', 7);
  legs(m, F, F + 3, 'f', { x0: -1, x1: 1, yIn: 1, yOut: 3 });
  m.box(-3, -5, F + 4, 3, 5, F + 9, 'f');
  m.box(-3, -5, F + 7, 3, 5, F + 7, 'n');
  m.box(-2, -4, F + 10, 2, 4, F + 11, 'e');
  head(m, F + 12, F + 15, 2, 3, 'e', 0);
  eyes(m, 3, F + 14, 1, 'y');
  m.box(3, -1, F + 12, 3, 1, F + 12, 'k');
  for (const s of [-1, 1]) m.box(-1, s * 6, F + 5, 2, s * 7, F + 10, 'e');
  // anchor held over the near shoulder
  m.box(0, 8, F + 3, 0, 8, F + 16, 'g');
  m.box(-3, 8, F + 16, 3, 8, F + 16, 'g'); m.set(0, 8, F + 18, 'g'); m.box(-1, 8, F + 17, 1, 8, F + 17, 'g');
  for (let i = 0; i < 5; i++) { m.set(-3 + i, 8, F + 3 + (i === 0 || i === 4 ? 2 : 0) - (i === 0 || i === 4 ? 0 : 1) + 1, 's'); }
  m.box(-4, 8, F + 5, -4, 8, F + 6, 'g'); m.box(4, 8, F + 5, 4, 8, F + 6, 'g');
  m.box(-3, 8, F + 4, -3, 8, F + 4, 'g'); m.box(3, 8, F + 4, 3, 8, F + 4, 'g');
  m.box(-2, 8, F + 3, 2, 8, F + 3, 'g');
  m.box(0, 7, F + 9, 0, 7, F + 10, 'g');
  return m;
}

function ember_whelp(): Model {
  const m = mk();
  m.ellip(-1, 0, F + 4, 3.4, 2.8, 3, 'o');
  m.ellip(0, 0, F + 3, 2.6, 2.2, 2, 'y');
  for (const [x, y] of [[-2, 2], [-2, -2], [1, 2], [1, -2]] as [number, number][]) m.box(x, y, F, x, y, F + 1, 'o');
  m.ellip(3, 0, F + 7, 2.4, 2.2, 2.2, 'o');
  m.box(5, -1, F + 6, 8, 1, F + 7, 'o'); // dragon snout
  m.box(5, -1, F + 5, 7, 1, F + 5, 'x');
  m.set(8, -1, F + 7, 'k'); m.set(8, 1, F + 7, 'k');
  m.set(7, -1, F + 5, 'w'); m.set(7, 1, F + 5, 'w');
  for (const s of [-1, 1]) {
    m.set(5, s * 2, F + 8, 'y');
    m.line(2, s * 1, F + 9, -1, s * 2, F + 11, 'c');
  }
  for (const s of [-1, 1]) { // wings: red membrane, gold ribs
    for (let i = 0; i < 6; i++) m.box(-2, s * (3 + i), F + 5, -2, s * (3 + i), F + 11 - i, 'r');
    m.line(-2, s * 3, F + 5, -2, s * 8, F + 5, 'y');
    m.line(-2, s * 3, F + 5, -2, s * 8, F + 9, 'y');
  }
  const tail: [number, number][] = [[-3, 1], [-4, 2], [-5, 3], [-6, 4], [-6, 5]];
  for (const [x, y] of tail) { m.set(x, y, F + 2, 'o'); m.set(x, y, F + 3, 'o'); }
  m.box(-6, 6, F + 2, -6, 6, F + 6, 'y'); m.box(-7, 5, F + 3, -7, 5, F + 5, 'r'); m.box(-5, 6, F + 3, -5, 6, F + 5, 'r');
  m.set(-6, 6, F + 7, 'o'); m.set(-6, 6, F + 8, 'r');
  return m;
}

function ash_cultist(): Model {
  const m = mk();
  m.cyl(0, 0, F, F + 2, 3, 's');
  m.cyl(0, 0, F + 3, F + 6, 2.4, 's');
  m.cyl(0, 0, F + 7, F + 8, 2, 's');
  m.cyl(0, 0, F + 9, F + 10, 2.4, 's');
  m.cyl(0, 0, F + 11, F + 12, 1.6, 's');
  m.set(-1, 0, F + 13, 's'); m.set(-2, 0, F + 14, 's');
  m.box(2, -1, F + 9, 3, 1, F + 11, 'k');
  m.set(3, -1, F + 10, 'o'); m.set(3, 1, F + 10, 'o');
  m.box(2, -2, F + 5, 2, 2, F + 5, 'o');
  // burning censer on a chain
  m.box(1, 3, F + 6, 1, 3, F + 7, 's');
  m.line(2, 4, F + 7, 3, 5, F + 5, 'g');
  m.box(2, 5, F + 2, 4, 6, F + 4, 'y'); m.set(3, 5, F + 5, 'o'); m.set(3, 5, F + 6, 'r'); m.set(4, 5, F + 5, 'o');
  return m;
}

function slag_golem(): Model {
  const m = mk();
  legs(m, F, F + 2, 'k', { x0: -1, x1: 1, yIn: 1, yOut: 3 });
  m.box(-3, -4, F + 3, 3, 4, F + 9, 'k');
  m.box(-2, -3, F + 10, 2, 3, F + 12, 'k');
  for (const s of [-1, 1]) m.box(-1, s * 5, F + 2, 2, s * 6, F + 9, 's');
  for (const [x, y, z] of [[3, 0, 4], [3, 0, 5], [3, 1, 6], [3, 2, 7], [3, -2, 8], [3, -2, 5], [1, 4, 6], [1, 4, 7], [0, -4, 5], [-1, 4, 8], [3, 0, 9], [2, 0, 12], [-3, 2, 7]] as [number, number, number][]) m.set(x, y, F + z, 'o');
  m.set(3, 0, F + 7, 'y'); m.set(3, 1, F + 6, 'y');
  m.set(3, -1, F + 11, 'y'); m.set(3, 1, F + 11, 'y');
  for (const [x, y] of [[-1, 3], [1, 0], [-1, -3]] as [number, number][]) { m.set(x, y, F + 13, 's'); m.set(x, y, F + 14, 'k'); }
  return m;
}

function cinder_bat(): Model {
  const m = mk();
  m.box(0, -1, F, 0, -1, F + 1, 'x'); m.box(0, 1, F, 0, 1, F + 1, 'x');
  m.ellip(0, 0, F + 4, 2.4, 2.2, 2.6, 'x');
  m.ellip(2, 0, F + 7, 2.2, 2.2, 2, 'x');
  for (const s of [-1, 1]) {
    m.box(2, s * 2, F + 9, 2, s * 3, F + 12, 'x'); m.set(2, s * 3, F + 13, 'x'); m.set(2, s * 2, F + 11, 'q');
    // wing: membrane panel with burning edge
    m.box(-1, s * 3, F + 3, 0, s * 8, F + 9, 'x');
    m.cut(-1, s * 3, F + 8, 0, s * 4, F + 9);
    for (let y = 3; y <= 8; y++) m.set(-1, s * y, F + 9 - Math.max(0, 6 - y), 'y');
    m.set(-1, s * 8, F + 10, 'o'); m.set(-1, s * 8, F + 9, 'y');
    for (const y of [4, 6, 8]) m.set(-1, s * y, F + 3, 'o');
  }
  eyes(m, 4, F + 8, 1, 'y');
  m.set(4, 0, F + 6, 'w'); m.set(4, 1, F + 6, 'w');
  return m;
}

function forge_smith(): Model {
  const m = mk();
  legs(m, F, F + 1, 'k', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  torso(m, F + 2, F + 5, 3, 2, 's');
  m.box(2, -2, F + 2, 3, 2, F + 5, 'u'); // apron
  m.box(-2, -3, F + 6, 2, 3, F + 6, 's');
  for (const s of [-1, 1]) m.box(-1, s * 4, F + 3, 1, s * 4, F + 6, 'h');
  head(m, F + 7, F + 10, 3, 3, 's');
  m.box(3, -2, F + 8, 3, 2, F + 9, 'k'); m.set(3, -1, F + 9, 'o'); m.set(3, 1, F + 9, 'o'); // mask slit
  m.box(-3, -3, F + 11, 3, 3, F + 11, 'g');
  // huge hammer over the shoulder
  m.box(0, 5, F + 2, 0, 5, F + 12, 'u');
  m.box(-2, 4, F + 13, 3, 7, F + 16, 'g');
  m.box(3, 4, F + 13, 3, 7, F + 16, 'o');
  return m;
}

function chain_warden(): Model {
  const m = mk();
  legs(m, F, F + 2, 's', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  torso(m, F + 3, F + 7, 3, 2, 's');
  m.box(2, -2, F + 4, 3, 2, F + 5, 'g');
  m.box(-2, -3, F + 3, 2, 3, F + 3, 'u');
  for (let i = 0; i < 5; i++) m.set(3, -3 + i * 1.5, F + 6 - (i % 2), 'g'); // chain across the chest
  head(m, F + 8, F + 12, 3, 3, 's');
  m.box(3, -2, F + 10, 3, 2, F + 10, 'k'); m.set(3, -1, F + 10, 'y'); m.set(3, 1, F + 10, 'y');
  m.box(-3, -3, F + 13, 3, 3, F + 13, 'g'); m.set(0, 0, F + 14, 'g');
  // ring of keys at the belt and long chains
  m.box(1, 4, F + 3, 1, 4, F + 4, 'y'); m.box(2, 4, F + 2, 2, 4, F + 3, 'y'); m.set(1, 5, F + 2, 'y');
  for (let i = 0; i < 8; i++) m.set(1 + (i % 2), -4 - (i > 3 ? 1 : 0), F + 7 - Math.floor(i / 2) * 1, 'g');
  m.box(0, -5, F, 2, -5, F, 'g');
  m.line(-2, 4, F + 6, -4, 5, F + 2, 'g');
  return m;
}

function soot_hexer(): Model {
  const m = mk();
  m.box(-1, -1, F, 0, 1, F + 4, 'k');
  m.cyl(0, 0, F + 5, F + 8, 2, 'k');
  m.box(-2, -2, F + 1, -2, 2, F + 3, 'k'); // tattered cloak
  m.set(0, 2, F, 'k'); m.set(0, -2, F + 1, 'k');
  head(m, F + 9, F + 12, 2, 2, 'w');
  m.box(2, -1, F + 11, 2, 1, F + 11, 'k'); m.set(2, 0, F + 10, 'k');
  m.box(2, 0, F + 12, 2, 0, F + 12, 'v'); m.set(2, 0, F + 11, 'v'); m.set(2, -1, F + 10, 'v'); // crack
  m.box(-2, -2, F + 13, 2, 2, F + 13, 'k'); m.box(-1, -1, F + 14, 1, 1, F + 14, 'k');
  for (const s of [-1, 1]) {
    m.box(1, s * 3, F + 6, 2, s * 3, F + 7, 'k');
    m.ellip(3, s * 3.4, F + 7, 1.6, 1.6, 1.6, 's'); m.ellip(4, s * 4, F + 9, 1.2, 1.2, 1.2, 'v'); m.set(4, s * 4, F + 11, 's');
  }
  return m;
}

function obsidian_knight(): Model {
  const m = new Model();
  addBase(m, 'enemy', 7);
  legs(m, F, F + 3, 'k', { x0: -1, x1: 1, yIn: 1, yOut: 2 });
  boots2(m);
  torso(m, F + 4, F + 9, 3, 2, 'k');
  m.set(3, 0, F + 7, 'v'); m.set(3, 1, F + 8, 'p'); m.set(3, -1, F + 6, 'v');
  for (const s of [-1, 1]) { m.box(-1, s * 4, F + 8, 1, s * 4, F + 9, 'v'); m.box(-1, s * 4, F + 5, 1, s * 4, F + 7, 'k'); }
  m.box(-2, -3, F + 10, 2, 3, F + 10, 's');
  head(m, F + 11, F + 14, 2, 3, 'k', 0);
  m.box(3, -1, F + 13, 3, 1, F + 13, 'v');
  m.set(0, 0, F + 15, 'k'); m.set(0, 0, F + 16, 'v'); m.set(-1, 0, F + 16, 'k');
  // jagged greatsword on the near side
  m.box(2, 5, F + 3, 2, 5, F + 4, 'u'); m.box(1, 5, F + 5, 3, 5, F + 5, 'v');
  for (let i = 0; i < 12; i++) { m.box(2, 5, F + 6 + i, 2, 5, F + 6 + i, i % 3 === 1 ? 'p' : 'v'); if (i % 3 === 0) m.set(3, 5, F + 6 + i, 'v'); if (i % 3 === 2) m.set(1, 5, F + 6 + i, 'v'); }
  return m;
}
function boots2(m: Model): void {
  m.boxM(-1, 1, F, 2, 2, F, 's');
}

export const ENEMY_RECIPES_2: Record<string, Recipe> = {
  bramble_imp, mushroom_brute, magpie_thief, web_spinner, hollow_stag,
  drowned_sailor, crab_knight, ink_squid, barnacle_golem, eel_lancer, bell_diver, tide_witch, coin_mimic, anchor_hulk,
  ember_whelp, ash_cultist, slag_golem, cinder_bat, forge_smith, chain_warden, soot_hexer, obsidian_knight,
};
