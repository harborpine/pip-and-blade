import '../fight.css';
import type { Action, ActiveSet, DiePreview, DieView, EnemyForecast, EnemyState, GameEvent, GameState, RunState, TargetRef } from '@shared';
import { IllegalActionError } from '@shared';
import { animate, clearInputs, gateInput, inputGated, motionReduced, onInput, track, waitAnimations } from '../anim';
import { KIT_SCALE, LAYOUT, icon, pixelize, spriteImg } from '../art';
import { clear, h } from '../dom';
import { content, engine } from '../engine';
import { burst, fadeOut, flash, flip, floatText, flyDie, hop, ribbon, shake } from '../fx';
import { showDieInfo, showEnemyInfo, showFuryInfo, showHeroInfo, showIntentInfo, showItemInfo, showSetInfo } from '../info';
import { prefs } from '../prefs';
import { dispatch, game, go, incoming } from '../store';
import { tutorialAfter, tutorialAttach, tutorialNoteIntentOpened } from '../tutorial';
import { confirmDialog, modal, onLongPress } from '../ui';
import { actionBadge, actionIconId, actionLine, enemyDef, itemDef, itemName, enemyName, enemySpriteId, heroName, heroSpriteId, shortName, statusDef, symbolIcon } from '../view';
import type { Screen } from './types';

/**
 * There are no modes. Tapping a die always means "use it"; the padlock under a die keeps it
 * through a reroll. The only interface state is which die is lifted (waiting for its target),
 * which die is being peeked at, and a one-off note for the hint line.
 */
interface FightUi {
  /** Turn identity: selection never survives into another turn. */
  key: string;
  /** The lifted die (several possible targets: waiting for the target tap), else null. */
  selected: number | null;
  /** The die whose effect is being previewed by a long-press, else null. */
  peek: number | null;
  /** A one-off explanation shown in the hint line until the next action. */
  note: string | null;
}
const ui: FightUi = { key: '', selected: null, peek: null, note: null };

/** What the previous paint showed, to animate only real changes. */
interface Shown {
  key: string;
  phase: string;
  locks: boolean;
  selected: number | null;
}

interface Ghost {
  rect: DOMRect;
  sprite: string;
}

const refKey = (t: TargetRef): string => (t.side === 'enemy' ? `e${t.uid}` : `h${t.index}`);
const sameRef = (a: TargetRef, b: TargetRef): boolean => refKey(a) === refKey(b);

