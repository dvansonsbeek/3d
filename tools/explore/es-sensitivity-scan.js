/**
 * es-sensitivity-scan.js — Stage D × Stage C bridge: measure how the Moon's
 * secular rates and Meeus amplitudes respond to the SOLAR eccentricity e_S,
 * using the D1 first-principles 3-body laboratory, then convert the response
 * into the framework's deep-time law via the fully-derived e_E channel.
 *
 * Goal: derive the planetary Lp T² remainder (+0.0020131°/cy²) as
 * k · [e_E²(t) − e_E²(J2000)]  — a BOUNDED carrier, because the derived e_E
 * channel is bounded. RESULT: achieved at 95.1% (k = −2704 vs record-implied
 * −2844); the record-normalized carrier is SHIPPED as _fwLpPlanetaryCarrier
 * (src/script.js + tools mirror) — the former "last labeled-empirical
 * polynomial" now has a derived origin and bounded deep-time form.
 *
 * SUPERSEDED NOTES (v4 campaign): (1) the "95.1%" compared a protocol-biased
 * k against a 4-part total — the K_PL budget decomposes the remainder with
 * primary sources (v4-kpl-budget.js) and the convention-free adiabatic ramp
 * (v4-e5-adiabatic-ramp.js) measures k = −2370 ± 40, exposing this scan's
 * fixed-mean-a protocol as an m²-order held-quantity artifact (E5);
 * (2) the shipped carrier is now SPLIT (channel-only k = −2332 +
 * _fwLpObliquityCarrier for figure+frame). This scan's s_ϖ/s_Ω exponent
 * measurements are ratio-based and protocol-robust — they stand (the v4
 * frame audit identified them as the PHYSICAL exponents, 100.3%/101.5%).
 *
 * Method: calibrate ICs once at e_S(J2000); then vary ONLY e_S across the
 * channel's bounded range with all lunar ICs fixed (partial derivative in
 * the Adams–Laplace sense: ∂n/∂e'² at fixed lunar orbit). Fit responses
 * linearly in e_S², convert with the channel's d(e²)/dt at J2000.
 *
 * Also measured for free: the e_E-sensitivity exponents of the apsidal and
 * nodal rates (the framework's s_ϖ = 2.407 and s_Ω = 1.018 from pure
 * gravity) and the E-factor's ∝e_S scaling of M-bearing amplitudes.
 *
 * Usage: node tools/explore/es-sensitivity-scan.js [yearsPerRun=60]
 */

const D1 = require('./derive-meeus-amplitudes');
const DT = require('../lib/deep-time');

const YEARS = parseFloat(process.argv[2] || '60');
const R2D = 180 / Math.PI;
const eS0 = D1.eS;

// ── the framework's bounded e_E channel range ──────────────────────────────
let eMin = Infinity, eMax = -Infinity;
for (let y = -170000; y <= 170000; y += 250) {
  const e = DT._fwEarthEcc(y);
  if (e < eMin) eMin = e;
  if (e > eMax) eMax = e;
}
console.log(`e_E channel: J2000 ${DT._fwEarthEcc(0).toFixed(7)}  bounded range [${eMin.toFixed(7)}, ${eMax.toFixed(7)}]`);

// channel slope at J2000 (per century)
const de2dT = (Math.pow(DT._fwEarthEcc(50), 2) - Math.pow(DT._fwEarthEcc(-50), 2)) / 1;   // Δ(e²) per cy
console.log(`channel at J2000: e(−50) ${DT._fwEarthEcc(-50).toFixed(7)}  e(+50) ${DT._fwEarthEcc(50).toFixed(7)}  d(e²)/dT ${de2dT.toExponential(4)} /cy`);

// ── baseline calibration at J2000 e_S ──────────────────────────────────────
console.log('\ncalibrating ICs at e_S(J2000)...');
const { eIC, iIC, aIC } = D1.calibrate(eS0, true);
console.log(`ICs at J2000: e_osc ${eIC.toFixed(7)}  i_osc ${(iIC * R2D).toFixed(4)}°  a ${aIC.toFixed(2)} km`);

