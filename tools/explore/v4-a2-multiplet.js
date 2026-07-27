/**
 * v4-a2-multiplet.js — E2 of the v4 campaign (IP-v4-lab.md): resolve the
 * window-growing 600–870e-6 content near the A2 frequency via long windows
 * + complex demodulation.
 *
 * Method: full − base3 differential (detrended), then
 *   (1) PART-C-style joint LSQ (Lp+ϖ−2λ_P family) at this window — reference;
 *   (2) complex demodulation at θ_A2 = Lp + ϖ − 2λ_J: z = dl·exp(−iθ),
 *       low-passed (moving average), decimated; a single line gives constant
 *       |z| and linear phase; a multiplet beats;
 *   (3) demodulated complex periodogram: peaks = multiplet components as
 *       (rate offset from A2, amplitude, phase), resolution ≈ 360°/window;
 *   (4) identification against candidate slow arguments (Great-Inequality
 *       2λ_J−5λ_Sa sidebands etc.).
 *
 * Step size dt=0.04 d validated by v4-step-ladder.js (0.1%-class).
 *
 * Usage: node tools/explore/v4-a2-multiplet.js [years=6000] [dtDays=0.04]
 */

const fs = require('fs');
const path = require('path');
const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '6000');
const DTD = parseFloat(process.argv[3] || '0.04');
const SAMPLE_D = YEARS > 10000 ? 2 : 1;
const d2r = Math.PI / 180;

console.log(`v4 E2 — A2 multiplet: ${YEARS} yr at dt=${DTD} d, sampling ${SAMPLE_D} d`);
console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

const t0 = Date.now();
const full = LAB.runSystem({ planets: true, j2: true, sampleDays: SAMPLE_D }, moonIC, YEARS, DTD);
const b3 = LAB.runSystem({ planets: false, j2: false, sampleDays: SAMPLE_D }, moonIC, YEARS, DTD);
console.log(`integrated in ${((Date.now() - t0) / 1000).toFixed(0)} s (${full.t.length} samples, E-drift ${full.energyDrift.toExponential(1)}/cy)`);

const dl = LAB.detrended(full, b3);
const T = full.t;
const N = T.length;

// linear fits of the needed angles
const fLam = LAB.linFit(T, full.lam), fW = LAB.linFit(T, full.w);
const fJ = LAB.linFit(T, full.lamJ), fV = LAB.linFit(T, full.lamV);
const fMa = LAB.linFit(T, full.lamMa), fSa = LAB.linFit(T, full.lamSa);

// ── (1) joint LSQ reference at this window ─────────────────────────────────
{
  const planets = [['V', fV], ['Ma', fMa], ['J', fJ], ['Sa', fSa]];
  const K = 8;
  const G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  for (let i = 0; i < N; i++) {
    const base = (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]);
    const row = [];
    for (const [, f] of planets) { const th = base - 2 * (f.a + f.b * T[i]); row.push(Math.sin(th), Math.cos(th)); }
    for (let k = 0; k < K; k++) { b[k] += dl[i] * row[k]; for (let j = k; j < K; j++) G[k][j] += row[k] * row[j]; }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const M = G.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < K; col++) {
    let piv = col; for (let r = col + 1; r < K; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < K; r++) { const f = M[r][col] / M[col][col]; for (let cc = col; cc <= K; cc++) M[r][cc] -= f * M[col][cc]; }
  }
  const x = new Float64Array(K);
  for (let col = K - 1; col >= 0; col--) { let s = M[col][K]; for (let cc = col + 1; cc < K; cc++) s -= M[col][cc] * x[cc]; x[col] = s / M[col][col]; }
  console.log(`\njoint LSQ at ${YEARS} yr:  ` + planets.map(([k], p) => `${k} ${(Math.hypot(x[2 * p], x[2 * p + 1]) * 1e6).toFixed(0)}e-6`).join('   ') + '   (A2=J; Meeus 318)');
}

