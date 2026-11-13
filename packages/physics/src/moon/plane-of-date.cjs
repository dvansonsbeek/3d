/**
 * The lunar plane of date — the composition of the Meeus-class series into the
 * ecliptic of date (plan 31 A2; doc 111 §1.43). ONE home for the geometry;
 * the shapes it rides come from earth/laplace-plane.cjs (lunarPlaneScalesAtAge).
 *
 * The Moon's MEAN orbit plane is the Laplace plane: on the ecliptic far from the
 * Earth, on the equator inside the Laplace radius, tilted θ(t) from the ecliptic
 * about the equinox line of date (the coupled state's node, plan 31 A). Meeus's
 * Ch. 47 series carries that tilt at J2000 as its "flattening of the Earth"
 * family — in latitude the explicit −2235 sin L′ (8.05″) with its eccentricity
 * sidebands +127 sin(L′ − M′) / −115 sin(L′ + M′), in longitude an implicit
 * first-order share inside the fitted 7.06″ sin Ω term and the derived
 * 0.371″ sin(2F + Ω) of the extension tail. MEASURED (the A2 build, the
 * Horizons DE441 referee, weekly 1970–2049): the coupled solve puts the tilt at
 * 8.30″ today and its e·θ sideband at 126.6 µ° (Meeus 127); replacing the three
 * latitude terms by the exact rotation completes the sidebands Meeus truncated
 * (0.107″ rms — the β scatter against Horizons drops by exactly that quadrature,
 * 1.019 → 1.014″) while re-applying the rotation's longitude share double-counts
 * what the fitted longitude already holds (λ scatter 2.809 → 2.824″). Hence:
 *   λ_out = λ_series − δλ₁(θ₀) + δλ_exact(θ(t)),   δλ₁ = +θ tan β cos λ,
 *   β_out = the exact rotation of the Laplace-frame latitude by θ(t),
 * the era untouched to O(θ₀²) (3e-4″), the deep plane the full geometry (11.8°
 * at the cited history's end). θ(t) = θ₀ · tiltShape, θ₀ Meeus's own anchor.
 */

'use strict';

const D2R = Math.PI / 180;

/**
 * The normalised shapes the composition rides, from the regime's two readers
 * (earth/laplace-plane.cjs through the deep-time chain — which stays untouched: its
 * hash is every generator's input):
 *   tiltShape      = θ(t)/θ(0) — the Laplace plane's tilt from the ecliptic as a multiple of its
 *                    J2000 value; the series keeps Meeus's OWN anchor (2235 µ°, 8.05″ — the Horizons
 *                    referee prefers it to the solve's 8.30″ by 0.003″ of latitude scatter), the
 *                    shape alone is the physics (the R precedent),
 *   sinScale       = sin i_L(t)/sin i₀ — every F-odd latitude amplitude is ∝ sin i to first order
 *                    (the 3F family ∝ sin³ i: the series cubes it),
 *   tanHalfSqScale = tan²(i_L/2)/tan²(i₀/2) — the reduction to the ecliptic, the 2F families of
 *                    the longitude and the distance.
 * All three exactly 1 at J2000 (the readers' J2000 identities); null out of the histories' domain
 * (the series then keeps the era form, beyond the navigable domain only — the distance getter's rule).
 * @param {{
 *   tiltDegAtAge: (tMa: number) => (number | null),
 *   freeInclinationDegAtAge: (tMa: number) => (number | null),
 * }} deps — the chain's meanLaplaceTiltFromEclipticDegAtAge and meanLunarFreeInclinationDegAtAge
 * @returns {(tMa: number) => ({tiltShape: number, sinScale: number, tanHalfSqScale: number} | null)}
 */
function createLunarPlaneScales({ tiltDegAtAge, freeInclinationDegAtAge }) {
  /** @type {number | null | undefined} */
  let tilt0;
  /** @type {number | null | undefined} */
  let i0Rad;
  return function lunarPlaneScalesAtAge(tMa) {
    const iL = freeInclinationDegAtAge(tMa);
    const th = tiltDegAtAge(tMa);
    if (iL === null || th === null) return null;
    if (tilt0 === undefined) tilt0 = tiltDegAtAge(0);
    if (i0Rad === undefined) { const i0 = freeInclinationDegAtAge(0); i0Rad = i0 === null ? null : i0 * D2R; }
    if (tilt0 === null || !(tilt0 > 0) || i0Rad === null) return null;
    const iRad = iL * D2R;
    return {
      tiltShape: th / tilt0,
      sinScale: Math.sin(iRad) / Math.sin(i0Rad),
      tanHalfSqScale: (Math.tan(iRad / 2) / Math.tan(i0Rad / 2)) ** 2,
    };
  };
}

/**
 * @param {number} lonDeg  the series' longitude of date (continuous; carries Meeus's first-order tilt share)
 * @param {number} latDeg  the series' latitude WITHOUT the flattening family — the Laplace-frame latitude
 * @param {number} tiltAnchorDeg  the J2000 tilt the series' flattening family is anchored on (2235 µ°)
 * @param {number} tiltShape  θ(t)/θ(0), 1 at J2000
 * @returns {{lonDeg: number, latRad: number, latDeg: number}} lonDeg continuous (the input plus the
 *   composed correction); latRad the rotation's own asin (the browser stores radians, the Node engine
 *   degrees — both from ONE value)
 */
function composeEclipticOfDate(lonDeg, latDeg, tiltAnchorDeg, tiltShape) {
  const l = lonDeg * D2R, b = latDeg * D2R;
  const cb = Math.cos(b), sb = Math.sin(b);
  // The anchor's first-order longitude share, removed (it sits inside the fitted longitude).
  const firstOrder = tiltAnchorDeg * D2R * (sb / cb) * Math.cos(l);
  const lCorr = l - firstOrder;
  const t = tiltAnchorDeg * tiltShape * D2R;
  const x = cb * Math.cos(lCorr), y = cb * Math.sin(lCorr), z = sb;
  const y2 = y * Math.cos(t) + z * Math.sin(t), z2 = -y * Math.sin(t) + z * Math.cos(t);
  const latRad = Math.asin(Math.max(-1, Math.min(1, z2)));
  // The rotation's longitude step, wrapped — keeps the caller's continuous longitude continuous.
  let dl = Math.atan2(y2, x) - lCorr;
  dl -= 2 * Math.PI * Math.round(dl / (2 * Math.PI));
  return { lonDeg: lonDeg + (dl - firstOrder) / D2R, latRad, latDeg: latRad / D2R };
}

module.exports = { composeEclipticOfDate, createLunarPlaneScales };
