// FQ-5 N2 — Sun-completion carrier re-derivation (plan §12i FQ-5 N2).
//
// QUESTION: can the 68-term derived planetary table ride FRAMEWORK-native
// mean-longitude carriers (rates from the model's own planet records, the
// E0 computation) instead of the IAU-class instrument literals, with the
// amplitudes RE-EXTRACTED on the new carriers?
//
// KEY POINT (pre-registered): the derived signal comes from the framework
// 8-body lab — its tones sit at the FRAMEWORK synodic frequencies. The
// shipped table projected that signal onto IAU-rate carriers, absorbing
// the small rate mismatch across the 200-yr window. Projecting onto the
// framework carriers is projection onto the signal's NATURAL basis.
// EXPECTATIONS (before running):
//   (a) the control (instrument rates) reproduces the shipped extraction
//       (pass-2 residual ≈ 0.64″, top terms ≡ d2-sun-table.local.json);
//   (b) framework-carrier fidelity ≤ the control (natural basis);
//   (c) the V−E family amplitudes shift at the ≤1″ class (E0's measured
//       0.66″ blind-swap cost goes to zero by re-fit, by construction).
// Fit target is our OWN derivation (d2-derived-sun-signal.local.json);
// JPL never enters this fit — the JPL preview belongs to the N3 swap event.
//
// Usage: node tools/explore/n2-sun-framework-carriers.mjs

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));

const SIG = JSON.parse(readFileSync(HERE + 'd2-derived-sun-signal.local.json', 'utf8'));
const D2R = Math.PI / 180;
const N = SIG.dlP.length;
const jdAt = (i) => SIG.jd0 + i * SIG.stride;

// ── the two carrier rate sets ────────────────────────────────────────────
// instrument literals (the shipped ARG_L1 of sun-planetary-completion.cjs)
const RATES_LIT = { lMe: 149472.674, lV: 58517.815676, lE: 36000.769780, lM: 19141.696300, lJ: 3036.302389, lS: 1223.511013 };
// framework-native rates — the E0 computation (e3b-argument-attribution.mjs):
// lE = one revolution per framework tropical year; planets = one revolution
// per the model's own tropical (equinox-referenced) period input.
const { createModel } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TL = require('../lib/constants.js');
const CY = 36525;
const degPerCy = (cyclesPerDay) => 360 * CY * cyclesPerDay;
const RATES_FW = { lE: degPerCy(1 / TL.meanSolarYearDays) };
for (const [key, name] of Object.entries({ lMe: 'mercury', lV: 'venus', lM: 'mars', lJ: 'jupiter', lS: 'saturn' })) {
  RATES_FW[key] = degPerCy(1 / model.planets.record(name).solarYearInput);
}

const ZEROS = { lMe: 252.250906, lV: 181.979801, lE: 100.466457, lM: 355.433000, lJ: 34.351519, lS: 50.077444 };
const PERI = { Me: 77.456, V: 131.564, E: 102.937, M: 336.060, J: 14.331, S: 93.057 };
const makeArgOf = (RATES) => (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const a = {};
  for (const k of Object.keys(RATES)) a[k] = (ZEROS[k] + RATES[k] * T) * D2R;
  a.MV = a.lV - PERI.V * D2R; a.ME = a.lE - PERI.E * D2R; a.MMa = a.lM - PERI.M * D2R;
  a.MJ = a.lJ - PERI.J * D2R; a.MS = a.lS - PERI.S * D2R; a.MMe = a.lMe - PERI.Me * D2R;
  return a;
};

/** @type {Array<[string,(a:any)=>number,string]>} */
const MAINS = [
  ['V-E', (a) => a.lV - a.lE, 'V'], ['2(V-E)', (a) => 2 * (a.lV - a.lE), 'V'], ['3(V-E)', (a) => 3 * (a.lV - a.lE), 'V'],
  ['2V-3E', (a) => 2 * a.lV - 3 * a.lE, 'V'], ['3V-4E', (a) => 3 * a.lV - 4 * a.lE, 'V'],
  ['E-J', (a) => a.lE - a.lJ, 'J'], ['2(E-J)', (a) => 2 * (a.lE - a.lJ), 'J'], ['E-2J', (a) => a.lE - 2 * a.lJ, 'J'],
  ['2E-3J', (a) => 2 * a.lE - 3 * a.lJ, 'J'],
  ['E-M', (a) => a.lE - a.lM, 'M'], ['2(E-M)', (a) => 2 * (a.lE - a.lM), 'M'], ['2E-3M', (a) => 2 * a.lE - 3 * a.lM, 'M'],
  ['2M-E', (a) => 2 * a.lM - a.lE, 'M'], ['2(2M-E)', (a) => 2 * (2 * a.lM - a.lE), 'M'],
  ['E-S', (a) => a.lE - a.lS, 'S'], ['2(E-S)', (a) => 2 * (a.lE - a.lS), 'S'],
  ['E-Me', (a) => a.lE - a.lMe, 'Me'], ['2(E-Me)', (a) => 2 * (a.lE - a.lMe), 'Me'],
  ['V-2E+M', (a) => a.lV - 2 * a.lE + a.lM, 'V'],
];
const MOD = { V: 'MV', E: 'ME', M: 'MMa', J: 'MJ', S: 'MS', Me: 'MMe' };