// ── (1b) drift-leak-corrected joint LSQ ────────────────────────────────────
// The window-growing content is the secular-rate mismatch between full and
// base3 (J2+planets shift ϖ̇/Ω̇/ṅ slightly) leaking through the main-problem
// terms: λ_full − λ_base3 ⊃ (∂term/∂arg)·Δarg(t), with Δarg(t) growing
// linearly. Model it: fixed sin/cos at the A2 family PLUS fixed AND
// t-modulated sin/cos at the main-problem arguments. The t-terms absorb the
// leak; the A2 coefficients come out unbiased.
{
  const fS = LAB.linFit(T, full.lamS);
  const planets = [['V', fV], ['Ma', fMa], ['J', fJ], ['Sa', fSa]];
  // main-problem argument linfits (from the full run's own elements)
  const mains = [
    ['Mp', { a: fLam.a - fW.a, b: fLam.b - fW.b }],                                  // M′ = λ − ϖ
    ['2D-Mp', { a: fLam.a - 2 * fS.a + fW.a, b: fLam.b - 2 * fS.b + fW.b }],         // λ − 2λ_S + ϖ
    ['2D', { a: 2 * (fLam.a - fS.a), b: 2 * (fLam.b - fS.b) }],
    ['2Mp', { a: 2 * (fLam.a - fW.a), b: 2 * (fLam.b - fW.b) }],
  ];
  const K = planets.length * 2 + mains.length * 4;
  const G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  const rowBuf = new Float64Array(K);
  for (let i = 0; i < N; i++) {
    const tc = T[i] / 36525;
    const base = (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]);
    let c = 0;
    for (const [, f] of planets) { const th = base - 2 * (f.a + f.b * T[i]); rowBuf[c++] = Math.sin(th); rowBuf[c++] = Math.cos(th); }
    for (const [, f] of mains) {
      const th = f.a + f.b * T[i], s = Math.sin(th), co = Math.cos(th);
      rowBuf[c++] = s; rowBuf[c++] = co; rowBuf[c++] = tc * s; rowBuf[c++] = tc * co;
    }
    for (let k = 0; k < K; k++) { b[k] += dl[i] * rowBuf[k]; for (let j = k; j < K; j++) G[k][j] += rowBuf[k] * rowBuf[j]; }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const M = G.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < K; col++) {
    let piv = col; for (let r = col + 1; r < K; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < K; r++) { const f = M[r][col] / M[col][col]; for (let cc = col; cc <= K; cc++) M[r][cc] -= f * M[col][cc]; }
  }
  const x = new Float64Array(K);
  for (let col = K - 1; col >= 0; col--) { let s = M[col][K]; for (let cc = col + 1; cc < K; cc++) s -= M[col][cc] * x[cc]; x[col] = s / M[col][col]; }
  console.log(`leak-corrected LSQ:  ` + planets.map(([k], p) => `${k} ${(Math.hypot(x[2 * p], x[2 * p + 1]) * 1e6).toFixed(0)}e-6`).join('   ') + '   (A2=J; Meeus 318)');
  const off = planets.length * 2;
  console.log('  leak terms (t-modulated, e-6°/cy): ' + mains.map(([k], m) =>
    `${k} ${(Math.hypot(x[off + 4 * m + 2], x[off + 4 * m + 3]) * 1e6).toFixed(0)}`).join('   '));
}

// ── (2) complex demodulation at θ_A2 ───────────────────────────────────────
const LP_YR = 50;                                   // low-pass window
const zr = new Float64Array(N), zi = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const th = (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]) - 2 * (fJ.a + fJ.b * T[i]);
  zr[i] = dl[i] * Math.cos(th);
  zi[i] = -dl[i] * Math.sin(th);
}
// moving average + decimation to 1 sample / 5 yr
const lpN = Math.round(LP_YR * 365.25 / SAMPLE_D);
const decN = Math.round(5 * 365.25 / SAMPLE_D);
const ZT = [], ZR = [], ZI = [];
let accR = 0, accI = 0;
for (let i = 0; i < N; i++) {
  accR += zr[i]; accI += zi[i];
  if (i >= lpN) { accR -= zr[i - lpN]; accI -= zi[i - lpN]; }
  if (i >= lpN && (i % decN === 0)) {
    ZT.push(T[i] - lpN * SAMPLE_D / 2);
    ZR.push(accR / lpN); ZI.push(accI / lpN);
  }
}
console.log(`\ndemodulated envelope |2z̄| (deg×1e6), ${LP_YR}-yr low-pass, sampled every ${Math.round(YEARS / 12 / 100) * 100} yr:`);
const stride = Math.max(1, Math.floor(ZT.length / 12));
for (let i = 0; i < ZT.length; i += stride) {
  const amp = 2 * Math.hypot(ZR[i], ZI[i]) * 1e6;
  const ph = Math.atan2(ZI[i], ZR[i]) / d2r;
  console.log(`  t ${(ZT[i] / 365.25).toFixed(0).padStart(6)} yr   |2z̄| ${amp.toFixed(0).padStart(6)}e-6°   phase ${ph.toFixed(1).padStart(7)}°`);
}

