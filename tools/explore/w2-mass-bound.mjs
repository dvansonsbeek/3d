#!/usr/bin/env node
// W2 — THE RATIO-METHOD SOLAR-MASS BOUND from today's published data
// (plan 04 IP-two-expansions §4 W2). Structure: at epoch t the stratigraphic
// precession:long-e ratio is
//   ρ = P_le / P_cp = (p + ḡ·μ) / (Δg₀·μ),  μ = M(t)/M₀
// (every g scales ∝ μ — the verified law, solar-mass-scaling.mjs; p = the
// independent Earth–Moon clock). Solving: μ = p / (ρ·Δg₀ − ḡ).
// The published pipeline (Lantink 2022) fixes μ = 1 and solves for p — its
// p = 108.6 ± 8.5 ″/yr is CONDITIONAL on a constant-mass Sun. Inverting with
// μ free requires an independent p; the μ-independent anchors are the TIDAL
// RHYTHMITES (they read the Moon directly): Weeli Wolli @2450 Ma, LOD
// 17.95 ± 1.32 h (7.3 %) — same epoch as Joffre.
//
// RESULT (2026-09-04): μ(2.46 Ga) = 1.007 ± 0.139 — constant-mass Sun
// consistent, 2σ excess < ~29 %; pipeline verified (μ = 1 ⇒ p = 106.3 vs
// Lantink's 108.6, 2 %). To PROBE the faint-young-Sun window (2.6–7 %
// excess): p and the band ratio each to ~2 % (σ_μ 3.3 %). Superseded as the
// best bound by the count-bracket method (w2b-absolute-duration.mjs:
// μ(2.48 Ga) = 1.00 ± 0.07, sed-rate-free).
const D_G0 = 1296000 / 405600;        // g2−g5 today, ″/yr = 3.195
const GBAR = [11.0, 1.5];             // amplitude-weighted mean g in the cp multiplet, ″/yr
const RHO = [36.7, 3.7];              // 3.3 m / 9 cm, ±10 % (thickness-ratio class)
const CHAOS = 0.01;                   // W4: g2−g5 chaotic drift allowance over 2.5 Gyr (fractional)
const P_IND = [107, 0.08 * 107];      // independent p, rhythmite-grade ±8 %
function invert(p, sp, rho, srho, gbar, sg) {
  const den = rho * D_G0 - gbar;
  const mu = p / den;
  const dmu_p = mu / p;
  const dmu_rho = mu * D_G0 / den;
  const dmu_g = mu / den;
  const s = Math.hypot(dmu_p * sp, dmu_rho * srho, dmu_g * sg, mu * CHAOS * (rho * D_G0) / den);
  return [mu, s];
}
const [mu, smu] = invert(P_IND[0], P_IND[1], RHO[0], RHO[1], GBAR[0], GBAR[1]);
console.log('W2 — the 2.46-Ga solar-mass bound from today\'s data (ratio method):');
console.log(`  μ = M(2.46 Ga)/M₀ = ${mu.toFixed(3)} ± ${smu.toFixed(3)}`);
console.log(`  → early mass excess = ${((mu - 1) * 100).toFixed(1)} % ± ${(smu * 100).toFixed(1)} %  (2σ bound: < ${(((mu - 1) + 2 * smu) * 100).toFixed(0)} %)`);
console.log('  error budget: p(independent, rhythmite-grade) 8 % | thickness ratio 10 % | ḡ 14 %-of-11 | chaos 1 %');
console.log(`  sanity: μ=1 ⇒ p = ρΔg₀ − ḡ = ${(RHO[0] * D_G0 - GBAR[0]).toFixed(1)} ″/yr vs Lantink's 108.6 ± 8.5 (2 % — pipeline reproduced)`);
for (const [sp, srho] of [[0.04, 0.05], [0.03, 0.03], [0.02, 0.02]]) {
  const [, s2] = invert(P_IND[0], sp * P_IND[0], RHO[0], srho * RHO[0], GBAR[0], GBAR[1] / 2);
  console.log(`  with p to ${(sp * 100).toFixed(0)} % and ratio to ${(srho * 100).toFixed(0)} %: σ_μ = ${(s2 * 100).toFixed(1)} % → ${s2 * 100 < 3.5 ? 'PROBES the FYS window' : 'bound-level'}`);
}
