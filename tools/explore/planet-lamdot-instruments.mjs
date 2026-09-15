// C2 measurement instruments over the per-planet λ̇ channels (plan 02
// §11, owner-approved 2026-09-15). Explore class — reads the 20-Myr GR
// dump directly and MEASURES, writes nothing:
//   1. The Jupiter–Saturn great inequality and the Uranus–Neptune
//      near-2:1: the oscillation actually present in each raw λ̇
//      residual (dominant-period via autocorrelation peak + amplitude),
//      beside the beat predictions from the J2000 rates and the
//      literature class (~880–900 yr / ~4,230 yr).
//   2. Per-planet Kepler-III closure: n(t)²·a(t)³ relative drift at
//      constant GM — a conservation instrument beside the run's banked
//      dE; the residual is the real planet-to-planet exchange.
//   3. Era-window λ̇ slopes (±12 kyr) per planet — the constant-GM
//      epoch drift the panel's lamRel tier displays.
// Run: node tools/explore/planet-lamdot-instruments.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DUMP = path.join(ROOT, 'tools', 'explore', 'lattice-long-window-ecliptic-20000000-gr.local.json');
const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

if (!fs.existsSync(DUMP)) { console.error('dump missing — see secular-series.js header'); process.exit(1); }
console.log('reading the 20-Myr GR dump …');
const D = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
const CHAIN_FREQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-frequencies.json'), 'utf8'));
const tR = D.t, NR = tR.length, rDt = (tR[NR - 1] - tR[0]) / (NR - 1);

// per-planet raw λ̇ at step midpoints (the generator's wrap recipe)
function rawLamDot(pl) {
  const winN = pl === 'earth' ? 360 / 1.0000175 : CHAIN_FREQ.windowElementRates[pl].meanMotionDegPerYr;
  const L = D.elements[pl].L;
  const expRev = rDt * winN / 360;
  const raw = new Float64Array(NR - 1);
  for (let i = 1; i < NR; i++) {
    let f = (L[i] - L[i - 1]) / 360;
    f -= Math.floor(f);
    const k = Math.round(expRev - f);
    raw[i - 1] = ((k + f) * 360) / rDt;
  }
  return raw;
}

const mean = (a) => { let s = 0; for (const v of a) s += v; return s / a.length; };

// dominant oscillation of a residual series via the autocorrelation's
// first strong positive peak (period) + rms→amplitude (√2·rms for a
// near-sinusoid); searched in a lag band around the expected beat.
function dominantOscillation(res, lagMinYr, lagMaxYr) {
  const m = mean(res);
  const x = res.map((v) => v - m);
  const n = x.length;
  const iMin = Math.max(2, Math.floor(lagMinYr / rDt)), iMax = Math.min(n - 2, Math.ceil(lagMaxYr / rDt));
  let best = { lag: 0, r: -2 };
  for (let lag = iMin; lag <= iMax; lag++) {
    let s = 0, s0 = 0, s1 = 0;
    for (let i = 0; i + lag < n; i++) { s += x[i] * x[i + lag]; s0 += x[i] * x[i]; s1 += x[i + lag] * x[i + lag]; }
    const r = s / Math.sqrt(s0 * s1);
    if (r > best.r) best = { lag, r };
  }
  // parabolic refinement on the correlation peak
  const at = (lag) => {
    let s = 0, s0 = 0, s1 = 0;
    for (let i = 0; i + lag < n; i++) { s += x[i] * x[i + lag]; s0 += x[i] * x[i]; s1 += x[i + lag] * x[i + lag]; }
    return s / Math.sqrt(s0 * s1);
  };
  const rm = at(best.lag - 1), rp = at(best.lag + 1);
  const frac = 0.5 * (rm - rp) / (rm - 2 * best.r + rp);
  const rms = Math.sqrt(mean(x.map((v) => v * v)));
  return { periodYr: (best.lag + (Number.isFinite(frac) ? frac : 0)) * rDt, corr: best.r, ampRel: Math.SQRT2 * rms };
}

// ── 1. the two celebrated near-commensurabilities, measured ──
console.log('\n— resonant oscillations measured in the raw λ̇ (era slice ±50 kyr, detrended) —');
const slice = (arr, t1, t2) => {
  const out = [];
  for (let i = 0; i < NR - 1; i++) { const t = tR[0] + (i + 0.5) * rDt; if (t >= t1 && t <= t2) out.push(arr[i]); }
  return out;
};
const lamJ = rawLamDot('jupiter'), lamS = rawLamDot('saturn'), lamU = rawLamDot('uranus'), lamN = rawLamDot('neptune');
const v = ART.verdict.planetLamDot;
for (const [name, arr, n0, band, lit, predicted] of [
  ['jupiter GI', lamJ, 30.3489, [500, 1500], '~880–900 yr (literature)', v.greatInequalityYr],
  ['saturn  GI', lamS, 12.2215, [500, 1500], '~880–900 yr (literature)', v.greatInequalityYr],
  ['uranus  U–N', lamU, 4.2851, [2500, 7000], '~4,230 yr (literature)', v.uranusNeptuneBeatYr],
  ['neptune U–N', lamN, 2.1846, [2500, 7000], '~4,230 yr (literature)', v.uranusNeptuneBeatYr],
]) {
  const s = slice(arr, -50000, 50000).map((x) => x / n0);
  const d = dominantOscillation(s, band[0], band[1]);
  console.log(`  ${name}: dominant period ${d.periodYr.toFixed(1)} yr (autocorr ${d.corr.toFixed(3)}) · amplitude ${(d.ampRel * 1e6).toFixed(1)} ppm of n · beat prediction ${predicted.toFixed(1)} yr · ${lit}`);
}

// ── 2. Kepler-III closure per planet: n²a³ relative drift ──
console.log('\n— Kepler-III closure n(t)²·a(t)³ at constant GM (2-kyr boxcar; max |ΔC/C| over ±10 Myr) —');
const box = Math.max(1, Math.round(2000 / rDt));
for (const pl of PLANETS) {
  const raw = rawLamDot(pl);
  const a = D.elements[pl].a;
  const C = new Float64Array(NR - 1);
  for (let i = 0; i < NR - 1; i++) {
    const aMid = 0.5 * (a[i] + a[i + 1]);
    C[i] = raw[i] * raw[i] * aMid * aMid * aMid;
  }
  // boxcar
  const Cs = [];
  for (let i = 0; i + box <= NR - 1; i += box) {
    let s = 0; for (let j = i; j < i + box; j++) s += C[j];
    Cs.push(s / box);
  }
  const C0 = Cs[Math.floor(Cs.length / 2)];
  let maxDev = 0;
  for (const c of Cs) maxDev = Math.max(maxDev, Math.abs(c / C0 - 1));
  console.log(`  ${pl.padEnd(8)} max |ΔC/C| ${maxDev.toExponential(2)}   (run's banked max dE ${D.conservation[0].maxDE.toExponential(2)})`);
}

// ── 3. era-window λ̇ drift per planet (what the panel's lamRel shows) ──
console.log('\n— banked lamRel ranges (from the artifact) —');
for (const r of v.rows) {
  console.log(`  ${r.body.padEnd(8)} ±12 kyr [${r.relRange12Kyr[0].toFixed(9)}, ${r.relRange12Kyr[1].toFixed(9)}] · ±10 Myr [${r.relRange10Myr[0].toFixed(9)}, ${r.relRange10Myr[1].toFixed(9)}] · era-window split vs chain winN ${r.vsChainWinNPpm} ppm`);
}
console.log('\ndone — measurement only, nothing written.');
