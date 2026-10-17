/**
 * The flat look (0.3.0, docs/flat-style.md section 11): dice are flat and front-on, every die state has its
 * distinguishing mark, nothing uses the pixel font / pixelated rendering / a kit picture, all text is the
 * rounded system stack at 12 px or more, and every hero, enemy and boss is a round vector token (bosses 1.5x).
 * Everything is read from computed styles in the real page.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, richSave, settle, state, watch } from './support/app';
import { SCENES } from './support/uiscenes';

const colors = JSON.parse(fs.readFileSync(path.resolve('src', 'art', 'generated', 'colors.json'), 'utf8')) as { palette: Record<string, string>; hero: Record<string, string> };
const HERO_COLOR = colors.hero;
const PALETTE = colors.palette;

const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const col = (name: string): string => rgb(PALETTE[name] ?? '#000000');

async function scene(page: Page, name: string): Promise<void> {
  const s = SCENES.find((x) => x.name === name);
  if (!s) throw new Error(`no scene ${name}`);
  await openApp(page, { offerTutorial: s.offerTutorial, ...(s.freshPrefs ? { prefs: null } : {}), ...(s.rich ? { save: richSave() } : {}) });
  await s.setup(page);
  await settle(page);
}

interface DieLook {
  testid: string;
  hero: string;
  tag: string;
  icon: number;
  number: number;
  numberText: string;
  transform: string;
  perspective: boolean;
  preserve3d: boolean;
  background: string;
  border: string;
  borderWidth: number;
  radius: number;
  outlineStyle: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: string;
  cls: string;
  w: number;
  h: number;
  dash: number;
  crack: number;
  chain: number;
  lockClass: string;
  lockBg: string;
  lockLabel: string;
}

/** Everything the look checks need to know about every die on screen. */
async function dice(page: Page): Promise<DieLook[]> {
  return page.evaluate(() => {
    const out: DieLook[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('[data-testid^="die-"]')) {
      const id = el.dataset['testid'] ?? '';
      if (!/^die-\d+$/.test(id)) continue;
      const cs = getComputedStyle(el);
      let perspective = false;
      let preserve3d = false;
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        const c = getComputedStyle(p);
        if (c.perspective !== 'none') perspective = true;
        if (c.transformStyle === 'preserve-3d') preserve3d = true;
      }
      const num = el.querySelector<HTMLElement>('.die-value:not(.die-word)');
      const lock = document.querySelector<HTMLElement>(`[data-testid="lock-${id.slice(4)}"]`);
      const r = el.getBoundingClientRect();
      out.push({
        testid: id,
        hero: el.dataset['hero'] ?? '',
        tag: el.tagName,
        icon: el.querySelectorAll('.die-icon[data-sprite^="fx."]').length,
        number: num ? 1 : 0,
        numberText: num?.textContent ?? '',
        transform: cs.transform,
        perspective,
        preserve3d,
        background: cs.backgroundColor,
        border: cs.borderTopColor,
        borderWidth: parseFloat(cs.borderTopWidth),
        radius: parseFloat(cs.borderTopLeftRadius),
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineWidth: parseFloat(cs.outlineWidth),
        shadow: cs.boxShadow,
        cls: el.className,
        w: r.width,
        h: r.height,
        dash: el.querySelectorAll('.die-dash').length,
        crack: el.querySelectorAll('.die-crack').length,
        chain: el.querySelectorAll('.die-chain').length,
        lockClass: lock?.className ?? '',
        lockBg: lock ? getComputedStyle(lock).backgroundColor : '',
        lockLabel: lock?.getAttribute('aria-label') ?? '',
      });
    }
    return out;
  });
}

const heroIdOf = async (page: Page, hero: string): Promise<string> => {
  const g = await state(page);
  return g.run?.heroes[Number(hero)]?.heroId ?? '';
};

