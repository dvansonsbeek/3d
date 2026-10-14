#!/usr/bin/env node
/**
 * Calculation map — the generated value blocks of docs/110-calculation-map.md.
 *
 *   node tools/docs/render-calculation-map.mjs --check    exit 1 if any block is stale
 *   node tools/docs/render-calculation-map.mjs --write    re-render the blocks
 *
 * Doc 110 is the audit arc's map: every published quantity → engine → type →
 * formula chain → file:line → LIVE VALUE. The prose (formulas, inputs, code
 * locations) is hand-written; every NUMBER is written by this script from the
 * same evaluators the model runs ("a number a doc cannot reproduce from an
 * artifact gets written BY the script" — CLAUDE.md), so the owner's
 * spreadsheet can be checked cell by cell against values that cannot go
 * stale. Block markers follow scripts/generate_doc97_tables.py:
 *   <!-- generated:<id> --> … <!-- /generated:<id> -->
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = join(ROOT, 'docs/110-calculation-map.md');
const require = createRequire(join(ROOT, 'package.json'));

const {
  createModel, createDeepEccChannel, DEEP_MODES_ARTIFACT, DEFAULT_CONSTANTS: K,
} = await import('@essrt/physics');
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));

// The package model on the SERIES tier — the governed secular-series artifact
// injected as the API does (S3 tier unification), so the map's hybrid columns
// are the shipped tier and match the Node one-source movement bit for bit.
const m = createModel(undefined, { secularSeriesArtifact: require(join(ROOT, 'data', 'nbody-secular-series.json')) });
const deep = createDeepEccChannel(DEEP_MODES_ARTIFACT);

// The Meeus Ch. 47 J2000 anchors the lunar argument bundle carries verbatim
// (packages/physics/src/moon/arguments.cjs, the _FW_MOON bundle).
const LP0 = 218.3164477, MP0 = 134.9633964, F0 = 93.2720950;
const LPR = 481267.88123421, MPR = 477198.8675055, FR = 483202.0175233;
const WDOT = LPR - MPR, NDOT = LPR - FR;
const S_W = 2.407, S_N = 1.018;

/** @param {number} x @param {number} d */
const f = (x, d) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));
/** @param {number} x @param {number} d */
const e = (x, d) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toExponential(d));
/** @param {number} x */
const wrap = (x) => ((x % 360) + 360) % 360;

function blockEChain() {
  const rows = [
    '| year | T (cy) | e — deep modes | e — the published series | E = e/e₀ | (g/g₀)^s_ϖ | (g/g₀)^s_Ω | I(T, s_ϖ) (cy) | I(T, s_Ω) (cy) | perigee ϖ of date (°) | node Ω of date (°) |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [2000, 1246, -584, -2584, -10000]) {
    const t = y - 2000, T = t / 100;
    const iw = deep.channelIntegral(T, S_W), inn = deep.channelIntegral(T, S_N);
    rows.push(`| ${y} | ${f(T, 2)} | ${f(deep.eccAt(t), 7)} | ${f(m.earth.eccentricity(y), 7)} | ${f(deep.eFactorAt(t), 6)} | ${f(deep.modulation(-t / 1e6, S_W), 7)} | ${f(deep.modulation(-t / 1e6, S_N), 7)} | ${e(iw, 4)} | ${e(inn, 4)} | ${f(wrap((LP0 - MP0) + WDOT * (T + iw)), 4)} | ${f(wrap((LP0 - F0) + NDOT * (T + inn)), 4)} |`);
  }
  rows.push('');
  rows.push(`Anchors the rows above use: e₀ (JPL J2000 seed, the deep channel's anchor) = ${deep.e0.toFixed(10)} · e(J2000) IAU (astro-reference) = ${K.earthOrbital.earthEccentricityJ2000} · g₀ = (1 − e₀²)^(−3/2) = ${deep.g0.toFixed(10)} · ϖ̇₀ = LPR − MPR = ${WDOT.toFixed(7)} °/cy · Ω̇₀ = LPR − FR = ${NDOT.toFixed(7)} °/cy · s_ϖ = ${S_W}, s_Ω = ${S_N}.`);
  return rows.join('\n');
}

