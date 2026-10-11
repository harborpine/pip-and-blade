/**
 * Seeds pinned for the acceptance specs. A seeded run is fully deterministic, so a seed that the
 * test bot wins today wins every time until content or rules change.
 *
 * If the full-run spec reports "pinned seed no longer wins", re-pin (never fake the win):
 *   node node_modules/tsx/dist/cli.mjs tests/e2e/support/find-seed.ts 0 1500
 * and paste one of the shortest winning seeds below.
 */
export const WINNING_SEED = 'qa-1297';
