/**
 * derive-meeus-amplitudes.js — Stage D1: derive the Meeus Ch. 47 periodic
 * amplitudes from FIRST PRINCIPLES using only framework constants.
 *
 * Method: full inertial 3-body integration (Sun, Earth, Moon as point
 * masses; RK4) with framework-native parameters:
 *   GM_(E+M)  = C.GM_EARTH_MOON_SYSTEM  (the framework's own Kepler-derived value)
 *   mass split = C.MASS_RATIO_EARTH_MOON
 *   GM_helio  = 4π²·AU³/T_sid_yr²  (framework AU + sidereal year)
 *   e_M = moonOrbitalEccentricityBase, i = moonEclipticInclinationJ2000,
 *   e_S = the H/16 law J2000 value, a_M from the framework distance.
 * No literature series, no fitted values — the amplitudes must EMERGE.
 *
 * IC calibration (not fitting): the framework e_M and i are MEAN (free)
 * elements; osculating ICs = free + solar-forced. A short coarse run
 * measures the demodulated free e and free i, and the ICs are scaled until
 * the free elements equal the framework values (matching definitions).
 *
 * Extraction: geocentric ecliptic λ(t), β(t); fundamentals from the
 * integration's own osculating elements (M_sun phase = perihelion at t=0 by
 * construction); LSQ projection onto the Meeus argument combinations
 * (public/input/meeus-lunar-tables.json).
 *
 * BONUS derivations: the apsidal and nodal precession periods (two of the
 * framework's three Moon inputs) emerge from the same integration.
 *
 * Usage: node tools/explore/derive-meeus-amplitudes.js [years=40] [dtDays=0.01]
 */

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const MT = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json'), 'utf8'));

const YEARS = parseFloat(process.argv[2] || '40');
const DT = parseFloat(process.argv[3] || '0.01');          // days

// ── framework constants ────────────────────────────────────────────────────
const DAY = 86400;
const AU_KM = 149597870.7;
const T_SID_YR_S = 365.256363004 * DAY;                    // framework sidereal year anchor
const GM_EM = C.GM_EARTH_MOON_SYSTEM;                      // km³/s²
const GM_HELIO = 4 * Math.PI * Math.PI * Math.pow(AU_KM, 3) / (T_SID_YR_S * T_SID_YR_S);
const GM_S = GM_HELIO - GM_EM;
const MR = C.MASS_RATIO_EARTH_MOON;
const GM_E = GM_EM * MR / (MR + 1);
const GM_M = GM_EM / (MR + 1);
const eM = 0.054900489;                                    // moonOrbitalEccentricityBase (mean/free)
const eS = 0.0167102;                                      // H/16 law at J2000
const INC = (C.moonEclipticInclinationJ2000 ?? 5.145) * Math.PI / 180;
const aM = (C.moonDistanceCorrected ?? C.moonDistance);    // km

console.log('framework inputs: GM_EM', GM_EM.toFixed(3), ' GM_S', GM_S.toExponential(6), ' M_E/M_M', MR);
console.log('a_M', aM.toFixed(2), 'km  e_M', eM, ' i', (INC * 180 / Math.PI).toFixed(3), '°  e_S', eS);