function blockKpl() {
  const de2 = deep.eccAt(50) ** 2 - deep.eccAt(-50) ** 2;
  const W = K.moonMeeus.elpW1T2Decomposition_arcsecPerCy2;
  const t2obl = (W.earthFigureJ2 + W.generalPrecessionPA_T2_Lieske1976) / 3600;
  const T2_LP_TIDAL = (-25.86 / 3600) / 2;
  const T2_LP = -0.0015786;
  const kPl = 2 * (T2_LP - T2_LP_TIDAL - t2obl) / de2;
  return [
    '| term | value | where it comes from |',
    '|---|---|---|',
    `| T2_LP (Meeus L′ T² coefficient) | ${T2_LP} °/cy² | Meeus Ch. 47 polynomial, literal |`,
    `| T2_LP_TIDAL = (−25.86″/cy²)/2 | ${e(T2_LP_TIDAL, 6)} °/cy² | LLR tidal n̈/2 |`,
    `| t2obl = (J₂ figure + Lieske ṗ_A T²)/3600 | ${e(t2obl, 6)} °/cy² | astro-reference elpW1T2Decomposition: ${W.earthFigureJ2} + ${W.generalPrecessionPA_T2_Lieske1976} ″/cy² |`,
    `| Δ(e²) per century at J2000 = e(+50 yr)² − e(−50 yr)² | ${e(de2, 6)} | the deep channel (the doc-66 value −2332 °/cy per e² was derived on the H/3 line's slope) |`,
    `| **K_PL = 2·(T2_LP − T2_LP_TIDAL − t2obl)/Δ(e²)** | **${kPl.toFixed(2)} °/cy per e²** | arguments.cjs kPlValue() — the same budget numerator, the live channel's slope |`,
  ].join('\n');
}

function blockLunarPeriods() {
  const rows = [
    '| age (Ma) | sidereal month (d) | perigee period (yr) | node period (yr) | T_p (yr) | (g/g₀)^s_ϖ | (g/g₀)^s_Ω |',
    '|---|---|---|---|---|---|---|',
  ];
  const DAY = 86400, YR = 365.25 * 86400;
  for (const t of [0, 0.002584, 0.01, 0.1, 1, 10, 380, 650]) {
    const sm = DT.meanMoonSiderealMonthAtAge(t), pp = DT.meanLunarPerigeePrecessionAtAge(t), np = DT.meanLunarNodePrecessionAtAge(t);
    // plan 09 step 7b: the H(t) column — the unit — is the composed precession period now
    rows.push(`| ${t} | ${f(sm === null ? null : sm / DAY, 6)} | ${f(pp === null ? null : pp / YR, 5)} | ${f(np === null ? null : np / YR, 5)} | ${f(DT.meanLunisolarPrecessionPeriodYearsAtAge(t), 1)} | ${f(deep.modulation(t, S_W), 7)} | ${f(deep.modulation(t, S_N), 7)} |`);
  }
  return rows.join('\n');
}

// ── Chain 2 — the lunisolar precession ──────────────────────────────────────
const C = require(join(ROOT, 'tools/lib/constants.js'));
const DOH = require(join(ROOT, 'tools/lib/deep-orbital-history.js'));
const D2R = Math.PI / 180;

/** The W3 torque split, exactly as the registry composes it
 *  (tools/docs/model-values.mjs, "the two-engine composed precession"). */
function torqueSplit() {
  const eE = K.earthOrbital.earthEccentricityJ2000;
  const sol = (C.GM_SUN / C.currentAUDistance ** 3) * Math.pow(1 - eE * eE, -1.5);
  const lun = (C.GM_MOON_ALONE / C.moonDistance ** 3) * Math.pow(1 - C.moonOrbitalEccentricity ** 2, -1.5)
    * (1 - 1.5 * Math.sin(C.moonEclipticInclinationJ2000 * D2R) ** 2);
  // The share and p₀ are READ from the ONE home (the engine's composed-
  // precession instance, plan 06 D6); the local sol/lun terms stay only to
  // show the derivation in the table. Divergence would be a stale twin.
  const fS = DT.PRECESSION_SOLAR_SHARE_J2000;
  if (Math.abs(fS - sol / (sol + lun)) > 1e-12) throw new Error(`torque share twin diverged: ${fS} vs ${sol / (sol + lun)}`);
  const p0 = DT.precessionRateJ2000ArcsecPerYr();   // plan 09: the IAU 2006 p_A input (25,771.6 yr); S5 had the derived year-laws' beat, never H/13
  const eps0 = K.earthOrbital.obliquityJ2000_deg;
  return { eE, sol, lun, fS, p0, eps0, alpha: p0 / Math.cos(eps0 * D2R) };
}

