import '../fight.css';
import type { Action, ActiveSet, DiePreview, DieView, EnemyForecast, EnemyState, GameEvent, GameState, RunState, TargetRef } from '@shared';
import { IllegalActionError } from '@shared';
import { animate, motionReduced, track, waitAnimations } from '../anim';
import { spriteImg, spriteInfo } from '../art';
import { clear, h } from '../dom';
import { content, engine } from '../engine';
import { fadeOut, flash, flip, floatText, hop, pop, shake } from '../fx';
import { showDieInfo, showEnemyInfo, showFuryInfo, showHeroInfo, showIntentInfo, showItemInfo, showSetInfo } from '../info';
import { dispatch, game, go, incoming } from '../store';
import { tutorialAfter, tutorialAttach, tutorialNoteIntentOpened, tutorialNoteUseDice } from '../tutorial';
import { confirmDialog, modal, onLongPress, toast } from '../ui';
import { actionIconId, actionLine, effectIcon, enemyDef, itemName, enemyName, enemySpriteId, heroName, heroSpriteId, shortName, statusDef, symbolIcon } from '../view';
import type { Screen } from './types';

interface FightUi {
  key: string;
  selected: number | null;
  mode: 'lock' | 'act';
  /** The player pressed "Lock" to go back: do not switch to use mode automatically this turn. */
  manualLock: boolean;
}
const ui: FightUi = { key: '', selected: null, mode: 'lock', manualLock: false };

interface Ghost {
  rect: DOMRect;
  sprite: string;
}

const refKey = (t: TargetRef): string => (t.side === 'enemy' ? `e${t.uid}` : `h${t.index}`);
const sameRef = (a: TargetRef, b: TargetRef): boolean => refKey(a) === refKey(b);

function tryDispatch(action: Action): boolean {
  try {
    dispatch(action);
    return true;
  } catch (e) {
    toast(e instanceof IllegalActionError ? e.message.replace(/^\w+: /, '') : 'That did not work.');
    return false;
  }
}

