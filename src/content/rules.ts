import type { Rules, StatusDef } from '@shared';

export const rules: Rules = {
  partySize: 3,
  rerollsPerTurn: 2,
  maxEnemies: 4,
  downedReturnHpPct: 40,
  maxUpgradesPerFace: 2,
  upgradeAmount: 1,
  goldPerFight: [10, 16, 24],
  rarityWeights: {
    normal: [[70, 26, 4], [50, 38, 12], [35, 45, 20]],
    elite: [[30, 50, 20], [20, 50, 30], [10, 50, 40]],
    boss: [[0, 60, 40], [0, 45, 55], [0, 30, 70]],
  },
  restHealPct: 35,
  shop: {
    itemPrice: { common: 18, uncommon: 26, rare: 38 },
    facePrice: { common: 10, uncommon: 16, rare: 24 },
    upgradePrice: 14,
    healPrice: 10,
    healPct: 30,
    itemsOffered: 3,
    facesOffered: 2,
  },
  treasureChoices: 3,
  eliteRewardPicks: 2,
  bossHealPct: 30,
  dailyScore: { perFightWon: 100, perBossWon: 250, winBonus: 1000, perHpLeft: 5 },
  // Fury: so that no fight can go on for ever, from this turn every enemy gains Strength each enemy turn.
  fury: { fromTurn: 12, strengthPerTurn: 1 },
};

export const statuses: StatusDef[] = [
  { id: 'poison', name: 'Poison', text: 'At the start of the enemy phase it loses HP equal to its Poison, then Poison drops by 1. Ignores shield.' },
  { id: 'weak', name: 'Weak', text: 'Each hit of its attacks this turn deals that much less damage.' },
  { id: 'strength', name: 'Strength', text: 'Each hit of its attacks deals that much more damage for the rest of the fight.' },
  { id: 'thorns', name: 'Thorns', text: 'Whoever hits it with a die or an attack takes that much damage per hit.' },
  { id: 'regen', name: 'Regen', text: 'Heals that much at the start of its turn, then Regen drops by 1.' },
  { id: 'mark', name: 'Mark', text: 'Takes that much extra damage from each hit this round.' },
];
