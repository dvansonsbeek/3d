// FQ-5 N3 — the carrier-swap preview (plan §12i FQ-5 N3 gates (i)+(ii)).
//
// Candidate: the Sun completion on FRAMEWORK carriers (rates from the
// model's own planet records) with the amplitudes RE-EXTRACTED on them
// (the N2 fit, reproduced inline). Control: the SHIPPED module.
// Gates previewed here:
//   (i)  BCE arbitration — Δcompletion at the 9 ancient audit presets,
//        decomposed as constant (ΔT-degenerate) + linear trend
//        (ΔT-drift class) + detrended sd (the falsifiable part);
//   (ii) all-phase JPL Sun (1,600-epoch cache, the d2-joint-preview
//        convention) + the 179-syzygy elongation fleet (Moon treatment
//        IDENTICAL on both sides, so its convention cancels in the Δ).
// Centerlines sit in-window where the two composed tables agree at
// 0.146″ RMS (N2 conditioning probe) — verified with the real api gate
// at the landing, not previewed here.
//
// Usage: node tools/explore/n3-carrier-swap-preview.mjs

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = await import(new URL('../../packages/physics/src/eclipse/sun-planetary-completion.cjs', import.meta.url).href).then((m) => m.default ?? m);

const model = createModel(DEFAULT_CONSTANTS);
const C = DEFAULT_CONSTANTS;
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const LP = C.moon.moonMeeusLpCorrection;
const Nnut = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((d + 540) % 360) - 180;
const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; const r = Math.sqrt(v.reduce((a, b) => a + b * b, 0) / v.length); return { m, rms: r, sd: Math.sqrt(Math.max(0, v.reduce((a, b) => a + b * b, 0) / v.length - m * m)) }; };

const EMB_WOBBLE_AS = (C.moonReference.moonDistance / (1 + C.physicalConstants.MASS_RATIO_EARTH_MOON)
  / C.physicalConstants.currentAUDistance) * (648000 / Math.PI);
// POST-N3 NOTE: the shipped module is now the v3 framework-carrier table —
// this constructor mirrors the model wiring. The pre-swap measurements this
// instrument recorded (its reason for existing) compared the v2 module; the
// "shipped vs framework" sections below now read as parity checks.
const _n3H = C.foundational.holisticyearLength;
const _n3mSY = Math.round(C.foundational.inputmeanlengthsolaryearindays * (_n3H / 8)) / (_n3H / 8);
const _n3dpc = (/** @type {number} */ f) => 360 * 36525 * f;
const SHIPPED_RATES = {
  planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => (k ? _n3dpc(1 / C.planetOrbitalElements[k].solarYearInput) : _n3dpc(1 / _n3mSY))),
  moonElongation: _n3dpc(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
};
const shipped = createSunPlanetaryCompletion({ embWobbleArcsec: EMB_WOBBLE_AS, carrierRatesDegPerCy: SHIPPED_RATES });

