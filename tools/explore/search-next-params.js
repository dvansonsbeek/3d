#!/usr/bin/env node
// Search for the next best basis functions beyond 18-param model
// Tests candidates one-at-a-time via leave-one-out cross-validation

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../config/reference-data.json');
const d2r = Math.PI / 180;

// Disable existing corrections
const savedDec = { ...C.ASTRO_REFERENCE.decCorrection };
const savedRA = C.ASTRO_REFERENCE.raCorrection ? { ...C.ASTRO_REFERENCE.raCorrection } : {};
C.ASTRO_REFERENCE.decCorrection = {};
C.ASTRO_REFERENCE.raCorrection = {};
sg._invalidateGraph();

const targets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

// Current 18-param basis
const baseBasis = (pt) => {
  const T = (pt.year - 2000) / 100;
  return [
    1, 1/pt.d, T,
    Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
    Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d,
    Math.sin(3*pt.u)/pt.d, Math.cos(3*pt.u)/pt.d,
    T*Math.sin(pt.u)/pt.d, T*Math.cos(pt.u)/pt.d,
    1/pt.sunDist,
    Math.sin(pt.u)/(pt.d*pt.d),
    Math.sin(2*pt.u)/pt.sunDist,
    Math.cos(pt.u)/pt.sunDist,
    T*Math.sin(2*pt.u)/pt.d,
    T*Math.cos(2*pt.u)/pt.d,
    T*Math.sin(pt.u)/pt.sunDist,
  ];
};

