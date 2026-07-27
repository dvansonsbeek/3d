/**
 * v4-frame-audit.js — E1 follow-up (FAIL-branch analysis, IP-v4-lab.md):
 * test whether the EQUINOX-OF-DATE frame acceleration explains the
 * anchored-vs-lab sensitivity gaps.
 *
 * E1 refuted the direct-planetary hypothesis: the full 8-body+J2 system
 * leaves all three channel sensitivities at the 3-body values
 * (K_PL −2704.6 / s_ϖ 2.487 / s_Ω 0.880). So the gaps vs the
 * anchored/record values are NOT missing bodies. Next suspect (the v3
 * lesson): FRAME. Meeus's arguments are mean-ecliptic-and-equinox OF DATE;
 * the IAU general precession in longitude itself accelerates:
 *     p_A(T) = 5028.796195″·T + 1.1054348″·T² + ...   (IAU 2006)
 * so EVERY of-date longitude-type argument carries a +1.1054″ T² that is
 * pure frame, not lunar physics. The framework's argument construction uses
 * a CONSTANT p = 360·13/H (no T²), so its e_E channel currently absorbs the
 * frame T² into effective s values. This audit removes the frame term and
 * asks: do the required PHYSICAL exponents match the laboratory's
 * pure-gravity measurements?
 *
 * Usage: node tools/explore/v4-frame-audit.js
 */

const C = require('../lib/constants');

const A2D = 1 / 3600;                              // arcsec → deg
const P_T2 = 1.1054348 * A2D;                      // IAU2006 p_A T² coefficient, deg/cy²

// ── framework/astro-reference constants ────────────────────────────────────
const e0 = C.ASTRO_REFERENCE.earthEccentricityJ2000;
const edot = C.ASTRO_REFERENCE.earthEccentricityDotJ2000;   // per cy
const KAPPA = 3 * e0 * edot / (1 - e0 * e0);                // d ln(strength)/dT per cy
const P_DEGCY = 360 * 13 / C.H * 100;                       // framework p, deg/cy (linear)

// Meeus Ch.47 of-date rates and T² coefficients
const LPR = 481267.88123421, MPR = 477198.8675055, FR = 483202.0175233;
const WDOT = LPR - MPR;                                     // ϖ̇ of-date  +4069.0137
const NDOT = LPR - FR;                                      // Ω̇ of-date  −1934.1363
const T2 = { Lp: -0.0015786, Mp: 0.0087414, F: -0.0036539 };
const T2_W = T2.Lp - T2.Mp;                                 // ϖ T²  −0.0103200
const T2_N = T2.Lp - T2.F;                                  // Ω T²  +0.0020753

// laboratory pure-gravity measurements (E1: identical in base3 and 8-body+J2)
const LAB = { sW: 2.486, sN: 0.880, k: -2704 };
// shipped/anchored effective values
const SHIP = { sW: 2.407, sN: 1.018 };

console.log('v4 frame audit — of-date T² budget: T²(Meeus) = T²(physical) + ṗ_A T²');
console.log(`p_A T² (IAU2006) = +1.1054″/cy² = ${P_T2.toExponential(5)} °/cy²`);
console.log(`KAPPA = 3eė/(1−e²) = ${KAPPA.toExponential(5)} /cy   framework p = ${P_DEGCY.toFixed(5)} °/cy\n`);

// ── s_ϖ and s_Ω: required physical exponent after frame removal ────────────
function audit(name, rateOfDate, t2Meeus, sLab, sShip) {
  const rateICRF = rateOfDate - P_DEGCY;           // physical (star-referenced) rate
  const denom = rateICRF * KAPPA / 2;              // T² per unit s
  const sEff = t2Meeus / (rateOfDate * KAPPA / 2); // frame-blind effective s (the shipped construction)
  const sPhys = (t2Meeus - P_T2) / denom;          // frame-corrected physical s
  console.log(`${name}: Meeus T² ${t2Meeus.toFixed(7)} °/cy²`);
  console.log(`   effective s (frame-blind, shipped-style) = ${sEff.toFixed(4)}   (shipped ${sShip})`);
  console.log(`   physical  s (frame T² removed)           = ${sPhys.toFixed(4)}`);
  console.log(`   laboratory s (pure gravity, E1-robust)   = ${sLab.toFixed(3)}   → lab/physical = ${(sLab / sPhys * 100).toFixed(1)}%\n`);
  return { sEff, sPhys };
}
const W = audit('s_ϖ (perigee)', WDOT, T2_W, LAB.sW, SHIP.sW);
const N = audit('s_Ω (node)   ', NDOT, T2_N, LAB.sN, SHIP.sN);

// ── K_PL: the Lp T² budget ─────────────────────────────────────────────────
const T2_TIDAL = (-25.86 * A2D) / 2;               // framework α₁/LLR n̈ → T² (inertial, physical)
const de2dT_channel = -1.4159e-6;                  // framework e_E channel slope at J2000 (per cy)
const de2dT_obs = 2 * e0 * edot;                   // observed secular ė slope
const remainder_frameBlind = T2.Lp - T2_TIDAL;                 // shipped record remainder (+0.0020131)
const remainder_phys = T2.Lp - T2_TIDAL - P_T2;                // frame-corrected physical planetary T²
const pred_channel = 0.5 * LAB.k * de2dT_channel;
const pred_obs = 0.5 * LAB.k * de2dT_obs;
console.log('K_PL (Lp planetary T² remainder):');
console.log(`   Lp T² (Meeus, of-date)        = ${T2.Lp.toFixed(7)} °/cy²`);
console.log(`   − tidal n̈/2 (LLR α₁ chain)    = ${T2_TIDAL.toFixed(7)}`);
console.log(`   frame-blind remainder (shipped record) = ${remainder_frameBlind.toFixed(7)}  (${(remainder_frameBlind * 3600).toFixed(2)}″)`);
console.log(`   − frame ṗ_A T²                = ${P_T2.toFixed(7)}`);
console.log(`   PHYSICAL planetary remainder  = ${remainder_phys.toFixed(7)}  (${(remainder_phys * 3600).toFixed(2)}″)`);
console.log(`   lab ½k·d(e²)/dT (channel slope) = ${pred_channel.toFixed(7)}  (${(pred_channel * 3600).toFixed(2)}″)  → lab/physical = ${(pred_channel / remainder_phys * 100).toFixed(1)}%`);
console.log(`   lab ½k·d(e²)/dT (observed ė)    = ${pred_obs.toFixed(7)}  (${(pred_obs * 3600).toFixed(2)}″)  → lab/physical = ${(pred_obs / remainder_phys * 100).toFixed(1)}%`);
console.log(`   (frame-blind comparison was ${(pred_channel / remainder_frameBlind * 100).toFixed(1)}% — the shipped 95.1%)`);

console.log('\nInterpretation:');
console.log(' • If lab/physical ≈ 100% for s_ϖ and s_Ω: the anchored 2.407 and the');
console.log('   Meeus-implied 1.018 are FRAME-CONTAMINATED effective exponents; the');
console.log('   laboratory has been measuring the physical ones correctly all along.');
console.log(' • The framework construction (constant p, channel absorbs everything)');
console.log('   remains numerically exact vs Meeus by design — this audit changes the');
console.log('   ATTRIBUTION, not the shipped values.');
console.log(' • K_PL: the frame correction moves the target the other way (the channel');
console.log('   prediction overshoots the physical remainder) — whatever is left there');
console.log('   is entangled with the tidal split (α₁) and the ė convention, not with');
console.log('   missing bodies (E1) and not with the frame term alone.');
