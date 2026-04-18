// ═══════════════════════════════════════════════════════════════════════════
// WebGeoCalc — Observed Perihelion Precession Rates (1900–2026)
//
// Uses only the trustworthy observational baseline (1900–2026 AD) and applies
// robust trend-extraction methods to separate the secular linear trend from
// short-period orbital perturbations. Reports both:
//   • Raw linear regression (affected by oscillations)
//   • Robust trend (median-filter smoothed)
//   • Deseasoned trend (best fit after removing dominant periodic component)
//
// Usage:
//   node tools/explore/wgc-perihelion-rates.js
//   node tools/explore/wgc-perihelion-rates.js --start 1900 --end 2026 --step 1
//
// ═══════════════════════════════════════════════════════════════════════════

const wgc = require('../lib/webgeocalc-client');

const PLANETS = ['MERCURY', 'VENUS', 'EARTH', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE'];

const WGC_NAME = {
  MERCURY: 'MERCURY',
  VENUS:   'VENUS',
  EARTH:   'EARTH',
  MARS:    'MARS BARYCENTER',
  JUPITER: 'JUPITER BARYCENTER',
  SATURN:  'SATURN BARYCENTER',
  URANUS:  'URANUS BARYCENTER',
  NEPTUNE: 'NEPTUNE BARYCENTER',
};

function args() {
  const out = { start: 1900, end: 2026, stepMonths: 1 };  // MONTHLY by default
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--start') out.start = parseInt(process.argv[++i]);
    else if (a === '--end') out.end = parseInt(process.argv[++i]);
    else if (a === '--step') out.stepMonths = parseInt(process.argv[++i]);
  }
  return out;
}

function generateTimes(startYr, endYr, stepMonths) {
  const times = [];
  let y = startYr, m = 1;
  while (y < endYr || (y === endYr && m === 1)) {
    times.push(`${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-01T12:00:00.000`);
    m += stepMonths;
    while (m > 12) { m -= 12; y++; }
  }
  return times;
}

function unwrap(angles) {
  const out = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let d = angles[i] - angles[i - 1];
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    out.push(out[i - 1] + d);
  }
  return out;
}

function linearFit(x, y) {
  const n = x.length;
  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  return { slope: num / den, intercept: yMean - (num / den) * xMean };
}

/**
 * Symmetric moving average with given window size (in samples).
 * Edges are handled by shrinking the window.
 */
function movingAverage(y, windowSize) {
  const out = new Array(y.length);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < y.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(y.length, i + half + 1);
    let sum = 0;
    for (let j = lo; j < hi; j++) sum += y[j];
    out[i] = sum / (hi - lo);
  }
  return out;
}

/**
 * Fit linear + single-sinusoid model:  y = a + b*x + C*cos(2πx/T + φ)
 * Returns {a, b, C, phi, T}.  T is specified as the expected oscillation period.
 * The linear slope b is the "secular" rate after removing the oscillation.
 */
function fitLinearPlusSinusoid(x, y, T) {
  // Solve linear system for y = a + b*x + c*cos(2πx/T) + s*sin(2πx/T)
  const n = x.length;
  const omega = 2 * Math.PI / T;
  // Design matrix columns: 1, x, cos(ωx), sin(ωx)
  let S1=0, Sx=0, Sc=0, Ss=0;
  let Sxx=0, Sxc=0, Sxs=0;
  let Scc=0, Scs=0, Sss=0;
  let Sy=0, Sxy=0, Scy=0, Ssy=0;
  for (let i = 0; i < n; i++) {
    const c = Math.cos(omega * x[i]);
    const s = Math.sin(omega * x[i]);
    S1 += 1;
    Sx += x[i];  Sc += c;   Ss += s;
    Sxx += x[i]*x[i]; Sxc += x[i]*c; Sxs += x[i]*s;
    Scc += c*c; Scs += c*s; Sss += s*s;
    Sy += y[i]; Sxy += x[i]*y[i]; Scy += c*y[i]; Ssy += s*y[i];
  }
  // 4x4 linear system: A·[a,b,c,s] = B
  const A = [
    [S1,  Sx,  Sc,  Ss],
    [Sx,  Sxx, Sxc, Sxs],
    [Sc,  Sxc, Scc, Scs],
    [Ss,  Sxs, Scs, Sss],
  ];
  const B = [Sy, Sxy, Scy, Ssy];
  // Solve via Gaussian elimination
  const sol = gaussElim(A, B);
  const [a, b, c, s] = sol;
  const C = Math.sqrt(c*c + s*s);
  const phi = Math.atan2(s, c);
  return { a, b, C, phi, T };
}

