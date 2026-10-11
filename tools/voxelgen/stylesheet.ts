/**
 * Review sheets for the 0.2.0 "one toy set" art: `npm run art -- --stylesheet [outDir]`.
 * Writes review images only (contact sheets, the kit laid out and stretched, and a mock fight
 * screen). Nothing in public/ changes.
 *
 * The mock is composed in device pixels the way a phone shows it: the screen is 390x844 CSS px,
 * every sprite is drawn at a stated number of CSS px per native pixel with nearest-neighbour
 * scaling, at 2 device px per CSS px (780x1688) and again at 3 (1170x2532, a real iPhone).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Canvas } from './canvas';
import { buildFonts, drawText, textWidth } from './font';
import { stretch } from './kit';
import { contactSheet } from './sheet';
import type { Sprite } from './sheet';
import { DIE_FACE as DIE } from './toydice';

const FONTS = buildFonts();
type FontName = 'ink' | 'ivory' | 'big';

/** A phone screen in device pixels. All coordinates given to it are CSS px. */
class Screen {
  readonly c: Canvas;
  constructor(readonly dpr: number, readonly w = 390, readonly h = 844) {
    this.c = new Canvas(w * dpr, h * dpr);
  }
  /** Draw a native canvas with its top-left at (x, y), `k` CSS px per native pixel. */
  img(src: Canvas, x: number, y: number, k: number): void {
    const s = k * this.dpr;
    const dw = Math.round(src.w * s);
    const dh = Math.round(src.h * s);
    const ox = Math.round(x * this.dpr);
    const oy = Math.round(y * this.dpr);
    for (let j = 0; j < dh; j++) {
      for (let i = 0; i < dw; i++) {
        const v = src.get(Math.floor(i / s), Math.floor(j / s));
        if (v) this.c.setRaw(ox + i, oy + j, v);
      }
    }
  }
  /** Draw a sprite so that its anchor lands on (x, y). */
  at(s: Sprite, x: number, y: number, k: number): void {
    this.img(s.canvas, x - s.ax * k, y - s.ay * k, k);
  }
  /** Draw centred on (x, y). */
  mid(s: Sprite, x: number, y: number, k: number): void {
    this.img(s.canvas, x - (s.canvas.w * k) / 2, y - (s.canvas.h * k) / 2, k);
  }
  /** 9-slice a kit piece to w x h CSS px, `k` CSS px per native pixel. */
  nine(s: Sprite, x: number, y: number, w: number, h: number, k = 2): void {
    this.img(stretch(s, Math.round(w / k), Math.round(h / k)), x, y, k);
  }
  rect(x: number, y: number, w: number, h: number, spec: string): void {
    this.c.rect(Math.round(x * this.dpr), Math.round(y * this.dpr), Math.round(w * this.dpr), Math.round(h * this.dpr), spec);
  }
  /** Text in a kit font, `k` CSS px per pixel. */
  text(str: string, x: number, y: number, font: FontName = 'ink', align: 'l' | 'c' | 'r' = 'l', k = 2): void {
    const info = font === 'big' ? FONTS.info.big : FONTS.info.small;
    const atlas = (FONTS.sprites.get(font === 'big' ? 'kit.font_big' : font === 'ink' ? 'kit.font' : 'kit.font_ivory') as Sprite).canvas;
    const w = textWidth(info, str);
    const line = new Canvas(w + 2, info.height);
    drawText(line, atlas, info, str, 0, 0);
    this.img(line, align === 'c' ? x - (w * k) / 2 : align === 'r' ? x - w * k : x, y, k);
  }
  /** Scale the whole screen background image to cover. */
  cover(bg: Canvas): void {
    const k = Math.max(this.w / bg.w, this.h / bg.h);
    this.img(bg, (this.w - bg.w * k) / 2, (this.h - bg.h * k) / 2, k);
  }
}

