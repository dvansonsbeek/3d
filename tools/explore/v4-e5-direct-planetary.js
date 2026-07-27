/**
 * v4-e5-direct-planetary.js — E5 of the v4 campaign (IP-v4-lab.md follow-up):
 * decompose the lab's OWN full−base3 secular T² to test whether ELP's
 * "planetary +5.8665″/cy²" = e_S-channel part + DIRECT planetary terms.
 *
 * Background: the K_PL budget closed with ELP's planetary total, but the lab
 * channel k (∂n/∂e_S² = −2704 at fixed lunar action) implies a channel-only
 * value 17% above the ELP-implied −2320. Hypothesis: ELP's number is a TOTAL
 * (channel + direct planetary secular terms); the lab can split it.
 *
 * Method: in the full 8-body system the planets BOTH perturb the Moon
 * directly AND secularly drive the EMB eccentricity e_S(t) (the lab's own
 * Adams–Delaunay driver). The quadratic coefficient c2 of the full−base3
 * differential λ contains both:  c2 = ½·k·d(e_S²)/dT  +  direct.
 * We measure c2 and the in-run ė_S independently, subtract the channel part
 * using the lab's own k, and get the DIRECT planetary T² — then check
 * whether  k·(observed VSOP ė channel) + direct ≈ ELP's 5.8665.
 *
 * Usage: node tools/explore/v4-e5-direct-planetary.js [years=2000] [dtDays=0.04]
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '2000');
const DTD = parseFloat(process.argv[3] || '0.04');
const SAMPLE_D = YEARS > 10000 ? 2 : 1;
const d2r = Math.PI / 180;
const K_LAB = -2704;                       // °/cy per unit e² (E1, protocol: fixed free e/i + mean osc a)
const ELP_PLANETARY = 5.8665;              // ″/cy² (Chapront et al. 2002, W1 T² planetary part)
const EDOT_VSOP = -0.000042037;            // per cy (astro-reference)
const E0_VSOP = 0.01671022;

console.log(`v4 E5 — direct-planetary split: ${YEARS} yr at dt=${DTD} d`);
console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, false);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

const t0 = Date.now();
const full = LAB.runSystem({ planets: true, j2: true, sampleDays: SAMPLE_D, recordES: true }, moonIC, YEARS, DTD);
const b3 = LAB.runSystem({ planets: false, j2: false, sampleDays: SAMPLE_D, recordES: true }, moonIC, YEARS, DTD);
console.log(`integrated in ${((Date.now() - t0) / 1000).toFixed(0)} s (E-drift ${full.energyDrift.toExponential(1)}/cy)`);

// ── quadratic fit y = c0 + c1·x + c2·x², x in Julian centuries ─────────────
function quadFit(T, y) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  const n = T.length;
  for (let i = 0; i < n; i++) {
    const x = T[i] / 36525, x2 = x * x, yi = y(i);
    s0++; s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
    b0 += yi; b1 += yi * x; b2 += yi * x2;
  }
  const M = [[s0, s1, s2, b0], [s1, s2, s3, b1], [s2, s3, s4, b2]];
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < 3; r++) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < 4; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  const c2 = M[2][3] / M[2][2], c1 = (M[1][3] - M[1][2] * c2) / M[1][1], c0 = (M[0][3] - M[0][1] * c1 - M[0][2] * c2) / M[0][0];
  return { c0, c1, c2 };
}

// ── measured differential T² (deg/cy² → ″/cy²) ─────────────────────────────
const T = full.t;
const qDiff = quadFit(T, i => (full.lam[i] - b3.lam[i]) / d2r);
const c2_arcsec = qDiff.c2 * 3600;
console.log(`\nfull−base3 λ quadratic: c2 = ${qDiff.c2.toExponential(5)} °/cy² = ${c2_arcsec.toFixed(3)}″/cy²`);

// ── the lab's own e_S(t): secular drift in each system ─────────────────────
const qESf = quadFit(T, i => full.eS[i]);
const qESb = quadFit(T, i => b3.eS[i]);
const eMeanF = full.eS.reduce((s, v) => s + v, 0) / full.eS.length;
console.log(`e_S(t): full mean ${eMeanF.toFixed(7)}  ė_S ${qESf.c1.toExponential(4)}/cy   (base3 control ė_S ${qESb.c1.toExponential(4)}/cy)`);

// ── channel part from the lab's own drift, direct = remainder ──────────────
const de2dT_internal = 2 * eMeanF * (qESf.c1 - qESb.c1);   // differential ė (base3 control subtracted)
const channel_internal = 0.5 * K_LAB * de2dT_internal * 3600;   // ″/cy²
const direct = c2_arcsec - channel_internal;
console.log(`\nchannel part (½·k_lab·2e·Δė_S):        ${channel_internal.toFixed(3)}″/cy²`);
console.log(`DIRECT planetary + J2 T² (remainder):  ${direct.toFixed(3)}″/cy²`);

// ── the ELP consistency test ───────────────────────────────────────────────
const channel_vsop = 0.5 * K_LAB * (2 * E0_VSOP * EDOT_VSOP) * 3600;
const total_pred = channel_vsop + direct;
console.log('\nELP consistency test (real-world composition):');
console.log(`  channel with VSOP ė (k_lab·e₀·ė₀):   ${channel_vsop.toFixed(3)}″/cy²`);
console.log(`  + measured direct:                    ${direct.toFixed(3)}`);
console.log(`  = predicted planetary total:          ${total_pred.toFixed(3)}″/cy²`);
console.log(`  ELP planetary (Chapront 2002):        ${ELP_PLANETARY.toFixed(4)}″/cy²   → ${(total_pred / ELP_PLANETARY * 100).toFixed(1)}%`);
console.log('\nInterpretation: if ≈100%, ELP\'s "planetary" = channel + direct and the');
console.log('lab k is validated — E5 closes with no protocol-convention issue. If the');
console.log('gap persists, the held-quantity protocol scan (mean-osc a vs action) is next.');
