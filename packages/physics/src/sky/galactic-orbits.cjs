'use strict';
/**
 * The stars' Galactic orbits relative to the Sun — ONE home (plan 28 §D, doc 111 §1.48).
 *
 * Beyond ~1 Myr a star's straight-line space motion stops being its path: in the Galaxy's potential the
 * relative path of two neighbours curves by the tidal field and the vertical restoring force — a per cent
 * of its length at 5 Myr, 15 % at 20 Myr, 40 % at 50 Myr (the referee's rows). The model here is the
 * EPICYCLE ABOUT EACH BODY'S OWN GUIDING CENTRE in polar Galactocentric coordinates (Lindblad; Binney &
 * Tremaine 2008 §3.2.3) carried to SECOND ORDER in the radial amplitude, for the Sun and for every star
 * alike, in an axisymmetric potential whose rotation curve is the power law v_c ∝ R^β with β from the Oort
 * constants and whose vertical force is harmonic. The heliocentric vector of date is the difference of the
 * two orbits in the INERTIAL frame of today's Galactic axes — no rotating frame and no frame turn enter (the
 * Milky Way dome's turn, sky/galactic-frame, is the same Ω₀ seen from the Sun).
 *
 * Measured against the exact integration of this same potential (the referee, doc 111 §1.48): Hill's
 * linearised epicycle about the LSR read 0.57 pc off at 1.3 Myr for a star 19 pc away — worse than the
 * straight line's 0.035 — because the Sun's own 640-pc radial excursion (7 % of R₀) puts second-order
 * terms into the relative drift; the epicycle about each body's own guiding centre with the azimuth exact
 * on the harmonic radius still carried a linear-in-time error from the radial first order; with the radial
 * SECOND order (the mean-radius shift ~A²/R₀, 62 pc for the Sun, and its 2κ harmonic) the referee reads
 * ≤ 1 % at 50 Myr for radial amplitudes ≤ 3 % of R₀, a few per cent at 10–14 %, and Gliese 710's closest
 * approach lands at 1.295 Myr / 0.055 pc for the published 1.29 / 0.064. Stars whose radial amplitude
 * exceeds RADIAL_AMPLITUDE_MAX of R₀ are outside the model and left out of the catalogue (counted).
 *
 * Per body, from its Galactocentric state (R, φ, z, v_R, v_φ, v_z) at the catalogue epoch:
 *   L = R v_φ,   R_g = R₀ (|L| / R₀v₀)^{1/(β+1)},   κ_g = κ₀ (R_g/R₀)^{β−1},   c₂ = [12 − (2β−1)(2β−2)] / (8(β+1) R_g)
 *   R(t) = R_g + A cos θ + c₂A² (1 − cos 2θ / 3),   θ = κ_g t − ψ       (ẍ = −κ²x + g x², g = −½Φ_eff''' = 2κ²c₂)
 *   φ(t) = φ₀ + L ∫₀ᵗ dt'/R(t')²                                         (8-point Gauss–Legendre; κt ≤ 2 rad in the regime)
 *   z(t) = z₀ cos νt + (v_z/ν) sin νt
 * with (A, ψ) solved from R(0) = R and Ṙ(0) = v_R by fixed-point iteration from the first-order values.
 *
 * Constants (cited, ONE Ω₀): Ω₀ = v₀/R₀ from McMillan 2017 (sky/galactic-frame's pair); Oort's B from
 * Bovy 2017 (MNRAS 468, L63: B = −11.9 ± 0.4 km/s/kpc; its A = 15.3 ± 0.4, while A = Ω₀ + B = 16.5
 * here, within the tension between the two sources); κ₀² = −4BΩ₀ and β = −(Ω₀ + 2B)/Ω₀ (a power law's
 * κ² = 2(β+1)Ω²); the vertical frequency ν² = 4πGρ₀ with the local mass density ρ₀ = 0.097 M☉/pc³
 * (McKee, Parravano & Hollenbach 2015, ApJ 814, 13); the Sun's velocity relative to the LSR (U, V, W) =
 * (11.1, 12.24, 7.25) km/s (Schönrich, Binney & Dehnen 2010, MNRAS 403, 1829) and its height above the
 * plane 20.8 pc (Bennett & Bovy 2019, MNRAS 482, 1417).
 *
 * Validity (said in the scene's hover): a smooth axisymmetric potential (no spiral arms, no molecular
 * clouds — the literature on stellar encounters finds that adequate to a few tens of Myr: Bailer-Jones
 * 2015, A&A 575, A35; 2018, A&A 616, A37), vertical excursions ≲ 300 pc (the disc's potential is harmonic
 * there), and each star's measured velocity error of ~1 km/s is 20 pc after 20 Myr, so a nearby star's
 * direction of date is uncertain by degrees. The sky of date is statistically right, the real stars at
 * roughly the right places and brightnesses; it is not a star chart. The catalogue regime ends at ±50 Myr,
 * where the statistical sky takes over.
 */

