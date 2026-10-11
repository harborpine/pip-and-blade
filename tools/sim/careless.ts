/**
 * The careless bot: a brand-new player who does not think.
 * Uses dice in order on the first legal target, never locks, rerolls only when a blank shows,
 * and takes rewards, doors and event choices at random.
 */
import type { Action, GameState } from '@shared';
import type { Bot, BotEnv } from './runner';

function fight(env: BotEnv, game: GameState): Action {
  const { engine } = env;
  const f = game.run!.fight!;
  const dice = engine.dice(game);
  if (f.phase === 'rolling' && dice.some((d) => d.usable && d.effect === 'blank') && engine.canApply(game, { type: 'reroll' })) {
    return { type: 'reroll' };
  }
  for (const d of dice) {
    if (!d.usable) continue;
    if (d.effect === 'blank') continue;
    return d.needsTarget ? { type: 'useDie', die: d.die, target: d.targets[0] } : { type: 'useDie', die: d.die };
  }
  return { type: 'endTurn' };
}

export const carelessBot: Bot = {
  name: 'careless',
  decide(env, game) {
    const { engine, rng } = env;
    const run = game.run!;
    switch (run.phase) {
      case 'fight':
        return fight(env, game);
      case 'reward': {
        const n = run.reward!.options.length;
        const option = rng.int(n);
        const picks = engine.legalActions(game).filter((a) => a.type === 'pickReward' && a.option === option);
        return picks.length ? rng.pick(picks) : { type: 'skipReward' };
      }
      case 'doors':
        return { type: 'pickDoor', door: rng.int(run.doors!.length) };
      case 'rest':
        return run.rest && !run.rest.used ? { type: 'restHeal' } : { type: 'leave' };
      case 'shop': {
        const buys = engine.legalActions(game).filter((a) => a.type === 'shopBuy');
        // Buys one random thing it can afford, then wanders off.
        if (buys.length && run.shop!.slots.every((s) => !s.sold)) return rng.pick(buys);
        return { type: 'leave' };
      }
      case 'event': {
        const acts = engine.legalActions(game);
        const choices = acts.filter((a) => a.type === 'eventChoice');
        return choices.length ? rng.pick(choices) : { type: 'leave' };
      }
      default:
        return { type: 'continue' };
    }
  },
};
