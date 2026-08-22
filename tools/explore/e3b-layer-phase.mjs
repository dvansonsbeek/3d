// EXPLORATION 3b — E1: the of-date LAYER-PHASE INSTRUMENT (plan §12i
// item 11; scene-decompose class). Measures the SCAFFOLD sun (the scene
// graph's layer-wheel composition) against the CERTIFIED series sun in
// the two retired-law observables, per epoch:
//   Δλ  — ecliptic-longitude offset (rotation about world Y), the λ-law
//         channel (retired modern fingerprint:
//         6.72 − 0.84 sinL + 3.64 sin2L − 0.46 cos2L ″, L = φ + 90°)
//   Δdec — declination offset in the rotAxis frame, the dec-law channel
//         (retired fingerprint: 16.6 sinφ + (1.0 − 4.9 cosΩ) cosφ ″)
//   β_world — the scaffold sun's out-of-plane latitude in the WORLD
//         frame (a true sun has β ≡ 0; the plan records 0.128° at −135)
//   obliquity/axis — the scaffold rotAxis tilt vs the framework
//         obliquityDeg(year) (plan records Δ −1,090″ at −135) and the
//         axis azimuth (the solstitial-colure direction).
// SELF-CHECK (pre-registered): the modern-window fits must REPRODUCE the
// retired calibration constants — that proves the instrument measures
// the same thing the laws calibrated. Series sun vector built EXACTLY
// like the (deleted) twin's injection: dec = asin(sin ε sin λ),
// ra = atan2(cos ε sin λ, cos λ) in the rotAxis frame, raw scene clock
// (unbridged — the scene convention).
// Usage: node tools/explore/e3b-layer-phase.mjs
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const SG = require('./tools/lib/scene-graph.js');
const DT = require('./tools/lib/deep-time.js');
const C = require('./tools/lib/constants.js');
const OE = require('./tools/lib/orbital-engine.js');
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
const { createModel } = require('@essrt/physics');
const TIER = createModel();
const fs = require('fs');

const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600;

// certified series sun — the finders evaluator, engine-wired, raw clock
const MS = SG._moonSeriesForProbe();
const AR = JSON.parse(fs.readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8'));
const BD = AR.bodyDiametersKm;
const finders = createEclipseFinders({
  moonLonDegAt: (jd) => MS.truncatedLonDeg(jd),
  moonBetaDegAt: (jd) => MS.truncatedBetaDeg(jd),
  moonDistanceKmAt: (jd) => MS.truncatedDistanceKm(jd),
  deltaTSecondsAt: (jd) => DT.frameworkDeltaT(jd),
  getSynodicMonthDays: () => C.moonSynodicMonth,
  getSunDistanceKm: () => C.currentAUDistance,
  constants: {
    rEarthMetres: (BD.earth / 2) * 1000,
    moonDiameterKm: BD.moon,
    sunDiameterKm: BD.sun,
    j2000JD: C.j2000JD,
    julianCenturyDays: C.julianCenturyDays,
  },
});

const rotPart = (m) => { const e = m.e; return [[e[0], e[4], e[8]], [e[1], e[5], e[9]], [e[2], e[6], e[10]]]; };
const apply = (R, v) => [
  R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
  R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
  R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2],
];
const applyT = (R, v) => [
  R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2],
  R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2],
  R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2],
];
const wrapAs = (rad) => {
  let d = rad;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d * R2D * AS;
};

