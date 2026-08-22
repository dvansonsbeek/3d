// EXPLORATION 3b — E4.2: the NATIVE SUN raw-swap measurements (plan §12i
// item 11 E4 pre-registration). Builds TWO finders — the historical Meeus
// Ch. 25 form and the E4 framework form (linear tropical rate + Kepler EoC
// on the framework e(t)/ϖ(t) laws; same TT clock, same L0 anchor) — and
// measures:
//   1. the swap delta per epoch (mean + annual), incl. the C(3b) metric:
//      certified-vs-framework-laws mean at −135 (~884″ today → ≤10″ target);
//   2. all-phase vs JPL at the 960 cached LCG epochs: raw residual per
//      form, completed residual (the D2 68-term derived table applies
//      unchanged — it corrects real planetary physics), and the re-fitted
//      2lE residue for the new form (the completion's declared-fitted part);
//   3. syzygy timing shift (the finder's greatest instants, both forms).
// Usage: node tools/explore/e3b-native-sun.mjs
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const SG = require('./tools/lib/scene-graph.js');
const DT = require('./tools/lib/deep-time.js');
const C = require('./tools/lib/constants.js');
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
const { createSunPlanetaryCompletion } = require('@essrt/physics/eclipse/sun-planetary-completion');
const { createModel } = require('@essrt/physics');
const fs = require('fs');
const TIER = createModel();