const { galacticTriadEquatorialJ2000, SUN_GALACTIC_ORBIT } = require('./galactic-frame.cjs');

const D2R = Math.PI / 180;
/** 1 km/s in parsecs per Julian year (the IAU parsec, the SI second, the Julian year). */
const KMS_TO_PC_PER_YEAR = 1.0227121650e-6;
/** km/s per (mas/yr × kpc): the tangential velocity v_t = 4.74047 μ[mas/yr] d[kpc]. */
const KMS_PER_MASYR_KPC = 4.740470463;
/** G in pc (km/s)² / M☉ (IAU 2015 nominal GM☉ and the IAU parsec). */
const G_PC_KMS2_PER_MSUN = 4.30091e-3;
/** The model's reach: a relative orbit whose radial amplitude exceeds this fraction of R₀ is outside it. */
const RADIAL_AMPLITUDE_MAX = 0.15;

const LOCAL_GALACTIC_KINEMATICS = Object.freeze({
  r0Pc: SUN_GALACTIC_ORBIT.r0Kpc * 1000,
  v0KmS: SUN_GALACTIC_ORBIT.v0KmS,
  omega0KmSKpc: SUN_GALACTIC_ORBIT.v0KmS / SUN_GALACTIC_ORBIT.r0Kpc,   // Ω₀ = v₀/R₀ (McMillan 2017): 28.39
  oortBKmSKpc: -11.9,                                                   // Bovy 2017 (Gaia DR1)
  localDensityMsunPc3: 0.097,                                           // McKee, Parravano & Hollenbach 2015
  sunVelocityLsrKmS: Object.freeze({ u: 11.1, v: 12.24, w: 7.25 }),     // Schönrich, Binney & Dehnen 2010 (U toward the centre)
  sunHeightPc: 20.8,                                                    // Bennett & Bovy 2019
  catalogueRegimeYears: 5e7,                                            // the catalogue regime's edge: ±50 Myr
  sources: 'McMillan 2017 (R₀, v₀, Ω₀); Bovy 2017 (B); McKee+2015 (ρ₀); Schönrich+2010 (U,V,W)☉; Bennett & Bovy 2019 (z☉)',
});

