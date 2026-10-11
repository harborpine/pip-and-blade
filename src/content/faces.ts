/** Faces offered by "replace a face" rewards. Each hero sees the shared pool plus their own. */
import type { RewardFaceDef } from '@shared';
import { reward } from './helpers';

export const rewardFaces: RewardFaceDef[] = [
  // ---- shared pool
  reward('common', 'any', 'pool.strike', 'Clean Strike', 'damage', 'blade', 5),
  reward('common', 'any', 'pool.block', 'Solid Block', 'shield', 'guard', 5),
  reward('common', 'any', 'pool.salve', 'Salve', 'heal', 'heart', 4),
  reward('common', 'any', 'pool.breath', 'Deep Breath', 'focus', 'spark', 2),
  reward('uncommon', 'any', 'pool.heavy', 'Heavy Blow', 'damage', 'blade', 7),
  reward('uncommon', 'any', 'pool.sweep', 'Wide Sweep', 'damage', 'blade', 3, ['cleave']),
  reward('uncommon', 'any', 'pool.needle', 'Bone Needle', 'damage', 'skull', 5, ['pierce']),
  reward('uncommon', 'any', 'pool.bastion', 'Standing Guard', 'shield', 'guard', 4, ['ward']),
  reward('rare', 'any', 'pool.finisher', 'Finisher', 'damage', 'skull', 6, ['execute']),
  reward('rare', 'any', 'pool.aegis', 'Aegis', 'shield', 'guard', 4, ['cleave']),

  // ---- Tamsin the Bulwark: Fortress
  reward('common', ['bulwark'], 'bulwark.tower', 'Tower Shield', 'shield', 'guard', 6),
  reward('common', ['bulwark'], 'bulwark.shieldbash', 'Shield Bash', 'damage', 'guard', 5),
  reward('uncommon', ['bulwark'], 'bulwark.oath', 'Iron Oath', 'shield', 'guard', 5, ['ward']),
  reward('uncommon', ['bulwark'], 'bulwark.roar', 'Taunting Roar', 'weaken', 'spark', 3, ['cleave']),
  reward('uncommon', ['bulwark'], 'bulwark.line', 'Hold the Line', 'shield', 'guard', 2, ['cleave', 'ward']),
  reward('rare', ['bulwark'], 'bulwark.rampart', 'Rampart', 'shield', 'guard', 5, ['cleave']),

  // ---- Rook the Duelist: Poised blades
  reward('common', ['duelist'], 'duelist.riposte', 'Riposte', 'damage', 'blade', 4, ['poised']),
  reward('common', ['duelist'], 'duelist.engarde', 'En Garde', 'shield', 'guard', 3, ['poised']),
  reward('uncommon', ['duelist'], 'duelist.heartseeker', 'Heartseeker', 'damage', 'blade', 6, ['pierce']),
  reward('uncommon', ['duelist'], 'duelist.feint', 'Feint', 'damage', 'blade', 3, ['twin']),
  reward('rare', ['duelist'], 'duelist.coup', 'Coup de Grace', 'damage', 'blade', 5, ['execute']),
  reward('rare', ['duelist'], 'duelist.form', 'Perfect Form', 'damage', 'blade', 6, ['poised']),

  // ---- Odalie the Herbalist: Venom and mending
  reward('common', ['herbalist'], 'herbalist.hemlock', 'Hemlock', 'damage', 'skull', 4, ['venom']),
  reward('common', ['herbalist'], 'herbalist.balm', 'Balm', 'heal', 'heart', 5),
  reward('uncommon', ['herbalist'], 'herbalist.spores', 'Spore Cloud', 'damage', 'skull', 2, ['venom', 'cleave']),
  reward('uncommon', ['herbalist'], 'herbalist.blight', 'Blight', 'damage', 'skull', 2, ['venom', 'twin']),
  reward('uncommon', ['herbalist'], 'herbalist.restorative', 'Restorative', 'heal', 'heart', 3, ['cleave']),
  reward('rare', ['herbalist'], 'herbalist.miasma', 'Miasma', 'damage', 'skull', 3, ['venom', 'cleave']),

  // ---- Sixpence the Gambler: Tempo
  reward('common', ['gambler'], 'gambler.raise', 'Raise', 'damage', 'spark', 4, ['momentum']),
  reward('common', ['gambler'], 'gambler.bluff', 'Bluff', 'shield', 'guard', 3, ['momentum']),
  reward('uncommon', ['gambler'], 'gambler.allin', 'All In', 'damage', 'spark', 5, ['momentum']),
  reward('uncommon', ['gambler'], 'gambler.storm', 'Card Storm', 'damage', 'spark', 2, ['momentum', 'cleave']),
  reward('uncommon', ['gambler'], 'gambler.stack', 'Stack the Deck', 'focus', 'spark', 3),
  reward('rare', ['gambler'], 'gambler.loaded', 'Loaded Hand', 'damage', 'spark', 2, ['momentum', 'twin']),

  // ---- Hroda Redhand: Reckless
  reward('common', ['redhand'], 'redhand.bloodlet', 'Bloodletting', 'damage', 'blade', 4, ['reckless', 'cleave']),
  reward('common', ['redhand'], 'redhand.warcry', 'War Cry', 'damage', 'blade', 3, ['rally']),
  reward('uncommon', ['redhand'], 'redhand.berserk', 'Berserk', 'damage', 'blade', 12, ['reckless']),
  reward('uncommon', ['redhand'], 'redhand.headsman', 'Headsman', 'damage', 'skull', 5, ['execute']),
  reward('uncommon', ['redhand'], 'redhand.butcher', 'Butcher', 'damage', 'blade', 4, ['cleave']),
  reward('rare', ['redhand'], 'redhand.rampage', 'Rampage', 'damage', 'blade', 5, ['reckless', 'twin']),

  // ---- Brasswick the Automaton: Echo and Twin
  reward('common', ['automaton'], 'automaton.copycat', 'Copycat', 'damage', 'spark', 2, ['echo']),
  reward('common', ['automaton'], 'automaton.twinplate', 'Double Plating', 'shield', 'guard', 3, ['twin']),
  reward('uncommon', ['automaton'], 'automaton.amplifier', 'Amplifier', 'damage', 'spark', 3, ['echo']),
  reward('uncommon', ['automaton'], 'automaton.pistons', 'Twin Pistons', 'damage', 'blade', 3, ['twin']),
  reward('rare', ['automaton'], 'automaton.feedback', 'Feedback Loop', 'damage', 'spark', 4, ['echo']),
  reward('rare', ['automaton'], 'automaton.overclock', 'Overclock', 'damage', 'spark', 4, ['twin']),

  // ---- Mossback the Grower: Growth and Rally
  reward('common', ['grower'], 'grower.seedling', 'Seedling', 'damage', 'heart', 5, ['growth']),
  reward('common', ['grower'], 'grower.chorus', 'Dawn Chorus', 'heal', 'heart', 2, ['rally']),
  reward('uncommon', ['grower'], 'grower.ironbark', 'Ironbark', 'shield', 'guard', 3, ['growth', 'ward']),
  reward('uncommon', ['grower'], 'grower.overgrowth', 'Overgrowth', 'damage', 'heart', 3, ['growth', 'cleave']),
  reward('uncommon', ['grower'], 'grower.canopy', 'Canopy', 'shield', 'guard', 2, ['growth', 'cleave']),
  reward('rare', ['grower'], 'grower.elder', 'Elder Bough', 'damage', 'heart', 6, ['growth']),

  // ---- Vesper the Hexer: Skulls, Weaken, Venom
  reward('common', ['hexer'], 'hexer.bane', 'Bane', 'damage', 'skull', 4, ['venom']),
  reward('common', ['hexer'], 'hexer.chill', 'Grave Chill', 'damage', 'skull', 3, ['cleave']),
  reward('uncommon', ['hexer'], 'hexer.enfeeble', 'Enfeeble', 'weaken', 'skull', 3, ['cleave']),
  reward('uncommon', ['hexer'], 'hexer.doom', 'Doom Bolt', 'damage', 'skull', 6),
  reward('uncommon', ['hexer'], 'hexer.evileye', 'Evil Eye', 'damage', 'skull', 4, ['execute']),
  reward('rare', ['hexer'], 'hexer.rot', 'Soul Rot', 'damage', 'skull', 2, ['venom', 'twin']),
];
