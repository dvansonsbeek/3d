// FQ-7 ROUND-3 SHIPPING EXTRACTION — the J2 node family (plan §12i FQ-7).
//
// Ships from the B−A DIFFERENTIAL (3-body+J2 minus 3-body-no-J2, identical
// epoch-phased ICs): the J2 channel is planet-independent and the
// differential cancels the instrument's absolute-convention crudeness
// (R3b's head[0] 107.6% was per-run; the differential rows matched JPL at
// 1–8%). Fit the Δλ/Δβ series on run-B mean angles with [a small Delaunay
// absorber set (the J2 rate/secular leftovers) + the Ω-family rows
// (cos+sin)]. The two DOCUMENTED rows (λ Ω ≈ Meeus 1962e-6 sin(Lp−F),
// β F+Ω ≡ sin(Lp) ≈ the −2235e-6 additive) are extracted as CONTROLS and
// NOT shipped — the catalog additives already carry them. SHIP LIST:
// λ Mp−Ω, Mp+Ω, 2F+Ω, 2D+Ω · β F−Ω — cos/sin pairs on instrument
// arguments (epoch-phased ICs at 1960 align run args with instrument args
// at t0, so phases transfer directly; the residual run-rate drift is the
// same k-combo transfer the A1/A2 landings used).
// dt-halving convergence gate on every shipped row.
//
// Usage: node tools/explore/fq7-r3-ship.mjs [years=120] [dt=0.01]

import { createRequire } from 'node:module';
const ROOT = new URL('../../', import.meta.url).pathname;
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const D1 = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');
const { DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600, DAY = P.DAY;
const GM_EM = P.GM_EM;
const DTL = require(ROOT + 'tools/lib/deep-time.js');
const T_SID_YR_S = DTL.MEAN_SIDEREAL_YEAR_J2000_S ?? C.physicalConstants.meanSiderealYearSeconds;
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
const MS0 = degW(357.5291092 + 35999.0502909 * Tj) * D2R;
const eS = P.eS;
let Es = MS0;
for (let it = 0; it < 12; it++) Es = MS0 + eS * Math.sin(Es);
const nuS0 = 2 * Math.atan2(Math.sqrt(1 + eS) * Math.sin(Es / 2), Math.sqrt(1 - eS) * Math.cos(Es / 2));
const periS0 = 282.9404 * D2R;

function buildSystem() {
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eS, 0, 0, periS0, nuS0);
  const rel = keplerPosVel(GM_EM, aIC, eIC, iIC, Om0, w0, nu0);
  const states = [
    { r: [0, 0, 0], v: [0, 0, 0] },
    { r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM), v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) },
    { r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM), v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) },
  ];
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