/** The derived local quantities: the power-law exponent, the frequencies in rad per year and in km/s/kpc, the periods. */
function localRotationCurve() {
  const K = LOCAL_GALACTIC_KINEMATICS;
  const perKmSKpcToRadPerYear = 1e-3 * KMS_TO_PC_PER_YEAR;   // km/s/kpc → km/s/pc → rad/yr
  const beta = -(K.omega0KmSKpc + 2 * K.oortBKmSKpc) / K.omega0KmSKpc;
  const kappa0KmSKpc = Math.sqrt(-4 * K.oortBKmSKpc * K.omega0KmSKpc);
  const nuKmSPc = Math.sqrt(4 * Math.PI * G_PC_KMS2_PER_MSUN * K.localDensityMsunPc3);
  return {
    beta, oortAKmSKpc: K.omega0KmSKpc + K.oortBKmSKpc, kappa0KmSKpc,
    secondOrderCoefficient: (12 - (2 * beta - 1) * (2 * beta - 2)) / (8 * (beta + 1)),   // c₂ · R_g
    omega0RadPerYear: K.omega0KmSKpc * perKmSKpcToRadPerYear,
    kappa0RadPerYear: kappa0KmSKpc * perKmSKpcToRadPerYear,
    nuRadPerYear: nuKmSPc * KMS_TO_PC_PER_YEAR,
    epicyclePeriodMyr: 2 * Math.PI / (kappa0KmSKpc * perKmSKpcToRadPerYear) / 1e6,
    verticalPeriodMyr: 2 * Math.PI / (nuKmSPc * KMS_TO_PC_PER_YEAR) / 1e6,
  };
}

/** 8-point Gauss–Legendre nodes and weights on [−1, 1] (Newton on the Legendre polynomial, once). Eight points
 *  reproduce the 16-point azimuth integral to 8e-7 pc over ±50 Myr at the model's largest amplitude (0.41 µs per
 *  star for 0.90 — the browser moves 450,000 orbits per update). */
const GAUSS_LEGENDRE_8 = (() => {
  const n = 8, x = [], w = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), z1, pp;
    do { let p1 = 1, p2 = 0; for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1); } pp = n * (z * p1 - p2) / (z * z - 1); z1 = z; z = z1 - p1 / pp; } while (Math.abs(z - z1) > 1e-15);
    x.push(z); w.push(2 / ((1 - z * z) * pp * pp));
  }
  return Object.freeze({ x: Object.freeze(x), w: Object.freeze(w) });
})();

/**
 * A star's heliocentric Galactic position (pc) and velocity (km/s) from its astrometry — X toward the
 * Galactic centre, Y along the rotation (l = 90°), Z toward the north Galactic pole; U, V, W likewise
 * (Johnson & Soderblom 1987's transformation written on the one-home triad).
 * @param {{raDeg: number, decDeg: number, distPc: number, pmRaMasYr: number, pmDecMasYr: number, rvKmS: number}} a
 */
function heliocentricGalacticState(a) {
  const T = galacticTriadEquatorialJ2000();
  const sa = Math.sin(a.raDeg * D2R), ca = Math.cos(a.raDeg * D2R), sd = Math.sin(a.decDeg * D2R), cd = Math.cos(a.decDeg * D2R);
  const p = [cd * ca, cd * sa, sd], e = [-sa, ca, 0], n = [-sd * ca, -sd * sa, cd];   // the direction, its east and north tangents
  const vt = KMS_PER_MASYR_KPC * a.distPc / 1000;   // km/s per mas/yr at this distance
  const vEq = [0, 1, 2].map((k) => p[k] * a.rvKmS + e[k] * a.pmRaMasYr * vt + n[k] * a.pmDecMasYr * vt);
  const rEq = p.map((c) => c * a.distPc);
  const g = (/** @type {number[]} */ v) => [v[0] * T.x[0] + v[1] * T.x[1] + v[2] * T.x[2], v[0] * T.y[0] + v[1] * T.y[1] + v[2] * T.y[2], v[0] * T.z[0] + v[1] * T.z[1] + v[2] * T.z[2]];
  const [X, Y, Z] = g(rEq), [U, V, W] = g(vEq);
  return { xPc: X, yPc: Y, zPc: Z, uKmS: U, vKmS: V, wKmS: W };
}

/** The Sun's state is anchored at J2000 (its position (−R₀, 0, z☉), its velocity Schönrich's + the circular speed). */
const SUN_EPOCH_YEAR = 2000;

/** @typedef {{Rg: number, L: number, kappaG: number, phi0: number, amp: number, psi: number, c2: number, z0: number, vz: number, nu: number, amplitudeFraction: number, epochYear: number}} OrbitElements */

