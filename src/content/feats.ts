/** The 20 feats. They unlock the 5 extra heroes and the 12 locked items; nothing is bought or ground out. */
import type { FeatDef } from '@shared';

export const feats: FeatDef[] = [
  // ---- hero unlocks: all reachable in the first few runs, win or lose
  {
    id: 'sharp_practice', name: 'Sharp Practice', when: 'fightWon',
    text: 'Win a fight in which you spent 6 or more rerolls.',
    tests: [{ stat: 'rerollsSpent', scope: 'fight', op: '>=', value: 6 }],
    unlocks: { heroes: ['gambler'] },
  },
  {
    id: 'pay_in_blood', name: 'Pay in Blood', when: 'fightWon',
    text: 'Win a fight in which one of your heroes was downed.',
    tests: [{ stat: 'heroesDowned', scope: 'fight', op: '>=', value: 1 }],
    unlocks: { heroes: ['redhand'] },
  },
  {
    id: 'matched_set', name: 'Matched Set', when: 'fightWon',
    text: 'Form 3 pairs in a single fight and win it.',
    tests: [{ stat: 'pairsFormed', scope: 'fight', op: '>=', value: 3 }],
    unlocks: { heroes: ['automaton'] },
  },
  {
    id: 'king_felled', name: 'Timber', when: 'bossWon',
    text: 'Defeat a boss.',
    tests: [{ stat: 'bossesWon', scope: 'run', op: '>=', value: 1 }],
    unlocks: { heroes: ['grower'] },
  },
  {
    id: 'tricked_thrice', name: 'Fool Me Thrice', when: 'runEnded',
    text: 'Have enemies jam, curse or rob your dice 3 times in one run.',
    tests: [{ stat: 'tricksSuffered', scope: 'run', op: '>=', value: 3 }],
    unlocks: { heroes: ['hexer'] },
  },

  // ---- item unlocks
  {
    id: 'nothing_doing', name: 'Much Ado About Nothing', when: 'runEnded',
    text: 'Deal 30 damage with blank faces, counted across all your runs. (The Hollow Die makes blanks hurt.)',
    tests: [{ stat: 'blankDamage', scope: 'lifetime', op: '>=', value: 30 }],
    unlocks: { items: ['void_pip'] },
  },
  {
    id: 'copy_that', name: 'Copy That', when: 'runEnded',
    text: 'Use Echo faces 10 times in one run.',
    tests: [{ stat: 'echoUses', scope: 'run', op: '>=', value: 10 }],
    unlocks: { items: ['echo_bell'] },
  },
  {
    id: 'blood_price', name: 'Blood Price', when: 'runEnded',
    text: 'Use Reckless faces 10 times in one run.',
    tests: [{ stat: 'recklessUses', scope: 'run', op: '>=', value: 10 }],
    unlocks: { items: ['reckless_idol'] },
  },
  {
    id: 'one_big_hit', name: 'One Big Hit', when: 'turnEnd',
    text: 'Deal 16 or more damage to one enemy with a single hit from a die.',
    tests: [{ stat: 'biggestHit', scope: 'turn', op: '>=', value: 16 }],
    unlocks: { items: ['executioners_hood'] },
  },
  {
    id: 'full_house', name: 'Three of a Kind', when: 'runEnded',
    text: 'Form 3 triples in one run.',
    tests: [{ stat: 'triplesFormed', scope: 'run', op: '>=', value: 3 }],
    unlocks: { items: ['rainbow_prism'] },
  },
  {
    id: 'steady_hands', name: 'Steady Hands', when: 'bossWon',
    text: 'Defeat a boss without spending a single reroll in that fight.',
    tests: [{ stat: 'rerollsSpent', scope: 'fight', op: '==', value: 0 }],
    unlocks: { items: ['pip_magnet'] },
  },
  {
    id: 'razors_edge', name: "Razor's Edge", when: 'fightWon',
    text: 'Win a fight with a living hero at exactly 1 HP.',
    tests: [{ stat: 'lowestLivingHeroHp', scope: 'fight', op: '==', value: 1 }],
    unlocks: { items: ['glass_cannon'] },
  },
  {
    id: 'turtle_up', name: 'Turtle Up', when: 'turnEnd',
    text: 'Gain 12 or more shield in a single turn.',
    tests: [{ stat: 'shieldGained', scope: 'turn', op: '>=', value: 12 }],
    unlocks: { items: ['tortoise_shell'] },
  },
  {
    id: 'slow_death', name: 'Slow Death', when: 'fightWon',
    text: 'Apply 15 or more Poison in a single fight and win it.',
    tests: [{ stat: 'poisonApplied', scope: 'fight', op: '>=', value: 15 }],
    unlocks: { items: ['plague_censer'] },
  },
  {
    id: 'on_a_roll', name: 'On a Roll', when: 'runWon',
    text: 'Win two runs in a row.',
    tests: [{ stat: 'winStreak', scope: 'lifetime', op: '>=', value: 2 }],
    unlocks: { items: ['double_or_nothing'] },
  },
  {
    id: 'last_one_standing', name: 'Last One Standing', when: 'fightWon',
    text: 'Win a fight with only one hero left standing.',
    tests: [{ stat: 'livingHeroes', scope: 'fight', op: '==', value: 1 }],
    unlocks: { items: ['phoenix_feather'] },
  },
  {
    id: 'first_crown', name: 'First Crown', when: 'runWon',
    text: 'Win a run.',
    tests: [{ stat: 'runsWon', scope: 'lifetime', op: '>=', value: 1 }],
    unlocks: { items: ['kings_die'] },
  },

  // ---- bragging rights
  {
    id: 'seasoned', name: 'Seasoned', when: 'runEnded',
    text: 'Finish 10 runs, win or lose.',
    tests: [{ stat: 'runsPlayed', scope: 'lifetime', op: '>=', value: 10 }],
  },
  {
    id: 'untouchable', name: 'Untouchable', when: 'runWon',
    text: 'Win a run without any hero being downed.',
    tests: [{ stat: 'heroesDowned', scope: 'run', op: '==', value: 0 }],
  },
  {
    id: 'harder_road', name: 'The Harder Road', when: 'runWon',
    text: 'Win a run on Tier 2 or higher.',
    tests: [],
    minTier: 2,
  },
];
