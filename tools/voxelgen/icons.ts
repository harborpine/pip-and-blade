/**
 * Every small icon as a toy: dice symbols, face effects, keyword badges, statuses, enemy intents,
 * set badges and the interface icons. All 36x36 unless noted, all drawn by the isometric renderer.
 * See toyicons.ts for the drawing rules.
 */
import type { Sprite } from './sheet';
import {
  cube, heart, LIFT8, lifts, miniDie, miniLock, padlock, pair, shield, skull, sub, sword, toy, wall, wallY,
} from './toyicons';
import { Model } from './voxel';

type Group = Record<string, Sprite>;

/** A standee from a bitmap. `d` = thickness in voxels. */
const S = (rows: string[], lift: number[] = [], d = 2): Model => wall(new Model(), rows, 0, d - 1, lift);

function make(prefix: string, defs: Record<string, () => Model | Sprite>): Group {
  const out: Group = {};
  for (const [k, f] of Object.entries(defs)) {
    try {
      const v = f();
      out[k] = v instanceof Model ? toy(v) : v;
    } catch (e) {
      throw new Error(`${prefix}.${k}: ${(e as Error).message}`, { cause: e });
    }
  }
  return out;
}

// ------------------------------------------------------------------ shared shapes

/** A first-aid card: a white tile with a bold plus. */
export const plusCard = (col: string): Model => {
  const m = S(sub([
    '.wwwwww.',
    'wwwCCwww',
    'wwwCCwww',
    'wCCCCCCw',
    'wCCCCCCw',
    'wwwCCwww',
    'wwwCCwww',
    '.wwwwww.',
  ], { C: col }));
  return m;
};

const bolt = (col: string): Model => S(sub([
  '....CCC',
  '...CCC.',
  '..CCC..',
  '.CCCCCC',
  '...CCC.',
  '..CCC..',
  '.CC....',
], { C: col }));

const drop = (col: string): Model => S(sub([
  '...CC...',
  '...CC...',
  '..CCCC..',
  '.CCCCCC.',
  'CwCCCCCC',
  'CwCCCCCC',
  '.CCCCCC.',
], { C: col }), LIFT8);

/** A blank: an ivory tile with a bold slash. Deliberately empty. */
export const blankIcon = (): Model => S([
  'cccccccc',
  'cccccssc',
  'ccccsscc',
  'cccssccc',
  'ccsscccc',
  'cssccccc',
  'cccccccc',
]);

const hourglass = (wood: string, sand: string): Model => S(sub([
  'WWWWWWW',
  '.wSSSw.',
  '..wSw..',
  '...w...',
  '..wSw..',
  '.wSSSw.',
  'WWWWWWW',
], { W: wood, S: sand }));

/** One thick slash mark, or three thin ones: an enemy strike. */
const slashes = (): Model => S([
  '...r..r..r',
  '..rr.rr.rr',
  '..rx.rx.rx',
  '.rr.rr.rr.',
  '.rx.rx.rx.',
  'rr.rr.rr..',
  'r..r..r...',
]);

const eye = (iris: string): Model => S(sub([
  '...wwww...',
  '.wwwIIwww.',
  'wwwIkkIwww',
  '.wwwIIwww.',
  '...wwww...',
], { I: iris }), [], 1);

const reticle = (ring: string, dot: string): Model => S(sub([
  '.RRRRRR.',
  'RR....RR',
  'R..DD..R',
  'R..DD..R',
  'RR....RR',
  '.RRRRRR.',
], { R: ring, D: dot }), [], 1);

const flag = (col: string): Model => S(sub([
  'uCCCCC.',
  'uCCCCCC',
  'uCCCCC.',
  'u......',
  'u......',
  'u......',
  'u......',
], { C: col }));

const tile = (rows: string[]): Model => S(rows);

