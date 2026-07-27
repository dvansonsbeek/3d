/**
 * derive-planetary-lunar-terms.js — the PLANETARY laboratory v2
 * (D5 companion / A1 resolution / D1-residual closure).
 *
 * v2 upgrades over v1:
 *   - 8 bodies: Sun, Earth, Moon + Venus, Jupiter, Mercury, Mars, Saturn
 *   - real 3D planetary orbits (framework inclinations, nodes, eccentricities)
 *   - Earth J2 oblateness acceleration on the Earth–Moon pair (with reaction),
 *     axis tilted by the framework's J2000 obliquity
 *   - every constant framework-sourced where the framework has it (AU,
 *     sidereal year, e_M, e_S, i_M, planet elements); only the planet/Sun
 *     mass ratios and Earth's J2 + R_E are IAU observed constants (documented,
 *     same status as the D1 Earth/Moon mass ratio)
 *
 * Three systems with IDENTICAL lunar ICs:
 *   base3 = Sun–Earth–Moon           (the D1 main problem)
 *   j2_3  = base3 + Earth J2         (isolates pure oblateness physics)
 *   full  = 8 bodies + Earth J2      (everything)
 *
 * Part A (secular, from `full`): do D1's open residuals close?
 *   apsidal period (3-body 3233.13 vs input 3231.493 — gap 0.05%)
 *   nodal period   (3-body 6794.02 vs input 6798.38 — gap 0.064%)
 *   latitude main  (3-body 99.78% of Meeus 5.128122)
 * Part B (differential):
 *   Δλ(j2_3 − base3): the Lp−F term (Meeus 1962e-6 — flattening attribution)
 *   Δλ(full − base3): A2 amplitude, A1 band periodogram
 *
 * Usage: node tools/explore/derive-planetary-lunar-terms.js [years=600] [dtDays=0.02]
 */

const C = require('../lib/constants');
const DT = require('../lib/deep-time');
const OE = require('../lib/orbital-engine');
const D1 = require('./derive-meeus-amplitudes');

const YEARS = parseFloat(process.argv[2] || '600');
const DTD = parseFloat(process.argv[3] || '0.02');
const DAY = 86400;
const d2r = Math.PI / 180;

// ── framework-sourced constants ────────────────────────────────────────────
const AU_KM = C.currentAUDistance;
const T_SID_YR_S = DT.MEAN_SIDEREAL_YEAR_J2000_S;
const GM_EM = C.GM_EARTH_MOON_SYSTEM;
const GM_HELIO = 4 * Math.PI * Math.PI * Math.pow(AU_KM, 3) / (T_SID_YR_S * T_SID_YR_S);
const GM_S = GM_HELIO - GM_EM;
const MR = C.MASS_RATIO_EARTH_MOON;
const GM_E = GM_EM * MR / (MR + 1);
const GM_M = GM_EM / (MR + 1);
const eS = C.ASTRO_REFERENCE.earthEccentricityJ2000;
const EPS_J2000 = OE.computeObliquityEarth(2000) * d2r;    // framework J2000 obliquity

// Observed dynamics constants — source of truth: astro-reference.json
// physicalConstants (massRatioDE440 / earthJ2 / earthEquatorialRadiusKm),
// imported via tools/lib/constants.js like every other constant.
const MASS_RATIO_SUN = C.massRatioDE440;
const J2_E = C.earthJ2;
const R_E_KM = C.earthEquatorialRadiusKm;