function integrate(withJ2, years, dt) {
  const { Y, gms, n } = buildSystem();
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

// Ω-family rows [kD,kM,kMp,kF,kΩ,name,ship?]
const ROWS_LON = [
  [0, 0, 1, 0, -1, 'Mp-Om', true],
  [0, 0, 1, 0, 1, 'Mp+Om', true],
  [0, 0, 0, 2, 1, '2F+Om', true],
  [2, 0, 0, 0, 1, '2D+Om', true],
  [0, 0, 0, 0, 1, 'Om', false],      // CONTROL: the documented Meeus 1962e-6 sin(Lp−F)
];
const ROWS_LAT = [
  [0, 0, 0, 1, -1, 'F-Om', true],
  [0, 0, 0, 1, 1, 'F+Om', false],    // CONTROL: ≡ sin(Lp), the documented −2235e-6 additive
];
// small Delaunay absorber set for the differential's non-node leftovers
const ABSORB = [[0, 0, 1, 0], [2, 0, -1, 0], [2, 0, 0, 0], [0, 0, 2, 0], [2, 0, -2, 0], [0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 2], [2, 0, 0, -2], [0, 0, 1, -2]];

// PER-RUN full fits (each run on its OWN mean angles — absorbing its own
// J2-shifted rates; the raw-differential fit leaks A_Mp·δrate·t
// quadrature, measured 2.4″ fake rows), then difference the Ω-row
// COMPONENTS: (B − A) per cos/sin = the J2 channel, amplitudes AND
// phases. The full Meeus head + extension args ride as the absorber.
const MT = D1.MT;
import { readFileSync } from 'node:fs';
const extSrc = readFileSync(new URL('../../packages/physics/src/moon/series-extension.cjs', import.meta.url), 'utf8');
const extArgs = [...extSrc.matchAll(/^\s*\[(-?\d+), (-?\d+), (-?\d+), (-?\d+),/gm)].map((m) => m.slice(1, 5).map(Number));

function fitRun(S, series, delaunaySinArgs, rows) {
  const fit = (y) => P.linFit(S.t, y);
  const fL = fit(S.lam), fS = fit(S.lamS), fW = fit(S.w), fO = fit(S.Om);
  const angAt = (i) => {
    const t = S.t[i];
    const Lp = fL.a + fL.b * t, Ls = fS.a + fS.b * t;
    return { D: Lp - Ls, M: Ls - periS0, Mp: Lp - (fW.a + fW.b * t), F: Lp - (fO.a + fO.b * t), Om: fO.a + fO.b * t };
  };
  const K = delaunaySinArgs.length + 2 * rows.length;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const bv = new Float64Array(K), row = new Float64Array(K);
  const fD = fit(series);
  for (let i = 0; i < S.t.length; i++) {
    const ang = angAt(i);
    for (let k = 0; k < delaunaySinArgs.length; k++) {
      const t = delaunaySinArgs[k];
      row[k] = Math.sin(t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F);
    }
    for (let k = 0; k < rows.length; k++) {
      const t = rows[k];
      const th = t[0] * ang.D + t[1] * ang.M + t[2] * ang.Mp + t[3] * ang.F + t[4] * ang.Om;
      row[delaunaySinArgs.length + 2 * k] = Math.cos(th);
      row[delaunaySinArgs.length + 2 * k + 1] = Math.sin(th);
    }
    const y = series[i] - (fD.a + fD.b * S.t[i]);
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
  return rows.map((t, k) => ({
    name: t[5], ship: t[6], k: t.slice(0, 5),
    cos: out[delaunaySinArgs.length + 2 * k] * R2D * AS,
    sin: out[delaunaySinArgs.length + 2 * k + 1] * R2D * AS,
  }));
}

function extract(dt) {
  const A = integrate(false, YEARS, dt);
  const B = integrate(true, YEARS, dt);
  const lonDel = [...MT.longitudeTerms.terms.map((t) => t.slice(0, 4)), ...extArgs];
  const latDel = MT.latitudeTerms.terms.map((t) => t.slice(0, 4));
  const diff = (rb, ra) => rb.map((b, i) => ({
    name: b.name, ship: b.ship, k: b.k,
    cos: b.cos - ra[i].cos, sin: b.sin - ra[i].sin,
  }));
  return {
    lon: diff(fitRun(B, B.lam, lonDel, ROWS_LON), fitRun(A, A.lam, lonDel, ROWS_LON)),
    lat: diff(fitRun(B, B.bet, latDel, ROWS_LAT), fitRun(A, A.bet, latDel, ROWS_LAT)),
  };
}

console.log(`FQ-7 R3 SHIP — B−A differential extraction: ${YEARS} yr @ dt ${DT} + dt/2 convergence`);
const t0 = Date.now();
const r1 = extract(DT);
console.log(`  dt ${DT}: done ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const t1 = Date.now();
const r2 = extract(DT / 2);
console.log(`  dt ${DT / 2}: done ${((Date.now() - t1) / 1000).toFixed(0)} s`);

console.log('\nJPL dense targets: Mp−Ω 0.448 (c0.086 s0.439) · Mp+Ω 0.486 (c0.137 s−0.466) · 2F+Ω 0.339 (c0.066 s−0.333) · 2D+Ω 0.116 · β F−Ω 0.354 (c0.033 s0.352)');
console.log('controls: λ Ω → Meeus 1962e-6 = 7.06″ · β F+Ω → −2235e-6 = −8.05″');
console.log('\nrow      dt        cos″      sin″      amp″    | dt/2 drift (amp)');
for (const col of ['lon', 'lat']) {
  for (let k = 0; k < r1[col].length; k++) {
    const a = r1[col][k], b = r2[col][k];
    const amp1 = Math.hypot(a.cos, a.sin), amp2 = Math.hypot(b.cos, b.sin);
    console.log(`${(col === 'lat' ? 'β ' : '') + a.name.padEnd(6)} ${a.ship ? 'SHIP' : 'CTRL'}  ${a.cos.toFixed(3).padStart(8)} ${a.sin.toFixed(3).padStart(8)} ${amp1.toFixed(3).padStart(8)}  | ${(amp2 - amp1).toFixed(4)}`);
  }
}