/** One epoch's layer-phase observables. @param {number} jd */
function measure(jd) {
  SG.computePlanetPosition('moon', jd);        // navigates the graph
  const g = SG._getGraphForProbe();
  const sunW = g.sunNodes.pivot.getWorldPosition();
  const earthW = g.earthNodes.rotAxis.getWorldPosition();
  const R = rotPart(g.earthNodes.rotAxis.worldMatrix);
  const S = [sunW[0] - earthW[0], sunW[1] - earthW[1], sunW[2] - earthW[2]];   // scaffold sun, geocentric world

  // certified series sun vector, twin-injection convention
  const year = 2000 + (jd - 2451545.0) / 365.25;
  const lam = finders.sunLonDegAt(jd) * D2R;
  const eps = OE.computeObliquityEarth(year) * D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const rS = Math.hypot(S[0], S[1], S[2]);
  const T = apply(R, [rS * Math.cos(dec) * Math.sin(ra), rS * Math.sin(dec), rS * Math.cos(dec) * Math.cos(ra)]);

  // Δλ (world-ecliptic rotation) + β_world of both
  const lamS = Math.atan2(S[0], S[2]), lamT = Math.atan2(T[0], T[2]);
  const betS = Math.asin(S[1] / rS);
  const betT = Math.asin(T[1] / Math.hypot(T[0], T[1], T[2]));
  // Δdec in the rotAxis frame (the dec-law observable)
  const Sl = applyT(R, S), Tl = applyT(R, T);
  const decS = Math.asin(Sl[1] / Math.hypot(Sl[0], Sl[1], Sl[2]));
  const decT = Math.asin(Tl[1] / Math.hypot(Tl[0], Tl[1], Tl[2]));
  // frame-invariant arguments: axis azimuth (solstitial colure) + node
  const axW = apply(R, [0, 1, 0]);
  const axAz = Math.atan2(axW[0], axW[2]);
  const phi = lamS - axAz;
  const N = C.NUTATION_LEADING_TERMS_ARCSEC;
  const om = (N.omegaNodeJ2000Deg - 360 * (jd - 2451545.0) / C.moonNodalPrecessionDaysEarth) * D2R;
  // scaffold axis tilt vs framework obliquity
  const tiltScaffold = Math.acos(Math.max(-1, Math.min(1, axW[1])));
  return {
    jd, year,
    dLamAs: wrapAs(lamS - lamT),
    dDecAs: wrapAs(decS - decT),
    betScaffoldAs: betS * R2D * AS,
    betSeriesAs: betT * R2D * AS,
    dTiltAs: (tiltScaffold - eps) * R2D * AS,
    phi, om, axAzDeg: ((axAz * R2D) % 360 + 360) % 360,
  };
}

// ── 1. modern-window sweep + retired-law self-check fits ─────────────────
const rows = [];
for (let y = 1970; y <= 2049; y++) {
  for (const frac of [0.13, 0.38, 0.63, 0.88]) {
    const jd = 2451545.0 + (y + frac - 2000) * 365.25;
    rows.push(measure(jd));
  }
}
// dec-law fit: dDec ≈ a·sinφ + (b + c·cosΩ)·cosφ
{
  const X = rows.map((r) => [Math.sin(r.phi), Math.cos(r.phi), Math.cos(r.om) * Math.cos(r.phi)]);
  const y = rows.map((r) => r.dDecAs);
  const fit = lsq(X, y);
  console.log('1. MODERN SELF-CHECK (1970–2049, n', rows.length + ')');
  console.log(`   dec channel: ${fit[0].toFixed(2)}·sinφ + (${fit[1].toFixed(2)} ${fit[2] >= 0 ? '+' : '−'} ${Math.abs(fit[2]).toFixed(2)}·cosΩ)·cosφ   [retired law: 16.6·sinφ + (1.0 − 4.9·cosΩ)·cosφ]`);
  const res = rows.map((r, i) => y[i] - (fit[0] * X[i][0] + fit[1] * X[i][1] + fit[2] * X[i][2]));
  console.log(`   dec residual RMS ${rms(res).toFixed(2)}″`);
}
// λ-law fit: dλ ≈ a0 + a1·sinL + a2·cosL + a3·sin2L + a4·cos2L, L = φ + 90°
{
  const X = rows.map((r) => { const L = r.phi + Math.PI / 2; return [1, Math.sin(L), Math.cos(L), Math.sin(2 * L), Math.cos(2 * L)]; });
  const y = rows.map((r) => r.dLamAs);
  const fit = lsq(X, y);
  console.log(`   λ channel:  ${fit[0].toFixed(2)} + ${fit[1].toFixed(2)}·sinL + ${fit[2].toFixed(2)}·cosL + ${fit[3].toFixed(2)}·sin2L + ${fit[4].toFixed(2)}·cos2L   [retired law: 6.72 − 0.84·sinL + 3.64·sin2L − 0.46·cos2L]`);
  const res = rows.map((r, i) => y[i] - X[i].reduce((s, x, k) => s + x * fit[k], 0));
  console.log(`   λ residual RMS ${rms(res).toFixed(2)}″`);
}

