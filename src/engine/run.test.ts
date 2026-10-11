import type { Action, ContentDB, DoorKind, EventDef, GameState, StepResult } from '@shared';
import { describe, expect, it } from 'vitest';
import { clone } from './ctx';
import { createEngine } from './index';
import { face, fullContent, hero, item } from './testing/fixtures';
import { foe, play, toNextFight, use } from './testing/harness';

type Engine = ReturnType<typeof createEngine>;
const door = (kind: DoorKind): ContentDB['doors'][number] => ({ kind, name: kind, text: '', weight: [1, 1, 1] });

/** Full fixture content, but with three uniform 5-damage heroes so fights can be scripted. */
function make(over: Partial<ContentDB> = {}, seed = 'run', tier = 0): { engine: Engine; game: GameState } {
  const base = fullContent();
  const content: ContentDB = { ...base, heroes: [hero('bulwark', face('damage', 5)), hero('duelist', face('damage', 5)), hero('herbalist', face('damage', 5))], ...over };
  const engine = createEngine(content);
  const g = engine.newGame();
  g.profile.maxTier = 5;
  return { engine, game: engine.apply(g, { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier, seed }).game };
}

/** Wins the current fight by force: every enemy is reduced to a harmless 1 HP and then killed. */
function win(engine: Engine, game: GameState): StepResult {
  let g = clone(game);
  const encounter = g.run!.fight!.encounterId;
  const wins = g.run!.fightsWon;
  let last: StepResult = { game: g, events: [] };
  for (let i = 0; i < 40; i++) {
    const f = g.run!.fight;
    if (!f || g.run!.fightsWon !== wins || f.encounterId !== encounter) return last;
    for (const e of f.enemies) { e.hp = 1; e.shield = 0; e.statuses = {}; }
    const die = engine.dice(g).find((d) => d.usable);
    last = engine.apply(g, die ? use(die.die, foe(g)) : { type: 'endTurn' });
    g = clone(last.game);
  }
  throw new Error('could not win the fight');
}

