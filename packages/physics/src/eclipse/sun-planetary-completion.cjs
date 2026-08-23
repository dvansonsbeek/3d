/**
 * Sun planetary completion v3 — the DERIVED table on FRAMEWORK carriers
 * (FQ-5 N3, plan §12i; supersedes v2's IAU-literal argument rates, which
 * superseded the v1 fitted 10-term table).
 *
 * DERIVATION, not fit: the table is extracted from the framework's OWN
 * physics — twin epoch-phased 8-body RK4 integrations (Sun, planets, EMB)
 * built entirely from framework constants, planet phases taken from the
 * engine scene graph, differenced full-vs-base3 to isolate the planetary
 * signal, with the EMB secular-perihelion channel projected out (that
 * channel belongs to the framework's own ϖ(t)/e(t) laws). The 70 terms
 * below are the analytic reading of that derived signal: main synodic
 * tones plus eccentricity-modulation sidebands (main ± mean anomaly of
 * the modulating planet, main ± M_E). Table-vs-signal fidelity 0.61″
 * (the v2 IAU-carrier projection read 0.64″ — the framework carriers are
 * the signal's NATURAL basis, since the lab's tones sit at the framework
 * synodic frequencies). JPL Horizons enters only as VALIDATION, never as
 * fit target. Instruments: tools/explore/d2-derived-sun.mjs (signal),
 * n2-sun-framework-carriers.mjs (carrier feasibility + conditioning),
 * n3-carrier-swap-preview.mjs (table + the swap gates).
 *
 * THE CARRIERS (FQ-5 N3, the doctrine's final mile for the Sun side):
 * the six planetary mean-longitude RATES are no longer instrument
 * literals — they are INJECTED by the model wiring, computed live from
 * the framework's own planet records (one revolution per the record's
 * tropical period; Earth from the framework mean solar year), as is the
 * Moon-elongation rate for the EMB-wobble carrier. The J2000 phase
 * anchors (ARG_L0, PERI, D0) remain declared epoch constants — the
 * "anchored by design" class; any constant phase offset is absorbed into
 * the fitted cos/sin split exactly. N3 gates measured before the swap:
 * all-phase JPL sd 2.15″ → 2.14″ (unchanged), syzygy fleet unchanged to
 * 0.01″, BCE arbitration detrended sd 0.199 min ≈ 5.5 km — below the
 * ancient corpus's discriminating power; conditioning probe: the v2 and
 * v3 composed tables agree at 0.146″ RMS in-window, diverging only
 * 0.93″ at ±600 yr (benign near-degenerate repartition, no
 * ill-conditioning).
 *
 * DECLARED INPUTS (the remaining non-framework residues):
 *  (i)  planet/Sun mass ratios — observed IAU constants (shared with the
 *       whole framework; nothing here fits them);
 *  (ii) the J2000 phase anchors ARG_L0 / PERI / D0 — epoch initial
 *       conditions ("anchored by design" class; the RATES are now
 *       framework-derived, injected);
 *  (iii) the 2lE term (+1.42″ sin 2lE) — DECLARED FITTED, not derived: a
 *       finder-annual artifact, measured chain-independent at E4/E5
 *       (re-fit noise −0.12″/−0.03″). Everything else in this file is
 *       derived. The Earth-around-EMB wobble is DERIVED: amplitude
 *       a_M·μ/AU with μ = 1/(1+M_E/M_M), injected by the model wiring
 *       from live package constants (6.4399″ at current constants), sign
 *       negative in the subtract convention.
 *
 * THE CONSTANT-ATTRIBUTION RULE (v1's 20.3h-lite trap, still honored):
 * the table carries NO constant term — the constant is attributed to the
 * tier's existing anchors, so the terms ship without the +6″ syzygy-mean
 * penalty an eclipse-sample fit produced.
 *
 * Sign convention: unchanged — the evaluation models (framework − truth),
 * so consumers SUBTRACT it from the finder Sun longitude. TERMS literals
 * are stored in the extraction's native sign
 * (n3-framework-table.local.json) and negated in the evaluator.
 *
 * MATCHED PAIR: the amplitudes are the residual of the CURRENT finder
 * Sun chain AND pair with the injected carrier rates — re-derive the
 * table (the N2/N3 instrument chain) whenever either moves: a Step-0
 * SUN_HARMONICS refit, an eccentricity/perihelion definition change, or
 * a planet-record period change. ENFORCED: PAIRED_SUN_HARMONICS_SHA256
 * below is the fingerprint of the SUN_LONGITUDE_HARMONICS this table was
 * derived under; the create-model parity gate (test:model, in `npm run
 * check`) recomputes it from live constants and fails on mismatch. The
 * carrier↔table pairing is enforced by both living in this one module
 * with the rates injected from the same constants the records read. The
 * api centerline gate (≤8″ shadow-plane) backstops gross staleness
 * independently.
 *
 * FQ-5 N2 RECORD (the carrier attribution): 8/10 carriers measured
 * framework-expressible at <0.1″ induced error (e3b-argument-attribution
 * E0); the Delaunay pair Mp/F FAILED exact closure (the framework
 * composition carries a 16.9″/cy catalog-input residual ≡ 0.26 μd of
 * sidereal month) and stays a DECLARED INPUT in moon/series-extension —
 * the documented negative of the pre-registered stop-gate.
 */

