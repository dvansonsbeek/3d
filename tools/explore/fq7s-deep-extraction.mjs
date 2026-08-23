// FQ-7-SUN S1 — the deeper completion extraction (plan §12i, the
// FQ-7-Sun round; owner "please proceed").
//
// TARGET: the v3 table's 0.614″ table-vs-signal fidelity floor. The
// sun-dust census located missing structure at higher synodic multiples
// and SECOND-ORDER sidebands (main ± 2M_E / ± 2·own-modulator) — classes
// the v3 catalog never enumerated (its sidebands stop at first order and
// only for mains ≥ 0.25″).
//
// MEASURED CAVEAT (this instrument's first run): re-reading the SAME
// banked signal moves fidelity only 0.614 → 0.546″ — the census's ~0.6″
// JPL structure is mostly the SIGNAL-vs-reality gap (the D2 record's
// 0.60″ combined residual), so the round's real lever is a signal
// upgrade (fq7s variant of d2-derived-sun), with this deeper catalog
// then reading the better signal.
//
// Catalog entries are carried in the SHIPPED TERMS vector form
// ([6 l-multipliers Me,V,E,Ma,J,S], [6 M-multipliers]) so the output is
// landable and previewable through the exact package evaluator.
// CONTROL: the v3 recipe reproduced first (must read 0.614″ on the
// banked signal). JPL never enters this fit.
//
// Usage: node tools/explore/fq7s-deep-extraction.mjs [signal=d2-derived-sun-signal.local.json] [out=fq7s-deep-table.local.json]

import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

const SIG_FILE = process.argv[2] || 'd2-derived-sun-signal.local.json';
const OUT_FILE = process.argv[3] || 'fq7s-deep-table.local.json';
const SIG = JSON.parse(readFileSync(HERE + SIG_FILE, 'utf8'));
const D2R = Math.PI / 180;
// optional interior fit window (Julian years), e.g. 1900 2100 — extracts
// on the signal's interior so t0 IC transients and window edges stay out
const YR_LO = process.argv[4] ? parseFloat(process.argv[4]) : null;
const YR_HI = process.argv[5] ? parseFloat(process.argv[5]) : null;
const MIN_AMP = process.argv[6] ? parseFloat(process.argv[6]) : 0.05;   // ensemble members save deeper (cutoff applied after averaging)
const jdOfYr = (y) => 2451545.0 + (y - 2000) * 365.25;
let I0 = 0, I1 = SIG.dlP.length;
if (YR_LO !== null && YR_HI !== null) {
  I0 = Math.max(0, Math.ceil((jdOfYr(YR_LO) - SIG.jd0) / SIG.stride));
  I1 = Math.min(SIG.dlP.length, Math.floor((jdOfYr(YR_HI) - SIG.jd0) / SIG.stride));
  console.log(`interior fit window: ${YR_LO}–${YR_HI} (samples ${I0}…${I1} of ${SIG.dlP.length})`);
}
const N = I1 - I0;
const jdAt = (i) => SIG.jd0 + (I0 + i) * SIG.stride;
const dlAt = (i) => SIG.dlP[I0 + i];

// ── the v3 framework carriers (unchanged — the matched pair) ────────────
const { createModel } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
const TL = require('../lib/constants.js');
const CY = 36525;
const degPerCy = (cyclesPerDay) => 360 * CY * cyclesPerDay;
// body order: Me V E Ma J S (the shipped ARG order)
const L1 = [
  degPerCy(1 / model.planets.record('mercury').solarYearInput),
  degPerCy(1 / model.planets.record('venus').solarYearInput),
  degPerCy(1 / TL.meanSolarYearDays),
  degPerCy(1 / model.planets.record('mars').solarYearInput),
  degPerCy(1 / model.planets.record('jupiter').solarYearInput),
  degPerCy(1 / model.planets.record('saturn').solarYearInput),
];
const L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
const IX = { Me: 0, V: 1, E: 2, Ma: 3, J: 4, S: 5 };

// angle of a (kl, kM) entry at jd
const thetaAt = (kl, kM, jd) => {
  const T = (jd - 2451545.0) / 36525;
  let th = 0;
  for (let i = 0; i < 6; i++) {
    const l = (L0[i] + L1[i] * T) * D2R;
    th += kl[i] * l + kM[i] * (l - PERI[i] * D2R);
  }
  return th;
};
const rateOf = (kl, kM) => {
  let r = 0;
  for (let i = 0; i < 6; i++) r += (kl[i] + kM[i]) * L1[i];
  return r;
};

