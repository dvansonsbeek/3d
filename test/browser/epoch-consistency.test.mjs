/**
 * Epoch-consistency gate: the pure f(Y) year-length evaluators must agree
 * with the epoch-anchor chain (recomputeEpochAnchors) at the same epoch.
 *
 *   node test/browser/epoch-consistency.test.mjs      (exit 1 on mismatch)
 *
 * WHY THIS GATE EXISTS. The R16 purity fix froze the evaluators' Fourier
 * baselines to J2000 consts so f(Y) would not depend on scene-epoch state
 * (transparency gate). The contract was that a pure epoch-aware baseline
 * replaces the mutable-global read — but nothing verified the two chains
 * still agreed, and they silently did not: under deep time the evaluators
 * stayed frozen at J2000 while the anchors moved. User-visible result: the
 * solar-day panel froze — LOD_real at year 9001 read 86400.006 s where the
 * model says 86400.156 s, ΔT rate 2.2 s/yr vs 57 s/yr.
 *
 * The snapshot golden master cannot catch this class: it records whatever
 * the code does. This gate pins the INVARIANT between the two chains.
 *
 * Tolerance 0.002 d: above the evaluators' harmonic content (≤ ~3e-4 d for
 * the tropical set), far below the frozen-baseline failure (0.1–0.5 d at
 * ±1–5 Myr).
 *
 * THE NAVIGABLE-DOMAIN ROWS (doc 111 §1.33): (1) the Node twin's JD ↔ scene
 * position round trip closes at the domain's edges (beyond the former ±500 Myr
 * table the two directions extrapolated differently: 817 kyr at −2 Gyr);
 * (2) the browser's position at −700 Myr equals the twin's (one table, two
 * runtimes); (3) the scene Moon's distance at −400 and −700 Myr is the series'
 * (the scene multiplied the recession-scaled series by a(t)/a₀ again: 4.3 % at
 * −400 Myr, invisible in the era). Tolerances: 1e-3 d, 1e-6 yr, 5e-5 relative
 * (the JD's own double round-off at −4e8 yr is 1.3 s ≈ 1 km of lunar motion).
 *
 * THE ONE EARTH ROTATION ANGLE (doc 111 §1.34): the scene's Earth spin about the
 * pole of date, read from the frame probe after a jump, must equal the tier's
 * GMST at the same UT JD (GMST = 270° + spin under the chart) — at the modern
 * eclipse and at the deep JD. The scaffold spin (turns per tropical year of
 * date + a phase anchor) agreed to 0.008° in the era and sat 95° from the tier
 * at −2 Gyr, the umbra ring 95° of longitude from the Moon's shadow, and no row
 * read either. Tolerance 1e-9°: one function on one input across two runtimes.
 */
import { createRequire } from 'node:module';
import { openSimulator } from './harness.mjs';
import { meanYearInDaysAtAge, posFromJD, jdFromPos } from '../../tools/lib/deep-time.js';
import { createModel, NAVIGABLE_PAST_YEARS, NAVIGABLE_FUTURE_YEARS } from '@essrt/physics';
const require = createRequire(import.meta.url);

const DOMAIN_EDGE_JDS = [
  2451545 - 700e6 * 365.25,                              // beyond the former table edge
  2451545 - (NAVIGABLE_PAST_YEARS - 25e6) * 365.25,      // near the past edge
  2451545 + (NAVIGABLE_FUTURE_YEARS - 1e6) * 365.25,     // near the future edge
];
const TOL_ROUNDTRIP_DAYS = 1e-3, TOL_POS_YEARS = 1e-6, TOL_MOON_DIST_REL = 5e-5;
const MOON_DIST_JDS = [2451545 - 400e6 * 365.25, 2451545 - 700e6 * 365.25];
const SPIN_MODERN_JD = 2460409.262, TOL_SPIN_DEG = 1e-9;   // 2024-04-08 18:17 UT, the eclipse

