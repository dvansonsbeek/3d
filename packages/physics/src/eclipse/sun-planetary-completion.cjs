/**
 * Sun planetary completion v2 — the DERIVED table (Stage D2, plan §12i
 * item 10; supersedes the v1 fitted 10-term table).
 *
 * DERIVATION, not fit: the table is extracted from the framework's OWN
 * physics — twin epoch-phased 8-body RK4 integrations (Sun, planets, EMB)
 * built entirely from framework constants, planet phases taken from the
 * engine scene graph, differenced full-vs-base3 to isolate the planetary
 * signal, with the EMB secular-perihelion channel projected out (that
 * channel belongs to the framework's own ϖ(t)/e(t) laws). The 68 terms
 * below are the analytic reading of that derived signal: main synodic
 * tones plus eccentricity-modulation sidebands (main ± mean anomaly of
 * the modulating planet, main ± M_E). Table-vs-signal fidelity 0.64″.
 * JPL Horizons enters only as VALIDATION, never as fit target: the
 * derived signal matches JPL residuals at corr −0.997 / slope −0.999
 * (0.60″ combined), and shipping it takes the all-phase Sun residual
 * 3.48″ → 2.12″, the 179-eclipse syzygy fleet 5.51″ → 3.99″, and the
 * NASA centerline reference set 5.30″ → 3.94″ shadow-plane (jointly
 * with the derived Moon series extension, moon/series-extension.cjs —
 * the pre-registered acceptance was all four gates, never a subset).
 * Instruments: tools/explore/d2-derived-sun.mjs (signal),
 * d2-sun-table-extraction.mjs (table), d2-joint-preview.mjs /
 * d2-widened-centerlines.mjs (validation).
 *
 * DECLARED INPUTS (the three non-framework residues):
 *  (i)  planet/Sun mass ratios — observed IAU constants (shared with the
 *       whole framework; nothing here fits them);
 *  (ii) argument polynomials — IAU-class instrument literals, phase
 *       carriers only; their framework-native derivation is research
 *       item 20.3e;
 *  (iii) the 2lE term (+1.42″ sin 2lE) — DECLARED FITTED, not derived: a
 *       finder-annual artifact of the current SUN_HARMONICS chain, to be
 *       absorbed at the next Step-0 refit. Everything else in this file
 *       is derived. The Earth-around-EMB wobble, fitted −6.64″ in v1, is
 *       now DERIVED: amplitude a_M·μ/AU with μ = 1/(1+M_E/M_M), injected
 *       by the factory below from live package constants (6.4399″ at the
 *       current constants), sign negative in the subtract convention.
 *
 * THE CONSTANT-ATTRIBUTION RULE (v1's 20.3h-lite trap, still honored):
 * the table carries NO constant term — the constant is attributed to the
 * tier's existing anchors, so the terms ship without the +6″ syzygy-mean
 * penalty an eclipse-sample fit produced.
 *
 * Sign convention: unchanged from v1 — the evaluation models
 * (framework − truth), so consumers SUBTRACT it from the finder Sun
 * longitude. TERMS literals are stored in the extraction's native sign
 * (d2-sun-table.local.json) and negated in the evaluator, exactly as the
 * validated joint-preview instrument composes them.
 *
 * MATCHED PAIR: the amplitudes are the residual of the CURRENT finder
 * Sun chain (framework rate + EoC + SUN_HARMONICS) and must be
 * RE-DERIVED whenever that chain moves — a Step-0 SUN_HARMONICS refit,
 * an eccentricity/perihelion definition change, or 20.3e. Re-derivation
 * is the D2 instrument chain above (regenerate d2-sun-table.local.json,
 * re-embed). ENFORCED: PAIRED_SUN_HARMONICS_SHA256 below is the
 * fingerprint of the SUN_LONGITUDE_HARMONICS this table was derived
 * under; the create-model parity gate (test:model, in `npm run check`)
 * recomputes it from live constants and fails on mismatch. The api
 * centerline gate (≤8″ shadow-plane) backstops gross staleness
 * independently.
 *
 * E4/E5 PAIRING VERDICT (20.3h Phase 0): the framework-native Sun
 * landing REPLACED the finder Sun form (Meeus Ch. 25 → the assembled
 * framework Sun with the f(Y)+torque drift). The re-derivation this
 * header calls for was MEASURED INSTEAD: the residual 2lE re-fit under
 * the new chain is noise (−0.12″ sin / −0.03″ cos vs the declared-fitted
 * +1.42″ — tools/explore/e3b-native-sun.mjs §2), the all-phase Sun
 * residual improved to 0.95″, and every gate stayed green — the table's
 * planetary content is chain-independent physics and the pairing holds
 * WITHOUT re-extraction. The +1.42″ 2lE term is thereby measured to be
 * genuinely planetary-class, not a Meeus-EoC absorber.
 */