function blockTorqueSplit() {
  const s = torqueSplit();
  return [
    '| term | value | formula / source |',
    '|---|---|---|',
    `| solar torque factor | ${e(s.sol, 6)} km³/s²/km³ | GM☉/AU³ · (1 − e_E²)^(−3/2), e_E = ${s.eE} (IAU J2000) |`,
    `| lunar torque factor | ${e(s.lun, 6)} | GM_M/a_M³ · (1 − e_M²)^(−3/2) · (1 − 1.5 sin² i_M), a_M = ${C.moonDistance} km, e_M = ${C.moonOrbitalEccentricity}, i_M = ${C.moonEclipticInclinationJ2000}° |`,
    `| **f_S, the solar share** | **${(100 * s.fS).toFixed(2)} %** | sol/(sol + lun) — literature ≈ 31.6 % |`,
    `| p₀, the composition's J2000 anchor | ${s.p0.toFixed(4)} ″/yr | the IAU 2006 general precession in longitude p_A (astro-reference \`generalPrecessionJ2000_arcsecPerYr\`, T_p(J2000) = 25,771.575 yr) — the model's ONE J2000 reading since plan 09 (S5 had anchored it on the retired year combs' beat at 2000, 25,771.395 yr, 8 ppm faster). The former 1,296,000/(H/13) = 50.2450 was the fit anchor's reading, 0.086 % slow |`,
    `| α = p₀ / cos ε₀ | ${s.alpha.toFixed(3)} ″/yr | the hybrid's precession constant (ε₀ = ${s.eps0}°); literature ≈ 54.9 |`,
  ].join('\n');
}

function blockTidalClock() {
  const s = torqueSplit();
  const rows = [
    '| age (Ma) | a_M (km) | LOD (h) | ω/ω₀ = LOD₀/LOD | α (I/MR²) | (a₀/a)³ | **T_p = 1,296,000/ψ̇ (yr)** | ψ̇ (″/yr) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const Tp0 = DT.meanLunisolarPrecessionPeriodYearsAtAge(0);
  if (Math.abs(Tp0 - DT.certifiedAxialPrecessionJ2000Years()) > 1e-9) throw new Error(`T_p(J2000) ≠ the certified anchor: ${Tp0}`);
  for (const t of [0, 0.01, 0.1, 1, 10, 100, 380, 650, 1400, 2460]) {
    const a = DT.meanMoonDistanceMetresAtAge(t), lod = DT.meanLodSecondsAtAge(t), al = DT.earthMoiFactorAtAge(t);
    const w = DT.LOD_NOW_H13_S / lod, lf = Math.pow(DT.A_MOON_NOW_M / a, 3);
    const pc = DT.meanLunisolarPrecessionRateArcsecPerYrAtAge(t);   // the ONE home's value
    const Tp = DT.meanLunisolarPrecessionPeriodYearsAtAge(t);
    if (Math.abs(pc - w * s.p0 * (s.fS + (1 - s.fS) * lf)) > 1e-9) throw new Error(`composed ψ̇ twin diverged at ${t} Ma`);
    rows.push(`| ${t} | ${f(a / 1000, 0)} | ${f(lod / 3600, 3)} | ${f(w, 5)} | ${f(al, 6)} | ${f(lf, 4)} | **${f(Tp, 1)}** | ${f(pc, 2)} |`);
  }
  rows.push('');
  rows.push(`T_p(t) is the composed lunisolar precession period on the model’s ONE J2000 reading — 1,296,000/ψ̇ with p₀ = 1,296,000/T_p(J2000) = ${f(s.p0, 4)} ″/yr, T_p(J2000) = 1,296,000/p_A on the IAU 2006 general precession input (plan 09; S5 had the retired year combs’ beat at 2000, 8 ppm faster) — \`@essrt/physics/earth/precession-composed\` built inside \`deltat/deep-time.cjs\`, one home: the hybrid precesses on it, the paleo-anchors gate checks the ψ̇ column. (The internal UNIT H(t) = H₀·(ω₀/ω)/[f_S + (1 − f_S)(a₀/a)³] — \`hAtAge\`, 13.011 composed periods at every epoch, a fit constant’s multiple and not a period of anything the model computes; H₀ was fitted on the 1246 AD perihelion–solstice alignment — left the physics at plan 09 step 7b, after its spin-scaling twin H_era = H₀·LOD/LOD₀, the FROZEN era clock’s counter, left with the last comb at step 7a.) External readings for the ψ̇ column: IAU J2000 50.288 ″/yr (measured); Wu et al. 2024 at 650 Ma 67.64 ″/yr; Meyers & Malinverno 2018 at 1400 Ma 85.79 ± 2.72 ″/yr; Lantink et al. 2022 at 2460 Ma 108.6 ± 8.5 ″/yr (all three cyclostratigraphic inferences through an assumed astronomical model — theory-vs-inference, doc 99; the last two are gate rows \`xiamaling-prec-1400\` / \`lantink-prec-2460\`).`);
  return rows.join('\n');
}

function blockOfDatePrecession() {
  const one = DOH.createOneSourceMovement();
  const rows = [
    '| year | **T_p (B) one-family (yr) — PUBLISHED** (`epoch.axialPrecessionYearsAtYear`, API/MCP) | p (B) (″/yr) | T_p composed (yr) — the deep-time clock, same J2000 anchor (the IAU p_A since plan 09) | ε, hybrid (°) |',
    '|---|---|---|---|---|',
  ];
  // (plan 09: the (A) column — the frozen era device's comb-pair beat — left with the year combs)
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const b = m.yearLengths.axialPrecessionYearsAtYear(y);
    if (b !== m.epoch.axialPrecessionYearsAtYear(y)) throw new Error(`epoch.axialPrecessionYearsAtYear ≠ the one-family beat inside the window at ${y}`);
    rows.push(`| ${y} | **${f(b, 2)}** | ${f(1296000 / b, 4)} | ${f(m.lunisolar.meanPeriodYearsAtYear(y), 1)} | ${f(one ? one.epsDeg(y) : null, 5)} |`);
  }
  return rows.join('\n');
}

