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
    expect: { passed: 49, total: 50 },
    knownFailure: 'Saturn Laplace-Lagrange bound [0.920,1.050] not inside [0.797,1.020] — documented, not a regression',
    note: 'Its own output contains `✓ saturn J2000 match < 0.1": 0.0000"` — the anchor tautology. Do not treat that line as a gate. Checks 46-50 are the Config-7 falsification gate (§2j); each was shown to fail under injection.' },

  { n: 'dual-balance-optimizer.js', class: 'gate', ms: 658 },
  { n: 'perihelion-projection-closure.js', class: 'gate', ms: 400,
    note: 'Earth-frame perihelion rate ≡ ecliptic advance × dα/dλ + ∂α/∂ε·ε̇ (+κ ≤ 1 ″/cy) for all seven planets at 1900/2000/2100 — the decomposition behind the Mercury-anomaly projection statement (doc 13 §1.8).' },

  { n: 'ascending-node-verification.js', class: 'liftable', ms: 49, markers: 8 },
  { n: 'inclination-verification.js', class: 'liftable', ms: 61, markers: 20 },
  { n: 'inclination-optimization.js', class: 'liftable', ms: 51, markers: 10 },
  { n: 'config1-proof.js', class: 'liftable', ms: null, markers: 20, slow: true,
    note: 'exceeds 60 s — a full Fibonacci d-value x group scan' },

  { n: 'balance-search.js', class: 'generator', ms: 2645,
    writes: 'data/balance-presets.json (tracked)' },
  { n: 'cassini-results.js', class: 'generator', ms: 8000,
    writes: 'data/cassini-moontilt-results.json (tracked; --write only — runs both Cassini labs live)' },
  { n: 'lod-climate-correlation.js', class: 'generator', ms: 2000,
    writes: 'data/lod-climate-correlation-summary.json (tracked; --write only)' },
  { n: 'eclipse-audit.js', class: 'generator', ms: 180000, slow: true,
    writes: 'data/eclipse-audit-summary.json (tracked; --write only, REFUSES on divergence — --rebaseline is the conscious re-measurement path)' },
  { n: 'lunar-alignment.js', class: 'generator', ms: 82000, slow: true,
    writes: 'data/lunar-alignment-summary.json (tracked; same convention as eclipse-audit: plain run = reproduction check, --write refuses on divergence, --rebaseline adopts). Sections: canon TT-axis geometry 1600-2200 · documented visibility via the api observer tier · the -746 Babylonian lunar anchor · Stephenson-2016 raw-timing deltaT bands vs framework + spline' },

  { n: 'artifact-freshness.js', class: 'gate', ms: 1000,
    note: 'the campaign-artifact freshness gate — also runs as its own chain step (npm run check:artifacts); re-hashes every generated artifact\'s recorded inputs' },
  { n: 'version-pinning.js', class: 'gate', ms: 100,
    note: 'Phase 13: @essrt/physics semver + the essrt.modelVersion pairing vs model-version.json — a refit can never ship without a version bump recording it' },
  { n: 'data-provenance.js', class: 'gate', ms: 1500,
    note: 'Phase 12: every tracked file under data/ must be manifest-covered (PROVENANCE.md row, directory, or self-describing/ledgered generated JSON); no dangling rows; ledger scripts exist' },
  { n: 'predict-form-pinning.js', class: 'gate', ms: 4000,
    note: '§12g-3: PREDICT_COEFFS and their trained (Node J2000-anchored) scalar form are a matched pair — pins 35 fluctuation values to a fixture and bounds the browser-form dual divergence; --write re-records ONLY after a conscious retrain' },
  { n: 'paleo-anchors.js', class: 'gate', ms: 2000,
    note: 'Phase 19 + Driver 1½: 41 deep-time anchors (Wells 1963 · Winter 2020 · Pannella 1972 · Williams 2000 · Mitchell-Kirscher 2023 · Wu 2024 · Patterson/Roche · the mid-Precambrian set: Farhat 2022 proxies + Zhou 2024 paired a+LOD + Xiamaling + Nanfen, matched by the regime-aware recession history) recomputed LIVE from the engine vs data/paleo-validation-anchors.json; documented deviations (Williams 620 Ma, the Wu Pangea interval) are BANDS — an unexplained improvement fails too (the verify-laws precedent)' },

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

// Completeness: every .js in this directory must be classified — an
// unclassified script silently escapes the suite (measured: four scripts
// accumulated outside the manifest before this check existed).
{
  const { readdirSync } = await import('node:fs');
  const here = fileURLToPath(new URL('.', import.meta.url));
  const onDisk = readdirSync(here).filter((f) => f.endsWith('.js'));
  const known = new Set(MANIFEST.map((m) => m.n));
  const unclassified = onDisk.filter((f) => !known.has(f));
  if (unclassified.length) {
    console.error(`FAIL — unclassified script(s) in tools/verify: ${unclassified.join(', ')}`);
    console.error('Add each to the MANIFEST in run-suite.mjs with a class (gate/liftable/narrative/generator).');
    process.exit(1);
  }
}

console.log(`tools/verify — ${MANIFEST.length} scripts`);
console.log('='.repeat(78));
console.log(`  gate ${counts.gate} · liftable ${counts.liftable} · narrative ${counts.narrative} · generator ${counts.generator}`);
console.log(`  ${MANIFEST.length - counts.gate} of ${MANIFEST.length} have NO failing exit path. Running those proves nothing.`);

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
