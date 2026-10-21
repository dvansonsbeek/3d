/**
 * ΔT (TT − UT1) — the raw integral plus the cycle stack, memoized on the exact argument.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */

/** @param {import('./moon-epoch.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleDeltaT(ctx) {
  const { F, deepLod, dtCycles, yearToTMa } = ctx;
  /** @param {number} tMa @returns {number} */
  // Exact-argument memo (the alphaMemo pattern of deltat/deep-time-chain.js): the cardinal Newton
  // solve asks for ΔT at the SAME jd twice per step (jdTTFromUT in the
  // apparent Sun and again under the planetary completion) — measured 8.8 →
  // 5.6 ms per panel year (8 solves) at modern epochs, values bit-identical.
  /** @type {Map<number, number>} */
  const dtMemo = new Map();
  /** @param {number} tMa @returns {number} */
  const meanDeltaTSecondsAtAge = (tMa) => {
    if (tMa === 0) return 0;
    const hit = dtMemo.get(tMa);
    if (hit !== undefined) return hit;
    let result = deepLod.deltaTRawSecondsAtAge(tMa);
    const yearY = 2000 - tMa * 1e6;
    result += dtCycles.cycleDeltaTSecondsAt('bond', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('hallstatt', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose5', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose4', yearY);
    result += dtCycles.swingDeltaTSecondsAt(yearY);
    if (dtMemo.size >= 8192) dtMemo.clear();
    dtMemo.set(tMa, result);
    return result;
  };
  /** @param {number} year @returns {number} */
  const deltaTSeconds = (year) => F.DT_ANCHOR.deltaTStartSeconds + meanDeltaTSecondsAtAge(yearToTMa(year));   // the joint fit's anchor (plan 14: its own artifact)

  return { deltaTSeconds, meanDeltaTSecondsAtAge };
}
/** @typedef {import('./moon-epoch.js').Ctx & ReturnType<typeof assembleDeltaT>} Ctx */
