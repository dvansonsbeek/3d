#!/usr/bin/env node
/**
 * REGIME-AWARE RECESSION FITTER — the promotion fit (Driver 1½ campaign)
 * =====================================================================
 *
 * The real fit behind the regime-aware history: replaces the hand-shaped
 * candidate of regime-aware-recession-study.js with a proper constrained
 * optimization against the full anchor set assembled 2026-08-14.
 *
 * DESIGN
 *   a(t):  t ≤ 1000 Ma — the SHIPPED quartic, bit-identical (Wells/Wu-gated
 *          era; value+slope continuity at the 1000 Ma joint is enforced by
 *          construction).
 *          t > 1000 Ma — monotone cubic Hermite (Fritsch-Carlson slopes)
 *          through fitted knots at 1400/1900/2450/3200/3900 Ma, ending at
 *          the rigid Roche limit at a FITTED genesis age (prior 4470 ± 50
 *          Ma, Patterson/lunar-geochemistry consistent).
 *   LOD:   from the angular-momentum budget with two solar channels,
 *          explicit only >1000 Ma (the shipped era keeps its calibrated
 *          effective closed budget):
 *            leak  = β₀ (a/a₀)⁶ · τ_moon   (ocean solar tide, β₀ = 0.2)
 *            pump  = f_p · (τ_moon + leak) inside a FITTED window
 *                    [t_start, t_end] (thermal tide; f_p = 0 ⇒ the
 *                    pure-ocean staircase of Farhat/Zhou, f_p > 0 ⇒ the
 *                    Mitchell-Kirscher lock — the data decide).
 *   Data:  7 LOD anchors (Joffre, Weeli Wolli, Zhou ×3, Xiamaling, Nanfen)
 *          + 4 distance anchors (Zhou ×3, Moodies). Fitting BOTH members
 *          of Zhou's pairs automatically respects the L_EM(t) flatness
 *          reconstruction (the −0.2% result).
 *   Fit:   random multi-start + cyclic per-parameter line refinement.
 *
 * Output: the best parameter vector (the SHIPPED-set candidate for
 * model-parameters.json → deepTime.recessionRegimes), the per-anchor
 * residual table, and the genesis-state consequences. Nothing is written.
 *
 * Run: node tools/explore/fit-regime-recession.js
 */

'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const dt = require(path.join(ROOT, 'tools', 'lib', 'deep-time.js'));
const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));

const RE_KM = 6378.137;
const P = dt.EPOCH_PARAMS;
const A_ROCHE_KM = 1.48 * RE_KM;
const T_JOINT = 1000;                      // Ma — regime boundary (shipped below)
const KNOT_T = [1400, 1900, 2450, 3200, 3900];   // fitted-knot ages (Ma)

const aShipped = (t) => dt.meanMoonDistanceAtAge(t);
const A_JOINT = aShipped(T_JOINT);
const SLOPE_JOINT = (aShipped(T_JOINT + 1) - aShipped(T_JOINT - 1)) / 2;

