/**
 * The skilled bot: a strong, honest player.
 *
 * Rolling: picks what to lock by expected value over every possible reroll outcome (model.ts).
 * Acting: tries the dice in every order and on every sensible target using the engine's exact
 *   results, and scores each end position with the engine's exact enemy forecast, so it kills
 *   before a trick or a big hit lands, blocks lethal damage and focuses fire.
 * Between fights: drafts faces, upgrades and items by estimated value per turn (draft.ts), heals
 *   when hurt, shops when rich, and can commit to a named strategy (strategies.ts).
 * It only ever uses the public Engine interface and never looks at future rolls.
 */
import type { Action, DieView, EventChoiceDef, GameState, RunState, TargetRef } from '@shared';
import type { DraftCtx } from './draft';
import { makeDraftCtx, planFace, planItem, planUpgrade } from './draft';
import { K } from './knobs';
import type { RollCtx } from './model';
import { buildRollCtx, chooseReroll } from './model';
import type { Bot, BotEnv } from './runner';
import type { Strategy } from './strategies';

export interface SkilledOptions {
  strategy: Strategy | null;
  /** Self-imposed rules for scripted feat checks. */
  quirk?: 'noRerollBoss';
}

const HP_VALUE = K.hpValue;
/** Turns after which a single fight counts as a stalemate and the bot abandons the run (a loss). */
export const STALL_TURNS = 60;
const poisonTotal = (p: number): number => (p * (p + 1)) / 2;

// ---------------------------------------------------------------- fight: scoring a position

/** Score of the position if the player ended the turn now. Uses the engine's exact forecast. */
export function scorePosition(env: BotEnv, game: GameState, start: RunState): number {
  const run = game.run;
  if (!run || run.phase === 'defeat') return -1e6;
  const hpSum = (r: RunState): number => r.heroes.reduce((n, h) => n + (h.downed ? 0 : h.hp), 0);
  if (run.phase !== 'fight' || !run.fight || run.fightsWon > start.fightsWon) return 1e5 + hpSum(run) * 10 - run.heroes.filter((h) => h.downed).length * 50;
  const f = run.fight;
  const fc = env.engine.forecast(game);
  if (fc.partyWipe) return -1e5 + hpSum(run);
  let s = 0;
  run.heroes.forEach((h, i) => {
    if (h.downed) { s -= K.down + 0.4 * h.maxHp; return; }
    const x = fc.heroes[i]!;
    if (x.downed) { s -= K.down + 0.4 * h.maxHp; return; }
    const after = h.hp - x.hpLoss;
    s += K.hp * after;
    if (after <= 3) s -= K.low;
    const hf = f.heroes[i]!;
    s += 0.35 * Math.min(8, Math.max(0, hf.ward - x.shieldLoss));
    if (x.jammed) s -= 1.2;
    if (x.cursedFace !== null) s -= 1.8;
    let grown = 0;
    for (const g of hf.growth) grown += g;
    s += 0.4 * Math.min(8, grown);
    s -= 0.5 * poisonTotal(hf.statuses.poison ?? 0);
  });
  s -= 0.8 * fc.rerollsStolen;
  s += 0.7 * Math.min(3, f.nextTurnRerolls);
  for (const e of f.enemies) {
    if (e.hp <= 0) continue;
    const p = e.statuses.poison ?? 0;
    const left = Math.max(0, e.hp - 0.85 * poisonTotal(p));
    if (p >= e.hp) continue; // dies to poison before it can act: already counted by the forecast
    s -= K.enemy * left + 0.25 * e.shield;
    s -= K.alive;
  }
  return s;
}

// ---------------------------------------------------------------- fight: choosing how to use the dice

