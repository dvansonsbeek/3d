// THE SUN'S LONG-PERIOD PLANETARY ROWS IN D'ALEMBERT FORM — derived on the model's
// own N-body (the long-window twin of i2-long-inequality.mjs, which this supersedes
// for the two rows it derived with CONSTANT amplitudes on the record carriers).
//
// WHY: the Earth–Mars–Jupiter long inequality (argument θ = 4λ_E − 8λ_Ma + 3λ_J,
// ~1783 yr) and the Venus–Earth term (θ = 8λ_V − 13λ_E, ~239 yr) are FIRST ORDER
// in the eccentricities: each is a sum over bodies X of
//     e_X(t)·[a_X cos(θ − ϖ_X(t)) + b_X sin(θ − ϖ_X(t))]
// (D'Alembert's rule), so the composed amplitude and phase ride the e-vectors of
// date. A constant-amplitude row is exact only where it was fitted: measured on
// the model's inertial Sun against DE441 (tools/explore/sun-inertial-vs-de441.cjs),
// the shipped constant rows left 0.08″ at the 1783-yr period inside ±3000 yr and
// 3.7″ outside on both sides. SECOND CAUSE, the Venus–Earth row: its CARRIER — the
// planet records' rounded of-date periods minus p₀ (Venus 224.695 d) — runs 4.1″/yr
// off the model's own banked mean motion, 83° of argument phase at ±9000 yr; the
// 1783-yr argument's carrier is 1.1″/yr off (3°). The carriers here are the model's
// own banked J2000 sidereal mean motions (data/nbody-secular-series.json
// verdict.planetLamDot — the same ±10-Myr run the series rides; the chain's 300-yr
// window rates are NOT usable: Jupiter/Saturn absorb the great inequality's local
// slope, the C1 trap), Earth the framework sidereal year (the D6 doctrine: the
// run's ABSOLUTE Earth rate is ratio-only).
//
// CONDITIONING (measured, the first cut): the full basis {Earth, Mars, Jupiter}
// for the 1783-yr row is near-degenerate — the three perihelia rotate only
// 33–80° over ±9 kyr, so the columns are nearly collinear and the fit returned
// 68/86/45″ per body against a 6″ composed row, with the ±3100-yr control
// disagreeing by 11″ per body. The basis is chosen by the acceptance test below:
// the smallest body set whose coefficients agree between the ±9100 and ±3100
// windows to the composed noise, and whose residual carries no band power left
// at the period. (Stability and a small formal SE are not evidence of
// correctness — the model's own trap list.)
//
// METHOD (derivation, not fit — no ephemeris constant enters): the model's OWN
// engine on the campaign's ONE J2000 seed (nbody-wh.mjs, j2000-state.mjs; DE440
// mass ratios, Sun + eight planets with the EMB as one body, 1PN, order 2, dt 2 d),
// ±9100 yr, 10-day samples; the EMB's osculating mean longitude Ω+ω+M, yearly
// means; LSQ on [1, T, T²] + the D'Alembert columns on θ from the carriers and
// e_X, ϖ_X from the banked series (bodies.<X>.zQ/zP, ecliptic J2000 — the EXACT
// data the runtime embeds); convergence control at dt 1 d.
//
// THE VENUS–EARTH ROW (8λ_V − 13λ_E) is NOT first order: Σk = −5, a fifth-order
// resonant term (divisor 1.5°/yr — e⁵/ν² reaches the arcsecond) whose ϖ/Ω
// multipliers summing to +5 spread it into a cluster beating on ~20 kyr. No
// single-ϖ D'Alembert form holds: against Horizons' modern window the {V,E}
// form shifted the Sun by +0.9″ at J2000. It ships as a CONSTANT row derived
// on the ±3100-yr window (the Horizons-certified era), a local description.
//
// Usage: node tools/explore/i3-long-period-dalembert.mjs [dtDays=2] [halfSpanYears=9100] [innerWindowYears=3100] [detrendDegree=2]
//   the embedded rows: node tools/explore/i3-long-period-dalembert.mjs 2 20000 3100 4
// Output: printed variants + rows; tools/explore/i3-long-period-dalembert.local.json
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, GM_SUN, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const C = require(ROOT + 'tools/lib/constants.js');
const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERIES = JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8'));

