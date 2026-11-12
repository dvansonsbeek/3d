/**
 * The Laplace-plane regime of the lunar orbit — ONE home (holisticuniverse
 * plan 31 part A; doc 111 §1.42).
 *
 * WHAT IT IS. The Moon's orbit precesses about the LAPLACE plane: near the
 * ecliptic far from the Earth (today, 60 R⊕), near the equator inside the
 * Laplace radius r_L (8.4 R⊕ today on the J2000 oblateness, 15 R⊕ at the cited
 * history's end where the spin is 4× faster and the hydrostatic J₂ 19×). The
 * composed lunisolar precession law (earth/precession-composed.cjs) had carried
 * the lunar torque at full strength on the ecliptic at every epoch — the
 * ecliptic regime's form; inside the transition the Moon's averaged ring
 * tilts toward the equator and its torque on Earth's bulge precesses the spin
 * about the ecliptic pole less and less. The physics is classical: Goldreich
 * 1966 (the coupled spin–orbit history), Touma & Wisdom 1994 (the transition
 * on the recession), Tremaine, Touma & Namouni 2009 (the Laplace plane's
 * closed form). This module is the integration into the model's one axis.
 *
 * THE COUPLED STATE (decision 2026-11-11: the coupled two-vector form, never
 * the test-particle closed form alone). The spin axis ŝ and the lunar orbit's
 * mean plane normal n̂ precess together about the ecliptic pole ẑ at ONE rate Ω
 * in the uniformly precessing state:
 *
 *   dŝ/dt = α_S (ẑ·ŝ)(ẑ×ŝ) + α_M (n̂·ŝ)(n̂×ŝ)        (the Sun and the Moon's ring on the bulge)
 *   dn̂/dt = β_S (ẑ·n̂)(ẑ×n̂) + β_M (ŝ·n̂)(ŝ×n̂)        (the Sun and the Earth's J₂ on the ring)
 *
 * with the mutual pair by Newton's third law, ŝ at the cited mean obliquity ε̄
 * from ẑ, n̂ at θ from ẑ in the same plane. Steady precession at Ω with θ fixed
 * gives two equations in (Ω, θ):
 *
 *   Ω sin ε̄ = α_S cos ε̄ sin ε̄ + α_M cos(ε̄ − θ) sin(ε̄ − θ)
 *   Ω sin θ = β_S cos θ sin θ − β_M cos(ε̄ − θ) sin(ε̄ − θ)
 *
 * Limits (the gate's rows): the spin frozen gives the test-particle Laplace
 * plane tan 2φ = sin 2ε̄/(cos 2ε̄ + 2(r_L/a)⁵), φ = ε̄ − θ the tilt from the
 * equator (TTN09 eq. 23) and the spin's lunar term × sin 2φ/sin 2ε̄; a ≪ r_L
 * gives the rigid lock Ω = (α_S L_spin + β_S L_M) cos ε̄/(L_spin + L_M) — the
 * solar torque on the lunar orbit transmitted to the Earth, which is why the
 * clock at the history's end is ~2,000 yr and not the solar-only 17,600.
 *
 * THE MUTUAL TORQUE PAIR holds the third law EXACTLY on ONE ring: the ring's
 * J₂ precession coefficient is the DIRECT β_M = (3/2) n J₂(t) (R/a)² times the
 * free-inclination factor on the rate (the textbook's form), its angular
 * momentum L_M, and its torque on the spin α_M = β_M·L_M/L_spin. Measured
 * 2026-11-11: with the Moon's torque on the spin taken from the composed
 * law's lunar term instead — anchored on the IAU general precession p_A,
 * which carries the geodesic term and the planetary share, 2.4 % below the
 * direct coefficient — the pair no longer cancelled, and at the edge that
 * pair is 180× the solar torque: the clock moved 9 %; a cos i_L on L on one
 * side only cost 3 %. The regime factor is normalised at J2000, so the law's
 * lunar term keeps the model's p_A anchor and only the SHAPE comes from here;
 * the 2.4 % is recorded in the state (betaJ2ThirdLawRadPerYr) and pinned by
 * the gate as the convention it is.
 *
 * THE REGIME FACTOR R(t) the composed law multiplies its lunar term by:
 * R = (Ω − α_S cos ε̄)/(α_M,ecl cos ε̄), the Moon's share of the coupled rate
 * against the ecliptic form's lunar term, normalised to 1 at J2000 (x/x: the
 * IAU anchor is untouched; the closed-form 1 − g₀ = 7e-5 is inside it).
 * Measured on the build: 1 − R > 1 % only inside 3,583 Ma (a = 38.7 R⊕); the
 * lunar term moves 1.8e-3 at 1.4 Ga and 2.8e-3 at 2.46 Ga; T_p at the edge
 * 8.96 → ~2,000 yr, bottoming at 453 yr near twice the Laplace radius.
 *
 * THE FREE INCLINATION i_L(t) — the orbit's inclination to the Laplace plane
 * (5.157° today, the model's own dynamical mean to the ecliptic ≈ the Laplace
 * plane now). DERIVED on the cited distance history (decision 2026-11-11, no
 * new input): the secular tidal torque on the orbit lies along the pole it
 * precesses about, so |L| grows by its projection and the free inclination
 * follows sin i_L ∝ a^{−κ}, κ = 1/2 for the torque fully along the pole (the
 * same torque model the regime rests on; SHIPPED), κ = 1/4 the constant-lag
 * class (the BAND every surface that reads i_L carries; Goldreich 1966's ~10°
 * at 10 R⊕ sits between). The Moon's own tides are a stated omission. That
 * i_L is 5° today where a formation disk gives ~0° is the open lunar
 * inclination problem (Touma & Wisdom 1998; Ward & Canup 2000; Ćuk et al.
 * 2016) — named, not resolved; the modern rate is 3e-10 °/yr.
 *
 * THE LUNAR NODE AND PERIGEE OF DATE. The orbit's node regresses about the
 * Laplace pole at the eigenfrequency of the linearised ring equation,
 * ω_L = √[(A cos²(ε̄−θ) + B cos²θ)(A cos 2(ε̄−θ) + B cos 2θ)] with A the
 * oblateness coefficient and B the solar one (the month chain's Brouwer–
 * Clemence form — the observed J2000 regression scaled; ONE home there),
 * reducing to A on the equator and to B on the ecliptic, the orbit's own rate
 * ω_L cos i_L; the perigee advances at the in-plane scalar sum
 * (3/4) n J₂ (R/a)² (5 cos² i_eq − 1) + the solar term. Both published as the
 * J2000 period × the rate ratio (exact at the anchor). At the edge the
 * oblateness terms give 3.2 / 1.7 yr against the solar 560 / 267; equal near
 * 22 R⊕ (4,400 Ma).
 *
 * THE TABLE (doc 111 §1.42 d). A solve inside a rate is paid by every
 * integrator that reads the rate: solved cold at every distinct age, the
 * deep calendar's build (740,000 ages) went from 0.56 s to 2.6 s and the
 * genesis landing from 1.6 s to 6.3 s in the Node twin (3.1 → 10.8 s in the
 * browser's perf gate, limit 8). So the SLOW GEOMETRY of the coupled state
 * is READ FROM A FIXED AGE GRID, the form the cited histories themselves
 * take: nodes every TABLE_STEP_MA (20 kyr) over the navigable domain, built
 * OUTWARD FROM J2000 IN CHUNKS as deeper ages are asked for (a jump to
 * −400 Myr builds four chunks, the genesis forty-five, 3 µs a node), each
 * node the direct solve under the α-REFERENCE PIN (rule R2: a table holds α
 * at its J2000 reference, or it defines itself through its own output — the
 * conservation LOD rides the GIA α channel, whose 41-kyr ice wobble reaches R
 * at 2e-7 in the era, which a 20-kyr grid cannot follow; the shipped-α direct
 * solve differs from the table by that wobble there and by nothing deep,
 * the gate's era tolerance), read by cubic Hermite with central-difference tangents (the
 * mean-obliquity history's form) — a node's value never depends on when its
 * chunk was built, so the table is pure in age (§1.10: a FIXED grid, never
 * a cache that changes resolution), bit-identical in every runtime that
 * builds it from the same code, and exact AT the nodes: node 0 is J2000, so
 * R(0) ≡ 1 by the x/x normalisation. What is tabulated is slow: R_raw, the
 * plane's tilt θ, the node's eigen-ratio ω_L/β_S and the perigee's
 * oblateness part. The FAST content — the solar coefficient's eccentricity
 * modulation (the 100-kyr cycle, 0.5 % of the node rate: a first table that
 * carried it on the 20-kyr grid missed it by 3e-5, a degree of node over the
 * era) — stays LIVE: the node and perigee of date are the month chain's
 * solar forms (modulation and all, the former law's own reads) times the
 * table's slow factor, so the era is the former law's to 1e-9 and the deep
 * ages carry the table's interpolation (the A/B ratio's wobble, ≤ 1e-4 at
 * the edge, where the arguments are reproducible, not converged). Beyond
 * the table (the histories' last sample is 5 kyr past the navigable edge;
 * the registry reads it) the direct solve answers. The direct solve stays
 * the gate's instrument: the table is pinned against it, by era.
 *
 * J₂ of date is HYDROSTATIC, ∝ ω² (Farhat et al. 2022's scaling); the
 * historical era's J₂(t)/J₂₀ from the GIA channel (±5e-4) is not this and stays
 * where it is. Pure factory: every history is injected; no artifact reads.
 */