function signature(run: RunState): string {
  const f = run.fight;
  if (!f) return `over${run.fightsWon}`;
  let s = '';
  for (const e of f.enemies) s += `${e.uid}:${e.hp}:${e.shield}:${e.statuses.poison ?? 0}:${e.statuses.weak ?? 0}:${e.statuses.thorns ?? 0}:${e.intent?.moveId ?? ''}|`;
  run.heroes.forEach((h, i) => {
    const hf = f.heroes[i]!;
    s += `${h.hp}:${hf.shield}:${hf.ward}:${hf.growth.join('')};`;
  });
  for (const d of f.dice) s += `${d.used ? 1 : 0}${d.bonus}`;
  return `${s}r${f.nextTurnRerolls}g${run.gold}`;
}

function candidateTargets(game: GameState, d: DieView, incoming: number[]): (TargetRef | undefined)[] {
  if (!d.needsTarget) return [undefined];
  const run = game.run!;
  if (d.effect === 'damage' || d.effect === 'weaken') return d.targets;
  const heroes = d.targets.filter((t): t is { side: 'hero'; index: number } => t.side === 'hero');
  let picks: typeof heroes;
  if (d.effect === 'shield') {
    picks = heroes.filter((t) => (incoming[t.index] ?? 0) > 0);
    if (!picks.length) picks = heroes.filter((t) => t.index === d.hero);
  } else {
    picks = heroes.filter((t) => run.heroes[t.index]!.hp < run.heroes[t.index]!.maxHp);
    picks.sort((a, b) => (run.heroes[a.index]!.hp / run.heroes[a.index]!.maxHp) - (run.heroes[b.index]!.hp / run.heroes[b.index]!.maxHp));
    picks = picks.slice(0, 2);
  }
  if (!picks.length) picks = heroes.slice(0, 1);
  return picks;
}

/** Searches every order and target for the remaining dice; returns the best sequence of uses. */
export function planDice(env: BotEnv, game: GameState): Action[] {
  const { engine } = env;
  const start = game.run!;
  const rootForecast = engine.forecast(game);
  const incoming = rootForecast.heroes.map((h) => h.hpLoss);
  const seen = new Map<string, number>();
  let bestScore = -Infinity;
  let bestPlan: Action[] = [];
  let nodes = 0;
  const visit = (state: GameState, plan: Action[]): void => {
    const run = state.run;
    const over = !run || run.phase !== 'fight' || !run.fight || run.fightsWon > start.fightsWon;
    const dice = over ? [] : engine.dice(state).filter((d) => d.usable);
    // Every position is a possible place to stop, but only score it when stopping could be right:
    // at the end, or when a remaining die might cost more than it gives.
    const risky = dice.some((d) => d.keywords.includes('reckless') || d.effect === 'blank')
      || (!over && run!.fight!.enemies.some((e) => (e.statuses.thorns ?? 0) > 0));
    if (over || dice.length === 0 || risky) {
      const sc = scorePosition(env, state, start);
      if (sc > bestScore) { bestScore = sc; bestPlan = plan; }
    }
    if (over || nodes > 400) return;
    for (const d of dice) {
      if (d.effect === 'blank') continue;
      for (const target of candidateTargets(state, d, incoming)) {
        const action: Action = target ? { type: 'useDie', die: d.die, target } : { type: 'useDie', die: d.die };
        const next = engine.apply(state, action).game;
        nodes++;
        const sig = next.run ? signature(next.run) : 'none';
        if (seen.has(sig)) continue;
        seen.set(sig, 1);
        visit(next, [...plan, action]);
      }
    }
  };
  visit(game, []);
  return bestPlan;
}

// ---------------------------------------------------------------- the bot