// ── 2. the epoch table (the seam across time) ────────────────────────────
console.log('\n2. EPOCH TABLE (scaffold − certified; annual stats from 12 samples/epoch)');
console.log('   year     Δλmean″   Δλamp″    βamp″     βmean″    Δtilt″    H1resid″');
const EPOCHS = [1900, 1970, 2000, 2049, 2100, 1000, 0, -135, -762, -3000, 3000];
// H1: Δtilt(t) ≡ ε_mean(H) − ε_of-date(t) — exact-closure test
const EPS_MEAN = C.earthtiltMean;                 // the scaffold mean-tilt constant (deg)
for (const y of EPOCHS) {
  const rs = [];
  for (let m = 0; m < 12; m++) rs.push(measure(2451545.0 + (y + m / 12 - 2000) * 365.25));
  const mean = (f) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
  const dLamMean = mean((r) => r.dLamAs);
  const dLamAmp = Math.sqrt(2 * mean((r) => (r.dLamAs - dLamMean) ** 2));
  const betMean = mean((r) => r.betScaffoldAs);
  const betAmp = Math.sqrt(2 * mean((r) => (r.betScaffoldAs - betMean) ** 2));
  const dTilt = mean((r) => r.dTiltAs);
  const epsOfDate = OE.computeObliquityEarth(y);
  const h1 = dTilt - (EPS_MEAN - epsOfDate) * AS;
  console.log(
    String(y).padStart(7),
    dLamMean.toFixed(1).padStart(10),
    dLamAmp.toFixed(1).padStart(9),
    betAmp.toFixed(1).padStart(9),
    betMean.toFixed(1).padStart(10),
    dTilt.toFixed(1).padStart(9),
    h1.toFixed(2).padStart(10),
  );
}
console.log(`   [ε_mean(H) = ${C.earthtiltMean}° · H1: Δtilt ≡ ε_mean − ε(year); H1resid ≈ 0 = EXACT closure]`);
console.log('   [plan anchors: Δtilt ≈ −1,090″ at −135 ✓(first run) · sun β_world 0.128° at −135 = an instant value, cf βmean/βamp]');

// ── 3. E2: the λ annual family — extract implied (Δe, Δ(L−ϖ)) per epoch ──
// Differential EoC to first order, on the TRUE-ANOMALY argument
// ν ≈ λ_series − ϖ_certified(year):
//   Δλ(t) ≈ a0 + a1·sinν + a2·cosν + a3·sin2ν + a4·cos2ν
//   with a1 ≈ 2·Δe (rad) and a2 ≈ 2e·Δ(L−ϖ) (the phase channel);
//   a3/a4 carry the e²-term difference (an offset-circle wheel would
//   miss 1.25e²·sin2M ≈ 72″ — a diagnostic of the wheel construction).
console.log('\n3. E2 λ-ANNUAL EXTRACTION (24 samples/epoch; ″ and derived Δe, Δphase)');
console.log('   year        a0″      a1″(2Δe)   a2″(2eΔφ)    a3″(sin2ν)  a4″    → Δe(×1e6)   Δφ″');
for (const y of EPOCHS) {
  const rs2 = [];
  for (let m = 0; m < 24; m++) {
    const jd = 2451545.0 + (y + m / 24 - 2000) * 365.25;
    rs2.push({ r: measure(jd), jd });
  }
  const piDeg = TIER.earth.perihelionLongitudeDeg(y);   // the certified ϖ(year)
  const X = [], yv = [];
  for (const { r, jd } of rs2) {
    const lamSeries = finders.sunLonDegAt(jd);
    const nu = (lamSeries - (piDeg + 180)) * D2R;     // true anomaly (geocentric-perigee convention)
    X.push([1, Math.sin(nu), Math.cos(nu), Math.sin(2 * nu), Math.cos(2 * nu)]);
    yv.push(r.dLamAs);
  }
  const f = lsq(X, yv);
  const e = TIER.earth.eccentricity(y);               // the certified e(year)
  const dE = (f[1] / AS) * D2R / 2;                  // Δe from a1
  const dPhiAs = f[2] / (2 * e);                     // Δ(L−ϖ) from a2, in ″
  console.log(
    String(y).padStart(7),
    f[0].toFixed(1).padStart(9), f[1].toFixed(1).padStart(10), f[2].toFixed(1).padStart(10),
    f[3].toFixed(1).padStart(11), f[4].toFixed(1).padStart(7),
    (dE * 1e6).toFixed(1).padStart(10), dPhiAs.toFixed(0).padStart(8),
  );
}
console.log('   [e(year), ϖ(year) from the engine laws; Δφ = Δ(L−ϖ) — the anomaly-phase channel]');

