#!/usr/bin/env node
/**
 * derive-nutation-torque-integration.js — the EXACT nutation derivation
 * (v4-lab style), refining derive-nutation-amplitudes.js's first-order
 * closed form (which recovers 78%/58%).
 *
 * METHOD. Integrate the spin axis ŝ under the standard spin-averaged
 * luni-solar torque on the equatorial bulge:
 *
 *   dŝ/dt = Σ_b α_b (r̂_b·ŝ)(r̂_b × ŝ)
 *
 * with framework-native bodies: the Sun on the ecliptic at the framework
 * year, the Moon on its inclined orbit (i = the dynamical inclination,
 * doc 66) whose node REGRESSES at the model's own 18.6-yr rate. The
 * relative torque strengths α_moon/α_sun are fixed by the framework's own
 * GM values (GM_MOON_ALONE/a_M³ vs GM_SUN/AU³ — the split EMERGES, it is
 * not input), and the single overall scale is calibrated so the secular
 * precession rate equals the H/13 identity 1,296,000″/(H/13 yr) —
 * zero new constants, the doc-24 pattern.
 *
 * EXTRACTION. LSQ of ε(t) and ψ(t)·sin ε on {1, t, sin Ω(t), cos Ω(t)}:
 * the node-frequency line amplitudes are the 18.6-yr nutation terms.
 * Validation reference: IAU 1980 leading terms (astro-reference.json
 * nutationLeadingTermsArcsec — the citation block, never the source):
 * Δψ = −17.20″ sin Ω, Δε = +9.20″ cos Ω.
 *
 * Usage: node tools/explore/derive-nutation-torque-integration.js [years=38] [dtDays=0.25]
 */

const C = require('../lib/constants');

const D2R = Math.PI / 180;
const YEARS = parseFloat(process.argv[2] || '38');       // ~2 node periods
const DT_DAYS = parseFloat(process.argv[3] || '0.25');

// ── framework inputs (all existing constants) ──────────────────────────────
const H = 335317;                                        // the lattice integer (prose-stable)
const PSI_DOT_TARGET = 1296000 / (H / 13);               // ″/yr — the H/13 identity
const EPS0 = C.earthtiltMean * D2R;
const I_MOON = C.moonEclipticInclinationJ2000 * D2R;
const NODE_YEARS = C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays;
const N_OMEGA = 2 * Math.PI / NODE_YEARS;                // rad/yr, retrograde applied below
const YEAR_RAD = 2 * Math.PI;                            // sun mean motion rad/yr (framework year = time unit)
const MOON_RAD = YEAR_RAD * C.meanSolarYearDays / C.moonSiderealMonth; // lunar mean motion rad/yr
// Torque-strength RATIO from framework GMs (the split emerges from these):
const RATIO_MOON_SUN = (C.GM_MOON_ALONE / Math.pow(C.moonDistance, 3)) /
                       (C.GM_SUN / Math.pow(C.currentAUDistance, 3));

// ── body directions (framework-native kinematics) ──────────────────────────
function sunDir(tYr) {
  const L = YEAR_RAD * tYr;
  return [Math.cos(L), Math.sin(L), 0];                  // ecliptic frame, z = ecliptic pole
}
function moonDir(tYr) {
  const Om = -N_OMEGA * tYr;                             // regressing node (model rate)
  const u = MOON_RAD * tYr;                              // argument along the orbit
  const cO = Math.cos(Om), sO = Math.sin(Om), cu = Math.cos(u), su = Math.sin(u), ci = Math.cos(I_MOON), si = Math.sin(I_MOON);
  return [cO * cu - sO * su * ci, sO * cu + cO * su * ci, su * si];
}

// ── axis integration (RK4 on the unit sphere) ──────────────────────────────
function deriv(s, tYr, aSun, aMoon) {
  const out = [0, 0, 0];
  for (const [dir, a] of [[sunDir(tYr), aSun], [moonDir(tYr), aMoon]]) {
    const d = dir;
    const rs = d[0] * s[0] + d[1] * s[1] + d[2] * s[2];
    // (r̂·ŝ)(r̂ × ŝ)
    out[0] += a * rs * (d[1] * s[2] - d[2] * s[1]);
    out[1] += a * rs * (d[2] * s[0] - d[0] * s[2]);
    out[2] += a * rs * (d[0] * s[1] - d[1] * s[0]);
  }
  return out;
}