export function skilledBot(opts: SkilledOptions): Bot {
  let dc: DraftCtx | null = null;
  let queue: Action[] = [];
  let queueTag = '';
  let rollKey = '';
  let rollMask = 0;
  let rollCtx: RollCtx | null = null;
  let rollCtxTag = '';

  const turnTag = (run: RunState): string => `${run.seed}|${run.act}.${run.slot}|${run.fightsWon}|${run.fight?.turn ?? 0}`;

  function fight(env: BotEnv, game: GameState): Action {
    const { engine, content } = env;
    const run = game.run!;
    const f = run.fight!;
    const tag = turnTag(run);
    // A fight that will not end (nobody can hurt anybody) is given up, as a player would.
    if (f.turn > STALL_TURNS) return { type: 'abandonRun' };
    if (queueTag === tag && queue.length) {
      const a = queue.shift()!;
      if (engine.canApply(game, a)) return a;
      queue = [];
    }
    if (f.phase === 'acting' && queueTag === tag) return { type: 'endTurn' };

    if (f.phase === 'rolling') {
      const noReroll = opts.quirk === 'noRerollBoss' && f.kind === 'boss';
      const canReroll = f.dice.map((d) => !d.jammed);
      let freeCount = 0;
      let rerollBonus = 0;
      let glove = false;
      let leftover = 0;
      run.heroes.forEach((h, hi) => {
        if (h.downed) return;
        for (const id of h.items) {
          const def = content.items.find((i) => i.id === id);
          for (const m of def?.modifiers ?? []) {
            if (m.type === 'freeSingleReroll') freeCount += m.count;
            else if (m.type === 'rerolledBonus') rerollBonus += 0.8 * m.amount;
            else if (m.type === 'firstLockMultiplier') glove = true;
          }
          for (const t of def?.triggers ?? []) {
            if (t.trigger === 'turnEnd' && t.effects.some((e) => e.type === 'shield' && typeof e.amount === 'object' && e.amount.scale === 'rerollsLeft')) leftover += 0.6;
          }
        }
        void hi;
      });
      const freeSingle = (f.limits['t:free'] ?? 0) < freeCount;
      const showing = f.dice.map((d) => d.face);
      const key = `${tag}|${f.rerollsLeft}|${f.rerollsSpent}|${showing.join('')}|${f.limits['t:free'] ?? 0}`;
      if (key !== rollKey) {
        rollKey = key;
        rollMask = 0;
        if (!noReroll && (f.rerollsLeft > 0 || freeSingle) && canReroll.some((x) => x)) {
          // The forecast must see the dice as unlocked-or-not; locks do not change it.
          // One picture of the situation per turn: what the enemies will do does not change while rolling.
          if (rollCtxTag !== tag || !rollCtx || rollCtx.n !== f.dice.length) {
            const incoming = engine.forecast(game).heroes.map((h) => h.hpLoss);
            rollCtx = buildRollCtx(content, game, incoming);
            rollCtxTag = tag;
          }
          const ctx = rollCtx;
          rollMask = chooseReroll(ctx, showing, f.rerollsLeft, f.rerollsSpent, canReroll, freeSingle, rerollBonus, leftover).reroll;
        }
      }
      const views = glove && !f.dice.some((d) => d.firstLocked) ? engine.dice(game) : null;
      const bestOf = (cands: number[]): number => {
        let b = cands[0]!;
        for (const i of cands) if ((views?.[i]?.value ?? 0) * (views?.[i]?.keywords.includes('twin') ? 2 : 1) > (views?.[b]?.value ?? 0) * (views?.[b]?.keywords.includes('twin') ? 2 : 1)) b = i;
        return b;
      };
      if (rollMask !== 0) {
        const wantLocked = f.dice.map((d, i) => !d.jammed && (rollMask & (1 << i)) === 0);
        if (views) {
          const keep = wantLocked.map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
          if (keep.length) {
            const b = bestOf(keep);
            if (!f.dice[b]!.locked) return { type: 'toggleLock', die: b };
          }
        }
        for (let i = 0; i < f.dice.length; i++) {
          if (!f.dice[i]!.jammed && f.dice[i]!.locked !== wantLocked[i]) return { type: 'toggleLock', die: i };
        }
        if (engine.canApply(game, { type: 'reroll' })) return { type: 'reroll' };
      }
      // Stopping: with the First-Pick Glove, lock the best die first so it is the one doubled.
      if (views) {
        const usable = f.dice.map((_, i) => i).filter((i) => views[i]?.usable && views[i]?.effect !== 'blank');
        if (usable.length) return { type: 'toggleLock', die: bestOf(usable) };
      }
    }
    queue = planDice(env, game);
    queueTag = tag;
    if (queue.length) return queue.shift()!;
    return { type: 'endTurn' };
  }

  function reward(env: BotEnv, game: GameState): Action {
    const run = game.run!;
    const d = dc!;
    let best: Action = { type: 'skipReward' };
    let bestGain = 0.02;
    run.reward!.options.forEach((o, option) => {
      if (o.type === 'item') {
        const p = planItem(d, run, o.item);
        if (p && p.gain > bestGain) {
          bestGain = p.gain;
          best = p.replaceItem === undefined ? { type: 'pickReward', option, hero: p.hero } : { type: 'pickReward', option, hero: p.hero, replaceItem: p.replaceItem };
        }
      } else if (o.type === 'face') {
        const p = planFace(d, run, o.hero, o.face);
        if (p.gain > bestGain) { bestGain = p.gain; best = { type: 'pickReward', option, face: p.face }; }
      } else {
        const p = planUpgrade(d, run, o.hero, o.amount);
        if (p && p.gain > bestGain) { bestGain = p.gain; best = { type: 'pickReward', option, face: p.face }; }
      }
    });
    return best;
  }

  const missingHp = (run: RunState, pct: number): number =>
    run.heroes.reduce((n, h) => n + (h.downed ? 0 : Math.min(h.maxHp - h.hp, Math.floor((h.maxHp * pct) / 100))), 0);
  const downedCount = (run: RunState): number => run.heroes.filter((h) => h.downed).length;

  function bestUpgrade(run: RunState): { hero: number; face: number; gain: number } | null {
    let best: { hero: number; face: number; gain: number } | null = null;
    run.heroes.forEach((_, h) => {
      const p = planUpgrade(dc!, run, h, dc!.content.rules.upgradeAmount);
      if (p && (!best || p.gain > best.gain)) best = { hero: h, face: p.face, gain: p.gain };
    });
    return best;
  }

  function doors(env: BotEnv, game: GameState): Action {
    const run = game.run!;
    const rules = env.content.rules;
    const hpPct = run.heroes.reduce((n, h) => n + (h.downed ? 0 : h.hp), 0) / run.heroes.reduce((n, h) => n + h.maxHp, 0);
    const seek = opts.strategy ? 1.25 : 1;
    let best = 0;
    let bestScore = -Infinity;
    run.doors!.forEach((d, i) => {
      let s = 0;
      switch (d.kind) {
        case 'rest': s = Math.max(missingHp(run, rules.restHealPct) * HP_VALUE, 0.33); break;
        case 'shop': s = Math.min(run.gold, 60) * 0.022 * seek; break;
        case 'treasure': s = 0.95 * seek; break;
        case 'event': s = 0.6 * seek; break;
        case 'elite': s = hpPct > K.eliteHp && downedCount(run) === 0 ? K.elite - (run.act - 1) * 0.15 : -1; break;
        case 'onward': s = 0.05; break;
      }
      if (s > bestScore) { bestScore = s; best = i; }
    });
    return { type: 'pickDoor', door: best };
  }

  function rest(_env: BotEnv, game: GameState): Action {
    const run = game.run!;
    if (!run.rest || run.rest.used) return { type: 'leave' };
    const heal = missingHp(run, dc!.content.rules.restHealPct) * HP_VALUE;
    const up = bestUpgrade(run);
    if (up && up.gain > heal) return { type: 'restUpgrade', hero: up.hero, face: up.face };
    return heal > 0 ? { type: 'restHeal' } : { type: 'leave' };
  }

  function shop(env: BotEnv, game: GameState): Action {
    const run = game.run!;
    const d = dc!;
    let best: Action = { type: 'leave' };
    let bestRate = 0.012; // value per gold needed to bother
    run.shop!.slots.forEach((s, slot) => {
      if (s.sold || s.price > run.gold) return;
      let gain = 0;
      let action: Action | null = null;
      if (s.type === 'item') {
        const p = planItem(d, run, s.item);
        if (p) { gain = p.gain; action = p.replaceItem === undefined ? { type: 'shopBuy', slot, hero: p.hero } : { type: 'shopBuy', slot, hero: p.hero, replaceItem: p.replaceItem }; }
      } else if (s.type === 'face') {
        const p = planFace(d, run, s.hero, s.face);
        gain = p.gain;
        action = { type: 'shopBuy', slot, face: p.face };
      } else if (s.type === 'upgrade') {
        const up = bestUpgrade(run);
        if (up) { gain = up.gain; action = { type: 'shopBuy', slot, hero: up.hero, face: up.face }; }
      } else {
        gain = missingHp(run, env.content.rules.shop.healPct) * HP_VALUE;
        action = { type: 'shopBuy', slot };
      }
      const rate = gain / Math.max(1, s.price);
      if (action && gain > 0.05 && rate > bestRate && env.engine.canApply(game, action)) { bestRate = rate; best = action; }
    });
    return best;
  }

  function choiceValue(env: BotEnv, run: RunState, ch: EventChoiceDef): number {
    const d = dc!;
    let v = -(ch.costGold ?? 0) * 0.02;
    const living = run.heroes.filter((h) => !h.downed);
    for (const o of ch.outcomes) {
      switch (o.type) {
        case 'gold': v += o.amount * 0.02; break;
        case 'heal': {
          const miss = living.map((h) => Math.min(o.amount, h.maxHp - h.hp)).sort((a, b) => b - a);
          v += HP_VALUE * (o.target === 'all' ? miss.reduce((a, b) => a + b, 0) : o.target === 'lowest' ? (miss[0] ?? 0) : (miss.reduce((a, b) => a + b, 0) / Math.max(1, miss.length)));
          break;
        }
        case 'hurt': {
          const n = o.target === 'all' ? living.length : 1;
          const frail = living.some((h) => h.hp <= o.amount + 3);
          v -= HP_VALUE * o.amount * n * (frail ? 2.5 : 1.1);
          break;
        }
        case 'maxHp': v += 0.12 * o.amount * (o.target === 'all' ? run.heroes.length : 1); break;
        case 'item': {
          if (o.item) v += Math.max(0, planItem(d, run, o.item)?.gain ?? 0);
          else v += o.rarity === 'rare' ? 1.2 : o.rarity === 'uncommon' ? 0.85 : 0.6;
          break;
        }
        case 'upgradeFace': v += bestUpgrade(run)?.gain ?? 0; break;
        case 'blankFace': v += opts.strategy?.keepBlanks ? 0.35 : -0.3; break;
        case 'rewardFace': v += o.rarity === 'rare' ? 0.7 : 0.45; break;
        case 'nothing': break;
      }
    }
    void env;
    return v;
  }

  function event(env: BotEnv, game: GameState): Action {
    const run = game.run!;
    const ev = run.event!;
    if (ev.chosen !== null) return { type: 'leave' };
    const def = env.content.events.find((e) => e.id === ev.eventId);
    let best: Action = { type: 'leave' };
    let bestV = -Infinity;
    (def?.choices ?? []).forEach((ch, choice) => {
      if ((ch.costGold ?? 0) > run.gold) return;
      const v = choiceValue(env, run, ch);
      if (v > bestV) { bestV = v; best = { type: 'eventChoice', choice }; }
    });
    return env.engine.canApply(game, best) ? best : { type: 'leave' };
  }

  return {
    name: opts.strategy ? `skilled:${opts.strategy.name}` : 'skilled',
    decide(env, game) {
      dc ??= makeDraftCtx(env.content, opts.strategy);
      const run = game.run!;
      switch (run.phase) {
        case 'fight': return fight(env, game);
        case 'reward': return reward(env, game);
        case 'doors': return doors(env, game);
        case 'rest': return rest(env, game);
        case 'shop': return shop(env, game);
        case 'event': return event(env, game);
        default: return { type: 'continue' };
      }
    },
  };
}
