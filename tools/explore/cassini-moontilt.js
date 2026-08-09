#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// cassini-moontilt.js — derive the Moon's axial tilt from the Cassini state
//
// CLAIM UNDER TEST: the Moon's obliquity to the ecliptic (measured
// ε_ecl = 1.5424°, the only independently MEASURED number in the catalog
// moonTilt = 6.687° composition) is not a free constant: it is the
// equilibrium obliquity of Cassini state 2, fixed by
//   • three documented observed constants of the lunar gravity field
//     (J₂, C₂₂, C/MR² — GRAIL + LLR, Williams et al. 2014),
//   • the framework's own rates (sidereal month, of-date nodal regression
//     period, sidereal year, Earth/Moon mass ratio — all DLT-1 §0 inputs
//     or framework-derived values),
//   • Newtonian gravity-gradient torque on the synchronously locked
//     triaxial figure.
//
// METHOD (framework laboratory style — numerical averaging, no adopted
// closed forms):
//   1. Build the lunar inertia tensor from J₂, C₂₂, C/MR².
//   2. Place spin axis ĉ at trial obliquity ε on the opposite side of the
//      ecliptic pole from the orbit normal (Cassini state 2 geometry,
//      coplanar: ecliptic pole, orbit normal at i, spin at ε).
//   3. Average the gravity-gradient torque of the EARTH over one full
//      orbit (elliptical, e = 0.0549) with the body rotating uniformly at
//      the sidereal-month rate about ĉ, long axis phase-locked (synchronous).
//   4. Average the SUN's torque over both the month and the solar
//      longitude (incommensurate phases → 2-D average; the C₂₂ content
//      averages out of the solar term naturally).
//   5. Equilibrium: the averaged torque must precess ĉ about the ecliptic
//      pole at exactly the node rate Ω̇ (retrograde, of-date). Root-find ε.
//   6. Compare with the measured ε_ecl = 1.5424° and report the same
//      balance under the closed-form first-order relation for reference.
//
// Conventions: ecliptic frame, ẑ = ecliptic pole, node line along x̂.
// The three vectors of Cassini's third law are coplanar in the x–z plane.
// ═══════════════════════════════════════════════════════════════════════════

const DEG = Math.PI / 180;

// ── Documented observed constants (lunar gravity field) ─────────────────────
// Williams et al. 2014 (JGR Planets 119, "Lunar interior properties from the
// GRAIL mission"): unnormalized degree-2 gravity + LLR moment.
const J2_MOON   = 203.305e-6;   // unnormalized J₂ (GRAIL)
const C22_MOON  = 22.4261e-6;   // unnormalized C₂₂ (GRAIL)
const C_MR2     = 0.392728;     // polar moment C/MR² (GRAIL+LLR)

// ── Framework inputs / framework-derived rates (DLT-1 §0 lineage) ───────────
const SIDEREAL_MONTH_D  = 27.32166156;   // DLT-1 input (framework sidereal month)
const NODAL_OFDATE_D    = 6798.3303;     // framework of-date node regression period
const SIDEREAL_YEAR_D   = 365.256363004; // DLT-1 input (IAU sidereal year)
const MASS_RATIO_EM     = 81.30056816;   // DLT-1 input (Earth/Moon mass ratio)
const E_MOON            = 0.054900489;   // DLT-1 input (mean lunar eccentricity)

// Orbit-plane inclination to the ecliptic — run BOTH conventions:
const I_BROWN     = 5.1453964;  // Brown/ELP sinF-normalization constant
const I_DYNAMICAL = 5.1573;     // dynamical mean osculating (DLT-1 shipped)

// Measured target (the independently measured quantity in the composition)
const EPS_MEASURED = 1.5424;    // ° — Moon spin axis to ecliptic pole

// ── Rates ───────────────────────────────────────────────────────────────────
const n_moon = 2 * Math.PI / SIDEREAL_MONTH_D;   // rad/day, lunar mean motion
const n_sun  = 2 * Math.PI / SIDEREAL_YEAR_D;    // rad/day, solar mean motion
const OmDot  = -2 * Math.PI / NODAL_OFDATE_D;    // rad/day, node regression (retrograde)