// ── the N2 double fit, inline (control sanity + the candidate table) ─────
const SIG = JSON.parse(readFileSync(HERE + 'd2-derived-sun-signal.local.json', 'utf8'));
const NS = SIG.dlP.length;
const jdAtS = (i) => SIG.jd0 + i * SIG.stride;
const RATES_LIT = { lMe: 149472.674, lV: 58517.815676, lE: 36000.769780, lM: 19141.696300, lJ: 3036.302389, lS: 1223.511013 };
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TL = require('../lib/constants.js');
const CY = 36525;
const degPerCy = (f) => 360 * CY * f;
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
  for (let i = 0; i < NS; i += 2) {
    const a = argOf(jdAtS(i));
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
  return out;
}
function buildCandidate(RATES) {
  const argOf = makeArgOf(RATES);
  const x1 = fit(MAINS, argOf);
  const bigs = [];
  for (let c = 0; c < MAINS.length; c++) if (Math.hypot(x1[2 * c], x1[2 * c + 1]) >= 0.25) bigs.push(MAINS[c]);
  /** @type {Array<[string,(a:any)=>number]>} */
  const catalog2 = MAINS.map((m) => [m[0], m[1]]);
  for (const [nm, fn, pk] of bigs) {
    const mk = MOD[pk];
    catalog2.push([`${nm}+${mk}`, (a) => fn(a) + a[mk]], [`${nm}-${mk}`, (a) => fn(a) - a[mk]]);
    catalog2.push([`${nm}+ME`, (a) => fn(a) + a.ME], [`${nm}-ME`, (a) => fn(a) - a.ME]);
  }
  const x2 = fit(catalog2, argOf);
  // completion in the SHIPPED sign convention: deg to SUBTRACT.
  // table models (framework − truth)? — the shipped evaluator negates the
  // extraction-native table; mirror exactly: arcsec = −table − wobble·sinD + 2lE
  const FITTED_2LE = 1.42;
  return (jd) => {
    const T = (jd - 2451545.0) / 36525;
    const a = argOf(jd);
    let table = 0;
    for (let c = 0; c < catalog2.length; c++) {
      const th = catalog2[c][1](a);
      table += x2[2 * c] * Math.cos(th) + x2[2 * c + 1] * Math.sin(th);
    }
    const D = (297.8501921 + 445267.1114034 * T) * D2R;
    const arcsec = -table - EMB_WOBBLE_AS * Math.sin(D) + FITTED_2LE * Math.sin(2 * a.lE);
    return arcsec / 3600;
  };
}
const compNew = buildCandidate(RATES_FW);
const compCtl = buildCandidate(RATES_LIT); // sanity: must track the shipped module
const compShipped = (jd) => shipped.sunPlanetaryCompletionDeg((jd - 2451545.0) / 36525);

// sanity: the inline control vs the shipped module over the window
{
  let ss = 0, n = 0;
  for (let jd = 2415020; jd <= 2488070; jd += 50) { const d = (compCtl(jd) - compShipped(jd)) * 3600; ss += d * d; n++; }
  console.log(`sanity — inline control vs shipped module: ${Math.sqrt(ss / n).toFixed(3)}″ RMS (expect ≲0.1″: same fit, minus term-threshold rounding)`);
}

// ── (ii) all-phase JPL Sun ───────────────────────────────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
  const r0 = [], r1 = [];
  for (const [jd, jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (Nnut.psiOmega * Math.sin(om)) / 3600;
    const raw = wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - dPsiDeg)) * 3600;
    r0.push(raw - compShipped(jb) * 3600);
    r1.push(raw - compNew(jb) * 3600);
  }
  const s0 = st(r0), s1 = st(r1);
  console.log(`\nALL-PHASE Sun vs JPL (n ${r0.length}, 1900–2100):`);
  console.log(`  shipped:            mean ${s0.m.toFixed(2)}″ · sd ${s0.sd.toFixed(2)}″`);
  console.log(`  framework carriers: mean ${s1.m.toFixed(2)}″ · sd ${s1.sd.toFixed(2)}″`);
}

// ── (ii) syzygy fleet — identical Moon on both sides ─────────────────────
{
  const cache = JSON.parse(readFileSync(HERE + 'd2-syzygy-jpl-cache.local.json', 'utf8'));
  const e0 = [], e1 = [];
  for (const [jd, jplM, jplS] of cache.rows) {
    const jb = jd + BRIDGE;
    const fwM = model.moon.lonDegAtJD(jb) + LP;
    e0.push(wrap((fwM - (model.eclipse.sunLonDegAtJD(jb) - compShipped(jb))) - (jplM - jplS)) * 3600);
    e1.push(wrap((fwM - (model.eclipse.sunLonDegAtJD(jb) - compNew(jb))) - (jplM - jplS)) * 3600);
  }
  const s0 = st(e0), s1 = st(e1);
  console.log(`\nSYZYGY fleet (n ${e0.length}; Moon convention identical both sides — Δ is the decision metric):`);
  console.log(`  shipped:            mean ${s0.m.toFixed(2)}″ · RMS ${s0.rms.toFixed(2)}″`);
  console.log(`  framework carriers: mean ${s1.m.toFixed(2)}″ · RMS ${s1.rms.toFixed(2)}″`);
}

