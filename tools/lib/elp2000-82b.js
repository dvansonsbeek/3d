/**
 * elp2000-82b.js — evaluator for the ELP-2000/82B lunar series.
 *
 * Data: data/lunar-series/elp2000-82b/ (provenance, licences and the
 * verification against the IMCCE primary files ELP1..ELP36 are documented in
 * that folder's README). Two variants:
 *   'full'      37,863 terms — exact series
 *   'truncated'  3,402 terms — 0.001″ / 0.001 km truncation, ~11× faster
 *
 * This is REFERENCE data, not framework physics: the labs use it to check and
 * decompose the framework's own lunar theory against the published classical
 * series (docs/66 §1).
 *
 * Frames. ELP's mean longitude W1 is referred to the INERTIAL mean ecliptic of
 * date; adding the accumulated general precession p_A gives the rotating
 * equinox of date that Meeus Ch. 47 uses. Callers choose:
 *   evalMoon(t)                  → equinox-of-date longitude (Meeus-comparable)
 *   evalMoon(t, {inertial:true}) → inertial ecliptic longitude (dynamics)
 */

const fs = require('fs');
const path = require('path');

const DEG = Math.PI / 180;
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'lunar-series', 'elp2000-82b');

// ── Fundamental arguments (degrees; t in Julian centuries from J2000) ───────
const dms = (d, m, s) => d + m / 60 + s / 3600;
const W1 = [dms(218, 18, 59.95571), 1732559343.73604 / 3600, -5.8883 / 3600, 0.006604 / 3600, -0.00003169 / 3600];
const W2 = [dms(83, 21, 11.67475), 14643420.2632 / 3600, -38.2776 / 3600, -0.045047 / 3600, 0.00021301 / 3600];
const W3 = [dms(125, 2, 40.39816), -6967919.3622 / 3600, 6.3622 / 3600, 0.007625 / 3600, -0.00003586 / 3600];
const TE = [dms(100, 27, 59.22059), 129597742.2758 / 3600, -0.0202 / 3600, 0.000009 / 3600, 0.00000015 / 3600];
const OB = [dms(102, 56, 14.42753), 1161.2283 / 3600, 0.5327 / 3600, -0.000138 / 3600, 0];
const PREC = [0, 5029.0966 / 3600, 1.1120 / 3600, 0.000077 / 3600, 0];
const PLAN = {
  Me: [dms(252, 15, 3.25986), 538101628.68898 / 3600], V: [dms(181, 58, 47.28305), 210664136.43355 / 3600],
  T: [dms(100, 27, 59.22059), 129597742.2758 / 3600], Ma: [dms(355, 25, 59.78866), 68905077.59284 / 3600],
  J: [dms(34, 21, 5.34212), 10925660.42861 / 3600], S: [dms(50, 4, 38.89694), 4399609.65932 / 3600],
  U: [dms(314, 3, 18.01841), 1542481.19393 / 3600], N: [dms(304, 20, 55.19575), 786550.32074 / 3600],
};
const poly = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] || 0))));

// series families: file triplets (lon/lat/dist), argument style, power of t
const FAM = [
  { name: 'main', files: [1, 2, 3], style: 'main', tp: 0 },
  { name: 'figure', files: [4, 5, 6], style: 'zdlf', tp: 0 },
  { name: 'figure×t', files: [7, 8, 9], style: 'zdlf', tp: 1 },
  { name: 'plan1', files: [10, 11, 12], style: 'plan1', tp: 0 },
  { name: 'plan1×t', files: [13, 14, 15], style: 'plan1', tp: 1 },
  { name: 'plan2', files: [16, 17, 18], style: 'plan2', tp: 0 },
  { name: 'plan2×t', files: [19, 20, 21], style: 'plan2', tp: 1 },
  { name: 'tides', files: [22, 23, 24], style: 'zdlf', tp: 0 },
  { name: 'tides×t', files: [25, 26, 27], style: 'zdlf', tp: 1 },
  { name: 'moonfig', files: [28, 29, 30], style: 'zdlf', tp: 0 },
  { name: 'rel', files: [31, 32, 33], style: 'zdlf', tp: 0 },
  { name: 'solarecc', files: [34, 35, 36], style: 'zdlf', tp: 2 },
];

