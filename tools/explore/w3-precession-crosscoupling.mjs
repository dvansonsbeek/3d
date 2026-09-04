#!/usr/bin/env node
// W3 — THE M⁴ CROSS-COUPLING FORWARD MODEL (plan 04 §4; two-expansions).
//
// Earth's axial-precession constant is a lunar + solar torque sum, and the
// two parts scale DIFFERENTLY under the two expansions:
//   ψ̇ = [ω/ω₀] · ( p_S·μ⁴ + p_L·(a_m0/a_m)³ )
//   · both terms carry ω (the hydrostatic J₂ ∝ ω² over the 1/ω of the rate),
//   · the lunar term carries the recession history a_m(t)⁻³ (Driver 1),
//   · the solar term carries μ⁴ = (M/M₀)⁴ under adiabatic mass loss
//     (n_S² ∝ M·a_E⁻³ with a_E ∝ 1/M) — the plan-04 §1 table row.
// So the precession band in deep-time strata is NOT a pure H-clock under
// solar mass loss: δp/p = 4·f_S(t)·δμ with f_S the epoch's solar torque
// share. This script is the FORWARD MODEL only — it inverts nothing (the
// circularity guard: Driver-1½ anchors must be partitioned before any
// inversion; pre-registered in plan 04 §4 W3).
//
// All inputs from shared homes (E20 — nothing retyped): TL constants
// (GM_SUN, GM_MOON_ALONE, moonDistance, moon e/i, H), astro-reference
// (earth e), tools/lib/deep-time.js (a_m(t), LOD(t), H(t), the solar-mass
// loss rate). Doc 99's hand-computed 16.8/33.4 ″/yr split and its 650-Ma
// Wu reconciliation (67.5 vs 67.64 ″/yr) are REPRODUCED as checks.
//
// RESULT: derived J2000 split 15.9 solar / 34.3 lunar ″/yr (f_S 31.6 %,
// doc-99 record 16.8/33.4); 650-Ma check 67.8 ″/yr vs Wu 2024's 67.64
// (0.2 %). δp/p per 1 % μ = 4·f_S(t): 1.27 % today → 0.86 % at 2.46 Ga →
// 0.70 % at 3.2 Ga — f_S SHRINKS with depth (the closer Moon dominates),
// so the precession band becomes a BETTER pure H-clock exactly where the
// deep-time tests live. Precession-band shift at 2.46 Ga: theoretical μ
// 0.02 % (invisible) · ratio-method 1.007 → 0.61 % · bracket edge 1.07 →
// 6.7 % — the existing leg-1 confirmations already bound μ at roughly the
// count-bracket level. The e-band (∝1/μ, zero H) and precession band
// separate cleanly; inversions remain gated on the anchor partition
// (anchor-partition.mjs — discharged).
//
//   node tools/explore/w3-precession-crosscoupling.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const TL = require(ROOT + 'tools/lib/constants.js');
const DT = require(ROOT + 'tools/lib/deep-time.js');
const astro = require(ROOT + 'public/input/astro-reference.json');

const D2R = Math.PI / 180;

// ── The J2000 torque split, derived (zero new constants) ──────────────────
// Torque ∝ (GM/a³)·(1−e²)^{−3/2}, lunar reduced by (1 − 3/2·sin² i_m) for
// the node-averaged orbit inclination to the ecliptic.
const aE_km = TL.currentAUDistance;
const eE = astro.earthOrbital.earthEccentricityJ2000;
const aM_km = TL.moonDistance;                       // km, J2000 mean
const eM = TL.moonOrbitalEccentricity;
const iM = TL.moonEclipticInclinationJ2000 * D2R;
const solarTerm = (TL.GM_SUN / aE_km ** 3) * Math.pow(1 - eE * eE, -1.5);
const lunarTerm = (TL.GM_MOON_ALONE / aM_km ** 3) * Math.pow(1 - eM * eM, -1.5) * (1 - 1.5 * Math.sin(iM) ** 2);
const fS0 = solarTerm / (solarTerm + lunarTerm);     // solar share today

