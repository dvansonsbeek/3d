/**
 * NULL TESTS FOR THE ΔT-STACK ↔ CLIMATE CORRESPONDENCE (part 2 of 2)
 * ===================================================================
 * Regenerates the two phase statistics quoted in
 *   docs/102 § "Defensible scientific position" item 7
 *   docs/99  § sub-Milankovitch stack rate
 *   website  /model/timekeeping § "The Bond 2001 IRD comparison"
 *
 * A broadband Pearson r between the stack and a climate proxy is diluted by
 * all the variance at periods the framework never modelled, so r is capped
 * near +0.3 whether or not the framework is right. These two tests instead ask
 * what the framework actually claims — that FOUR SPECIFIC PERIODS are present,
 * in phase, in the climate record.
 *
 *   A. BAND-LIMITED PHASE. Project each isolated framework harmonic and the
 *      proxy onto the harmonic's own period; report the phase offset. With a
 *      phase-randomised surrogate null the phase p-value is analytic:
 *      p = |offset| / 180°, so 0° = aligned, 180° = anti-phase, 90° = no
 *      relationship. Power significance uses explicit surrogates.
 *
 *   B. WINDOWED PHASE-TRACKING. Test A assumes a CONSTANT phase relationship,
 *      which a real but slowly-drifting correspondence would fail. This slides
 *      a ~3-cycle window along the record and measures whether the phase
 *      difference is STABLE (phase-locking value, PLV) rather than fixed.
 *      PLV_detrended additionally allows a steady drift — i.e. a slightly
 *      wrong period. Null: phase-randomised surrogates pushed through the
 *      identical windowing, so window overlap is handled correctly (overlap
 *      inflates raw PLV, which is why the null is essential).
 *
 * Companion: tools/explore/climate-crossing-null.js (sign score + crossing
 * timing). Diagnostics only — nothing shipped is written.
 *
 * Data: data/gisp2-alley2000-raw.txt, data/bond2001-raw.txt (both in-repo).
 * Runtime: a few minutes (surrogates use a naive O(n²) DFT).
 *
 * Run:  node tools/explore/climate-band-phase.js
 */
const fs = require('fs');
const path = require('path');
const dt = require(path.join(__dirname, '..', 'lib', 'deep-time.js'));
const DATA = path.join(__dirname, '..', '..', 'data');

// ── proxies ─────────────────────────────────────────────────────────────────
function loadGISP2() {
  // The file holds TWO tables (temperature, then accumulation rate). Take only
  // the temperature table, which ends where the accumulation header begins.
  const all = fs.readFileSync(path.join(DATA, 'gisp2-alley2000-raw.txt'), 'utf8');
  const txt = all.slice(0, all.indexOf('2.  Accumulation rate'));
  const p = [];
  for (const line of txt.split('\n')) {
    const m = line.trim().match(/^([\d.]+)\s+(-?[\d.]+)$/);
    if (m) p.push({ year: 1950 - parseFloat(m[1]) * 1000, v: parseFloat(m[2]) });
  }
  return p.sort((a, b) => a.year - b.year);
}
function loadBondIRD() {
  // 10 columns; cols 9-10 (index 8,9) = age (yr BP) + the all-4-cores
  // "ocean stacked" %HSG record — the series the framework is compared against.
  const txt = fs.readFileSync(path.join(DATA, 'bond2001-raw.txt'), 'utf8');
  const p = [];
  for (const line of txt.split('\n')) {
    const c = line.trim().split(/\s+/).map(Number);
    if (c.length >= 10 && c.every(Number.isFinite) && c[8] >= 0 && c[8] < 20000)
      p.push({ year: 1950 - c[8], v: c[9] });
  }
  return p.sort((a, b) => a.year - b.year);
}

