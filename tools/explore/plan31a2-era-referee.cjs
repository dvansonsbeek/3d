'use strict';
// Plan 31 A2 — the era referee for the tilt form (doc 111 §1.43): the Moon's
// geometric ecliptic λ/β against JPL Horizons DE441 (geocentric position
// vectors, ecliptic of J2000, weekly 1970–2049), precessed to the mean ecliptic
// and equinox of date (Meeus 21.5/21.7 from J2000). Forms compared on the same
// rows, on a self-contained Meeus Ch. 47 evaluation (the package's tables):
//   (a) Meeus verbatim: the three flattening terms in β (−2235 sin L′, +127, −115)
//   (b) the three terms replaced by an exact rotation of the plane by θ_Meeus = 2235 µ°
//   (c) the same with the model's θ(0) (the coupled solve, 8.30″)
//   (d) rotation applied to β only (λ untouched) — diagnoses the longitude share
//   (e) the SHIPPED composition (moon/plane-of-date.cjs): the rotation with the
//       anchor's first-order longitude share removed
// The question is differential; the referee's own frame bias cancels. The λ mean
// (−1.0″) reproduces the series' recorded anchor offset — the frame check.
// The Horizons rows live in plan31a2-horizons-moon-vectors.local.json
// (gitignored); `--fetch` rebuilds the cache deterministically from the API.
// Usage: node tools/explore/plan31a2-era-referee.cjs [--fetch]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(__dirname, 'plan31a2-horizons-moon-vectors.local.json');
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const { composeEclipticOfDate } = require(path.join(ROOT, 'packages/physics/src/moon/plane-of-date.cjs'));
const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600;
const QUERY = "format=text&COMMAND='301'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500@399'"
  + "&REF_PLANE='ECLIPTIC'&REF_SYSTEM='ICRF'&VEC_CORR='NONE'&VEC_TABLE='1'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'"
  + "&START_TIME='1970-01-01'&STOP_TIME='2049-12-31'&STEP_SIZE='7d'";

async function fetchRows() {
  const res = await fetch('https://ssd.jpl.nasa.gov/api/horizons.api?' + QUERY);
  if (!res.ok) throw new Error(`Horizons ${res.status}`);
  const txt = await res.text();
  const body = txt.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  const rows = [];
  for (const line of body) {
    const f = line.split(',').map((s) => s.trim());
    if (f.length < 5) continue;
    rows.push([Number(f[0]), Number(f[2]), Number(f[3]), Number(f[4])]);
  }
  return rows;
}