// Total precession rate today from the model's own clock: H/13.
const p0ArcsecPerYr = 1296000 / (TL.H / 13);
const pS0 = p0ArcsecPerYr * fS0, pL0 = p0ArcsecPerYr * (1 - fS0);
console.log('J2000 torque split (derived): solar %s ″/yr · lunar %s ″/yr · f_S = %s %%   (doc-99 record: 16.8 / 33.4)',
  pS0.toFixed(1), pL0.toFixed(1), (100 * fS0).toFixed(1));

// ── Forward model ─────────────────────────────────────────────────────────
const aM0_m = DT.A_MOON_NOW_M, lod0 = DT.LOD_NOW_H13_S;
const physRate = (ageMa, mu) => {
  const omega = lod0 / DT.meanLodSecondsAtAge(ageMa);          // ω/ω₀
  const lun = pL0 * Math.pow(aM0_m / DT.meanMoonDistanceMetresAtAge(ageMa), 3);
  return omega * (pS0 * mu ** 4 + lun);
};
const fSAt = (ageMa, mu) => {
  const lun = pL0 * Math.pow(aM0_m / DT.meanMoonDistanceMetresAtAge(ageMa), 3);
  const sol = pS0 * mu ** 4;
  return sol / (sol + lun);
};

// Check: reproduce doc 99's 650-Ma Wu reconciliation (μ = 1).
const p650 = physRate(650, 1);
console.log('650 Ma check: physical rate %s ″/yr (doc-99 hand calc 67.5; Wu 2024 infers 67.64) · H/13 structural %s ″/yr',
  p650.toFixed(1), (1296000 / (DT.meanHAtAge(650) / 13)).toFixed(1));

// Theoretical μ(t) from the shipped mass-loss rate (present-rate, constant).
const muTheory = (ageMa) => 1 + DT.SOLAR_MASS_LOSS_FRAC_PER_YR * ageMa * 1e6;

// ── The table: epochs × μ scenarios ───────────────────────────────────────
const EPOCHS = [0, 650, 1400, 2460, 3200];
const MUS = [['theory', muTheory], ['ratio +0.7%', () => 1.007], ['bracket +7%', () => 1.07]];
console.log('\nage Ma |  a_m km  | LOD h | f_S %% | δp/p per 1%% μ | ' + MUS.map(([n]) => `Δp (${n})`).join(' | '));
for (const age of EPOCHS) {
  const fS = fSAt(age, 1);
  const base = physRate(age, 1);
  const cells = MUS.map(([, muf]) => {
    const mu = muf(age);
    return ((physRate(age, mu) / base - 1) * 100).toFixed(3) + ' %';
  });
  console.log([String(age).padStart(6), (DT.meanMoonDistanceMetresAtAge(age) / 1e3).toFixed(0).padStart(8),
    (DT.meanLodSecondsAtAge(age) / 3600).toFixed(2).padStart(5), (100 * fS).toFixed(1).padStart(5),
    ('  ' + (4 * fS).toFixed(2) + ' %').padStart(13), ...cells].join(' | '));
}

// ── The two-band separability statement ───────────────────────────────────
console.log(`
Reading (the joint-inversion forward model, NOT an inversion):
 · e-band (405 kyr, g₂−g₅): period ∝ 1/μ EXACTLY, zero H-content — the pure
   solar scale (plan 04 §1). δT/T = −δμ.
 · precession band: rate = [ω(t)/ω₀]·(p_S·μ⁴ + p_L·(a_m0/a_m)³). Given the
   engine's ω(t), a_m(t) (Driver 1½ — anchors partitioned first), the μ
   sensitivity is 4·f_S(t)·δμ, and f_S SHRINKS going back (the Moon was
   closer, the lunar term dominates) — the precession band becomes a BETTER
   pure H-clock at depth, and the e-band remains the better μ-probe.
 · The two bands separate cleanly: the e-band fixes μ with no H-content,
   then the precession band tests H(t) with the μ⁴·f_S correction applied.
   Any inversion must use the pre-registered anchor partition (W3 guard).`);