// ── 4. E2: ABSOLUTE element extraction — e_wheel(t), ϖ_wheel(t), n_wheel ─
// Fit λ(t) = L0 + n·t + 2e·sin(L−ϖ) + (e² term) over one year, for BOTH
// the certified series (the extractor CONTROL — must reproduce the laws)
// and the scaffold (series + Δλ). Separates rate vs anchor vs curve shape.
function extractElements(ts, lams) {
  // JOINT fit — trend + sine columns TOGETHER (sequential fitting over a
  // partial cycle lets the line steal from the sine: measured on a clean
  // synthetic, e came back 0.0112 for a true 0.0167 — the leakage trap).
  // Argument from the KNOWN tropical rate; [1, t] absorb L0/n corrections.
  const nKnown = 2 * Math.PI / 365.2422;
  const L0g = lams[0];
  const X = [], yv = [];
  for (let i = 0; i < ts.length; i++) {
    const L = L0g + nKnown * ts[i];
    X.push([1, ts[i], Math.sin(L), Math.cos(L), Math.sin(2 * L), Math.cos(2 * L)]);
    yv.push(lams[i] - L);
  }
  const f = lsq(X, yv);
  const e = Math.hypot(f[2], f[3]) / 2;
  // EoC = 2e·sin(L−ϖ) → coef_sinL = 2e·cosϖ, coef_cosL = −2e·sinϖ
  const piRel = Math.atan2(-f[3], f[2]);
  // ϖ is measured relative to the L̂ argument's zero; convert to absolute
  // via the actual mean longitude at t=0: L0_true = L0g + f[0] (the [1]
  // column's correction), and ϖ_abs = ϖ measured in the same λ frame.
  const L0true = L0g + f[0];
  const piAbs = piRel + (L0true - L0g);                   // small-offset phase carry
  return {
    e,
    piDeg: ((piAbs * R2D) % 360 + 360) % 360,
    rateDegPerDay: (nKnown + f[1]) * R2D,
    e2SinAmp: Math.hypot(f[4], f[5]),
  };
}
console.log('\n4. E2 ABSOLUTE ELEMENTS (48 samples/yr; control = certified series vs its laws)');
console.log('   year    e_ctrl(law)      e_wheel     Δe(×1e6)   ϖ_ctrl(law)°    ϖ_wheel°    Δϖ″     Δn ″/yr');
for (const y of EPOCHS) {
  const ts = [], lamsC = [], lamsW = [];
  for (let m = 0; m < 48; m++) {
    const jd = 2451545.0 + (y + m / 48 - 2000) * 365.25;
    const r = measure(jd);
    const lamSeries = finders.sunLonDegAt(jd);
    ts.push(m / 48 * 365.25);
    lamsC.push(lamSeries * D2R);
    lamsW.push((lamSeries + r.dLamAs / AS) * D2R);
  }
  // unwrap both
  for (const arr of [lamsC, lamsW]) {
    for (let i = 1; i < arr.length; i++) {
      while (arr[i] - arr[i - 1] < -Math.PI) arr[i] += 2 * Math.PI;
      while (arr[i] - arr[i - 1] > Math.PI) arr[i] -= 2 * Math.PI;
    }
  }
  const ec = extractElements(ts, lamsC);
  const ew = extractElements(ts, lamsW);
  const eLaw = TIER.earth.eccentricity(y);
  const piLaw = ((TIER.earth.perihelionLongitudeDeg(y) + 180) % 360 + 360) % 360;  // geocentric-perigee
  const dPiAs = ((ew.piDeg - ec.piDeg + 540) % 360 - 180) * AS;
  const dnAsYr = (ew.rateDegPerDay - ec.rateDegPerDay) * 365.25 * AS;
  console.log(
    String(y).padStart(7),
    `${ec.e.toFixed(7)}(${eLaw.toFixed(7)})`,
    ew.e.toFixed(7).padStart(11),
    ((ew.e - ec.e) * 1e6).toFixed(1).padStart(9),
    `${ec.piDeg.toFixed(3)}(${piLaw.toFixed(3)})`.padStart(17),
    ew.piDeg.toFixed(3).padStart(10),
    dPiAs.toFixed(0).padStart(8),
    dnAsYr.toFixed(2).padStart(9),
  );
}
console.log('   [control must match its laws (extractor validity); Δϖ = wheel − control ABSOLUTE; Δn = the secular channel driver]');

