/**
 * Layer 1 — derived views. Pure, composed only from Layer 0.
 *
 * The point of this layer is that TWO AXES DISAPPEAR (§2c):
 *
 *   "Kinematic" is not a code path. It is `f(2000)`.
 *   "RealLOD"  is not a function variant. It is a division by `lodSeconds(Y)`.
 *
 * Everything here is a year length expressed in DAYS, and a day is
 * `lodSeconds(Y)` — the epoch's own rotation period, not 86400 SI seconds. That
 * distinction is not cosmetic: the CSV measures JD intervals (SI days) while the
 * ESSRT chart is in real days, and detrending one against the other injects a
 * 2590 s ramp. Unit in the name, always.
 */

/**
 * @typedef {import('../layer0/index.js').EpochPrimitives} EpochPrimitives
 */

/**
 * @typedef {Object} DerivedViews
 * @property {(year: number) => number|null} tropicalYearDays
 * @property {(year: number) => number|null} siderealYearDays
 */

/**
 * @param {{primitives: EpochPrimitives}} deps
 * @returns {DerivedViews}
 */
export const createDerivedViews = ({ primitives: L0 }) => {
  /**
   * Days per year at the epoch's own day length. `null` past tidal lock, which
   * propagates rather than silently becoming Infinity.
   * @param {(year: number) => number|null} seconds
   * @returns {(year: number) => number|null}
   */
  const perDay = (seconds) => (year) => {
    const s = seconds(year);
    const lod = L0.lodSeconds(year);
    return (s === null || lod === null || lod === 0) ? null : s / lod;
  };

  const tropicalYearDays = perDay(L0.tropicalYearSeconds);
  const siderealYearDays = perDay(L0.siderealYearSeconds);

  // (Plan 09 step 5d: `anomalisticYearDays` — the H/16 device identity — and
  // `siderealYearDaysViaLattice` — the tropical year inverted through the
  // H/(H − 13) identity, kept to measure the browser's former two sidereal
  // globals against each other — left with the identities: the tropical year
  // of date is one equinox turn per T_p(t), and the anomalistic year of date
  // is published from the series' apsidal rate inside the one-family window.)

  return Object.freeze({
    tropicalYearDays,
    siderealYearDays,
  });
};
