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
import { createEclipseFinders } from './eclipse/finders.cjs';
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
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon) — type inferred so ReturnType stays precise
 */
export function assembleModel(C, F) {
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
  const eccentricityBase = C.earth.eccentricityBase;
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
  const earthPerihelionDeg = (year) => {
    let longitude = 270.0 + 360.0 * cyclesBetween(balancedYear, year, 16);
    for (const [div, sinC, cosC] of F.PERI_HARMONICS_RAW) {
      const ph = phaseRadians(balancedYear, year, div);
      longitude += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return (((longitude + F.PERI_OFFSET) % 360) + 360) % 360;
  };
  /** @param {number} year @returns {number} */
  const obliquityDeg = (year) => {
    let obliq = solsticeObliquityMean;
    for (const [div, sinC, cosC] of F.SOLSTICE_OBLIQUITY_HARMONICS) {
      const ph = phaseRadians(balancedYear, year, div);
      obliq += sinC * Math.sin(ph) + cosC * Math.cos(ph);
    }
    return obliq;
  };
  /** @param {number} year @returns {number} */
  const eccentricityAt = (year) => {
    const th = phaseRadians(balancedYear, year, 16);
    return Math.sqrt(eccentricityBase * eccentricityBase
      + eccentricityAmplitude * eccentricityAmplitude
      - 2 * eccentricityBase * eccentricityAmplitude * Math.cos(th));
  };
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
      eccentricityBase,
      eccentricityAmplitude,
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

  // The framework H/3 eccentricity line (the Moon channel's view of the
  // wobble movement — NOT the H/16 orbital eccentricity above)
  const moonEcc = createMoonEccChannel({
    cyclesBetween,
    eccentricityBase,
    perihelionLongitudeJ2000Deg: C.earthOrbital.earthPerihelionLongitudeJ2000,
    inclinationCycleAnchorDeg: C.earthOrbital.earthInclinationCycleAnchor,
  });

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
      getMoonDistanceKm: () => moonDistanceKm,
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
    constants: {
      rEarthMetres: (C.bodyDiametersKm.earth / 2) * 1000,
      moonDiameterKm: C.bodyDiametersKm.moon,
      sunDiameterKm: C.bodyDiametersKm.sun,
      j2000JD,
      julianCenturyDays,
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