'use strict';

/** J2000 mean-longitude phase anchors (deg), body order Mercury, Venus,
 *  Earth (EMB), Mars, Jupiter, Saturn — declared epoch constants
 *  (header (ii)); the RATES are injected (framework-derived). */
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
/** J2000 perihelion longitudes (deg), same body order — mean anomaly
 *  M_X = l_X − ϖ_X; slow ϖ drift is absorbed by the sidebands over the
 *  valid window. */
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
/** Moon mean elongation J2000 phase anchor (deg) — the EMB-wobble
 *  carrier; its rate is injected (framework-derived). */
const ARG_D0 = 297.8501921;

/**
 * The derived table, extraction-native sign (negated in the evaluator):
 * [[6 mean-longitude multipliers lMe,lV,lE,lM,lJ,lS],
 *  [6 mean-anomaly multipliers MMe,MV,ME,MMa,MJ,MS], cos″, sin″].
 * 70 terms ≥ 0.05″ from the N3 framework-carrier extraction (79-term
 * LSQ on the D2 derived signal, fidelity 0.61″).
 * @type {Array<[number[], number[], number, number]>}
 */
const TERMS = [
  [[0, 0, 1, 0, -2, 0], [0, 0, 1, 0, 0, 0], 23.4846, 2.3099],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 0, 0], -1.7235, -14.0062],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 1, 0], 7.4894, -7.7252],
  [[0, 3, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], 5.7813, 1.7078],
  [[0, 3, -4, 0, 0, 0], [0, 0, 0, 0, 0, 0], 1.1877, 5.8649],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 0, 0], 1.6357, -4.9485],
  [[0, 2, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], -4.9053, -0.3900],
  [[0, 1, -1, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.1351, 4.8331],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 1, 0, 0], -0.2239, -3.1687],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 1, 0], -2.1749, -1.7705],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, -1, 0, 0], 0.8107, -2.5127],
  [[0, 0, 1, 0, -1, 0], [0, 0, -1, 0, 0, 0], -2.5403, -0.1821],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 0, 0, 0], -1.3152, -2.0575],
  [[0, 2, -2, 0, 0, 0], [0, 0, 0, 0, 0, 0], -1.8073, -0.8142],
  [[0, 3, -3, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.8611, 1.7708],
  [[0, 0, -1, 2, 0, 0], [0, 0, -1, 0, 0, 0], 1.2659, 1.1195],
  [[0, 0, 2, -2, 0, 0], [0, 0, -1, 0, 0, 0], 1.1646, 1.0865],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, -1, 0], 0.4560, -1.2051],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, -1, 0, 0], -0.2198, 1.2107],
  [[0, 3, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.5260, -1.0137],
  [[0, 2, -2, 0, 0, 0], [0, 0, -1, 0, 0, 0], -1.1195, 0.1107],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 0, 0, 0], 0.8202, -0.7125],
  [[0, 3, -4, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.9722, 0.3524],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 0, 0, 0], 0.9763, -0.2018],
  [[0, 3, -4, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.1162, 0.9095],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, -1, 0, 0], 0.2940, 0.8000],
  [[0, 2, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.2210, -0.6939],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, -1, 0], -0.2188, 0.6572],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 0, 0], 0.6135, 0.3150],
  [[0, 1, -1, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.6161, -0.1008],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 1, 0, 0], 0.4387, -0.4123],
  [[0, 0, 2, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.1825, 0.5176],
  [[0, 2, -3, 0, 0, 0], [0, 1, 0, 0, 0, 0], 0.1125, -0.5348],
  [[0, 0, -2, 4, 0, 0], [0, 0, -1, 0, 0, 0], -0.4800, 0.2245],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 0], 0.0845, -0.4012],
  [[0, 0, 1, 0, -1, 0], [0, 0, 1, 0, 0, 0], 0.1622, -0.3517],
  [[0, 0, 2, 0, -3, 0], [0, 0, -1, 0, 0, 0], 0.3786, 0.0361],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, -1, 0, 0], 0.0701, -0.3556],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 0, 0, 0], -0.2643, -0.2045],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 1, 0], 0.2650, -0.1462],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 1], 0.3016, 0.0060],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 1, 0, 0], -0.0582, -0.2912],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 1, 0], -0.2051, -0.2135],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, -1, 0], 0.0858, 0.2762],
  [[0, 0, 2, -3, 0, 0], [0, 0, -1, 0, 0, 0], 0.1911, 0.2163],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, -1, 0, 0], 0.2815, -0.0450],
  [[0, 2, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.2490, 0.0551],
  [[0, 0, 1, 0, 0, -1], [0, 0, -1, 0, 0, 0], -0.0456, 0.2371],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 0, 0], 0.1560, -0.1469],
  [[0, 3, -4, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.1412, 0.1568],
  [[0, 3, -4, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.1616, -0.1314],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, 0, 0, 0], 0.1728, -0.0849],
  [[0, 1, -1, 0, 0, 0], [0, 0, -1, 0, 0, 0], -0.0449, 0.1649],
  [[0, 0, 2, 0, -3, 0], [0, 0, 1, 0, 0, 0], 0.1632, -0.0164],
  [[0, 2, -2, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.0534, -0.1430],
  [[0, 0, 2, -3, 0, 0], [0, 0, 1, 0, 0, 0], 0.1316, -0.0275],
  [[0, 0, -2, 4, 0, 0], [0, 0, 1, 0, 0, 0], 0.1216, 0.0451],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 1, 0, 0], -0.1046, 0.0620],
  [[0, 0, 1, -1, 0, 0], [0, 0, 1, 0, 0, 0], -0.1075, -0.0488],
  [[0, 0, 2, 0, 0, -2], [0, 0, 0, 0, 0, 0], -0.0385, 0.1030],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, -1], -0.0308, 0.1049],
  [[0, 1, -1, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0875, -0.0250],
  [[0, 0, 1, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.0738, 0.0295],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, -1, 0], 0.0097, 0.0787],
  [[0, 1, -1, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0016, 0.0762],
  [[0, 2, -2, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.0562, -0.0490],
  [[0, 3, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.0638, -0.0362],
  [[0, 0, 2, 0, -2, 0], [0, 0, 1, 0, 0, 0], -0.0085, 0.0686],
  [[0, 2, -2, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0453, 0.0505],
  [[0, 0, 1, -1, 0, 0], [0, 0, -1, 0, 0, 0], -0.0353, -0.0379],
];

/** The declared-fitted semiannual leftover (header (iii)): +1.42″ sin 2lE. */
const FITTED_2LE_ARCSEC = 1.42;

const D2R = Math.PI / 180;

/**
 * @param {{ embWobbleArcsec: number,
 *           carrierRatesDegPerCy: { planets: number[], moonElongation: number } }} opts
 *   - embWobbleArcsec: the DERIVED Earth-around-EMB wobble amplitude
 *     a_M·μ/AU in arcsec (μ = 1/(1+M_E/M_M));
 *   - carrierRatesDegPerCy.planets: the six FRAMEWORK mean-longitude
 *     rates (deg/Julian-century TT), body order Me,V,E,Ma,J,S — one
 *     revolution per the model's own tropical period records;
 *   - carrierRatesDegPerCy.moonElongation: the framework Moon
 *     mean-elongation rate (deg/cy TT) for the EMB-wobble carrier.
 *   All computed from live constants by the model wiring so the
 *   carrier↔table matched pair tracks the constants.
 * @returns {{ sunPlanetaryCompletionDeg: (T: number) => number }}
 */
function createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy }) {
  if (!Number.isFinite(embWobbleArcsec)) {
    throw new Error('createSunPlanetaryCompletion: embWobbleArcsec must be a finite number (derived a_M·μ/AU in arcsec)');
  }
  const rates = carrierRatesDegPerCy;
  if (!rates || !Array.isArray(rates.planets) || rates.planets.length !== 6
      || rates.planets.some((r) => !Number.isFinite(r)) || !Number.isFinite(rates.moonElongation)) {
    throw new Error('createSunPlanetaryCompletion: carrierRatesDegPerCy must supply 6 finite planet rates (Me,V,E,Ma,J,S) and a finite moonElongation rate (deg/cy TT)');
  }
  const L1 = rates.planets, D1 = rates.moonElongation;
  /**
   * Planetary-completion correction to the finder Sun longitude.
   * @param {number} T - Julian centuries TT from J2000
   * @returns {number} degrees — SUBTRACT from the finder Sun longitude
   */
  function sunPlanetaryCompletionDeg(T) {
    const l = new Float64Array(6), M = new Float64Array(6);
    for (let i = 0; i < 6; i++) {
      l[i] = (ARG_L0[i] + L1[i] * T) * D2R;
      M[i] = l[i] - PERI[i] * D2R;
    }
    let table = 0;
    for (const [kl, kM, cA, sA] of TERMS) {
      let th = 0;
      for (let i = 0; i < 6; i++) th += kl[i] * l[i] + kM[i] * M[i];
      table += cA * Math.cos(th) + sA * Math.sin(th);
    }
    const D = (ARG_D0 + D1 * T) * D2R;
    const arcsec = -table - embWobbleArcsec * Math.sin(D)
      + FITTED_2LE_ARCSEC * Math.sin(2 * l[2]);
    return arcsec / 3600;
  }
  return { sunPlanetaryCompletionDeg };
}

/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1/v2: SUN_HARMONICS did not move in the D2 or N3
 *  landings. */
const PAIRED_SUN_HARMONICS_SHA256 = 'e2cf42e9770c9e0a';

/** sha256/16 of JSON.stringify([...planets, moonElongation]) — the seven
 *  full-precision carrier rates (deg/cy TT) the TERMS table was extracted
 *  under at N3. The model wiring recomputes the rates live from the planet
 *  records, so a planet-period / year / month input change moves the
 *  carriers automatically while the table stays frozen — a silent few-
 *  arcsec stale below the api gate's ≤8″ backstop. test:model recomputes
 *  this fingerprint from live constants (identical arithmetic to model.js)
 *  and fails on mismatch: re-run the N3 extraction chain
 *  (tools/explore/n2-sun-framework-carriers.mjs →
 *  n3-carrier-swap-preview.mjs), re-embed TERMS, and update this value. */
const PAIRED_CARRIER_RATES_SHA256 = '893e055ee12343bd';

module.exports = { createSunPlanetaryCompletion, PAIRED_SUN_HARMONICS_SHA256, PAIRED_CARRIER_RATES_SHA256 };
