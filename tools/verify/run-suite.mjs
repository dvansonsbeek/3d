/**
 * The `tools/verify` suite runner (plan §5d).
 *
 * WHAT MEASURING THESE 17 SCRIPTS ACTUALLY SHOWED. The plan assumed the problem
 * was whether they run — 15 of 17 do. The real problem is that **15 of 17 cannot
 * fail**: they have no `process.exit(1)`, no throw, no assertion. Running them
 * proves nothing, and a green run would be meaningless. Only `verify-laws` and
 * `dual-balance-optimizer` have a failing exit path.
 *
 * So "convert the 17" is not mechanical. Each report-only script needs its
 * assertion identified and lifted, which is per-script judgement about what the
 * script was actually claiming. This runner encodes the classification so that
 * work is visible and ordered instead of implied.
 *
 * ONE SCRIPT IS EXCLUDED OUTRIGHT. `balance-search.js` WRITES
 * `data/balance-presets.json` — a tracked file. Running it as a test mutates the
 * repo; a plain inventory run of all 17 silently rewrote 424 lines of it. It is
 * a generator, and generators are not tests.
 *
 *   node tools/verify/run-suite.mjs            gates only (fast, CI-safe)
 *   node tools/verify/run-suite.mjs --all      + the slow ones
 *   node tools/verify/run-suite.mjs --list     classification, run nothing
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const V = (n) => join(ROOT, 'tools/verify', n);

/**
 * class:
 *   gate      — has a failing exit path; a real check
 *   liftable  — prints pass/fail markers but never fails; assertion can be extracted
 *   narrative — no pass/fail concept; an analysis, findings live in docs/
 *   generator — writes tracked artifacts; MUST NOT run in a suite
 */
const MANIFEST = [
  { n: 'verify-laws.js', class: 'gate', ms: 53,
    expect: { passed: 44, total: 45 },
    knownFailure: 'Saturn Laplace-Lagrange bound [0.920,1.050] not inside [0.797,1.020] — documented, not a regression',
    note: 'Its own output contains `✓ saturn J2000 match < 0.1": 0.0000"` — the anchor tautology. Do not treat that line as a gate.' },

  { n: 'dual-balance-optimizer.js', class: 'gate', ms: 658 },

  { n: 'ascending-node-verification.js', class: 'liftable', ms: 49, markers: 8 },
  { n: 'inclination-verification.js', class: 'liftable', ms: 61, markers: 20 },
  { n: 'inclination-optimization.js', class: 'liftable', ms: 51, markers: 10 },
  { n: 'config1-proof.js', class: 'liftable', ms: null, markers: 20, slow: true,
    note: 'exceeds 60 s — a full Fibonacci d-value x group scan' },

  { n: 'balance-search.js', class: 'generator', ms: 2645,
    writes: 'data/balance-presets.json (tracked)' },

  { n: 'analytical-ascending-nodes.js', class: 'narrative', ms: 43 },
  { n: 'ascending-node-optimization.js', class: 'narrative', ms: 42 },
  { n: 'ascending-node-souami-souchay.js', class: 'narrative', ms: 49 },
  { n: 'configuration-analysis.js', class: 'narrative', ms: 28054, slow: true },
  { n: 'eccentricity-balance.js', class: 'narrative', ms: 48 },
  { n: 'epoch-independence.js', class: 'narrative', ms: 51,
    note: 'about ECCENTRICITY-BALANCE epoch independence, NOT the referential-transparency gate. Similar name, different thing.' },
  { n: 'measure-rms-by-epoch.js', class: 'narrative', ms: 9406, slow: true },
  { n: 'measure-rms-historical-vs-jpl.js', class: 'narrative', ms: 17077, slow: true },
  { n: 'mercury-precession-centuries.js', class: 'narrative', ms: 44 },
  { n: 'moon-deltat-comparison.js', class: 'narrative', ms: 100 },
];

const args = process.argv.slice(2);
const list = args.includes('--list');
const all = args.includes('--all');

const counts = MANIFEST.reduce((a, m) => ({ ...a, [m.class]: (a[m.class] ?? 0) + 1 }), {});

console.log('tools/verify — 17 scripts');
console.log('='.repeat(78));
console.log(`  gate ${counts.gate} · liftable ${counts.liftable} · narrative ${counts.narrative} · generator ${counts.generator}`);
console.log('  15 of 17 have NO failing exit path. Running those proves nothing.');

if (list) {
  for (const cls of ['gate', 'liftable', 'generator', 'narrative']) {
    console.log(`\n  ${cls.toUpperCase()}`);
    for (const m of MANIFEST.filter((x) => x.class === cls)) {
      console.log(`    ${m.n.padEnd(38)}${m.slow ? ' SLOW' : ''}${m.writes ? `  WRITES ${m.writes}` : ''}`);
      if (m.note) console.log(`      ${m.note}`);
      if (m.knownFailure) console.log(`      known failure: ${m.knownFailure}`);
    }
  }
  process.exit(0);
}

const toRun = MANIFEST.filter((m) => m.class === 'gate' && (all || !m.slow));
console.log(`\n  running ${toRun.length} gate(s)${all ? ' (--all)' : ''}; generator excluded by design\n`);

let failed = 0;
for (const m of toRun) {
  let out = '';
  let rc = 0;
  try {
    out = execFileSync(process.execPath, [V(m.n)], { encoding: 'utf8', timeout: 300_000 });
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    rc = e.status ?? 1;
  }

  if (m.expect) {
    // Golden master on the CHECK COUNT, not the exit code: verify-laws exits 1
    // because of a single documented failure. 44/45 is the correct state; both
    // 43/45 (new breakage) and 45/45 (something changed) deserve attention.
    const mm = out.match(/Checks passed:\s*(\d+)\s*\/\s*(\d+)/);
    if (!mm) {
      console.log(`  ${m.n.padEnd(30)} FAIL — could not parse the check count`);
      failed += 1;
      continue;
    }
    const [passed, total] = [Number(mm[1]), Number(mm[2])];
    const ok = passed === m.expect.passed && total === m.expect.total;
    console.log(`  ${m.n.padEnd(30)} ${ok ? 'PASS' : 'FAIL'}  ${passed}/${total} (expected ${m.expect.passed}/${m.expect.total})`);
    if (!ok) {
      failed += 1;
      console.log(`    ${passed < m.expect.passed ? 'REGRESSION — a check that used to pass now fails.' : 'IMPROVED or the suite changed — verify, then update the manifest.'}`);
    } else if (m.knownFailure) {
      console.log(`    known failure carried: ${m.knownFailure}`);
    }
    continue;
  }

  console.log(`  ${m.n.padEnd(30)} ${rc === 0 ? 'PASS' : `FAIL (exit ${rc})`}`);
  if (rc !== 0) failed += 1;
}

console.log(`\n${'='.repeat(78)}`);
if (failed) {
  console.log(`FAIL — ${failed} gate(s) failed.`);
  process.exit(1);
}
console.log('PASS — all gates green.');
console.log(`Backlog: ${counts.liftable} liftable script(s) still cannot fail. See --list.`);
