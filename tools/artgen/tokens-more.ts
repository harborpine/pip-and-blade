/**
 * Token faces for the remaining heroes, every enemy and the two later bosses.
 * Each face: a few flat shapes inside radius 34 of the centre (48, 48); see tokens.ts for the rules.
 * Brief for each is the `look` line in src/shared/roster.ts.
 */
import { HERO_COLOR, c } from './palette';
import { circle, ellipse, path, rect, roundPoly } from './svg';
import { F, STROKE } from './tokenkit';
import type { TokenDef } from './tokenkit';

const ink = c('ink');
const eyes = (x1: number, x2: number, y: number, r: number, col = ink): string => circle(x1, y, r, { fill: col }) + circle(x2, y, r, { fill: col });
/** Eyes with pupils. */
const lookEyes = (x1: number, x2: number, y: number, r: number, white = 'ivory', pupil = 0.5, dy = 0.6): string =>
  eyes(x1, x2, y, r, c(white)) + eyes(x1, x2, y + r * (dy - 0.5) * 0.8, r * pupil, ink);

const heroes: Record<string, TokenDef> = {
  'hero.gambler': {
    kind: 'hero', color: HERO_COLOR.gambler,
    face: () =>
      // top hat with gold band, one plain eye, a gold monocle, a smirk
      rect(35, 16, 26, 22, 3, { fill: HERO_COLOR.gambler }) +
      rect(26, 35, 44, 6, 3, { fill: HERO_COLOR.gambler }) +
      rect(35, 30, 26, 5, 0, F('gold')) +
      circle(40, 54, 3.6, { fill: ink }) +
      circle(56, 54, 6, STROKE(c('gold'), 3)) + circle(56, 54, 2.8, { fill: ink }) +
      path('M39 66Q48 70 58 62', STROKE(ink, 3)),
  },
  'hero.redhand': {
    kind: 'hero', color: HERO_COLOR.redhand,
    face: () =>
      // horns, helm with nose guard, eyes, big beard
      path('M32 40C24 36 21 28 25 18C28 26 32 29 38 31Z', F('stone')) +
      path('M64 40C72 36 75 28 71 18C68 26 64 29 58 31Z', F('stone')) +
      path('M30 45C30 31 38 25 48 25C58 25 66 31 66 45Z', { fill: HERO_COLOR.redhand }) +
      rect(45.5, 40, 5, 13, 2.5, { fill: HERO_COLOR.redhand }) +
      eyes(40, 56, 50, 3.4) +
      path('M31 55C34 69 41 78 48 78C55 78 62 69 65 55C58 61 38 61 31 55Z', F('brown')),
  },
  'hero.automaton': {
    kind: 'hero', color: HERO_COLOR.automaton,
    face: () =>
      // winding key, side bolts, boxy head, round lens eye, mouth slot
      path('M48 30L48 23', STROKE(c('gold'), 4)) + circle(48, 18.5, 4.6, STROKE(c('gold'), 3.4)) +
      rect(23, 42, 8, 12, 3, { fill: HERO_COLOR.automaton }) + rect(65, 42, 8, 12, 3, { fill: HERO_COLOR.automaton }) +
      rect(28, 29, 40, 40, 9, { fill: HERO_COLOR.automaton }) +
      circle(48, 46, 10.5, F('gold')) + circle(48, 46, 5.5, { fill: ink }) +
      rect(38, 58, 20, 5, 2.5, { fill: ink }),
  },
  'hero.grower': {
    kind: 'hero', color: HERO_COLOR.grower,
    face: () =>
      // sapling, shell dome with its rim, turtle head, eyes, smile
      path('M48 32L48 20', STROKE(c('green'), 3)) +
      path('M47 24C41 24 37 20 37 14C43 14 47 18 47 24Z', F('lime')) +
      path('M49 21C49 15 53 12 59 12C59 18 55 21 49 21Z', F('lime')) +
      path('M23 52C23 38 34 31 48 31C62 31 73 38 73 52Z', { fill: HERO_COLOR.grower }) +
      rect(23, 48, 50, 6, 3, F('brown')) +
      circle(48, 65, 11, F('green')) +
      eyes(44, 52, 63, 2.6) +
      path('M44 69Q48 72 52 69', STROKE(ink, 2.4)),
  },
  'hero.hexer': {
    kind: 'hero', color: HERO_COLOR.hexer,
    face: () =>
      // pointed hood, dark face, glowing eyes, floating orb
      path('M46 14C54 26 68 40 68 74L26 74C26 40 38 26 46 14Z', { fill: HERO_COLOR.hexer }) +
      ellipse(47, 53, 11.5, 14, { fill: ink }) +
      ellipse(42.5, 51, 2.4, 3.4, F('ivory')) + ellipse(51.5, 51, 2.4, 3.4, F('ivory')) +
      circle(68, 30, 6.5, F('purple')),
  },
};

