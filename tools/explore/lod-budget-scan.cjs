#!/usr/bin/env node
// THE MODERN LENGTH-OF-DAY BUDGET UNDER TWO DECOMPOSITIONS — the instrument
// behind the "J2 → α factor" question (docs/99 §GIA calibration).
//
//   node tools/explore/lod-budget-scan.cjs                          (the shipped budget)
//   RATE_FACTOR=1.5 node tools/explore/lod-budget-scan.cjs          (the degree-2 identity, no other change)
//   RATE_FACTOR=1.5 BETA=0.056 node tools/explore/lod-budget-scan.cjs
//   … FIT=1      → the joint ΔT fitter in REPORT mode under that budget (no --write)
//   … ANCHORS=1  → the paleo-anchor gate under that budget
//
//   RATE_FACTOR  the J2 → α conversion: dα/dt(J2000) = DJ2 / RATE_FACTOR   (shipped 2.0)
//   DJ2          the J2 rate, per year                                     (shipped −2.7e-11, Cox & Chao 2002)
//   BETA         a NET SOLAR TIDE on the Earth–Moon angular-momentum budget,
//                as a fraction of the lunar transfer, in the ≤ jointMa era (shipped 0: closed budget)
//   TAU_KYR      the GIA relaxation time                                   (shipped 6)
//
// Read-only: everything is patched IN MEMORY before the engine loads (the
// constants object and the package's solar-channel factory). No file is
// touched, nothing is written — a research instrument, not a fitter.
//
// THE QUESTION. The shipped GIA channel converts the observed J2 rate to a
// polar-moment rate with "factor 2.0": dα/dt = dJ2/dt ÷ 2.0 = −1.35e-11 /yr
// (−0.35 ms/cy). For a degree-2 zonal mass redistribution the trace of the
// inertia tensor is conserved, ΔA = −ΔC/2, so ΔJ2 = (3/2)·Δα — factor 1.5,
// −1.80e-11 /yr, −0.47 ms/cy. (The literature's "2.0" is the RELATIVE form:
// ΔC/C = (2/3)(MR²/C)·ΔJ2 = 2.016·ΔJ2.)
//
// MEASURED (J2000 rates in ms/cy; joint fit −720…2017 in report mode):
//   budget                                   tidal+GIA   Espenak RMS   full RMS
//   shipped: factor 2.0, closed budget         1.770       13.43 s      28.75 s
//   factor 1.5 alone                           1.652       21.63 s     353.70 s   ← the record rejects it
//   factor 1.5 + net solar tide 4.0 %                      16.41 s      48.24 s
//   factor 1.5 + net solar tide 5.6 %                      12.47 s      25.03 s   ← better than shipped
//   factor 1.5 + net solar tide 7.0 %                      21.87 s      38.26 s
//   factor 1.5, dJ2/dt −3.0e-11, tide 8.5 %                13.61 s      30.95 s
//   factor 1.5, dJ2/dt −3.6e-11, tide 14 %                 14.90 s      38.61 s
// READING. The eclipse-era record fixes the SUM of the two secular terms
// (≈ 1.77 ms/cy); it cannot separate them. The shipped pair (lunar-only tidal
// 2.12, GIA −0.35) and the standard pair (lunar 2.12 + net solar tide ≈ 0.12,
// GIA −0.47) land on the same sum: the factor 2.0 has been standing in for the
// solar tide the closed Earth–Moon budget leaves out (errors that cancel). The
// standard pair with the observed Cox–Chao rate and a 5.6 % net solar tide
// (Christodoulidis et al. 1988: total tidal 2.24 ms/cy) fits the record
// slightly better than the shipped one.
// THE COST AT DEPTH. A net solar tide in the ≤ jointMa era moves the Phanerozoic
// day: at 5.6 % the Devonian day reads 21.809 h against 21.915 h, and 6 of the
// 43 paleo anchors leave their tolerance (five Wells coral rows at +0.5–0.6 %,
// Wu 650 Ma at −2.6 %) — the recession polynomial is calibrated as a CLOSED
// budget and would have to be recalibrated with it.

'use strict';
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');
const FACTOR = Number(process.env.RATE_FACTOR || '2.0');
const DJ2 = Number(process.env.DJ2 || '-2.7e-11');
const BETA = Number(process.env.BETA || '0');

const C = require(path.join(REPO, 'tools/lib/constants.js'));
C.ALPHA_GIA_RATE_J2000_PER_YR = DJ2 / FACTOR;
if (process.env.TAU_KYR) C.ALPHA_GIA_RELAXATION_KYR = Number(process.env.TAU_KYR);
if (BETA !== 0) {
  // L_EM(t) = L₀ + β·[L_orb(a₀) − L_orb(a(t))]: the spin loses (1 + β) of the lunar transfer.
  const RH = require(path.join(REPO, 'packages/physics/src/deltat/recession-history.cjs'));
  const orig = RH.createSolarChannelBudget;
  RH.createSolarChannelBudget = (deps) => {
    const o = orig(deps);
    const lOrb = (/** @type {number} */ a) => deps.mMoonAloneKg * Math.sqrt(deps.gmEmM3PerS2 * a) * deps.eFactorMoon;
    const a0 = deps.distanceMetresAtAge(0);
    return { lEmAtAgeKgm2S: (/** @type {number} */ t) => (t <= deps.jointMa ? deps.lTotalJ2000KgM2S + BETA * (lOrb(a0) - lOrb(deps.distanceMetresAtAge(t))) : o.lEmAtAgeKgm2S(t)) };
  };
}
console.log(`BUDGET factor ${FACTOR} · dJ2/dt ${DJ2.toExponential(2)} → dα/dt ${C.ALPHA_GIA_RATE_J2000_PER_YR.toExponential(3)} /yr · net solar tide β ${BETA} · τ ${C.ALPHA_GIA_RELAXATION_KYR} kyr`);

if (process.env.FIT === '1') {
  process.env.DT_CORRECTIONS_DISABLED = '1';
  process.argv = [process.argv[0], path.join(REPO, 'tools/fit/dt-corrections-fit.js'), '--joint'];
  require(path.join(REPO, 'packages/fitting/src/dt-corrections-fit.cjs'));
} else if (process.env.ANCHORS === '1') {
  require(path.join(REPO, 'tools/verify/paleo-anchors.js'));
} else {
  const DT = require(path.join(REPO, 'tools/lib/deep-time.js'));
  const d = DT.dLodDtDecompositionAtAge(0);
  console.log(`J2000 dLOD/dt (ms/cy): lunar tidal ${d.tidal.toFixed(4)} · GIA ${d.gia.toFixed(4)} · sum ${d.net_L2.toFixed(4)} (the solar tide, when set, acts through the mean day below — this row does not show it)`);
  for (const y of [-720, 0, 1000]) { const q = DT.dLodDtDecompositionAtAge((2000 - y) / 1e6); console.log(`  ${String(y).padStart(5)}: GIA ${q.gia.toFixed(4)} · sum ${q.net_L2.toFixed(4)}`); }
  const lod = (/** @type {number} */ y) => DT.meanLodSecondsAtAge((2000 - y) / 1e6);
  console.log(`mean-day slope 1900…2100 (ms/cy): ${((lod(2100) - lod(1900)) / 2 * 1000).toFixed(4)}`);
  for (const [name, ma] of /** @type {[string, number][]} */ ([['Devonian 380 Ma', 380], ['650 Ma', 650], ['1000 Ma', 1000]])) console.log(`  day at ${name}: ${DT.meanLodHoursAtAge(ma).toFixed(4)} h`);
}
