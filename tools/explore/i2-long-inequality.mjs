// PLAN 06 I2 — the LONG-PERIOD planetary inequalities of the Earth's mean
// longitude, DERIVED from the model's own N-body (the long-window twin of the
// D2 derived-signal extraction, tools/explore/d2-derived-sun.mjs).
//
// WHY: against JPL Horizons over ±3000 yr (plan 06 I1, data/sun-vs-horizons-
// summary.json) the model's Sun carried a 6″ ripple with the period of the
// argument 4λ_E − 8λ_Ma + 3λ_J (≈1783 yr) — the classical Earth–Mars–Jupiter
// long inequality — with the same phase in the SIDEREAL residual (so a
// perturbation of Earth's mean motion, not a frame effect). The shipped Sun
// integrates a smooth year for its mean longitude and the derived completion
// (eclipse/sun-planetary-completion.cjs) holds 70 short-period synodic tones
// extracted from a 200-yr window: neither can carry a term of this period,
// and a 200-yr window also folds the 240-yr Venus–Earth term (8λ_V − 13λ_E)
// into its secular basis.
//
// METHOD (derivation, not fit — no constant from any ephemeris enters):
//   • the model's OWN engine: tools/explore/nbody-wh.mjs (Wisdom–Holman, the
//     chain artifact's integrator) on the campaign's ONE J2000 seed
//     (tools/explore/j2000-state.mjs — Horizons heliocentric state vectors,
//     the same seed every chain/series artifact rides), DE440 mass ratios,
//     Sun + eight planets (EMB as one body), 1PN on, order 2, dt 2 d — the
//     production configuration. Backward 5100 yr and forward 1100 yr.
//   • the EMB's OSCULATING MEAN LONGITUDE λ_m = Ω + ω + M at every sample —
//     the classical mean longitude of planetary theory; its long-period
//     content is exactly what the shipped mean longitude L(t) lacks.
//   • yearly means (annual and synodic wobble average out), then LSQ on
//     [1, T, T²] (the integration's own mean motion and secular acceleration
//     — a diagnostic detrend; nothing of it ships) + cos/sin of the long-period
//     arguments on the completion's carriers, so the extracted cos/sin pair with
//     its argument multipliers IS a TERMS row in the extraction-native sign
//     (N-body − smooth; the evaluator negates, the consumer subtracts).
//   • the same fit on the integration's OWN planet mean longitudes (the
//     carriers' phase drift measured), and a symmetric-window control.
//
// CARRIERS — SIDEREAL (plan 06 I2, measured): the planet records' solarYearInput
// are OF-DATE periods (their rates sit +1.39..1.62°/cy above the VSOP sidereal
// mean motions — the framework precession 1.397°/cy plus input rounding), and
// the N3 carriers rode them as they are. A perturbation argument is inertial
// (D'Alembert: Σk·λ with the λ in a fixed frame; only Σk = 0 arguments are
// frame-free), so every Σk ≠ 0 argument on of-date carriers drifts by Σk·ψ(t)
// — 42..52° at −3000 for the table's Σk = −1 terms (their ancient sd against
// Horizons 6.4 → 4.4″ on sidereal carriers, measured), and 6 % of frequency
// for this 1783-yr term (1683 yr on the of-date carriers). Sidereal carriers,
// framework-derived and constant-free: the record rate minus the model's own
// J2000 precession p₀ = 360·36525·(1/T_trop − 1/T_sid) for the planets, the
// framework sidereal year for Earth.
//
// Usage: node tools/explore/i2-long-inequality.mjs [dtDays=2] [backYears=5100] [fwdYears=1100] [--horizons=<J2000-ecliptic VECTORS text, optional validation>]
// Output: printed tables + tools/explore/i2-long-inequality.local.json (session record).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { makeWH } from './nbody-wh.mjs';
import { HZ, NAMES, GM_SUN, gmOf } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const C = require(ROOT + 'tools/lib/constants.js');
const HERE = fileURLToPath(new URL('.', import.meta.url));

const argv = process.argv.slice(2);
const num = (i, d) => { const v = argv.filter((a) => !a.startsWith('--'))[i]; return v === undefined ? d : parseFloat(v); };
const DTD = num(0, 2), BACK = num(1, 5100), FWD = num(2, 1100);
const HORIZONS = (argv.find((a) => a.startsWith('--horizons=')) || '').slice('--horizons='.length);
const DAY = 86400, D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, CY = 36525;