const act1: Record<string, TokenDef> = {
  'enemy.bramble_imp': {
    kind: 'enemy',
    face: () =>
      // leaf ears, thorn spikes, green head, gold eyes, grin
      path('M34 47C26 47 19 41 17 32C26 31 33 36 37 42Z', F('lime')) +
      path('M62 47C70 47 77 41 79 32C70 31 63 36 59 42Z', F('lime')) +
      path(roundPoly([[38, 38], [42, 26], [47, 35], [50, 22], [54, 35], [59, 27], [60, 40]], 0.8), F('brown')) +
      ellipse(48, 51, 16, 17, F('green')) +
      ellipse(42, 49, 3.8, 3.2, F('gold')) + ellipse(54, 49, 3.8, 3.2, F('gold')) +
      eyes(42, 54, 49, 1.6) +
      path('M40 58Q48 65 56 58', STROKE(ink, 3)),
  },
  'enemy.twig_archer': {
    kind: 'enemy',
    face: () =>
      // bow and string, leaf tuft, tall stick head, eyes, mouth
      path('M64 22Q82 48 64 74', STROKE(c('brown'), 4)) + path('M64 22L64 74', STROKE(c('ivory-dim'), 2)) +
      path('M44 31C38 28 36 22 38 16C43 19 45 24 44 31Z', F('green')) +
      path('M44 31C46 24 51 20 57 20C56 26 51 30 44 31Z', F('green')) +
      rect(33, 30, 22, 44, 11, F('stone')) +
      eyes(39, 49, 46, 3) +
      path('M40 58L48 58', STROKE(ink, 3)),
  },
  'enemy.mushroom_brute': {
    kind: 'enemy',
    face: () =>
      // red cap, three spots, cream stalk face, eyes, frown
      path('M22 50C22 32 34 22 48 22C62 22 74 32 74 50Q74 54 70 54L26 54Q22 54 22 50Z', F('red')) +
      circle(35, 37, 4.6, F('ivory')) + circle(51, 30, 4, F('ivory')) + circle(63, 42, 4.2, F('ivory')) +
      rect(34, 52, 28, 24, 8, F('ivory')) +
      eyes(42, 54, 61, 3) +
      path('M42 70Q48 66 54 70', STROKE(ink, 3)),
  },
  'enemy.magpie_thief': {
    kind: 'enemy',
    face: () =>
      // white head, black cap, bandit mask with eyes, gold beak
      circle(46, 50, 20, F('ivory')) +
      path('M26 48C26 36 35 29 46 29C57 29 66 36 66 48C58 42 34 42 26 48Z', { fill: ink }) +
      rect(27, 44, 38, 11, 5.5, { fill: ink }) +
      eyes(38, 54, 49.5, 3, c('ivory')) +
      path(roundPoly([[63, 51], [80, 57], [63, 63]], 1.2), F('gold')),
  },
  'enemy.web_spinner': {
    kind: 'enemy',
    face: () =>
      // eight bent legs, body, head, four eyes
      path('M40 46L28 36L20 42M38 52L24 50L18 58M40 58L28 64L24 72M43 62L37 72L36 79', STROKE(c('purple'), 3.4)) +
      path('M56 46L68 36L76 42M58 52L72 50L78 58M56 58L68 64L72 72M53 62L59 72L60 79', STROKE(c('purple'), 3.4)) +
      circle(48, 56, 13, F('purple')) +
      circle(48, 38, 9, F('purple')) +
      eyes(44, 52, 36, 2.8, c('ivory')) + eyes(45.5, 50.5, 42, 1.8, c('ivory')),
  },
};

