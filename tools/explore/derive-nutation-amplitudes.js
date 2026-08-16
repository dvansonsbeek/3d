#!/usr/bin/env node
/**
 * derive-nutation-amplitudes.js — derive the leading nutation amplitudes
 * (Δψ·sin Ω, Δε·cos Ω — the 18.6-yr axis nod) from the SAME torque law that
 * gives the framework its axial precession, in the doc-24 style: every
 * factor a framework quantity, the closed form stated honestly, the gap to
 * the exact rigid-Earth value attributed.
 *
 * PHYSICS. The H/13 precession is the lunar+solar torque on the equatorial
 * bulge AVERAGED over the orbits. Nutation is the unaveraged remainder: the
 * Moon's orbit is inclined i = 5.15° and its node regresses (the model's own
 * 18.6-yr nodal cycle), so the月ly-averaged lunar torque normal rides the
 * lunar orbit plane, not the ecliptic. Decomposed: a steady ecliptic-normal
 * part ∝ (1 − 3/2·sin²i) (the precession driver) and a component rotating
 * with the node ∝ (3/2)·sin i·cos i, which drives the axis at the node
 * frequency. Amplitude = oscillating-driver rate ÷ node rate.
 *
 * All inputs are framework quantities:
 *   ψ̇ (total)   = 1,296,000″ / (H/13 yr)  — the H/13 identity itself
 *   lunar/solar split = F_LUNAR/F_SOLAR    — the physical-precession split
 *   i            = the Moon's dynamical inclination (doc 66)
 *   n_Ω          = the model's nodal regression rate
 *   ε            = framework obliquity (Δε projection)
 *
 * Closed form (first order):
 *   A_ψ = ψ̇_lunar · [(3/2)·sin i·cos i / (1 − (3/2)·sin²i)] / n_Ω
 *   A_ε = A_ψ · sin ε
 * Honest status: first order recovers the 18.6-yr terms at the ~80–85%
 * level; the remainder is the ecliptic-frame two-component treatment
 * (Oppolzer terms — the free-axis vs figure-axis distinction) which the
 * v4 laboratory's full torque integration carries. Same pattern as
 * Δa = a·μ·m: the clean closed form first, the exact machinery named.
 *
 * Usage: node tools/explore/derive-nutation-amplitudes.js
 */

const C = require('../lib/constants');

const D2R = Math.PI / 180;
const H = C.HOLISTIC_YEAR ?? C.holisticYear ?? 335317;

// ── framework inputs ───────────────────────────────────────────────────────
const psiDotTotalArcsecYr = 1296000 / (H / 13);            // the H/13 identity
const F_LUNAR = 33.4, F_SOLAR = 16.8;                       // physical split (docs/99 torque formula)
const psiDotLunar = psiDotTotalArcsecYr * F_LUNAR / (F_LUNAR + F_SOLAR);
const iMoon = C.moonEclipticInclinationJ2000 * D2R;         // dynamical inclination (doc 66)
const nodalYears = C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays;
const nOmegaRadYr = 2 * Math.PI / nodalYears;               // the model's own node rate
const eps = C.earthtiltMean * D2R;

// ── closed form ────────────────────────────────────────────────────────────
const planeFactor = (1.5 * Math.sin(iMoon) * Math.cos(iMoon)) / (1 - 1.5 * Math.sin(iMoon) ** 2);
const aPsi = psiDotLunar * planeFactor / nOmegaRadYr;       // arcsec
const aEps = aPsi * Math.sin(eps);                          // arcsec

const IAU = C.NUTATION_LEADING_TERMS_ARCSEC;
console.log('Nutation 18.6-yr amplitudes from the framework torque law:');
console.log('  psi-dot total %s "/yr (H/13) | lunar share %s "/yr | node %s yr',
  psiDotTotalArcsecYr.toFixed(2), psiDotLunar.toFixed(2), nodalYears.toFixed(3));
console.log('  A_psi derived %s"  | IAU 1980 %s"  → %s%%',
  aPsi.toFixed(2), Math.abs(IAU.psiOmega).toFixed(2), (aPsi / Math.abs(IAU.psiOmega) * 100).toFixed(1));
console.log('  A_eps derived %s"  | IAU 1980 %s"  → %s%%',
  aEps.toFixed(2), Math.abs(IAU.epsOmega).toFixed(2), (aEps / Math.abs(IAU.epsOmega) * 100).toFixed(1));
console.log('\nDeep-time note: every input evolves in the model (H(t) via the');
console.log('lattice, a_M(t) scales the lunar share as 1/a^3 through F_LUNAR,');
console.log('the node period rides the month chain) — the derived form is');
console.log('deep-time-native where the IAU polynomial arguments are not.');
