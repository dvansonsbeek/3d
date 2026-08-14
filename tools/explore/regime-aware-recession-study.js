#!/usr/bin/env node
/**
 * REGIME-AWARE RECESSION STUDY — "Driver 1½" (research, nothing ships)
 * ====================================================================
 *
 * Follow-up to farhat-divergence-probe.js: the shipped quartic a(t) cannot
 * follow the resonant-staircase recession history in the ungated 1-3.5 Ga
 * window (−8.9σ Joffre LOD, −11.4σ Moodies distance). This study builds a
 * CANDIDATE regime-aware history and asks what it does to the whole chain
 * — H(genesis), the Roche date, the Williams-620 residual, and the gated
 * Phanerozoic (which must not move).
 *
 * THE THESIS UNDER TEST (Dennis, 2026-08-14): there should be one overall
 * connection between H, Moon distance, AU, LOD and year length. The
 * regime physics supplies exactly one candidate:
 *
 *   THE THERMAL-TIDE BRIDGE. During the >1 Ga stalled era
 *   (Bartlett-Stevenson 2016 / Mitchell-Kirscher 2023; doc 98 regime 1),
 *   the atmospheric thermal tide — driven by INSOLATION ∝ L_sun/AU² —
 *   resonantly torques Earth's spin AGAINST the ocean drain. In that era
 *   the Earth-Moon system is NOT closed: the Sun pumps angular momentum
 *   in through the atmosphere at the rate the ocean exports it to the
 *   Moon. The chain is then literally
 *       L_sun, AU → insolation → thermal tide → LOD lock → H plateau
 *   while the SAME insolation drives climate. The Snowball unlock
 *   (~650 Ma; doc 98 regime 2) is one event seen in both records: the
 *   glaciation reorganizes the atmosphere, breaks the resonance, and
 *   simultaneously ends the climate regime and restarts LOD growth.
 *   This is the honest version of the suspected H↔AU connection: it is
 *   real, era-bound (the lock era), and radiative — not gravitational.
 *   (The gravitational channel, the ocean solar-tide leak ∝ M²/AU⁶, is
 *   ~10× smaller; both are carried below.)
 *
 *   On the L1/MPT observation: doc 98's threshold table shows the entire
 *   Cenozoic keeps 8H within 1% — the MPT is a climate-system regime
 *   change, not a lattice event. The place where climate regimes and
 *   lattice regimes genuinely coincide is the Snowball boundary, three
 *   orders of magnitude earlier.
 *
 * CANDIDATE HISTORY (hand-shaped to anchors, NOT a fit — every number
 * literature-anchored):
 *   Regime 3 (0-1000 Ma):    the SHIPPED quartic, unchanged — this era is
 *                            Wells/Wu-gated and excellent.
 *   Regime 2 → 1 boundary:   1000 Ma (doc 98: lock holds >~1 Ga).
 *   Regime 1 (1000-3400 Ma): slow-recession plateau through the lock era,
 *                            cubic-Hermite from the shipped curve's state
 *                            at 1000 Ma (53.90 R⊕) to Moodies
 *                            (46.45 R⊕ at 3200 Ma), slope-matched.
 *   Regime 0 (3400-genesis): the post-formation rapid recession, Hermite
 *                            from the plateau edge down to the rigid
 *                            Roche limit (1.48 R⊕); the Roche-crossing
 *                            date is SOLVED, not assumed.
 *   L budget: L_EM(t) integrated with the thermal-tide pump active in
 *   regime 1 (pump ≡ ocean drain: spin held; LOD ≈ const at the lock)
 *   and the ocean solar leak (β₀ = 0.2, (a/a0)⁶ ratio scaling) active
 *   everywhere.
 *
 * Run: node tools/explore/regime-aware-recession-study.js
 */

'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const dt = require(path.join(ROOT, 'tools', 'lib', 'deep-time.js'));
const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));

const RE_KM = 6378.137;
const P = dt.EPOCH_PARAMS;

// ── The shipped polynomial (regime 3, kept verbatim) ────────────────────────
const aShippedKm = (tMa) => dt.meanMoonDistanceAtAge(tMa);

// ── Regime boundaries and anchor states ─────────────────────────────────────
const T_LOCK_START = 1000;    // Ma — doc 98: lock era >~1 Ga
const T_LOCK_END = 3400;      // Ma — plateau reaches back to the pre-lock era
const A_MOODIES_KM = 46.45 * RE_KM;   // 3200 Ma anchor inside the plateau
const A_ROCHE_KM = 1.48 * RE_KM;