// ── Chain 3 — the year lengths and the day ───────────────────────────────────
function blockJ2000Identities() {
  // Plan 09: the J2000 year and day anchors are the IAU inputs — the era
  // device's H/8 snap, H/13 kinematic sidereal days and H/16 anomalistic
  // identity are deleted; the J2000 precession anchor is the IAU p_A. (Step 7c:
  // the device's rounded tropical-year input left model-parameters.json.)
  const msy = require(join(ROOT, 'tools/lib/constants.js')).meanSolarYearDays;   // plan 09: DERIVED (sidereal year + p_A), one home
  const sidD = K.yearLengthRef.siderealYear;
  const lod = K.yearLengthRef.solarDay;
  const anom = m.yearLengths.anomalisticYearSecondsAtYear(2000) / 86400;   // plan 09 step 4d: the law of date at 2000 (the series' apsidal line), not an input
  const pA = K.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
  return [
    '| quantity | value | formula | H-role |',
    '|---|---|---|---|',
    `| **meanSolarYearDays** | ${msy.toFixed(9)} | DERIVED in one home: 1/T = 1/T_sid + p_A/(1,296,000″·365.25 d) — the beat of \`yearLengthRef.siderealYear\` and the IAU 2006 p_A per Julian year (\`computeMeanTropicalYearJ2000Days\`); the calendar's year axis (plan 09: was the Meeus & Savoie 1992 input 365.2421897, 66 ms shorter; before it the device's rounded input 365.2422 snapped onto its lattice, 365.242203646, +1.2 s — that input left model-parameters.json at step 7c) | — |`,
    `| sidereal year (days, IAU) | ${sidD} | \`yearLengthRef.siderealYear\` (astro-reference) | — |`,
    `| **LOD_mean** (the kinematic day ω₀, s) | ${lod} | \`yearLengthRef.solarDay\` — the SI day (plan 09: was sidereal seconds over the H/13 kinematic sidereal days, 86,399.99968 s) | — |`,
    `| anomalistic year (days) | ${anom.toFixed(9)} | the one-family law of date at 2000 — the series' own apsidal rate 11.609 ″/yr on the sidereal year (plan 09 step 4d; the Simon 1994 mean element 365.259636 is a citation, 87 ms longer; before step 3 meanSolarYearDays · (H/16)/(H/16 − 1), 0.3 s low) | — |`,
    `| **p₀, the J2000 precession anchor** | ${pA} ″/yr (T_p = ${(1296000 / pA).toFixed(3)} yr) | \`earthOrbital.generalPrecessionJ2000_arcsecPerYr\` — IAU 2006 p_A (plan 09: was the retired year combs' beat at 2000, 25,771.395 yr) | — |`,
  ].join('\n');
}