'use strict';

const D2R = Math.PI / 180;
const ARCSEC_PER_RAD = 648000 / Math.PI;
const SEC_PER_JULIAN_YR = 365.25 * 86400;
/** sin i_L ∝ a^{−κ}: the shipped exponent (the torque along the pole) and the band's other edge. */
const FREE_INCLINATION_EXPONENT_SHIPPED = 0.5;
const FREE_INCLINATION_EXPONENT_BAND = 0.25;
/** The table's node spacing (Myr) and its chunk (nodes per lazily built block, 100 Myr). */
const TABLE_STEP_MA = 0.02;
const TABLE_CHUNK_NODES = 5000;

/**
 * The test-particle Laplace plane (Tremaine, Touma & Namouni 2009 eq. 23) —
 * the tilt of the Laplace plane from the EQUATOR, degrees.
 * @param {number} aMetres the orbit's semi-major axis
 * @param {number} epsDeg the obliquity
 * @param {number} laplaceRadiusMetres r_L
 * @returns {number}
 */
function testParticleTiltFromEquatorDeg(aMetres, epsDeg, laplaceRadiusMetres) {
  const e2 = 2 * epsDeg * D2R;
  const x = 2 * Math.pow(laplaceRadiusMetres / aMetres, 5);
  return Math.atan2(Math.sin(e2), Math.cos(e2) + x) / 2 / D2R;
}