const EPOCHS_MA = [-5, -1, 1, 5];
const TOL_DAYS = 0.002;
// The Predictions panel's "Model (LOD days)" solar row (the one-source tropical
// year over the Layer-4 day) against the engine's published solar-day count
// (meanYearInDaysAtAge: the tidal-chain mean year over the same day — the
// registry's daysPerYearAt… rows). The two years differ by the one-source
// family's secular correction, ≤ 1e-5 d here; the tolerance sits far above
// that and far below a unit slip (a year over 86,400 s instead of the day of
// date reads 365.2 where the count is 366–382).
const TOL_LOD_DAYS = 0.002;

const s = await openSimulator();

const rows = await s.page.evaluate(({ EPOCHS_MA }) => {
  const T = window.__test__;
  T.resetEpochToJ2000();
  const out = [];
  for (const t of EPOCHS_MA) {
    T.setEpochByAge(t);
    const a = T.anchors();
    const year = 2000 - t * 1e6;
    // Phase 20.2 delegation-gate purity pin: evaluate the Layer-4 composite
    // while the scene sits on the foreign epoch...
    const lodRealMutated = T.computeLodRealSecondsAtEpoch(year);
    T.resetEpochToJ2000();
    out.push({
      t, year,
      // What the epoch-anchor chain says at this epoch (the mutated globals).
      // The sidereal anchor is the ONE remaining sidereal-year global (the
      // "kinematic" twin is a J2000 constant since the year/day collapse).
      // (the anchor chain carries no anomalistic year; the anomalistic law's
      // purity is pinned by the fifth gate and the sampler-purity gate.)
      sidKinAnchor: a.meansiderealyearlengthinDays,
      solAnchor: a.meansolaryearlengthinDays,
      // What the pure f(Y) evaluators say at the same year, J2000 scene state.
      // the year lengths of date in days of the epoch (the published SI year
      // lengths over the kinematic day of date)
      sidEval: T.siderealYearDaysOfDate(year),
      solEval: T.tropicalYearDaysOfDate(year),
      // ...and again at J2000 scene state — must be bit-equal (purity).
      lodRealPure: T.computeLodRealSecondsAtEpoch(year),
      lodRealMutated,
      // The panel's LOD-days solar row as a pure function of the year.
      solarLodDays: T.yearLodDaysAtYear(year).solar,
    });
  }
  return out;
}, { EPOCHS_MA });

// The navigable-domain rows: the browser's scene position and Moon at deep JDs
// (each a seated deep jump, ~10 s with the banks landed).
const domainRows = await s.page.evaluate(({ POS_JD, MOON_JDS, SPIN_JD }) => {
  const T = window.__test__;
  const spinAt = (jd) => { T.jumpJD(jd); const f = T.worldFrameProbe(); return { jd: f.julianDay, earthSpinDeg: f.earthSpinDeg }; };
  const spin = [spinAt(SPIN_JD), spinAt(POS_JD)];
  const scenePos = T.scenePos();
  const moon = MOON_JDS.map((jd) => ({ jd, distKm: T.moonSceneState(jd).distKm }));
  return { scenePos, moon, spin };
}, { POS_JD: DOMAIN_EDGE_JDS[0], MOON_JDS: MOON_DIST_JDS, SPIN_JD: SPIN_MODERN_JD });

const pageErrors = s.errors.length;
await s.dispose();
if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

console.log('EPOCH CONSISTENCY — f(Y) evaluators vs recomputeEpochAnchors');
console.log('============================================================');
let fail = 0;
for (const r of rows) {
  for (const [label, evalV, anchorV] of [
    ['sidereal', r.sidEval, r.sidKinAnchor],
    ['tropical', r.solEval, r.solAnchor],
  ]) {
    const d = evalV - anchorV;
    const ok = Number.isFinite(d) && Math.abs(d) <= TOL_DAYS;
    if (!ok) fail++;
    console.log(`${ok ? '  ok ' : 'FAIL '} ${String(r.t).padStart(4)} Ma  ${label.padEnd(22)}`
      + ` eval ${Number(evalV).toFixed(9)}  anchor ${anchorV.toFixed(9)}  Δ ${Number(d).toExponential(2)} d`);
  }
}