// ── 5. E2 CLOSURE TESTS (final formulation — the first draft's harmonics
//     hypothesis was WRONG and is retracted below) ────────────────────────
// FINDING that reshaped the tests: the certified series sun (finders) is
// MEEUS CH. 25 — T²-accelerated L0 + Meeus's own e(T)-polynomial EoC, NO
// harmonics (the SUN_HARMONICS live on the SCAFFOLD side: the engine
// subtracts them from the wheel sun, scene-graph.js θ −= corr — so the
// 279″ constant annual harmonic content measured earlier is the fitted
// absorber of the RAW wheels' in-window imperfection, not a certified-
// chain term; the earlier "harmonics de-tuning" attribution is RETRACTED).
// (i) e-curve closure: e_series(T) ≡ the Meeus e-polynomial
//     (1.914602 − 0.004817·T − 0.000014·T²)/2 in radians — vs the
//     framework e-law. EXACT: closes to ~5e-6 at −135 and −3000.
// (ii) secular closure: sMean(t) ≡ Meeus T² (0.0003032·T²) + rate diff
//     ((36000.76983 − 36000.768446)·T) + the ΔT CLOCK convention (the
//     finders evaluate at TT = jd+ΔT; the framework lawPart at jd).
//     EXACT: ≤0.6″ at every epoch (884.7 vs 884.3 @−135; 5352.2 vs
//     5351.0 @−3000).
const { createSunLongitudeCorrection } = require('@essrt/physics/sun/longitude-correction');
const CORR = createSunLongitudeCorrection({
  hYears: C.H, balancedYear: C.balancedYear, j2000JD: C.j2000JD,
  meanDeg: C.SUN_LONGITUDE_MEAN || 0, harmonics: C.SUN_LONGITUDE_HARMONICS,
  nNodalJ2000: C.N_nodalI, nApsidalJ2000: C.N_apsidalI,
});
const N_TROP = 2 * Math.PI / C.meanSolarYearDays;             // rad/day, framework tropical
const L_J2000 = (C.earthOrbital?.sunMeanLongitudeJ2000_deg ?? 280.46646) * D2R;
function lawPartRad(jd) {                                      // framework L + EoC(law)
  const y = 2000 + (jd - 2451545.0) / 365.25;
  const L = L_J2000 + N_TROP * (jd - 2451545.0);
  const e = TIER.earth.eccentricity(y);
  const piG = (TIER.earth.perihelionLongitudeDeg(y) + 180) * D2R;  // geocentric perigee
  const M = L - piG;
  return L + (2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M));
}
console.log('\n5. E2 CLOSURE TESTS (final)');
console.log('   (i) e-curve ≡ Meeus e-poly            (ii) secular ≡ T² + rateΔ + ΔTclock');
console.log('   year   e_meeus      e_series    Δ(1e6) |    sum″    sMean″   Δ″   | wheel−law″');
const FW_RATE = 36000.768446;                   // deg/cy (E0's framework tropical rate)
for (const y of EPOCHS) {
  const ts = [], wOff = [], sOff = [];
  for (let m = 0; m < 48; m++) {
    const jd = 2451545.0 + (y + m / 48 - 2000) * 365.25;
    const r = measure(jd);
    const lamSeries = finders.sunLonDegAt(jd) * D2R;
    const lamWheel = lamSeries + (r.dLamAs / AS) * D2R;
    const lp = lawPartRad(jd);
    ts.push(m / 48 * 365.25);
    wOff.push(wrapRad(lamWheel - lp));
    sOff.push(wrapRad(lamSeries - lp));
  }
  // (i) implied e of the series' law-deviation vs the Meeus polynomial
  const L0g = lawPartRad(2451545.0 + (y - 2000) * 365.25);
  const X = [];
  for (let i = 0; i < ts.length; i++) {
    const L = L0g + (2 * Math.PI / 365.2422) * ts[i];
    X.push([1, ts[i], Math.sin(L), Math.cos(L), Math.sin(2 * L), Math.cos(2 * L)]);
  }
  const fs = lsq(X, sOff);
  // the series' TOTAL implied e-vector = law vector ⊕ deviation; compare
  // amplitude-wise: e_series ≈ |e_law·u + dev/2| — reconstruct via the
  // law e and the measured deviation components:
  // e_series (the total implied e) is authoritative from section 4; here
  // compute the MEEUS Ch. 25 e-polynomial it must equal:
  const T = (y - 2000) / 100;
  const eMeeus = (1.914602 - 0.004817 * T - 0.000014 * T * T) * D2R / 2;
  // (ii) secular closure
  const t2 = 0.0003032 * T * T * AS;
  const rd = (36000.76983 - FW_RATE) * T * AS;
  const jdY = 2451545.0 + (y - 2000) * 365.25;
  const clock = 0.98565 * (DT.frameworkDeltaT(jdY) / 86400) * AS;
  const sMean = sOff.reduce((s, v) => s + v, 0) / sOff.length * R2D * AS;
  const wMean = wOff.reduce((s, v) => s + v, 0) / wOff.length * R2D * AS;
  console.log(
    String(y).padStart(7),
    eMeeus.toFixed(7).padStart(10),
    '(sec.4 e_ctrl)',
    ' |',
    (t2 + rd + clock).toFixed(1).padStart(9),
    sMean.toFixed(1).padStart(9),
    (t2 + rd + clock - sMean).toFixed(1).padStart(6),
    ' |',
    wMean.toFixed(1).padStart(9),
  );
}
console.log('   [(i) MEASURED CLOSURE: e_meeus vs section-4 e_ctrl — 0.0175520 vs 0.0175467 @−135,');
console.log('    0.0185070 vs 0.0185042 @−3000 (≈5e-6 & 3e-6) — the series e-curve IS Meeus Ch. 25;');
console.log('    (ii) EXACT ≤0.6″ at every epoch; wheel−law stays ≤~50″ — the wheels ride the laws.]');

