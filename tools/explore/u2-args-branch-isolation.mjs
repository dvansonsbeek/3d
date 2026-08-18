// STEP (b) ROOT-CAUSE INSTRUMENT: per-argument deep-vs-snapshot isolation.
//
// CONCLUSION (measured): the deep−snapshot secular gap lives in the
// ARGUMENTS, not the series or frames. Quadratic fits over T = −27..0 cy:
//   Lp: 2c = +0.91 ″/cy² (at −135: +205″)   D: +0.91   F: +1.01
//   Mp: 2c = +0.67 with a −17.33 ″/cy linear (at −135: +532″ → couples
//       into λ via the 6.29° equation-of-centre term)
//   M : 2c = 0.00 — the Sun-side chain is CLEAN (Lsun/ws use the linear
//       model timeline + secular deviations, no month chain).
// The Lp gap decomposes fully in u2-lp-decomposition.mjs: the dominant
// term is the ELP OF-DATE T³/T⁴ TAIL the deep branch omits (+0.68),
// not the tidal T² — the chain's local implied ṅ is −25.87 ″/cy² at
// every age across the span, i.e. already Driver-1-consistent.
//
// Method: instantiate createMoonArguments TWICE with identical
// constants/fns except isDeepTime (true vs false), using tools-lib's
// exact wiring (chains from deep-time.js + the shared chain-cycle
// integrator). Difference each argument at 19 TT epochs across 27
// centuries; quadratic per argument. No series, no frame — pure args.
// (Two earlier probes failed instructively: differencing full λ aliases
// ±6° periodic content at 19 samples; flipping SG_DEEP_TIME on the
// engine mixes frame + arguments. Argument-level isolation is required.)
//
//   node tools/explore/u2-args-branch-isolation.mjs
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

function build(deep) {
  const chain = createChainCycleIntegrator({
    ageAnchorYear: C.startmodelYear,
    tropicalYearSecondsAtAge: DT.meanTropicalYearSecondsAtAge,
    tropicalYearJ2000Seconds: C.meanSolarYearDays * C.meanLengthOfDay,
    isDeepTime: () => deep,
  });
  const mc = (periodFn, a, b) => chain.cyclesBetween(periodFn, a, b);
  const mcTropical = (a, b) => mc(DT.meanTropicalMonthAtAge, a, b);
  const mcAnomalistic = (a, b) => mc(DT.meanAnomalisticMonthAtAge, a, b);
  const mcDraconic = (a, b) => mc(DT.meanNodalMonthAtAge, a, b);
  return createMoonArguments({
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
      apsidalOfDateCyclesBetween: (a, b) => {
        const t = mcTropical(a, b), n = mcAnomalistic(a, b);
        return (t === null || n === null) ? null : t - n;
      },
      nodalOfDateCyclesBetween: (a, b) => {
        const dr = mcDraconic(a, b), t = mcTropical(a, b);
        return (dr === null || t === null) ? null : dr - t;
      },
      cyclesBetween: DT.cyclesBetweenYears,
      isDeepTime: () => deep,
      isFrameworkNative: () => true,
      // (d′) of-date rate completion pair (deep branch only; the snapshot
      // branch never reads them) — tools-lib wiring
      pDynDegPerYearAt: (year) => {
        const sid = DT.computeSiderealYearDaysDirect(year);
        const sol = DT.computeSolarYearDaysDirect(year);
        return 360 * (sid - sol) / sid;
      },
      pKinDegPerYearAt: (year) => {
        const t = (C.startmodelYear - year) / 1e6;
        const sid = DT.meanSiderealYearSecondsAtAge(t);
        const trop = DT.meanTropicalYearSecondsAtAge(t);
        return (sid === null || trop === null) ? 0 : 360 * (sid - trop) / sid;
      },
    },
  });
}

const deepArgs = build(true);
const snapArgs = build(false);
const EPOCHS = [];
for (let T = -27; T <= 0.01; T += 1.5) EPOCHS.push(2451545.0 + T * 36525);

const NAMES = ['Lp', 'D', 'M', 'Mp', 'F'];
const series = Object.fromEntries(NAMES.map((n) => [n, []]));
for (const jdTT of EPOCHS) {
  const d = deepArgs.argsAt(jdTT);
  const s = snapArgs.argsAt(jdTT);
  const T = (jdTT - 2451545.0) / 36525;
  for (const n of NAMES) {
    let diff = d[n] - s[n];
    diff = ((diff + 540) % 360) - 180;
    series[n].push({ T, arc: diff * 3600 });
  }
}
console.log('per-argument DEEP − SNAPSHOT (arcsec), quadratic fits:');
for (const n of NAMES) {
  const pts = series[n];
  const S = [0, 0, 0, 0, 0], Y = [0, 0, 0];
  for (const p of pts) { const t = p.T; S[0] += 1; S[1] += t; S[2] += t * t; S[3] += t ** 3; S[4] += t ** 4; Y[0] += p.arc; Y[1] += p.arc * t; Y[2] += p.arc * t * t; }
  const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]]; const b = [...Y];
  for (let c = 0; c < 3; c++) { let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; for (let r = c + 1; r < 3; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc < 3; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; } }
  const x = [0, 0, 0]; for (let c = 2; c >= 0; c--) { let s2 = b[c]; for (let cc = c + 1; cc < 3; cc++) s2 -= A[c][cc] * x[cc]; x[c] = s2 / A[c][c]; }
  const resid = pts.map((p) => p.arc - (x[0] + x[1] * p.T + x[2] * p.T * p.T));
  const rms = Math.sqrt(resid.reduce((s2, v) => s2 + v * v, 0) / pts.length);
  console.log(`  ${n.padEnd(3)}: const ${x[0].toFixed(1).padStart(8)} | T ${x[1].toFixed(2).padStart(8)} | T² ${x[2].toFixed(3).padStart(8)}  → 2c = ${(2 * x[2]).toFixed(2).padStart(7)} ″/cy²  (resid RMS ${rms.toFixed(1)}″)`);
  console.log(`       at −135 (T=−21.35): ${(x[0] + x[1] * -21.35 + x[2] * 21.35 ** 2).toFixed(0)}″`);
}