// catalog builder: mains as {name, kl} — sidebands add kM
const mk = (name, spec) => {
  const kl = [0, 0, 0, 0, 0, 0];
  for (const [body, k] of Object.entries(spec)) kl[IX[body]] += k;
  return { name, kl, kM: [0, 0, 0, 0, 0, 0], modBody: null };
};
/** v3 mains, with the modulator body recorded */
const M3 = [
  [mk('V-E', { V: 1, E: -1 }), 'V'], [mk('2(V-E)', { V: 2, E: -2 }), 'V'], [mk('3(V-E)', { V: 3, E: -3 }), 'V'],
  [mk('2V-3E', { V: 2, E: -3 }), 'V'], [mk('3V-4E', { V: 3, E: -4 }), 'V'],
  [mk('E-J', { E: 1, J: -1 }), 'J'], [mk('2(E-J)', { E: 2, J: -2 }), 'J'], [mk('E-2J', { E: 1, J: -2 }), 'J'],
  [mk('2E-3J', { E: 2, J: -3 }), 'J'],
  [mk('E-Ma', { E: 1, Ma: -1 }), 'Ma'], [mk('2(E-Ma)', { E: 2, Ma: -2 }), 'Ma'], [mk('2E-3Ma', { E: 2, Ma: -3 }), 'Ma'],
  [mk('2Ma-E', { Ma: 2, E: -1 }), 'Ma'], [mk('2(2Ma-E)', { Ma: 4, E: -2 }), 'Ma'],
  [mk('E-S', { E: 1, S: -1 }), 'S'], [mk('2(E-S)', { E: 2, S: -2 }), 'S'],
  [mk('E-Me', { E: 1, Me: -1 }), 'Me'], [mk('2(E-Me)', { E: 2, Me: -2 }), 'Me'],
  [mk('V-2E+Ma', { V: 1, E: -2, Ma: 1 }), 'V'],
];
const MD = [
  ...M3,
  [mk('4(V-E)', { V: 4, E: -4 }), 'V'], [mk('5(V-E)', { V: 5, E: -5 }), 'V'], [mk('6(V-E)', { V: 6, E: -6 }), 'V'],
  [mk('3V-5E', { V: 3, E: -5 }), 'V'], [mk('4V-5E', { V: 4, E: -5 }), 'V'], [mk('4V-6E', { V: 4, E: -6 }), 'V'],
  [mk('3(E-J)', { E: 3, J: -3 }), 'J'], [mk('4(E-J)', { E: 4, J: -4 }), 'J'], [mk('3E-4J', { E: 3, J: -4 }), 'J'],
  [mk('3(E-Ma)', { E: 3, Ma: -3 }), 'Ma'], [mk('3(2Ma-E)', { Ma: 6, E: -3 }), 'Ma'], [mk('3E-4Ma', { E: 3, Ma: -4 }), 'Ma'],
  [mk('3(E-S)', { E: 3, S: -3 }), 'S'],
  [mk('3(E-Me)', { E: 3, Me: -3 }), 'Me'],
  [mk('2(V-2E+Ma)', { V: 2, E: -4, Ma: 2 }), 'V'],
  [mk('V-2E+J', { V: 1, E: -2, J: 1 }), 'V'],
  [mk('V-2E+S', { V: 1, E: -2, S: 1 }), 'V'],
];

// the d2 extended-family basis as in-window absorbers: a signal projected
// on a LONGER grid re-exposes family content inside a subwindow, so the
// fit must re-absorb it locally (measured: 2.07″ control without this)
const FAM = 15;
const famRow = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const Dm = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  const L = (100.46646 + 36000.7698 * T) * D2R;
  const sL = Math.sin(L), cL = Math.cos(L), s2L = Math.sin(2 * L), c2L = Math.cos(2 * L);
  return [1, Math.sin(Dm), Math.cos(Dm), T, T * T, sL, cL, s2L, c2L, T * sL, T * cL, T * s2L, T * c2L, T * T * sL, T * T * cL];
};

function fit(entries) {
  const K = 2 * entries.length + FAM;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < N; i += 2) {
    const jd = jdAt(i);
    for (let c = 0; c < entries.length; c++) {
      const th = thetaAt(entries[c].kl, entries[c].kM, jd);
      row[2 * c] = Math.cos(th); row[2 * c + 1] = Math.sin(th);
    }
    const fr = famRow(jd);
    for (let k = 0; k < FAM; k++) row[2 * entries.length + k] = fr[k];
    const y = dlAt(i);
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
    const jd = jdAt(i);
    let f = 0;
    for (let c = 0; c < entries.length; c++) {
      const th = thetaAt(entries[c].kl, entries[c].kM, jd);
      f += out[2 * c] * Math.cos(th) + out[2 * c + 1] * Math.sin(th);
    }
    const fr = famRow(jd);
    for (let k = 0; k < FAM; k++) f += out[2 * entries.length + k] * fr[k];
    ss += (dlAt(i) - f) ** 2; n2++;
  }
  return { x: out, rms: Math.sqrt(ss / n2) };
}

