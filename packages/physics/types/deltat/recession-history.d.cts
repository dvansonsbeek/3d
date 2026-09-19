export type RecessionRegime = {
    /**
     * - regime boundary; quartic below, spline above
     */
    jointMa: number;
    /**
     * - interior knot ages (ascending)
     */
    knotAgesMa: number[];
    /**
     * - fitted knot distances
     */
    knotDistancesKm: number[];
    /**
     * - the Roche-crossing epoch
     */
    genesisMa: number;
    /**
     * - the rigid Roche endpoint
     */
    rocheLimitKm: number;
};
/**
 * @typedef {Object} RecessionRegime
 * @property {number} jointMa - regime boundary; quartic below, spline above
 * @property {number[]} knotAgesMa - interior knot ages (ascending)
 * @property {number[]} knotDistancesKm - fitted knot distances
 * @property {number} genesisMa - the Roche-crossing epoch
 * @property {number} rocheLimitKm - the rigid Roche endpoint
 */
/**
 * @param {{
 *   aMoonNowMetres: number,
 *   alpha1PerMa: number, alpha3PerMa3: number, alpha4PerMa4: number,
 *   regime: RecessionRegime,
 * }} deps
 * @returns {{ distanceMetresAtAge: (tMa: number) => number }}
 */
export function createMoonRecessionHistory(deps: {
    aMoonNowMetres: number;
    alpha1PerMa: number;
    alpha3PerMa3: number;
    alpha4PerMa4: number;
    regime: RecessionRegime;
}): {
    distanceMetresAtAge: (tMa: number) => number;
};
/**
 * The solar angular-momentum channels: L_EM(t) integrated backward from
 * J2000 with the ocean leak and the thermal-tide pump, explicit only
 * beyond jointMa. Absent this module, every consumer's L_EM is the J2000
 * constant — which remains the exact behaviour for t ≤ jointMa.
 *
 * @param {{
 *   lTotalJ2000KgM2S: number,
 *   mMoonAloneKg: number, gmEmM3PerS2: number, eFactorMoon: number,
 *   beta0: number,
 *   pumpStartMa: number, pumpEndMa: number, pumpFactor: number,
 *   jointMa: number, genesisMa: number,
 *   distanceMetresAtAge: (tMa: number) => number,
 *   stepMa?: number,
 * }} deps
 * @returns {{ lEmAtAgeKgm2S: (tMa: number) => number }}
 */
export function createSolarChannelBudget(deps: {
    lTotalJ2000KgM2S: number;
    mMoonAloneKg: number;
    gmEmM3PerS2: number;
    eFactorMoon: number;
    beta0: number;
    pumpStartMa: number;
    pumpEndMa: number;
    pumpFactor: number;
    jointMa: number;
    genesisMa: number;
    distanceMetresAtAge: (tMa: number) => number;
    stepMa?: number;
}): {
    lEmAtAgeKgm2S: (tMa: number) => number;
};
