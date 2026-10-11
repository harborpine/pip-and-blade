import type { ContentDB, EnemyAction, EnemyDef, FaceDef, GameState, HeroTargetRule, TierModifier } from '@shared';
import { describe, expect, it } from 'vitest';
import { content, enemy, face, hero, item, move } from './testing/fixtures';
import { ally, END, fight, foe, play, use, withFaces } from './testing/harness';

const party = (a: FaceDef, b: FaceDef = a, c: FaceDef = a) => [hero('bulwark', a), hero('duelist', b), hero('herbalist', c)];
const F = (g: GameState) => g.run!.fight!;
const intent = (g: GameState, i = 0) => F(g).enemies[i]!.intent!;
const vs = (defs: EnemyDef[], over: Partial<ContentDB> = {}, extra: Omit<Parameters<typeof fight>[0], 'content' | 'enemies'> = {}) =>
  fight({ content: content({ enemies: defs, ...over }), enemies: defs.map((d) => d.id), ...extra });
const atk = (amount: number, target: HeroTargetRule = 'front', more: Partial<Extract<EnemyAction, { type: 'attack' }>> = {}): EnemyAction => ({ type: 'attack', amount, target, ...more });

describe('enemy actions', () => {
  it('attack: hits, pierce and poison, all shown exactly in the intent', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [atk(2, 'front', { hits: 3, pierce: true, poison: 1 })])]);
    expect(intent(game).actions[0]).toMatchObject({ type: 'attack', amount: 2, hits: 3, pierce: true, poison: 1, heroes: [0] });
    const g = play(engine, game, use(0, ally(0)), END);
    expect(g.run!.heroes[0]!.hp).toBe(20 - 6 - 1);
    expect(F(g).heroes[0]!.statuses.poison).toBeUndefined();
  });

  it('hero target rules are resolved when the intent is made', () => {
    const rules: [HeroTargetRule, number[]][] = [['front', [0]], ['back', [2]], ['lowestHp', [1]], ['highestHp', [2]], ['all', [0, 1, 2]]];
    for (const [rule, expected] of rules) {
      const { game } = vs([enemy('gnaw_rat', 30, [atk(1, rule)])], {}, { hp: [10, 5, 15] });
      expect([rule, intent(game).actions[0]!.heroes]).toEqual([rule, expected]);
    }
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) {
      const { game } = vs([enemy('gnaw_rat', 30, [atk(1, 'random')])], {}, { seed: `r${i}` });
      expect(intent(game).actions[0]!.heroes).toHaveLength(1);
      seen.add(intent(game).actions[0]!.heroes[0]!);
    }
    expect(seen.size).toBe(3);
  });

  it('shield and heal with every ally rule', () => {
    type Rule = 'self' | 'allAllies' | 'lowestHpAlly' | 'otherAllies';
    const after = (target: Rule, type: 'shield' | 'heal'): number[] => {
      const { engine, game } = vs([enemy('gnaw_rat', 20), enemy('mud_slime', 25, [{ type, amount: 4, target }]), enemy('twig_archer', 28)]);
      for (const e of F(game).enemies) e.hp -= 10;
      return F(play(engine, game, END)).enemies.map((e) => (type === 'shield' ? e.shield : e.hp));
    };
    expect(after('self', 'shield')).toEqual([0, 4, 0]);
    expect(after('allAllies', 'shield')).toEqual([4, 4, 4]);
    expect(after('otherAllies', 'shield')).toEqual([4, 0, 4]);
    expect(after('lowestHpAlly', 'shield')).toEqual([4, 0, 0]);
    expect(after('lowestHpAlly', 'heal')).toEqual([14, 15, 18]);
    expect(after('allAllies', 'heal')).toEqual([14, 19, 22]);
  });

  it('status on enemies and on heroes; strength raises attacks and the shown intent', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [move('buff', { type: 'status', status: 'strength', amount: 2, target: 'allAllies', side: 'enemy' }), move('hit', atk(1))]), enemy('mud_slime', 30, [atk(3, 'back')])]);
    expect(intent(game, 1).actions[0]!.amount).toBe(3);
    expect(engine.forecast(game).heroes.map((h) => h.hpLoss)).toEqual([0, 0, 5]);
    const g = play(engine, game, END);
    expect(g.run!.heroes[2]!.hp).toBe(15);
    expect(intent(g, 1).actions[0]!.amount).toBe(5);
    expect(intent(g, 0).actions[0]).toMatchObject({ type: 'attack', amount: 3 });
    const h = vs([enemy('gnaw_rat', 30, [{ type: 'status', status: 'mark', amount: 2, target: 'all', side: 'hero' }]), enemy('mud_slime', 30, [atk(1, 'all')])]);
    const g2 = play(h.engine, h.game, END);
    expect(g2.run!.heroes.map((x) => x.hp)).toEqual([17, 17, 17]);
    expect(F(g2).heroes[0]!.statuses.mark).toBeUndefined();
  });

  it('charge does nothing', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'charge' }])]);
    expect(engine.forecast(game)).toEqual({ heroes: [0, 1, 2].map(() => ({ hpLoss: 0, shieldLoss: 0, downed: false, jammed: false, cursedFace: null })), rerollsStolen: 0, partyWipe: false });
  });

  it('summon adds enemies at the back up to the cap, and they get an intent', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'summon', enemy: 'bramble_imp', count: 3 }]), enemy('bramble_imp', 5, [atk(1)])].slice(0, 2), {}, {});
    const g = play(engine, game, END);
    expect(F(g).enemies.map((e) => [e.enemyId, e.summoned])).toEqual([['gnaw_rat', false], ['bramble_imp', false], ['bramble_imp', true], ['bramble_imp', true]]);
    expect(F(g).enemies.every((e) => e.intent !== null)).toBe(true);
    expect(new Set(F(g).enemies.map((e) => e.uid)).size).toBe(4);
    expect(g.profile.seen.enemies).toContain('bramble_imp');
  });
});

