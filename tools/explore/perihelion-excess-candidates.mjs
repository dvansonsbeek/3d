#!/usr/bin/env node
// PRE-REGISTERED TEST — candidates for the excess apsidal advance ("the 43").
//
// The transit record (tools/explore/mercury-transit-apsidal-test.mjs; Morrison
// & Ward 1975) shows Mercury's apsidal line physically turns ~43 ″/cy faster
// than the Newtonian masses predict, in a measurement that never touches an
// equator or an equinox. So the excess is a property of the ORBIT, and any
// explanation must be a rule that acts at the body. This harness scores
// candidate rules against the non-circular measurements, one rule for all
// bodies, and keeps an explicit empty slot for a lattice-native mechanism.
//
// TARGETS
//   T1 — non-circular (the excess was a FREE parameter of the fit):
//        Mercury  41.9 ± 0.5 ″/cy   Morrison & Ward 1975, MNRAS 173, 183 (~2,400 observed transit contacts 1677–1973)
//        Icarus    9.9 ± 2.0 ″/cy   radar + optical, Shapiro, Ash & Smith 1968 (PRL 20, 1517), Shapiro et al. 1971 (AJ 76, 588),
//                                    Lieske & Null 1969 — agreement with GR's 9.93 within the quoted ~20 %; the ±2.0 is a
//                                    conservative placeholder, REFINE from the papers before quoting this row.
//        Mars     ≈ +1 ± 3 ″/cy    the ECLIPJ2000 ϖ trend of the model's own WebGeoCalc series (1900–2026) minus the
//                                    Newtonian secular rate from the masses — an ecliptic-longitude measurement in which
//                                    any equatorial projection is identically zero.
//   T2 — GR-inclusive ephemeris fit residuals with PPN β free (Pitjeva, EPM2008): Venus 8.62 ± 0.03,
//        Earth 3.84 ± 0.01, Mars 1.35 ± 0.01. Shown and scored SEPARATELY: the owner's circularity
//        objection (the fit contains GR) is recorded; these rows are not what decides.
//
// RULES FOR A LATTICE-NATIVE CANDIDATE (the empty slot below):
//   • one formula for every body, evaluated from lattice/orbital quantities only
//     (H, 8H/N, a, e, period, masses) — no obliquity ε, no longitude measured from
//     the equinox, nothing that depends on Earth's spin axis or on a coordinate grid;
//   • no parameter fitted to the targets (or: fitted on Mercury alone and then
//     PREDICTING the others — say which);
//   • PASS = every T1 target within 3σ.
//
//   node tools/explore/perihelion-excess-candidates.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = createRequire(import.meta.url)(join(ROOT, 'tools', 'lib', 'constants.js'));

const D2R = Math.PI / 180, ARCSEC = 206264.806;
const EPS_J2000 = 23.43928;   // IAU 2006, deg — used ONLY by the projection candidate (that is the point)

// ── bodies ───────────────────────────────────────────────────────────────────
// a from the period (Kepler III on the model's own sidereal year), e and ϖ (J2000
// ecliptic) from the model's planet records; the lattice rate is the model's
// ecliptic divisor; the Newtonian secular rate is the perturbation-theory value
// (Clemence 1947 for Mercury; Standish J2000-frame rates minus GR for the rest).
const planet = (key, newtonianAscy) => {
  const P = C.planets[key];
  const aAU = Math.pow(P.solarYearInput / C.meanSiderealYearDays, 2 / 3);
  return { name: key, aAU, e: P.orbitalEccentricityJ2000, periodDays: P.solarYearInput, periLonDeg: P.longitudePerihelion,
           latticeAscy: 1296000 / P.perihelionEclipticYears * 100, newtonianAscy };
};
const BODIES = [
  planet('mercury', 531.5),
  planet('venus',   -290 - 8.62),   // Standish 0.00268 °/cy ≈ +9.7 incl. GR in the J2000 frame; the of-date/secular value ≈ −290 → Newtonian ≈ −299 (ϖ poorly defined, e = 0.0068)
  { name: 'earth', aAU: 1.00000261, e: 0.01671123, periodDays: C.meanSiderealYearDays, periLonDeg: 102.93768193, latticeAscy: null, newtonianAscy: 1163.8 - 3.84 },
  planet('mars', 1599.9 - 1.35),
  { name: 'icarus', aAU: 1.0780, e: 0.8270, periodDays: 408.8, periLonDeg: 88.02 + 31.43, latticeAscy: null, newtonianAscy: 248.5 },   // JPL SBDB elements; Newtonian 248.48 (Pogossian 2025, Table 1)
];
// Mars, non-circular: the ECLIPJ2000 ϖ trend of the model's own WebGeoCalc series
// (public/input/wgc-perihelion-data.json, 1900–2026, sin+lin fit, ±3 ″/cy window
// noise) minus the Newtonian secular rate from the masses. No equator, no GR fit.
const wgc = JSON.parse(readFileSync(join(ROOT, 'public', 'input', 'wgc-perihelion-data.json'), 'utf8'));
const marsEclipticExcess = wgc.MARS.rates.sinPi - BODIES.find((b) => b.name === 'mars').newtonianAscy;
const TARGETS = {
  T1: { mercury: [41.9, 0.5], icarus: [9.9, 2.0], mars: [marsEclipticExcess, 3.0] },
  T2: { venus: [8.62, 0.03], earth: [3.84, 0.01], mars: [1.35, 0.01] },
};

