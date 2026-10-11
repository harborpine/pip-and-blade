/** The 40 items and the 6 doors as toys: 48x48 voxel models drawn by the isometric renderer. */
import { ITEM_ROSTER } from '../../src/shared/roster';
import type { Sprite } from './sheet';
import { cube, LIFT8, lifts, miniDie, pair, skull, toy, wall } from './toyicons';
import { Model } from './voxel';

export const ITEM = 48;

const S = (rows: string[], lift: number[] = [], d = 2): Model => wall(new Model(), rows, 0, d - 1, lift);

/** A die-sized block with plates on the two near faces and a top colour. */
function block(n: number, h: number, body: string, left = body, right = body): Model {
  const m = new Model();
  const e = n - 1;
  m.box(0, 0, 0, e, e, h - 1, body);
  m.box(1, e, 1, e - 1, e, h - 2, left);
  m.box(e, 1, 1, e, e - 1, h - 2, right);
  return m;
}

const ITEMS: Record<string, () => Model | Sprite> = {
  whetstone: () => {
    const m = new Model();
    m.box(0, 0, 0, 8, 3, 1, 's');
    m.box(0, 0, 2, 8, 3, 2, 'g');
    wall(m, ['.y.', 'yyy', '.y.'], 1, 1, [], 6, 4);
    return m;
  },
  oak_buckler: () => {
    const m = S([
      '..uuuu..',
      '.uzhhzu.',
      'uhzhhzhu',
      'uhzhhzhu',
      'uhzhhzhu',
      '.uzhhzu.',
      '..uuuu..',
    ], LIFT8);
    m.box(3, 2, 3, 3, 2, 4, 'g'); m.box(4, 2, 4, 4, 2, 5, 'g');
    return m;
  },
  healers_satchel: () => {
    const m = new Model();
    m.box(0, 0, 0, 7, 3, 4, 'u');
    m.box(0, 0, 5, 7, 3, 5, 'z');
    m.box(3, 4, 1, 4, 4, 3, 'e'); m.box(2, 4, 2, 5, 4, 2, 'e');
    m.box(1, 1, 6, 1, 2, 7, 'z'); m.box(6, 1, 6, 6, 2, 7, 'z'); m.box(1, 1, 8, 6, 2, 8, 'z');
    return m;
  },
  lucky_coin: () => S([
    '..yyyy..',
    '.yyeeyy.',
    'yyeeeeyy',
    'yyeeeeyy',
    'yyyeeyyy',
    '.yyeeyy.',
    '..yyyy..',
  ], LIFT8),
  hollow_die: () => {
    const m = block(7, 6, 'g', 's', 's');
    for (const [x, z] of [[3, 4], [3, 3], [4, 3], [4, 2], [3, 1]] as [number, number][]) m.set(x, 6, z, 'k');
    return m;
  },
  loaded_pip: () => {
    const m = block(7, 6, 'w');
    m.box(2, 6, 2, 4, 6, 3, 'r');
    m.box(2, 2, 5, 4, 4, 5, 'r');
    m.set(6, 2, 3, 'k'); m.set(6, 4, 2, 'k');
    return m;
  },
  first_pick_glove: () => pair(S([
    '.hh.hh.h.',
    '.hh.hh.hh',
    '.hhhhhhhh',
    'hhhhhhhhh',
    'hhhhhhhh.',
    '.hhhhhh..',
    '.uuuuuu..',
    '.uuuuuu..',
  ], [], 3), 0, 6, miniDie(new Model(), 4, 4), 26, 2, ITEM),
  thorn_mail: () => {
    const m = S([
      'ee......ee',
      'eeee..eeee',
      'eeeeeeeeee',
      '.eeeeeeee.',
      '.eeeeeeee.',
      '.eeeeeeee.',
      '.ffffffff.',
    ], lifts(5, 5), 2);
    for (const [x, z] of [[2, 4], [4, 2], [6, 5], [7, 3], [3, 1], [8, 6]] as [number, number][]) m.set(x, 2, z + (x >= 5 ? 1 : 0), 'w');
    return m;
  },
  venom_vial: () => S([
    '...uu...',
    '...ww...',
    '...ww...',
    '..wwww..',
    '.wllllw.',
    'wllllllw',
    'wllwlllw',
    '.wllllw.',
    '..wwww..',
  ], LIFT8),
  twin_charm: () => {
    const m = new Model();
    wall(m, ['.yyyy.', 'y....y', 'y....y', 'y....y', 'y....y', '.yyyy.'], 3, 3, [], 0, 3);
    wall(m, ['.oooo.', 'o....o', 'o....o', 'o....o', 'o....o', '.oooo.'], 0, 0, [], 4, 0);
    m.box(4, 1, 3, 4, 2, 5, 'o');
    return m;
  },
  crown_of_three: () => S([
    'y...yy...y',
    'yy.yyyy.yy',
    'yyyyyyyyyy',
    'yryybbyyey',
    'yyyyyyyyyy',
    'oooooooooo',
  ], lifts(5, 5), 3),
  patient_hourglass: () => S([
    'uuuuuuuuu',
    '.wbbbbbw.',
    '..wbbbw..',
    '...wbw...',
    '....w....',
    '...w.w...',
    '..w.b.w..',
    '.wbbbbbw.',
    'uuuuuuuuu',
  ], [], 3),
  gamblers_ante: () => {
    const m = new Model();
    const cols = ['r', 'w', 'b', 'w', 'r'];
    cols.forEach((c, z) => m.cyl(0, 0, z, z, 3.3, c));
    m.cyl(0, 0, 4, 4, 1.2, 'w');
    return m;
  },
  iron_ration: () => {
    const m = new Model();
    m.cyl(0, 0, 0, 5, 3, 'g');
    m.cyl(0, 0, 2, 3, 3, 'r');
    m.cyl(0, 0, 5, 5, 2, 'o');
    return m;
  },
  seedling_pot: () => {
    const m = new Model();
    m.cyl(0, 0, 0, 2, 2.3, 'o');
    m.cyl(0, 0, 3, 3, 3, 'o');
    m.cyl(0, 0, 3, 3, 2, 'z');
    wall(m, ['ll...ll', 'lll.lll', '.lleel.', '...e...', '...e...'], 0, 0, [], -3, 4);
    return m;
  },
  red_bandana: () => S([
    '.rrrrrrr..',
    'rrrrrrrrx.',
    'rrrrrrrrxx',
    '.rrrrrrrx.',
    '......xx..',
    '.....xx.x.',
    '....xx..x.',
    '........x.',
  ]),
  mirror_shard: () => S([
    '......bb',
    '.....bwb',
    '....bwbb',
    '...bwbb.',
    '..bwbbb.',
    '.bwbbb..',
    'bbbbb...',
    '.bbb....',
  ]),
  ward_stone: () => S([
    '..nnnnn..',
    '.nnbbbnn.',
    'nnbnnnbnn',
    'nnbnbnbnn',
    'nnnnbbnnn',
    '.nnnnnnn.',
  ], lifts(3, 3, 3), 3),
  bone_charm: () => {
    const m = skull('w', 'k');
    m.box(3, 1, 8, 3, 1, 10, 'u'); m.box(4, 1, 11, 4, 1, 11, 'u'); m.box(5, 1, 9, 5, 1, 10, 'u');
    return m;
  },
  unjam_oil: () => {
    const m = new Model();
    m.box(0, 0, 0, 5, 3, 3, 'y');
    m.box(1, 1, 4, 4, 2, 4, 'o');
    wall(m, ['...oo', '..oo.', '.oo..', 'oo...'], 1, 2, [], 5, 3);
    m.set(10, 1, 4, 'b'); m.set(10, 1, 3, 'b');
    return m;
  },
  purse_string: () => S([
    '..h..h..',
    '..hhhh..',
    '..rrrr..',
    '.hhhhhh.',
    'hhhyyhhh',
    'hhyyyyhh',
    'hhhyyhhh',
    '.hhhhhh.',
  ], LIFT8, 3),
  spiked_pommel: () => S([
    '...gw...',
    '...gw...',
    '...gw...',
    'yyyyyyyy',
    '...uu...',
    '...uu...',
    '..ssss..',
    '...ss...',
    '...ww...',
  ], [], 2),
  leech_fang: () => S([
    '....rrrr',
    '...rrrrr',
    '...rrrr.',
    '..rrrr..',
    '..rrr...',
    '.rrq....',
    '.rq.....',
    'qq......',
  ]),
  battle_drum: () => {
    const m = new Model();
    m.cyl(0, 0, 0, 0, 3.3, 'y');
    m.cyl(0, 0, 1, 3, 3.3, 'r');
    m.cyl(0, 0, 4, 4, 3.3, 'y');
    m.cyl(0, 0, 4, 4, 2.3, 'c');
    for (let i = -2; i <= 2; i++) { m.set(i, i, 5, 'u'); m.set(i, -i, 5, 'u'); }
    return m;
  },
  last_word: () => S([
    'uuuuuuuu',
    'cccccccc',
    'cssssssc',
    'cccccccc',
    'cssssccc',
    'cccccrrc',
    'cccccrrc',
    'uuuuuuuu',
  ]),
  cleaver_hook: () => S([
    'gg.......',
    'gggggggg.',
    'gggggggg.',
    'gggggggg.',
    'wwwwwwwgu',
    '.......uu',
    '.......uu',
  ]),
  field_medic_kit: () => {
    const m = new Model();
    m.box(0, 0, 0, 8, 3, 4, 'w');
    m.box(0, 0, 5, 8, 3, 5, 'c');
    m.box(3, 1, 6, 5, 2, 6, 's');
    for (const [x, z] of [[3, 3], [5, 3], [3, 2], [4, 2], [5, 2], [4, 1]] as [number, number][]) m.set(x, 4, z, 'r');
    m.box(2, 4, 3, 2, 4, 3, 'r'); m.box(6, 4, 3, 6, 4, 3, 'r');
    return m;
  },
  merchants_scale: () => S([
    '.....y.....',
    'yyyyyyyyyyy',
    'y....y....y',
    'y....y....y',
    'ooo..y..ooo',
    '.....y.....',
    '...yyyyy...',
  ], [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2], 1),
  void_pip: () => {
    const m = block(7, 6, 'k', 'k', 'k');
    for (let i = 0; i < 7; i++) { m.set(i, 6, 5, 'v'); m.set(6, i, 5, 'v'); m.set(i, 0, 5, 'v'); m.set(0, i, 5, 'v'); }
    m.box(3, 6, 2, 3, 6, 3, 'v'); m.box(6, 3, 2, 6, 3, 3, 'v'); m.set(3, 3, 5, 'v');
    return m;
  },
  echo_bell: () => {
    const m = S([
      '...uu...',
      '...uu...',
      '..gggg..',
      '.gwgggg.',
      '.gwgggg.',
      'gggggggg',
      '...yy...',
    ], LIFT8, 2);
    m.box(10, 0, 3, 10, 0, 5, 'b'); m.box(12, 0, 2, 12, 0, 6, 'b');
    return m;
  },
  reckless_idol: () => S([
    'c......c',
    'cc....cc',
    '.rrrrrr.',
    '.ryrryr.',
    '.rrrrrr.',
    '.rkkkkr.',
    '.rrrrrr.',
    'ssssssss',
  ], LIFT8, 3),
  executioners_hood: () => S([
    '...kk...',
    '..kkkk..',
    '.kkkkkk.',
    '.kwkkwk.',
    '.kwkkwk.',
    'kkkkkkkk',
    'kkkkkkkk',
    'kk.kk.kk',
  ], LIFT8, 3),
  rainbow_prism: () => S([
    '....w......',
    '...ww.rrrrr',
    '..wpw......',
    '.wppw.yyyyy',
    'wpppw......',
    'wwwww.bbbbb',
  ]),
  pip_magnet: () => S([
    'ww....ww',
    'ww....ww',
    'rr....rr',
    'rr....rr',
    'rr....rr',
    'rrr..rrr',
    '.rrrrrr.',
    '..rrrr..',
  ], LIFT8, 2),
  glass_cannon: () => {
    const m = new Model();
    m.box(0, 0, 3, 7, 2, 5, 'p');
    m.box(8, 0, 3, 8, 2, 5, 'w');
    m.box(8, 1, 4, 8, 1, 4, 'k');
    wall(m, ['.uu.', 'uuuu', 'uuuu', '.uu.'], 3, 3, [], 1, 0);
    m.box(1, -1, 0, 4, -1, 3, 'u');
    return m;
  },
  tortoise_shell: () => {
    const m = new Model();
    m.cyl(0, 0, 0, 0, 4.3, 'h');
    m.cyl(0, 0, 1, 2, 4, 'e');
    m.cyl(0, 0, 3, 3, 3, 'e');
    m.cyl(0, 0, 4, 4, 1.5, 'f');
    for (const [x, y] of [[3, 0], [-3, 0], [0, 3], [0, -3]] as [number, number][]) m.set(x, y, 3, 'f');
    for (const [x, y] of [[4, 2], [2, 4]] as [number, number][]) m.set(x, y, 1, 'f');
    return m;
  },
  plague_censer: () => S([
    '....g....l',
    '...g.g..ll',
    '..g...g..l',
    '.yyyyyyy.l',
    '.ykykyky..',
    '.yyyyyyy..',
    '..yyyyy...',
    '...ooo....',
  ]),
  double_or_nothing: () => {
    const m = new Model();
    cube(m, 0, 5, 0, 5, 'w', 4); cube(m, 5, 0, 0, 5, 'k', 4);
    m.set(2, 7, 3, 'k'); m.set(1, 9, 1, 'k'); m.set(3, 9, 2, 'k');
    m.set(7, 2, 3, 'w'); m.set(9, 1, 2, 'w'); m.set(9, 3, 1, 'w'); m.set(6, 4, 1, 'w'); m.set(8, 4, 2, 'w');
    return m;
  },
  phoenix_feather: () => S([
    '......rr',
    '....ryyr',
    '...oyyo.',
    '..ooyoo.',
    '.ooyoo..',
    '.oyoo...',
    'ooo.....',
    'u.......',
  ]),
  kings_die: () => {
    const m = block(7, 6, 'y', 'y', 'o');
    m.box(2, 6, 2, 4, 6, 3, 'w');
    wall(m, ['o.o.o', 'ooooo'], 2, 4, [], 1, 6);
    m.set(3, 3, 8, 'r');
    return m;
  },
};