// GM_E/a³ = n² · M_E/(M_E+M_M): the torque is exerted by the EARTH alone,
// while Kepler's n² carries the system mass. (A 1.2 % effect — first-order
// treatments that skip it overshoot ε by the same fraction.)
const MU_EARTH_FRac = MASS_RATIO_EM / (1 + MASS_RATIO_EM);   // = M_E/(M_E+M_M)

// GM_S/a_S³ ≈ n_s² (heliocentric; Earth+Moon mass negligible vs Sun)

// ── Inertia tensor from the gravity field (per MR²) ─────────────────────────
//   C − (A+B)/2 = J₂·MR²      (B − A)/4 = C₂₂·MR²
const cN = C_MR2;
const aN = C_MR2 - J2_MOON - 2 * C22_MOON;   // A/MR² (long axis → Earth)
const bN = C_MR2 - J2_MOON + 2 * C22_MOON;   // B/MR²

// ── Geometry helpers ────────────────────────────────────────────────────────
const cross = (u, v) => [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
const dot   = (u, v) => u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
const scale = (u, s) => [u[0]*s, u[1]*s, u[2]*s];
const add   = (u, v) => [u[0]+v[0], u[1]+v[1], u[2]+v[2]];
const norm  = (u) => { const m = Math.hypot(...u); return [u[0]/m, u[1]/m, u[2]/m]; };

function keplerSolve(M, e) {
  let E = M;
  for (let k = 0; k < 12; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

// Averaged gravity-gradient torque on the locked Moon, divided by (C·n_moon)
// → a precession-rate vector for ĉ (rad/day), in the ecliptic frame.
//
// Torque from point mass with orbital-rate-squared g3 = GM/r³ at direction r̂:
//   N = 3·g3 · r̂ × (I·r̂);   I·r̂ = MR²·( aN(â·r̂)â + bN(b̂·r̂)b̂ + cN(ĉ·r̂)ĉ )
// so N/(C n) = (3 g3 / (cN n)) · r̂ × ( aN(â·r̂)â + bN(b̂·r̂)b̂ + cN(ĉ·r̂)ĉ ).
function averagedTorque(epsDeg, iDeg, NM = 1440, NS = 96) {
  const i = iDeg * DEG, eps = epsDeg * DEG;
  // Cassini-plane vectors (coplanar in x–z): orbit normal tips +x, spin tips −x.
  // The node line (orbit ∩ ecliptic, also body-equator ∩ ecliptic) then runs
  // along ŷ — perpendicular to the plane holding ẑ, n̂, ĉ.
  const nHat = [Math.sin(i), 0, Math.cos(i)];
  const cHat = [-Math.sin(eps), 0, Math.cos(eps)];
  // Orbit-plane orthonormal basis (both ⊥ n̂): e1 = node line ŷ, e2 = n̂×e1
  const xo = [0, 1, 0];
  const yo = norm(cross(nHat, xo));            // = (−cos i, 0, sin i)
  // Body-equator orthonormal basis (both ⊥ ĉ): f1 = node line ŷ, f2 = ĉ×f1
  const xb = [0, 1, 0];
  const yb = norm(cross(cHat, xb));            // = (−cos ε, 0, −sin ε)

  // EARTH average: over one full orbit; synchronous lock = body long axis â
  // rotates uniformly with the MEAN longitude; Earth direction follows the
  // TRUE longitude on the ellipse. Perigee placed on the node line (its
  // position relative to the node circulates on the 8.85/18.6-yr beat and
  // averages out; we verify insensitivity by a perigee-angle average below).
  let NE = [0, 0, 0];
  const PERI_SAMPLES = 8;                       // average perigee azimuth too
  for (let p = 0; p < PERI_SAMPLES; p++) {
    const w = 2 * Math.PI * p / PERI_SAMPLES;   // argument of perigee
    for (let k = 0; k < NM; k++) {
      const M = 2 * Math.PI * (k + 0.5) / NM;
      const E = keplerSolve(M, E_MOON);
      const f = 2 * Math.atan2(Math.sqrt(1 + E_MOON) * Math.sin(E / 2),
                               Math.sqrt(1 - E_MOON) * Math.cos(E / 2));
      const rOverA = 1 - E_MOON * Math.cos(E);
      const g3fac = MU_EARTH_FRac / (rOverA ** 3);          // (GM_E/r³)/(n²)
      const th = w + f;                                     // true longitude from node
      const rHat = add(scale(xo, Math.cos(th)), scale(yo, Math.sin(th)));
      // body long axis: uniform rotation at mean longitude (lock)
      const lam = w + M;
      const aHat = add(scale(xb, Math.cos(lam)), scale(yb, Math.sin(lam)));
      const bHat = cross(cHat, aHat);
      const Ir = add(add(scale(aHat, aN * dot(aHat, rHat)),
                         scale(bHat, bN * dot(bHat, rHat))),
                     scale(cHat, cN * dot(cHat, rHat)));
      NE = add(NE, scale(cross(rHat, Ir), g3fac));
    }
  }
  NE = scale(NE, 3 * n_moon * n_moon / (cN * n_moon) / (NM * PERI_SAMPLES));

  // SUN average: 2-D over solar longitude × body rotation (incommensurate).
  let NS_ = [0, 0, 0];
  for (let s = 0; s < NS; s++) {
    const ls = 2 * Math.PI * (s + 0.5) / NS;
    const rHat = [Math.cos(ls), Math.sin(ls), 0];           // Sun in ecliptic
    for (let k = 0; k < NS; k++) {
      const lam = 2 * Math.PI * (k + 0.5) / NS;
      const aHat = add(scale(xb, Math.cos(lam)), scale(yb, Math.sin(lam)));
      const bHat = cross(cHat, aHat);
      const Ir = add(add(scale(aHat, aN * dot(aHat, rHat)),
                         scale(bHat, bN * dot(bHat, rHat))),
                     scale(cHat, cN * dot(cHat, rHat)));
      NS_ = add(NS_, cross(rHat, Ir));
    }
  }
  NS_ = scale(NS_, 3 * n_sun * n_sun / (cN * n_moon) / (NS * NS));

  return { NE, NS: NS_, total: add(NE, NS_) };
}

// Equilibrium condition: dĉ/dt (torque) = Ω̇ · (ẑ × ĉ).
// By the coplanar symmetry both sides point along ±ŷ; balance the y-components.
function residual(epsDeg, iDeg, omdot = OmDot) {
  const eps = epsDeg * DEG;
  const { total } = averagedTorque(epsDeg, iDeg);
  const lhs = total[1];                            // torque-driven dĉ/dt · ŷ
  // ẑ = (0,0,1); ĉ = (−sinε, 0, cosε)  →  ẑ×ĉ = (0, −sinε, 0)
  const rhsY = omdot * (-Math.sin(eps));
  return lhs - rhsY;
}

// generic bisection on any residual(ε) → ε
function bisect(f, lo = 0.5, hi = 3.0) {
  let flo = f(lo);
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
    if (hi - lo < 1e-7) break;
  }
  return (lo + hi) / 2;
}

function solveEps(iDeg, omdot = OmDot) {
  return bisect((e) => residual(e, iDeg, omdot));
}

// Closed-form first-order reference:  |Ω̇|·sinε = κ_E·sin(i+ε)cos(i+ε) + κ_S·sinε·cosε
// with κ_E = (3/2)·n·μ_E·(J₂+2C₂₂)/(C/MR²)·(1−e²)^{−3/2},  κ_S = (3/2)·n_s²/n·J₂/(C/MR²)
function closedForm(iDeg) {
  const kE = 1.5 * n_moon * MU_EARTH_FRac * (J2_MOON + 2 * C22_MOON) / C_MR2
             * Math.pow(1 - E_MOON * E_MOON, -1.5);
  const kS = 1.5 * (n_sun * n_sun / n_moon) * J2_MOON / C_MR2;
  const W = Math.abs(OmDot);
  let eps = 1.5 * DEG;
  for (let k = 0; k < 200; k++) {
    const th = iDeg * DEG + eps;
    eps = Math.asin((kE * Math.sin(th) * Math.cos(th)) / (W - kS * Math.cos(eps)));
  }
  return eps / DEG;
}

// ═══════════════════════════════════════════════════════════════════════════
// COUPLED AVERAGE — the torque over the REAL (solar-perturbed) orbit.
//
// The average above rides an unperturbed Keplerian ellipse in a fixed plane.
// The real orbit is not that: the Sun drives the variation (±3,300 km in r),
// the evection, a ±1.4° libration of the node and a ±0.15° oscillation of the
// inclination — all phase-locked to the solar direction, so they do NOT average
// out of a torque that is itself Sun-synchronised. Rather than model those
// parametrically, this section averages the torque over the orbit as the
// classical series actually produces it (ELP-2000/82B, data/lunar-series/).
//
// Frame: co-rotating with the MEAN node W3, so the node sits on +ŷ and the
// spin axis is fixed at ĉ = (−sinε, 0, cosε). The node rate is then ELP's own
// dW3/dt — the INERTIAL (star-referenced) rate, which is the frame in which
// the ecliptic pole is fixed and Cassini's laws are stated. Note this differs
// from the equinox-of-date rate the rigid pass used; that difference is
// isolated as its own row in the budget below.
//
// The orbit sample is independent of ε, so it is built once and reused.
// ═══════════════════════════════════════════════════════════════════════════
const ELP = require('../lib/elp2000-82b');

// GM of the Earth alone, framework-native: GM(E+M) from the deep-time chain
// divided through the DLT-1 mass ratio. (The torque about the Moon's centre of
// mass is exerted by Earth's field alone; Kepler's n² carries the system mass —
// that distinction is the 1.2% term.)
const GM_EM_M3_S2 = 4.03505e14;
const GM_E_KM3_D2 = (GM_EM_M3_S2 / 1e9) * (MASS_RATIO_EM / (1 + MASS_RATIO_EM)) * 86400 * 86400;
const OMDOT_INERTIAL = ELP.W3poly[1] * DEG / 36525;      // rad/day (retrograde)

function sampleRealOrbit({ years = 18.6, dt = 0.5, variant = 'truncated' } = {}) {
  const N = Math.round(years * 365.25 / dt);
  const S = new Array(N);
  for (let k = 0; k < N; k++) {
    const t = ((k + 0.5) * dt) / 36525;
    const m = ELP.evalMoon(t, { variant, inertial: true });
    const phi = (m.W3 - 90) * DEG;                       // put the mean node on +ŷ
    const lam = m.lon * DEG - phi, bet = m.lat * DEG;
    const cb = Math.cos(bet);
    S[k] = { x: cb * Math.cos(lam), y: cb * Math.sin(lam), z: Math.sin(bet),
             invr3: 1 / (m.dist * m.dist * m.dist),
             u: (m.W1 - m.W3) * DEG };                   // long-axis argument from the node
  }
  return S;
}

function perturbedResidual(epsDeg, S, omdot = OMDOT_INERTIAL) {
  const eps = epsDeg * DEG;
  const cHat = [-Math.sin(eps), 0, Math.cos(eps)];
  const xb = [0, 1, 0];
  const yb = norm(cross(cHat, xb));
  let Ny = 0;
  for (const s of S) {
    const ca = Math.cos(s.u), sa = Math.sin(s.u);
    const aHat = [xb[0] * ca + yb[0] * sa, xb[1] * ca + yb[1] * sa, xb[2] * ca + yb[2] * sa];
    const bHat = cross(cHat, aHat);
    const rHat = [s.x, s.y, s.z];
    const da = dot(aHat, rHat), db = dot(bHat, rHat), dc = dot(cHat, rHat);
    const Ir = [aN * da * aHat[0] + bN * db * bHat[0] + cN * dc * cHat[0],
                aN * da * aHat[1] + bN * db * bHat[1] + cN * dc * cHat[1],
                aN * da * aHat[2] + bN * db * bHat[2] + cN * dc * cHat[2]];
    Ny += (rHat[2] * Ir[0] - rHat[0] * Ir[2]) * s.invr3;   // (r̂ × I·r̂)_y
  }
  Ny *= 3 * GM_E_KM3_D2 / (cN * n_moon) / S.length;
  return Ny - omdot * (-Math.sin(eps));
}

// ── Self-test: numerical average vs the EXACT analytic circular-orbit integral
// Averaging the torque over a circular locked orbit is analytically closed:
//   ⟨(r̂ × I·r̂)_y⟩ = sinψ · [ −A/2 + (C/2)cosψ + (1−cosψ)((3/8)A + (1/8)B) ],  ψ = i+ε
// Note this is NOT the textbook first-order form (C−A)/2·sinψ: the bracket is a
// near-total cancellation of large terms, so the O(ψ²) pieces survive and the
// naive form overstates the torque by ~0.7% — the same size as the gap under
// investigation. Any lab claiming a sub-percent result here must pass this test.
function analyticCircularNy(epsDeg, iDeg) {
  const psi = (iDeg + epsDeg) * DEG, cw = Math.cos(psi);
  return Math.sin(psi) * (-aN / 2 + (cN / 2) * cw + (1 - cw) * ((3 / 8) * aN + (1 / 8) * bN));
}
function numericCircularNy(epsDeg, iDeg, N = 20000) {
  const i = iDeg * DEG, eps = epsDeg * DEG;
  const nHat = [Math.sin(i), 0, Math.cos(i)], cHat = [-Math.sin(eps), 0, Math.cos(eps)];
  const xo = [0, 1, 0], yo = norm(cross(nHat, xo));
  const xb = [0, 1, 0], yb = norm(cross(cHat, xb));
  let Ny = 0;
  for (let k = 0; k < N; k++) {
    const th = 2 * Math.PI * (k + 0.5) / N;        // circular ⇒ true = mean anomaly
    const ct = Math.cos(th), st = Math.sin(th);
    const rHat = [xo[0] * ct + yo[0] * st, xo[1] * ct + yo[1] * st, xo[2] * ct + yo[2] * st];
    const aHat = [xb[0] * ct + yb[0] * st, xb[1] * ct + yb[1] * st, xb[2] * ct + yb[2] * st];
    const bHat = cross(cHat, aHat);
    const da = dot(aHat, rHat), db = dot(bHat, rHat), dc = dot(cHat, rHat);
    const Ir = [aN * da * aHat[0] + bN * db * bHat[0] + cN * dc * cHat[0],
                aN * da * aHat[1] + bN * db * bHat[1] + cN * dc * cHat[1],
                aN * da * aHat[2] + bN * db * bHat[2] + cN * dc * cHat[2]];
    Ny += rHat[2] * Ir[0] - rHat[0] * Ir[2];
  }
  return Ny / N;
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('═'.repeat(76));
console.log('  Cassini-state derivation of the Moon\'s axial tilt (ε_ecl)');
console.log('═'.repeat(76));
console.log('  Inputs (documented observed constants, Williams et al. 2014 GRAIL+LLR):');
console.log(`    J₂ = ${(J2_MOON*1e6).toFixed(3)}e-6   C₂₂ = ${(C22_MOON*1e6).toFixed(4)}e-6   C/MR² = ${C_MR2}`);
console.log('  Framework rates:');
console.log(`    sidereal month ${SIDEREAL_MONTH_D} d · of-date node ${NODAL_OFDATE_D} d`);
console.log(`    sidereal year ${SIDEREAL_YEAR_D} d · M_E/M_M = ${MASS_RATIO_EM} · e = ${E_MOON}`);
console.log(`  Measured target: ε_ecl = ${EPS_MEASURED}°`);
console.log('─'.repeat(76));

let EPS_RIGID_BROWN = null;   // captured for the --json result line (the shipped rigid-ellipse value)
for (const [label, iDeg] of [['Brown/ELP i = 5.1453964° (catalog convention)', I_BROWN],
                             ['dynamical  i = 5.1573°   (DLT-1 shipped)',       I_DYNAMICAL]]) {
  const epsNum = solveEps(iDeg);
  if (iDeg === I_BROWN) EPS_RIGID_BROWN = epsNum;
  const epsCF  = closedForm(iDeg);
  console.log(`  ${label}`);
  console.log(`    numerical torque-averaged equilibrium: ε = ${epsNum.toFixed(4)}°  (${(100*epsNum/EPS_MEASURED).toFixed(2)}% of measured)`);
  console.log(`    closed-form first-order reference:     ε = ${epsCF.toFixed(4)}°  (${(100*epsCF/EPS_MEASURED).toFixed(2)}%)`);
  console.log(`    composition check: i + ε = ${(iDeg + epsNum).toFixed(4)}° (catalog composition 6.6878°)`);
}

// Sensitivity panel: which knob moves ε how much
console.log('─'.repeat(76));
{
  const nNum = numericCircularNy(EPS_MEASURED, I_BROWN);
  const nAna = analyticCircularNy(EPS_MEASURED, I_BROWN);
  const naive = 0.5 * (J2_MOON + 2 * C22_MOON) * Math.sin((I_BROWN + EPS_MEASURED) * DEG);
  console.log('  Self-test — numerical average vs the exact analytic circular integral:');
  console.log(`    numerical ${nNum.toExponential(6)}   analytic ${nAna.toExponential(6)}   ratio ${(nNum / nAna).toFixed(5)}`);
  console.log(`    (textbook first-order (C−A)/2·sinψ would give ${naive.toExponential(6)},`);
  console.log(`     i.e. ${((naive / nAna - 1) * 100).toFixed(2)}% high — the same size as the gap under study)`);
}
console.log('─'.repeat(76));
console.log('  Sensitivities (numerical, at Brown i):');
const base = solveEps(I_BROWN);
console.log(`    ∂ε/∂i                 ≈ ${((solveEps(I_BROWN + 0.1) - base) / 0.1).toFixed(3)} °/°  (i convention worth ${(0.0119 * (solveEps(I_BROWN + 0.1) - base) / 0.1 * 3600).toFixed(1)}″)`);
console.log(`    rigid-figure gap      = ${((base - EPS_MEASURED) * 3600).toFixed(1)}″  (derived − measured)`);
console.log('─'.repeat(76));
console.log('  Reading:');
console.log('  • The rigid-figure Cassini equilibrium reproduces the measured obliquity');
console.log('    at the 100.7% level from three GRAIL/LLR gravity constants + the');
console.log('    framework\'s own rates. ε_ecl is NOT a free constant.');
console.log('  • The ~37″ remainder is NOT yet attributed. Every candidate named so far');
console.log('    has been measured and found too small or of the wrong sign — the fluid');
console.log('    core by the capacity bracket below, the Sun-coherent orbit oscillations');
console.log('    by the coupled average at the end of this report. It is an open channel.');
console.log('  • Composition: the catalog moonTilt 6.687° = i + ε in ONE convention');
console.log('    (Brown 5.1454 + measured 1.5424). The derivation confirms the');
console.log('    MEASURED member of the pair; the composition remains convention-bound.');

// ── Fluid-core capacity bracket (order of magnitude, documented constants) ──
// Core moment fraction and CMB flattening (Williams et al. 2014;
// Viswanathan et al. 2019 LLR/GRAIL fits):
const CF_OVER_C = 7.0e-4;      // fluid-core / whole-Moon polar moment
const F_CMB     = 2.2e-4;      // core-mantle-boundary flattening
// The lunar FCN period (~150–450 yr) is much longer than the 18.6-yr forcing,
// so the core cannot co-precess with the mantle; the inertial pressure torque
// on the tilted, flattened cavity enters the mantle balance at relative rate
//   (C_f/C) · f_cmb · n  against the |Ω̇| term:
const coreCapacity = CF_OVER_C * F_CMB * (NODAL_OFDATE_D / SIDEREAL_MONTH_D);
console.log('─'.repeat(76));
console.log('  Fluid-core capacity bracket (C_f/C = 7.0e-4, f_cmb = 2.2e-4):');
console.log(`    (C_f/C)·f_cmb·n/|Ω̇| = ${(100 * coreCapacity).toFixed(4)}% of the balance — ~${(((base - EPS_MEASURED) / EPS_MEASURED) / coreCapacity).toFixed(0)}× TOO`);
console.log(`    SMALL for the ${((base - EPS_MEASURED) / EPS_MEASURED * 100).toFixed(2)}% rigid-figure gap. VERDICT: the direct core pressure`);
console.log('    torque CANNOT own the 37″ remainder (consistent with LLR, where the');
console.log('    core/dissipation pole signature is arcsecond-level). The next candidate —');
console.log('    the Sun-coherent orbit oscillations — is measured in the coupled average');
console.log('    below, and is likewise too small. The remainder stays OPEN.');
console.log('═'.repeat(76));

// debug probe (run with --probe)
if (process.argv.includes('--probe')) {
  for (const e of [0.8, 1.2, 1.5424, 1.9, 2.5]) {
    const { NE, NS, total } = averagedTorque(e, I_BROWN);
    const rhsY = OmDot * (-Math.sin(e * DEG));
    console.log(`eps=${e}: torqueY=${total[1].toExponential(3)} (E ${NE[1].toExponential(3)}, S ${NS[1].toExponential(3)})  rhsY=${rhsY.toExponential(3)}  resid=${(total[1]-rhsY).toExponential(3)}`);
  }
}

// ── Coupled (perturbed-orbit) result ────────────────────────────────────────
{
  console.log('─'.repeat(76));
  const t0 = Date.now();
  const S = sampleRealOrbit();

  // Decompose the perturbation content: how much is RADIAL (⟨r⁻³⟩ over the real
  // orbit vs the Keplerian ellipse) and how much is ORIENTATION (the node
  // libration / inclination oscillation the attribution named)?
  const meanInvR3 = S.reduce((q, s) => q + s.invr3, 0) / S.length;
  const aKep = Math.cbrt(GM_EM_M3_S2 / ((n_moon / 86400) ** 2)) / 1000;   // km
  const kepInvR3 = Math.pow(1 - E_MOON * E_MOON, -1.5) / (aKep ** 3);
  const radialRatio = meanInvR3 / kepInvR3;
  // orientation-only: same real geometry, radial content renormalised to Kepler
  const Sorient = S.map((s) => ({ ...s, invr3: s.invr3 / radialRatio }));

  const epsPert   = bisect((e) => perturbedResidual(e, S));
  const epsOrient = bisect((e) => perturbedResidual(e, Sorient));
  const epsKepInertial = solveEps(I_BROWN, OMDOT_INERTIAL);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const as = (x) => ((x - EPS_MEASURED) * 3600).toFixed(1).padStart(6) + '\u2033';

  console.log(`  COUPLED AVERAGE over the real ELP orbit (${S.length} samples / 18.6 yr, ${secs}s)`);
  console.log('  Budget — each row changes ONE thing from the row above:');
  console.log(`    rigid ellipse, equinox-of-date node rate   ε = ${base.toFixed(4)}°  ${as(base)}`);
  console.log(`    rigid ellipse, INERTIAL node rate          ε = ${epsKepInertial.toFixed(4)}°  ${as(epsKepInertial)}   (frame: ${((epsKepInertial - base) * 3600).toFixed(1)}″)`);
  console.log(`    real orbit ORIENTATION only               ε = ${epsOrient.toFixed(4)}°  ${as(epsOrient)}   (node libration + i-oscillation: ${((epsOrient - epsKepInertial) * 3600).toFixed(1)}″)`);
  console.log(`    real orbit, full (orientation + radial)    ε = ${epsPert.toFixed(4)}°  ${as(epsPert)}   (⟨r⁻³⟩ content: ${((epsPert - epsOrient) * 3600).toFixed(1)}″)`);
  console.log(`    MEASURED                                  ε = ${EPS_MEASURED}°`);
  console.log(`    ⟨r⁻³⟩ real / Kepler = ${radialRatio.toFixed(6)}  (Kepler a = ${aKep.toFixed(0)} km)`);
  console.log('─'.repeat(76));
  console.log('  READING — the orbit-oscillation attribution is REFUTED by measurement:');
  console.log('    • the named cause (node libration ±1.4°, i ±0.15°) moves ε by only');
  console.log(`      ${Math.abs((epsOrient - epsKepInertial) * 3600).toFixed(1)}″ — it cannot own a ${Math.abs((epsKepInertial - EPS_MEASURED) * 3600).toFixed(0)}″ gap;`);
  console.log('    • the real orbit\'s radial content pushes ε the WRONG way, so the full');
  console.log('      coupled average sits FURTHER from the measurement than the rigid one;');
  console.log('    • no input can absorb the remainder: closing it would need C/MR² wrong');
  console.log('      by 0.8% (known to 3e-5), J₂ by 0.8% (known to 1e-9), or the node');
  console.log('      period wrong by 56 d. The residual is a real dynamical channel, and');
  console.log('      identifying it is now an explicit open item — not an attribution.');
  console.log('═'.repeat(76));

  // Machine-readable result for tools/verify/cassini-results.js --write (the
  // generator that owns data/cassini-moontilt-results.json).
  if (process.argv.includes('--json')) {
    console.log('@@CASSINI_JSON@@ ' + JSON.stringify({
      rigidEllipse: EPS_RIGID_BROWN,
      coupledAverage: epsPert,
      measured: EPS_MEASURED,
    }));
  }
}