const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DTD = argv[0] === undefined ? 2 : parseFloat(argv[0]);
const HALF = argv[1] === undefined ? 9100 : parseFloat(argv[1]);
const CTRL = argv[2] === undefined ? 3100 : parseFloat(argv[2]);   // the inner control window
// The secular detrend degree (diagnostic — nothing of it ships): over ±9 kyr the
// run's own mean motion + acceleration ([1, T, T²]) suffice; over ±20 kyr the
// planetary λ̇ drift's curvature (the D6 channel's shape) leaves ~18″ of cubic/
// quartic residual that a quadratic detrend leaks into every band — degree 4 there.
const DEG = argv[3] === undefined ? 2 : parseInt(argv[3], 10);
const secular = (T) => Array.from({ length: DEG + 1 }, (_, i) => T ** i);
const DAY = 86400, D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, CY = 36525;

// ── anchors and carriers ────────────────────────────────────────────────────
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'];
const degPerCy = (f) => 360 * CY * f;
const P0_DEG_PER_CY = degPerCy(1 / C.meanSolarYearDays) - degPerCy(1 / C.meanSiderealYearDays);
const RATES_RECORD = KEYS.map((k) => (k !== 'earth' ? degPerCy(1 / C.planets[k].solarYearInput) - P0_DEG_PER_CY : degPerCy(1 / C.meanSiderealYearDays)));
const bank = Object.fromEntries(SERIES.verdict.planetLamDot.rows.map((r) => [r.body, r.lamDotJ2000DegPerYr * 100]));
const RATES_BANKED = KEYS.map((k) => (k !== 'earth' ? bank[k] : degPerCy(1 / C.meanSiderealYearDays)));
console.log('carriers (deg/cy): record ' + RATES_RECORD.map((r) => r.toFixed(4)).join(' ') + '\n                   banked ' + RATES_BANKED.map((r) => r.toFixed(4)).join(' ') + '\n                   banked − record (″/yr): ' + RATES_BANKED.map((r, i) => ((r - RATES_RECORD[i]) * 36).toFixed(3)).join(' '));
const argRad = (k, T, rates) => k.reduce((s, m, i) => s + m * (ARG_L0[i] + rates[i] * T), 0) * D2R;
const periodYr = (k, rates) => Math.abs(360 / k.reduce((s, m, i) => s + m * rates[i], 0)) * 100;

// ── the banked series' e-vectors of date (ecliptic J2000) ───────────────────
const zOfDate = (body) => { const b = SERIES.bodies[body]; return (T) => { const x = (T * 100 - SERIES.t0Yr) / b.stepYr, i = Math.max(0, Math.min(b.zQ.length - 2, Math.floor(x))), f = x - i; return [b.zQ[i] * (1 - f) + b.zQ[i + 1] * f, b.zP[i] * (1 - f) + b.zP[i + 1] * f]; }; };
const Z = KEYS.map(zOfDate);

