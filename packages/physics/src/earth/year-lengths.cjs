'use strict';
// THE ONE HOME for the of-date year lengths and their precession beats
// (owner: "analyze how many implementations we have and move to 1").
//
// Before this factory the family lived in four-plus places (the frozen
// Fourier laws, the λ̇ channel, per-surface cardinal-structure wirings
// with two different mean chains, and scene measurements mixed into
// beats) — and the owner caught the cost: a panel beat of 25,760.8 where
// the report said 25,771.4, because a 0.5 s FAMILY mismatch between the
// pair's members is amplified ~20×/s by P = T_s/(T_s − T_t).
//
// The rules this factory owns:
//   • ONE FAMILY: tropical = massLoss·(1 − p_geom/360) with p_geom the
//     movement's own equinox rate (wobble included); sidereal = the D6
//     λ̇ channel; anomalistic = the SECULAR mean-element construction on
//     the chain's apsidal tangent (the injected fn — the same rate family
//     the panel's Prec. cell shows; structure fallback when absent); every
//     value λ̇-corrected coherently (rate form — beats invariant to
//     second order).
//   • ONE BASIS: SI seconds (days = seconds/86400 at the caller).
//   • BEATS FROM THE PAIR: each precession period is computed from the
//     two years THIS factory returns — recomputing a beat from the
//     displayed/served values reproduces it exactly.
//   • Scene MEASUREMENTS validate this family (sub-0.5 s, the report's
//     measured columns); they are instruments, never mixed into beats.
//   • The frozen era clock stays the certified era device (opt-out /
//     era-certification record), not a member of this family.

const { createCardinalStructure } = require('../cardinal/one-source-structure.cjs');
const { createSiderealYearChannel } = require('./sidereal-year-channel.cjs');

/**
 * @param {{
 *   sampleAt: (year: number) => {e: number, periOfDateDeg: number, equinoxLonJ2000Deg: number},
 *   massLossSiderealSecondsAtYearFn: (year: number) => number,
 *   apsidalSecularDegPerYrFn?: (year: number) => number,
 * }} opts
 *   sampleAt: the one-source movement sampler, calendar-year keyed
 *   (createDeepOrbitalHistory build().at wrapped by the caller — series
 *   tier where the artifact is available, mode tail beyond).
 *   massLossSiderealSecondsAtYearFn: the caller's secular mass-loss
 *   sidereal-year law, SI seconds, IAU-anchored at J2000.
 *   apsidalSecularDegPerYrFn: the chain's SECULAR apsidal tangent of date
 *   (keplerian-chain computeApsidalSecularDegPerYr for Earth — deg/yr,
 *   J2000-ecliptic frame). When given, the anomalistic year is the
 *   mean-element construction on this smooth rate; when absent, it falls
 *   back to the cardinal structure's measured year-over-year interval
 *   (which carries the banked series' century-scale ϖ̇ wobble).
 */
function createYearLengths({ sampleAt, massLossSiderealSecondsAtYearFn, apsidalSecularDegPerYrFn }) {
  if (typeof sampleAt !== 'function' || typeof massLossSiderealSecondsAtYearFn !== 'function') {
    throw new Error('createYearLengths: sampleAt and massLossSiderealSecondsAtYearFn are required');
  }
  const w180 = (/** @type {number} */ d) => ((d + 540) % 360) - 180;
  const chan = createSiderealYearChannel({ massLossSiderealSecondsAtYearFn });
  // The mean tropical year OF DATE, raw (pre-λ̇): the movement's own
  // equinox-rate form — carries the real precession-rate wobble, unlike
  // the smooth secular mean (a wobble-free mean under a wobbling family
  // was one of the duplicated implementations this factory retires).
  const tropicalRawSeconds = (/** @type {number} */ year) => {
    const p = w180(sampleAt(year - 0.5).equinoxLonJ2000Deg
      - sampleAt(year + 0.5).equinoxLonJ2000Deg);          // retrograde → positive
    return massLossSiderealSecondsAtYearFn(year) * (1 - p / 360);
  };
  const structure = createCardinalStructure({
    sampleAt,
    tropicalYearSecondsAtYearFn: tropicalRawSeconds,
  });
  const trop = (/** @type {number} */ year) => chan.correctedYearSeconds(year, tropicalRawSeconds(year));
  const sid = (/** @type {number} */ year) => chan.siderealYearSecondsAtYear(year);
  // The anomalistic year OF DATE — the SECULAR (mean-element) construction
  // when the chain tangent is injected: T_anom_raw = T_sid_raw·360/(360 − w)
  // with w = dϖ/dt (deg/yr, J2000-ecliptic, the SAME rate family the panel's
  // Prec. cell shows), then λ̇-corrected coherently. The displayed beat
  // anom/(anom − sid) then equals the chain period 360/w EXACTLY at J2000
  // (the rate-form correction leaves beats invariant), and the J2000 value
  // lands +0.07 s from the published mean-element 365.259636 d. The former
  // structure form (the year-over-year interval on the banked series) read
  // the series' century-scale ϖ̇ wobble — ±0.015″/yr ≈ ±0.35 s, an alias at
  // the series' 250-yr sampling — and sat +0.20 s above the smooth tangent
  // at J2000 (owner-found: the panel beat read 111,491 where the Prec. cell
  // read 111,570). The measured-interval form stays on the cardinal
  // structure for callers that want the wobble.
  const anom = apsidalSecularDegPerYrFn
    ? (/** @type {number} */ year) => chan.correctedYearSeconds(year,
        massLossSiderealSecondsAtYearFn(year) * 360 / (360 - apsidalSecularDegPerYrFn(year)))
    : (/** @type {number} */ year) => chan.correctedYearSeconds(year, structure.anomalisticYearSeconds(year));

  return Object.freeze({
    /** Mean tropical year of date, SI seconds. @param {number} year */
    tropicalYearSecondsAtYear: trop,
    /** Sidereal year of date, SI seconds. @param {number} year */
    siderealYearSecondsAtYear: sid,
    /** Anomalistic year of date, SI seconds. @param {number} year */
    anomalisticYearSecondsAtYear: anom,
    /** Axial precession period of date (equinox regression beat), years. @param {number} y */
    axialPrecessionYearsAtYear: (y) => { const s = sid(y), t = trop(y); return s / (s - t); },
    /** Perihelion (apsidal-vs-equinox) precession period of date, years. @param {number} y */
    perihelionPrecessionYearsAtYear: (y) => { const a = anom(y), t = trop(y); return a / (a - t); },
    /** Inclination precession period of date, years (hypersensitive: ±1 s ↔ ≈400 yr). @param {number} y */
    inclinationPrecessionYearsAtYear: (y) => { const a = anom(y), s = sid(y); return a / (a - s); },
    /** The per-cardinal layer (D6 rules: year lengths λ̇-corrected; offsets/spreads raw — μs-class/second-order there). */
    cardinal: Object.freeze({
      /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
      yearLengthSeconds: (y, type) => chan.correctedYearSeconds(y, structure.yearLengthSeconds(y, type)),
      /** @param {number} y @param {'VE'|'SS'|'AE'|'WS'} type */
      eocOffsetSeconds: (y, type) => structure.eocOffsetSeconds(y, type),
      /** @param {number} y */
      spreadSeconds: (y) => structure.spreadSeconds(y),
    }),
    /** The planetary λ̇ ratio (diagnostic; ≡1 at J2000). */
    planetaryRelAtYear: chan.planetaryRelAtYear,
  });
}

module.exports = { createYearLengths };
