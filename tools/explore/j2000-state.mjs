// THE ONE HOME for the campaign's J2000 seed state (doc 109; the
// "structural list has ONE home" rule applied to ourselves, 2026-09-02).
//
// HZ: JPL Horizons J2000 heliocentric state vectors (km, km/s; ecliptic-J2000
// frame — Earth's z-components ≈ 0), the seed of every N-body experiment in
// this campaign (audit, WH runs, bound experiments). Identical copies were
// hardcoded in seven scripts before this module existed; those copies remain
// as historical records of their runs — NEW scripts must import from here.
//
// GM_EM: the Earth–Moon barycentre GM (km³/s²) — read from the constants
// (GM_EARTH_MOON_SYSTEM), the same source the audit already used via
// derive-planetary-lunar-terms.js. Seven scripts carried it as a literal;
// none needed to.
//
// Helpers compute osculating elements from the vectors so no script ever
// hardcodes a rounded semi-major-axis or eccentricity table again (the
// rounded-a table in diagonal-ll-rates.mjs put Jupiter's and Saturn's bare
// rates off by ~1 % and manufactured a false integer pattern — measured).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');

export const AU_KM = 149597870.7;
export const GM_SUN = TL.GM_SUN;
export const GM_EM = TL.GM_EARTH_MOON_SYSTEM;
export const NAMES = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const gmOf = (k) => (k === 'earth' ? GM_EM : GM_SUN / TL.massRatioDE440[k]);

export const HZ = {
  mercury: [-1.946172635585e+7, -6.691327526352e+7, -3.679854343750e+6, 3.699499185728e+1, -1.116441592562e+1, -4.307628118658e+0],
  venus:   [-1.074564940522e+8, -4.885014975873e+6, 6.135634299718e+6, 1.381906029263e+0, -3.514029517645e+1, -5.600423382821e-1],
  earth:   [-2.650257688971e+7, 1.446939556280e+8, -1.704331902042e+2, -2.978644078798e+1, -5.478176822344e+0, 4.197340759138e-5],
  mars:    [2.080481406418e+8, -2.007052628224e+6, -5.156288959273e+6, 1.162672436605e+0, 2.629606453968e+1, 5.222970066951e-1],
  jupiter: [5.985675835979e+8, 4.396047284920e+8, -1.522686065302e+7, -7.909837688567e+0, 1.115613309734e+1, 1.308626770728e-1],
  saturn:  [9.583851242197e+8, 9.828564572112e+8, -5.521304749180e+7, -7.432021997941e+0, 6.735913712660e+0, 1.782497576763e-1],
  uranus:  [2.158975019759e+9, -2.054625247237e+9, -3.562548941967e+7, 4.637024235952e+0, 4.627657581334e+0, -4.289175880417e-2],
  neptune: [2.515046428529e+9, -3.738714513276e+9, 1.903227194039e+7, 4.465902049825e+0, 3.076627073142e+0, -1.660633585828e-1],
};

/** Osculating elements from the J2000 vectors. @param {string} p planet name */
export function osculAt(p) {
  const r = HZ[p].slice(0, 3), v = HZ[p].slice(3, 6), mu = GM_SUN + gmOf(p), rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const ex = (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn;
  const ey = (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn;
  const ez = (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn;
  const aKm = 1 / (2 / rn - (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) / mu);
  return { aAU: aKm / AU_KM, e: Math.hypot(ex, ey, ez), pomRad: Math.atan2(ey, ex) };
}
