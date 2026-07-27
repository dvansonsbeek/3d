/**
 * v4-e5-adiabatic-ramp.js — E5 Stage 2 (IP-v4-lab.md follow-up): measure
 * ∂n/∂e_S² with ZERO protocol convention via an adiabatic ramp.
 *
 * Stage 1 ruled out direct planetary terms (+0.47″/cy² only). The remaining
 * candidate for the lab-vs-ELP k gap (−2704 vs −2320) is the held-quantity
 * convention in the fixed-action scan (mean osculating a is held; theory
 * conserves the Delaunay ACTION — the two differ at m² order, exactly the
 * order of k itself).
 *
 * This experiment sidesteps the convention entirely: a restricted 3-body
 * integrator (Earth–Moon relative motion + prescribed solar tide) ramps
 * e_S SLOWLY (500 yr ≫ apsidal 8.85 yr ≫ nodal 18.6 yr) between two
 * constant plateaus. The dynamics conserves the true adiabatic invariant
 * automatically; k_adiab = Δn/Δ(e_S²) measured plateau-to-plateau is the
 * physical sensitivity, no bookkeeping choice anywhere.
 *
 *   k_adiab ≈ −2320 → ELP validated, fixed-mean-a k = protocol artifact;
 *   k_adiab ≈ −2704 → fixed-action protocol validated, ELP number needs
 *                     a different explanation.
 *
 * Usage: node tools/explore/v4-e5-adiabatic-ramp.js [rampYears=500] [dtDays=0.02]
 */

const C = require('../lib/constants');
const DT = require('../lib/deep-time');
const D1 = require('./derive-meeus-amplitudes');

const RAMP_YR = parseFloat(process.argv[2] || '500');
const DTD = parseFloat(process.argv[3] || '0.02');
const PLATEAU_YR = 80;
const DAY = 86400;
const d2r = Math.PI / 180;

// framework constants (identical sourcing to the lab)
const AU_KM = C.currentAUDistance;
const T_SID_YR_S = DT.MEAN_SIDEREAL_YEAR_J2000_S;
const GM_EM = C.GM_EARTH_MOON_SYSTEM;
const GM_HELIO = 4 * Math.PI * Math.PI * Math.pow(AU_KM, 3) / (T_SID_YR_S * T_SID_YR_S);
const GM_S = GM_HELIO - GM_EM;
const A_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
const N_YEAR = 2 * Math.PI / T_SID_YR_S;               // rad/s

const ES_LO = 0.0167102;                                // J2000
const ES_HI = 0.0230790;                                // channel max
const E2_LO = ES_LO * ES_LO, E2_HI = ES_HI * ES_HI;

console.log(`v4 E5 adiabatic ramp: plateaus ${PLATEAU_YR} yr at e_S ${ES_LO}/${ES_HI}, ramp ${RAMP_YR} yr (in e²), dt ${DTD} d`);

// e_S(t): plateau — linear-in-e² ramp — plateau
const T1 = PLATEAU_YR * 365.25 * DAY, T2 = T1 + RAMP_YR * 365.25 * DAY;
function eSAt(t_s) {
  if (t_s <= T1) return ES_LO;
  if (t_s >= T2) return ES_HI;
  const f = (t_s - T1) / (T2 - T1);
  return Math.sqrt(E2_LO + f * (E2_HI - E2_LO));
}

// prescribed geocentric Sun: Earth on Kepler orbit (a_EMB, e_S(t)), Sun at −r_E
function sunGeo(t_s) {
  const e = eSAt(t_s);
  const M = N_YEAR * t_s;
  let E = M;
  for (let it = 0; it < 6; it++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = A_EMB * (Math.cos(E) - e), y = A_EMB * Math.sqrt(1 - e * e) * Math.sin(E);
  return [-x, -y];                                       // Sun seen from Earth (planar problem)
}

// Moon geocentric state; solar tide: GM_S·[(R−r)/|R−r|³ − R/|R|³]
function deriv(t_s, Y, dY) {
  const [x, y, z, vx, vy, vz] = Y;
  const r3 = Math.pow(x * x + y * y + z * z, 1.5);
  const [Sx, Sy] = sunGeo(t_s);
  const dx = Sx - x, dy = Sy - y, dz = -z;
  const dr3 = Math.pow(dx * dx + dy * dy + dz * dz, 1.5);
  const S3 = Math.pow(Sx * Sx + Sy * Sy, 1.5);
  dY[0] = vx; dY[1] = vy; dY[2] = vz;
  dY[3] = -GM_EM * x / r3 + GM_S * (dx / dr3 - Sx / S3);
  dY[4] = -GM_EM * y / r3 + GM_S * (dy / dr3 - Sy / S3);
  dY[5] = -GM_EM * z / r3 + GM_S * (dz / dr3 - 0);
}

// lunar ICs from the D1 calibration (definitional match with the lab)
console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, false);
const aM = cal.aIC, eM = cal.eIC, iM = cal.iIC;
const rp = aM * (1 - eM);
const vp = Math.sqrt(GM_EM * (1 + eM) / (aM * (1 - eM)));
const Y = new Float64Array([rp, 0, 0, 0, vp * Math.cos(iM), vp * Math.sin(iM)]);