const D2R = Math.PI / 180, AS = 3600;
const MS = SG._moonSeriesForProbe();
const AR = JSON.parse(fs.readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8'));
const BD = AR.bodyDiametersKm;
const baseDeps = {
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
};
const meeus = createEclipseFinders(baseDeps);
const mkNative = (eccAt, lonAt) => createEclipseFinders({
  ...baseDeps,
  frameworkSun: {
    sunMeanLongitudeJ2000Deg: AR.earthOrbital.sunMeanLongitudeJ2000_deg,
    tropicalRateDegPerCy: 360 * C.julianCenturyDays / C.meanSolarYearDays,
    eccentricityAt: eccAt,
    perihelionLongitudeDegAt: (y) => TIER.earth.perihelionLongitudeDeg(y),
    ...(lonAt ? { meanLongitudeDegAt: lonAt } : {}),
  },
});
// E4 COUPLING-DERIVATION CANDIDATES (owner architecture: the eccentricity
// channel STAYS H/16; the residual = the H/3 INCLINATION movement's
// coupling imprint. Validation doctrine: the ECLIPSE CHAIN is the only
// truth — Berger demoted to a reference curve; zero fitted constants):
const cos3 = (y) => Math.cos((3 * (y - C.balancedYear) / C.H * 360 - 180) * D2R);
const C3_2000 = cos3(2000);
const eH16 = (y) => TIER.earth.eccentricity(y);
const CANDIDATES = [
  ['H/16 law alone', (y) => eH16(y)],
  // C1: the July amplitude (base/2), differenced so the J2000 anchor is
  // preserved by construction (δe(J2000) = 0):
  ['C1 +base/2 coupling', (y) => eH16(y) + (C.eccentricityBase / 2) * (cos3(y) - C3_2000)],
  // C2: the product form — the H/16 channel's own value modulates the
  // imprint (self-generates the H/3±H/16 sidebands; zero new constants):
  ['C2 +e16/2 product', (y) => eH16(y) + 0.5 * (eH16(y) * cos3(y) - eH16(2000) * C3_2000)],
];
// ── L(t) machinery (shared by the assembled sun below and section 5) ────
// DAY-UNITS TRAP (measured): computeSolarYearDaysDirect returns the year in
// LOD days, so its drift (−0.97 s/cy) bundles the lengthening day
// (365.24 × 1.77 ms/cy = 0.65 s/cy) — which is UT-vs-TT, already ΔT's job.
// The ΔT-clean SI/TT rate uses T_trop in SI seconds = days × LOD(y):
// framework Fourier claim −0.33 s/cy (H/8 carries −0.285 of it).
const L0deg = AR.earthOrbital.sunMeanLongitudeJ2000_deg;
const RATEcy = 360 * C.julianCenturyDays / C.meanSolarYearDays;
const rateLinYr = RATEcy / 100;
const rateYrDays = (y) => 360 * 365.25 / DT.computeSolarYearDaysDirect(y);
const rateYrSI = (y) => 360 * (365.25 * 86400)
  / (DT.computeSolarYearDaysDirect(y) * DT.meanLodSecondsAtAge((2000 - y) / 1e6));
const YLO = -1100, YHI = 2200;
// refYr: the slope reference subtracted before integrating. rateLinYr keeps
// the variant's own J2000 rate; rateFn(2000) instead REBASES the local rate
// to the linear anchor — the drift-only split (anchor-class separation:
// eclipse truth pins the J2000 rate, f(Y) supplies only the drift shape).
const mkCum = (rateFn, refYr = rateLinYr) => {
  const cum = new Float64Array(YHI - YLO + 1);
  for (let i = 1; i < cum.length; i++) {
    const y0 = YLO + i - 1, y1 = YLO + i;
    cum[i] = cum[i - 1] + 0.5 * ((rateFn(y0) - refYr) + (rateFn(y1) - refYr));
  }
  const at = (y) => {
    const x = Math.min(Math.max(y, YLO), YHI) - YLO;
    const i = Math.min(Math.floor(x), cum.length - 2), fr = x - i;
    return cum[i] + fr * (cum[i + 1] - cum[i]);
  };
  const c2000 = at(2000);
  return (y) => L0deg + RATEcy * (y - 2000) / 100 + (at(y) - c2000);
};
const LDRIFT = mkCum(rateYrSI, rateYrSI(2000));

// THE ASSEMBLED FRAMEWORK SUN (the E4 landing candidate): C1 e-law +
// 'f(Y) SI drift-only' L(t) — every piece model-derived, zero fitted
// constants. Sections 1–3 measure THIS form; section 5 keeps the
// L-variant comparison.
const native = mkNative(CANDIDATES[1][1], LDRIFT);
console.log('candidate ė at J2000 (per cy; observed −4.20e-5):');
for (const [name, f] of CANDIDATES) console.log('  ', name.padEnd(22), ((f(2050) - f(1950))).toExponential(3));
const wrap = (d) => (((d + 540) % 360) + 360) % 360 - 180;

// ── 1. swap deltas per epoch + the C(3b) metric ─────────────────────────
console.log('1. SWAP DELTA (native − Meeus) per epoch, and certified-vs-LAWS after the swap');
console.log('   year   Δmean″   Δannual″   [old cert−laws″]  new cert−laws″');
const OLD_SEAM = { 1900: -5.4, 1970: -1.8, 2000: 0.0, 2049: 3.5, 2100: 7.7, 1000: 118.1, 0: 770.8, '-135': 884.3, '-762': 1560.2, '-3000': 5351.0, 3000: 356.2 };
// "laws" reference = the framework form itself evaluated at UT (no ΔT):
// the TT clock stays a convention of the chain, so the C(3b) metric is
// native-form(jd) vs native-form-at-jd-without-ΔT — isolating any residual
// non-clock seam (should be ≈0 by construction; the clock term remains).
for (const y of [1900, 1970, 2000, 2049, 2100, 1000, 0, -135, -762, -3000, 3000]) {
  const ds = [], seam = [];
  for (let m = 0; m < 24; m++) {
    const jd = 2451545.0 + (y + m / 24 - 2000) * 365.25;
    ds.push(wrap(native.sunLonDegAt(jd) - meeus.sunLonDegAt(jd)) * AS);
    // new certified vs the pure laws at the SAME TT instant (clock removed):
    const jdTT = jd + DT.frameworkDeltaT(jd) / 86400;
    const T = (jdTT - C.j2000JD) / C.julianCenturyDays;
    const yr = 2000 + T * 100;
    const L = AR.earthOrbital.sunMeanLongitudeJ2000_deg + (360 * C.julianCenturyDays / C.meanSolarYearDays) * T;
    const e = TIER.earth.eccentricity(yr);
    const M = (L - (TIER.earth.perihelionLongitudeDeg(yr) + 180)) * D2R;
    const lamLaw = L + ((2 * e - e ** 3 / 4) * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M) + (13 / 12) * e ** 3 * Math.sin(3 * M)) / D2R;
    seam.push(wrap(native.sunLonDegAt(jd) - lamLaw) * AS);
  }
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const dMean = mean(ds);
  const dAmp = Math.sqrt(2 * mean(ds.map((v) => (v - dMean) ** 2)));
  const sMean = mean(seam);
  console.log(
    String(y).padStart(7),
    dMean.toFixed(1).padStart(9),
    dAmp.toFixed(1).padStart(9),
    String(OLD_SEAM[y] ?? '').padStart(14),
    sMean.toFixed(2).padStart(12),
  );
}