// planets from the framework (period, ecc, inclination, node, perihelion)
const PLANET_KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const PLANETS = PLANET_KEYS.map(k => {
  const p = C.planets[k];
  return {
    key: k,
    gm: GM_S / MASS_RATIO_SUN[k],
    T_days: p.solarYearInput,
    e: p.orbitalEccentricityJ2000,
    inc: (p.eclipticInclinationJ2000 || 0) * d2r,
    Om: (p.ascendingNode || 0) * d2r,
    w: (((p.longitudePerihelion || 0) - (p.ascendingNode || 0)) * d2r),
  };
});
function printHeader() {
  console.log(`planetary laboratory v2: ${YEARS} yr at dt=${DTD} d — 8 bodies + Earth J2`);
  console.log(`AU ${AU_KM} km (framework)  eps_J2000 ${(EPS_J2000/d2r).toFixed(5)}°  J2 ${J2_E}  R_E ${R_E_KM} km`);
  for (const p of PLANETS) console.log(`  ${p.key.padEnd(8)} T ${String(p.T_days).padStart(9)} d  e ${p.e}  i ${(p.inc/d2r).toFixed(3)}°  Ω ${(p.Om/d2r).toFixed(2)}°`);
}

// Earth spin axis (ecliptic frame, z = pole): tilted by eps toward −y
// (equinox line = x-axis; direction fixed over the window — precession is
// 26 kyr ≫ window).
const AXIS = [0, -Math.sin(EPS_J2000), Math.cos(EPS_J2000)];

// ── Kepler → state ─────────────────────────────────────────────────────────
function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO*cw - sO*sw*ci, -cO*sw - sO*cw*ci, sO*si,
             sO*cw + cO*sw*ci, -sO*sw + cO*cw*ci, -cO*si,
             sw*si, cw*si, ci];
  const rot = (x, y, z) => [R[0]*x + R[1]*y + R[2]*z, R[3]*x + R[4]*y + R[5]*z, R[6]*x + R[7]*y + R[8]*z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

// ── system builder ─────────────────────────────────────────────────────────
function makeSystem(opts, moonIC) {
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  // v4: opts.eS overrides the J2000 solar eccentricity (sensitivity scans)
  const emb = keplerPosVel(GM_HELIO, a_EMB, opts.eS !== undefined ? opts.eS : eS, 0, 0, 0, 0);
  const rel = keplerPosVel(GM_EM, moonIC.a, moonIC.e, moonIC.i, 0, 0, 0);
  const states = [
    { r: [0, 0, 0], v: [0, 0, 0] },
    { r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM), v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) },
    { r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM), v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) },
  ];
  if (opts.planets) {
    for (const p of PLANETS) {
      const a = Math.cbrt((GM_S + p.gm) * Math.pow(p.T_days * DAY / (2 * Math.PI), 2));
      states.push(keplerPosVel(GM_S + p.gm, a, p.e, p.inc, p.Om, p.w, 0));
      gms.push(p.gm);
    }
  }
  const Mtot = gms.reduce((s, g) => s + g, 0);
  const rB = [0, 1, 2].map(k => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
  const vB = [0, 1, 2].map(k => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
  const n = states.length;
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = states[i].r[k] - rB[k];
    Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k];
  }
  return { Y, gms, n };
}

