#!/usr/bin/env node
/**
 * REGIME-AWARE RECESSION FITTER — the governed instrument (plan 12, step 3)
 * ========================================================================
 *
 *   node tools/fit/fit-regime-recession.js            fit, print the candidate and the referee table
 *   node tools/fit/fit-regime-recession.js --write    also write the candidate (NOT the banked block)
 *                                                       → data/.cache/regime-recession-candidate.json
 *
 * Supersedes tools/explore/fit-regime-recession.js (the 2026-08-14 instrument,
 * frozen as the record) under plan 12 §6 items 6–9:
 *
 *   6. The thermal-tide pump window is CLAMPED to the regime: it opens at
 *      jointMa (the quartic below is the Wells/Wu-gated era and must stay
 *      bit-identical — the frozen fitter's free solution opened it at 778 Ma).
 *   7. The 3.9-Ga knot is DROPPED: no anchor sits between Moodies (3200 Ma)
 *      and the Roche endpoint, so the frozen fitter's 275,120 vs 288,738 km
 *      there was the optimizer's path, not the data. The Hermite runs
 *      Moodies → Roche.
 *   8. The pump WINDOW IS FIXED to the literature's lock era — Mitchell &
 *      Kirscher 2023's ~19 h stall held across 2.0–1.0 Ga (docs/99) — so the
 *      window is [jointMa, 2000 Ma] and only the FACTOR is fitted; the frozen
 *      fitter's factor × window degeneracy (0.454 × 307 Myr ≡ 0.144 × 885 Myr,
 *      every anchor ≤ 1.2σ in both) is thereby removed, not hidden.
 *   9. LOD and precession are evaluated through THE MODEL'S OWN FACTORIES
 *      (recession-history → solar-channel budget → deep-time LOD), never a
 *      copied budget loop: the fitter fits exactly what the model publishes
 *      and what the paleo-anchors gate reads.
 *
 * Fitted parameters (5): knots at 1400 / 1900 / 2450 / 3200 Ma, the pump
 * factor. Genesis is PINNED at the banked 4498 Ma (the frozen fitter's own
 * profile: data-only χ² flat over 4420–4520 Ma — the data do not constrain
 * it; plan 12 §6 item 2 keeps the pin). The genesis profile is still printed.
 *
 * Anchors: the 11 of the 2026-08-14 set, cross-checked at start against
 * data/paleo-validation-anchors.json (observed values must agree — one home
 * for the numbers; the 1σ widths are quoted here because the gate file
 * carries tolerances, not σ). Plan 12 step 2 (the literature re-read) edits
 * BOTH places. The two Precambrian precession rows are printed as referees,
 * not fitted.
 *
 * Optimizer: seeded multi-start (LCG 20260814, as the frozen fitter) +
 * cyclic per-parameter line refinement. Deterministic: two runs are
 * byte-identical.
 *
 * Output: the candidate in the banked schema of data/deep-time-fitted.json
 * → recessionRegime, the per-anchor table in the model's own LOD, the
 * profiles, and the gated-era identity check. Nothing in the repo is
 * written; adoption is plan 12 step 5, a conscious edit of the banked block
 * with provenance.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TOOLS_LIB = path.join(ROOT, 'tools', 'lib');
const WRITE = process.argv.includes('--write');

// Runtime-assembled requires (the layer0 bridge pattern of dt-corrections-fit):
// the pre-migration Node engine supplies the epoch parameters and the GIA α(t).
/** @type {any} */
const DT = require(path.join(TOOLS_LIB, 'deep-time.js'));
/** @type {any} */
const RH = require(path.join(ROOT, 'packages', 'physics', 'src', 'deltat', 'recession-history.cjs'));
/** @type {any} */
const DL = require(path.join(ROOT, 'packages', 'physics', 'src', 'deltat', 'deep-time.cjs'));
/** @type {any} */
const { DEEP_MODES_ARTIFACT } = require(path.join(ROOT, 'packages', 'physics', 'src', 'moon', 'deep-modes-artifact.cjs'));
// |s₃|, the dominant nodal mode of Earth's orbit — the recipe of model.js (one home there; mirrored
// because the factory asks for the nodal period lazily and this fitter must not read scene state).
const S3_ARCSEC_PER_YR = (() => {
  const z = DEEP_MODES_ARTIFACT.earthZeta
    .filter((/** @type {any} */ md) => Math.abs(md.omegaRadPerYr) > 1e-9)
    .sort((/** @type {any} */ a, /** @type {any} */ b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
  return Math.abs((z.omegaRadPerYr * 180) / Math.PI) * 3600;
})();

const P = DT.EPOCH_PARAMS;
const BANKED = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'deep-time-fitted.json'), 'utf8')).recessionRegime;
const RE_KM = P.earthRadiusM / 1000;

