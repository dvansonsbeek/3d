#!/usr/bin/env node
/**
 * LOD-CLIMATE CORRELATION GENERATOR (§12h follow-up item 1)
 * =========================================================
 *
 * Owns `data/lod-climate-correlation-summary.json`. Node port of the
 * browser's LOD-Climate Rhythm correlation (script.js `lcrComputeMatch` +
 * `lcrDetrendSeries` + the named-event sign check), verified to reproduce
 * the recorded campaign values before taking ownership:
 *
 *   1. Proxies from the tracked `public/input/climate-proxy.json`
 *      (Bond 2001 IRD — the correlation target; GISP2 Alley 2000 — the
 *      comparison), each detrended by subtracting a ±2,500-yr centered
 *      moving average (the browser's lcrDetrendSeries(data, 5000)).
 *   2. Σ_stack = dtCycleLodCorrectionSum(year) — the 4-flag + Core-mantle
 *      swing δLOD sum from tools/lib/deep-time.js (bit-identical to the
 *      browser, probe-proven in §12h) — sampled at 100-yr steps over the
 *      proxy span clamped to the VALIDATED WINDOW (−4000..+1800, the
 *      Espenak-fit-validated range).
 *   3. Pearson r per proxy; sign-convention hits over the named in-window
 *      events (Σ > 0 = warm anomaly), the five-event set of docs/102 §7.
 *
 * SHIPPED AS 'OPEN CORRESPONDENCE, NOT VALIDATION' — the correlation fails
 * the docs/103 null tests; the artifact carries that caveat and so must
 * every consumer.
 *
 *   node tools/verify/lod-climate-correlation.js            # compute + compare
 *   node tools/verify/lod-climate-correlation.js --write    # + write artifact
 */

const fs = require('fs');
const path = require('path');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');
const DT = require('../lib/deep-time');

const OUT = path.join(ROOT, 'data', 'lod-climate-correlation-summary.json');
const WRITE = process.argv.includes('--write');
const WINDOW_LO = -4000, WINDOW_HI = 1800, STEP = 100;

// Inputs: the tracked proxy dataset, the ΔT-stack coefficient artifacts the
// engine sum is built from, and the code that owns the actual cycle math
// (the shared physics module changes rarely; the broad tools/lib churn is
// deliberately excluded — the coefficient JSONs are what move the numbers).
const INPUT_FILES = [
  'tools/verify/lod-climate-correlation.js',
  'public/input/climate-proxy.json',
  'data/deltaT-4flag-fit.json',
  'data/core-mantle-resonator-stage1.json',
  'packages/physics/src/deltat/cycles.cjs',
];

// Browser lcrDetrendSeries(data, 5000) verbatim.
function detrend(data, windowYr = 5000) {
  const halfWin = windowYr / 2;
  const out = [];
  for (let i = 0; i < data.length; i++) {
    const [yi, vi] = data[i];
    let sum = 0, count = 0;
    for (let j = 0; j < data.length; j++) {
      const [yj, vj] = data[j];
      if (yj < yi - halfWin) continue;
      if (yj > yi + halfWin) break;
      sum += vj;
      count += 1;
    }
    out.push([yi, vi - sum / count]);
  }
  return out;
}

function pearson(x, y) {
  const n = x.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const den = Math.sqrt(sxx * syy);
  return den > 0 ? sxy / den : null;
}

/** Browser lcrComputeMatch's r_stack, for one proxy, validated window. */
function correlate(source) {
  const dd = detrend(source.data);
  const proxyMin = dd[0][0], proxyMax = dd[dd.length - 1][0];
  const yrLo = Math.max(WINDOW_LO, Math.ceil(proxyMin / STEP) * STEP);
  const yrHi = Math.min(WINDOW_HI, Math.floor(proxyMax / STEP) * STEP);
  const interpT = (year) => {
    if (year < dd[0][0] || year > dd[dd.length - 1][0]) return null;
    let lo = 0, hi = dd.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (dd[mid][0] < year) lo = mid; else hi = mid;
    }
    const [y1, v1] = dd[lo], [y2, v2] = dd[hi];
    if (y1 === y2) return v1;
    return v1 + ((year - y1) / (y2 - y1)) * (v2 - v1);
  };
  const stackVals = [], tempVals = [];
  for (let year = yrLo; year <= yrHi; year += STEP) {
    const t = interpT(year);
    if (t == null) continue;
    stackVals.push(DT.dtCycleLodCorrectionSum(year));
    tempVals.push(t);
  }
  return { r: pearson(stackVals, tempVals), n: tempVals.length, yrLo, yrHi };
}