function gaussElim(A, B) {
  const n = A.length;
  // Augment
  const M = A.map((row, i) => [...row, B[i]]);
  for (let i = 0; i < n; i++) {
    // Pivot
    let maxR = i;
    for (let r = i+1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[maxR][i])) maxR = r;
    [M[i], M[maxR]] = [M[maxR], M[i]];
    // Eliminate below
    for (let r = i+1; r < n; r++) {
      const f = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  const x = new Array(n);
  for (let i = n-1; i >= 0; i--) {
    let s = M[i][n];
    for (let c = i+1; c < n; c++) s -= M[i][c] * x[c];
    x[i] = s / M[i][i];
  }
  return x;
}

async function fetchPlanet(name, times) {
  const BATCH_SIZE = 100;
  const results = [];
  for (let i = 0; i < times.length; i += BATCH_SIZE) {
    const batch = times.slice(i, i + BATCH_SIZE);
    process.stdout.write(`    batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(times.length/BATCH_SIZE)} (${batch.length} epochs)...`);
    const t0 = Date.now();
    const data = await wgc.osculatingElements({
      orbitingBody: WGC_NAME[name],
      centerBody: 'SUN',
      times: batch,
      referenceFrame: 'ECLIPJ2000',
    });
    const cols = {};
    data.columns.forEach((c, idx) => cols[c.outputID] = idx);
    for (const row of data.rows) {
      results.push({
        date: row[cols.DATE],
        e: row[cols.ECCENTRICITY],
        incl: row[cols.INCLINATION],
        om: row[cols.ASCENDING_NODE_LONGITUDE],
        w:  row[cols.ARGUMENT_OF_PERIAPSE],
      });
    }
    console.log(` ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }
  return results;
}

function isoToYear(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`Unparseable date: ${iso}`);
  const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
  const daysBefore = [0,31,59,90,120,151,181,212,243,273,304,334];
  const doy = daysBefore[mo - 1] + (d - 1);
  const daysInYear = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
  return y + doy / daysInYear;
}

// Dominant oscillation period for each planet's perihelion (years).
// Used for sinusoid removal. Source: Laskar secular theory / planet-planet synodic periods.
const OSCILLATION_PERIOD = {
  MERCURY:  4,    // short-period perturbations
  VENUS:    8,
  EARTH:   11.9,  // Jupiter synodic
  MARS:    15.8,  // Jupiter synodic
  JUPITER: 19.9,  // Saturn synodic
  SATURN:  19.9,  // Saturn-Jupiter synodic
  URANUS:  45.4,  // Uranus-Neptune synodic
  NEPTUNE: 45.4,
};

/**
 * Extract secular trend using three methods:
 *   1. Raw linear regression
 *   2. Moving-average smoothing (window = dominant oscillation period) + linear fit
 *   3. Linear + sinusoid fit (dominant oscillation period)
 */
function extractTrends(yrArr, yArr, oscPeriodYr) {
  const yUnwrap = unwrap(yArr);

  // Method 1: raw linear
  const raw = linearFit(yrArr, yUnwrap);

  // Method 2: moving average then linear
  const dt = (yrArr[yrArr.length - 1] - yrArr[0]) / (yrArr.length - 1);
  const windowSize = Math.max(3, Math.round(oscPeriodYr / dt));
  const smoothed = movingAverage(yUnwrap, windowSize);
  // Truncate edges where moving average is biased
  const edge = Math.floor(windowSize / 2);
  const smoothedInterior = smoothed.slice(edge, smoothed.length - edge);
  const yrInterior = yrArr.slice(edge, yrArr.length - edge);
  const ma = (smoothedInterior.length > 1) ? linearFit(yrInterior, smoothedInterior) : { slope: NaN };

  // Method 3: fit linear + sinusoid at oscillation period
  let sinFit = null;
  try {
    sinFit = fitLinearPlusSinusoid(yrArr, yUnwrap, oscPeriodYr);
  } catch (_) {}

  return { raw, ma, sinFit, yUnwrap, smoothed };
}

async function main() {
  const { start, end, stepMonths } = args();
  const H = 335317;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WebGeoCalc: Observed Perihelion Precession (trustworthy baseline)');
  console.log(`  Range: ${start}–${end}  step: ${stepMonths} mo  → trend extraction with noise reduction`);
  console.log('═══════════════════════════════════════════════════════════════');

  const times = generateTimes(start, end, stepMonths);
  console.log(`  Total epochs: ${times.length}`);
  console.log('');

  const results = {};
  for (const planet of PLANETS) {
    console.log(`  Fetching ${planet}...`);
    try {
      const data = await fetchPlanet(planet, times);
      const omArr = data.map(d => d.om);
      const wArr  = data.map(d => d.w);
      const piArr = data.map(d => ((d.om + d.w) % 360 + 360) % 360);
      const yrArr = data.map(d => isoToYear(d.date));

      const osc = OSCILLATION_PERIOD[planet];

      const trOm = extractTrends(yrArr, omArr, osc);
      const trW  = extractTrends(yrArr, wArr,  osc);
      const trPi = extractTrends(yrArr, piArr, osc);

      const rates = {
        rawOm: trOm.raw.slope * 3600 * 100,
        rawW:  trW.raw.slope  * 3600 * 100,
        rawPi: trPi.raw.slope * 3600 * 100,
        maOm:  trOm.ma.slope  * 3600 * 100,
        maW:   trW.ma.slope   * 3600 * 100,
        maPi:  trPi.ma.slope  * 3600 * 100,
        sinOm: trOm.sinFit ? trOm.sinFit.b * 3600 * 100 : NaN,
        sinW:  trW.sinFit  ? trW.sinFit.b  * 3600 * 100 : NaN,
        sinPi: trPi.sinFit ? trPi.sinFit.b * 3600 * 100 : NaN,
      };

      results[planet] = { rates, trPi, omArr, wArr, piArr, yrArr, osc };

      console.log(`    Ω rate [raw | MA | sin]:  ${rates.rawOm.toFixed(1).padStart(9)} | ${rates.maOm.toFixed(1).padStart(9)} | ${rates.sinOm.toFixed(1).padStart(9)}  ″/cy`);
      console.log(`    ω rate [raw | MA | sin]:  ${rates.rawW.toFixed(1).padStart(9)} | ${rates.maW.toFixed(1).padStart(9)} | ${rates.sinW.toFixed(1).padStart(9)}  ″/cy`);
      console.log(`    ϖ rate [raw | MA | sin]:  ${rates.rawPi.toFixed(1).padStart(9)} | ${rates.maPi.toFixed(1).padStart(9)} | ${rates.sinPi.toFixed(1).padStart(9)}  ″/cy`);
      const sinFit = trPi.sinFit;
      if (sinFit) {
        const periodSin = sinFit.b !== 0 ? 360 / Math.abs(sinFit.b) : Infinity;
        const N = 8 * H / periodSin;
        console.log(`    ϖ best (sin fit):  rate ${rates.sinPi.toFixed(1)} ″/cy  period ${Math.round(periodSin).toLocaleString()} yr  → 8H/${Math.round(N)} (exact N=${N.toFixed(3)})  osc ampl ${(sinFit.C * 3600).toFixed(0)}″`);
      }
      console.log('');
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Summary: ϖ rates from different trend-extraction methods');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Planet    │ Raw        │ MA smooth  │ Sine+Lin   │ Best N (from sine fit)');
  console.log('  ──────────┼────────────┼────────────┼────────────┼─────────────');
  for (const p of PLANETS) {
    const r = results[p]?.rates;
    if (!r) continue;
    const periodSin = r.sinPi !== 0 && !isNaN(r.sinPi) ? 360 / Math.abs(r.sinPi / 3600 / 100) : Infinity;
    const N = 8 * H / periodSin;
    console.log(
      `  ${p.padEnd(10)}│ ${r.rawPi.toFixed(1).padStart(8)} │ ${r.maPi.toFixed(1).padStart(8)} │ ${r.sinPi.toFixed(1).padStart(8)} │ 8H/${Math.round(N)} (exact ${N.toFixed(3)})`
    );
  }

  // Save a JSON with full time series for the UI modal
  const outJson = {};
  for (const p of PLANETS) {
    if (!results[p]) continue;
    outJson[p] = {
      yrArr: results[p].yrArr,
      omArr: results[p].omArr,
      wArr: results[p].wArr,
      piArr: results[p].piArr,
      rates: results[p].rates,
      oscPeriod: results[p].osc,
      sinFit: results[p].trPi.sinFit,
    };
  }
  // Write to public/input/ so the UI modal can fetch it (via GitHub raw URL).
  const outPath = require('path').join(__dirname, '..', '..', 'public', 'input', 'wgc-perihelion-data.json');
  require('fs').writeFileSync(outPath, JSON.stringify(outJson));
  console.log(`\n  Time series saved to ${outPath} (for UI modal)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
