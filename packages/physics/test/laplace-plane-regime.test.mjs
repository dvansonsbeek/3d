/**
 * The Laplace-plane regime of the lunar orbit (plan 31 part A; doc 111 §1.42) — contract pins:
 *   - the J2000 anchor is exact: R ≡ 1, the free inclination ≡ its J2000 constant, the published
 *     node and perigee periods ≡ their J2000 anchors (the identity, not a tolerance),
 *   - the regime is absent from the era: |1 − R| < 1e-6 at 10 kyr and < 1e-4 at 10 Ma,
 *   - the limits of the coupled state: with the lunar angular momentum removed the coupled
 *     Laplace tilt is the test-particle closed form (TTN09 eq. 23) to 1e-6° at 4,400 Ma and at
 *     the edge; at the edge (a ≪ r_L) the coupled rate sits between the test-particle rate and
 *     the rigid-lock bound, within 1 % of the bound,
 *   - the paleo referees stay: the lunar term moves by less than 0.5 % at 1.4 and 2.46 Ga
 *     (a planted equatorial factor at 60 R⊕ fails here before it fails the anchors gate),
 *   - the edge row: the clock at the cited history's end is between 1,000 and 3,000 yr —
 *     above the ecliptic form's 9 yr by two orders, below the solar-only 17,600 (the Moon's
 *     orbit still transmits the solar torque),
 *   - the regime's reach: 1 − R crosses 1 % inside 2,460 Ma only (the Moon beyond 33 R⊕ is
 *     outside it),
 *   - the node of date: the oblateness term dominates at the edge (the period under 5 yr against
 *     the solar form's hundreds), and the two forms agree to 1 % at 2.46 Ga,
 *   - the free inclination: the derived history is monotone into the past, 9–17° at the edge
 *     (κ = 1/4 … 1/2), its band ordered.
 *
 *   node packages/physics/test/laplace-plane-regime.test.mjs   (exit 1 on fail)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { createLaplacePlaneRegime, testParticleTiltFromEquatorDeg } = require(join(ROOT, 'packages/physics/src/earth/laplace-plane.cjs'));
const DT0 = require(join(ROOT, 'tools/lib/deep-time.js'));
// ESSRT_LAPLACE_PLANT=1 — the fail-proof: an equatorial factor planted at 60 R⊕ (R = 0.5 at 1.4 Ga,
// where the Moon is at 53 R⊕ and the paleo referee reads the composed rate) must fail the referee row.
const PLANT = process.env.ESSRT_LAPLACE_PLANT === '1';
const DT = PLANT ? { ...DT0, meanLunarRegimeFactorAtAge: (/** @type {number} */ t) => (t === 1400 ? 0.5 : DT0.meanLunarRegimeFactorAtAge(t)) } : DT0;

/** @type {string[]} */
const failures = [];
/** @param {string} name @param {boolean} ok @param {string} detail */
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };
const EDGE_MA = DT.navigablePosRange ? 4428.98 : 4428.98;
const JY = 365.25 * 86400;
const R_E = 6378136.6;

// ── the anchor ──
check('R ≡ 1 at J2000', DT.meanLunarRegimeFactorAtAge(0) === 1, `${DT.meanLunarRegimeFactorAtAge(0)}`);
check('free inclination ≡ its J2000 constant', DT.meanLunarFreeInclinationDegAtAge(0) === DT.EPOCH_PARAMS.moonInclinationJ2000Deg || DT.meanLunarFreeInclinationDegAtAge(0) === 5.1573, `${DT.meanLunarFreeInclinationDegAtAge(0)}`);
check('node period ≡ its J2000 anchor', DT.meanLunarNodePrecessionAtAge(0) === DT.MOON_NODAL_J2000_S, `${DT.meanLunarNodePrecessionAtAge(0)}`);
check('perigee period ≡ its J2000 anchor', DT.meanLunarPerigeePrecessionAtAge(0) === DT.MOON_APSIDAL_J2000_S, `${DT.meanLunarPerigeePrecessionAtAge(0)}`);
check('T_p at the certified anchor at J2000', Math.abs(DT.meanLunisolarPrecessionPeriodYearsAtAge(0) - DT.certifiedAxialPrecessionJ2000Years()) < 1e-9, `${DT.meanLunisolarPrecessionPeriodYearsAtAge(0)}`);

// ── the era ──
const r10k = DT.meanLunarRegimeFactorAtAge(0.01), r10M = DT.meanLunarRegimeFactorAtAge(10);
check('era untouched at 10 kyr', Math.abs(r10k - 1) < 1e-6, `${r10k}`);
check('era untouched at 10 Ma', Math.abs(r10M - 1) < 1e-4, `${r10M}`);

