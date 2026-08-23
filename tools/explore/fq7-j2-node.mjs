// FQ-7 R3b — the J2 node-family isolation (plan §12i FQ-7).
//
// HYPOTHESIS: the node-family members the D1 lab does NOT produce
// (λ Mp+Ω ~0.49″, 2F+Ω ~0.34″, β F−Ω ~0.35″ — all JPL-confirmed real)
// are J2-DRIVEN: the D1 lab has no J2, and the v2 lab's own record
// attributes the Meeus sin(Lp−F) ≡ sin(Ω) λ term (7.06″) to Earth's
// flattening. J2's (1−3sin²β) potential structure generates exactly
// 2F- and node-argument families.
//
// METHOD: epoch-phased twin integrations (the d2-planetary-moon-epoch IC
// construction at 1960) in three configs — A: 3-body no-J2 (D1-class
// control) · B: 3-body + J2 (isolates the flattening channel) · C:
// 8-body + J2 (everything). Per run: joint LSQ of [Meeus-60 λ head (sin)
// + shipped extension args (sin) + Ω-family rows (cos+sin)] on RUN-OWN
// mean angles (node from the lunar-plane∩EMB-plane intersection, perigee
// from the Laplace vector). Report the Ω rows per config; B−A = the J2
// contribution; targets are the dense-JPL amplitudes.
//
// Usage: node tools/explore/fq7-j2-node.mjs [years=120] [dt=0.01]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname;
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const D1 = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');
const { DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, DAY = P.DAY;
const GM_EM = P.GM_EM;

// framework GM set (mirror the epoch instrument)
const DTL = require(ROOT + 'tools/lib/deep-time.js');
const T_SID_YR_S = DTL.MEAN_SIDEREAL_YEAR_J2000_S ?? (C.physicalConstants.meanSiderealYearSeconds);
const GM_S = C.physicalConstants.gmSunKm3S2 ?? 1.32712440041e11;
const GM_E = GM_EM * (C.physicalConstants.MASS_RATIO_EARTH_MOON / (1 + C.physicalConstants.MASS_RATIO_EARTH_MOON));
const GM_M = GM_EM - GM_E;
const GM_HELIO = GM_S + GM_EM;

function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e), r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const cO = Math.cos(Om), sO = Math.sin(Om), ci = Math.cos(inc), si = Math.sin(inc);
  const th = w + nu, cth = Math.cos(th), sth = Math.sin(th);
  const rv = [r * (cO * cth - sO * sth * ci), r * (sO * cth + cO * sth * ci), r * (sth * si)];
  const vr = h * e * Math.sin(nu) / p, vt = h / r;
  const vv = [
    vr * rv[0] / r - vt * (cO * sth + sO * cth * ci),
    vr * rv[1] / r - vt * (sO * sth - cO * cth * ci),
    vr * rv[2] / r + vt * (cth * si),
  ];
  return { r: rv, v: vv };
}

// epoch-phased ICs at 1960 (the d2-planetary-moon-epoch construction)
const JD0 = 2436934.5;
const Tj = (JD0 - 2451545.0) / 36525;
const degW = (v) => ((v % 360) + 360) % 360;
const Lp0 = degW(218.3164477 + (481267.88123421 - 0.0015786 * Tj) * Tj);
const Mp0 = degW(134.9633964 + (477198.8675055 + 0.0087414 * Tj) * Tj);
const F0 = degW(93.2720950 + (483202.0175233 - 0.0036539 * Tj) * Tj);
const { eIC, iIC, aIC } = D1.calibrate(undefined, true);
const Om0 = degW(Lp0 - F0) * D2R;
const w0 = degW(F0 - Mp0) * D2R;
let Ekep = Mp0 * D2R;
for (let it = 0; it < 12; it++) Ekep = Mp0 * D2R + eIC * Math.sin(Ekep);
const nu0 = 2 * Math.atan2(Math.sqrt(1 + eIC) * Math.sin(Ekep / 2), Math.sqrt(1 - eIC) * Math.cos(Ekep / 2));
// EMB at 1960: solar mean anomaly + framework perihelion
const MS0 = degW(357.5291092 + 35999.0502909 * Tj) * D2R;
let Es = MS0;
const eS = P.eS;
for (let it = 0; it < 12; it++) Es = MS0 + eS * Math.sin(Es);
const nuS0 = 2 * Math.atan2(Math.sqrt(1 + eS) * Math.sin(Es / 2), Math.sqrt(1 - eS) * Math.cos(Es / 2));
const periS0 = degW(282.9404 + 0.0000471 * 0) * D2R; // geocentric solar perigee J2000-class anchor

