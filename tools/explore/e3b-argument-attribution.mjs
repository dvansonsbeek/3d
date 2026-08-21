// EXPLORATION 3b — E0: ARGUMENT ATTRIBUTION (20.3e folded in; plan §12i
// item 11 pre-registration). For every carrier the shipped location-tier
// modules ride (planetary mean longitudes, J2000 ϖ's, Delaunay D/M/Mp/F),
// measure the FRAMEWORK-NATIVE rate + epoch value against the IAU-class
// instrument literals:
//   Δrate (″/cy) · Δphase over the modern window (T ±1) · Δphase at −135
//   (T −21.35) · the INDUCED TABLE ERROR Σ|amp·Δarg| per carrier.
// Framework sources (all model-native, zero external literals):
//   planet sidereal periods  planets.record(k).solarYearInput (solar yr)
//   equinox precession       computeLatticePeriodsYears().axialPrecession
//   tropical/sidereal years  the framework year chain
//   lunar months             moonSiderealMonthInput + the framework
//                            apsidal/nodal precession day counts
//   Delaunay combos are EQUINOX-FREE (moon−sun, moon−ϖ′, moon−Ω), so
//   frame referencing cancels; planetary l's are Earth-equinox tropical
//   (sidereal rate + the framework equinox rate).
// ACCEPTANCE E0 (pre-registered): a carrier whose induced modern-window
// table error is <0.1″ is FRAMEWORK-EXPRESSIBLE; a miss becomes a named
// E1 attribution target. Either outcome is a result.
//
// E0 MEASURED (2026-08-21): 8/10 expressible. Core closes at ″/cy — lE
// −4.8 · D −0.41 · M +1.7; planets lMa −29 · lS −24 · lJ +167 (induced
// <0.03″). E1 targets: (i) Mp −5041 / F −5026″/cy — both ≈ ONE EQUINOX
// of referencing unaccounted in the sidereal-month/ICRF-precession input
// pair; after removing one equinox, F residual = 1.56″/cy with the
// FRAMEWORK equinox (5024.50) vs −2.74 with IAU (5028.80), Mp residual
// 16.9″/cy (apsidal-input class; T_apsidal×H is the framework handle);
// (ii) lV — literal-provenance (the D2 carrier is neither IAU-tropical
// nor clean sidereal; swap must re-derive V−E, blind cost 0.66″).
// Full record: plan §12i item 11.
// Usage: node tools/explore/e3b-argument-attribution.mjs
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);

const model = createModel();
const C = DEFAULT_CONSTANTS;
const AS = 3600;

// ── the instrument literals the shipped modules ride ─────────────────────
const LIT = {
  lMe: 149472.674, lV: 58517.815676, lE: 36000.769780,
  lMa: 19141.696300, lJ: 3036.302389, lS: 1223.511013,          // deg/cy tropical
  D: 445267.1114034, M: 35999.0502909, Mp: 477198.8675055, F: 483202.0175233,
};
const LIT0 = {
  lMe: 252.250906, lV: 181.979801, lE: 100.466457, lMa: 355.433000, lJ: 34.351519, lS: 50.077444,
  D: 297.8501921, M: 357.5291092, Mp: 134.9633964, F: 93.2720950,
};
// dominant shipped amplitudes per carrier (from the D2/A2 tables), for the
// induced-error metric: Σ|amp| of the terms each carrier participates in.
const AMPSUM = {
  lV: 25, lE: 60, lMa: 8, lJ: 30, lS: 1.2, lMe: 0.1,   // sun completion (″, incl. anomaly sidebands sharing the carrier)
  D: 12, M: 6, Mp: 35, F: 3,                            // moon tails + D-mixed terms (″)
};

// ── framework-native rates ───────────────────────────────────────────────
const lat = model.computeLatticePeriodsYears();
const EQ_YR = lat.axialPrecessionPeriodYears;             // framework equinox precession (yr)
// the framework year chain: tropical (mean solar) + sidereal year in days
const meanSolarYearDays = C.earthCalendar?.meanSolarYearDays ?? C.physicalConstants?.meanSolarYearDays ?? null;
const meanSiderealYearSeconds = C.physicalConstants?.meanSiderealYearSeconds ?? null;
// fall back to the tools/lib names if the block layout differs
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const TL = require('./tools/lib/constants.js');
const T_TROP_D = meanSolarYearDays ?? TL.meanSolarYearDays;                 // days
const T_SIDY_D = (meanSiderealYearSeconds ?? TL.meanSiderealYearSeconds) / 86400;
const CY = 36525;                                          // days per Julian century

const degPerCy = (cyclesPerDay) => 360 * CY * cyclesPerDay;