const _cache = {};
function load(variant = 'truncated') {
  if (_cache[variant]) return _cache[variant];
  const file = variant === 'full' ? 'moon-elp2000-82b-full.json' : 'moon-elp2000-82b.json';
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) {
    throw new Error(`ELP series not found at ${p} — see data/lunar-series/README.md`);
  }
  _cache[variant] = JSON.parse(fs.readFileSync(p, 'utf8'));
  return _cache[variant];
}

function termCount(variant = 'truncated') {
  const S = load(variant);
  return Object.values(S).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
}

function args(t) {
  const w1 = poly(W1, t), w2 = poly(W2, t), w3 = poly(W3, t), Te = poly(TE, t), ob = poly(OB, t);
  return {
    D: w1 - Te + 180, lp: Te - ob, l: w1 - w2, F: w1 - w3,
    W1: w1, W2: w2, W3: w3, zeta: w1 + poly(PREC, t), precAcc: poly(PREC, t),
    P: Object.fromEntries(Object.entries(PLAN).map(([k, c]) => [k, c[0] + c[1] * t])),
  };
}

/**
 * Evaluate the Moon's geocentric ecliptic position.
 * @param {number} t Julian centuries from J2000 (TT)
 * @param {object} [opt] {variant:'truncated'|'full', families:string[]|null, inertial:boolean}
 * @returns {{lon:number, lat:number, dist:number, W1:number, W3:number}}
 *          lon/lat in degrees, dist in km.
 */
function evalMoon(t, opt = {}) {
  const { variant = 'truncated', families = null, inertial = false } = opt;
  const S = load(variant);
  const A = args(t);
  let lon = 0, lat = 0, dist = 0;   // arcsec, arcsec, km
  for (const fam of FAM) {
    if (families && !families.includes(fam.name)) continue;
    const tp = Math.pow(t, fam.tp);
    for (let j = 0; j < 3; j++) {
      const rows = S['ELP' + String(fam.files[j]).padStart(2, '0')];
      if (!Array.isArray(rows)) continue;
      let sum = 0;
      for (const r of rows) {
        let arg;
        if (fam.style === 'main') {
          arg = r.i1 * A.D + r.i2 * A.lp + r.i3 * A.l + r.i4 * A.F;
          sum += (j === 2) ? r.A * Math.cos(arg * DEG) : r.A * Math.sin(arg * DEG);
          continue;
        } else if (fam.style === 'zdlf') {
          arg = r.i1 * A.zeta + r.i2 * A.D + r.i3 * A.lp + r.i4 * A.l + r.i5 * A.F + r.phi;
        } else if (fam.style === 'plan1') {
          arg = r.i1 * A.P.Me + r.i2 * A.P.V + r.i3 * A.P.T + r.i4 * A.P.Ma + r.i5 * A.P.J
              + r.i6 * A.P.S + r.i7 * A.P.U + r.i8 * A.P.N + r.i9 * A.D + r.i10 * A.l + r.i11 * A.F + r.phi;
        } else {
          arg = r.i1 * A.P.Me + r.i2 * A.P.V + r.i3 * A.P.T + r.i4 * A.P.Ma + r.i5 * A.P.J
              + r.i6 * A.P.S + r.i7 * A.P.U + r.i8 * A.D + r.i9 * A.lp + r.i10 * A.l + r.i11 * A.F + r.phi;
        }
        sum += r.A * Math.sin(arg * DEG);
      }
      if (j === 0) lon += sum * tp; else if (j === 1) lat += sum * tp; else dist += sum * tp;
    }
  }
  return {
    lon: A.W1 + lon / 3600 + (inertial ? 0 : A.precAcc),
    lat: lat / 3600,
    dist,
    W1: A.W1,
    W3: A.W3,
  };
}

module.exports = { evalMoon, args, termCount, load, FAM, W1poly: W1, W3poly: W3, PREC };