function buildSystem(withPlanets) {
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eS, 0, 0, periS0, nuS0);
  const rel = keplerPosVel(GM_EM, aIC, eIC, iIC, Om0, w0, nu0);
  const states = [
    { r: [0, 0, 0], v: [0, 0, 0] },
    { r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM), v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) },
    { r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM), v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) },
  ];
  if (withPlanets) {
    for (const p of P.PLANETS) {
      const a = Math.cbrt((GM_S + p.gm) * Math.pow(p.T_days * DAY / (2 * Math.PI), 2));
      // epoch planet phases: instrument mean longitudes at 1960
      const L1960 = { mercury: 261.5, venus: 4.1, mars: 246.4, jupiter: 259.5, saturn: 280.3 }[p.key] ?? 0;
      const nu = (L1960 * D2R) - (p.Om + p.w);
      states.push(keplerPosVel(GM_S + p.gm, a, p.e, p.inc, p.Om, p.w, nu));
      gms.push(p.gm);
    }
  }
  const Mtot = gms.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
  const vB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
  const n = states.length;
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = states[i].r[k] - rB[k];
    Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k];
  }
  return { Y, gms, n };
}

function integrate(withPlanets, withJ2, years, dt) {
  const { Y, gms, n } = buildSystem(withPlanets);
  const deriv = P.makeDeriv(gms, n, withJ2);
  const h = dt * DAY;
  const steps = Math.round(years * 365.25 / dt);
  const sampleEvery = Math.max(1, Math.round(0.25 / dt));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  const fE = GM_E / GM_EM, fM = GM_M / GM_EM;
  const S = { t: [], lam: [], bet: [], lamS: [], w: [], Om: [] };
  for (let s = 0; s <= steps; s++) {
    if (s % sampleEvery === 0) {
      const ex = fE * Y[3] + fM * Y[6] - Y[0], ey = fE * Y[4] + fM * Y[7] - Y[1], ez = fE * Y[5] + fM * Y[8] - Y[2];
      const evx = fE * Y[3 * n + 3] + fM * Y[3 * n + 6] - Y[3 * n], evy = fE * Y[3 * n + 4] + fM * Y[3 * n + 7] - Y[3 * n + 1], evz = fE * Y[3 * n + 5] + fM * Y[3 * n + 8] - Y[3 * n + 2];
      let nx = ey * evz - ez * evy, ny = ez * evx - ex * evz, nz = ex * evy - ey * evx;
      const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
      let Xx = 1 - nx * nx, Xy = -nx * ny, Xz = -nx * nz;
      const Xn = Math.hypot(Xx, Xy, Xz); Xx /= Xn; Xy /= Xn; Xz /= Xn;
      const Yx = ny * Xz - nz * Xy, Yy = nz * Xx - nx * Xz, Yz = nx * Xy - ny * Xx;
      const proj = (vx, vy, vz) => [vx * Xx + vy * Xy + vz * Xz, vx * Yx + vy * Yy + vz * Yz, vx * nx + vy * ny + vz * nz];
      const rm = proj(Y[6] - Y[3], Y[7] - Y[4], Y[8] - Y[5]);
      const rs = proj(Y[0] - Y[3], Y[1] - Y[4], Y[2] - Y[5]);
      const vm = proj(Y[3 * n + 6] - Y[3 * n + 3], Y[3 * n + 7] - Y[3 * n + 4], Y[3 * n + 8] - Y[3 * n + 5]);
      S.t.push(s * dt);
      S.lam.push(Math.atan2(rm[1], rm[0]));
      S.bet.push(Math.atan2(rm[2], Math.hypot(rm[0], rm[1])));
      S.lamS.push(Math.atan2(rs[1], rs[0]));
      // lunar orbit normal (in-plane frame) → node on the EMB plane
      const hx = rm[1] * vm[2] - rm[2] * vm[1], hy = rm[2] * vm[0] - rm[0] * vm[2], hz = rm[0] * vm[1] - rm[1] * vm[0];
      S.Om.push(Math.atan2(hx, -hy));
      const rn = Math.hypot(rm[0], rm[1], rm[2]);
      S.w.push(Math.atan2((vm[2] * hx - vm[0] * hz) / GM_EM - rm[1] / rn, (vm[1] * hz - vm[2] * hy) / GM_EM - rm[0] / rn));
    }
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  for (const k of ['lam', 'lamS', 'w', 'Om']) S[k] = P.unwrap(S[k]);
  return S;
}

// run-own mean angles from linear fits
function anglesOf(S) {
  const fit = (y) => P.linFit(S.t, y);
  const fL = fit(S.lam), fS = fit(S.lamS), fW = fit(S.w), fO = fit(S.Om);
  return (i) => {
    const t = S.t[i];
    const Lp = fL.a + fL.b * t, Ls = fS.a + fS.b * t;
    return {
      D: Lp - Ls,
      M: Ls - periS0,                     // solar perigee fixed in-frame
      Mp: Lp - (fW.a + fW.b * t),
      F: Lp - (fO.a + fO.b * t),
      Om: fO.a + fO.b * t,
    };
  };
}

const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));
const MT = D1.MT;
const OMEGA_LON = [[0, 0, 1, 0, -1, 'Mp-Om'], [0, 0, 1, 0, 1, 'Mp+Om'], [0, 0, 0, 2, 1, '2F+Om'], [0, 0, 0, 0, 1, 'Om'], [2, 0, 0, 0, 1, '2D+Om']];
const OMEGA_LAT = [[0, 0, 0, 1, -1, 'F-Om'], [0, 0, 0, 1, 1, 'F+Om']];