const act2: Record<string, TokenDef> = {
  'enemy.drowned_sailor': {
    kind: 'enemy',
    face: () =>
      // green face, white sailor cap with blue band, one X eye, one round eye, stitched mouth
      rect(30, 32, 36, 42, 13, F('teal')) +
      path('M30 37C30 27 38 22 48 22C58 22 66 27 66 37Z', F('ivory')) +
      rect(28, 33, 40, 6, 3, F('blue')) +
      path('M36 45L44 53M44 45L36 53', STROKE(ink, 3)) +
      circle(56, 49, 3.8, { fill: ink }) +
      path('M38 63L58 63M42 60L42 66M48 60L48 66M54 60L54 66', STROKE(ink, 2.6)),
  },
  'enemy.crab_knight': {
    kind: 'enemy',
    face: () =>
      // one giant claw, a small claw, wide body, tiny helmet, eyes
      path('M60 44C58 32 66 24 76 26L68 35L79 40C77 50 67 54 60 44Z', F('ember')) +
      circle(24, 54, 5.5, F('ember')) +
      ellipse(46, 60, 20, 13, F('ember')) +
      path('M37 50C37 42 41 37 46 37C51 37 55 42 55 50Z', F('stone')) +
      lookEyes(40, 52, 60, 4.4),
  },
  'enemy.ink_squid': {
    kind: 'enemy',
    face: () =>
      // pointed mantle, four tentacles, big eyes
      path('M38 52Q33 64 37 74M45 52Q45 66 42 77M51 52Q52 66 56 76M58 52Q64 62 62 71', STROKE(c('purple'), 5)) +
      path('M48 16C60 26 64 38 62 54L34 54C32 38 36 26 48 16Z', F('purple')) +
      lookEyes(42, 54, 44, 6),
  },
  'enemy.barnacle_golem': {
    kind: 'enemy',
    face: () =>
      // angular boulder, barnacles, glowing slit eyes, mouth
      path(roundPoly([[27, 34], [44, 23], [65, 28], [73, 46], [67, 68], [45, 75], [25, 62]], 6), F('stone')) +
      circle(34, 39, 4.2, F('ivory')) + circle(62, 36, 3, F('ivory')) + circle(64, 60, 4.2, F('ivory')) + circle(38, 66, 3.2, F('ivory')) +
      rect(37, 47, 9, 4.5, 2.2, F('teal')) + rect(51, 47, 9, 4.5, 2.2, F('teal')) +
      path('M42 60L54 60', STROKE(ink, 3)),
  },
  'enemy.eel_lancer': {
    kind: 'enemy',
    face: () =>
      // trident, spiky fin crest, upright eel head, eye, mouth
      path('M66 78L66 26M59 34L59 25M73 34L73 25M59 34L73 34', STROKE(c('stone'), 3.4)) +
      path(roundPoly([[37, 38], [25, 36], [33, 46], [23, 48], [34, 56], [26, 62], [37, 64]], 1), F('blue')) +
      path('M35 78C35 62 33 52 35 40C37 28 44 22 50 24C56 26 58 34 56 44C54 54 52 64 55 78Z', F('gold')) +
      circle(48, 34, 3.4, { fill: ink }) +
      path('M50 44L56 42', STROKE(ink, 2.6)),
  },
  'enemy.bell_diver': {
    kind: 'enemy',
    face: () =>
      // air hose, brass helmet, round window with eyes, bolts, collar
      path('M64 36Q76 32 76 22', STROKE(c('stone'), 4)) +
      rect(30, 62, 36, 10, 4, F('brown')) +
      circle(48, 45, 21, F('gold')) +
      circle(48, 45, 12, F('teal')) +
      eyes(44, 52, 45, 2.6) +
      circle(48, 28.5, 2, F('brown')) + circle(31.5, 45, 2, F('brown')) + circle(64.5, 45, 2, F('brown')) + circle(48, 61.5, 2, F('brown')),
  },
  'enemy.tide_witch': {
    kind: 'enemy',
    face: () =>
      // seaweed hair, pale face, eyes, smirk, shell crown
      path('M28 72C23 54 26 32 48 26C70 32 73 54 68 72L61 62L56 74L48 63L40 74L35 62Z', F('teal')) +
      ellipse(48, 47, 12, 14, F('ivory-dim')) +
      eyes(43, 53, 46, 2.6) +
      path('M43 54Q48 57 53 53', STROKE(ink, 2.4)) +
      path(roundPoly([[39, 28], [48, 14], [57, 28], [48, 31]], 1.2), F('pink')),
  },
  'enemy.coin_mimic': {
    kind: 'enemy',
    face: () =>
      // open lid, teeth, tongue, chest base, gold lock, spilled coin
      path('M25 42L29 25Q48 18 67 25L71 42Z', F('brown')) +
      rect(25, 50, 46, 24, 4, F('brown')) +
      path(roundPoly([[29, 42], [33, 49], [37, 42]], 0.6) + roundPoly([[59, 42], [63, 49], [67, 42]], 0.6) +
        roundPoly([[30, 50], [34, 43], [38, 50]], 0.6) + roundPoly([[58, 50], [62, 43], [66, 50]], 0.6), F('ivory')) +
      ellipse(48, 48, 9, 4, F('pink')) +
      rect(44.5, 56, 7, 10, 2, F('gold')) +
      circle(33, 76, 5, F('gold')),
  },
  'enemy.anchor_hulk': {
    kind: 'elite',
    face: () =>
      // wide drowned head, heavy brow, gold eyes, tusks, barnacles (the elite red rim marks it out)
      path('M23 60C23 40 33 28 48 28C63 28 73 40 73 60C73 70 63 76 48 76C33 76 23 70 23 60Z', F('teal')) +
      rect(31, 41, 34, 8, 4, { fill: ink }) +
      eyes(40, 56, 53, 3.2, c('gold')) +
      path(roundPoly([[37, 69], [40.5, 58], [44, 69]], 0.8) + roundPoly([[52, 69], [55.5, 58], [59, 69]], 0.8), F('ivory')) +
      circle(28, 58, 2.6, F('ivory')) + circle(67, 63, 2.2, F('ivory')),
  },
};