function blockYearLengthsOfDate() {
  const rows = [
    '| year | sid, days of the epoch (`lengths.siderealYearDays`) | **sid one-family (SI d) — published** | trop, days of the epoch (`lengths.tropicalYearDays`) | **trop one-family (SI d) — published** | anom, days of the epoch (`lengths.anomalisticYearDays`) | **anom one-family (SI d) — published** |',
    '|---|---|---|---|---|---|---|',
  ];
  // (plan 09: the (A) comb columns — the frozen era device's year-length combs — left with the combs;
  // the days-of-the-epoch columns are the published SI years over the kinematic day of date)
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const L = m.lengths, Y = m.yearLengths;
    rows.push(`| ${y} | ${f(L.siderealYearDays(y), 6)} | ${f(Y.siderealYearSecondsAtYear(y) / 86400, 6)} | ${f(L.tropicalYearDays(y), 6)} | ${f(Y.tropicalYearSecondsAtYear(y) / 86400, 6)} | ${f(L.anomalisticYearDays(y), 6)} | ${f(Y.anomalisticYearSecondsAtYear(y) / 86400, 6)} |`);
  }
  return rows.join('\n');
}

function blockDayLengths() {
  const rows = [
    '| year | LOD kinematic of date = the Layer-0 tidal mean (s) | sidereal day (s) | stellar day (s) |',
    '|---|---|---|---|',
  ];
  // (plan 09: the "LOD actual" column — the retired sidereal comb's ripple on the
  // tidal mean — left with the comb, and the kinematic day of date IS the tidal mean;
  // step 5b: the "measured solar day" and "RA day offset" columns left with the
  // RA_DAY_OFFSET_MS comb — the equation of time's window term of an instrument.)
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const L = m.lengths;
    rows.push(`| ${y} | ${f(L.dayLengthSeconds(y), 5)} | ${f(L.siderealDaySeconds(y), 4)} | ${f(L.stellarDaySeconds(y), 4)} |`);
  }
  return rows.join('\n');
}

const BLOCKS_CHAIN3 = {
  'calcmap-j2000-identities': blockJ2000Identities,
  'calcmap-year-lengths-of-date': blockYearLengthsOfDate,
  'calcmap-day-lengths': blockDayLengths,
};

// ── Chain 4 — the obliquity ──────────────────────────────────────────────────
function blockObliquityValues() {
  const one = DOH.createOneSourceMovement();
  const la = new Map(require(join(ROOT, 'public/input/la2004-orbital-solution.json')).data.map((r) => [r.year, r.obliquity]));
  const V = require(join(ROOT, 'data/obliquity-hybrid-verdict.json')).verdict;
  /** @param {number|null} a @param {number|null} b */
  const d = (a, b) => (a === null || b === null ? null : (a - b) * 3600);
  const rows = [
    '| year | ε hybrid (°) | ε La2004 (°) | hybrid − La2004 (″) |',
    '|---|---|---|---|',
  ];
  // (plan 09: the K law column — the retired 16-harmonic comb — left with the frozen era device)
  for (const y of [-48000, -28000, -20000, -10000, -2584, -584, 0, 1246, 2000, 5000, 10000, 20000, 30000, 50000]) {
    const h = one ? one.epsDeg(y) : null, l = la.has(y - 2000) ? la.get(y - 2000) : null;
    // the package hybrid and the Node one-source hybrid share the IAU J2000 anchor (S3b); their
    // time anchors differ (2000.5 vs 2000 in the H(t) scaling) — measured residual 1.5e-10°, tolerance 1e-6°
    if (h !== null && Math.abs(m.earth.obliquityDeg(y) - h) > 1e-6) throw new Error(`published ε ≠ the hybrid at ${y}: ${m.earth.obliquityDeg(y)} vs ${h}`);
    rows.push(`| ${y} | ${f(h, 5)} | ${f(l, 5)} | ${f(d(h, l), 0)} |`);
  }
  /** @param {(y: number) => number} fn */
  const rate = (fn) => (fn(2000.5) - fn(1999.5)) * 3600 * 100;
  rows.push('');
  rows.push(`dε/dt at J2000 (″/cy): hybrid series ${f(one ? rate(one.epsDeg) : null, 2)} (the published ε, S3b) · IAU 2006 ${f(K.earthOrbital.obliquityRate_arcsecPerCentury, 2)} · banked verdict integrations: era-tier ζ ${f(V.rateEraArcsecPerCy, 2)}, full-tier ζ ${f(V.rateFullArcsecPerCy, 2)} (data/obliquity-hybrid-verdict.json).`);
  rows.push(`α at J2000 (″/yr): p₀/cos ε₀ = ${f(torqueSplit().alpha, 3)} with p₀ = the IAU 2006 general precession p_A (plan 09 — the form the registry and the shipped hybrid use) · ${f(V.alphaArcsecPerYr, 3)} in the verdict artifact (ψ̇ = the of-date beat ${f(V.psiDotH13ArcsecPerYr, 3)} ″/yr) — the two J2000 precession readings of chain 2, finding 2.`);
  rows.push(`Banked window rms vs La2004 (″), hybrid / fitted K law: ${['13', '50', '130', '270'].map((w) => `±${w} kyr ${f(V.windowsEra[w].hybridRmsArcsec, 0)} / ${f(V.windowsEra[w].fittedLawRmsArcsec, 0)}`).join(' · ')} (era-tier ζ). La2004 is a THEORY reference, not an observation.`);
  return rows.join('\n');
}

