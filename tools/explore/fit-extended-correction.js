#!/usr/bin/env node
// Fit extended RA/Dec correction: 3 harmonics + heliocentric distance terms
// Model: A + B/d + T*C + (D*sin + E*cos + F*sin2 + G*cos2 + H*sin3 + I*cos3)/d
//        + T*(J*sin + K*cos)/d + L/s + M*sin(u)/d² + N*sin(2u)/s + O*cos(u)/s
//        + P*T*sin(2u)/d + Q*T*cos(2u)/d + R*T*sin(u)/s
//        + S*T/d + U*cos(u)/d² + V*1/s² + W*sin(u)/s² + X*cos(3u)/s + Y*sin(3u)/s
// where T = (year - 2000) / 100, u = RA - ascendingNode, d = geocentric dist, s = sunDist

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../config/reference-data.json');
const d2r = Math.PI / 180;

// Disable existing corrections to fit from raw errors
const savedDec = { ...C.ASTRO_REFERENCE.decCorrection };
const savedRA = C.ASTRO_REFERENCE.raCorrection ? { ...C.ASTRO_REFERENCE.raCorrection } : {};
C.ASTRO_REFERENCE.decCorrection = {};
C.ASTRO_REFERENCE.raCorrection = {};
sg._invalidateGraph();

const targets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

const basisFn = (pt) => {
  const T = (pt.year - 2000) / 100;
  return [
    1,                            // A: constant
    1/pt.d,                       // B: 1/d bias
    T,                            // C: time drift
    Math.sin(pt.u)/pt.d,          // D: sin(u)/d
    Math.cos(pt.u)/pt.d,          // E: cos(u)/d
    Math.sin(2*pt.u)/pt.d,        // F: sin(2u)/d
    Math.cos(2*pt.u)/pt.d,        // G: cos(2u)/d
    Math.sin(3*pt.u)/pt.d,        // H: sin(3u)/d
    Math.cos(3*pt.u)/pt.d,        // I: cos(3u)/d
    T*Math.sin(pt.u)/pt.d,        // J: T*sin(u)/d
    T*Math.cos(pt.u)/pt.d,        // K: T*cos(u)/d
    1/pt.sunDist,                 // L: 1/sunDist
    Math.sin(pt.u)/(pt.d*pt.d),   // M: sin(u)/d²
    Math.sin(2*pt.u)/pt.sunDist,   // N: sin(2u)/sunDist
    Math.cos(pt.u)/pt.sunDist,     // O: cos(u)/sunDist
    T*Math.sin(2*pt.u)/pt.d,       // P: T*sin(2u)/d
    T*Math.cos(2*pt.u)/pt.d,       // Q: T*cos(2u)/d
    T*Math.sin(pt.u)/pt.sunDist,   // R: T*sin(u)/sunDist
    T/pt.d,                        // S: T/d
    Math.cos(pt.u)/(pt.d*pt.d),    // U: cos(u)/d²
    1/(pt.sunDist*pt.sunDist),     // V: 1/s²
    Math.sin(pt.u)/(pt.sunDist*pt.sunDist), // W: sin(u)/s²
    Math.cos(3*pt.u)/pt.sunDist,   // X: cos(3u)/s
    Math.sin(3*pt.u)/pt.sunDist,   // Y: sin(3u)/s
  ];
};

const allLabels = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','U','V','W','X','Y'];

// Tier sizes: 15, 18, 24
const tiers = [
  { name: '15p', count: 15 },
  { name: '18p', count: 18 },
  { name: '24p', count: 24 },
];

console.log('Extended correction coefficients with multi-tier CV selection\n');

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
    if (dRA > 180) dRA -= 360;
    if (dRA < -180) dRA += 360;
    const dDec = modelDec - refDec;
    const year = C.jdToYear(pt.jd);
    const dd = result.distAU;
    const u = (modelRA - ascNode) * d2r;
    data.push({ dRA, dDec, d: dd, u, year, sunDist: result.sunDistAU });
  }

  const n = data.length;
  let origRmsRA = 0, origRmsDec = 0;
  for (const pt of data) { origRmsRA += pt.dRA**2; origRmsDec += pt.dDec**2; }
  origRmsRA = Math.sqrt(origRmsRA / n);
  origRmsDec = Math.sqrt(origRmsDec / n);
  const origTot = Math.sqrt(origRmsRA**2 + origRmsDec**2);

  // Test each tier
  let bestTier = null, bestCV = Infinity;
  const tierResults = [];
  for (const tier of tiers) {
    const basis = (pt) => basisFn(pt).slice(0, tier.count);
    const decR = linearFit(data, basis, pt => pt.dDec);
    const raR = linearFit(data, basis, pt => pt.dRA);
    const fit = Math.sqrt(raR.rms**2 + decR.rms**2);
    const cv = loocv(data, basis, pt => pt.dDec, pt => pt.dRA);
    tierResults.push({ tier, fit, cv: cv.total, decBeta: decR.beta, raBeta: raR.beta });
    if (cv.total < bestCV) { bestCV = cv.total; bestTier = tierResults[tierResults.length - 1]; }
  }

  console.log(`${target.toUpperCase()} (n=${n})  orig: Tot=${origTot.toFixed(4)}`);
  for (const tr of tierResults) {
    const marker = tr === bestTier ? ' <-- BEST' : '';
    console.log(`  ${tr.tier.name}: fit=${tr.fit.toFixed(4)} CV=${tr.cv.toFixed(4)}${marker}`);
  }

  const usedLabels = allLabels.slice(0, bestTier.tier.count);
  const fmtCoeffs = (beta) => usedLabels.map((l, i) => `${l}:${fmt(beta[i])}`).join(', ');
  console.log(`  dec: { ${fmtCoeffs(bestTier.decBeta)} },`);
  console.log(`  ra:  { ${fmtCoeffs(bestTier.raBeta)} },`);
  console.log('');
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
    for (let j = 0; j < xi.length; j++) {
      predDec += decFit.beta[j] * xi[j];
      predRA += raFit.beta[j] * xi[j];
    }
    ssDec += (decFn(data[i]) - predDec) ** 2;
    ssRA += (raFn(data[i]) - predRA) ** 2;
  }
  return { dec: Math.sqrt(ssDec/n), ra: Math.sqrt(ssRA/n), total: Math.sqrt((ssDec+ssRA)/n) };
}

function fmt(v) { return (v >= 0 ? ' ' : '') + v.toFixed(4); }

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
  for (let j = 0; j < m; j++)
    for (let k = 0; k < j; k++) XtX[j][k] = XtX[k][j];
  const beta = solveLinear(XtX, Xty, m);
  let rms = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let j = 0; j < m; j++) pred += beta[j] * X[i][j];
    rms += (y[i] - pred) ** 2;
  }
  return { rms: Math.sqrt(rms / n), beta };
}

function solveLinear(A, b, n) {
  const a = A.map(row => [...row]);
  const x = [...b];
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(a[col][col]), maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > maxVal) { maxVal = Math.abs(a[row][col]); maxRow = row; }
    }
    [a[col], a[maxRow]] = [a[maxRow], a[col]];
    [x[col], x[maxRow]] = [x[maxRow], x[col]];
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col];
      for (let k = col; k < n; k++) a[row][k] -= f * a[col][k];
      x[row] -= f * x[col];
    }
  }
  const result = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    for (let j = i + 1; j < n; j++) s -= a[i][j] * result[j];
    result[i] = s / a[i][i];
  }
  return result;
}