describe('after a fight', () => {
  it('pays gold, then offers a face, an upgrade and an item', () => {
    const { engine, game } = make();
    const res = win(engine, game);
    const run = res.game.run!;
    expect(run.gold).toBe(10);
    expect(run.phase).toBe('reward');
    expect(run.reward).toMatchObject({ picksLeft: 0, source: 'fight' });
    expect(run.reward!.options.map((o) => o.type)).toEqual(['face', 'upgrade', 'item']);
    expect(res.events).toContainEqual({ type: 'fightWon', gold: 10 });
    expect(res.events).toContainEqual({ type: 'phase', phase: 'reward' });
    const itemOpt = run.reward!.options[2]!;
    expect(itemOpt.type === 'item' && res.game.profile.seen.items.includes(itemOpt.item)).toBe(true);
    expect(itemOpt.type === 'item' && engine.content.items.find((i) => i.id === itemOpt.item)!.locked).toBe(false);
  });

  it('pickReward: replace a face', () => {
    const { engine, game } = make();
    const g = win(engine, game).game;
    const opt = g.run!.reward!.options[0]!;
    if (opt.type !== 'face') throw new Error('expected a face');
    expect(engine.canApply(g, { type: 'pickReward', option: 0 })).toBe(false);
    expect(engine.canApply(g, { type: 'pickReward', option: 0, face: 6 })).toBe(false);
    expect(engine.canApply(g, { type: 'pickReward', option: 0, face: 2, hero: (opt.hero + 1) % 3 })).toBe(false);
    const res = engine.apply(g, { type: 'pickReward', option: 0, face: 2 });
    expect(res.game.run!.heroes[opt.hero]!.faces[2]).toEqual(opt.face);
    expect(res.game.run!.heroes[opt.hero]!.faces[1]!.value).toBe(5);
    expect(res.game.run!.stats.run.facesReplaced).toBe(1);
    expect(res.events).toContainEqual({ type: 'rewardTaken', option: opt });
    expect(g.run!.heroes[opt.hero]!.faces[2]!.value).toBe(5);
  });

  it('pickReward: upgrade a face, up to the per-face cap, never a blank', () => {
    const { engine, game } = make({ rewardFaces: [], items: [], heroes: [hero('bulwark', [face('damage', 5), face('blank'), face('damage', 5), face('damage', 5), face('damage', 5), face('damage', 5)]), hero('duelist', face('damage', 5)), hero('herbalist', face('damage', 5))] });
    let g = win(engine, game).game;
    expect(g.run!.reward!.options.every((o) => o.type === 'upgrade')).toBe(true);
    expect(new Set(g.run!.reward!.options.map((o) => (o.type === 'upgrade' ? o.hero : -1))).size).toBe(3);
    const option = g.run!.reward!.options.findIndex((o) => o.type === 'upgrade' && o.hero === 0);
    expect(engine.canApply(g, { type: 'pickReward', option, face: 1 })).toBe(false);
    g = play(engine, g, { type: 'pickReward', option, face: 0 });
    expect(g.run!.heroes[0]!.faces[0]).toMatchObject({ value: 6, upgrades: 1 });
    expect(g.run!.stats.run.facesUpgraded).toBe(1);
    g.run!.heroes[0]!.faces = g.run!.heroes[0]!.faces.map((f) => ({ ...f, upgrades: 2 }));
    g = win(engine, toNextFight(engine, g)).game;
    expect(g.run!.reward!.options.some((o) => o.type === 'upgrade' && o.hero === 0)).toBe(false);
  });

  it('pickReward: an item needs a holder, and a replacement when the slots are full', () => {
    const { engine, game } = make();
    let g = win(engine, game).game;
    g.run!.heroes[1]!.items = ['whetstone', 'lucky_coin'];
    const opt = g.run!.reward!.options[2]!;
    if (opt.type !== 'item') throw new Error('expected an item');
    expect(engine.canApply(g, { type: 'pickReward', option: 2 })).toBe(false);
    expect(engine.canApply(g, { type: 'pickReward', option: 2, hero: 1 })).toBe(false);
    expect(engine.canApply(g, { type: 'pickReward', option: 2, hero: 0, replaceItem: 0 })).toBe(false);
    expect(engine.legalActions(g).filter((a) => a.type === 'pickReward' && a.option === 2)).toHaveLength(4);
    g = play(engine, g, { type: 'pickReward', option: 2, hero: 1, replaceItem: 1 });
    expect(g.run!.heroes[1]!.items).toEqual(['whetstone', opt.item]);
    expect(g.run!.stats.run.itemsTaken).toBe(1);
  });

  it('skipReward moves on; then two different doors are offered on the way to slot 2', () => {
    const { engine, game } = make();
    const res = engine.apply(win(engine, game).game, { type: 'skipReward' });
    const run = res.game.run!;
    expect(res.events).toContainEqual({ type: 'rewardTaken', option: null });
    expect(run).toMatchObject({ phase: 'doors', slot: 2, act: 1, reward: null });
    expect(run.doors).toHaveLength(2);
    expect(run.doors![0]!.kind).not.toBe(run.doors![1]!.kind);
    expect(engine.legalActions(res.game)).toEqual([{ type: 'pickDoor', door: 0 }, { type: 'pickDoor', door: 1 }]);
  });

  it('held items are never offered again', () => {
    const { engine, game } = make({ items: [item('whetstone'), item('lucky_coin')] });
    game.run!.heroes[0]!.items = ['whetstone'];
    const g = win(engine, game).game;
    const items = g.run!.reward!.options.filter((o) => o.type === 'item').map((o) => (o.type === 'item' ? o.item : ''));
    expect(items).toEqual(['lucky_coin']);
  });
});

