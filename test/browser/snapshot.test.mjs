/**
 * Record / check the `src/script.js` regression fixture (plan §5c).
 *
 *   node test/browser/snapshot.test.mjs           check  (exit 1 on drift)
 *   node test/browser/snapshot.test.mjs --write   re-record
 *
 * THIS IS THE TIER THAT GUARDS PHASE 8. `tools/lib` is a few thousand lines and
 * already pure; `src/script.js` is ~64,700 lines and is what Phase 8 dissolves.
 * Without this snapshot, "the extraction changed nothing" is unverifiable for
 * the majority of the code.
 *
 * Everything is read at the J2000 epoch, which the harness resets to first —
 * `f(Y)` is currently epoch-dependent (see transparency.test.mjs), so a snapshot
 * taken at a drifting epoch would not be reproducible. That dependence is the
 * defect being tracked, not something this file works around silently.
 *
 * Exact comparison, deliberately: see record-tools-lib.mjs for the reasoning.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSimulator } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'packages/fixtures/regression/script-js.json');

// Spread across the fit window and well outside it. Values AT the anchor alone
// would be a tautology (CLAUDE.md), so the grid deliberately reaches away.
//
// The deep years are not decoration. Until they were added this grid stopped at
// 6000 CE, so it could not see the deep-time chain at all — and that chain is
// precisely what the Phase 6 port moves. An error growing as Δt² (the R4 class:
// 0.005 d at −10 kyr, 3.3 d at −302 kyr) would have been bit-identical on every
// value here and catastrophic at the Step 6a window edge. −302635 IS that edge.
const YEARS = [
  -302635, -100000, -25000,                        // deep — the H window
  -4000, -2000, 0, 1000, 1500, 1900, 2000, 2025, 2100, 3000, 6000,
  32682,                                            // deep — the far bracket
];

// ── Phase 8.2-0 lunar probe grids ──────────────────────────────────────────
// JDs: J2000, the model-start solstice, a modern date, the two Babylonian
// anchors, ±100 kyr (inside the moon-cycle tables) and +275 kyr (beyond
// _MCT_MAX, so the adaptive-Simpson fallback path is pinned too).
const MOON_JDS = [
  1608421.835171,   // -309 Aug 15 (Agathocles)
  1671853.759762,   // -135 Apr 15 (Babylonian)
  2451545.0,        // J2000
  2451716.575,      // June solstice 2000 (model start)
  2460310.5,        // 2024 Jan 1
];
const MOON_DEEP_JDS = [
  2451545.0 - 100000 * 365.25,   // −100 kyr
  2451545.0 + 100000 * 365.25,   // +100 kyr
  2451545.0 + 275000 * 365.25,   // +275 kyr — past the table, Simpson path
];
const MOON_TMAS = [-5, -1, -0.3, 0, 0.3, 1, 5];
const MOON_CHAIN_PAIRS = [[2000, 2100], [2000, -584], [2000, -100000], [2000, 251000], [2000, 300000]];

// Epochs at which to re-read the seven mutable globals. `anchors()` SHOULD
// depend on the epoch — that is its job, and it is what `recomputeEpochAnchors`
// exists to do. `f(Y)` is the thing that must not (transparency.test.mjs).
// Recording anchors@t pins the deep-time chain's output, so Phase 6 cannot move
// it while leaving f(Y) looking clean.
const EPOCHS_MA = [-5, -1, -0.3, 0, 0.3, 1, 5];

const write = process.argv.includes('--write');
const s = await openSimulator();

const measured = await s.page.evaluate(({ YEARS, EPOCHS_MA, MOON_JDS, MOON_DEEP_JDS, MOON_TMAS, MOON_CHAIN_PAIRS }) => {
  const T = window.__test__;

  const v = {};
  // ── FRESH-STATE umbra pins — MUST run before any epoch call ──────────────
  // The 2026-08 init-vs-heal split: earth.rotationPhase (the 20.3c sidereal-
  // phase anchor) was set only by updateEarthForEpoch, which a fresh page
  // never runs (the start date sits inside the auto-sync guard), so fresh
  // pages computed the umbra chain un-anchored (+0.4928° lon ≈ 53 km at
  // every ground point) while this harness healed the page before probing —
  // masking the split from every gate.
  // Since U2 the certified umbra (eclUmbraSceneAt) DELEGATES to the package
  // tier and no longer reads scene spin — its fresh≡healed identity is
  // trivial (kept as a delegation-regression probe). The SCENE-SPIN guard
  // moved to the NASA-convention diagnostic (eclUmbraNASAAt), which still
  // rides the scene chain incl. rotationPhase: its fresh value must equal
  // the healed one recorded below, and it diverges ~0.49° lon if anyone
  // reintroduces an init/heal split.
  {
    const uf = T.eclUmbraSceneAt(1671853.759762);
    v['ecl.umbraSceneFresh@1671853.759762.lat'] = uf ? uf.lat : null;
    v['ecl.umbraSceneFresh@1671853.759762.lon'] = uf ? uf.lon : null;
    const un = T.eclUmbraNASAAt(1671853.759762);
    v['ecl.umbraNASAFresh@1671853.759762.lat'] = un ? un.lat : null;
    v['ecl.umbraNASAFresh@1671853.759762.lon'] = un ? un.lon : null;
  }
  T.resetEpochToJ2000();
  const a = T.anchors();
  for (const [k, n] of Object.entries(a)) v[`anchor.${k}`] = n;

  // Cycles-tab perihelion breakdown (doc 13 §1.8): the lattice (ecliptic) rate,
  // the equatorial projection excess, the obliquity-rate term, the scene
  // coupling and the Earth-frame RA rate at J2000 for all seven planets, plus
  // Mercury's relativistic advance from the model constants. The registry keys
  // and tools/verify/perihelion-projection-closure.js carry the same numbers;
  // this pins the browser's own evaluation of them.
  for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const b = T.perihelionFrameBreakdown(p, 2000);
    v[`periFrames.${p}.lattice@2000`] = b.lattice;
    v[`periFrames.${p}.projection@2000`] = b.projection;
    v[`periFrames.${p}.obliquityTerm@2000`] = b.obliquityTerm;
    v[`periFrames.${p}.coupling@2000`] = b.coupling;
    v[`periFrames.${p}.markerOffset@2000`] = b.markerOffset;
    v[`periFrames.${p}.kappa@2000`] = b.kappa;
    v[`periFrames.${p}.projectedRa@2000`] = b.projectedRa;
    v[`periFrames.${p}.earthFrame@2000`] = b.earthFrame;
  }
  v['periFrames.mercury.grAdvance'] = T.relativisticPerihelionAdvanceArcsecCy('mercury');

  for (const y of YEARS) {
    v[`solarYearDays@${y}`] = T.computeSolarYearDaysFromCardinals(y);
    v[`siderealYearDays@${y}`] = T.computeSiderealYearDaysDirect(y);
    v[`solsticeSS@${y}`] = T.computeSolsticeYearLength(y, 'SS');
    v[`solsticeWS@${y}`] = T.computeSolsticeYearLength(y, 'WS');
    v[`solsticeVE@${y}`] = T.computeSolsticeYearLength(y, 'VE');
    v[`solsticeAE@${y}`] = T.computeSolsticeYearLength(y, 'AE');
    // The JD form has its own failure modes the year-length probes cannot see:
    // its equation-of-centre path NaN'd for two phases with no probe noticing.
    // ALL FOUR types + RA — the Phase 7 extraction gate needs the full surface
    // (VE/AE year lengths, WS/AE JD and RA had no probes at all before it).
    v[`solsticeJD_SS@${y}`] = T.computeSolsticeJD(y, 'SS');
    v[`solsticeJD_VE@${y}`] = T.computeSolsticeJD(y, 'VE');
    v[`solsticeJD_WS@${y}`] = T.computeSolsticeJD(y, 'WS');
    v[`solsticeJD_AE@${y}`] = T.computeSolsticeJD(y, 'AE');
    v[`solsticeRA_SS@${y}`] = T.computeSolsticeRA(y, 'SS');
    v[`solsticeRA_VE@${y}`] = T.computeSolsticeRA(y, 'VE');
  }

  // The deep-time chain, read through the globals it fills. Restore J2000 after
  // each so a failure mid-loop cannot leave the scene on a foreign epoch and
  // silently poison every later value.
  for (const t of EPOCHS_MA) {
    T.setEpochByAge(t);
    for (const [k, n] of Object.entries(T.anchors())) v[`epoch@${t}Ma.${k}`] = n;
    T.resetEpochToJ2000();
  }

  // Phase 20.2 delegation-gate feed: the Layer-4 composite at the deep epochs,
  // evaluated PURE (J2000 scene state). Cross-engine matches the Node twin.
  for (const t of EPOCHS_MA) {
    v[`lodReal@${t}Ma`] = T.computeLodRealSecondsAtEpoch(2000 - t * 1e6);
  }

  // ── Phase 8.2-0: the lunar surface, three mode sections ───────────────────
  // Section 1 — shipped defaults (framework-native args, deep time ON).
  for (const jd of [...MOON_JDS, ...MOON_DEEP_JDS]) {
    for (const [k, n] of Object.entries(T.moonArgsAt(jd))) v[`moonArgs.${k}@${jd}`] = n;
    v[`moonEclLon@${jd}`] = T.eclMoonLon(jd);
    v[`moonEclBeta@${jd}`] = T.eclMoonBeta(jd);
    v[`moonEclDist@${jd}`] = T.eclMoonDistance(jd);
    v[`moonEFactor@${jd}`] = T.fwEFactor(jd);
  }
  for (const t of MOON_TMAS) {
    for (const [k, n] of Object.entries(T.moonAtAge(t))) v[`moonAtAge.${k}@${t}Ma`] = n;
  }
  for (const [a2, b2] of MOON_CHAIN_PAIRS) {
    for (const [k, n] of Object.entries(T.moonChainCycles(a2, b2))) v[`moonChain.${k}@${a2}..${b2}`] = n;
  }
  for (const tYr of [-102000, -27000, -2584, 0, 100, 30000, 102000]) {
    v[`moonFwEcc@${tYr}`] = T.fwEarthEcc(tYr);
  }
  for (const Tc of [-30, 0, 30, 500]) {
    v[`moonChanInt.sW@${Tc}`] = T.fwChannelIntegral(Tc, 2.407);
    v[`moonChanInt.sN@${Tc}`] = T.fwChannelIntegral(Tc, 1.018);
  }
  // The production Moon (doc 66): scene series + RA/Dec override, end to end.
  for (const jd of [2451545.0, 1671853.759762, 2460310.5, MOON_DEEP_JDS[1]]) {
    for (const [k, n] of Object.entries(T.moonSceneState(jd))) v[`moonScene.${k}@${jd}`] = n;
  }

  // Section 2 — pure-Meeus A/B reference args (the doc 66 §1 comparison side).
  T.setMoonArgsFrameworkNative(false);
  for (const jd of [...MOON_JDS, MOON_DEEP_JDS[1]]) {
    for (const [k, n] of Object.entries(T.moonArgsAt(jd))) v[`moonArgsMeeus.${k}@${jd}`] = n;
    v[`moonEclLonMeeus@${jd}`] = T.eclMoonLon(jd);
    v[`moonEclBetaMeeus@${jd}`] = T.eclMoonBeta(jd);
    v[`moonEFactorMeeus@${jd}`] = T.fwEFactor(jd);
  }
  T.setMoonArgsFrameworkNative(true);

  // Section 3 — snapshot mode (deep time OFF): the polynomial-skeleton branch.
  T.setDeepTimeMode(false);
  for (const jd of MOON_JDS) {
    for (const [k, n] of Object.entries(T.moonArgsAt(jd))) v[`moonArgsSnap.${k}@${jd}`] = n;
  }
  T.setDeepTimeMode(true);

  // ── Phase 8.3-0: the planet surface (shipped defaults) ────────────────────
  const P7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const P_ALL = [...P7, 'eros', 'pluto', 'halleys'];
  for (const k of P_ALL) {
    for (const [n, val] of Object.entries(T.planetDerived(k))) v[`planet.${k}.${n}`] = val;
  }
  for (const k of [...P7, 'ceres']) {
    for (const [n, val] of Object.entries(T.planetLaws(k))) {
      if (val !== undefined) v[`planetLaw.${k}.${n}`] = val;
    }
  }
  for (const k of P7) {
    const w = T.planetWobble(k);
    v[`planetWobble.${k}`] = w[0];
    v[`planetObliqMean.${k}`] = w[1];
  }
  const P_YEARS = [-25000, -2000, 0, 1000, 2000, 2100, 6000];
  for (const k of P7) {
    for (const y of P_YEARS) {
      v[`planetEcc.${k}@${y}`] = T.planetEccAt(k, y);
      v[`planetObliq.${k}@${y}`] = T.planetObliquityAt(k, y);
      v[`planetInvIncl.${k}@${y}`] = T.planetInvPlaneInclAt(k, y);
    }
  }
  for (const [a3, b3] of [[2000, 2100], [2000, -2000], [2000, 100000]]) {
    for (const k of P7) v[`planetChain.${k}@${a3}..${b3}`] = T.planetCyclesBetween(k, a3, b3);
  }

  // ── Phase 8.4-0: the ΔT/LOD surface (shipped defaults) ────────────────────
  // Pins CURRENT behaviour, KNOWN divergences from Node included (flag gates,
  // taper wiring, the _eclDeltaT calendar-year vs frameworkDeltaT model-year
  // convention — the 8.4 survey). These move only with deliberate, measured
  // alignment commits.
  const DT_YEARS = [-12000, -9000, -6000, -3000, -1000, 0, 1000, 1900, 2000, 2100];
  for (const y of DT_YEARS) {
    for (const [k, n] of Object.entries(T.dtCycleAt(y))) v[`dtCycle.${k}@${y}`] = n;
  }
  const DT_AGES = [-400, -66, -1, -0.1, 0, 0.1, 1, 66, 400];
  for (const t of DT_AGES) {
    for (const [k, n] of Object.entries(T.dtAtAge(t))) v[`dtAge.${k}@${t}Ma`] = n;
    for (const [k, n] of Object.entries(T.dtDecompositionAtAge(t))) {
      if (typeof n === 'number') v[`dtDecomp.${k}@${t}Ma`] = n;
    }
  }
  const DT_JDS = [1671853.759762, 2451545.0, 2460310.5,
                  2451545.0 - 100000 * 365.25, 2451545.0 + 100000 * 365.25];
  for (const jd of DT_JDS) v[`dtFw@${jd}`] = T.dtFrameworkAt(jd);
  // Espenak-Meeus piecewise polynomial — one probe per era segment (valid
  // −1999..3000; browser-only, feeds the 8.5 eclipse machinery).
  for (const y of [-500, 500, 1000, 1600, 1900, 1955, 2000, 2015, 2100, 3000]) {
    for (const [k, n] of Object.entries(T.dtEspenakAt(y))) v[`dtEspenak.${k}@${y}`] = n;
  }

  // ── Phase 8.5-0: the eclipse surface (browser-only family) ────────────────
  // Pins CURRENT behaviour before the eclipse-geometry extraction: the
  // Meeus Ch.25 sun longitude, both predictive finders (a modern and an
  // ancient window), and the scene-umbra conventions. The umbra probes
  // navigate the scene, so they run LAST (before the round-trip check).
  for (const jd of [1355795.0, 2451545.0, 2460409.262836, 2634166.0]) {
    v[`ecl.sunLon@${jd}`] = T.eclSunLonAt(jd);
  }
  const ECL_WINDOWS = [
    ['modern', 2451545.0, 2451545.0 + 3 * 365.25],   // 2000–2003
    ['ancient', 1355795.0, 1355795.0 + 3 * 365.25],  // ~1000 BCE, 3 yr
  ];
  for (const [tag, a4, b4] of ECL_WINDOWS) {
    T.eclFindLunar(a4, b4).forEach((e, i) => {
      v[`ecl.lunar.${tag}[${i}].jd`] = e.jd;
      v[`ecl.lunar.${tag}[${i}].type`] = e.type;
      v[`ecl.lunar.${tag}[${i}].beta`] = e.beta;
      v[`ecl.lunar.${tag}[${i}].magU`] = e.magnitudeUmbral;
      v[`ecl.lunar.${tag}[${i}].magP`] = e.magnitudePenumbral;
    });
    T.eclFindSolar(a4, b4).forEach((e, i) => {
      v[`ecl.solar.${tag}[${i}].jd`] = e.jd;
      v[`ecl.solar.${tag}[${i}].type`] = e.type;
      v[`ecl.solar.${tag}[${i}].beta`] = e.beta;
      v[`ecl.solar.${tag}[${i}].ratio`] = e.moonSunRatio;
    });
  }
  // The three modern JDs pin the chain where NASA paths are known; the three
  // ancient ones (the -135 Babylon preset JD, a point near its audit-scan
  // minimum, and the -309 Babylon JD) pin the deep end the audit-26/Babylon
  // Node port rides — the modern probes alone cannot see an ancient-epoch
  // divergence in the spin/ΔT chain.
  for (const jd of [2460409.262836, 2451401.971, 2460232.245,
                    1671853.759762, 1671853.686, 1608421.835171]) {
    const us = T.eclUmbraSceneAt(jd);
    if (us) { v[`ecl.umbraScene@${jd}.lat`] = us.lat; v[`ecl.umbraScene@${jd}.lon`] = us.lon; }
    else v[`ecl.umbraScene@${jd}`] = null;
    const un = T.eclUmbraNASAAt(jd);
    v[`ecl.umbraNASA@${jd}.lat`] = un.lat;
    v[`ecl.umbraNASA@${jd}.lon`] = un.lon;
    v[`ecl.umbraNASA@${jd}.gamma`] = un.gamma;
  }

  // ── Phase 8.6-0: the published reference curves (browser-only family) ─────
  // NaN-valued cells (outside a curve's validity window) record as null via
  // JSON round-trip — that is itself pinned behaviour.
  for (const y of [-200000, -50000, -10000, -1000, 0, 1000, 1950, 2000, 2024, 50000, 100000]) {
    for (const [k, n] of Object.entries(T.refCurvesAt(y))) v[`refCurve.${k}@${y}`] = n;
  }
  // Stephenson evaluator with a synthetic poly literal — pins the pure spline
  // (the real poly is fetch-loaded app data).
  const STEPH_TEST_POLY = { segments: [
    { y0: -720, y1: 400, a: [10583.6, -7000.5, 1200.25, -33.125] },
    { y0: 400, y1: 2016, a: [120.0, -95.5, 40.0625, -1.5] },
  ] };
  for (const y of [-500, 1000, 2000]) {
    v[`refSteph@${y}`] = T.refStephensonAt(y, STEPH_TEST_POLY);
  }

  // ── Phase 9-0: the sun-harmonics correction (S-P8, browser side) ──────────
  for (const jd of [1355795.0, 2415020.5, 2451545.0, 2460409.262836, 2634166.0]) {
    v[`sunLonCorr@${jd}`] = T.sunLonCorrectionAt(jd);
  }

  // The reset must be exact, or every anchor above is measured against a
  // drifting baseline. Recorded rather than asserted so the fixture shows it.
  const back = T.anchors();
  for (const [k, n] of Object.entries(back)) {
    if (!Object.is(n, a[k])) v[`roundTripDrift.${k}`] = n - a[k];
  }
  return v;
}, { YEARS, EPOCHS_MA, MOON_JDS, MOON_DEEP_JDS, MOON_TMAS, MOON_CHAIN_PAIRS });

const pageErrors = s.errors.length;
await s.dispose();

if (pageErrors) console.log(`  note: ${pageErrors} page error(s) during load`);

if (write) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({
    _comment: 'REGRESSION fixture — what src/script.js does today, through window.__test__. `anchor.*` and `f(Y)@year` are read at J2000; `epoch@tMa.*` re-reads the seven globals AT that epoch (they are meant to depend on it). epoch@0Ma equals anchor.* since B.3b: resetEpochToJ2000 restores the module-load seeds exactly, so the R16 hysteresis is gone and roundTripDrift.* keys no longer appear (they were recorded only when reset failed to restore). The 118 ms seed-vs-chain gap at J2000 is R1 fit basis and closes with the Phase C/D refit. Must never change unintentionally. Regenerate: npm run build && node test/browser/snapshot.test.mjs --write',
    _source: 'src/script.js via dist/, headless Chromium',
    values: measured,
  }, null, 2)}\n`);
  console.log(`recorded ${Object.keys(measured).length} values -> packages/fixtures/regression/script-js.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(OUT, 'utf8')).values;
} catch {
  console.error(`No fixture at ${OUT}. Record it first:\n  npm run build && node test/browser/snapshot.test.mjs --write`);
  process.exit(1);
}

const drift = [];
const missing = [];
for (const [k, want] of Object.entries(expected)) {
  if (!(k in measured)) { missing.push(k); continue; }
  if (!Object.is(measured[k], want)) drift.push({ k, want, got: measured[k] });
}
const added = Object.keys(measured).filter((k) => !(k in expected));

console.log('REGRESSION — src/script.js (headless)');
console.log('='.repeat(74));
console.log(`  ${Object.keys(expected).length} fixture values checked`);

for (const { k, want, got } of drift) {
  const rel = want !== 0 ? (got - want) / want : NaN;
  console.log(`\n  DRIFT ${k}`);
  console.log(`    expected ${want}`);
  console.log(`    got      ${got}`);
  console.log(`    delta    ${got - want}  (${rel.toExponential(3)} relative)`);
}
for (const k of missing) console.log(`  GONE  ${k} — fixture exists, the page no longer produces it`);
for (const k of added) console.log(`  NEW   ${k} — page produces it, fixture does not cover it (re-record)`);

if (drift.length || missing.length) {
  console.log(`\nFAIL — ${drift.length} drifted, ${missing.length} missing.`);
  console.log('If the change was intended, re-record with --write and say so in the commit.');
  process.exit(1);
}
console.log(added.length ? `\nPASS (with ${added.length} uncovered new value(s))` : '\nPASS — no drift.');