/** Small thin parts for two-toy icons. */
const smallPlus = (col: string): Model => S(sub(['..CC..', '..CC..', 'CCCCCC', '..CC..', '..CC..'], { C: col }), [], 1);
const smallArrow = (col: string, flip = false): Model => {
  const rows = ['.CCCC', '..CCC', '.CC.C', 'CC...', 'C....'];
  return S(sub(flip ? rows.map((x) => [...x].reverse().join('')).reverse() : rows, { C: col }), [], 1);
};

/** An X of two bars, one on each wall. */
function cross(col: string): Model {
  const rows = sub(['....CC', '...CC.', '..CC..', '.CC...', 'CC....'], { C: col });
  const m = new Model();
  wall(m, rows, 2, 3);
  wallY(m, rows.map((r) => [...r].reverse().join('')), 2, 3);
  return m;
}

/**
 * A chevron folded round a corner so both arms are clean diagonals: '>' (or, left = true, '<').
 * `n` = arm length; (dx, dy) shifts it on the table.
 */
function chevron(m: Model, col: string, left: boolean, n: number, dx = 0, dy = 0): Model {
  for (let i = 0; i < n; i++) {
    if (left) {
      m.box(dx + i, dy + n, n + i, dx + i, dy + n + 1, n + i + 1, col); // upper arm, rising to the right
      m.box(dx, dy + n - i, n - i, dx + 1, dy + n - i, n - i + 1, col); // lower arm, falling to the right
    } else {
      m.box(dx + i, dy, i, dx + i, dy + 1, i + 1, col); // lower arm, rising to the tip
      m.box(dx + n - 1, dy + i, n - 1 + i, dx + n, dy + i, n + i, col); // upper arm, rising away from the tip
    }
  }
  return m;
}

/**
 * A caret folded round a corner so both arms are clean diagonals: '^' (up) or 'v' (down).
 * `n` = arm length, z0 = height of its lowest voxel.
 */
function caret(m: Model, col: string, up: boolean, n: number, z0: number): Model {
  for (let i = 0; i <= n; i++) {
    if (up) {
      m.box(i, n, z0 + i, i, n + 1, z0 + i + 1, col); // left arm, rising to the tip
      m.box(n, n - i, z0 + n - i, n + 1, n - i, z0 + n - i + 1, col); // right arm, falling away
    } else {
      m.box(0, i, z0 + i, 1, i, z0 + i + 1, col); // left arm, falling to the tip
      m.box(i, 0, z0 + i, i, 1, z0 + i + 1, col); // right arm, rising away
    }
  }
  return m;
}

/** The two halves of a snapped sword. */
const snapped = (edge: string, blade: string, guard: string, grip: string): string[] => sub([
  '.......EE',
  '......EBB',
  '.....EBB.',
  '.........',
  'G.EB.....',
  '.GBB.....',
  '.HGG.....',
  'H..G.....',
], { E: edge, B: blade, G: guard, H: grip });

const cubes3 = (a: string, b: string, c: string): Model => {
  const m = new Model();
  cube(m, 0, 4, 0, 3, a); cube(m, 4, 0, 0, 3, b); cube(m, 2, 2, 3, 3, c);
  m.set(1, 5, 2, 'k'); m.set(5, 1, 2, 'k'); m.set(3, 3, 5, 'k');
  return m;
};

// ------------------------------------------------------------------ categories

export function symbols(): Group {
  return make('sym', {
    blade: () => sword('r', 'q', 'x', 'x'),
    guard: () => shield('b', 'n'),
    heart: () => heart('e', 'l'),
    spark: () => bolt('y'),
    skull: () => skull('p', 'i'),
  });
}

export function effects(): Group {
  return make('fx', {
    damage: () => sword('g', 'w', 'y', 'u'),
    shield: () => shield('b', 'g', 'w'),
    heal: () => plusCard('e'),
    weaken: () => pair(S(snapped('w', 'g', 'y', 'u')), 0, 1, smallArrow('v', true), 22, 17),
    focus: () => pair(miniDie(new Model()), 1, 9, smallPlus('e'), 19, 1),
    blank: () => blankIcon(),
  });
}