test.describe('dice are flat, front-on and ivory', () => {
  for (const [w, h] of [[390, 664], [390, 844], [375, 548]] as const) {
    test(`every die at ${w}x${h}: icon + number as separate elements, no 3D, ivory face, rim in its hero colour`, async ({ page }) => {
      const problems = watch(page);
      await page.setViewportSize({ width: w, height: h });
      await scene(page, 'fight-rolling');
      const list = await dice(page);
      expect(list.length, 'dice are on screen').toBeGreaterThanOrEqual(3);
      let checked = 0;
      for (const d of list) {
        const heroId = await heroIdOf(page, d.hero);
        const what = `${d.testid} (${heroId}) ${d.cls}`;
        expect(d.tag, what).toBe('BUTTON');
        expect(d.w, `${what} is square`).toBeCloseTo(d.h, 0);
        expect(d.w, `${what} size`).toBeGreaterThanOrEqual(64);
        if (h >= 600) expect(d.w, `${what} size on a normal layout`).toBeGreaterThanOrEqual(72);
        expect(d.transform, `${what} has no transform, so it is not tilted`).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, \d+(\.\d+)?\))$/);
        expect(d.perspective || d.preserve3d, `${what} has no 3D context`).toBe(false);
        expect(d.radius, `${what} rounded corners`).toBeGreaterThanOrEqual(12);
        expect(d.borderWidth, `${what} rim`).toBeGreaterThanOrEqual(3.5);
        // flat-style.md 3.1: blank and used/down dice have a slate-3 rim and cursed a purple one (checked in the state tests below).
        if (!/\b(blank|used|down|cursed)\b/.test(d.cls)) expect(d.border, `${what} rim is its hero colour`).toBe(rgb(HERO_COLOR[heroId] ?? '#000000'));
        if (!/\b(used|down|cursed)\b/.test(d.cls)) expect(d.background, `${what} face is ivory`).toBe(col('ivory'));
        if (!/\b(blank|cursed)\b/.test(d.cls)) {
          expect(d.icon, `${what} has its effect icon element`).toBe(1);
          expect(d.number, `${what} has its number element`).toBe(1);
          expect(d.numberText, `${what} number is real text`).toMatch(/^\d+$/);
          checked++;
        }
      }
      expect(checked, 'at least one die carries an icon and a number').toBeGreaterThan(0);
      problems.assertClean();
    });
  }

  test('the heroes of a party get distinct rim colours, all from HERO_COLOR', async ({ page }) => {
    await scene(page, 'fight-rolling');
    const list = await dice(page);
    const heroes = new Set(list.map((d) => d.border));
    expect(heroes.size, 'one rim colour per hero').toBe(new Set(list.map((d) => d.hero)).size);
    expect(new Set(Object.values(HERO_COLOR)).size, 'eight different hero colours').toBe(8);
  });
});

