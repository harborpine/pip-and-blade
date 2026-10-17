/**
 * Style-sheet mock of the fight screen at the owner's phone size (390x844 CSS px).
 * Not shipped: it only shows how the icons, tokens, backdrop and the ui-drawn surfaces
 * (dice, padlocks, bubbles, bars, buttons; docs/flat-style.md sections 3 and 6) sit together.
 */
import { backgroundBody, BG_H, BG_W } from './backgrounds';
import { placeIcon } from './icons';
import { HERO_COLOR, c } from './palette';
import { circle, el, path, rect, svgDoc } from './svg';
import { placeToken } from './tokens';

export const FONT = "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif";

const text = (x: number, y: number, s: string, size: number, color: string, weight = 700, anchor = 'middle'): string =>
  el('text', { x, y, 'font-size': size, 'font-weight': weight, fill: color, 'text-anchor': anchor, 'font-family': FONT }, s);

function hpBar(cx: number, y: number, w: number, hp: number, max: number): string {
  const x = cx - w / 2 + 10;
  const bw = w - 10;
  const frac = hp / max;
  return (
    placeIcon('ui.hp', cx - w / 2 - 8, y - 5, 18, c('red')) +
    rect(x + 2, y - 1, bw, 10, 5, { fill: c('slate-2') }) +
    rect(x + 2, y - 1, Math.max(10, bw * frac), 10, 5, { fill: frac < 0.34 ? c('red') : c('green') }) +
    text(cx + 6, y + 26, `${hp}/${max}`, 14, c('ivory'), 700)
  );
}

function bubble(cx: number, y: number, value: number, target: string): string {
  const w = 112;
  const h = 48;
  const x = cx - w / 2;
  return (
    rect(x, y, w, h, 12, { fill: c('paper') }) +
    path(`M${cx - 8} ${y + h - 1}L${cx} ${y + h + 8}L${cx + 8} ${y + h - 1}Z`, { fill: c('paper') }) +
    placeIcon('intent.attack', x + 10, y + 5, 20, c('red')) +
    text(x + 34, y + 21, `Attack ${value}`, 15, c('ink'), 800, 'start') +
    text(x + 34, y + 40, `→ ${target}`, 14, c('ink-soft'), 700, 'start')
  );
}

type DieState = 'kept' | 'normal' | 'used';
interface DieSpec { hero: keyof typeof HERO_COLOR; icon: string; value: number; sym: string; symColor: string; kws: string[]; state: DieState }

function die(x: number, y: number, d: DieSpec): string {
  const S = 76;
  const used = d.state === 'used';
  const dy = used ? 2 : 0;
  const rim = used ? c('slate-3') : HERO_COLOR[d.hero];
  const face = used ? c('ivory-dim') : c('ivory');
  const iconColor = used ? c('ink-soft') : HERO_COLOR[d.hero];
  const fade = used ? ' opacity="0.6"' : '';
  let out = '';
  if (d.state === 'kept') out += rect(x - 4.5, y - 4.5, S + 9, S + 9, 20.5, { fill: 'none', stroke: c('gold'), 'stroke-width': 3 });
  out += rect(x, y + dy, S, S, 16, { fill: rim }) + rect(x + 4, y + 4 + dy, S - 8, S - 8, 12, { fill: face });
  out += `<g${fade}>`;
  out += placeIcon(d.icon, x + 4, y + 19 + dy, 35, iconColor);
  out += text(x + 55, y + 49 + dy, String(d.value), 34, used ? c('ink-soft') : c('ink'), 800);
  out += '</g>';
  out += placeIcon(d.sym, x + S - 20, y + 7 + dy, 13, used ? c('slate-3') : d.symColor);
  d.kws.forEach((k, i) => {
    const total = d.kws.length * 15 - 2;
    out += placeIcon(k, x + S / 2 - total / 2 + i * 15, y + S - 19 + dy, 13, c('ink-soft'));
  });
  return out;
}

function padlock(cx: number, y: number, closed: boolean): string {
  return (
    rect(cx - 22, y, 44, 44, 12, { fill: closed ? c('gold') : c('slate-2') }) +
    placeIcon(closed ? 'ui.lock' : 'ui.unlock', cx - 12, y + 10, 24, closed ? c('gold-ink') : c('ivory'))
  );
}