const act3: Record<string, TokenDef> = {
  'enemy.ember_whelp': {
    kind: 'enemy',
    face: () =>
      // wings, horns, round head with snout, eyes, nostrils
      path(roundPoly([[34, 46], [18, 34], [24, 58]], 1.5), F('red')) + path(roundPoly([[62, 46], [78, 34], [72, 58]], 1.5), F('red')) +
      path(roundPoly([[38, 38], [35, 26], [44, 34]], 1) + roundPoly([[58, 38], [61, 26], [52, 34]], 1), F('gold')) +
      circle(48, 49, 16, F('ember')) + ellipse(48, 61, 11, 8, F('ember')) +
      lookEyes(42, 54, 47, 4.4) +
      eyes(44.5, 51.5, 62, 1.7),
  },
  'enemy.ash_cultist': {
    kind: 'enemy',
    face: () =>
      // grey pointed hood, dark face, ember eyes, censer on a chain with a flame
      path('M50 14C60 26 68 42 68 74L32 74C32 42 40 26 50 14Z', F('stone')) +
      ellipse(50, 52, 10, 12, { fill: ink }) +
      eyes(46, 54, 50, 2.6, c('ember')) +
      path('M27 44L27 56', STROKE(c('stone'), 2.4)) +
      circle(27, 63, 6.5, F('gold')) +
      path('M27 50C27 50 31 54 31 57A4 4 0 0 1 23 57C23 54 27 50 27 50Z', F('ember')),
  },
  'enemy.slag_golem': {
    kind: 'enemy',
    face: () =>
      // dark rock, glowing cracks, glowing eyes
      path(roundPoly([[26, 40], [38, 24], [58, 24], [72, 40], [68, 68], [48, 76], [28, 68]], 6), F('ink-soft')) +
      path('M37 30L42 39L38 46M62 32L56 42L60 50M43 70L48 62L54 70', STROKE(c('ember'), 3)) +
      rect(36, 50, 9, 5, 2.5, F('gold')) + rect(51, 50, 9, 5, 2.5, F('gold')),
  },
  'enemy.cinder_bat': {
    kind: 'enemy',
    face: () =>
      // wings with flaming edges, ears, head, eyes, fangs
      path('M40 46L18 30C17 44 20 56 26 62L31 56L35 63L41 56Z', F('red')) +
      path('M56 46L78 30C79 44 76 56 70 62L65 56L61 63L55 56Z', F('red')) +
      path('M40 46L18 30M56 46L78 30', STROKE(c('gold'), 3)) +
      path(roundPoly([[39, 42], [37, 27], [46, 38]], 1) + roundPoly([[57, 42], [59, 27], [50, 38]], 1), F('red')) +
      circle(48, 51, 12.5, F('red')) +
      eyes(43.5, 52.5, 49, 2.8, c('gold')) +
      path(roundPoly([[43.5, 57], [45.5, 63], [47.5, 57]], 0.4) + roundPoly([[48.5, 57], [50.5, 63], [52.5, 57]], 0.4), F('ivory')),
  },
  'enemy.forge_smith': {
    kind: 'enemy',
    face: () =>
      // hammer, masked head with glowing slit, apron
      path('M67 76L67 40', STROKE(c('brown'), 4.4)) + rect(56, 26, 22, 13, 3, F('stone')) +
      path('M24 66C24 46 31 34 43 34C55 34 60 46 60 66Z', F('ink-soft')) +
      rect(29, 49, 26, 6, 3, F('ember')) +
      rect(28, 64, 30, 12, 4, F('brown')),
  },
  'enemy.chain_warden': {
    kind: 'enemy',
    face: () =>
      // steel helm with a T visor, ring of keys, a key
      rect(28, 26, 34, 44, 12, F('stone')) +
      rect(33, 42, 24, 5, 2.5, { fill: ink }) + rect(42.5, 42, 5, 16, 2.5, { fill: ink }) +
      circle(66, 62, 7, STROKE(c('gold'), 3.4)) +
      path('M66 69L66 79M66 75L70 75', STROKE(c('gold'), 3)),
  },
  'enemy.soot_hexer': {
    kind: 'enemy',
    face: () =>
      // smoke puffs, cracked white mask, slit eyes
      circle(30, 63, 8, F('purple')) + circle(40, 71, 8, F('purple')) + circle(56, 71, 8, F('purple')) + circle(66, 63, 8, F('purple')) +
      ellipse(48, 46, 13, 18, F('ivory')) +
      path('M40 44L45 42M51 42L56 44', STROKE(ink, 3)) +
      path('M52 28L48 36L53 41L49 49', STROKE(ink, 2.4)),
  },
  'enemy.obsidian_knight': {
    kind: 'elite',
    face: () =>
      // jagged greatsword, faceted black glass helm, glowing visor, glint
      path(roundPoly([[61, 76], [61, 34], [66, 21], [71, 34], [68, 42], [72, 50], [68, 58], [71, 76]], 0.8), F('purple')) +
      path(roundPoly([[27, 37], [39, 24], [55, 24], [63, 37], [61, 62], [47, 73], [33, 62]], 2), F('ink-soft')) +
      rect(32, 44, 26, 5, 2.5, F('purple')) +
      path(roundPoly([[38, 29], [40.5, 32], [38, 35], [35.5, 32]], 0.3), F('ivory')),
  },
};

