// PLAN 06 I2 — the derived Sun completion table RE-EXTRACTED on SIDEREAL
// carriers, plus the long-period rows from the model's own N-body.
//
// The N3 extraction (n3-carrier-swap-preview.mjs, the vector-native fit) is
// reproduced here term-for-term — same D2 derived signal
// (d2-derived-sun-signal.local.json, 200 yr @ 0.25 d), same catalogue (19
// mains, ±M sidebands on the ≥0.25″ mains), same thresholds (≥0.05″ ships) —
// with ONE change: the carrier rates are SIDEREAL (the record rate minus the
// model's own J2000 precession p₀ for the planets, the framework sidereal
// year for Earth; see i2-long-inequality.mjs CARRIERS). Inside the 200-yr
// window the two carrier sets differ by ≤ 1.4°·|Σk| of phase, so the
// re-extracted amplitudes move at the percent level — the point of the swap
// is the deep window (Σk ≠ 0 arguments no longer drift with precession).
//
// The long-period rows (4λ_E − 8λ_Ma + 3λ_J and 8λ_V − 13λ_E) come from
// i2-long-inequality.local.json (the WH derivation on the same carriers) and
// are appended in the same [[kl×6],[kM×6],cos″,sin″] format.
//
// Usage: node tools/explore/i2-sidereal-carrier-table.mjs   → prints the TERMS
//        literal for eclipse/sun-planetary-completion.cjs + fidelity + the
//        1900–2100 JPL all-phase preview (shipped vs sidereal-carrier table),
//        writes i2-sidereal-carrier-table.local.json
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const C = require(ROOT + 'tools/lib/constants.js');
const { createSunPlanetaryCompletion } = require(ROOT + 'packages/physics/src/eclipse/sun-planetary-completion.cjs');
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const D2R = Math.PI / 180, CY = 36525;

const SIG = JSON.parse(readFileSync(HERE + 'd2-derived-sun-signal.local.json', 'utf8'));
const NS = SIG.dlP.length;
const jdAtS = (i) => SIG.jd0 + i * SIG.stride;

// carriers
const KEYS = ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'];
const degPerCy = (f) => 360 * CY * f;
const P0 = degPerCy(1 / C.meanSolarYearDays) - degPerCy(1 / C.meanSiderealYearDays);
const RATES_OFDATE = KEYS.map((k) => (k ? degPerCy(1 / C.planets[k].solarYearInput) : degPerCy(1 / C.meanSolarYearDays)));
const RATES_SID = KEYS.map((k) => (k ? degPerCy(1 / C.planets[k].solarYearInput) - P0 : degPerCy(1 / C.meanSiderealYearDays)));
const ZEROS = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
const makeArgOf = (RATES) => (jd) => {
  const T = (jd - 2451545.0) / CY;
  const l = ZEROS.map((z, i) => (z + RATES[i] * T) * D2R);
  return { l, M: l.map((x, i) => x - PERI[i] * D2R) };
};
const argFn = (kl, kM) => (a) => { let th = 0; for (let i = 0; i < 6; i++) th += kl[i] * a.l[i] + kM[i] * a.M[i]; return th; };

// the N3 catalogue (vector-native)
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
const IDX = { Me: 0, V: 1, E: 2, M: 3, J: 4, S: 5 };
const MAINMOD = { 'V-E': 'V', '2(V-E)': 'V', '3(V-E)': 'V', '2V-3E': 'V', '3V-4E': 'V', 'E-J': 'J', '2(E-J)': 'J', 'E-2J': 'J', '2E-3J': 'J', 'E-M': 'M', '2(E-M)': 'M', '2E-3M': 'M', '2M-E': 'M', '2(2M-E)': 'M', 'E-S': 'S', '2(E-S)': 'S', 'E-Me': 'Me', '2(E-Me)': 'Me', 'V-2E+M': 'V' };