function fit(catalog, argOf) {
  const K = 2 * catalog.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < N; i += 2) {
    const a = argOf(jdAt(i));
    for (let c = 0; c < catalog.length; c++) {
      const th = catalog[c][1](a);
      row[2 * c] = Math.cos(th); row[2 * c + 1] = Math.sin(th);
    }
    const y = SIG.dlP[i];
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b[k] += rk * y; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
    out[c] = s / Gm[c][c];
  }
  let ss = 0, n2 = 0;
  for (let i = 0; i < N; i += 2) {
    const a = argOf(jdAt(i));
    let f = 0;
    for (let c = 0; c < catalog.length; c++) {
      const th = catalog[c][1](a);
      f += out[2 * c] * Math.cos(th) + out[2 * c + 1] * Math.sin(th);
    }
    ss += (SIG.dlP[i] - f) ** 2; n2++;
  }
  return { x: out, rms: Math.sqrt(ss / n2) };
}

function runVariant(label, RATES) {
  const argOf = makeArgOf(RATES);
  const f1 = fit(MAINS, argOf);
  const bigs = [];
  for (let c = 0; c < MAINS.length; c++) {
    const am = Math.hypot(f1.x[2 * c], f1.x[2 * c + 1]);
    if (am >= 0.25) bigs.push(MAINS[c]);
  }
  /** @type {Array<[string,(a:any)=>number]>} */
  const catalog2 = MAINS.map((m) => [m[0], m[1]]);
  for (const [nm, fn, pk] of bigs) {
    const mk = MOD[pk];
    catalog2.push([`${nm}+${mk}`, (a) => fn(a) + a[mk]], [`${nm}-${mk}`, (a) => fn(a) - a[mk]]);
    catalog2.push([`${nm}+ME`, (a) => fn(a) + a.ME], [`${nm}-ME`, (a) => fn(a) - a.ME]);
  }
  const f2 = fit(catalog2, argOf);
  const table = [];
  for (let c = 0; c < catalog2.length; c++) {
    const co = f2.x[2 * c], si = f2.x[2 * c + 1], am = Math.hypot(co, si);
    if (am >= 0.05) table.push({ name: catalog2[c][0], cos: co, sin: si, amp: am });
  }
  table.sort((a, b) => b.amp - a.amp);
  console.log(`${label}: pass-1 ${f1.rms.toFixed(3)}″ · pass-2 (${catalog2.length} terms) ${f2.rms.toFixed(3)}″ · ${table.length} terms ≥ 0.05″`);
  const fullTerms = catalog2.map((c, i) => ({ th: c[1], cos: f2.x[2 * i], sin: f2.x[2 * i + 1] }));
  return { table, rms: f2.rms, fullTerms };
}

const rms0 = Math.sqrt(SIG.dlP.reduce((s, v) => s + v * v, 0) / N);
console.log(`N2 — sun-completion carriers: instrument vs framework (signal RMS ${rms0.toFixed(2)}″, ${N} samples, 200 yr)`);
console.log('framework rates (°/cy):', Object.fromEntries(Object.entries(RATES_FW).map(([k, v]) => [k, +v.toFixed(6)])));
const ctl = runVariant('CONTROL (instrument rates)', RATES_LIT);
const fwv = runVariant('FRAMEWORK carriers       ', RATES_FW);

console.log('\ntop-12 term comparison (amp″, control → framework):');
for (const t of ctl.table.slice(0, 12)) {
  const m = fwv.table.find((u) => u.name === t.name);
  console.log(`  ${t.name.padEnd(12)} ${t.amp.toFixed(3).padStart(7)} → ${(m ? m.amp : NaN).toFixed(3).padStart(7)}  Δ ${(m ? m.amp - t.amp : NaN).toFixed(3)}`);
}
console.log(`\nVERDICT: framework-carrier fidelity ${fwv.rms.toFixed(3)}″ vs control ${ctl.rms.toFixed(3)}″ — ${fwv.rms <= ctl.rms + 0.01 ? 'the framework basis fits the derived signal AS WELL OR BETTER ✓' : 'the framework basis fits WORSE ✗ (investigate before N3)'}`);

// ── conditioning probe: do the two composed tables represent the same
// function, or is the sideband repartition unstable? In-window they agree
// by construction (both fit the same signal); the discriminator is
// EXTRAPOLATION — evaluate both composed tables on ±300 yr and difference.
{
  const evalTable = (variant, jd) => {
    const a = variant.argOf(jd);
    let f = 0;
    for (const t of variant.full) f += t.cos * Math.cos(t.th(a)) + t.sin * Math.sin(t.th(a));
    return f;
  };
  const A = { argOf: makeArgOf(RATES_LIT), full: ctl.fullTerms };
  const B = { argOf: makeArgOf(RATES_FW), full: fwv.fullTerms };
  const spanStats = (jdLo, jdHi) => {
    let ss = 0, n = 0;
    for (let jd = jdLo; jd <= jdHi; jd += 20) {
      const d = evalTable(A, jd) - evalTable(B, jd);
      ss += d * d; n++;
    }
    return Math.sqrt(ss / n);
  };
  const jdMid = SIG.jd0 + (N * SIG.stride) / 2;
  console.log('composed-table difference (control vs framework), RMS ″:');
  console.log(`  in-window  (fit span):          ${spanStats(SIG.jd0, SIG.jd0 + (N - 1) * SIG.stride).toFixed(3)}`);
  console.log(`  ±300 yr around the window mid:  ${spanStats(jdMid - 300 * 365.25, jdMid + 300 * 365.25).toFixed(3)}`);
  console.log(`  ±600 yr:                        ${spanStats(jdMid - 600 * 365.25, jdMid + 600 * 365.25).toFixed(3)}`);
}