function makeDeriv(gms, n, withJ2) {
  const KJ2 = 1.5 * J2_E * GM_E * R_E_KM * R_E_KM;
  return (Y, dY) => {
    for (let i = 0; i < 3 * n; i++) { dY[i] = Y[3 * n + i]; dY[3 * n + i] = 0; }
    for (let A = 0; A < n; A++) for (let B = A + 1; B < n; B++) {
      const ia = 3 * A, ib = 3 * B;
      const dx = Y[ib] - Y[ia], dy = Y[ib + 1] - Y[ia + 1], dz = Y[ib + 2] - Y[ia + 2];
      const r2 = dx * dx + dy * dy + dz * dz, ir3 = 1 / (r2 * Math.sqrt(r2));
      dY[3 * n + ia]     += gms[B] * dx * ir3; dY[3 * n + ia + 1] += gms[B] * dy * ir3; dY[3 * n + ia + 2] += gms[B] * dz * ir3;
      dY[3 * n + ib]     -= gms[A] * dx * ir3; dY[3 * n + ib + 1] -= gms[A] * dy * ir3; dY[3 * n + ib + 2] -= gms[A] * dz * ir3;
    }
    if (withJ2) {
      // Earth J2 on the Moon (dominant external J2 interaction) + reaction on
      // Earth. a = (3/2)·J2·GM_E·R_E²/r⁴ · [ (5(r̂·n̂)² − 1)·r̂ − 2(r̂·n̂)·n̂ ]
      const dx = Y[6] - Y[3], dy = Y[7] - Y[4], dz = Y[8] - Y[5];   // Moon rel Earth
      const r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2);
      const ir = 1 / r, ir4 = 1 / (r2 * r2);
      const rx = dx * ir, ry = dy * ir, rz = dz * ir;
      const c = rx * AXIS[0] + ry * AXIS[1] + rz * AXIS[2];         // r̂·n̂
      const k = KJ2 * ir4;
      const f5 = 5 * c * c - 1;
      const ax = k * (f5 * rx - 2 * c * AXIS[0]);
      const ay = k * (f5 * ry - 2 * c * AXIS[1]);
      const az = k * (f5 * rz - 2 * c * AXIS[2]);
      dY[3 * n + 6] += ax; dY[3 * n + 7] += ay; dY[3 * n + 8] += az;                       // Moon
      const q = GM_M / GM_E;
      dY[3 * n + 3] -= q * ax; dY[3 * n + 4] -= q * ay; dY[3 * n + 5] -= q * az;           // reaction on Earth
    }
  };
}

const unwrap = (arr) => { let off = 0; const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) { const dd = arr[i] - arr[i - 1];
    if (dd < -Math.PI) off += 2 * Math.PI; else if (dd > Math.PI) off -= 2 * Math.PI;
    out.push(arr[i] + off); } return out; };

function linFit(t, y) {
  let st = 0, sy = 0, stt = 0, sty = 0; const n = t.length;
  for (let i = 0; i < n; i++) { st += t[i]; sy += y[i]; stt += t[i] * t[i]; sty += t[i] * y[i]; }
  const b = (n * sty - st * sy) / (n * stt - st * st);
  return { a: (sy - b * st) / n, b };
}