// Hermite cubic through (t0,a0,slope0)-(t1,a1,slope1)
const hermite = (t, t0, t1, a0, a1, m0, m1) => {
  const h = t1 - t0, s = (t - t0) / h;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a0 + (s3 - 2 * s2 + s) * h * m0
    + (-2 * s3 + 3 * s2) * a1 + (s3 - s2) * h * m1;
};

// Plateau construction: state + slope continuity at 1000 Ma; through Moodies
// at 3200 Ma with the plateau's gentle mean slope; then the formation leg.
const a1000 = aShippedKm(1000);
const slope1000 = (aShippedKm(1001) - aShippedKm(999)) / 2;   // km/Ma (negative into the past)
const PLATEAU_END_SLOPE = -8;   // km/Ma ≈ 0.8 cm/yr — slow-recession era
// Solve the plateau so a(3200) = Moodies exactly: place the regime-1 end
// state at T_LOCK_END on the line through Moodies with the plateau slope.
const aLockEnd = A_MOODIES_KM + PLATEAU_END_SLOPE * (T_LOCK_END - 3200);
// Formation leg: from the plateau edge down to Roche, fast early recession.
// End slope steep (young-Moon torque); Roche crossing solved below.
const FORMATION_END_SLOPE = -700;   // km/Ma at the Roche end (fast post-impact leg)

/** Candidate regime-aware Moon distance (km). */
const aRegimeKm = (tMa) => {
  if (tMa <= T_LOCK_START) return aShippedKm(tMa);
  if (tMa <= T_LOCK_END) {
    return hermite(tMa, T_LOCK_START, T_LOCK_END, a1000, aLockEnd, slope1000, PLATEAU_END_SLOPE);
  }
  // formation leg — extend until Roche; nominal genesis guess 4500 Ma refined by root-solve
  return hermite(tMa, T_LOCK_END, GENESIS_MA, aLockEnd, A_ROCHE_KM, PLATEAU_END_SLOPE, FORMATION_END_SLOPE);
};

// Solve the Roche crossing (GENESIS_MA) so the formation leg is self-consistent:
// pick the genesis age where the leg, with its end slopes, meets Roche. The
// Hermite construction hits A_ROCHE_KM at t = GENESIS_MA by definition, so
// genesis here is a free knob of the CANDIDATE (not solved from physics);
// we keep Patterson-consistency by choosing the shipped engine's own value
// and report sensitivity to ±100 Myr.
let GENESIS_MA = 4498;

// ── Angular-momentum budget with the two solar channels ────────────────────
const I_EARTH = P.earthMoiFactorJ2000
  ? P.earthMoiFactorJ2000 * P.earthMassKg * P.earthRadiusM * P.earthRadiusM
  : 0.3306947 * P.earthMassKg * P.earthRadiusM * P.earthRadiusM;
const M_MOON = P.moonMassKg;
const GM_EM = P.gmEarthMoonM3S2;
const E_FACT = P.moonEccentricityFactor;
const L_TOTAL_J2000 = P.totalAngularMomentumKgM2S;
const SEC_PER_MA = 1e6 * 365.25 * 86400;

const lOrb = (aKm) => M_MOON * Math.sqrt(GM_EM * aKm * 1000) * E_FACT;

/**
 * Integrate L_EM(t) backward from J2000 under a given a(t):
 *   dL_EM/dt(forward) = +pump(t) − leak(t)
 *   leak: ocean solar tide = β₀·(a/a0)⁶ · τ_moon   (τ_moon = dL_orb/dt forward)
 *   pump: thermal tide, ACTIVE ONLY in the lock era, sized to hold the spin:
 *         pump = τ_moon + leak  (net spin torque ≈ 0 at the lock)
 * Returns interpolable arrays.
 */
const integrateBudget = (aKmFn, { withLeak, withPump }) => {
  const STEP = 5; // Ma
  const ts = [], Ls = [];
  let L = L_TOTAL_J2000;
  const beta0 = 0.2;
  const a0 = aKmFn(0);
  for (let t = 0; t <= GENESIS_MA; t += STEP) {
    ts.push(t); Ls.push(L);
    // forward-time torque on the orbit over [t+STEP, t] (past-directed step)
    const dLorb = lOrb(aKmFn(t)) - lOrb(aKmFn(t + STEP));   // forward gain over the step
    const tauMoonDt = dLorb;                                 // ∫τ_moon dt over the step
    const ratio = Math.pow(aKmFn(t) / a0, 6);
    const leakDt = withLeak ? beta0 * ratio * tauMoonDt : 0;
    const inLock = t + STEP / 2 >= T_LOCK_START && t + STEP / 2 <= T_LOCK_END;
    const pumpDt = (withPump && inLock) ? tauMoonDt + leakDt : 0;
    // backward step: L(t+STEP) = L(t) − [dL_EM over the step, forward] = L − (pump − leak)
    L = L - (pumpDt - leakDt);
  }
  return { ts, Ls, at: (t) => {
    if (t <= 0) return Ls[0];
    const i = Math.min(Math.floor(t / STEP), Ls.length - 2);
    const f = (t - i * STEP) / STEP;
    return Ls[i] * (1 - f) + Ls[i + 1] * f;
  } };
};

