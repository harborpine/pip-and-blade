import { describe, expect, it } from 'vitest';
import { localDateKey } from './date';

describe('localDateKey', () => {
  it('uses the local calendar date, zero padded', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});
