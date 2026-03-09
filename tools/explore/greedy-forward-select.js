#!/usr/bin/env node
// Greedy forward selection: find best 31st–40th params per planet
// Uses 10-fold CV for large datasets (>200 points) instead of LOOCV
// Base: current 30p basis (24p + 6 terms from previous round)

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../config/reference-data.json');
const d2r = Math.PI / 180;

const savedDec = { ...C.ASTRO_REFERENCE.decCorrection };
const savedRA = C.ASTRO_REFERENCE.raCorrection ? { ...C.ASTRO_REFERENCE.raCorrection } : {};
C.ASTRO_REFERENCE.decCorrection = {};
C.ASTRO_REFERENCE.raCorrection = {};
sg._invalidateGraph();

const targets = ['venus','mercury','mars','jupiter','saturn'];

const candidateDefs = [
  // Higher-order distance terms (1/d³) — key for Venus close-approach errors
  { name: '1/d³',            fn: pt => 1/(pt.d*pt.d*pt.d) },
  { name: 'sin(u)/d³',       fn: pt => Math.sin(pt.u)/(pt.d*pt.d*pt.d) },
  { name: 'cos(u)/d³',       fn: pt => Math.cos(pt.u)/(pt.d*pt.d*pt.d) },
  { name: 'sin(2u)/d³',      fn: pt => Math.sin(2*pt.u)/(pt.d*pt.d*pt.d) },
  { name: 'cos(2u)/d³',      fn: pt => Math.cos(2*pt.u)/(pt.d*pt.d*pt.d) },
  { name: 'sin(3u)/d³',      fn: pt => Math.sin(3*pt.u)/(pt.d*pt.d*pt.d) },
  { name: 'cos(3u)/d³',      fn: pt => Math.cos(3*pt.u)/(pt.d*pt.d*pt.d) },
  // Cross terms 1/(d²*s)
  { name: '1/(d²*s)',         fn: pt => 1/(pt.d*pt.d*pt.sunDist) },
  { name: 'sin(u)/(d²*s)',    fn: pt => Math.sin(pt.u)/(pt.d*pt.d*pt.sunDist) },
  { name: 'cos(u)/(d²*s)',    fn: pt => Math.cos(pt.u)/(pt.d*pt.d*pt.sunDist) },
  { name: 'sin(2u)/(d²*s)',   fn: pt => Math.sin(2*pt.u)/(pt.d*pt.d*pt.sunDist) },
  { name: 'cos(2u)/(d²*s)',   fn: pt => Math.cos(2*pt.u)/(pt.d*pt.d*pt.sunDist) },
  // Higher harmonics
  { name: 'sin(4u)/d',        fn: pt => Math.sin(4*pt.u)/pt.d },
  { name: 'cos(4u)/d',        fn: pt => Math.cos(4*pt.u)/pt.d },
  { name: 'sin(4u)/d²',       fn: pt => Math.sin(4*pt.u)/(pt.d*pt.d) },
  { name: 'cos(4u)/d²',       fn: pt => Math.cos(4*pt.u)/(pt.d*pt.d) },
  { name: 'sin(5u)/d',        fn: pt => Math.sin(5*pt.u)/pt.d },
  { name: 'cos(5u)/d',        fn: pt => Math.cos(5*pt.u)/pt.d },
  { name: 'sin(4u)/s',        fn: pt => Math.sin(4*pt.u)/pt.sunDist },
  { name: 'cos(4u)/s',        fn: pt => Math.cos(4*pt.u)/pt.sunDist },
  // Time-distance cross terms
  { name: 'T*sin(u)/d²',     fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(pt.u)/(pt.d*pt.d); }},
  { name: 'T*cos(u)/d²',     fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(pt.u)/(pt.d*pt.d); }},
  { name: 'T*sin(2u)/d²',    fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(2*pt.u)/(pt.d*pt.d); }},
  { name: 'T*cos(2u)/d²',    fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(2*pt.u)/(pt.d*pt.d); }},
  { name: 'T²',               fn: pt => { const T=(pt.year-2000)/100; return T*T; }},
  { name: 'T²*sin(u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*T*Math.sin(pt.u)/pt.d; }},
  { name: 'T²*cos(u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*T*Math.cos(pt.u)/pt.d; }},
  { name: 'T²/d',             fn: pt => { const T=(pt.year-2000)/100; return T*T/pt.d; }},
  { name: 'T*cos(u)/s',       fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(pt.u)/pt.sunDist; }},
  { name: 'T*cos(2u)/s',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(2*pt.u)/pt.sunDist; }},
  { name: 'T*sin(3u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(3*pt.u)/pt.d; }},
  { name: 'T*cos(3u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(3*pt.u)/pt.d; }},
  { name: 'sin(2u)/d²',       fn: pt => Math.sin(2*pt.u)/(pt.d*pt.d) },
  { name: 'cos(2u)/d²',       fn: pt => Math.cos(2*pt.u)/(pt.d*pt.d) },
  { name: 'sin(3u)/d²',       fn: pt => Math.sin(3*pt.u)/(pt.d*pt.d) },
  { name: 'cos(u)/(d*s)',     fn: pt => Math.cos(pt.u)/(pt.d*pt.sunDist) },
  { name: 'sin(2u)/(d*s)',    fn: pt => Math.sin(2*pt.u)/(pt.d*pt.sunDist) },
  { name: 'cos(2u)/s²',       fn: pt => Math.cos(2*pt.u)/(pt.sunDist*pt.sunDist) },
  { name: 'cos(u)/s²',        fn: pt => Math.cos(pt.u)/(pt.sunDist*pt.sunDist) },
  { name: 'sin(3u)/s²',       fn: pt => Math.sin(3*pt.u)/(pt.sunDist*pt.sunDist) },
  { name: 'cos(3u)/s²',       fn: pt => Math.cos(3*pt.u)/(pt.sunDist*pt.sunDist) },
];

// Base 30-param basis (24p + 6 from previous greedy round)
const base30 = (pt) => {
  const T = (pt.year - 2000) / 100;
  const d = pt.d, s = pt.sunDist;
  const invD = 1/d, invS = 1/s, invD2 = invD*invD, invS2 = invS*invS;
  const invDS = invD * invS;
  const sinU = Math.sin(pt.u), cosU = Math.cos(pt.u);
  const sin2U = Math.sin(2*pt.u), cos2U = Math.cos(2*pt.u);
  const sin3U = Math.sin(3*pt.u), cos3U = Math.cos(3*pt.u);
  return [
    1, invD, T,
    sinU*invD, cosU*invD,
    sin2U*invD, cos2U*invD,
    sin3U*invD, cos3U*invD,
    T*sinU*invD, T*cosU*invD,
    invS,
    sinU*invD2,
    sin2U*invS,
    cosU*invS,
    T*sin2U*invD,
    T*cos2U*invD,
    T*sinU*invS,
    T*invD,
    cosU*invD2,
    invS2,
    sinU*invS2,
    cos3U*invS,
    sin3U*invS,
    // 6 terms from previous greedy round
    invDS,              // Z: 1/(d*s)
    sinU*invDS,         // AA: sin(u)/(d*s)
    cos2U*invDS,        // AB: cos(2u)/(d*s)
    T*sin2U*invS,       // AC: T*sin(2u)/s
    cos3U*invD2,        // AD: cos(3u)/d²
    sin2U*invS2,        // AE: sin(2u)/s²
  ];
};

const validCandidates = candidateDefs;

for (const target of targets) {
  const allPoints = refData.planets[target] || [];
  const points = allPoints.filter(p => p.ra != null && p.dec != null && (p.weight || 0) > 0);
  if (points.length === 0) continue;
  const ascNode = C.planets[target].ascendingNode;

  const data = [];
  for (const pt of points) {
    const result = computePlanetPosition(target, pt.jd);
    const modelRA = sg.thetaToRaDeg(result.ra);
    const modelDec = sg.phiToDecDeg(result.dec);
    let refRA = parseFloat(pt.ra);
    if (typeof pt.ra === 'string' && !pt.ra.includes('°')) refRA *= 15;
    let refDec = parseFloat(pt.dec);
    const ofDate = j2000ToOfDate(refRA, refDec, pt.jd);
    refRA = ofDate.ra; refDec = ofDate.dec;
    let dRA = modelRA - refRA;
    if (dRA > 180) dRA -= 360; if (dRA < -180) dRA += 360;
    data.push({ dRA, dDec: modelDec - refDec, d: result.distAU, u: (modelRA - ascNode) * d2r, year: C.jdToYear(pt.jd), sunDist: result.sunDistAU });
  }

  const n = data.length;
  const useKFold = n > 200;
  const K_FOLDS = 10;
  const cvFn = useKFold ? kfoldCV : loocv;
  const cvLabel = useKFold ? `${K_FOLDS}-fold CV` : 'LOOCV';

  const baseCV = cvFn(data, base30, pt => pt.dDec, pt => pt.dRA);
  console.log(`\n${target.toUpperCase()} (n=${n}, ${cvLabel})  30p CV=${baseCV.total.toFixed(4)}`);

  // Greedy forward: find best 31st–40th
  let selected = [];
  let currentCV = baseCV.total;

  for (let round = 0; round < 10; round++) {
    let bestIdx = -1, bestCVVal = currentCV;
    for (let ci = 0; ci < validCandidates.length; ci++) {
      if (selected.includes(ci)) continue;
      const extras = [...selected, ci];
      const testBasis = (pt) => {
        const b = base30(pt);
        for (const idx of extras) b.push(validCandidates[idx].fn(pt));
        return b;
      };
      const cv = cvFn(data, testBasis, pt => pt.dDec, pt => pt.dRA);
      if (cv.total < bestCVVal) { bestCVVal = cv.total; bestIdx = ci; }
    }
    if (bestIdx >= 0 && bestCVVal < currentCV * 0.999) {  // require 0.1% improvement
      selected.push(bestIdx);
      const impr = (1 - bestCVVal / currentCV) * 100;
      console.log(`  +${validCandidates[bestIdx].name.padEnd(22)} CV=${bestCVVal.toFixed(4)} (${impr.toFixed(1)}% improvement)`);
      currentCV = bestCVVal;
    } else {
      console.log(`  No further improvement found`);
      break;
    }
  }

  if (selected.length > 0) {
    console.log(`  Total: 30p CV=${baseCV.total.toFixed(4)} → ${(30+selected.length)}p CV=${currentCV.toFixed(4)} (${((1-currentCV/baseCV.total)*100).toFixed(1)}% total improvement)`);
  }
}

C.ASTRO_REFERENCE.decCorrection = savedDec;
C.ASTRO_REFERENCE.raCorrection = savedRA;

function kfoldCV(data, basisFn, decFn, raFn) {
  const n = data.length;
  const K = 10;
  // Shuffle indices deterministically
  const indices = Array.from({length: n}, (_, i) => i);
  // Simple deterministic shuffle based on index
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 7919 + 104729) % (i + 1);  // deterministic pseudo-random
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const foldSize = Math.ceil(n / K);
  let ssDec = 0, ssRA = 0, total = 0;
  for (let fold = 0; fold < K; fold++) {
    const testStart = fold * foldSize;
    const testEnd = Math.min(testStart + foldSize, n);
    const testIndices = new Set(indices.slice(testStart, testEnd));
    const train = data.filter((_, i) => !testIndices.has(i));
    const decFit = linearFit(train, basisFn, decFn);
    const raFit = linearFit(train, basisFn, raFn);
    for (const ti of testIndices) {
      const xi = basisFn(data[ti]);
      let predDec = 0, predRA = 0;
      for (let j = 0; j < xi.length; j++) { predDec += decFit.beta[j] * xi[j]; predRA += raFit.beta[j] * xi[j]; }
      ssDec += (decFn(data[ti]) - predDec) ** 2;
      ssRA += (raFn(data[ti]) - predRA) ** 2;
      total++;
    }
  }
  return { dec: Math.sqrt(ssDec/total), ra: Math.sqrt(ssRA/total), total: Math.sqrt((ssDec+ssRA)/total) };
}

