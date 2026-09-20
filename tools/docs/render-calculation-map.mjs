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

const m = createModel();
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
    '| year | T (cy) | e — deep modes | e — H/3 law | E = e/e₀ | (g/g₀)^s_ϖ | (g/g₀)^s_Ω | I(T, s_ϖ) (cy) | I(T, s_Ω) (cy) | perigee ϖ of date (°) | node Ω of date (°) |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [2000, 1246, -584, -2584, -10000]) {
    const t = y - 2000, T = t / 100;
    const iw = deep.channelIntegral(T, S_W), inn = deep.channelIntegral(T, S_N);
    rows.push(`| ${y} | ${f(T, 2)} | ${f(deep.eccAt(t), 7)} | ${f(m.earth.eccentricity(y), 7)} | ${f(deep.eFactorAt(t), 6)} | ${f(deep.modulation(-t / 1e6, S_W), 7)} | ${f(deep.modulation(-t / 1e6, S_N), 7)} | ${e(iw, 4)} | ${e(inn, 4)} | ${f(wrap((LP0 - MP0) + WDOT * (T + iw)), 4)} | ${f(wrap((LP0 - F0) + NDOT * (T + inn)), 4)} |`);
  }
  rows.push('');
  rows.push(`Anchors the rows above use: e₀ (JPL J2000 seed, the deep channel's anchor) = ${deep.e0.toFixed(10)} · e(J2000) IAU (the H/3 law's anchor) = ${K.earthOrbital.earthEccentricityJ2000} · g₀ = (1 − e₀²)^(−3/2) = ${deep.g0.toFixed(10)} · ϖ̇₀ = LPR − MPR = ${WDOT.toFixed(7)} °/cy · Ω̇₀ = LPR − FR = ${NDOT.toFixed(7)} °/cy · s_ϖ = ${S_W}, s_Ω = ${S_N}.`);
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
    '| age (Ma) | sidereal month (d) | perigee period (yr) | node period (yr) | H(t) (yr) | (g/g₀)^s_ϖ | (g/g₀)^s_Ω |',
    '|---|---|---|---|---|---|---|',
  ];
  const DAY = 86400, YR = 365.25 * 86400;
  for (const t of [0, 0.002584, 0.01, 0.1, 1, 10, 380, 650]) {
    const sm = DT.meanMoonSiderealMonthAtAge(t), pp = DT.meanLunarPerigeePrecessionAtAge(t), np = DT.meanLunarNodePrecessionAtAge(t);
    rows.push(`| ${t} | ${f(sm === null ? null : sm / DAY, 6)} | ${f(pp === null ? null : pp / YR, 5)} | ${f(np === null ? null : np / YR, 5)} | ${f(DT.meanHAtAge(t), 1)} | ${f(deep.modulation(t, S_W), 7)} | ${f(deep.modulation(t, S_N), 7)} |`);
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
  const p0 = DT.PRECESSION_RATE_J2000_ARCSEC_PER_YR;
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
    `| p₀, the composition's J2000 anchor | ${s.p0.toFixed(4)} ″/yr | 1,296,000 / (H/13) — **from H**, not from IAU (50.2879) nor from the of-date beat (table 2.3) |`,
    `| α = p₀ / cos ε₀ | ${s.alpha.toFixed(3)} ″/yr | the hybrid's precession constant (ε₀ = ${s.eps0}°); literature ≈ 54.9 |`,
  ].join('\n');
}