// ── the completion's J2000 anchors and the SIDEREAL carriers ────────────────
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const KEYS = ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'];
const degPerCy = (f) => 360 * CY * f;
const P0_DEG_PER_CY = degPerCy(1 / C.meanSolarYearDays) - degPerCy(1 / C.meanSiderealYearDays);
const RATES_OFDATE = KEYS.map((k) => (k ? degPerCy(1 / C.planets[k].solarYearInput) : degPerCy(1 / C.meanSolarYearDays)));
const RATES = KEYS.map((k) => (k ? degPerCy(1 / C.planets[k].solarYearInput) - P0_DEG_PER_CY : degPerCy(1 / C.meanSiderealYearDays)));
console.log('p0 (deg/cy)', P0_DEG_PER_CY.toFixed(5), '\nsidereal carriers:', RATES.map((r) => r.toFixed(4)).join(' '), '\nof-date (N3):     ', RATES_OFDATE.map((r) => r.toFixed(4)).join(' '));

// ── the model's own N-body on the ONE seed ──────────────────────────────────
const gms = [GM_SUN, ...NAMES.map(gmOf)];
function seedY0() {
  const N = NAMES.length, Y = new Float64Array(6 * (N + 1));
  // heliocentric → barycentric (Sun at origin/rest in HZ)
  const Mt = gms.reduce((s, g) => s + g, 0);
  const rB = [0, 0, 0], vB = [0, 0, 0];
  NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { rB[c] += gms[i + 1] * HZ[p][c] / Mt; vB[c] += gms[i + 1] * HZ[p][3 + c] / Mt; } });
  for (let c = 0; c < 3; c++) { Y[c] = -rB[c]; Y[3 * (N + 1) + c] = -vB[c]; }
  NAMES.forEach((p, i) => { for (let c = 0; c < 3; c++) { Y[3 * (i + 1) + c] = HZ[p][c] - rB[c]; Y[3 * (N + 1) + 3 * (i + 1) + c] = HZ[p][3 + c] - vB[c]; } });
  return Y;
}
/** heliocentric osculating mean longitude Ω+ω+M (rad), e, ϖ of a {r, v} state */
function meanLongitude({ r, v }, mu) {
  const [rx, ry, rz] = r, [vx, vy, vz] = v;
  const rn = Math.hypot(rx, ry, rz), rv = rx * vx + ry * vy + rz * vz;
  const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx, h = Math.hypot(hx, hy, hz);
  const ex = (vy * hz - vz * hy) / mu - rx / rn, ey = (vz * hx - vx * hz) / mu - ry / rn, ez = (vx * hy - vy * hx) / mu - rz / rn;
  const e = Math.hypot(ex, ey, ez);
  const nx = -hy, ny = hx, nn = Math.hypot(nx, ny);
  const Om = nn > 0 ? Math.atan2(ny, nx) : 0;
  let w;
  if (nn > 0) { w = Math.acos(Math.max(-1, Math.min(1, (nx * ex + ny * ey) / (nn * e)))); if (ez < 0) w = -w; } else w = Math.atan2(ey, ex);
  let nu = Math.acos(Math.max(-1, Math.min(1, (ex * rx + ey * ry + ez * rz) / (e * rn)))); if (rv < 0) nu = -nu;
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return { lam: Om + w + (E - e * Math.sin(E)), peri: Om + w, e, lamTrue: Math.atan2(ry, rx) };
}
const IDX = { mercury: 1, venus: 2, earth: 3, mars: 4, jupiter: 5, saturn: 6 };   // 1-based sim.helio index
function integrate(dtDays, years, sampleDays) {
  const sim = makeWH({ gms, Y0: seedY0(), dt: dtDays * DAY, gr: true, order: 2 });
  const stepsPerSample = Math.round(sampleDays / Math.abs(dtDays)), nSamples = Math.round(years * 365.25 / sampleDays);
  const out = [];
  for (let s = 0; s <= nSamples; s++) {
    const tDays = sim.t / DAY;
    const emb = meanLongitude(sim.helio(IDX.earth), GM_SUN + gms[IDX.earth]);
    const lamP = [IDX.mercury, IDX.venus, IDX.earth, IDX.mars, IDX.jupiter, IDX.saturn].map((i) => (i === IDX.earth ? emb.lam : meanLongitude(sim.helio(i), GM_SUN + gms[i]).lam));
    out.push({ tDays, lamE: emb.lam, lamTrueE: emb.lamTrue, eE: emb.e, periE: emb.peri, lamP });
    sim.step(stepsPerSample);
  }
  return out;
}
const unwrapSeq = (arr) => { let off = 0; const o = [arr[0]]; for (let i = 1; i < arr.length; i++) { const d = arr[i] - arr[i - 1]; if (d < -Math.PI) off += 2 * Math.PI; else if (d > Math.PI) off -= 2 * Math.PI; o.push(arr[i] + off); } return o; };