describe('enemy AI', () => {
  it('cycle follows its order', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [move('a', atk(1)), move('b', atk(2)), move('c', { type: 'charge' })])]);
    const ids: string[] = [];
    let g = game;
    for (let i = 0; i < 7; i++) {
      ids.push(intent(g).moveId);
      g = play(engine, g, END);
    }
    expect(ids).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
  });

  it('weighted picks by weight from the seed, and noRepeat never repeats a move', () => {
    const def = enemy('gnaw_rat', 999, [move('a', { type: 'charge' }), move('b', { type: 'charge' }), move('c', { type: 'charge' })], { ai: { type: 'weighted', weights: { a: 5, b: 1, c: 0 }, noRepeat: true } });
    const { engine, game } = vs([def]);
    let g = game;
    const ids: string[] = [];
    for (let i = 0; i < 20; i++) {
      ids.push(intent(g).moveId);
      g = play(engine, g, END);
    }
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
    expect(ids).not.toContain('c');
    const free = vs([{ ...def, ai: { type: 'weighted', weights: { a: 9, b: 1 } } }]);
    let h = free.game;
    let a = 0;
    for (let i = 0; i < 60; i++) {
      if (intent(h).moveId === 'a') a++;
      h = play(free.engine, h, END);
    }
    expect(a).toBeGreaterThan(40);
    expect(a).toBeLessThan(60);
  });

  it('an HP phase swaps the AI the moment the threshold is crossed, and the new intent is shown at once', () => {
    const boss = enemy('drowned_bell', 20, [move('count', { type: 'charge' }), move('crash', atk(15, 'all')), move('cracked', atk(1))], {
      ai: { type: 'cycle', order: ['count', 'crash'] },
      phases: [{ hpAtMostPct: 50, ai: { type: 'cycle', order: ['cracked'] } }, { hpAtMostPct: 10, ai: { type: 'cycle', order: ['count'] } }],
    });
    const { engine, game } = vs([boss], { heroes: party(face('damage', 5)) });
    let g = play(engine, game, END);
    expect(intent(g).moveId).toBe('crash');
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(15);
    g = play(engine, g, use(0, foe(g)));
    expect(intent(g).moveId).toBe('crash');
    g = play(engine, g, use(1, foe(g)));
    expect(intent(g).moveId).toBe('cracked');
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(1);
    expect(play(engine, g, { type: 'undo' }).run!.fight!.enemies[0]!.intent!.moveId).toBe('crash');
  });

  it('the lowest matching phase wins', () => {
    const boss = enemy('drowned_bell', 20, [move('hi', { type: 'charge' }), move('mid', { type: 'charge' }), move('low', { type: 'charge' })], {
      ai: { type: 'cycle', order: ['hi'] },
      phases: [{ hpAtMostPct: 50, ai: { type: 'cycle', order: ['mid'] } }, { hpAtMostPct: 10, ai: { type: 'cycle', order: ['low'] } }],
    });
    const { engine, game } = vs([boss], { heroes: party(face('damage', 9)) });
    const g = play(engine, game, use(0, foe(game)), use(1, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(2);
    expect(intent(g).moveId).toBe('low');
  });
});