function fit(catalog, argOf) {
  const K = 2 * catalog.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < NS; i += 2) {
    const a = argOf(jdAtS(i));
    for (let c = 0; c < catalog.length; c++) { const th = catalog[c](a); row[2 * c] = Math.cos(th); row[2 * c + 1] = Math.sin(th); }
    const y = SIG.dlP[i];
    for (let k = 0; k < K; k++) { const rk = row[k]; b[k] += rk * y; const Gk = G[k]; for (let j = k; j < K; j++) Gk[j] += rk * row[j]; }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) { const f = Gm[r][c] / Gm[c][c]; for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc]; x[r] -= f * x[c]; }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) { let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc]; out[c] = s / Gm[c][c]; }
  return out;
}
function extract(RATES) {
  const argOf = makeArgOf(RATES);
  const x1 = fit(MAINS_V.map(([, kl]) => argFn(kl, [0, 0, 0, 0, 0, 0])), argOf);
  const catalogV = MAINS_V.map(([n, kl]) => ({ n, kl, kM: [0, 0, 0, 0, 0, 0] }));
  for (let c = 0; c < MAINS_V.length; c++) {
    if (Math.hypot(x1[2 * c], x1[2 * c + 1]) < 0.25) continue;
    const [nm, kl] = MAINS_V[c];
    const mi = IDX[MAINMOD[nm]];
    for (const [idx, sgn] of [[mi, 1], [mi, -1], [IDX.E, 1], [IDX.E, -1]]) { const kM = [0, 0, 0, 0, 0, 0]; kM[idx] = sgn; catalogV.push({ n: nm, kl, kM }); }
  }
  const seen = new Set(); const catU = [];
  for (const t of catalogV) { const key = t.kl.join(',') + '|' + t.kM.join(','); if (seen.has(key)) continue; seen.add(key); catU.push(t); }
  const cat2 = catU.map((t) => argFn(t.kl, t.kM));
  const x2 = fit(cat2, argOf);
  let ss = 0, n2 = 0;
  for (let i = 0; i < NS; i += 2) { const a = argOf(jdAtS(i)); let f = 0; for (let c = 0; c < cat2.length; c++) f += x2[2 * c] * Math.cos(cat2[c](a)) + x2[2 * c + 1] * Math.sin(cat2[c](a)); ss += (SIG.dlP[i] - f) ** 2; n2++; }
  const terms = [];
  for (let c = 0; c < catU.length; c++) { const co = x2[2 * c], si = x2[2 * c + 1]; if (Math.hypot(co, si) >= 0.05) terms.push([catU[c].kl, catU[c].kM, +co.toFixed(4), +si.toFixed(4)]); }
  terms.sort((a, b) => Math.hypot(b[2], b[3]) - Math.hypot(a[2], a[3]));
  return { fidelity: Math.sqrt(ss / n2), terms };
}
const ofDate = extract(RATES_OFDATE), sid = extract(RATES_SID);
console.log(`of-date carriers (N3 reproduction): fidelity ${ofDate.fidelity.toFixed(4)}″, ${ofDate.terms.length} terms`);
console.log(`sidereal carriers:                  fidelity ${sid.fidelity.toFixed(4)}″, ${sid.terms.length} terms`);
// largest coefficient moves
const key = (t) => t[0].join(',') + '|' + t[1].join(',');
const mapOf = new Map(ofDate.terms.map((t) => [key(t), t]));
let maxMove = 0, maxKey = '';
for (const t of sid.terms) { const o = mapOf.get(key(t)); if (!o) continue; const d = Math.hypot(t[2] - o[2], t[3] - o[3]); if (d > maxMove) { maxMove = d; maxKey = key(t); } }
console.log(`largest coefficient move of-date → sidereal: ${maxMove.toFixed(3)}″ at [${maxKey}]`);

// long-period rows from the WH derivation (carrier-argument fit, main run)
const LP = existsSync(HERE + 'i2-long-inequality.local.json') ? JSON.parse(readFileSync(HERE + 'i2-long-inequality.local.json', 'utf8')) : null;
const longRows = [];
if (LP) {
  for (const t of LP.main.carrier.terms) {
    if (t.name === '4E−8Ma+3J' || t.name === '8V−13E') {
      if (t.ampAS >= 0.05) longRows.push([t.k, [0, 0, 0, 0, 0, 0], +t.cosAS.toFixed(4), +t.sinAS.toFixed(4)]);
    }
  }
  console.log('long-period rows (WH derivation, carrier arguments):', JSON.stringify(longRows));
} else console.log('(no i2-long-inequality.local.json — long-period rows not appended)');

