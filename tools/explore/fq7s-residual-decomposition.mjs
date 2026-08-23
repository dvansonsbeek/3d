// FQ-7-SUN S4 — what IS the 0.6″ combined residual?
//
// r1 = family-projected(shipped-Sun − JPL) + family-projected(derived
// signal), the D2 record's 0.60″. If it sits at planetary completion
// tones → the twin's IC-quality floor (t0 phases 14–47′, Kepler-ellipse
// realization) — OUR floor, since improving ICs from JPL would be
// fitting. If at solar-anomaly harmonics → the Sun's own laws (a
// different campaign). If broadband → representational floor.
//
// Usage: node tools/explore/fq7s-residual-decomposition.mjs [signal=d2-derived-sun-signal.local.json]

import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const SIG_FILE = process.argv[2] || 'd2-derived-sun-signal.local.json';
const SIG = JSON.parse(readFileSync(HERE + SIG_FILE, 'utf8'));
const { createModel, DEFAULT_CONSTANTS: C } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const model = createModel();
const D2R = Math.PI / 180;
const BRIDGE = C.earthOrbital.deltaTStart / 86400;
const Nnut = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((d + 540) % 360) - 180;

// family projection (d2-derived-sun verbatim)
const K = 15;
const rowAt = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const Dm = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  const L = (100.46646 + 36000.7698 * T) * D2R;
  const sL = Math.sin(L), cL = Math.cos(L), s2L = Math.sin(2 * L), c2L = Math.cos(2 * L);
  return [1, Math.sin(Dm), Math.cos(Dm), T, T * T, sL, cL, s2L, c2L, T * sL, T * cL, T * s2L, T * c2L, T * T * sL, T * T * cL];
};
function projectOut(jds, v) {
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K);
  const rowsB = jds.map(rowAt);
  for (let i = 0; i < v.length; i++) {
    for (let k = 0; k < K; k++) {
      b[k] += rowsB[i][k] * v[i];
      for (let j = k; j < K; j++) G[k][j] += rowsB[i][k] * rowsB[i][j];
    }
  }
  for (let k2 = 0; k2 < K; k2++) for (let j = 0; j < k2; j++) G[k2][j] = G[j][k2];
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
  const coef = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * coef[cc];
    coef[c] = s / Gm[c][c];
  }
  return v.map((y, i) => y - rowsB[i].reduce((s, f, k2) => s + f * coef[k2], 0));
}

const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
const N = SIG.dlP.length;
const FULL_NUT = process.argv.includes('--full-nutation');
const usable = [];
for (const [jd, jplSun] of cache.rows) {
  const jb = jd + BRIDGE;
  const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - 2451545.0) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  let dPsiDeg = (Nnut.psiOmega * Math.sin(om)) / 3600;
  if (FULL_NUT) {
    // IAU-1980 next longitude terms — the leading-term subtraction leaves
    // these in the comparison and they masquerade as completion floor
    const T = (jb - 2451545.0) / 36525;
    const Dm = (297.8501921 + 445267.1114034 * T) * D2R;
    const F = (93.2720950 + 483202.0175233 * T) * D2R;
    dPsiDeg += (0.2062 * Math.sin(2 * om)
      - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om)
      - 0.2274 * Math.sin(2 * F + 2 * om)) / 3600;
  }
  const i = (jd - SIG.jd0) / SIG.stride, i0 = Math.floor(i);
  if (i0 < 0 || i0 + 1 >= N) continue;
  const f = i - i0;
  usable.push({
    jd,
    resid: wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - dPsiDeg)) * 3600,
    d: SIG.dlP[i0] * (1 - f) + SIG.dlP[i0 + 1] * f,
  });
}
const uj = usable.map((r) => r.jd);
const r0 = projectOut(uj, usable.map((r) => r.resid));
const dP = projectOut(uj, usable.map((r) => r.d));
const r1 = r0.map((v, i) => v + dP[i]);
const rms = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
console.log(`r1 (residual + derived, family-projected): RMS ${rms(r1).toFixed(3)}″ (n ${r1.length}, signal ${SIG_FILE})`);