// ── 2. all-phase vs JPL (960 cached LCG epochs) ─────────────────────────
const CACHE = new URL('./d2-moonval-jpl-cache.local.json', import.meta.url);
const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const N = C.NUTATION_LEADING_TERMS_ARCSEC;
const embW = (C.moonDistance / (1 + C.MASS_RATIO_EARTH_MOON) / C.currentAUDistance) * (648000 / Math.PI);
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec: embW });
const BRIDGE = AR.earthOrbital.deltaTStart / 86400;
const rows = [];
for (const [jd, , , jplSun] of cache.rows) {
  const jb = jd + BRIDGE;
  const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonNodalPrecessionDaysEarth) * D2R;
  const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
  const T = (jb - 2451545.0) / 36525;
  const lE2 = 2 * ((100.466457 + 36000.769780 * T) % 360) * D2R;
  rows.push({
    rawM: wrap(meeus.sunLonDegAt(jb) - (jplSun - dPsiDeg)) * AS,
    rawN: wrap(native.sunLonDegAt(jb) - (jplSun - dPsiDeg)) * AS,
    comp: sunPlanetaryCompletionDeg(T) * AS,
    s2: Math.sin(lE2), c2: Math.cos(lE2),
  });
}
const stats = (v) => {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  return { m, sd: Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length) };
};
const rm = stats(rows.map((r) => r.rawM - r.comp));
const rn = stats(rows.map((r) => r.rawN - r.comp));
console.log('\n2. ALL-PHASE vs JPL (n', rows.length + ', 1970–2049; completed with the unchanged D2 table):');
console.log(`   Meeus form:     mean ${rm.m.toFixed(2)}″  scatter ${rm.sd.toFixed(2)}″   (current shipped basis)`);
console.log(`   native form:    mean ${rn.m.toFixed(2)}″  scatter ${rn.sd.toFixed(2)}″   (before 2lE re-fit)`);
for (const [name, eccAt] of CANDIDATES.slice(1)) {
  const f = mkNative(eccAt);
  const rr = [];
  for (const [jd, , , jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonNodalPrecessionDaysEarth) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const T = (jb - 2451545.0) / 36525;
    rr.push(wrap(f.sunLonDegAt(jb) - (jplSun - dPsiDeg)) * AS - sunPlanetaryCompletionDeg(T) * AS);
  }
  const s = stats(rr);
  console.log(`   ${name.padEnd(22)} mean ${s.m.toFixed(2)}″  scatter ${s.sd.toFixed(2)}″`);
}
// re-fit the 2lE residue for the native form (the declared-fitted part)
{
  const y = rows.map((r) => r.rawN - r.comp);
  let s11 = 0, s12 = 0, s22 = 0, b1 = 0, b2 = 0, n = y.length, sy = 0, s1 = 0, s2s = 0;
  for (let i = 0; i < n; i++) {
    const { s2, c2 } = rows[i];
    s11 += s2 * s2; s12 += s2 * c2; s22 += c2 * c2; b1 += s2 * y[i]; b2 += c2 * y[i];
    sy += y[i]; s1 += s2; s2s += c2;
  }
  // 3-param fit [const, sin2lE, cos2lE]
  const A = [[n, s1, s2s], [s1, s11, s12], [s2s, s12, s22]];
  const b = [sy, b1, b2];
  for (let c2i = 0; c2i < 3; c2i++) {
    for (let r2 = c2i + 1; r2 < 3; r2++) {
      const f = A[r2][c2i] / A[c2i][c2i];
      for (let cc = c2i; cc < 3; cc++) A[r2][cc] -= f * A[c2i][cc];
      b[r2] -= f * b[c2i];
    }
  }
  const x = [0, 0, 0];
  for (let c2i = 2; c2i >= 0; c2i--) {
    let s = b[c2i];
    for (let cc = c2i + 1; cc < 3; cc++) s -= A[c2i][cc] * x[cc];
    x[c2i] = s / A[c2i][c2i];
  }
  const res = y.map((v, i) => v - x[0] - x[1] * rows[i].s2 - x[2] * rows[i].c2);
  const rr = stats(res);
  console.log(`   native + refit: const ${x[0].toFixed(2)}″ · 2lE (sin ${x[1].toFixed(2)}, cos ${x[2].toFixed(2)})″ → scatter ${rr.sd.toFixed(2)}″`);
  console.log('   [old declared-fitted 2lE: +1.42·sin2lE; the const is anchor-class, absorbed by the tier anchors]');
}

