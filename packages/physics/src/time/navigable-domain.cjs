'use strict';
/**
 * THE NAVIGABLE DOMAIN — ONE home (doc 111 §1.33).
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
 * The past edge is the last spin checkpoint inside the cited Earth–Moon
 * history (Farhat et al. 2022: the distance is undefined beyond 4,429 Ma, the
 * scene holds that age AT the edge); the future edge is the charts' full
 * range. The MODEL's stated validity stays ±500 Myr (CLAUDE.md): beyond it the
 * deep lunar phase is reproducible, not converged, and the deep obliquity is
 * served as a band — the domain is where the scene can be LOOKED AT, not where
 * the model is certified.
 */
const NAVIGABLE_PAST_YEARS = 4425e6;    // years before J2000 (positive)
const NAVIGABLE_FUTURE_YEARS = 1000e6;  // years after J2000

module.exports = { NAVIGABLE_PAST_YEARS, NAVIGABLE_FUTURE_YEARS };
