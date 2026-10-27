/**
 * The `tools/verify` suite runner (plan §5d).
 *
 * `tools/verify` holds GATES and GENERATORS only — every script here either
 * fails or writes (plan 13 A5: the narratives and the ascending-node
 * derivations, which print and never fail, moved to tools/explore/). A gate
 * has a failing exit path and runs in the suite; a generator rewrites a
 * tracked data/*.json under --write and MUST NOT run as a test (a plain
 * inventory run once silently rewrote 424 lines of a tracked preset file) —
 * `npm run regen:cascade` lists the stale generators in regeneration order.
 * The suite FAILS on a script that is in the directory but not in the
 * MANIFEST, so a new script must declare which it is.
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
 *   generator — writes tracked artifacts; MUST NOT run in a suite
 * (liftable / narrative scripts no longer live here — tools/explore/)
 */
const MANIFEST = [
  // THE FIBONACCI-LAW RETIREMENT, COMPLETED (plan 07 R6). The balance suite
  // was reclassified gate→narrative at the model restatement and is now
  // DELETED with the psi/K laws it computed from — nine scripts:
  // verify-laws, dual-balance-optimizer, config1-proof,
  // configuration-analysis, eccentricity-balance, epoch-independence and
  // balance-search on the eccentricity side; inclination-verification and
  // inclination-optimization on the inclination side. Each read the retired
  // construction directly (orbitalEccentricityBase — the K law's System-Reset
  // output — or the psi law's amplitude and mean), so with the laws gone
  // there is nothing for them to compute. Doc 109 is the engine-input
  // re-evaluation that superseded them.
  // The model's falsifiability rests on the three-falsifier criterion
  // (CLAUDE.md §Verification), which never depended on these.
  //
  // (perihelion-projection-closure.js and predict-form-pinning.js — the two
  // gates on the planet predict device — were deleted with it at plan 06 R8:
  // the Earth-frame rate is now the projection formula applied to the chain's
  // own apsidal motion, so there is no fitted surrogate left to close or pin.)

  { n: 'cassini-results.js', class: 'generator', ms: 8000,
    writes: 'data/cassini-moontilt-results.json (tracked; --write only — runs both Cassini labs live)' },
  { n: 'lod-climate-correlation.js', class: 'generator', ms: 2000,
    writes: 'data/lod-climate-correlation-summary.json (tracked; --write only)' },
  { n: 'eclipse-audit.js', class: 'generator', ms: 180000, slow: true,
    writes: 'data/eclipse-audit-summary.json (tracked; --write only, REFUSES on divergence — --rebaseline is the conscious re-measurement path)' },
  { n: 'nbody-secular.js', class: 'generator', ms: 1200000, slow: true,
    writes: 'data/nbody-secular-frequencies.json (tracked; --write only — one 1-Myr WH frame=both run + NAFF, ~15-20 min). Engine-D g/s frequencies (A), 1800–2100 window rates (B), the derived 1PN supplement + the P8b Mercury closure assertion (Batch D of the restatement)' },
  { n: 'obliquity-hybrid.js', class: 'generator', ms: 90000, slow: true,
    writes: 'data/obliquity-hybrid-verdict.json (tracked; --write only — runs the one-home Stage-C lab: the derived deps/dt(J2000) beside the IAU target, the two-tier eps-vs-La2004 window tables, the H/8 beat). A plain run only prints the banked verdict' },
  { n: 'deep-secular-modes.js', class: 'generator', ms: 4800000, slow: true,
    writes: 'data/nbody-deep-secular-modes.json (tracked; --write only — needs the untracked ±10-Myr dump, produced by a separate 3.4-h run named in the header; then decimate + NAFF 18 terms, ~75 min). The two-tier deep-time Earth-z law + the T5c metronome verdict (engine-switch Stage B); NO consumer reads it until its T5d-revised gate passes. A plain run only prints the banked verdict' },
  { n: 'secular-series.js', class: 'generator', ms: 300000, slow: true,
    writes: 'data/nbody-secular-series.json (tracked; --write only — needs the same untracked ±10-Myr dump as deep-secular-modes). The Stage-C ONE-SOURCE histories: ALL EIGHT planets\' ζ AND z series (Earth 500-yr/1-kyr boxcar — it drives the obliquity-hybrid integration; planets 1000-yr/4-kyr boxcar — deep-time element display), with the banked quality verdict: hybrid ε vs IAU-2006/La2004, α(H(t)) era-regression + deep-deep band + the leg-1 fork rows, series e/ϖ vs the era-certified chain, and the MEASURED per-planet chain-handover boundaries (the D5 ring-blowup fix). A plain run only prints the banked verdict' },
  { n: 'sun-vs-horizons.js', class: 'generator', ms: 600000, slow: true,
    writes: 'data/sun-vs-horizons-summary.json (tracked; --write only — the model\'s apparent Sun and cardinal instants against the ±3000-yr Horizons TT cache; plain run = reproduction check)' },
  { n: 'equinox-vs-vondrak.js', class: 'generator', ms: 300000, slow: true,
    writes: 'data/equinox-vs-vondrak.json (tracked; --write only — the precession of date against its two theory referees: the equinox vs Vondrák 2011 over ±3000 yr beside the secular law alone, the obliquity vs La2004 over the last Myr; --write REFUSES if a precession-of-date term is missing; plain run = reproduction check)' },
  { n: 'earth-osculating-wobble.js', class: 'generator', ms: 60000,
    writes: 'data/earth-osculating-wobble.json (tracked; --write only — the EMB\'s osculating e and ϖ from the Horizons seed integrated as a nine-body system with the 1PN term and the lunar quadrupole, every 20 days over 1000–2500, beside the series\' mean; plain run = reproduction check). The Framework Verification exhibit "Perihelion — osculating vs mean" (plan 22 step 2); --write REFUSES if the window mean of (osculating − mean) exceeds 3″ / 5e-7' },
  { n: 'lunar-canon-recall.js', class: 'generator', ms: 300000, slow: true,
    writes: 'data/lunar-canon-recall.json (tracked; same convention as lunar-alignment: plain run = reproduction check, --write refuses on divergence, --rebaseline adopts). The lunar finder\'s COMPLETENESS over the whole NASA Five Millennium Canon −1999…+3000 on the UT axis (±3 h, same type; tight ≤15-min rate; signed median ΔT divergence per 500-yr era) — the former console button L-4, ~4.6 min' },
  { n: 'lunar-alignment.js', class: 'generator', ms: 82000, slow: true,
    writes: 'data/lunar-alignment-summary.json (tracked; same convention as eclipse-audit: plain run = reproduction check, --write refuses on divergence, --rebaseline adopts). Sections: canon TT-axis geometry 1600-2200 · documented visibility via the api observer tier · the -746 Babylonian lunar anchor · Stephenson-2016 raw-timing deltaT bands vs framework + spline' },

  { n: 'artifact-freshness.js', class: 'gate', ms: 1000,
    note: 'the campaign-artifact freshness gate — also runs as its own chain step (npm run check:artifacts); re-hashes every generated artifact\'s recorded inputs' },
  { n: 'version-pinning.js', class: 'gate', ms: 100,
    note: 'Phase 13: @essrt/physics semver + the essrt.modelVersion pairing vs model-version.json — a refit can never ship without a version bump recording it' },
  { n: 'data-provenance.js', class: 'gate', ms: 1500,
    note: 'Phase 12: every tracked file under data/ must be manifest-covered (PROVENANCE.md row, directory, or self-describing/ledgered generated JSON); no dangling rows; ledger scripts exist' },
  { n: 'scene-year-lengths.js', class: 'gate', ms: 52000,
    note: 'the scene is the reference (owner, 2026-09-30): the Node scene twin sampled with the solar-measurements exporter\'s own event definitions at −4000 and +10,000 (±100 yr) — RA, ε, e, the apsidal line, the published cardinal instants, and the sidereal/tropical/anomalistic years of date against the one-family laws to 30 ms (the planetary completion removed per event). Fail-proven via ESSRT_SCENE_YEARS_PLANT=1; the pre-restatement laws fail it (57 ms / 26 ms / 1.1 s at −4000)' },
  { n: 'deltat-slope-basis.js', class: 'gate', ms: 3000,
    note: 'ONE day basis: the pane\'s LOD_real − 86,400 equals the slope the shipped ΔT integrates (dΔT/dt ÷ 365.25) to 2 µs/day and the physics-base twin to 0.1 µs/day at every 25-yr sample of 1700–2100 — the 0.43 ms/day two-bases split of the pre-plan-09 state, closed by plan 09 step 4c and re-measured gone; fail-proven via ESSRT_DT_SLOPE_PLANT=1' },
  { n: 'paleo-anchors.js', class: 'gate', ms: 2000,
    note: 'Phase 19 + plan 12 option A: 45 deep-time anchors — 40 chronology rows plus the five Precambrian precession rows (Wells 1963 · Winter 2020 · Pannella 1972 · Williams 2000 · Mitchell-Kirscher 2023 · Wu 2024 · Patterson · the mid-Precambrian set: Lantink 2022 + Weeli Wolli + Moodies + Zhou 2024 paired a+LOD+precession + Xiamaling + Nanfen) recomputed LIVE from the engine on the CITED distance history (Farhat 2022) vs data/paleo-validation-anchors.json — every row a test, nothing fitted to it; documented deviations (Williams 620 Ma, the Wu Pangea interval, three Wells rows, the Zhou precession rows) are BANDS with their cause named — an unexplained improvement fails too (the verify-laws precedent)' },

  { n: 'measure-rms-by-epoch.js', class: 'generator', ms: 9406, slow: true,
    writes: 'data/chain-vs-jpl-rms.json (tracked; --write only — the published scene-vs-JPL comparison by century bucket, the K6/K7 model-content exhibit; a plain run prints without writing)' },
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
    console.error('Add each to the MANIFEST in run-suite.mjs with a class (gate or generator) — a print-only script belongs in tools/explore/.');
    process.exit(1);
  }
}

console.log(`tools/verify — ${MANIFEST.length} scripts`);
console.log('='.repeat(78));
console.log(`  ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(' · ')}`);
console.log(`  ${MANIFEST.length - counts.gate} of ${MANIFEST.length} are generators: they write tracked artifacts and never run as tests.`);

if (list) {
  for (const cls of Object.keys(counts)) {
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