// ── 2b. eclipse ENDPOINTS with each form: syzygy fleet + centerlines ────
{
  const SZ = JSON.parse(fs.readFileSync(new URL('./d2-syzygy-jpl-cache.local.json', import.meta.url), 'utf8'));
  const EXT = JSON.parse(fs.readFileSync(new URL('./d2-extension-terms.local.json', import.meta.url), 'utf8'));
  const PT = JSON.parse(fs.readFileSync(new URL('./d2-planetary-moon-terms.local.json', import.meta.url), 'utf8'));
  const argOf = (jd) => {
    const T = (jd - 2451545.0) / 36525; const a = {};
    a.lV = (181.979801 + 58517.815676 * T) * D2R; a.lE = (100.466457 + 36000.769780 * T) * D2R;
    a.lM = (355.433000 + 19141.696300 * T) * D2R; a.lJ = (34.351519 + 3036.302389 * T) * D2R; a.lS = (50.077444 + 1223.511013 * T) * D2R;
    a.D = (297.8501921 + (445267.1114034 - 0.0018819 * T) * T) * D2R;
    a.M = (357.5291092 + (35999.0502909 - 0.0001536 * T) * T) * D2R;
    a.Mp = (134.9633964 + (477198.8675055 + 0.0087414 * T) * T) * D2R;
    a.F = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
    return a;
  };
  const extAs = (terms, a) => { let v = 0; for (const { k, arcsec } of terms) v += arcsec * Math.sin(k[0] * a.D + k[1] * a.M + k[2] * a.Mp + k[3] * a.F); return v; };
  const PMAP = {
    'V-E': { fn: (a) => a.lV - a.lE, k: 1 }, '2(V-E)': { fn: (a) => 2 * (a.lV - a.lE), k: 2 }, '3(V-E)': { fn: (a) => 3 * (a.lV - a.lE), k: 3 },
    'E-J': { fn: (a) => a.lE - a.lJ, k: 1 }, '2(E-J)': { fn: (a) => 2 * (a.lE - a.lJ), k: 2 },
    'E-Ma': { fn: (a) => a.lE - a.lM, k: 1 }, '2(E-Ma)': { fn: (a) => 2 * (a.lE - a.lM), k: 2 }, 'E-Sa': { fn: (a) => a.lE - a.lS, k: 1 },
    'V-E+2D': { fn: (a) => a.lV - a.lE + 2 * a.D, k: 1 }, 'V-E-2D': { fn: (a) => a.lV - a.lE - 2 * a.D, k: 1 },
    'E-J+2D': { fn: (a) => a.lE - a.lJ + 2 * a.D, k: 1 }, 'E-J-2D': { fn: (a) => a.lE - a.lJ - 2 * a.D, k: 1 },
    'V-E+Mp': { fn: (a) => a.lV - a.lE + a.Mp, k: 1 }, 'V-E-Mp': { fn: (a) => a.lV - a.lE - a.Mp, k: 1 },
    'E-J+Mp': { fn: (a) => a.lE - a.lJ + a.Mp, k: 1 }, 'E-J-Mp': { fn: (a) => a.lE - a.lJ - a.Mp, k: 1 },
    'E-Ma+Mp': { fn: (a) => a.lE - a.lM + a.Mp, k: 1 }, 'E-Ma-Mp': { fn: (a) => a.lE - a.lM - a.Mp, k: 1 },
  };
  const planAs = (terms, a) => { let v = 0; for (const t of terms) { const m = PMAP[t.name]; const th = m.fn(a); v += ((m.k % 2 === 1) ? -1 : 1) * (t.cos * Math.cos(th) + t.sin * Math.sin(th)); } return v; };
  const LP = C.moonMeeusLpCorrection;
  const fleet = (finders) => {
    const e = [];
    for (const [jd, jplM, jplS] of SZ.rows) {
      const jb = jd + BRIDGE;
      const T = (jb - 2451545.0) / 36525;
      const a = argOf(jb);
      const fwS = finders.sunLonDegAt(jb) - sunPlanetaryCompletionDeg(T);
      const fwM = MS.truncatedLonDeg(jb) + LP + (extAs(EXT.lon, a) + planAs(PT.lon, a)) / AS;
      e.push(wrap((fwM - fwS) - (jplM - jplS)) * AS);
    }
    return stats(e);
  };
  console.log('\n2b. SYZYGY ELONGATION FLEET (n 179; completion + full Moon tails):');
  const fM = fleet(meeus);
  console.log(`   Meeus form:            mean ${fM.m.toFixed(2)}″ RMS ${Math.sqrt(fM.m ** 2 + fM.sd ** 2).toFixed(2)}″   [shipped 3.82″]`);
  for (const [name, eccAt] of CANDIDATES) {
    const s = fleet(mkNative(eccAt));
    console.log(`   ${name.padEnd(22)} mean ${s.m.toFixed(2)}″ RMS ${Math.sqrt(s.m ** 2 + s.sd ** 2).toFixed(2)}″`);
  }
}