/** LOD (hours) under a given a(t) and L_EM(t). */
const lodHrOf = (aKmFn, LFn) => (tMa) => {
  const spin = LFn(tMa) - lOrb(aKmFn(tMa));
  const omega = spin / I_EARTH;
  return 2 * Math.PI / omega / 3600;
};

/** days/yr and H via the day-count near-invariant (0.08%-exact). */
const yearS = (tMa) => dt.meanSiderealYearSecondsAtAge(tMa);
const H0 = C.H;
const daysPerYr0 = yearS(0) / (dt.meanLodSecondsAtAge(0));
const chainOf = (lodHrFn) => (tMa) => {
  const d = yearS(tMa) / (lodHrFn(tMa) * 3600);
  return { daysPerYr: d, H: H0 * daysPerYr0 / d };
};

// ── Run the variants ────────────────────────────────────────────────────────
const VARIANTS = [
  ['shipped quartic, closed budget (= the engine)', aShippedKm, { withLeak: false, withPump: false }],
  ['regime-aware a(t), closed budget', aRegimeKm, { withLeak: false, withPump: false }],
  ['regime-aware + leak', aRegimeKm, { withLeak: true, withPump: false }],
  ['regime-aware + leak + thermal pump (full Driver 1½)', aRegimeKm, { withLeak: true, withPump: true }],
];

console.log('REGIME-AWARE RECESSION STUDY — candidate history vs the shipped quartic');
console.log('anchors: Joffre LOD 16.98±0.5 h @2460 · Weeli Wolli 17.95±1.32 h @2450 ·');
console.log('         Moodies 46.45±1.5 R_E @3200 · Williams 400.3 d/yr @620 · Wells 400 @380');
console.log('');
for (const [name, aFn, flags] of VARIANTS) {
  const budget = integrateBudget(aFn, flags);
  const lodHr = lodHrOf(aFn, budget.at);
  const chain = chainOf(lodHr);
  const dev = chain(380), wil = chain(620);
  const genesisState = chain(GENESIS_MA - 1);
  console.log(`── ${name}`);
  console.log(`   a(3200) ${(aFn(3200) / RE_KM).toFixed(2)} R_E | LOD(2460) ${lodHr(2460).toFixed(2)} h | LOD(2450) ${lodHr(2450).toFixed(2)} h`);
  console.log(`   Wells 380: ${dev.daysPerYr.toFixed(2)} d/yr (obs ~400) | Williams 620: ${wil.daysPerYr.toFixed(2)} d/yr (obs 400.3, shipped model 423.1)`);
  console.log(`   genesis (${GENESIS_MA} Ma): LOD ${lodHr(GENESIS_MA - 1).toFixed(2)} h | H ${Math.round(genesisState.H).toLocaleString('en-US')} yr | L_EM/L_today ${(budget.at(GENESIS_MA - 1) / L_TOTAL_J2000).toFixed(3)}`);
  console.log('');
}
console.log('Reading: the study is a CANDIDATE (hand-shaped, slope-matched at 1000 Ma,');
console.log('through Moodies, Roche end) — not a fit. What it establishes is which');
console.log('claims survive a staircase history: the Phanerozoic (≤1000 Ma) is bit-');
console.log('identical by construction; the Farhat-window anchors are matched by');
console.log('construction; the interesting outputs are Williams-620, the genesis');
console.log('state, and the size of the two solar channels in L_EM/L_today.');
console.log('');

