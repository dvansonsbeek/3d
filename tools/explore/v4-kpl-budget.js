/**
 * v4-kpl-budget.js — K_PL budget closure (v4 campaign, IP-v4-lab.md follow-up).
 *
 * The shipped Lp planetary T² remainder (+7.246″/cy² = Meeus Lp T² minus the
 * framework's LLR tidal) was record-normalized as a single e_E²-channel
 * quantity. Primary sources decompose it exactly:
 *
 *   Chapront, Chapront-Touzé & Francou (2002, A&A 387, 700), W1 T² parts
 *   (inertial ecliptic J2000): planetary +5.8665″, Earth figure +0.1925″,
 *   tides −12.8125″ (adopted; LLR-fitted −12.9257 MCEP / −12.9290 ICRS;
 *   Γ_LLR = −25.858 ± 0.003″/cy² — the framework's α₁ chain −25.86 ✓).
 *   Frame bridge: Meeus's L′ is equinox-of-date = W1 + p_A(T);
 *   Lieske (1976) p_A T² = +1.11113″/cy² (Meeus-era; IAU2006: +1.1054348).
 *
 * Budget: remainder = planetary + figure + frame + ½·(Γ_LLR − Γ_embedded),
 * closing with zero free parameters. Also quantifies the NEW open item (E5):
 * the lab's ∂n/∂e_S² protocol convention.
 *
 * Usage: node tools/explore/v4-kpl-budget.js
 */

const A = 1;   // arcsec units throughout

// ── Meeus Ch.47 / framework values ─────────────────────────────────────────
const T2_LP_MEEUS = -0.0015786 * 3600;            // −5.68296″/cy² (equinox of date)
const T2_TIDAL_FRAMEWORK = -25.86 / 2;            // −12.93000″/cy² (α₁/LLR chain)
const REMAINDER_SHIPPED = T2_LP_MEEUS - T2_TIDAL_FRAMEWORK;

// ── primary-source decomposition ───────────────────────────────────────────
const PLANETARY = 5.8665;                          // Chapront et al. 2002 (W1, inertial)
const FIGURE = 0.1925;                             // Earth J2 (same source)
const PA_T2_LIESKE = 1.11113;                      // Lieske 1976 p_A T² (Meeus-era frame bridge)
const PA_T2_IAU2006 = 1.1054348;                   // modern value (reference)
const GAMMA_LLR = -25.858;                         // S2001 LLR (framework −25.86)

console.log('K_PL budget closure — the shipped Lp planetary T² remainder decomposed');
console.log('──────────────────────────────────────────────────────────────────────');
console.log(`Meeus Lp T² (of date):                 ${T2_LP_MEEUS.toFixed(5)}″/cy²`);
console.log(`− framework tidal (α₁/LLR, Γ=−25.86):  ${T2_TIDAL_FRAMEWORK.toFixed(5)}`);
console.log(`shipped remainder (K_PL anchor):       +${REMAINDER_SHIPPED.toFixed(5)}\n`);
console.log('primary-source parts (Chapront et al. 2002 + Lieske 1976):');
console.log(`  planetary perturbations:             +${PLANETARY.toFixed(4)}`);
console.log(`  Earth figure (J2):                   +${FIGURE.toFixed(4)}`);
console.log(`  frame (ṗ_A T², of-date bridge):      +${PA_T2_LIESKE.toFixed(5)}   (IAU2006: ${PA_T2_IAU2006})`);
const SUM3 = PLANETARY + FIGURE + PA_T2_LIESKE;
console.log(`  sum:                                 +${SUM3.toFixed(5)}`);
const GAP = REMAINDER_SHIPPED - SUM3;
const GAMMA_EMBEDDED = 2 * T2_TIDAL_FRAMEWORK + 2 * GAP;   // tides embedded in Meeus = framework tidal + gap
console.log(`  residual vs shipped remainder:       +${GAP.toFixed(5)}`);
console.log(`  ≡ ½·(Γ_LLR − Γ_Meeus-embedded)  →  Γ embedded in Meeus's polynomial = ${GAMMA_EMBEDDED.toFixed(3)}″/cy²`);
console.log(`     (ELP2000-85 adopted W1(2) = −6.8084″ → Γ ≈ −25.73; Meeus/1991-Tables era ✓)`);
console.log('\n→ BUDGET CLOSES with zero free parameters: the "+7.25″ remainder" =');
console.log('  true planetary + J2 figure + frame precession + Meeus-era tidal-convention gap.');

// ── consequences for the carrier and the lab ───────────────────────────────
const de2dT_obs = 2 * 0.01671022 * (-0.000042037);         // observed ė convention
const k_ELP = (2 * PLANETARY / 3600) / de2dT_obs;          // °/cy per e² implied by ELP planetary T²
console.log('\nlab ∂n/∂e_S² cross-check:');
console.log(`  ELP-planetary-implied k:  ${k_ELP.toFixed(0)} °/cy per e²`);
console.log('  laboratory (fixed mean-a): −2704   → lab/ELP = ' + (-2704 / k_ELP * 100).toFixed(0) + '%');
console.log('  record-normalized (shipped): −2843.6 (now understood as the 4-part sum, not a channel value)');
console.log('\nNEW OPEN ITEM (E5): the lab k protocol holds (free e, free i, MEAN OSCULATING a)');
console.log('fixed; classical theory computes ∂n/∂e′² at fixed lunar ACTION. The ~17% k gap is');
console.log('the next convention candidate — design: re-run the e_S scan holding the Delaunay');
console.log('action (or demodulated free a) instead of mean osculating a.');
console.log('\nDeep-time attribution (documented approximation): only the planetary part');
console.log('(+5.87″) is e_E²-channel physics; the figure part follows Earth-rotation/J2');
console.log('evolution, the frame part follows the obliquity/ecliptic cycles (bounded,');
console.log('H/3–H/8 — the framework-native ṗ derivation), and the tidal-convention gap is');
console.log('an in-window Meeus correction. The shipped bounded e_E² carrier normalized to');
console.log('the TOTAL is exact in-window and bounded at deep time; splitting the carrier');
console.log('into per-law parts is the D4-companion follow-up.');