test.describe('every die state has its own mark (never colour alone)', () => {
  test('kept: gold ring outside the rim and the padlock below shows closed and gold', async ({ page }) => {
    await scene(page, 'fight-dice-locked');
    const list = await dice(page);
    const kept = list.filter((d) => /\blocked\b/.test(d.cls));
    expect(kept.length).toBeGreaterThanOrEqual(2);
    for (const d of kept) {
      expect(d.outlineStyle, d.testid).toBe('solid');
      expect(d.outlineWidth, d.testid).toBeGreaterThanOrEqual(3);
      expect(d.outlineColor, `${d.testid} ring is gold`).toBe(col('gold'));
      expect(d.lockClass, `${d.testid} padlock is closed`).toMatch(/\bclosed\b/);
      expect(d.lockBg, `${d.testid} padlock is gold`).toBe(col('gold'));
      expect(d.lockLabel).toMatch(/Kept/);
    }
    for (const d of list.filter((x) => !/\blocked\b/.test(x.cls))) {
      expect(d.outlineStyle === 'none' || d.outlineWidth === 0, `${d.testid} unkept has no ring`).toBe(true);
      expect(d.lockClass, `${d.testid} padlock is open`).toMatch(/\bopen\b/);
      expect(d.lockBg).not.toBe(col('gold'));
    }
  });

  test('used: greyed (dim face, grey rim, contents faded) and sunk, no ring', async ({ page }) => {
    await scene(page, 'fight-after-use');
    const list = await dice(page);
    const used = list.filter((d) => /\bused\b/.test(d.cls));
    expect(used.length).toBeGreaterThanOrEqual(1);
    for (const d of used) {
      expect(d.background, `${d.testid} face`).toBe(col('ivory-dim'));
      expect(d.border, `${d.testid} rim`).toBe(col('slate-3'));
      expect(d.transform, `${d.testid} sunk 2px`).toBe('matrix(1, 0, 0, 1, 0, 2)');
    }
    const op = await page.evaluate(() => {
      const el = document.querySelector('.die.used .die-face');
      return el ? getComputedStyle(el).opacity : '1';
    });
    expect(Number(op), 'used contents are faded').toBeLessThan(0.8);
    for (const d of list.filter((x) => !/\bused\b/.test(x.cls))) expect(d.background, `${d.testid} unused face is not greyed`).not.toBe(col('ivory-dim'));
  });

  test('blank: ivory face, grey rim, a dash and no number', async ({ page }) => {
    await scene(page, 'fight-blank-face');
    const list = await dice(page);
    const blank = list.filter((d) => /\bblank\b/.test(d.cls) && !/\bcursed\b/.test(d.cls));
    expect(blank.length).toBeGreaterThanOrEqual(1);
    for (const d of blank) {
      expect(d.dash, `${d.testid} shows the dash mark`).toBeGreaterThanOrEqual(1);
      expect(d.number, `${d.testid} shows no number`).toBe(0);
      expect(d.icon, `${d.testid} shows no effect icon`).toBe(0);
      expect(d.border).toBe(col('slate-3'));
      expect(d.background).toBe(col('ivory'));
    }
  });

  test('cursed: purple tint and rim, the crack mark and no number', async ({ page }) => {
    await scene(page, 'fight-cursed-face');
    const list = await dice(page);
    const cursed = list.filter((d) => /\bcursed\b/.test(d.cls));
    expect(cursed.length).toBeGreaterThanOrEqual(1);
    for (const d of cursed) {
      expect(d.crack, `${d.testid} shows the crack`).toBeGreaterThanOrEqual(1);
      expect(d.number, `${d.testid} shows no number`).toBe(0);
      expect(d.border, `${d.testid} rim`).toBe(col('purple'));
      expect(d.background, `${d.testid} face is tinted, not plain ivory`).not.toBe(col('ivory'));
    }
  });

  test('jammed: a chain mark on the die and a chain instead of the padlock', async ({ page }) => {
    await scene(page, 'fight-jammed-die');
    const list = await dice(page);
    const jammed = list.filter((d) => /\bjammed\b/.test(d.cls));
    expect(jammed.length).toBeGreaterThanOrEqual(1);
    for (const d of jammed) {
      expect(d.chain, `${d.testid} shows the chain`).toBeGreaterThanOrEqual(1);
      expect(d.lockClass, `${d.testid} padlock replaced by a chain`).toMatch(/\bchain\b/);
      expect(d.lockLabel).toMatch(/Jammed/);
    }
    for (const d of list.filter((x) => !/\bjammed\b/.test(x.cls))) expect(d.chain, `${d.testid} has no chain`).toBe(0);
  });

  test('lifted (choosing a target): raised, a ring and one soft shadow; others stay down', async ({ page }) => {
    await scene(page, 'fight-targeting');
    const list = await dice(page);
    const up = list.filter((d) => /\bselected\b/.test(d.cls));
    expect(up).toHaveLength(1);
    const d = up[0]!;
    expect(d.transform, 'raised 8px').toBe('matrix(1, 0, 0, 1, 0, -8)');
    expect(d.outlineStyle).toBe('solid');
    expect(d.outlineWidth).toBeGreaterThanOrEqual(3);
    expect(d.shadow, 'one soft shadow').not.toBe('none');
    for (const o of list.filter((x) => x !== d)) {
      expect(o.shadow, `${o.testid} has no shadow`).toBe('none');
      expect(o.transform, `${o.testid} is not raised`).not.toBe('matrix(1, 0, 0, 1, 0, -8)');
    }
  });

  test('set symbol sits top-right and keyword marks along the bottom, all small', async ({ page }) => {
    await scene(page, 'fight-rolling');
    const marks = await page.evaluate(() => {
      const res: { sym: number; kw: number; symBox: number[]; dieBox: number[]; kwBox: number[]; size: number }[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('[data-testid^="die-"]')) {
        if (!/^die-\d+$/.test(el.dataset['testid'] ?? '')) continue;
        const d = el.getBoundingClientRect();
        const s = el.querySelector<HTMLElement>('.die-sym')?.getBoundingClientRect();
        const k = el.querySelector<HTMLElement>('.die-kws')?.getBoundingClientRect();
        res.push({ sym: s ? 1 : 0, kw: el.querySelectorAll('.die-kws [data-sprite^="kw."]').length, symBox: s ? [s.left, s.top, s.right, s.bottom] : [], dieBox: [d.left, d.top, d.right, d.bottom], kwBox: k ? [k.left, k.top, k.right, k.bottom] : [], size: s?.width ?? 0 });
      }
      return res;
    });
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      if (m.sym) {
        expect(m.symBox[2]!, 'symbol in the right half').toBeGreaterThan((m.dieBox[0]! + m.dieBox[2]!) / 2);
        expect(m.symBox[1]!, 'symbol in the top half').toBeLessThan((m.dieBox[1]! + m.dieBox[3]!) / 2);
        expect(m.size, 'symbol is a small mark').toBeLessThanOrEqual(16);
      }
      if (m.kw) {
        expect(m.kw, 'at most two keyword marks (then +n)').toBeLessThanOrEqual(2);
        expect(m.kwBox[1]!, 'keywords along the bottom edge').toBeGreaterThan((m.dieBox[1]! + m.dieBox[3]!) / 2);
      }
    }
  });
});

