// FQ-7-SUN — can the ancient eclipse corpus discriminate the two measured
// law tensions? (owner's doctrine: the proof is in the solar eclipses)
//
// The annual-channel attribution measured, over 1900–2100 against JPL:
//   ė   chain −5.11e-5/cy vs −4.20e-5/cy (Simon 1994 / Laskar-class)
//   ϖ̇   chain 6151.5″/cy vs 6190″/cy of-date
// Both laws agree on the 1246 perihelion–solstice anchor (1246.0 vs
// 1247.6); they differ in present-day local slope. This instrument asks
// what a JPL-class law would do to the Sun's equation of centre at the
// corpus epochs relative to ours, and whether the corpus could tell:
//   Δλ(t) = 2·δe(t)·sin M + 2·e·δϖ(t)·cos M   (first-order EoC)
// with δe, δϖ = (Simon polynomial − chain law) at each audit event,
// converted to eclipse-time minutes (1° elongation ≈ 118 min), then
// DETRENDED by the ΔT-degenerate family (const + T + T²): only the
// residual varies event-to-event and is discriminable. Threshold: the
// N3 arbitration measured 0.199 min ≈ 5.5 km as below the corpus's
// discriminating power.
//
// Usage: node tools/explore/fq7s-law-tension-corpus.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const { createModel } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
const d = model.eclipse.frameworkSunDeps;
const D2R = Math.PI / 180, R2AS = 206264.806;

// corpus epochs: the audit-26 SITES table (JD keys) in tools/verify/eclipse-audit.js
const auditSrc = readFileSync(new URL('../../tools/verify/eclipse-audit.js', import.meta.url), 'utf8');
const sites = [...auditSrc.matchAll(/^\s*\[(\d+\.\d+), \{ name: '([^']+)'/gm)].map((m) => ({ jd: parseFloat(m[1]), name: m[2] }));
const years = sites.map((s) => 2000 + (s.jd - 2451545.0) / 365.25);
console.log(`corpus epochs: ${years.length} audit-26 events (years ${Math.min(...years).toFixed(0)}…${Math.max(...years).toFixed(0)})`);

// Simon et al. 1994 mean elements (of-date), T in Julian centuries from J2000
const eSimon = (T) => 0.0167086342 - 0.0000420037 * T - 0.0000001236 * T * T;
const wSimon = (T) => 102.93734808 + 1.7195366 * T + 0.00045688 * T * T;

const rows = [];
for (const y of years) {
  const T = (y - 2000) / 100;
  const de = d.eccentricityAt(y) - eSimon(T);
  const dw = (d.perihelionLongitudeDegAt(y) - wSimon(T)) * D2R;
  const e = d.eccentricityAt(y);
  // worst-case over M (the eclipse can sit at any solar anomaly): amplitude of the EoC difference
  const ampAs = Math.hypot(2 * de, 2 * e * dw) * R2AS;
  rows.push({ y, T, de, dwAs: dw * R2AS, ampAs, min: ampAs / 3600 * 118 });
}
rows.sort((a, b) => a.y - b.y);
console.log('\nper-epoch law difference (JPL-class − chain):');
console.log('   year    δe          δϖ(″)     EoC-amp(″)  eclipse-time(min)');
for (const r of rows) console.log(`  ${String(r.y).padStart(5)}  ${r.de.toExponential(2).padStart(9)}  ${r.dwAs.toFixed(0).padStart(7)}   ${r.ampAs.toFixed(1).padStart(8)}   ${r.min.toFixed(2).padStart(8)}`);

// ΔT-degenerate detrend (const + T + T²) of the timing amplitude
const K = 3;
const G = Array.from({ length: K }, () => new Float64Array(K));
const b = new Float64Array(K);
for (const r of rows) { const v = [1, r.T, r.T * r.T]; for (let k = 0; k < K; k++) { b[k] += v[k] * r.min; for (let j = 0; j < K; j++) G[k][j] += v[k] * v[j]; } }
const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
for (let c = 0; c < K; c++) for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
const co = new Float64Array(K);
for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * co[cc]; co[c] = s / Gm[c][c]; }
const res = rows.map((r) => r.min - (co[0] + co[1] * r.T + co[2] * r.T * r.T));
const sdv = Math.sqrt(res.reduce((s, q) => s + q * q, 0) / res.length);
const raw = Math.sqrt(rows.reduce((s, r) => s + r.min * r.min, 0) / rows.length);
console.log(`\ntiming amplitude RMS ${raw.toFixed(2)} min raw → ${sdv.toFixed(3)} min after the ΔT-degenerate (const+T+T²) detrend`);
console.log(`discrimination threshold (N3 measured): ~0.2 min → ${sdv < 0.2 ? 'the corpus CANNOT discriminate the two laws' : 'the corpus COULD discriminate — a real test exists'}`);