const TOTAL_S = T2 + PLATEAU_YR * 365.25 * DAY;
const h = DTD * DAY;
const nSteps = Math.round(TOTAL_S / h);
const sampleEvery = Math.max(1, Math.round(0.25 / DTD));
const lam = [], ts = [];
const k1 = new Float64Array(6), k2 = new Float64Array(6), k3 = new Float64Array(6), k4 = new Float64Array(6), Yt = new Float64Array(6);
const t0 = Date.now();
for (let s = 0; s <= nSteps; s++) {
  const t_s = s * h;
  if (s % sampleEvery === 0) {
    ts.push(t_s / DAY);
    lam.push(Math.atan2(Y[1], Y[0]));
  }
  deriv(t_s, Y, k1);
  for (let i = 0; i < 6; i++) Yt[i] = Y[i] + 0.5 * h * k1[i];
  deriv(t_s + 0.5 * h, Yt, k2);
  for (let i = 0; i < 6; i++) Yt[i] = Y[i] + 0.5 * h * k2[i];
  deriv(t_s + 0.5 * h, Yt, k3);
  for (let i = 0; i < 6; i++) Yt[i] = Y[i] + h * k3[i];
  deriv(t_s + h, Yt, k4);
  for (let i = 0; i < 6; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}
console.log(`integrated ${(TOTAL_S / DAY / 365.25).toFixed(0)} yr in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// unwrap + per-plateau mean motion (skip the first 10 yr of each plateau)
let off = 0; const lamU = [lam[0]];
for (let i = 1; i < lam.length; i++) {
  const dd = lam[i] - lam[i - 1];
  if (dd < -Math.PI) off += 2 * Math.PI; else if (dd > Math.PI) off -= 2 * Math.PI;
  lamU.push(lam[i] + off);
}
function nOver(dayLo, dayHi) {
  let st = 0, sy = 0, stt = 0, sty = 0, n = 0;
  for (let i = 0; i < ts.length; i++) {
    if (ts[i] < dayLo || ts[i] > dayHi) continue;
    st += ts[i]; sy += lamU[i]; stt += ts[i] * ts[i]; sty += ts[i] * lamU[i]; n++;
  }
  return (n * sty - st * sy) / (n * stt - st * st);     // rad/day
}
const SETTLE = 10 * 365.25;
const nLo = nOver(SETTLE, T1 / DAY);
const nHi = nOver(T2 / DAY + SETTLE, TOTAL_S / DAY);
const kAdiab = (nHi - nLo) / (E2_HI - E2_LO) * (180 / Math.PI) * 36525;   // °/cy per e²

console.log(`\nplateau mean motions: n_lo ${nLo.toExponential(8)} rad/d   n_hi ${nHi.toExponential(8)} rad/d`);
console.log(`Δn = ${(nHi - nLo).toExponential(4)} rad/d over Δ(e²) = ${(E2_HI - E2_LO).toExponential(4)}`);
console.log(`\n══ k_adiabatic = ${kAdiab.toFixed(1)} °/cy per unit e² ══`);
console.log(`   fixed-mean-a protocol (E1):   −2704`);
console.log(`   ELP-planetary-implied:        −2320`);
console.log('\nVerdict: k_adiab ≈ −2320 → ELP validated, the fixed-mean-a k is a protocol');
console.log('artifact; k_adiab ≈ −2704 → the fixed-action protocol is physical and the');
console.log('ELP planetary number needs a different decomposition.');
