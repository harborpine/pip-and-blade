import type { Action, GameEvent } from '@shared';

export interface Screen {
  el: HTMLElement;
  /** Called instead of rebuilding when the same screen is still showing after a state change. */
  /** Called before swapping to another screen; resolves when final animations are done. */
  leave?: (events: GameEvent[], action: Action | null) => Promise<void>;
  /** Called right after the screen was added to the page (so it can measure). */
  mounted?: () => void;
  update?: (events: GameEvent[], action: Action | null) => void;
  /** Called when the screen is removed. */
  destroy?: () => void;
}

export type ScreenBuilder = () => Screen;