// ── 3. syzygy timing shift ──────────────────────────────────────────────
console.log('\n3. SYZYGY TIMING (greatest instants, both forms):');
for (const [label, j0, j1] of [['2024 Apr', 2460390, 2460430], ['1999 Aug', 2451390, 2451420], ['-135 Apr', 1671830, 1671870]]) {
  const a = meeus.findSolarEclipsesInRange(j0, j1);
  const b = native.findSolarEclipsesInRange(j0, j1);
  if (a.length && b.length) {
    const dtSec = (b[0].jd - a[0].jd) * 86400;
    console.log(`   ${label}: Δt = ${dtSec.toFixed(1)} s  (Meeus jd ${a[0].jd.toFixed(5)})`);
  } else console.log(`   ${label}: events ${a.length}/${b.length}`);
}

// ── 4. BCE ARBITRATION (the eclipse-truth doctrine's long-term half) ────
// The ancient audit-26 presets (tools/verify/eclipse-audit.js ECLIPSE_PRESETS
// + SITES). Per candidate: syzygy-instant shift vs the Meeus basis at each
// event. The Meeus basis is the corpus-validated chain (Babylon 206 km, UT
// within 9 min), so a shift decomposes as: CONSTANT part = ΔT-degenerate
// (the ΔT stack absorbs it — same freedom Stephenson uses); the SEASONAL
// residual around it is the falsifiable part, since the candidates differ
// through the equation of center (e·sin M — season-dependent), and the BCE
// corpus spans Mar–Dec. Residual sd is translated to ground-track km at the
// mean site latitude (Earth rotation 0.46381 km/s · cos φ).
const BCE = [
  ['71 Mar (Plutarch)', 1747068.890110, 38.00],
  ['-135 Apr Babylon', 1671853.759762, 32.50],
  ['-309 Aug Babylon', 1608421.835171, 32.50],
  ['-430 Aug Athens', 1564215.113895, 37.97],
  ['-556 May Babylon', 1518118.032841, 32.50],
  ['-584 May Halys', 1507900.104145, 39.00],
  ['-647 Apr Babylon', 1484836.848499, 32.50],
  ['-708 Jul Lu', 1462658.779682, 35.60],
  ['-762 Jun Nineveh', 1442902.839207, 36.36],
];
console.log('\n4. BCE ARBITRATION — candidate − Meeus syzygy shift (minutes) per ancient event:');
console.log('   ' + 'event'.padEnd(20) + CANDIDATES.map(([n]) => n.slice(0, 12).padStart(14)).join(''));
const finders4 = CANDIDATES.map(([n, f]) => [n, mkNative(f)]);
const shifts = new Map(CANDIDATES.map(([n]) => [n, []]));
for (const [label, jd, lat] of BCE) {
  const a = meeus.findSolarEclipsesInRange(jd - 20, jd + 20);
  if (!a.length) { console.log('   ' + label.padEnd(20) + 'no Meeus event'); continue; }
  const row = [label.padEnd(20)];
  for (const [n, f] of finders4) {
    const b = f.findSolarEclipsesInRange(jd - 20, jd + 20);
    const dMin = b.length ? (b[0].jd - a[0].jd) * 1440 : NaN;
    if (Number.isFinite(dMin)) shifts.get(n).push({ dMin, lat });
    row.push(dMin.toFixed(2).padStart(14));
  }
  console.log('   ' + row.join(''));
}
console.log('\n   decomposition: mean = ΔT-degenerate · seasonal sd = FALSIFIABLE · km = sd on the ground:');
for (const [n, arr] of shifts) {
  const m = arr.reduce((s, x) => s + x.dMin, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x.dMin - m) ** 2, 0) / arr.length);
  const latM = arr.reduce((s, x) => s + x.lat, 0) / arr.length;
  const km = sd * 60 * 0.46381 * Math.cos(latM * D2R);
  console.log(`   ${n.padEnd(22)} mean ${m.toFixed(2).padStart(7)} min · seasonal sd ${sd.toFixed(2)} min ≈ ${km.toFixed(0)} km E–W`);
}