const T_JOINT = BANKED.jointMa;                 // 1000 Ma — the regime boundary
const GENESIS_MA = BANKED.genesisMa;            // 4498 — pinned (§6 item 2)
const ROCHE_KM = BANKED.rocheLimitKm;           // 9439.643
const BETA0 = BANKED.solarOceanLeakBeta0;       // 0.2
const KNOT_T = [1400, 1900, 2450, 3200];        // item 7: the 3.9-Ga knot is dropped
const PUMP_START = T_JOINT;                     // item 6: clamped to the regime
const PUMP_END = 2000;                          // item 8: the lock era's onset (Mitchell–Kirscher 2023)

// ── Anchors (1σ as the sources quote them) — cross-checked against the gate file ──
const LOD_ANCHORS = [
  ['farhat-joffre-2460', 'joffre', 2460, 16.98, 0.50], ['farhat-weeliwolli-2450', 'weeli-wolli', 2450, 17.95, 1.32],
  ['zhou-chuanlinggou-lod-1634', 'chuanlinggou', 1634, 17.82, 0.15], ['zhou-wumishan-lod-1480', 'wumishan', 1480, 18.12, 0.19],
  ['xiamaling-lod-1400', 'xiamaling', 1400, 18.68, 0.25], ['zhou-yemahe-lod-1215', 'yemahe', 1215, 18.86, 0.17],
  ['nanfen-lod-1100', 'nanfen', 1100, 18.94, 0.39],
];
const A_ANCHORS = [   // distance in km; the gate file states R⊕
  ['zhou-chuanlinggou-a-1634', 'chuanlinggou', 1634, 51.784 * RE_KM, 1640], ['zhou-wumishan-a-1480', 'wumishan', 1480, 52.297 * RE_KM, 2100],
  ['zhou-yemahe-a-1215', 'yemahe', 1215, 53.522 * RE_KM, 1700], ['farhat-moodies-3200', 'moodies', 3200, 46.45 * RE_KM, 1.50 * RE_KM],
];
const PREC_REFEREES = [   // printed, not fitted (falsification leg 1)
  ['xiamaling-prec-1400', 1400, 85.79, 3.2], ['lantink-prec-2460', 2460, 108.6, 7.8],
];
{
  const gate = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'paleo-validation-anchors.json'), 'utf8')).anchors;
  const byId = new Map(gate.map((/** @type {any} */ a) => [a.id, a]));
  const bad = [];
  for (const [id, , t, v] of LOD_ANCHORS) { const g = byId.get(id); if (!g || g.ageMa !== t || g.observed !== v) bad.push(id); }
  for (const [id, , t, vKm] of A_ANCHORS) { const g = byId.get(id); if (!g || g.ageMa !== t || Math.abs(g.observed * RE_KM - vKm) > 1e-6) bad.push(id); }
  for (const [id, t, v] of PREC_REFEREES) { const g = byId.get(id); if (!g || g.ageMa !== t || g.observed !== v) bad.push(id); }
  if (bad.length) { console.error(`REFUSING: anchor values disagree with data/paleo-validation-anchors.json: ${bad.join(', ')}`); process.exit(2); }
}

// ── The model's own evaluators for a candidate ────────────────────────────────
const A_JOINT_KM = DT.meanMoonDistanceAtAge(T_JOINT);

