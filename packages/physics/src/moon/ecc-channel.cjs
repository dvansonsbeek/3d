/**
 * The Moon-channel eccentricity line — THE shared implementation (Phase 8.2-2).
 *
 * ONE movement, FULLY DERIVED, zero solved values (doc 66 §"Framework-native
 * e_E"): e(t) = eccentricityBase · (1 + cos θ(t) / 2), where θ rides the H/3
 * wobble cycle that drives Earth's inclination. Mean = base (Law 5),
 * amplitude = base/2, phase anchor θ₀ = ϖ_ICRF(J2000) − 21.77° = 81.18° past
 * max. The observed J2000 e (−0.86%), ė (+1.7%) and the sign of ë are
 * PREDICTIONS of this line, not inputs.
 *
 * ONE law for the eclipse chain (FQ-7-Sun option C-small, doc 66 §5): the
 * eclipse Sun's equation of centre rides this same H/3 line (anchored at
 * its J2000 value, model.js sunEccentricityAt) — eccentricity is
 * frame-invariant and may carry only fixed-frame lattice periods; the
 * H/16 perihelion cycle is the H/3 rotation seen from the H/13 equinox
 * (13 + 3 = 16) and belongs to ϖ, not e (doc 108). Only the
 * cardinal-point/deep-time path still keeps the H/16 law (`cardinal`'s
 * injected eccentricityAt) — a recorded, not yet resolved, split.
 *
 * Extracted VERBATIM from src/script.js (_FW_ECC, _fwEarthEcc,
 * _eCompModulation, _fwChannelIntegral, the framework branch of _fwEFactor),
 * which tools/lib mirrored; this file replaces both copies. The 8.2-1
 * alignment made the two engines bit-exact first, so this move is provably
 * behaviour-preserving against the lunar golden masters.
 *
 * LOAD-BEARING conventions:
 *  - The injected `cyclesBetween` is the ENGINE'S OWN integrated-phase
 *    function (divisor 3 on the H lattice). Each engine's deep-time/snapshot
 *    toggle semantics ride along with it.
 *  - `e0`/`g0` are ANCHOR CONSTS by construction, never eccAt(0): under
 *    integrated phase, cycles(2000→2000) carries the R3 drift correction and
 *    is not exactly zero. The tools mirror once recomputed g0 from
 *    _fwEarthEcc(0) — unified here to the const.
 *  - channelIntegral uses composite Simpson with step ≤ ~4,000 yr (N ≥ 2,
 *    even) — the discretization the certified numbers were produced with.
 *  - Past the tidal-lock asymptote (cyclesBetween → null) eccAt returns the
 *    mean — the bounded continuation, not an error.
 */

'use strict';

/**
 * @param {{
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 *   eccentricityBase: number,
 *   perihelionLongitudeJ2000Deg: number,
 *   inclinationCycleAnchorDeg: number,
 * }} deps — cyclesBetween MUST be the engine's own H-lattice phase counter
 *   (integrated under deep time); perihelionLongitudeJ2000Deg is ϖ_ICRF at
 *   J2000 (102.94719°, the FULL value — a truncated copy once cost 0.684″);
 *   inclinationCycleAnchorDeg is the H/3 inclination anchor (21.77°).
 */
function createMoonEccChannel({
  cyclesBetween,
  eccentricityBase,
  perihelionLongitudeJ2000Deg,
  inclinationCycleAnchorDeg,
}) {
  const th0 = (perihelionLongitudeJ2000Deg - inclinationCycleAnchorDeg) * Math.PI / 180;
  const amplitude = eccentricityBase / 2;
  const mean = eccentricityBase;
  const e0 = mean + amplitude * Math.cos(th0);        // J2000 anchor, exact by construction
  const g0 = Math.pow(1 - e0 * e0, -1.5);             // (1−e²)^(−3/2) at the anchor

  /** e_E on the H/3 line at tYr years from J2000 (negative = past).
   *  Returns the mean past the tidal-lock asymptote.
   *  @param {number} tYr @returns {number} */
  function eccAt(tYr) {
    const cycles = cyclesBetween(2000, 2000 + tYr, 3);
    if (cycles === null) return mean;
    return mean + amplitude * Math.cos(th0 + 2 * Math.PI * cycles);
  }

  /** [g(e(t))/g₀]^s — the perigee/node rate modulation, ≡ 1 at J2000.
   *  tMa is age in Myr (positive = past, the deep-time chain convention).
   *  @param {number} tMa @param {number} s @returns {number} */
  function modulation(tMa, s) {
    if (tMa === 0) return 1;
    const e = eccAt(-tMa * 1e6);
    return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s);
  }

  /** ∫₀ᵀ [(g(e(t′))/g₀)^s − 1] dt′ in Julian centuries — the phase-aware
   *  channel-rate integral (the old frozen-κ T²/T³ Taylor coefficients were
   *  this integral's J2000 truncation). Composite Simpson, step ≤ ~4 kyr.
   *  @param {number} T @param {number} s @returns {number} */
  function channelIntegral(T, s) {
    if (T === 0) return 0;
    /** @param {number} t */
    const f = (t) => {
      const e = eccAt(t * 100);   // t in cy → years
      return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s) - 1;
    };
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
    const h = T / N;
    let sum = f(0) + f(T);
    for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  }

  /** Bounded Meeus E-factor: E ≡ e_E(t)/e_E(J2000), value 1 at J2000 by
   *  construction. The caller supplies tYr = days-from-J2000 / mean solar
   *  year; the pure-Meeus A/B polynomial branch stays ENGINE-LOCAL with its
   *  mode toggle. @param {number} tYr @returns {number} */
  function eFactorAt(tYr) {
    return eccAt(tYr) / e0;
  }

  return { eccAt, modulation, channelIntegral, eFactorAt, th0, amplitude, mean, e0, g0 };
}

module.exports = { createMoonEccChannel };