'use strict';

/** Of-date mean-longitude polynomials, degrees per Julian century TT
 *  (IAU-class instrument literals — phase carriers, see header (ii)).
 *  Body order everywhere below: Mercury, Venus, Earth (EMB), Mars,
 *  Jupiter, Saturn. */
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const ARG_L1 = [149472.674, 58517.815676, 36000.769780, 19141.696300, 3036.302389, 1223.511013];
/** J2000 perihelion longitudes (deg), same body order — mean anomaly
 *  M_X = l_X − ϖ_X; slow ϖ drift is absorbed by the sidebands over the
 *  valid window. */
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
/** Moon mean elongation (deg/cy TT) — the EMB-wobble carrier. */
const ARG_D = [297.8501921, 445267.1114034];

/**
 * The derived table, extraction-native sign (negated in the evaluator):
 * [[6 mean-longitude multipliers lMe,lV,lE,lM,lJ,lS],
 *  [6 mean-anomaly multipliers MMe,MV,ME,MMa,MJ,MS], cos″, sin″].
 * 68 terms ≥ 0.05″ from the D2 extraction (79-term LSQ, fidelity 0.64″).
 * @type {Array<[number[], number[], number, number]>}
 */
const TERMS = [
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 0, 0], -0.0841, -11.6309],
  [[0, 0, 2, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.3235, 8.2645],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, -1, 0, 0], -2.9917, -6.8503],
  [[0, 0, 2, -2, 0, 0], [0, 0, -1, 0, 0, 0], -6.2197, -2.1203],
  [[0, 2, -2, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.0199, -6.4326],
  [[0, 0, 1, 0, -2, 0], [0, 0, 1, 0, 0, 0], 1.7254, 4.5991],
  [[0, 1, -1, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.1362, 4.8325],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 1, 0], 1.1469, 4.2788],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 0, 0], -3.8890, 1.2230],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 0, 0], 3.3414, 1.5744],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, -1, 0], -2.6985, -1.2967],
  [[0, 3, -4, 0, 0, 0], [0, 0, 0, 0, 0, 0], 2.9374, -0.5408],
  [[0, 0, 1, 0, -1, 0], [0, 0, -1, 0, 0, 0], -2.5406, -0.1812],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 0, 0, 0], 1.3755, -2.0301],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 1, 0, 0], -2.2367, -0.4398],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 0, 0, 0], 1.8705, 0.3499],
  [[0, 3, -3, 0, 0, 0], [0, -1, 0, 0, 0, 0], -1.3492, 1.2893],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 1, 0], 1.5453, 0.1289],
  [[0, 2, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], 1.3344, -0.4621],
  [[0, 3, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], -0.0755, -1.4049],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, 0, 0, 0], 0.2780, 1.2111],
  [[0, 0, -1, 2, 0, 0], [0, 0, -1, 0, 0, 0], -0.7161, 0.8440],
  [[0, 3, -4, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.9894, 0.3587],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 0, 0], 0.0063, 1.0463],
  [[0, 2, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.9834, 0.1318],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, -1, 0, 0], 0.4834, 0.8318],
  [[0, 1, -1, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.5335, 0.5905],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, -1, 0, 0], 0.5371, -0.5685],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 0, 0, 0], -0.7373, -0.0880],
  [[0, 2, -2, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.0163, -0.7372],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, -1, 0, 0], -0.0119, 0.6500],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 1, 0], 0.0023, -0.6287],
  [[0, 0, 1, 0, -1, 0], [0, 0, 1, 0, 0, 0], 0.5714, -0.1358],
  [[0, 0, -2, 4, 0, 0], [0, 0, -1, 0, 0, 0], -0.5046, 0.2858],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 1, 0], -0.5567, 0.1036],
  [[0, 2, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.5469, -0.0167],
  [[0, 2, -3, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.4309, 0.2809],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, -1, 0], 0.2206, -0.4616],
  [[0, 3, -4, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.4549, -0.2097],
  [[0, 0, 2, 0, -3, 0], [0, 0, -1, 0, 0, 0], 0.2809, 0.3489],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 0, 0, 0], 0.2863, 0.3116],
  [[0, 0, 2, -3, 0, 0], [0, 0, -1, 0, 0, 0], -0.4141, -0.0359],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 0], 0.0863, -0.4015],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 1, 0, 0], -0.2200, 0.3372],
  [[0, 1, -1, 0, 0, 0], [0, 0, -1, 0, 0, 0], -0.2017, 0.2910],
  [[0, 2, -2, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.2499, -0.1777],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, -1, 0], -0.2254, 0.1676],
  [[0, 3, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], -0.1859, -0.1961],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 1], -0.0710, 0.2499],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, -1, 0, 0], 0.2125, -0.1175],
  [[0, 0, 1, 0, 0, -1], [0, 0, -1, 0, 0, 0], -0.0460, 0.2379],
  [[0, 3, -4, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.1410, 0.1566],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 1, 0, 0], -0.0476, 0.1897],
  [[0, 2, -2, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.1559, -0.1155],
  [[0, 0, 2, 0, -3, 0], [0, 0, 1, 0, 0, 0], 0.1631, -0.0164],
  [[0, 1, -1, 0, 0, 0], [0, 1, 0, 0, 0, 0], 0.1307, -0.0678],
  [[0, 0, 2, -3, 0, 0], [0, 0, 1, 0, 0, 0], 0.1331, -0.0291],
  [[0, 0, -2, 4, 0, 0], [0, 0, 1, 0, 0, 0], 0.1227, 0.0482],
  [[0, 0, 2, 0, 0, -2], [0, 0, 0, 0, 0, 0], -0.0388, 0.1044],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, -1], -0.0309, 0.1027],
  [[0, 0, 1, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.0741, 0.0308],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, -1, 0], 0.0102, 0.0783],
  [[0, 1, -1, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0026, 0.0765],
  [[0, 0, 2, 0, -2, 0], [0, 0, 1, 0, 0, 0], -0.0084, 0.0686],
  [[0, 3, -4, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.0273, -0.0576],
  [[0, 0, 1, -1, 0, 0], [0, 0, 1, 0, 0, 0], 0.0570, 0.0117],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 1, 0, 0], 0.0426, -0.0336],
  [[0, 0, 1, -1, 0, 0], [0, 0, -1, 0, 0, 0], -0.0335, -0.0395],
];