// ── the limits ──
// Rebuild the regime on the chain's own histories with the spin FROZEN (both torques on the spin
// removed — scaling the Moon's MASS is not this limit, since the module takes the lunar torque from
// the composed law's constants, and leaving the Sun's torque in keeps a Coriolis term of 3 % at the
// edge): the ring's tilt must become the test-particle closed form on the module's own coefficient
// ratio β_M/β_S = 2(r_L/a)⁵, to the bisection's precision.
const K0 = {
  earthJ2J2000: 0.00108262668, earthRadiusMetres: DT.EPOCH_PARAMS.earthRadiusM, astronomicalUnitMetres: 149597870.698828e3,
  gmSunM3S2: 132712440041.27942e9, gmEarthAloneM3S2: 398600.435507e9, gmEarthMoonM3S2: DT.EPOCH_PARAMS.gmEarthMoonM3S2,
  moonMassKg: DT.EPOCH_PARAMS.moonMassKg, moonEccentricityFactor: DT.EPOCH_PARAMS.moonEccentricityFactor, earthEccentricityJ2000: 0.01671022,
  moonInclinationJ2000Deg: 5.1573, moonDistanceJ2000Metres: DT.A_MOON_NOW_M, lodJ2000Seconds: DT.LOD_NOW_H13_S,
  precessionSolarShareJ2000: DT.PRECESSION_SOLAR_SHARE_J2000, meanObliquityJ2000Deg: DT.meanObliquityCitedDegAtAge(0),
  moonNodalJ2000Seconds: DT.MOON_NODAL_J2000_S, moonApsidalJ2000Seconds: DT.MOON_APSIDAL_J2000_S,
};
const fns = {
  moonDistanceMetresAtAge: DT.meanMoonDistanceMetresAtAge, lodSecondsAtAge: DT.meanLodSecondsAtAge, meanObliquityDegAtAge: DT.meanObliquityCitedDegAtAge,
  iEarthAtAge: DT.iEarthAtAge, lunarNodeSolarPeriodSecondsAtAge: DT.meanLunarNodeSolarPrecessionAtAge, lunarPerigeeSolarPeriodSecondsAtAge: DT.meanLunarPerigeeSolarPrecessionAtAge,
  p0ArcsecPerYr: DT.precessionRateJ2000ArcsecPerYr,
};
const testParticle = createLaplacePlaneRegime({ constants: { ...K0, spinTorqueScale: 1e-12 }, fns });
const shipped = createLaplacePlaneRegime({ constants: K0, fns });
for (const t of [4400, EDGE_MA]) {
  const s = testParticle.coupledStateAtAge(t);
  const a = DT.meanMoonDistanceMetresAtAge(t);
  const rLEff = a * Math.pow(s.betaJ2RadPerYr / (2 * s.betaSolarRadPerYr), 0.2);
  const closed = testParticleTiltFromEquatorDeg(a, DT.meanObliquityCitedDegAtAge(t), rLEff);
  check(`frozen-spin limit → the closed form at ${t} Ma`, Math.abs(s.phiDeg - closed) < 1e-8, `${s.phiDeg} vs ${closed}`);
  // the ring's J₂ coefficient is the DIRECT (3/2) n J₂ (R/a)²; the composed law's lunar term implies one by the
  // third law that sits 2.4 % below it — the IAU general-precession anchor's convention (geodesic + planetary share),
  // recorded, not tuned: the ratio is pinned between 0.90 and 1.00 at both ages
  const sh = shipped.coupledStateAtAge(t);
  const ratio = sh.betaJ2ThirdLawRadPerYr / (sh.ringJ2RadPerYr * sh.inclinationFactor);
  check(`the third-law coefficient against the direct one at ${t} Ma: the p_A convention (0.90–1.00)`, ratio > 0.90 && ratio < 1.0, `${ratio}`);
}
const sEdge = shipped.coupledStateAtAge(EDGE_MA);
const lock = shipped.rigidLockRateRadPerYrAtAge(EDGE_MA);
// the test-particle rate: the spin's lunar term × sin 2φ/sin 2ε̄ on the closed-form tilt (the measurement's form)
const tpState = testParticle.coupledStateAtAge(EDGE_MA);
const tpEdge = tpState && { omegaRadPerYr: sEdge.alphaSolarRadPerYr * Math.cos(sEdge.epsDeg * Math.PI / 180) + sEdge.alphaLunarRadPerYr * Math.cos(tpState.phiDeg * Math.PI / 180) * Math.sin(tpState.phiDeg * Math.PI / 180) / Math.sin(sEdge.epsDeg * Math.PI / 180) };
check('edge: the coupled rate lies between the test-particle rate and the lock bound', sEdge && tpEdge && lock !== null && sEdge.omegaRadPerYr <= tpEdge.omegaRadPerYr && sEdge.omegaRadPerYr >= lock * 0.99, `${sEdge && sEdge.omegaRadPerYr} vs test-particle ${tpEdge && tpEdge.omegaRadPerYr}, lock ${lock}`);
check('edge: the coupled rate within 1 % of the lock bound (a ≪ r_L)', sEdge && lock !== null && Math.abs(sEdge.omegaRadPerYr / lock - 1) < 0.01, `${sEdge && sEdge.omegaRadPerYr / lock}`);

// ── the paleo referees ──
for (const [t, tol] of [[1400, 0.005], [2460, 0.005]]) {
  const r = DT.meanLunarRegimeFactorAtAge(t);
  check(`the lunar term at ${t} Ma moves < ${tol * 100} %`, r !== null && Math.abs(1 - r) < tol, `${r}`);
}