function runSystem(opts, moonIC, years, dt) {
  const { Y, gms, n } = makeSystem(opts, moonIC);
  const deriv = makeDeriv(gms, n, opts.j2);
  const E0 = energyOf(Y, gms, n);   // v4 step-ladder drift metric
  const h_s = dt * DAY;
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), Yt = new Float64Array(6 * n);
  const sampleEvery = Math.max(1, Math.round((opts.sampleDays || 0.25) / dt));   // v4: coarser sampling for multi-kyr windows (all extracted bands ≫ 2 d)
  const nSteps = Math.round(years * 365.25 / dt);
  const S = { t: [], lam: [], beta: [], lamS: [], lamJ: [], lamV: [], lamMa: [], lamSa: [], w: [], Om: [] };
  const jJ = opts.planets ? 3 + PLANET_KEYS.indexOf('jupiter') : -1;
  const jV = opts.planets ? 3 + PLANET_KEYS.indexOf('venus') : -1;
  const jMa = opts.planets ? 3 + PLANET_KEYS.indexOf('mars') : -1;
  const jSa = opts.planets ? 3 + PLANET_KEYS.indexOf('saturn') : -1;
  if (opts.recordEclipticNormal) S.eclN = [];
  const fE = GM_E / GM_EM, fM = GM_M / GM_EM;
  for (let s = 0; s <= nSteps; s++) {
    if (s % sampleEvery === 0) {
      const rx = Y[6] - Y[3], ry = Y[7] - Y[4], rz = Y[8] - Y[5];
      const vx = Y[3 * n + 6] - Y[3 * n + 3], vy = Y[3 * n + 7] - Y[3 * n + 4], vz = Y[3 * n + 8] - Y[3 * n + 5];
      S.t.push(s * dt);
      S.lam.push(Math.atan2(ry, rx));
      S.beta.push(Math.atan2(rz, Math.hypot(rx, ry)));
      if (opts.recordEclipticNormal) {
        // EMB orbital plane around the Sun — the lab's true "ecliptic of date"
        const ex = fE * Y[3] + fM * Y[6] - Y[0], ey = fE * Y[4] + fM * Y[7] - Y[1], ez = fE * Y[5] + fM * Y[8] - Y[2];
        const evx = fE * Y[3 * n + 3] + fM * Y[3 * n + 6] - Y[3 * n], evy = fE * Y[3 * n + 4] + fM * Y[3 * n + 7] - Y[3 * n + 1], evz = fE * Y[3 * n + 5] + fM * Y[3 * n + 8] - Y[3 * n + 2];
        let hx = ey * evz - ez * evy, hy = ez * evx - ex * evz, hz = ex * evy - ey * evx;
        const hn = Math.hypot(hx, hy, hz);
        S.eclN.push([hx / hn, hy / hn, hz / hn]);
      }
      S.lamS.push(Math.atan2(Y[1] - Y[4], Y[0] - Y[3]));
      if (jJ > 0) S.lamJ.push(Math.atan2(Y[3 * jJ + 1] - Y[1], Y[3 * jJ] - Y[0]));
      if (jV > 0) S.lamV.push(Math.atan2(Y[3 * jV + 1] - Y[1], Y[3 * jV] - Y[0]));
      if (jMa > 0) S.lamMa.push(Math.atan2(Y[3 * jMa + 1] - Y[1], Y[3 * jMa] - Y[0]));
      if (jSa > 0) S.lamSa.push(Math.atan2(Y[3 * jSa + 1] - Y[1], Y[3 * jSa] - Y[0]));
      const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
      const rn = Math.hypot(rx, ry, rz);
      S.w.push(Math.atan2((vz * hx - vx * hz) / GM_EM - ry / rn, (vy * hz - vz * hy) / GM_EM - rx / rn));
      S.Om.push(Math.atan2(hx, -hy));
      if (opts.recordInc) (S.inc || (S.inc = [])).push(Math.atan2(Math.hypot(hx, hy), hz));   // v4 E3c: osculating inclination
    }
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + 0.5 * h_s * k1[i];
    deriv(Yt, k2);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + 0.5 * h_s * k2[i];
    deriv(Yt, k3);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + h_s * k3[i];
    deriv(Yt, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h_s / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  for (const k of ['lam', 'lamS', 'lamJ', 'lamV', 'lamMa', 'lamSa', 'w', 'Om']) if (S[k].length) S[k] = unwrap(S[k]);
  S.energyDrift = Math.abs((energyOf(Y, gms, n) - E0) / E0) / (years / 100);   // relative drift per century
  return S;
}

// ── total system energy (per GM convention) — step-ladder drift metric ─────
function energyOf(Y, gms, n) {
  let E = 0;
  for (let i = 0; i < n; i++) {
    const v2 = Y[3 * n + 3 * i] ** 2 + Y[3 * n + 3 * i + 1] ** 2 + Y[3 * n + 3 * i + 2] ** 2;
    E += 0.5 * gms[i] * v2;
    for (let j = i + 1; j < n; j++) {
      const dx = Y[3 * j] - Y[3 * i], dy = Y[3 * j + 1] - Y[3 * i + 1], dz = Y[3 * j + 2] - Y[3 * i + 2];
      E -= gms[i] * gms[j] / Math.hypot(dx, dy, dz);
    }
  }
  return E;
}

// ── differential detrend + single-argument amplitude (PART B machinery) ────
function detrended(SA, SB) {
  const N = SA.t.length;
  const dl = new Float64Array(N);
  for (let i = 0; i < N; i++) dl[i] = (SA.lam[i] - SB.lam[i]) / d2r;
  let s0 = N, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < N; i++) { const x = SA.t[i] / 36525, x2 = x * x;
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2; b0 += dl[i]; b1 += dl[i] * x; b2 += dl[i] * x2; }
  const M = [[s0, s1, s2, b0], [s1, s2, s3, b1], [s2, s3, s4, b2]];
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < 3; r++) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < 4; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  const c2 = M[2][3] / M[2][2], c1 = (M[1][3] - M[1][2] * c2) / M[1][1], c0 = (M[0][3] - M[0][1] * c1 - M[0][2] * c2) / M[0][0];
  for (let i = 0; i < N; i++) { const x = SA.t[i] / 36525; dl[i] -= c0 + c1 * x + c2 * x * x; }
  return dl;
}
function ampAt(dl, T, thetaFn) {
  let ss = 0, sc = 0, scs = 0, bs = 0, bc = 0; const N = T.length;
  for (let i = 0; i < N; i++) {
    const th = thetaFn(i), s = Math.sin(th), c = Math.cos(th);
    ss += s * s; sc += c * c; scs += s * c; bs += dl[i] * s; bc += dl[i] * c;
  }
  const det = ss * sc - scs * scs;
  return Math.hypot((bs * sc - bc * scs) / det, (bc * ss - bs * scs) / det);
}