// ── 5. L(t) VARIANTS × the C1 e-law (attributing the BCE constant+trend) ─
// Section 4 measured C1's BCE shift as ≈ −15.4 min constant + ~1.2 min/cy
// epoch trend + only 0.73 min detrended (seasonal) scatter. The
// constant+trend class is the LINEAR tropical rate missing the rate DRIFT:
// Meeus carries it as the L0 T² term (0.0003032 deg/cy², equivalent to
// d(tropYear)/dt = −0.53 s/cy); the framework's own claim is the f(Y)
// Fourier tropical year (computeSolarYearDaysDirect — measured local drift
// −0.97 s/cy at J2000). Wire L(t) = L0 + rate·T + ∫(rate(y)−rate_lin)dy
// from the framework's own evaluator (ZERO new constants; tropDays taken
// as Julian days — the LOD/SI day gap is ΔT-class and lands in the
// constant/trend we decompose anyway), vs a Meeus-T²-only reference.
// (machinery hoisted above the assembled-sun construction)
const LVARIANTS = [
  ['linear (current)', null],
  ['framework ∫f(Y) days', mkCum(rateYrDays)],
  ['framework ∫f(Y) SI', mkCum(rateYrSI)],
  ['f(Y) SI drift-only', LDRIFT],
  ['Meeus-T² only', (y) => L0deg + RATEcy * (y - 2000) / 100 + 0.0003032 * ((y - 2000) / 100) ** 2],
];
const C1ecc = CANDIDATES[1][1];
console.log('\n5. L(t) VARIANTS × C1 e-law — modern all-phase + BCE decomposition:');
for (const [name, lonAt] of LVARIANTS) {
  const f = mkNative(C1ecc, lonAt);
  const rr = [];
  for (const [jd, , , jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonNodalPrecessionDaysEarth) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const T = (jb - 2451545.0) / 36525;
    rr.push(wrap(f.sunLonDegAt(jb) - (jplSun - dPsiDeg)) * AS - sunPlanetaryCompletionDeg(T) * AS);
  }
  const s = stats(rr);
  const pts = [];
  for (const [, jd] of BCE) {
    const a = meeus.findSolarEclipsesInRange(jd - 20, jd + 20);
    const b = f.findSolarEclipsesInRange(jd - 20, jd + 20);
    if (a.length && b.length) pts.push([2000 + (jd - C.j2000JD) / 365.25, (b[0].jd - a[0].jd) * 1440]);
  }
  const n2 = pts.length;
  const mx = pts.reduce((s2, p) => s2 + p[0], 0) / n2, my = pts.reduce((s2, p) => s2 + p[1], 0) / n2;
  let sxy = 0, sxx = 0;
  for (const [x, yv] of pts) { sxy += (x - mx) * (yv - my); sxx += (x - mx) ** 2; }
  const slope = sxy / sxx;
  const det = Math.sqrt(pts.reduce((s2, [x, yv]) => s2 + (yv - (my + slope * (x - mx))) ** 2, 0) / n2);
  console.log(`   ${name.padEnd(18)} modern mean ${s.m.toFixed(2)}″ scatter ${s.sd.toFixed(2)}″ · BCE mean ${my.toFixed(1)} min · trend ${(slope * 100).toFixed(2)} min/cy · detrended sd ${det.toFixed(2)} min`);
}

