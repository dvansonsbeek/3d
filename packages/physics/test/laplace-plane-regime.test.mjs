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

if (failures.length) { console.error(`laplace-plane-regime: ${failures.length} FAILURE(S)\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`laplace-plane-regime: OK — R ≡ 1 at J2000 (${(1 - r10k).toExponential(1)} at 10 kyr), 1 % reach ${onePct} Ma, r_L ${(DT.meanLaplaceRadiusMetresAtAge(0) / R_E).toFixed(2)} → ${(DT.meanLaplaceRadiusMetresAtAge(EDGE_MA) / R_E).toFixed(2)} R⊕, edge clock ${Tp.toFixed(0)} yr (ecliptic form ${TpEcliptic.toFixed(2)}, solar-only ${TpSolar.toFixed(0)}, lock ${(2 * Math.PI / lock).toFixed(0)}), node ${nodeEdge.toFixed(2)} yr, free inclination ${iBand.toFixed(1)}–${iEdge.toFixed(1)}°`);