// ── Kepler → state ─────────────────────────────────────────────────────────
function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [
    cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si,
    sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si,
    sw * si, cw * si, ci,
  ];
  const rot = (x, y, z) => [R[0]*x + R[1]*y + R[2]*z, R[3]*x + R[4]*y + R[5]*z, R[6]*x + R[7]*y + R[8]*z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

function deriv(Y, dY) {
  const b = [[0, GM_S], [3, GM_E], [6, GM_M]];
  for (let i = 0; i < 9; i++) { dY[i] = Y[9 + i]; dY[9 + i] = 0; }
  for (let A = 0; A < 3; A++) for (let B = A + 1; B < 3; B++) {
    const ia = b[A][0], ib = b[B][0];
    const dx = Y[ib] - Y[ia], dy = Y[ib+1] - Y[ia+1], dz = Y[ib+2] - Y[ia+2];
    const r2 = dx*dx + dy*dy + dz*dz, ir3 = 1 / (r2 * Math.sqrt(r2));
    dY[9+ia]   += b[B][1] * dx * ir3; dY[9+ia+1] += b[B][1] * dy * ir3; dY[9+ia+2] += b[B][1] * dz * ir3;
    dY[9+ib]   -= b[A][1] * dx * ir3; dY[9+ib+1] -= b[A][1] * dy * ir3; dY[9+ib+2] -= b[A][1] * dz * ir3;
  }
}

// ── one full integration + sampling ────────────────────────────────────────
function integrate(eIC, iIC, aIC, years, dt, eSv = eS) {
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eSv, 0, 0, 0, 0);       // EMB rel Sun, perihelion at t=0
  const rel = keplerPosVel(GM_EM, aIC, eIC, iIC, 0, 0, 0);          // Moon rel Earth, perigee@node at t=0
  const Mtot = GM_S + GM_E + GM_M;
  const rE_s = [0,1,2].map(k => emb.r[k] - rel.r[k] * GM_M / GM_EM);
  const rM_s = [0,1,2].map(k => emb.r[k] + rel.r[k] * GM_E / GM_EM);
  const vE_s = [0,1,2].map(k => emb.v[k] - rel.v[k] * GM_M / GM_EM);
  const vM_s = [0,1,2].map(k => emb.v[k] + rel.v[k] * GM_E / GM_EM);
  const rB = [0,1,2].map(k => (GM_E * rE_s[k] + GM_M * rM_s[k]) / Mtot);
  const vB = [0,1,2].map(k => (GM_E * vE_s[k] + GM_M * vM_s[k]) / Mtot);
  const Y = new Float64Array(18);
  for (let k = 0; k < 3; k++) {
    Y[k]     = -rB[k];           Y[9+k]  = -vB[k];
    Y[3+k]   = rE_s[k] - rB[k];  Y[12+k] = vE_s[k] - vB[k];
    Y[6+k]   = rM_s[k] - rB[k];  Y[15+k] = vM_s[k] - vB[k];
  }
  const h_s = dt * DAY;
  const k1 = new Float64Array(18), k2 = new Float64Array(18), k3 = new Float64Array(18), k4 = new Float64Array(18), Yt = new Float64Array(18);
  const sampleEvery = Math.max(1, Math.round(0.2 / dt));
  const nSteps = Math.round(years * 365.25 / dt);
  const S = [];
  for (let s = 0; s <= nSteps; s++) {
    if (s % sampleEvery === 0) {
      S.push({
        t: s * dt,
        rx: Y[6]-Y[3], ry: Y[7]-Y[4], rz: Y[8]-Y[5],
        vx: Y[15]-Y[12], vy: Y[16]-Y[13], vz: Y[17]-Y[14],
        sx: Y[0]-Y[3], sy: Y[1]-Y[4], sz: Y[2]-Y[5],
      });
    }
    // RK4
    deriv(Y, k1);
    for (let i = 0; i < 18; i++) Yt[i] = Y[i] + 0.5 * h_s * k1[i];
    deriv(Yt, k2);
    for (let i = 0; i < 18; i++) Yt[i] = Y[i] + 0.5 * h_s * k2[i];
    deriv(Yt, k3);
    for (let i = 0; i < 18; i++) Yt[i] = Y[i] + h_s * k3[i];
    deriv(Yt, k4);
    for (let i = 0; i < 18; i++) Y[i] += h_s / 6 * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]);
  }
  return S;
}

// ── element/angle machinery ────────────────────────────────────────────────
const unwrap = (arr) => { let off = 0; const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) { const d = arr[i] - arr[i-1];
    if (d < -Math.PI) off += 2 * Math.PI; else if (d > Math.PI) off -= 2 * Math.PI;
    out.push(arr[i] + off); } return out; };

function linFit(t, y) {
  let st = 0, sy = 0, stt = 0, sty = 0; const n = t.length;
  for (let i = 0; i < n; i++) { st += t[i]; sy += y[i]; stt += t[i]*t[i]; sty += t[i]*y[i]; }
  const b = (n * sty - st * sy) / (n * stt - st * st);
  return { a: (sy - b * st) / n, b };
}

function oscSeries(S) {
  const w = [], Om = [], evx = [], evy = [], tx = [], ty = [], aArr = [];
  for (const p of S) {
    const r = [p.rx, p.ry, p.rz], v = [p.vx, p.vy, p.vz];
    const h = [r[1]*v[2]-r[2]*v[1], r[2]*v[0]-r[0]*v[2], r[0]*v[1]-r[1]*v[0]];
    const rn = Math.hypot(...r);
    const ev = [0,1,2].map(k => (v[(k+1)%3]*h[(k+2)%3] - v[(k+2)%3]*h[(k+1)%3]) / GM_EM - r[k]/rn);
    const hn = Math.hypot(...h);
    w.push(Math.atan2(ev[1], ev[0]));
    Om.push(Math.atan2(h[0], -h[1]));
    evx.push(ev[0]); evy.push(ev[1]);
    tx.push(h[0] / hn); ty.push(h[1] / hn);     // tilt vector = (sin i sinΩ, −sin i cosΩ)
    const v2 = v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
    aArr.push(1 / (2 / rn - v2 / GM_EM));       // osculating semi-major (vis-viva)
  }
  return { w: unwrap(w), Om: unwrap(Om), evx, evy, tx, ty, aArr };
}

