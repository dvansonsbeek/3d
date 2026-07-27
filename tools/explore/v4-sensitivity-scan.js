/**
 * v4-sensitivity-scan.js — E1 of the v4 lab campaign (docs/hidden/IP-v4-lab.md):
 * FULL-SYSTEM (8-body + Earth J2) re-measurement of the e_S-channel
 * sensitivities, testing the totals-vs-parts hypothesis from the
 * anchored-vs-derived swap survey.
 *
 * Hypothesis: the record/anchored values are TOTALS (all physics), the 3-body
 * lab values are the e_S-channel PARTS; the gaps are direct planetary + J2
 * contributions. PASS = full-system values move from the 3-body numbers
 * (K_PL −2704 / s_ϖ 2.486 / s_Ω 0.880) toward the record values
 * (−2843.6 / 2.407 / 1.018) by at least half the gap (for K_PL).
 *
 * Protocol (es-sensitivity-scan fixed-action, extended per IP-v4-lab.md U3):
 * per e_S point, lunar ICs are fixed-action-calibrated with the D1 3-body
 * machinery (identical procedure at every point, so J2/planet-induced IC
 * mismatches are constant across the scan and cancel in the slopes), then the
 * SAME ICs drive a matched pair of runs — full (8-body + J2) and base3 —
 * at that e_S. base3 slopes must reproduce the 3-body reference (port check);
 * full-system slopes are the measurement.
 *
 * Usage: node tools/explore/v4-sensitivity-scan.js [yearsPerRun=60] [dtDays=0.02]
 */

const fs = require('fs');
const path = require('path');
const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');
const DT = require('../lib/deep-time');

const YEARS = parseFloat(process.argv[2] || '60');
const DTW = parseFloat(process.argv[3] || '0.02');
const R2D = 180 / Math.PI;
const eS0 = LAB.eS;

console.log(`v4 E1 — full-system sensitivity re-scan: ${YEARS} yr/run at dt=${DTW} d`);

// ── the framework's bounded e_E channel range + J2000 slope ────────────────
let eMin = Infinity, eMax = -Infinity;
for (let y = -170000; y <= 170000; y += 250) {
  const e = DT._fwEarthEcc(y);
  if (e < eMin) eMin = e;
  if (e > eMax) eMax = e;
}
const de2dT = Math.pow(DT._fwEarthEcc(50), 2) - Math.pow(DT._fwEarthEcc(-50), 2);
console.log(`e_E channel: J2000 ${DT._fwEarthEcc(0).toFixed(7)}  range [${eMin.toFixed(7)}, ${eMax.toFixed(7)}]  d(e²)/dT ${de2dT.toExponential(4)} /cy`);

// ── fixed-action lunar ICs per e_S (D1 3-body machinery, es-scan protocol) ──
console.log('\ncalibrating baseline ICs at e_S(J2000)...');
const cal = D1.calibrate(eS0, true);
let { eIC, iIC, aIC } = cal;
const baseline = D1.analyzeRun(D1.integrate(eIC, iIC, aIC, YEARS, DTW, eS0));
const TGT = { eFree: baseline.eFree, iFree: baseline.iFree, aOsc: baseline.aOsc };
console.log(`fixed-action targets: free e ${TGT.eFree.toFixed(8)}  free i ${(TGT.iFree * R2D).toFixed(5)}°  mean a ${TGT.aOsc.toFixed(3)} km`);

function fixedActionICs(eSv) {
  let e = eIC, i = iIC, a = aIC;
  for (let it = 0; it < 6; it++) {
    const A = D1.analyzeRun(D1.integrate(e, i, a, YEARS, DTW, eSv));
    const de = TGT.eFree / A.eFree, di = TGT.iFree / A.iFree, da = TGT.aOsc / A.aOsc;
    if (Math.abs(de - 1) < 3e-7 && Math.abs(di - 1) < 3e-7 && Math.abs(da - 1) < 1e-9) break;
    e *= Math.pow(de, 0.8); i *= Math.pow(di, 0.8); a *= da;
  }
  return { a, e, i };
}

// ── rate extraction from a LAB.runSystem series ────────────────────────────
function rates(S) {
  const fLam = LAB.linFit(S.t, S.lam);
  const fW = LAB.linFit(S.t, S.w);
  const fOm = LAB.linFit(S.t, S.Om);
  return { n: fLam.b, aps: fW.b, nod: fOm.b };   // rad/day
}

