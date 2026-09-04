#!/usr/bin/env node
// W2b/W2e — THE COUNT-BRACKET WEIGHING OF THE ANCIENT SUN (plan 04
// IP-two-expansions §4 W2b–W2e): the SED-RATE-FREE method — a counted number
// of long-eccentricity cycles between two radiometrically dated horizons
// gives P_le absolutely; μ = M/M₀ = 405.6 kyr / P_le via the verified g ∝ M
// law (solar-mass-scaling.mjs). The Kent–Newark-style test executed at the
// Paleoproterozoic.
//
// Data (Lantink et al. 2022 PNAS + Lantink et al. 2024 SAJG 127:325):
//  · Joffre core DD98SGP001 bracket: 371.20 m @ 2469.05 ± 0.65 Ma (2σ),
//    185.98 m @ 2453.95 ± 0.62 — a 3.0 % absolute duration; the cycle count
//    over it was never made (core brecciated P1–P5) — Joffre route closed.
//  · Kuruman UUBH1 (the live route): the AUTHORS COUNTED 18–19 long-e cycles
//    between the Klein Naute Shale (2484.6 ± 0.34 Ma, 2σ) and the 212-m
//    shale (2476.9 ± 1.0) and note N = 19 ⇒ 7.7 Myr "identical to the mean
//    U-Pb age difference" — their consistency check of the astronomical
//    interpretation, inverted here to weigh the Sun.
//
// RESULT (2026-09-04): μ(2.48 Ga) = 1.001 ± 0.069 at N = 19 (P_le = 405.3
// kyr); 0.948 ± 0.066 at N = 18; count as 18.5 ± 0.5 → 0.974 ± 0.074.
// THE SUN'S MASS 2.48 Gyr AGO = TODAY'S TO ~7 % (1σ); 2σ excess ≈ 14 %; the
// Sackmann–Boothroyd 7 % FYS ceiling sits at 1σ. Route to 3–4 %: more
// zircons at the 212-m horizon (the paper's own call) + settling the 1a.0 /
// 4a-4b count ambiguities. No sedimentation-rate input anywhere.
console.log('W2b — Joffre absolute bracket (route closed by P1–P5 brecciation):');
const TOP = { z: 185.98, t: 2453.95, s1: 0.62 / 2 };
const BOT = { z: 371.20, t: 2469.05, s1: 0.65 / 2 };
const dur = BOT.t - TOP.t, sDur = Math.hypot(TOP.s1, BOT.s1);
const thick = BOT.z - TOP.z;
console.log(`  core interval: ${thick.toFixed(2)} m over ${dur.toFixed(2)} ± ${sDur.toFixed(2)} Myr (1σ, ${(sDur / dur * 100).toFixed(1)} %)`);
const rate = thick / dur, sRate = rate * sDur / dur;
console.log(`  mean deposition rate: ${rate.toFixed(2)} ± ${sRate.toFixed(2)} m/Myr; μ = 1 predicts core long-e λ = ${(rate * 0.4056).toFixed(2)} ± ${(sRate * 0.4056).toFixed(2)} m (5 %/7 % heavier Sun: ${(rate * 0.4056 / 1.05).toFixed(2)}/${(rate * 0.4056 / 1.07).toFixed(2)} m)`);

console.log('\nW2e — Kuruman UUBH1 count-bracket (the measurement):');
const KN = { t: 2484.6, s1: 0.34 / 2 };      // Klein Naute Shale
const S212 = { t: 2476.9, s1: 1.0 / 2 };     // 212-m shale
const dt = KN.t - S212.t, sDt = Math.hypot(KN.s1, S212.s1);
console.log(`  bracket: ${dt.toFixed(1)} ± ${sDt.toFixed(2)} Myr (1σ, ${(sDt / dt * 100).toFixed(1)} %)`);
for (const [N, note] of [[18, ''], [18.5, '(count as 18.5 ± 0.5)'], [19, "(authors' preferred — their own 405-consistency check)"]]) {
  const P = dt * 1000 / N;
  const mu = 405.6 / P;
  const sCount = N === 18.5 ? 0.5 / N : 0;
  const sMu = mu * Math.hypot(sDt / dt, sCount);
  console.log(`  N = ${N}: P_le = ${P.toFixed(1)} kyr → μ = ${mu.toFixed(3)} ± ${sMu.toFixed(3)}  (excess ${((mu - 1) * 100).toFixed(1)} ± ${(sMu * 100).toFixed(1)} %) ${note}`);
}
console.log('\n  headline: M(2.48 Ga)/M₀ = 1.00 ± 0.07 — sed-rate-free; FYS 7 % ceiling at ~1σ;');
console.log('  error budget: duration 6.9 % (212-m shale ± 1.0 dominates) + count ambiguity 2.7 %.');