describe('dice tricks', () => {
  it('lockDie jams that hero\'s die next turn: it rolls once and is not rerolled', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'lockDie', target: 'back' }])], { heroes: [hero('bulwark', face('shield', 2)), hero('duelist', face('damage', 3)), hero('herbalist', [0, 1, 2, 3, 4, 5].map((n) => face('heal', n)))] });
    expect(engine.forecast(game).heroes.map((h) => h.jammed)).toEqual([false, false, true]);
    const res = engine.apply(game, END);
    expect(res.events).toContainEqual({ type: 'trick', kind: 'lockDie', hero: 2, face: null, blockedBy: null });
    let g = res.game;
    expect(F(g).dice.map((d) => d.jammed)).toEqual([false, false, true]);
    expect(engine.dice(g)[2]!.jammed).toBe(true);
    const faceBefore = F(g).dice[2]!.face;
    g = play(engine, g, { type: 'reroll' }, { type: 'reroll' });
    expect(F(g).dice[2]).toMatchObject({ face: faceBefore, rerolled: false });
    expect(g.run!.stats.run.tricksSuffered).toBe(1);
  });

  it('curseFace blanks the exact face shown in the intent, for the rest of the fight', () => {
    const faces = [face('damage', 1), face('damage', 7), face('damage', 3), face('blank'), face('damage', 7), face('damage', 2)];
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'curseFace', target: 'front', face: 'highest' }])], { heroes: [hero('bulwark', faces), hero('duelist', face('damage', 3)), hero('herbalist', face('heal', 2))] });
    expect(intent(game).actions[0]).toMatchObject({ type: 'curseFace', heroes: [0], faces: [1] });
    expect(engine.forecast(game).heroes[0]!.cursedFace).toBe(1);
    let g = play(engine, game, END);
    expect(F(g).heroes[0]!.cursed).toEqual([1]);
    expect(intent(g).actions[0]!.faces).toEqual([4]);
    g = withFaces(g, [1, 0, 0]);
    expect(engine.dice(g)[0]).toMatchObject({ effect: 'blank', value: 0, cursed: true, needsTarget: false });
    g = play(engine, g, END, END, END, END, END, END);
    expect(F(g).heroes[0]!.cursed).toEqual([1, 4, 2, 5, 0]);
    expect(intent(g).actions[0]!.faces).toEqual([-1]);
  });

  it('a "showing" curse tracks the face the die shows as the player rerolls', () => {
    const faces = [0, 1, 2, 3, 4, 5].map((n) => face('damage', n + 1));
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'curseFace', target: 'front', face: 'showing' }])], { heroes: [hero('bulwark', faces), hero('duelist', face('damage', 3)), hero('herbalist', face('heal', 2))] });
    expect(intent(game).actions[0]!.faces).toEqual([F(game).dice[0]!.face]);
    const g = play(engine, game, { type: 'reroll' });
    const showing = F(g).dice[0]!.face;
    expect(intent(g).actions[0]!.faces).toEqual([showing]);
    expect(engine.forecast(g).heroes[0]!.cursedFace).toBe(showing);
    expect(F(play(engine, g, END)).heroes[0]!.cursed).toEqual([showing]);
  });

  it('a random curse picks a non-blank face and says which', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'curseFace', target: 'all', face: 'random' }])], { heroes: party(face('damage', 3)) });
    const faces = intent(game).actions[0]!.faces;
    expect(faces).toHaveLength(3);
    const g = play(engine, game, END);
    expect(F(g).heroes.map((h) => h.cursed)).toEqual(faces.map((f) => [f]));
  });

  it('stealReroll takes rerolls from the next turn only', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [move('steal', { type: 'stealReroll', amount: 1 }), move('rest', { type: 'charge' })])]);
    expect(engine.forecast(game).rerollsStolen).toBe(1);
    let g = play(engine, game, END);
    expect(F(g).rerollsLeft).toBe(1);
    g = play(engine, g, END);
    expect(F(g).rerollsLeft).toBe(2);
  });

  it('rerolls never go below zero', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, [{ type: 'stealReroll', amount: 5 }])]);
    expect(F(play(engine, game, END)).rerollsLeft).toBe(0);
  });

  it('killing the enemy before it acts stops the trick', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 3, [{ type: 'lockDie', target: 'all' }]), enemy('mud_slime', 30)]);
    const g = play(engine, game, use(1, foe(game)));
    expect(engine.forecast(g).heroes.some((h) => h.jammed)).toBe(false);
    expect(F(play(engine, g, END)).dice.some((d) => d.jammed)).toBe(false);
  });

  it('trickImmune items block tricks by scope and say so in the event', () => {
    const trickster = enemy('gnaw_rat', 30, [{ type: 'lockDie', target: 'all' }, { type: 'curseFace', target: 'all', face: 'highest' }, { type: 'stealReroll', amount: 1 }]);
    const items = [
      item('bone_charm', { modifiers: [{ type: 'trickImmune', tricks: ['curseFace'], scope: 'owner' }] }),
      item('unjam_oil', { modifiers: [{ type: 'trickImmune', tricks: ['lockDie'], scope: 'party' }] }),
      item('purse_string', { modifiers: [{ type: 'trickImmune', tricks: ['stealReroll'], scope: 'owner' }] }),
    ];
    const { engine, game } = vs([trickster], { items }, { items: [[], ['bone_charm', 'unjam_oil'], ['purse_string']] });
    const fc = engine.forecast(game);
    expect(fc.heroes.map((h) => h.jammed)).toEqual([false, false, false]);
    expect(fc.heroes.map((h) => h.cursedFace !== null)).toEqual([true, false, true]);
    expect(fc.rerollsStolen).toBe(0);
    const res = engine.apply(game, END);
    expect(F(res.game).dice.some((d) => d.jammed)).toBe(false);
    expect(F(res.game).heroes.map((h) => h.cursed.length)).toEqual([1, 0, 1]);
    expect(F(res.game).rerollsLeft).toBe(2);
    expect(res.events.filter((e) => e.type === 'trick' && e.blockedBy !== null)).toHaveLength(3 + 1 + 1);
    expect(res.game.run!.stats.run.tricksSuffered).toBe(2);
  });

  it('enemy passives can curse and summon through effects', () => {
    const boss = enemy('pip_eater', 30, undefined, { passives: [
      { trigger: 'enemyDamaged', condition: { type: 'ownerInvolved' }, limit: { per: 'fight', count: 1 }, effects: [{ type: 'curseFace', target: 'triggerSource', face: 'showing' }, { type: 'summon', enemy: 'gnaw_rat', count: 1 }] },
    ] });
    const { engine, game } = vs([boss, enemy('gnaw_rat', 4)].slice(0, 1), { enemies: [boss, enemy('gnaw_rat', 4, [atk(2)])] });
    const g = play(engine, game, use(1, foe(game)));
    expect(F(g).heroes[1]!.cursed).toEqual([F(g).dice[1]!.face]);
    expect(F(g).enemies.map((e) => e.enemyId)).toEqual(['pip_eater', 'gnaw_rat']);
    expect(F(g).enemies[1]!.intent).not.toBeNull();
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(2);
  });

  it('a boss that feeds on blanks: strength gained at End Turn is in the forecast', () => {
    const boss = enemy('pip_eater', 30, [atk(2)], { passives: [{ trigger: 'turnEnd', effects: [{ type: 'status', target: 'self', status: 'strength', amount: { scale: 'blanksShowing', factor: 1 } }] }] });
    const { engine, game } = vs([boss], { heroes: party(face('blank'), face('blank'), face('heal', 1)) });
    expect(intent(game).actions[0]!.amount).toBe(2);
    expect(engine.forecast(game).heroes[0]!.hpLoss).toBe(4);
    const g = play(engine, game, END);
    expect(g.run!.heroes[0]!.hp).toBe(16);
    expect(intent(g).actions[0]!.amount).toBe(4);
  });
});