// ── TERMS dump for the module swap: integer argument vectors, shipped
// format [[kl×6],[kM×6],cos″,sin″], extraction-native sign, ≥0.05″.
// Body order Me,V,E,Ma,J,S. Vector construction mirrors the catalog
// exactly (mains are pure-l combos; sidebands add ±1 on one kM slot).
{
  const IDX = { Me: 0, V: 1, E: 2, M: 3, J: 4, S: 5 };
  /** @type {Array<[string, number[]]>} name, kl vector */
  const MAINS_V = [
    ['V-E', [0, 1, -1, 0, 0, 0]], ['2(V-E)', [0, 2, -2, 0, 0, 0]], ['3(V-E)', [0, 3, -3, 0, 0, 0]],
    ['2V-3E', [0, 2, -3, 0, 0, 0]], ['3V-4E', [0, 3, -4, 0, 0, 0]],
    ['E-J', [0, 0, 1, 0, -1, 0]], ['2(E-J)', [0, 0, 2, 0, -2, 0]], ['E-2J', [0, 0, 1, 0, -2, 0]],
    ['2E-3J', [0, 0, 2, 0, -3, 0]],
    ['E-M', [0, 0, 1, -1, 0, 0]], ['2(E-M)', [0, 0, 2, -2, 0, 0]], ['2E-3M', [0, 0, 2, -3, 0, 0]],
    ['2M-E', [0, 0, -1, 2, 0, 0]], ['2(2M-E)', [0, 0, -2, 4, 0, 0]],
    ['E-S', [0, 0, 1, 0, 0, -1]], ['2(E-S)', [0, 0, 2, 0, 0, -2]],
    ['E-Me', [-1, 0, 1, 0, 0, 0]], ['2(E-Me)', [-2, 0, 2, 0, 0, 0]],
    ['V-2E+M', [0, 1, -2, 1, 0, 0]],
  ];
  const MODIDX = { V: IDX.V, E: IDX.E, M: IDX.M, J: IDX.J, S: IDX.S, Me: IDX.Me };
  const MODKEY = { V: 'V', E: 'E', M: 'M', J: 'J', S: 'S', Me: 'Me' };
  const MAINMOD = { 'V-E': 'V', '2(V-E)': 'V', '3(V-E)': 'V', '2V-3E': 'V', '3V-4E': 'V',
    'E-J': 'J', '2(E-J)': 'J', 'E-2J': 'J', '2E-3J': 'J',
    'E-M': 'M', '2(E-M)': 'M', '2E-3M': 'M', '2M-E': 'M', '2(2M-E)': 'M',
    'E-S': 'S', '2(E-S)': 'S', 'E-Me': 'Me', '2(E-Me)': 'Me', 'V-2E+M': 'V' };
  const argFn = (kl, kM) => (a) => {
    const L = [a.lMe, a.lV, a.lE, a.lM, a.lJ, a.lS];
    const Ma = [a.MMe, a.MV, a.ME, a.MMa, a.MJ, a.MS];
    let th = 0;
    for (let i = 0; i < 6; i++) th += kl[i] * L[i] + kM[i] * Ma[i];
    return th;
  };
  const argOf = makeArgOf(RATES_FW);
  const cat1 = MAINS_V.map(([n, kl]) => [n, argFn(kl, [0, 0, 0, 0, 0, 0])]);
  const x1v = fit(/** @type {any} */(cat1), argOf);
  const catalogV = MAINS_V.map(([n, kl]) => ({ n, kl, kM: [0, 0, 0, 0, 0, 0] }));
  for (let c = 0; c < MAINS_V.length; c++) {
    if (Math.hypot(x1v[2 * c], x1v[2 * c + 1]) < 0.25) continue;
    const [nm, kl] = MAINS_V[c];
    const mi = MODIDX[MAINMOD[nm]];
    for (const [suffix, idx, sgn] of [[MODKEY[MAINMOD[nm]], mi, 1], [MODKEY[MAINMOD[nm]], mi, -1], ['E', IDX.E, 1], ['E', IDX.E, -1]]) {
      const kM = [0, 0, 0, 0, 0, 0]; kM[idx] = sgn;
      catalogV.push({ n: `${nm}${sgn > 0 ? '+' : '-'}M${suffix}`, kl, kM });
    }
  }
  // dedupe (modulator == E duplicates for the E-anomaly pair)
  const seen = new Set(); const catU = [];
  for (const t of catalogV) {
    const key = t.kl.join(',') + '|' + t.kM.join(',');
    if (seen.has(key)) continue;
    seen.add(key); catU.push(t);
  }
  const cat2 = catU.map((t) => [t.n, argFn(t.kl, t.kM)]);
  const x2v = fit(/** @type {any} */(cat2), argOf);
  // fidelity check of the vector-native rebuild
  let ss = 0, n2 = 0;
  for (let i = 0; i < NS; i += 2) {
    const a = argOf(jdAtS(i));
    let f = 0;
    for (let c = 0; c < cat2.length; c++) f += x2v[2 * c] * Math.cos(cat2[c][1](a)) + x2v[2 * c + 1] * Math.sin(cat2[c][1](a));
    ss += (SIG.dlP[i] - f) ** 2; n2++;
  }
  const terms = [];
  for (let c = 0; c < catU.length; c++) {
    const co = x2v[2 * c], si = x2v[2 * c + 1];
    if (Math.hypot(co, si) >= 0.05) terms.push([catU[c].kl, catU[c].kM, +co.toFixed(4), +si.toFixed(4)]);
  }
  terms.sort((a, b) => Math.hypot(b[2], b[3]) - Math.hypot(a[2], a[3]));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(HERE + 'n3-framework-table.local.json', JSON.stringify({
    rates: RATES_FW, fidelityArcsec: +Math.sqrt(ss / n2).toFixed(4), terms,
  }, null, 1));
  console.log(`\nVECTOR-NATIVE framework table: fidelity ${Math.sqrt(ss / n2).toFixed(3)}″ · ${terms.length} terms ≥ 0.05″ → n3-framework-table.local.json`);
}