function blockObliquityBeat() {
  const s = torqueSplit();
  const z = require(join(ROOT, 'data/nbody-deep-secular-modes.json')).modes.earth.zeta
    .filter((x) => Math.abs(x.omegaRadPerYr) > 1e-9).sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
  const s3 = Math.abs(z.omegaRadPerYr * 180 / Math.PI) * 3600;
  const rows = [
    '| age (Ma) | **T_p(t) = 1,296,000/ψ̇, the composed period (yr)** | the deep chain’s year beat T_sid/(T_sid − T_trop) — T_p counted in sidereal years, + 1 (plan 09 step 5d; it was the unit’s H(t)/13, 0.086 % apart) | ψ̇ (″/yr) | beat 2π/(ψ̇ − \\|s₃\\|) (kyr) — the SHIPPED `obliqBeat*Kyr` form | beat(J2000)·T_p(t)/T_p(J2000) (kyr) — "obliquity period ∝ T_p", `obliqH8Scaled*Kyr` |',
    '|---|---|---|---|---|---|',
  ];
  const Tp0 = DT.meanLunisolarPrecessionPeriodYearsAtAge(0), pc0 = DT.meanLunisolarPrecessionRateArcsecPerYrAtAge(0), beat0 = 1296000 / (pc0 - s3);
  for (const t of [0, 380, 650, 1400, 2460]) {
    const sid = DT.meanSiderealYearSecondsAtAge(t), trop = DT.meanTropicalYearSecondsAtAge(t);
    const TpPair = sid / (sid - trop), Tp = DT.meanLunisolarPrecessionPeriodYearsAtAge(t), pc = DT.meanLunisolarPrecessionRateArcsecPerYrAtAge(t);
    if (Math.abs(pc - 1296000 / Tp) > 1e-9) throw new Error(`T_p twins diverged at ${t} Ma`);
    // plan 09 step 5d: the chain's tropical year is one equinox turn per T_p(t) (Julian years), so the
    // sidereal/tropical beat is T_p·(Julian year/sidereal year) + 1 — the unit-count form of 2.1 step 4c
    if (Math.abs(TpPair - (Tp * 365.25 * 86400 / sid + 1)) > 1e-6 * Tp) throw new Error(`the deep chain's year beat ≠ T_p(t) in sidereal years at ${t} Ma`);
    rows.push(`| ${t} | **${f(Tp, 3)}** | ${f(TpPair, 3)} | ${f(pc, 3)} | ${f(1296000 / (pc - s3) / 1000, 2)} | ${f(beat0 * Tp / Tp0 / 1000, 2)} |`);
  }
  rows.push('');
  rows.push(`s₃ = the dominant Earth ζ mode of data/nbody-deep-secular-modes.json = ${f(-s3, 4)} ″/yr (amplitude ${f(Math.hypot(z.re, z.im), 5)}); beat = 1,296,000/(ψ̇ᵢₙ − |s₃|) yr at an instant, ψ̇ᵢₙ the spin axis’s inertial rate; a RECORD sees the window mean of the pole rate with its of-date factors (createModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr / obliquityPeriodRealizedYears — the obliquity lines ride the LR04-window mean, v23.0). Plan 06 D6 → Phase 3 → S5: ψ̇(t) is the composed lunisolar rate on the model’s one J2000 reading (T_p(J2000) = ${f(Tp0, 1)} yr, 1,296,000/p_A on the IAU 2006 input since plan 09). The unit’s tidal-mean year pair still beats at H(t)/13 (third column) — that 13/H is the unit’s CALENDAR convention (the kinematic day/year identities, the deep JD↔year calendar), kept unchanged in S5 so nothing certified moves; it is not a precession claim (plan-06 D2 decided: that tier stays a named device — beyond ±2 Myr the calendar beat sits a constant 0.086 % above the composed period, the anchor ratio, so a re-base would buy nothing physical). Registry keys \`obliqBeatJ2000Kyr\`/\`obliqBeat1400MaKyr\`/\`obliqBeat2460MaKyr\` are the fifth column; \`obliqH8Scaled*Kyr\` (name kept) is the sixth, the pure precession-scaling alternative "obliquity period ∝ T_p" — the J2000 beat held proportional to T_p(t), identical to the beat today and the discriminated alternative at depth (D8 iii; S5 retired its former T_p·13/8 = H/8 form). The pre-Phase-3 "structural" beat on H_era/13 is retired.`);
  return rows.join('\n');
}