// scan: planetary completion tones · solar-anomaly harmonics · Moon D
const PL0 = { Me: 252.250906, V: 181.979801, E: 100.466457, Ma: 355.433000, J: 34.351519, S: 50.077444, U: 314.055005, Ne: 304.348665 };
const PL1 = { Me: 149472.674636, V: 58517.815676, E: 36000.769780, Ma: 19141.696300, J: 3036.302389, S: 1223.511013, U: 428.466998, Ne: 218.486200 };
const ME = [357.5291092, 35999.0502909];
/** @type {Array<[string, number, number]>} */
const probes = [];
for (let k = 3; k <= 6; k++) probes.push([`${k}M`, k * ME[0], k * ME[1]]);   // 1M/2M live in the family
const syn = (a, b) => [PL0[a] - PL0[b], PL1[a] - PL1[b]];
const fam = (nm, p) => {
  probes.push([nm, p[0], p[1]]);
  probes.push([`${nm}+M`, p[0] + ME[0], p[1] + ME[1]], [`${nm}-M`, p[0] - ME[0], p[1] - ME[1]]);
  probes.push([`${nm}+2M`, p[0] + 2 * ME[0], p[1] + 2 * ME[1]], [`${nm}-2M`, p[0] - 2 * ME[0], p[1] - 2 * ME[1]]);
};
for (const [nm, p] of /** @type {Array<[string,[number,number]]>} */ ([
  ['V-E', syn('V', 'E')], ['2(V-E)', [2 * syn('V', 'E')[0], 2 * syn('V', 'E')[1]]],
  ['3(V-E)', [3 * syn('V', 'E')[0], 3 * syn('V', 'E')[1]]], ['4(V-E)', [4 * syn('V', 'E')[0], 4 * syn('V', 'E')[1]]],
  ['5(V-E)', [5 * syn('V', 'E')[0], 5 * syn('V', 'E')[1]]],
  ['E-J', syn('E', 'J')], ['2(E-J)', [2 * syn('E', 'J')[0], 2 * syn('E', 'J')[1]]],
  ['3(E-J)', [3 * syn('E', 'J')[0], 3 * syn('E', 'J')[1]]],
  ['E-Ma', syn('E', 'Ma')], ['2(E-Ma)', [2 * syn('E', 'Ma')[0], 2 * syn('E', 'Ma')[1]]],
  ['3(E-Ma)', [3 * syn('E', 'Ma')[0], 3 * syn('E', 'Ma')[1]]],
  ['E-S', syn('E', 'S')], ['2(E-S)', [2 * syn('E', 'S')[0], 2 * syn('E', 'S')[1]]],
  ['E-Me', syn('E', 'Me')], ['2(E-Me)', [2 * syn('E', 'Me')[0], 2 * syn('E', 'Me')[1]]],
  ['3(E-Me)', [3 * syn('E', 'Me')[0], 3 * syn('E', 'Me')[1]]],
  ['E-U', syn('E', 'U')], ['E-Ne', syn('E', 'Ne')],
])) fam(nm, p);
const rows = [];
for (const [nm, p0, p1] of probes) {
  if (Math.abs(p1) < 300) continue;
  let sc = 0, ss = 0, scc = 0, sss = 0, scs = 0;
  for (let i = 0; i < uj.length; i++) {
    const T = (uj[i] - 2451545.0) / 36525;
    const th = (p0 + p1 * T) * D2R;
    const co = Math.cos(th), si = Math.sin(th), y = r1[i];
    sc += co * y; ss += si * y; scc += co * co; sss += si * si; scs += co * si;
  }
  const det = scc * sss - scs * scs;
  rows.push({ nm, amp: Math.hypot((sc * sss - ss * scs) / det, (ss * scc - sc * scs) / det) });
}
rows.sort((a, b) => b.amp - a.amp);
console.log('r1 tone scan (″):');
for (const r of rows.slice(0, 14)) console.log(`  ${r.nm.padEnd(10)} ${r.amp.toFixed(3)}″`);
const content = Math.sqrt(rows.slice(0, 20).reduce((s, r) => s + r.amp * r.amp / 2, 0));
console.log(`top-20 tone content: ${content.toFixed(3)}″ of r1 ${rms(r1).toFixed(3)}″ → broadband/other: ${Math.sqrt(Math.max(0, rms(r1) ** 2 - content ** 2)).toFixed(3)}″`);