const bosses: Record<string, TokenDef> = {
  'boss.drowned_bell': {
    kind: 'boss',
    face: () =>
      // tentacles, bronze bell with knob, crack, clapper eye
      path('M35 66Q28 76 34 80M61 66Q68 76 62 80', STROKE(c('teal'), 4.4)) +
      rect(43.5, 19, 9, 9, 3, F('gold')) +
      path('M30 62C30 40 34 26 48 26C62 26 66 40 66 62L72 67L24 67Z', F('gold')) +
      path('M53 30L47 40L53 48L48 57', STROKE(ink, 3)) +
      circle(48, 71, 6.5, F('teal')) + circle(48, 71, 3, { fill: ink }),
  },
  'boss.pip_eater': {
    kind: 'boss',
    face: () =>
      // gold horns, wide red head, gold eyes with slit pupils, a die in its jaws
      path(roundPoly([[32, 36], [25, 18], [41, 31]], 1.5) + roundPoly([[64, 36], [71, 18], [55, 31]], 1.5), F('gold')) +
      path('M23 55C23 38 34 29 48 29C62 29 73 38 73 55C73 66 64 73 48 73C32 73 23 66 23 55Z', F('red')) +
      eyes(38, 58, 45, 4.4, c('gold')) + rect(36.8, 41.5, 2.4, 7, 1.2, { fill: ink }) + rect(56.8, 41.5, 2.4, 7, 1.2, { fill: ink }) +
      rect(39, 53, 18, 18, 4, F('ivory')) +
      circle(43.5, 57.5, 2, { fill: ink }) + circle(48, 62, 2, { fill: ink }) + circle(52.5, 66.5, 2, { fill: ink }),
  },
};

export const MORE_TOKENS: Readonly<Record<string, TokenDef>> = { ...heroes, ...act1, ...act2, ...act3, ...bosses };
