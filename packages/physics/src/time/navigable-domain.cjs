'use strict';
/**
 * THE NAVIGABLE DOMAIN — ONE home (doc 111 §1.33, §1.36).
 *
 * How far the scene can be taken from J2000, in years, and therefore how far
 * every table that a deep jump reads is BUILT or BANKED: the two engines'
 * cumulative position tables (the JD ↔ scene-position grid — beyond its edge
 * the two directions extrapolated differently and the scene sat 44 kyr off at
 * −700 Myr, 817 kyr off at −2 Gyr), the lunar cumulative bank (the chain
 * counts, the two bounded Lp carriers and the Sun's mean-longitude table —
 * beyond its edge a jump integrated ε at 0.21 s per Myr: 8 min at −2 Gyr) and
 * the spin-axis checkpoint bank. Three tables had three edges (±500 Myr, ±600
 * Myr, −4,425/+1,000 Myr); this module is the one.
 *
 * The past edge is the cited Earth–Moon history's last sample (Farhat et al.
 * 2022: the distance is undefined beyond 4,429 Ma — refused, never
 * extrapolated) minus the integrators' margin: the one-source sampler's deep
 * tier walks two 5-kyr nodes past a query and each node's rate is a ±2.5-yr
 * central difference, and the engine year 2000 − N is 0.5 yr before the
 * chain's age N — 15 kyr, on the 5-kyr grid. The former edge (4,425 Myr, the
 * lunar-age constraint Farhat fit to) left the scene 4 Myr short of the
 * history's end: 1,360 solar days per sidereal year against the Genesis
 * chart's 1,591 at the last sample (owner, 2026-11-03). At this edge the chain
 * reads a = 6.2 R⊕, a 5.51-h day, 1,590 days per sidereal year; the spin walk
 * steps at 1/32 yr there (T_p 9.4 yr — the former 1-yr floor collapsed ε to
 * 0.0001°; the bank generator's edge row gates the schedule against a 1/64-yr
 * walk). The future edge is the
 * charts' full range. The MODEL's stated validity stays ±500 Myr (CLAUDE.md):
 * beyond it the deep lunar phase is reproducible, not converged, and the deep
 * obliquity is served as a band — the domain is where the scene can be LOOKED
 * AT, not where the model is certified.
 */
const NAVIGABLE_PAST_YEARS = 4428985000;   // years before the year 2000 (positive): 4,429 Ma − 15 kyr
const NAVIGABLE_FUTURE_YEARS = 1000e6;      // years after J2000

/** The grid of the one-source sampler's deep tier, years. */
const DEEP_TIER_GRID_YEARS = 5000;
/** The one-source sampler's deep tier (its 5-kyr grid): how far a read at `tYears` (years
 *  from 2000, negative = past) has the spin walk built, in years from 2000 (positive) — two
 *  grid nodes past the query, NEVER past the domain's edge in that direction. ONE home for
 *  the package's sampler and the scene's twin (plan 27 §8 K). Both edges are grid nodes and
 *  a read is clamped to them, so the interpolation never needs a node beyond; unclamped, a
 *  landing on the genesis edge walked 10 kyr past it at the 1/32-yr step the schedule takes
 *  there — 320,000 RK4 steps beyond a state the spin bank already holds (~6 s of the first
 *  landing in the browser, measured by CPU profile).
 *  The edge's margin (above) still holds the two nodes: the edge itself did not move.
 *  @param {number} tYears @returns {number} */
function deepTierWalkSpanYears(tYears) {
  const edge = tYears < 0 ? NAVIGABLE_PAST_YEARS : NAVIGABLE_FUTURE_YEARS;
  return Math.min(edge, Math.ceil((Math.abs(tYears) + 2 * DEEP_TIER_GRID_YEARS) / DEEP_TIER_GRID_YEARS) * DEEP_TIER_GRID_YEARS);
}

module.exports = { NAVIGABLE_PAST_YEARS, NAVIGABLE_FUTURE_YEARS, DEEP_TIER_GRID_YEARS, deepTierWalkSpanYears };