// ── candidates ───────────────────────────────────────────────────────────────
const grAscy = (b) => {   // 6π GM_sun / (c² a (1 − e²)) per orbit × orbits per century; the model's constants
  const aKm = b.aAU * C.currentAUDistance;
  const perOrbit = 6 * Math.PI * C.GM_SUN / (C.speedOfLight ** 2 * aKm * (1 - b.e ** 2));
  return perOrbit * (36525 / b.periodDays) * ARCSEC;
};
const raSlope = (lamDeg, epsDeg) => { const l = lamDeg * D2R, e = epsDeg * D2R; return Math.cos(e) / (Math.cos(l) ** 2 + Math.sin(l) ** 2 * Math.cos(e) ** 2); };
const baseRate = (b) => b.latticeAscy ?? b.newtonianAscy;   // the ecliptic advance the projection acts on

const CANDIDATES = [
  { name: 'GR: 6πGM/(c²a(1−e²)) — zero parameters', fn: (b) => grAscy(b) },
  { name: 'equatorial projection: base·(dα/dλ − 1) at ϖ, ε = 23.44° — zero parameters', fn: (b) => baseRate(b) * (raSlope(b.periLonDeg, EPS_J2000) - 1) },
  { name: 'constant fraction of the Newtonian rate (k fitted on Mercury, predicts the rest)', fn: (b, k) => k * b.newtonianAscy, fitOnMercury: (m) => TARGETS.T1.mercury[0] / m.newtonianAscy },
  { name: 'inverse semi-major axis (k/a, k fitted on Mercury)', fn: (b, k) => k / b.aAU, fitOnMercury: (m) => TARGETS.T1.mercury[0] * m.aAU },
  { name: 'nearest lattice slot 8H/N to the Mercury excess (N integer)', fn: (b, N) => 1296000 * 100 / (8 * C.H / N), fitOnMercury: (m) => Math.max(1, Math.round(8 * C.H * TARGETS.T1.mercury[0] / 129600000)) },
  { name: 'LATTICE-NATIVE CANDIDATE — empty slot (define fn per the rules in the header)', fn: null },
];

// ── scoring ──────────────────────────────────────────────────────────────────
const f = (v, d = 2, w = 9) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d)).padStart(w);
console.log('Pre-registered test — candidate rules for the excess apsidal advance (″/cy)\n');
const tgt = (tier) => Object.entries(tier).map(([k, [v, s]]) => `${k} ${v.toFixed(2)} ± ${s}`).join(' · ');
console.log('targets   T1 (non-circular): ' + tgt(TARGETS.T1) + '\n          T2 (GR-inclusive fit residuals, flagged): ' + tgt(TARGETS.T2) + '\n');
console.log('candidate'.padEnd(78) + BODIES.map((b) => b.name.padStart(9)).join('') + '   χ²(T1)  T1 verdict   χ²(T2)');
for (const c of CANDIDATES) {
  if (!c.fn) { console.log(c.name.padEnd(78) + '(not defined — the slot this test reserves; a proposal is scored here)'); continue; }
  const mercury = BODIES.find((b) => b.name === 'mercury');
  const k = c.fitOnMercury ? c.fitOnMercury(mercury) : undefined;
  const pred = Object.fromEntries(BODIES.map((b) => [b.name, c.fn(b, k)]));
  const chi = (tier) => Object.entries(tier).reduce((s, [name, [v, sig]]) => s + ((pred[name] - v) / sig) ** 2, 0);
  const pass = Object.entries(TARGETS.T1).every(([name, [v, sig]]) => Math.abs(pred[name] - v) <= 3 * sig);
  console.log((c.name + (k !== undefined ? `  [k = ${typeof k === 'number' ? k.toPrecision(4) : k}]` : '')).padEnd(78) + BODIES.map((b) => f(pred[b.name])).join('') + f(chi(TARGETS.T1), 1, 9) + (pass ? '   PASS     ' : '   FAIL     ') + f(chi(TARGETS.T2), 0, 8));
}
console.log('\nreading: a rule passes when every T1 target is within 3σ. T2 is informative only (the owner\'s circularity point stands: those residuals come from GR-inclusive fits).');
console.log('the projection rule is a function of ε and of ϖ measured from the equinox — a coordinate grid — and is listed to show what the test rejects, not as a candidate mechanism.');
console.log('note: on Mercury + Icarus alone the projection rule also passes (Icarus ϖ = 119°: RA stretch ≈ 4 %, GR/Newtonian ≈ 4 % — a second coincidence); the Mars ecliptic row is what separates the rules without any GR-inclusive fit.');
