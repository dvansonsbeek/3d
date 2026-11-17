'use strict';
/**
 * The constellations the ecliptic of date crosses — ONE home (plan 28 §F2, doc 111 §1.48).
 *
 * The IAU constellation boundaries are COORDINATE LINES of the B1875 equatorial frame (Delporte 1930): segments
 * of constant right ascension or declination in that frame. Roman (1987, PASP 99, 695; VizieR VI/42) turned them
 * into a lookup table of 357 boxes — for a position precessed to B1875, the first box with Dec ≥ DE_low and
 * RA_low ≤ RA < RA_up names the constellation — the same algorithm astropy's get_constellation runs (it precesses
 * the input to B1875 with its own precession and reads the same table). The table is an INPUT
 * (public/input/constellation-boundaries.json, written by tools/pipeline/import-constellation-boundaries.js from
 * the CfA VizieR mirror, pinned by canonical hash); this module reads it.
 *
 * The ecliptic of date is handed in as two unit vectors in the equatorial J2000 (ICRS) frame — its pole n̂ and its
 * equinox ê (the scene's own placement of the Earth's orbit and spin of date, R4; a gate reads the scene's and the
 * Node model's alike): a point at ecliptic longitude λ along it is ê cos λ + (n̂ × ê) sin λ. The thirteen (or more,
 * where a tilted ecliptic of date grazes a corner) crossings are found by walking λ in steps and bisecting each
 * change of name to 1e-6°, pure in the inputs. The precession J2000 → B1875 is the IAU 1976 accumulated-precession
 * rotation (Lieske et al. 1977: ζ_A, z_A, θ_A as cubics in Julian centuries; B1875.0 = JD 2405889.2588); against
 * the IAU 2006 angles over 125 years the difference is ~0.01″, far under the boundaries' own 1e-3° rounding — and
 * astropy referees the result.
 *
 * Exports the lookup (constellationAtJ2000), the crossings (eclipticCrossings) and the name of a longitude on a
 * crossing list (constellationAtLongitude).
 */

const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS2R = D2R / 3600;

/** The 88 IAU constellations: abbreviation → name (the IAU's list). */
const CONSTELLATION_NAMES = Object.freeze({
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila', Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga', Boo: 'Boötes', Cae: 'Caelum', Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici', CMa: 'Canis Major', CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus', Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon', Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Australis', CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux', Cyg: 'Cygnus', Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini', Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta', Leo: 'Leo', LMi: 'Leo Minor', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', Psc: 'Pisces', PsA: 'Piscis Austrinus', Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius', Scl: 'Sculptor', Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus', Tel: 'Telescopium', Tri: 'Triangulum', TrA: 'Triangulum Australe', Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo', Vol: 'Volans', Vul: 'Vulpecula',
});

/** The J2000 ecliptic in the equatorial J2000 frame: its pole from the IAU 2006 mean obliquity ε₀ = 84381.406″, its equinox the x axis. */
const ECLIPTIC_J2000_EQUATORIAL = Object.freeze({
  obliquityArcsec: 84381.406,
  pole: Object.freeze([0, -Math.sin(84381.406 * AS2R), Math.cos(84381.406 * AS2R)]),
  equinox: Object.freeze([1, 0, 0]),
});

/** B1875.0 as a Julian Date: JD(B) = 2415020.31352 + (B − 1900) × 365.242198781 (the Besselian year). */
const JD_B1875 = 2415020.31352 + (1875 - 1900) * 365.242198781;
const JD_J2000 = 2451545.0;

/**
 * The IAU 1976 precession rotation from J2000 to a Julian date (Lieske et al. 1977, A&A 58, 1): P = R3(−z_A)·R2(θ_A)·R3(−ζ_A),
 * returned as a 3 × 3 matrix applied to an equatorial J2000 unit vector.
 * @param {number} jd
 * @returns {number[][]}
 */