function mockFight(all: Map<string, Sprite>, dpr: number, w = 390, h = 844, bg = 'bg.act1'): Canvas {
  const need = (id: string): Sprite => {
    const s = all.get(id);
    if (!s) throw new Error(`style sheet needs ${id}`);
    return s;
  };
  const S = new Screen(dpr, w, h);
  const tight = h < 700;
  S.cover(need(bg).canvas);
  const X = [Math.round(w * 0.2), Math.round(w * 0.5), Math.round(w * 0.8)];

  // top bar
  const top = tight ? 8 : 50;
  S.text('ACT 1', 16, top + 8, 'ivory');
  S.nine(need('kit.chip'), w - 90, top, 76, 30);
  S.mid(need('ui.gold'), w - 72, top + 14, 24 / 36);
  S.text('12', w - 54, top + 8, 'ivory');

  const bar = (cx: number, y: number, frac: number, label: string): void => {
    const bw = 96;
    S.nine(need('kit.bar_frame'), cx - bw / 2, y, bw, 16);
    const fill = need('kit.bar_hp').canvas;
    const fw = Math.round(((bw - 4) * frac) / 8) * 8;
    for (let x = 0; x < fw; x += 8) S.img(fill, cx - bw / 2 + 2 + x, y + 2, 2);
    S.mid(need('ui.hp'), cx - bw / 2 - 2, y + 8, 24 / 36);
    S.text(label, cx + 6, y + 18, 'ivory', 'c');
  };

  // enemies with intent bubbles
  const enemies: [string, string, string, number, string, string][] = [
    ['enemy.gnaw_rat', '7/7', 'intent.attack', 1, '2', ''],
    ['enemy.mud_slime', '9/12', 'intent.attack_all', 0.75, '4', 'status.poison'],
    ['enemy.twig_archer', '6/6', 'intent.shield', 1, '3', ''],
  ];
  const feetE = tight ? 170 : 282;
  enemies.forEach(([id, hp, intent, frac, n, status], i) => {
    const cx = X[i] as number;
    const e = need(id);
    S.at(e, cx, feetE, 2);
    const by = Math.min(feetE - e.ay * 2 - 4, feetE - 86) - 46;
    S.nine(need('kit.bubble'), cx - 40, by, 80, 44);
    S.img(need('kit.bubble_tail').canvas, cx - 9, by + 42, 2);
    S.mid(need(intent), cx - 18, by + 21, 1);
    S.text(n, cx + 4, by + 8, 'big');
    bar(cx, feetE + 18, frac, hp);
    if (status) {
      S.nine(need('kit.chip'), cx + 30, feetE - 20, 52, 28);
      S.mid(need(status), cx + 44, feetE - 6, 24 / 36);
      S.text('2', cx + 58, feetE - 13, 'ivory');
    }
  });

  // the tray
  const trayH = 250;
  const trayY = h - trayH - (tight ? 4 : 14);

  // heroes
  const heroes: [string, string, number][] = [['hero.bulwark', '20/20', 1], ['hero.duelist', '14/19', 0.75], ['hero.herbalist', '14/14', 1]];
  const feetH = tight ? trayY - 40 : 496;
  heroes.forEach(([id, hp, frac], i) => {
    const cx = X[i] as number;
    S.at(need(id), cx, feetH, 2);
    bar(cx, feetH + 20 - (tight ? 12 : 0), frac, hp);
  });
  S.nine(need('kit.chip'), (X[0] as number) + 30, feetH - 22, 52, 28);
  S.mid(need('ui.shield'), (X[0] as number) + 44, feetH - 8, 24 / 36);
  S.text('3', (X[0] as number) + 58, feetH - 15, 'ivory');

  S.nine(need('kit.tray'), 6, trayY, w - 12, trayH);
  S.text('TAP A DIE TO USE IT', w / 2, trayY + 18, 'ivory', 'c');
  const dice: [string, string, string, string][] = [
    ['die.bulwark', 'die.face_shield', '3', 'locked'],
    ['die.duelist', 'die.face_damage', '4', ''],
    ['die.herbalist', 'die.face_heal', '2', ''],
  ];
  const DX = [Math.round(w * 0.2) + 4, Math.round(w * 0.5), Math.round(w * 0.8) - 4];
  const footY = trayY + 110;
  dice.forEach(([id, faceId, num, state], i) => {
    const cx = DX[i] as number;
    S.mid(need('kit.slot'), cx, footY, 2);
    S.at(need(id), cx, footY, 2);
    S.at(need(faceId), cx, footY, 2);
    if (state === 'locked') S.at(need('die.locked'), cx, footY, 2);
    S.text(num, cx + (DIE.right.x - DIE.foot.x) * 2 - 9, footY + (DIE.right.y - DIE.foot.y) * 2 - 14, 'big');
    S.mid(need(state === 'locked' ? 'kit.lock_closed' : 'kit.lock_open'), cx, footY + 46, 1);
  });

  // buttons
  const by = trayY + 182;
  const bw = (w - 12 - 28 - 16) / 3;
  S.nine(need('kit.button'), 20, by, bw + 14, 54);
  S.mid(need('ui.reroll'), 42, by + 22, 0.75);
  S.text('REROLL', 62, by + 10, 'ink');
  S.text('2 LEFT', 62, by + 26, 'ink');
  S.nine(need('kit.button_disabled'), 20 + bw + 22, by, bw - 22, 54);
  S.text('UNDO', 20 + bw + 22 + (bw - 22) / 2, by + 22, 'ink', 'c');
  const ex = 20 + 2 * bw + 8;
  S.nine(need('kit.button_primary'), ex, by, bw + 8, 54);
  S.text('END TURN', ex + (bw + 8) / 2, by + 10, 'ink', 'c');
  S.mid(need('intent.attack'), ex + (bw + 8) / 2 - 16, by + 34, 24 / 36);
  S.text('6', ex + (bw + 8) / 2 + 4, by + 27, 'ink');
  return S.c;
}

