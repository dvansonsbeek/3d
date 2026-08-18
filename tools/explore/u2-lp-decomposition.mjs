// STEP (b) ROOT-CAUSE DECOMPOSITION: the deep−snapshot Lp quadratic
// (+0.91 ″/cy² over T = −27..0 cy, from u2-args-branch-isolation.mjs)
// split into its structural components, with exact closure.
//
// CONCLUSION (measured — the closure table this script prints):
//   +0.68  the certified skeleton's OF-DATE T³/T⁴ TAIL
//          (T³/538841 − T⁴/65194000 deg; −161″ at T=−27), which the
//          deep branch has NO counterpart for — a cubic quadratic-fitted
//          over [−27,0] aliases into T². THE ROOT CAUSE.
//   +0.22  planetaryCarrier curvature: the e²(t) integral vs its own
//          ±50-yr secant normalization (kPl).
//   −0.01  obliquityCarrier vs its (J2 + precession-PA) T² reference —
//          closes.
//   +0.03  the integrator's Y(t)/Y0 weighting convention (evolving
//          tropical year against the linear jdToSIyear coordinate).
//   = +0.91 ✓
// ACQUITTALS (also verified here): the chain's local implied ṅ is
// −25.87 ″/cy² at EVERY age across the span (≡ Driver-1's −25.83 from
// ȧ = 3.82 cm/yr) — the tidal T² is NOT the problem; and the J2000
// anchors (Y(0), MEAN_TROPICAL_YEAR_J2000_S, meanSolarYearDays·mLOD)
// are bit-identical.
//
//   node tools/explore/u2-lp-decomposition.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');
const DT = require2('/home/dennis/code/3d/tools/lib/deep-time.js');
const OE = require2('/home/dennis/code/3d/tools/lib/orbital-engine.js');
const { createMoonArguments } = require2('@essrt/physics/moon/arguments');
const { createChainCycleIntegrator } = require2('@essrt/physics/chain-cycles');

const AR = C.ASTRO_REFERENCE;
const _SI_TROP_DAYS = DT.MEAN_TROPICAL_YEAR_J2000_S / 86400;
const jdToSIyear = (jd) => C.startModelYearWithCorrection + (jd - C.startmodelJD) / _SI_TROP_DAYS;

const chain = createChainCycleIntegrator({
  ageAnchorYear: C.startmodelYear,
  tropicalYearSecondsAtAge: DT.meanTropicalYearSecondsAtAge,
  tropicalYearJ2000Seconds: C.meanSolarYearDays * C.meanLengthOfDay,
  isDeepTime: () => true,
});
const mcTropical = (a, b) => chain.cyclesBetween(DT.meanTropicalMonthAtAge, a, b);

const factory = createMoonArguments({
  constants: {
    j2000JD: C.j2000JD, julianCenturyDays: 36525,
    holisticYearJ2000: C.H,
    balancedYearJ2000: C.balancedYear,
    meanSolarYearDays: C.meanSolarYearDays,
    meanAnomalisticYearDays: C.meanAnomalisticYearDays,
    tropicalYearHarmonics: C.TROPICAL_YEAR_HARMONICS,
    anomalisticYearHarmonics: C.ANOMALISTIC_YEAR_HARMONICS,
    eccentricityJ2000: AR.earthEccentricityJ2000,
    eccentricityDotJ2000: AR.earthEccentricityDotJ2000,
    eccentricityDotDotJ2000: AR.earthEccentricityDotDotJ2000,
    elpEarthFigureJ2ArcsecPerCy2: AR.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2,
    elpGeneralPrecessionPA_T2ArcsecPerCy2: AR.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976,
    eccE0: DT._moonEcc().e0,
  },
  fns: {
    eccAt: DT._fwEarthEcc,
    channelIntegral: (T, s) => DT._moonEcc().channelIntegral(T, s),
    computeObliquityEarth: OE.computeObliquityEarth,
    jdToSIyear,
    tropicalOrbitsBetween: mcTropical,
    apsidalOfDateCyclesBetween: () => 0,   // Lp-only probe; w/om unused
    nodalOfDateCyclesBetween: () => 0,
    cyclesBetween: DT.cyclesBetweenYears,
    isDeepTime: () => true,
    isFrameworkNative: () => true,
  },
});