function analyzeRun(S) {
  const T = S.map(p => p.t);
  const lam = unwrap(S.map(p => Math.atan2(p.ry, p.rx)));
  const lamS = unwrap(S.map(p => Math.atan2(p.sy, p.sx)));
  const beta = S.map(p => Math.atan2(p.rz, Math.hypot(p.rx, p.ry)));
  const osc = oscSeries(S);
  const fLam = linFit(T, lam), fLamS = linFit(T, lamS), fW = linFit(T, osc.w), fOm = linFit(T, osc.Om);
  // demodulated FREE elements (forced periodic parts average out):
  let eFree = 0, siFree = 0;
  for (let i = 0; i < T.length; i++) {
    const wf = fW.a + fW.b * T[i];
    const Of = fOm.a + fOm.b * T[i];
    eFree  += osc.evx[i] * Math.cos(wf) + osc.evy[i] * Math.sin(wf);
    siFree += osc.tx[i] * Math.sin(Of) - osc.ty[i] * Math.cos(Of);
  }
  eFree /= T.length; siFree /= T.length;
  // mean OSCULATING magnitudes (include the solar-forced parts — the
  // classical "mean element" definitions candidate)
  let eOsc = 0, iOsc = 0, aOsc = 0;
  for (let i = 0; i < T.length; i++) {
    eOsc += Math.hypot(osc.evx[i], osc.evy[i]);
    iOsc += Math.asin(Math.hypot(osc.tx[i], osc.ty[i]));
    aOsc += osc.aArr[i];
  }
  eOsc /= T.length; iOsc /= T.length; aOsc /= T.length;
  return { T, lam, lamS, beta, fLam, fLamS, fW, fOm, eFree, iFree: Math.asin(siFree), eOsc, iOsc, aOsc };
}

// ── IC calibration: free elements → framework mean elements ────────────────
// The sidereal month is the INPUT the semi-major axis must reproduce (in the
// 3-body field n²a³ ≠ GM_EM, so a is the derived quantity). The framework's
// e_M is DEFINED by the equation of center — EoC = 2e − e³/4 reproduces the
// observed 6.288774° to 2 ppm — so e is calibrated on the emergent EoC
// amplitude against that same identity (definition match, not fitting).
// i is calibrated on the demodulated free inclination.
// fundamentals (mean angles); Sun perihelion at t=0 by construction → M = n′·t
function meanAnglesFor(A, i) {
  const t = A.T[i];
  const Lp = A.fLam.a + A.fLam.b * t;
  return {
    D:  Lp - (A.fLamS.a + A.fLamS.b * t),
    M:  A.fLamS.b * t,
    Mp: Lp - (A.fW.a + A.fW.b * t),
    F:  Lp - (A.fOm.a + A.fOm.b * t),
  };
}

// ── LSQ projection on Meeus arguments ──────────────────────────────────────
function project(A, series, terms) {
  const K = terms.length, n = series.length;
  const Bs = Array.from({ length: K }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const ang = meanAnglesFor(A, i);
    for (let k = 0; k < K; k++) {
      const tr = terms[k];
      Bs[k][i] = Math.sin(tr[0]*ang.D + tr[1]*ang.M + tr[2]*ang.Mp + tr[3]*ang.F);
    }
  }
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K);
  for (let k = 0; k < K; k++) {
    for (let j = k; j < K; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += Bs[k][i] * Bs[j][i];
      G[k][j] = s; G[j][k] = s;
    }
    let s = 0; for (let i = 0; i < n; i++) s += Bs[k][i] * series[i];
    b[k] = s;
  }
  const Gm = G.map(r => Array.from(r)); const x = Array.from(b);
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

const T_MONTH_TARGET = C.moonSiderealMonthInput ?? 27.32166156;
const EOC_TARGET = 2 * eM - Math.pow(eM, 3) / 4;           // rad — the framework identity
const CAL_ARGS = [[0,0,1,0], [2,0,-1,0], [2,0,0,0], [0,0,2,0], [0,1,0,0], [0,0,0,2], [2,0,-2,0], [1,0,0,0]];

