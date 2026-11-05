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
import { meanYearInDaysAtAge, meanMoonDistanceAtAge, meanAuAtAge, posFromJD, jdFromPos, navigablePosRange } from '../../tools/lib/deep-time.js';
import { createModel } from '@essrt/physics';
const require = createRequire(import.meta.url);
const { jdToDecimalYear } = require('@essrt/physics/time/calendar');

// The edge JDs are the twin's OWN UT axis (doc 111 §1.36): a linear 365.25-day count overshoots
// the future UT edge by the future ΔT (121 Myr of years at +1 Gyr — the former literal) and
// undershoots the past one. The two exact edges pin the table's inclusive last node.
const DOMAIN_EDGE_JDS = [
  2451545 - 700e6 * 365.25,                              // beyond the former table edge
  jdFromPos(navigablePosRange().posMin + 25e6),          // near the past edge
  jdFromPos(navigablePosRange().posMax - 1e6),           // near the future edge
  jdFromPos(navigablePosRange().posMin),                 // the past edge itself
  jdFromPos(navigablePosRange().posMax),                 // the future edge itself
];
const TOL_ROUNDTRIP_DAYS = 1e-3, TOL_POS_YEARS = 1e-6, TOL_MOON_DIST_REL = 5e-5;
const MOON_DIST_JDS = [2451545 - 400e6 * 365.25, 2451545 - 700e6 * 365.25];
const SPIN_MODERN_JD = 2460409.262, TOL_SPIN_DEG = 1e-9;   // 2024-04-08 18:17 UT, the eclipse
// THE ONE DEEP CLOCK (doc 111 §1.36): the UT JDs the twin's position table gives for four
// positions (years of date since the scene epoch) — the labelled age must be the age the
// physics draws, at −1 Myr, −400 Myr, −2 Gyr and 10 kyr inside the navigable edge.
const CLOCK_POS = [-1e6, -400e6, -2000e6, navigablePosRange().posMin + 1e4];
const CLOCK_JDS = CLOCK_POS.map((p) => jdFromPos(p));
const TOL_CLOCK_YEAR = 1e-6, TOL_CLOCK_TT_DAYS = 1e-3, TOL_RING_REL = 1e-9, TOL_RANGE_YEARS = 1e-6;
const TOL_GENESIS_JD_DAYS = 1e-5, TOL_GENESIS_GAMMA = 1e-4, TOL_GENESIS_UMBRA_KM = 1;   // the registry's rendered precision
// The placed Moon against its ring: the lunar eccentricity of date bounds the ratio (0.055 at
// J2000, the deep channel below 0.08) — at the genesis the ring once sat 27 % from the Moon,
// sized on the position's tropical-year COUNT while the Moon read the TT age (the owner's
// screenshot at −4.42 Gyr; doc 111 §1.36).
const TOL_MOON_RING_REL = 0.08;

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
  const range = T.navigablePosRange();
  return { scenePos, moon, spin, range };
}, { POS_JD: DOMAIN_EDGE_JDS[0], MOON_JDS: MOON_DIST_JDS, SPIN_JD: SPIN_MODERN_JD });
// THE ONE DEEP CLOCK (doc 111 §1.36): at each UT JD the scene's position, its year of date, the
// TT instant of that position, the Moon's ring radius and the placed Moon's distance. The ring
// is sized by the epoch anchors, which the RENDER LOOP updates from the scene's year of date —
// so each jump is followed by a rendered frame before the read (a read in the same tick sees
// the previous epoch's ring: the one-jump-late artefact measured in plan 27).
domainRows.clock = [];
for (const jd of CLOCK_JDS) {
  await s.page.evaluate((jd) => window.__test__.jumpJD(jd), jd);
  await s.page.waitForTimeout(1500);
  domainRows.clock.push(await s.page.evaluate((jd) => {
    const T = window.__test__;
    const pos = T.scenePos(); const ring = T.moonRingProbe();
    return { jd, pos, year: T.sceneYearOfDate(jd), jdTT: T.jdTTFromPos(pos), ringScene: ring ? ring.ringRadiusScene : NaN, moonDistKm: T.moonSceneState(jd).distKm };
  }, jd));
}
// plan 27 step C: the genesis eclipse — the browser's own finder on the seated tier model (one
// finder, two runtimes), read here and compared below with the registry's run of it on the Node
// twin (`genesisFirstSolarEclipse*`, written by values:package:write).
domainRows.genesis = await s.page.evaluate(() => window.__test__.genesisEclipse());
// THE HONEST EDGE (plan 27 step B): a jump past either edge lands ON the edge, never beyond —
// beyond it the readers fell back to a linear count (630 solar days per year one day before the
// genesis, the owner's measurement).
domainRows.edge = await s.page.evaluate(({ beforeJD, afterJD }) => {
  const T = window.__test__;
  T.jumpJD(beforeJD); const past = T.scenePos();
  T.jumpJD(afterJD); const future = T.scenePos();
  // the two FIELD paths, as a user drives them: a date before the genesis and a Julian Day before
  // it both land on the edge, and all three fields read the edge (owner, 2026-11-03)
  const edgePos = T.navigablePosRange().posMin;
  const edgeLabel = T.sceneDateLabel(edgePos);
  T.enterDateTime('-5000000000-01-01', '00:00:00'); const viaDate = T.clockFields();
  T.jumpJD(2451545); T.enterJulianDay(beforeJD); const viaJD = T.clockFields();
  return { past, future, edgeLabel, viaDate, viaJD };
}, { beforeJD: jdFromPos(navigablePosRange().posMin) - 1e6, afterJD: jdFromPos(navigablePosRange().posMax) + 1e6 });

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
  // the double's resolution: one ULP of a 4.4e9-year position is 30 s of TT and up to 1,500 UT
  // solar days per year of date at the genesis — 1.9e-3 UT days per ULP (measured at the edge)
  const tol = Math.max(TOL_ROUNDTRIP_DAYS, 2 * Math.abs(pos) * Number.EPSILON * 1500);
  const ok = Number.isFinite(d) && Math.abs(d) <= tol;
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
  // THE ONE DEEP CLOCK (doc 111 §1.36): (1) the scene's labelled year of date ≡ the civil year
  // of the TT instant the model's bridge gives (the engine's year axis, two runtimes — NOT the
  // position's tropical-year count, 2.4 Myr from it at the genesis); (2) the TT instant of the
  // position ≡ the UT JD plus the model's bridge; (3) the Moon's ring ≡ the cited distance at
  // the labelled age (the ring used to read the UT count's SI-day label: 95,882 km against a
  // Moon at 321,601 at the edge), and the placed Moon within the eccentricity of its ring;
  // (4) the browser's navigable range ≡ the twin's, and a jump past an edge lands on it.
  for (const r of domainRows.clock) {
    const modelYear = jdToDecimalYear(r.jd + m.eclipse.deltaTSecondsAtJD(r.jd) / 86400);
    const dYear = r.year - modelYear;
    const okYear = Number.isFinite(dYear) && Math.abs(dYear) <= TOL_CLOCK_YEAR;
    if (!okYear) fail++;
    console.log(`${okYear ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  year of date scene/model  ${r.year.toFixed(6)} / ${Number(modelYear).toFixed(6)}  Δ ${Number(dYear).toExponential(2)} yr`);
    const jdTTModel = r.jd + m.eclipse.deltaTSecondsAtJD(r.jd) / 86400;
    const dTT = r.jdTT - jdTTModel;
    const okTT = Number.isFinite(dTT) && Math.abs(dTT) <= TOL_CLOCK_TT_DAYS;
    if (!okTT) fail++;
    console.log(`${okTT ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  TT instant position/bridge  Δ ${Number(dTT).toExponential(2)} d  (TT age ${((2451545 - jdTTModel) / 365.25 / 1e6).toFixed(3)} Ma)`);
    const ageLabel = (2000.5 - r.year) / 1e6;
    const ringKm = r.ringScene * meanAuAtAge(ageLabel) / 100, citedKm = meanMoonDistanceAtAge(ageLabel);
    const relRing = (ringKm - citedKm) / citedKm;
    const okRing = Number.isFinite(relRing) && Math.abs(relRing) <= TOL_RING_REL;
    if (!okRing) fail++;
    console.log(`${okRing ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  Moon ring/cited a(t) at the label  ${ringKm.toFixed(1)} / ${citedKm.toFixed(1)} km  rel ${Number(relRing).toExponential(2)}`);
    const relMoon = r.moonDistKm / ringKm - 1;
    const okMoon = Number.isFinite(relMoon) && Math.abs(relMoon) <= TOL_MOON_RING_REL;
    if (!okMoon) fail++;
    console.log(`${okMoon ? '  ok ' : 'FAIL '} JD ${r.jd.toFixed(0).padStart(14)}  placed Moon / its ring  ${r.moonDistKm.toFixed(0)} / ${ringKm.toFixed(0)} km  rel ${Number(relMoon).toExponential(2)}  (bound ${TOL_MOON_RING_REL}, the eccentricity of date)`);
  }
  {
    const twin = navigablePosRange();
    const d = Math.max(Math.abs(domainRows.range.posMin - twin.posMin), Math.abs(domainRows.range.posMax - twin.posMax));
    const ok = Number.isFinite(d) && d <= TOL_RANGE_YEARS;
    if (!ok) fail++;
    console.log(`${ok ? '  ok ' : 'FAIL '} navigable range browser/twin  [${domainRows.range.posMin}, ${domainRows.range.posMax}] / [${twin.posMin}, ${twin.posMax}]`);
    const dPast = domainRows.edge.past - twin.posMin, dFuture = domainRows.edge.future - twin.posMax;
    const okEdge = Number.isFinite(dPast) && Number.isFinite(dFuture) && Math.abs(dPast) <= TOL_RANGE_YEARS && Math.abs(dFuture) <= TOL_RANGE_YEARS;
    if (!okEdge) fail++;
    console.log(`${okEdge ? '  ok ' : 'FAIL '} honest edge: a jump 1e6 d past either edge lands on it  Δ ${Number(dPast).toExponential(2)} / ${Number(dFuture).toExponential(2)} yr`);
    // plan 27 step C: the genesis eclipse, browser finder vs the registry (the Node twin's run of
    // the same finder on the same seated model): the JD to 1e-5 d (the registry's 5 decimals), γ
    // to 1e-4, the umbra radius to 1 km — one finder, two runtimes, the carriers' last bit.
    const reg = require(`${root}packages/model-values/src/model-values.generated.json`).values;
    const g = domainRows.genesis;
    const regJD = Number(reg.genesisFirstSolarEclipseJD), regGamma = Number(reg.genesisFirstSolarEclipseGamma);
    const regUmbraKm = Number(String(reg.genesisFirstSolarEclipseUmbraRadiusKm).replace(/,/g, ''));
    const dJD = g ? g.jd - regJD : NaN, dGamma = g ? g.gamma - regGamma : NaN, dUmbra = g ? Math.abs(g.umbraKm) - regUmbraKm : NaN;
    const okG = Number.isFinite(dJD) && Math.abs(dJD) <= TOL_GENESIS_JD_DAYS && Number.isFinite(dGamma) && Math.abs(dGamma) <= TOL_GENESIS_GAMMA && Number.isFinite(dUmbra) && Math.abs(dUmbra) <= TOL_GENESIS_UMBRA_KM;
    if (!okG) fail++;
    console.log(`${okG ? '  ok ' : 'FAIL '} genesis eclipse browser/registry  JD ${g ? g.jd.toFixed(5) : 'null'} / ${regJD.toFixed(5)}  Δ ${Number(dJD).toExponential(2)} d · γ Δ ${Number(dGamma).toExponential(2)} · umbra Δ ${Number(dUmbra).toExponential(2)} km`);
    const edgeJD = jdFromPos(twin.posMin);
    for (const [label, f] of [['the Date field', domainRows.edge.viaDate], ['the Julian Day field', domainRows.edge.viaJD]]) {
      const dPos = f.pos - twin.posMin, dJD = f.julianDay - edgeJD;
      const okF = Number.isFinite(dPos) && Math.abs(dPos) <= TOL_RANGE_YEARS && Number.isFinite(dJD) && Math.abs(dJD) <= 2 * Math.abs(twin.posMin) * Number.EPSILON * 1500 && f.date === domainRows.edge.edgeLabel;
      if (!okF) fail++;
      console.log(`${okF ? '  ok ' : 'FAIL '} honest edge via ${label}: lands on the edge and shows it  pos Δ ${Number(dPos).toExponential(2)} yr · JD Δ ${Number(dJD).toExponential(2)} d · Date ${f.date} (edge ${domainRows.edge.edgeLabel}) ${f.time}`);
    }
  }
}

if (fail) {
  console.log(`\nFAIL — ${fail} evaluator/anchor mismatches: the f(Y) year-length`
    + ' baselines are not tracking the epoch (frozen at J2000?), or the lodReal'
    + ' composite has become scene-state dependent.');
  process.exit(1);
}
console.log('\nPASS — f(Y) year-length evaluators track the epoch-anchor chain.');
