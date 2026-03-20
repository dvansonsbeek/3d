#!/usr/bin/env node
// Fit Model 5 RA correction coefficients
// Same formula as Dec: A + B/d + (C*sin(u) + D*cos(u) + E*sin(2u) + F*cos(2u))/d

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../data/reference-data.json');
const d2r = Math.PI / 180;

// Disable existing RA correction to fit from raw errors
const savedRaCorr = C.ASTRO_REFERENCE.raCorrection ? { ...C.ASTRO_REFERENCE.raCorrection } : null;
if (C.ASTRO_REFERENCE.raCorrection) C.ASTRO_REFERENCE.raCorrection = {};
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

  // Fit Model 5
  const m = 6;
  const X = [], y = [];
  for (const pt of data) {
    X.push([1, 1/pt.d, Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
      Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d]);
    y.push(pt.dRA);
  }
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
  rms = Math.sqrt(rms / n);

  const [A, B, Cs, Dc, Es, Fc] = beta;
  const impr = ((1 - rms / origRMS) * 100).toFixed(0);
  console.log(`${target.padEnd(10)} n=${String(n).padStart(3)}  origRA=${origRMS.toFixed(3)}  corrRA=${rms.toFixed(3)}  impr=${impr}%`);
  console.log(`    ${target}: { A: ${fmt(A)}, B: ${fmt(B)}, C: ${fmt(Cs)}, D: ${fmt(Dc)}, E: ${fmt(Es)}, F: ${fmt(Fc)} },`);
}

if (savedRaCorr) C.ASTRO_REFERENCE.raCorrection = savedRaCorr;

function fmt(v) { return (v >= 0 ? ' ' : '') + v.toFixed(4); }

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