// Earth tropical mean-longitude rate: one revolution per tropical year
const fw = {};
fw.lE = degPerCy(1 / T_TROP_D);
// planets: sidereal rate + the FRAMEWORK equinox rate (tropical referencing)
const eqRateDegPerCy = 360 * 100 / EQ_YR;                  // deg per Julian century
const P = { lMe: 'mercury', lV: 'venus', lMa: 'mars', lJ: 'jupiter', lS: 'saturn' };
for (const [key, name] of Object.entries(P)) {
  const rec = model.planets.record(name);
  // solarYearInput = the planet's TROPICAL (equinox-referenced) period in
  // DAYS (doc 20 "official JPL solar year periods") — already the same
  // referencing as the tropical mean-longitude literals; no equinox term.
  fw[key] = degPerCy(1 / rec.solarYearInput);
}
// lunar months from framework identities (equinox-free combos)
const T_SIDM_D = C.moonReference.moonSiderealMonthInput;   // sidereal month (d)
const T_APS_D = C.moonReference.moonApsidalPrecessionDaysInputICRF;
const T_NOD_D = C.moonReference.moonNodalPrecessionDaysInputICRF;
fw.D = degPerCy(1 / T_SIDM_D - 1 / T_SIDY_D);
fw.Mp = degPerCy(1 / T_SIDM_D - 1 / T_APS_D);
fw.F = degPerCy(1 / T_SIDM_D + 1 / T_NOD_D);
// M (sun anomaly): sidereal-year rate minus the INERTIAL apsidal advance.
// The lattice identity: 1/T_tropΠ(20957, tropical ϖ cycle) = 1/EQ + 1/T_aps_inertial
const T_PERI_TROP_YR = lat.perihelionPrecessionPeriodYears;
const apsInertialPerYr = 1 / T_PERI_TROP_YR - 1 / EQ_YR;   // cycles/yr, inertial apsidal advance
fw.M = degPerCy(1 / T_SIDY_D) - 360 * 100 * apsInertialPerYr;

// ── report ───────────────────────────────────────────────────────────────
console.log('E0 — carrier rate attribution (framework-native vs instrument literals)');
console.log('framework inputs: equinox', EQ_YR.toFixed(1), 'yr · tropical yr', T_TROP_D, 'd · sidereal yr', T_SIDY_D.toFixed(7), 'd');
console.log('carrier   literal °/cy      framework °/cy     Δrate ″/cy     Δarg@T=1     Δarg@−135    induced@win ″');
let expressible = 0, targets = [];
for (const k of Object.keys(LIT)) {
  const dRateAs = (fw[k] - LIT[k]) * AS;                   // ″ per century
  const dArgWinAs = Math.abs(dRateAs) * 1;                 // at T = ±1
  const dArg135As = Math.abs(dRateAs) * 21.35;
  const inducedWin = AMPSUM[k] * (dArgWinAs * Math.PI / 180 / AS);  // ″ of table error (amp·Δarg[rad])
  const ok = inducedWin < 0.1;
  if (ok) expressible++; else targets.push(k);
  console.log(
    k.padEnd(8),
    LIT[k].toFixed(6).padStart(15),
    fw[k].toFixed(6).padStart(18),
    dRateAs.toFixed(3).padStart(12),
    (dArgWinAs / AS).toFixed(5).padStart(11) + '°',
    (dArg135As / AS).toFixed(3).padStart(10) + '°',
    inducedWin.toFixed(4).padStart(12),
    ok ? '  ✓' : '  ✗ E1-target',
  );
}
console.log(`\n${expressible}/${Object.keys(LIT).length} carriers framework-expressible at the <0.1″ induced-error bar; E1 targets: ${targets.join(', ') || 'none'}`);

// ── E1-target diagnostics (measured hints, recorded with E0) ─────────────
console.log('\nE1-target diagnostics:');
// Mp/F: both gaps sit ≈ one equinox rate — test the referencing variant
// (one missing equinox-rate in the sidereal-month/precession input pair).
const eqAs = eqRateDegPerCy * AS;
console.log(`  equinox rate (framework H-lattice): ${eqAs.toFixed(2)}″/cy · (IAU 5028.80)`);
for (const k of ['Mp', 'F']) {
  const gap = (LIT[k] - fw[k]) * AS;
  console.log(`  ${k}: literal−framework = ${gap.toFixed(2)}″/cy → gap−eq_framework = ${(gap - eqAs).toFixed(2)}″/cy · gap−eq_IAU = ${(gap - 5028.80).toFixed(2)}″/cy`);
}
// lV: the D2 carrier literal matches Venus's SIDEREAL rate, not tropical —
// a literal-provenance finding (harmless while fit≡eval matched, but the
// framework swap must re-derive the V−E amplitudes against the new carrier).
const lVsid = fw.lV - eqRateDegPerCy;
console.log(`  lV: framework sidereal-only = ${lVsid.toFixed(6)} °/cy vs literal ${LIT.lV} → Δ ${(1 * (lVsid - LIT.lV) * AS).toFixed(2)}″/cy (literal ≈ sidereal-flavored)`);

// ── zero-points (J2000 epoch values) ─────────────────────────────────────
console.log('\nzero-points at J2000 (framework anchor vs literal):');
console.log('  lE  literal', LIT0.lE, ' framework sunMeanLongitudeJ2000', C.earthOrbital.sunMeanLongitudeJ2000_deg);
console.log('  ϖE  literal 102.937   framework earthPerihelionLongitudeJ2000', C.earthOrbital.earthPerihelionLongitudeJ2000);
for (const [key, name] of Object.entries(P)) {
  const rec = model.planets.record(name);
  console.log(`  ϖ_${name.padEnd(8)} literal-table … framework longitudePerihelion ${rec.longitudePerihelion}`);
}
console.log('  (planet λ zero-points: the Phase-C engine-graph extraction is the framework reading — validated 14–47′ vs JPL at J2000; a per-carrier J2000 comparison belongs to the swap event, not E0 rates.)');