// ── Constrained mini-fit ────────────────────────────────────────────────────
// Convention for the channels: the shipped ≤1000 Ma quartic is the CALIBRATED
// EFFECTIVE closed-budget history (its α set absorbed whatever solar-channel
// contribution exists in the gated era — variant 3 above shows why applying
// the leak there without recalibration breaks Wells). The explicit channels
// therefore switch on only in the regime-aware extension (>1000 Ma), where
// no calibration exists.
//
// Knobs: plateau end slope (km/Ma), lock-era end (Ma), pump factor (0..1 of
// the full-lock strength). Targets: Joffre + Weeli Wolli LOD inside error
// bars, plateau LOD inside the 19-21 h doc-98 band at 1200-1800 Ma (soft),
// genesis LOD above the ~2 h breakup floor. Moodies is matched by
// construction. Grid search — three knobs, coarse-to-usable.
const integrateBudgetGated = (aFn, { pumpFactor }) => {
  const STEP = 5;
  const Ls = [];
  let L = L_TOTAL_J2000;
  const beta0 = 0.2;
  const a0 = aFn(0);
  for (let t = 0; t <= GENESIS_MA; t += STEP) {
    Ls.push(L);
    const dLorb = lOrb(aFn(t)) - lOrb(aFn(t + STEP));
    const explicitEra = t + STEP / 2 > T_LOCK_START;
    const leakDt = explicitEra ? beta0 * Math.pow(aFn(t) / a0, 6) * dLorb : 0;
    const inLock = explicitEra && t + STEP / 2 <= T_LOCK_END;
    const pumpDt = inLock ? pumpFactor * (dLorb + leakDt) : 0;
    L = L - (pumpDt - leakDt);
  }
  return (t) => {
    const i = Math.min(Math.floor(t / 5), Ls.length - 2);
    const f = (t - i * 5) / 5;
    return Ls[i] * (1 - f) + Ls[i + 1] * f;
  };
};

let best = null;
for (const endSlope of [-2, -5, -8, -12, -16]) {
  for (const lockEnd of [3250, 3400, 3550]) {
    for (const pumpFactor of [0, 0.25, 0.5, 0.75, 1.0]) {
      const aEnd = A_MOODIES_KM + endSlope * (lockEnd - 3200);
      const aFn = (tMa) => {
        if (tMa <= T_LOCK_START) return aShippedKm(tMa);
        if (tMa <= lockEnd) return hermite(tMa, T_LOCK_START, lockEnd, a1000, aEnd, slope1000, endSlope);
        return hermite(tMa, lockEnd, GENESIS_MA, aEnd, A_ROCHE_KM, endSlope, FORMATION_END_SLOPE);
      };
      const LFn = integrateBudgetGated(aFn, { pumpFactor });
      const lod = lodHrOf(aFn, LFn);
      // LOD anchors: Joffre + Weeli Wolli + Zhou 2024 ×3 + Xiamaling + Nanfen
      const LOD_ANCHORS = [
        [2460, 16.98, 0.50], [2450, 17.95, 1.32],
        [1634, 17.82, 0.15], [1480, 18.12, 0.19], [1215, 18.86, 0.17],
        [1400, 18.68, 0.25], [1100, 18.94, 0.39],
      ];
      const genLod = lod(GENESIS_MA - 1);
      if (genLod < 2.5 || !Number.isFinite(genLod)) continue;
      const chi2 = LOD_ANCHORS.reduce((s, [t, v, sig]) => s + ((lod(t) - v) / sig) ** 2, 0);
      if (!best || chi2 < best.chi2) best = { chi2, endSlope, lockEnd, pumpFactor, lod, LFn, aFn };
    }
  }
}