function precessionMatrixJ2000To(jd) {
  const T = (jd - JD_J2000) / 36525;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * AS2R;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * AS2R;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * AS2R;
  const cz = Math.cos(zeta), sz = Math.sin(zeta), ct = Math.cos(theta), st = Math.sin(theta), cZ = Math.cos(z), sZ = Math.sin(z);
  return [
    [cZ * ct * cz - sZ * sz, -cZ * ct * sz - sZ * cz, -cZ * st],
    [sZ * ct * cz + cZ * sz, -sZ * ct * sz + cZ * cz, -sZ * st],
    [st * cz, -st * sz, ct],
  ];
}
const P_J2000_TO_B1875 = precessionMatrixJ2000To(JD_B1875);

/**
 * @param {number[][]} M
 * @param {number[]} v
 * @returns {number[]}
 */
const apply = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];

/** @type {{ raLowHours: number, raUpHours: number, decLowDeg: number, abbr: string }[] | null} */
let BOXES = null;
/**
 * Load (or set) Roman's box table.
 * @param {{boxes: Array<{raLowHours: number, raUpHours: number, decLowDeg: number, abbr: string}>}} doc
 */
function setBoundaryTable(doc) { BOXES = doc.boxes; }
/** @returns {{ raLowHours: number, raUpHours: number, decLowDeg: number, abbr: string }[]} */
function boxes() {
  if (!BOXES) throw new Error('the constellation boundary table is not loaded — setBoundaryTable(public/input/constellation-boundaries.json) first');
  return BOXES;
}

/**
 * Roman's lookup in B1875 coordinates: the first box with Dec ≥ DE_low and RA_low ≤ RA < RA_up (RA in hours).
 * @param {number} raHoursB1875
 * @param {number} decDegB1875
 * @returns {string | null}  the IAU abbreviation
 */
function constellationAtB1875(raHoursB1875, decDegB1875) {
  const ra = ((raHoursB1875 % 24) + 24) % 24;
  for (const b of boxes()) if (decDegB1875 >= b.decLowDeg && ra >= b.raLowHours && ra < b.raUpHours) return b.abbr;
  return null;
}

/**
 * The constellation of an equatorial J2000 unit vector.
 * @param {number[]} vJ2000
 * @returns {string | null}
 */
function constellationOfVectorJ2000(vJ2000) {
  const v = apply(P_J2000_TO_B1875, vJ2000);
  const ra = Math.atan2(v[1], v[0]) * R2D / 15, dec = Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D;
  return constellationAtB1875(ra, dec);
}

/**
 * The constellation of a J2000 right ascension and declination (degrees).
 * @param {number} raDeg
 * @param {number} decDeg
 * @returns {string | null}
 */