function blockTidalClock() {
  const s = torqueSplit();
  const rows = [
    '| age (Ma) | a_M (km) | LOD (h) | ω/ω₀ = LOD₀/LOD | α (I/MR²) | H(t) (yr) | H(t)/13 (yr) | structural ψ̇ = p₀·ω/ω₀ (″/yr) | (a₀/a)³ | composed ψ̇ (″/yr) |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const t of [0, 0.01, 0.1, 1, 10, 100, 380, 650, 1400, 2460]) {
    const a = DT.meanMoonDistanceMetresAtAge(t), lod = DT.meanLodSecondsAtAge(t), al = DT.earthMoiFactorAtAge(t), H = DT.meanHAtAge(t);
    const w = DT.LOD_NOW_H13_S / lod, lf = Math.pow(DT.A_MOON_NOW_M / a, 3);
    const pc = DT.composedPrecessionRateArcsecPerYrAtAge(t);   // the ONE home's value (plan 06 D6)
    if (Math.abs(pc - w * s.p0 * (s.fS + (1 - s.fS) * lf)) > 1e-9) throw new Error(`composed ψ̇ twin diverged at ${t} Ma`);
    rows.push(`| ${t} | ${f(a / 1000, 0)} | ${f(lod / 3600, 3)} | ${f(w, 5)} | ${f(al, 6)} | ${f(H, 0)} | ${f(H / 13, 1)} | ${f(s.p0 * w, 2)} | ${f(lf, 4)} | ${f(pc, 2)} |`);
  }
  rows.push('');
  rows.push('The last column is the SHIPPED leg-1 rate (plan 06 D6; `@essrt/physics/earth/precession-composed`, one home — the hybrid precesses on it, the paleo-anchors gate checks it). External readings: IAU J2000 50.288 ″/yr (measured); Wu et al. 2024 at 650 Ma 67.64 ″/yr; Meyers & Malinverno 2018 at 1400 Ma 85.79 ± 2.72 ″/yr; Lantink et al. 2022 at 2460 Ma 108.6 ± 8.5 ″/yr (all three cyclostratigraphic inferences through an assumed astronomical model — theory-vs-inference, doc 99; the last two are gate rows `xiamaling-prec-1400` / `lantink-prec-2460`).');
  return rows.join('\n');
}

function blockOfDatePrecession() {
  const one = DOH.createOneSourceMovement();
  const rows = [
    '| year | T_p (A) comb pair (yr) | p (A) (″/yr) | T_p (B) one-family (yr) | p (B) (″/yr) | (A) − (B) (yr) | H(t)/13 (yr) | ε, hybrid (°) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const a = m.epoch.axialPrecessionYearsAtYear(y), b = m.yearLengths.axialPrecessionYearsAtYear(y);
    rows.push(`| ${y} | ${f(a, 2)} | ${f(1296000 / a, 4)} | ${f(b, 2)} | ${f(1296000 / b, 4)} | ${f(a - b, 2)} | ${f(m.epoch.hAtYear(y) / 13, 1)} | ${f(one ? one.epsDeg(y) : null, 5)} |`);
  }
  return rows.join('\n');
}

// ── Chain 3 — the year lengths and the day ───────────────────────────────────
function blockJ2000Identities() {
  const H = K.foundational.holisticyearLength;
  const inp = K.foundational.inputmeanlengthsolaryearindays;
  const msy = Math.round(inp * (H / 8)) / (H / 8);
  const sidD = K.yearLengthRef.siderealYear;
  const sidKin = msy * H / (H - 13);
  const lod = sidD * 86400 / sidKin;
  const anom = msy * (H / 16) / (H / 16 - 1);
  return [
    '| quantity | value | formula | H-role |',
    '|---|---|---|---|',
    `| input tropical year (days) | ${inp} | \`inputmeanlengthsolaryearindays\` (model-parameters.json) | — |`,
    `| **meanSolarYearDays** | ${msy.toFixed(12)} | round(input · H/8) / (H/8) — snapped so H/8 = ${(H / 8).toFixed(3)} yr holds a WHOLE number of days (${Math.round(inp * (H / 8)).toLocaleString('en-US')}) | **L** (the whole-days-per-cycle constraint of the H fit) |`,
    `| sidereal year (days, IAU) | ${sidD} | \`yearLengthRef.siderealYear\` (astro-reference) | — |`,
    `| kinematic sidereal year (days) | ${sidKin.toFixed(12)} | meanSolarYearDays · H/(H − 13) — one precession per H/13 | **U/L** (the 13) |`,
    `| **LOD_mean** (the kinematic day, s) | ${lod.toFixed(9)} | sidereal seconds / kinematic sidereal days — the FIRST of the three day lengths (SI 86,400 · LOD_mean · LOD_real 86,400.0014) | — |`,
    `| anomalistic year (days) | ${anom.toFixed(10)} | meanSolarYearDays · (H/16)/(H/16 − 1) — one perihelion-of-date beat per H/16 | **L** (the 16) |`,
    `| **total days in H** | ${(H * msy).toLocaleString('en-US')} | H · meanSolarYearDays — an INTEGER by construction of the snap above; the day-count invariant of doc 99 | **U** |`,
  ].join('\n');
}

