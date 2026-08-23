// FQ-7 DUST ROUND, PHASE 1 — the broadband-dust census (plan §12i FQ-7
// component (i): ~1.3″ λ / ~0.9″ β of sub-0.1″ deep-series content).
//
// QUESTION: how much of the post-R3 residual (shipped−MPP02, λ 2.92″-class)
// is ON-LATTICE representable — capturable by integer Delaunay arguments a
// deeper derived extraction could reach — and which arguments lead? The
// census RANKS candidates; it derives nothing. Phase 2 hands the leaders
// to the 3-body(+J2) lab, which decides what is derivable (the m20h
// epistemic split: lab-reproduced = extraction truncation, lab-absent =
// beyond-3-body or MPP02's fitted content).
//
// Method (band-probe conventions line-for-line — MPP02 dense proxy, the
// Meeus additive β family on the shipped side, IAU precession bridge):
//   1. joint-fit the KNOWN content (Meeus head args + shipped extension
//      args + the R1 probe set) as absorbers → the post-known residual.
//      V2 GUARD (measured in v1): the leading captures were IMPOSTORS —
//      a bare ~196 °/cy tone plus Mp±196 (λ) and F±196 (β) sideband
//      pairs, i.e. T²-argument/secular differences vs MPP02 (the R1
//      "T-modulated parameter class", doctrine-blocked) masquerading as
//      184-yr-modulator families under a linear-only detrend. v2 adds a
//      QUADRATIC+CUBIC detrend and T·(cos,sin) / T²·(cos,sin) quadrature
//      absorbers on the leading head arguments, so secular-argument
//      content cannot alias into the dust census;
//   2. stage-1 scan: every canonical new Delaunay candidate (order ≤ 12,
//      kD ≤ 8, |kM| ≤ 3, |kMp| ≤ 8, λ even-F |kF| ≤ 4 / β odd-F ≤ 5,
//      window- (≥ 3 cycles = 540 °/cy) and Nyquist-screened,
//      known-frequency-collision-screened) gets an independent 2-param
//      LSQ on the residual → ranked;
//   3. stage-2: joint fit [known + top candidate cluster reps] → refined
//      amplitudes, capturable-content sum, and the post-fit floor.
//
// Usage: node tools/explore/fq7-dust-census.mjs [topN=150]

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const MPP = require('./tools/lib/elp-mpp02.js');
const { moonSeriesExtensionDeg } = require('@essrt/physics/moon/series-extension');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const TOPN = parseInt(process.argv[2] || '150', 10);
const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, J2000 = 2451545.0;
const model = createModel();
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const mpp = MPP.loadMpp02(1);
const PREC = [0, 5029.0966 / 3600, 1.1120 / 3600, 0.000077 / 3600, 0];
const poly = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] || 0))));
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// ── known catalogs (absorbers) ──────────────────────────────────────────
const MT = JSON.parse(readFileSync(new URL('../../public/input/meeus-lunar-tables.json', import.meta.url), 'utf8'));
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const RATES = [445267.1114034, 35999.0502909, 477198.8675055, 483202.0175233];
const freqOf = (a) => Math.abs(a[0] * RATES[0] + a[1] * RATES[1] + a[2] * RATES[2] + a[3] * RATES[3]);

const PL0 = { V: 181.979801, E: 100.466457, Ma: 355.433000, J: 34.351519, S: 50.077444 };
const PL1 = { V: 58517.815676, E: 36000.769780, Ma: 19141.696300, J: 3036.302389, S: 1223.511013 };
/** @type {Array<[string, number, number]>} */
const PROBES = [
  ['Omega', 125.04452, -1934.136],
  ['2Omega', 250.08904, -3868.272],
  ['J-S', PL0.J - PL0.S, PL1.J - PL1.S],
  ['2(J-S)', 2 * (PL0.J - PL0.S), 2 * (PL1.J - PL1.S)],
  ['E-J', PL0.E - PL0.J, PL1.E - PL1.J],
  ['2(E-J)', 2 * (PL0.E - PL0.J), 2 * (PL1.E - PL1.J)],
  ['V-E', PL0.V - PL0.E, PL1.V - PL1.E],
  ['2(V-E)', 2 * (PL0.V - PL0.E), 2 * (PL1.V - PL1.E)],
  ['E-S', PL0.E - PL0.S, PL1.E - PL1.S],
  ['E-Ma', PL0.E - PL0.Ma, PL1.E - PL1.Ma],
  ['2E-2Ma', 2 * (PL0.E - PL0.Ma), 2 * (PL1.E - PL1.Ma)],
];
const FAST = [['Mp', 134.9633964, 477198.8675055], ['2D', 2 * 297.8501921, 2 * 445267.1114034], ['F', 93.2720950, 483202.0175233], ['2F', 2 * 93.2720950, 2 * 483202.0175233]];
for (const [pn, p0, p1] of [['Omega', 125.04452, -1934.136], ['J-S', PL0.J - PL0.S, PL1.J - PL1.S]]) {
  for (const [fn2, f0, f1] of FAST) {
    PROBES.push([`${fn2}+${pn}`, f0 + p0, f1 + p1], [`${fn2}-${pn}`, f0 - p0, f1 - p1]);
  }
}

