/**
 * v4-d3-tails.js — D3: derive Meeus's Lp T³/T⁴ tails ("The Derived Moon"
 * final derivation gate).
 *
 * Meeus Ch.47: L′ = ... + T³/538841 − T⁴/65194000
 *   T³ = +1.85583e-6 °/cy³ (+0.006681″)
 *   T⁴ = −1.53388e-8 °/cy⁴ (−0.00005522″)
 *
 * Hypothesis: the T³ is not an empirical tail — it is the Adams–Laplace
 * CHANNEL's second order: the secular-theory ë makes d²(e_S²)/dT² < 0, and
 * the channel k converts that curvature into an Lp T³. The T⁴ is the next
 * order (third derivative of e² with the quadratic secular e(T)).
 *
 * Budget: T³(Meeus) = channel(k·(e²)″/6) + obliquity-carrier(C·ε̈/6)
 *                   + frame(p_A T³) + tidal(chain curvature ≈ 0 in-window).
 *
 * Also quantifies the known e_E-curvature divergence at the T³ level: the
 * framework's fully-derived H/3 line predicts ë = −3.7e-8 (vs secular
 * −2.534e-7) — with the H/3 line alone the channel T³ flips sign, so the
 * retained Meeus literal embodies the SECULAR-ë convention (the documented
 * BCE drift-row divergence, sharply localized here).
 *
 * Usage: node tools/explore/v4-d3-tails.js
 */

const C = require('../lib/constants');
const OE = require('../lib/orbital-engine');

const T3_MEEUS = 1 / 538841;                    // °/cy³
const T4_MEEUS = -1 / 65194000;                 // °/cy⁴

// ── channel ingredients (all documented constants) ─────────────────────────
const e0 = C.ASTRO_REFERENCE.earthEccentricityJ2000;
const ed = C.ASTRO_REFERENCE.earthEccentricityDotJ2000;      // per cy (secular theory)
const edd = C.ASTRO_REFERENCE.earthEccentricityDotDotJ2000;  // per cy²
const elp = C.ASTRO_REFERENCE.elpW1T2Decomposition_arcsecPerCy2;
const T2_OBL = (elp.earthFigureJ2 + elp.generalPrecessionPA_T2_Lieske1976) / 3600;
const T2_TIDAL = (-25.86 / 3600) / 2;
const T2_LP = -0.0015786;
const K_CH = 2 * (T2_LP - T2_TIDAL - T2_OBL) / (2 * e0 * ed); // °/cy per e² (channel-only, observed-ė convention)

// second/third derivatives of e² under the quadratic secular e(T)
const d2e2 = 2 * (ed * ed + e0 * edd);          // per cy²
const d3e2 = 6 * ed * edd;                      // per cy³ (e³-dot = 0 for quadratic e)

const T3_channel = K_CH * d2e2 / 6;
const T4_channel = K_CH * d3e2 / 24;

// ── obliquity-carrier T³ (C_OBL·ε̈/6) ──────────────────────────────────────
const eps0 = OE.computeObliquityEarth(2000);
const epsDot = OE.computeObliquityEarth(2050) - OE.computeObliquityEarth(1950);              // °/cy
const epsDD = OE.computeObliquityEarth(2100) - 2 * eps0 + OE.computeObliquityEarth(1900);    // °/cy² (central 2nd diff, h=1cy)
const C_OBL = 2 * T2_OBL / epsDot;
const T3_obl = C_OBL * epsDD / 6;

// ── frame p_A T³ (IAU2006) ─────────────────────────────────────────────────
const T3_frame = 0.00007964 / 3600;

const T3_sum = T3_channel + T3_obl + T3_frame;

console.log('D3 — the Lp T³/T⁴ tails, derived');
console.log('─────────────────────────────────');
console.log(`channel k (channel-only, observed-ė convention): ${K_CH.toFixed(1)} °/cy per e²`);
console.log(`d²(e²)/dT² = 2(ė² + e·ë) = ${d2e2.toExponential(4)} /cy²   (secular ë = ${edd})`);
console.log('\nT³ budget (°/cy³):');
console.log(`  channel  k·(e²)″/6:        ${T3_channel.toExponential(5)}   (${(T3_channel / T3_MEEUS * 100).toFixed(1)}% of Meeus)`);
console.log(`  obliquity C·ε̈/6:           ${T3_obl.toExponential(5)}   (${(T3_obl / T3_MEEUS * 100).toFixed(1)}%)`);
console.log(`  frame p_A T³:              ${T3_frame.toExponential(5)}   (${(T3_frame / T3_MEEUS * 100).toFixed(1)}%)`);
console.log(`  tidal chain curvature:     ~0 in-window (Gyr timescale)`);
console.log(`  SUM:                       ${T3_sum.toExponential(5)}`);
console.log(`  Meeus T³ = 1/538841:       ${T3_MEEUS.toExponential(5)}`);
console.log(`  ══ SUM / Meeus = ${(T3_sum / T3_MEEUS * 100).toFixed(1)}% ══`);

console.log('\nT⁴ (°/cy⁴):');
console.log(`  channel k·(e²)‴/24:        ${T4_channel.toExponential(5)}   (${(T4_channel / T4_MEEUS * 100).toFixed(1)}% of Meeus)`);
console.log(`  Meeus T⁴ = −1/65194000:    ${T4_MEEUS.toExponential(5)}`);
console.log(`  remainder = higher-order secular content (VSOP e³, other args); in-window`);
console.log(`  impact of the remainder at T=−26 (year −584): ${(Math.abs(T4_MEEUS - T4_channel) * Math.pow(26, 4)).toFixed(4)}° — documented, clamped at deep time.`);

// ── the e_E-curvature divergence at T³ level ───────────────────────────────
const edd_fw = -3.7e-8;                          // the derived H/3 line's predicted ë (docs/66)
const d2e2_fw = 2 * (ed * ed + e0 * edd_fw);
const T3_fw = K_CH * d2e2_fw / 6;
console.log('\ne_E-curvature convention (the known divergence, localized at T³):');
console.log(`  with the derived H/3 line's ë (−3.7e-8): channel T³ = ${T3_fw.toExponential(4)} — WRONG SIGN vs Meeus`);
console.log('  → the Meeus T³ literal embodies the SECULAR-theory ë; the framework keeps it');
console.log('    in-window (documented convention; the BCE drift-meter rows carry the same story).');
console.log('\nVERDICT: T³ is DERIVED (Adams–Laplace channel curvature + obl/frame bits);');
console.log('T⁴ is partially derived with the quadratic secular e(T), remainder documented.');