// ── Monotone cubic Hermite (Fritsch-Carlson) through the knot chain ────────
const buildSpline = (ts, vs, m0) => {
  const n = ts.length;
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  m[0] = m0 !== undefined ? m0 : d[0];
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
  m[n - 1] = d[n - 2];
  for (let i = 0; i < n - 1; i++) {           // monotonicity limiter
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return (t) => {
    let i = 0;
    while (i < n - 2 && t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], s = (t - ts[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vs[i] + (s3 - 2 * s2 + s) * h * m[i]
      + (-2 * s3 + 3 * s2) * vs[i + 1] + (s3 - s2) * h * m[i + 1];
  };
};

// ── Budget machinery (mirrors the study; channels explicit only >1000 Ma) ──
const I_EARTH = (P.earthMoiFactorJ2000 ?? 0.3306947) * P.earthMassKg * P.earthRadiusM * P.earthRadiusM;
const lOrb = (aKm) => P.moonMassKg * Math.sqrt(P.gmEarthMoonM3S2 * aKm * 1000) * P.moonEccentricityFactor;
const L0 = P.totalAngularMomentumKgM2S;
const BETA0 = 0.2;

/** params: { knots: number[5] (km), genesisMa, pumpStart, pumpEnd, pumpFactor } */
const buildModel = (p) => {
  const ts = [T_JOINT, ...KNOT_T, p.genesisMa];
  const vs = [A_JOINT, ...p.knots, A_ROCHE_KM];
  const spline = buildSpline(ts, vs, SLOPE_JOINT);
  const aKm = (t) => (t <= T_JOINT ? aShipped(t) : spline(Math.min(t, p.genesisMa)));
  const STEP = 5;
  const Ls = [];
  let L = L0;
  const a0 = aKm(0);
  for (let t = 0; t <= p.genesisMa; t += STEP) {
    Ls.push(L);
    const dLorb = lOrb(aKm(t)) - lOrb(aKm(t + STEP));
    const mid = t + STEP / 2;
    const leakDt = mid > T_JOINT ? BETA0 * Math.pow(aKm(t) / a0, 6) * dLorb : 0;
    const pumpDt = (mid > p.pumpStart && mid < p.pumpEnd) ? p.pumpFactor * (dLorb + leakDt) : 0;
    L = L - (pumpDt - leakDt);
  }
  const LFn = (t) => {
    const i = Math.max(0, Math.min(Math.floor(t / STEP), Ls.length - 2));
    const f = Math.max(0, Math.min((t - i * STEP) / STEP, 1));
    return Ls[i] * (1 - f) + Ls[i + 1] * f;
  };
  const lodHr = (t) => {
    const spin = LFn(t) - lOrb(aKm(t));
    return 2 * Math.PI / (spin / I_EARTH) / 3600;
  };
  return { aKm, lodHr, LFn };
};

// ── Anchors (values quoted from the cited sources; see the study header) ───
const LOD_ANCHORS = [
  ['joffre', 2460, 16.98, 0.50], ['weeli-wolli', 2450, 17.95, 1.32],
  ['chuanlinggou', 1634, 17.82, 0.15], ['wumishan', 1480, 18.12, 0.19],
  ['xiamaling', 1400, 18.68, 0.25], ['yemahe', 1215, 18.86, 0.17],
  ['nanfen', 1100, 18.94, 0.39],
];
const A_ANCHORS = [
  ['chuanlinggou', 1634, 330290, 1640], ['wumishan', 1480, 333560, 2100],
  ['yemahe', 1215, 341370, 1700], ['moodies', 3200, 46.45 * RE_KM, 1.50 * RE_KM],
];

const chi2Of = (p) => {
  // hard sanity
  if (p.genesisMa < 4400 || p.genesisMa > 4520) return 1e9;
  if (p.pumpEnd - p.pumpStart < 0) return 1e9;
  if (p.pumpFactor < 0 || p.pumpFactor > 1.2) return 1e9;
  for (let i = 0; i < p.knots.length; i++) {
    const prev = i === 0 ? A_JOINT : p.knots[i - 1];
    if (p.knots[i] >= prev || p.knots[i] <= A_ROCHE_KM) return 1e9;   // monotone into the past
  }
  const m = buildModel(p);
  let chi = 0;
  for (const [, t, v, s] of LOD_ANCHORS) chi += ((m.lodHr(t) - v) / s) ** 2;
  for (const [, t, v, s] of A_ANCHORS) chi += ((m.aKm(t) - v) / s) ** 2;
  chi += ((p.genesisMa - 4470) / 50) ** 2;                       // Patterson prior
  const genLod = m.lodHr(p.genesisMa - 5);
  if (!Number.isFinite(genLod) || genLod < 2.5) return 1e9;      // breakup floor
  return chi;
};

// ── Optimizer: random multi-start + cyclic line refinement ─────────────────
const rand = (() => { let s = 20260814; return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31; })();
const randomStart = () => ({
  knots: [
    336000 + rand() * 8000,   // 1400 Ma  (data ~333.5e3)
    325000 + rand() * 12000,  // 1900 Ma
    310000 + rand() * 15000,  // 2450 Ma
    290000 + rand() * 14000,  // 3200 Ma  (data ~296.3e3)
    240000 + rand() * 40000,  // 3900 Ma
  ],
  genesisMa: 4440 + rand() * 60,
  pumpStart: 1000 + rand() * 800,
  pumpEnd: 1800 + rand() * 800,
  pumpFactor: rand(),
});

let best = null;
for (let s = 0; s < 300; s++) {
  const p = randomStart();
  let chi = chi2Of(p);
  if (chi >= 1e9) continue;
  // cyclic refinement
  for (let pass = 0; pass < 8; pass++) {
    const fields = ['genesisMa', 'pumpStart', 'pumpEnd', 'pumpFactor'];
    for (let k = 0; k < 5; k++) fields.push(`knot${k}`);
    for (const f of fields) {
      const scale = f === 'pumpFactor' ? 0.08 : f.startsWith('knot') ? 2500 : 40;
      for (const dir of [-1, 1]) {
        for (let step = scale; step > scale / 8; step /= 2) {
          const q = { ...p, knots: [...p.knots] };
          if (f.startsWith('knot')) q.knots[Number(f[4])] += dir * step;
          else q[f] += dir * step;
          const c = chi2Of(q);
          if (c < chi) { chi = c; Object.assign(p, q, { knots: q.knots }); }
        }
      }
    }
  }
  if (!best || chi < best.chi) best = { chi, p: JSON.parse(JSON.stringify(p)) };
}

if (!best) { console.error('no feasible fit'); process.exit(1); }
const m = buildModel(best.p);
const dof = LOD_ANCHORS.length + A_ANCHORS.length - 9;
console.log('REGIME-AWARE RECESSION FIT — shipped-set candidate');
console.log(`  χ² ${best.chi.toFixed(2)} over ${LOD_ANCHORS.length + A_ANCHORS.length} anchors, 9 params (χ²/dof ≈ ${(best.chi / Math.max(dof, 1)).toFixed(2)})`);
console.log(`  knots (km @ ${KNOT_T.join('/')} Ma): ${best.p.knots.map((v) => Math.round(v).toLocaleString('en-US')).join(' · ')}`);
console.log(`  genesis ${best.p.genesisMa.toFixed(0)} Ma · pump window [${best.p.pumpStart.toFixed(0)}, ${best.p.pumpEnd.toFixed(0)}] Ma · pump factor ${best.p.pumpFactor.toFixed(2)}`);
console.log('');
console.log('  LOD anchors:');
for (const [id, t, v, s] of LOD_ANCHORS) {
  const mv = m.lodHr(t);
  console.log(`    ${id.padEnd(13)} ${String(t).padStart(4)} Ma: ${mv.toFixed(2)} h vs ${v} ± ${s} (${((mv - v) / s).toFixed(1)}σ)`);
}
console.log('  distance anchors:');
for (const [id, t, v, s] of A_ANCHORS) {
  const mv = m.aKm(t);
  console.log(`    ${id.padEnd(13)} ${String(t).padStart(4)} Ma: ${(mv / RE_KM).toFixed(2)} R⊕ vs ${(v / RE_KM).toFixed(2)} ± ${(s / RE_KM).toFixed(2)} (${((mv - v) / s).toFixed(1)}σ)`);
}
console.log('');
const yearS = (t) => dt.meanSiderealYearSecondsAtAge(t);
const daysPerYr0 = yearS(0) / dt.meanLodSecondsAtAge(0);
const dpy = (t) => yearS(t) / (m.lodHr(t) * 3600);
const H = (t) => C.H * daysPerYr0 / dpy(t);
console.log('  gated-era check (must be bit-identical to shipped):');
console.log(`    Wells 380 Ma: ${dpy(380).toFixed(2)} d/yr (shipped 399.97) | Wu 650 Ma LOD: ${m.lodHr(650).toFixed(2)} h (shipped ${(dt.meanLodSecondsAtAge(650) / 3600).toFixed(2)})`);
console.log('  genesis state:');
console.log(`    LOD ${m.lodHr(best.p.genesisMa - 5).toFixed(2)} h | H ${Math.round(H(best.p.genesisMa - 5)).toLocaleString('en-US')} yr | L_EM/L_today ${(m.LFn(best.p.genesisMa - 5) / L0).toFixed(3)}`);
console.log('  L_EM trajectory (model) at the Zhou epochs vs the data reconstruction (−0.2% flat):');
for (const t of [1634, 1480, 1215]) console.log(`    ${t} Ma: ${((m.LFn(t) / L0 - 1) * 100).toFixed(2)}%`);
console.log('');
console.log(`  PUMP VERDICT: fitted factor ${best.p.pumpFactor.toFixed(2)} over [${best.p.pumpStart.toFixed(0)}, ${best.p.pumpEnd.toFixed(0)}] Ma — ` + (best.p.pumpFactor < 0.15 ? 'the data choose the pure-ocean staircase (Farhat/Zhou).' : best.p.pumpFactor > 0.6 ? 'the data choose a strong thermal-tide lock (Mitchell-Kirscher).' : 'the data choose a partial thermal-tide contribution.'));

// ── Profile scans (Δχ² landscapes — the stable-but-wrong check) ────────────
const profile = (field, values) => {
  const rows = [];
  for (const v of values) {
    let bchi = Infinity;
    for (let s = 0; s < 60; s++) {
      const p = randomStart();
      if (field === 'genesisMa') p.genesisMa = v; else p.pumpFactor = v;
      let chi = chi2OfFixed(p, field, v);
      if (chi >= 1e9) continue;
      for (let pass = 0; pass < 6; pass++) {
        const fields = ['genesisMa', 'pumpStart', 'pumpEnd', 'pumpFactor'].filter((f) => f !== field);
        for (let k = 0; k < 5; k++) fields.push(`knot${k}`);
        for (const f of fields) {
          const scale = f === 'pumpFactor' ? 0.08 : f.startsWith('knot') ? 2500 : 40;
          for (const dir of [-1, 1]) {
            for (let step = scale; step > scale / 8; step /= 2) {
              const q = { ...p, knots: [...p.knots] };
              if (f.startsWith('knot')) q.knots[Number(f[4])] += dir * step;
              else q[f] += dir * step;
              const c = chi2OfFixed(q, field, v);
              if (c < chi) { chi = c; Object.assign(p, q, { knots: q.knots }); }
            }
          }
        }
      }
      if (chi < bchi) bchi = chi;
    }
    rows.push([v, bchi]);
  }
  return rows;
};
const chi2OfFixed = (p, field, v) => {
  if (field === 'genesisMa') p.genesisMa = v; else p.pumpFactor = v;
  // genesis profile: drop the Patterson prior so the DATA's own preference shows
  const keep = chi2Of(p);
  if (keep >= 1e9) return keep;
  return field === 'genesisMa' ? keep - ((p.genesisMa - 4470) / 50) ** 2 : keep;
};

console.log('');
console.log('PROFILE — pump factor (Δχ² vs best; ±1 ⇒ 1σ):');
for (const [v, chi] of profile('pumpFactor', [0, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75])) {
  console.log(`  f_p ${v.toFixed(2)}: χ² ${chi.toFixed(2)}`);
}
console.log('PROFILE — genesis age (prior removed; data-only preference):');
for (const [v, chi] of profile('genesisMa', [4420, 4450, 4475, 4498, 4520])) {
  console.log(`  ${v} Ma: χ² ${chi.toFixed(2)}`);
}

// ── The FINAL shipped-set candidate: genesis PINNED at the current 4498 Ma ──
// (the genesis profile is flat — the data do not constrain it — so we keep
// the shipped Roche-crossing epoch and avoid all downstream claim churn)
{
  let fbest = null;
  for (let s = 0; s < 300; s++) {
    const p = randomStart();
    p.genesisMa = 4498;
    let chi = chi2OfFixed(p, 'genesisMa', 4498);
    if (chi >= 1e9) continue;
    for (let pass = 0; pass < 8; pass++) {
      const fields = ['pumpStart', 'pumpEnd', 'pumpFactor'];
      for (let k = 0; k < 5; k++) fields.push(`knot${k}`);
      for (const f of fields) {
        const scale = f === 'pumpFactor' ? 0.08 : f.startsWith('knot') ? 2500 : 40;
        for (const dir of [-1, 1]) {
          for (let step = scale; step > scale / 8; step /= 2) {
            const q = { ...p, knots: [...p.knots] };
            if (f.startsWith('knot')) q.knots[Number(f[4])] += dir * step;
            else q[f] += dir * step;
            const c = chi2OfFixed(q, 'genesisMa', 4498);
            if (c < chi) { chi = c; Object.assign(p, q, { knots: q.knots }); }
          }
        }
      }
    }
    if (!fbest || chi < fbest.chi) fbest = { chi, p: JSON.parse(JSON.stringify(p)) };
  }
  const fm = buildModel(fbest.p);
  console.log('');
  console.log('FINAL SHIPPED-SET CANDIDATE (genesis pinned 4498 Ma):');
  console.log(JSON.stringify({
    _description: 'Regime-aware lunar recession (Driver 1½): shipped quartic ≤ jointMa; monotone cubic Hermite (Fritsch-Carlson) through the knots to the rigid Roche limit at genesisMa. Solar channels explicit only beyond jointMa: ocean leak beta0*(a/a0)^6 * tau_moon; thermal-tide pump factor*(tau_moon+leak) inside the window. Fit: tools/explore/fit-regime-recession.js, 11 anchors, chi2 ' + fbest.chi.toFixed(2),
    jointMa: T_JOINT,
    knotAgesMa: KNOT_T,
    knotDistancesKm: fbest.p.knots.map((v) => Math.round(v * 1000) / 1000),
    genesisMa: 4498,
    rocheLimitRE: 1.48,
    solarOceanLeakBeta0: BETA0,
    thermalPumpStartMa: Math.round(Math.max(fbest.p.pumpStart, T_JOINT)),
    thermalPumpEndMa: Math.round(fbest.p.pumpEnd),
    thermalPumpFactor: Math.round(fbest.p.pumpFactor * 1000) / 1000,
  }, null, 2));
  console.log('');
  console.log('  anchor residuals (σ): ' + LOD_ANCHORS.map(([id, t, v, s]) => `${id} ${((fm.lodHr(t) - v) / s).toFixed(1)}`).join(' · '));
  console.log('  distance (σ): ' + A_ANCHORS.map(([id, t, v, s]) => `${id} ${((fm.aKm(t) - v) / s).toFixed(1)}`).join(' · '));
  const gdpy = yearS(380) / (fm.lodHr(380) * 3600);
  console.log(`  gated: Wells ${gdpy.toFixed(2)} | genesis LOD ${fm.lodHr(4493).toFixed(2)} h · H ${Math.round(C.H * daysPerYr0 / (yearS(4493) / (fm.lodHr(4493) * 3600))).toLocaleString('en-US')} yr · L_EM/L0 ${(fm.LFn(4493) / L0).toFixed(3)}`);
}