// ── the edge row ──
const Tp = DT.meanLunisolarPrecessionPeriodYearsAtAge(EDGE_MA);
const sEdgeChain = DT.meanLunisolarTorqueRateArcsecPerYrAtAge(EDGE_MA);
void sEdgeChain;
check('edge clock between 1,000 and 3,000 yr', Tp !== null && Tp > 1000 && Tp < 3000, `${Tp}`);
const w = DT.LOD_NOW_H13_S / DT.meanLodSecondsAtAge(EDGE_MA), lf = Math.pow(DT.A_MOON_NOW_M / DT.meanMoonDistanceMetresAtAge(EDGE_MA), 3);
const fS = DT.PRECESSION_SOLAR_SHARE_J2000, p0 = DT.precessionRateJ2000ArcsecPerYr(), cosR = DT.precessionObliquityFactorAtAge(EDGE_MA);
const TpEcliptic = 1296000 / (w * p0 * (fS + (1 - fS) * lf) * cosR), TpSolar = 1296000 / (w * p0 * fS * cosR);
check('edge clock two orders above the ecliptic form and below the solar-only', Tp > 100 * TpEcliptic && Tp < TpSolar, `${Tp} vs ecliptic ${TpEcliptic}, solar-only ${TpSolar}`);

// ── the reach ──
let onePct = null;
for (let t = 0; t <= EDGE_MA; t += 1) { const r = DT.meanLunarRegimeFactorAtAge(Math.min(t, EDGE_MA)); if (r !== null && 1 - r > 0.01) { onePct = t; break; } }
check('1 − R crosses 1 % inside 2,460 Ma only', onePct !== null && onePct > 2460, `${onePct}`);

// ── the node of date ──
const nodeEdge = DT.meanLunarNodePrecessionAtAge(EDGE_MA) / JY, nodeSolarEdge = DT.meanLunarNodeSolarPrecessionAtAge(EDGE_MA) / JY;
check('edge: the oblateness term dominates the node', nodeEdge < 5 && nodeSolarEdge > 100, `${nodeEdge} vs solar ${nodeSolarEdge}`);
const n2460 = DT.meanLunarNodePrecessionAtAge(2460), s2460 = DT.meanLunarNodeSolarPrecessionAtAge(2460);
check('2.46 Ga: the node of date within 1 % of the solar form', Math.abs(n2460 / s2460 - 1) < 0.01, `${n2460 / s2460}`);
const perEdge = DT.meanLunarPerigeePrecessionAtAge(EDGE_MA) / JY;
check('edge: the perigee of date under 3 yr', perEdge < 3, `${perEdge}`);

// ── the table against the direct solve (doc 111 §1.42 d): the published readers interpolate a fixed
// 20-kyr grid of the coupled state; the direct solve is the instrument — 1e-9 of R, 1e-8 of the periods
{
  const reg = DT.chainForGates ? null : null; void reg;
  const regime = shipped;   // the gate's own instance on the chain's histories, table-less (no extent given)
  void regime;
  // by era: inside 2.5 Ga (the referees' and the arguments' certified reach) the table — built with α at its
  // J2000 reference (rule R2) — must be the shipped-α solve to 1e-6 of R (the GIA channel's 41-kyr ice wobble
  // reaches R at 2e-7 in the era and is the table's stated omission) and 1e-7 of the periods (the solar
  // modulation is live); in the transition (beyond) the A/B ratio's own wobble is interpolated — 1e-4 is the
  // measured class, where the band is 3 %
  const rows = [[0.013, 1e-6, 1e-7], [1.7, 1e-6, 1e-7], [37.31, 1e-6, 1e-7], [380.123, 1e-6, 1e-7], [1400.5, 1e-6, 1e-7], [2460.77, 1e-6, 1e-7],
    [3583.3, 1e-4, 1e-4], [4000.01, 1e-4, 1e-4], [4300.9, 1e-4, 1e-4], [4400.37, 1e-4, 1e-4], [4420.11, 1e-4, 1e-4], [4425.5, 1e-4, 1e-4], [4428.9, 1e-4, 1e-4]];
  let worstEraR = 0, worstEraP = 0, worstDeepR = 0, worstDeepP = 0;
  for (const [t, tolR, tolP] of rows) {
    const dR = Math.abs(/** @type {number} */ (DT.meanLunarRegimeFactorAtAge(t)) - /** @type {number} */ (DT.meanLunarRegimeFactorDirectAtAge(t)));
    const dN = Math.abs(DT.meanLunarNodePrecessionAtAge(t) / DT.meanLunarNodePrecessionDirectAtAge(t) - 1);
    const dP = Math.abs(DT.meanLunarPerigeePrecessionAtAge(t) / DT.meanLunarPerigeePrecessionDirectAtAge(t) - 1);
    check(`table ≡ solve at ${t} Ma (R within ${tolR})`, dR < tolR, `${dR}`);
    check(`table ≡ solve at ${t} Ma (the node and perigee of date within ${tolP})`, dN < tolP && dP < tolP, `node ${dN}, perigee ${dP}`);
    if (t < 2500) { worstEraR = Math.max(worstEraR, dR); worstEraP = Math.max(worstEraP, dN, dP); } else { worstDeepR = Math.max(worstDeepR, dR); worstDeepP = Math.max(worstDeepP, dN, dP); }
  }
  console.log(`  table vs solve — inside 2.5 Ga: R ${worstEraR.toExponential(1)}, periods ${worstEraP.toExponential(1)}; beyond: R ${worstDeepR.toExponential(1)}, periods ${worstDeepP.toExponential(1)}`);
  // the table's last node is the histories' last sample (4,429 Ma, 15 kyr past the navigable edge — the
  // registry reads it); past that both the table and the solve refuse
  check('the histories\' last sample answers from the table\'s last node', DT.meanLunarRegimeFactorAtAge(4429) !== null && Math.abs(/** @type {number} */ (DT.meanLunarRegimeFactorAtAge(4429)) - /** @type {number} */ (DT.meanLunarRegimeFactorDirectAtAge(4429))) < 1e-4, `${DT.meanLunarRegimeFactorAtAge(4429)} vs ${DT.meanLunarRegimeFactorDirectAtAge(4429)}`);
  check('beyond the histories both refuse', DT.meanLunarRegimeFactorAtAge(4429.5) === null && DT.meanLunarRegimeFactorDirectAtAge(4429.5) === null, `${DT.meanLunarRegimeFactorAtAge(4429.5)}`);
}