function integrate(aSun, aMoon) {
  const dt = DT_DAYS / C.meanSolarYearDays;              // years
  const n = Math.floor(YEARS / dt);
  let s = [0, -Math.sin(EPS0), Math.cos(EPS0)];          // axis tilted toward -y at t=0
  const T = [], EPS = [], PSI = [];
  for (let k = 0; k < n; k++) {
    const t = k * dt;
    if (k % 4 === 0) {
      T.push(t);
      EPS.push(Math.acos(s[2]));
      PSI.push(Math.atan2(s[0], -s[1]));                 // longitude of the axis projection
    }
    const k1 = deriv(s, t, aSun, aMoon);
    const s2 = [s[0] + 0.5 * dt * k1[0], s[1] + 0.5 * dt * k1[1], s[2] + 0.5 * dt * k1[2]];
    const k2 = deriv(s2, t + 0.5 * dt, aSun, aMoon);
    const s3 = [s[0] + 0.5 * dt * k2[0], s[1] + 0.5 * dt * k2[1], s[2] + 0.5 * dt * k2[2]];
    const k3 = deriv(s3, t + 0.5 * dt, aSun, aMoon);
    const s4 = [s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2]];
    const k4 = deriv(s4, t + dt, aSun, aMoon);
    s = [s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
         s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
         s[2] + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
    const nn = Math.hypot(s[0], s[1], s[2]);
    s = [s[0] / nn, s[1] / nn, s[2] / nn];
  }
  return { T, EPS, PSI };
}

// ── LSQ on {1, t, sinΩ, cosΩ} ──────────────────────────────────────────────
function fitNodeLine(T, series) {
  const n = T.length, K = 4;
  const B = T.map((t) => [1, t, Math.sin(-N_OMEGA * t), Math.cos(-N_OMEGA * t)]);
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K);
  for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) {
    b[k] += B[i][k] * series[i];
    for (let j = k; j < K; j++) G[k][j] += B[i][k] * B[i][j];
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
    let ssum = x[c]; for (let cc = c + 1; cc < K; cc++) ssum -= Gm[c][cc] * out[cc];
    out[c] = ssum / Gm[c][c];
  }
  return out; // [const, slope, sinAmp, cosAmp]
}

// ── calibrate the single overall scale to the H/13 rate ────────────────────
// ψ̇ secular ∝ scale; one pilot run measures the rate, then rescale exactly.
const A2R = 1 / 3600 * D2R;
let aSun = 8 * A2R, aMoon = 8 * A2R * RATIO_MOON_SUN;    // rough seed (″/yr scale)
let run = integrate(aSun, aMoon);
let fitP = fitNodeLine(run.T, run.PSI);
const measuredRate = -fitP[1] / A2R;                     // ″/yr (retrograde)
const scale = PSI_DOT_TARGET / measuredRate;
aSun *= scale; aMoon *= scale;
run = integrate(aSun, aMoon);
fitP = fitNodeLine(run.T, run.PSI);
const fitE = fitNodeLine(run.T, run.EPS);

const psiRate = -fitP[1] / A2R;
const aPsiSin = -fitP[2] / A2R;                          // Δψ·sinΩ coefficient (sign: IAU −17.2 on sinΩ)
const aEpsCos = fitE[3] / A2R;                           // Δε·cosΩ coefficient
const IAU = C.NUTATION_LEADING_TERMS_ARCSEC;

console.log('Nutation from the framework torque integration (%s yr, dt %s d):', YEARS, DT_DAYS);
console.log('  emergent lunar/solar torque ratio: %s (from framework GMs alone)', RATIO_MOON_SUN.toFixed(4));
console.log('  calibrated secular rate: %s ″/yr (target %s — the H/13 identity)', psiRate.toFixed(3), PSI_DOT_TARGET.toFixed(3));
console.log('  Δψ(sinΩ): derived %s″ | IAU 1980 %s″ | %s%%', aPsiSin.toFixed(2), IAU.psiOmega, (aPsiSin / IAU.psiOmega * 100).toFixed(1));
console.log('  Δε(cosΩ): derived %s″ | IAU 1980 %s″ | %s%%', aEpsCos.toFixed(2), IAU.epsOmega, (aEpsCos / IAU.epsOmega * 100).toFixed(1));