/**
 * The orbit elements of a body (a star from its heliocentric Galactic state at its catalogue's epoch; the Sun with
 * null) in the inertial Galactocentric frame whose axes are today's heliocentric Galactic axes (X from the Sun
 * toward the centre — the Sun sits at X = −R₀ at J2000 — Y along the rotation at the Sun, Z north; φ
 * counterclockwise from +X seen from the north, so the Galaxy's rotation is φ̇ < 0). A star's heliocentric state
 * is relative to the Sun OF ITS EPOCH, so the Sun's own displacement from J2000 to that epoch is added (2.2
 * milliparsecs along the orbit for Hipparcos's J1991.25, 4.0 for Gaia's J2016.0 — below the catalogues' own
 * grain, carried for the form's sake; its velocity change over a decade is 1e-7 pc/yr). Positions in pc, rates
 * in pc/yr and rad/yr.
 * @param {{xPc: number, yPc: number, zPc: number, uKmS: number, vKmS: number, wKmS: number} | null} h
 * @param {number} [epochYear]  the catalogue epoch the state is given at (J2000 by default; the Sun's is J2000)
 * @returns {OrbitElements}
 */
function orbitElements(h, epochYear = SUN_EPOCH_YEAR) {
  const K = LOCAL_GALACTIC_KINEMATICS, C = localRotationCurve(), k = KMS_TO_PC_PER_YEAR;
  const [X, Y, Z, vX, vY, vZ] = galactocentricState(h, epochYear);
  const R = Math.hypot(X, Y), phi0 = Math.atan2(Y, X);
  const vR = (X * vX + Y * vY) / R, vPhi = (X * vY - Y * vX) / R, L = R * vPhi;
  const L0 = K.r0Pc * K.v0KmS * k;
  const Rg = K.r0Pc * (Math.abs(L) / L0) ** (1 / (C.beta + 1));
  const kappaG = C.kappa0RadPerYear * (Rg / K.r0Pc) ** (C.beta - 1);
  const c2 = C.secondOrderCoefficient / Rg;
  // (A, ψ) from R(0) = R_g + A cos ψ + c₂A²(1 − cos 2ψ/3) and Ṙ(0) = Aκ sin ψ − c₂A²(2κ/3) sin 2ψ, by fixed point
  let amp = Math.hypot(R - Rg, vR / kappaG), psi = Math.atan2(vR / kappaG, R - Rg);
  for (let it = 0; it < 20; it++) {
    const x0 = (R - Rg) - c2 * amp * amp * (1 - Math.cos(2 * psi) / 3);
    const v0 = vR + c2 * amp * amp * (2 * kappaG / 3) * Math.sin(2 * psi);
    amp = Math.hypot(x0, v0 / kappaG); psi = Math.atan2(v0 / kappaG, x0);
  }
  return { Rg, L, kappaG, phi0, amp, psi, c2, z0: Z, vz: vZ, nu: C.nuRadPerYear, amplitudeFraction: amp / K.r0Pc, epochYear };
}

/** The radius at t years (the second-order epicycle). @param {OrbitElements} e @param {number} t */
function radiusAt(e, t) {
  const th = e.kappaG * t - e.psi;
  return e.Rg + e.amp * Math.cos(th) + e.c2 * e.amp * e.amp * (1 - Math.cos(2 * th) / 3);
}

/**
 * A body's inertial Galactocentric position (pc) at t years from its epoch.
 * @param {OrbitElements} e @param {number} t
 * @returns {[number, number, number]}
 */
function galactocentricPositionAt(e, t) {
  const G = GAUSS_LEGENDRE_8;
  let I = 0;
  for (let i = 0; i < 8; i++) { const R = radiusAt(e, t * (G.x[i] + 1) / 2); I += G.w[i] / (R * R); }
  const phi = e.phi0 + e.L * I * t / 2;
  const R = radiusAt(e, t);
  const z = e.z0 * Math.cos(e.nu * t) + (e.vz / e.nu) * Math.sin(e.nu * t);
  return [R * Math.cos(phi), R * Math.sin(phi), z];
}