// ── the free inclination ──
let prev = DT.meanLunarFreeInclinationDegAtAge(0), mono = true;
for (let t = 1; t <= EDGE_MA; t += 1) { const i = DT.meanLunarFreeInclinationDegAtAge(Math.min(t, EDGE_MA)); if (i < prev - 1e-9) { mono = false; break; } prev = i; }
check('free inclination monotone into the past', mono, 'decreased into the past');
const iEdge = DT.meanLunarFreeInclinationDegAtAge(EDGE_MA), iBand = DT.meanLunarFreeInclinationBandDegAtAge(EDGE_MA);
check('free inclination at the edge 9–17° with its band ordered', iBand > 8 && iBand < iEdge && iEdge < 17, `${iBand} … ${iEdge}`);

// ── the lunar plane of date (plan 31 A2; doc 111 §1.43 — moon/plane-of-date.cjs, moon/series.cjs) ──
// ESSRT_LUNAR_PLANE_PLANT=1 — the fail-proof: the era tilt planted at 1.5× its anchor must fail the identity row.
{
  const { composeEclipticOfDate, createLunarPlaneScales } = require(join(ROOT, 'packages/physics/src/moon/plane-of-date.cjs'));
  const { FITTED_COEFFICIENTS: FC } = await import(join(ROOT, 'packages/physics/src/constants/coefficients.js'));
  const PLANE_PLANT = process.env.ESSRT_LUNAR_PLANE_PLANT === '1';
  // the shapes on the chain's regime readers — the composer's own wiring (model/lunar-theory.js)
  const planeScalesAtAge = createLunarPlaneScales({ tiltDegAtAge: DT.meanLaplaceTiltFromEclipticDegAtAge, freeInclinationDegAtAge: DT.meanLunarFreeInclinationDegAtAge });
  const s0 = planeScalesAtAge(0);
  check('plane scales ≡ 1 at J2000', s0 !== null && s0.tiltShape === 1 && s0.sinScale === 1 && s0.tanHalfSqScale === 1, JSON.stringify(s0));
  const s3k = planeScalesAtAge(0.003);
  check('era: the plane scales within 1e-4 at 3 kyr', s3k !== null && Math.abs(s3k.tiltShape - 1) < 1e-4 && Math.abs(s3k.sinScale - 1) < 1e-6, JSON.stringify(s3k));
  const sE = planeScalesAtAge(EDGE_MA);
  check('edge: the tilt shape carries 11–12.5° on Meeus\'s 8.05″ anchor', sE !== null && sE.tiltShape * 2235e-6 > 11 && sE.tiltShape * 2235e-6 < 12.5, `${sE && sE.tiltShape * 2235e-6}`);
  check('edge: the free inclination scale 3.0–3.3 (16° on 5.16°)', sE !== null && sE.sinScale > 3.0 && sE.sinScale < 3.3 && sE.tanHalfSqScale > 9 && sE.tanHalfSqScale < 11, `${sE && sE.sinScale}, ${sE && sE.tanHalfSqScale}`);
  // The composition's era identity on Meeus's own polynomials and tables (the question is the FORM):
  // against the three flattening terms the exact rotation differs by the sidebands Meeus truncated —
  // 0.107″ rms of latitude, under 0.4″ max (the Horizons DE441 referee, weekly 1970–2049: the β scatter
  // drops by exactly that quadrature, 1.019 → 1.014″) — and leaves the longitude untouched to 1e-3″
  // (the fitted longitude already carries the tilt's first order: re-applying it read 2.809 → 2.824″).
  const D2R = Math.PI / 180;
  const poly = (/** @type {number[]} */ c, /** @type {number} */ T) => c[0] + c[1] * T + c[2] * T * T + (c[3] || 0) * T ** 3 + (c[4] || 0) * T ** 4;
  const ARGS = { Lp: [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000], D: [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000],
    M: [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000], Mp: [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000], F: [93.2720950, 483202.0175233, -0.0036539, -1 / 3526000, 1 / 863310000] };
  const sumTab = (/** @type {number[][]} */ tab, /** @type {number} */ Dr, /** @type {number} */ Mr, /** @type {number} */ Mpr, /** @type {number} */ Fr, /** @type {number} */ E) => {
    let s = 0;
    for (const r of tab) { let t = r[4] * Math.sin(r[0] * Dr + r[1] * Mr + r[2] * Mpr + r[3] * Fr); if (Math.abs(r[1]) === 1) t *= E; else if (Math.abs(r[1]) === 2) t *= E * E; s += t; }
    return s;
  };
  let n = 0, sb = 0, sl = 0, mx = 0;
  for (let k = -1500; k <= 1500; k++) {
    const T = k / 50 + 0.00037 * k / 365.25;   // ±30 centuries, de-phased from the month
    const Lp = poly(ARGS.Lp, T), Dd = poly(ARGS.D, T), M = poly(ARGS.M, T), Mp = poly(ARGS.Mp, T), Fd = poly(ARGS.F, T);
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const Dr = Dd * D2R, Mr = M * D2R, Mpr = Mp * D2R, Fr = Fd * D2R, Lpr = Lp * D2R;
    const A1 = (119.75 + 131.849 * T) * D2R, A2 = (53.09 + 479264.290 * T) * D2R, A3 = (313.45 + 481266.484 * T) * D2R;
    const lonDeg = Lp + (sumTab(FC.MEEUS_LONGITUDE_TERMS, Dr, Mr, Mpr, Fr, E) + 3958 * Math.sin(A1) + 1962 * Math.sin(Lpr - Fr) + 318 * Math.sin(A2)) * 1e-6;
    const latBase = (sumTab(FC.MEEUS_LATITUDE_TERMS, Dr, Mr, Mpr, Fr, E) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - Fr) + 175 * Math.sin(A1 + Fr)) * 1e-6;
    const three = (-2235 * Math.sin(Lpr) + 127 * Math.sin(Lpr - Mpr) - 115 * Math.sin(Lpr + Mpr)) * 1e-6;
    const c = composeEclipticOfDate(lonDeg, latBase, 2235e-6, PLANE_PLANT ? 1.5 : 1);
    const dB = (c.latDeg - (latBase + three)) * 3600, dL = (c.lonDeg - lonDeg) * 3600;
    n++; sb += dB * dB; sl += dL * dL; if (Math.abs(dB) > mx) mx = Math.abs(dB);
  }
  const rmsB = Math.sqrt(sb / n), rmsL = Math.sqrt(sl / n);
  check('era identity: the rotation vs Meeus\'s three terms 0.05–0.2″ rms, < 0.4″ max', rmsB > 0.05 && rmsB < 0.2 && mx < 0.4, `${rmsB}″ rms, ${mx}″ max`);
  check('era identity: the longitude untouched to 1e-3″', rmsL < 1e-3, `${rmsL}″ rms`);
  console.log(`  lunar plane of date — era identity ${rmsB.toFixed(3)}″ rms (max ${mx.toFixed(3)}″), longitude ${rmsL.toExponential(1)}″; edge tilt ${(sE ? sE.tiltShape * 2235e-6 : NaN).toFixed(2)}°, sin-scale ${(sE ? sE.sinScale : NaN).toFixed(3)}`);
}