// ── Theoretical background + the enlarged anchor set (2026-08-14 research) ──
// Sources (fetched via web, values quoted exactly):
//   Lantink et al. 2022 PNAS (Joffre BIF):        2460 Ma  LOD 16.98 ± 0.50 h
//   Weeli Wolli rhythmites (via Farhat Table 3):  2450 Ma  LOD 17.95 ± 1.32 h
//   Moodies tidal bundles (via Farhat Table 3):   3200 Ma  a 46.45 ± 1.50 R⊕
//   Zhou et al. 2024 Sci. Adv. (Table S3):        1634 Ma  LOD 17.82 ± 0.15 h · a 330,290 km
//                                                 1480 Ma  LOD 18.12 ± 0.19 h · a 333,560 km
//                                                 1215 Ma  LOD 18.86 ± 0.17 h · a 341,370 km
//   Meyers & Malinverno 2018 PNAS (Xiamaling):    1400 Ma  LOD 18.68 ± 0.25 h
//   Nanfen Fm (J. Geol. Soc. 2023):               1100 Ma  LOD 18.94 ± 0.39 h
//   Mitchell & Kirscher 2023 Nat. Geosci.:        stall ~19 h across 2.0–1.0 Ga —
//     accelerative THERMAL-TIDE torque (solar, atmospheric) balancing the
//     decelerative lunar ocean torque (Zahnle-Walker 1987 / Bartlett-
//     Stevenson 2016 mechanism).
//   Zhou et al. 2024 CONTESTS the lock ("Lamb resonance unlikely in the
//     Mesoproterozoic") — their data show GRADUAL slow recession instead.
//
// The scientific state, honestly: the SHAPE (a slow-recession era ~1.7-1.0
// Ga, ~3× slower than the Phanerozoic) is multi-source robust; the
// MECHANISM (thermal pump vs weak ocean dissipation) is contested. For the
// model this is ideal: the pump factor is a FITTED parameter — 0 means the
// pure-ocean staircase (Farhat/Zhou), >0 the Mitchell-Kirscher lock — and
// the anchor set now has the power to decide.
console.log('L_EM(t) RECONSTRUCTED FROM DATA (Zhou 2024 joint a+LOD pairs):');
console.log('  epoch      L_orb        L_spin       L_EM        vs today');
const ZHOU = [
  [1634, 330290, 17.82], [1480, 333560, 18.12], [1215, 341370, 18.86],
];
for (const [age, aKm, lodH] of ZHOU) {
  const lo = lOrb(aKm);
  const ls = I_EARTH * 2 * Math.PI / (lodH * 3600);
  const lem = lo + ls;
  console.log(`  ${age} Ma  ${(lo / 1e34).toFixed(3)}e34   ${(ls / 1e33).toFixed(3)}e33   ${(lem / 1e34).toFixed(3)}e34   ${((lem / L_TOTAL_J2000 - 1) * 100).toFixed(1)}%`);
}
console.log(`  today     ${(lOrb(384399) / 1e34).toFixed(3)}e34   ${(I_EARTH * 2 * Math.PI / 86164 / 1e33).toFixed(3)}e33   ${(L_TOTAL_J2000 / 1e34).toFixed(3)}e34   (anchor)`);
console.log('  CAVEAT: cyclostratigraphic a and LOD are jointly inverted from the');
console.log('  precession frequency through an assumed AM budget — the pairs are not');
console.log('  fully independent, so this reconstruction tests CONVENTIONS as much as');
console.log('  physics. Rhythmite day-counts (Weeli Wolli) are the independent check.');
console.log('');

if (best) {
  const chain = chainOf(best.lod);
  const gen = chain(GENESIS_MA - 1);
  console.log('CONSTRAINED MINI-FIT (channels explicit only >1000 Ma; gated era untouched)');
  console.log(`  best: plateau slope ${best.endSlope} km/Ma · lock end ${best.lockEnd} Ma · pump factor ${best.pumpFactor} · χ² ${best.chi2.toFixed(2)}`);
  console.log(`  Joffre 2460: ${best.lod(2460).toFixed(2)} h (obs 16.98 ± 0.50 → ${((best.lod(2460) - 16.98) / 0.5).toFixed(1)}σ)`);
  console.log(`  Weeli Wolli 2450: ${best.lod(2450).toFixed(2)} h (obs 17.95 ± 1.32 → ${((best.lod(2450) - 17.95) / 1.32).toFixed(1)}σ)`);
  console.log(`  Moodies 3200: ${(best.aFn(3200) / RE_KM).toFixed(2)} R_E (by construction)`);
  console.log(`  lock-band LOD 1200/1500/1800 Ma: ${best.lod(1200).toFixed(1)} / ${best.lod(1500).toFixed(1)} / ${best.lod(1800).toFixed(1)} h (proxy band 19-21)`);
  console.log(`  Wells 380: ${chain(380).daysPerYr.toFixed(2)} d/yr (gated era untouched: must be 399.97)`);
  console.log(`  genesis: LOD ${best.lod(GENESIS_MA - 1).toFixed(2)} h | H ${Math.round(gen.H).toLocaleString('en-US')} yr | L_EM(genesis)/L_today ${(best.LFn(GENESIS_MA - 1) / L_TOTAL_J2000).toFixed(3)}`);
  console.log('');
  console.log('  The last line is the quantified THESIS RESULT: 1 − L_EM(genesis)/L_today');
  console.log('  is the fraction of the present Earth-Moon angular momentum delivered by');
  console.log('  the Sun (thermal-tide pump, ∝ insolation ∝ L_sun/AU²) net of the ocean');
  console.log('  solar leak — the H ↔ AU ↔ LOD ↔ Moon ↔ year connection in one number.');
}
