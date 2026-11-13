'use strict';
// Plan 31 A2 — the lunar LATITUDE of date: the measurements the build rests on
// (doc 111 §1.43). Print-only; nothing written.
//   (A) the Laplace plane's tilt today against Meeus's flattening family
//       (−2235 µ° sin L′ and its e·θ sidebands);
//   (B) the era FORM — the three constants against an exact rotation of the
//       plane, on a self-contained Meeus Ch. 47 evaluation (the package's
//       tables, the era polynomials: the question is the form, 0.1″-class);
//   (C) the sizes by age on the shipped chain (the tilt, the free inclination,
//       the F-class scales, the orbit's inclination to the ecliptic);
//   (D) the F-class content of the three Meeus tables.
// Usage: node tools/explore/plan31a2-lunar-plane-measure.cjs
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const { createLunarPlaneScales } = require(path.join(ROOT, 'packages/physics/src/moon/plane-of-date.cjs'));
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const planeScalesAtAge = createLunarPlaneScales({ tiltDegAtAge: DT.meanLaplaceTiltFromEclipticDegAtAge, freeInclinationDegAtAge: DT.meanLunarFreeInclinationDegAtAge });

(async () => {
  const { FITTED_COEFFICIENTS: F } = await import(path.join(ROOT, 'packages/physics/src/constants/coefficients.js'));
  const L = F.MEEUS_LONGITUDE_TERMS, B = F.MEEUS_LATITUDE_TERMS, R = F.MEEUS_DISTANCE_TERMS.terms;

  // ── (A) identity at J2000 ────────────────────────────────────────────────
  const th0 = DT.meanLaplaceTiltFromEclipticDegAtAge(0);
  const iL0 = DT.meanLunarFreeInclinationDegAtAge(0);
  const e0 = 0.0549;
  console.log('(A) θ(0) model = %s µ° = %s″ ; Meeus −2235 sin L′ = 8.05″ ; ratio %s',
    (th0 * 1e6).toFixed(1), (th0 * 3600).toFixed(3), (th0 * 1e6 / 2235).toFixed(4));
  console.log('    e·θ sidebands: model %s µ° ; Meeus +127 sin(L′−M′) / −115 sin(L′+M′) ; mean 121', (th0 * 1e6 * e0).toFixed(1));
  console.log('    i_L(0) = %s° (the scene constant; Meeus leading term 5.128122°)', iL0.toFixed(4));

  // ── (B) era form — self-contained Meeus Ch. 47 ───────────────────────────
  const poly = (c, T) => c[0] + c[1] * T + c[2] * T * T + (c[3] || 0) * T * T * T + (c[4] || 0) * T * T * T * T;
  const ARGS = {
    Lp: [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000],
    D: [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000],
    M: [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000],
    Mp: [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000],
    F: [93.2720950, 483202.0175233, -0.0036539, -1 / 3526000, 1 / 863310000],
  };
  const sumTab = (tab, Dr, Mr, Mpr, Fr, E, fn) => {
    let s = 0;
    for (const r of tab) {
      let t = r[4] * fn(r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr);
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
    const Sl = sumTab(L, Dr, Mr, Mpr, Fr, E, Math.sin) + 3958 * Math.sin(A1) + 1962 * Math.sin(Lpr - Fr) + 318 * Math.sin(A2);
    const Sb = sumTab(B, Dr, Mr, Mpr, Fr, E, Math.sin) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - Fr) + 175 * Math.sin(A1 + Fr);
    const three = -2235 * Math.sin(Lpr) + 127 * Math.sin(Lpr - Mpr) - 115 * Math.sin(Lpr + Mpr);
    return { lonDeg: Lp + Sl * 1e-6, latBaseDeg: Sb * 1e-6, threeDeg: three * 1e-6, Lpr, Mpr, Fr };
  };
  const rotate = (lonDeg, latDeg, thetaDeg) => {
    const l = lonDeg * D2R, b = latDeg * D2R, t = thetaDeg * D2R;
    const x = Math.cos(b) * Math.cos(l), y = Math.cos(b) * Math.sin(l), z = Math.sin(b);
    const y2 = y * Math.cos(t) + z * Math.sin(t), z2 = -y * Math.sin(t) + z * Math.cos(t);
    return { lonDeg: Math.atan2(y2, x) * R2D, latDeg: Math.asin(z2) * R2D };
  };
  const wrap = (x) => ((x % 360) + 540) % 360 - 180;
  for (const spanYr of [100, 3000, 10000]) {
    let n = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0, mx1 = 0;
    for (let k = -2000; k <= 2000; k++) {
      const T = (k / 2000) * spanYr / 100 + 0.00037 * k / 36525 * 100; // de-phase from the month
      const ev = evalAt(T);
      const full = ev.latBaseDeg + ev.threeDeg;                   // Meeus's latitude
      const rM = rotate(ev.lonDeg, ev.latBaseDeg, 2235e-6);       // exact rotation, Meeus's angle, instead of the three terms
      const rT = rotate(ev.lonDeg, ev.latBaseDeg, th0);           // exact rotation, the model's angle
      const dLat = (rM.latDeg - full) * 3600, dLon = wrap(rM.lonDeg - ev.lonDeg) * 3600;
      const dTh = (rT.latDeg - rM.latDeg) * 3600;
      const linTrue = -2235e-6 * Math.sin(ev.lonDeg * D2R);       // first order on the TRUE longitude
      const dLin = (linTrue - ev.threeDeg) * 3600;
      const two = (-2235e-6 * Math.sin(ev.Lpr) + 127e-6 * Math.sin(ev.Lpr - ev.Mpr) - 123e-6 * Math.sin(ev.Lpr + ev.Mpr));
      const dSym = (two - ev.threeDeg) * 3600;                    // the asymmetry 127/−115 vs 127/−123 alone
      n++; s1 += dLat * dLat; s2 += dLon * dLon; s3 += dTh * dTh; s4 += dLin * dLin; s5 += dSym * dSym;
      if (Math.abs(dLat) > mx1) mx1 = Math.abs(dLat);
    }
    console.log('(B) ±%d yr: rot(θ_Meeus) − Meeus three terms: lat rms %s″ max %s″, lon rms %s″ | −θ sin λ_true − three: %s″ | sideband asymmetry alone: %s″ | θ_model − θ_Meeus: %s″ rms',
      spanYr, Math.sqrt(s1 / n).toFixed(4), mx1.toFixed(4), Math.sqrt(s2 / n).toFixed(4), Math.sqrt(s4 / n).toFixed(4), Math.sqrt(s5 / n).toFixed(4), Math.sqrt(s3 / n).toFixed(4));
  }

  // ── (C) depth ────────────────────────────────────────────────────────────
  console.log('\n(C)   age   a(R⊕)     θ(°)     i_L(°)   band   s_i=sin i/sin i₀  s₂=(tan½)²  ecl-incl min..max  5.128·s_i  2F-lon(°)   node(yr)  peri(yr)');
  for (const t of [0.01, 10, 100, 1000, 1400, 2460, 3000, 3500, 4000, 4300, 4400, 4421, 4429]) {
    const th = DT.meanLaplaceTiltFromEclipticDegAtAge(t), iL = DT.meanLunarFreeInclinationDegAtAge(t), ib = DT.meanLunarFreeInclinationBandDegAtAge(t);
    const a = DT.meanMoonDistanceMetresAtAge(t) / 6371000;
    const sc = planeScalesAtAge(t);
    const node = DT.meanLunarNodePrecessionAtAge(t) / 31557600, peri = DT.meanLunarPerigeePrecessionAtAge(t) / 31557600;
    console.log('%s %s %s %s %s %s %s %s..%s %s %s %s %s',
      String(t).padStart(7), a.toFixed(2).padStart(7), th.toFixed(5).padStart(9), iL.toFixed(4).padStart(9), (ib ?? NaN).toFixed(3).padStart(7),
      sc.sinScale.toFixed(5).padStart(12), sc.tanHalfSqScale.toFixed(4).padStart(10), Math.abs(th - iL).toFixed(2).padStart(9), (th + iL).toFixed(2).padEnd(6),
      (5.128122 * sc.sinScale).toFixed(3).padStart(8), (-0.114332 * sc.tanHalfSqScale).toFixed(4).padStart(9), node.toFixed(2).padStart(9), peri.toFixed(2).padStart(8));
  }
  for (const t of [0.001, 0.003, 0.01, 1, 10]) console.log('    Δi_L at %s Ma: %s″ (%s °/yr) ; Δθ: %s″', t, ((DT.meanLunarFreeInclinationDegAtAge(t) - iL0) * 3600).toExponential(2), ((DT.meanLunarFreeInclinationDegAtAge(t) - iL0) / (t * 1e6)).toExponential(2), ((DT.meanLaplaceTiltFromEclipticDegAtAge(t) - th0) * 3600).toExponential(2));

  // ── (D) F-class content of the tables ────────────────────────────────────
  const sum = (tab, pred) => tab.filter(pred).reduce((s, r) => s + Math.abs(r[4]), 0);
  const cnt = (tab, pred) => tab.filter(pred).length;
  console.log('\n(D) longitude: %d terms — kF=0: %d (Σ|amp| %s″), |kF|=2: %d (Σ %s″), |kF|=4: %d, odd kF: %d',
    L.length, cnt(L, (r) => r[3] === 0), (sum(L, (r) => r[3] === 0) * 3.6e-3).toFixed(1),
    cnt(L, (r) => Math.abs(r[3]) === 2), (sum(L, (r) => Math.abs(r[3]) === 2) * 3.6e-3).toFixed(1),
    cnt(L, (r) => Math.abs(r[3]) === 4), cnt(L, (r) => r[3] % 2 !== 0));
  console.log('    latitude: %d terms — |kF|=1: %d (Σ %s″), |kF|=3: %d (Σ %s″), even kF: %d',
    B.length, cnt(B, (r) => Math.abs(r[3]) === 1), (sum(B, (r) => Math.abs(r[3]) === 1) * 3.6e-3).toFixed(1),
    cnt(B, (r) => Math.abs(r[3]) === 3), (sum(B, (r) => Math.abs(r[3]) === 3) * 3.6e-3).toFixed(1), cnt(B, (r) => r[3] % 2 === 0));
  console.log('    distance: %d terms — kF=0: %d (Σ %s km), |kF|=2: %d (Σ %s km)',
    R.length, cnt(R, (r) => r[3] === 0), (sum(R, (r) => r[3] === 0) * 1e-3).toFixed(0),
    cnt(R, (r) => Math.abs(r[3]) === 2), (sum(R, (r) => Math.abs(r[3]) === 2) * 1e-3).toFixed(1));
})().catch((e) => { console.error(e); process.exit(1); });
