// THE (d′) CHAIN-RATE ATTRIBUTION — the evidence record behind the of-date
// rate completion (ṅ campaign, plan §12i item 0 (d′)).
//
// MEASURED CONCLUSIONS (this instrument, pre-(d′) chains — the raw chains
// are untouched by (d′), so these numbers remain reproducible):
//  1. The chains' J2000 rates vs the certified bundle rates (″/cy):
//     tropical −4.20 · anomalistic −22.11 · draconic +2.15 · mean Sun
//     −4.50 · perihelion H/16 −6.21 — and these compose EXACTLY into the
//     isolation-measured argument linears (−4.08/+0.42/+1.72/−21.99/+2.27).
//  2. The tropical gap is ENTIRELY the kinematic-vs-dynamical precession:
//     the +0.006 s tropical-month offset ≡ Δp(J2000) = p_dyn − p_kin =
//     +0.044″/yr, where p_dyn is the DAY-FORM beat sid/(sid−sol) of the
//     dynamical year evaluators (the tweakpane "Axial (yrs)" identity —
//     25,771.1 yr at J2000 ≈ IAU 25,771.5; VERIFIED against the pane at
//     1246-06-21: 25,823.11 vs displayed 25,823.10) and p_kin is the
//     kinematic pair's beat ≡ the H/13 lattice mean (50.2450″/yr) BY
//     CONSTRUCTION. Mixing the two day bases in the beat is a ~100-yr
//     error in the period — divide days by days.
//  3. The other chains' gaps are month-value construction residues against
//     the model's OWN catalog inputs (anomalistic +0.030 s, draconic
//     −0.003 s at J2000) — not precession.
//  4. ∫(p_dyn − p_kin)dt over T = −27..0 decomposes as +4.18″/cy·T +
//     0.658″/cy²·T² (osc RMS 0.3″): the T¹ is the (d′) rate fix; the T²
//     is the MODEL-NATIVE precession acceleration (60% of Lieske's
//     2.22″/cy²/2) — shipped pFix keeps it and reduces the obliquity
//     carrier's PA normalization by exactly ṗΔ/2 so the total Lp T²
//     stays the certified, DE441-validated budget.
//  5. Integrator acquitted: chain-table vs direct Simpson of the same
//     integrand = 0.000″/cy at every span tested (25..2700 yr).
// SHIPPED RESULT (u2-args-branch-isolation.mjs, post-(d′)): all five
// argument linears ≤0.06″/cy, quadratics ≤0.18″/cy²; deep−canon at the
// −135 eclipse instant = +8.9″ (from +427″ at campaign start).
//
//   node tools/explore/u2-chain-rate-attribution.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');
const DT = require2('/home/dennis/code/3d/tools/lib/deep-time.js');
const { createChainCycleIntegrator } = require2('@essrt/physics/chain-cycles');

const _SI_TROP_DAYS = DT.MEAN_TROPICAL_YEAR_J2000_S / 86400;
const jdToSIyear = (jd) => C.startModelYearWithCorrection + (jd - C.startmodelJD) / _SI_TROP_DAYS;
const chain = createChainCycleIntegrator({
  ageAnchorYear: C.startmodelYear,
  tropicalYearSecondsAtAge: DT.meanTropicalYearSecondsAtAge,
  tropicalYearJ2000Seconds: C.meanSolarYearDays * C.meanLengthOfDay,
  isDeepTime: () => true,
});
const mc = (fn, a, b) => chain.cyclesBetween(fn, a, b);

const LPR = 481267.88123421, DR = 445267.1114034, MR = 35999.0502909,
  WDOT = 4069.0137287;
const MPR = LPR - WDOT, FR = LPR + 1934.1362891;

const y0 = jdToSIyear(C.j2000JD);
const dyPerDay = (jdToSIyear(C.j2000JD + 5000) - jdToSIyear(C.j2000JD - 5000)) / 10000;
const cyPerYearUnit = 1 / (36525 * dyPerDay);
const H = 25;
const rate = (fn) => 360 * fn(y0 - H, y0 + H) / (2 * H);
const gap = (rChain, rCertCy) => (rChain - rCertCy * cyPerYearUnit) / cyPerYearUnit * 3600;