/** The declared-fitted semiannual leftover (header (iii)): +1.42″ sin 2lE. */
const FITTED_2LE_ARCSEC = 1.42;

const D2R = Math.PI / 180;

/**
 * @param {{ embWobbleArcsec: number }} opts - the DERIVED Earth-around-EMB
 *   wobble amplitude a_M·μ/AU in arcsec (μ = 1/(1+M_E/M_M)); computed
 *   from live constants by the model wiring so it tracks the constants.
 * @returns {{ sunPlanetaryCompletionDeg: (T: number) => number }}
 */
function createSunPlanetaryCompletion({ embWobbleArcsec }) {
  if (!Number.isFinite(embWobbleArcsec)) {
    throw new Error('createSunPlanetaryCompletion: embWobbleArcsec must be a finite number (derived a_M·μ/AU in arcsec)');
  }
  /**
   * Planetary-completion correction to the finder Sun longitude.
   * @param {number} T - Julian centuries TT from J2000
   * @returns {number} degrees — SUBTRACT from the finder Sun longitude
   */
  function sunPlanetaryCompletionDeg(T) {
    const l = new Float64Array(6), M = new Float64Array(6);
    for (let i = 0; i < 6; i++) {
      l[i] = (ARG_L0[i] + ARG_L1[i] * T) * D2R;
      M[i] = l[i] - PERI[i] * D2R;
    }
    let table = 0;
    for (const [kl, kM, cA, sA] of TERMS) {
      let th = 0;
      for (let i = 0; i < 6; i++) th += kl[i] * l[i] + kM[i] * M[i];
      table += cA * Math.cos(th) + sA * Math.sin(th);
    }
    const D = (ARG_D[0] + ARG_D[1] * T) * D2R;
    const arcsec = -table - embWobbleArcsec * Math.sin(D)
      + FITTED_2LE_ARCSEC * Math.sin(2 * l[2]);
    return arcsec / 3600;
  }
  return { sunPlanetaryCompletionDeg };
}

/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1: SUN_HARMONICS did not move in the D2 landing. */
const PAIRED_SUN_HARMONICS_SHA256 = 'e2cf42e9770c9e0a';

module.exports = { createSunPlanetaryCompletion, PAIRED_SUN_HARMONICS_SHA256 };