/** @param {{ knots: number[], pumpFactor: number }} p */
function buildModel(p) {
  const regime = { jointMa: T_JOINT, knotAgesMa: KNOT_T, knotDistancesKm: p.knots, genesisMa: GENESIS_MA, rocheLimitKm: ROCHE_KM };
  const rec = RH.createMoonRecessionHistory({
    aMoonNowMetres: P.moonDistanceNowM, alpha1PerMa: P.alpha1PerMa, alpha3PerMa3: P.alpha3PerMa3, alpha4PerMa4: P.alpha4PerMa4, regime,
  });
  const budget = RH.createSolarChannelBudget({
    lTotalJ2000KgM2S: P.totalAngularMomentumKgM2S, mMoonAloneKg: P.moonMassKg, gmEmM3PerS2: P.gmEarthMoonM3S2,
    eFactorMoon: P.moonEccentricityFactor, beta0: BETA0, pumpStartMa: PUMP_START, pumpEndMa: PUMP_END, pumpFactor: p.pumpFactor,
    jointMa: T_JOINT, genesisMa: GENESIS_MA, distanceMetresAtAge: rec.distanceMetresAtAge,
  });
  const lod = DL.createDeepTimeLod({
    constants: {
      lTotalEmKgm2S: P.totalAngularMomentumKgM2S, mMoonAloneKg: P.moonMassKg, mEarthAloneKg: P.earthMassKg,
      rEarthMetres: P.earthRadiusM, gmEmM3PerS2: P.gmEarthMoonM3S2, eFactorMoon: P.moonEccentricityFactor,
      aLockMetres: P.moonLockDistanceM, aMoonNowMetres: P.moonDistanceNowM,
      alpha1PerMa: P.alpha1PerMa, alpha3PerMa3: P.alpha3PerMa3, alpha4PerMa4: P.alpha4PerMa4,
      lodNowH13Seconds: P.lodNowH13Seconds, meanSiderealYearJ2000Seconds: DT.MEAN_SIDEREAL_YEAR_J2000_S,
      solarMassLossFracPerYear: P.solarMassLossFracPerYear, precessionSolarShareJ2000: P.precessionSolarShareJ2000,
    },
    moonDistanceMetresAtAge: rec.distanceMetresAtAge,
    moiFactorAtAge: DT.earthMoiFactorAtAge,
    precessionPeriodJ2000YearsFn: DT.certifiedAxialPrecessionJ2000Years,
    nodalPeriodYearsFn: () => 1296000 / S3_ARCSEC_PER_YR,
    cycleLodSumAt: () => 0, swingLodAt: () => 0, swingLodRateAt: () => 0,   // not read by LOD or the precession rate
    lEmAtAgeKgm2S: budget.lEmAtAgeKgm2S,
  });
  return {
    aKm: (/** @type {number} */ t) => rec.distanceMetresAtAge(t) / 1000,
    lodHr: (/** @type {number} */ t) => { const s = lod.lodSecondsAtAge(t); return s === null ? NaN : s / 3600; },
    precArcsecPerYr: (/** @type {number} */ t) => lod.lunisolarPrecessionRateArcsecPerYrAtAge(t),
    lEm: budget.lEmAtAgeKgm2S,
  };
}

/** @param {{ knots: number[], pumpFactor: number }} p */
function chi2Of(p) {
  if (p.pumpFactor < 0 || p.pumpFactor > 1.2) return 1e9;
  for (let i = 0; i < p.knots.length; i++) {
    const prev = i === 0 ? A_JOINT_KM : p.knots[i - 1];
    if (p.knots[i] >= prev || p.knots[i] <= ROCHE_KM) return 1e9;   // monotone into the past
  }
  const m = buildModel(p);
  let chi = 0;
  for (const [, , t, v, s] of LOD_ANCHORS) { const x = m.lodHr(t); if (!Number.isFinite(x)) return 1e9; chi += ((x - v) / s) ** 2; }
  for (const [, , t, v, s] of A_ANCHORS) chi += ((m.aKm(t) - v) / s) ** 2;
  const genLod = m.lodHr(GENESIS_MA - 5);
  if (!Number.isFinite(genLod) || genLod < 2.5) return 1e9;        // breakup floor
  return chi;
}

// ── Optimizer: seeded multi-start + cyclic line refinement ───────────────────
const rand = (() => { let s = 20260814; return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31; })();
const randomStart = () => ({
  knots: [336000 + rand() * 8000, 325000 + rand() * 12000, 310000 + rand() * 15000, 290000 + rand() * 14000],
  pumpFactor: rand(),
});
/** @param {{ knots: number[], pumpFactor: number }} p0 @param {(q: any) => number} chiFn */
function refine(p0, chiFn, passes = 8) {
  const p = { knots: [...p0.knots], pumpFactor: p0.pumpFactor };
  let chi = chiFn(p);
  if (chi >= 1e9) return { p, chi };
  for (let pass = 0; pass < passes; pass++) {
    for (const f of ['pumpFactor', 'knot0', 'knot1', 'knot2', 'knot3']) {
      const scale = f === 'pumpFactor' ? 0.08 : 2500;
      for (const dir of [-1, 1]) {
        for (let step = scale; step > scale / 8; step /= 2) {
          const q = { knots: [...p.knots], pumpFactor: p.pumpFactor };
          if (f.startsWith('knot')) q.knots[Number(f[4])] += dir * step; else q.pumpFactor += dir * step;
          const c = chiFn(q);
          if (c < chi) { chi = c; p.knots = q.knots; p.pumpFactor = q.pumpFactor; }
        }
      }
    }
  }
  return { p, chi };
}