describe('statuses', () => {
  it('thorns on an enemy hurt the hero for each direct die hit, but not for poison or Venom', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, undefined, { startStatuses: { thorns: 2 } })], { heroes: party(face('damage', 2, ['twin']), face('damage', 2, ['venom']), face('shield', 3)) });
    expect(engine.previewDie(game, 0, foe(game))).toMatchObject({ selfHpLoss: 4 });
    let g = play(engine, game, use(0, foe(game)), use(1, foe(game)));
    expect(g.run!.heroes.map((h) => h.hp)).toEqual([16, 20, 20]);
    g = play(engine, g, use(2, ally(0)), END, use(0, foe(g)));
    expect(g.run!.heroes[0]!.hp).toBe(12);
  });

  it('thorns damage is direct: shield absorbs it, and it can down the attacker', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, undefined, { startStatuses: { thorns: 3 } })], { heroes: party(face('shield', 2), face('damage', 2), face('damage', 2)) }, { hp: [20, 20, 3] });
    let g = play(engine, game, use(0, ally(1)), use(1, foe(game)));
    expect(g.run!.heroes[1]!.hp).toBe(19);
    expect(engine.previewDie(g, 2, foe(g))).toMatchObject({ selfHpLoss: 3 });
    g = play(engine, g, use(2, foe(g)));
    expect(g.run!.heroes[2]).toMatchObject({ hp: 0, downed: true });
    expect(engine.dice(g)[2]).toMatchObject({ usable: false });
  });

  it('regen heals at the start of the unit\'s turn and fades', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, undefined, { startStatuses: { regen: 2 } })], { items: [item('whetstone', { modifiers: [{ type: 'startStatus', status: 'regen', amount: 2 }] })] }, { items: [['whetstone']], hp: [10, 20, 20] });
    expect(game.run!.heroes[0]!.hp).toBe(12);
    F(game).enemies[0]!.hp = 20;
    let g = play(engine, game, END);
    expect([g.run!.heroes[0]!.hp, F(g).enemies[0]!.hp]).toEqual([13, 22]);
    g = play(engine, g, END, END);
    expect([g.run!.heroes[0]!.hp, F(g).enemies[0]!.hp]).toEqual([13, 23]);
  });

  it('strength and weak on a hero change that hero\'s damage faces', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30)], { heroes: party(face('damage', 3), face('shield', 3), face('damage', 3)), items: [item('whetstone', { modifiers: [{ type: 'startStatus', status: 'strength', amount: 2 }] })] }, { items: [['whetstone'], ['whetstone']] });
    expect(engine.dice(game).map((d) => d.value)).toEqual([5, 3, 3]);
    F(game).heroes[2]!.statuses.weak = 1;
    expect(engine.dice(game).map((d) => d.value)).toEqual([5, 3, 2]);
    expect(F(play(engine, game, END)).heroes[2]!.statuses.weak).toBeUndefined();
  });

  it('mark adds to every direct hit this round, then clears', () => {
    const { engine, game } = vs([enemy('gnaw_rat', 30, undefined, { startStatuses: { mark: 2 } })], { heroes: party(face('damage', 1, ['twin']), face('damage', 1, ['venom']), face('heal', 1)) });
    let g = play(engine, game, use(0, foe(game)), use(1, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(24);
    g = play(engine, g, END);
    expect(F(g).enemies[0]!.hp).toBe(23);
    expect(F(g).enemies[0]!.statuses.mark).toBeUndefined();
  });
});