// Candidate extra basis functions
const candidates = [
  { name: 'T*cos(u)/s',       fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(pt.u)/pt.sunDist; }},
  { name: 'T*sin(2u)/s',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(2*pt.u)/pt.sunDist; }},
  { name: 'T*cos(2u)/s',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(2*pt.u)/pt.sunDist; }},
  { name: 'cos(u)/d²',        fn: pt => Math.cos(pt.u)/(pt.d*pt.d) },
  { name: 'sin(2u)/d²',       fn: pt => Math.sin(2*pt.u)/(pt.d*pt.d) },
  { name: 'cos(2u)/d²',       fn: pt => Math.cos(2*pt.u)/(pt.d*pt.d) },
  { name: 'sin(3u)/d²',       fn: pt => Math.sin(3*pt.u)/(pt.d*pt.d) },
  { name: 'cos(3u)/d²',       fn: pt => Math.cos(3*pt.u)/(pt.d*pt.d) },
  { name: 'T²',               fn: pt => { const T=(pt.year-2000)/100; return T*T; }},
  { name: 'T²*sin(u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*T*Math.sin(pt.u)/pt.d; }},
  { name: 'T²*cos(u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*T*Math.cos(pt.u)/pt.d; }},
  { name: 'T*sin(3u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(3*pt.u)/pt.d; }},
  { name: 'T*cos(3u)/d',      fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(3*pt.u)/pt.d; }},
  { name: 'sin(4u)/d',        fn: pt => Math.sin(4*pt.u)/pt.d },
  { name: 'cos(4u)/d',        fn: pt => Math.cos(4*pt.u)/pt.d },
  { name: '1/d²',             fn: pt => 1/(pt.d*pt.d) },
  { name: '1/d³',             fn: pt => 1/(pt.d*pt.d*pt.d) },
  { name: '1/s²',             fn: pt => 1/(pt.sunDist*pt.sunDist) },
  { name: 'sin(u)/s²',        fn: pt => Math.sin(pt.u)/(pt.sunDist*pt.sunDist) },
  { name: 'cos(u)/s²',        fn: pt => Math.cos(pt.u)/(pt.sunDist*pt.sunDist) },
  { name: 'T/d',              fn: pt => { const T=(pt.year-2000)/100; return T/pt.d; }},
  { name: 'T/s',              fn: pt => { const T=(pt.year-2000)/100; return T/pt.sunDist; }},
  { name: 'sin(u)/(d*s)',     fn: pt => Math.sin(pt.u)/(pt.d*pt.sunDist) },
  { name: 'cos(u)/(d*s)',     fn: pt => Math.cos(pt.u)/(pt.d*pt.sunDist) },
  { name: 'sin(2u)/(d*s)',    fn: pt => Math.sin(2*pt.u)/(pt.d*pt.sunDist) },
  { name: 'cos(2u)/(d*s)',    fn: pt => Math.cos(2*pt.u)/(pt.d*pt.sunDist) },
  { name: 'sin(3u)/s',        fn: pt => Math.sin(3*pt.u)/pt.sunDist },
  { name: 'cos(3u)/s',        fn: pt => Math.cos(3*pt.u)/pt.sunDist },
  { name: 'T*sin(u)/d²',     fn: pt => { const T=(pt.year-2000)/100; return T*Math.sin(pt.u)/(pt.d*pt.d); }},
  { name: 'T*cos(u)/d²',     fn: pt => { const T=(pt.year-2000)/100; return T*Math.cos(pt.u)/(pt.d*pt.d); }},
];

for (const target of targets) {
  const allPoints = refData.planets[target] || [];
  const points = allPoints.filter(p => p.ra != null && p.dec != null && (p.weight || 0) > 0);
  if (points.length === 0) continue;
  const p = C.planets[target];
  const ascNode = p.ascendingNode;

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

  // Baseline 18-param CV
  const cv18 = loocv(data, baseBasis, pt => pt.dDec, pt => pt.dRA);

  // Test each candidate as 19th param
  const results = [];
  for (const cand of candidates) {
    const extBasis = (pt) => [...baseBasis(pt), cand.fn(pt)];
    const cv19 = loocv(data, extBasis, pt => pt.dDec, pt => pt.dRA);
    const improvement = (1 - cv19.total / cv18.total) * 100;
    results.push({ name: cand.name, cv: cv19.total, impr: improvement });
  }

  results.sort((a, b) => a.cv - b.cv);
  console.log(`\n${target.toUpperCase()} (n=${n})  18p CV=${cv18.total.toFixed(4)}`);
  console.log('  Top 5 candidates for 19th param:');
  for (let i = 0; i < 5; i++) {
    const r = results[i];
    const marker = r.impr > 1 ? ' *' : '';
    console.log(`    ${r.name.padEnd(20)} CV=${r.cv.toFixed(4)}  impr=${r.impr.toFixed(1)}%${marker}`);
  }
}

C.ASTRO_REFERENCE.decCorrection = savedDec;
C.ASTRO_REFERENCE.raCorrection = savedRA;

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
  const n = data.length;
  const m = basisFn(data[0]).length;
  const X = [], y = [];
  for (const pt of data) { X.push(basisFn(pt)); y.push(valueFn(pt)); }
  const XtX = Array.from({length: m}, () => new Float64Array(m));
  const Xty = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = j; k < m; k++) XtX[j][k] += X[i][j] * X[i][k];
    }
  }
  for (let j = 0; j < m; j++) for (let k = 0; k < j; k++) XtX[j][k] = XtX[k][j];
  const beta = solveLinear(XtX, Xty, m);
  let rms = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0; for (let j = 0; j < m; j++) pred += beta[j] * X[i][j];
    rms += (y[i] - pred) ** 2;
  }
  return { rms: Math.sqrt(rms / n), beta };
}

function solveLinear(A, b, n) {
  const a = A.map(row => [...row]); const x = [...b];
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(a[col][col]), maxRow = col;
    for (let row = col + 1; row < n; row++) { if (Math.abs(a[row][col]) > maxVal) { maxVal = Math.abs(a[row][col]); maxRow = row; } }
    [a[col], a[maxRow]] = [a[maxRow], a[col]]; [x[col], x[maxRow]] = [x[maxRow], x[col]];
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col];
      for (let k = col; k < n; k++) a[row][k] -= f * a[col][k]; x[row] -= f * x[col];
    }
  }
  const result = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let j = i + 1; j < n; j++) s -= a[i][j] * result[j]; result[i] = s / a[i][i]; }
  return result;
}