describe('doors', () => {
  const through = (kind: DoorKind, over: Partial<ContentDB> = {}): { engine: Engine; game: GameState; res: StepResult } => {
    const { engine, game } = make({ doors: [door(kind)], ...over });
    const g = play(engine, win(engine, game).game, { type: 'skipReward' });
    expect(g.run!.doors).toEqual([{ kind }]);
    return { engine, game: g, res: engine.apply(g, { type: 'pickDoor', door: 0 }) };
  };

  it('onward goes straight to the next fight', () => {
    const { res } = through('onward');
    expect(res.game.run).toMatchObject({ phase: 'fight', slot: 2, doors: null });
    expect(res.game.run!.fight!.kind).toBe('normal');
  });

  it('elite makes the next fight the act\'s elite encounter, with more gold and two reward screens', () => {
    const { engine, res } = through('elite');
    expect(res.game.run!.fight).toMatchObject({ kind: 'elite', encounterId: 'a1.elite' });
    expect(res.game.run!.eliteNext).toBe(false);
    let g = win(engine, res.game).game;
    expect(g.run!.gold).toBe(30);
    expect(g.run!.stats.run.elitesWon).toBe(1);
    expect(g.run!.reward).toMatchObject({ picksLeft: 1, source: 'fight' });
    g = play(engine, g, { type: 'skipReward' });
    expect(g.run!.reward).toMatchObject({ picksLeft: 0, source: 'fight' });
    g = play(engine, g, { type: 'skipReward' });
    expect(g.run).toMatchObject({ phase: 'doors', slot: 3 });
  });

  it('elite is not offered before a boss, or when the act has no elite encounter', () => {
    const { engine, game } = make({ doors: [door('elite'), door('onward')] });
    let g = game;
    const kinds: string[][] = [];
    for (let i = 0; i < 3; i++) {
      g = play(engine, win(engine, g).game, { type: 'skipReward' });
      kinds.push(g.run!.doors!.map((d) => d.kind).sort());
      g = play(engine, g, { type: 'pickDoor', door: g.run!.doors!.findIndex((d) => d.kind === 'onward') });
    }
    expect(kinds).toEqual([['elite', 'onward'], ['elite', 'onward'], ['onward']]);
    expect(g.run!.fight!.kind).toBe('boss');
    const none = make({ doors: [door('elite'), door('onward')], encounters: fullContent().encounters.filter((e) => e.kind !== 'elite') });
    expect(play(none.engine, win(none.engine, none.game).game, { type: 'skipReward' }).run!.doors).toEqual([{ kind: 'onward' }]);
  });

  it('rest: heal every living hero by the rest percentage, once', () => {
    const { engine, res } = through('rest');
    const g = res.game;
    expect(g.run).toMatchObject({ phase: 'rest', rest: { used: false } });
    g.run!.heroes[0]!.hp = 5;
    g.run!.heroes[1]!.hp = 19;
    g.run!.heroes[2]!.hp = 0;
    g.run!.heroes[2]!.downed = true;
    const healed = play(engine, g, { type: 'restHeal' });
    expect(healed.run!.heroes.map((h) => h.hp)).toEqual([13, 20, 0]);
    expect(healed.run!.rest).toEqual({ used: true });
    expect(engine.legalActions(healed)).toEqual([{ type: 'leave' }]);
    expect(play(engine, healed, { type: 'leave' }).run).toMatchObject({ phase: 'fight', rest: null });
  });

  it('rest: or upgrade one face instead', () => {
    const { engine, res } = through('rest');
    const g = play(engine, res.game, { type: 'restUpgrade', hero: 1, face: 3 });
    expect(g.run!.heroes[1]!.faces[3]).toMatchObject({ value: 6, upgrades: 1 });
    expect(engine.canApply(g, { type: 'restHeal' })).toBe(false);
    expect(engine.canApply(g, { type: 'restUpgrade', hero: 1, face: 3 })).toBe(false);
    expect(engine.canApply(res.game, { type: 'restUpgrade', hero: 5, face: 0 })).toBe(false);
  });

  it('treasure: a free pick of one item from several', () => {
    const { engine, res } = through('treasure');
    const run = res.game.run!;
    expect(run.phase).toBe('reward');
    expect(run.reward).toMatchObject({ source: 'treasure', picksLeft: 0 });
    expect(run.reward!.options.map((o) => o.type)).toEqual(['item', 'item', 'item']);
    expect(new Set(run.reward!.options.map((o) => (o.type === 'item' ? o.item : ''))).size).toBe(3);
    const g = play(engine, res.game, { type: 'pickReward', option: 1, hero: 2 });
    expect(g.run!.heroes[2]!.items).toHaveLength(1);
    expect(g.run).toMatchObject({ phase: 'fight', slot: 2, gold: 10 });
  });

  it('shop: stock, prices, buying each kind of thing, and leaving', () => {
    const { engine, res } = through('shop');
    let g = res.game;
    const slots = g.run!.shop!.slots;
    expect(slots.map((s) => s.type)).toEqual(['item', 'item', 'item', 'face', 'face', 'upgrade', 'heal']);
    const rules = engine.content.rules.shop;
    for (const s of slots) {
      if (s.type === 'item') expect(s.price).toBe(rules.itemPrice[engine.content.items.find((i) => i.id === s.item)!.rarity]);
      if (s.type === 'upgrade') expect(s.price).toBe(rules.upgradePrice);
      if (s.type === 'heal') expect(s.price).toBe(rules.healPrice);
    }
    expect(engine.canApply(g, { type: 'shopBuy', slot: 6 })).toBe(false); // nobody is hurt
    g.run!.gold = 9;
    g.run!.heroes[0]!.hp = 10;
    expect(engine.canApply(g, { type: 'shopBuy', slot: 5, hero: 0, face: 0 })).toBe(false); // 10 gold needed
    g = play(engine, g, { type: 'shopBuy', slot: 6 });
    expect(g.run!.heroes[0]!.hp).toBe(16);
    expect(g.run!.gold).toBe(4);
    expect(engine.canApply(g, { type: 'shopBuy', slot: 6 })).toBe(false); // sold
    g.run!.gold = 200;
    g = play(engine, g, { type: 'shopBuy', slot: 5, hero: 1, face: 0 });
    expect(g.run!.heroes[1]!.faces[0]).toMatchObject({ value: 6, upgrades: 1 });
    const it0 = g.run!.shop!.slots[0]!;
    g = play(engine, g, { type: 'shopBuy', slot: 0, hero: 2 });
    expect(g.run!.heroes[2]!.items).toEqual([it0.type === 'item' ? it0.item : '']);
    const fc = g.run!.shop!.slots[3]!;
    if (fc.type !== 'face') throw new Error('expected a face slot');
    g = play(engine, g, { type: 'shopBuy', slot: 3, face: 5 });
    expect(g.run!.heroes[fc.hero]!.faces[5]).toEqual(fc.face);
    expect(g.run!.stats.run.goldSpent).toBe(5 + 10 + it0.price + fc.price);
    expect(g.run!.gold).toBe(200 - 10 - it0.price - fc.price);
    expect(g.run!.shop!.slots.map((s) => s.sold)).toEqual([true, false, false, true, false, true, true]);
    expect(play(engine, g, { type: 'leave' }).run).toMatchObject({ phase: 'fight', shop: null });
  });

  it('shop prices drop with shopDiscountPct', () => {
    const { engine, game } = make({ doors: [door('shop')] });
    game.run!.heroes[0]!.items = ['merchants_scale'];
    const g = play(engine, win(engine, game).game, { type: 'skipReward' }, { type: 'pickDoor', door: 0 });
    expect(g.run!.shop!.slots.find((s) => s.type === 'upgrade')!.price).toBe(8);
    expect(g.run!.shop!.slots.find((s) => s.type === 'heal')!.price).toBe(4);
  });
});

