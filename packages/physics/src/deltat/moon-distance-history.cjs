/**
 * The Earth–Moon distance history — a CITED PHYSICAL INPUT, read as a shape
 * on the model's own J2000 anchor (plan 12, option A).
 *
 * WHY AN INPUT. Everything downstream of a(t) is derived here by our own
 * equations: the day length by angular-momentum conservation (deep-time.cjs),
 * the composed lunisolar precession and the clock T_p(t)
 * (earth/precession-composed.cjs), the month chain (moon/month-chain.cjs).
 * a(t) itself cannot be derived without an ocean-tide dissipation history —
 * the continental configuration and the resonance crossings that decide how
 * fast the Moon recedes in each era — and the model has no physics for it.
 * With constant dissipation at today's rate the Moon sits at the Roche limit
 * 1.5 Gyr ago, three billion years too late for its age. The published
 * solution that computes that history from a modelled ocean is Farhat,
 * Auclair-Desrotour, Boué & Laskar 2022 (A&A 665, L1), distributed as the
 * AstroGeo22 ephemeris; it is the input, as the planetary masses are DE440's
 * and p₀ is IAU 2006's. Before plan 12 the history was a quartic whose two
 * higher coefficients were least-squares fitted to that same curve (0.5 h of
 * day off at 1 Ga) and, beyond 1 Ga, a spline through knots fitted to the
 * rock record — a fit to the data the falsification leg then tested.
 *
 * WHAT IS READ. The table's distance column as the RATIO r(t) = a(t)/a(0):
 * Farhat's a is the Keplerian semi-major axis (383,598 km at J2000); the
 * model's anchor is the observed mean distance (384,399 km). The history
 * enters as a(t) = a₀ · r(t), so J2000 stays the observation and the shape is
 * Farhat's.
 *
 * INTERPOLATION. Monotone cubic Hermite (Fritsch–Carlson) between the 1-Myr
 * samples — C1, so the LOD-rate decomposition's tidal term (the slope) is
 * smooth. The J2000 END-SLOPE is the OBSERVED LLR recession rate, the α₁
 * input (3.820 cm/yr; Farhat's own first sample reads 3.833, his fit to the
 * same observation): the boundary condition is the measurement, so the ΔT
 * era's tidal term does not move with the input.
 *
 * DOMAIN. Forward of J2000 (t < 0) the LLR rate is held constant — the
 * charts' labelled extrapolation (the input has no future). Beyond the
 * table's last sample (4,429 Ma — the lunar age is the input's end) the
 * history REFUSES: null, never an extrapolation. The former "Roche crossing
 * at 4.498 Ga, a self-validation" was the spline's pinned endpoint, not a
 * derivation, and is withdrawn.
 */

'use strict';

/**
 * @typedef {Object} MoonDistanceTable
 * @property {ReadonlyArray<number>} ageMa - ascending, 0 first, uniform 1-Myr step
 * @property {ReadonlyArray<number>} aEarthRadii - the distance column (any consistent unit; only ratios are read)
 */

/**
 * @param {{ table: MoonDistanceTable, aMoonNowMetres: number, alpha1PerMa: number }} deps
 *   aMoonNowMetres — the model's J2000 anchor (the observed mean distance);
 *   alpha1PerMa — the LLR rate as a fraction of a₀ per Ma (negative into the past: a shrinks).
 * @returns {{
 *   distanceMetresAtAge: (tMa: number) => number|null,
 *   slopeMetresPerMaAtAge: (tMa: number) => number|null,
 *   ratioAtAge: (tMa: number) => number|null,
 *   spanMa: number,
 * }}
 */
function createMoonDistanceHistory(deps) {
  const { table, aMoonNowMetres: aNow, alpha1PerMa: a1 } = deps;
  const ages = table.ageMa, aRE = table.aEarthRadii;
  const n = ages.length;
  if (!(n >= 2) || aRE.length !== n || ages[0] !== 0) throw new Error('moon-distance-history: the table must start at age 0 with ≥ 2 samples');
  const step = ages[1] - ages[0];
  for (let i = 1; i < n; i++) {
    if (ages[i] - ages[i - 1] !== step) throw new Error(`moon-distance-history: non-uniform age step at index ${i}`);
    if (aRE[i] > aRE[i - 1]) throw new Error(`moon-distance-history: the distance must be monotone into the past (index ${i})`);
  }
  const spanMa = ages[n - 1];
  // The ratio table and its Fritsch–Carlson tangents (ratio per Ma).
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) r[i] = aRE[i] / aRE[0];
  const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) d[i] = (r[i + 1] - r[i]) / step;
  const m = new Float64Array(n);
  m[0] = a1;                                  // the LLR observation, in ratio/Ma
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
  m[n - 1] = d[n - 2];
  for (let i = 0; i < n - 1; i++) {             // monotonicity limiter (Fritsch–Carlson)
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const al = m[i] / d[i], be = m[i + 1] / d[i];
    const s = al * al + be * be;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * al * d[i]; m[i + 1] = tau * be * d[i]; }
  }

  /** @param {number} tMa @returns {number|null} the ratio a(t)/a₀ */
  function ratioAtAge(tMa) {
    if (tMa <= 0) return 1 + a1 * tMa;        // forward: the LLR rate held constant (labelled extrapolation)
    if (tMa > spanMa) return null;            // beyond the input: refused
    const i = Math.min(Math.floor(tMa / step), n - 2);
    const h = step, s = (tMa - ages[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * r[i] + (s3 - 2 * s2 + s) * h * m[i]
      + (-2 * s3 + 3 * s2) * r[i + 1] + (s3 - s2) * h * m[i + 1];
  }
  /** @param {number} tMa @returns {number|null} d(ratio)/dt, per Ma */
  function ratioSlopePerMaAtAge(tMa) {
    if (tMa <= 0) return a1;
    if (tMa > spanMa) return null;
    const i = Math.min(Math.floor(tMa / step), n - 2);
    const h = step, s = (tMa - ages[i]) / h, s2 = s * s;
    return ((6 * s2 - 6 * s) * r[i] + (3 * s2 - 4 * s + 1) * h * m[i]
      + (-6 * s2 + 6 * s) * r[i + 1] + (3 * s2 - 2 * s) * h * m[i + 1]) / h;
  }
  return {
    distanceMetresAtAge: (tMa) => { const q = ratioAtAge(tMa); return q === null ? null : aNow * q; },
    slopeMetresPerMaAtAge: (tMa) => { const q = ratioSlopePerMaAtAge(tMa); return q === null ? null : aNow * q; },
    ratioAtAge,
    spanMa,
  };
}

module.exports = { createMoonDistanceHistory };