// The named-event sign check (browser LCR_SIGN_CHECK_EVENTS, in-window set).
const SIGN_EVENTS = [
  { year: -3950, type: 'cold', name: 'Bond 4 event' },
  { year: -2250, type: 'cold', name: '4.2 ka event' },
  { year: 100, type: 'warm', name: 'Roman Warm Period peak' },
  { year: 1050, type: 'warm', name: 'MWP peak' },
  { year: 1670, type: 'cold', name: 'Maunder Minimum' },
];

const proxyDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/input/climate-proxy.json'), 'utf8'));
const bond = proxyDoc.sources.find((s) => s.name === 'Bond 2001 IRD');
const gisp = proxyDoc.sources.find((s) => s.name === 'GISP2 (Alley 2000)');
if (!bond || !gisp) throw new Error('climate-proxy.json is missing an expected source');

const rBond = correlate(bond);
const rGisp = correlate(gisp);
const events = SIGN_EVENTS.map((e) => {
  const sum = DT.dtCycleLodCorrectionSum(e.year);
  const hit = Math.sign(sum) === (e.type === 'warm' ? 1 : -1);
  return { ...e, stackLodSeconds: sum, hit };
});
const hits = events.filter((e) => e.hit).length;

console.log('  Bond 2001 IRD  r = %s  (n=%d, %d..%d)', rBond.r.toFixed(4), rBond.n, rBond.yrLo, rBond.yrHi);
console.log('  GISP2          r = %s  (n=%d, %d..%d)', rGisp.r.toFixed(4), rGisp.n, rGisp.yrLo, rGisp.yrHi);
console.log('  sign convention: %d/%d  (%s)', hits, events.length,
  events.map((e) => `${e.name}:${e.hit ? 'hit' : 'MISS'}`).join(', '));

// Acceptance check against the recorded campaign snapshot.
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
if (prev) {
  const cmp = [
    ['bondIrdPearsonR', prev.bondIrdPearsonR, Number(rBond.r.toFixed(2))],
    ['gisp2PearsonR', prev.gisp2PearsonR, Number(rGisp.r.toFixed(2))],
    ['signConventionHits', prev.signConventionHits, hits],
  ];
  for (const [k, was, now] of cmp) {
    console.log(`  ${now === was ? 'REPRODUCED' : 'DIVERGED  '} ${k}: recorded ${was}, computed ${now}`);
  }
}

const artifact = {
  _description:
    'LOD-Climate Rhythm correlation summary — GENERATED by ' +
    'tools/verify/lod-climate-correlation.js --write (Node port of the ' +
    "browser's LCR correlation, verified to reproduce the recorded campaign " +
    'values before taking ownership): Pearson r of the joint-world cumulative ' +
    'stack deltaLOD (4 flags + Core-mantle swing) vs the +/-2500-yr-detrended ' +
    'proxies over the validated window -4000..+1800, out-of-sample (the stack ' +
    'was fit against the Stephenson 2016 deltaT residual, not any climate ' +
    "proxy); sign-convention hits on the five named in-window events. SHIPPED " +
    "AS 'OPEN CORRESPONDENCE, NOT VALIDATION' — the correlation fails every " +
    'formal null test (docs/103) and every consumer must carry that caveat. ' +
    'The inputs block is verified by the artifact-freshness gate on every ' +
    'npm run check.',
  bondIrdPearsonR: Number(rBond.r.toFixed(2)),
  bondIrdPearsonRFull: rBond.r,
  gisp2PearsonR: Number(rGisp.r.toFixed(2)),
  gisp2PearsonRFull: rGisp.r,
  signConventionHits: hits,
  signConventionTotal: events.length,
  signConventionEvents: events.map((e) => ({ name: e.name, year: e.year, type: e.type, hit: e.hit })),
  validatedWindowStartYear: WINDOW_LO,
  validatedWindowEndYear: WINDOW_HI,
  sampleCounts: { bondIrd: rBond.n, gisp2: rGisp.n },
  inputs: buildInputsBlock('node tools/verify/lod-climate-correlation.js --write', INPUT_FILES),
};

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`\n  ✓ wrote ${path.relative(ROOT, OUT)}`);
} else {
  console.log('\n  dry run — pass --write to update the artifact');
}