/** The interface kit on one page: every piece, the stretchable ones stretched, and the fonts. */
function kitSheet(all: Map<string, Sprite>): Canvas {
  const P = new Screen(1, 1000, 760);
  P.c.px.fill(Canvas.raw('g'));
  const k = (id: string): Sprite => all.get(id) as Sprite;
  const btn = (id: string, x: number, y: number, label: string, font: FontName = 'ink'): void => {
    P.nine(k(id), x, y, 150, 54);
    const sl = k(id).slice as [number, number, number, number];
    P.text(label, x + 75, y + sl[0] * 2 + (54 - (sl[0] + sl[2]) * 2 - 14) / 2, font, 'c');
  };
  btn('kit.button', 16, 16, 'BUTTON'); btn('kit.button_pressed', 176, 16, 'PRESSED'); btn('kit.button_disabled', 336, 16, 'DISABLED');
  btn('kit.button_primary', 16, 80, 'PRIMARY'); btn('kit.button_primary_pressed', 176, 80, 'PRESSED');
  btn('kit.button_danger', 336, 80, 'DANGER', 'ivory'); btn('kit.button_danger_pressed', 496, 80, 'PRESSED', 'ivory');
  P.nine(k('kit.button'), 496, 22, 48, 48); P.nine(k('kit.button_primary'), 552, 22, 48, 48);
  P.nine(k('kit.panel'), 16, 150, 220, 120); P.text('PANEL', 126, 166, 'ink', 'c');
  P.nine(k('kit.panel_dark'), 250, 150, 220, 120); P.text('PANEL DARK', 360, 166, 'ivory', 'c');
  P.nine(k('kit.panel_selected'), 484, 150, 220, 120); P.text('SELECTED', 594, 168, 'ink', 'c');
  P.nine(k('kit.sheet'), 720, 150, 260, 140); P.mid(k('kit.sheet_grip'), 850, 164, 2); P.text('SHEET', 850, 180, 'ink', 'c');
  P.nine(k('kit.tray'), 16, 286, 400, 150);
  P.mid(k('kit.slot'), 110, 372, 2); P.mid(k('kit.slot'), 290, 372, 2); P.at(k('die.bulwark'), 290, 372, 2); P.at(k('die.face_shield'), 290, 372, 2);
  P.nine(k('kit.bubble'), 432, 290, 90, 44); P.img(k('kit.bubble_tail').canvas, 468, 332, 2);
  P.nine(k('kit.bubble'), 540, 290, 160, 64); P.img(k('kit.bubble_tail').canvas, 611, 352, 2);
  P.nine(k('kit.chip'), 432, 366, 56, 24); P.nine(k('kit.chip'), 500, 366, 120, 28); P.mid(k('kit.badge'), 650, 380, 2);
  P.nine(k('kit.bar_frame'), 432, 406, 200, 16);
  for (let i = 0; i < 12; i++) P.img(k('kit.bar_hp').canvas, 434 + i * 8, 408, 2);
  for (let i = 12; i < 16; i++) P.img(k('kit.bar_hurt').canvas, 434 + i * 8, 408, 2);
  P.nine(k('kit.bar_frame'), 432, 428, 200, 16);
  for (let i = 0; i < 9; i++) P.img(k('kit.bar_shield').canvas, 434 + i * 8, 430, 2);
  P.nine(k('kit.tab'), 16, 456, 110, 32); P.nine(k('kit.tab_active'), 130, 456, 110, 32); P.nine(k('kit.tab'), 244, 456, 110, 32);
  P.nine(k('kit.panel'), 16, 486, 338, 60);
  P.text('HEROES', 71, 470, 'ink', 'c'); P.text('ITEMS', 185, 466, 'ink', 'c'); P.text('FOES', 299, 470, 'ink', 'c');
  P.mid(k('kit.toggle_off'), 400, 480, 2); P.mid(k('kit.toggle_on'), 470, 480, 2);
  P.nine(k('kit.banner'), 520, 456, 240, 36); P.text('TRIPLE!', 640, 462, 'ivory', 'c');
  P.nine(k('kit.banner'), 780, 456, 120, 36);
  for (let i = 0; i < 40; i++) P.img(k('kit.divider').canvas, 380 + i * 8, 530, 2);
  P.mid(k('kit.lock_open'), 720, 330, 2); P.mid(k('kit.lock_closed'), 820, 330, 2); P.mid(k('kit.lock_chain'), 920, 330, 2);
  P.mid(k('kit.lock_open'), 740, 410, 1); P.mid(k('kit.lock_closed'), 800, 410, 1); P.mid(k('kit.lock_chain'), 860, 410, 1);
  // fonts
  P.rect(0, 560, 1000, 80, 'c');
  P.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16, 572, 'ink');
  P.text(Object.keys(FONTS.info.small.glyphs).filter((ch) => !/[A-Z]/.test(ch)).join(''), 16, 594, 'ink');
  P.text('NEW RUN  REWARD  LEAVE  VICTORY  WEAKEN  MOMENTUM  UPGRADE  UNDO  HOME SCREEN', 16, 616, 'ink');
  P.rect(0, 640, 1000, 120, 's');
  P.text('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 20/20', 16, 650, 'ivory');
  P.text('0123456789+-/', 16, 676, 'big');
  P.text('14/19  +3  -12', 16, 716, 'big', 'l', 1);
  P.text('NEW RUN REWARD LEAVE VICTORY WEAKEN MOMENTUM UPGRADE UNDO HOME SCREEN', 300, 712, 'ivory', 'l', 1);
  P.text('HWMN UV OD0 B8 S5 I1L CG PR KX YV', 300, 728, 'ivory', 'l', 1);
  P.text('HWMN UV OD0 B8 S5 I1L CG PR KX YV', 300, 680, 'ivory');
  return P.c;
}