// ── helpers ─────────────────────────────────────────────────────────────────
function resample(pts, lo, hi, step) {
  const xs = [], ys = [];
  for (let y = lo; y <= hi; y += step) {
    let i = 1; while (i < pts.length && pts[i].year < y) i++;
    if (i >= pts.length || pts[i - 1].year > y) continue;
    const a = pts[i - 1], b = pts[i];
    const f = (b.year === a.year) ? 0 : (y - a.year) / (b.year - a.year);
    xs.push(y); ys.push(a.v + f * (b.v - a.v));
  }
  return { xs, ys };
}
function detrend(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const sl = sxy / sxx;
  return ys.map((v, i) => v - (my + sl * (xs[i] - mx)));
}
/** Complex projection onto period P over an index range → amplitude + phase. */
function project(xs, ys, P, i0, i1) {
  const w = 2 * Math.PI / P; let c = 0, s = 0, n = 0;
  for (let i = i0; i < i1; i++) { c += ys[i] * Math.cos(w * xs[i]); s += ys[i] * Math.sin(w * xs[i]); n++; }
  return { ph: Math.atan2(s / n, c / n), amp: Math.hypot(c / n, s / n) };
}
/** Phase-randomised surrogate: same power spectrum, randomised phases. */
function surrogate(ys, rnd) {
  const n = ys.length, re = new Array(n).fill(0), im = new Array(n).fill(0);
  for (let k = 0; k < n; k++) for (let t = 0; t < n; t++) {
    const a = -2 * Math.PI * k * t / n; re[k] += ys[t] * Math.cos(a); im[k] += ys[t] * Math.sin(a);
  }
  for (let k = 1; k < n / 2; k++) {
    const mag = Math.hypot(re[k], im[k]), ph = rnd() * 2 * Math.PI;
    re[k] = mag * Math.cos(ph); im[k] = mag * Math.sin(ph);
    re[n - k] = re[k]; im[n - k] = -im[k];
  }
  const out = new Array(n).fill(0);
  for (let t = 0; t < n; t++) {
    let v = 0;
    for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k * t / n; v += re[k] * Math.cos(a) - im[k] * Math.sin(a); }
    out[t] = v / n;
  }
  return out;
}
const wrap = d => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/** PLV of the framework-vs-series phase difference across sliding windows. */
function plv(xs, ys, fwv, P, step) {
  const winPts = Math.round(3 * P / step), hop = Math.max(1, Math.round(P / 3 / step));
  const d = [];
  for (let i0 = 0; i0 + winPts <= xs.length; i0 += hop)
    d.push(wrap(project(xs, ys, P, i0, i0 + winPts).ph - project(xs, fwv, P, i0, i0 + winPts).ph));
  if (d.length < 3) return null;
  let sc = 0, ss = 0;
  for (const v of d) { sc += Math.cos(v); ss += Math.sin(v); }
  const raw = Math.hypot(sc, ss) / d.length;
  // unwrap, remove a linear drift (= a small period mismatch), re-measure
  const u = [d[0]];
  for (let i = 1; i < d.length; i++) {
    let x = d[i];
    while (x - u[i - 1] > Math.PI) x -= 2 * Math.PI;
    while (x - u[i - 1] < -Math.PI) x += 2 * Math.PI;
    u.push(x);
  }
  const n = u.length, mi = (n - 1) / 2, mu = u.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (i - mi) * (u[i] - mu); sxx += (i - mi) ** 2; }
  const sl = sxy / sxx;
  let rc = 0, rs = 0;
  for (let i = 0; i < n; i++) { const r = u[i] - (mu + sl * (i - mi)); rc += Math.cos(r); rs += Math.sin(r); }
  return { raw, detr: Math.hypot(rc, rs) / n, nWin: d.length };
}

