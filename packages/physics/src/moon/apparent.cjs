/**
 * Moon scene position — the ecliptic → equatorial conversion of the series
 * output, THE shared implementation (Phase 8.2-7). Since plan 06 R3 item 1 it
 * is ONLY that conversion: the rendered Moon is the GEOMETRIC series Moon
 * (moon/series.cjs sceneEvalAt, the derived extension inside), on the same
 * convention as the rendered Sun and planets.
 *
 * WHAT LEFT, and the measurement that retired it (record; the values stay in
 * git history and docs/retired-record.md):
 *  - the "D5 derived optics" — the annual aberration v_E/c applied to the
 *    Moon's direction ("moonAberrationRaDec"). That operation turns the
 *    geometric Moon into its ASTROMETRIC place (the body at emission time,
 *    the observer's aberration not applied — Horizons quantity 1, a
 *    star-chart convention 20″·cos D from both the geometric and the
 *    apparent Moon). D5 had validated against exactly that reference and
 *    so applied the REFERENCE'S convention to the RENDERED Moon. The scene
 *    is an orrery of where the bodies are — geometric: Earth's shadow is
 *    cast by the geometric Sun and the Moon enters it at its geometric
 *    place — so the conversion belongs to the comparison instrument (the
 *    pipeline verifier bridges it, tools/lib/optimizer.js), not to the
 *    scene. Measured over 1970–2049: the bare series + extension against
 *    Horizons' APPARENT Moon (≡ geometric − 0.7″ for a co-moving body)
 *    −1.0″ ± 1.5″ flat in elongation; the D5-shifted rendered Moon +32.5″ +
 *    20″·cos D against the same. (Plan 06 R3 scene conventions — the
 *    earlier wording "wrong physics" over-reached: astrometric is a valid
 *    convention, applied on the wrong side of the boundary.)
 *  - the fitted RA/Dec patches MOON_CORRECTION (pure-Meeus A/B) and
 *    MOON_CORRECTION_RESIDUAL (the post-D5 remainder, dominated by a −5.1″
 *    raCosMp term): fitted around the layer above at syzygies; the series +
 *    extension carry a ~1.3″ cos M′ structure against Horizons and no fitted
 *    value replaces it.
 *  - the fitted mean-longitude anchor moonMeeusLpCorrection (+32.75″, now 0,
 *    model-parameters.json): the eclipse tier's mean Sun compensated (κ +
 *    the I2 long inequality + the trend-ΔT offset), see eclipse/besselian.cjs.
 *
 * S8 (obliquity source) stays ENGINE-INJECTED per call: the browser passes
 * its live scene value (o.obliquityEarth, refreshed in updatePositions);
 * the Node engine recomputes for the scene year. Equal when both describe
 * the same year — a scene-state convention, not physics.
 */

'use strict';

/**
 * No dependencies since R3 item 1 (the former D5 optics constants and the
 * fitted-patch getters are gone); the factory shape is kept for the two
 * scene twins' call sites.
 * @param {object} [_deps] ignored
 */
function createMoonApparent(_deps) {
  /** The RA/Dec of the series output — ecliptic → equatorial (Meeus eq. 13.3,
   *  13.4) on the injected obliquity. Returns EQUATORIAL radians — the engines
   *  own their scene storage conventions (the browser stores dec as π/2 − dec,
   *  phi form). `meeusT` is accepted for call-site stability and unused.
   *  @param {{lonDeg: number, betRad: number, meeusT?: (number | undefined), obliquityDeg: number}} p
   *  @returns {{raRad: number, decRad: number}} */
  function overrideRaDec({ lonDeg, betRad, obliquityDeg }) {
    const eps = obliquityDeg * (Math.PI / 180);
    const cosE = Math.cos(eps), sinE = Math.sin(eps);
    const lamR = lonDeg * (Math.PI / 180);
    const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
    const sinBet = Math.sin(betRad), cosBet = Math.cos(betRad);
    let newRA = Math.atan2(sinLam * cosE - Math.tan(betRad) * sinE, cosLam);
    if (newRA < 0) newRA += 2 * Math.PI;
    const newDec = Math.asin(sinBet * cosE + cosBet * sinE * sinLam);
    return { raRad: newRA, decRad: newDec };
  }

  return { overrideRaDec };
}

module.exports = { createMoonApparent };