const gTrop = gap(rate((a, b) => mc(DT.meanTropicalMonthAtAge, a, b)), LPR);
const gAnom = gap(rate((a, b) => mc(DT.meanAnomalisticMonthAtAge, a, b)), MPR);
const gDrac = gap(rate((a, b) => mc(DT.meanNodalMonthAtAge, a, b)), FR);
const gPeri = gap(rate((a, b) => DT.cyclesBetweenYears(a, b, 16)), LPR - DR - MR);
const gLsun = gap(360, LPR - DR);
console.log('1. chain − certified J2000 rates (″/cy):');
console.log(`   tropical ${gTrop.toFixed(2)} | anomalistic ${gAnom.toFixed(2)} | draconic ${gDrac.toFixed(2)} | mean Sun ${gLsun.toFixed(2)} | H/16 ${gPeri.toFixed(2)}`);
console.log('   argument closure: Lp≡trop | Mp≡anom | F≡drac | D=trop−sun | M=sun−peri:');
console.log(`     Lp ${gTrop.toFixed(2)} (iso −4.08) | Mp ${gAnom.toFixed(2)} (iso −21.99) | F ${gDrac.toFixed(2)} (iso +2.27) | D ${(gTrop - gLsun).toFixed(2)} (iso +0.42) | M ${(gLsun - gPeri).toFixed(2)} (iso +1.72)`);

const pDyn = (year) => {
  const sid = DT.computeSiderealYearDaysDirect(year);
  const sol = DT.computeSolarYearDaysDirect(year);
  return 360 * 3600 * (sid - sol) / sid;
};
const pKin = (year) => {
  const t = (C.startmodelYear - year) / 1e6;
  const sid = DT.meanSiderealYearSecondsAtAge(t);
  const trop = DT.meanTropicalYearSecondsAtAge(t);
  return 360 * 3600 * (sid - trop) / sid;
};
console.log('\n2. the precession pair (day-form dynamical vs kinematic, ″/yr):');
for (const yr of [2000, 1246.47, -135]) {
  console.log(`   year ${String(yr).padStart(8)}: p_dyn ${pDyn(yr).toFixed(4)} (${(1296000 / pDyn(yr)).toFixed(2)} yr) | p_kin ${pKin(yr).toFixed(4)} | Δp ${(pDyn(yr) - pKin(yr)).toFixed(4)}`);
}
console.log(`   tropical gap ${gTrop.toFixed(2)} = −Δp(2000)·100 ${(-(pDyn(2000) - pKin(2000)) * 100).toFixed(2)} + month residue ${(gTrop + (pDyn(2000) - pKin(2000)) * 100).toFixed(2)} ″/cy`);

console.log('\n3. month-value offsets at J2000 (chain − certified-implied, s):');
console.log(`   tropical ${(DT.meanTropicalMonthAtAge(0) - 360 * 36525 * 86400 / LPR).toFixed(4)} | anomalistic ${(DT.meanAnomalisticMonthAtAge(0) - 360 * 36525 * 86400 / MPR).toFixed(4)} | draconic ${(DT.meanNodalMonthAtAge(0) - 360 * 36525 * 86400 / FR).toFixed(4)}`);

// 4. the pFix integral decomposition
const pts = [];
for (let T = -27; T <= 0.01; T += 0.75) {
  const yearEnd = 2000 + T * 100;
  const N = Math.max(4, 2 * Math.ceil(Math.abs(T) * 4));
  const h = (yearEnd - 2000) / N;
  const f = (y) => (pDyn(y) - pKin(y));
  let s = f(2000) + f(yearEnd);
  for (let i = 1; i < N; i++) s += f(2000 + i * h) * (i % 2 ? 4 : 2);
  pts.push({ T, arc: s * h / 3 });
}
const S = [0, 0, 0, 0, 0], Y = [0, 0, 0];
for (const p of pts) { const t = p.T; S[0] += 1; S[1] += t; S[2] += t * t; S[3] += t ** 3; S[4] += t ** 4; Y[0] += p.arc; Y[1] += p.arc * t; Y[2] += p.arc * t * t; }
const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]]; const b = [...Y];
for (let c = 0; c < 3; c++) { let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]; for (let r = c + 1; r < 3; r++) { const f = A[r][c] / A[c][c]; for (let cc = c; cc < 3; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; } }
const x = [0, 0, 0]; for (let c = 2; c >= 0; c--) { let s2 = b[c]; for (let cc = c + 1; cc < 3; cc++) s2 -= A[c][cc] * x[cc]; x[c] = s2 / A[c][c]; }
console.log('\n4. ∫(p_dyn − p_kin)dt over T = −27..0 (″):');
console.log(`   const ${x[0].toFixed(2)} | T ${x[1].toFixed(2)} ″/cy | T² ${x[2].toFixed(3)} ″/cy²  → at −135: ${(x[0] + x[1] * -21.35 + x[2] * 21.35 ** 2).toFixed(0)}″`);
console.log('   (shipped: pFix on Lp; obliquity carrier PA reduced by ṗΔ/2; ϖ/Ω rate-anchored only)');
