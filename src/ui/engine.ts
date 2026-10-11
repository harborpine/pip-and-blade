/** The ONE place the UI reaches the rules engine and the content. */
import { CONTENT } from '@content';
import { createEngine } from '@engine';
import type { EngineX } from '@engine';
import type { ContentDB } from '@shared';

export const content: ContentDB = CONTENT;
export const engine: EngineX = createEngine(CONTENT);
