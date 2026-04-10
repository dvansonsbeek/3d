#!/usr/bin/env node
// Deep diagnostic of remaining RA/Dec errors after parallax correction
// Analyzes: time trends, distance correlation, residual harmonics, outliers

const { computePlanetPosition } = require('../lib/scene-graph.js');
const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const { j2000ToOfDate } = require('../lib/precession.js');
const refData = require('../../data/reference-data.json');
const d2r = Math.PI / 180;

const targets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

for (const target of targets) {
  const allPoints = refData.planets[target] || [];
  const points = allPoints.filter(p => p.ra != null && p.dec != null && (p.weight || 0) > 0);
  if (points.length === 0) continue;
  const p = C.planets[target];

  const data = [];
  for (const pt of points) {
    const result = computePlanetPosition(target, pt.jd);
    const modelRA = sg.thetaToRaDeg(result.ra);
    const modelDec = sg.phiToDecDeg(result.dec);
    let refRA = parseFloat(pt.ra);
    if (typeof pt.ra === 'string' && !pt.ra.includes('°')) refRA *= 15;
    let refDec = parseFloat(pt.dec);
    const ofDate = j2000ToOfDate(refRA, refDec, pt.jd);
    refRA = ofDate.ra;
    refDec = ofDate.dec;
    let dRA = modelRA - refRA;
    if (dRA > 180) dRA -= 360;
    if (dRA < -180) dRA += 360;
    const dDec = modelDec - refDec;
    const year = C.jdToYear(pt.jd);
    const d = result.distAU;
    const u = (modelRA - p.ascendingNode) * d2r;
    data.push({ dRA, dDec, year, d, u, jd: pt.jd, label: pt.label || '' });
  }

  const n = data.length;
  let rmsRA = 0, rmsDec = 0, rmsTot = 0;
  for (const pt of data) {
    rmsRA += pt.dRA ** 2;
    rmsDec += pt.dDec ** 2;
    rmsTot += pt.dRA ** 2 + pt.dDec ** 2;
  }
  rmsRA = Math.sqrt(rmsRA / n);
  rmsDec = Math.sqrt(rmsDec / n);
  rmsTot = Math.sqrt(rmsTot / n);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${target.toUpperCase()}  (n=${n})  RMS: RA=${rmsRA.toFixed(3)}°  Dec=${rmsDec.toFixed(3)}°  Tot=${rmsTot.toFixed(3)}°`);
  console.log(`${'═'.repeat(70)}`);

  // 1. Time trend (linear regression on year)
  {
    let sx=0, sy=0, sxy=0, sx2=0;
    for (const pt of data) { sx += pt.year; sy += pt.dRA; sxy += pt.year*pt.dRA; sx2 += pt.year**2; }
    const mx = sx/n, my = sy/n;
    const slopeRA = (sxy/n - mx*my) / (sx2/n - mx**2);
    sy=0; sxy=0;
    for (const pt of data) { sy += pt.dDec; sxy += pt.year*pt.dDec; }
    const myD = sy/n;
    const slopeDec = (sxy/n - mx*myD) / (sx2/n - mx**2);
    const raRange = (data[data.length-1].year - data[0].year) * Math.abs(slopeRA);
    const decRange = (data[data.length-1].year - data[0].year) * Math.abs(slopeDec);
    console.log(`\n  Time trend (linear):`);
    console.log(`    RA:  slope=${(slopeRA*100).toFixed(3)}°/century  range=${raRange.toFixed(2)}° over data span`);
    console.log(`    Dec: slope=${(slopeDec*100).toFixed(3)}°/century  range=${decRange.toFixed(2)}° over data span`);
    if (raRange > rmsRA * 0.5) console.log(`    >>> RA has significant time drift!`);
    if (decRange > rmsDec * 0.5) console.log(`    >>> Dec has significant time drift!`);
  }

  // 2. Distance correlation
  {
    let sx=0, sy=0, sxy=0, sx2=0, sy2=0;
    for (const pt of data) {
      const x = 1/pt.d;
      sx += x; sy += Math.abs(pt.dRA); sxy += x*Math.abs(pt.dRA); sx2 += x**2; sy2 += Math.abs(pt.dRA)**2;
    }
    const mx = sx/n, my = sy/n;
    const cov = sxy/n - mx*my;
    const varx = sx2/n - mx**2;
    const vary = sy2/n - my**2;
    const corrRA = cov / Math.sqrt(varx * vary);

    sx=0; sy=0; sxy=0; sy2=0;
    for (const pt of data) {
      const x = 1/pt.d;
      sx += x; sy += Math.abs(pt.dDec); sxy += x*Math.abs(pt.dDec); sy2 += Math.abs(pt.dDec)**2;
    }
    const myD = sy/n;
    const covD = sxy/n - (sx/n)*myD;
    const varyD = sy2/n - myD**2;
    const corrDec = covD / Math.sqrt(varx * varyD);
    console.log(`\n  Distance correlation (|error| vs 1/d):`);
    console.log(`    RA:  r=${corrRA.toFixed(3)}   Dec: r=${corrDec.toFixed(3)}`);
    if (Math.abs(corrRA) > 0.3) console.log(`    >>> RA still has distance-dependent error (more 1/d terms may help)`);
    if (Math.abs(corrDec) > 0.3) console.log(`    >>> Dec still has distance-dependent error`);
  }

  // 3. Residual harmonics (check for 3rd, 4th harmonic in u)
  {
    console.log(`\n  Residual harmonic analysis (RA):`);
    for (let h = 1; h <= 4; h++) {
      let sumSin = 0, sumCos = 0;
      for (const pt of data) { sumSin += pt.dRA * Math.sin(h*pt.u); sumCos += pt.dRA * Math.cos(h*pt.u); }
      const ampSin = (2/n) * sumSin;
      const ampCos = (2/n) * sumCos;
      const amp = Math.sqrt(ampSin**2 + ampCos**2);
      const pct = (amp / rmsRA * 100).toFixed(0);
      console.log(`    harmonic ${h}: amplitude=${amp.toFixed(4)}°  (${pct}% of RMS)`);
    }
    console.log(`  Residual harmonic analysis (Dec):`);
    for (let h = 1; h <= 4; h++) {
      let sumSin = 0, sumCos = 0;
      for (const pt of data) { sumSin += pt.dDec * Math.sin(h*pt.u); sumCos += pt.dDec * Math.cos(h*pt.u); }
      const ampSin = (2/n) * sumSin;
      const ampCos = (2/n) * sumCos;
      const amp = Math.sqrt(ampSin**2 + ampCos**2);
      const pct = (amp / rmsDec * 100).toFixed(0);
      console.log(`    harmonic ${h}: amplitude=${amp.toFixed(4)}°  (${pct}% of RMS)`);
    }
  }

  // 4. Residual harmonics with 1/d weighting
  {
    console.log(`\n  Residual harmonics weighted by 1/d (RA):`);
    for (let h = 1; h <= 4; h++) {
      let sumSin = 0, sumCos = 0;
      for (const pt of data) { sumSin += pt.dRA * Math.sin(h*pt.u)/pt.d; sumCos += pt.dRA * Math.cos(h*pt.u)/pt.d; }
      const ampSin = (2/n) * sumSin;
      const ampCos = (2/n) * sumCos;
      const amp = Math.sqrt(ampSin**2 + ampCos**2);
      console.log(`    harmonic ${h}/d: amplitude=${amp.toFixed(4)}`);
    }
    console.log(`  Residual harmonics weighted by 1/d (Dec):`);
    for (let h = 1; h <= 4; h++) {
      let sumSin = 0, sumCos = 0;
      for (const pt of data) { sumSin += pt.dDec * Math.sin(h*pt.u)/pt.d; sumCos += pt.dDec * Math.cos(h*pt.u)/pt.d; }
      const ampSin = (2/n) * sumSin;
      const ampCos = (2/n) * sumCos;
      const amp = Math.sqrt(ampSin**2 + ampCos**2);
      console.log(`    harmonic ${h}/d: amplitude=${amp.toFixed(4)}`);
    }
  }

  // 5. Top 5 worst points
  {
    const sorted = [...data].sort((a, b) => (b.dRA**2 + b.dDec**2) - (a.dRA**2 + a.dDec**2));
    console.log(`\n  Top 5 worst points:`);
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const pt = sorted[i];
      const tot = Math.sqrt(pt.dRA**2 + pt.dDec**2);
      console.log(`    ${pt.year.toFixed(1)}  dRA=${pt.dRA.toFixed(2)}°  dDec=${pt.dDec.toFixed(2)}°  tot=${tot.toFixed(2)}°  d=${pt.d.toFixed(2)}AU  ${pt.label}`);
    }
  }

  // 6. Error by distance quartile
  {
    const byDist = [...data].sort((a, b) => a.d - b.d);
    const q = Math.floor(n / 4);
    console.log(`\n  Error by distance quartile:`);
    for (let qi = 0; qi < 4; qi++) {
      const slice = byDist.slice(qi * q, qi === 3 ? n : (qi+1) * q);
      let rra = 0, rdec = 0;
      for (const pt of slice) { rra += pt.dRA**2; rdec += pt.dDec**2; }
      rra = Math.sqrt(rra / slice.length);
      rdec = Math.sqrt(rdec / slice.length);
      const dMin = slice[0].d.toFixed(2);
      const dMax = slice[slice.length-1].d.toFixed(2);
      console.log(`    Q${qi+1} (d=${dMin}-${dMax} AU): RA=${rra.toFixed(3)}°  Dec=${rdec.toFixed(3)}°  Tot=${Math.sqrt(rra**2+rdec**2).toFixed(3)}°`);
    }
  }

  // 7. Try higher-order model to see theoretical floor
  {
    // Fit 12-param model: A + B/d + B2/d² + (sin/cos 1,2,3,4 harmonics)/d
    const basisFn = pt => [
      1, 1/pt.d, 1/(pt.d*pt.d),
      Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
      Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d,
      Math.sin(3*pt.u)/pt.d, Math.cos(3*pt.u)/pt.d,
      Math.sin(4*pt.u)/pt.d, Math.cos(4*pt.u)/pt.d,
    ];
    const rmsRA12 = linearFitRMS(data.map(pt => ({...pt, val: pt.dRA})), basisFn);
    const rmsDec12 = linearFitRMS(data.map(pt => ({...pt, val: pt.dDec})), basisFn);

    // Add time dependence: + T + T*sin(u)/d + T*cos(u)/d
    const basisFnT = pt => {
      const T = (pt.year - 2000) / 100;
      return [
        1, 1/pt.d, T,
        Math.sin(pt.u)/pt.d, Math.cos(pt.u)/pt.d,
        Math.sin(2*pt.u)/pt.d, Math.cos(2*pt.u)/pt.d,
        Math.sin(3*pt.u)/pt.d, Math.cos(3*pt.u)/pt.d,
        T*Math.sin(pt.u)/pt.d, T*Math.cos(pt.u)/pt.d,
      ];
    };
    const rmsRA_T = linearFitRMS(data.map(pt => ({...pt, val: pt.dRA})), basisFnT);
    const rmsDec_T = linearFitRMS(data.map(pt => ({...pt, val: pt.dDec})), basisFnT);

    console.log(`\n  Theoretical floor (higher-order fits):`);
    console.log(`    Current 6-param:        RA=${rmsRA.toFixed(3)}°  Dec=${rmsDec.toFixed(3)}°  Tot=${rmsTot.toFixed(3)}°`);
    console.log(`    11-param (4 harmonics): RA=${rmsRA12.toFixed(3)}°  Dec=${rmsDec12.toFixed(3)}°  Tot=${Math.sqrt(rmsRA12**2+rmsDec12**2).toFixed(3)}°`);
    console.log(`    11-param (3h + time):   RA=${rmsRA_T.toFixed(3)}°  Dec=${rmsDec_T.toFixed(3)}°  Tot=${Math.sqrt(rmsRA_T**2+rmsDec_T**2).toFixed(3)}°`);
  }
}

function linearFitRMS(data, basisFn) {
  const n = data.length;
  const m = basisFn(data[0]).length;
  const X = [], y = [];
  for (const pt of data) { X.push(basisFn(pt)); y.push(pt.val); }
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
  return Math.sqrt(rms / n);
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
