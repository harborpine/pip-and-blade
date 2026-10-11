/**
 * Balance simulation (`npm run sim`), part of `npm run verify`.
 *
 *   npm run sim              the full gate: exits 1 if any line fails
 *   npm run sim -- --quick   a small sample, printed without gating (always exits 0)
 *   npm run sim -- --runs=500 --only=skilled,venom   custom sample / groups (never gates)
 *
 * Thresholds come from docs/design.md section 10 and are fixed by the owner. Never loosen one,
 * shrink the sample or special-case seeds here: tune the content until honest bots hit them.
 */
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { CONTENT } from '@content';
import { checkFairness } from './fairness';
import type { CareerResult, Job, JobResult } from './jobs';
import { runJob } from './jobs';
import type { HeroId } from '@shared';
import type { RunResult } from './runner';
import { STRATEGIES, STRATEGY_NAMES } from './strategies';

// ---------------------------------------------------------------- fixed thresholds (design.md section 10)
const T = {
  runsPerBot: 2000,
  skilledWin: [20, 35] as const,
  carelessAct1Min: 50,
  carelessWinMax: 8,
  strategyWin: [15, 40] as const,
  strategiesNeeded: 6,
  medianWinTurnsMax: 45,
  /** No party of three may win more than this with uncommitted skilled play (added by the lead: no dominant trio). */
  trioWinMax: 40,
  runsPerTrio: 600,
};

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const argOf = (name: string): string | undefined => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const customRuns = argOf('runs') ? Number(argOf('runs')) : undefined;
const only = argOf('only')?.split(',');
const gating = !quick && customRuns === undefined && !only;
const N = customRuns ?? (quick ? 120 : T.runsPerBot);
const scale = (n: number): number => (gating ? n : Math.max(20, Math.round((n * N) / T.runsPerBot)));
const SEED = 'pb1';
const CHUNK = 20;

// ---------------------------------------------------------------- jobs

function runsJobs(group: string, count: number, base: Omit<Extract<Job, { kind: 'runs' }>, 'kind' | 'group' | 'from' | 'to' | 'seedPrefix'>): Job[] {
  const out: Job[] = [];
  for (let from = 0; from < count; from += CHUNK) out.push({ kind: 'runs', group, seedPrefix: `${SEED}-${group}`, from, to: Math.min(count, from + CHUNK), ...base });
  return out;
}

const want = (group: string): boolean => !only || only.some((o) => group === o || group.startsWith(`${o}:`) || group.endsWith(`:${o}`));
const jobs: Job[] = [];
if (want('skilled')) jobs.push(...runsJobs('skilled', N, { bot: 'skilled', strategy: null, party: 'mixed', tier: 0 }));
if (want('careless')) jobs.push(...runsJobs('careless', N, { bot: 'careless', strategy: null, party: 'starters', tier: 0 }));
for (const s of STRATEGY_NAMES) if (want(`strategy:${s}`)) jobs.push(...runsJobs(`strategy:${s}`, N, { bot: 'skilled', strategy: s, party: 'strategy', tier: 0 }));
// Every possible party of three, played by the uncommitted skilled bot: no trio may dominate.
const HERO_IDS = CONTENT.heroes.map((h) => h.id);
const TRIOS: HeroId[][] = [];
for (let a = 0; a < HERO_IDS.length; a++) for (let b = a + 1; b < HERO_IDS.length; b++) for (let c = b + 1; c < HERO_IDS.length; c++) TRIOS.push([HERO_IDS[a]!, HERO_IDS[b]!, HERO_IDS[c]!]);
const trioName = (t: readonly HeroId[]): string => `trio:${HERO_IDS.filter((h) => t.includes(h)).join('+')}`;
const TRIO_RUNS = scale(T.runsPerTrio);
if (want('trio')) for (const t of TRIOS) jobs.push(...runsJobs(trioName(t), TRIO_RUNS, { bot: 'skilled', strategy: null, party: 'mixed', heroes: t, tier: 0 }));
if (want('starters')) jobs.push(...runsJobs('starters', scale(1000), { bot: 'skilled', strategy: null, party: 'starters', tier: 0 }));
for (let tier = 1; tier <= CONTENT.tiers.length; tier++) if (want(`tier:${tier}`) || want('tiers')) jobs.push(...runsJobs(`tier:${tier}`, scale(600), { bot: 'skilled', strategy: null, party: 'mixed', tier }));
if (want('steady')) jobs.push(...runsJobs('steady', scale(400), { bot: 'skilled', strategy: null, party: 'mixed', tier: 0, quirk: 'noRerollBoss' }));
// Item study (only with --only=itemstudy): every item in turn is handed to the party at the start of the run.
if (only?.includes('itemstudy')) {
  jobs.push(...runsJobs('itemstudy:(none)', N, { bot: 'skilled', strategy: null, party: 'mixed', tier: 0 }));
  for (const it of CONTENT.items) jobs.push(...runsJobs(`itemstudy:${it.id}`, N, { bot: 'skilled', strategy: null, party: 'mixed', tier: 0, startItem: it.id }));
}
const CAREERS = scale(32);
const CAREER_RUNS = 30;
if (want('career')) for (let i = 0; i < CAREERS; i++) jobs.push({ kind: 'career', group: 'career', bot: 'skilled', runs: CAREER_RUNS, seedPrefix: `${SEED}-career`, index: i });
const NEWBIES = scale(32);
if (want('newbie')) for (let i = 0; i < NEWBIES; i++) jobs.push({ kind: 'career', group: 'newbie', bot: 'careless', runs: 8, seedPrefix: `${SEED}-newbie`, index: i });