/** A body's inertial Galactocentric position (pc) at an engine year — t counted from ITS OWN epoch. @param {OrbitElements} e @param {number} year */
function galactocentricPositionAtYear(e, year) { return galactocentricPositionAt(e, year - e.epochYear); }

/**
 * The heliocentric Galactic vector (pc) of a star at an engine year, in the inertial frame of today's Galactic
 * axes (X toward the centre, Y l = 90°, Z north): the star's orbit minus the Sun's, each from its own epoch.
 * @param {OrbitElements} star @param {OrbitElements} sun @param {number} year
 * @returns {[number, number, number]}
 */
function heliocentricGalacticAtYear(star, sun, year) {
  const p = galactocentricPositionAtYear(star, year), q = galactocentricPositionAtYear(sun, year);
  return [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
}

// ── the potential's EXACT evaluator ──────────────────────────────────────────
/**
 * The named catalogue's stars ride this, not the closed form: the epicycle's floor is third order in the radial
 * amplitude (Sirius, amplitude 10 % of R₀: 9.7″ from the exact orbit at 100 kyr, the straight line 1.3″) and the
 * series breaks for the high-velocity stars a naked-eye catalogue holds (Arcturus 33 % of R₀: 118° off at
 * 10 kyr; Groombridge 1830, 320 km/s, diverges). The integration is RK4 in the inertial Galactocentric frame on
 * the SAME potential (v_c ∝ R^β, the harmonic vertical term), on a deterministic schedule so a position is pure
 * in the year: nodes every nodeYears from the set's epoch, each reached from the previous by whole steps of
 * stepYears; a year is reached from its node by ceil(|r|/stepYears) equal steps (a 1-Myr step is 1/200 of
 * the orbit — RK4's error ~1e-9 of the excursion per orbit). Both tiers of the scene ride this integrator (the
 * arriving stars on the coarser schedule) and the pipeline selects by it; the closed form is the potential's
 * analytic check and the amplitude diagnostic, gated against the integrator (a first build drew the arriving
 * stars on the closed form with a 15 % amplitude cut — a third of the superset, the fast stars that arrive
 * from farthest, fell to the cut).
 */
const ORBIT_INTEGRATION = Object.freeze({
  /** the named catalogue (41,000 stars, era-certified): 1-Myr steps, 5-Myr nodes */
  named: Object.freeze({ stepYears: 1e6, nodeYears: 5e6 }),
  /** the arriving stars (a few hundred thousand, unnamed, invisible today): 2-Myr steps (RK4's error 16× the named tier's, ~1e-7 of the excursion), 10-Myr nodes */
  arriving: Object.freeze({ stepYears: 2e6, nodeYears: 1e7 }),
  /** the pipeline's visibility sampling over the window: 0.5-Myr steps, every step a sample */
  sampling: Object.freeze({ stepYears: 5e5, nodeYears: 5e5 }),
});

/** The acceleration (pc/yr²) at an inertial Galactocentric position: the power-law rotation curve's −v_c²/R radially, −ν² z vertically. @param {number} X @param {number} Y @param {number} Z */
function galacticAcceleration(X, Y, Z) {
  const K = LOCAL_GALACTIC_KINEMATICS, C = localRotationCurve(), v0 = K.v0KmS * KMS_TO_PC_PER_YEAR;
  const R = Math.hypot(X, Y);
  const vc = v0 * (R / K.r0Pc) ** C.beta, aR = -vc * vc / R;
  return [aR * X / R, aR * Y / R, -C.nuRadPerYear * C.nuRadPerYear * Z];
}

/**
 * A body's inertial Galactocentric STATE at its epoch (the same placement as orbitElements): [X, Y, Z, vX, vY, vZ]
 * in pc and pc/yr. @param {{xPc: number, yPc: number, zPc: number, uKmS: number, vKmS: number, wKmS: number} | null} h @param {number} [epochYear]
 */
function galactocentricState(h, epochYear = SUN_EPOCH_YEAR) {
  const K = LOCAL_GALACTIC_KINEMATICS, k = KMS_TO_PC_PER_YEAR, S = K.sunVelocityLsrKmS;
  const sun = [-K.r0Pc, 0, K.sunHeightPc, S.u * k, (K.v0KmS + S.v) * k, S.w * k];
  if (!h) return sun;
  const sunAtEpoch = epochYear === SUN_EPOCH_YEAR ? sun : integrateOrbitRK4(sun, epochYear - SUN_EPOCH_YEAR, 1);
  return [sunAtEpoch[0] + h.xPc, sunAtEpoch[1] + h.yPc, sunAtEpoch[2] + h.zPc, sunAtEpoch[3] + h.uKmS * k, sunAtEpoch[4] + h.vKmS * k, sunAtEpoch[5] + h.wKmS * k];
}

/**
 * Integrate a state over dtYears in nSteps equal RK4 steps (a new array; the input untouched).
 * @param {ArrayLike<number>} s  [X, Y, Z, vX, vY, vZ] @param {number} dtYears @param {number} nSteps
 * @returns {number[]}
 */
function integrateOrbitRK4(s, dtYears, nSteps) {
  let x = s[0], y = s[1], z = s[2], vx = s[3], vy = s[4], vz = s[5];
  const h = dtYears / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const a1 = galacticAcceleration(x, y, z);
    const x2 = x + h / 2 * vx, y2 = y + h / 2 * vy, z2 = z + h / 2 * vz, vx2 = vx + h / 2 * a1[0], vy2 = vy + h / 2 * a1[1], vz2 = vz + h / 2 * a1[2];
    const a2 = galacticAcceleration(x2, y2, z2);
    const x3 = x + h / 2 * vx2, y3 = y + h / 2 * vy2, z3 = z + h / 2 * vz2, vx3 = vx + h / 2 * a2[0], vy3 = vy + h / 2 * a2[1], vz3 = vz + h / 2 * a2[2];
    const a3 = galacticAcceleration(x3, y3, z3);
    const x4 = x + h * vx3, y4 = y + h * vy3, z4 = z + h * vz3, vx4 = vx + h * a3[0], vy4 = vy + h * a3[1], vz4 = vz + h * a3[2];
    const a4 = galacticAcceleration(x4, y4, z4);
    x += h / 6 * (vx + 2 * vx2 + 2 * vx3 + vx4); y += h / 6 * (vy + 2 * vy2 + 2 * vy3 + vy4); z += h / 6 * (vz + 2 * vz2 + 2 * vz3 + vz4);
    vx += h / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]); vy += h / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]); vz += h / 6 * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2]);
  }
  return [x, y, z, vx, vy, vz];
}