describe('events', () => {
  const ev = (choices: EventDef['choices']): EventDef => ({ id: 'ev.test', name: '', text: '', acts: [1, 2, 3], choices });
  const at = (choices: EventDef['choices'], prep?: (g: GameState) => void): { engine: Engine; game: GameState } => {
    const { engine, game } = make({ doors: [door('event')], events: [ev(choices)] });
    const g = play(engine, win(engine, game).game, { type: 'skipReward' }, { type: 'pickDoor', door: 0 });
    expect(g.run).toMatchObject({ phase: 'event', event: { eventId: 'ev.test', chosen: null } });
    prep?.(g);
    return { engine, game: g };
  };
  const choice = (outcomes: EventDef['choices'][number]['outcomes'], costGold?: number): EventDef['choices'][number] => ({ label: '', text: '', result: '', outcomes, costGold });

  it('a choice applies its outcomes, then the result stays up until leave', () => {
    const { engine, game } = at([choice([{ type: 'gold', amount: 7 }, { type: 'heal', target: 'all', amount: 3 }]), choice([{ type: 'nothing' }])], (g) => { g.run!.heroes.forEach((h) => { h.hp = 10; }); });
    expect(engine.legalActions(game)).toEqual([{ type: 'eventChoice', choice: 0 }, { type: 'eventChoice', choice: 1 }]);
    const g = play(engine, game, { type: 'eventChoice', choice: 0 });
    expect(g.run).toMatchObject({ phase: 'event', gold: 17, event: { chosen: 0 } });
    expect(g.run!.heroes.map((h) => h.hp)).toEqual([13, 13, 13]);
    expect(engine.legalActions(g)).toEqual([{ type: 'leave' }]);
    expect(play(engine, g, { type: 'leave' }).run).toMatchObject({ phase: 'fight', event: null, slot: 2 });
  });

  it('a costed choice needs the gold and takes it', () => {
    const { engine, game } = at([choice([{ type: 'maxHp', target: 'all', amount: 2 }], 10), choice([{ type: 'nothing' }], 11)]);
    expect(engine.canApply(game, { type: 'eventChoice', choice: 1 })).toBe(false);
    expect(engine.canApply(game, { type: 'leave' })).toBe(false);
    const g = play(engine, game, { type: 'eventChoice', choice: 0 });
    expect(g.run!.gold).toBe(0);
    expect(g.run!.heroes.map((h) => [h.hp, h.maxHp])).toEqual([[22, 22], [22, 22], [22, 22]]);
  });

  it('if no choice is affordable the event can simply be left', () => {
    const { engine, game } = at([choice([{ type: 'nothing' }], 999)]);
    expect(engine.legalActions(game)).toEqual([{ type: 'leave' }]);
  });

  it('heal lowest / random, hurt (never below 1 HP), maxHp random', () => {
    const prep = (g: GameState): void => { g.run!.heroes.forEach((h, i) => { h.hp = [10, 3, 15][i]!; }); };
    const run = (outcomes: EventDef['choices'][number]['outcomes']): GameState => {
      const { engine, game } = at([choice(outcomes)], prep);
      return play(engine, game, { type: 'eventChoice', choice: 0 });
    };
    expect(run([{ type: 'heal', target: 'lowest', amount: 4 }]).run!.heroes.map((h) => h.hp)).toEqual([10, 7, 15]);
    expect(run([{ type: 'heal', target: 'random', amount: 4 }]).run!.heroes.reduce((n, h) => n + h.hp, 0)).toBe(32);
    expect(run([{ type: 'hurt', target: 'all', amount: 5 }]).run!.heroes.map((h) => h.hp)).toEqual([5, 1, 10]);
    expect(run([{ type: 'hurt', target: 'highest', amount: 5 }]).run!.heroes.map((h) => h.hp)).toEqual([10, 3, 10]);
    const r = run([{ type: 'hurt', target: 'random', amount: 2 }]);
    expect(r.run!.heroes.reduce((n, h) => n + h.hp, 0)).toBe(26);
    expect(r.run!.stats.run.hpLost).toBe(2);
    expect(run([{ type: 'maxHp', target: 'random', amount: 3 }]).run!.heroes.reduce((n, h) => n + h.maxHp, 0)).toBe(63);
    expect(run([{ type: 'maxHp', target: 'all', amount: -18 }]).run!.heroes.map((h) => [h.hp, h.maxHp])).toEqual([[2, 2], [2, 2], [2, 2]]);
  });

  it('upgradeFace random and blankFace change dice at once', () => {
    const { engine, game } = at([choice([{ type: 'upgradeFace', target: 'random', amount: 2 }]), choice([{ type: 'blankFace', target: 'random' }]), choice([{ type: 'blankFace', target: 'lowestValue' }])], (g) => {
      g.run!.heroes[2]!.faces = g.run!.heroes[2]!.faces.map((f, i) => (i === 4 ? { ...f, value: 1 } : f));
    });
    const up = play(engine, game, { type: 'eventChoice', choice: 0 }).run!.heroes.flatMap((h) => h.faces);
    expect(up.filter((f) => f.upgrades === 1 && f.value === 7)).toHaveLength(1);
    const blank = play(engine, game, { type: 'eventChoice', choice: 1 }).run!.heroes.flatMap((h) => h.faces);
    expect(blank.filter((f) => f.effect === 'blank' && f.symbol === null && f.value === 0)).toHaveLength(1);
    const low = play(engine, game, { type: 'eventChoice', choice: 2 }).run!;
    expect(low.heroes[2]!.faces[4]).toMatchObject({ effect: 'blank', value: 0, keywords: [] });
    expect(game.run!.heroes[2]!.faces[4]!.effect).toBe('damage');
  });

  it('item, rewardFace and upgradeFace-choose outcomes go through reward screens, one after another', () => {
    const { engine, game } = at([choice([{ type: 'item', item: 'iron_ration' }, { type: 'rewardFace', rarity: 'rare' }, { type: 'upgradeFace', target: 'choose', amount: 2 }, { type: 'item', rarity: 'uncommon' }])]);
    let g = play(engine, game, { type: 'eventChoice', choice: 0 });
    expect(g.run!.phase).toBe('event');
    g = play(engine, g, { type: 'leave' });
    expect(g.run).toMatchObject({ phase: 'reward', reward: { source: 'event', picksLeft: 3, options: [{ type: 'item', item: 'iron_ration' }] } });
    g = play(engine, g, { type: 'pickReward', option: 0, hero: 0 });
    expect(g.run!.heroes[0]).toMatchObject({ items: ['iron_ration'], maxHp: 24, hp: 24 });
    expect(g.run!.reward).toMatchObject({ source: 'event', picksLeft: 2 });
    expect(g.run!.reward!.options.every((o) => o.type === 'face' && o.rarity === 'rare')).toBe(true);
    expect(new Set(g.run!.reward!.options.map((o) => (o.type === 'face' ? o.hero : -1))).size).toBe(g.run!.reward!.options.length);
    g = play(engine, g, { type: 'skipReward' });
    expect(g.run!.reward!.options).toEqual([0, 1, 2].map((h) => ({ type: 'upgrade', hero: h, amount: 2 })));
    g = play(engine, g, { type: 'pickReward', option: 1, face: 0 });
    expect(g.run!.heroes[1]!.faces[0]).toMatchObject({ value: 7, upgrades: 1 });
    expect(g.run!.reward).toMatchObject({ picksLeft: 0 });
    const last = g.run!.reward!.options[0]!;
    expect(last.type === 'item' && last.rarity).toBe('uncommon');
    g = play(engine, g, { type: 'skipReward' });
    expect(g.run).toMatchObject({ phase: 'fight', event: null, reward: null });
  });

  it('events are only offered in their acts', () => {
    const { engine, game } = make({ doors: [door('event'), door('onward')], events: [{ ...ev([choice([{ type: 'nothing' }])]), acts: [2] }] });
    expect(play(engine, win(engine, game).game, { type: 'skipReward' }).run!.doors).toEqual([{ kind: 'onward' }]);
  });
});