export function writeStyleSheet(all: Map<string, Sprite>, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  const pick = (re: RegExp): Sprite[] => [...all.entries()].filter(([id]) => re.test(id)).map(([, s]) => s);
  const small = pick(/^(sym|fx|kw|status|intent|set|ui)\.(?!logo)/);
  writeFileSync(`${outDir}/icons-x4.png`, contactSheet(small, { scale: 4, cols: 12, bg: 'g', cell: [48, 48] }).encode());
  writeFileSync(`${outDir}/icons-x2.png`, contactSheet(small, { scale: 2, cols: 12, bg: 'c', cell: [48, 48] }).encode());
  writeFileSync(`${outDir}/icons-x1.png`, contactSheet(small, { scale: 1, cols: 12, bg: 'c', cell: [48, 48] }).encode());
  writeFileSync(`${outDir}/dice-x4.png`, contactSheet(pick(/^die\.(?!blank)/), { scale: 4, cols: 7, bg: 'a' }).encode());
  writeFileSync(`${outDir}/items-x3.png`, contactSheet(pick(/^(item|door)\./), { scale: 3, cols: 10, bg: 'g' }).encode());
  writeFileSync(`${outDir}/items-x1.png`, contactSheet(pick(/^(item|door)\./), { scale: 1, cols: 10, bg: 'c' }).encode());
  writeFileSync(`${outDir}/kit.png`, kitSheet(all).encode());
  writeFileSync(`${outDir}/backgrounds.png`, contactSheet(pick(/^bg\./), { scale: 2, cols: 4, bg: 'k' }).encode());
  writeFileSync(`${outDir}/mock-fight.png`, mockFight(all, 2).encode());
  writeFileSync(`${outDir}/mock-fight@3x.png`, mockFight(all, 3).encode());
  writeFileSync(`${outDir}/mock-fight-tab-375x548.png`, mockFight(all, 2, 375, 548).encode());
}