const sideband = (e, body, k, tag) => {
  const kM = e.kM.slice();
  kM[IX[body]] += k;
  return { name: `${e.name}${k > 0 ? '+' : '-'}${Math.abs(k) > 1 ? Math.abs(k) : ''}M${body}`, kl: e.kl, kM, modBody: null, tag };
};

// ── CONTROL: the v3 recipe (first-order sidebands, mains ≥ 0.25″) ──────
{
  const mains = M3.map(([e]) => e);
  const f1 = fit(mains);
  const cat2 = mains.slice();
  M3.forEach(([e, modBody], c) => {
    if (Math.hypot(f1.x[2 * c], f1.x[2 * c + 1]) < 0.25) return;
    cat2.push(sideband(e, modBody, 1), sideband(e, modBody, -1));
    if (modBody !== 'E') cat2.push(sideband(e, 'E', 1), sideband(e, 'E', -1));
  });
  const f2 = fit(cat2);
  console.log(`CONTROL (v3 recipe): pass-2 ${f2.rms.toFixed(3)}″  [record: 0.614″]`);
}

// ── DEEP: widened mains, sidebands to 0.08″, second order ───────────────
const mainsD = MD.map(([e]) => e);
const f1 = fit(mainsD);
console.log(`DEEP pass-1 (${mainsD.length} mains): ${f1.rms.toFixed(3)}″`);
const catD = mainsD.slice();
MD.forEach(([e, modBody], c) => {
  if (Math.hypot(f1.x[2 * c], f1.x[2 * c + 1]) < 0.08) return;
  catD.push(sideband(e, modBody, 1), sideband(e, modBody, -1));
  catD.push(sideband(e, modBody, 2), sideband(e, modBody, -2));
  if (modBody !== 'E') {
    catD.push(sideband(e, 'E', 1), sideband(e, 'E', -1));
    catD.push(sideband(e, 'E', 2), sideband(e, 'E', -2));
  }
});
// duplicate/degenerate screen: identical rounded rate → keep first
const kept = [];
const seenRate = [];
let dropped = 0;
// family-tone rates: a sideband combo can COLLAPSE onto lE/2lE/D
// algebraically (e.g. 2(V−E)−2M_V ≡ −2lE + 2ϖ_V — measured as a 155″
// monster) — those tones belong to the family absorbers, not the table
const FAMILY_RATES = [36000.7698, 2 * 36000.7698, 445267.1114];
for (const e of catD) {
  const r = Math.abs(rateOf(e.kl, e.kM));   // ±θ is the same tone — compare |rate|
  if (r < 4) { dropped++; continue; }
  if (FAMILY_RATES.some((fr) => Math.abs(fr - r) < 25)) { dropped++; continue; }
  if (seenRate.some((rr) => Math.abs(rr - r) < 25)) { dropped++; continue; }  // sub-resolution degenerates (monster-amp pairs at <10 °/cy, measured)
  kept.push(e); seenRate.push(r);
}
console.log(`DEEP catalog: ${catD.length} → ${kept.length} (${dropped} duplicate/sub-window dropped)`);
const f2 = fit(kept);
console.log(`DEEP pass-2: ${f2.rms.toFixed(3)}″  [v3 fidelity 0.614″]`);

const terms = [];
for (let c = 0; c < kept.length; c++) {
  const co = f2.x[2 * c], si = f2.x[2 * c + 1], am = Math.hypot(co, si);
  if (am >= MIN_AMP) terms.push({ name: kept[c].name, kl: kept[c].kl, kM: kept[c].kM, cos: +co.toFixed(4), sin: +si.toFixed(4), amp: am });
}
terms.sort((a, b) => b.amp - a.amp);
console.log(`terms ≥ 0.05″: ${terms.length} (v3: 70) · leaders:`);
for (const t of terms.slice(0, 15)) console.log(`  ${t.name.padEnd(14)} ${t.amp.toFixed(3)}″`);

writeFileSync(HERE + OUT_FILE, JSON.stringify({
  signal: SIG_FILE, carriers: 'v3 framework (unchanged)',
  signalRms: Math.sqrt(Array.from({ length: N }, (_, i) => dlAt(i)).reduce((s, v) => s + v * v, 0) / N),
  pass2Rms: f2.rms, terms,
}, null, 1));
console.log(`\nwrote tools/explore/${OUT_FILE}`);
