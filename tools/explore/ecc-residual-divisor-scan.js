/**
 * ecc-residual-divisor-scan.js
 *
 * Two-line e_E exploration: the framework H/16 law (law of cosines, e-max at
 * 1246.03, base/amp from Laws 4/5) is the fixed structural carrier; this scan
 * solves the RESIDUAL lattice line e2(t) = A·cos(ω_N t + φ) on top of it,
 * from the residual J2000 anchors
 *
 *   Δė = ė_obs − ė_law16(J2000)     (observed −4.2037e-5, law −8.389e-6)
 *   Δë = ë_obs − ë_law16(J2000)     (observed −2.534e-7,  law −1.098e-6)
 *
 * for every divisor N (period H/N), under two solve conventions:
 *
 *   EXACT      — (A, φ) from (Δė, Δë). Fits slope+curvature exactly but adds
 *                A·cosφ = −Δë/ω² to e(J2000) → breaks the observed value by
 *                0.2406/N² (analytic). No N preserves the value to
 *                observational precision below N ≈ 490 (period < 700 yr).
 *   QUADRATURE — φ = 90° exactly (zero J2000 value contribution), A = −Δė/ω.
 *                Preserves e(J2000) and ė exactly; leaves the (soft,
 *                theory-derived) ë at the law's own −1.098e-6 instead of
 *                Meeus's −2.534e-7 — an N-INDEPENDENT misfit. N then only
 *                shapes multi-kyr / deep-time behavior.
 *
 * Outputs per N: solved A and φ, J2000 value shift (exact mode), e-range of
 * the combined two-line e_E, epoch of the residual line's maximum, and the
 * BCE argument deviation vs the certified production line (H/3 solved from
 * the same three anchors) — Δϖ at −584 via the phase-aware channel integral.
 *
 * Usage: node tools/explore/ecc-residual-divisor-scan.js
 */

const C = require('../lib/constants');
const DT = require('../lib/deep-time');

const H = C.H;
const E_OBS = 0.01671022, ED_OBS = -4.2037e-5, EDD_OBS = -2.534e-7;
const S_W = 2.407, WDOT = 4069.0137111;

// ── H/16 law J2000 derivatives (analytic, law of cosines) ──────────────────
const b = C.eccentricityBase, a = C.eccentricityAmplitude;
const w16 = 2 * Math.PI * 16 / H * 100;               // rad per Julian cy
const th0 = 2 * Math.PI * (2000 - C.balancedYear) / C.perihelionCycleLength;
const e0law = Math.sqrt(b * b + a * a - 2 * a * b * Math.cos(th0));
const dedth = a * b * Math.sin(th0) / e0law;
const d2edth2 = (a * b * Math.cos(th0)) / e0law - (dedth * dedth) / e0law;
const ED_LAW = dedth * w16;
const EDD_LAW = d2edth2 * w16 * w16;
const dE = E_OBS - e0law, dED = ED_OBS - ED_LAW, dEDD = EDD_OBS - EDD_LAW;

console.log('═'.repeat(110));
console.log('  Residual-line divisor scan on top of the framework H/16 law');
console.log(`  law @J2000: e=${e0law.toFixed(9)}  ė=${ED_LAW.toExponential(4)}  ë=${EDD_LAW.toExponential(4)}`);
console.log(`  residual anchors: Δe=${dE.toExponential(2)}  Δė=${dED.toExponential(4)}  Δë=${dEDD.toExponential(4)}`);
console.log('═'.repeat(110));

// ── production reference: H/3 line solved from the three observed anchors ──
const PROD = (() => {
  const w = 2 * Math.PI / (H / 3) * 100;
  const Asin = -ED_OBS / w, Acos = -EDD_OBS / (w * w);
  return { w, A: Math.hypot(Asin, Acos), phi: Math.atan2(Asin, Acos), c: E_OBS - Acos };
})();
const eProd = (t_yr) => PROD.c + PROD.A * Math.cos(PROD.w * (t_yr / 100) + PROD.phi);

function law16(t_yr) { return DT._fwEarthEcc(t_yr); }

// channel integral ∫₀ᵀ[(g/g0)^s − 1]dt for a given e(t) and its own g0.
// maxStepYr must resolve the FASTEST line in efn (≤ period/16) or the Simpson
// rule aliases short-period residual lines into spurious BCE deviations.
function channelIntegral(T, s, efn, maxStepYr) {
  if (T === 0) return 0;
  const e00 = efn(0);
  const g0 = Math.pow(1 - e00 * e00, -1.5);
  const f = (t) => Math.pow(Math.pow(1 - efn(t * 100) ** 2, -1.5) / g0, s) - 1;
  const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / Math.min(4000, maxStepYr)));
  const h = T / N;
  let sum = f(0) + f(T);
  for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return sum * h / 3;
}