// ── the long-period arguments (multipliers on Me,V,E,Ma,J,S) ─────────────
const ARGS = [
  { name: '4E−8Ma+3J', k: [0, 0, 4, -8, 3, 0] },
  { name: '8V−13E', k: [0, 8, -13, 0, 0, 0] },
  { name: '2J−5S', k: [0, 0, 0, 0, 2, -5] },
  { name: '5V−8E', k: [0, 5, -8, 0, 0, 0] },
];
const argCarrierDeg = (k, T) => k.reduce((s, m, i) => s + m * (ARG_L0[i] + RATES[i] * T), 0);
const periodYr = (k) => Math.abs(360 / k.reduce((s, m, i) => s + m * RATES[i], 0)) * 100;
function lsq(X, y) { const p = X[0].length, n = X.length; const A = Array.from({ length: p }, () => new Float64Array(p)), b = new Float64Array(p); for (let r = 0; r < n; r++) { const x = X[r]; for (let a = 0; a < p; a++) { b[a] += x[a] * y[r]; for (let c = 0; c < p; c++) A[a][c] += x[a] * x[c]; } } const M = A.map((row, a) => [...row, b[a]]); for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r; [M[c], M[piv]] = [M[piv], M[c]]; for (let r = 0; r < p; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= p; k++) M[r][k] -= f * M[c][k]; } } const beta = M.map((row, a) => row[p] / row[a]); let ss = 0; for (let r = 0; r < n; r++) { let pr = 0; for (let a = 0; a < p; a++) pr += beta[a] * X[r][a]; ss += (y[r] - pr) ** 2; } return { beta, sd: Math.sqrt(ss / n) }; }
const w180 = (x) => ((x + 180) % 360 + 360) % 360 - 180;