// ── plan 31 A2, the browser part's two ONE-home rules ──────────────────────────────────────
{
  const { composeEclipticInclinationDeg, LUNAR_PLANE_TILT_ANCHOR_DEG, createLunarPlaneScales } = require(join(ROOT, 'packages/physics/src/moon/plane-of-date.cjs'));
  const { sceneObliquityHandoverWeight, hybridBeatMeanDeg, composeSceneObliquityDeg, SCENE_OBLIQUITY_HANDOVER_YEARS } = require(join(ROOT, 'packages/physics/src/earth/scene-obliquity.cjs'));
  // the composed ecliptic inclination: |i_L − θ| at the node on the equinox line, i_L + θ opposite
  const iL = 5.1573, th = LUNAR_PLANE_TILT_ANCHOR_DEG;
  check('ecliptic inclination of date: i_L − θ at Ω = 0, i_L + θ at Ω = 180°', Math.abs(composeEclipticInclinationDeg(iL, th, 0) - (iL - th)) < 1e-12 && Math.abs(composeEclipticInclinationDeg(iL, th, 180) - (iL + th)) < 1e-12, `${composeEclipticInclinationDeg(iL, th, 0)} / ${composeEclipticInclinationDeg(iL, th, 180)}`);
  const sE = createLunarPlaneScales({ tiltDegAtAge: DT0.meanLaplaceTiltFromEclipticDegAtAge, freeInclinationDegAtAge: DT0.meanLunarFreeInclinationDegAtAge })(EDGE_MA);
  const iE = DT0.meanLunarFreeInclinationDegAtAge(EDGE_MA), thE = LUNAR_PLANE_TILT_ANCHOR_DEG * (sE ? sE.tiltShape : NaN);
  check('ecliptic inclination at the edge spans 4–5° to 27–29° over the node cycle', composeEclipticInclinationDeg(iE, thE, 0) > 4 && composeEclipticInclinationDeg(iE, thE, 0) < 5 && composeEclipticInclinationDeg(iE, thE, 180) > 27 && composeEclipticInclinationDeg(iE, thE, 180) < 29, `${composeEclipticInclinationDeg(iE, thE, 0)}–${composeEclipticInclinationDeg(iE, thE, 180)}°`);
  // the scene's obliquity hand-over: 0 inside the domain, C¹ to 1 a window past either edge
  const dom = /** @type {[number, number]} */ ([-9994000, 10001000]);
  const w = (/** @type {number} */ y) => sceneObliquityHandoverWeight(y, dom);
  check('scene obliquity weight: 0 inside the domain and at its edges, 1 a window beyond, ½ at the half-window', w(2000) === 0 && w(dom[0]) === 0 && w(dom[1]) === 0 && w(dom[0] - SCENE_OBLIQUITY_HANDOVER_YEARS) === 1 && w(dom[1] + 2e7) === 1 && Math.abs(w(dom[0] - SCENE_OBLIQUITY_HANDOVER_YEARS / 2) - 0.5) < 1e-12 && sceneObliquityHandoverWeight(2000, null) === 0, `${w(dom[0] - SCENE_OBLIQUITY_HANDOVER_YEARS / 2)}`);
  const dw = (w(dom[0] - 1) - w(dom[0] + 1)) / 2, dw1 = (w(dom[0] - SCENE_OBLIQUITY_HANDOVER_YEARS + 1) - w(dom[0] - SCENE_OBLIQUITY_HANDOVER_YEARS - 1)) / 2;
  check('scene obliquity weight: C¹ at both ends of the window (zero slope)', Math.abs(dw) < 1e-12 && Math.abs(dw1) < 1e-12, `${dw} / ${dw1}`);
  // the beat mean of a pure cosine wobble about 23.3° is 23.3° (41 samples over one period, endpoints inclusive: the half-weight ends cancel to 1/41 of the amplitude)
  const bm = hybridBeatMeanDeg((/** @type {number} */ y) => 23.3 + 1.2 * Math.cos(2 * Math.PI * y / 41000), 1234, 41000);
  check('hybrid beat mean of a cosine wobble is its centre to 1/41 of the amplitude', Math.abs(bm - 23.3) <= 1.2 / 41 + 1e-9, `${bm}`);
  // the lazy beat table: the instrument at a node, linear between nodes, pure in the year
  const { createHybridBeatTable, hybridBeatBandDeg, HYBRID_BEAT_TABLE_NODE_YEARS, composeSceneObliquityBand } = require(join(ROOT, 'packages/physics/src/earth/scene-obliquity.cjs'));
  const wob = (/** @type {number} */ y) => 23.3 + 1.2 * Math.cos(2 * Math.PI * y / 41000) + 1e-7 * (y - 2000);
  const tbl = createHybridBeatTable({ epsDegAt: wob, beatYearsAtYear: () => 41000 });
  const y1 = 2000 + 3 * HYBRID_BEAT_TABLE_NODE_YEARS, direct = hybridBeatBandDeg(wob, y1, 41000), atNode = tbl.atYear(y1);
  check('beat table: a node reads the 41-sample instrument bit-exactly', atNode.meanDeg === direct.meanDeg && atNode.minDeg === direct.minDeg && atNode.maxDeg === direct.maxDeg, JSON.stringify(atNode));
  const mid = tbl.atYear(y1 + HYBRID_BEAT_TABLE_NODE_YEARS / 2), n4 = tbl.atYear(y1 + HYBRID_BEAT_TABLE_NODE_YEARS);
  check('beat table: the midpoint is the linear mean of its two nodes; visit order does not change a node', Math.abs(mid.meanDeg - (atNode.meanDeg + n4.meanDeg) / 2) < 1e-12 && tbl.atYear(y1).meanDeg === atNode.meanDeg, `${mid.meanDeg}`);
  // the artifact path: a node inside the record's range is the record, one outside is computed
  const rec = { nodeYears: HYBRID_BEAT_TABLE_NODE_YEARS, kMin: 2, kMax: 3, nodes: [[1, 0, 2], [5, 4, 6]] };
  const tblA = createHybridBeatTable({ epsDegAt: wob, beatYearsAtYear: () => 41000, nodesArtifact: rec });
  check('beat table artifact: a node in range is the record, outside it the instrument; the range is reported', tblA.nodeAt(2).meanDeg === 1 && tblA.nodeAt(3).maxDeg === 6 && tblA.nodeAt(4).meanDeg === tbl.nodeAt(4).meanDeg && JSON.stringify(tblA.nodeRange) === '[2,3]' && tbl.nodeRange === null, JSON.stringify(tblA.atYear(2000 + 2.5 * HYBRID_BEAT_TABLE_NODE_YEARS)));
  const cb = composeSceneObliquityBand({ meanDeg: 23.3, minDeg: 22.1, maxDeg: 24.5 }, 11.9, 1);
  check('composed band: shifted onto the cited mean, the swing kept, the hybrid mean reported', Math.abs(cb.centreDeg - 11.9) < 1e-12 && Math.abs(cb.minDeg - 10.7) < 1e-12 && Math.abs(cb.maxDeg - 13.1) < 1e-12 && cb.hybridMeanDeg === 23.3, JSON.stringify(cb));
  check('composed scene obliquity: the hybrid where w = 0 or the cited mean is NaN; the shifted hybrid where w = 1', composeSceneObliquityDeg(23.5, 23.3, 11.9, 0) === 23.5 && composeSceneObliquityDeg(23.5, 23.3, NaN, 1) === 23.5 && Math.abs(composeSceneObliquityDeg(23.5, 23.3, 11.9, 1) - 12.1) < 1e-12, `${composeSceneObliquityDeg(23.5, 23.3, 11.9, 1)}`);
}