export function keywords(): Group {
  return make('kw', {
    cleave: () => S([
      '.gggg.u.',
      'wgggggu.',
      'wgggggu.',
      'wgggggu.',
      '.gggg.u.',
      '......u.',
      '......u.',
      '......u.',
    ]),
    echo: () => {
      const m = new Model();
      wall(m, ['ppppp', 'ppppp', 'ppppp', 'ppppp'], 0, 0, [], 3, 2);
      wall(m, ['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb'], 3, 3, [], 0, 0);
      return m;
    },
    growth: () => S([
      'll...ll',
      'lll.lll',
      '.lleel.',
      '...e...',
      '...e...',
      '..eee..',
    ]),
    reckless: () => wall(new Model(), [
      '.rrr...rrr.',
      'rqrrk.rrrrr',
      'rrrrkkrrrrr',
      'rrrrrkrrrrr',
      '.rrrkkrrrr.',
      '..rrkrrrr..',
      '...rrkrr...',
      '.....r.....',
    ], 0, 1, lifts(4, 3, 4)),
    pierce: () => pair(shield('b', 'n'), 0, 2, S([
      '....ggg',
      '.....gg',
      '....u.g',
      '...u...',
      '..u....',
      'ru.....',
      'rr.....',
    ], [], 1), 14, 5),
    venom: () => drop('l'),
    ward: () => shield('b', 'y', 'y'),
    twin: () => {
      const m = new Model();
      cube(m, 0, 4, 0, 3, 'm'); cube(m, 4, 0, 0, 3, 'm');
      m.set(1, 5, 2, 'w'); m.set(5, 1, 2, 'w');
      return m;
    },
    rally: () => flag('r'),
    momentum: () => {
      const m = new Model();
      m.add(miniDie(new Model(), 5, 4), 4, 0, 0);
      m.box(0, 1, 3, 2, 1, 3, 't'); m.box(-1, 3, 2, 2, 3, 2, 't'); m.box(0, 2, 0, 2, 2, 0, 't');
      return m;
    },
    poised: () => eye('b'),
    execute: () => S([
      'uuuuuuuu',
      'u.gggg.u',
      'u.gggw.u',
      'u.ggw..u',
      'u.gw...u',
      'u......u',
      'u.rrrr.u',
      'uuuuuuuu',
    ]),
  });
}

export function statuses(): Group {
  return make('status', {
    poison: () => skull('l', 'f'),
    weak: () => S([
      '...gggg.',
      '..ggg.gg',
      '..gg..gg',
      '..gg...g',
      '..gg....',
      'vvvvvv..',
      '..ii....',
      '..ii....',
    ]),
    strength: () => {
      const m = new Model();
      m.box(0, 0, 0, 1, 3, 3, 'r'); m.box(7, 0, 0, 8, 3, 3, 'r');
      m.box(2, 1, 1, 6, 2, 2, 'g');
      return m;
    },
    thorns: () => S([
      '...l....',
      '...ll..l',
      'l..ee.le',
      'le.eelee',
      'eeeeeeee',
      'ffffffff',
    ]),
    regen: () => S([
      '....lll',
      '..lllel',
      '.lllell',
      '.llelll',
      'lleell.',
      'lelll..',
      'e......',
    ]),
    mark: () => reticle('r', 'r'),
  });
}

export function setBadges(): Group {
  return make('set', {
    pair: () => {
      const m = new Model();
      cube(m, 0, 4, 0, 3, 'w'); cube(m, 4, 0, 0, 3, 'w');
      m.set(1, 5, 2, 'k'); m.set(5, 1, 2, 'k');
      return m;
    },
    triple: () => cubes3('w', 'w', 'w'),
    rainbow: () => cubes3('r', 'b', 'y'),
  });
}

