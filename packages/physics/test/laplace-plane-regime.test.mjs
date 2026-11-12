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

if (failures.length) { console.error(`laplace-plane-regime: ${failures.length} FAILURE(S)\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`laplace-plane-regime: OK — R ≡ 1 at J2000 (${(1 - r10k).toExponential(1)} at 10 kyr), 1 % reach ${onePct} Ma, r_L ${(DT.meanLaplaceRadiusMetresAtAge(0) / R_E).toFixed(2)} → ${(DT.meanLaplaceRadiusMetresAtAge(EDGE_MA) / R_E).toFixed(2)} R⊕, edge clock ${Tp.toFixed(0)} yr (ecliptic form ${TpEcliptic.toFixed(2)}, solar-only ${TpSolar.toFixed(0)}, lock ${(2 * Math.PI / lock).toFixed(0)}), node ${nodeEdge.toFixed(2)} yr, free inclination ${iBand.toFixed(1)}–${iEdge.toFixed(1)}°`);