// ---------------------------------------------------------------- worker pool

async function runAll(all: Job[]): Promise<JobResult[]> {
  const threads = Math.max(1, Math.min(all.length, Math.max(1, cpus().length - 2), 30));
  if (threads <= 1 || all.length <= 2) return all.map(runJob);
  const results: JobResult[] = [];
  let next = 0;
  let done = 0;
  await new Promise<void>((resolve, reject) => {
    const workers: Worker[] = [];
    const stopAll = (): void => { for (const w of workers) void w.terminate(); };
    for (let i = 0; i < threads; i++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { execArgv: process.execArgv });
      workers.push(w);
      const feed = (): void => {
        if (next < all.length) w.postMessage(all[next++]);
        else w.postMessage('stop');
      };
      w.on('message', (msg: { ok: true; result: JobResult } | { ok: false; error: string }) => {
        if (!msg.ok) { stopAll(); reject(new Error(msg.error)); return; }
        results.push(msg.result);
        done++;
        if (done === all.length) { stopAll(); resolve(); } else feed();
      });
      w.on('error', (err) => { stopAll(); reject(err); });
      feed();
    }
  });
  return results;
}

// ---------------------------------------------------------------- reporting

const pct = (a: number, b: number): number => (b === 0 ? 0 : (a * 100) / b);
const fmt = (x: number): string => `${x.toFixed(1)}%`;
const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]!;
};
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pad = (s: string, n: number): string => (s.length >= n ? s : s + ' '.repeat(n - s.length));

interface Summary {
  n: number;
  win: number;
  act1: number;
  act2: number;
  avgTurns: number;
  medWinTurns: number;
  avgFights: number;
}
function summarise(rs: RunResult[]): Summary {
  const wins = rs.filter((r) => r.won);
  return {
    n: rs.length,
    win: pct(wins.length, rs.length),
    act1: pct(rs.filter((r) => r.bossesWon >= 1).length, rs.length),
    act2: pct(rs.filter((r) => r.bossesWon >= 2).length, rs.length),
    avgTurns: mean(rs.map((r) => r.turns)),
    medWinTurns: median(wins.map((r) => r.turns)),
    avgFights: mean(rs.map((r) => r.fightsWon)),
  };
}
const row = (name: string, s: Summary): string =>
  `${pad(name, 20)} runs ${pad(String(s.n), 5)} win ${pad(fmt(s.win), 6)} clears Act 1 ${pad(fmt(s.act1), 6)} clears Act 2 ${pad(fmt(s.act2), 6)} fights won ${s.avgFights.toFixed(1)}/12  turns ${s.avgTurns.toFixed(0)}`;

