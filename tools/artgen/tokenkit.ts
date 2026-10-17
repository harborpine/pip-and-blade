/** Shared bits for drawing token faces. */
import { c } from './palette';

export type TokenKind = 'hero' | 'enemy' | 'elite' | 'boss';
export interface TokenDef { kind: TokenKind; color?: string; face: () => string }

/** Attributes for a round-capped stroke in a palette colour. */
export const STROKE = (color: string, w: number): Record<string, string | number> => ({
  fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
});
export const F = (name: string): Record<string, string> => ({ fill: c(name) });