// ── PLAN 31 B — the Moon's axial tilt of date: the Cassini state on the regime (ONE home moon/cassini-state; doc 111 §1.49) ──
//   the anchor: the shipped obliquity at J2000 ≡ the measured composition −(i₀ + 1.5424°) exactly, the equation's own
//   within 0.05° of it (state 2); the frozen figure holds no state 1 at the edge (the measured fact that forces the
//   hydrostatic early figure); on the shipped reading the Moon is in state 1 at the edge with |ε| < 1.5°, the
//   transition (state 1 vanishing) lies at 33–34.5 R⊕ between 4,100 and 4,200 Ma — Ward 1975's 34 R⊕ — with the
//   last state-1 obliquity 20–30° and state 2 there 40–60°; state 2 at 2.46 Ga reads 7–9°, decaying to today; the
//   band's four readings are within 2° of each other at 2.46 Ga and their transitions within 1 R⊕; pure in the age.
{
  const { createCassiniState, CASSINI_FIGURE } = require(join(ROOT, 'packages/physics/src/moon/cassini-state.cjs'));
  const cs = createCassiniState({
    constants: { gmEarthMoonM3S2: DT.EPOCH_PARAMS.gmEarthMoonM3S2 ?? (398600.435507e9 + 4902.800118e9), earthRadiusMetres: DT.EPOCH_PARAMS.earthRadiusM ?? R_E, moonInclinationJ2000Deg: DT.meanLunarFreeInclinationDegAtAge(0), moonObliquityEclipticJ2000Deg: 1.5424 },
    fns: { moonDistanceMetresAtAge: DT.meanMoonDistanceMetresAtAge, lunarNodePeriodSecondsAtAge: DT.meanLunarNodePrecessionAtAge, freeInclinationDegAtAge: DT.meanLunarFreeInclinationDegAtAge, freeInclinationBandDegAtAge: DT.meanLunarFreeInclinationBandDegAtAge },
  });
  const s0 = cs.stateAtAge(0), i0 = DT.meanLunarFreeInclinationDegAtAge(0);
  check('Cassini: the shipped obliquity at J2000 ≡ the measured composition', !!s0 && s0.state === 2 && Math.abs(s0.obliquityToOrbitDeg + (i0 + 1.5424)) < 1e-12, `${s0 && s0.obliquityToOrbitDeg}`);
  check('Cassini: the equation\'s own J2000 state within 0.05° of the measured', !!s0 && Math.abs(s0.obliquityToOrbitEqDeg + (i0 + 1.5424)) < 0.05, `${s0 && s0.obliquityToOrbitEqDeg}`);
  const frozenEdge = cs.rawAtAge(EDGE_MA, { hydrostaticRadiusRe: 'frozen' });
  check('Cassini: the frozen figure holds no state 1 at the edge (the hydrostatic early figure is forced)', !!frozenEdge && frozenEdge.state1Deg === null && cs.transition({ hydrostaticRadiusRe: 'frozen' }) === null, `${frozenEdge && frozenEdge.state1Deg}`);
  const sE = cs.stateAtAge(EDGE_MA);
  check('Cassini: state 1 at the edge, |ε| < 1.5°', !!sE && sE.state === 1 && Math.abs(sE.obliquityToOrbitDeg) < 1.5 && sE.obliquityToOrbitDeg > 0, `${sE && sE.obliquityToOrbitDeg}`);
  const tr = cs.transition();
  check('Cassini: the transition at 33–34.5 R⊕, 4,100–4,200 Ma (Ward 1975: 34 R⊕), the last state-1 obliquity 20–30°, state 2 there 40–60°', !!tr && tr.aOverEarthRadii > 33 && tr.aOverEarthRadii < 34.5 && tr.ageMa > 4100 && tr.ageMa < 4200 && tr.lastState1Deg > 20 && tr.lastState1Deg < 30 && -tr.state2Deg > 40 && -tr.state2Deg < 60, JSON.stringify(tr));
  const s246 = cs.stateAtAge(2460), s14 = cs.stateAtAge(1400);
  check('Cassini: state 2 at 2.46 Ga reads 8.5–10.5° (measured 9.31), at 1.4 Ga 7.5–9° (8.22), both larger than today', !!s246 && s246.state === 2 && -s246.obliquityToOrbitDeg > 8.5 && -s246.obliquityToOrbitDeg < 10.5 && !!s14 && -s14.obliquityToOrbitDeg > 7.5 && -s14.obliquityToOrbitDeg < 9 && -s14.obliquityToOrbitDeg < -s246.obliquityToOrbitDeg, `${s246 && s246.obliquityToOrbitDeg} / ${s14 && s14.obliquityToOrbitDeg}`);
  const band = cs.bandAtAge(2460);
  const trs = [cs.transition({ kappaBand: true }), cs.transition({ hydrostaticRadiusRe: CASSINI_FIGURE.hydrostaticRadiusBandEarthRadii }), cs.transition({ kappaBand: true, hydrostaticRadiusRe: CASSINI_FIGURE.hydrostaticRadiusBandEarthRadii })];
  check('Cassini: the band\'s four readings within 2° at 2.46 Ga and their transitions within 1 R⊕ of the shipped one', band.readings.length === 4 && band.maxObliquityToOrbitDeg - band.minObliquityToOrbitDeg < 2 && trs.every((t) => t !== null && Math.abs(t.aOverEarthRadii - tr.aOverEarthRadii) < 1), `${band.minObliquityToOrbitDeg}…${band.maxObliquityToOrbitDeg}; ${trs.map((t) => t && t.aOverEarthRadii.toFixed(2)).join(' ')}`);
  const sA = cs.stateAtAge(3000), sB = cs.stateAtAge(100), sA2 = cs.stateAtAge(3000);
  check('Cassini: pure in the age (the same value in any order of asking)', !!sA && !!sB && JSON.stringify(sA) === JSON.stringify(sA2), '');
}

