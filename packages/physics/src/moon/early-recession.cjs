'use strict';
/**
 * The early recession, Roche zone → the cited history's first sample — a LABELLED SCENARIO (plan 31 B; doc 111 §1.49).
 * ONE home for the scenario's law and its hand-off numbers; the origin chapter (the tour) and the gates read it.
 *
 * The cited Earth–Moon distance history (Farhat et al. 2022) begins at 6.18 R⊕, its own band's lower edge at the
 * Roche zone (3 R⊕). Continued INWARD on the law its first segment expresses — da/dt = K a^{−11/2}, the constant-
 * dissipation form (Darwin; Zahnle et al. 2015) with K READ OFF the history's first segment (§0's integration
 * principle: one input, extrapolated by its own slope, no foreign Q) — from the FIRST STATION, 3.8 R⊕, where the
 * cited accretion runs assemble the Moon (1.2–1.4 Roche radii), the time to the first sample is a
 * number the input implies, and a BAND: the slope over the last 1 / 3 / 10 samples spreads 16-fold (the history's
 * start is not a constant-Q segment), 3.0e5 / 1.1e5 / 1.9e4 yr (plan31b-early-recession-measure.cjs). The owner's
 * decision (2026-11-18): the 3-sample window ships, 1 and 10 are the band; the scenario is TOUR-ONLY on its own
 * clock — the navigable domain stays the cited history. The input's early dissipation is 2–5× today's (its own
 * fact, stated); the hand-off state is the model's constant-L chain: a 5.1-h day at 3.8 R⊕ (5.0 h at the Roche limit).
 *
 * Inside the navigable domain the reader of date stops 15 kyr short of the history's first sample (the integrators'
 * margin), so the window is read on the samples INSIDE the domain: ages edge, edge − 1, edge − 3, edge − 10 Ma.
 */

const { NAVIGABLE_PAST_YEARS } = require('../time/navigable-domain.cjs');

const SEC_PER_JULIAN_YR = 365.25 * 86400;
const SCENARIO = Object.freeze({
  firstStationEarthRadii: 3.8,     // where the cited accretion runs assemble the Moon: 1.2–1.4 Roche radii (Ida, Canup & Stewart 1997; Kokubo, Ida & Makino 2000) — the scenario's first station (the owner's decision, 2026-11-19; a first build sat at 3.0, the Roche limit itself)
  rocheLimitEarthRadii: 2.9,       // the fluid Roche limit for the Moon's density — the disk's outer edge, inside which nothing accretes
  lawExponent: 5.5,                // da/dt ∝ a^{−11/2}
  windowSamplesShipped: 3,         // the owner's choice; 1 and 10 the band
  windowSamplesBand: [1, 10],
  lockYearsAt6Re: 100,             // Peale 1977: locked within ~a century at 6 R⊕, t ∝ a⁶
  moonRadiusMetres: 1737.4e3,
  sources: 'Farhat et al. 2022 (the history); Zahnle et al. 2015 (the law\'s form); Peale 1977 (the lock); Canup 2004 (the hand-off\'s scenario)',
});

/**
 * @param {object} deps
 * @param {{ earthRadiusMetres: number, gmEarthMoonM3S2: number, moonMassKg: number, earthMassKg?: number, totalAngularMomentumKgM2S: number, earthMomentOfInertiaKgM2: number, moonEccentricityFactor?: number }} deps.constants  (earthMassKg accepted, unused: the chain's form carries the Moon's mass alone)
 * @param {{ moonDistanceMetresAtAge: (tMa: number) => number | null, earthMomentOfInertiaKgM2AtAge?: (tMa: number) => number }} deps.fns  the cited history's reader of date; the chain's moment of inertia of date (read at the edge age — the scenario has no age of its own; the J2000 constant otherwise, 2.8e-7 of the day apart)
 */