/**
 * The schedule from a set's epoch to a year: the node index (toward the epoch), the remainder and its step count.
 * @param {number} year @param {number} epochYear @param {{stepYears: number, nodeYears: number}} [sched]
 */
function integrationSchedule(year, epochYear, sched = ORBIT_INTEGRATION.named) {
  const dt = year - epochYear;
  const nodeIndex = Math.trunc(dt / sched.nodeYears);
  const nodeYear = epochYear + nodeIndex * sched.nodeYears;
  const remainder = year - nodeYear;
  const steps = Math.max(1, Math.ceil(Math.abs(remainder) / sched.stepYears));
  return { nodeIndex, nodeYear, remainder, steps, stepsPerNode: Math.round(sched.nodeYears / sched.stepYears), nodeYears: sched.nodeYears };
}

/**
 * A single body's integrated inertial position at a year from its epoch state, on the deterministic schedule
 * (the nodes rebuilt from the epoch each call — the gates' and the main thread's single-star reads).
 * @param {ArrayLike<number>} state0 @param {number} epochYear @param {number} year @param {{stepYears: number, nodeYears: number}} [sched]
 * @returns {number[]}  the full state [X, Y, Z, vX, vY, vZ]
 */
function integratedStateAtYear(state0, epochYear, year, sched = ORBIT_INTEGRATION.named) {
  const sch = integrationSchedule(year, epochYear, sched);
  let s = Array.from(state0);
  const sign = Math.sign(sch.nodeIndex);
  for (let k = 0; k < Math.abs(sch.nodeIndex); k++) s = integrateOrbitRK4(s, sign * sch.nodeYears, sch.stepsPerNode);
  return sch.remainder === 0 ? s : integrateOrbitRK4(s, sch.remainder, sch.steps);
}