function blockYearLengthsOfDate() {
  const rows = [
    '| year | sid (A) comb (d) | sid (B) one-family (d) | trop (A) comb (d) | trop (A′) cardinal (d) | trop (B) one-family (d) | anom (A) comb (d) | anom (B) one-family (d) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const L = m.lengths, Y = m.yearLengths;
    rows.push(`| ${y} | ${f(L.siderealYearDays(y), 6)} | ${f(Y.siderealYearSecondsAtYear(y) / 86400, 6)} | ${f(L.tropicalYearDirectDays(y), 6)} | ${f(L.tropicalYearDays(y), 6)} | ${f(Y.tropicalYearSecondsAtYear(y) / 86400, 6)} | ${f(L.anomalisticYearDays(y), 6)} | ${f(Y.anomalisticYearSecondsAtYear(y) / 86400, 6)} |`);
  }
  rows.push('');
  rows.push(`Comb divisors (the H-divisor harmonics each (A) family adds to its tidal-chain base): tropical ${K && require(join(ROOT, 'packages/physics/src/constants/coefficients.js')).FITTED_COEFFICIENTS.TROPICAL_YEAR_HARMONICS.map((r) => r[0]).join(', ')} · sidereal ${require(join(ROOT, 'packages/physics/src/constants/coefficients.js')).FITTED_COEFFICIENTS.SIDEREAL_YEAR_HARMONICS.map((r) => r[0]).join(', ')} · anomalistic ${require(join(ROOT, 'packages/physics/src/constants/coefficients.js')).FITTED_COEFFICIENTS.ANOMALISTIC_YEAR_HARMONICS.map((r) => r[0]).join(', ')} (phase = div × cycles since the balanced year).`);
  return rows.join('\n');
}

function blockDayLengths() {
  const rows = [
    '| year | LOD kinematic of date (s) | measured solar day (s) | RA day offset (ms) | sidereal day (s) | stellar day (s) | LOD tidal mean (s) | LOD actual (s) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const L = m.lengths, t = (2000 - y) / 1e6;
    rows.push(`| ${y} | ${f(L.dayLengthSeconds(y), 5)} | ${f(L.measuredSolarDaySeconds(y), 5)} | ${f(L.raDayOffsetMs(y), 3)} | ${f(L.siderealDaySeconds(y), 4)} | ${f(L.stellarDaySeconds(y), 4)} | ${f(DT.meanLodSecondsAtAge(t), 5)} | ${f(DT.meanLodSecondsAtAgeActual(t), 5)} |`);
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
    '| year | ε hybrid (°) | ε K law (°) | ε La2004 (°) | hybrid − K law (″) | hybrid − La2004 (″) | K law − La2004 (″) |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const y of [-48000, -28000, -20000, -10000, -2584, -584, 0, 1246, 2000, 5000, 10000, 20000, 30000, 50000]) {
    const h = one ? one.epsDeg(y) : null, k = m.earth.obliquityDeg(y), l = la.has(y - 2000) ? la.get(y - 2000) : null;
    rows.push(`| ${y} | ${f(h, 5)} | ${f(k, 5)} | ${f(l, 5)} | ${f(d(h, k), 0)} | ${f(d(h, l), 0)} | ${f(d(k, l), 0)} |`);
  }
  /** @param {(y: number) => number} fn */
  const rate = (fn) => (fn(2000.5) - fn(1999.5)) * 3600 * 100;
  rows.push('');
  rows.push(`dε/dt at J2000 (″/cy): hybrid series ${f(one ? rate(one.epsDeg) : null, 2)} · K law ${f(rate(m.earth.obliquityDeg), 2)} · IAU 2006 ${f(K.earthOrbital.obliquityRate_arcsecPerCentury, 2)} · banked verdict integrations: era-tier ζ ${f(V.rateEraArcsecPerCy, 2)}, full-tier ζ ${f(V.rateFullArcsecPerCy, 2)} (data/obliquity-hybrid-verdict.json).`);
  rows.push(`α at J2000 (″/yr): p₀/cos ε₀ = ${f(torqueSplit().alpha, 3)} with p₀ = 1,296,000/(H/13) (the form the registry and the shipped hybrid use) · ${f(V.alphaArcsecPerYr, 3)} in the verdict artifact (ψ̇ = the of-date beat ${f(V.psiDotH13ArcsecPerYr, 3)} ″/yr) — the two J2000 precession readings of chain 2, finding 2.`);
  rows.push(`Banked window rms vs La2004 (″), hybrid / fitted K law: ${['13', '50', '130', '270'].map((w) => `±${w} kyr ${f(V.windowsEra[w].hybridRmsArcsec, 0)} / ${f(V.windowsEra[w].fittedLawRmsArcsec, 0)}`).join(' · ')} (era-tier ζ). La2004 is a THEORY reference, not an observation.`);
  return rows.join('\n');
}