function button(x: number, y: number, w: number, label: string, kind: 'normal' | 'primary', iconId?: string, badge?: string): string {
  const h = 54;
  const fill = kind === 'primary' ? c('gold') : c('ivory');
  const edge = kind === 'primary' ? c('gold-ink') : c('ivory-dim');
  const ink = kind === 'primary' ? c('gold-ink') : c('ink');
  let out = rect(x, y + 2, w, h, 12, { fill: edge, 'fill-opacity': kind === 'primary' ? 0.35 : 1 }) + rect(x, y, w, h, 12, { fill });
  if (iconId) {
    out += placeIcon(iconId, x + 12, y + 15, 24, ink);
    out += text(x + 42, y + 33, label, 17, ink, 800, 'start');
  } else {
    out += text(x + w / 2, y + 33, label, 17, ink, 800);
  }
  if (badge) out += circle(x + w - 4, y + 4, 12, { fill: c('slate') }) + text(x + w - 4, y + 9, badge, 14, c('ivory'), 800);
  return out;
}

export function mockFightSvg(): string {
  let b = backgroundBody('bg.act1');

  // Top bar: act chip with progress pips, gold chip, settings button.
  b += rect(14, 56, 150, 36, 18, { fill: c('slate-2') });
  b += text(30, 80, 'Act 1', 16, c('ivory'), 800, 'start');
  [0, 1, 2, 3].forEach((i) => {
    const cx = 92 + i * 18;
    b += i === 0 ? circle(cx, 74, 6, { fill: c('gold') }) : i === 1 ? circle(cx, 74, 5, { fill: 'none', stroke: c('ivory'), 'stroke-width': 2.5 }) : circle(cx, 74, 4, { fill: c('slate-3') });
  });
  b += rect(244, 56, 82, 36, 18, { fill: c('slate-2') });
  b += circle(264, 74, 9, { fill: c('gold') }) + text(282, 80, '12', 16, c('ivory'), 800, 'start');
  b += rect(336, 54, 40, 40, 12, { fill: c('slate-2') }) + circle(356, 74, 3, { fill: c('ivory') }) + circle(346, 74, 3, { fill: c('ivory') }) + circle(366, 74, 3, { fill: c('ivory') });

  // Enemy row.
  const cols = [70, 195, 320];
  const enemies: [string, number, number, number, string][] = [
    ['enemy.gnaw_rat', 2, 2, 8, 'Tamsin'],
    ['enemy.hollow_stag', 6, 30, 30, 'Rook'],
    ['enemy.mud_slime', 4, 12, 12, 'Tamsin'],
  ];
  enemies.forEach(([id, atk, hp, max, target], i) => {
    const cx = cols[i]!;
    b += bubble(cx, 118, atk, target);
    b += placeToken(id, cx - 38, 180, 76);
    b += hpBar(cx, 266, 84, hp, max);
  });

  // Hero row.
  const heroes: [string, string, number, number, number][] = [
    ['hero.bulwark', 'Tamsin', 20, 20, 3],
    ['hero.duelist', 'Rook', 19, 19, 0],
    ['hero.herbalist', 'Odalie', 9, 14, 0],
  ];
  heroes.forEach(([id, name, hp, max, shield], i) => {
    const cx = cols[i]!;
    b += placeToken(id, cx - 42, 324, 84);
    if (shield) {
      b += placeIcon('sym.guard', cx + 18, 320, 30, c('blue'));
      b += text(cx + 33, 341, String(shield), 14, c('ivory'), 800);
    }
    b += text(cx, 432, name, 16, c('ivory'), 800);
    b += hpBar(cx, 446, 84, hp, max);
  });

  // Dice tray.
  const ty = 520;
  b += rect(10, ty, 370, 290, 18, { fill: c('slate') });
  b += rect(26, ty + 16, 40, 26, 13, { fill: c('slate-2') }) + text(46, ty + 34, 'T1', 14, c('ivory'), 800);
  b += text(78, ty + 34, 'Tap a die to use it, or lock and reroll', 14, c('ivory-dim'), 600, 'start');

  const dice: DieSpec[] = [
    { hero: 'bulwark', icon: 'fx.shield', value: 3, sym: 'sym.guard', symColor: c('blue'), kws: [], state: 'kept' },
    { hero: 'duelist', icon: 'fx.damage', value: 4, sym: 'sym.blade', symColor: c('red'), kws: ['kw.cleave'], state: 'normal' },
    { hero: 'herbalist', icon: 'fx.heal', value: 2, sym: 'sym.heart', symColor: c('green'), kws: [], state: 'used' },
  ];
  dice.forEach((d, i) => {
    const cx = 85 + i * 110;
    b += die(cx - 38, ty + 64, d);
    if (d.state !== 'used') b += padlock(cx, ty + 64 + 76 + 6, d.state === 'kept');
  });

  const by = ty + 214;
  b += button(22, by, 124, 'Reroll', 'normal', 'ui.reroll', '2');
  b += button(156, by, 86, 'Undo', 'normal');
  b += button(252, by, 116, 'End Turn', 'primary');

  return svgDoc(BG_W, BG_H, b);
}
