// STAGE D2 PHASE C — extract the SHIPPABLE analytic table from the
// derived Sun signal (LANDED — its d2-sun-table.local.json terms are the
// shipped TERMS of eclipse/sun-planetary-completion.cjs v2).
// Fit target: d2-derived-sun-signal.local.json (the 200-yr grid-projected
// planetary signal from d2-derived-sun.mjs). Fitting our OWN derivation —
// the values stay fully derived; JPL never enters this fit.
// Catalog: main planetary tones + eccentricity-modulation sidebands
// (main ± mean anomaly of the modulating planet, and ± M_E for the
// Earth-side split). Acceptance: table residual vs the signal ≤ 0.5″.
// Usage: node tools/explore/d2-sun-table-extraction.mjs
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));

const SIG = JSON.parse(readFileSync(HERE + 'd2-derived-sun-signal.local.json', 'utf8'));
const D2R = Math.PI / 180;
const N = SIG.dlP.length;
const jdAt = (i) => SIG.jd0 + i * SIG.stride;

// mean longitudes (instrument rates) + mean anomalies (framework J2000 ϖ)
const RATES = { lMe: 149472.674, lV: 58517.815676, lE: 36000.769780, lM: 19141.696300, lJ: 3036.302389, lS: 1223.511013 };
const ZEROS = { lMe: 252.250906, lV: 181.979801, lE: 100.466457, lM: 355.433000, lJ: 34.351519, lS: 50.077444 };
const PERI = { Me: 77.456, V: 131.564, E: 102.937, M: 336.060, J: 14.331, S: 93.057 };
const argOf = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const a = {};
  for (const k of Object.keys(RATES)) a[k] = (ZEROS[k] + RATES[k] * T) * D2R;
  a.MV = a.lV - PERI.V * D2R; a.ME = a.lE - PERI.E * D2R; a.MMa = a.lM - PERI.M * D2R;
  a.MJ = a.lJ - PERI.J * D2R; a.MS = a.lS - PERI.S * D2R; a.MMe = a.lMe - PERI.Me * D2R;
  return a;
};

/** @type {Array<[string,(a:any)=>number,string]>} name, argFn, modulator planet key */
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

function fit(catalog) {
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
  // residual RMS on the full grid
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

const rms0 = Math.sqrt(SIG.dlP.reduce((s, v) => s + v * v, 0) / N);
console.log(`signal RMS: ${rms0.toFixed(2)}″  (${N} grid samples, 200 yr)`);

// pass 1: mains only
const f1 = fit(MAINS);
console.log(`pass 1 (${MAINS.length} mains): residual ${f1.rms.toFixed(2)}″`);
const bigs = [];
for (let c = 0; c < MAINS.length; c++) {
  const am = Math.hypot(f1.x[2 * c], f1.x[2 * c + 1]);
  if (am >= 0.25) bigs.push(MAINS[c]);
}

// pass 2: mains + sidebands (± modulator anomaly, ± M_E) for the big mains
/** @type {Array<[string,(a:any)=>number]>} */
const catalog2 = MAINS.map((m) => [m[0], m[1]]);
for (const [nm, fn, pk] of bigs) {
  const mk = MOD[pk];
  catalog2.push([`${nm}+${mk}`, (a) => fn(a) + a[mk]], [`${nm}-${mk}`, (a) => fn(a) - a[mk]]);
  catalog2.push([`${nm}+ME`, (a) => fn(a) + a.ME], [`${nm}-ME`, (a) => fn(a) - a.ME]);
}
const f2 = fit(catalog2);
console.log(`pass 2 (${catalog2.length} terms incl. sidebands): residual ${f2.rms.toFixed(2)}″`);

// report + dump the table (terms ≥ 0.05″)
const table = [];
for (let c = 0; c < catalog2.length; c++) {
  const co = f2.x[2 * c], si = f2.x[2 * c + 1], am = Math.hypot(co, si);
  if (am >= 0.05) table.push({ name: catalog2[c][0], cos: co, sin: si, amp: am });
}
table.sort((a, b) => b.amp - a.amp);
console.log(`\nDERIVED TABLE: ${table.length} terms ≥ 0.05″`);
for (const t of table.slice(0, 30)) console.log(`  ${t.name.padEnd(12)} cos ${t.cos.toFixed(3).padStart(7)}  sin ${t.sin.toFixed(3).padStart(7)}  amp ${t.amp.toFixed(3)}`);
writeFileSync(HERE + 'd2-sun-table.local.json', JSON.stringify({ terms: table }, null, 1));
console.log('dumped → d2-sun-table.local.json');
