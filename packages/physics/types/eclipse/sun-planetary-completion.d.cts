/**
 * @param {{ embWobbleArcsec: number,
 *           carrierRatesDegPerCy: { planets: number[], moonElongation: number },
 *           eccVectorOfDate?: (bodyIndex: number, T: number) => [number, number],
 *           moonElongationDegAtT?: (T: number) => number }} opts
 *   - embWobbleArcsec: the DERIVED Earth-around-EMB wobble amplitude
 *     a_M·μ/AU in arcsec (μ = 1/(1+M_E/M_M));
 *   - carrierRatesDegPerCy.planets: the six mean-longitude rates (deg/
 *     Julian-century TT), body order Me,V,E,Ma,J,S — computeCarrierRatesDegPerCy
 *     (the model's own banked J2000 sidereal mean motions; Earth the framework
 *     sidereal year);
 *   - carrierRatesDegPerCy.moonElongation: the framework Moon
 *     mean-elongation rate (deg/cy TT) — the EMB-wobble carrier's rate when
 *     moonElongationDegAtT is absent;
 *   - eccVectorOfDate: the e-vectors of date for the D'Alembert rows (default:
 *     the embedded grid — the ONE source; an override is for instruments);
 *   - moonElongationDegAtT: the Moon's mean elongation OF DATE (deg) at T —
 *     the framework's own argument (ṅ included). The constant-rate carrier
 *     D₀ + D₁·T ran ~29° off it at ±9000 yr: the lunar equation (6.44″) read
 *     as the largest short-period line left against DE441 at −9000 (2.8″ at
 *     29.53 d; the −9000 bin's scatter 4.13 → 3.62″ on the argument of date).
 *   Injected by the model wiring so the carrier↔table matched pair tracks the
 *   constants and the embedded artifact.
 * @returns {{ sunPlanetaryCompletionDeg: (T: number) => number }}
 */
export function createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy, eccVectorOfDate, moonElongationDegAtT }: {
    embWobbleArcsec: number;
    carrierRatesDegPerCy: {
        planets: number[];
        moonElongation: number;
    };
    eccVectorOfDate?: (bodyIndex: number, T: number) => [number, number];
    moonElongationDegAtT?: (T: number) => number;
}): {
    sunPlanetaryCompletionDeg: (T: number) => number;
};
/**
 * The completion's CARRIER rates (deg per Julian century TT) — ONE home for the
 * model wiring and the matched-pair gate. Planets: the model's own banked J2000
 * sidereal mean motions (the embedded artifact; the former carriers were the
 * planet records' rounded of-date periods minus p₀ — Venus 4.1″/yr and Jupiter
 * 1.7″/yr off the run's own motion, 83° of the Venus–Earth argument at ±9000 yr).
 * Earth: the framework sidereal year (the D6 ratio-only doctrine for the run's
 * absolute Earth rate). Moon elongation: sidereal month vs sidereal year.
 * @param {{ meanSiderealYearDays: number, moonSiderealMonthDays: number }} c
 * @returns {{ planets: number[], moonElongation: number }}
 */
export function computeCarrierRatesDegPerCy({ meanSiderealYearDays, moonSiderealMonthDays }: {
    meanSiderealYearDays: number;
    moonSiderealMonthDays: number;
}): {
    planets: number[];
    moonElongation: number;
};
/**
 * The e-vector (e·cos ϖ, e·sin ϖ; ecliptic J2000) of a body at T Julian
 * centuries TT from J2000, from the embedded 1-kyr grid (linear between nodes,
 * held at the grid's ends). The ONE source for every runtime — an
 * artifact-less createModel() and the browser before its series load compute
 * the identical rows.
 * @param {number} bodyIndex 0 Me, 1 V, 2 E, 3 Ma, 4 J, 5 S (only 1–4 are embedded)
 * @param {number} T
 * @returns {[number, number]}
 */
export function eccVectorOfDateEmbedded(bodyIndex: number, T: number): [number, number];
/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1/v2: SUN_HARMONICS did not move in the D2 or N3
 *  landings. */
export const PAIRED_SUN_HARMONICS_SHA256: "cbc189cea1c20292";
/** sha256/16 of JSON.stringify([...planets, moonElongation]) — the seven
 *  full-precision carrier rates (deg/cy TT) the tables pair with: since plan
 *  06 I3 the model's own banked J2000 sidereal mean motions for the planets
 *  (the embedded sun-completion artifact), Earth the framework sidereal year,
 *  the Moon elongation from the sidereal month/year identity
 *  (computeCarrierRatesDegPerCy; the N3 short-period literals kept, the
 *  LONG_PERIOD_TERMS derived on these rates). The model wiring recomputes
 *  the rates live, so a series re-bank, a year or a month input change moves
 *  the carriers automatically while the tables stay frozen — a silent
 *  few-arcsec stale below the api gate's ≤12″ backstop. test:model recomputes
 *  this fingerprint from the live artifact + constants (identical arithmetic)
 *  and fails on mismatch: re-run the extraction chain
 *  (tools/explore/n2-sun-framework-carriers.mjs → i2-sidereal-carrier-table.mjs
 *  for the short-period rows, i3-long-period-dalembert.mjs for the long-period
 *  rows), re-embed the tables, and update this value. History: 2d066e92bae955e4
 *  was the I2 record-based carrier set. */
export const PAIRED_CARRIER_RATES_SHA256: "26552b86ad69eaf2";
