/**
 * createModel() — the canonical assembly of the parts library (§7a step 1).
 *
 * The package deliberately ships unassembled factories; every consumer wires
 * them (tools/lib, script.js's generated-constants side, the website's
 * adapter). This module is that wiring, extracted once: constants in,
 * assembled model out. The api surface (Phase 15) builds on it, and the
 * eventual tools/lib adapter collapse swaps onto it instead of keeping a
 * private twin.
 *
 * Counterfactuals are first-class (§2d): the context validation and the
 * counterfactual hashing live in index.js's `createModel`, which composes
 * this assembly with the resolved, frozen context. This module stays pure
 * and browser-safe.
 *
 * Wiring order mirrors the reference adapter (holisticuniverse
 * src/lib/essrt.ts) operation-for-operation where FP association matters,
 * which itself mirrors tools/lib/constants.js §9.
 */
import { deriveEpochParams } from './layer0/derive-params.js';
import * as FL from './planets/fibonacci-laws.cjs';
import * as planetOrientation from './planets/orientation.cjs';
import { createPhaseMachinery } from './phase/index.cjs';
import { createCardinalModel } from './cardinal/index.cjs';
import { createDeltaTCycles } from './deltat/cycles.cjs';
import { createDeepTimeLod } from './deltat/deep-time.cjs';
import { createMoonRecessionHistory, createSolarChannelBudget } from './deltat/recession-history.cjs';
import { evalClimateL1OrbitalPermil } from './climate/l1-orbital.cjs';
import { createMoonEccChannel } from './moon/ecc-channel.cjs';
import { createMoonMonthChain } from './moon/month-chain.cjs';
import { createChainCycleIntegrator } from './chain-cycles/index.cjs';
import { createMoonArguments, jdToDecimalYear } from './moon/arguments.cjs';
import { createMoonSeries } from './moon/series.cjs';
import { createSunPlanetaryCompletion } from './eclipse/sun-planetary-completion.cjs';
import { moonSeriesExtensionDeg } from './moon/series-extension.cjs';
import { createEclipseFinders } from './eclipse/finders.cjs';
import { createBesselian } from './eclipse/besselian.cjs';
import { driver2PeriodSecondsAtAge } from './planets/orbit-chain.cjs';

/**
 * RA-day-offset Fourier amplitudes (ms). KNOWN EXCEPTION carried over from
 * the reference adapters: these are fit results that live as literals in the
 * engine too — packaging them into FITTED_COEFFICIENTS is the remaining
 * §7a-step-1b move; until then this is their single packaged home.
 */
const RA_DAY_OFFSET_MEAN_MS = -14.194;
const RA_DAY_OFFSET_ECC_MS = -5.64;
const RA_DAY_OFFSET_OBLIQ_MS = -1.684;

/**
 * Moon-channel eccentricity sensitivities (perigee/node), the [g/g₀]^s
 * exponents of the factored deep-time law. Same known-exception class as the
 * RA offsets above: single source src/script.js _FW_MOON, mirrored as
 * literals in tools/lib/deep-time.js (_ECOMP_S_W/_ECOMP_S_N). Both are
 * Meeus-effective — S_N moved 1.0 → 1.018 with the v4 frame-attribution
 * batch.
 */
const MOON_ECC_SENSITIVITY_PERIGEE = 2.407;
const MOON_ECC_SENSITIVITY_NODE = 1.018;

/**
 * Assemble the model surfaces from a resolved constants context + fitted
 * coefficients. Internal: `createModel` in index.js composes this with the
 * §2d context validation and counterfactual hashing — call that, not this.
 *
 * @param {Readonly<Record<string, any>>} C  the frozen constants context
 * @param {Readonly<Record<string, any>>} F  the fitted coefficients
 * @param {{ eccentricityAt?: (year: number) => number, eccentricityRateAt?: (year: number) => number, perihelionLongitudeDegAt?: (year: number) => number }} [laws]
 *   RESEARCH OVERRIDES for Earth's orbit laws (doc 109 §7): an alternative e(t),
 *   de/dt(t) and ϖ_of-date(t) flow through every consumer (the eclipse Sun, the
 *   Moon's E-factor, the cardinal points) exactly as the shipped laws do. Default
 *   {} = the shipped laws, bit-identical to before this parameter existed. Not a
 *   counterfactual in the §2d sense (no hash change) — callers must say when
 *   they used it; the generators refuse to --write under an override.
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon) — type inferred so ReturnType stays precise
 */
