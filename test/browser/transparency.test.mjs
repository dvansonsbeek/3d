/**
 * THE ACCEPTANCE GATE — referential transparency of f(Y) across epoch mutation.
 *
 * `f(Y)` must depend on Y alone. What the scene's epoch happens to be set to is
 * scene state, not an argument: the year length at Y=1000 is a fact, and must
 * not change because someone called setEpochByAge(-1) first.
 *
 * GREEN SINCE PHASE B (B.3b), and required in CI. It failed 21/84 by design
 * while `recomputeEpochAnchors` rewrote the sidereal Fourier baseline the
 * probes read; the baseline is the frozen SIDEREAL_YEAR_DAYS_KINEMATIC_J2000
 * const now, the seven globals are a cache over Layer 0 (B.3c), and
 * resetEpochToJ2000 restores the module-load seeds exactly (R16). At Phase 8
 * this moves off the browser and runs against `packages/physics` directly.
 *
 * A red run is a REGRESSION of the Phase 6 exit criterion. A green run still
 * proves something only while the probes resolve — if window.__test__ loses a
 * probe, the harness reports it rather than passing silently.
 *
 *   exit 0 — invariant (the required state)
 *   exit 1 — violation (a regression)
 */
import { openSimulator } from './harness.mjs';

const YEARS = [-4000, 0, 1000, 1900, 2000, 2100, 6000];
const EPOCHS = [-1, -0.1, 0.5];        // Ma; each mutates the seven globals
// Round-trip tolerance must be RELATIVE. These values are ~365 days = 3.16e7 s,
// so an absolute nanosecond bound is ~1e-16 relative — below double epsilon, and
// it misreports ordinary last-digit rounding as a state leak. 8 ULP of 365 days.
const ROUNDTRIP_REL_TOL = 8 * Number.EPSILON;   // ~1.8e-15

const s = await openSimulator();

const result = await s.page.evaluate(
  ({ YEARS, EPOCHS }) => {
    const T = window.__test__;
    const probes = {
      solar: (y) => T.computeSolarYearDaysFromCardinals(y),
      sidereal: (y) => T.computeSiderealYearDaysDirect(y),
      solsticeSS: (y) => T.computeSolsticeYearLength(y, 'SS'),
      solsticeWS: (y) => T.computeSolsticeYearLength(y, 'WS'),
    };
    const names = Object.keys(probes);
    const at = (y) => Object.fromEntries(names.map((n) => [n, probes[n](y)]));

    T.resetEpochToJ2000();
    const baseline = Object.fromEntries(YEARS.map((y) => [y, at(y)]));

    // For each foreign epoch, re-evaluate the SAME years and compare.
    const violations = [];
    const roundTrip = [];
    for (const e of EPOCHS) {
      T.setEpochByAge(e);
      for (const y of YEARS) {
        const now = at(y);
        for (const n of names) {
          const d = now[n] - baseline[y][n];
          if (d !== 0) violations.push({ epoch: e, year: y, probe: n, deltaDays: d });
        }
      }
      T.resetEpochToJ2000();
      // Returning to J2000 must restore the baseline exactly.
      for (const y of YEARS) {
        const back = at(y);
        for (const n of names) {
          const d = back[n] - baseline[y][n];
          if (d !== 0) {
            roundTrip.push({ viaEpoch: e, year: y, probe: n, deltaDays: d,
                             relative: d / baseline[y][n] });
          }
        }
      }
    }
    return { names, violations, roundTrip, epochAtEnd: T.currentEpochTMa() };
  },
  { YEARS, EPOCHS },
);

const { names, violations, roundTrip, epochAtEnd } = result;
const total = YEARS.length * EPOCHS.length * names.length;

console.log('REFERENTIAL TRANSPARENCY — f(Y) across setEpoch');
console.log('='.repeat(74));
console.log(`  probes ${names.length} x years ${YEARS.length} x epochs ${EPOCHS.length} = ${total} comparisons`);

// Group violations by probe: which function leaks epoch state?
const byProbe = new Map();
for (const v of violations) {
  const cur = byProbe.get(v.probe) ?? { n: 0, max: 0 };
  cur.n += 1;
  cur.max = Math.max(cur.max, Math.abs(v.deltaDays) * 86400);
  byProbe.set(v.probe, cur);
}

console.log('\n  per probe:');
for (const n of names) {
  const v = byProbe.get(n);
  console.log(v
    ? `    ${n.padEnd(12)} VIOLATES  ${String(v.n).padStart(3)}/${YEARS.length * EPOCHS.length}  max |Δ| = ${v.max.toExponential(4)} s`
    : `    ${n.padEnd(12)} invariant`);
}

if (roundTrip.length) {
  const worstAbs = Math.max(...roundTrip.map((r) => Math.abs(r.deltaDays) * 86400));
  const worstRel = Math.max(...roundTrip.map((r) => Math.abs(r.relative)));
  const noise = worstRel <= ROUNDTRIP_REL_TOL;
  console.log(`\n  round-trip to J2000: ${roundTrip.length} value(s) differ in the last digit`);
  console.log(`    worst ${worstAbs.toExponential(4)} s = ${worstRel.toExponential(3)} relative (${(worstRel / Number.EPSILON).toFixed(1)} ULP)`);
  console.log(`    ${noise
    ? 'float rounding — state IS restored'
    : 'STATE NOT RESTORED — a real leak, separate from the epoch dependence'}`);
  if (!noise) process.exitCode = 1;
} else {
  console.log('\n  round-trip to J2000: bit-exact');
}

if (epochAtEnd !== 0) console.log(`\n  WARNING: epoch left at ${epochAtEnd}, expected 0`);
if (s.errors.length) console.log(`\n  page errors: ${s.errors.length}`);

await s.dispose();

if (violations.length === 0) {
  console.log('\nPASS — f(Y) is invariant across epoch mutation.');
  console.log('If Phase 6 is not complete, verify the probes still resolve rather than celebrating.');
  process.exit(0);
}

console.log(`\nFAIL — ${violations.length}/${total} comparisons depend on epoch.`);
console.log('EXPECTED until Phase 6. This is the acceptance criterion, not a broken test.');
process.exit(1);