function calibrate(eSv = eS, quiet = false) {
  let eIC = eM, iIC = INC, aIC = aM;
  for (let it = 0; it < 10; it++) {
    const A = analyzeRun(integrate(eIC, iIC, aIC, 18.6, 0.02, eSv));
    const Tm = 2 * Math.PI / A.fLam.b;
    const resid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
    const eoc = project(A, resid, CAL_ARGS)[0];
    const de = EOC_TARGET / eoc, di = INC / A.iFree, da = Math.pow(T_MONTH_TARGET / Tm, 2 / 3);
    if (!quiet) console.log(`calib ${it}: EoC ${(eoc*180/Math.PI).toFixed(5)}° free i ${(A.iFree*180/Math.PI).toFixed(4)}° month ${Tm.toFixed(6)} d → e×${de.toFixed(5)} i×${di.toFixed(5)} a×${da.toFixed(6)}`);
    eIC *= Math.pow(de, 0.7); iIC *= Math.pow(di, 0.7); aIC *= da;
    if (Math.abs(de - 1) < 1e-5 && Math.abs(di - 1) < 1e-5 && Math.abs(da - 1) < 1e-7) break;
  }
  return { eIC, iIC, aIC };
}

function main() {
const { eIC, iIC, aIC } = calibrate();
console.log(`calibrated ICs: e_osc(t0) = ${eIC.toFixed(7)}  i_osc(t0) = ${(iIC*180/Math.PI).toFixed(4)}°  a(t0) = ${aIC.toFixed(2)} km`);

// ── final run ──────────────────────────────────────────────────────────────
console.log(`integrating ${YEARS} yr at dt=${DT} d ...`);
const t0ms = Date.now();
const S = integrate(eIC, iIC, aIC, YEARS, DT);
const A = analyzeRun(S);
console.log(`done in ${((Date.now() - t0ms) / 1000).toFixed(1)} s; ${S.length} samples`);

// derived secular rates → the framework's other two Moon inputs
const apsidalDays = 2 * Math.PI / A.fW.b;
const nodalDays = -2 * Math.PI / A.fOm.b;
const sidMonthDays = 2 * Math.PI / A.fLam.b;
console.log('\n── DERIVED secular elements (emergent, nothing input) ──');
console.log('free e            ', A.eFree.toFixed(7), '   (framework e_M      ', eM, ')');
console.log('mean osculating e ', A.eOsc.toFixed(7), '   (definitional probe)');
console.log('free i            ', (A.iFree * 180 / Math.PI).toFixed(4), '°   (framework i        ', (INC * 180 / Math.PI).toFixed(3), '°)');
console.log('mean osculating i ', (A.iOsc * 180 / Math.PI).toFixed(4), '°   (definitional probe)');
console.log('sidereal month    ', sidMonthDays.toFixed(7), 'd  (framework input   ', C.moonSiderealMonthInput ?? 27.32166156, ')');
console.log('apsidal period    ', apsidalDays.toFixed(2), 'd   (framework input   3231.493)');
console.log('nodal period      ', nodalDays.toFixed(2), 'd   (framework input   6798.38)');

function report(label, series, allTerms, topN) {
  const top = allTerms.map(t => t).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4])).slice(0, topN);
  const amps = project(A, series, top);
  console.log(`\n── ${label} amplitudes: derived (3-body, framework params) vs Meeus ──`);
  console.log("  D  M  M'  F      derived(°)      Meeus(°)     match");
  for (let k = 0; k < top.length; k++) {
    const derived = amps[k] * 180 / Math.PI;
    const meeus = top[k][4] * 1e-6;
    console.log(' ', String(top[k][0]).padStart(2), String(top[k][1]).padStart(2), String(top[k][2]).padStart(2), String(top[k][3]).padStart(2),
      derived.toFixed(6).padStart(12), meeus.toFixed(6).padStart(12),
      ((derived / meeus * 100).toFixed(2) + '%').padStart(9));
  }
}

const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
report('LONGITUDE', lonResid, MT.longitudeTerms.terms, 20);
report('LATITUDE', A.beta, MT.latitudeTerms.terms, 12);

// ── phase probe: is the uniform latitude deficit an F-phase offset? ────────
{
  let sp = 0, cp = 0, n = A.beta.length;
  for (let i = 0; i < n; i++) {
    const F = meanAnglesFor(A, i).F;
    sp += A.beta[i] * Math.sin(F);
    cp += A.beta[i] * Math.cos(F);
  }
  sp = 2 * sp / n; cp = 2 * cp / n;
  const amp = Math.hypot(sp, cp) * 180 / Math.PI;
  const ph = Math.atan2(cp, sp) * 180 / Math.PI;
  console.log(`\nF-phase probe (0,0,0,1): full amplitude ${amp.toFixed(6)}° at phase offset ${ph.toFixed(3)}°`);
  console.log(`  → amplitude/Meeus = ${(amp / 5.128122 * 100).toFixed(2)}%  (sin-only was ${(Math.abs(sp) * 180 / Math.PI / 5.128122 * 100).toFixed(2)}%)`);
}
}   // end main()

module.exports = { integrate, analyzeRun, calibrate, project, meanAnglesFor, MT, eM, INC, eS, aM, EOC_TARGET, T_MONTH_TARGET };
if (require.main === module) main();