// ── 6. PERIOD EXPLORATION (why some numbers worsened; H/8, H/5 probes) ──
// Diagnosis carried in from the E4 rebaselines: the ±4h umbra scan absorbs
// along-track error, so the Babylon −135 gap change (206 → 277 km) is
// CROSS-TRACK — the syzygy shift moves the Moon's node offset (β at
// syzygy), ~74 km of track latitude per 165 s. The BCE MEAN/TREND
// therefore has a real umbra cost (not fully ΔT-degenerate) and is owned
// by the L(t) DRIFT SHAPE; the SEASONAL detrended sd is owned by the
// e-COUPLING period. 6a: which tropical-year harmonic carries the BCE
// drift. 6b: drift-shape subsets × C1, with the −746 lunar probe (the
// babylon746 ttRes mover) and the −135 shift. 6c: e-coupling period
// variants — DIAGNOSTIC amplitudes (base/2 each); a period that helps
// then needs a DERIVED amplitude before it can ship (the AMD-α-scan
// precedent: fitted-scan amplitudes are numerology).
const HARM = C.TROPICAL_YEAR_HARMONICS;
const c1of = (y) => DT.cyclesBetweenYears(C.balancedYear, y, 1);
const harmDays = (y, subset) => {
  const c = c1of(y);
  let s = 0;
  for (const [div, sinC, cosC] of HARM) {
    if (subset && !subset.includes(div)) continue;
    const ph = div * c * 2 * Math.PI;
    s += sinC * Math.sin(ph) + cosC * Math.cos(ph);
  }
  return s;
};
// cheap perturbative rate for a harmonic subset on the mean base (SI-clean:
// LOD held at 86400 — the LOD part of the drift is ΔT's job)
const rateSubsetYr = (subset) => (y) => 360 * 365.25
  / (C.meanSolarYearDays + harmDays(y, subset));
const B746 = 1448617.7999;   // −746 Feb 6 canon jd_TD
console.log('\n6a. PER-HARMONIC drift-only ΔL, as syzygy-timing minutes (rel. rate 0.5086°/h):');
console.log('   div    period(kyr)   δt(−135) min   δt(−746) min');
for (const [div] of HARM) {
  const L = mkCum(rateSubsetYr([div]), rateSubsetYr([div])(2000));
  const lin = (y) => L0deg + RATEcy * (y - 2000) / 100;
  const dmin = (y) => (L(y) - lin(y)) / 0.5086 * 60;
  console.log(`   H/${String(div).padEnd(3)} ${(C.H / div / 1000).toFixed(1).padStart(9)} ${dmin(-135).toFixed(2).padStart(13)} ${dmin(-746).toFixed(2).padStart(14)}`);
}

