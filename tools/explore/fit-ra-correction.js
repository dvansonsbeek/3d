#!/usr/bin/env node
// Analyze RA errors — can we apply a similar correction?
// Model: dRA = A + B/d + (C*sin(u) + D*cos(u) + E*sin(2u) + F*cos(2u))/d

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../config/reference-data.json');
const d2r = Math.PI / 180;

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
    const modelRA = sg.thetaToRaDeg(result.ra);
    let refRA = parseFloat(pt.ra);
    if (typeof pt.ra === 'string' && !pt.ra.includes('°')) refRA *= 15;
    let refDec = parseFloat(pt.dec);
    const ofDate = j2000ToOfDate(refRA, refDec, pt.jd);
    refRA = ofDate.ra;
    let dRA = modelRA - refRA;
    if (dRA > 180) dRA -= 360;
    if (dRA < -180) dRA += 360;
    const dd = result.distAU;
    const u = (modelRA - ascNode) * d2r;
    data.push({ dRA, d: dd, u });
  }

  const n = data.length;
  let origRMS = 0;
  for (const pt of data) origRMS += pt.dRA ** 2;
  origRMS = Math.sqrt(origRMS / n);

  // Model 2: A + (Bs+Cc)/d  (3 params)
  const fit2 = linearFitRMS(data, pt => [1, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d]);

  // Model 5: A + B/d + (Cs+Dc+Es2+Fc2)/d  (6 params)
  const fit5 = linearFitRMS(data, pt => [1, 1/pt.d, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
    Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d]);

  // Model with time dependence: A + B*t + (Cs+Dc)/d  where t = years since J2000
  const fit_t = linearFitRMS(data, pt => {
    // Approximate year from JD
    return [1, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d, Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d];
  });

  console.log(`${target.padEnd(10)} n=${String(n).padStart(3)}  origRA=${origRMS.toFixed(3)}°`);
  console.log(`  Model 2: A+(Bs+Cc)/d            3p  RMS=${fit2.rms.toFixed(3)}  impr=${((1-fit2.rms/origRMS)*100).toFixed(0)}%`);
  console.log(`  Model 5: A+B/d+(Cs+Dc+Es2+Fc2)/d 6p RMS=${fit5.rms.toFixed(3)}  impr=${((1-fit5.rms/origRMS)*100).toFixed(0)}%`);
  if (fit5.rms < origRMS * 0.9) {
    console.log(`  Coefficients: A=${fmt(fit5.beta[0])} B=${fmt(fit5.beta[1])} C=${fmt(fit5.beta[2])} D=${fmt(fit5.beta[3])} E=${fmt(fit5.beta[4])} F=${fmt(fit5.beta[5])}`);
  }
}

function fmt(v) { return (v >= 0 ? ' ' : '') + v.toFixed(4); }

function linearFitRMS(data, basisFn) {
  const n = data.length;
  const m = basisFn(data[0]).length;
  const X = [], y = [];
  for (const pt of data) { X.push(basisFn(pt)); y.push(pt.dRA); }
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
