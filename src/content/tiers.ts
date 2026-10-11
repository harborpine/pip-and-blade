/** The five harder tiers. Tier N plays with the tricks of tiers 1..N. */
import type { TierDef } from '@shared';

export const tiers: TierDef[] = [
  { tier: 1, name: 'Thick Hides', text: 'Every enemy has 8% more HP.', modifiers: [{ type: 'enemyHpPct', amount: 8 }] },
  { tier: 2, name: 'Thin Bandages', text: 'All healing your heroes receive is 25% weaker.', modifiers: [{ type: 'healingPct', amount: -25 }] },
  { tier: 3, name: 'Shells Up', text: 'Every enemy starts the fight with 3 shield.', modifiers: [{ type: 'enemyStartShield', amount: 3 }] },
  { tier: 4, name: 'Cold Hands', text: 'You have 1 fewer reroll on the first turn of each fight.', modifiers: [{ type: 'rerolls', amount: -1, firstTurnOnly: true }] },
  { tier: 5, name: 'No Easy Road', text: 'The third fight of every act is always the elite.', modifiers: [{ type: 'forceElite', slot: 3 }] },
];