function blockObliquityBeat() {
  const s = torqueSplit();
  const z = require(join(ROOT, 'data/nbody-deep-secular-modes.json')).modes.earth.zeta
    .filter((x) => Math.abs(x.omegaRadPerYr) > 1e-9).sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
  const s3 = Math.abs(z.omegaRadPerYr * 180 / Math.PI) * 3600;
  const sid0 = DT.meanSiderealYearSecondsAtAge(0.000001), trop0 = DT.meanTropicalYearSecondsAtAge(0.000001);
  const pCert0 = 1296000 / (sid0 / (sid0 - trop0));   // the certified J2000 of-date beat — the hybrid's anchor
  const rows = [
    '| age (Ma) | T_p(t) from the tidal-mean year pair (yr) | H(t)/13 (yr) | ψ̇ structural = 1,296,000/T_p (″/yr) | ψ̇ composed, chain 2.3 (″/yr) | ψ̇(t)/ψ̇₀ composed | beat on structural ψ̇ (kyr) — `obliqBeatStructural*Kyr`, the pre-D6 reading | beat on composed ψ̇ (kyr) — the SHIPPED `obliqBeat*Kyr` form | T_p·13/8 (kyr) — `obliqH8Scaled*Kyr` |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const t of [0, 380, 650, 1400, 2460]) {
    const sid = DT.meanSiderealYearSecondsAtAge(t), trop = DT.meanTropicalYearSecondsAtAge(t);
    const Tp = sid / (sid - trop), ps = 1296000 / Tp;
    const pc = DT.composedPrecessionRateArcsecPerYrAtAge(t), ratio = DT.composedPrecessionRateRatioAtAge(t);
    if (Math.abs(ratio - pc / s.p0) > 1e-12) throw new Error(`composed ratio twin diverged at ${t} Ma`);
    // the shipped beat: the certified J2000 anchor scaled by the composed ratio — exactly the hybrid's injection
    rows.push(`| ${t} | ${f(Tp, 3)} | ${f(DT.meanHAtAge(t) / 13, 3)} | ${f(ps, 3)} | ${f(pc, 3)} | ${f(ratio, 5)} | ${f(1296000 / (ps - s3) / 1000, 2)} | ${f(1296000 / (pCert0 * ratio - s3) / 1000, 2)} | ${f(Tp * 13 / 8 / 1000, 2)} |`);
  }
  rows.push('');
  rows.push(`s₃ = the dominant Earth ζ mode of data/nbody-deep-secular-modes.json = ${f(-s3, 4)} ″/yr (amplitude ${f(Math.hypot(z.re, z.im), 5)}); beat = 1,296,000/(ψ̇ − |s₃|) yr. Plan 06 D6: the SHIPPED leg-1 ψ̇(t) is the composed rate — registry keys \`obliqBeatJ2000Kyr\`/\`obliqBeat1400MaKyr\`/\`obliqBeat2460MaKyr\` are the eighth column (the certified J2000 anchor ${f(pCert0, 4)} ″/yr × the composed ratio — the same scaling the hybrid precesses on); the \`obliqBeatStructural*Kyr\` twins are the seventh (the pre-D6 reading, kept as the named diagnostic). Both in tools/docs/model-values.mjs, "the obliquity band as the beat".`);
  return rows.join('\n');
}