const B = factory.bundle;
const t2Obl = (AR.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2
  + AR.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976) / 3600;
const T2_PLANETARY_REF = B.T2_LP - B.T2_LP_TIDAL - t2Obl;
const argsY0 = jdToSIyear(C.j2000JD);

const parts = { 'chain−(lin+tidalT²)': [], '−(T³/T⁴ tail)': [], 'planetary−ref': [], 'obliquity−ref': [], TOTAL: [] };
for (let T = -27; T <= 0.01; T += 1.5) {
  const jd = 2451545.0 + T * 36525;
  const Ntrop = mcTropical(argsY0, jdToSIyear(jd));
  const chainPart = (360 * Ntrop - (B.LPR * T + B.T2_LP_TIDAL * T * T)) * 3600;
  const tailPart = -(T ** 3 / 538841 - T ** 4 / 65194000) * 3600;
  const plPart = (factory.planetaryCarrier(T) - T2_PLANETARY_REF * T * T) * 3600;
  const obPart = (factory.obliquityCarrier(T) - t2Obl * T * T) * 3600;
  parts['chain−(lin+tidalT²)'].push({ T, arc: chainPart });
  parts['−(T³/T⁴ tail)'].push({ T, arc: tailPart });
  parts['planetary−ref'].push({ T, arc: plPart });
  parts['obliquity−ref'].push({ T, arc: obPart });
  parts.TOTAL.push({ T, arc: chainPart + tailPart + plPart + obPart });
}

function quadFit(pts) {
  const S = [0, 0, 0, 0, 0], Y = [0, 0, 0];
  for (const p of pts) { const t = p.T; S[0] += 1; S[1] += t; S[2] += t * t; S[3] += t ** 3; S[4] += t ** 4; Y[0] += p.arc; Y[1] += p.arc * t; Y[2] += p.arc * t * t; }
  const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]]; const b = [...Y];
  for (let c = 0; c < 3; c++) { let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; for (let r = c + 1; r < 3; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc < 3; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; } }
  const x = [0, 0, 0]; for (let c = 2; c >= 0; c--) { let s2 = b[c]; for (let cc = c + 1; cc < 3; cc++) s2 -= A[c][cc] * x[cc]; x[c] = s2 / A[c][c]; }
  return x;
}

console.log('Lp deep−snapshot CLOSURE TABLE (quadratic fits, T = −27..0 cy):');
for (const [name, pts] of Object.entries(parts)) {
  const x = quadFit(pts);
  console.log(`  ${name.padEnd(20)}: const ${x[0].toFixed(2).padStart(8)} | T ${x[1].toFixed(2).padStart(7)} | 2c = ${(2 * x[2]).toFixed(2).padStart(6)} ″/cy²   at −135: ${(x[0] + x[1] * -21.35 + x[2] * 21.35 ** 2).toFixed(0)}″`);
}
console.log('  target: TOTAL 2c ≡ +0.91 (the measured Lp gap, u2-args-branch-isolation)');

console.log('\nACQUITTAL 1 — chain local implied ṅ across the span (Driver-1: −25.83):');
const P = DT.meanTropicalMonthAtAge;
for (const ageMa of [0, 0.0027, 0.01]) {
  const h = 0.0005;
  const dPdt = (P(ageMa - h) - P(ageMa + h)) / (2 * h * 1e6);
  const n = 360 * 3600 * 365.25 * 86400 / P(ageMa);
  console.log(`  age ${(ageMa * 1e6).toFixed(0).padStart(5)} yr: implied ṅ = ${(-n / P(ageMa) * dPdt * 1e4).toFixed(2)} ″/cy²`);
}
console.log('\nACQUITTAL 2 — Y(t) weighting bound:');
const h2 = 0.005;
const bSlope = (DT.meanTropicalYearSecondsAtAge(-h2) - DT.meanTropicalYearSecondsAtAge(h2)) / (2 * h2 * 1e6);
console.log(`  dY/dt = ${(bSlope * 100 * 1000).toFixed(2)} ms/cy → spurious 2c = ${(2 * 360 * 3600 * bSlope * 1e4 / (2 * P(0))).toFixed(2)} ″/cy²`);
