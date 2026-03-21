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
const refData = require('../../data/reference-data.json');
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
    // Extended terms (25-30) found by greedy forward selection round 1
    1/(pt.d*pt.sunDist),            // Z: 1/(d*s)
    Math.sin(pt.u)/(pt.d*pt.sunDist), // AA: sin(u)/(d*s)
    Math.cos(2*pt.u)/(pt.d*pt.sunDist), // AB: cos(2u)/(d*s)
    T*Math.sin(2*pt.u)/pt.sunDist,  // AC: T*sin(2u)/s
    Math.cos(3*pt.u)/(pt.d*pt.d),   // AD: cos(3u)/d²
    Math.sin(2*pt.u)/(pt.sunDist*pt.sunDist), // AE: sin(2u)/s²
    // Extended terms (31-36) found by greedy forward selection round 2
    Math.sin(3*pt.u)/(pt.sunDist*pt.sunDist), // AF: sin(3u)/s²
    Math.cos(3*pt.u)/(pt.sunDist*pt.sunDist), // AG: cos(3u)/s²
    Math.cos(pt.u)/(pt.sunDist*pt.sunDist),   // AH: cos(u)/s²
    Math.sin(pt.u)/(pt.d*pt.d*pt.sunDist),    // AI: sin(u)/(d²*s)
    Math.cos(4*pt.u)/pt.sunDist,               // AJ: cos(4u)/s
    Math.sin(2*pt.u)/(pt.d*pt.d*pt.sunDist),  // AK: sin(2u)/(d²*s)
    // Extended terms (37-42) targeting inferior conjunction geometry
    Math.sin(4*pt.u)/pt.d,                     // AL: sin(4u)/d — 4th harmonic geocentric
    Math.cos(4*pt.u)/pt.d,                     // AM: cos(4u)/d — 4th harmonic geocentric
    T*Math.sin(pt.u)/(pt.d*pt.d),              // AN: T*sin(u)/d² — time-modulated close approach
    T*Math.cos(pt.u)/(pt.d*pt.d),              // AO: T*cos(u)/d² — time-modulated close approach
    Math.sin(pt.u)/(pt.d*pt.d*pt.d),           // AP: sin(u)/d³ — cubic close approach
    Math.cos(pt.u)/(pt.d*pt.d*pt.d),           // AQ: cos(u)/d³ — cubic close approach
    // Extended terms (43-48) — conjunction-period terms for Jupiter-Saturn interaction
    // Triple synodic period ~59.53yr captures the geocentric parallax modulation
    // from Earth viewing Jupiter-Saturn conjunctions at different orbital phases.
    // Uses effective synodic period (includes perihelion precession at H/5 and -H/8).
    Math.sin(pt.conjPhase),                     // AR: sin(conjunction phase)
    Math.cos(pt.conjPhase),                     // AS: cos(conjunction phase)
    Math.sin(2*pt.conjPhase),                   // AT: sin(2× conjunction phase)
    Math.cos(2*pt.conjPhase),                   // AU_: cos(2× conjunction phase)
    Math.sin(pt.conjPhase)/pt.d,                // AV: sin(conj phase)/d
    Math.cos(pt.conjPhase)/pt.d,                // AW: cos(conj phase)/d
  ];
};

const allLabels = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT','AU_','AV','AW'];

// Tier sizes: 15, 18, 24, 30, 36, 42, 48
const tiers = [
  { name: '15p', count: 15 },
  { name: '18p', count: 18 },
  { name: '24p', count: 24 },
  { name: '30p', count: 30 },
  { name: '36p', count: 36 },
  { name: '42p', count: 42 },
  { name: '48p', count: 48 },
];

console.log('Extended correction coefficients with multi-tier CV selection\n');

const allDecCorrections = {};
const allRaCorrections = {};