// ── matched-pair scan ──────────────────────────────────────────────────────
const ES = [eMin, 0.0125, 0.0146, eS0, 0.0190, 0.0210, eMax];
const rows = [];
console.log('\n   e_S        n_full(rad/d)      n_base3(rad/d)     Taps_full(d)  Taps_b3(d)   Tnod_full(d)  Tnod_b3(d)');
for (const eSv of ES) {
  const t0 = Date.now();
  const ICs = fixedActionICs(eSv);
  const full = rates(LAB.runSystem({ planets: true, j2: true, eS: eSv }, ICs, YEARS, DTW));
  const b3 = rates(LAB.runSystem({ planets: false, j2: false, eS: eSv }, ICs, YEARS, DTW));
  rows.push({ eS: eSv, full, b3 });
  console.log(` ${eSv.toFixed(7)} ${full.n.toExponential(8).padStart(18)} ${b3.n.toExponential(8).padStart(18)}`
    + ` ${(2 * Math.PI / full.aps).toFixed(2).padStart(12)} ${(2 * Math.PI / b3.aps).toFixed(2).padStart(11)}`
    + ` ${(-2 * Math.PI / full.nod).toFixed(2).padStart(12)} ${(-2 * Math.PI / b3.nod).toFixed(2).padStart(11)}`
    + `   (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// ── slopes in e_S² ─────────────────────────────────────────────────────────
function slope(xs, ys) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = xs.length;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}
const x2 = rows.map(r => r.eS * r.eS);
const ref = rows.find(r => r.eS === eS0);

function measure(sys) {
  const k = slope(x2, rows.map(r => r[sys].n)) * R2D * 36525;                            // °/cy per e²
  const sW = slope(x2, rows.map(r => Math.log(r[sys].aps / ref[sys].aps))) / 1.5;
  const sN = slope(x2, rows.map(r => Math.log(r[sys].nod / ref[sys].nod))) / 1.5;
  return { k, sW, sN };
}
const F = measure('full'), B = measure('b3');

const REC = { k: -2843.6, sW: 2.407, sN: 1.018 };
const REF3 = { k: -2704, sW: 2.486, sN: 0.880 };

console.log('\n══ E1 RESULT — sensitivities per system ══');
console.log('               K_PL(°/cy per e²)   s_ϖ      s_Ω');
console.log(`  base3 (port)   ${B.k.toFixed(1).padStart(10)}      ${B.sW.toFixed(3).padStart(6)}   ${B.sN.toFixed(3).padStart(6)}   (3-body reference −2704 / 2.486 / 0.880 — port check)`);
console.log(`  full (8b+J2)   ${F.k.toFixed(1).padStart(10)}      ${F.sW.toFixed(3).padStart(6)}   ${F.sN.toFixed(3).padStart(6)}   (record/anchored −2843.6 / 2.407 / 1.018)`);
const kMove = (F.k - B.k) / (REC.k - B.k);
console.log(`\n  K_PL movement toward record: ${(kMove * 100).toFixed(0)}% of the gap  (PASS ≥ 50%)`);
console.log(`  s_ϖ: 3-body ${B.sW.toFixed(3)} → full ${F.sW.toFixed(3)}  (anchored ${REC.sW})`);
console.log(`  s_Ω: 3-body ${B.sN.toFixed(3)} → full ${F.sN.toFixed(3)}  (Meeus-implied ${REC.sN}, theory 1.0)`);

// ── artifact ───────────────────────────────────────────────────────────────
const out = {
  _comment: 'v4 E1 full-system sensitivity re-scan (IP-v4-lab.md). Matched full/base3 pairs at fixed lunar action per e_S.',
  yearsPerRun: YEARS, dtDays: DTW, eS_values: ES,
  rows: rows.map(r => ({ eS: r.eS, full: r.full, base3: r.b3 })),
  slopes: { full: F, base3: B },
  references: { threeBody: REF3, record: REC },
  channel: { de2dT_perCy: de2dT, range: [eMin, eMax] },
};
const outPath = path.resolve(__dirname, '..', '..', 'data', 'v4-sensitivity.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nartifact: ${outPath}`);
