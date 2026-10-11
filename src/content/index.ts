/** All game content, assembled. Every balance number lives in this folder, one file per kind. */
import type { ContentDB } from '@shared';
import { encounters, tutorial } from './encounters';
import { act1Enemies } from './enemies-act1';
import { act2Enemies } from './enemies-act2';
import { act3Enemies } from './enemies-act3';
import { events } from './events';
import { rewardFaces } from './faces';
import { feats } from './feats';
import { heroes } from './heroes';
import { items } from './items';
import { keywords } from './keywords';
import { rules, statuses } from './rules';
import { doors, sets } from './sets';
import { tiers } from './tiers';

export const CONTENT: ContentDB = {
  rules,
  keywords,
  statuses,
  heroes,
  rewardFaces,
  items,
  enemies: [...act1Enemies, ...act2Enemies, ...act3Enemies],
  encounters,
  sets,
  doors,
  events,
  tiers,
  feats,
  tutorial,
};
