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
 * @property {(year: number) => number|null} anomalisticYearDays
 * @property {(year: number) => number|null} siderealYearDaysViaLattice
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
  const anomalisticYearDays = perDay(L0.anomalisticYearSeconds);

  /**
   * The sidereal year in days, reached the long way — from the tropical year
   * through the H/13 lattice identity instead of from sidereal seconds.
   *
   * ALGEBRAICALLY THE SAME NUMBER. `T_trop = T_sid·(H−13)/H`, so
   * `(T_trop/LOD)·H/(H−13)` cancels to `T_sid/LOD` — but the operation ORDER
   * differs, so it is not bit-identical everywhere. Measured across the fixture
   * grid: identical at six of seven epochs, 0.7 ULP apart at +0.3 Ma. The
   * browser shows exactly the same one-epoch split, which is how we know the
   * port is faithful rather than merely close.
   *
   * It exists because `src/script.js` carries BOTH as separate mutable globals
   * — `meansiderealyearlengthinDays` and `meansiderealyearlengthinDays_kinematic`
   * — and they hold the same value at every epoch once `recomputeEpochAnchors`
   * has run. They diverge only at module load, where one is the IAU anchor
   * (365.256363004) and the other is lattice-derived: the 118 ms of R16.
   *
   * So the "kinematic" variant was never a different quantity, only a
   * different arrival route with a different starting constant. Keeping the
   * route explicit here lets B.3 retire one global without asserting the
   * equality on faith.
   *
   * @param {number} year
   * @returns {number|null}
   */
  const siderealYearDaysViaLattice = (year) => {
    const trop = tropicalYearDays(year);
    const H = L0.holisticH(year);
    return (trop === null || H === null) ? null : trop * H / (H - 13);
  };

  return Object.freeze({
    tropicalYearDays,
    siderealYearDays,
    anomalisticYearDays,
    siderealYearDaysViaLattice,
  });
};
