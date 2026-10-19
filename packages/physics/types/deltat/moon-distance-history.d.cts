export type MoonDistanceTable = {
    /**
     * - ascending, 0 first, uniform 1-Myr step
     */
    ageMa: ReadonlyArray<number>;
    /**
     * - the distance column (any consistent unit; only ratios are read)
     */
    aEarthRadii: ReadonlyArray<number>;
};
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
export function createMoonDistanceHistory(deps: {
    table: MoonDistanceTable;
    aMoonNowMetres: number;
    alpha1PerMa: number;
}): {
    distanceMetresAtAge: (tMa: number) => number | null;
    slopeMetresPerMaAtAge: (tMa: number) => number | null;
    ratioAtAge: (tMa: number) => number | null;
    spanMa: number;
};