const BLOCKS_CHAIN4 = {
  'calcmap-obliquity-values': blockObliquityValues,
  'calcmap-obliquity-beat': blockObliquityBeat,
};

// ── Chain 5 — the cardinal points ────────────────────────────────────────────
// (Plan 09 step 7a: the frozen cardinal record's rebuild — `cardinalRebuilds`
// on createCardinalModel with the CARDINAL_POINT_* coefficients, knocked out
// term group by term group, and its two blocks `calcmap-cardinal-anchors` /
// `calcmap-cardinal-decomposition` — is deleted with the evaluator and the
// coefficients; doc 110 §5.5 keeps the last render as static text.)
const CP_TYPES = /** @type {const} */ (['VE', 'SS', 'AE', 'WS']);

/** Julian Day → 'YYYY-MM-DD hh:mm' — PROLEPTIC Gregorian at every epoch (Meeus
 *  ch. 7 with the Gregorian branch taken unconditionally, so a solstice stays
 *  near June 21 across the millennia instead of drifting on the Julian
 *  calendar). @param {number} jd */
function jdToDateString(jd) {
  const z = Math.floor(jd + 0.5), fr = jd + 0.5 - z;
  const al = Math.floor((z - 1867216.25) / 36524.25);
  const a = z + 1 + al - Math.floor(al / 4);
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const mins = Math.round(fr * 1440), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
  const p2 = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${year} ${p2(month)}-${p2(day)} ${p2(hh)}:${p2(mm)}`;
}

function blockCardinalEvents() {
  const rows = [
    '| year | VE | SS | AE | WS | SS→SS interval (d) | `yearLengthDays(SS)` (d, the crossing interval — the same quantity since R1) | mean of four (d) | one-family mean tropical year (s) | e |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const jd = CP_TYPES.map((t) => m.cardinal.jd(y, t));
    rows.push(`| ${y} | ${jd.map((v) => jdToDateString(v)).join(' | ')} | ${f(m.cardinal.jd(y + 1, 'SS') - m.cardinal.jd(y, 'SS'), 6)} | ${f(m.cardinal.yearLengthDays(y, 'SS'), 6)} | ${f(m.lengths.tropicalYearDays(y), 6)} | ${f(m.cardinalStructure.spreadSeconds(y).meanSeconds, 2)} | ${f(m.earth.eccentricity(y), 5)} |`);
  }
  rows.push('');
  rows.push('Dates on the proleptic Gregorian calendar from the TRUE-UT JD of the APPARENT crossing of the one Sun (since plan 06 R3 item 2 the finder-axis root minus the deltaTStart bridge — before it the published instants were 0.9 min late) (plan 06 R1 — formerly the retired device\'s JD); the `year` argument is the calendar year of the event. The single-year intervals carry nutation and the short-period terms (they match Meeus ch. 27\'s successive instants to seconds); the mean tropical year is the one-family column.');
  return rows.join('\n');
}

function blockCardinalSpread() {
  const rows = [
    '| year | crossing intervals: T_X − mean (s) VE · SS · AE · WS | one-source structure: T_X − mean (s) VE · SS · AE · WS | structure anomalistic year (s) | RA of VE (°) — the target by construction since R1 | e |',
    '|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, 0, 2000, 5000, 10000]) {
    const mean = m.lengths.tropicalYearDays(y);
    const fr = CP_TYPES.map((t) => f((m.cardinal.yearLengthDays(y, t) - mean) * 86400, 1)).join(' · ');
    const s = m.cardinalStructure.spreadSeconds(y);
    rows.push(`| ${y} | ${fr} | ${CP_TYPES.map((t) => f(s[t], 1)).join(' · ')} | ${f(m.cardinalStructure.anomalisticYearSeconds(y), 2)} | ${f(m.cardinal.raDeg(y, 'VE'), 4)} | ${f(m.earth.eccentricity(y), 5)} |`);
  }
  const sinE = Math.sin(K.earth.earthtiltMean * Math.PI / 180), A = K.earth.earthInvPlaneInclinationAmplitude;
  rows.push('');
  rows.push(`Retired device's RA formula constants (the record; since R1 the shipped RA is the target longitude by construction): raMean = base − earthRAAngle/sin ε̄ = base − ${f((2 * A - A * A / K.earth.earthtiltMean) / sinE, 6)}°, amplitude A/sin ε̄ = ${f(A / sinE, 6)}° on −sin(2π·3·c) + sin(2π·8·c) (base 0/90/180/270° for VE/SS/AE/WS); c counted from J2000 since plan 07 R10 (the device itself is deleted, plan 09 step 7a).`);
  return rows.join('\n');
}