// ═══ v4: importable machinery (IP-v4-lab.md) — the campaign report below
// only runs when this file is the entry point ═══════════════════════════════
module.exports = { runSystem, makeSystem, makeDeriv, energyOf, detrended, ampAt, PLANETS, PLANET_KEYS, linFit, unwrap, GM_EM, DAY, d2r, eS, EPS_J2000 };

if (require.main === module) {

// ── Moon ICs from the D1 calibration (3-body definitional match) ───────────
printHeader();
console.log('\ncalibrating lunar ICs via the D1 laboratory...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };
console.log(`ICs: a ${moonIC.a.toFixed(2)} km  e_osc ${moonIC.e.toFixed(7)}  i_osc ${(moonIC.i / d2r).toFixed(4)}°`);

const t0 = Date.now();
const base3 = runSystem({ planets: false, j2: false }, moonIC, YEARS, DTD);
const j2_3  = runSystem({ planets: false, j2: true  }, moonIC, YEARS, DTD);
const full  = runSystem({ planets: true,  j2: true  }, moonIC, YEARS, DTD);
console.log(`three systems integrated in ${((Date.now() - t0) / 1000).toFixed(1)} s (${base3.t.length} samples each)`);

// ═══ PART A: secular rates + latitude main from the FULL system ════════════
function secular(S, label) {
  const fW = linFit(S.t, S.w), fOm = linFit(S.t, S.Om), fLam = linFit(S.t, S.lam);
  const aps = 2 * Math.PI / fW.b, nod = -2 * Math.PI / fOm.b;
  // latitude main: project β on sin(F), F = λ − Ω(fit)
  let ss = 0, sc = 0, scs = 0, bs = 0, bc = 0;
  for (let i = 0; i < S.t.length; i++) {
    const F = (fLam.a + fLam.b * S.t[i]) - (fOm.a + fOm.b * S.t[i]);
    const s = Math.sin(F), c = Math.cos(F);
    ss += s * s; sc += c * c; scs += s * c; bs += S.beta[i] * s; bc += S.beta[i] * c;
  }
  const det = ss * sc - scs * scs;
  const amp = Math.hypot((bs * sc - bc * scs) / det, (bc * ss - bs * scs) / det) / d2r;
  console.log(`  ${label.padEnd(18)} apsidal ${aps.toFixed(2)} d   nodal ${nod.toFixed(2)} d   lat-main ${amp.toFixed(6)}° (${(amp / 5.128122 * 100).toFixed(2)}% of Meeus)`);
  return { aps, nod, amp };
}
console.log('\n── PART A: secular elements (D1-residual closure test) ──');
console.log('  reference: framework inputs apsidal 3231.493 d / nodal 6798.38 d; Meeus lat-main 5.128122°');
const A3b = secular(base3, 'base3 (D1)');
const Aj2 = secular(j2_3, 'base3 + J2');
const Afl = secular(full, '8-body + J2');
console.log(`  gap vs inputs:  base3 ${((A3b.aps / 3231.493 - 1) * 1e4).toFixed(1)}‱ / ${((A3b.nod / 6798.38 - 1) * 1e4).toFixed(1)}‱   full ${((Afl.aps / 3231.493 - 1) * 1e4).toFixed(1)}‱ / ${((Afl.nod / 6798.38 - 1) * 1e4).toFixed(1)}‱`);

// ═══ PART B: differential term extraction (detrended/ampAt defined above,
// exported for the v4 campaign scripts) ═════════════════════════════════════

console.log('\n── PART B1: pure-J2 differential (j2_3 − base3) ──');
{
  const dl = detrended(j2_3, base3);
  const T = base3.t;
  const fLam = linFit(j2_3.t, j2_3.lam), fOm = linFit(j2_3.t, j2_3.Om);
  const lpf = ampAt(dl, T, i => (fOm.a + fOm.b * T[i]));       // Lp − F = Ω argument
  console.log(`  Lp − F amplitude: ${(lpf * 1e6).toFixed(0)}e-6°   (Meeus 1962 — the flattening term, DERIVED from J2)`);
}

console.log('\n── PART B2: full planetary differential (full − base3) ──');
{
  const dl = detrended(full, base3);
  const T = base3.t;
  const fLam = linFit(full.t, full.lam), fW = linFit(full.t, full.w), fJ = linFit(full.t, full.lamJ);
  const a2 = ampAt(dl, T, i => (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]) - 2 * (fJ.a + fJ.b * T[i]));
  console.log(`  A2 (Lp + ϖ − 2λ_J): ${(a2 * 1e6).toFixed(0)}e-6°   (Meeus 318)`);
  const a1m = ampAt(dl, T, i => (119.75 + 131.849 * (T[i] / 36525)) * d2r);
  console.log(`  A1 at Meeus rate:   ${(a1m * 1e6).toFixed(0)}e-6°   (Meeus 3958)`);
  const peaks = [];
  for (let rate = 30; rate <= 600; rate += 0.5) {
    peaks.push({ rate, amp: ampAt(dl, T, i => rate * (T[i] / 36525) * d2r) });
  }
  peaks.sort((a, b) => b.amp - a.amp);
  const shown = [];
  for (const p of peaks) {
    if (shown.some(q => Math.abs(q.rate - p.rate) < 8)) continue;
    shown.push(p);
    if (shown.length >= 8) break;
  }
  shown.sort((a, b) => a.rate - b.rate);
  console.log('  slow-band periodogram peaks:');
  for (const p of shown) {
    console.log(`    rate ${p.rate.toFixed(1).padStart(6)} °/cy (period ${(36000 / p.rate).toFixed(0).padStart(5)} yr)  amp ${(p.amp * 1e6).toFixed(0).padStart(6)}e-6°${Math.abs(p.rate - 131.849) < 8 ? '  ← A1 band' : ''}`);
  }
}

// ═══ PART C (v3): JOINT multi-argument LSQ of the fast planetary band ══════
// The single-argument A2 extraction was contaminated by unresolved planetary
// neighbors; fit the whole Lp+ϖ−2λ_P family simultaneously.
{
  const dl = detrended(full, base3);
  const T = base3.t;
  const fLam = linFit(full.t, full.lam), fW = linFit(full.t, full.w);
  const planets = [
    { key: 'V', f: linFit(full.t, full.lamV) },
    { key: 'Ma', f: linFit(full.t, full.lamMa) },
    { key: 'J', f: linFit(full.t, full.lamJ) },
    { key: 'Sa', f: linFit(full.t, full.lamSa) },
  ];
  const K = planets.length * 2;
  const basisAt = (i) => {
    const base = (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]);
    const row = [];
    for (const p of planets) {
      const th = base - 2 * (p.f.a + p.f.b * T[i]);
      row.push(Math.sin(th), Math.cos(th));
    }
    return row;
  };
  const G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  for (let i = 0; i < T.length; i++) {
    const row = basisAt(i);
    for (let k = 0; k < K; k++) {
      b[k] += dl[i] * row[k];
      for (let j = k; j < K; j++) G[k][j] += row[k] * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const M = G.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < K; col++) {
    let piv = col; for (let r = col + 1; r < K; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < K; r++) { const f = M[r][col] / M[col][col]; for (let cc = col; cc <= K; cc++) M[r][cc] -= f * M[col][cc]; }
  }
  const x = new Float64Array(K);
  for (let col = K - 1; col >= 0; col--) {
    let s = M[col][K]; for (let cc = col + 1; cc < K; cc++) s -= M[col][cc] * x[cc];
    x[col] = s / M[col][col];
  }
  console.log('\n── PART C (v3): joint LSQ — the Lp + ϖ − 2λ_P family ──');
  for (let p = 0; p < planets.length; p++) {
    const amp = Math.hypot(x[2 * p], x[2 * p + 1]) * 1e6;
    const tag = planets[p].key === 'J' ? '   (A2 — Meeus 318)' : '';
    console.log(`  Lp + ϖ − 2λ_${planets[p].key.padEnd(2)}: ${amp.toFixed(0).padStart(6)}e-6°${tag}`);
  }
}

// ═══ PART D (v3): nodal-definition demodulation (the −7.8‱ puzzle) ═════════
// Two node-rate estimators on the SAME dynamics: (1) osculating h-vector
// linfit (the current extraction), (2) the LATITUDE node — per-window LSQ of
// β ≈ i·sin(λ − Ω_w) using the true λ series, then a linfit of Ω_w over
// window centers. If (2) lands near the observed 6798.38 while (1) stays at
// ~6793, the framework input is the latitude-node convention and the "gap"
// was definitional.
function latitudeNodePeriod(S, label) {
  const WIN_YR = 2, stepD = S.t[1] - S.t[0];
  const perWin = Math.round(WIN_YR * 365.25 / stepD);
  const centers = [], oms = [];
  for (let s0 = 0; s0 + perWin <= S.t.length; s0 += perWin) {
    let ss = 0, sc = 0, scs = 0, bs = 0, bc = 0;
    for (let i = s0; i < s0 + perWin; i++) {
      const sl = Math.sin(S.lam[i]), cl = Math.cos(S.lam[i]);
      ss += sl * sl; sc += cl * cl; scs += sl * cl;
      bs += S.beta[i] * sl; bc += S.beta[i] * cl;
    }
    const det = ss * sc - scs * scs;
    const A = (bs * sc - bc * scs) / det;            // i·cosΩ
    const B = (bc * ss - bs * scs) / det;            // −i·sinΩ
    centers.push(S.t[s0 + Math.floor(perWin / 2)]);
    oms.push(Math.atan2(-B, A));
  }
  const omU = unwrap(oms);
  const f = linFit(centers, omU);
  const periodD = -2 * Math.PI / f.b;
  const fOm = linFit(S.t, S.Om);
  const periodH = -2 * Math.PI / fOm.b;
  console.log(`  ${label.padEnd(14)} h-vector node ${periodH.toFixed(2)} d   latitude node ${periodD.toFixed(2)} d   (observed input 6798.38)`);
}
console.log('\n── PART D (v3): node-rate estimator comparison ──');
latitudeNodePeriod(base3, 'base3');
latitudeNodePeriod(full, '8-body + J2');

}  // end require.main guard (v4 importable-machinery wrap)