function constellationAtJ2000(raDeg, decDeg) {
  const cd = Math.cos(decDeg * D2R);
  return constellationOfVectorJ2000([cd * Math.cos(raDeg * D2R), cd * Math.sin(raDeg * D2R), Math.sin(decDeg * D2R)]);
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/**
 * @param {number[]} a
 * @returns {number[]}
 */
const unit = (a) => { const n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; };

/**
 * The IAU name of an abbreviation (the abbreviation itself where unknown).
 * @param {string} abbr
 * @returns {string}
 */
function constellationName(abbr) { return /** @type {Record<string, string>} */ (CONSTELLATION_NAMES)[abbr] || abbr; }

/**
 * The ecliptic's own frame from its pole n̂ and equinox ê (equatorial J2000 unit vectors): x̂ = ê projected into the plane,
 * ŷ = n̂ × x̂ — ONE construction for the crossings, the gates and the referee record.
 * @param {number[]} poleJ2000
 * @param {number[]} equinoxJ2000
 * @returns {{n: number[], x: number[], y: number[]}}
 */
function eclipticFrame(poleJ2000, equinoxJ2000) {
  const n = unit(poleJ2000);
  const e0 = unit(equinoxJ2000), ne = n[0] * e0[0] + n[1] * e0[1] + n[2] * e0[2];
  const x = unit([e0[0] - ne * n[0], e0[1] - ne * n[1], e0[2] - ne * n[2]]);
  return { n, x, y: cross(n, x) };
}

/**
 * The equatorial J2000 unit vector of a point at ecliptic longitude λ (degrees) on an ecliptic.
 * @param {{n: number[], x: number[], y: number[]}} f  from eclipticFrame
 * @param {number} lonDeg
 * @returns {number[]}
 */
function eclipticPointJ2000(f, lonDeg) {
  const a = lonDeg * D2R, c = Math.cos(a), s = Math.sin(a);
  return [f.x[0] * c + f.y[0] * s, f.x[1] * c + f.y[1] * s, f.x[2] * c + f.y[2] * s];
}

/**
 * A J2000 unit vector's right ascension and declination (degrees, α in [0, 360)).
 * @param {number[]} v
 * @returns {{raDeg: number, decDeg: number}}
 */
function raDecOfVector(v) {
  return { raDeg: ((Math.atan2(v[1], v[0]) * R2D % 360) + 360) % 360, decDeg: Math.asin(Math.max(-1, Math.min(1, v[2] / Math.hypot(v[0], v[1], v[2])))) * R2D };
}

/**
 * The constellations along an ecliptic given by its pole n̂ and equinox ê (equatorial J2000 unit vectors): the ordered
 * crossings — each the longitude (degrees from ê, counterclockwise about n̂) where the ecliptic ENTERS a constellation —
 * walked in stepDeg steps and bisected to tolDeg. The ecliptic's own frame: x̂ = ê, ŷ = n̂ × ê.
 * @param {number[]} poleJ2000
 * @param {number[]} equinoxJ2000
 * @param {{stepDeg?: number, tolDeg?: number}} [opt]
 * @returns {Array<{abbr: string, name: string, lonDeg: number}>}
 */
function eclipticCrossings(poleJ2000, equinoxJ2000, opt = {}) {
  const stepDeg = opt.stepDeg ?? 0.25, tolDeg = opt.tolDeg ?? 1e-6;
  const f = eclipticFrame(poleJ2000, equinoxJ2000);
  const at = (/** @type {number} */ lonDeg) => constellationOfVectorJ2000(eclipticPointJ2000(f, lonDeg));
  const out = [];
  let prev = at(0);
  for (let lon = stepDeg; lon <= 360 + 1e-9; lon += stepDeg) {
    const cur = at(lon);
    if (cur === prev) continue;
    let lo = lon - stepDeg, hi = lon;   // at(lo) = prev, at(hi) = cur
    while (hi - lo > tolDeg) { const mid = (lo + hi) / 2; if (at(mid) === prev) lo = mid; else hi = mid; }
    const abbr = cur || '?';   // Roman's table covers the whole sky; '?' would mark a hole in the input
    out.push({ abbr, name: constellationName(abbr), lonDeg: hi % 360 });
    prev = cur;
  }
  out.sort((a, b) => a.lonDeg - b.lonDeg);
  return out;
}

/**
 * The constellation a longitude falls in on a crossing list (the last crossing at or before it, wrapping).
 * @param {Array<{abbr: string, name: string, lonDeg: number}>} crossings
 * @param {number} lonDeg
 * @returns {{abbr: string, name: string, lonDeg: number}}
 */
function constellationAtLongitude(crossings, lonDeg) {
  const lon = ((lonDeg % 360) + 360) % 360;
  let best = null;
  for (const c of crossings) if (c.lonDeg <= lon && (best === null || c.lonDeg > best.lonDeg)) best = c;
  return best || crossings[crossings.length - 1];
}

module.exports = { CONSTELLATION_NAMES, ECLIPTIC_J2000_EQUATORIAL, JD_B1875, precessionMatrixJ2000To, P_J2000_TO_B1875, setBoundaryTable, constellationName, constellationAtB1875, constellationOfVectorJ2000, constellationAtJ2000, eclipticFrame, eclipticPointJ2000, raDecOfVector, eclipticCrossings, constellationAtLongitude };