(async () => {
  if (process.argv.includes('--fetch') || !fs.existsSync(CACHE)) {
    const rows = await fetchRows();
    fs.writeFileSync(CACHE, JSON.stringify({
      _description: 'JPL Horizons DE441 — the Moon (301) geocentric (500@399) GEOMETRIC position vectors, km, ecliptic of J2000 (ICRF), VEC_CORR NONE, weekly 1970-01-01..2049-12-31, TDB; rows [jdTDB, x, y, z]. Rebuilt by tools/explore/plan31a2-era-referee.cjs --fetch.',
      query: QUERY, rows,
    }));
    console.log('fetched %d rows → %s', rows.length, path.relative(ROOT, CACHE));
  }
  const { rows } = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const { FITTED_COEFFICIENTS: F } = await import(path.join(ROOT, 'packages/physics/src/constants/coefficients.js'));
  const L = F.MEEUS_LONGITUDE_TERMS, B = F.MEEUS_LATITUDE_TERMS;
  const poly = (c, T) => c[0] + c[1] * T + c[2] * T * T + (c[3] || 0) * T * T * T + (c[4] || 0) * T * T * T * T;
  const ARGS = {
    Lp: [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000],
    D: [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000],
    M: [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000],
    Mp: [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000],
    F: [93.2720950, 483202.0175233, -0.0036539, -1 / 3526000, 1 / 863310000],
  };
  const sumTab = (tab, Dr, Mr, Mpr, Fr, E) => {
    let s = 0;
    for (const r of tab) {
      let t = r[4] * Math.sin(r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr);
      if (Math.abs(r[1]) === 1) t *= E; else if (Math.abs(r[1]) === 2) t *= E * E;
      s += t;
    }
    return s;
  };
  const evalAt = (T) => {
    const Lp = poly(ARGS.Lp, T), D = poly(ARGS.D, T), M = poly(ARGS.M, T), Mp = poly(ARGS.Mp, T), Fd = poly(ARGS.F, T);
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const Dr = D * D2R, Mr = M * D2R, Mpr = Mp * D2R, Fr = Fd * D2R, Lpr = Lp * D2R;
    const A1 = (119.75 + 131.849 * T) * D2R, A2 = (53.09 + 479264.290 * T) * D2R, A3 = (313.45 + 481266.484 * T) * D2R;
    const Sl = sumTab(L, Dr, Mr, Mpr, Fr, E) + 3958 * Math.sin(A1) + 1962 * Math.sin(Lpr - Fr) + 318 * Math.sin(A2);
    const Sb = sumTab(B, Dr, Mr, Mpr, Fr, E) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - Fr) + 175 * Math.sin(A1 + Fr);
    const three = -2235 * Math.sin(Lpr) + 127 * Math.sin(Lpr - Mpr) - 115 * Math.sin(Lpr + Mpr);
    return { lonDeg: Lp + Sl * 1e-6, latBaseDeg: Sb * 1e-6, threeDeg: three * 1e-6 };
  };
  const rotate = (lonDeg, latDeg, thetaDeg) => {
    const l = lonDeg * D2R, b = latDeg * D2R, t = thetaDeg * D2R;
    const x = Math.cos(b) * Math.cos(l), y = Math.cos(b) * Math.sin(l), z = Math.sin(b);
    const y2 = y * Math.cos(t) + z * Math.sin(t), z2 = -y * Math.sin(t) + z * Math.cos(t);
    return { lonDeg: Math.atan2(y2, x) * R2D, latDeg: Math.asin(z2) * R2D };
  };
  // Meeus 21.5 / 21.7 — J2000 ecliptic → mean ecliptic and equinox of date.
  const precess = (x, y, z, T) => {
    const eta = (47.0029 * T - 0.03302 * T * T + 0.000060 * T * T * T) / AS * D2R;
    const Pi = (174.876384 + (-869.8089 * T + 0.03536 * T * T) / AS) * D2R;
    const p = (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) / AS * D2R;
    const r = Math.hypot(x, y, z);
    const l0 = Math.atan2(y, x), b0 = Math.asin(z / r);
    const A = Math.cos(eta) * Math.sin(Pi - l0) * Math.cos(b0) - Math.sin(eta) * Math.sin(b0);
    const Bq = Math.cos(b0) * Math.cos(Pi - l0);
    const Cq = Math.cos(eta) * Math.sin(b0) + Math.sin(eta) * Math.sin(Pi - l0) * Math.cos(b0);
    return { lonDeg: (p + Pi - Math.atan2(A, Bq)) * R2D, latDeg: Math.asin(Cq) * R2D };
  };
  const wrap = (d) => ((d % 360) + 540) % 360 - 180;
  const THETA_MEEUS = 2235e-6, THETA_MODEL = DT.meanLaplaceTiltFromEclipticDegAtAge(0);
  const stats = () => ({ n: 0, sl: 0, sl2: 0, sb: 0, sb2: 0 });
  const S = { a: stats(), b: stats(), c: stats(), d: stats(), e: stats() };
  const add = (s, dl, db) => { s.n++; s.sl += dl; s.sl2 += dl * dl; s.sb += db; s.sb2 += db * db; };
  for (const [jd, x, y, z] of rows) {
    const T = (jd - 2451545.0) / 36525;
    const J = precess(x, y, z, T);
    const ev = evalAt(T);
    const a = { lonDeg: ev.lonDeg, latDeg: ev.latBaseDeg + ev.threeDeg };
    const b = rotate(ev.lonDeg, ev.latBaseDeg, THETA_MEEUS);
    const c = rotate(ev.lonDeg, ev.latBaseDeg, THETA_MODEL);
    const d = { lonDeg: ev.lonDeg, latDeg: b.latDeg };
    const e = composeEclipticOfDate(ev.lonDeg, ev.latBaseDeg, THETA_MEEUS, 1);
    for (const [k, v] of Object.entries({ a, b, c, d, e })) add(S[k], wrap(v.lonDeg - J.lonDeg) * AS, (v.latDeg - J.latDeg) * AS);
  }
  console.log('rows', rows.length, '(weekly 1970–2049, Horizons DE441 geometric, J2000 ecliptic → mean ecliptic of date by Meeus 21.5)');
  const names = { a: 'Meeus verbatim (three β terms)', b: 'rotation θ_Meeus (2235 µ°), both coordinates', c: `rotation θ_model (${(THETA_MODEL * AS).toFixed(2)}″), both coordinates`, d: 'rotation θ_Meeus, β only (λ untouched)', e: 'SHIPPED composition (rotation, the anchor\'s first-order λ share removed)' };
  for (const k of ['a', 'b', 'c', 'd', 'e']) {
    const s = S[k];
    const ml = s.sl / s.n, mb = s.sb / s.n;
    const sdl = Math.sqrt(s.sl2 / s.n - ml * ml), sdb = Math.sqrt(s.sb2 / s.n - mb * mb);
    console.log('%s  λ: mean %s″ sd %s″ | β: mean %s″ sd %s″   — %s', k, ml.toFixed(3).padStart(7), sdl.toFixed(3), mb.toFixed(3).padStart(7), sdb.toFixed(3), names[k]);
  }
})().catch((e) => { console.error(e); process.exit(1); });