// ── PLAN 31 B — the early recession scenario (ONE home moon/early-recession): the law's factor off the history's first
//    segment inside the domain, the first-station-to-first-sample time (from 3.8 R⊕, the cited accretion distance;
//    the shipped 3-sample window ~1e5 yr, the band's 1- and 10-sample windows wider and narrower), the hand-off
//    state by the constant-L chain (a 5.1-h day at 3.8 R⊕, a 10.4-h month, the Moon ~8° across) and the law's
//    inverse closing on itself.
{
  const { createEarlyRecession } = require(join(ROOT, 'packages/physics/src/moon/early-recession.cjs'));
  const P = DT.EPOCH_PARAMS;
  const er = createEarlyRecession({ constants: { earthRadiusMetres: P.earthRadiusM, gmEarthMoonM3S2: P.gmEarthMoonM3S2, moonMassKg: P.moonMassKg, earthMassKg: P.earthMassKg, totalAngularMomentumKgM2S: P.totalAngularMomentumKgM2S, earthMomentOfInertiaKgM2: DT.iEarthAtAge(0), moonEccentricityFactor: P.moonEccentricityFactor }, fns: { moonDistanceMetresAtAge: DT.meanMoonDistanceMetresAtAge, earthMomentOfInertiaKgM2AtAge: DT.iEarthAtAge } });
  const h = er.handover();
  check('early recession: the hand-over is the domain\'s edge distance (6.1–6.3 R⊕) reached in 5e4–2e5 yr on the 3-sample window, the band ordered (10-sample shortest, 1-sample longest)', !!h && h.aOverEarthRadii > 6.1 && h.aOverEarthRadii < 6.3 && h.years > 5e4 && h.years < 2e5 && h.bandYears[1] < h.years && h.years < h.bandYears[0] && h.bandYears[1] > 1e4 && h.bandYears[0] < 5e5, JSON.stringify(h));
  const s3 = er.stateAt(er.scenario.firstStationEarthRadii), s6 = er.stateAt(h ? h.aOverEarthRadii : 6.18);
  check('early recession: the first station is 3.8 R⊕ (the cited accretion distance, 1.2–1.4 Roche radii of 2.9) and its hand-off state — a 5.0–5.2-h day, a 10.3–10.5-h month, the Moon 8–8.5° across, locked within 6–7 yr; at the first sample a 5.4–5.7-h day', er.scenario.firstStationEarthRadii === 3.8 && er.scenario.firstStationEarthRadii / er.scenario.rocheLimitEarthRadii > 1.2 && er.scenario.firstStationEarthRadii / er.scenario.rocheLimitEarthRadii < 1.4 && Math.abs(s3.dayHours - 5.10) < 0.1 && Math.abs(s3.monthHours - 10.37) < 0.1 && s3.moonDiameterDeg > 8 && s3.moonDiameterDeg < 8.5 && s3.lockYears > 6 && s3.lockYears < 7 && s6.dayHours > 5.4 && s6.dayHours < 5.7, `${s3.dayHours} h / ${s3.monthHours} h / ${s3.moonDiameterDeg}° / ${s3.lockYears} yr; first sample ${s6.dayHours} h`);
  const lodEdgeH = DT.meanLodSecondsAtAge(er.edgeMa) / 3600;
  check('early recession: the hand-over day ≡ the chain\'s own LOD at the edge (one form, two homes; 1e-9)', Math.abs(s6.dayHours - lodEdgeH) / lodEdgeH < 1e-9, `${s6.dayHours} vs ${lodEdgeH} h`);
  const back = h ? er.distanceReAtYears(h.years) : null;
  check('early recession: the law\'s inverse closes (the distance at the hand-over time ≡ the hand-over distance to 1e-9)', back !== null && !!h && Math.abs(back - h.aOverEarthRadii) < 1e-9 && Math.abs(er.distanceReAtYears(0) - er.scenario.firstStationEarthRadii) < 1e-12, `${back} vs ${h && h.aOverEarthRadii}; at 0 yr ${er.distanceReAtYears(0)}`);   // a^6.5 → a: a floating round trip (3.0 closed exactly, 3.8 to one ulp)
}

if (failures.length) { console.error(`laplace-plane-regime: ${failures.length} FAILURE(S)\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`laplace-plane-regime: OK — R ≡ 1 at J2000 (${(1 - r10k).toExponential(1)} at 10 kyr), 1 % reach ${onePct} Ma, r_L ${(DT.meanLaplaceRadiusMetresAtAge(0) / R_E).toFixed(2)} → ${(DT.meanLaplaceRadiusMetresAtAge(EDGE_MA) / R_E).toFixed(2)} R⊕, edge clock ${Tp.toFixed(0)} yr (ecliptic form ${TpEcliptic.toFixed(2)}, solar-only ${TpSolar.toFixed(0)}, lock ${(2 * Math.PI / lock).toFixed(0)}), node ${nodeEdge.toFixed(2)} yr, free inclination ${iBand.toFixed(1)}–${iEdge.toFixed(1)}°`);