// Triple-synodic period for conjunction-phase basis functions
// Uses exact orbital periods from integer orbit counts: H / round(totalDays/solarYearInput)
const _Tj = C.H / Math.round(C.totalDaysInH / C.planets.jupiter.solarYearInput);
const _Ts = C.H / Math.round(C.totalDaysInH / C.planets.saturn.solarYearInput);
const _nJ_eff = 360.0 / _Tj + 360.0 / C.planets.jupiter.perihelionEclipticYears;
const _nS_eff = 360.0 / _Ts + 360.0 / C.planets.saturn.perihelionEclipticYears;
const tripleSynodicYears = 3 * 360.0 / (_nJ_eff - _nS_eff);
console.log(`Conjunction basis: triple synodic = ${tripleSynodicYears.toFixed(4)} yr\n`);

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
    const conjPhase = 2 * Math.PI * (year - 2000) / tripleSynodicYears;
    data.push({ dRA, dDec, d: dd, u, year, sunDist: result.sunDistAU, conjPhase });
  }

  const n = data.length;
  let origRmsRA = 0, origRmsDec = 0;
  for (const pt of data) { origRmsRA += pt.dRA**2; origRmsDec += pt.dDec**2; }
  origRmsRA = Math.sqrt(origRmsRA / n);
  origRmsDec = Math.sqrt(origRmsDec / n);
  const origTot = Math.sqrt(origRmsRA**2 + origRmsDec**2);

  // Test each tier
  const useKFold = n > 200;
  const cvFn = useKFold ? kfoldCV : loocv;
  const cvLabel = useKFold ? '10-fold CV' : 'LOOCV';
  let bestTier = null, bestCV = Infinity;
  const tierResults = [];
  for (const tier of tiers) {
    if (tier.count > n) continue;  // skip tiers with more params than data
    const basis = (pt) => basisFn(pt).slice(0, tier.count);
    const decR = linearFit(data, basis, pt => pt.dDec);
    const raR = linearFit(data, basis, pt => pt.dRA);
    const fit = Math.sqrt(raR.rms**2 + decR.rms**2);
    const cv = cvFn(data, basis, pt => pt.dDec, pt => pt.dRA);
    tierResults.push({ tier, fit, cv: cv.total, decBeta: decR.beta, raBeta: raR.beta });
    if (cv.total < bestCV) { bestCV = cv.total; bestTier = tierResults[tierResults.length - 1]; }
  }

  console.log(`${target.toUpperCase()} (n=${n}, ${cvLabel})  orig: Tot=${origTot.toFixed(4)}`);
  for (const tr of tierResults) {
    const marker = tr === bestTier ? ' <-- BEST' : '';
    console.log(`  ${tr.tier.name}: fit=${tr.fit.toFixed(4)} CV=${tr.cv.toFixed(4)}${marker}`);
  }

  const usedLabels = allLabels.slice(0, bestTier.tier.count);
  const fmtCoeffs = (beta) => usedLabels.map((l, i) => `${l}:${fmt(beta[i])}`).join(', ');
  console.log(`  dec: { ${fmtCoeffs(bestTier.decBeta)} },`);
  console.log(`  ra:  { ${fmtCoeffs(bestTier.raBeta)} },`);
  console.log('');

  // Collect for JSON output
  const decObj = {}, raObj = {};
  usedLabels.forEach((l, i) => { decObj[l] = parseFloat(bestTier.decBeta[i].toFixed(4)); });
  usedLabels.forEach((l, i) => { raObj[l] = parseFloat(bestTier.raBeta[i].toFixed(4)); });
  allDecCorrections[target] = decObj;
  allRaCorrections[target] = raObj;
}

C.ASTRO_REFERENCE.decCorrection = savedDec;
C.ASTRO_REFERENCE.raCorrection = savedRA;

// ─── Write to fitted-coefficients.json if --write flag is present ────
if (process.argv.includes('--write')) {
  const jsonPath = require('path').resolve(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
  const fc = JSON.parse(require('fs').readFileSync(jsonPath, 'utf8'));
  fc.PARALLAX_DEC_CORRECTION = allDecCorrections;
  fc.PARALLAX_RA_CORRECTION = allRaCorrections;
  require('fs').writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
  console.log('✓ Written PARALLAX_DEC_CORRECTION and PARALLAX_RA_CORRECTION to fitted-coefficients.json');
} else {
  console.log('  (dry run — add --write to update fitted-coefficients.json)');
}

function kfoldCV(data, basisFn, decFn, raFn) {
  const n = data.length;
  const K = 10;
  const indices = Array.from({length: n}, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 7919 + 104729) % (i + 1);
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