describe('acts, bosses and the end of a run', () => {
  /** Plays to the end, always skipping rewards and taking the first door. */
  function finish(engine: Engine, game: GameState, stopAt?: (g: GameState) => boolean): GameState {
    let g = game;
    for (let i = 0; i < 60; i++) {
      if (!g.run || g.run.phase === 'victory' || g.run.phase === 'defeat' || stopAt?.(g)) return g;
      g = g.run.phase === 'fight' ? win(engine, g).game : toNextFight(engine, g);
    }
    return g;
  }

  it('slot 4 is the boss; afterwards the party heals, picks a boss reward and the next act starts at slot 1', () => {
    const { engine, game } = make({ doors: [door('onward')] });
    let g = finish(engine, game, (x) => x.run!.slot === 4 && x.run!.phase === 'fight');
    expect(g.run!.fight).toMatchObject({ kind: 'boss', encounterId: 'a1.boss' });
    g.run!.heroes.forEach((h) => { h.hp = 4; });
    g = win(engine, g).game;
    expect(g.run!.heroes.map((h) => h.hp)).toEqual([10, 10, 10]);
    expect(g.run).toMatchObject({ phase: 'reward', act: 1, slot: 4, gold: 10 * 3 + 30, fightsWon: 4 });
    expect(g.run!.stats.run.bossesWon).toBe(1);
    expect(g.run!.reward!.options.every((o) => o.type === 'upgrade' || o.rarity !== 'common')).toBe(true);
    g = play(engine, g, { type: 'skipReward' });
    expect(g.run).toMatchObject({ phase: 'fight', act: 2, slot: 1 });
    expect(g.run!.fight!.kind).toBe('normal');
    expect(engine.content.encounters.find((e) => e.id === g.run!.fight!.encounterId)!.act).toBe(2);
  });

  it('a whole run is 12 fights and ends in victory after the act 3 boss', () => {
    const { engine, game } = make({ doors: [door('onward')] });
    const seenEncounters: string[] = [];
    const g = finish(engine, game, (x) => {
      if (x.run!.fight && seenEncounters[seenEncounters.length - 1] !== `${x.run!.act}.${x.run!.slot}`) seenEncounters.push(`${x.run!.act}.${x.run!.slot}`);
      return false;
    });
    expect(seenEncounters).toEqual(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4']);
    expect(g.run).toMatchObject({ phase: 'victory', fightsWon: 12, fight: null, reward: null });
    expect(g.profile.stats).toMatchObject({ runsPlayed: 1, runsWon: 1, winStreak: 1 });
    expect(engine.legalActions(g)).toEqual([{ type: 'continue' }]);
    expect(play(engine, g, { type: 'continue' }).run).toBeNull();
  });

  it('normal encounters respect their slots and do not repeat within an act', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const { engine, game } = make({ doors: [door('onward')] }, seed);
      const ids: string[] = [];
      finish(engine, game, (x) => {
        const f = x.run!.fight;
        if (f && x.run!.act === 1 && x.run!.slot < 4 && !ids.includes(f.encounterId)) ids.push(f.encounterId);
        return x.run!.act > 1;
      });
      expect(ids).toHaveLength(3);
      ids.forEach((id, i) => expect(engine.content.encounters.find((e) => e.id === id)!.slots).toContain(i + 1));
    }
  });

  it('encounters, doors and rewards for a seed do not depend on earlier choices', () => {
    const a = make({}, 'same');
    const b = make({}, 'same');
    const afterA = play(a.engine, win(a.engine, a.game).game, { type: 'skipReward' });
    const picked = win(b.engine, b.game).game;
    const afterB = play(b.engine, picked, engine0(picked, b.engine));
    expect(afterB.run!.doors).toEqual(afterA.run!.doors);
    const fightA = toNextFight(a.engine, play(a.engine, afterA, { type: 'pickDoor', door: 0 }));
    const fightB = toNextFight(b.engine, play(b.engine, afterB, { type: 'pickDoor', door: 1 }));
    const kindA = afterA.run!.doors![0]!.kind;
    const kindB = afterB.run!.doors![1]!.kind;
    if (kindA !== 'elite' && kindB !== 'elite') expect(fightB.run!.fight!.encounterId).toBe(fightA.run!.fight!.encounterId);
  });

  it('a forceElite tier turns that slot into an elite fight and hides the elite door before it', () => {
    const { engine, game } = make({ doors: [door('elite'), door('onward')] }, 'tier', 4);
    let g = play(engine, win(engine, game).game, { type: 'skipReward' });
    expect(g.run!.doors!.map((d) => d.kind).sort()).toEqual(['elite', 'onward']);
    g = play(engine, g, { type: 'pickDoor', door: g.run!.doors!.findIndex((d) => d.kind === 'onward') });
    g = play(engine, win(engine, g).game, { type: 'skipReward' });
    expect(g.run!.slot).toBe(3);
    expect(g.run!.doors).toEqual([{ kind: 'onward' }]);
    g = play(engine, g, { type: 'pickDoor', door: 0 });
    expect(g.run!.fight!.kind).toBe('elite');
  });

  it('gold only ever comes from the run itself', () => {
    const { engine, game } = make();
    expect(game.run!.gold).toBe(0);
    const again = engine.apply(play(engine, game, { type: 'abandonRun' }), { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0, seed: 'z' }).game;
    expect(again.run!.gold).toBe(0);
  });
});

/** A pickReward action for the first option, whatever it needs. */
function engine0(g: GameState, engine: Engine): Action {
  return engine.legalActions(g).find((a) => a.type === 'pickReward')!;
}