/**
 * The Sun's height above the Galactic plane at an engine year (pc, north positive): the harmonic vertical motion of
 * the model's potential from the J2000 state — z = z☉ cos νt + (W☉/ν) sin νt, amplitude √(z☉² + (W☉/ν)²) ≈ 102 pc,
 * period 2π/ν ≈ 85 Myr (the integrator's z is this to 1e-9: the vertical equation is decoupled and linear).
 * @param {number} year
 */
function sunHeightPcAtYear(year) {
  const K = LOCAL_GALACTIC_KINEMATICS, C = localRotationCurve(), t = year - SUN_EPOCH_YEAR;
  const w = K.sunVelocityLsrKmS.w * KMS_TO_PC_PER_YEAR;
  return K.sunHeightPc * Math.cos(C.nuRadPerYear * t) + (w / C.nuRadPerYear) * Math.sin(C.nuRadPerYear * t);
}

/**
 * The Milky Way band's apparent shift in Galactic latitude from the Sun's height (degrees, the band moving toward
 * the SOUTH when the Sun is north of the plane): the midplane seen from height z at the light's effective distance D
 * lies at −atan(z/D) — a uniform shift for every longitude, the first order of the parallax of the disc's light. D
 * is an ILLUSTRATION parameter: the optical band is the light of the disc within one to two kiloparsecs, dust
 * closing the view in the plane beyond; 1.5 kpc. The Magellanic Clouds, 50 kpc away, shift with the dome's texture
 * all the same — the illustration's limit, said so. 0.8° today (z☉ 20.8 pc), 3.9° at the extremes.
 */
const MILKY_WAY_LIGHT_DISTANCE_PC = 1500;
/** @param {number} year */
function milkyWayLatitudeShiftDegAtYear(year) {
  return -Math.atan2(sunHeightPcAtYear(year), MILKY_WAY_LIGHT_DISTANCE_PC) * 180 / Math.PI;
}

/**
 * A main-sequence lifetime from the absolute visual magnitude, as a BAND: L/L☉ = 10^((4.83 − M_V)/2.5) and
 * τ = 10 Gyr · (L/L☉)^(−2.5/3.5) (L ∝ M^3.5, τ ∝ M/L — the textbook relation, e.g. Carroll & Ostlie §13).
 * A star is drawn while |t| < τ: in the future it has not died, in the past it had been born — every star
 * treated as mid-life, which is the band's statement. @param {number} absMagV
 */
function mainSequenceLifetimeYears(absMagV) {
  const L = 10 ** ((4.83 - absMagV) / 2.5);
  return 1e10 * L ** (-2.5 / 3.5);
}

module.exports = { LOCAL_GALACTIC_KINEMATICS, RADIAL_AMPLITUDE_MAX, SUN_EPOCH_YEAR, ORBIT_INTEGRATION, KMS_TO_PC_PER_YEAR, KMS_PER_MASYR_KPC, G_PC_KMS2_PER_MSUN, GAUSS_LEGENDRE_8, localRotationCurve, heliocentricGalacticState, orbitElements, radiusAt, galactocentricPositionAt, galactocentricPositionAtYear, heliocentricGalacticAtYear, galacticAcceleration, galactocentricState, integrateOrbitRK4, integrationSchedule, integratedStateAtYear, mainSequenceLifetimeYears, sunHeightPcAtYear, MILKY_WAY_LIGHT_DISTANCE_PC, milkyWayLatitudeShiftDegAtYear };
