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
export function createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy }: {
    embWobbleArcsec: number;
    carrierRatesDegPerCy: {
        planets: number[];
        moonElongation: number;
    };
}): {
    sunPlanetaryCompletionDeg: (T: number) => number;
};
/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1/v2: SUN_HARMONICS did not move in the D2 or N3
 *  landings. */
export const PAIRED_SUN_HARMONICS_SHA256: "cbc189cea1c20292";
/** sha256/16 of JSON.stringify([...planets, moonElongation]) — the seven
 *  full-precision carrier rates (deg/cy TT) the TERMS table pairs with:
 *  the SIDEREAL carriers of plan 06 I2 (record rate − the model's J2000
 *  precession; Earth the framework sidereal year; the N3 literals kept,
 *  the two long-period rows derived on these rates). The model wiring
 *  recomputes the rates live from the planet records, so a planet-period /
 *  year / month input change moves the carriers automatically while the
 *  table stays frozen — a silent few-arcsec stale below the api gate's
 *  ≤12″ backstop. test:model recomputes this fingerprint from live
 *  constants (identical arithmetic to model.js) and fails on mismatch:
 *  re-run the extraction chain (tools/explore/n2-sun-framework-carriers.mjs
 *  → i2-sidereal-carrier-table.mjs for the short-period rows,
 *  i2-long-inequality.mjs for the long-period rows), re-embed TERMS, and
 *  update this value. */
export const PAIRED_CARRIER_RATES_SHA256: "2d066e92bae955e4";