// ── (3) demodulated complex periodogram ────────────────────────────────────
// rate offsets in °/cy around A2; resolution ≈ 36000/(YEARS) °/cy
const RES = 36000 / YEARS;                          // °/cy
const SPAN = Math.max(60, 12 * RES);
const peaks = [];
for (let off = -SPAN; off <= SPAN; off += RES / 8) {
  const w = off * d2r / 36525;                      // rad/day offset
  let sr = 0, si = 0;
  for (let i = 0; i < ZT.length; i++) {
    const c = Math.cos(w * ZT[i]), s = Math.sin(w * ZT[i]);
    sr += ZR[i] * c + ZI[i] * s;                    // z̄ · e^{−iw t}
    si += ZI[i] * c - ZR[i] * s;
  }
  peaks.push({ off, amp: 2 * Math.hypot(sr, si) / ZT.length });
}
peaks.sort((a, b) => b.amp - a.amp);
const shown = [];
for (const p of peaks) {
  if (shown.some(q => Math.abs(q.off - p.off) < RES * 1.5)) continue;
  shown.push(p);
  if (shown.length >= 8) break;
}
shown.sort((a, b) => a.off - b.off);

// candidate identifications (rates °/cy relative to A2)
const nJ = fJ.b * 36525 / d2r, nSa = fSa.b * 36525 / d2r, nV = fV.b * 36525 / d2r, nMa = fMa.b * 36525 / d2r;
const CAND = [
  { name: 'A2 itself', off: 0 },
  { name: '+(2λJ−5λSa)', off: 2 * nJ - 5 * nSa },
  { name: '−(2λJ−5λSa)', off: -(2 * nJ - 5 * nSa) },
  { name: '+(λJ−λSa)', off: nJ - nSa },
  { name: '−(λJ−λSa)', off: -(nJ - nSa) },
  { name: '+(2λJ−2λSa)', off: 2 * (nJ - nSa) },
  { name: '−(2λJ−2λSa)', off: -2 * (nJ - nSa) },
  { name: '2λ_J side (→ Lp+ϖ−4λJ+2λ?)', off: 2 * nJ - 2 * nJ },
];
console.log(`\ndemodulated spectrum peaks (resolution ${RES.toFixed(1)} °/cy):`);
console.log('   offset(°/cy)   split-period(yr)   amp(e-6°)   nearest candidate');
for (const p of shown) {
  let best = null;
  for (const c of CAND) { const d = Math.abs(c.off - p.off); if (!best || d < best.d) best = { d, c }; }
  const tag = best.d < RES ? `${best.c.name} (Δ ${best.d.toFixed(1)})` : '—';
  console.log(`   ${p.off.toFixed(1).padStart(9)}   ${p.off !== 0 ? (36000 / Math.abs(p.off)).toFixed(0).padStart(12) : '           ∞'}   ${(p.amp * 1e6).toFixed(0).padStart(8)}   ${tag}`);
}

// artifact
const out = {
  _comment: 'v4 E2 A2-multiplet run (IP-v4-lab.md).',
  years: YEARS, dtDays: DTD, sampleDays: SAMPLE_D, lowPassYr: LP_YR,
  resolutionDegPerCy: RES,
  peaks: shown.map(p => ({ offsetDegPerCy: p.off, ampE6: p.amp * 1e6 })),
  envelope: ZT.filter((_, i) => i % stride === 0).map((t, j) => {
    const i = j * stride;
    return { tYr: t / 365.25, ampE6: 2 * Math.hypot(ZR[i], ZI[i]) * 1e6, phaseDeg: Math.atan2(ZI[i], ZR[i]) / d2r };
  }),
};
const outPath = path.resolve(__dirname, '..', '..', 'data', `v4-a2-multiplet-${YEARS}yr.json`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nartifact: ${outPath}`);