// ── dense sampling ──────────────────────────────────────────────────────
const JD0 = 2396759, JD1 = 2469800, STEP = 2;   // 1850–2049
const args4 = (T) => ({
  D: (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R,
  M: (357.5291092 + 35999.0502909 * T) * D2R,
  Mp: (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R,
  F: (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R,
});
const ts = [], yL = [], yB = [];
for (let jd = JD0; jd <= JD1; jd += STEP) {
  const jb = jd + BRIDGE;
  const T = (jb - J2000) / 36525;
  const ext = moonSeriesExtensionDeg(T);
  const shipL = model.moon.lonDegAtJD(jb) + LP + ext.dLonDeg;
  const LpA = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * D2R;
  const A1a = (119.75 + 131.849 * T) * D2R;
  const A3a = (313.45 + 481266.484 * T) * D2R;
  const Mpa = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  const Fa = (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R;
  const bFam = (-2235 * Math.sin(LpA) + 382 * Math.sin(A3a) + 175 * Math.sin(A1a - Fa)
    + 175 * Math.sin(A1a + Fa) + 127 * Math.sin(LpA - Mpa) - 115 * Math.sin(LpA + Mpa)) * 1e-6;
  const shipB = model.moon.betaDegAtJD(jb) + bFam + ext.dLatDeg;
  const m = MPP.evalMpp02(T, mpp);
  ts.push(T);
  yL.push(wrap(shipL - (m.lon * R2D + poly(PREC, T))) * AS);
  yB.push(wrap(shipB - m.lat * R2D) * AS);
}
const N = ts.length;
// cubic detrend — protects slow candidates from T²/T³ secular-argument
// residue (v1 measured a fake 184-yr "family" under linear-only detrend)
const detrend = (ys) => {
  const P = 4;
  const G = Array.from({ length: P }, () => new Float64Array(P));
  const b = new Float64Array(P), row = new Float64Array(P);
  for (let i = 0; i < N; i++) {
    const T = ts[i];
    row[0] = 1; row[1] = T; row[2] = T * T; row[3] = T * T * T;
    for (let k = 0; k < P; k++) { b[k] += row[k] * ys[i]; for (let j = k; j < P; j++) G[k][j] += row[k] * row[j]; }
  }
  for (let k = 0; k < P; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < P; c++) {
    for (let r = c + 1; r < P; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < P; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const co = new Float64Array(P);
  for (let c = P - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < P; cc++) s -= Gm[c][cc] * co[cc];
    co[c] = s / Gm[c][c];
  }
  for (let i = 0; i < N; i++) {
    const T = ts[i];
    ys[i] -= co[0] + T * (co[1] + T * (co[2] + T * co[3]));
  }
  return Math.sqrt(ys.reduce((s, v) => s + v * v, 0) / N);
};
const sdOf = (ys) => Math.sqrt(ys.reduce((s, v) => s + v * v, 0) / N);

// ── generic joint fit (cos+sin per entry; entries: {a} Delaunay or {p0,p1}) ─
function jointFit(ys, entries) {
  const K = 2 * entries.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < N; i++) {
    const T = ts[i], ag = args4(T);
    for (let c = 0; c < entries.length; c++) {
      const e = entries[c];
      const th = e.a
        ? e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F
        : (e.p0 + e.p1 * T) * D2R;
      const w = e.tmod ? Math.pow(T, e.tmod) : 1;   // T-modulated quadrature absorber
      row[2 * c] = w * Math.cos(th); row[2 * c + 1] = w * Math.sin(th);
    }
    const y = ys[i];
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b[k] += rk * y; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
    out[c] = s / Gm[c][c];
  }
  const resid = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const T = ts[i], ag = args4(T);
    let f = 0;
    for (let c = 0; c < entries.length; c++) {
      const e = entries[c];
      const th = e.a
        ? e.a[0] * ag.D + e.a[1] * ag.M + e.a[2] * ag.Mp + e.a[3] * ag.F
        : (e.p0 + e.p1 * T) * D2R;
      const w = e.tmod ? Math.pow(T, e.tmod) : 1;
      f += w * (out[2 * c] * Math.cos(th) + out[2 * c + 1] * Math.sin(th));
    }
    resid[i] = ys[i] - f;
  }
  return { x: out, resid };
}

// known absorber set (dedup + frequency-clustered reps like the band probe)
// + T/T² quadrature absorbers on the leading head arguments, so
// secular-argument (parameter-class) content cannot alias into candidates
function knownEntries(delaunayArgs, headTerms) {
  const seen = new Set(); const items = [];
  for (const a of delaunayArgs) {
    const k = a.join(','); if (seen.has(k)) continue; seen.add(k);
    items.push({ a, name: `[${k}]`, freq: freqOf(a) });
  }
  for (const [name, p0, p1] of PROBES) items.push({ p0, p1, name, freq: Math.abs(p1) });
  items.sort((x, y) => x.freq - y.freq);
  const reps = [];
  for (const c of items) {
    const last = reps[reps.length - 1];
    if (last && c.freq - last.freq < 60) continue;   // near-degenerate at the 200-yr window
    reps.push(c);
  }
  // T-modulation absorbers: the 12 largest head terms, T and T² quadratures
  const big = headTerms.map((t) => ({ a: t.slice(0, 4), amp: Math.abs(t[4]) }))
    .sort((x, y) => y.amp - x.amp).slice(0, 12);
  for (const bt of big) for (const tm of [1, 2]) {
    reps.push({ a: bt.a, tmod: tm, name: `T^${tm}[${bt.a.join(',')}]`, freq: freqOf(bt.a) });
  }
  return { reps, keys: seen };
}

// ── candidate enumeration (canonical sign, order ≤ 12, screened) ────────
function candidates(fParityEven, knownKeys, knownFreqs) {
  const FMAX = fParityEven ? 4 : 5;
  const out = [];
  for (let kD = 0; kD <= 8; kD++) for (let kM = -3; kM <= 3; kM++)
    for (let kMp = -8; kMp <= 8; kMp++) for (let kF = -FMAX; kF <= FMAX; kF++) {
      if (fParityEven ? Math.abs(kF) % 2 === 1 : Math.abs(kF) % 2 === 0) continue;
      if (kD === 0 && kM === 0 && kMp === 0 && kF === 0) continue;
      if (Math.abs(kD) + Math.abs(kM) + Math.abs(kMp) + Math.abs(kF) > 12) continue;
      if (kD === 0) {                       // canonical: first nonzero positive
        const first = kM !== 0 ? kM : (kMp !== 0 ? kMp : kF);
        if (first < 0) continue;
      }
      const key = [kD, kM, kMp, kF].join(',');
      if (knownKeys.has(key)) continue;
      const f = freqOf([kD, kM, kMp, kF]);
      if (f < 540) continue;                // < 3 cycles over the 200-yr window
      if (f > 3.0e6) continue;              // 2-day-step Nyquist guard
      let clash = false;                    // degenerate with an absorbed tone
      for (const kf of knownFreqs) { if (Math.abs(f - kf) < 60) { clash = true; break; } }
      if (clash) continue;
      out.push({ a: [kD, kM, kMp, kF], freq: f });
    }
  return out;
}

// stage-1 scan: independent 2-param LSQ per candidate on the residual
function scan(resid, cands) {
  const cD = new Float64Array(N), cM = new Float64Array(N), cMp = new Float64Array(N), cF = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const ag = args4(ts[i]);
    cD[i] = ag.D; cM[i] = ag.M; cMp[i] = ag.Mp; cF[i] = ag.F;
  }
  for (const c of cands) {
    const [kD, kM, kMp, kF] = c.a;
    let sc = 0, ss = 0, scc = 0, sss = 0, scs = 0;
    for (let i = 0; i < N; i++) {
      const th = kD * cD[i] + kM * cM[i] + kMp * cMp[i] + kF * cF[i];
      const co = Math.cos(th), si = Math.sin(th), y = resid[i];
      sc += co * y; ss += si * y; scc += co * co; sss += si * si; scs += co * si;
    }
    const det = scc * sss - scs * scs;
    const ac = (sc * sss - ss * scs) / det, as = (ss * scc - sc * scs) / det;
    c.amp = Math.hypot(ac, as);
  }
  cands.sort((x, y) => y.amp - x.amp);
  // cluster the ranked list: a candidate within 60 °/cy of a stronger pick
  // is its alias at this window — keep the strongest per frequency slot
  const picked = [];
  for (const c of cands) {
    let dup = false;
    for (const p of picked) { if (Math.abs(c.freq - p.freq) < 60) { dup = true; (p.aliases ??= []).push(c); break; } }
    if (!dup) picked.push(c);
    if (picked.length >= TOPN) break;
  }
  return picked;
}

function census(label, ys, delaunayArgs, fParityEven, headTerms) {
  const sd0 = detrend(ys);
  const { reps, keys } = knownEntries(delaunayArgs, headTerms);
  const known = jointFit(ys, reps);
  const sdKnown = sdOf(known.resid);
  console.log(`\n${label}: detrended sd ${sd0.toFixed(3)}″ → post-KNOWN residual ${sdKnown.toFixed(3)}″ (${reps.length} absorber clusters)`);
  const knownFreqs = reps.map((r) => r.freq);
  const cands = candidates(fParityEven, keys, knownFreqs);
  console.log(`   candidate space: ${cands.length} screened new args (order ≤ 12)`);
  const t0 = Date.now();
  const picked = scan(known.resid, cands);
  console.log(`   stage-1 scan: ${((Date.now() - t0) / 1000).toFixed(0)} s; top-${TOPN} cluster reps span ${picked[0].amp.toFixed(3)}″ … ${picked[picked.length - 1].amp.toFixed(3)}″`);
  // stage-2: joint fit known + picked
  const joint = jointFit(ys, [...reps, ...picked.map((p) => ({ a: p.a, freq: p.freq }))]);
  const sdJoint = sdOf(joint.resid);
  const rows = picked.map((p, j) => {
    const c = reps.length + j;
    return { a: p.a, freq: p.freq, amp: Math.hypot(joint.x[2 * c], joint.x[2 * c + 1]), stage1: p.amp, aliases: (p.aliases || []).slice(0, 2).map((al) => al.a.join(',')) };
  }).sort((x, y) => y.amp - x.amp);
  const content = Math.sqrt(rows.reduce((s, r) => s + r.amp * r.amp / 2, 0));
  console.log(`   stage-2 joint: residual ${sdKnown.toFixed(3)}″ → ${sdJoint.toFixed(3)}″ · capturable content (sd-equiv) ${content.toFixed(3)}″`);
  console.log(`   leaders (joint amp ≥ 0.04″; alias partners within 60 °/cy shown):`);
  for (const r of rows.filter((r2) => r2.amp >= 0.04).slice(0, 25)) {
    const al = r.aliases.length ? `   ~[${r.aliases.join('] ~[')}]` : '';
    console.log(`     [${r.a.join(',')}]`.padEnd(18) + ` ${r.amp.toFixed(3)}″  (scan ${r.stage1.toFixed(3)})${al}`);
  }
  return { sd0, sdKnown, sdJoint, content, rows };
}

console.log(`dense shipped−MPP02, n ${N} (2-day, 1850–2049); topN ${TOPN}`);
const meeusLonArgs = MT.longitudeTerms.terms.map((t) => t.slice(0, 4));
const meeusLatArgs = MT.latitudeTerms.terms.map((t) => t.slice(0, 4));
const L = census('λ (even-F candidates)', yL, [...meeusLonArgs, ...extArgs], true, MT.longitudeTerms.terms);
const B = census('β (odd-F candidates)', yB, [...meeusLatArgs, ...extArgs], false, MT.latitudeTerms.terms);

writeFileSync(new URL('./fq7-dust-census.local.json', import.meta.url), JSON.stringify({
  window: '1850-2049 2-day vs MPP02', topN: TOPN,
  lon: { sdKnown: L.sdKnown, sdJoint: L.sdJoint, content: L.content, rows: L.rows.slice(0, 60) },
  lat: { sdKnown: B.sdKnown, sdJoint: B.sdJoint, content: B.content, rows: B.rows.slice(0, 60) },
}, null, 1));
console.log('\nwrote tools/explore/fq7-dust-census.local.json');