// Fixed-ACTION scan (Adams–Laplace): raw fixed ICs are polluted — the forced
// components at the t=0 phase shift with e_S, dragging the free elements and
// mean a. Instead hold the adiabatic invariants (free e, free i, mean
// osculating a) at their baseline values by re-calibrating ICs per point;
// the surviving n/rate changes are the pure ∂/∂e_S² at fixed lunar orbit.
const DTW = 0.02;                    // identical window+step everywhere → systematics cancel
const baseline = D1.analyzeRun(D1.integrate(eIC, iIC, aIC, YEARS, DTW, eS0));
const TGT = { eFree: baseline.eFree, iFree: baseline.iFree, aOsc: baseline.aOsc };
console.log(`fixed-action targets: free e ${TGT.eFree.toFixed(8)}  free i ${(TGT.iFree * R2D).toFixed(5)}°  mean a ${TGT.aOsc.toFixed(3)} km`);

function fixedActionRun(eSv) {
  let e = eIC, i = iIC, a = aIC, A = null;
  for (let it = 0; it < 6; it++) {
    A = D1.analyzeRun(D1.integrate(e, i, a, YEARS, DTW, eSv));
    const de = TGT.eFree / A.eFree, di = TGT.iFree / A.iFree, da = TGT.aOsc / A.aOsc;
    if (Math.abs(de - 1) < 3e-7 && Math.abs(di - 1) < 3e-7 && Math.abs(da - 1) < 1e-9) break;
    e *= Math.pow(de, 0.8); i *= Math.pow(di, 0.8); a *= da;
  }
  return A;
}

// ── scan ───────────────────────────────────────────────────────────────────
const ES = [eMin, 0.0125, 0.0146, eS0, 0.0190, 0.0210, eMax];
const AMP_ARGS = [[0,0,1,0], [2,0,-1,0], [2,0,0,0], [0,0,2,0], [0,1,0,0], [0,0,0,2], [2,0,-2,0], [1,0,0,0]];
const LAT_ARGS = [[0,0,0,1], [0,0,1,1], [0,0,1,-1], [2,0,0,-1]];
const rows = [];
console.log('\n   e_S        month(d)        T_aps(d)   T_nod(d)    EoC(°)     evection   variation  annual     parallax   latmain');
for (const eSv of ES) {
  const A = fixedActionRun(eSv);
  const lonResid = A.lam.map((v, i) => v - (A.fLam.a + A.fLam.b * A.T[i]));
  const amps = D1.project(A, lonResid, AMP_ARGS);
  const lat = D1.project(A, A.beta, LAT_ARGS);
  const row = {
    eS: eSv,
    n: A.fLam.b,                                   // rad/day
    month: 2 * Math.PI / A.fLam.b,
    apsRate: A.fW.b, nodRate: A.fOm.b,
    Taps: 2 * Math.PI / A.fW.b, Tnod: -2 * Math.PI / A.fOm.b,
    eoc: amps[0] * R2D, evec: amps[1] * R2D, vari: amps[2] * R2D,
    annual: amps[4] * R2D, parallax: amps[7] * R2D, latmain: lat[0] * R2D,
  };
  rows.push(row);
  console.log(` ${eSv.toFixed(7)} ${row.month.toFixed(8).padStart(14)} ${row.Taps.toFixed(2).padStart(10)} ${row.Tnod.toFixed(2).padStart(10)}`
    + ` ${row.eoc.toFixed(5).padStart(9)} ${row.evec.toFixed(6).padStart(10)} ${row.vari.toFixed(6).padStart(10)}`
    + ` ${row.annual.toFixed(6).padStart(10)} ${row.parallax.toFixed(6).padStart(10)} ${row.latmain.toFixed(5).padStart(9)}`);
}

// ── linear responses in e_S² ───────────────────────────────────────────────
function slope(xs, ys) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = xs.length;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i]*xs[i]; sxy += xs[i]*ys[i]; }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}
const x2 = rows.map(r => r.eS * r.eS);
const base = rows.find(r => r.eS === eS0);

