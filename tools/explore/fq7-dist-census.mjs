// FQ-7 ANALYSIS — the distance-series (Σr) dust census.
//
// The Moon DISTANCE has never had a dust audit: the chain ships the
// truncated Meeus Ch. 47 Σr (46 terms) with NO derived tail. Distance
// feeds the umbra radius / magnitude / duration through the Besselian z.
// This measures shipped−MPP02 distance over the 200-yr 2-day window,
// the capturable Delaunay content (cosine rows — Σr convention), and
// translates the residual into umbra-scale impact (δR_umbra ≈ tanf1·δd).
//
// Usage: node tools/explore/fq7-dist-census.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const MPP = require('./tools/lib/elp-mpp02.js');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const mpp = MPP.loadMpp02(1);

const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);
const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});

const JD0 = 2396759, JD1 = 2469800, STEP = 2;
const ts = [], y = [];
for (let jd = JD0; jd <= JD1; jd += STEP) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const ship = model.moon.distanceKmAtJD(jb);
  const m = MPP.evalMpp02(T, mpp);
  ts.push(T);
  y.push(ship - m.dist);
}
const N = ts.length;
const mean = y.reduce((s, v) => s + v, 0) / N;
// linear detrend
{
  const mt = ts.reduce((s, v) => s + v, 0) / N;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < N; i++) { sxy += (ts[i] - mt) * (y[i] - mean); sxx += (ts[i] - mt) ** 2; }
  const sl = sxy / sxx;
  for (let i = 0; i < N; i++) y[i] -= mean + sl * (ts[i] - mt);
}
const sd0 = Math.sqrt(y.reduce((s, v) => s + v * v, 0) / N);
console.log(`shipped−MPP02 distance: mean offset ${mean.toFixed(2)} km · detrended sd ${sd0.toFixed(3)} km (n ${N})`);

// per-candidate 2-param scan over the wide catalog (Σr parity: even F)
const meeusSet = new Set(MT.distanceTerms ? MT.distanceTerms.terms.map((t) => t.slice(0, 4).join(',')) : []);
console.log(`Meeus Σr catalog absorbed: ${meeusSet.size} args`);
const cands = [];
for (let kD = 0; kD <= 8; kD++) for (let kM = -3; kM <= 3; kM++)
  for (let kMp = -8; kMp <= 8; kMp++) for (let kF = -4; kF <= 4; kF += 2) {
    if (kD === 0 && kM === 0 && kMp === 0 && kF === 0) continue;
    if (Math.abs(kD) + Math.abs(kM) + Math.abs(kMp) + Math.abs(kF) > 12) continue;
    if (kD === 0) {
      const first = kM !== 0 ? kM : (kMp !== 0 ? kMp : kF);
      if (first < 0) continue;
    }
    const f = freqOf([kD, kM, kMp, kF]);
    if (f < 540 || f > 3.0e6) continue;
    cands.push({ a: [kD, kM, kMp, kF], freq: f, known: meeusSet.has([kD, kM, kMp, kF].join(',')) });
  }
const cD = new Float64Array(N), cM = new Float64Array(N), cMp = new Float64Array(N), cF = new Float64Array(N);
for (let i = 0; i < N; i++) { const ag = args4(ts[i]); cD[i] = ag.D; cM[i] = ag.M; cMp[i] = ag.Mp; cF[i] = ag.F; }
for (const c of cands) {
  const [kD, kM, kMp, kF] = c.a;
  let sc = 0, ss = 0, scc = 0, sss = 0, scs = 0;
  for (let i = 0; i < N; i++) {
    const th = kD * cD[i] + kM * cM[i] + kMp * cMp[i] + kF * cF[i];
    const co = Math.cos(th), si = Math.sin(th), yy = y[i];
    sc += co * yy; ss += si * yy; scc += co * co; sss += si * si; scs += co * si;
  }
  const det = scc * sss - scs * scs;
  c.amp = Math.hypot((sc * sss - ss * scs) / det, (ss * scc - sc * scs) / det);
}
cands.sort((a, b) => b.amp - a.amp);
const picked = [];
for (const c of cands) {
  if (picked.some((p) => Math.abs(p.freq - c.freq) < 60)) continue;
  picked.push(c);
  if (picked.length >= 40) break;
}
console.log('\nleaders (independent scan, km; KNOWN = already a Meeus Σr arg — amplitude correction class):');
for (const p of picked.slice(0, 20)) {
  console.log(`  [${p.a.join(',')}]`.padEnd(16) + ` ${p.amp.toFixed(3)} km${p.known ? '  KNOWN' : ''}`);
}
const content = Math.sqrt(picked.reduce((s, p) => s + p.amp * p.amp / 2, 0));
console.log(`capturable content (top-40 sd-equiv): ${content.toFixed(3)} km of ${sd0.toFixed(3)} km`);
// umbra impact scale: tan f1 ≈ 0.0046 (penumbral ~0.0046, umbral similar order)
console.log(`umbra-radius impact scale: sd ${sd0.toFixed(1)} km × tanf ≈ ${(sd0 * 0.0046).toFixed(3)} km ground; parallax-class angular ≈ ${(sd0 / 384400 * 3437.75 * 60 * 0.0000).toFixed(0)}`);
console.log(`fractional distance: ${(sd0 / 384400 * 1e6).toFixed(1)} ppm`);