// Delegation-gate purity pin (Phase 20.2): the Layer-4 composite must be
// scene-state independent — bit-equal on the mutated epoch and at J2000 state.
for (const r of rows) {
  const ok = Object.is(r.lodRealPure, r.lodRealMutated);
  if (!ok) fail++;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${String(r.t).padStart(4)} Ma  lodReal purity`
    + `         ${Number(r.lodRealPure).toFixed(9)} s ${ok ? '(bit-equal)' : `vs mutated ${r.lodRealMutated}`}`);
}

// The LOD-days row (the Predictions panel's solar-day count of date) against the
// engine's meanYearInDaysAtAge — the unit pin: SI days ≠ LOD days.
for (const r of rows) {
  const engine = meanYearInDaysAtAge(r.t);
  const d = r.solarLodDays - engine;
  const ok = Number.isFinite(d) && Math.abs(d) <= TOL_LOD_DAYS;
  if (!ok) fail++;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${String(r.t).padStart(4)} Ma  LOD days (solar)      `
    + ` panel ${Number(r.solarLodDays).toFixed(6)}  engine ${engine.toFixed(6)}  Δ ${Number(d).toExponential(2)} d`);
}

// THE NAVIGABLE DOMAIN (doc 111 §1.33) — (1) the Node twin's round trip at the edges
for (const jd of DOMAIN_EDGE_JDS) {
  const pos = posFromJD(jd), back = pos === null ? NaN : jdFromPos(pos);
  const d = back - jd;
  const ok = Number.isFinite(d) && Math.abs(d) <= TOL_ROUNDTRIP_DAYS;
  if (!ok) fail++;
  console.log(`${ok ? '  ok ' : 'FAIL '} JD ${jd.toFixed(0).padStart(14)}  pos round trip      `
    + ` Δ ${Number(d).toExponential(2)} d`);
}
// (2) the browser's position is the twin's
{
  const twin = posFromJD(DOMAIN_EDGE_JDS[0]);
  const d = domainRows.scenePos - twin;
  const ok = Number.isFinite(d) && Math.abs(d) <= TOL_POS_YEARS;
  if (!ok) fail++;
  console.log(`${ok ? '  ok ' : 'FAIL '} −700 Myr  scene pos vs twin      `
    + ` browser ${domainRows.scenePos}  twin ${twin}  Δ ${Number(d).toExponential(2)} yr`);
}
// (3) the scene Moon's distance is the series' (recession included once)
{
  const root = '../../';
  const m = createModel(undefined, {
    secularSeriesArtifact: require(`${root}data/nbody-secular-series.json`),
    spinCheckpointsArtifact: require(`${root}data/spin-axis-checkpoints.json`),
    lunarCheckpointsArtifact: require(`${root}data/lunar-cumulative-checkpoints.json`),
  });
  for (const r of domainRows.moon) {
    const series = m.moon.distanceKmAtJD(r.jd);
    const rel = (r.distKm - series) / series;
    const ok = Number.isFinite(rel) && Math.abs(rel) <= TOL_MOON_DIST_REL;
    if (!ok) fail++;
    console.log(`${ok ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  Moon distance scene/series`
      + ` ${r.distKm.toFixed(1)} / ${series.toFixed(1)} km  rel ${Number(rel).toExponential(2)}`);
  }
  // THE ONE EARTH ROTATION ANGLE (doc 111 §1.34): the scene's spin ≡ the tier's GMST at the UT JD
  const wrap360 = (d) => ((d % 360) + 360) % 360;
  for (const r of domainRows.spin) {
    const scene = wrap360(270 + r.earthSpinDeg), tier = wrap360(m.eclipse.gmstDegAtJD(r.jd));
    const d = ((scene - tier + 540) % 360) - 180;
    const ok = Number.isFinite(d) && Math.abs(d) <= TOL_SPIN_DEG;
    if (!ok) fail++;
    console.log(`${ok ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  Earth spin scene/tier GMST`
      + ` ${scene.toFixed(6)} / ${tier.toFixed(6)}°  Δ ${Number(d).toExponential(2)}°`);
  }
}

if (fail) {
  console.log(`\nFAIL — ${fail} evaluator/anchor mismatches: the f(Y) year-length`
    + ' baselines are not tracking the epoch (frozen at J2000?), or the lodReal'
    + ' composite has become scene-state dependent.');
  process.exit(1);
}
console.log('\nPASS — f(Y) year-length evaluators track the epoch-anchor chain.');