const BLOCKS_CHAIN5 = {
  // (calcmap-cardinal-anchors / calcmap-cardinal-decomposition: the frozen
  //  record's blocks — deleted at plan 09 step 7a; doc 110 §5.5 keeps the last render)
  'calcmap-cardinal-events': blockCardinalEvents,
  'calcmap-cardinal-spread': blockCardinalSpread,
};

/** Chain 6 — the planets' spin channel (plan 06 Phase 7): the derived constants per planet. */
function blockPlanetSpin() {
  const rows = [
    '| planet | λ = C/MR² (class) | q | l | α ″/yr | ε₀ derived ° | ψ̇₀ ″/yr | T₀ yr | band ±1 Myr ° |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const k of m.planets.keys) {
    const s = m.planets.spin(k);
    const band = s.obliquityEnvelopeDeg(2000, 1_000_000);
    rows.push(`| ${k} | ${s.momentOfInertiaFactor} (${s.momentOfInertiaFactorClass}) | ${e(s.satelliteQuadrupole, 2)} | ${e(s.satelliteAngularMomentum, 2)} | ${f(s.alphaArcsecPerYr, 4)} | ${f(s.obliquityJ2000Deg, 3)} | ${s.cassiniLocked ? 'Cassini-locked (node rate)' : f(s.spinPrecessionRateArcsecPerYrJ2000, 4)} | ${s.cassiniLocked ? '—' : Math.round(s.axialPrecessionPeriodYearsJ2000).toLocaleString('en-US')} | ${s.cassiniLocked ? '—' : `${f(band.minDeg, 2)}–${f(band.maxDeg, 2)}`} |`);
  }
  return rows.join('\n');
}

const BLOCKS = {
  'calcmap-planet-spin': blockPlanetSpin,
  'calcmap-e-chain-values': blockEChain,
  'calcmap-kpl': blockKpl,
  'calcmap-lunar-periods': blockLunarPeriods,
  'calcmap-torque-split': blockTorqueSplit,
  'calcmap-tidal-clock': blockTidalClock,
  'calcmap-ofdate-precession': blockOfDatePrecession,
  ...BLOCKS_CHAIN3,
  ...BLOCKS_CHAIN4,
  ...BLOCKS_CHAIN5,
};

const write = process.argv.includes('--write');
let doc = readFileSync(DOC, 'utf8');
let stale = 0;
for (const [id, fn] of Object.entries(BLOCKS)) {
  // tolerate an EMPTY block (markers on adjacent lines) — the doc's first state
  const re = new RegExp(`(<!-- generated:${id} -->)\\n?([\\s\\S]*?)\\n?(<!-- /generated:${id} -->)`);
  const mm = doc.match(re);
  if (!mm) { console.error(`  MISSING block markers for ${id} in docs/110-calculation-map.md`); process.exit(2); }
  const fresh = fn();
  if (mm[2] !== fresh) {
    stale++;
    if (write) doc = doc.replace(re, () => `${mm[1]}\n${fresh}\n${mm[3]}`);
    else console.error(`  STALE block ${id}`);
  }
}
if (write) {
  writeFileSync(DOC, doc);
  console.log(`render-calculation-map: ${stale} block(s) re-rendered (${Object.keys(BLOCKS).length} total)`);
} else if (stale) {
  console.error(`FAIL — ${stale} stale generated block(s) in docs/110. Regenerate: node tools/docs/render-calculation-map.mjs --write`);
  process.exit(1);
} else {
  console.log(`PASS — docs/110 generated blocks fresh (${Object.keys(BLOCKS).length})`);
}