export function assembleModel(C, F, laws = {}) {
  // ── Derived constants (constants.js §9 order) ─────────────────────────────
  const H = C.foundational.holisticyearLength;
  const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
  const startmodelYear = C.foundational.startmodelYear;
  const startmodelJD = C.foundational.startmodelJD;
  const startModelYearWithCorrection = startmodelYear + C.foundational.correctionDays / meanSolarYearDays;
  const balancedYear = C.earthOrbital.perihelionalignmentYear
    - C.foundational.temperatureGraphMostLikely * (H / 16);

  const meanSiderealYearDays = C.yearLengthRef.siderealYear;
  const meanSiderealYearSeconds = meanSiderealYearDays * 86400;
  const meanSiderealYearDaysKinematic = (meanSolarYearDays * H) / (H - 13);
  const meanLengthOfDay = meanSiderealYearSeconds / meanSiderealYearDaysKinematic;
  const meanAnomalisticYearDays = (meanSolarYearDays * (H / 16)) / (H / 16 - 1);
  const meanTropicalYearJ2000Seconds = meanSolarYearDays * meanLengthOfDay;

  const earthtiltMean = C.earth.earthtiltMean;
  const earthInclAmplitude = C.earth.earthInvPlaneInclinationAmplitude;
  // eccentricityAmplitude: the Law-4 input A (the 1246 triangle closure; the
  // wobble-marker distance). It is the K calibration input ONLY — Earth's
  // eccentricity law does not use it; see eccentricityAt (base' derived) below.
  const eccentricityAmplitude = C.earth.eccentricityAmplitude;
  const earthRAAngle = 2 * earthInclAmplitude - (earthInclAmplitude * earthInclAmplitude) / earthtiltMean;
  const earthInclMean = C.earthOrbital.earthInclinationJ2000_deg
    - earthInclAmplitude * Math.cos(((C.earthOrbital.earthPerihelionLongitudeJ2000
      - C.earthOrbital.earthInclinationCycleAnchor) * Math.PI) / 180);
  const solsticeObliquityMean = F.SOLSTICE_OBLIQUITY_MEAN_FITTED;

  const G_CONSTANT = C.physicalConstants.G_CONSTANT;
  const MASS_RATIO_EARTH_MOON = C.physicalConstants.MASS_RATIO_EARTH_MOON;
  const currentAUDistance = C.physicalConstants.currentAUDistance;
  const earthMoiFactorJ2000 = C.physicalConstants.earthMoiFactorJ2000;
  const moonDistanceKm = C.moonReference.moonDistance;
  const moonSiderealMonthInput = C.moonReference.moonSiderealMonthInput;

  // 8H-lattice moon sidereal month (constants.js §"Moon derived months")
  const totalDaysInH = H * meanSolarYearDays;
  const moonSiderealMonth = totalDaysInH / (Math.round((8 * totalDaysInH) / moonSiderealMonthInput) / 8);

  // Mass chain: Moon Kepler → GM_EM → Earth/Moon split → Sun (§9 order)
  const moonOrbitalShift = moonDistanceKm * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (moonSiderealMonth / meanSiderealYearDays);
  const moonDistanceCorrected = moonDistanceKm + moonOrbitalShift;
  const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistanceCorrected, 3))
    / Math.pow(moonSiderealMonth * meanLengthOfDay, 2);
  const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
  const GM_MOON_ALONE = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1);
  const GM_SUN_PLUS_EARTH = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3))
    / Math.pow(meanSiderealYearSeconds, 2);
  const GM_SUN = GM_SUN_PLUS_EARTH - GM_EARTH_ALONE;
  const M_SUN = GM_SUN / G_CONSTANT;

  // ── α(t): climate-driven GIA channel with the R2 lattice pin ──────────────
  const CLIMATE = F.CLIMATE_FORMULA_COEFFS;
  const CLIMATE_REGIME = CLIMATE.regimes['lr04-post-mpt'];
  const alphaClimateScale = C.deepTime.alphaClimateScalePerMille;

  /** @param {number} year @returns {number} */
  const evalClimateL1 = (year) => evalClimateL1OrbitalPermil(year, {
    l1Terms: CLIMATE_REGIME.L1,
    yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
    eightHKyr: CLIMATE.config.eight_H_kyr,
  });

  let latticeAlphaPin = false;
  /** @type {number|null} */
  let alphaL1J2000 = null;
  /** @param {number} tMa @returns {number} */
  const earthMoiFactorAtAge = (tMa) => {
    if (latticeAlphaPin) return earthMoiFactorJ2000;
    if (alphaL1J2000 === null) alphaL1J2000 = evalClimateL1(2000);
    const L1at = evalClimateL1(2000 - tMa * 1e6);
    return earthMoiFactorJ2000 - alphaClimateScale * (L1at - alphaL1J2000);
  };

  // ── Layer 0 + deep-time core ──────────────────────────────────────────────
  const EPOCH_PARAMS = deriveEpochParams({
    solarLuminosityW: C.physicalConstants.solarLuminosityW,
    solarWindKgPerS: C.physicalConstants.solarWindMassLossKgPerS,
    speedOfLightKmPerS: C.physicalConstants.speedOfLight,
    alpha1PerMa: C.deepTime.alpha1PerMa,
    alpha3PerMa3: C.deepTime.alpha3PerMa3,
    alpha4PerMa4: C.deepTime.alpha4PerMa4,
    holisticYearJ2000: H,
    meanSiderealYearSeconds,
    meanSiderealYearDaysKinematic,
    sunMassKg: M_SUN,
    gmEarthAloneKm3S2: GM_EARTH_ALONE,
    gmMoonAloneKm3S2: GM_MOON_ALONE,
    gravitationalConstantKm3KgS2: G_CONSTANT,
    earthMoiFactorJ2000,
    earthDiameterKm: C.bodyDiametersKm.earth,
    moonDistanceKm,
    moonOrbitalEccentricity: C.moonReference.moonOrbitalEccentricityBase,
    gmEarthMoonSystemKm3S2: GM_EARTH_MOON_SYSTEM,
  });

  // ── Driver 1½: regime-aware recession history + the solar channels ────────
  // The quartic stays bit-identical ≤ jointMa (the Wells/Wu-gated era);
  // beyond, the fitted staircase spline to the Roche crossing, and the
  // ocean-leak/thermal-pump channels make L_EM time-dependent.
  const REGIME = C.deepTime.recessionRegime;
  const recession = createMoonRecessionHistory({
    aMoonNowMetres: EPOCH_PARAMS.moonDistanceNowM,
    alpha1PerMa: EPOCH_PARAMS.alpha1PerMa,
    alpha3PerMa3: EPOCH_PARAMS.alpha3PerMa3,
    alpha4PerMa4: EPOCH_PARAMS.alpha4PerMa4,
    regime: {
      jointMa: REGIME.jointMa,
      knotAgesMa: REGIME.knotAgesMa,
      knotDistancesKm: REGIME.knotDistancesKm,
      genesisMa: REGIME.genesisMa,
      rocheLimitKm: REGIME.rocheLimitKm,
    },
  });
  const moonDistanceMetresAtAge = recession.distanceMetresAtAge;
  const solarBudget = createSolarChannelBudget({
    lTotalJ2000KgM2S: EPOCH_PARAMS.totalAngularMomentumKgM2S,
    mMoonAloneKg: EPOCH_PARAMS.moonMassKg,
    gmEmM3PerS2: EPOCH_PARAMS.gmEarthMoonM3S2,
    eFactorMoon: EPOCH_PARAMS.moonEccentricityFactor,
    beta0: REGIME.solarOceanLeakBeta0,
    pumpStartMa: REGIME.thermalPumpStartMa,
    pumpEndMa: REGIME.thermalPumpEndMa,
    pumpFactor: REGIME.thermalPumpFactor,
    jointMa: REGIME.jointMa,
    genesisMa: REGIME.genesisMa,
    distanceMetresAtAge: moonDistanceMetresAtAge,
  });

  const DT = F.DT_STACK;
  const RES = F.DT_RESONATOR;
  const dtCycles = createDeltaTCycles({
    eightHYears: 8 * H,
    taperFullHalfwidthYears: C.deepTime.dtStackTaperFullHalfwidthYr,
    taperTotalHalfwidthYears: C.deepTime.dtStackTaperTotalHalfwidthYr,
    tropicalYearSecondsJ2000: meanTropicalYearJ2000Seconds,
    cycles: {
      bond: { latticeN: DT.bond.lattice_n, cosCoeffSeconds: DT.bond.cos_coeff_s, sinCoeffSeconds: DT.bond.sin_coeff_s },
      hallstatt: { latticeN: DT.hallstatt.lattice_n, cosCoeffSeconds: DT.hallstatt.cos_coeff_s, sinCoeffSeconds: DT.hallstatt.sin_coeff_s },
      jose5: { latticeN: DT.jose5.lattice_n, cosCoeffSeconds: DT.jose5.cos_coeff_s, sinCoeffSeconds: DT.jose5.sin_coeff_s },
      jose4: { latticeN: DT.jose4.lattice_n, cosCoeffSeconds: DT.jose4.cos_coeff_s, sinCoeffSeconds: DT.jose4.sin_coeff_s },
    },
    resonator: {
      t0LatticeN: RES.T0_lattice_n,
      q: RES.Q,
      kicks: RES.kick_epochs_year.map(/** @param {number} t @param {number} i */ (t, i) => ({
        tYear: t,
        cosSeconds: RES.kick_coefficients_s[i].cos,
        sinSeconds: RES.kick_coefficients_s[i].sin,
      })),
      tones: RES.drive_tones.map(/** @param {{dn: number, phi_locked_rad: number, amp_s: number}} t */ (t) => ({ dn: t.dn, phiLockedRad: t.phi_locked_rad, ampSeconds: t.amp_s })),
    },
  });

  /** Layer-3/4 cyclic δLOD sum (all shipped channels ON). @param {number} year @returns {number} */
  const dtCycleLodCorrectionSum = (year) =>
    dtCycles.cycleLodSecondsAt('bond', year)
    + dtCycles.cycleLodSecondsAt('hallstatt', year)
    + dtCycles.cycleLodSecondsAt('jose5', year)
    + dtCycles.cycleLodSecondsAt('jose4', year)
    + dtCycles.swingLodSecondsAt(year);

  const deepLod = createDeepTimeLod({
    constants: {
      lTotalEmKgm2S: EPOCH_PARAMS.totalAngularMomentumKgM2S,
      mMoonAloneKg: EPOCH_PARAMS.moonMassKg,
      mEarthAloneKg: EPOCH_PARAMS.earthMassKg,
      rEarthMetres: EPOCH_PARAMS.earthRadiusM,
      gmEmM3PerS2: EPOCH_PARAMS.gmEarthMoonM3S2,
      eFactorMoon: EPOCH_PARAMS.moonEccentricityFactor,
      aLockMetres: EPOCH_PARAMS.moonLockDistanceM,
      aMoonNowMetres: EPOCH_PARAMS.moonDistanceNowM,
      alpha1PerMa: EPOCH_PARAMS.alpha1PerMa,
      alpha3PerMa3: EPOCH_PARAMS.alpha3PerMa3,
      alpha4PerMa4: EPOCH_PARAMS.alpha4PerMa4,
      holisticYearJ2000: H,
      lodNowH13Seconds: EPOCH_PARAMS.lodNowH13Seconds,
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      solarMassLossFracPerYear: EPOCH_PARAMS.solarMassLossFracPerYear,
      siderealYearDaysKinematicJ2000: meanSiderealYearDaysKinematic,
    },
    moonDistanceMetresAtAge,
    moiFactorAtAge: earthMoiFactorAtAge,
    siderealYearDaysFourierAt: (year) => evalSiderealYearFourierIAU(year),
    cycleLodSumAt: dtCycleLodCorrectionSum,
    swingLodAt: (year) => dtCycles.swingLodSecondsAt(year),
    swingLodRateAt: (year) => dtCycles.swingLodRateAt(year),
    lEmAtAgeKgm2S: solarBudget.lEmAtAgeKgm2S,
  });

  // ── Integrated ∫1/H(t)dt phase (R2 α-pin honoured while building) ─────────
  const phaseM = createPhaseMachinery({
    holisticHAtAgeMa: (tMa) => deepLod.hAtAge(tMa),
    tableAnchorYear: startmodelYear,
    driftRefYear: startModelYearWithCorrection,
    hJ2000: H,
    yearMin: -500e6,
    yearMax: 500e6,
    stepYears: 10000,
  });
  let phaseTableBuilt = false;
  const phase = () => {
    if (!phaseTableBuilt) {
      latticeAlphaPin = true;
      try { phaseM.ensureTable(); } finally { latticeAlphaPin = false; }
      phaseTableBuilt = true;
    }
    return phaseM;
  };
  /** @param {number} yearA @param {number} yearB @param {number} divisorN @returns {number} */
  const cyclesBetween = (yearA, yearB, divisorN) => {
    const cyc = phase().cyclesBetween(yearA, yearB, divisorN);
    return cyc === null ? (divisorN * (yearB - yearA)) / H : cyc;
  };
  /** @param {number} anchorYear @param {number} year @param {number} divisorN @returns {number} */
  const phaseRadians = (anchorYear, year, divisorN) => 2 * Math.PI * cyclesBetween(anchorYear, year, divisorN);

  /** @param {number} year @returns {number} */
  const yearToTMa = (year) => (2000 - year) / 1e6;

  // ── Earth scalars (integrated-phase display semantics) ────────────────────
  /** @param {number} year @returns {number} */
  const earthPerihelionDeg = laws.perihelionLongitudeDegAt ?? ((year) => {
    let longitude = 270.0 + 360.0 * cyclesBetween(balancedYear, year, 16);
    for (const [div, sinC, cosC] of F.PERI_HARMONICS_RAW) {
      const ph = phaseRadians(balancedYear, year, div);
      longitude += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return (((longitude + F.PERI_OFFSET) % 360) + 360) % 360;
  });
  /** @param {number} year @returns {number} */
  const obliquityDeg = (year) => {
    let obliq = solsticeObliquityMean;
    for (const [div, sinC, cosC] of F.SOLSTICE_OBLIQUITY_HARMONICS) {
      const ph = phaseRadians(balancedYear, year, div);
      obliq += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return obliq;
  };
  // ECCENTRICITY UNIFICATION — ONE law for the whole model (plan
  // IP-eccentricity-unification, decision D1 = form (e)). Earth's orbital
  // eccentricity is the magnitude of a vector sum, e = |v₁ + v₂|: v₁ of
  // length base' along the ICRF perihelion (rotating once per H/3), v₂ of
  // length base'/2 FIXED in space along the inclination-cycle anchor
  // direction. Their relative angle θ rides the System-Reset lattice phase
  // (θ(t) = 3(t − balancedYear)/H·360° − 180°, θ(J2000) = 81.178°) — the
  // SAME anchor the inclination law and the Moon channel ride (their
  // extremes coincide: max −23,200, min −79,100). Then
  //     e(t) = base' · (1 + cos θ(t) / 2),   base' = e(J2000) / (1 + cos θ(J2000) / 2)
  // base' is DERIVED from the observed J2000 eccentricity and the anchor
  // (0.015520; the Law-5 balance moves 99.8636 → 99.8645%, Earth's weight
  // there being 0.05%). No new constants. Why H/3 and not the former H/16
  // beat law: eccentricity is frame-invariant and may carry only fixed-frame
  // lattice periods; H/16 is the OF-DATE perihelion period (13 + 3 = 16 —
  // the H/3 rotation seen from the H/13 equinox) and belongs to ϖ_of-date;
  // measured, the H/16 law's present ė (−0.84e-5/cy) is 5× below the
  // observed −4.20e-5 while this law reads −4.31e-5 (Phase-0 record:
  // tools/explore/fq7s-h3-law-candidate.mjs; JPL Sun 1.49″, registry 0.80″,
  // syzygy 3.72″). Consumers: the eclipse Sun (equation of centre), the
  // besselian Sun distance, the Moon channel (E-factor, perigee/node T²),
  // and the cardinal-point braid — one eccentricity everywhere.
  // ONE implementation for all three runtimes: moon/ecc-channel.cjs (the
  // Node engine's deep-time.js and the browser's script.js instantiate the
  // same channel with the same inputs). Its phase counter runs from J2000
  // (θ₀ = ϖ_ICRF(J2000) − 21.77° = 81.178°, the System-Reset anchor in
  // anchor form — doc 66 §1); base' is derived inside from the observed
  // J2000 eccentricity.
  const moonEcc = createMoonEccChannel({
    cyclesBetween,
    eccentricityBase: C.earth.eccentricityBase,
    perihelionLongitudeJ2000Deg: C.earthOrbital.earthPerihelionLongitudeJ2000,
    inclinationCycleAnchorDeg: C.earthOrbital.earthInclinationCycleAnchor,
    eccentricityJ2000: C.earthOrbital.earthEccentricityJ2000,
  });
  /** @param {number} year @returns {number} */
  const eccentricityAt = laws.eccentricityAt ?? ((year) => moonEcc.eccAt(year - 2000));
  /** de/dyear of the one law — the cardinal braid's equation-of-centre
   *  derivative rides it. @param {number} year @returns {number} */
  const eccentricityRateAt = laws.eccentricityRateAt ?? ((year) => moonEcc.eccRateAt(year - 2000));
  /** @param {number} year @returns {number} */
  const inclinationDeg = (year) => earthInclMean
    - earthInclAmplitude * Math.cos(phaseRadians(balancedYear, year, 3));
  /** @param {number} year @returns {number} */
  const ascendingNodeDeg = (year) => {
    const period = -H / 5;
    return (((C.earthOrbital.earthAscendingNodeInvPlane + (360.0 * (year - 2000)) / period) % 360) + 360) % 360;
  };

  // ── Year/day lengths ──────────────────────────────────────────────────────
  /** @param {number} year @param {number} base @param {Array<[number, number, number]>} harmonics @returns {number} */
  const evalYearFourier = (year, base, harmonics) => {
    let result = base;
    const c1 = phase().cyclesBetween(balancedYear, year, 1);
    if (c1 === null) return result;
    for (const [div, sinC, cosC] of harmonics) {
      const ph = div * c1 * 2 * Math.PI;
      result += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return result;
  };
  /** @param {number} year @returns {number} */
  const evalSiderealYearFourierIAU = (year) => evalYearFourier(year, meanSiderealYearDays, F.SIDEREAL_YEAR_HARMONICS);
  /** @param {number} year @returns {number} */
  const siderealYearDaysBase = (year) => {
    const tMa = yearToTMa(year);
    const lod = deepLod.lodSecondsAtAge(tMa);
    if (lod === null) return meanSiderealYearDays;
    return deepLod.siderealYearSecondsAtAge(tMa) / lod;
  };
  /** @param {number} year @returns {number} */
  const tropicalYearDaysBase = (year) => {
    const days = deepLod.yearInDaysAtAge(yearToTMa(year));
    return days === null ? meanSolarYearDays : days;
  };
  /** @param {number} year @returns {number} */
  const anomalisticYearDaysBase = (year) => {
    const tMa = yearToTMa(year);
    const Ht = deepLod.hAtAge(tMa);
    const tropD = deepLod.yearInDaysAtAge(tMa);
    if (Ht === null || tropD === null) return meanAnomalisticYearDays;
    return (tropD * (Ht / 16)) / (Ht / 16 - 1);
  };
  /** @param {number} year @returns {number} */
  const siderealYearDays = (year) => evalYearFourier(year, siderealYearDaysBase(year), F.SIDEREAL_YEAR_HARMONICS);
  /** @param {number} year @returns {number} */
  const anomalisticYearDays = (year) => evalYearFourier(year, anomalisticYearDaysBase(year), F.ANOMALISTIC_YEAR_HARMONICS);
  /** Kinematic LOD (Layer 0). @param {number} year @returns {number} */
  const dayLengthSeconds = (year) => deepLod.siderealYearSecondsAtAge(yearToTMa(year)) / siderealYearDays(year);
  /** @param {number} year @returns {number} */
  const raDayOffsetMs = (year) => RA_DAY_OFFSET_MEAN_MS
    + RA_DAY_OFFSET_ECC_MS * Math.cos(phaseRadians(balancedYear, year, 16))
    + RA_DAY_OFFSET_OBLIQ_MS * Math.cos(phaseRadians(balancedYear, year, 8));

  // ── Cardinal-point model ──────────────────────────────────────────────────
  const cardinalM = createCardinalModel({
    isDeepTime: () => true,
    constants: {
      anchors: F.CARDINAL_POINT_ANCHORS_ADJUSTED,
      harmonics: F.CARDINAL_POINT_HARMONICS,
      eccTerms: F.CARDINAL_POINT_ECC_TERMS,
      jointTerms: F.CARDINAL_POINT_JOINT_TERMS,
      derived: F.CARDINAL_POINT_DERIVED,
      tropicalHarmonics: F.TROPICAL_YEAR_HARMONICS,
      balancedYear,
      meanSolarYearDays,
      hJ2000: H,
      tiltMeanDeg: earthtiltMean,
      raAngleDeg: earthRAAngle,
      inclAmplitudeDeg: earthInclAmplitude,
    },
    fns: {
      cyclesBetween: (a, b, n) => phase().cyclesBetween(a, b, n),
      analyticTropicalDays: (year) => {
        const tMa = (startmodelYear - year) / 1e6;
        const Ht = deepLod.hAtAge(tMa);
        if (Ht === null) return null;
        return (deepLod.siderealYearSecondsAtAge(tMa) / 86400) * (1 - 13 / Ht);
      },
      meanHAtAgeMa: (tMa) => deepLod.hAtAge(tMa),
      meanYearRealLodDays: (tMa) => deepLod.yearInDaysAtAge(tMa),
      eccentricityAt,
      eccentricityRateAt,
    },
  });
  /** Tropical year: mean of the four cardinal intervals. @param {number} year @returns {number} */
  const tropicalYearDays = (year) => cardinalM.computeTropicalYearLength(year);
  /** @param {number} year @returns {number} */
  const tropicalYearDirectDays = (year) => evalYearFourier(year, tropicalYearDaysBase(year), F.TROPICAL_YEAR_HARMONICS);

  /** @param {number} year @returns {number} */
  const solarYearSeconds = (year) => tropicalYearDays(year) * dayLengthSeconds(year);
  /** @param {number} year @returns {number} */
  const siderealDaySeconds = (year) => solarYearSeconds(year) / (tropicalYearDays(year) + 1);
  /** @param {number} year @returns {number} */
  const stellarDaySeconds = (year) => {
    const tMa = yearToTMa(year);
    const HtRaw = deepLod.hAtAge(tMa);
    const Ht = HtRaw === null ? H : HtRaw;
    const syS = solarYearSeconds(year);
    const syD = tropicalYearDays(year);
    const sidDay = siderealDaySeconds(year);
    const raProjection = Math.cos((obliquityDeg(year) * Math.PI) / 180);
    return (syS / (syD + 1) / (Ht / 13) / (syD + 1)) * raProjection + sidDay;
  };
  /** @param {number} year @returns {number} */
  const measuredSolarDaySeconds = (year) => dayLengthSeconds(year) + raDayOffsetMs(year) / 1000;

  // ── Moon at epoch ─────────────────────────────────────────────────────────
  /** Solar-Δa-corrected Kepler month. @param {number} year @returns {number} */
  const moonSiderealMonthDaysAt = (year) => {
    const tMa = yearToTMa(year);
    const lod = deepLod.lodSecondsAtAge(tMa);
    if (lod === null) return NaN;
    const aAppKm = moonDistanceMetresAtAge(tMa) / 1000;
    const sidYrDays = deepLod.siderealYearSecondsAtAge(tMa) / lod;
    const deltaA = aAppKm * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (moonSiderealMonthInput / sidYrDays);
    const aCorrM = (aAppKm + deltaA) * 1000;
    const monthSeconds = 2 * Math.PI * Math.sqrt(Math.pow(aCorrM, 3) / EPOCH_PARAMS.gmEarthMoonM3S2);
    return monthSeconds / lod;
  };

  // ── ΔT (TT − UT1): raw Simpson + sequential stack adds ────────────────────
  /** @param {number} tMa @returns {number} */
  const meanDeltaTSecondsAtAge = (tMa) => {
    if (tMa === 0) return 0;
    let result = deepLod.deltaTRawSecondsAtAge(tMa);
    const yearY = 2000 - tMa * 1e6;
    result += dtCycles.cycleDeltaTSecondsAt('bond', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('hallstatt', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose5', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose4', yearY);
    result += dtCycles.swingDeltaTSecondsAt(yearY);
    return result;
  };
  /** @param {number} year @returns {number} */
  const deltaTSeconds = (year) => C.earthOrbital.deltaTStart + meanDeltaTSecondsAtAge(yearToTMa(year));

  // ── Planets: Fibonacci-law derivation chain + orientation ─────────────────
  const PLANET_KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const massEarthAlone = GM_EARTH_ALONE / G_CONSTANT;
  /** @type {Record<string, number>} */
  const massFraction = {};
  for (const k of PLANET_KEYS) massFraction[k] = 1 / C.physicalConstants.massRatioDE440[k];
  massFraction.earth = massEarthAlone / M_SUN;

  const PSI = FL.computePsiConstant({
    earthInvPlaneInclinationAmplitude: earthInclAmplitude,
    massEarthAlone,
    massSun: M_SUN,
  });
  const eccentricityAmplitudeK = FL.computeKConstant({
    eccentricityAmplitude,
    massEarthAlone,
    massSun: M_SUN,
    earthTiltMeanDeg: earthtiltMean,
  });
  const systemResetN = C.foundational.systemResetN;
  const t2000 = 2000 - (balancedYear - systemResetN * H);
  const balancedJD = startmodelJD - meanSolarYearDays * (startModelYearWithCorrection - balancedYear);

  /** @param {[number, number]|null} frac @returns {number|null} */
  const fractionToYears = (frac) => (frac === null ? null : (H * frac[0]) / frac[1]);

  /** @type {Record<string, Record<string, any>>} */
  const PLANET_RECORDS = {};
  for (const k of PLANET_KEYS) {
    const mp = C.planets[k];
    const ar = C.planetOrbitalElements[k];
    const ecl = /** @type {number} */ (fractionToYears(mp.perihelionEclipticFraction));
    const axial = /** @type {number} */ (fractionToYears(mp.axialPrecessionFraction));
    const obliquityCycle = fractionToYears(mp.obliquityCycleFraction)
      ?? Math.abs(1 / (1 / ecl - 1 / (H / 13)));
    const wobble = FL.computeWobblePeriodYears(ecl, axial, H);
    const il = FL.computeInclinationLaw({
      fibonacciD: mp.fibonacciD,
      massFrac: massFraction[k],
      invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
      longitudePerihelion: ar.longitudePerihelion,
      inclinationCycleAnchor: mp.inclinationCycleAnchor,
      antiPhase: mp.antiPhase || false,
    }, PSI);
    const obliquityMean = FL.computeObliquityMeanSnapshot({
      axialTiltJ2000: ar.axialTiltJ2000,
      invPlaneInclinationAmplitude: il.amplitude,
      perihelionEclipticYears: ecl,
    }, obliquityCycle, { H, t2000 });
    const el = FL.computeEccentricityLaw({
      fibonacciD: mp.fibonacciD,
      massFrac: massFraction[k],
      solarYearInput: ar.solarYearInput,
      orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
      antiPhase: mp.antiPhase || false,
    }, {
      kConstant: eccentricityAmplitudeK,
      obliquityMeanDeg: obliquityMean,
      wobblePeriodYears: wobble,
      t2000,
      meanSolarYearDays,
    });
    PLANET_RECORDS[k] = Object.freeze({
      name: mp.name,
      perihelionEclipticYears: ecl,
      longitudePerihelion: ar.longitudePerihelion,
      ascendingNodeCyclesIn8H: mp.ascendingNodeCyclesIn8H,
      ascendingNodePeriod: -(8 * H) / mp.ascendingNodeCyclesIn8H,
      axialPrecessionYears: axial,
      obliquityCycle,
      wobblePeriod: wobble,
      fibonacciD: mp.fibonacciD,
      antiPhase: mp.antiPhase || false,
      ascendingNodeInvPlane: mp.ascendingNodeInvPlane,
      inclinationCycleAnchor: mp.inclinationCycleAnchor,
      invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
      invPlaneInclinationAmplitude: il.amplitude,
      invPlaneInclinationMean: il.mean,
      obliquityMean,
      orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
      orbitalEccentricityAmplitude: el.amplitude,
      orbitalEccentricityBase: el.base,
      eccentricityPhaseJ2000: el.phaseJ2000,
      solarYearInput: ar.solarYearInput,
      axialTiltJ2000: ar.axialTiltJ2000,
    });
  }

  /** Perihelion longitude (linear lattice rate). @param {string} k @param {number} year @returns {number} */
  const planetPerihelionDeg = (k, year) => {
    const p = PLANET_RECORDS[k];
    return (((p.longitudePerihelion + (360.0 * (year - 2000)) / p.perihelionEclipticYears) % 360) + 360) % 360;
  };
  /** Ascending node on the invariable plane. @param {string} k @param {number} year @returns {number} */
  const planetAscNodeDeg = (k, year) => {
    const p = PLANET_RECORDS[k];
    return planetOrientation.ascendingNodeInvPlaneLinearAt({
      ascendingNodeInvPlane: p.ascendingNodeInvPlane,
      ascendingNodePeriod: p.ascendingNodePeriod,
      perihelionEclipticYears: p.perihelionEclipticYears,
    }, year);
  };
  /** Invariable-plane inclination (signed ICRF rate, scene year→JD axis). @param {string} k @param {number} year @returns {number} */
  const planetInclinationDeg = (k, year) => {
    const p = PLANET_RECORDS[k];
    const jd = startmodelJD + (year - startmodelYear) * meanSolarYearDays;
    const yearsSinceBalanced = (jd - balancedJD) / meanSolarYearDays;
    return planetOrientation.invPlaneInclinationAt({
      isEarth: false,
      invPlaneInclinationJ2000: p.invPlaneInclinationJ2000,
      invPlaneInclinationMean: p.invPlaneInclinationMean,
      invPlaneInclinationAmplitude: p.invPlaneInclinationAmplitude,
      inclinationCycleAnchor: p.inclinationCycleAnchor,
      longitudePerihelion: p.longitudePerihelion,
      perihelionEclipticYears: p.perihelionEclipticYears,
      antiPhase: p.antiPhase,
    }, yearsSinceBalanced, {
      H,
      yearsFromBalancedToJ2000: (startmodelJD - balancedJD) / meanSolarYearDays,
    });
  };

  // ── Time axis: exact JD ↔ model-year conversion ───────────────────────────
  // The model's `year` inputs live on the SI axis (the axis the fits were
  // anchored on — tools/lib `_jdToSIyear`): linear in SI 86400-s days from the
  // model start, so the JD↔year map is closed-form and exact to double
  // precision. Callers holding an exact JD (e.g. 2058768.5385006 TT) convert
  // here and NEVER roll their own — a caller-side linear-vs-calendar mix once
  // put the eclipse umbra twin 8 km off (§12h; ≤1 m once unified).
  const siTropicalYearDays = meanTropicalYearJ2000Seconds / 86400;
  /** Model year (SI axis) at a JD(TT). @param {number} jd @returns {number} */
  const yearFromJD = (jd) => startModelYearWithCorrection + (jd - startmodelJD) / siTropicalYearDays;
  /** JD(TT) at a model year (SI axis). @param {number} year @returns {number} */
  const jdFromYear = (year) => startmodelJD + (year - startModelYearWithCorrection) * siTropicalYearDays;

  // ── Lunar theory: the shared-chain assembly (§7a slice-2b) ────────────────
  // Wiring mirrors the engine call sites exactly — tools/lib/deep-time.js
  // (ecc channel, month chain, J2000 precession anchors),
  // tools/lib/scene-graph.js (chain-cycles, arguments, series) and
  // tools/verify/eclipse-audit.js (finders). Deep-time and framework-native
  // are hardwired ON here: they are the shipped defaults; the A/B env
  // toggles (SG_DEEP_TIME/MOON_ARGS_PURE_MEEUS) stay an engine concern.
  const j2000JD = 2451545.0;
  const julianCenturyDays = 36525;

  // J2000 Moon precession anchors (Option C+ — of-date observational anchors
  // in the legacy-'ICRF'-named inputs; the E values are star-referenced ∓13)
  const nApsidalIJ2000 = Math.round((8 * totalDaysInH) / C.moonReference.moonApsidalPrecessionDaysInputICRF) / 8;
  const nNodalIJ2000 = Math.round((8 * totalDaysInH) / C.moonReference.moonNodalPrecessionDaysInputICRF) / 8;
  const nApsidalEJ2000 = nApsidalIJ2000 - 13;
  const nNodalEJ2000 = nNodalIJ2000 + 13;
  const moonApsidalJ2000Seconds = (totalDaysInH / nApsidalEJ2000) * meanLengthOfDay;
  const moonNodalJ2000Seconds = (totalDaysInH / nNodalEJ2000) * meanLengthOfDay;
  const moonSiderealMonthJ2000Seconds = moonSiderealMonth * meanLengthOfDay;

  // 8H-lattice derived months (constants.js §Moon derived months)
  const nSid = Math.round((8 * totalDaysInH) / moonSiderealMonthInput) / 8;
  const moonTropicalMonthDays = totalDaysInH / (nSid + 13);
  const moonAnomalisticMonthDays = totalDaysInH / (nSid - nApsidalEJ2000);
  const moonSynodicMonthDays = totalDaysInH / (nSid + 13 - H);

  // moonEcc — the model's ONE eccentricity law — is created above (with
  // eccentricityAt); the Moon channel's E-factor e(t)/e(J2000) and its
  // perigee/node T² channel ride it, e(J2000) being the observed value exactly.

  // Layer-2 month/precession chain (Brouwer-Clemence m² scaling × the
  // e_E-line modulation)
  const moonChain = createMoonMonthChain({
    constants: {
      aMoonNowMetres: EPOCH_PARAMS.moonDistanceNowM,
      alpha1PerMa: EPOCH_PARAMS.alpha1PerMa,
      alpha3PerMa3: EPOCH_PARAMS.alpha3PerMa3,
      alpha4PerMa4: EPOCH_PARAMS.alpha4PerMa4,
      gmEarthMoonM3PerS2: EPOCH_PARAMS.gmEarthMoonM3S2,
      massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
      moonSiderealMonthInputDays: moonSiderealMonthInput,
      holisticYearJ2000: H,
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      nApsidalOfDateJ2000: nApsidalIJ2000,
      nNodalOfDateJ2000: nNodalIJ2000,
      moonApsidalJ2000Seconds,
      moonNodalJ2000Seconds,
      moonSiderealMonthJ2000Seconds,
      sPerigee: MOON_ECC_SENSITIVITY_PERIGEE,
      sNode: MOON_ECC_SENSITIVITY_NODE,
    },
    fns: {
      meanLodSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.lodSecondsAtAge(tMa),
      meanSiderealYearSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.siderealYearSecondsAtAge(tMa),
      meanHAtAge: /** @param {number} tMa */ (tMa) => deepLod.hAtAge(tMa),
      modulation: /** @param {number} tMa @param {number} s */ (tMa, s) => moonEcc.modulation(tMa, s),
      distanceMetresAtAge: moonDistanceMetresAtAge,
    },
  });

  // Chain-cycle integrator. S5/S12 conventions: age anchor = startmodelYear
  // (the scene's t_Ma convention), grid anchor C(2000) = 0 — grid anchor ≠
  // age anchor, deliberately. One stable period fn per chain so the shared
  // Float64Array tables key correctly and persist.
  const chainCycles = createChainCycleIntegrator({
    ageAnchorYear: startmodelYear,
    tropicalYearSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.tropicalYearSecondsAtAge(tMa),
    tropicalYearJ2000Seconds: meanTropicalYearJ2000Seconds,
    isDeepTime: () => true,
  });
  /** @param {number} tMa @returns {number|null} */
  const nodalMonthPeriodFn = (tMa) => moonChain.nodalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const tropicalMonthPeriodFn = (tMa) => moonChain.tropicalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const anomalisticMonthPeriodFn = (tMa) => moonChain.anomalisticMonthSecondsAtAge(tMa);
  const jupiterT0Seconds = C.planetOrbitalElements.jupiter.solarYearInput * 86400;
  /** @param {number} tMa @returns {number} */
  const jupiterPeriodFn = (tMa) => driver2PeriodSecondsAtAge(tMa, jupiterT0Seconds, EPOCH_PARAMS.solarMassLossFracPerYear);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcDraconic = (a, b) => chainCycles.cyclesBetween(nodalMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcTropical = (a, b) => chainCycles.cyclesBetween(tropicalMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcAnomalistic = (a, b) => chainCycles.cyclesBetween(anomalisticMonthPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcJupiter = (a, b) => chainCycles.cyclesBetween(jupiterPeriodFn, a, b);
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcApsidalOfDate = (a, b) => {
    const t = mcTropical(a, b), n = mcAnomalistic(a, b);
    return (t === null || n === null) ? null : t - n;
  };
  /** @param {number} a @param {number} b @returns {number|null} */
  const mcNodalOfDate = (a, b) => {
    const dr = mcDraconic(a, b), t = mcTropical(a, b);
    return (dr === null || t === null) ? null : dr - t;
  };

  // Snapshot-phase obliquity — the engine's computeObliquityEarth convention
  // for the lunar chain (linear H-lattice phase; orbital-engine.js). NOT the
  // integrated-phase display obliquity above — the chain was certified
  // against this form.
  /** @param {number} year @returns {number} */
  const obliquitySnapshotDeg = (year) => {
    const t = year - balancedYear;
    let obliq = solsticeObliquityMean;
    for (const [div, sinC, cosC] of F.SOLSTICE_OBLIQUITY_HARMONICS) {
      const ph = (2 * Math.PI * t) / (H / div);
      obliq += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return obliq;
  };

  // The argument skeleton (the _FW_MOON bundle; Sun secular deviations on
  // the CALENDAR year coordinate — S3)
  const moonArgs = createMoonArguments({
    constants: {
      j2000JD,
      julianCenturyDays,
      holisticYearJ2000: H,
      balancedYearJ2000: balancedYear,
      meanSolarYearDays,
      meanAnomalisticYearDays,
      tropicalYearHarmonics: F.TROPICAL_YEAR_HARMONICS,
      anomalisticYearHarmonics: F.ANOMALISTIC_YEAR_HARMONICS,
      eccentricityJ2000: C.earthOrbital.earthEccentricityJ2000,
      eccentricityDotJ2000: C.earthOrbital.earthEccentricityDotJ2000,
      eccentricityDotDotJ2000: C.earthOrbital.earthEccentricityDotDotJ2000,
      elpEarthFigureJ2ArcsecPerCy2: C.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2,
      elpGeneralPrecessionPA_T2ArcsecPerCy2: C.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976,
      eccE0: moonEcc.e0,
    },
    fns: {
      eccAt: /** @param {number} tYr */ (tYr) => moonEcc.eccAt(tYr),
      channelIntegral: /** @param {number} T @param {number} s */ (T, s) => moonEcc.channelIntegral(T, s),
      computeObliquityEarth: obliquitySnapshotDeg,
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      nodalOfDateCyclesBetween: mcNodalOfDate,
      cyclesBetween,
      isDeepTime: () => true,
      isFrameworkNative: () => true,
      // (d′) of-date rate completion: the DYNAMICAL axial precession (the
      // tweakpane day-form identity — real at J2000, epoch-valid) and the
      // KINEMATIC pair's beat the chains embed. MATCHED TRIPLE with the
      // tools-lib and browser wirings.
      pDynDegPerYearAt: /** @param {number} year */ (year) => {
        const sid = siderealYearDays(year);
        const sol = tropicalYearDirectDays(year);
        return 360 * (sid - sol) / sid;
      },
      pKinDegPerYearAt: /** @param {number} year */ (year) => {
        // MODEL-START-anchored age, matching the tools-lib/browser wirings
        // bit-exactly — NOT yearToTMa's 2000.0 convention (the recorded
        // 0.4977-yr parity trap, same class as getMoonDistanceKm above).
        const t = (startmodelYear - year) / 1e6;
        const sid = deepLod.siderealYearSecondsAtAge(t);
        const trop = deepLod.tropicalYearSecondsAtAge(t);
        return (sid === null || trop === null) ? 0 : 360 * (sid - trop) / sid;
      },
    },
  });

  // UT→TT on the CALENDAR decimal-year coordinate (script.js Phase 9.16 —
  // a linear-year approximation here once cost ~5–6 s of ΔT and ~1e-3° of
  // Moon longitude at the Babylonian epochs)
  /** @param {number} jd @returns {number} */
  const jdTTFromUT = (jd) => {
    const tMa = (startmodelYear - jdToDecimalYear(jd)) / 1e6;
    const dT = meanDeltaTSecondsAtAge(tMa);
    return Number.isFinite(dT) ? jd + dT / 86400 : jd;
  };
  // ΔT at a JD on the CALENDAR-year axis (mirrors deep-time frameworkDeltaT;
  // NOT deltaTSeconds above, which adds the deltaTStart anchor)
  /** @param {number} jd @returns {number} */
  const frameworkDeltaTSecondsAtJD = (jd) => {
    const decYear = startmodelYear + (jd - startmodelJD) / meanSolarYearDays;
    const dT = meanDeltaTSecondsAtAge((startmodelYear - decYear) / 1e6);
    return Number.isFinite(dT) ? dT : 0;
  };

  // Bounded Meeus E-factor from the H/3 line (framework-native branch only;
  // the pure-Meeus polynomial A/B branch stays engine-local)
  /** @param {number} dDays @returns {number} */
  const fwEFactor = (dDays) => moonEcc.eFactorAt(dDays / C.foundational.inputmeanlengthsolaryearindays);

  // D2 derived additional-argument rates (deg/cy, J2000 8H-lattice months;
  // record: tools/explore/derive-a1a2a3.js)
  const fwA2RateDegPerCy = 2 * ((360 * 36525) / moonTropicalMonthDays)
    - (360 * 36525) / moonAnomalisticMonthDays
    - 2 * ((360 * 36525) / C.planetOrbitalElements.jupiter.solarYearInput);
  const fwA3RateDegPerCy = (360 * 36525) / moonSiderealMonth;

  // Meeus Ch. 47 truncated series (framework-native arguments + E-factor)
  const moonSeries = createMoonSeries({
    constants: {
      moonL: F.MEEUS_LONGITUDE_TERMS,
      moonB: F.MEEUS_LATITUDE_TERMS,
      moonR: F.MEEUS_DISTANCE_TERMS.terms,
      moonRMeanKm: F.MEEUS_DISTANCE_TERMS.meanKm,
      moonDistanceJ2000Km: C.moonReference.moonDistance,
      j2000JD,
      julianCenturyDays,
      moonMeeusLpCorrectionDeg: C.moon.moonMeeusLpCorrection,
      fwA2RateDegPerCy,
      fwA3RateDegPerCy,
    },
    fns: {
      argsAt: /** @param {number} jdTT */ (jdTT) => moonArgs.argsAt(jdTT),
      eFactorForD: fwEFactor,
      eFactorAtJdTT: /** @param {number} jdTT */ (jdTT) => fwEFactor(jdTT - j2000JD),
      // 20.3d(i): the Driver-1 ratio at the EVALUATED epoch (per-jd pure
      // evaluator). MATCHED TRIPLE with the tools-lib and browser getters:
      // identical age arithmetic — the SI-linear year (yearFromJD, never
      // the calendar year: the recorded linear-vs-calendar mirror trap)
      // against the MODEL-START anchor (startModelYearWithCorrection, the
      // browser's J2000_CALENDAR_YEAR — NOT this model's 2000.0 yearToTMa
      // convention: the 0.4977-yr difference is 4.95e-11 of distance and
      // failed the bit-exact parity gate). Falls back to the J2000
      // constant without a jd (legacy call shape) or past the domain.
      getMoonDistanceKm: /** @param {number} [jdTT] */ (jdTT) => {
        if (jdTT === undefined) return moonDistanceKm;
        const d = moonDistanceMetresAtAge((startModelYearWithCorrection - yearFromJD(jdTT)) / 1e6);
        return d === null ? moonDistanceKm : d / 1000;
      },
      getEccentricityBase: () => C.moonReference.moonOrbitalEccentricityBase,
      deltaTSeconds: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      cyclesBetween,
      jupiterOrbitsBetween: mcJupiter,
      isDeepTime: () => true,
      isFrameworkNative: () => true,
    },
  });

  // ── E4: the framework-native Sun (§12i item 11 — the 3b landing) ─────────
  // Assembled from the model's own laws, ZERO fitted sun constants:
  //   e(t) = the H/16 eccentricity-channel law + the derived H/3
  //          inclination-coupling imprint (amplitude base/2, lattice phase,
  //          J2000-anchored difference form) — the osculating decomposition:
  //          osculating e = H/16 channel + inclination coupling.
  //   L(t) = L0 + the mean tropical rate + the f(Y) drift SHAPE only,
  //          ∫(rate_SI(y) − rate_SI(2000)) dy: the rate ANCHOR stays the mean
  //          year (eclipse-endorsed); the drift is the Step 6c year-harmonic
  //          claim in SI/TT (year-in-days × LOD — the LOD-day part of the
  //          raw drift is UT-vs-TT and stays ΔT's job) PLUS the derived
  //          TORQUE term (E5): the year harmonics carry only the GEOMETRIC
  //          equinox displacement (the tilt nodes — the exact 8:3 amplitude
  //          signature); the classical luni-solar torque adds a precession-
  //          RATE modulation δp = −p₀·tan ε·δε(t) on the model's own
  //          two-component obliquity law (−A cos φ₃ + A cos φ₈). Both
  //          lengthen the year at obliquity max, so they ADD; per-divisor
  //          drift scale 1 + p₀·tan²ε·H/(2π·div) = 1.306 (H/8) / 1.815
  //          (H/3) — the structure the ancient corpus blind-selected before
  //          the derivation existed. Zero new constants. Trapezoid table,
  //          10-yr steps over −3000..3000; outside, the drift freezes at the
  //          edge (rate reverts to linear — the finder domain is the corpus
  //          era).
  //   ϖ(t) = the shipped H/16 perihelion law (earthPerihelionDeg).
  // Measured (tools/explore/e3b-native-sun.mjs): beats the Meeus Ch. 25
  // basis on JPL all-phase (0.95″ vs 1.28″ scatter) and on ancient-corpus
  // timing structure (0.37 vs 0.50 min detrended vs Meeus-T²); required-ΔT
  // shift 2–4 min ≈ 0.23σ of Stephenson scatter (lunar bias improves); the
  // D2 completion table is unchanged (residual 2lE re-fit ≈ 0.1″ — noise).
  const sunL0Deg = C.earthOrbital.sunMeanLongitudeJ2000_deg;
  const sunTropicalRateDegPerCy = 360 * julianCenturyDays / meanSolarYearDays;
  // The eclipse Sun's eccentricity IS the model's one eccentricity law
  // (eccentricityAt above) — the former sunEccentricityAt (FQ-7-Sun option
  // C-small: the J2000-anchored H/3 line) was the additive-anchor form of the
  // same movement and is retired by the unification (measured identical on
  // every modern gate).
  const sunMeanLongitudeDegAt = (() => {
    // SW PHASE B — the CLOSED FORM on the integrated lattice phase
    // (supersedes the E5 ±3,000-yr trapezoid table; valid at EVERY epoch,
    // no table, no domain window). drift = D_smooth + Σₖ D_k + D_torque:
    //  · D_smooth — the deep chain's smooth SI tropical-year physics
    //    (tropicalYearDaysBase × LOD), two-point trapezoid: the same
    //    structure the scene twin uses, so the scene δ stays bounded.
    //  · Each oscillatory term integrates ANALYTICALLY: the antiderivative
    //    of cos/sin on the integrated phase is (H/2πk)·[sin/−cos] — the H
    //    drift lives in the phase itself; the amplitude factor uses H_J2000
    //    (ppm-class difference, negligible).
    //  · THE REBASE (E5's corpus-preferred J2000 rate anchor) is applied
    //    PER HARMONIC as a SIN-SATURATED ramp, (H/2πk)·sin(Δφₖ): equal to
    //    the linear rebase for |Δφₖ| ≪ 1 (the corpus era) and bounded by
    //    the harmonic's own period beyond — extending a linearized local
    //    slope to deep time would be the fitted-linear-slope trap. Every
    //    quantity is derived; zero new constants; each component and its
    //    slope vanish at year 2000 by construction (the drift-only
    //    property is exact, not tabulated).
    const RATE_LIN = sunTropicalRateDegPerCy / 100;              // deg / SI yr
    const precessionP0DegPerYr = 13 * 360 / H;
    const tanEps = Math.tan(earthtiltMean * Math.PI / 180);
    const A_RAD = earthInclAmplitude * Math.PI / 180;
    /** @param {number} year @returns {number} */
    const rateSmooth = (year) => 360 * (365.25 * 86400)
      / (tropicalYearDaysBase(year)
        * (deepLod.lodSecondsAtAge(yearToTMa(year)) ?? meanLengthOfDay));
    /** @type {{rateSm0: number, ph0: Map<number, number>}|null} */
    let anchor = null;
    return /** @param {number} year @returns {number} */ (year) => {
      if (anchor === null) {
        const ph0 = new Map();
        for (const [k] of F.TROPICAL_YEAR_HARMONICS) ph0.set(k, phaseRadians(balancedYear, 2000, k));
        for (const k of [3, 8]) if (!ph0.has(k)) ph0.set(k, phaseRadians(balancedYear, 2000, k));
        anchor = { rateSm0: rateSmooth(2000), ph0 };
      }
      const dy = year - 2000;
      // smooth deep physics (two-point trapezoid; exact 0 at 2000)
      let drift = 0.5 * (rateSmooth(year) - anchor.rateSm0) * dy;
      // year-harmonic ripple: rate ≈ −(RATE_LIN/T̄)·h(y); antiderivative +
      // sin-saturated per-harmonic rebase
      const HK = H / (2 * Math.PI);
      for (const [k, sK, cK] of F.TROPICAL_YEAR_HARMONICS) {
        const ph = phaseRadians(balancedYear, year, k);
        const ph0 = /** @type {number} */ (anchor.ph0.get(k));
        const scale = -(RATE_LIN / meanSolarYearDays) * (HK / k);
        const anti = (-sK) * (Math.cos(ph) - Math.cos(ph0)) + cK * (Math.sin(ph) - Math.sin(ph0));
        const h0 = sK * Math.sin(ph0) + cK * Math.cos(ph0);
        drift += scale * (anti - h0 * Math.sin(ph - ph0));
      }
      // torque (E5): rate = −p₀·tanε·δε, δε = A(−cos φ₃ + cos φ₈); same
      // antiderivative + per-component sin-saturated rebase
      for (const [k, sgn] of [[3, -1], [8, 1]]) {
        const ph = phaseRadians(balancedYear, year, k);
        const ph0 = /** @type {number} */ (anchor.ph0.get(k));
        const scale = -precessionP0DegPerYr * tanEps * A_RAD * sgn * (HK / k);
        drift += scale * ((Math.sin(ph) - Math.sin(ph0)) - Math.cos(ph0) * Math.sin(ph - ph0));
      }
      return sunL0Deg + sunTropicalRateDegPerCy * dy / 100 + drift;
    };
  })();

  // Eclipse finders — wired like the engine probe (tools/verify/
  // eclipse-audit.js). The finder axis is JD(UT): the series wrapper applies
  // UT→TT internally. Ground-track/umbra paths deliberately absent: the
  // scene-umbra projection navigates the Tychosium-derived scaffold, which
  // never enters this package (§2h).
  const eclipseFinders = createEclipseFinders({
    moonLonDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedLonDeg(jd),
    moonBetaDegAt: /** @param {number} jd */ (jd) => moonSeries.truncatedBetaDeg(jd),
    moonDistanceKmAt: /** @param {number} jd */ (jd) => moonSeries.truncatedDistanceKm(jd),
    deltaTSecondsAt: frameworkDeltaTSecondsAtJD,
    getSynodicMonthDays: () => moonSynodicMonthDays,
    getSunDistanceKm: () => currentAUDistance,
    frameworkSun: {
      sunMeanLongitudeJ2000Deg: sunL0Deg,
      tropicalRateDegPerCy: sunTropicalRateDegPerCy,
      eccentricityAt,
      perihelionLongitudeDegAt: earthPerihelionDeg,
      meanLongitudeDegAt: sunMeanLongitudeDegAt,
    },
    constants: {
      rEarthMetres: (C.bodyDiametersKm.earth / 2) * 1000,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      j2000JD,
      julianCenturyDays,
    },
  });

  // 20.3g — the solar-eclipse LOCATION tier: shadow geometry on the FULL
  // series (sceneEvalAt — the truncated finder forms omit the fitted Lp
  // anchor and the −2235·sin(Lp) β family, deliberate for finder
  // statistics, required here) at the model's ABSOLUTE TT (deltaTStart +
  // curve, the same convention every other ΔT consumer reads). Both axis
  // conventions are measured against the NASA path-table centerlines —
  // see eclipse/besselian.cjs.
  // Derived Earth-around-EMB wobble for the Sun completion: a_M·μ/AU,
  // μ = 1/(1+M_E/M_M) — 6.4399″ at current constants, tracks them live.
  const embWobbleArcsec = (moonDistanceKm / (MASS_RATIO_EARTH_MOON + 1) / currentAUDistance)
    * (648000 / Math.PI);
  // FQ-5 N3 — the completion's carriers are FRAMEWORK-derived: one
  // revolution per the model's own tropical period records (Earth from
  // the framework mean solar year; the Moon-elongation rate from the
  // sidereal month/year identity). The v3 table's amplitudes were
  // re-extracted on exactly these rates (the carrier↔table matched pair).
  const degPerCyOf = /** @param {number} cyclesPerDay */ (cyclesPerDay) => 360 * 36525 * cyclesPerDay;
  const carrierRatesDegPerCy = {
    planets: [
      degPerCyOf(1 / C.planetOrbitalElements.mercury.solarYearInput),
      degPerCyOf(1 / C.planetOrbitalElements.venus.solarYearInput),
      degPerCyOf(1 / meanSolarYearDays),
      degPerCyOf(1 / C.planetOrbitalElements.mars.solarYearInput),
      degPerCyOf(1 / C.planetOrbitalElements.jupiter.solarYearInput),
      degPerCyOf(1 / C.planetOrbitalElements.saturn.solarYearInput),
    ],
    moonElongation: degPerCyOf(1 / moonSiderealMonthInput - 1 / meanSiderealYearDays),
  };
  const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });
  const besselian = createBesselian({
    moonFullAtDaysTT: /** @param {number} dDaysTT */ (dDaysTT) => {
      const ev = moonSeries.sceneEvalAt(dDaysTT);
      return { lonDeg: ev.lonDeg, latDeg: ev.latDeg, distKm: ev.distKm };
    },
    sunLonDegAt: /** @param {number} jdUT */ (jdUT) => eclipseFinders.sunLonDegAt(jdUT),
    sunCompletionDeg: sunPlanetaryCompletionDeg,
    moonExtensionAt: moonSeriesExtensionDeg,
    deltaTSecondsAt: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
    obliquityDegAt: obliquityDeg,
    eccentricityAt,
    perihelionLongitudeDegAt: earthPerihelionDeg,
    yearFromJD,
    constants: {
      j2000JD,
      julianCenturyDays,
      earthDiameterKm: C.bodyDiametersKm.earth,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      sunDistanceKm: currentAUDistance,
      earthFlatteningInverse: C.physicalConstants.earthFlatteningInverseWGS84,
      ttBridgeSeconds: C.earthOrbital.deltaTStart,
      gmstMeanSiderealT0Deg: C.physicalConstants.gmstMeanSiderealT0Deg,
      gmstMeanSiderealRateDegPerDay: C.physicalConstants.gmstMeanSiderealRateDegPerDay,
      gmstMeanSiderealT2Deg: C.physicalConstants.gmstMeanSiderealT2Deg,
    },
  });

  // ── The assembled surface ─────────────────────────────────────────────────
  return Object.freeze({
    time: Object.freeze({
      yearFromJD,
      jdFromYear,
      siTropicalYearDays,
    }),
    epoch: Object.freeze({
      yearToTMa,
      hAtYear: /** @param {number} year @returns {number|null} */ (year) => deepLod.hAtAge(yearToTMa(year)),
      lodSecondsAtYear: /** @param {number} year @returns {number|null} */ (year) => deepLod.lodSecondsAtAge(yearToTMa(year)),
      alphaAtYear: /** @param {number} year @returns {number} */ (year) => earthMoiFactorAtAge(yearToTMa(year)),
      moonDistanceKmAtYear: /** @param {number} year @returns {number} */ (year) => moonDistanceMetresAtAge(yearToTMa(year)) / 1000,
      siderealYearSecondsAtYear: /** @param {number} year @returns {number} */ (year) => deepLod.siderealYearSecondsAtAge(yearToTMa(year)),
      deltaTSecondsAtYear: deltaTSeconds,
      cyclesBetween,
      // The DYNAMICAL axial precession period (the tweakpane identity):
      // day-form beat of the sidereal and solar year evaluators — real at
      // J2000 (~25,771 yr ≈ IAU), epoch-valid at any age. The same value
      // the (d′) of-date rate completion integrates.
      axialPrecessionYearsAtYear: /** @param {number} year @returns {number} */ (year) => {
        const sid = siderealYearDays(year);
        return sid / (sid - tropicalYearDirectDays(year));
      },
    }),
    earth: Object.freeze({
      perihelionLongitudeDeg: earthPerihelionDeg,
      obliquityDeg,
      eccentricity: eccentricityAt,
      inclinationDeg,
      ascendingNodeDeg,
    }),
    lengths: Object.freeze({
      tropicalYearDays,
      tropicalYearDirectDays,
      siderealYearDays,
      anomalisticYearDays,
      dayLengthSeconds,
      siderealDaySeconds,
      stellarDaySeconds,
      measuredSolarDaySeconds,
      raDayOffsetMs,
    }),
    cardinal: Object.freeze({
      jd: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalM.computeSolsticeJD(year, type),
      raDeg: /** @param {number} year @param {string} type @returns {number} */ (year, type) => {
        const ra = cardinalM.computeSolsticeRA(year, type);
        return ((ra % 360) + 360) % 360;
      },
      yearLengthDays: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalM.computeSolsticeYearLength(year, type),
    }),
    moon: Object.freeze({
      distanceKmAtYear: /** @param {number} year @returns {number} */ (year) => moonDistanceMetresAtAge(yearToTMa(year)) / 1000,
      siderealMonthDaysAtYear: moonSiderealMonthDaysAt,
      synodicMonthDays: moonSynodicMonthDays,
      // The apparent-position chain (truncated Meeus Ch. 47 series on
      // framework-native arguments). JD(UT) axis — UT→TT applied internally.
      lonDegAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedLonDeg(jd),
      betaDegAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedBetaDeg(jd),
      distanceKmAtJD: /** @param {number} jd @returns {number} */ (jd) => moonSeries.truncatedDistanceKm(jd),
    }),
    eclipse: Object.freeze({
      sunLonDegAtJD: /** @param {number} jd @returns {number} */ (jd) => eclipseFinders.sunLonDegAt(jd),
      findLunarInRange: /** @param {number} jdStart @param {number} jdEnd */ (jdStart, jdEnd) => eclipseFinders.findLunarEclipsesInRange(jdStart, jdEnd),
      findSolarInRange: /** @param {number} jdStart @param {number} jdEnd */ (jdStart, jdEnd) => eclipseFinders.findSolarEclipsesInRange(jdStart, jdEnd),
      deltaTSecondsAtJD: frameworkDeltaTSecondsAtJD,
      // E4 — the framework-native Sun deps, exported so the OTHER finder
      // construction sites (tools/verify/eclipse-audit.js, the browser
      // _eclipse twins) spread the SAME assembly into their own
      // createEclipseFinders call instead of triplicating it (the
      // three-runtimes rule — cf. recession-history):
      frameworkSunDeps: Object.freeze({
        sunMeanLongitudeJ2000Deg: sunL0Deg,
        tropicalRateDegPerCy: sunTropicalRateDegPerCy,
        eccentricityAt,
        perihelionLongitudeDegAt: earthPerihelionDeg,
        meanLongitudeDegAt: sunMeanLongitudeDegAt,
      }),
      // 20.3g location tier (see eclipse/besselian.cjs):
      umbraGroundAtJD: /** @param {number} jd @returns {{latDeg: number, lonDeg: number} | null} */ (jd) => besselian.umbraGroundAt(jd),
      solarLocalCircumstances: /** @param {number} jdGreatest @param {number} latDeg @param {number} lonDeg */ (jdGreatest, latDeg, lonDeg) => besselian.localCircumstances(jdGreatest, latDeg, lonDeg),
    }),
    climate: Object.freeze({
      l1OrbitalPermil: evalClimateL1,
    }),
    planets: Object.freeze({
      keys: Object.freeze([...PLANET_KEYS]),
      record: /** @param {string} k @returns {Record<string, any>|undefined} */ (k) => PLANET_RECORDS[k],
      perihelionLongitudeDeg: planetPerihelionDeg,
      ascendingNodeInvPlaneDeg: planetAscNodeDeg,
      invPlaneInclinationDeg: planetInclinationDeg,
    }),
  });
}