const BLOCKS_CHAIN4 = {
  'calcmap-obliquity-values': blockObliquityValues,
  'calcmap-obliquity-beat': blockObliquityBeat,
};

// ── Chain 5 — the cardinal points and the clock ──────────────────────────────
const FC = require(join(ROOT, 'packages/physics/src/constants/coefficients.js')).FITTED_COEFFICIENTS;
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

/** The model's OWN cardinal factory, rebuilt with term groups knocked out so
 *  each group's contribution can be written down. The full rebuild is
 *  asserted bit-identical to m.cardinal.jd — otherwise the decomposition
 *  would describe a different device than the one that ships. */
function cardinalRebuilds() {
  const { createCardinalModel } = require(join(ROOT, 'packages/physics/src/cardinal/index.cjs'));
  const H = K.foundational.holisticyearLength;
  const mSY = Math.round(K.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
  const balancedYear = K.earthOrbital.perihelionalignmentYear - K.foundational.temperatureGraphMostLikely * (H / 16);
  const A = K.earth.earthInvPlaneInclinationAmplitude, tilt = K.earth.earthtiltMean;
  const EMPTY = { SS: [], WS: [], VE: [], AE: [] };
  /** @param {Partial<{harmonics: any, eccTerms: any, jointTerms: any, tropicalHarmonics: any}>} o */
  const build = (o = {}) => createCardinalModel({
    isDeepTime: () => true,
    constants: {
      anchors: FC.CARDINAL_POINT_ANCHORS_ADJUSTED,
      harmonics: 'harmonics' in o ? o.harmonics : FC.CARDINAL_POINT_HARMONICS,
      eccTerms: 'eccTerms' in o ? o.eccTerms : FC.CARDINAL_POINT_ECC_TERMS,
      jointTerms: 'jointTerms' in o ? o.jointTerms : FC.CARDINAL_POINT_JOINT_TERMS,
      derived: FC.CARDINAL_POINT_DERIVED,
      tropicalHarmonics: 'tropicalHarmonics' in o ? o.tropicalHarmonics : FC.TROPICAL_YEAR_HARMONICS,
      balancedYear, meanSolarYearDays: mSY, hJ2000: H, tiltMeanDeg: tilt, raAngleDeg: 2 * A - A * A / tilt, inclAmplitudeDeg: A,
    },
    fns: {
      cyclesBetween: (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ n) => m.epoch.cyclesBetween(a, b, n),
      analyticTropicalDays: (/** @type {number} */ year) => {
        const tMa = (2000.5 - year) / 1e6, Ht = DT.meanHAtAge(tMa);
        return Number.isFinite(Ht) ? (DT.meanSiderealYearSecondsAtAge(tMa) / 86400) * (1 - 13 / Ht) : null;
      },
      meanHAtAgeMa: (/** @type {number} */ tMa) => DT.meanHAtAge(tMa),
      meanYearRealLodDays: () => null,
      eccentricityAt: (/** @type {number} */ y) => m.earth.eccentricity(y),
      eccentricityRateAt: () => 0,
    },
  });
  const full = build();
  for (const y of [-10000, -2584, 0, 2000, 5000, 10000]) for (const t of CP_TYPES) {
    if (full.computeSolsticeJD(y, t) !== m.cardinal.jd(y, t)) throw new Error(`cardinal rebuild differs from m.cardinal.jd at ${y} ${t}`);
  }
  return {
    balancedYear, mSY,
    full,
    noDelta: build({ harmonics: EMPTY, eccTerms: null, jointTerms: null }),
    noDeltaNoIh: build({ harmonics: EMPTY, eccTerms: null, jointTerms: null, tropicalHarmonics: [] }),
    harmOnly: build({ eccTerms: null, jointTerms: null }),
    eccOnly: build({ harmonics: EMPTY, jointTerms: null }),
    jointOnly: build({ harmonics: EMPTY, eccTerms: null }),
  };
}

function blockCardinalAnchors() {
  const R = cardinalRebuilds();
  const D = FC.CARDINAL_POINT_DERIVED;
  const rows = [
    '| quantity | value | what it is | H-role |',
    '|---|---|---|---|',
    `| balanced year (phase origin of EVERY comb) | ${f(R.balancedYear, 5)} | \`perihelionalignmentYear\` ${K.earthOrbital.perihelionalignmentYear} − \`temperatureGraphMostLikely\` ${K.foundational.temperatureGraphMostLikely} × H/16 — 14.5 perihelion-of-date cycles before the 1246 alignment ("obliquity cycle position 14.5 of 16", docs/20) | **L** (the offset is counted in H/16 units) |`,
    `| meanSolarYearDays | ${f(R.mSY, 12)} | the whole-days snap of chain 3.1 | **L** |`,
    `| lincoef (d/yr) | ${f(D.lincoef, 11)} | the fitted linear term of ΣT_trop — used VERBATIM (recomputing it from the 1-yr anchor injects a −12,276 s ramp) | — (fitted) |`,
    `| h0, h1 | ${f(D.h0, 4)}, ${f(D.h1, 6)} | H inside the Ih integral as h0 + h1·c (c = cycles since the balanced year): the fit's own linear H(c) | **P** |`,
    `| harmonic divisors (per point, 23 lines each) | ${FC.CARDINAL_POINT_HARMONICS.SS.map((r) => r[0]).join(', ')} | δ_X sinusoids on 2π·div·c | **C** |`,
    `| equation-of-centre orders | ${FC.CARDINAL_POINT_ECC_TERMS.SS.map((t) => t.order).join(', ')} (phase 2π·16·c; e(t) from the H/3 law) | e(t)ⁿ·[sin, cos](n·θ₁₆) — the braid; ~1.78 d amplitude | **L** (the perihelion-of-date phase counted as H/16) |`,
    `| joint sidebands (shared by the four points) | ${FC.CARDINAL_POINT_JOINT_TERMS.terms.length} terms, orders ${[...new Set(FC.CARDINAL_POINT_JOINT_TERMS.terms.map((t) => t.order))].join(', ')} × divisors ${[...new Set(FC.CARDINAL_POINT_JOINT_TERMS.terms.map((t) => t.div))].join(', ')} | phase order·λ_X − 2π·div·c, λ_X = ${Object.entries(FC.CARDINAL_POINT_JOINT_TERMS.quadratureDeg).map(([k, v]) => `${k} ${v}°`).join(', ')}; COUNTER-rotating (the load-bearing minus sign) | **C** |`,
    '',
    '| point | shipped anchor `CARDINAL_POINT_ANCHORS_ADJUSTED` (JD, date) | legacy base key `CARDINAL_POINT_ANCHORS` (JD, date) | shipped − legacy (h) |',
    '|---|---|---|---|',
  ];
  for (const t of CP_TYPES) {
    const b = FC.CARDINAL_POINT_ANCHORS_ADJUSTED[t], a = FC.CARDINAL_POINT_ANCHORS[t];
    rows.push(`| ${t} | ${f(b, 6)} (${jdToDateString(b)}) | ${f(a, 6)} (${jdToDateString(a)}) | ${f((b - a) * 24, 3)} |`);
  }
  rows.push('');
  rows.push('USNO 2000 instants for comparison (UTC): VE Mar 20 07:35 · SS Jun 21 01:48 (`juneSolstice2000_JD`, astro-reference) · AE Sep 22 17:27 · WS Dec 21 13:37. The shipped set is the one every runtime reads (model.js, script.js, tools/lib); the legacy key is exported by the constants generator but consumed only by the archived fitter.');
  return rows.join('\n');
}

function blockCardinalDecomposition() {
  const R = cardinalRebuilds();
  const D = FC.CARDINAL_POINT_DERIVED, a = FC.CARDINAL_POINT_ANCHORS_ADJUSTED.SS;
  const rows = [
    '| year | lincoef·(Y−2000) (d) | drift Simpson (d) | Ih (d) | Σ sinusoids − δ(2000) (d) | equation-of-centre orders (d) | joint sidebands (d) | JD_SS − anchor (d) | cycles since the balanced year, integrated | linear (Y − bY)/H |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const lin = D.lincoef * (y - 2000);
    const base2 = R.noDeltaNoIh.computeSolsticeJD(y, 'SS') - a, base = R.noDelta.computeSolsticeJD(y, 'SS') - a;
    const nd = R.noDelta.computeSolsticeJD(y, 'SS');
    rows.push(`| ${y} | ${f(lin, 4)} | ${f(base2 - lin, 5)} | ${f(base - base2, 5)} | ${f(R.harmOnly.computeSolsticeJD(y, 'SS') - nd, 5)} | ${f(R.eccOnly.computeSolsticeJD(y, 'SS') - nd, 5)} | ${f(R.jointOnly.computeSolsticeJD(y, 'SS') - nd, 5)} | ${f(m.cardinal.jd(y, 'SS') - a, 5)} | ${f(m.epoch.cyclesBetween(R.balancedYear, y, 1), 7)} | ${f((y - R.balancedYear) / K.foundational.holisticyearLength, 7)} |`);
  }
  rows.push('');
  rows.push('The six component columns sum to the eighth exactly (the rebuild is asserted bit-identical to the shipped `cardinal.jd` before this table is written). Every term is zero at 2000 by construction — the self-correction δ_X(2000) pins the anchor.');
  return rows.join('\n');
}

function blockCardinalEvents() {
  const rows = [
    '| year | VE | SS | AE | WS | SS→SS interval (d) | `yearLengthDays(SS)` derivative form (d) | mean of four (d) | one-family mean tropical year (s) | e |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const y of [-10000, -2584, -584, 0, 1246, 2000, 5000, 10000]) {
    const jd = CP_TYPES.map((t) => m.cardinal.jd(y, t));
    rows.push(`| ${y} | ${jd.map((v) => jdToDateString(v)).join(' | ')} | ${f(m.cardinal.jd(y + 1, 'SS') - m.cardinal.jd(y, 'SS'), 6)} | ${f(m.cardinal.yearLengthDays(y, 'SS'), 6)} | ${f(m.lengths.tropicalYearDays(y), 6)} | ${f(m.cardinalStructure.spreadSeconds(y).meanSeconds, 2)} | ${f(m.earth.eccentricity(y), 5)} |`);
  }
  rows.push('');
  rows.push('Dates are TT on the proleptic Gregorian calendar, from the JD the device returns; the `year` argument is the calendar year of the event.');
  return rows.join('\n');
}

function blockCardinalSpread() {
  const R = cardinalRebuilds();
  const rows = [
    '| year | frozen device: T_X − mean (s) VE · SS · AE · WS | one-source structure: T_X − mean (s) VE · SS · AE · WS | structure anomalistic year (s) | RA of VE (°), frozen device | e |',
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
  rows.push(`RA formula constants: raMean = base − earthRAAngle/sin ε̄ = base − ${f((2 * A - A * A / K.earth.earthtiltMean) / sinE, 6)}°, amplitude A/sin ε̄ = ${f(A / sinE, 6)}° on −sin(2π·3·c) + sin(2π·8·c) (base 0/90/180/270° for VE/SS/AE/WS). Balanced year used by both devices: ${f(R.balancedYear, 5)}.`);
  return rows.join('\n');
}

const BLOCKS_CHAIN5 = {
  'calcmap-cardinal-anchors': blockCardinalAnchors,
  'calcmap-cardinal-decomposition': blockCardinalDecomposition,
  'calcmap-cardinal-events': blockCardinalEvents,
  'calcmap-cardinal-spread': blockCardinalSpread,
};

const BLOCKS = {
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