/**
 * @typedef {{
 *   omegaRadPerYr: number, thetaDeg: number, phiDeg: number, epsDeg: number,
 *   alphaSolarRadPerYr: number, alphaLunarEclipticRadPerYr: number, alphaLunarRadPerYr: number,
 *   betaSolarRadPerYr: number, betaJ2RadPerYr: number, ringJ2RadPerYr: number, betaJ2ThirdLawRadPerYr: number,
 *   inclinationFactor: number, lOrbitOverLSpin: number, regimeFactorRaw: number, freeInclinationDeg: number,
 *   nodeEigenRatio: number, perigeeJ2RateRadPerYr: number, nodeRateRadPerYr: number, perigeeRateRadPerYr: number,
 * }} CoupledState — nodeEigenRatio = ω_L/β_S (the slow geometry of the node's eigen-rate; 1 on the
 *   ecliptic), perigeeJ2RateRadPerYr the perigee's oblateness part; the two full rates are the
 *   direct solve's own (the ratio × the solar coefficient × cos i_L; the J₂ part + the solar term).
 */

/**
 * @param {{
 *   constants: {
 *     earthJ2J2000: number, earthRadiusMetres: number, astronomicalUnitMetres: number,
 *     gmSunM3S2: number, gmEarthAloneM3S2: number, gmEarthMoonM3S2: number,
 *     moonMassKg: number, moonEccentricityFactor: number, earthEccentricityJ2000: number,
 *     moonInclinationJ2000Deg: number, moonDistanceJ2000Metres: number, lodJ2000Seconds: number,
 *     precessionSolarShareJ2000: number, meanObliquityJ2000Deg: number,
 *     moonNodalJ2000Seconds: number, moonApsidalJ2000Seconds: number,
 *     spinTorqueScale?: number,
 *     tableAgeMinMa?: number, tableAgeMaxMa?: number,
 *   },
 *   fns: {
 *     moonDistanceMetresAtAge: (tMa: number) => (number | null),
 *     lodSecondsAtAge: (tMa: number) => (number | null),
 *     meanObliquityDegAtAge: (tMa: number) => (number | null),
 *     iEarthAtAge: (tMa: number) => number,
 *     lunarNodeSolarPeriodSecondsAtAge: (tMa: number) => (number | null),
 *     lunarPerigeeSolarPeriodSecondsAtAge: (tMa: number) => (number | null),
 *     p0ArcsecPerYr: () => number,
 *     underAlphaReferencePin?: (build: () => void) => void,
 *   },
 * }} deps — constants the engine's own J2000 anchors (SI: metres, seconds, kg);
 *   fns the engine's histories (the cited distance and mean obliquity, the
 *   conservation LOD, the GIA-pinned moment of inertia) and the month chain's
 *   SOLAR node/perigee periods of date (the Brouwer–Clemence form with the
 *   e-channel modulation, the observed J2000 periods at t = 0). p0 lazy, as the
 *   composed law's. spinTorqueScale (default 1) scales BOTH torques on the
 *   spin (the spin frozen, the ring finds its Laplace plane) — the gate's
 *   test-particle limit (→ 0), never a model setting. tableAgeMinMa /
 *   tableAgeMaxMa the table's extent (the navigable domain; absent, no table:
 *   every read the direct solve). underAlphaReferencePin the chain's pin for
 *   a table build — α held at its J2000 reference (absent, the build runs
 *   under the caller's state).
 */
