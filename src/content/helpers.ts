/** Small builders shared by the content files. Data only: no rules live here. */
import type { FaceDef, FaceEffect, HeroId, KeywordId, Rarity, RewardFaceDef, SymbolId } from '@shared';

export function face(id: string, name: string, effect: Exclude<FaceEffect, 'blank'>, symbol: SymbolId, value: number, keywords: KeywordId[] = []): FaceDef {
  return { id, name, effect, symbol, value, keywords };
}

export function blank(id: string, name = 'Blank'): FaceDef {
  return { id, name, effect: 'blank', symbol: null, value: 0, keywords: [] };
}

export function reward(
  rarity: Rarity, heroes: HeroId[] | 'any', id: string, name: string, effect: Exclude<FaceEffect, 'blank'>, symbol: SymbolId, value: number,
  keywords: KeywordId[] = [],
): RewardFaceDef {
  return { id, name, effect, symbol, value, keywords, rarity, heroes };
}
