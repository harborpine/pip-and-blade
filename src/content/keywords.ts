import type { KeywordDef } from '@shared';

export const keywords: KeywordDef[] = [
  { id: 'cleave', name: 'Cleave', text: 'Affects everyone on that side: all enemies for damage and Weaken, all your heroes for shield and healing. No target needed.', param: 0 },
  { id: 'echo', name: 'Echo', text: "Becomes a copy of the die on its left (or on its right if there is none), adding this face's own number. Copying a blank or another Echo gives a blank.", param: 0 },
  { id: 'growth', name: 'Growth', text: 'After each use, this face gains +{n} for the rest of the fight.', param: 2 },
  { id: 'reckless', name: 'Reckless', text: 'The user loses {n} HP each time it resolves. This cannot take the user below 1 HP.', param: 2 },
  { id: 'pierce', name: 'Pierce', text: 'Ignores shield.', param: 0 },
  { id: 'venom', name: 'Venom', text: 'Applies that much Poison instead of dealing damage.', param: 0 },
  { id: 'ward', name: 'Ward', text: 'Shield from this face does not expire at the start of your turn.', param: 0 },
  { id: 'twin', name: 'Twin', text: 'Resolves twice.', param: 0 },
  { id: 'rally', name: 'Rally', text: 'When used, each of your other unused dice gets +{n} this turn.', param: 1 },
  { id: 'momentum', name: 'Momentum', text: '+{n} for each reroll you have spent this turn.', param: 1 },
  { id: 'poised', name: 'Poised', text: '+{n} if you have not spent a reroll this turn.', param: 2 },
  { id: 'execute', name: 'Execute', text: 'Deals x{n} damage to a target at or below half of its max HP.', param: 2 },
];