// ── (i) BCE arbitration ──────────────────────────────────────────────────
{
  const BCE = [
    ['71 Mar (Plutarch)', 1747068.890110],
    ['-135 Apr Babylon', 1671853.759762],
    ['-309 Aug Babylon', 1608421.835171],
    ['-430 Aug Athens', 1564215.113895],
    ['-556 May Babylon', 1518118.032841],
    ['-584 May Halys', 1507900.104145],
    ['-647 Apr Babylon', 1484836.848499],
    ['-708 Jul Lu', 1462658.779682],
    ['-762 Jun Nineveh', 1442902.839207],
  ];
  console.log('\nBCE ARBITRATION — Δ(sun completion) new − shipped at the ancient presets:');
  const rows = [];
  for (const [name, jd] of BCE) {
    const dAs = (compNew(jd) - compShipped(jd)) * 3600;   // ″ of sun λ (subtracted)
    const dMin = -dAs / 30.5;                              // syzygy-time shift, minutes
    rows.push({ name, jd, dAs, dMin });
    console.log(`  ${name.padEnd(20)} Δλ ${dAs.toFixed(2).padStart(7)}″   δt ${dMin.toFixed(2).padStart(6)} min`);
  }
  const ys = rows.map((r) => (r.jd - 2451545) / 365.25 / 100);  // centuries
  const ms = rows.map((r) => r.dMin);
  const n = rows.length;
  const my = ys.reduce((a, b) => a + b, 0) / n, mm = ms.reduce((a, b) => a + b, 0) / n;
  const slope = ys.reduce((s, y, i) => s + (y - my) * (ms[i] - mm), 0) / ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const det = ms.map((m, i) => m - (mm + slope * (ys[i] - my)));
  const sd = Math.sqrt(det.reduce((a, b) => a + b * b, 0) / n);
  console.log(`  decomposition: constant ${mm.toFixed(2)} min (ΔT-degenerate) · trend ${slope.toFixed(3)} min/cy (ΔT-drift class) · DETRENDED sd ${sd.toFixed(3)} min ≈ ${(sd * 27.8).toFixed(1)} km (the falsifiable part)`);
  console.log(`  corpus reference: E4's discriminating scale was ~0.4–8 min detrended; below ~0.2 min the corpus cannot discriminate.`);
}