let best = null;
for (let s = 0; s < 300; s++) {
  const r = refine(randomStart(), chi2Of);
  if (r.chi < 1e9 && (!best || r.chi < best.chi)) best = r;
}
if (!best) { console.error('no feasible fit'); process.exit(1); }

const m = buildModel(best.p);
const nAnch = LOD_ANCHORS.length + A_ANCHORS.length, nPar = KNOT_T.length + 1;
const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const candidate = {
  jointMa: T_JOINT, knotAgesMa: KNOT_T, knotDistancesKm: best.p.knots.map(round3),
  genesisMa: GENESIS_MA, rocheLimitKm: ROCHE_KM, solarOceanLeakBeta0: BETA0,
  thermalPumpStartMa: PUMP_START, thermalPumpEndMa: PUMP_END, thermalPumpFactor: round3(best.p.pumpFactor),
};

console.log('REGIME-AWARE RECESSION FIT — the governed instrument (plan 12): candidate, never the banked block');
console.log(`  χ² ${best.chi.toFixed(2)} over ${nAnch} anchors, ${nPar} params (χ²/dof ≈ ${(best.chi / Math.max(nAnch - nPar, 1)).toFixed(2)})`);
console.log(`  knots (km @ ${KNOT_T.join('/')} Ma): ${candidate.knotDistancesKm.map((v) => Math.round(v).toLocaleString('en-US')).join(' · ')}`);
console.log(`  genesis ${GENESIS_MA} Ma (pinned) · pump window [${PUMP_START}, ${PUMP_END}] Ma (fixed) · pump factor ${best.p.pumpFactor.toFixed(3)}`);
console.log('\n  LOD anchors (the model\'s own LOD):');
for (const [, id, t, v, s] of LOD_ANCHORS) { const x = m.lodHr(t); console.log(`    ${id.padEnd(13)} ${String(t).padStart(4)} Ma: ${x.toFixed(2)} h vs ${v} ± ${s} (${((x - v) / s).toFixed(1)}σ)`); }
console.log('  distance anchors:');
for (const [, id, t, v, s] of A_ANCHORS) { const x = m.aKm(t); console.log(`    ${id.padEnd(13)} ${String(t).padStart(4)} Ma: ${(x / RE_KM).toFixed(2)} R⊕ vs ${(v / RE_KM).toFixed(2)} ± ${(s / RE_KM).toFixed(2)} (${((x - v) / s).toFixed(1)}σ)`); }
console.log('  precession referees (falsification leg 1, not fitted):');
for (const [id, t, v, tolPct] of PREC_REFEREES) { const x = m.precArcsecPerYr(t); const pct = (x / v - 1) * 100; console.log(`    ${id.padEnd(20)} ${t} Ma: ${x.toFixed(2)} vs ${v} ″/yr (${pct >= 0 ? '+' : ''}${pct.toFixed(2)} % | tol ±${tolPct} %)${Math.abs(pct) <= tolPct ? '' : '  OUTSIDE'}`); }
console.log('\n  gated-era identity (must equal the shipped model):');
for (const t of [380, 650, 1000]) console.log(`    ${t} Ma: a ${m.aKm(t).toFixed(3)} km vs shipped ${DT.meanMoonDistanceAtAge(t).toFixed(3)} · LOD ${m.lodHr(t).toFixed(6)} h vs ${(DT.meanLodSecondsAtAge(t) / 3600).toFixed(6)}`);
console.log(`  genesis state: LOD ${m.lodHr(GENESIS_MA - 5).toFixed(2)} h · L_EM/L_today ${(m.lEm(GENESIS_MA - 5) / P.totalAngularMomentumKgM2S).toFixed(3)}`);
console.log('  L_EM at the Zhou epochs vs the data reconstruction (−0.2 % flat):');
for (const t of [1634, 1480, 1215]) console.log(`    ${t} Ma: ${((m.lEm(t) / P.totalAngularMomentumKgM2S - 1) * 100).toFixed(2)} %`);