const dn_de2 = slope(x2, rows.map(r => r.n));                       // rad/day per e²
const k_deg_cy = dn_de2 * R2D * 36525;                              // °/cy per e²
const dlnAps_de2 = slope(x2, rows.map(r => Math.log(r.apsRate / base.apsRate)));
const dlnNod_de2 = slope(x2, rows.map(r => Math.log(r.nodRate / base.nodRate)));
const dlnAnnual_dlnE = slope(rows.map(r => Math.log(r.eS)), rows.map(r => Math.log(Math.abs(r.annual))));
const dlnEoc_de2 = slope(x2, rows.map(r => Math.log(Math.abs(r.eoc / base.eoc))));
const dlnEvec_de2 = slope(x2, rows.map(r => Math.log(Math.abs(r.evec / base.evec))));

console.log('\n── measured responses (pure 3-body gravity) ──');
console.log(`dn/d(e_S²)          = ${dn_de2.toExponential(5)} rad/day  →  k = ${k_deg_cy.toFixed(1)} °/cy per unit e²`);
console.log(`dln(apsRate)/d(e²)  = ${dlnAps_de2.toFixed(3)}   →  s_ϖ,grav = ${(dlnAps_de2 / 1.5).toFixed(3)}   (framework Clairaut s_ϖ = 2.407)`);
console.log(`dln(nodRate)/d(e²)  = ${dlnNod_de2.toFixed(3)}   →  s_Ω,grav = ${(dlnNod_de2 / 1.5).toFixed(3)}   (framework derived  s_Ω = 1.018)`);
console.log(`annual eq ∝ e_S^x   : x = ${dlnAnnual_dlnE.toFixed(4)}   (E-factor law expects 1.0)`);
console.log(`EoC, evection dln/de²: ${dlnEoc_de2.toFixed(3)}, ${dlnEvec_de2.toFixed(3)}   (E-factor exempts M-free terms — expect ≈0)`);

// ── the planetary T² derivation ────────────────────────────────────────────
const T2_REQUIRED = -0.0015786 - (-25.86 / 3600) / 2;               // T2_LP − T2_LP_TIDAL (framework record value)
const T2_predicted = 0.5 * k_deg_cy * de2dT;
console.log('\n── planetary Lp T² carrier ──');
console.log(`predicted  T² = ½·k·d(e²)/dT = ${T2_predicted.toFixed(7)} °/cy²  (${(T2_predicted * 3600).toFixed(2)}″/cy²)`);
console.log(`required   T² (record)       = ${T2_REQUIRED.toFixed(7)} °/cy²  (${(T2_REQUIRED * 3600).toFixed(2)}″/cy²)`);
console.log(`ratio predicted/required     = ${(T2_predicted / T2_REQUIRED * 100).toFixed(1)}%`);

// bounded carrier vs unbounded T² at deep-time epochs
console.log('\n── bounded carrier  Lp_pl(t) = k·∫(e_E²−e0²)dT  vs the T² extrapolation ──');
const e0sq = Math.pow(DT._fwEarthEcc(0), 2);
function carrierDeg(yTarget) {                                       // integrate channel from 0 to yTarget
  const steps = Math.max(10, Math.round(Math.abs(yTarget) / 10));
  const dy = yTarget / steps;
  let acc = 0;
  for (let s = 0; s < steps; s++) {
    const y = (s + 0.5) * dy;
    acc += (Math.pow(DT._fwEarthEcc(y), 2) - e0sq) * dy;
  }
  return k_deg_cy * acc / 100;                                       // (°/cy per e²)·(e²·yr)/100 → °
}
console.log('   epoch      carrier(°)      T²-extrap(°)');
for (const yr of [-584, 12000, 52000, 122000, 200000]) {
  const y = yr - 2000;
  const Tcy = y / 100;
  console.log(String(yr).padStart(8), carrierDeg(y).toFixed(4).padStart(12), (T2_REQUIRED * Tcy * Tcy).toFixed(4).padStart(14));
}