export function intents(): Group {
  return make('intent', {
    attack: () => sword('s', 'r', 'k', 'x', true),
    attack_all: () => slashes(),
    shield: () => shield('b', 's'),
    heal: () => plusCard('e'),
    buff: () => caret(caret(new Model(), 'o', true, 3, 0), 'y', true, 3, 3),
    debuff: () => caret(caret(new Model(), 'v', false, 3, 0), 'p', false, 3, 3),
    lockDie: () => pair(miniDie(new Model()), 1, 1, miniLock(new Model()), 20, 12),
    curseFace: () => {
      const m = miniDie(new Model(), 6, 5);
      m.box(0, 5, 0, 5, 5, 4, 'v');
      for (const [x, z] of [[3, 4], [3, 3], [2, 3], [2, 2], [3, 1], [3, 0]] as [number, number][]) m.set(x, 5, z, 'k');
      return m;
    },
    stealReroll: () => pair(miniDie(new Model()), 1, 9, S(['rrrrrr'], [], 1), 19, 4),
    summon: () => pair(S([
      'e.....e',
      'ee...ee',
      'eeeeeee',
      'ekeeeke',
      'eeeeeee',
      '.eeeee.',
    ], lifts(4, 3)), 0, 8, smallPlus('y'), 19, 1),
    charge: () => hourglass('s', 'r'),
  });
}

/** Two thick gold arrows chasing each other round a die face: roll again. 48x48. */
function reroll(): Sprite {
  const m = wall(new Model(), [
    '...yyyyyy.y...',
    '..yyyyyyyyyy..',
    '.yyy.....yyyyy',
    '.yy.......yyy.',
    '...........y..',
    '..y...........',
    '.yyy.......yy.',
    'yyyyy.....yyy.',
    '..yyyyyyyyyy..',
    '...y.yyyyyy...',
  ], 0, 0);
  // the die face in the middle, standing a little proud of the arrows
  wall(m, ['wwwwww', 'wkwwkw', 'wwkkww', 'wkwwkw', 'wwwwww'], 1, 1, [], 4, 2);
  return toy(m, 48);
}