// ── the four shipped harmonics, ISOLATED (no inter-band leakage) ────────────
const BANDS = [
  { name: 'Bond      8H/1830', P: 2682536 / 1830, f: dt.bondCycleLodCorrection },
  { name: 'Hallstatt 8H/1104', P: 2682536 / 1104, f: dt.hallstattCycleLodCorrection },
  { name: 'Jose5     8H/2989', P: 2682536 / 2989, f: dt.jose5CycleLodCorrection },
  { name: 'Jose4     8H/3749', P: 2682536 / 3749, f: dt.jose4CycleLodCorrection },
];
const PROXIES = [['Bond 2001 IRD', loadBondIRD], ['GISP2 temperature', loadGISP2]];
const STEP = 50, NSUR = 500;
let seed = 20260728; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

console.log('='.repeat(76));
console.log('  ΔT-STACK ↔ CLIMATE: BAND-LIMITED + WINDOWED PHASE TESTS');
console.log('='.repeat(76));

for (const [pname, load] of PROXIES) {
  const pts = load();
  for (const [lo, hi, label] of [[-4000, 1800, 'validated'], [-9000, 1800, 'Holocene']]) {
    const wlo = Math.max(lo, Math.ceil(pts[0].year / STEP) * STEP);
    const whi = Math.min(hi, Math.floor(pts[pts.length - 1].year / STEP) * STEP);
    const { xs, ys: rawY } = resample(pts, wlo, whi, STEP);
    if (xs.length < 40) continue;
    const ys = detrend(xs, rawY);
    console.log(`\n${pname}  —  ${label} window ${wlo}..${whi}  (n=${xs.length} @ ${STEP} yr)`);
    console.log('  band                 lag_yr   phase_off   p(phase)   PLV    p(PLV)  PLV_dtr  p(dtr)');
    for (const b of BANDS) {
      const fwv = xs.map(b.f);
      const pr = project(xs, ys, b.P, 0, xs.length);
      const fw = project(xs, fwv, b.P, 0, xs.length);
      const dphi = wrap(pr.ph - fw.ph);
      const deg = dphi * 180 / Math.PI;
      const lag = dphi / (2 * Math.PI) * b.P;
      // phase-randomised surrogates give a UNIFORM phase null → p is analytic
      const pPhase = Math.abs(deg) / 180;
      const o = plv(xs, ys, fwv, b.P, STEP);
      let geRaw = 0, geDet = 0, nOk = 0;
      if (o) for (let i = 0; i < NSUR; i++) {
        const s = plv(xs, surrogate(ys, rnd), fwv, b.P, STEP);
        if (!s) continue;
        nOk++;
        if (s.raw >= o.raw) geRaw++;
        if (s.detr >= o.detr) geDet++;
      }
      const f3 = v => v.toFixed(3);
      console.log(`  ${b.name}  ${(lag >= 0 ? '+' : '') + lag.toFixed(0)}`.padEnd(31)
        + `${deg.toFixed(0).padStart(5)}°     ${f3(pPhase)}    `
        + (o ? `${f3(o.raw)}  ${f3(geRaw / nOk)}   ${f3(o.detr)}   ${f3(geDet / nOk)}` : '   (too few windows)'));
    }
  }
}
console.log('\n' + '='.repeat(76));
console.log('  READING: phase_off 0° = aligned, 180° = ANTI-phase, 90° = no relationship.');
console.log('  PLV 1.0 = phase relationship perfectly constant, 0 = random. Raw PLV is');
console.log('  inflated by window overlap — judge it by p(PLV), not by its size.');
console.log('  PLV_dtr allows a steady drift (a slightly wrong period).');
console.log('');
console.log('  RESULT: no band survives correction for the 16 phase tests run here.');
console.log('  The single nominal hit is Jose4 vs GISP2 in the validated window');
console.log('  (p = 0.046) — one of 16, i.e. exactly what chance produces. The');
console.log('  flagship Bond↔IRD pairing is the WORST result in the table: 175°,');
console.log('  essentially anti-phase, and permitting a drifting phase does not');
console.log('  rescue it (PLV p = 0.49).');