// ── the model's own N-body on the ONE seed ──────────────────────────────────
const gms = [GM_SUN, ...NAMES.map(gmOf)];
function seedY0() {
  const N = NAMES.length, Y = new Float64Array(6 * (N + 1));
  const Mt = gms.reduce((s, g) => s + g, 0);
  const rB = [0, 0, 0], vB = [0, 0, 0];
  NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { rB[c] += gms[i + 1] * HZ[p][c] / Mt; vB[c] += gms[i + 1] * HZ[p][3 + c] / Mt; } });
  for (let c = 0; c < 3; c++) { Y[c] = -rB[c]; Y[3 * (N + 1) + c] = -vB[c]; }
  NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { Y[3 * (i + 1) + c] = HZ[p][c] - rB[c]; Y[3 * (N + 1) + 3 * (i + 1) + c] = HZ[p][3 + c] - vB[c]; } });
  return Y;
}
function meanLongitude({ r, v }, mu) {
  const [rx, ry, rz] = r, [vx, vy, vz] = v;
  const rn = Math.hypot(rx, ry, rz), rv = rx * vx + ry * vy + rz * vz;
  const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
  const ex = (vy * hz - vz * hy) / mu - rx / rn, ey = (vz * hx - vx * hz) / mu - ry / rn, ez = (vx * hy - vy * hx) / mu - rz / rn;
  const e = Math.hypot(ex, ey, ez);
  const nx = -hy, ny = hx, nn = Math.hypot(nx, ny);
  const Om = nn > 0 ? Math.atan2(ny, nx) : 0;
  let w;
  if (nn > 0) { w = Math.acos(Math.max(-1, Math.min(1, (nx * ex + ny * ey) / (nn * e)))); if (ez < 0) w = -w; } else w = Math.atan2(ey, ex);
  let nu = Math.acos(Math.max(-1, Math.min(1, (ex * rx + ey * ry + ez * rz) / (e * rn)))); if (rv < 0) nu = -nu;
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return Om + w + (E - e * Math.sin(E));
}
const IDX_EARTH = 3;
function integrate(dtDays, years, sampleDays) {
  const sim = makeWH({ gms, Y0: seedY0(), dt: dtDays * DAY, gr: true, order: 2 });
  const stepsPerSample = Math.round(sampleDays / Math.abs(dtDays)), nSamples = Math.round(years * 365.25 / sampleDays);
  const out = [];
  for (let s = 0; s <= nSamples; s++) { out.push({ tDays: sim.t / DAY, lamE: meanLongitude(sim.helio(IDX_EARTH), GM_SUN + gms[IDX_EARTH]) }); sim.step(stepsPerSample); }
  return out;
}
const unwrapSeq = (arr) => { let off = 0; const o = [arr[0]]; for (let i = 1; i < arr.length; i++) { const d = arr[i] - arr[i - 1]; if (d < -Math.PI) off += 2 * Math.PI; else if (d > Math.PI) off -= 2 * Math.PI; o.push(arr[i] + off); } return o; };
/** yearly means of the EMB mean longitude (arcsec) over ±half yr */
function yearlyMeans(dtDays, half) {
  const t0 = Date.now();
  const B = integrate(-dtDays, half, 10), F = integrate(dtDays, half, 10);
  const samples = [...B.slice(1).reverse(), ...F];
  const lam = unwrapSeq(samples.map((s) => s.lamE));
  const bins = new Map();
  for (let j = 0; j < samples.length; j++) { const y = Math.floor(samples[j].tDays / 365.25); let b = bins.get(y); if (!b) { b = { n: 0, lam: 0, t: 0 }; bins.set(y, b); } b.n++; b.lam += lam[j]; b.t += samples[j].tDays; }
  // (sliding-window and free-period diagnostics below index `main` by position)
  const rows = [...bins.values()].filter((b) => b.n >= 30).map((b) => ({ T: b.t / b.n / CY, lamAS: b.lam / b.n * R2D * AS }));
  console.log(`\nintegration dt ${dtDays} d, ±${half} yr: ${samples.length} samples → ${rows.length} yearly means, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return rows;
}

// ── fitting ─────────────────────────────────────────────────────────────────
function lsq(X, y) {
  const p = X[0].length, n = X.length;
  const A = Array.from({ length: p }, () => new Float64Array(p + 1));
  for (let r = 0; r < n; r++) for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) A[a][b] += X[r][a] * X[r][b]; A[a][p] += X[r][a] * y[r]; }
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k <= p; k++) A[j][k] -= f * A[i][k]; }
  const beta = new Float64Array(p);
  for (let i = p - 1; i >= 0; i--) { let s = A[i][p]; for (let k = i + 1; k < p; k++) s -= A[i][k] * beta[k]; beta[i] = s / A[i][i]; }
  const res = y.map((v, r) => v - X[r].reduce((s, x, a) => s + x * beta[a], 0));
  return { beta, res, sd: Math.sqrt(res.reduce((s, v) => s + v * v, 0) / n) };
}
const bandAmp = (rows, res, Pyr, T0, T1) => { const w = 2 * Math.PI / (Pyr / 100); let cc = 0, ss = 0, cs = 0, cy = 0, sy = 0, m = 0; rows.forEach((r, i) => { if (r.T < T0 || r.T > T1) return; m++; const c = Math.cos(w * r.T), s = Math.sin(w * r.T); cc += c * c; ss += s * s; cs += c * s; cy += c * res[i]; sy += s * res[i]; }); if (m < 50) return NaN; const det = cc * ss - cs * cs; return Math.hypot((cy * ss - sy * cs) / det, (sy * cc - cy * cs) / det); };
const K_LI = [0, 0, 4, -8, 3, 0], K_VE = [0, 8, -13, 0, 0, 0];
/** one variant: {rates, li: [bodies] | 'const', ve: [bodies] | 'const'} → the design columns at a row */
function design(v, r) {
  const x = secular(r.T);
  for (const [k, spec] of [[K_LI, v.li], [K_VE, v.ve]]) {
    const th = argRad(k, r.T, v.rates);
    if (spec === 'const') x.push(Math.cos(th), Math.sin(th));
    // D'Alembert: Σk_λ + Σj_ϖ = 0. Both arguments have Σk = −1 (4−8+3; 8−13 = −5
    // is handled below), so the first-order terms carry +ϖ_X: e_X·cos(θ + ϖ_X).
    // (The first cut used θ − ϖ_X — the wrong sign — and "fitted" ±9 kyr with
    // three degenerate columns mimicking the phase: the window test exposed it.)
    else for (const X of spec) { const [q, p] = Z[X](r.T); const e = Math.hypot(q, p), w = Math.atan2(p, q); x.push(e * Math.cos(th + w), e * Math.sin(th + w)); }
  }
  return x;
}
/** the composed row value at J2000 for reporting: amplitude of Σ e_X(0)·(a cos(θ−ϖ) + b sin(θ−ϖ)) as a single cos/sin pair */
function composedJ2000(v, beta) {
  const out = {}; let j = DEG + 1;
  for (const [name, spec] of [['LI', v.li], ['VE', v.ve]]) {
    if (spec === 'const') { out[name] = Math.hypot(beta[j], beta[j + 1]); j += 2; continue; }
    let cx = 0, sx = 0;
    // a·cos(θ+w) + b·sin(θ+w) = (a cos w + b sin w)·cos θ + (b cos w − a sin w)·sin θ
    for (const X of spec) { const [q, p] = Z[X](0); const e = Math.hypot(q, p), w = Math.atan2(p, q); const a = beta[j++], b = beta[j++]; cx += e * (a * Math.cos(w) + b * Math.sin(w)); sx += e * (b * Math.cos(w) - a * Math.sin(w)); }
    out[name] = Math.hypot(cx, sx);
  }
  return out;
}
function fitVariant(v, rows) { const f = lsq(rows.map((r) => design(v, r)), rows.map((r) => r.lamAS)); return f; }
const fmt = (x, d = 2) => (Number.isNaN(x) ? '   n/a' : x.toFixed(d).padStart(6));

const main = yearlyMeans(DTD, HALF);
const ctrlStep = yearlyMeans(DTD / 2, HALF);
const ctrlWin = yearlyMeans(DTD, CTRL);
const TIN = CTRL / 100;
const bodySets = { E: [2], Ma: [3], J: [4], 'Ma+J': [3, 4], 'E+Ma': [2, 3], 'E+J': [2, 4], 'E+Ma+J': [2, 3, 4] };
const veSets = { V: [1], E: [2], 'V+E': [1, 2] };
console.log(`\n═══ VARIANTS on the main window (±${HALF} yr, secular detrend degree ${DEG}) — residual sd and the band power left (″) inside/outside ±${CTRL}; window test = composed J2000 amplitude, main vs ±${CTRL} vs dt/2 ═══`);
const results = [];
for (const [ratesName, rates] of [['record carriers', RATES_RECORD], ['banked carriers', RATES_BANKED]]) {
  console.log(`\n--- ${ratesName}: P(LI) ${periodYr(K_LI, rates).toFixed(1)} yr · P(VE) ${periodYr(K_VE, rates).toFixed(1)} yr`);
  for (const [liName, li] of [['const', 'const'], ...Object.entries(bodySets)]) {
    const v = { rates, li, ve: 'const' };
    const f = fitVariant(v, main), fw = fitVariant(v, ctrlWin), fs = fitVariant(v, ctrlStep);
    const c = composedJ2000(v, f.beta), cw = composedJ2000(v, fw.beta), cs = composedJ2000(v, fs.beta);
    const Pli = periodYr(K_LI, rates);
    console.log(`  LI ${liName.padEnd(7)} sd ${f.sd.toFixed(3)} · 1783-band in ${fmt(bandAmp(main, f.res, Pli, -TIN, TIN))} out ${fmt(bandAmp(main, f.res, Pli, -1000, -TIN))}/${fmt(bandAmp(main, f.res, Pli, TIN, 1000))} · composed J2000 ${c.LI.toFixed(2)}″ (±${CTRL}: ${cw.LI.toFixed(2)}, dt/2: ${cs.LI.toFixed(2)})`);
    results.push({ ratesName, li: liName, ve: 'const', sd: f.sd, composed: c, composedWin: cw, composedStep: cs, beta: Array.from(f.beta) });
  }
  for (const [veName, ve] of [['const', 'const'], ...Object.entries(veSets)]) {
    const v = { rates, li: 'const', ve };
    const f = fitVariant(v, main), fw = fitVariant(v, ctrlWin);
    const c = composedJ2000(v, f.beta), cw = composedJ2000(v, fw.beta);
    const Pve = periodYr(K_VE, rates);
    console.log(`  VE ${veName.padEnd(7)} sd ${f.sd.toFixed(3)} · 238-band in ${fmt(bandAmp(main, f.res, Pve, -TIN, TIN))} out ${fmt(bandAmp(main, f.res, Pve, -1000, -TIN))}/${fmt(bandAmp(main, f.res, Pve, TIN, 1000))} · composed J2000 ${c.VE.toFixed(2)}″ (±${CTRL}: ${cw.VE.toFixed(2)})`);
  }
}
// ── EXTRAPOLATION TEST: fit on the inner window only, evaluate over the main
// window — the honest window test for a near-degenerate basis (the composed
// J2000 amplitude can agree while the function runs away where the columns
// separate). Reported: the band power left outside the inner window by the
// inner-fitted function, and its rms difference from the main fit out there.
console.log(`\n═══ EXTRAPOLATION: rows fitted on ±${CTRL} yr, evaluated over ±${HALF} yr (band power left outside; rms Δ vs the ±${HALF} fit) ═══`);
const NS = DEG + 1;   // secular columns
const evalRows = (v, beta, rows) => rows.map((r) => { const x = design(v, r); return x.slice(NS).reduce((s, c, a) => s + c * beta[NS + a], 0); });
for (const [ratesName, rates] of [['record carriers', RATES_RECORD], ['banked carriers', RATES_BANKED]]) {
  console.log(`--- ${ratesName}`);
  for (const [liName, li] of [['const', 'const'], ['Ma+J', [3, 4]], ['E+Ma', [2, 3]], ['E+Ma+J', [2, 3, 4]]]) {
    const v = { rates, li, ve: 'const' };
    const fw = fitVariant(v, ctrlWin), fm = fitVariant(v, main);
    // residual of the main data under the ±3100-fitted periodic part (the quadratic refitted — it is diagnostic)
    const per = evalRows(v, fw.beta, main);
    const f2 = lsq(main.map((r) => secular(r.T)), main.map((r, i) => r.lamAS - per[i]));
    const Pli = periodYr(K_LI, rates);
    const diff = evalRows(v, fm.beta, main).map((x, i) => x - per[i]);
    const outer = (arr) => Math.sqrt(arr.reduce((s, x, i) => (Math.abs(main[i].T) > TIN ? s + x * x : s), 0) / arr.filter((_, i) => Math.abs(main[i].T) > TIN).length);
    console.log(`  LI ${liName.padEnd(7)} inner fit over the main window: sd ${f2.sd.toFixed(3)} · 1783-band out ${fmt(bandAmp(main, f2.res, Pli, -1000, -TIN))}/${fmt(bandAmp(main, f2.res, Pli, TIN, 1000))} · rms Δ(inner fit − main fit) outside ${outer(diff).toFixed(2)}″`);
  }
}
// ── SLIDING WINDOWS: the 1783-yr line's amplitude and phase along the run (3600-yr
// windows, [1,T] + cos/sin on the banked carrier argument), beside the D'Alembert
// prediction from the inner-window fit on {E,Ma,J} — amplitude modulation or phase drift?
{
  const v = { rates: RATES_BANKED, li: [2, 3, 4], ve: 'const' };
  const fIn = fitVariant(v, ctrlWin);
  const dal = evalRows({ ...v, ve: 'const' }, fIn.beta, main);   // the inner-fitted periodic part over the main rows (LI + const VE)
  const fDet = lsq(main.map((r) => secular(r.T)), main.map((r) => r.lamAS));
  const Pli = periodYr(K_LI, RATES_BANKED), w = 2 * Math.PI / (Pli / 100);
  console.log(`\n═══ SLIDING 3600-yr WINDOWS — the 1783-yr line in the N-body (detrended, degree ${DEG}) vs the D'Alembert {E,Ma,J} prediction fitted on ±${CTRL} ═══`);
  console.log('centre yr    N-body amp″  phase°     D\'Alembert amp″  phase°     Δphase°');
  for (let yc = -HALF + 1800; yc <= HALF - 1800; yc += 1800) {
    const idx = main.map((_, i) => i).filter((i) => Math.abs(main[i].T * 100 - yc) <= 1800);
    const fitLine = (vals) => { const X = idx.map((i) => [1, main[i].T, Math.cos(w * main[i].T), Math.sin(w * main[i].T)]); const f = lsq(X, idx.map((i) => vals[i])); return { amp: Math.hypot(f.beta[2], f.beta[3]), ph: Math.atan2(f.beta[3], f.beta[2]) * R2D }; };
    const a = fitLine(fDet.res), b = fitLine(dal);
    console.log(`${String(yc).padStart(8)}    ${a.amp.toFixed(2).padStart(8)}  ${a.ph.toFixed(0).padStart(6)}        ${b.amp.toFixed(2).padStart(8)}  ${b.ph.toFixed(0).padStart(6)}      ${(((a.ph - b.ph + 540) % 360) - 180).toFixed(0).padStart(6)}`);
  }
}
// ── FREE-PERIOD SCAN: is the line a constant-amplitude term at a period OTHER than the
// carrier argument's (the sliding phase drifts ~8°/kyr against the banked carriers)?
// Constant cos/sin at trial periods over the main window, degree-DEG detrend; the
// best period, its amplitude, the band left in/out, and the sliding amplitude/phase.
{
  const fDet = lsq(main.map((r) => secular(r.T)), main.map((r) => r.lamAS));
  for (const [name, P0, P1] of [['1783-yr line', 1600, 1950], ['238-yr line', 228, 250]]) {
    let best = null;
    for (let P = P0; P <= P1; P += (P1 - P0) / 700) {
      const w = 2 * Math.PI / (P / 100);
      const f = lsq(main.map((r) => [...secular(r.T), Math.cos(w * r.T), Math.sin(w * r.T)]), main.map((r) => r.lamAS));
      if (!best || f.sd < best.sd) best = { P, sd: f.sd, amp: Math.hypot(f.beta[NS], f.beta[NS + 1]), f };
    }
    const w = 2 * Math.PI / (best.P / 100);
    console.log(`\n═══ FREE PERIOD, ${name}: best P ${best.P.toFixed(1)} yr (carriers: record ${periodYr(name.startsWith('1783') ? K_LI : K_VE, RATES_RECORD).toFixed(1)}, banked ${periodYr(name.startsWith('1783') ? K_LI : K_VE, RATES_BANKED).toFixed(1)}) · amp ${best.amp.toFixed(2)}″ · sd ${best.sd.toFixed(3)} (detrend only ${fDet.sd.toFixed(3)}) · band left in ${fmt(bandAmp(main, best.f.res, best.P, -TIN, TIN))} out ${fmt(bandAmp(main, best.f.res, best.P, -1000, -TIN))}/${fmt(bandAmp(main, best.f.res, best.P, TIN, 1000))}`);
    if (name.startsWith('1783')) {
      console.log('  sliding 3600-yr windows at the best period: centre, amp″, phase°');
      let s = '';
      for (let yc = -HALF + 1800; yc <= HALF - 1800; yc += 3600) {
        const idx = main.map((_, i) => i).filter((i) => Math.abs(main[i].T * 100 - yc) <= 1800);
        const f = lsq(idx.map((i) => [1, main[i].T, Math.cos(w * main[i].T), Math.sin(w * main[i].T)]), idx.map((i) => fDet.res[i]));
        s += `  ${yc}: ${Math.hypot(f.beta[2], f.beta[3]).toFixed(2)}″ ${(Math.atan2(f.beta[3], f.beta[2]) * R2D).toFixed(0)}°`;
      }
      console.log(s);
    }
  }
}
// ── THE VENUS–EARTH ROW: constant cos/sin on the banked carriers per window. The term is
// formally FIFTH order (Σk = −5) and resonant (divisor 1.5°/yr: ~2.5″ from e⁵/ν²), so it
// is a CLUSTER of lines (the ϖ/Ω multipliers summing to +5 spread its frequency by ~1 %)
// that beats on ~20 kyr — no single first-order form holds, and its amplitude/phase are
// a local description. Measured against Horizons' modern window (1970–2049), the single-ϖ
// D'Alembert form shifted the Sun by +0.9″ at J2000 where the constant row did not.
{
  console.log('\n═══ VENUS–EARTH constant row on the banked carriers, per window: cos″, sin″, amplitude ═══');
  for (const [label, rows] of [[`±${CTRL}`, ctrlWin], [`±${HALF}`, main]]) {
    const f = fitVariant({ rates: RATES_BANKED, li: [2, 3, 4], ve: 'const' }, rows);
    const j = NS + 6;   // after the secular columns and the three LI bodies (2 columns each)
    console.log(`  ${label.padEnd(8)} cos ${f.beta[j].toFixed(4).padStart(8)}  sin ${f.beta[j + 1].toFixed(4).padStart(8)}  amp ${Math.hypot(f.beta[j], f.beta[j + 1]).toFixed(3)}″`);
  }
}
// ── THE SHIPPED ROWS: banked carriers; the long inequality in D'Alembert form on
// {E, Ma, J} from the MAIN window (±HALF, degree-DEG detrend); the Venus–Earth row a
// CONSTANT cos/sin pair from the INNER window (±CTRL — the Horizons-certified era; the
// cluster beats on ~20 kyr, so the row is a local description there). Run as
// `node tools/explore/i3-long-period-dalembert.mjs 2 20000 3100 4` for the embedded values.
{
  const v = { rates: RATES_BANKED, li: [2, 3, 4], ve: 'const' };
  const f = fitVariant(v, main), fs = fitVariant(v, ctrlStep), fw = fitVariant(v, ctrlWin);
  console.log(`\n═══ SHIPPED ROWS (banked carriers; LI {E,Ma,J} on ±${HALF}, VE const on ±${CTRL}): sd ${f.sd.toFixed(3)}″ · composed J2000 LI ${composedJ2000(v, f.beta).LI.toFixed(3)}″ (dt/2: ${composedJ2000(v, fs.beta).LI.toFixed(3)}, ±${CTRL}: ${composedJ2000(v, fw.beta).LI.toFixed(3)})`);
  console.log('LONG_PERIOD_TERMS rows (extraction-native sign; [l-multipliers], bodyIndex, aCos″/e, bSin″/e):');
  let j = NS;
  for (const X of v.li) { const a = f.beta[j++], b = f.beta[j++]; console.log(`  [[${K_LI.join(', ')}], ${X}, ${a.toFixed(4)}, ${b.toFixed(4)}],   // 4E−8Ma+3J · ${KEYS[X]}`); }
  const jv = NS + 2 * v.li.length;
  console.log(`TERMS row (constant, the ±${CTRL} fit): [[${K_VE.join(', ')}], [0, 0, 0, 0, 0, 0], ${fw.beta[jv].toFixed(4)}, ${fw.beta[jv + 1].toFixed(4)}],   // 8V−13E · amp ${Math.hypot(fw.beta[jv], fw.beta[jv + 1]).toFixed(3)}″`);
  results.push({ shipped: true, variant: `banked; LI E+Ma+J on ±${HALF}; VE const on ±${CTRL}`, sd: f.sd, betaMain: Array.from(f.beta), betaStep: Array.from(fs.beta), betaInner: Array.from(fw.beta) });
}
writeFileSync(HERE + 'i3-long-period-dalembert.local.json', JSON.stringify({ RATES_RECORD, RATES_BANKED, results }, null, 1));
console.log('\n→ tools/explore/i3-long-period-dalembert.local.json (the chosen variant is embedded by hand with its record — see the module header)');
