#!/usr/bin/env node
// Test multi-term Dec correction models
// Compare: 1-term (current), 2-harmonic, sin+cos decomposition, 1/d² terms

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../data/reference-data.json');
const d2r = Math.PI / 180;

// Temporarily disable existing Dec correction to fit from scratch
const savedDecCorr = { ...C.ASTRO_REFERENCE.decCorrection };
C.ASTRO_REFERENCE.decCorrection = {};
sg._invalidateGraph();

const targets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

for (const target of targets) {
  const allPoints = refData.planets[target] || [];
  const points = allPoints.filter(p => p.ra != null && p.dec != null && (p.weight || 0) > 0);
  if (points.length === 0) continue;
  const p = C.planets[target];
  const ascNode = p.ascendingNode;

  const data = [];
  for (const pt of points) {
    const result = computePlanetPosition(target, pt.jd);
    const modelDec = sg.phiToDecDeg(result.dec);
    let refRA = parseFloat(pt.ra);
    if (typeof pt.ra === 'string' && !pt.ra.includes('°')) refRA *= 15;
    let refDec = parseFloat(pt.dec);
    const ofDate = j2000ToOfDate(refRA, refDec, pt.jd);
    refDec = ofDate.dec;
    const dDec = modelDec - refDec;
    const dd = result.distAU;
    const eclLon = sg.thetaToRaDeg(result.ra);
    const u = (eclLon - ascNode) * d2r;
    data.push({ dDec, d: dd, u });
  }

  const n = data.length;
  let origRMS = 0;
  for (const pt of data) origRMS += pt.dDec ** 2;
  origRMS = Math.sqrt(origRMS / n);

  // Model 1: Current — A + B*sin(u-φ)/d  (3 params, grid search on φ)
  let best1 = fitSinPhase(data, 1);

  // Model 2: sin+cos decomposition — A + (B*sin(u) + C*cos(u))/d  (3 params, linear)
  let fit2 = linearFit(data, pt => [1, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d]);

  // Model 3: Add 2nd harmonic — A + (B*sin + C*cos + D*sin2 + E*cos2)/d  (5 params)
  let fit3 = linearFit(data, pt => [1, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
    Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d]);

  // Model 4: Add 1/d term — A + B/d + (C*sin + D*cos)/d  (4 params)
  let fit4 = linearFit(data, pt => [1, 1/pt.d, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d]);

  // Model 5: Full — A + B/d + (C*sin + D*cos + E*sin2 + F*cos2)/d  (6 params)
  let fit5 = linearFit(data, pt => [1, 1/pt.d, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
    Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d]);

  // Model 6: Add d-independent oscillation — A + B*sin(u-φ) + C*sin(u-ψ)/d  (needs grid)
  let fit6 = linearFit(data, pt => [1, Math.sin(pt.u), Math.cos(pt.u),
    Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d]);

  // Model 7: Kitchen sink — A + B/d + C*sin + D*cos + (E*sin + F*cos + G*sin2 + H*cos2)/d
  let fit7 = linearFit(data, pt => [1, 1/pt.d, Math.sin(pt.u), Math.cos(pt.u),
    Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d, Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d]);

  console.log(`\n${target.toUpperCase()} (n=${n}, origDec=${origRMS.toFixed(3)}°)`);
  console.log(`  Model 1: A+B*sin(u-φ)/d        3p  RMS=${best1.toFixed(3)}  impr=${((1-best1/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 2: A+(Bs+Cc)/d            3p  RMS=${fit2.toFixed(3)}  impr=${((1-fit2/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 3: A+(Bs+Cc+Ds2+Ec2)/d    5p  RMS=${fit3.toFixed(3)}  impr=${((1-fit3/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 4: A+B/d+(Cs+Dc)/d        4p  RMS=${fit4.toFixed(3)}  impr=${((1-fit4/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 5: A+B/d+(Cs+Dc+Es2+Fc2)/d 6p RMS=${fit5.toFixed(3)}  impr=${((1-fit5/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 6: A+Bs+Cc+(Ds+Ec)/d      5p  RMS=${fit6.toFixed(3)}  impr=${((1-fit6/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 7: full 8-param            8p  RMS=${fit7.toFixed(3)}  impr=${((1-fit7/origRMS)*100).toFixed(0)}%`);
}

// Restore
C.ASTRO_REFERENCE.decCorrection = savedDecCorr;

function fitSinPhase(data, harmonics) {
  const n = data.length;
  let bestRMS = 1e9;
  for (let phi = -180; phi < 180; phi += 0.5) {
    const phiR = phi * d2r;
    let sY=0, sS=0, sSS=0, sYS=0;
    for (const pt of data) {
      const s = Math.sin(pt.u - phiR) / pt.d;
      sY += pt.dDec; sS += s; sSS += s*s; sYS += pt.dDec*s;
    }
    const mY=sY/n, mS=sS/n;
    const denom = sSS/n - mS*mS;
    if (Math.abs(denom) < 1e-12) continue;
    const B = (sYS/n - mY*mS) / denom;
    const A = mY - B*mS;
    let rms = 0;
    for (const pt of data) {
      const pred = A + B * Math.sin(pt.u - phiR) / pt.d;
      rms += (pt.dDec - pred) ** 2;
    }
    rms = Math.sqrt(rms / n);
    if (rms < bestRMS) bestRMS = rms;
  }
  return bestRMS;
}

// General linear least squares fit, returns RMS
function linearFit(data, basisFn) {
  const n = data.length;
  const m = basisFn(data[0]).length;

  // Build X matrix and y vector
  const X = [];
  const y = [];
  for (const pt of data) {
    X.push(basisFn(pt));
    y.push(pt.dDec);
  }

  // Normal equations: (X^T X) β = X^T y
  const XtX = Array.from({length: m}, () => new Float64Array(m));
  const Xty = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = j; k < m; k++) {
        XtX[j][k] += X[i][j] * X[i][k];
      }
    }
  }
  // Symmetrize
  for (let j = 0; j < m; j++)
    for (let k = 0; k < j; k++)
      XtX[j][k] = XtX[k][j];

  // Solve via Cholesky or simple Gaussian elimination
  const beta = solveLinear(XtX, Xty, m);

  // Compute RMS
  let rms = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let j = 0; j < m; j++) pred += beta[j] * X[i][j];
    rms += (y[i] - pred) ** 2;
  }
  return Math.sqrt(rms / n);
}

function solveLinear(A, b, n) {
  // Gaussian elimination with partial pivoting
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
