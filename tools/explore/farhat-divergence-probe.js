#!/usr/bin/env node
/**
 * FARHAT-DIVERGENCE PROBE — "Experiment 0" of the Driver-1½ thread
 * ================================================================
 *
 * Question (2026-08-14): does the model's closed Earth-Moon angular-momentum
 * budget (L_TOTAL_EM = const) hide a solar-tide leak — the one physical
 * channel through which M_sun and the AU enter the LOD/H chain?
 *
 * Method: Farhat et al. 2022 (A&A 665, L1; arXiv 2207.00438) solve
 * dL_Ω/dt = −(𝒯_M + 𝒯_S) — their model INCLUDES the solar torque — and
 * their curve fits the geological proxies. Our engine takes Farhat's a(t)
 * shape (the α₁/α₃/α₄ polynomial) and derives LOD(t) from the CLOSED
 * budget. Any real leak shows up as a residual between our LOD(t) and the
 * proxies Farhat fit. Anchors used (fetched from arXiv 2207.00438,
 * 2026-08-14):
 *   - Joffre (cyclostratigraphy):   2.46 Ga  LOD 16.98 ± 0.50 h
 *   - Weeli Wolli (rhythmite):      2.45 Ga  LOD 17.95 ± 1.32 h
 *   - Moodies Group (tidal bundle): 3.20 Ga  a = 46.45 ± 1.50 R⊕
 * Plus the doc-98 three-regime compilation: proxies hold LOD ≈ 19–21 h
 * across the >1 Ga thermal-tide-lock era (Mitchell-Kirscher 2023).
 *
 * RESULT (recorded from the engine run below): the divergence is REAL and
 * an order of magnitude larger than the solar-leak estimate —
 *
 *     2.46 Ga:  ours LOD 12.55 h  vs  16.98 ± 0.50 h   (−4.4 h, ~9σ)
 *     2.45 Ga:  ours LOD 12.59 h  vs  17.95 ± 1.32 h   (−5.4 h, ~4σ)
 *     3.20 Ga:  ours a   29.29 R⊕ vs  46.45 ± 1.50 R⊕  (−17.2 R⊕, ~11σ)
 *
 * DIAGNOSIS — the polynomial-shape mismatch, not (primarily) the leak:
 * Farhat's central result is that the recession history is a resonant
 * STAIRCASE — long slow-recession intervals between ocean-resonance
 * crossings, with most of the recession concentrated late. A single
 * quartic 1 + α₁t + α₃t³ + α₄t⁴ anchored at the modern rate (LLR), the
 * 0–650 Ma window (Wu-gated, where it is excellent) and the genesis Roche
 * crossing CANNOT follow a staircase: it dives through the middle. The
 * mid-Precambrian (1–3.5 Ga) is exactly the window with no gate: Wu stops
 * at 650 Ma, the next anchor is genesis. Both residuals are the same
 * event seen twice: our a(t) too low ⇒ (closed budget) our spin too fast
 * ⇒ our LOD too short. The solar-tide leak (~9e15 N·m integrated
 * ≈ 1.3e33 kg m²/s) is real physics but ~10× smaller than the ~3–5e33
 * ΔL this shape mismatch represents in that window.
 *
 * CONSISTENCY NOTE: doc 98 §"Three regimes" already identified the
 * >1 Ga stalled regime (LOD 19–21 h) from the proxy compilation — the
 * shipped smooth curve was known to be Phanerozoic-first. What this probe
 * adds is the QUANTIFIED divergence vs Farhat's own curve, and the
 * finding that it dominates the leak question that motivated the probe.
 *
 * IMPLICATIONS (research options, none implemented here):
 *   1. A regime-aware a(t) — piecewise or resonance-staircase form over
 *      the three doc-98 regimes — would move H(genesis), the Roche-
 *      crossing date and the Williams-620 residual together. A major
 *      matched-pair campaign (a(t) form + α recalibration + every
 *      downstream consumer).
 *   2. The solar-leak term (Driver 1½) remains worth carrying WITH any
 *      regime-aware refit — at ~1.3e33 it is second-order today but the
 *      same size as the claimed precision of a staircase fit.
 *   3. Honesty first: the dossier/doc 99 currently claim deep-time
 *      validity via the 0-650 Ma record + the genesis endpoint. The
 *      1-3.5 Ga window should be documented as UNGATED and divergent
 *      from Farhat's own resonant curve, Williams-620-style.
 *
 * Run: node tools/explore/farhat-divergence-probe.js
 */

'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const dt = require(path.join(ROOT, 'tools', 'lib', 'deep-time.js'));

const RE_KM = 6378.137;

/** Farhat 2022 proxy anchors (Tables 2/3; fetched from arXiv 2207.00438). */
const FARHAT_ANCHORS = [
  { id: 'joffre-cyclostrat', ageMa: 2460, quantity: 'lodHr', value: 16.98, sigma: 0.50 },
  { id: 'weeli-wolli-rhythmite', ageMa: 2450, quantity: 'lodHr', value: 17.95, sigma: 1.32 },
  { id: 'moodies-tidal-bundle', ageMa: 3200, quantity: 'moonRE', value: 46.45, sigma: 1.50 },
];

console.log('FARHAT-DIVERGENCE PROBE — closed-budget engine vs the proxies Farhat 2022 fit');
console.log('(Farhat includes the solar torque: dL/dt = −(T_moon + T_sun); we do not)');
console.log('');
for (const a of FARHAT_ANCHORS) {
  const ours = a.quantity === 'lodHr'
    ? dt.meanLodSecondsAtAge(a.ageMa) / 3600
    : dt.meanMoonDistanceAtAge(a.ageMa) / RE_KM;
  const resid = ours - a.value;
  const sigmas = resid / a.sigma;
  console.log(`  ${a.id} (${a.ageMa} Ma): ours ${ours.toFixed(2)} vs ${a.value} ± ${a.sigma} → ${resid >= 0 ? '+' : ''}${resid.toFixed(2)} (${sigmas.toFixed(1)}σ)`);
}
console.log('');
console.log('  Curve through the ungated window (Wu stops at 650 Ma; genesis at 4498 Ma):');
console.log('  t_Ma | ours LOD hr | ours a R_E | doc-98 proxy regime');
for (const t of [800, 1000, 1500, 2000, 2500, 3000, 3500]) {
  const lod = dt.meanLodSecondsAtAge(t) / 3600;
  const a = dt.meanMoonDistanceAtAge(t) / RE_KM;
  const regime = t >= 1000 ? '19–21 h (thermal-tide lock era)' : 'post-Snowball continuous';
  console.log(`  ${String(t).padStart(4)} | ${lod.toFixed(2).padStart(6)} | ${a.toFixed(2).padStart(6)} | ${regime}`);
}
console.log('');
console.log('  See the header comment for the recorded diagnosis: the quartic cannot');
console.log('  follow the resonant staircase; the mid-Precambrian divergence (~3–5e33');
console.log('  kg m²/s of L) dominates the solar-leak term (~1.3e33) that motivated');
console.log('  this probe. Research options 1–3 in the header; nothing implemented.');