// 1900–2100 JPL all-phase preview: shipped module vs the sidereal table (+ long rows), the N3 instrument convention
{
  const model = createModel(DEFAULT_CONSTANTS);
  const Cc = DEFAULT_CONSTANTS;
  const BRIDGE = Cc.earthOrbital.deltaTStart / 86400;
  const Nnut = Cc.physicalConstants.nutationLeadingTermsArcsec;
  const wrap = (d) => ((d + 540) % 360) - 180;
  const EMB = (Cc.moonReference.moonDistance / (1 + Cc.physicalConstants.MASS_RATIO_EARTH_MOON) / Cc.physicalConstants.currentAUDistance) * (648000 / Math.PI);
  const moonEl = degPerCy(1 / Cc.moonReference.moonSiderealMonthInput - 1 / Cc.yearLengthRef.siderealYear);
  const shipped = createSunPlanetaryCompletion({ embWobbleArcsec: EMB, carrierRatesDegPerCy: { planets: RATES_OFDATE, moonElongation: moonEl } }).sunPlanetaryCompletionDeg;
  const evalTable = (terms, RATES) => { const argOf = makeArgOf(RATES); return (T) => { const a = argOf(2451545.0 + T * CY); let table = 0; for (const [kl, kM, co, si] of terms) { const th = argFn(kl, kM)(a); table += co * Math.cos(th) + si * Math.sin(th); } const D = (297.8501921 + moonEl * T) * D2R; return (-table - EMB * Math.sin(D)) / 3600; }; };
  const candidate = evalTable([...sid.terms, ...longRows], RATES_SID);
  const candidateNoLong = evalTable(sid.terms, RATES_SID);
  const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
  const st = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) }; };
  const r0 = [], r1 = [], r2 = [];
  for (const [jd, jplSun] of cache.rows) {
    const jb = jd + BRIDGE, T = (jb - 2451545.0) / CY;
    const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / Cc.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const raw = wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - (Nnut.psiOmega * Math.sin(om)) / 3600)) * 3600;
    r0.push(raw - shipped(T) * 3600); r1.push(raw - candidateNoLong(T) * 3600); r2.push(raw - candidate(T) * 3600);
  }
  const s0 = st(r0), s1 = st(r1), s2 = st(r2);
  console.log(`\nALL-PHASE Sun vs JPL 1900–2100 (n ${r0.length}, N3 instrument convention):\n  shipped (of-date carriers):        mean ${s0.m.toFixed(2)}″ sd ${s0.sd.toFixed(2)}″\n  sidereal carriers, 70 terms:       mean ${s1.m.toFixed(2)}″ sd ${s1.sd.toFixed(2)}″\n  sidereal carriers + long-period:   mean ${s2.m.toFixed(2)}″ sd ${s2.sd.toFixed(2)}″`);
}
const TERMS = [...sid.terms, ...longRows];
writeFileSync(HERE + 'i2-sidereal-carrier-table.local.json', JSON.stringify({ ratesSidereal: RATES_SID, ratesOfDate: RATES_OFDATE, p0DegPerCy: P0, fidelityArcsec: +sid.fidelity.toFixed(4), fidelityOfDateArcsec: +ofDate.fidelity.toFixed(4), terms: TERMS }, null, 1));
console.log(`\nTERMS literal (${TERMS.length} rows; body order Me,V,E,Ma,J,S; [[kl],[kM],cos″,sin″], extraction-native sign):`);
for (const t of TERMS) console.log(`  [[${t[0].join(', ')}], [${t[1].join(', ')}], ${t[2].toFixed(4)}, ${t[3].toFixed(4)}],`);
console.log('→ i2-sidereal-carrier-table.local.json');