/** "die cannot be used" -> "Die cannot be used." */
function sentence(text: string): string {
  const t = text.replace(/^\w+: /, '').trim();
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? '' : '.'}` : '';
}

function previewLine(run: RunState, hit: DiePreview['hits'][number]): string {
  const who = hit.target.side === 'enemy'
    ? enemyName(run.fight?.enemies.find((e) => hit.target.side === 'enemy' && e.uid === hit.target.uid)?.enemyId ?? '')
    : shortName(run.heroes[hit.target.index]?.heroId ?? '');
  return `${who}: ${previewText(hit)}`;
}

function previewText(p: DiePreview['hits'][number]): string {
  const parts: string[] = [];
  if (p.kills) parts.push('KO');
  if (p.hpLoss > 0) parts.push(`-${p.hpLoss} HP`);
  if (p.shieldLoss > 0) parts.push(`-${p.shieldLoss} shield`);
  if (p.shieldGain > 0) parts.push(`+${p.shieldGain} shield`);
  if (p.heal > 0) parts.push(`+${p.heal} HP`);
  if (p.poison > 0) parts.push(`${p.poison} poison`);
  if (p.weaken > 0) parts.push(`weak ${p.weaken}`);
  return parts.join(', ') || 'no effect';
}

/** The same preview as toy parts for a chip: an icon and a number each. */
function previewNodes(p: DiePreview['hits'][number] | undefined, selfLoss = 0): Node[] {
  const out: Node[] = [];
  const num = (text: string): HTMLElement => h('b', { class: 'pxn', text });
  if (p) {
    if (p.kills) out.push(h('span', { class: 'ko', text: 'KO' }));
    if (p.hpLoss > 0) out.push(icon('ui.hp', 18), num(`-${p.hpLoss}`));
    if (p.shieldLoss > 0) out.push(icon('ui.shield', 18), num(`-${p.shieldLoss}`));
    if (p.shieldGain > 0) out.push(icon('ui.shield', 18), num(`+${p.shieldGain}`));
    if (p.heal > 0) out.push(icon('ui.hp', 18), num(`+${p.heal}`));
    if (p.poison > 0) out.push(icon('status.poison', 18), num(`+${p.poison}`));
    if (p.weaken > 0) out.push(icon('status.weak', 18), num(`+${p.weaken}`));
  }
  if (selfLoss > 0) out.push(h('span', { class: 'ko', text: 'self' }), num(`-${selfLoss}`));
  if (out.length === 0) out.push(num('0'));
  return out;
}

/** Run fn after ms of real time (immediately under reduced motion). Tracked so waitIdle() sees it. */
function at(ms: number, fn: () => void): void {
  if (ms <= 0 || motionReduced()) {
    fn();
    return;
  }
  void track(new Promise<void>((resolve) => setTimeout(() => {
    fn();
    resolve();
  }, ms)));
}

const MAX_LEVEL = 40;

interface Sizes {
  /** True when this is already the smallest layout. */
  last?: boolean;
  enemy: number;
  boss: number;
  hero: number;
  /** Width of a die in CSS px. */
  die: number;
}

/** Dice are the star: always art's full size (2 CSS px per pixel: 84 px wide). */
const DIE_W = LAYOUT.die.w * KIT_SCALE;
const DIE_H = LAYOUT.die.h * KIT_SCALE;

export function buildFight(): Screen {
  const root = h('main', { class: 'screen fight', testid: 'screen-fight' });
  const fxLayer = h('div', { class: 'fx-layer', attrs: { 'aria-hidden': 'true' } });
  let prevEnemies = new Map<number, Ghost>();
  let lastLevel = 0;
  let tight = false;
  let atSmallest = false;
  let levelFor = '';
  let startEvents: GameEvent[] = [];
  let startAction: Action | null = null;
  let shown: Shown = { key: '', phase: '', locks: false, selected: null };

  /** Show a one-off explanation in the hint line (and wobble what was tapped). */
  const say = (text: string, wobble?: Element | null): void => {
    ui.note = text;
    const line = root.querySelector<HTMLElement>('[data-testid="hint-line"]');
    if (line) {
      line.textContent = text;
      line.classList.add('note');
    }
    if (wobble) void shake(wobble);
  };

  const act = (a: Action): boolean => {
    ui.note = null;
    ui.peek = null;
    try {
      dispatch(a);
      return true;
    } catch (e) {
      say(e instanceof IllegalActionError ? sentence(e.message) : 'That did not work.');
      return false;
    }
  };

  /**
   * Every tap that changes the fight goes through here. If an animation the player must see is
   * still in flight the tap waits its turn (it is never dropped); a tap that has waited is
   * forgotten only if the turn it was made in is over.
   */
  const press = (fn: () => void): void => {
    const key = ui.key;
    onInput(() => {
      if (!root.isConnected || ui.key !== key) return;
      fn();
    });
  };

  const dieEl = (i: number): HTMLElement | null => root.querySelector<HTMLElement>(`[data-testid="die-${i}"]`);
  const lockEl = (i: number): HTMLElement | null => root.querySelector<HTMLElement>(`[data-testid="lock-${i}"]`);

  const putDown = (): void => {
    if (ui.selected === null) return;
    ui.selected = null;
    ui.note = null;
    paint();
  };
  // A tap on empty space puts a lifted die back down.
  root.addEventListener('click', (ev) => {
    if (ui.selected === null) return;
    const t = ev.target as Element | null;
    if (t?.closest('.die, .lock-btn, .unit, button, [role="button"]')) return;
    putDown();
  });

  /** Pick sprite scales from the space available: heroes and enemies about the same size, bosses biggest. */
  /**
   * Heroes and normal enemies get the same scale (so they look about equally big), bosses 1.5x.
   * Level 0 is the biggest layout; each higher level is a smaller one (smaller dice first, then
   * smaller sprites in half steps, boss a half step at a time). The caller measures and moves up
   * a level until the screen fits, so small phones still use all the room they have.
   */
  function sizes(run: RunState, level: number): Sizes {
    const app = document.getElementById('app');
    const W = (app?.clientWidth ?? window.innerWidth) - 16;
    const list = run.fight?.enemies ?? [];
    const n = Math.max(1, list.length);
    const bossCount = list.filter((e) => enemyDef(e.enemyId)?.kind === 'boss').length;
    const normals = n - bossCount;
    const configs: Sizes[] = [];
    const seen = new Set<string>();
    for (const H of [2, 1.5, 1]) {
      // Enemies share the heroes' scale when that fits; otherwise they give up half a step first.
      for (const E of H > 1 ? [H, H - 0.5] : [H]) {
        // Enemies must fit side by side.
        let es = E;
        while (es > 1 && normals * 52 * es + bossCount * 64 * es + 8 * (n - 1) > W) es -= 0.5;
        const widthLeft = W - normals * 52 * es - 8 * (n - 1);
        const bossMax = bossCount > 0 ? Math.max(es, Math.floor(Math.min(es * 1.5, widthLeft / (64 * bossCount), 3) * 2) / 2) : es;
        for (const die of [DIE_W]) {
          for (let bs = bossMax; bs >= es; bs -= 0.5) {
            const key = `${H}|${es}|${bs}|${die}`;
            if (!seen.has(key)) {
              seen.add(key);
              configs.push({ enemy: es, boss: bs, hero: H, die });
            }
            if (bossCount === 0) break;
          }
        }
      }
    }
    const last = configs[configs.length - 1] ?? { enemy: 1, boss: 1, hero: 1, die: DIE_W };
    const pick = Math.min(level, configs.length - 1);
    return { ...(configs[pick] ?? last), last: pick >= configs.length - 1 };
  }

  /** True if the enemy row's contents are taller than the row, or the whole screen overflows. */
  function overflows(): boolean {
    const row = root.querySelector<HTMLElement>('.row.enemies');
    if (!root.isConnected) return false;
    // A row that centres its units overflows upward as well as downward, which scrollHeight does not report: measure the units.
    const tooTall = !!row && Array.from(row.children).some((u) => (u as HTMLElement).offsetHeight > row.clientHeight + 1);
    return tooTall || (!!row && row.scrollHeight > row.clientHeight + 1) || root.scrollHeight > root.clientHeight + 2;
  }

  /** Measure; if the screen does not fit, shrink step by step (and finally drop the extra intent detail). */
  function fit(events: GameEvent[], action: Action | null, defer: boolean): void {
    for (let guard = 0; guard < 2 * MAX_LEVEL + 3 && overflows(); guard += 1) {
      if (atSmallest) {
        if (tight) break;
        // Nothing fits as it is: switch to the compact layout and try the biggest miniatures again.
        tight = true;
        lastLevel = 0;
      } else {
        lastLevel += 1;
      }
      paint(events, action, lastLevel, defer, true);
    }
  }

  function paint(events: GameEvent[] = [], action: Action | null = null, level = -1, defer = false, noFit = false): void {
    const g = game();
    const run = g.run;
    if (!run || !run.fight || run.phase !== 'fight') return;
    const f = run.fight;
    const key = `${run.seed}|${run.fightsWon}|${f.encounterId}|${f.turn}`;
    if (key !== ui.key) {
      ui.key = key;
      ui.selected = null;
      ui.peek = null;
      ui.note = null;
    }
    const dice = engine.dice(g);
    if (ui.selected !== null && !dice[ui.selected]?.usable) ui.selected = null;
    if (ui.peek !== null && !dice[ui.peek]) ui.peek = null;
    const forecast = engine.forecast(g);
    const sets = engine.previewSets(g);
    const liftedDie = ui.selected !== null ? dice[ui.selected] : undefined;
    // Previews are shown for the lifted die, or for the die being peeked at with a long-press.
    const selDie = liftedDie ?? (ui.peek !== null ? dice[ui.peek] : undefined);

    // Remember where enemies were so a ghost can fade out if one dies.
    const fightKey = `${run.seed}|${run.fightsWon}|${f.encounterId}`;
    if (fightKey !== levelFor) {
      levelFor = fightKey;
      lastLevel = 0;
      tight = false;
    }
    if (level < 0) level = lastLevel;
    prevEnemies = new Map();
    for (const el of root.querySelectorAll<HTMLElement>('[data-enemy-uid]')) {
      const sp = el.querySelector<HTMLElement>('.sprite');
      if (sp) prevEnemies.set(Number(el.dataset['enemyUid']), { rect: sp.getBoundingClientRect(), sprite: sp.dataset['sprite'] ?? '' });
    }

    // HP and shield as they were BEFORE this batch of events: the bars move when each hit lands.
    const hpDelta = new Map<string, number>();
    const shDelta = new Map<string, number>();
    if (!motionReduced()) {
      for (const ev of events) {
        if (ev.type === 'damage') {
          const k = refKey(ev.target);
          hpDelta.set(k, (hpDelta.get(k) ?? 0) + ev.amount);
          shDelta.set(k, (shDelta.get(k) ?? 0) + ev.blocked);
        } else if (ev.type === 'heal') {
          const k = refKey(ev.target);
          hpDelta.set(k, (hpDelta.get(k) ?? 0) - ev.amount);
        } else if (ev.type === 'shield') {
          const k = refKey(ev.target);
          shDelta.set(k, (shDelta.get(k) ?? 0) - ev.amount);
        }
      }
    }
    const shownHp = (k: string, hp: number, max: number): number => Math.max(0, Math.min(max, hp + (hpDelta.get(k) ?? 0)));
    const shownSh = (k: string, sh: number): number => Math.max(0, sh + (shDelta.get(k) ?? 0));
    const rolledNow = new Set<number>();
    if (!motionReduced()) for (const ev of events) if (ev.type === 'diceRolled') for (const d of ev.dice) rolledNow.add(d.die);

    // Previews for the selected die.
    const previewByTarget = new Map<string, DiePreview['hits'][number]>();
    let previewAll: DiePreview | null = null;
    if (selDie && selDie.usable) {
      try {
        if (selDie.needsTarget) {
          for (const t of selDie.targets) {
            const pv = engine.previewDie(g, selDie.die, t);
            previewAll = pv;
            const hit = pv.hits.find((x) => sameRef(x.target, t));
            if (hit) previewByTarget.set(refKey(t), hit);
          }
        } else {
          previewAll = engine.previewDie(g, selDie.die);
          for (const hit of previewAll.hits) previewByTarget.set(refKey(hit.target), hit);
        }
      } catch {
        /* illegal right now: show nothing */
      }
    }
    const targetable = new Set<string>();
    if (liftedDie?.needsTarget) for (const t of liftedDie.targets) targetable.add(refKey(t));

    const sc = sizes(run, level);
    atSmallest = !!sc.last;
    const useOn = (t: TargetRef): void => {
      press(() => {
        if (ui.selected === null) return;
        const die = ui.selected;
        ui.selected = null;
        act({ type: 'useDie', die, target: t });
      });
    };

    // ------------------------------------------------ status bar
    const status = h('header', { class: 'fight-status' },
      h('div', { class: 'pips', testid: 'fight-progress', attrs: { 'aria-label': `Act ${run.act}, fight ${run.slot}` } },
        h('span', { class: 'act-label', text: `Act ${run.act}` }),
        ...[1, 2, 3, 4].map((s) => h('span', { class: `pip${s < run.slot ? ' done' : s === run.slot ? ' now' : ' todo'}${s === 4 ? ' boss' : ''}` }, icon(s < run.slot ? 'ui.check' : s === 4 ? 'ui.boss' : 'ui.fight', 24))),
      ),
      furyBadge(f.turn),
      h('div', { class: 'status-right' },
        h('span', { class: 'gold', testid: 'gold' }, icon('ui.gold', 18), h('b', { class: 'pxn', text: String(run.gold) })),
        run.tier > 0 ? h('span', { class: 'tier', testid: 'tier', text: `T${run.tier}` }) : null,
        h('button', { class: 'icon-btn menu-btn', testid: 'btn-menu', attrs: { 'aria-label': 'Menu' }, onClick: () => openMenu(run) }, icon('ui.settings', 36)),
      ),
    );

    // ------------------------------------------------ enemies
    const enemyUnit = (e: EnemyState): HTMLElement => {
      const def = enemyDef(e.enemyId);
      const k = `e${e.uid}`;
      const pv = previewByTarget.get(k);
      const isTarget = targetable.has(k);
      const intent = e.intent;
      const bubble = intent
        // On the smallest layouts the bubble is a low strip that belongs to its enemy (one tap target together); elsewhere it is a button of its own.
        ? h('div', { class: 'intent', testid: `intent-${e.uid}`, attrs: { ...(tight ? {} : { role: 'button' }), 'aria-label': `${enemyName(e.enemyId)} intends ${intent.moveName}` } },
            def?.kind === 'boss' || intent.moveName.includes('(') ? h('div', { class: 'intent-move', text: intent.moveName }) : null,
            // Smallest screens: each action is just its toy icon and number (the heroes' forecast chips say who is hit).
            ...(tight
              ? [h('div', { class: 'intent-row' }, ...intent.actions.map((a) => h('span', { class: `intent-line ${a.type}`, attrs: { 'aria-label': actionLine(run, a) } }, icon(actionIconId(a), 18), actionBadge(a) ? h('b', { class: 'pxn', text: actionBadge(a) }) : null)))]
              : intent.actions.map((a) => h('div', { class: `chip intent-line ${a.type}` }, icon(actionIconId(a), intent.actions.length > 1 ? 18 : 24), h('span', { class: 'intent-text', text: actionLine(run, a) })))),
          )
        : h('div', { class: 'intent' });
      if (intent) {
        onLongPress(bubble, () => showIntentInfo(e.uid));
        bubble.addEventListener('click', (ev) => {
          // While a die is lifted, the whole enemy (bubble included) is the target.
          if (isTarget) return;
          ev.stopPropagation();
          if (ui.selected !== null) {
            putDown();
            return;
          }
          showIntentInfo(e.uid);
          tutorialNoteIntentOpened();
        });
      }
      const scale = def?.kind === 'boss' ? sc.boss : sc.enemy;
      const unit = h('div', {
        class: `unit enemy${def?.kind === 'boss' ? ' boss' : ''}${isTarget ? ' targetable' : ''}`,
        testid: `enemy-${e.uid}`,
        attrs: { 'data-enemy-uid': String(e.uid), 'data-enemy-id': e.enemyId, role: 'button', 'aria-label': enemyName(e.enemyId) },
      },
        bubble,
        intent ? h('span', { class: 'intent-tail', attrs: { 'aria-hidden': 'true' } }) : null,
        h('div', { class: 'sprite-box' }, spriteImg(enemySpriteId(e.enemyId), scale)),
        hpBar(shownHp(k, e.hp, e.maxHp), e.maxHp, shownSh(k, e.shield), `enemy-hp-${e.uid}`, '', pv ? h('div', { class: `preview${pv.kills ? ' kill' : ''}`, testid: `preview-enemy-${e.uid}`, attrs: { 'aria-label': previewText(pv) } }, ...previewNodes(pv)) : null),
        statusRow(e.statuses),
        h('div', { class: 'unit-name', text: def?.name ?? e.enemyId }),
      );
      unit.addEventListener('click', () => {
        if (isTarget) useOn({ side: 'enemy', uid: e.uid });
        else if (ui.selected !== null) putDown();
        else showEnemyInfo(e.uid);
      });
      onLongPress(unit, () => showEnemyInfo(e.uid));
      return unit;
    };
    const nEn = f.enemies.length;
    const bossN = f.enemies.filter((e) => enemyDef(e.enemyId)?.kind === 'boss').length;
    const rowW = (document.getElementById('app')?.clientWidth ?? window.innerWidth) - 16;
    const normalW = Math.max(64, Math.floor((rowW - 4 * (nEn - 1) - bossN * (64 * sc.boss + 12)) / Math.max(1, nEn - bossN)));
    const enemyRow = h('section', { class: `row enemies${nEn >= 3 ? ' crowded' : ''}`, testid: 'enemy-row', style: { '--uw': `${normalW}px` } }, ...f.enemies.map(enemyUnit));

    // ------------------------------------------------ heroes
    const anyItems = run.heroes.some((x) => x.items.length > 0);
    const heroRow = h('section', { class: 'row heroes', testid: 'hero-row' },
      ...run.heroes.map((hs, i) => {
        const hf = f.heroes[i];
        const k = `h${i}`;
        const pv = previewByTarget.get(k);
        const fc = forecast.heroes[i];
        const isTarget = targetable.has(k);
        const sel = liftedDie && liftedDie.hero === i;
        const selfLoss = sel && previewAll ? previewAll.selfHpLoss : 0;
        const unit = h('div', {
          class: `unit hero${hs.downed ? ' downed' : ''}${isTarget ? ' targetable' : ''}${sel ? ' owner' : ''}`,
          testid: `hero-${i}`,
          attrs: { role: 'button', 'aria-label': heroName(hs.heroId) },
        },
          h('div', { class: 'sprite-box' }, spriteImg(heroSpriteId(hs.heroId), sc.hero), hs.downed ? icon('ui.downed', 36, 'downed-icon') : null),
          hpBar(hs.downed ? shownHp(k, 0, hs.maxHp) : shownHp(k, hs.hp, hs.maxHp), hs.maxHp, shownSh(k, (hf?.shield ?? 0) + (hf?.ward ?? 0)), `hero-hp-${i}`, hf?.ward ? 'ward' : '', pv || selfLoss ? h('div', { class: `preview${pv?.kills ? ' kill' : ''}`, testid: `preview-hero-${i}`, attrs: { 'aria-label': [pv ? previewText(pv) : '', selfLoss ? `self -${selfLoss}` : ''].filter(Boolean).join(', ') } }, ...previewNodes(pv, selfLoss)) : null),
          statusRow(hf?.statuses ?? {}),
          h('div', { class: 'unit-name', text: shortName(hs.heroId) }),
          hs.items.length > 0
            ? h('div', { class: 'unit-items', testid: `hero-items-${i}` }, ...hs.items.map((it) => {
                const b = h('button', { class: 'mini-item', testid: `hero-item-${it}`, attrs: { 'data-item': it, 'aria-label': itemName(it) } }, icon(`item.${it}`, 24));
                b.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  showItemInfo(it);
                });
                return b;
              }))
            : anyItems ? h('div', { class: 'unit-items empty' }) : null,
          !hs.downed && fc ? forecastChip(i, fc) : null,
          fc?.jammed ? h('div', { class: 'warn-chip', testid: `jam-warning-${i}`, text: 'jam' }) : null,
        );
        unit.addEventListener('click', () => {
          if (isTarget) useOn({ side: 'hero', index: i });
          else if (ui.selected !== null) putDown();
          else showHeroInfo(i);
        });
        onLongPress(unit, () => showHeroInfo(i));
        return unit;
      }),
    );

    // ------------------------------------------------ dice tray
    const rolling = f.phase === 'rolling';
    const canReroll = engine.canApply(g, { type: 'reroll' });
    const canUndo = engine.canApply(g, { type: 'undo' });
    // Padlocks only mean something while a reroll could still happen.
    const locksOn = rolling && (f.rerollsLeft > 0 || canReroll);
    const firstLockMatters = run.heroes.some((hs) => hs.items.some((it) => itemDef(it)?.modifiers?.some((m) => m.type === 'firstLockMultiplier')));
    const unused = dice.filter((d) => d.usable && d.effect !== 'blank').length;
    const setLine = setBanner(sets, f.phase);
    const trayHead = [
      h('div', { class: 'tray-head' },
        h('span', { class: 'turn-label', testid: 'turn-label', text: `T${f.turn}`, attrs: { 'aria-label': `Turn ${f.turn}` } }),
        h('span', { class: `hint-line${ui.note ? ' note' : ''}`, testid: 'hint-line', text: ui.note ?? hintText({ lifted: liftedDie, pv: previewAll, run, rolling, locksOn, canUndo, rerollsLeft: f.rerollsLeft, diceUsed: f.diceUsed, unused }) }),
        setLine,
      ),
      h('div', { class: 'dice' },
        ...dice.map((dv) => h('div', { class: 'die-col' },
          dieButton(dv, run, ui.selected === dv.die, rolledNow.has(dv.die), () => press(() => onDieTap(dv.die)), () => peek(dv.die)),
          lockButton(dv, locksOn, firstLockMatters && !!f.dice[dv.die]?.firstLocked, () => press(() => onLockTap(dv.die))),
        )),
      ),
    ];

    // ------------------------------------------------ action bar: Reroll, Undo, End Turn (always these three)
    const downedHeroes = forecast.heroes.map((x, i) => (x.downed ? shortName(run.heroes[i]?.heroId ?? '') : '')).filter(Boolean);
    const danger = forecast.partyWipe ? 'wipe' : downedHeroes.length > 0 ? 'down' : '';
    const totalIn = forecast.heroes.reduce((s, x) => s + x.hpLoss, 0);

    // Using the first die ends rolling. With rerolls still unspent the button visibly closes and says why.
    const rolledOver = !rolling && f.rerollsLeft > 0;
    const rerollState = rolling ? (canReroll ? 'ready' : 'blocked') : rolledOver ? 'over' : 'spent';
    const rerollBtn = h('button', {
      class: `btn act-btn reroll ${rerollState}`,
      testid: 'btn-reroll',
      attrs: { 'data-rerolls': String(f.rerollsLeft), 'data-state': rerollState, 'aria-disabled': String(rerollState !== 'ready') },
    },
      icon('ui.reroll', 32),
      h('span', { class: 'reroll-text' },
        h('b', { class: 'reroll-label pxt', text: rerollState === 'over' ? 'Rolling' : 'Reroll' }),
        ' ',
        rerollState === 'over'
          ? h('b', { class: 'reroll-label pxt', text: 'over' })
          : h('span', { class: 'reroll-count pxt', attrs: { 'aria-label': `${f.rerollsLeft} left` } },
              h('span', { class: 'reroll-num pxt', testid: 'rerolls-left', text: String(f.rerollsLeft) }),
              h('span', { class: 'reroll-word pxt', text: ' left' }),
            ),
      ),
    );
    rerollBtn.addEventListener('click', () => press(() => onRerollTap()));

    const undoBtn = h('button', { class: 'btn act-btn undo', testid: 'btn-undo', disabled: !canUndo, onClick: () => press(() => act({ type: 'undo' })) }, h('span', { class: 'pxt', text: 'Undo' }));

    const endBtn = h('button', {
      class: `btn primary act-btn end${danger ? ` ${danger}` : ''}`,
      testid: 'btn-end-turn',
      onClick: () => {
        // A press that had to wait behind the enemies' turn must never end the NEXT turn unseen.
        if (inputGated()) return;
        endTurn(run, forecast, danger, unused);
      },
    },
      h('span', { class: 'end-text' },
        h('b', { class: 'pxt', text: 'End Turn' }),
        forecastLine(forecast, totalIn, danger, downedHeroes),
      ),
    );
    const tray = h('section', { class: `tray${rolling ? ' rolling' : ' acting'}`, testid: 'dice-tray', attrs: { 'data-phase': f.phase }, style: { '--die-w': `${DIE_W}px` } },
      ...trayHead,
      h('footer', { class: 'actions' }, rerollBtn, undoBtn, endBtn),
    );

    clear(root);
    root.classList.toggle('tight', tight);
    document.body.dataset['act'] = String(run.act);
    root.append(status, enemyRow, heroRow, tray, fxLayer);
    pixelize(root);
    tutorialAttach(root, { run, lifted: liftedDie !== undefined, unused, rolling });
    lastLevel = level;
    if (!noFit) fit(events, action, defer);
    if (noFit) return;
    // Animate only what really changed since the last picture.
    const now: Shown = { key, phase: f.phase, locks: locksOn, selected: ui.selected };
    if (!motionReduced() && shown.key === key) {
      const locks = Array.from(root.querySelectorAll<HTMLElement>('.lock-btn'));
      if (shown.locks && !now.locks) {
        // Padlocks fade away: they are no use once rolling is over.
        for (const el of locks) void animate(el, [{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { duration: 200, easing: 'ease-out' });
      } else if (!shown.locks && now.locks) {
        for (const el of locks) void animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
      }
      if (shown.phase === 'rolling' && now.phase === 'acting' && rolledOver) {
        // The Reroll button shutters closed.
        void animate(rerollBtn, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)', offset: 0.45 }, { transform: 'scaleY(1)' }], { duration: 240, easing: 'ease-in-out' });
      }
      if (now.selected !== null && now.selected !== shown.selected) {
        // Lift: the die rises, its targets pulse twice and then hold a steady glow.
        const d = dieEl(now.selected);
        if (d) void animate(d, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }], { duration: 120, easing: 'ease-out' });
        for (const el of root.querySelectorAll('.unit.targetable .sprite-box')) {
          void animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-in-out' });
        }
      }
    }
    shown = now;
    if (!defer && events.length > 0) playEvents(events, g);
  }

  /** Tap a die = use it. One tap when there is nothing to choose; lift and wait when there is. */
  function onDieTap(i: number): void {
    const g = game();
    const dv = engine.dice(g)[i];
    if (!dv) return;
    const el = dieEl(i);
    if (dv.used) {
      say('Already used this turn.', el);
      return;
    }
    if (!dv.usable) {
      const hero = g.run?.heroes[dv.hero];
      say(hero?.downed ? `${shortName(hero.heroId)} is down: this die cannot be used.` : sentence(engine.whyIllegal(g, { type: 'useDie', die: i }) ?? 'That die cannot be used'), el);
      return;
    }
    if (dv.effect === 'blank') {
      if (ui.selected !== null) {
        ui.selected = null;
        ui.note = 'Blank: nothing to use';
        paint();
        void shake(dieEl(i) ?? root);
        return;
      }
      say('Blank: nothing to use', el);
      return;
    }
    if (ui.selected === i) {
      putDown();
      return;
    }
    if (!dv.needsTarget) {
      ui.selected = null;
      act({ type: 'useDie', die: i });
      return;
    }
    const only = dv.targets.length === 1 ? dv.targets[0] : undefined;
    if (dv.targets.length === 0) {
      say('Nothing to use that on right now.', el);
      return;
    }
    if (only && !prefs().chooseTarget) {
      ui.selected = null;
      act({ type: 'useDie', die: i, target: only });
      return;
    }
    ui.selected = i;
    ui.note = null;
    ui.peek = null;
    paint();
  }

  /** Tap the padlock under a die = keep it through the next reroll (or release it). */
  function onLockTap(i: number): void {
    const g = game();
    const dv = engine.dice(g)[i];
    if (!dv) return;
    if (dv.jammed) {
      say('Jammed by an enemy: cannot be rerolled this turn', lockEl(i));
      return;
    }
    if (ui.selected !== null) ui.selected = null;
    act({ type: 'toggleLock', die: i });
  }

  function onRerollTap(): void {
    const g = game();
    const f = g.run?.fight;
    if (!f) return;
    const btn = root.querySelector('[data-testid="btn-reroll"]');
    if (engine.canApply(g, { type: 'reroll' })) {
      ui.selected = null;
      act({ type: 'reroll' });
      return;
    }
    if (f.phase !== 'rolling') {
      say(f.rerollsLeft > 0 && engine.canApply(g, { type: 'undo' }) ? 'Rolling ended when you used a die. Undo brings your rerolls back.' : 'Rolling is over for this turn.', btn);
    } else if (f.rerollsLeft <= 0) {
      say('No rerolls left', btn);
    } else if (engine.dice(g).every((d) => d.locked || d.jammed)) {
      say('Every die is locked', btn);
    } else {
      say(sentence(engine.whyIllegal(g, { type: 'reroll' }) ?? 'Cannot reroll now'), btn);
    }
  }

  /** Long-press a die: see exactly what it would do, without using it. */
  function peek(i: number): void {
    const g = game();
    const run = g.run;
    const dv = engine.dice(g)[i];
    if (!run || !dv) return;
    const lines: string[] = [];
    if (dv.usable && dv.effect !== 'blank') {
      try {
        if (dv.needsTarget) {
          for (const t of dv.targets) {
            const pv = engine.previewDie(g, dv.die, t);
            const hit = pv.hits.find((x) => sameRef(x.target, t));
            if (hit) lines.push(previewLine(run, hit) + (pv.selfHpLoss ? ` (you lose ${pv.selfHpLoss})` : ''));
          }
        } else {
          const pv = engine.previewDie(g, dv.die);
          for (const hit of pv.hits) lines.push(previewLine(run, hit));
          if (pv.selfHpLoss) lines.push(`${shortName(run.heroes[dv.hero]?.heroId ?? '')} loses ${pv.selfHpLoss} HP`);
          if (pv.rerollsNextTurn) lines.push(`+${pv.rerollsNextTurn} reroll${pv.rerollsNextTurn === 1 ? '' : 's'} next turn`);
        }
      } catch {
        /* not usable right now: the sheet still explains the face */
      }
    }
    ui.selected = null;
    ui.note = null;
    ui.peek = i;
    paint();
    showDieInfo(dv, {
      previews: lines,
      onClose: () => {
        if (ui.peek === i) {
          ui.peek = null;
          paint();
        }
      },
    });
  }


  function endTurn(run: RunState, fc: EnemyForecast, danger: string, unused: number): void {
    const go = (): void => {
      ui.selected = null;
      act({ type: 'endTurn' });
    };
    if (!danger) {
      go();
      return;
    }
    const names = fc.heroes.map((x, i) => (x.downed ? heroName(run.heroes[i]?.heroId ?? '') : '')).filter(Boolean);
    void confirmDialog({
      testid: 'confirm-end-turn',
      title: fc.partyWipe ? 'Your whole party would fall!' : 'A hero would be downed',
      text: `${fc.partyWipe ? 'If you end the turn now every hero goes down and the run is over.' : `If you end the turn now, ${names.join(' and ')} would be downed for the rest of the fight.`}${unused > 0 ? ` ${unused} ${unused === 1 ? 'die' : 'dice'} unused.` : ''}`,
      confirmLabel: 'End turn anyway',
      danger: true,
    }).then((ok) => {
      if (ok) go();
    });
  }

  function openMenu(run: RunState): void {
    modal({
      testid: 'menu-modal',
      title: 'Paused',
      buttons: [
        { label: 'Resume', testid: 'menu-resume', kind: 'primary' },
        { label: 'Settings', testid: 'menu-settings', onClick: () => go('settings') },
        {
          label: run.mode === 'tutorial' ? 'Skip tutorial' : 'Abandon run',
          testid: 'menu-abandon',
          kind: 'danger',
          onClick: () => {
            void confirmDialog({ testid: 'confirm-abandon', title: 'Abandon this run?', text: run.mode === 'daily' ? 'Your daily run ends here. You can try again today.' : 'The run ends now. Progress from feats is kept.', confirmLabel: 'Abandon', danger: true }).then((ok) => {
              if (ok) act({ type: 'abandonRun' });
            });
          },
        },
      ],
    });
  }

  // ------------------------------------------------ animation of events
  function unitEl(t: TargetRef): HTMLElement | null {
    return root.querySelector<HTMLElement>(t.side === 'enemy' ? `[data-testid="enemy-${t.uid}"]` : `[data-testid="hero-${t.index}"]`);
  }

  function barEl(t: TargetRef): HTMLElement | null {
    return root.querySelector<HTMLElement>(t.side === 'enemy' ? `[data-testid="enemy-hp-${t.uid}"]` : `[data-testid="hero-hp-${t.index}"]`);
  }

  /** Flip a die through a few random faces of its hero, then land on the real one. */
  function spinDie(dv: { die: number }, g: GameState, delay: number): void {
    const el = root.querySelector<HTMLElement>(`[data-testid="die-${dv.die}"]`);
    const faceEl = el?.querySelector<HTMLElement>('.die-face');
    const run = g.run;
    if (!el || !faceEl || !run) return;
    const hero = run.heroes[Number(el.dataset['hero'])];
    const finalFace = Number(el.dataset['face']);
    if (!hero) {
      faceEl.classList.remove('pending');
      return;
    }
    void flip(el, delay);
    const others = hero.faces.map((_, i) => i).filter((i) => i !== finalFace);
    const frames: number[] = [];
    let last = -1;
    for (let k = 0; k < 5; k++) {
      const pick = others.filter((i) => i !== last);
      const idx = pick[Math.floor(Math.random() * pick.length)] ?? finalFace;
      frames.push(idx);
      last = idx;
    }
    const finalNodes = Array.from(faceEl.childNodes).map((n) => n.cloneNode(true));
    frames.forEach((fi, k) => {
      const f = hero.faces[fi];
      at(delay + k * 70, () => {
        if (!f) return;
        faceEl.classList.remove('pending');
        faceEl.classList.toggle('blank', f.effect === 'blank');
        faceEl.replaceChildren(...faceContent(f.effect, f.value));
      });
    });
    at(delay + frames.length * 70, () => {
      faceEl.classList.remove('pending');
      faceEl.classList.toggle('blank', el.dataset['effect'] === 'blank');
      faceEl.replaceChildren(...finalNodes);
    });
  }

  function setBar(t: TargetRef, hp: number, shield: number): void {
    const bar = barEl(t);
    if (!bar) return;
    const max = Number(bar.dataset['max'] ?? 1);
    const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
    bar.dataset['hp'] = String(hp);
    bar.dataset['sh'] = String(shield);
    const fill = bar.querySelector<HTMLElement>('.hp-fill');
    if (fill) {
      fill.style.transform = `scaleX(${pct})`;
      fill.classList.toggle('low', pct <= 0.34);
    }
    const txt = bar.querySelector<HTMLElement>('.hp-text');
    if (txt) txt.textContent = `${hp}/${max}`;
    const sb = bar.querySelector<HTMLElement>('.shield-badge');
    if (sb) {
      sb.style.display = shield > 0 ? '' : 'none';
      const b = sb.querySelector('b');
      if (b) b.textContent = String(shield);
    }
  }

  function playEvents(events: GameEvent[], g: GameState): void {
    let t = 0;
    // When the next tap is accepted: once a thrown die has landed / fresh dice show their faces / the enemies are done.
    let ready = 0;
    const enemyTurn = events.some((e) => e.type === 'enemyActs');
    const run = g.run;
    // Running HP/shield per unit, starting from what the bars show right now.
    const cur = new Map<string, { hp: number; sh: number }>();
    const read = (ref: TargetRef): { hp: number; sh: number } => {
      const k = refKey(ref);
      let v = cur.get(k);
      if (!v) {
        const bar = barEl(ref);
        v = { hp: Number(bar?.dataset['hp'] ?? 0), sh: Number(bar?.dataset['sh'] ?? 0) };
        cur.set(k, v);
      }
      return v;
    };
    for (const ev of events) {
      switch (ev.type) {
        case 'diceRolled': {
          let k = 0;
          for (const d of ev.dice) {
            spinDie(d, g, t + k * 90);
            k += 1;
          }
          ready = Math.max(ready, t + (k - 1) * 90 + 5 * 70 + 40);
          t += 60;
          break;
        }
        case 'lockToggled': {
          // The padlock snaps shut and the die settles 2 px into its slot (or pops back up).
          if (motionReduced()) break;
          const die = dieEl(ev.die);
          const lock = lockEl(ev.die);
          if (die) void animate(die, ev.locked ? [{ transform: 'translateY(-3px)' }, { transform: 'translateY(3px)', offset: 0.7 }, { transform: 'translateY(2px)' }] : [{ transform: 'translateY(2px)' }, { transform: 'translateY(-2px)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: 140, easing: 'ease-out' });
          if (lock) void animate(lock, ev.locked ? [{ transform: 'translateY(-5px) scale(1.2)' }, { transform: 'translateY(1px) scale(0.94)', offset: 0.7 }, { transform: 'translateY(0) scale(1)' }] : [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(-14deg) scale(1.12)', offset: 0.5 }, { transform: 'rotate(0deg) scale(1)' }], { duration: 150, easing: 'ease-out' });
          break;
        }
        case 'setsFormed': {
          // A ribbon links the matching dice and the set's name pops once.
          let k = 0;
          for (const set of ev.sets) {
            const def = content.sets.find((d) => d.kind === set.kind && d.symbol === (set.symbol ?? undefined)) ?? content.sets.find((d) => d.kind === set.kind && !d.symbol);
            const els = set.dice.map((i) => dieEl(i)).filter((x): x is HTMLElement => x !== null);
            void ribbon(fxLayer, els, def?.name ?? set.kind, set.kind, t + k * 120);
            k += 1;
          }
          break;
        }
        case 'undone': {
          // Everything snaps back with a quick reverse hop.
          if (!motionReduced()) for (const el of root.querySelectorAll('.die')) void animate(el, [{ transform: 'translateY(7px) scale(0.96)' }, { transform: 'translateY(-3px)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: 150, easing: 'ease-out', composite: 'add' });
          break;
        }
        case 'dieUsed': {
          // The die hops and a copy of it flies to the target; the die in the slot turns "used" as it lands.
          const die = dieEl(ev.die);
          const he = root.querySelector<HTMLElement>(`[data-testid="hero-${ev.hero}"] .sprite-box`);
          const targetBox = ev.target ? (unitEl(ev.target)?.querySelector('.sprite-box') ?? unitEl(ev.target)) : null;
          const dv = engine.dice(g)[ev.die];
          const kind = dv?.effect ?? 'damage';
          let land = t;
          if (die && !motionReduced()) {
            die.classList.add('using');
            if (targetBox) {
              land = flyDie(fxLayer, die, targetBox, t);
            } else {
              void hop(die, 0, -14, t);
              land = t + 170;
            }
            at(land, () => die.classList.remove('using'));
          }
          if (he && !(ev.target?.side === 'hero' && ev.target.index === ev.hero)) void hop(he, 0, -8, t);
          if (targetBox) {
            void burst(fxLayer, targetBox, kind, land);
          } else {
            // No target: the effect bursts over the row it touches.
            const row = root.querySelector(kind === 'damage' || kind === 'weaken' ? '.row.enemies' : `[data-testid="hero-${ev.hero}"] .sprite-box`);
            if (row) void burst(fxLayer, row, kind, land);
          }
          ready = Math.max(ready, Math.min(land, 400));
          t = land;
          break;
        }
        case 'enemyActs': {
          const el = root.querySelector<HTMLElement>(`[data-testid="enemy-${ev.uid}"] .sprite-box`);
          if (el) void hop(el, 0, 16, t);
          t += 150;
          break;
        }
        case 'damage': {
          const el = unitEl(ev.target);
          const v = read(ev.target);
          v.hp = Math.max(0, v.hp - ev.amount);
          v.sh = Math.max(0, v.sh - ev.blocked);
          const hp = v.hp;
          const sh = v.sh;
          at(t, () => setBar(ev.target, hp, sh));
          if (el) {
            const label = ev.amount > 0 ? `-${ev.amount}` : ev.blocked > 0 ? 'blocked' : '0';
            void floatText(el, label, 'dmg', t);
            void shake(el.querySelector('.sprite-box') ?? el, t);
          }
          t += 150;
          break;
        }
        case 'shield': {
          const el = unitEl(ev.target);
          const v = read(ev.target);
          v.sh += ev.amount;
          const hp = v.hp;
          const sh = v.sh;
          at(t, () => setBar(ev.target, hp, sh));
          if (el) void floatText(el, `+${ev.amount}`, 'shield', t, 'ui.shield');
          t += 90;
          break;
        }
        case 'heal': {
          const el = unitEl(ev.target);
          const bar = barEl(ev.target);
          const max = Number(bar?.dataset['max'] ?? 999);
          const v = read(ev.target);
          v.hp = Math.min(max, v.hp + ev.amount);
          const hp = v.hp;
          const sh = v.sh;
          at(t, () => setBar(ev.target, hp, sh));
          if (el) void floatText(el, `+${ev.amount}`, 'heal', t, 'ui.hp');
          t += 90;
          break;
        }
        case 'status': {
          const el = unitEl(ev.target);
          if (el) void floatText(el, `${ev.amount > 0 ? '+' : ''}${ev.amount}`, 'status', t, `status.${ev.status}`);
          t += 70;
          break;
        }
        case 'unitDown':
          if (ev.target.side === 'enemy') {
            const el = unitEl(ev.target);
            if (el) void fadeOut(el, t + 150);
            else {
              const gh = prevEnemies.get(ev.target.uid);
              if (gh) {
                const img = spriteImg(gh.sprite, 1, 'ghost');
                const lay = fxLayer.getBoundingClientRect();
                img.style.position = 'absolute';
                img.style.left = `${gh.rect.left - lay.left}px`;
                img.style.top = `${gh.rect.top - lay.top}px`;
                img.style.width = `${gh.rect.width}px`;
                img.style.height = `${gh.rect.height}px`;
                fxLayer.append(img);
                void fadeOut(img, t + 150).then(() => img.remove());
              }
            }
          } else {
            const el = unitEl(ev.target);
            if (el) void flash(el, t);
          }
          t += 120;
          break;
        case 'fightWon':
          if (run) {
            const b = h('div', { class: 'banner pxt', testid: 'banner-victory', text: 'Victory!' });
            fxLayer.append(b);
            void animate(b, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.4 }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 0 }], { duration: 900, delay: t, fill: 'both' }).then(() => b.remove());
          }
          t += 300;
          break;
        default:
          break;
      }
    }
    gateInput(enemyTurn ? Math.max(ready, t) : ready);
  }

  const screen: Screen = {
    el: root,
    update(events, action) {
      const run = game().run;
      if (!run || run.phase !== 'fight' || !run.fight) {
        // Leaving the fight: just play the final animations over the old picture.
        playEvents(events, game());
        return;
      }
      paint(events, action);
      tutorialAfter(events, action);
    },
    leave: async (events) => {
      playEvents(events, game());
      await waitAnimations();
    },
    destroy: () => clearInputs(),
  };
  startEvents = incoming.events;
  startAction = incoming.action;
  paint(startEvents, startAction, 0, true);
  screen.mounted = () => {
    // Now that it is on screen we can measure: shrink until it fits, then play the animations.
    fit(startEvents, startAction, true);
    playEvents(startEvents, game());
  };
  return screen;
}

// ------------------------------------------------------------ pieces

function hpBar(hp: number, max: number, shield: number, testid: string, extra = '', preview: HTMLElement | null = null): HTMLElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const fill = h('div', { class: `hp-fill${pct <= 0.34 ? ' low' : ''}` });
  fill.style.transform = `scaleX(${pct})`;
  const badge = h('span', { class: 'shield-badge' }, icon(extra === 'ward' ? 'ui.ward' : 'ui.shield', 18), h('b', { class: 'pxn', text: String(shield) }));
  if (shield <= 0) badge.style.display = 'none';
  return h('div', { class: `hp ${extra}${preview ? ' previewing' : ''}`, testid, attrs: { 'data-max': String(max), 'data-hp': String(hp), 'data-sh': String(shield) } },
    icon('ui.hp', 18, 'hp-heart'),
    h('div', { class: 'hp-track' }, fill),
    h('span', { class: 'hp-text pxn', text: `${hp}/${max}` }),
    badge,
    preview,
  );
}

/** "Fury" anti-stall rule: warn one turn before, then show a badge. Tap for the exact rule. */
function furyBadge(turn: number): HTMLElement | null {
  const fury = content.rules.fury;
  if (!fury) return null;
  const active = turn >= fury.fromTurn;
  const next = turn === fury.fromTurn - 1;
  if (!active && !next) return null;
  const b = h('button', { class: `fury-badge${active ? ' on' : ' soon'}`, testid: 'fury-badge', attrs: { 'data-active': String(active) } }, h('span', { class: 'fury-chip', text: active ? 'FURY' : 'Fury next turn' }));
  b.addEventListener('click', () => showFuryInfo());
  return b;
}

function statusRow(st: Partial<Record<string, number>>): HTMLElement {
  const entries = Object.entries(st).filter(([, n]) => (n ?? 0) > 0);
  return h('div', { class: 'statuses' },
    ...entries.map(([id, n]) => h('span', { class: 'status-chip', testid: `status-${id}`, attrs: { title: statusDef(id)?.name ?? id } }, icon(`status.${id}`, 18), h('b', { class: 'pxn', text: String(n) }))),
  );
}

function forecastChip(i: number, fc: EnemyForecast['heroes'][number]): HTMLElement {
  if (fc.downed) return h('div', { class: 'forecast down', testid: `forecast-${i}` }, icon('ui.downed', 18), h('span', { text: 'DOWN!' }));
  if (fc.hpLoss > 0) return h('div', { class: 'forecast hit', testid: `forecast-${i}` }, icon('intent.attack', 18), h('b', { class: 'pxn', text: `-${fc.hpLoss}` }));
  return h('div', { class: 'forecast safe', testid: `forecast-${i}`, text: fc.shieldLoss > 0 ? 'blocked' : 'safe' });
}

/** The line under "End Turn": exactly what the enemies will do to the party. */
function forecastLine(fc: EnemyForecast, total: number, danger: string, downed: string[]): HTMLElement {
  const line = (text: string, ...kids: Node[]): HTMLElement => h('small', { testid: 'end-turn-forecast', attrs: { 'aria-label': text } }, ...kids);
  if (danger === 'wipe') return line('Party wipe!', h('span', { text: 'PARTY WIPE!' }));
  if (danger === 'down') return line(`${downed.join(' & ')} down!`, h('span', { text: `${downed.join(' & ')} down!` }));
  if (total === 0) {
    const text = fc.rerollsStolen > 0 ? `safe, -${fc.rerollsStolen} reroll` : 'no damage';
    return line(text, h('span', { text }));
  }
  const parts = fc.heroes.map((x) => x.hpLoss).join('/');
  return line(`incoming ${parts}`, icon('intent.attack', 18), h('b', { class: 'pxn', text: parts }));
}

function setBanner(sets: ActiveSet[], phase: string): HTMLElement {
  const s = sets[0];
  if (!s) return h('span', { class: 'set-banner none', testid: 'set-banner', text: phase === 'rolling' ? 'No set' : '' });
  const def = content.sets.find((d) => d.kind === s.kind && d.symbol === (s.symbol ?? undefined)) ?? content.sets.find((d) => d.kind === s.kind && !d.symbol);
  const b = h('button', { class: `set-banner ${s.kind}`, testid: 'set-banner', attrs: { 'data-set-kind': s.kind } },
    h('span', { class: 'set-chip' }, icon(`set.${s.kind}`, 18), h('span', { text: `${def?.name ?? s.kind}${def ? ` +${def.dieBonus}` : ''}` })),
  );
  b.addEventListener('click', () => showSetInfo(s.kind, s.symbol));
  return b;
}

interface HintCtx {
  lifted: DieView | undefined;
  pv: DiePreview | null;
  run: RunState;
  rolling: boolean;
  locksOn: boolean;
  canUndo: boolean;
  rerollsLeft: number;
  diceUsed: number;
  unused: number;
}

/** One short sentence that changes with what the player can do next. */
function hintText(c: HintCtx): string {
  if (c.lifted) {
    const face = c.run.heroes[c.lifted.hero]?.faces[c.lifted.faceIndex];
    const extra = c.pv && c.pv.rerollsNextTurn ? ` (+${c.pv.rerollsNextTurn} reroll next turn)` : '';
    return `${face?.name ?? 'Die'}: tap a glowing target${extra}`;
  }
  if (c.rolling) return c.locksOn ? 'Tap a die to use it, or lock some and reroll' : 'Tap a die to use it';
  if (c.diceUsed === 1 && c.rerollsLeft > 0 && c.canUndo) return 'Changed your mind? Undo brings your rerolls back.';
  if (c.unused === 0) return 'All dice used: End Turn';
  return `${c.unused} ${c.unused === 1 ? 'die' : 'dice'} left: tap one to use it`;
}

/** The icon, value and badges drawn on a die's face. Also used by the flip animation. */
function faceContent(effect: string, value: number, cursed = false): Node[] {
  // A cursed face is only the body and the cracked overlay (drawn by the die itself): no toy, no number.
  if (cursed) return [h('b', { class: 'die-value die-word', text: 'Cursed' })];
  const face = spriteImg(`die.face_${effect}`, KIT_SCALE, 'die-face-art');
  if (effect === 'blank') return [face, h('b', { class: 'die-value die-word', text: cursed ? 'Cursed' : 'Blank' })];
  const text = String(value);
  return [face, h('b', { class: `die-value pxn${text.length > 1 ? ' two' : ''}`, text })];
}

/** The padlock under a die: open = will be rerolled, closed = kept, chain = jammed by an enemy. */
function lockButton(dv: DieView, on: boolean, first: boolean, onTap: () => void): HTMLElement {
  const state = dv.jammed ? 'chain' : dv.locked ? 'closed' : 'open';
  const label = dv.jammed ? 'Jammed by an enemy' : dv.locked ? 'Kept: tap to release' : 'Tap to keep through a reroll';
  const el = h('button', {
    class: `lock-btn ${state}${on ? '' : ' gone'}`,
    testid: `lock-${dv.die}`,
    attrs: { 'data-locked': String(dv.locked), 'data-jammed': String(dv.jammed), 'aria-label': label, 'aria-pressed': String(dv.locked), ...(on ? {} : { 'aria-hidden': 'true', tabindex: '-1' }) },
  },
    h('span', { class: 'lock-word', text: dv.jammed ? 'Jammed' : dv.locked ? 'Kept' : 'Keep' }),
    first ? h('span', { class: 'lock-first', testid: `lock-first-${dv.die}`, text: '1st' }) : null,
  );
  el.addEventListener('click', onTap);
  return el;
}

function dieButton(dv: DieView, run: RunState, selected: boolean, pending: boolean, onTap: () => void, onPeek: () => void): HTMLElement {
  const hero = run.heroes[dv.hero];
  const heroId = hero?.heroId ?? '';
  const face = hero?.faces[dv.faceIndex];
  // All die sprites share one canvas and anchor: stack them at the same spot.
  const faceEl = h('span', { class: `die-face${pending ? ' pending' : ''}${dv.effect === 'blank' ? ' blank' : ''}` }, ...faceContent(dv.effect, dv.value, dv.cursed));
  const valueEl = faceEl.querySelector('.die-value');
  valueEl?.setAttribute('data-testid', `die-value-${dv.die}`);
  const badges: Node[] = [];
  if (dv.symbol && dv.effect !== 'blank') badges.push(icon(symbolIcon(dv.symbol), 18, 'die-symbol'));
  for (const k of dv.keywords.slice(0, 3)) badges.push(icon(`kw.${k}`, 18, 'die-kw'));
  const el = h('button', {
    class: `die${dv.locked ? ' locked' : ''}${dv.jammed ? ' jammed' : ''}${dv.used ? ' used' : ''}${selected ? ' selected' : ''}${dv.cursed ? ' cursed' : ''}${dv.effect === 'blank' ? ' blank' : ''}${dv.usable ? '' : ' unusable'}`,
    testid: `die-${dv.die}`,
    attrs: {
      'aria-label': `${face?.name ?? 'die'} ${dv.effect} ${dv.value}`,
      'data-effect': dv.effect,
      'data-value': String(dv.value),
      'data-face': String(dv.faceIndex),
      'data-locked': String(dv.locked),
      'data-jammed': String(dv.jammed),
      'data-used': String(dv.used),
      'data-hero': String(dv.hero),
      'data-targets': String(dv.needsTarget ? dv.targets.length : 0),
    },
    style: {
      width: `${DIE_W}px`,
      height: `${DIE_H}px`,
      '--num-x': `${LAYOUT.die.right.x * KIT_SCALE}px`,
      '--num-y': `${LAYOUT.die.right.y * KIT_SCALE}px`,
      '--top-x': `${LAYOUT.die.top.x * KIT_SCALE}px`,
      '--top-y': `${LAYOUT.die.top.y * KIT_SCALE}px`,
    },
  },
    spriteImg(`die.${heroId}`, KIT_SCALE, 'die-body'),
    spriteImg('die.used', KIT_SCALE, 'die-used'),
    faceEl,
    dv.locked ? spriteImg('die.locked', KIT_SCALE, 'die-overlay') : null,
    dv.jammed ? spriteImg('die.jammed', KIT_SCALE, 'die-overlay') : null,
    dv.cursed ? spriteImg('die.cursed', KIT_SCALE, 'die-overlay') : null,
    badges.length > 0 ? h('span', { class: 'die-badges' }, ...badges) : null,
  );
  el.addEventListener('click', onTap);
  onLongPress(el, onPeek);
  return el;
}