function createLaplacePlaneRegime({ constants: K, fns }) {
  const i0Rad = K.moonInclinationJ2000Deg * D2R;
  const incl0 = 1 - 1.5 * Math.sin(i0Rad) ** 2;
  const cosEps0 = Math.cos(K.meanObliquityJ2000Deg * D2R);
  const rL5Base = K.earthJ2J2000 * K.earthRadiusMetres * K.earthRadiusMetres * K.astronomicalUnitMetres ** 3
    * (K.gmEarthAloneM3S2 / K.gmSunM3S2) * Math.pow(1 - K.earthEccentricityJ2000 * K.earthEccentricityJ2000, 1.5);
  const scale = K.spinTorqueScale ?? 1;

  /** ω(t)/ω₀ on the conservation LOD. @param {number} tMa @returns {number|null} */
  function spinRatioAtAge(tMa) {
    const lod = fns.lodSecondsAtAge(tMa);
    return lod === null || !(lod > 0) ? null : K.lodJ2000Seconds / lod;
  }
  /** The hydrostatic oblateness of date J₂(t) = J₂₀ (ω/ω₀)². @param {number} tMa @returns {number|null} */
  function earthJ2AtAge(tMa) {
    const w = spinRatioAtAge(tMa);
    return w === null ? null : K.earthJ2J2000 * w * w;
  }
  /** r_L(t), metres — r_L⁵ = J₂(t) R² a_p³ (M_E/M_S)(1 − e²)^{3/2}. @param {number} tMa @returns {number|null} */
  function laplaceRadiusMetresAtAge(tMa) {
    const w = spinRatioAtAge(tMa);
    return w === null ? null : Math.pow(rL5Base * w * w, 0.2);
  }
  /** The free inclination to the Laplace plane, degrees: sin i_L = sin i₀ (a/a₀)^{−κ}; ≡ i₀ at J2000.
   * @param {number} tMa @param {number} [kappa] @returns {number|null} */
  function freeInclinationDegAtAge(tMa, kappa = FREE_INCLINATION_EXPONENT_SHIPPED) {
    if (tMa === 0) return K.moonInclinationJ2000Deg;
    const a = fns.moonDistanceMetresAtAge(tMa);
    if (a === null || !(a > 0)) return null;
    const s = Math.sin(i0Rad) * Math.pow(a / K.moonDistanceJ2000Metres, -kappa);
    return Math.asin(Math.min(1, s)) / D2R;
  }
  /** The band's other edge (κ = 1/4). @param {number} tMa @returns {number|null} */
  const freeInclinationBandDegAtAge = (tMa) => freeInclinationDegAtAge(tMa, FREE_INCLINATION_EXPONENT_BAND);

  /**
   * THE DIRECT SOLVE — the coupled uniformly precessing state at an age; null
   * out of the histories' domain. The table's node builder and the gate's
   * instrument; the published readers go through the table.
   * @param {number} tMa
   * @returns {CoupledState | null}
   */
  function coupledStateAtAge(tMa) {
    const a = fns.moonDistanceMetresAtAge(tMa);
    const lod = fns.lodSecondsAtAge(tMa);
    const eps = fns.meanObliquityDegAtAge(tMa);
    const iL = freeInclinationDegAtAge(tMa);
    const tNodeSolar = fns.lunarNodeSolarPeriodSecondsAtAge(tMa);
    const tPerigeeSolar = fns.lunarPerigeeSolarPeriodSecondsAtAge(tMa);
    if (a === null || !(a > 0) || lod === null || !(lod > 0) || eps === null || iL === null
      || tNodeSolar === null || !(tNodeSolar > 0) || tPerigeeSolar === null || !(tPerigeeSolar > 0)) return null;
    const w = K.lodJ2000Seconds / lod;
    const p0 = fns.p0ArcsecPerYr() / ARCSEC_PER_RAD;           // rad/yr
    const e = eps * D2R, sinE = Math.sin(e), cosE = Math.cos(e);
    const lf = Math.pow(K.moonDistanceJ2000Metres / a, 3);
    const iLRad = iL * D2R;
    const inclF = (1 - 1.5 * Math.sin(iLRad) ** 2) / incl0;
    // the spin's precession coefficients (the composed law's terms as constants on ε̄₀)
    const alphaS = (w * p0 * K.precessionSolarShareJ2000 * scale) / cosEps0;
    const alphaMEcl = (w * p0 * (1 - K.precessionSolarShareJ2000) * lf * scale) / cosEps0;   // the ecliptic form's lunar term (R's denominator)
    // the ring's coefficients: the Sun's (the observed regression's coefficient, 1/cos i₀) and the DIRECT oblateness
    // coefficient (3/2) n J₂(t) (R/a)² on the ring's quadrupole of date; the mutual pair by the third law EXACTLY
    const betaS = (2 * Math.PI) / (tNodeSolar / SEC_PER_JULIAN_YR) / Math.cos(i0Rad);
    const lSpin = fns.iEarthAtAge(tMa) * (2 * Math.PI / lod);
    const lOrbit = K.moonMassKg * Math.sqrt(K.gmEarthMoonM3S2 * a) * K.moonEccentricityFactor;
    const n = Math.sqrt(K.gmEarthMoonM3S2 / (a * a * a)) * SEC_PER_JULIAN_YR;   // rad/yr
    const j2 = K.earthJ2J2000 * w * w;
    const ringJ2 = 1.5 * n * j2 * (K.earthRadiusMetres / a) ** 2;
    const betaM = ringJ2 * inclF;                                                   // the ring about the spin axis
    const alphaM = (betaM * lOrbit / lSpin) * scale;                                // the ring's torque on the spin
    const betaJ2ThirdLaw = (alphaMEcl / (scale || 1)) * inclF * lSpin / lOrbit;    // what the composed law's p_A-anchored lunar term would imply (the convention, recorded)
    // the bracket: F(0) = β_M cos ε̄ sin ε̄ > 0 and F(ε̄) = (α_S − β_S) cos ε̄ sin ε̄ < 0 — the two
    // inequalities (the ring's solar regression is orders above the spin's)
    if (!(betaM > 0 && sinE > 0 && cosE > 0 && alphaS < betaS)) return null;
    // the steady state: Ω(θ) from the spin equation, θ from the ring's — Newton from the closed-form
    // (frozen-spin) tilt, the bisection on [0, ε̄] as the deterministic fallback
    const omegaOf = (/** @type {number} */ th) => alphaS * cosE + (alphaM * Math.cos(e - th) * Math.sin(e - th)) / sinE;
    const F = (/** @type {number} */ th) => omegaOf(th) * Math.sin(th) - betaS * Math.cos(th) * Math.sin(th) + betaM * Math.cos(e - th) * Math.sin(e - th);
    const x = 2 * betaM / betaS;                          // the closed form's 2(r_L/a)⁵ on the module's own coefficients
    let theta = e - Math.atan2(Math.sin(2 * e), Math.cos(2 * e) + x) / 2;
    let converged = false;
    for (let k = 0; k < 12; k++) {
      const st = Math.sin(theta), ct = Math.cos(theta), su = Math.sin(e - theta), cu = Math.cos(e - theta);
      const om = alphaS * cosE + (alphaM * cu * su) / sinE;
      const f = om * st - betaS * ct * st + betaM * cu * su;
      const d = om * ct - (alphaM * (cu * cu - su * su) * st) / sinE - betaS * (ct * ct - st * st) - betaM * (cu * cu - su * su);
      if (!(d < 0)) break;
      const step = f / d;
      theta -= step;
      if (!(theta > 0 && theta < e)) break;
      if (Math.abs(step) < 1e-15) { converged = true; break; }
    }
    if (!converged) {
      let lo = 0, hi = e;
      for (let k = 0; k < 200 && hi - lo > 1e-16; k++) {
        const mid = 0.5 * (lo + hi);
        if (F(mid) > 0) lo = mid; else hi = mid;
      }
      theta = 0.5 * (lo + hi);
    }
    const omega = omegaOf(theta);
    const phi = e - theta;
    // the node's eigen-rate about the Laplace pole (the ring equation linearised), the orbit's own rate × cos i_L
    const A = ringJ2, B = betaS;
    const nodeEigen = Math.sqrt((A * Math.cos(phi) ** 2 + B * Math.cos(theta) ** 2) * (A * Math.cos(2 * phi) + B * Math.cos(2 * theta)));
    // the perigee's in-plane rate: (3/4) n J₂ (R/a)² (5 cos² i_eq − 1) + the solar term
    const cosIeq = Math.cos(phi) * Math.cos(iLRad);
    const perigeeJ2 = 0.5 * ringJ2 * (5 * cosIeq * cosIeq - 1);
    const perigeeRate = perigeeJ2 + (2 * Math.PI) / (tPerigeeSolar / SEC_PER_JULIAN_YR);
    return {
      omegaRadPerYr: omega, thetaDeg: theta / D2R, phiDeg: phi / D2R, epsDeg: eps,
      alphaSolarRadPerYr: alphaS, alphaLunarEclipticRadPerYr: alphaMEcl, alphaLunarRadPerYr: alphaM,
      betaSolarRadPerYr: betaS, betaJ2RadPerYr: betaM, ringJ2RadPerYr: ringJ2, betaJ2ThirdLawRadPerYr: betaJ2ThirdLaw,
      inclinationFactor: inclF, lOrbitOverLSpin: lOrbit / lSpin,
      regimeFactorRaw: (omega - alphaS * cosE) / (alphaMEcl * cosE),
      freeInclinationDeg: iL,
      nodeEigenRatio: nodeEigen / betaS,
      perigeeJ2RateRadPerYr: perigeeJ2,
      nodeRateRadPerYr: nodeEigen * Math.cos(iLRad),
      perigeeRateRadPerYr: perigeeRate,
    };
  }
  /** The solar coefficient of the ring, live: the month chain's solar node form (modulation and all), 1/cos i₀.
   * @param {number} tMa @returns {number|null} rad/yr */
  function solarRingCoefficientAtAge(tMa) {
    const t = fns.lunarNodeSolarPeriodSecondsAtAge(tMa);
    return t === null || !(t > 0) ? null : (2 * Math.PI) / (t / SEC_PER_JULIAN_YR) / Math.cos(i0Rad);
  }
  /** The perigee's solar term, live. @param {number} tMa @returns {number|null} rad/yr */
  function solarPerigeeRateAtAge(tMa) {
    const t = fns.lunarPerigeeSolarPeriodSecondsAtAge(tMa);
    return t === null || !(t > 0) ? null : (2 * Math.PI) / (t / SEC_PER_JULIAN_YR);
  }

  // ── THE TABLE: the state's four readers on a fixed age grid, built outward from J2000 in chunks ──
  const hasTable = typeof K.tableAgeMinMa === 'number' && typeof K.tableAgeMaxMa === 'number';
  const kMin = hasTable ? Math.ceil(/** @type {number} */ (K.tableAgeMinMa) / TABLE_STEP_MA) : 0;
  const kMax = hasTable ? Math.ceil(/** @type {number} */ (K.tableAgeMaxMa) / TABLE_STEP_MA) : 0;
  const underPin = fns.underAlphaReferencePin ?? ((/** @type {() => void} */ build) => build());
  const COLS = 4;   // R_raw, θ (rad), the node's eigen-ratio ω_L/β_S, the perigee's J₂ part (rad/yr) — the slow geometry
  /** @type {Map<number, Float64Array>} chunk index → COLS × TABLE_CHUNK_NODES (NaN where the solve is null) */
  const chunks = new Map();
  /** The chunk holding node k, built on first use. @param {number} k @returns {Float64Array} */
  function chunkOf(k) {
    const c = Math.floor(k / TABLE_CHUNK_NODES);
    let ch = chunks.get(c);
    if (ch === undefined) {
      const arr = new Float64Array(COLS * TABLE_CHUNK_NODES);
      underPin(() => {
        for (let j = 0; j < TABLE_CHUNK_NODES; j++) {
          const kk = c * TABLE_CHUNK_NODES + j;
          const s = (kk >= kMin && kk <= kMax) ? coupledStateAtAge(kk * TABLE_STEP_MA) : null;
          const o = COLS * j;
          if (s === null) { arr[o] = NaN; arr[o + 1] = NaN; arr[o + 2] = NaN; arr[o + 3] = NaN; }
          else { arr[o] = s.regimeFactorRaw; arr[o + 1] = s.thetaDeg * D2R; arr[o + 2] = s.nodeEigenRatio; arr[o + 3] = s.perigeeJ2RateRadPerYr; }
        }
      });
      ch = arr;
      chunks.set(c, ch);
    }
    return ch;
  }
  /** Node k's column value (NaN where the solve is null or k is outside the table). @param {number} k @param {number} col */
  function nodeValue(k, col) {
    if (k < kMin || k > kMax) return NaN;
    const ch = chunkOf(k);
    return ch[COLS * (k - Math.floor(k / TABLE_CHUNK_NODES) * TABLE_CHUNK_NODES) + col];
  }
  /**
   * The table read: cubic Hermite with central-difference tangents between the two nodes around
   * tMa (one-sided at a missing neighbour), the node's value exactly AT a node; NaN where a node is
   * missing (the caller then takes the direct solve) or outside the table.
   * @param {number} tMa @param {number} col @returns {number}
   */
  function tableRead(tMa, col) {
    if (!hasTable) return NaN;
    const u = tMa / TABLE_STEP_MA;
    const k0 = Math.floor(u);
    const s = u - k0;
    const y0 = nodeValue(k0, col);
    if (s === 0) return y0;
    const y1 = nodeValue(k0 + 1, col);
    if (Number.isNaN(y0) || Number.isNaN(y1)) return NaN;
    const ym = nodeValue(k0 - 1, col), yp = nodeValue(k0 + 2, col);
    const m0 = Number.isNaN(ym) ? y1 - y0 : 0.5 * (y1 - ym);
    const m1 = Number.isNaN(yp) ? y1 - y0 : 0.5 * (yp - y0);
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1;
  }
  /** A reader: the table where it answers, the direct solve where it does not.
   * @param {number} tMa @param {number} col @param {(s: CoupledState) => number} direct @returns {number|null} */
  function readOrSolve(tMa, col, direct) {
    const v = tableRead(tMa, col);
    if (!Number.isNaN(v)) return v;
    const s = coupledStateAtAge(tMa);
    return s === null ? null : direct(s);
  }

  /** @type {number|undefined} */
  let rawAtJ2000;
  const regimeRaw0 = () => {
    if (rawAtJ2000 === undefined) {
      const v = readOrSolve(0, 0, (s) => s.regimeFactorRaw);
      if (v === null) throw new Error('laplace-plane: no coupled state at J2000');
      rawAtJ2000 = v;
    }
    return rawAtJ2000;
  };
  /** R(t) — the lunar term's regime factor, ≡ 1 at J2000. @param {number} tMa @returns {number|null} */
  function regimeFactorAtAge(tMa) {
    const v = readOrSolve(tMa, 0, (s) => s.regimeFactorRaw);
    return v === null ? null : v / regimeRaw0();
  }
  /** R(t) by the direct solve alone (the gate's table-vs-solve row). @param {number} tMa @returns {number|null} */
  function regimeFactorDirectAtAge(tMa) {
    const s = coupledStateAtAge(tMa);
    return s === null ? null : s.regimeFactorRaw / regimeRaw0();
  }
  /** The Laplace plane's tilt from the ECLIPTIC, degrees (the lunar orbit's mean plane of date). @param {number} tMa @returns {number|null} */
  function laplaceTiltFromEclipticDegAtAge(tMa) {
    const v = readOrSolve(tMa, 1, (s) => s.thetaDeg * D2R);
    return v === null ? null : v / D2R;
  }
  /** The Laplace plane's tilt from the EQUATOR, degrees: ε̄ − θ. @param {number} tMa @returns {number|null} */
  function laplaceTiltFromEquatorDegAtAge(tMa) {
    const th = laplaceTiltFromEclipticDegAtAge(tMa), eps = fns.meanObliquityDegAtAge(tMa);
    return th === null || eps === null ? null : eps - th;
  }
  /** The test-particle closed form on the same inputs (the gate's limit row). @param {number} tMa @returns {number|null} */
  function testParticleTiltFromEquatorDegAtAge(tMa) {
    const a = fns.moonDistanceMetresAtAge(tMa), eps = fns.meanObliquityDegAtAge(tMa), rL = laplaceRadiusMetresAtAge(tMa);
    return a === null || eps === null || rL === null ? null : testParticleTiltFromEquatorDeg(a, eps, rL);
  }
  /** The rigid-lock bound Ω = (α_S L_s + β_S L_M) cos ε̄/(L_s + L_M), rad/yr (valid where a ≪ r_L; the gate's limit row). @param {number} tMa @returns {number|null} */
  function rigidLockRateRadPerYrAtAge(tMa) {
    const s = coupledStateAtAge(tMa);
    if (s === null) return null;
    const r = s.lOrbitOverLSpin, cosE = Math.cos(s.epsDeg * D2R);
    return ((s.alphaSolarRadPerYr + s.betaSolarRadPerYr * r) * cosE) / (1 + r);
  }
  /** The node's eigen-rate about the Laplace pole by the direct solve, rad/yr. @param {number} tMa @returns {number|null} */
  function nodeEigenRateRadPerYrAtAge(tMa) {
    const s = coupledStateAtAge(tMa);
    return s === null ? null : s.nodeRateRadPerYr / Math.cos(s.freeInclinationDeg * D2R);
  }
  /** The orbit's node rate of date, rad/yr: the table's eigen-ratio × the LIVE solar coefficient × cos i_L.
   * @param {number} tMa @returns {number|null} */
  function nodeRateRadPerYrAtAge(tMa) {
    const ratio = readOrSolve(tMa, 2, (s) => s.nodeEigenRatio);
    const bS = solarRingCoefficientAtAge(tMa);
    const iL = freeInclinationDegAtAge(tMa);
    return ratio === null || bS === null || iL === null ? null : ratio * bS * Math.cos(iL * D2R);
  }
  /** @type {number|undefined} */
  let nodeRate0;
  /** The lunar node's precession period of date, seconds — the J2000 period × the rate ratio (exact at the anchor). @param {number} tMa @returns {number|null} */
  function nodePeriodSecondsAtAge(tMa) {
    if (tMa === 0) return K.moonNodalJ2000Seconds;
    const r = nodeRateRadPerYrAtAge(tMa);
    if (r === null) return null;
    if (nodeRate0 === undefined) nodeRate0 = /** @type {number} */ (nodeRateRadPerYrAtAge(0));
    return K.moonNodalJ2000Seconds * nodeRate0 / r;
  }
  /** The perigee's in-plane rate of date, rad/yr: the table's J₂ part + the LIVE solar term. @param {number} tMa @returns {number|null} */
  function perigeeRateRadPerYrAtAge(tMa) {
    const j2 = readOrSolve(tMa, 3, (s) => s.perigeeJ2RateRadPerYr);
    const sol = solarPerigeeRateAtAge(tMa);
    return j2 === null || sol === null ? null : j2 + sol;
  }
  /** @type {number|undefined} */
  let perigeeRate0;
  /** The lunar perigee's precession period of date, seconds (exact at the anchor). @param {number} tMa @returns {number|null} */
  function perigeePeriodSecondsAtAge(tMa) {
    if (tMa === 0) return K.moonApsidalJ2000Seconds;
    const r = perigeeRateRadPerYrAtAge(tMa);
    if (r === null) return null;
    if (perigeeRate0 === undefined) perigeeRate0 = /** @type {number} */ (perigeeRateRadPerYrAtAge(0));
    return K.moonApsidalJ2000Seconds * perigeeRate0 / r;
  }
  /** The node and perigee periods by the direct solve alone (the gate's table-vs-solve rows). @param {number} tMa */
  function nodePeriodDirectSecondsAtAge(tMa) {
    const s = coupledStateAtAge(tMa);
    if (s === null) return null;
    if (nodeRate0 === undefined) nodeRate0 = /** @type {number} */ (nodeRateRadPerYrAtAge(0));
    return K.moonNodalJ2000Seconds * nodeRate0 / s.nodeRateRadPerYr;
  }
  /** @param {number} tMa */
  function perigeePeriodDirectSecondsAtAge(tMa) {
    const s = coupledStateAtAge(tMa);
    if (s === null) return null;
    if (perigeeRate0 === undefined) perigeeRate0 = /** @type {number} */ (perigeeRateRadPerYrAtAge(0));
    return K.moonApsidalJ2000Seconds * perigeeRate0 / s.perigeeRateRadPerYr;
  }

  return {
    spinRatioAtAge, earthJ2AtAge, laplaceRadiusMetresAtAge,
    freeInclinationDegAtAge, freeInclinationBandDegAtAge,
    coupledStateAtAge, regimeFactorAtAge, regimeFactorDirectAtAge,
    laplaceTiltFromEclipticDegAtAge, laplaceTiltFromEquatorDegAtAge, testParticleTiltFromEquatorDegAtAge,
    rigidLockRateRadPerYrAtAge, nodeEigenRateRadPerYrAtAge,
    nodePeriodSecondsAtAge, perigeeRateRadPerYrAtAge, perigeePeriodSecondsAtAge,
    nodePeriodDirectSecondsAtAge, perigeePeriodDirectSecondsAtAge,
    FREE_INCLINATION_EXPONENT_SHIPPED, FREE_INCLINATION_EXPONENT_BAND, TABLE_STEP_MA,
  };
}

module.exports = { createLaplacePlaneRegime, testParticleTiltFromEquatorDeg, FREE_INCLINATION_EXPONENT_SHIPPED, FREE_INCLINATION_EXPONENT_BAND, TABLE_STEP_MA };