const T584 = (-584 - 2000) / 100, T720 = (-720 - 2000) / 100;
const Iprod584 = channelIntegral(T584, S_W, eProd, 4000);
const Iprod720 = channelIntegral(T720, S_W, eProd, 4000);
// reference: law16 alone (no residual line) — the H/16-pure state
// NOTE: the integrand already carries the power s — no outer S_W factor
// (ϖ = ϖ0 + WDOT·(T + I(T, s)); an outer S_W double-counts by 2.407×).
const dPhiLawOnly584 = WDOT * (channelIntegral(T584, S_W, law16, 1300) - Iprod584);
const dPhiLawOnly720 = WDOT * (channelIntegral(T720, S_W, law16, 1300) - Iprod720);
console.log(`\n  Reference (H/16 law alone, no residual line): Δϖ vs production at −584: ${dPhiLawOnly584.toFixed(3)}°, at −720: ${dPhiLawOnly720.toFixed(3)}°`);

const STRUCTURAL = new Set([2, 3, 5, 8, 13, 16, 21, 26, 32, 34, 48, 55, 64, 89, 128]);
const results = [];

for (let N = 1; N <= 128; N++) {
  const w = 2 * Math.PI * N / H * 100;                 // rad/cy
  // EXACT solve
  const As = -dED / w, Ac = -dEDD / (w * w);
  const Aex = Math.hypot(As, Ac), phiEx = Math.atan2(As, Ac);
  const valShift = Ac;                                  // added to e(J2000)
  // QUADRATURE solve (value-preserving)
  const Aq = -dED / w;                                  // φ=90°: e2 = −A·sin(ωt)
  const e2q = (t_yr) => -Aq * Math.sin(w * (t_yr / 100));
  const eTwoLine = (t_yr) => law16(t_yr) + e2q(t_yr);
  // residual-line max epoch (quadrature): ωt+90° = 0 → t = −(H/N)/4
  const tMaxQ = 2000 - (H / N) / 4;
  // combined range over one full beat (sample 40 kyr each side)
  let emin = Infinity, emax = -Infinity;
  for (let t = -170000; t <= 170000; t += 97) {
    const e = eTwoLine(t);
    if (e < emin) emin = e;
    if (e > emax) emax = e;
  }
  // BCE deviation vs production (quadrature variant)
  const stepYr = (H / N) / 16;
  const dPhi584 = WDOT * (channelIntegral(T584, S_W, eTwoLine, stepYr) - Iprod584);
  const dPhi720 = WDOT * (channelIntegral(T720, S_W, eTwoLine, stepYr) - Iprod720);
  results.push({ N, periodYr: H / N, Aex, phiExDeg: phiEx * 180 / Math.PI, valShift, Aq, tMaxQ, emin, emax, dPhi584, dPhi720 });
}

console.log('\n  N     period(yr)   EXACT: A        φ(°)    Δe(J2000)   | QUAD: A        e2max@yr   e∈[min,max]        Δϖ−584°  Δϖ−720°');
console.log('  ' + '─'.repeat(112));
for (const r of results) {
  const tag = STRUCTURAL.has(r.N) ? '★' : ' ';
  if (!STRUCTURAL.has(r.N) && r.N > 40 && r.N % 8 !== 0) continue;   // keep printout readable
  console.log(`  ${String(r.N).padStart(3)}${tag} ${r.periodYr.toFixed(0).padStart(9)}   ${r.Aex.toExponential(2).padStart(9)}  ${r.phiExDeg.toFixed(1).padStart(7)}  ${r.valShift.toExponential(2).padStart(10)} | ${r.Aq.toExponential(2).padStart(9)}  ${r.tMaxQ.toFixed(0).padStart(8)}   [${r.emin.toFixed(4)}, ${r.emax.toFixed(4)}]   ${r.dPhi584.toFixed(3).padStart(7)}  ${r.dPhi720.toFixed(3).padStart(7)}`);
}

// ── flags / coincidences ───────────────────────────────────────────────────
console.log('\n  Flags:');
console.log(`  • EXACT-solve value shift is 0.2406/N² — reaches 1e-6 only at N≈490 (period ${Math.round(H / 490)} yr).`);
console.log('    One residual line CANNOT fit (e, ė, ë) simultaneously on the lattice at plausible N →');
console.log('    the value-preserving QUADRATURE convention is forced; the soft Meeus ë stays unfit (N-independent).');
const amps = results.filter(r => STRUCTURAL.has(r.N));
console.log('  • Quadrature amplitude vs framework scales (eccentricityAmplitude = ' + a.toFixed(6) + '):');
for (const r of amps) {
  const ratio = r.Aq / a;
  if (ratio > 0.03 && ratio < 30) console.log(`      N=${String(r.N).padStart(3)}  A=${r.Aq.toExponential(3)}  A/amp16=${ratio.toFixed(3)}${Math.abs(Math.log2(ratio)) < 0.15 ? '  ← ~1:1' : ''}${Math.abs(ratio - 0.5) < 0.05 ? '  ← ~1:2' : ''}${Math.abs(ratio - 2) < 0.2 ? '  ← ~2:1' : ''}`);
}
console.log('═'.repeat(110));