console.log('\n6b. DRIFT-SHAPE subsets × C1 — BCE decomposition + the −746/−135 probes:');
const DVARIANTS = [
  ['full f(Y) (shipped)', LDRIFT],
  ['H/8 only', mkCum(rateSubsetYr([8]), rateSubsetYr([8])(2000))],
  ['all but H/8', mkCum(rateSubsetYr(HARM.map(h => h[0]).filter(d => d !== 8)), rateSubsetYr(HARM.map(h => h[0]).filter(d => d !== 8))(2000))],
  ['H/8 + H/3 only', mkCum(rateSubsetYr([3, 8]), rateSubsetYr([3, 8])(2000))],
  ['linear (no drift)', null],
  // DIAGNOSTIC scale scan (a fitted scale cannot ship — it asks what drift
  // magnitude the corpus wants; cf. the −0.33 vs −0.53 s/cy local-slope
  // undershoot vs Meeus):
  ...[1.2, 1.33, 1.45, 1.6].map((k) => [
    `full drift × ${k}`,
    (y) => {
      const lin = L0deg + RATEcy * (y - 2000) / 100;
      return lin + k * (LDRIFT(y) - lin);
    },
  ]),
];
const b746meeus = meeus.findLunarEclipsesInRange(B746 - 5, B746 + 5)[0];
const b135meeus = meeus.findSolarEclipsesInRange(1671853.76 - 20, 1671853.76 + 20)[0];
for (const [name, lonAt] of DVARIANTS) {
  const f = mkNative(C1ecc, lonAt);
  const pts = [];
  for (const [, jd] of BCE) {
    const a = meeus.findSolarEclipsesInRange(jd - 20, jd + 20);
    const b = f.findSolarEclipsesInRange(jd - 20, jd + 20);
    if (a.length && b.length) pts.push([2000 + (jd - C.j2000JD) / 365.25, (b[0].jd - a[0].jd) * 1440]);
  }
  const n2 = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n2, my = pts.reduce((s, p) => s + p[1], 0) / n2;
  let sxy = 0, sxx = 0;
  for (const [x, yv] of pts) { sxy += (x - mx) * (yv - my); sxx += (x - mx) ** 2; }
  const slope = sxy / sxx;
  const det = Math.sqrt(pts.reduce((s, [x, yv]) => s + (yv - (my + slope * (x - mx))) ** 2, 0) / n2);
  const b746 = f.findLunarEclipsesInRange(B746 - 5, B746 + 5)[0];
  const b135 = f.findSolarEclipsesInRange(1671853.76 - 20, 1671853.76 + 20)[0];
  const d746 = (b746.jd - b746meeus.jd) * 1440, d135 = (b135.jd - b135meeus.jd) * 1440;
  console.log(`   ${name.padEnd(20)} BCE mean ${my.toFixed(1).padStart(6)} · trend ${(slope * 100).toFixed(2).padStart(6)} · det sd ${det.toFixed(2)} min · δ(−746) ${d746.toFixed(1).padStart(6)} min · δ(−135) ${d135.toFixed(1).padStart(6)} min`);
}

console.log('\n6c. e-COUPLING period variants (each base/2, J2000-anchored diff form) × shipped drift:');
const cosN = (n) => (y) => Math.cos((n * (y - C.balancedYear) / C.H * 360 - 180) * D2R);
const mkCoup = (...terms) => (y) => eH16(y)
  + terms.reduce((s, cN) => s + (C.eccentricityBase / 2) * (cN(y) - cN(2000)), 0);
const CVARIANTS = [
  ['H/3 (shipped C1)', C1ecc],
  ['H/8', mkCoup(cosN(8))],
  ['H/5', mkCoup(cosN(5))],
  ['H/3 + H/8', mkCoup(cosN(3), cosN(8))],
  ['H/3 + H/5', mkCoup(cosN(3), cosN(5))],
];
for (const [name, eccAt] of CVARIANTS) {
  const f = mkNative(eccAt, LDRIFT);
  const rr = [];
  for (const [jd, , , jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (N.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonNodalPrecessionDaysEarth) * D2R;
    const dPsiDeg = (N.psiOmega * Math.sin(om)) / 3600;
    const T = (jb - 2451545.0) / 36525;
    rr.push(wrap(f.sunLonDegAt(jb) - (jplSun - dPsiDeg)) * AS - sunPlanetaryCompletionDeg(T) * AS);
  }
  const s = stats(rr);
  const pts = [];
  for (const [, jd] of BCE) {
    const a = meeus.findSolarEclipsesInRange(jd - 20, jd + 20);
    const b = f.findSolarEclipsesInRange(jd - 20, jd + 20);
    if (a.length && b.length) pts.push([2000 + (jd - C.j2000JD) / 365.25, (b[0].jd - a[0].jd) * 1440]);
  }
  const n2 = pts.length, mx = pts.reduce((s2, p) => s2 + p[0], 0) / n2, my = pts.reduce((s2, p) => s2 + p[1], 0) / n2;
  let sxy = 0, sxx = 0;
  for (const [x, yv] of pts) { sxy += (x - mx) * (yv - my); sxx += (x - mx) ** 2; }
  const slope = sxy / sxx;
  const det = Math.sqrt(pts.reduce((s2, [x, yv]) => s2 + (yv - (my + slope * (x - mx))) ** 2, 0) / n2);
  console.log(`   ${name.padEnd(18)} modern scatter ${s.sd.toFixed(2)}″ · ė(J2000) ${((eccAt(2050) - eccAt(1950))).toExponential(2)} · BCE det sd ${det.toFixed(2)} min`);
}