describe('difficulty tiers', () => {
  const tiers = (mods: TierModifier[]): ContentDB['tiers'] => mods.map((m, i) => ({ tier: i + 1, name: '', text: '', modifiers: [m] }));
  const at = (mods: TierModifier[], tier: number, defs: EnemyDef[] = [enemy('gnaw_rat', 30, [atk(2)])], extra: Partial<Parameters<typeof fight>[0]> = {}) =>
    fight({ content: content({ enemies: defs, tiers: tiers(mods) }), enemies: defs.map((d) => d.id), tier, ...extra });

  it('tier N applies the modifiers of tiers 1..N', () => {
    const mods: TierModifier[] = [{ type: 'enemyHpPct', amount: 50 }, { type: 'enemyAttack', amount: 1 }, { type: 'enemyStartShield', amount: 3 }];
    expect(F(at(mods, 0).game).enemies[0]).toMatchObject({ hp: 30, maxHp: 30, shield: 0 });
    expect(F(at(mods, 1).game).enemies[0]).toMatchObject({ hp: 45, maxHp: 45, shield: 0 });
    const t3 = at(mods, 3);
    expect(F(t3.game).enemies[0]).toMatchObject({ hp: 45, shield: 3 });
    expect(intent(t3.game).actions[0]!.amount).toBe(3);
    expect(t3.engine.forecast(t3.game).heroes[0]!.hpLoss).toBe(3);
  });

  it('enemyStartStatus, rerolls and healingPct', () => {
    const mods: TierModifier[] = [{ type: 'enemyStartStatus', status: 'thorns', amount: 1 }, { type: 'rerolls', amount: -1 }, { type: 'rerolls', amount: 1, firstTurnOnly: true }, { type: 'healingPct', amount: -50 }];
    const { engine, game } = at(mods, 4, undefined, { hp: [10, 20, 20] });
    expect(F(game).enemies[0]!.statuses.thorns).toBe(1);
    expect(F(game).rerollsLeft).toBe(2);
    const g = play(engine, game, use(2, ally(0)), END);
    expect(g.run!.heroes[0]!.hp).toBe(10 + 1 - 2);
    expect(F(g).rerollsLeft).toBe(1);
  });

  it('enemyPassive is added to enemies of the listed kinds', () => {
    const mods: TierModifier[] = [{ type: 'enemyPassive', kinds: ['elite'], passive: { trigger: 'fightStart', effects: [{ type: 'shield', target: 'self', amount: 5 }] } }];
    const defs = [enemy('gnaw_rat', 30), enemy('hollow_stag', 30, undefined, { kind: 'elite' })];
    expect(F(at(mods, 1, defs).game).enemies.map((e) => e.shield)).toEqual([0, 5]);
    expect(F(at(mods, 0, defs).game).enemies.map((e) => e.shield)).toEqual([0, 0]);
  });
});
