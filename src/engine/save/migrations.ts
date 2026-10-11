/**
 * Save-file migrations. Each entry upgrades the raw parsed JSON of one version to the next.
 * Version 1 is the first format, so the list starts empty. To change the format: bump
 * SAVE_VERSION in src/shared/state.ts (lead) and append `{ from: n, to: n + 1, migrate }` here.
 */
export interface Migration {
  from: number;
  to: number;
  migrate(raw: Record<string, unknown>): Record<string, unknown>;
}

export const MIGRATIONS: Migration[] = [];

/** Runs the chain from `raw.version` up to `target`. Throws an Error with a plain message if no path exists. */
export function runMigrations(raw: Record<string, unknown>, target: number, list: Migration[] = MIGRATIONS): Record<string, unknown> {
  let cur = raw;
  const v0 = cur.version;
  if (typeof v0 !== 'number' || !Number.isInteger(v0) || v0 < 1) throw new Error('save has no valid version');
  let version: number = v0;
  if (version > target) throw new Error('save is from a newer version of the game');
  let guard = 0;
  while (version < target) {
    const from = version;
    const m = list.find((x) => x.from === from);
    if (!m || m.to <= m.from || guard++ > 1000) throw new Error(`no migration from save version ${String(version)}`);
    cur = m.migrate(cur);
    cur.version = m.to;
    version = m.to;
  }
  return cur;
}