function loocv(data, basisFn, decFn, raFn) {
  const n = data.length;
  let ssDec = 0, ssRA = 0;
  for (let i = 0; i < n; i++) {
    const train = data.filter((_, j) => j !== i);
    const decFit = linearFit(train, basisFn, decFn);
    const raFit = linearFit(train, basisFn, raFn);
    const xi = basisFn(data[i]);
    let predDec = 0, predRA = 0;
    for (let j = 0; j < xi.length; j++) { predDec += decFit.beta[j] * xi[j]; predRA += raFit.beta[j] * xi[j]; }
    ssDec += (decFn(data[i]) - predDec) ** 2;
    ssRA += (raFn(data[i]) - predRA) ** 2;
  }
  return { dec: Math.sqrt(ssDec/n), ra: Math.sqrt(ssRA/n), total: Math.sqrt((ssDec+ssRA)/n) };
}

function linearFit(data, basisFn, valueFn) {
  const n = data.length; const m = basisFn(data[0]).length;
  const X = [], y = [];
  for (const pt of data) { X.push(basisFn(pt)); y.push(valueFn(pt)); }
  const XtX = Array.from({length: m}, () => new Float64Array(m));
  const Xty = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) { Xty[j] += X[i][j] * y[i]; for (let k = j; k < m; k++) XtX[j][k] += X[i][j] * X[i][k]; }
  }
  for (let j = 0; j < m; j++) for (let k = 0; k < j; k++) XtX[j][k] = XtX[k][j];
  const beta = solveLinear(XtX, Xty, m);
  let rms = 0;
  for (let i = 0; i < n; i++) { let pred = 0; for (let j = 0; j < m; j++) pred += beta[j] * X[i][j]; rms += (y[i] - pred) ** 2; }
  return { rms: Math.sqrt(rms / n), beta };
}

function solveLinear(A, b, n) {
  const a = A.map(row => [...row]); const x = [...b];
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(a[col][col]), maxRow = col;
    for (let row = col + 1; row < n; row++) { if (Math.abs(a[row][col]) > maxVal) { maxVal = Math.abs(a[row][col]); maxRow = row; } }
    [a[col], a[maxRow]] = [a[maxRow], a[col]]; [x[col], x[maxRow]] = [x[maxRow], x[col]];
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col]; for (let k = col; k < n; k++) a[row][k] -= f * a[col][k]; x[row] -= f * x[col];
    }
  }
  const result = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j < n; j++) s -= a[i][j] * result[j]; result[i] = s / a[i][i]; }
  return result;
}
