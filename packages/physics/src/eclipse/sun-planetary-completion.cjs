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
 *  (iii) RETIRED (FQ-7-Sun annual-channel attribution): the former
 *       declared-fitted +1.42″ sin 2lE term. It was fitted against a
 *       Sun-ALONE JPL comparison bridged by the leading nutation term
 *       only, and the attribution measured it as the semiannual
 *       nutation term −1.32″ sin(2F−2D+2Ω) ≡ −1.32″ sin 2lE in disguise
 *       (2M residual 0.13″ under that bridge, 1.43″ ≡ the term's
 *       negative under the fuller bridge). Nutation in longitude is a
 *       frame rotation common to Sun AND Moon — this chain keeps both
 *       bodies MEAN-of-date (mean obliquity, mean sidereal time; see
 *       besselian.cjs), so a Sun-only nutation term is a frame
 *       inconsistency for elongation. Removed: the nutation-free syzygy
 *       fleet improves 3.877 → 3.756″ and the fuller-bridged Sun
 *       comparison 2.344 → 2.123″ (fq7s-jpl-preview.mjs --no-2le;
 *       fq7s-annual-channel.mjs). This file now carries ZERO fitted
 *       constants. The Earth-around-EMB wobble is DERIVED: amplitude
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
 * LSQ on the D2 derived signal, fidelity 0.616″) — re-derived under the
 * ONE eccentricity law (unification; D2 combined residual 0.60″,
 * composed difference vs the previous table ≤1.5″ at the ancient presets,
 * detrended 0.033 min). Individual coefficients redistribute between the
 * near-degenerate ±M sideband families; only the composed function ships.
 * @type {Array<[number[], number[], number, number]>}
 */
const TERMS = [
  [[0, 3, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], -9.2558, -0.3232],
  [[0, 3, -4, 0, 0, 0], [0, 0, 0, 0, 0, 0], -0.1950, -9.2459],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 1, 0], -1.4662, -6.4341],
  [[0, 1, -1, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.1345, 4.8332],
  [[0, 2, -2, 0, 0, 0], [0, 0, 0, 0, 0, 0], -2.1364, -2.9549],
  [[0, 2, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], -2.8927, -1.1913],
  [[0, 0, 1, 0, -2, 0], [0, 0, 1, 0, 0, 0], 2.8982, -1.0900],
  [[0, 2, -2, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.7820, 2.8796],
  [[0, 0, 1, 0, -1, 0], [0, 0, -1, 0, 0, 0], -2.5401, -0.1829],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 0, 0], -0.2456, -2.1163],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, -1, 0, 0], 2.1028, 0.1572],
  [[0, 0, 2, -2, 0, 0], [0, 0, -1, 0, 0, 0], 2.0062, 0.4493],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 1, 0], 0.2164, 1.7839],
  [[0, 2, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], -1.5284, 0.8126],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, -1, 0], -0.9353, -1.1855],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 1, 0, 0], 0.4254, -1.4438],
  [[0, 3, -3, 0, 0, 0], [0, -1, 0, 0, 0, 0], -1.2408, 0.7438],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 0, 0], 1.3145, -0.1985],
  [[0, 0, 2, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.4728, 1.1130],
  [[0, 3, -4, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.9746, 0.3524],
  [[0, 0, -1, 2, 0, 0], [0, 0, -1, 0, 0, 0], -0.9141, -0.1697],
  [[0, 3, -4, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.7605, 0.1501],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, -1, 0, 0], 0.6794, -0.0282],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 0, 0, 0], -0.6021, 0.2300],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 0, 0], -0.2055, -0.6053],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 0, 0, 0], -0.6212, -0.0277],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 0, 0], 0.0277, 0.5852],
  [[0, 0, -2, 4, 0, 0], [0, 0, -1, 0, 0, 0], -0.4801, 0.2245],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, -1, 0, 0], 0.0605, -0.5014],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, 0, 0, 0], 0.4682, 0.1671],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 0, 0, 0], 0.2949, 0.3878],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 0], 0.0845, -0.4011],
  [[0, 2, -3, 0, 0, 0], [0, 1, 0, 0, 0, 0], 0.0589, -0.3744],
  [[0, 3, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], -0.3257, -0.1827],
  [[0, 0, 2, 0, -3, 0], [0, 0, -1, 0, 0, 0], 0.0149, 0.3557],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, -1, 0, 0], -0.3152, -0.0762],
  [[0, 3, -4, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.0714, 0.3142],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 1, 0, 0], 0.1331, -0.2622],
  [[0, 0, 2, -3, 0, 0], [0, 0, -1, 0, 0, 0], 0.2826, 0.0458],
  [[0, 2, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], -0.1689, -0.2243],
  [[0, 0, 1, 0, -1, 0], [0, 0, 1, 0, 0, 0], -0.0262, -0.2757],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 0, 0, 0], 0.2267, -0.1326],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, -1, 0], -0.2245, -0.0951],
  [[0, 0, 1, 0, 0, -1], [0, 0, -1, 0, 0, 0], -0.0453, 0.2368],
  [[0, 2, -2, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.2075, 0.0622],
  [[0, 3, -4, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.1413, 0.1567],
  [[0, 1, -1, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.0858, -0.1399],
  [[0, 0, 2, 0, -3, 0], [0, 0, 1, 0, 0, 0], 0.1632, -0.0164],
  [[0, 0, 2, -3, 0, 0], [0, 0, 1, 0, 0, 0], 0.1316, -0.0276],
  [[0, 0, -2, 4, 0, 0], [0, 0, 1, 0, 0, 0], 0.1219, 0.0452],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 1, 0], -0.1243, -0.0271],
  [[0, 1, -1, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.1139, -0.0172],
  [[0, 0, 2, 0, 0, -2], [0, 0, 0, 0, 0, 0], -0.0385, 0.1031],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, -1], -0.0309, 0.1052],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 1, 0], 0.0945, 0.0475],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, -1, 0, 0], -0.0981, -0.0051],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 1], -0.0827, 0.0500],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, -1, 0], 0.0866, -0.0204],
  [[0, 1, -1, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0085, -0.0855],
  [[0, 0, 1, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.0738, 0.0295],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, -1, 0], 0.0097, 0.0787],
  [[0, 1, -1, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0016, 0.0764],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 1, 0, 0], 0.0655, 0.0358],
  [[0, 3, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.0517, -0.0513],
  [[0, 0, 2, 0, -2, 0], [0, 0, 1, 0, 0, 0], -0.0085, 0.0687],
  [[0, 2, -2, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0274, 0.0580],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 1, 0, 0], 0.0521, 0.0217],
  [[0, 0, 1, -1, 0, 0], [0, 0, 1, 0, 0, 0], 0.0188, 0.0523],
  [[0, 2, -2, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0421, -0.0340],
  [[0, 0, 1, -1, 0, 0], [0, 0, -1, 0, 0, 0], -0.0353, -0.0379],
];

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
    const arcsec = -table - embWobbleArcsec * Math.sin(D);
    return arcsec / 3600;
  }
  return { sunPlanetaryCompletionDeg };
}

/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1/v2: SUN_HARMONICS did not move in the D2 or N3
 *  landings. */
const PAIRED_SUN_HARMONICS_SHA256 = 'cbc189cea1c20292';   // eccentricity unification: Step-0 refit → N2/N3 re-derived (fidelity 0.616″, 70 terms)

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