function fitRun(S, series, delaunaySinArgs, omegaRows) {
  const angAt = anglesOf(S);
  const K = delaunaySinArgs.length + 2 * omegaRows.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const bv = new Float64Array(K), row = new Float64Array(K);
  const fSer = P.linFit(S.t, series);
  for (let i = 0; i < S.t.length; i++) {
    const ang = angAt(i);
    for (let k = 0; k < delaunaySinArgs.length; k++) {
      const t = delaunaySinArgs[k];
      row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
    }
    for (let k = 0; k < omegaRows.length; k++) {
      const t = omegaRows[k];
      const th = t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F + t[4] * ang.Om;
      row[delaunaySinArgs.length + 2 * k] = Math.cos(th);
      row[delaunaySinArgs.length + 2 * k + 1] = Math.sin(th);
    }
    const y = series[i] - (fSer.a + fSer.b * S.t[i]);
    for (let k = 0; k < K; k++) {
      const rk = row[k]; bv[k] += rk * y; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(bv);
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
  return { x: out, nDel: delaunaySinArgs.length };
}

function omegaReport(S) {
  const lonDel = [...MT.longitudeTerms.terms.map((t) => t.slice(0, 4)), ...extArgs];
  const latDel = MT.latitudeTerms.terms.map((t) => t.slice(0, 4));
  const rL = fitRun(S, S.lam, lonDel, OMEGA_LON);
  const rB = fitRun(S, S.bet, latDel, OMEGA_LAT);
  const head0 = rL.x[0] * R2D, meeus0 = MT.longitudeTerms.terms.slice().sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]))[0][4] * 1e-6;
  const out = {};
  OMEGA_LON.forEach((t, k) => {
    const c0 = rL.x[rL.nDel + 2 * k] * R2D * AS, s0 = rL.x[rL.nDel + 2 * k + 1] * R2D * AS;
    out[t[5]] = Math.hypot(c0, s0);
  });
  OMEGA_LAT.forEach((t, k) => {
    const c0 = rB.x[rB.nDel + 2 * k] * R2D * AS, s0 = rB.x[rB.nDel + 2 * k + 1] * R2D * AS;
    out['β ' + t[5]] = Math.hypot(c0, s0);
  });
  return { out, headRatio: head0 / meeus0 };
}

console.log(`FQ-7 R3b — J2 node-family isolation: ${YEARS} yr @ dt ${DT} (epoch-phased 1960 ICs)`);
const CONFIGS = [
  ['A: 3-body, no J2 ', false, false],
  ['B: 3-body + J2   ', false, true],
  ['C: 8-body + J2   ', true, true],
];
const results = [];
for (const [label, planets, j2] of CONFIGS) {
  const t0 = Date.now();
  const S = integrate(planets, j2, YEARS, DT);
  const r = omegaReport(S);
  results.push([label, r]);
  console.log(`${label} (${((Date.now() - t0) / 1000).toFixed(0)} s, head[0] ${(r.headRatio * 100).toFixed(2)}%): `
    + Object.entries(r.out).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(' · '));
}
console.log('\nJPL dense targets: Mp−Ω 0.448 · Mp+Ω 0.486 · 2F+Ω 0.339 · 2D+Ω 0.116 · β F−Ω 0.354 · β F+Ω 0.147');
console.log('J2 contribution (B − A per row):');
for (const k of Object.keys(results[0][1].out)) {
  console.log(`   ${k.padEnd(8)} ${(results[1][1].out[k] - results[0][1].out[k]).toFixed(3)}`);
}