function run(dtDays, back, fwd, label) {
  const t0 = Date.now();
  const B = integrate(-dtDays, back, 10), F = integrate(dtDays, fwd, 10);
  const samples = [...B.slice(1).reverse(), ...F];
  console.log(`\n${label}: ${samples.length} samples, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const lam = unwrapSeq(samples.map((s) => s.lamE));
  const lamP = [0, 1, 2, 3, 4, 5].map((i) => unwrapSeq(samples.map((s) => s.lamP[i])));
  const argInt = (k, j) => k.reduce((s, m, i) => s + m * lamP[i][j], 0) * R2D;
  const drift = ARGS.map((A) => { const j0 = 0, j1 = samples.length - 1; return { name: A.name, startDeg: w180(argInt(A.k, j0) - argCarrierDeg(A.k, samples[j0].tDays / CY)), endDeg: w180(argInt(A.k, j1) - argCarrierDeg(A.k, samples[j1].tDays / CY)) }; });
  // yearly means of λ_m (arcsec) and of the integrated arguments
  const bins = new Map();
  for (let j = 0; j < samples.length; j++) { const y = Math.floor(samples[j].tDays / 365.25); let b = bins.get(y); if (!b) { b = { n: 0, lam: 0, t: 0, argI: ARGS.map(() => [0, 0]) }; bins.set(y, b); } b.n++; b.lam += lam[j]; b.t += samples[j].tDays; ARGS.forEach((A, a) => { const th = argInt(A.k, j) * D2R; b.argI[a][0] += Math.cos(th); b.argI[a][1] += Math.sin(th); }); }
  const rows = [...bins.values()].filter((b) => b.n >= 30).map((b) => ({ T: b.t / b.n / CY, lamAS: b.lam / b.n * R2D * AS, argI: b.argI.map(([c, s]) => Math.atan2(s / b.n, c / b.n)) }));
  const y = rows.map((r) => r.lamAS);
  const res = {};
  for (const [mode, argOf] of [['carrier', (r, A) => argCarrierDeg(A.k, r.T) * D2R], ['integrated', (r, A, a) => r.argI[a]]]) {
    const X = rows.map((r) => { const x = [1, r.T, r.T * r.T]; ARGS.forEach((A, a) => { const th = argOf(r, A, a); x.push(Math.cos(th), Math.sin(th)); }); return x; });
    const f = lsq(X, y);
    const terms = ARGS.map((A, a) => ({ name: A.name, k: A.k, cosAS: f.beta[3 + 2 * a], sinAS: f.beta[4 + 2 * a], ampAS: Math.hypot(f.beta[3 + 2 * a], f.beta[4 + 2 * a]), carrierPeriodYr: periodYr(A.k) }));
    res[mode] = { secular: f.beta.slice(0, 3), sdAS: f.sd, terms };
    console.log(`  [${mode} arguments] residual sd ${f.sd.toFixed(3)}″  secular b=${f.beta[1].toFixed(3)}″/cy c=${f.beta[2].toFixed(4)}″/cy²`);
    for (const t of terms) console.log(`    ${t.name.padEnd(12)} carrier P ${t.carrierPeriodYr.toFixed(1).padStart(7)} yr  cos ${t.cosAS.toFixed(3).padStart(8)}  sin ${t.sinAS.toFixed(3).padStart(8)}  amp ${t.ampAS.toFixed(3)}″`);
  }
  console.log(`  control: [1,T,T²] only → sd ${lsq(rows.map((r) => [1, r.T, r.T * r.T]), y).sd.toFixed(3)}″`);
  console.log('  carrier-phase drift (integrated − carrier argument, deg): ' + drift.map((d) => `${d.name} ${d.startDeg.toFixed(1)}→${d.endDeg.toFixed(1)}`).join('; '));
  return { label, dtDays, back, fwd, nSamples: samples.length, drift, ...res, samples };
}

const main = run(DTD, BACK, FWD, `main dt ${DTD} d, −${BACK}..+${FWD} yr`);
const ctrlStep = run(DTD / 2, BACK, FWD, `control dt ${DTD / 2} d (convergence)`);
const ctrlWin = run(DTD, 3100, 3100, `control window −3100..+3100`);

// ── optional validation: the integration's TRUE longitude vs a Horizons J2000-ecliptic geocentric-Sun VECTORS table ──
if (HORIZONS && existsSync(HORIZONS)) {
  const J2000 = 2451545.0;
  const txt = readFileSync(HORIZONS, 'utf8');
  const H = new Map(txt.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map((l) => { const c = l.split(','); return [Math.round((Number(c[0]) - J2000) * 10), Math.atan2(Number(c[3]), Number(c[2]))]; }));
  const yb = new Map();
  for (const s of main.samples) { const v = H.get(Math.round(s.tDays * 10)); if (v === undefined) continue; const d = Math.atan2(Math.sin(s.lamTrueE + Math.PI - v), Math.cos(s.lamTrueE + Math.PI - v)) * R2D * AS; const y = Math.floor(s.tDays / 365.25); let b = yb.get(y); if (!b) { b = { n: 0, s: 0, t: 0 }; yb.set(y, b); } b.n++; b.s += d; b.t += s.tDays; }
  const rows = [...yb.values()].filter((b) => b.n >= 4).map((b) => ({ T: b.t / b.n / CY, d: b.s / b.n }));
  const X = rows.map((r) => { const T = r.T, th = argCarrierDeg(ARGS[0].k, T) * D2R; return [1, T, T * T, Math.cos(th), Math.sin(th)]; });
  const f = lsq(X, rows.map((r) => r.d)), f0 = lsq(rows.map((r) => [1, r.T, r.T * r.T]), rows.map((r) => r.d));
  console.log(`\nVALIDATION vs Horizons J2000 vectors (yearly means of integration − Horizons, ${rows.length} yr): secular b ${f.beta[1].toFixed(2)}″/cy c ${f.beta[2].toFixed(4)}″/cy²; 4E−8Ma+3J residual cos ${f.beta[3].toFixed(2)} sin ${f.beta[4].toFixed(2)} amp ${Math.hypot(f.beta[3], f.beta[4]).toFixed(2)}″ (a converged derivation leaves ≪ the term here); sd ${f0.sd.toFixed(2)} → ${f.sd.toFixed(2)}″`);
  for (let c = -3000; c < 3000; c += 1000) { const v = rows.filter((r) => r.T * 100 + 2000 >= c && r.T * 100 + 2000 < c + 1000); const m = v.reduce((s, r) => s + r.d, 0) / v.length; console.log(`  ${String(c).padStart(5)}..${c + 1000}: mean(int − H) ${m.toFixed(1)}″`); }
}
const strip = (r) => { const { samples, ...rest } = r; return rest; };
writeFileSync(HERE + 'i2-long-inequality.local.json', JSON.stringify({ main: strip(main), ctrlStep: strip(ctrlStep), ctrlWin: strip(ctrlWin), RATES, RATES_OFDATE, P0_DEG_PER_CY, ARG_L0 }, null, 1));
console.log('\n→ tools/explore/i2-long-inequality.local.json');