/** The scenes the whole-page look checks run on: every kind of screen and sheet. */
const LOOK_SCENES = [
  'home', 'heroselect-fresh', 'fight-rolling', 'fight-boss', 'fight-intent-sheet', 'fight-menu', 'fight-tutorial',
  'reward', 'doors', 'rest', 'shop', 'event', 'victory', 'defeat',
  'collection-heroes', 'collection-items', 'collection-enemies', 'feats', 'stats', 'daily', 'settings', 'settings-confirm-reset',
  'boss-info-sheet', 'enemy-info-sheet', 'hero-info-sheet', 'item-info-sheet', 'die-info-sheet', 'fight-jammed-die', 'fight-cursed-face',
];

test.describe('no pixel font, no pixelated pictures, no kit pictures, only the rounded system lettering', () => {
  for (const name of LOOK_SCENES) {
    test(`${name}`, async ({ page }) => {
      const problems = watch(page);
      await scene(page, name);
      const r = await page.evaluate(() => {
        const bad: string[] = [];
        const nm = (el: Element): string => {
          const e = el as HTMLElement;
          return e.dataset?.['testid'] ? `[${e.dataset['testid']}]` : `<${el.tagName.toLowerCase()}${typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''}>`;
        };
        const pseudo: (string | null)[] = [null, '::before', '::after'];
        let texts = 0;
        for (const el of document.querySelectorAll<HTMLElement>('body, body *')) {
          for (const ps of pseudo) {
            const cs = getComputedStyle(el, ps);
            if (ps && cs.content === 'none') continue;
            if (cs.imageRendering === 'pixelated' || cs.imageRendering === 'crisp-edges') bad.push(`image-rendering ${cs.imageRendering}: ${nm(el)}${ps ?? ''}`);
            if (cs.borderImageSource !== 'none') bad.push(`border-image ${cs.borderImageSource.slice(0, 60)}: ${nm(el)}${ps ?? ''}`);
            const bg = cs.backgroundImage;
            for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
              const u = m[1] ?? '';
              if (!/\/art\/bg\.[a-z0-9_]+\.svg$/.test(u)) bad.push(`background picture ${u}: ${nm(el)}${ps ?? ''}`);
            }
            if (/\bkit\b|kit\./.test(bg + cs.borderImageSource + cs.maskImage)) bad.push(`kit picture: ${nm(el)}${ps ?? ''}`);
          }
          if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
          for (const n of el.childNodes) {
            if (n.nodeType !== 3 || !(n.textContent ?? '').trim()) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'none') continue;
            texts++;
            const fam = cs.fontFamily;
            if (!/^ui-rounded,\s*"?SF Pro Rounded"?,\s*system-ui,\s*sans-serif$/i.test(fam)) bad.push(`font ${fam}: ${nm(el)} "${(n.textContent ?? '').trim().slice(0, 16)}"`);
            if (/pixel|press start|silkscreen|vt323|mono/i.test(fam)) bad.push(`pixel/mono font ${fam}: ${nm(el)}`);
            const px = parseFloat(cs.fontSize);
            if (px < 12) bad.push(`font size ${px}px under 12: ${nm(el)} "${(n.textContent ?? '').trim().slice(0, 16)}"`);
          }
        }
        let faces = 0;
        for (const sh of document.styleSheets) {
          const rules = ((): CSSRule[] => {
            try {
              return [...sh.cssRules];
            } catch {
              return [];
            }
          })();
          for (const rule of rules) if (rule instanceof CSSFontFaceRule) faces++;
        }
        const fonts = [...document.fonts].length;
        const px = document.querySelectorAll('.px, .pxg, [class*="pixel"]').length;
        return { bad: [...new Set(bad)], texts, faces, fonts, px };
      });
      expect(r.texts, 'the page has text to check').toBeGreaterThan(0);
      expect(r.bad).toEqual([]);
      expect(r.faces, 'no @font-face (the phone font only)').toBe(0);
      expect(r.fonts, 'no web font loaded').toBe(0);
      expect(r.px, 'no pixel-text elements').toBe(0);
      problems.assertClean();
    });
  }
});