function previewText(p: DiePreview['hits'][number]): string {
  const parts: string[] = [];
  if (p.kills) parts.push('KO');
  if (p.hpLoss > 0) parts.push(`-${p.hpLoss}`);
  if (p.shieldLoss > 0) parts.push(`-${p.shieldLoss}\u{1F6E1}`);
  if (p.shieldGain > 0) parts.push(`+${p.shieldGain}\u{1F6E1}`);
  if (p.heal > 0) parts.push(`+${p.heal}HP`);
  if (p.poison > 0) parts.push(`${p.poison} poison`);
  if (p.weaken > 0) parts.push(`weak ${p.weaken}`);
  return parts.join(' ') || '0';
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
  die: number;
}

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

  const act = (a: Action): void => {
    tryDispatch(a);
  };

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
      for (let E = H; E >= 1; E -= 0.5) {
        // Enemies must fit side by side.
        let es = E;
        while (es > 1 && normals * 52 * es + bossCount * 64 * es + 8 * (n - 1) > W) es -= 0.5;
        const widthLeft = W - normals * 52 * es - 8 * (n - 1);
        const bossMax = bossCount > 0 ? Math.max(es, Math.floor(Math.min(es * 1.5, widthLeft / (64 * bossCount), 3) * 2) / 2) : es;
        for (const die of H === 2 && E === 2 ? [3, 2] : [2]) {
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
    const last = configs[configs.length - 1] ?? { enemy: 1, boss: 1, hero: 1, die: 2 };
    const pick = Math.min(level, configs.length - 1);
    return { ...(configs[pick] ?? last), last: pick >= configs.length - 1 };
  }

  /** True if the enemy row's contents are taller than the row, or the whole screen overflows. */
  function overflows(): boolean {
    const row = root.querySelector<HTMLElement>('.row.enemies');
    return !!root.isConnected && ((!!row && row.scrollHeight > row.clientHeight + 1) || root.scrollHeight > root.clientHeight + 2);
  }

  /** Measure; if the screen does not fit, shrink step by step (and finally drop the extra intent detail). */
  function fit(events: GameEvent[], action: Action | null, defer: boolean): void {
    for (let guard = 0; guard < MAX_LEVEL + 3 && overflows(); guard += 1) {
      if (atSmallest) {
        if (tight) break;
        tight = true;
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
      ui.mode = 'lock';
      ui.manualLock = false;
    }
    const dice = engine.dice(g);
    let autoSwitched = false;
    if (f.phase === 'acting') ui.mode = 'act';
    else if (ui.mode === 'lock' && !ui.manualLock && !engine.canApply(g, { type: 'reroll' })) {
      // No reroll is possible (none left, or every die is locked or jammed): go straight to using dice.
      ui.mode = 'act';
      autoSwitched = true;
    }
    if (ui.selected !== null && !dice[ui.selected]?.usable) ui.selected = null;
    const forecast = engine.forecast(g);
    const sets = engine.previewSets(g);
    const selDie = ui.selected !== null ? dice[ui.selected] : undefined;

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
    if (selDie?.needsTarget) for (const t of selDie.targets) targetable.add(refKey(t));

    const sc = sizes(run, level);
    atSmallest = !!sc.last;
    const useOn = (t: TargetRef): void => {
      if (ui.selected === null) return;
      const die = ui.selected;
      ui.selected = null;
      act({ type: 'useDie', die, target: t });
    };

    // ------------------------------------------------ status bar
    const status = h('header', { class: 'fight-status' },
      h('div', { class: 'pips', testid: 'fight-progress', attrs: { 'aria-label': `Act ${run.act}, fight ${run.slot}` } },
        h('span', { class: 'act-label', text: `Act ${run.act}` }),
        ...[1, 2, 3, 4].map((s) => h('span', { class: `pip${s < run.slot ? ' done' : ''}${s === run.slot ? ' now' : ''}${s === 4 ? ' boss' : ''}` })),
      ),
      furyBadge(f.turn),
      h('div', { class: 'status-right' },
        h('span', { class: 'gold', testid: 'gold' }, spriteImg('ui.gold', 1), h('b', { text: String(run.gold) })),
        run.tier > 0 ? h('span', { class: 'tier', testid: 'tier', text: `T${run.tier}` }) : null,
        h('button', { class: 'icon-btn menu-btn', testid: 'btn-menu', text: '☰', attrs: { 'aria-label': 'Menu' }, onClick: () => openMenu(run) }),
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
        ? h('div', { class: 'intent', testid: `intent-${e.uid}`, attrs: { role: 'button', 'aria-label': `${enemyName(e.enemyId)} intends ${intent.moveName}` } },
            def?.kind === 'boss' || intent.moveName.includes('(') ? h('div', { class: 'intent-move', text: intent.moveName }) : null,
            ...intent.actions.map((a) => h('div', { class: `chip intent-line ${a.type}` }, spriteImg(actionIconId(a), intent.actions.length > 1 ? 1 : 2), h('span', { class: 'intent-text', text: actionLine(run, a) }))),
          )
        : h('div', { class: 'intent' });
      if (intent) {
        onLongPress(bubble, () => showIntentInfo(e.uid));
        bubble.addEventListener('click', (ev) => {
          ev.stopPropagation();
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
        h('div', { class: 'sprite-box' }, spriteImg(enemySpriteId(e.enemyId), scale)),
        hpBar(shownHp(k, e.hp, e.maxHp), e.maxHp, shownSh(k, e.shield), `enemy-hp-${e.uid}`),
        statusRow(e.statuses),
        pv ? h('div', { class: `preview${pv.kills ? ' kill' : ''}`, testid: `preview-enemy-${e.uid}`, text: previewText(pv) }) : null,
        h('div', { class: 'unit-name', text: def?.name ?? e.enemyId }),
      );
      unit.addEventListener('click', () => {
        if (isTarget) useOn({ side: 'enemy', uid: e.uid });
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
    const heroRow = h('section', { class: 'row heroes', testid: 'hero-row' },
      ...run.heroes.map((hs, i) => {
        const hf = f.heroes[i];
        const k = `h${i}`;
        const pv = previewByTarget.get(k);
        const fc = forecast.heroes[i];
        const isTarget = targetable.has(k);
        const sel = selDie && selDie.hero === i;
        const selfLoss = sel && previewAll ? previewAll.selfHpLoss : 0;
        const unit = h('div', {
          class: `unit hero${hs.downed ? ' downed' : ''}${isTarget ? ' targetable' : ''}${sel ? ' owner' : ''}`,
          testid: `hero-${i}`,
          attrs: { role: 'button', 'aria-label': heroName(hs.heroId) },
        },
          h('div', { class: 'sprite-box' }, spriteImg(heroSpriteId(hs.heroId), sc.hero), hs.downed ? spriteImg('ui.downed', 2, 'downed-icon') : null),
          hpBar(hs.downed ? shownHp(k, 0, hs.maxHp) : shownHp(k, hs.hp, hs.maxHp), hs.maxHp, shownSh(k, (hf?.shield ?? 0) + (hf?.ward ?? 0)), `hero-hp-${i}`, hf?.ward ? 'ward' : ''),
          statusRow(hf?.statuses ?? {}),
          h('div', { class: 'unit-name', text: shortName(hs.heroId) }),
          hs.items.length > 0
            ? h('div', { class: 'unit-items', testid: `hero-items-${i}` }, ...hs.items.map((it) => {
                const b = h('button', { class: 'mini-item', testid: `hero-item-${it}`, attrs: { 'data-item': it, 'aria-label': itemName(it) } }, spriteImg(`item.${it}`, 1));
                b.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  showItemInfo(it);
                });
                return b;
              }))
            : null,
          pv || selfLoss ? h('div', { class: `preview${pv?.kills ? ' kill' : ''}`, testid: `preview-hero-${i}`, text: [pv ? previewText(pv) : '', selfLoss ? `self -${selfLoss}` : ''].filter(Boolean).join(' ') }) : null,
          !hs.downed && fc ? forecastChip(i, fc) : null,
          fc?.jammed ? h('div', { class: 'warn-chip', testid: `jam-warning-${i}`, text: 'jam' }) : null,
        );
        unit.addEventListener('click', () => {
          if (isTarget) useOn({ side: 'hero', index: i });
          else showHeroInfo(i);
        });
        onLongPress(unit, () => showHeroInfo(i));
        return unit;
      }),
    );

    // ------------------------------------------------ dice tray
    const setLine = setBanner(sets, f.phase);
    const lockMode = f.phase === 'rolling' && ui.mode === 'lock';
    const tray = h('section', { class: `tray ${lockMode ? 'mode-lock' : 'mode-act'}`, testid: 'dice-tray', attrs: { 'data-mode': lockMode ? 'lock' : 'act' } },
      h('div', { class: 'tray-head' },
        h('span', { class: 'mode-pill', testid: 'mode-pill', text: lockMode ? `Turn ${f.turn} · LOCK` : `Turn ${f.turn} · USE` }),
        h('span', { class: 'hint-line', testid: 'hint-line', text: hintText(selDie, previewAll, run, lockMode) }),
        setLine,
      ),
      h('div', { class: 'dice' },
        ...dice.map((dv) => dieButton(dv, run, sc.die, ui.selected === dv.die, rolledNow.has(dv.die), (d) => onDieTap(d, f.phase))),
      ),
    );

    // ------------------------------------------------ action bar
    const rolling = f.phase === 'rolling';
    const canReroll = engine.canApply(g, { type: 'reroll' });
    const canUndo = engine.canApply(g, { type: 'undo' });
    const downedHeroes = forecast.heroes.map((x, i) => (x.downed ? shortName(run.heroes[i]?.heroId ?? '') : '')).filter(Boolean);
    const danger = forecast.partyWipe ? 'wipe' : downedHeroes.length > 0 ? 'down' : '';
    const totalIn = forecast.heroes.reduce((s, x) => s + x.hpLoss, 0);

    const rerollBtn = (disabled: boolean): HTMLElement =>
      h('button', { class: 'btn act-btn reroll', testid: 'btn-reroll', disabled, onClick: () => act({ type: 'reroll' }) },
        spriteImg('ui.reroll', 2), h('span', { text: `Reroll (${f.rerollsLeft})`, testid: 'rerolls-left' }));

    const leftBtn = lockMode
      ? rerollBtn(!canReroll)
      : rolling
        ? h('button', {
            class: 'btn act-btn',
            testid: 'btn-back-to-lock',
            onClick: () => {
              ui.mode = 'lock';
              ui.manualLock = true;
              ui.selected = null;
              paint();
            },
          }, spriteImg('ui.lock', 2), h('span', { text: 'Lock' }))
        : rerollBtn(true);

    const midBtn = lockMode
      ? h('button', {
          class: 'btn act-btn primary',
          testid: 'btn-use-dice',
          onClick: () => {
            tutorialNoteUseDice();
            ui.mode = 'act';
            ui.selected = null;
            paint();
          },
        }, spriteImg('ui.play', 2), h('span', { text: 'Use dice' }))
      : h('button', { class: 'btn act-btn', testid: 'btn-undo', disabled: !canUndo, onClick: () => act({ type: 'undo' }) }, spriteImg('ui.undo', 2), h('span', { text: 'Undo' }));

    const endBtn = h('button', {
      class: `btn act-btn end${danger ? ` ${danger}` : ''}`,
      testid: 'btn-end-turn',
      onClick: () => endTurn(run, forecast, danger),
    },
      spriteImg('ui.end_turn', 2),
      h('span', { class: 'end-text' },
        h('b', { text: 'End Turn' }),
        h('small', { testid: 'end-turn-forecast', text: forecastSummary(forecast, totalIn, danger, downedHeroes) }),
      ),
    );

    clear(root);
    root.classList.toggle('tight', tight);
    root.style.backgroundImage = `url(${import.meta.env.BASE_URL}art/bg.act${run.act}.png)`;
    root.append(status, enemyRow, heroRow, tray, h('footer', { class: 'actions' }, leftBtn, midBtn, endBtn), fxLayer);
    tutorialAttach(root, { events, action, run });
    if (autoSwitched) tutorialNoteUseDice();
    lastLevel = level;
    if (!noFit) fit(events, action, defer);
    if (!defer && events.length > 0) playEvents(events, g);
  }

  function onDieTap(dv: DieView, phase: 'rolling' | 'acting'): void {
    if (phase === 'rolling' && ui.mode === 'lock') {
      if (dv.jammed) {
        toast('Jammed by an enemy: this die cannot be rerolled.');
        return;
      }
      act({ type: 'toggleLock', die: dv.die });
      return;
    }
    if (!dv.usable) {
      toast(dv.used ? 'Already used this turn.' : 'That die cannot be used.');
      return;
    }
    if (ui.selected === dv.die) {
      if (!dv.needsTarget) {
        ui.selected = null;
        act({ type: 'useDie', die: dv.die });
      } else {
        ui.selected = null;
        paint();
      }
      return;
    }
    ui.selected = dv.die;
    paint();
  }

  function endTurn(run: RunState, fc: EnemyForecast, danger: string): void {
    const go = (): void => act({ type: 'endTurn' });
    if (!danger) {
      go();
      return;
    }
    const names = fc.heroes.map((x, i) => (x.downed ? heroName(run.heroes[i]?.heroId ?? '') : '')).filter(Boolean);
    void confirmDialog({
      testid: 'confirm-end-turn',
      title: fc.partyWipe ? 'Your whole party would fall!' : 'A hero would be downed',
      text: fc.partyWipe ? 'If you end the turn now every hero goes down and the run is over.' : `If you end the turn now, ${names.join(' and ')} would be downed for the rest of the fight.`,
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
              if (ok) tryDispatch({ type: 'abandonRun' });
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
    const scale = Number(el.dataset['scale'] ?? 2);
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
        faceEl.replaceChildren(...faceContent(f.effect, f.symbol, f.value, scale));
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
          t += 60;
          break;
        }
        case 'lockToggled': {
          const el = root.querySelector<HTMLElement>(`[data-testid="die-${ev.die}"]`);
          if (el) void pop(el, 0);
          break;
        }
        case 'dieUsed': {
          const he = root.querySelector<HTMLElement>(`[data-testid="hero-${ev.hero}"] .sprite-box`);
          if (he) void hop(he, 0, -14, t);
          t += 130;
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
          if (el) void floatText(el, `+${ev.amount}\u{1F6E1}`, 'shield', t);
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
          if (el) void floatText(el, `+${ev.amount}`, 'heal', t);
          t += 90;
          break;
        }
        case 'status': {
          const el = unitEl(ev.target);
          if (el) void floatText(el, `${statusDef(ev.status)?.name ?? ev.status} ${ev.amount > 0 ? '+' : ''}${ev.amount}`, 'status', t);
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
            const b = h('div', { class: 'banner', testid: 'banner-victory', text: 'Victory!' });
            fxLayer.append(b);
            void animate(b, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.4 }, { opacity: 1, transform: 'scale(1)', offset: 0.8 }, { opacity: 0 }], { duration: 900, delay: t, fill: 'both' }).then(() => b.remove());
          }
          t += 300;
          break;
        default:
          break;
      }
    }
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

function hpBar(hp: number, max: number, shield: number, testid: string, extra = ''): HTMLElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const fill = h('div', { class: `hp-fill${pct <= 0.34 ? ' low' : ''}` });
  fill.style.transform = `scaleX(${pct})`;
  const badge = h('span', { class: 'shield-badge' }, spriteImg(extra === 'ward' ? 'ui.ward' : 'ui.shield', 1), h('b', { text: String(shield) }));
  if (shield <= 0) badge.style.display = 'none';
  return h('div', { class: `hp ${extra}`, testid, attrs: { 'data-max': String(max), 'data-hp': String(hp), 'data-sh': String(shield) } },
    h('div', { class: 'hp-track' }, fill),
    h('span', { class: 'hp-text', text: `${hp}/${max}` }),
    badge,
  );
}

/** "Fury" anti-stall rule: warn one turn before, then show a badge. Tap for the exact rule. */
function furyBadge(turn: number): HTMLElement | null {
  const fury = content.rules.fury;
  if (!fury) return null;
  const active = turn >= fury.fromTurn;
  const next = turn === fury.fromTurn - 1;
  if (!active && !next) return null;
  const b = h('button', { class: `fury-badge${active ? ' on' : ' soon'}`, testid: 'fury-badge', text: active ? 'FURY' : 'Fury next turn', attrs: { 'data-active': String(active) } });
  b.addEventListener('click', () => showFuryInfo());
  return b;
}

function statusRow(st: Partial<Record<string, number>>): HTMLElement {
  const entries = Object.entries(st).filter(([, n]) => (n ?? 0) > 0);
  return h('div', { class: 'statuses' },
    ...entries.map(([id, n]) => h('span', { class: 'status-chip', testid: `status-${id}`, attrs: { title: statusDef(id)?.name ?? id } }, spriteImg(`status.${id}`, 1), h('b', { text: String(n) }))),
  );
}

function forecastChip(i: number, fc: EnemyForecast['heroes'][number]): HTMLElement {
  if (fc.downed) return h('div', { class: 'forecast down', testid: `forecast-${i}`, text: 'DOWN!' });
  if (fc.hpLoss > 0) return h('div', { class: 'forecast hit', testid: `forecast-${i}`, text: `-${fc.hpLoss}` });
  return h('div', { class: 'forecast safe', testid: `forecast-${i}`, text: fc.shieldLoss > 0 ? 'blocked' : 'safe' });
}

function forecastSummary(fc: EnemyForecast, total: number, danger: string, downed: string[]): string {
  if (danger === 'wipe') return 'PARTY WIPE!';
  if (danger === 'down') return `${downed.join(' & ')} down!`;
  const parts = fc.heroes.map((x) => x.hpLoss);
  if (total === 0) return fc.rerollsStolen > 0 ? `no damage, -${fc.rerollsStolen} reroll` : 'no damage';
  return `incoming ${parts.join('/')}`;
}

function setBanner(sets: ActiveSet[], phase: string): HTMLElement {
  const s = sets[0];
  if (!s) return h('span', { class: 'set-banner none', testid: 'set-banner', text: phase === 'rolling' ? 'No set' : '' });
  const def = content.sets.find((d) => d.kind === s.kind && d.symbol === (s.symbol ?? undefined)) ?? content.sets.find((d) => d.kind === s.kind && !d.symbol);
  const b = h('button', { class: `set-banner ${s.kind}`, testid: 'set-banner', attrs: { 'data-set-kind': s.kind } },
    spriteImg(`set.${s.kind}`, 1),
    h('span', { text: `${def?.name ?? s.kind}${def ? ` +${def.dieBonus}` : ''}` }),
  );
  b.addEventListener('click', () => showSetInfo(s.kind, s.symbol));
  return b;
}

function hintText(sel: DieView | undefined, pv: DiePreview | null, run: RunState, lockMode: boolean): string {
  if (!sel) return lockMode ? 'Tap dice to lock, then Reroll' : 'Tap a die, then a target';
  const face = run.heroes[sel.hero]?.faces[sel.faceIndex];
  const base = face?.name ?? 'Die';
  const extra = pv && pv.rerollsNextTurn ? ` (+${pv.rerollsNextTurn} reroll next turn)` : '';
  return sel.needsTarget ? `${base}: tap a glowing target${extra}` : `${base}: tap again to use${extra}`;
}

/** The icon, value and badges drawn on a die's face. Also used by the flip animation. */
function faceContent(effect: string, symbol: string | null, value: number, scale: number, cursed = false): Node[] {
  if (effect === 'blank') {
    return [spriteImg('die.blank', scale >= 3 ? 2 : 1, 'die-icon'), h('b', { class: 'die-value die-word', text: cursed ? 'Cursed' : 'Blank' })];
  }
  void symbol;
  return [spriteImg(effectIcon(effect as never), scale >= 3 ? 3 : 2, 'die-icon'), h('b', { class: 'die-value', text: String(value) })];
}

function dieButton(dv: DieView, run: RunState, scale: number, selected: boolean, pending: boolean, onTap: (d: DieView) => void): HTMLElement {
  const hero = run.heroes[dv.hero];
  const heroId = hero?.heroId ?? '';
  const face = hero?.faces[dv.faceIndex];
  const body = spriteInfo(`die.${heroId}`);
  const w = (body?.w ?? 32) * scale;
  const hh = (body?.h ?? 37) * scale;
  const faceEl = h('span', { class: `die-face${pending ? ' pending' : ''}${dv.effect === 'blank' ? ' blank' : ''}` }, ...faceContent(dv.effect, dv.symbol, dv.value, scale, dv.cursed));
  const valueEl = faceEl.querySelector('.die-value');
  valueEl?.setAttribute('data-testid', `die-value-${dv.die}`);
  const el = h('button', {
    class: `die${dv.locked ? ' locked' : ''}${dv.jammed ? ' jammed' : ''}${dv.used ? ' used' : ''}${selected ? ' selected' : ''}${dv.cursed ? ' cursed' : ''}${dv.usable ? '' : ' unusable'}`,
    testid: `die-${dv.die}`,
    attrs: {
      'aria-label': `${face?.name ?? 'die'} ${dv.effect} ${dv.value}`,
      'data-effect': dv.effect,
      'data-value': String(dv.value),
      'data-face': String(dv.faceIndex),
      'data-locked': String(dv.locked),
      'data-used': String(dv.used),
      'data-hero': String(dv.hero),
      'data-scale': String(scale),
    },
    style: { width: `${Math.max(w, 64)}px`, height: `${Math.max(hh, 64)}px` },
  },
    spriteImg(`die.${heroId}`, scale, 'die-body'),
    dv.used ? spriteImg('die.used', scale, 'die-overlay used-overlay') : null,
    dv.locked ? spriteImg('die.locked', scale, 'die-overlay') : null,
    dv.jammed ? spriteImg('die.jammed', scale, 'die-overlay') : null,
    dv.cursed ? spriteImg('die.cursed', scale, 'die-overlay') : null,
    faceEl,
    dv.symbol && dv.effect !== 'blank' ? h('span', { class: 'die-symbol' }, spriteImg(symbolIcon(dv.symbol), 1)) : null,
    dv.keywords.length > 0 ? h('span', { class: 'die-kws' }, ...dv.keywords.slice(0, 3).map((k) => spriteImg(`kw.${k}`, 1))) : null,
  );
  el.addEventListener('click', () => onTap(dv));
  onLongPress(el, () => showDieInfo(dv));
  return el;
}