function createEarlyRecession({ constants: K0, fns }) {
  const edgeMa = NAVIGABLE_PAST_YEARS / 1e6;
  const K = fns.earthMomentOfInertiaKgM2AtAge ? { ...K0, earthMomentOfInertiaKgM2: fns.earthMomentOfInertiaKgM2AtAge(edgeMa) } : K0;
  const R = K.earthRadiusMetres;
  const aRe = (/** @type {number} */ tMa) => { const a = fns.moonDistanceMetresAtAge(tMa); return a === null ? null : a / R; };

  /** The law's factor from the last m samples inside the domain: K = (da/dt) ā^{5.5}, in R⊕^{6.5} per Myr. @param {number} m */
  function lawFactor(m) {
    const a0 = aRe(edgeMa), a1 = aRe(edgeMa - m);
    if (a0 === null || a1 === null) return null;
    const slope = (a1 - a0) / m, aMid = 0.5 * (a0 + a1);
    return slope * Math.pow(aMid, SCENARIO.lawExponent);
  }
  /** Years from the first station to a distance (R⊕) on the law with the window's factor. @param {number} aTargetRe @param {number} [m] */
  function yearsFromRoche(aTargetRe, m = SCENARIO.windowSamplesShipped) {
    const k = lawFactor(m); if (k === null || !(k > 0)) return null;
    const p = SCENARIO.lawExponent + 1;
    return (Math.pow(aTargetRe, p) - Math.pow(SCENARIO.firstStationEarthRadii, p)) / (p * k) * 1e6;
  }
  /** The distance (R⊕) at a time (years) after the first station on the law. @param {number} years @param {number} [m] */
  function distanceReAtYears(years, m = SCENARIO.windowSamplesShipped) {
    const k = lawFactor(m); if (k === null || !(k > 0)) return null;
    const p = SCENARIO.lawExponent + 1;
    return Math.pow(Math.pow(SCENARIO.firstStationEarthRadii, p) + p * k * (years / 1e6), 1 / p);
  }
  /** The first sample the scenario hands over to: the domain's edge distance (R⊕) and the time to it under the shipped window and the band. */
  function handover() {
    const a = aRe(edgeMa);
    return a === null ? null : { aOverEarthRadii: a, years: yearsFromRoche(a), bandYears: SCENARIO.windowSamplesBand.map((m) => yearsFromRoche(a, m)), lawFactorShipped: lawFactor(SCENARIO.windowSamplesShipped), lawFactorBand: SCENARIO.windowSamplesBand.map(lawFactor) };
  }
  /** The hand-off state at a distance by the constant-L chain: the day, the month, the Moon's apparent size, the lock time.
   *  The day is the SAME operations as the chain's published LOD (layer0 lodSecondsCore: the orbit's angular momentum
   *  as the Moon's mass × √(GM a) × the eccentricity factor, the Earth's moment of inertia injected) — a first form
   *  with the reduced mass read 5.485 h at the hand-over where the next station's card reads the chain's 5.510; the
   *  regime gate holds the hand-over day ≡ the chain's LOD at the edge. @param {number} aOverEarthRadii */
  function stateAt(aOverEarthRadii) {
    const a = aOverEarthRadii * R;
    const lOrbit = K.moonMassKg * Math.sqrt(K.gmEarthMoonM3S2 * a) * (K.moonEccentricityFactor ?? 1);
    const dayHours = ((2 * Math.PI * K.earthMomentOfInertiaKgM2) / (K.totalAngularMomentumKgM2S - lOrbit)) / 3600;
    const monthHours = (2 * Math.PI / Math.sqrt(K.gmEarthMoonM3S2 / (a * a * a))) / 3600;
    return {
      aOverEarthRadii, dayHours, monthHours, monthDays: monthHours / dayHours,
      moonDiameterDeg: 2 * Math.atan(SCENARIO.moonRadiusMetres / a) * 180 / Math.PI,
      lockYears: SCENARIO.lockYearsAt6Re * Math.pow(aOverEarthRadii / 6, 6),
    };
  }
  return { scenario: SCENARIO, edgeMa, lawFactor, yearsFromRoche, distanceReAtYears, handover, stateAt };
}

module.exports = { EARLY_RECESSION_SCENARIO: SCENARIO, createEarlyRecession, SEC_PER_JULIAN_YR };