async function main(): Promise<void> {
  const started = performance.now();
  console.log(`Pip & Blade balance simulation ${gating ? '(full gate)' : '(sample only: not gating)'}`);
  console.log(`${jobs.length} jobs, base sample ${N} runs per bot and per strategy, tier 0 unless stated`);
  const fairness = gating || want('fairness') ? checkFairness(CONTENT, gating ? 24 : 6) : [];
  const out = await runAll(jobs);
  const groups = new Map<string, RunResult[]>();
  const careers = new Map<string, CareerResult[]>();
  for (const r of out) {
    groups.set(r.group, [...(groups.get(r.group) ?? []), ...r.runs]);
    if (r.career) careers.set(r.group, [...(careers.get(r.group) ?? []), r.career]);
  }
  const g = (name: string): RunResult[] => groups.get(name) ?? [];
  const lines: { name: string; pass: boolean; detail: string }[] = [];
  const add = (name: string, pass: boolean, detail: string): void => { lines.push({ name, pass, detail }); };

  console.log('\n== Results by group ==');
  for (const [name, rs] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) console.log(row(name, summarise(rs)));

  // ---- 1. skilled
  const sk = g('skilled');
  if (sk.length) {
    const s = summarise(sk);
    add(`1. Skilled bot wins ${T.skilledWin[0]}-${T.skilledWin[1]}% (mixed parties, ${s.n} runs)`, s.n >= N && s.win >= T.skilledWin[0] && s.win <= T.skilledWin[1], fmt(s.win));
    add(`4. Median winning run <= ${T.medianWinTurnsMax} player turns`, s.medWinTurns > 0 && s.medWinTurns <= T.medianWinTurnsMax, `${s.medWinTurns} turns (average over all runs ${s.avgTurns.toFixed(0)})`);
  }
  // ---- 2. careless
  const ca = g('careless');
  if (ca.length) {
    const s = summarise(ca);
    add(`2a. Careless bot clears Act 1 in >= ${T.carelessAct1Min}% (starter party, ${s.n} runs)`, s.n >= N && s.act1 >= T.carelessAct1Min, fmt(s.act1));
    add(`2b. Careless bot wins <= ${T.carelessWinMax}%`, s.n >= N && s.win <= T.carelessWinMax, fmt(s.win));
  }
  // ---- 3. strategies
  const strat = STRATEGY_NAMES.map((name) => ({ name, s: summarise(g(`strategy:${name}`)) })).filter((x) => x.s.n > 0);
  if (strat.length) {
    console.log('\n== Named strategies (skilled bot committed) ==');
    for (const x of strat) {
      const inBand = x.s.win >= T.strategyWin[0] && x.s.win <= T.strategyWin[1];
      const keys = Object.entries(STRATEGIES[x.name]!.items).filter(([, m]) => (m ?? 1) >= 2).map(([id]) => id);
      const withKey = (rs: RunResult[]): string => (rs.length ? fmt(pct(rs.filter((r) => r.itemsHeld.some((i) => keys.includes(i))).length, rs.length)) : '-');
      const base = g(trioName(STRATEGIES[x.name]!.party));
      console.log(`${pad(x.name, 10)} ${pad(fmt(x.s.win), 6)} ${inBand ? 'in band ' : x.s.win > T.strategyWin[1] ? 'TOO HIGH' : 'below   '} runs ${x.s.n}  party ${pad(STRATEGIES[x.name]!.party.join(', '), 30)} ended holding a key item ${pad(withKey(g(`strategy:${x.name}`)), 6)}`
        + (base.length ? ` | same three heroes uncommitted: win ${fmt(summarise(base).win)}, key item ${withKey(base)} (${base.length} runs)` : ''));
    }
    const inBand = strat.filter((x) => x.s.n >= N && x.s.win >= T.strategyWin[0] && x.s.win <= T.strategyWin[1]);
    const tooHigh = strat.filter((x) => x.s.win > T.strategyWin[1]);
    add(`3a. At least ${T.strategiesNeeded} strategies win ${T.strategyWin[0]}-${T.strategyWin[1]}% (${N} runs each)`, inBand.length >= T.strategiesNeeded, `${inBand.length} in band: ${inBand.map((x) => `${x.name} ${fmt(x.s.win)}`).join(', ')}`);
    add(`3b. No strategy above ${T.strategyWin[1]}%`, tooHigh.length === 0, tooHigh.length ? tooHigh.map((x) => `${x.name} ${fmt(x.s.win)}`).join(', ') : `highest ${fmt(Math.max(...strat.map((x) => x.s.win)))}`);
  }
  // ---- 3c. every trio
  const trios = TRIOS.map((t) => ({ name: trioName(t).slice(5), s: summarise(g(trioName(t))) })).filter((x) => x.s.n > 0).sort((a, b) => b.s.win - a.s.win);
  if (trios.length) {
    const over = trios.filter((x) => x.s.win > T.trioWinMax);
    const enough = trios.length === TRIOS.length && trios.every((x) => x.s.n >= T.runsPerTrio);
    add(`3c. No party of three wins more than ${T.trioWinMax}% uncommitted (${TRIOS.length} trios, ${TRIO_RUNS} runs each)`, (enough || !gating) && over.length === 0,
      over.length ? over.map((x) => `${x.name} ${fmt(x.s.win)}`).join(', ') : `strongest ${trios[0]!.name} ${fmt(trios[0]!.s.win)}`);
    console.log('\n== Every party of three (skilled bot, uncommitted) ==');
    console.log(`Strongest: ${trios.slice(0, 5).map((x) => `${x.name} ${fmt(x.s.win)}`).join('; ')}`);
    console.log(`Weakest:   ${trios.slice(-5).reverse().map((x) => `${x.name} ${fmt(x.s.win)}`).join('; ')}`);
    console.log(`Average ${fmt(mean(trios.map((x) => x.s.win)))}, median ${fmt(median(trios.map((x) => x.s.win)))} over ${trios.length} trios`);
  }
  // ---- 5. fairness
  for (const f of fairness) add(`5. ${f.name}`, f.pass, f.detail);
  // ---- 6. feats and heroes
  const everything = [...groups.values()].flat();
  const featCount = new Map<string, number>();
  for (const r of everything) for (const f of r.feats) featCount.set(f, (featCount.get(f) ?? 0) + 1);
  const missingFeats = CONTENT.feats.filter((f) => !featCount.has(f.id)).map((f) => f.id);
  if (gating || !only) {
    add(`6a. Every one of the ${CONTENT.feats.length} feats is earned at least once`, missingFeats.length === 0, missingFeats.length ? `never earned: ${missingFeats.join(', ')}` : `all earned across ${everything.length} runs`);
  }
  if (sk.length) {
    const heroWins = CONTENT.heroes.map((h) => ({ id: h.id, runs: sk.filter((r) => r.heroes.includes(h.id)).length, wins: sk.filter((r) => r.won && r.heroes.includes(h.id)).length }));
    const none = heroWins.filter((h) => h.wins === 0).map((h) => h.id);
    add('6b. Every hero appears in winning runs', none.length === 0, none.length ? `no wins with: ${none.join(', ')}` : heroWins.map((h) => `${h.id} ${fmt(pct(h.wins, h.runs))}`).join(', '));
  }

  // ---------------------------------------------------------------- information (no thresholds)
  console.log('\n== More detail (no thresholds) ==');
  if (sk.length) {
    console.log('Win rate by hero in the party (skilled, mixed parties):');
    for (const h of CONTENT.heroes) {
      const rs = sk.filter((r) => r.heroes.includes(h.id));
      console.log(`  ${pad(h.id, 10)} ${pad(fmt(pct(rs.filter((r) => r.won).length, rs.length)), 6)} over ${rs.length} runs`);
    }
  }
  const st = g('starters');
  if (st.length) console.log(`Brand-new player party (the three starters, nothing unlocked), skilled play: ${row('', summarise(st)).trim()}`);
  for (let tier = 1; tier <= CONTENT.tiers.length; tier++) {
    const rs = g(`tier:${tier}`);
    if (rs.length) console.log(`Tier ${tier} (skilled, mixed): win ${fmt(summarise(rs).win)} over ${rs.length} runs`);
  }
  for (const name of ['skilled', 'careless']) {
    const losses = g(name).filter((r) => !r.won);
    if (!losses.length) continue;
    const by = new Map<string, number>();
    for (const r of losses) by.set(`Act ${r.act} ${r.slot === 4 ? 'boss' : `fight ${r.slot}`}`, (by.get(`Act ${r.act} ${r.slot === 4 ? 'boss' : `fight ${r.slot}`}`) ?? 0) + 1);
    const reachAct2 = pct(g(name).filter((r) => r.bossesWon >= 1).length, g(name).length);
    console.log(`Where ${name} runs end when lost (${fmt(reachAct2)} of all runs reach Act 2):`);
    console.log(`  ${[...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}: ${fmt(pct(v, losses.length))}`).join('  ')}`);
  }
  if (sk.length) {
    const offered = new Map<string, number>();
    const taken = new Map<string, number>();
    for (const r of sk) {
      for (const i of r.itemsOffered) offered.set(i, (offered.get(i) ?? 0) + 1);
      for (const i of r.itemsTaken) taken.set(i, (taken.get(i) ?? 0) + 1);
    }
    const rates = CONTENT.items.map((i) => ({ id: i.id, taken: taken.get(i.id) ?? 0, offered: offered.get(i.id) ?? 0 })).sort((a, b) => b.taken - a.taken);
    console.log(`Most picked items (skilled): ${rates.slice(0, 6).map((x) => `${x.id} ${x.taken}`).join(', ')}`);
    console.log(`Least picked items (skilled): ${rates.slice(-6).map((x) => `${x.id} ${x.taken}/${x.offered} offers`).join(', ')}`);
    if (args.includes('--items')) {
      console.log('Every item (skilled): times taken / offers, and win rate of runs that took it');
      for (const x of rates) {
        const rs = sk.filter((r) => r.itemsTaken.includes(x.id as never));
        console.log(`  ${pad(x.id, 20)} ${pad(`${x.taken}/${x.offered}`, 10)} win ${fmt(pct(rs.filter((r) => r.won).length, rs.length))}`);
      }
    }
  }
  for (const name of ['career', 'newbie']) {
    const cs = careers.get(name);
    if (!cs?.length) continue;
    console.log(`${name === 'career' ? `Fresh-profile careers, skilled play (${cs.length} careers of ${CAREER_RUNS} runs)` : `Fresh-profile careers, careless play (${cs.length} careers of 8 runs)`}: run number by which half of them had each unlock`);
    const parts: string[] = [];
    for (const f of CONTENT.feats) {
      if (!f.unlocks?.heroes?.length && name === 'newbie') continue;
      const at = cs.map((c) => c.featAt[f.id] ?? Infinity).sort((a, b) => a - b);
      const med = at[Math.floor((at.length - 1) / 2)]!;
      const got = at.filter((x) => x !== Infinity).length;
      parts.push(`${f.unlocks?.heroes?.[0] ?? f.unlocks?.items?.[0] ?? f.id}: ${med === Infinity ? 'not by half' : `run ${med}`} (${got}/${cs.length})`);
    }
    console.log(`  ${parts.join('; ')}`);
  }
  const stalls = everything.filter((r) => r.stalled).length;
  console.log(`Runs abandoned because a fight would not end (counted as losses): ${stalls} of ${everything.length}`);
  console.log(`Feats earned (times, all runs): ${CONTENT.feats.map((f) => `${f.id} ${featCount.get(f.id) ?? 0}`).join(', ')}`);

  // ---------------------------------------------------------------- the gate
  console.log(`\n== Gate ${gating ? '' : '(not enforced on this sample) '}==`);
  for (const l of lines) console.log(`${l.pass ? 'PASS' : 'FAIL'}  ${pad(l.name, 78)} ${l.detail}`);
  const total = everything.length;
  console.log(`\nTotal runs simulated: ${total} (skilled ${sk.length}, careless ${ca.length}, per strategy ${strat.map((x) => x.s.n).join('/') || 0}) in ${((performance.now() - started) / 1000).toFixed(0)}s`);
  const failed = lines.filter((l) => !l.pass);

  // ---------------------------------------------------------------- summary (the owner's acceptance check reads this block)
  const skS = summarise(sk);
  const caS = summarise(ca);
  console.log('\n================ SUMMARY ================');
  console.log(`Runs per bot:            skilled ${sk.length}, careless ${ca.length}`);
  console.log(`Runs per strategy:       ${strat.length ? strat.map((x) => x.s.n).join(', ') : 'none'}`);
  console.log(`Runs per party of three: ${trios.length ? `${Math.min(...trios.map((x) => x.s.n))} (x ${trios.length} trios)` : 'none'}`);
  console.log(`Total runs simulated:    ${total}`);
  console.log(`Skilled bot win rate:    ${sk.length ? fmt(skS.win) : 'not run'}   (target 20-35%)`);
  console.log(`Careless clears Act 1:   ${ca.length ? fmt(caS.act1) : 'not run'}   (target at least 50%)`);
  console.log(`Careless bot win rate:   ${ca.length ? fmt(caS.win) : 'not run'}   (target at most 8%)`);
  console.log(`Median winning run:      ${sk.length ? `${skS.medWinTurns} player turns` : 'not run'}   (target at most 45)`);
  console.log(`Strategy win rates:      ${strat.map((x) => `${x.name} ${fmt(x.s.win)}`).join(', ') || 'not run'}   (target 15-40% for at least 6, none above 40%)`);
  console.log(`Strongest party of three: ${trios.length ? `${trios[0]!.name} ${fmt(trios[0]!.s.win)}` : 'not run'}   (target at most 40%)`);
  console.log(`Gate lines:              ${lines.length - failed.length} passed, ${failed.length} failed${failed.length ? `: ${failed.map((l) => l.name.split(' ')[0]).join(' ')}` : ''}`);
  if (!gating) {
    console.log('GATE: NOT ENFORCED (sample run: use "npm run sim" with no options for the real gate)');
    return;
  }
  if (failed.length) {
    console.log('GATE: FAIL');
    process.exit(1);
  }
  console.log('GATE: PASS');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