export function uiIcons(): Group {
  const box = (col: string): Model => {
    const m = new Model();
    m.box(0, 0, 0, 5, 5, 2, col);
    return m;
  };
  const medal = (disc: string, core: string, ribbon: string): Model => S(sub([
    '.RR..RR.',
    '..RRRR..',
    '..DDDD..',
    '.DDDDDD.',
    '.DDCCDD.',
    '.DDDDDD.',
    '..DDDD..',
  ], { D: disc, C: core, R: ribbon }), LIFT8);
  return make('ui', {
    reroll: () => reroll(),
    lock: () => padlock(new Model(), false),
    unlock: () => padlock(new Model(), true),
    undo: () => {
      const m = chevron(new Model(), 'o', true, 3);
      chevron(m, 'o', true, 3, 3, -3);
      return m;
    },
    end_turn: () => hourglass('u', 'y'),
    settings: () => {
      const m = new Model();
      m.cyl(0, 0, 0, 1, 3, 'g');
      for (const [x, y] of [[-4, 0], [4, 0], [0, -4], [0, 4]] as [number, number][]) m.box(x - (y ? 1 : 0), y - (x ? 1 : 0), 0, x + (y ? 1 : 0), y + (x ? 1 : 0), 1, 'g');
      m.box(-1, -1, 1, 1, 1, 1, 'k');
      return m;
    },
    back: () => chevron(new Model(), 'b', true, 4),
    close: () => cross('r'),
    check: () => S([
      '......ee',
      '.....ee.',
      'e...ee..',
      'ee.ee...',
      '.eee....',
      '..e.....',
    ]),
    hp: () => heart('r', 'q'),
    shield: () => shield('b', 'n'),
    ward: () => shield('b', 'y'),
    gold: () => {
      const m = new Model();
      for (let z = 0; z < 4; z++) m.cyl(0, 0, z, z, 2.3, z % 2 === 0 ? 'o' : 'y');
      m.set(0, 0, 3, 'w');
      m.cyl(4, 3, 0, 0, 2.3, 'y');
      m.set(4, 3, 0, 'o');
      return m;
    },
    downed: () => S([
      '.gggg.',
      'gggggg',
      'ggssgg',
      'gssssg',
      'ggssgg',
      'ggssgg',
      'gggggg',
    ], lifts(3, 3)),
    play: () => sword('g', 'w', 'e', 'f'),
    daily: () => tile([
      'rrrrrrr',
      'rrrrrrr',
      'wwwwwww',
      'wwwkkww',
      'wwwkkww',
      'wwwwwww',
    ]),
    collection: () => {
      const m = new Model();
      m.box(0, 0, 0, 5, 2, 6, 'b');
      m.box(1, 1, 1, 5, 1, 6, 'w');
      m.box(2, 2, 3, 3, 2, 4, 'y');
      return m;
    },
    stats: () => S([
      '......rr',
      '......rr',
      '...yy.rr',
      '...yy.rr',
      'bb.yy.rr',
      'bb.yy.rr',
    ]),
    feat: () => medal('y', 'o', 'r'),
    feat_locked: () => medal('g', 's', 's'),
    tutorial: () => tile([
      'uuuuuuu',
      'ccnnncc',
      'ccccncc',
      'cccnccc',
      'ccccccc',
      'cccnccc',
      'uuuuuuu',
    ]),
    export: () => pair(box('u'), 1, 13, smallArrow('y'), 17, 1),
    import: () => pair(box('u'), 1, 13, smallArrow('y', true), 17, 1),
    install: () => pair(box('w'), 1, 13, smallArrow('b'), 17, 1),
    reset: () => S([
      '..ggg..',
      'ggggggg',
      '.gsgsg.',
      '.gsgsg.',
      '.gsgsg.',
      '.ggggg.',
    ]),
    motion: () => S([
      'pppppppp',
      '........',
      '..pppppp',
      '........',
      'pppppp..',
    ], [], 1),
    tier: () => S([
      '...o....',
      '..oo....',
      '..ooo.o.',
      '.oyoooo.',
      'ooyyyooo',
      'ooyyyyoo',
      '.ooyyoo.',
    ], LIFT8),
    unknown: () => tile([
      'sssssss',
      'sswwwss',
      'sssswss',
      'ssswsss',
      'sssssss',
      'ssswsss',
      'sssssss',
    ]),
    rotate: () => pair(tile(['kkkkk', 'kbbbk', 'kbbbk', 'kbbbk', 'kbbbk', 'kkkkk']), 1, 6, S(['.yyy', '..yy', '.y.y', 'y...']), 20, 1),
    info: () => S([
      '.bbbbbb.',
      'bbbwwbbb',
      'bbbbbbbb',
      'bbbwwbbb',
      'bbbwwbbb',
      'bbbwwbbb',
      '.bbbbbb.',
    ], LIFT8),
    skip: () => {
      const m = chevron(new Model(), 'b', false, 3);
      chevron(m, 'b', false, 3, 3, -3);
      return m;
    },
    act: () => flag('t'),
    boss: () => S([
      'y.yyyy.y',
      'yyyyyyyy',
      '.wwwwww.',
      'wkkwwkkw',
      'wwwwwwww',
      '.wkwwkw.',
    ], LIFT8, 3),
    fight: () => pair(sword('g', 'w', 'y', 'u'), 12, 1, sword('s', 'r', 'k', 'x', true), 2, 1),
    target: () => reticle('w', 'r'),
    peek: () => eye('e'),
  });
}

/** Ids of the interface icons this module draws (so the generator keeps the new ones before the asset list names them). */
export const NEW_UI_IDS = ['ui.install', 'ui.target', 'ui.peek'] as const;