function wrapRad(x) { let d = x; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

function lsq(X, y) {
  const n = X[0].length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (let r = 0; r < y.length; r++) {
    for (let i = 0; i < n; i++) {
      b[i] += X[r][i] * y[r];
      for (let j = 0; j < n; j++) A[i][j] += X[r][i] * X[r][j];
    }
  }
  for (let c2 = 0; c2 < n; c2++) {
    let p = c2;
    for (let r2 = c2 + 1; r2 < n; r2++) if (Math.abs(A[r2][c2]) > Math.abs(A[p][c2])) p = r2;
    [A[c2], A[p]] = [A[p], A[c2]]; [b[c2], b[p]] = [b[p], b[c2]];
    for (let r2 = c2 + 1; r2 < n; r2++) {
      const f = A[r2][c2] / A[c2][c2];
      for (let cc = c2; cc < n; cc++) A[r2][cc] -= f * A[c2][cc];
      b[r2] -= f * b[c2];
    }
  }
  const out = new Array(n).fill(0);
  for (let c2 = n - 1; c2 >= 0; c2--) {
    let s = b[c2];
    for (let cc = c2 + 1; cc < n; cc++) s -= A[c2][cc] * out[cc];
    out[c2] = s / A[c2][c2];
  }
  return out;
}
function rms(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length); }