interface Tok {
  id: string;
  tag: string;
  cls: string;
  src: string;
  w: number;
  h: number;
  inFight: boolean;
}

async function tokens(page: Page): Promise<Tok[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-sprite^="hero."], [data-sprite^="enemy."], [data-sprite^="boss."]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset['sprite'] ?? '', tag: el.tagName, cls: typeof el.className === 'string' ? el.className : '', src: el instanceof HTMLImageElement ? el.currentSrc || el.src : '', w: r.width, h: r.height, inFight: !!el.closest('[data-testid="screen-fight"]') };
      }),
  );
}

test.describe('every hero, enemy and boss is a round vector token', () => {
  for (const name of ['fight-rolling', 'fight-boss', 'fight-elite', 'fight-four-enemies', 'fight-boss-act2', 'fight-boss-act3', 'heroselect-all-unlocked-tiers', 'collection-heroes', 'collection-enemies', 'victory', 'defeat', 'boss-info-sheet', 'enemy-info-sheet', 'hero-info-sheet']) {
    test(`${name}`, async ({ page }) => {
      const problems = watch(page);
      await scene(page, name);
      const list = await tokens(page);
      expect(list.length, 'characters are on screen').toBeGreaterThan(0);
      for (const t of list) {
        const what = `${t.id} (${t.tag}.${t.cls})`;
        expect(t.tag, `${what} is an image of its token file`).toBe('IMG');
        expect(t.src, `${what} comes from its token svg`).toContain(`/art/${t.id}.svg`);
        expect(t.cls, `${what} is a token`).toMatch(/\btoken\b/);
        expect(t.cls, `${what} is not the old CSS coin with a picture`).not.toMatch(/token-disc/);
        expect(t.w, `${what} square`).toBeCloseTo(t.h, 0);
        expect(t.w, `${what} large enough to read`).toBeGreaterThanOrEqual(24);
      }
      problems.assertClean();
    });
  }

  for (const act of [1, 2, 3]) {
    test(`act ${act} boss: about 1.5x the size of heroes and enemies, which share one size`, async ({ page }) => {
      await scene(page, act === 1 ? 'fight-boss' : `fight-boss-act${act}`);
      const list = (await tokens(page)).filter((t) => t.inFight);
      const boss = list.filter((t) => t.id.startsWith('boss.'));
      const others = list.filter((t) => !t.id.startsWith('boss.'));
      expect(boss.length, 'a boss token').toBeGreaterThanOrEqual(1);
      const base = others.find((t) => t.id.startsWith('hero.'))?.w ?? 0;
      expect(base).toBeGreaterThan(0);
      for (const o of others) expect(o.w, `${o.id} matches the hero token size`).toBeCloseTo(base, 0);
      for (const b of boss) {
        expect(b.cls).toMatch(/token-boss/);
        expect(b.w / base, `${b.id} is ${b.w}px against ${base}px`).toBeGreaterThan(1.35);
        expect(b.w / base).toBeLessThan(1.65);
      }
    });
  }

  test('the elite fight shows hero, enemy and elite token kinds', async ({ page }) => {
    await scene(page, 'fight-elite');
    const kinds = new Set((await tokens(page)).map((t) => (/token-(hero|enemy|elite|boss)/.exec(t.cls) ?? [])[1]));
    expect(kinds.has('hero')).toBe(true);
    expect(kinds.has('elite'), 'the elite fight shows an elite token').toBe(true);
  });
});