// ── Profiles (Δχ² landscapes — the stable-but-wrong check) ───────────────────
console.log('\nPROFILE — pump factor (χ² at a fixed factor, knots refitted):');
for (const f of [0, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6]) {
  let bchi = Infinity;
  for (let s = 0; s < 60; s++) {
    const p0 = randomStart(); p0.pumpFactor = f;
    const r = refine(p0, (/** @type {any} */ q) => (q.pumpFactor === f ? chi2Of(q) : 1e9), 6);
    if (r.chi < bchi) bchi = r.chi;
  }
  console.log(`  f_p ${f.toFixed(2)}: χ² ${bchi.toFixed(2)}`);
}
console.log('PROFILE — pump window end (χ² with the window end moved, factor and knots refitted):');
for (const end of [1500, 1750, 2000, 2250, 2500]) {
  let bchi = Infinity;
  const chiEnd = (/** @type {any} */ q) => {
    if (q.pumpFactor < 0 || q.pumpFactor > 1.2) return 1e9;
    for (let i = 0; i < q.knots.length; i++) { const prev = i === 0 ? A_JOINT_KM : q.knots[i - 1]; if (q.knots[i] >= prev || q.knots[i] <= ROCHE_KM) return 1e9; }
    const regime = { jointMa: T_JOINT, knotAgesMa: KNOT_T, knotDistancesKm: q.knots, genesisMa: GENESIS_MA, rocheLimitKm: ROCHE_KM };
    const rec = RH.createMoonRecessionHistory({ aMoonNowMetres: P.moonDistanceNowM, alpha1PerMa: P.alpha1PerMa, alpha3PerMa3: P.alpha3PerMa3, alpha4PerMa4: P.alpha4PerMa4, regime });
    const budget = RH.createSolarChannelBudget({ lTotalJ2000KgM2S: P.totalAngularMomentumKgM2S, mMoonAloneKg: P.moonMassKg, gmEmM3PerS2: P.gmEarthMoonM3S2, eFactorMoon: P.moonEccentricityFactor, beta0: BETA0, pumpStartMa: PUMP_START, pumpEndMa: end, pumpFactor: q.pumpFactor, jointMa: T_JOINT, genesisMa: GENESIS_MA, distanceMetresAtAge: rec.distanceMetresAtAge });
    const I = DT.earthMoiFactorAtAge(0) * P.earthMassKg * P.earthRadiusM * P.earthRadiusM;
    const lOrb = (/** @type {number} */ aM) => P.moonMassKg * Math.sqrt(P.gmEarthMoonM3S2 * aM) * P.moonEccentricityFactor;
    const lodHr = (/** @type {number} */ t) => 2 * Math.PI * I / (budget.lEmAtAgeKgm2S(t) - lOrb(rec.distanceMetresAtAge(t))) / 3600;
    let chi = 0;
    for (const [, , t, v, s] of LOD_ANCHORS) chi += ((lodHr(t) - v) / s) ** 2;
    for (const [, , t, v, s] of A_ANCHORS) chi += ((rec.distanceMetresAtAge(t) / 1000 - v) / s) ** 2;
    return chi;
  };
  for (let s = 0; s < 40; s++) { const r = refine(randomStart(), chiEnd, 5); if (r.chi < bchi) bchi = r.chi; }
  console.log(`  end ${end} Ma: χ² ${bchi.toFixed(2)}`);
}

console.log('\nCANDIDATE — the schema of data/deep-time-fitted.json → recessionRegime (compare; adoption is plan 12 step 5):');
console.log(JSON.stringify(candidate, null, 2));
console.log(`\nBANKED, for comparison: knots ${BANKED.knotDistancesKm.map((/** @type {number} */ v) => Math.round(v).toLocaleString('en-US')).join(' · ')} @ ${BANKED.knotAgesMa.join('/')} Ma · pump [${BANKED.thermalPumpStartMa}, ${BANKED.thermalPumpEndMa}] × ${BANKED.thermalPumpFactor}`);

if (WRITE) {
  const outDir = path.join(ROOT, 'data', '.cache');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'regime-recession-candidate.json');
  fs.writeFileSync(out, `${JSON.stringify({ _description: 'Plan 12 candidate from tools/fit/fit-regime-recession.js — NOT the banked block; adoption is a conscious edit of data/deep-time-fitted.json with provenance.', chi2: best.chi, candidate }, null, 2)}\n`);
  console.log(`\nwrote ${path.relative(ROOT, out)} (gitignored)`);
}