/** Standee door: 8 wide, 11 tall. */
const door = (rows: string[]): Model => S(rows, [], 2);

const DOORS: Record<string, () => Model> = {
  elite: () => door([
    '.ssssss.',
    'ssssssss',
    'sgsssgss',
    'ssrrrrss',
    'ssrkrkss',
    'ssrrrrss',
    'sssrrsss',
    'ssssssss',
    'sgsssgss',
    'ssssssss',
    'kkkkkkkk',
  ]),
  rest: () => door([
    '.uuuuuu.',
    'uuuuuuuu',
    'uccccccu',
    'ucccocuu',
    'uccoocuu',
    'ucoyoocu',
    'ucuuuucu',
    'uuuuuuuu',
    'uuuuuuyu',
    'uuuuuuuu',
    'zzzzzzzz',
  ]),
  shop: () => door([
    'rwrwrwrw',
    'rwrwrwrw',
    'rwrwrwrw',
    '.hhhhhh.',
    '.hhyyhh.',
    '.hyyyyh.',
    '.hhyyhh.',
    '.hhhhhh.',
    '.hhhhuh.',
    '.hhhhhh.',
    'uuuuuuuu',
  ]),
  event: () => door([
    '.vvvvvv.',
    'vvvvvvvv',
    'vvwwwwvv',
    'vvvvvwvv',
    'vvvvwwvv',
    'vvvwwvvv',
    'vvvvvvvv',
    'vvvwwvvv',
    'vvvvvvvv',
    'vvvvvvvv',
    'iiiiiiii',
  ]),
  treasure: () => door([
    '.yyyyyy.',
    'yyyyyyyy',
    'yyyyyyyy',
    'yuuuuuuy',
    'yuuyyuuy',
    'yzzyyzzy',
    'yuuuuuuy',
    'yyyyyyyy',
    'yyyyyyoy',
    'yyyyyyyy',
    'oooooooo',
  ]),
  onward: () => door([
    '.gggggg.',
    'gggggggg',
    'ggbbbbgg',
    'gbbbbbbg',
    'gbbbwwbg',
    'gbbbbbbg',
    'gbbllbbg',
    'glllllbg',
    'geeeellg',
    'geeeeeeg',
    'ssssssss',
  ]),
};

function build(prefix: string, defs: Record<string, () => Model | Sprite>): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  for (const [k, f] of Object.entries(defs)) {
    try {
      const v = f();
      out.set(`${prefix}.${k}`, v instanceof Model ? toy(v, ITEM) : v);
    } catch (e) {
      throw new Error(`${prefix}.${k}: ${(e as Error).message}`, { cause: e });
    }
  }
  return out;
}

export function buildToyItems(): Map<string, Sprite> {
  const out = build('item', ITEMS);
  for (const i of ITEM_ROSTER) if (!out.has(`item.${i.id}`)) throw new Error(`no toy for item ${i.id}`);
  return out;
}

export function buildToyDoors(): Map<string, Sprite> {
  return build('door', DOORS);
}



