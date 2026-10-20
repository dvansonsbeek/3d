/**
 * THE DEEP-TIME CHAIN — ONE assembly (holisticuniverse plan 13 B2).
 *
 * Before B2 three runtimes assembled the same chain by hand from the same
 * factories — `packages/physics/src/model.js`, `tools/lib/deep-time.js`
 * ("copy, keep in sync") and the `src/script.js` block — each deriving the
 * GIA α channel, the Layer-0 parameter bundle, the cited Moon-distance
 * history, the ΔT cycle stack, |s₃|, the LOD/ΔT core and the lunar month
 * chain, and each carrying its own `mean*AtAge` wrappers. This module is
 * that assembly, once, from the generated constants and fitted
 * coefficients; the runtimes destructure it and keep only what is genuinely
 * theirs (the browser's research toggles and snapshot mode, the Node
 * engine's env gates and scene grid, the model's one-source movement).
 *
 * Bit-identity rule (plan 13 §2.6): every operation here is the twins'
 * operation in the twins' order — floating point is not associative, and
 * the goldens pin the values.
 *
 * Twin differences that are CONVENTIONS, kept as parameters:
 *  - `ageAnchorYear`: the year the twins' `h5Correction`/`frameworkDeltaT`
 *    convert to t_Ma from (the scene epoch 2000.5 in both twins; the model's
 *    own surfaces use 2000 — `yearToTMa` here is always 2000-anchored, the
 *    Layer-0 rule, and the scene-anchored readers take `ageAnchorYear`).
 *  - `flagsAt()`: the ΔT stack's five post-integration terms, each
 *    switchable (the browser's research toggles; the Node engine maps its
 *    two env gates onto them; the model runs all ON).
 *  - the stellar day: the Node twin projects the precession offset onto the
 *    equator (`stellarDayRaProjection`), the browser does not — two named
 *    functions, `meanStellarDayAtAge` (unprojected) and
 *    `meanStellarDayProjectedAtAge`.
 */

import { deriveEpochParams } from '../layer0/derive-params.js';
import { createEpochPrimitives } from '../layer0/index.js';
import { computeMeanTropicalYearJ2000Days } from '../earth/year-lengths.cjs';
import { createAlphaGiaChannel } from '../climate/l1-orbital.cjs';
import { createMoonDistanceHistory } from './moon-distance-history.cjs';
import { createDeltaTCycles } from './cycles.cjs';
import { createDeepTimeLod } from './deep-time.cjs';
import { createDeepEccChannel } from '../moon/deep-ecc-channel.cjs';
import { createMoonMonthChain } from '../moon/month-chain.cjs';
import { massLossScaledLinearAtAge, driver2PeriodSecondsAtAge, synodicPeriodSeconds } from '../planets/orbit-chain.cjs';
import { computeMassChainJ2000, computeMoonPeriodsJ2000 } from '../earth/mass-chain.cjs';

/**
 * Moon-channel eccentricity sensitivities (perigee/node), the [g/g₀]^s
 * exponents of the factored deep-time law — Meeus-effective (S_N moved
 * 1.0 → 1.018 with the v4 frame-attribution batch). ONE home since B2 (they
 * were literals in model.js, tools/lib/deep-time.js and script.js `_FW_MOON`).
 */
export const MOON_ECC_SENSITIVITY_PERIGEE = 2.407;
export const MOON_ECC_SENSITIVITY_NODE = 1.018;

/**
 * The ΔT stack's switches. `resonator` gates the swing's δLOD terms; the
 * swing's ΔT term is gated by `resonatorDeltaT` when given (the Node twin
 * gates it on BOTH env vars, DT_CORRECTIONS and DT_RESONATOR), else by
 * `resonator`. The four cycles' δLOD terms are never switched (both twins
 * sum them unconditionally); their ΔT terms follow their flags.
 * @typedef {{bond: boolean, hallstatt: boolean, jose5: boolean, jose4: boolean, resonator: boolean, resonatorDeltaT?: boolean}} DeltaTFlags
 */

/**
 * @param {{
 *   constants: any,
 *   fitted: any,
 *   deepModes: any,
 *   moonDistanceArtifact: any,
 *   ageAnchorYear?: number,
 *   flagsAt?: () => DeltaTFlags,
 *   planetAuRatios?: Record<string, number>,
 *   stellarDayRaProjection?: number,
 * }} deps — `constants` the generated DEFAULT_CONSTANTS, `fitted` the
 *   generated FITTED_COEFFICIENTS, `deepModes` the DEEP_MODES_ARTIFACT,
 *   `moonDistanceArtifact` the MOON_DISTANCE_ARTIFACT (injected so a
 *   counterfactual context can replace any of them); `ageAnchorYear` the
 *   scene epoch (default constants.timeReference.sceneEpochYear);
 *   `flagsAt` the ΔT stack's switches (default all ON); `planetAuRatios`
 *   the planets' J2000 semi-major axes in AU (for the per-planet family);
 *   `stellarDayRaProjection` cos ε₀-class factor for the projected stellar day.
 */
export function createDeepTimeChain(deps) {
  const C = deps.constants, F = deps.fitted;
  /** @type {() => DeltaTFlags} */
  const flagsAt = deps.flagsAt ?? (() => ({ bond: true, hallstatt: true, jose5: true, jose4: true, resonator: true }));
  const ageAnchorYear = deps.ageAnchorYear ?? C.timeReference.sceneEpochYear;

  // ── Derived constants (constants.js §9 order — the twins' operations) ─────
  const meanSolarYearDays = computeMeanTropicalYearJ2000Days(C.yearLengthRef.siderealYear, C.earthOrbital.generalPrecessionJ2000_arcsecPerYr);
  const meanSiderealYearDays = C.yearLengthRef.siderealYear;
  const meanSiderealYearSeconds = meanSiderealYearDays * 86400;
  const meanLengthOfDay = C.yearLengthRef.solarDay;
  const meanTropicalYearJ2000Seconds = meanSolarYearDays * meanLengthOfDay;
  const siTropicalYearDays = meanTropicalYearJ2000Seconds / 86400;
  const axialPrecessionJ2000Years = 1296000 / C.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
  const axialPrecessionJ2000Days = axialPrecessionJ2000Years * 365.25;

  const G_CONSTANT = C.physicalConstants.G_CONSTANT;
  const MASS_RATIO_EARTH_MOON = C.physicalConstants.MASS_RATIO_EARTH_MOON;
  const currentAUDistance = C.physicalConstants.currentAUDistance;
  const earthMoiFactorJ2000 = C.physicalConstants.earthMoiFactorJ2000;
  const moonDistanceKm = C.moonReference.moonDistance;
  const moonSiderealMonthInput = C.moonReference.moonSiderealMonthInput;
  const moonSiderealMonth = moonSiderealMonthInput;

  // The mass chain (Moon Kepler → GM_EM → the Earth/Moon split → the Sun) — ONE home (B3)
  const mass = computeMassChainJ2000({
    moonDistanceKm, moonSiderealMonthDays: moonSiderealMonth, meanSiderealYearDays,
    meanLengthOfDaySeconds: meanLengthOfDay, massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
    currentAUDistanceKm: currentAUDistance, gravitationalConstantKm3KgS2: G_CONSTANT,
  });
  const moonOrbitalShift = mass.moonOrbitalShiftKm;
  const moonDistanceCorrected = mass.moonDistanceCorrectedKm;
  const GM_EARTH_MOON_SYSTEM = mass.gmEarthMoonSystemKm3S2;
  const GM_EARTH_ALONE = mass.gmEarthAloneKm3S2;
  const GM_MOON_ALONE = mass.gmMoonAloneKm3S2;
  const GM_SUN_PLUS_EARTH = mass.gmSunPlusEarthKm3S2;
  const GM_SUN = mass.gmSunKm3S2;
  const M_SUN = mass.sunMassKg;

  /** THE J2000 precession anchor p₀ as a period (plan 09: the IAU 2006 general precession). @returns {number} */
  const certifiedAxialPrecessionJ2000Years = () => axialPrecessionJ2000Years;
  /** p₀, ″/yr. @returns {number} */
  const precessionRateJ2000ArcsecPerYr = () => 1296000 / certifiedAxialPrecessionJ2000Years();

  // ── α(t): the GIA channel (lagged L1 response), the memo and the lattice pin ──
  const CLIMATE_REGIME = F.CLIMATE_FORMULA_COEFFS.regimes['lr04-post-mpt'];
  const alphaGia = createAlphaGiaChannel({
    l1Terms: CLIMATE_REGIME.L1,
    yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
    relaxationKyr: C.deepTime.alphaGiaRelaxationKyr,
    alphaGiaRateJ2000PerYr: C.deepTime.alphaGiaRateJ2000PerYr,
    alphaJ2000: earthMoiFactorJ2000,
    j2RateJ2000PerYr: C.deepTime.j2RateJ2000PerYr,
    j2J2000: C.physicalConstants.earthJ2,
  });
  // R2 — the α lattice reference: while a lattice table is being BUILT α is
  // held at its J2000 reference, or the lattice defines itself in terms of
  // its own output. Save/restore under try/finally.
  let latticeAlphaRef = false;
  /** @param {() => void} build */
  const withLatticeAlpha = (build) => { const prev = latticeAlphaRef; latticeAlphaRef = true; try { build(); } finally { latticeAlphaRef = prev; } };
  /** @type {Map<number, number>} */
  const alphaMemo = new Map();
  /** Exact-argument memo (pure dedupe, not a grid); the pin bypasses it. @param {number} tMa @returns {number} */
  const earthMoiFactorAtAge = (tMa) => {
    if (latticeAlphaRef) return earthMoiFactorJ2000;
    let v = alphaMemo.get(tMa);
    if (v === undefined) {
      v = alphaGia.alphaAt(2000 - tMa * 1e6);
      if (alphaMemo.size >= 8192) alphaMemo.clear();
      alphaMemo.set(tMa, v);
    }
    return v;
  };
  /** J₂(t)/J₂₀ of the GIA channel at a calendar year — PURE in year. @param {number} year @returns {number} */
  const j2RatioAtYear = (year) => alphaGia.j2RatioAt(year);

  // ── Layer 0 bundle ────────────────────────────────────────────────────────
  const EPOCH_PARAMS = deriveEpochParams({
    solarLuminosityW: C.physicalConstants.solarLuminosityW,
    solarWindKgPerS: C.physicalConstants.solarWindMassLossKgPerS,
    speedOfLightKmPerS: C.physicalConstants.speedOfLight,
    alpha1PerMa: C.deepTime.alpha1PerMa,
    meanSiderealYearSeconds,
    lodJ2000Seconds: meanLengthOfDay,
    sunMassKg: M_SUN,
    gmEarthAloneKm3S2: GM_EARTH_ALONE,
    gmMoonAloneKm3S2: GM_MOON_ALONE,
    gravitationalConstantKm3KgS2: G_CONSTANT,
    earthMoiFactorJ2000,
    earthDiameterKm: C.bodyDiametersKm.earth,
    moonDistanceKm,
    moonOrbitalEccentricity: C.moonReference.moonOrbitalEccentricityBase,
    gmEarthMoonSystemKm3S2: GM_EARTH_MOON_SYSTEM,
    gmSunKm3S2: GM_SUN,
    astronomicalUnitKm: currentAUDistance,
    earthOrbitalEccentricityJ2000: C.earthOrbital.earthEccentricityJ2000,
    moonEclipticInclinationJ2000Deg: C.moonReference.moonEclipticInclinationJ2000,
    axialPrecessionJ2000Years: certifiedAxialPrecessionJ2000Years(),
  });
  /** @param {number} tMa @returns {number} */
  const iEarthAtAge = (tMa) => earthMoiFactorAtAge(tMa) * EPOCH_PARAMS.earthMassKg * EPOCH_PARAMS.earthRadiusM * EPOCH_PARAMS.earthRadiusM;

  // ── The Earth–Moon distance history — the CITED INPUT (plan 12 option A) ──
  const recession = createMoonDistanceHistory({
    table: deps.moonDistanceArtifact,
    aMoonNowMetres: EPOCH_PARAMS.moonDistanceNowM,
    alpha1PerMa: EPOCH_PARAMS.alpha1PerMa,
  });

  // ── The ΔT cycle stack (the fitted terms, periods stated in years) ────────
  const DT = F.DT_STACK, RES = F.DT_RESONATOR;
  const dtCycles = createDeltaTCycles({
    taperFullHalfwidthYears: C.deepTime.dtStackTaperFullHalfwidthYr,
    taperTotalHalfwidthYears: C.deepTime.dtStackTaperTotalHalfwidthYr,
    tropicalYearSecondsJ2000: meanTropicalYearJ2000Seconds,
    cycles: {
      bond: { periodYears: DT.bond.period_yr, cosCoeffSeconds: DT.bond.cos_coeff_s, sinCoeffSeconds: DT.bond.sin_coeff_s },
      hallstatt: { periodYears: DT.hallstatt.period_yr, cosCoeffSeconds: DT.hallstatt.cos_coeff_s, sinCoeffSeconds: DT.hallstatt.sin_coeff_s },
      jose5: { periodYears: DT.jose5.period_yr, cosCoeffSeconds: DT.jose5.cos_coeff_s, sinCoeffSeconds: DT.jose5.sin_coeff_s },
      jose4: { periodYears: DT.jose4.period_yr, cosCoeffSeconds: DT.jose4.cos_coeff_s, sinCoeffSeconds: DT.jose4.sin_coeff_s },
    },
    resonator: {
      t0Years: RES.T0_yr,
      q: RES.Q,
      kicks: RES.kick_epochs_year.map(/** @param {number} t @param {number} i */ (t, i) => ({ tYear: t, cosSeconds: RES.kick_coefficients_s[i].cos, sinSeconds: RES.kick_coefficients_s[i].sin })),
      tones: RES.drive_tones.map(/** @param {{period_yr: number, phi_locked_rad: number, amp_s: number}} t */ (t) => ({ periodYears: t.period_yr, phiLockedRad: t.phi_locked_rad, ampSeconds: t.amp_s })),
    },
  });
  /** @param {string} name @param {number} year @returns {number} */
  const cycleDeltaT = (name, year) => dtCycles.cycleDeltaTSecondsAt(name, year);
  /** @param {string} name @param {number} year @returns {number} */
  const cycleLod = (name, year) => dtCycles.cycleLodSecondsAt(name, year);
  /** The resonator episode's ΔT term, 0 when its flag is off. @param {number} year @returns {number} */
  const resonatorSwingDeltaTCorrection = (year) => (flagsAt().resonator ? dtCycles.swingDeltaTSecondsAt(year) : 0);
  /** @param {number} year @returns {number} */
  const resonatorSwingLodCorrection = (year) => (flagsAt().resonator ? dtCycles.swingLodSecondsAt(year) : 0);
  /** @param {number} year @returns {number} */
  const resonatorSwingLodRate = (year) => (flagsAt().resonator ? dtCycles.swingLodRateAt(year) : 0);
  /** Sum of the cyclic δLOD contributions at a calendar year (s): the four flags plus the swing when ON. @param {number} year @returns {number} */
  const dtCycleLodCorrectionSum = (year) =>
    cycleLod('bond', year) + cycleLod('hallstatt', year) + cycleLod('jose5', year) + cycleLod('jose4', year) + resonatorSwingLodCorrection(year);

  // ── |s₃| — the dominant nodal mode of Earth's orbit ──────────────────────
  const s3ArcsecPerYr = (() => {
    const z = deps.deepModes.earthZeta
      .filter(/** @param {{omegaRadPerYr: number}} m */ (m) => Math.abs(m.omegaRadPerYr) > 1e-9)
      .sort(/** @param {{re: number, im: number}} a @param {{re: number, im: number}} b */ (a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
    return Math.abs((z.omegaRadPerYr * 180) / Math.PI) * 3600;
  })();

  // ── The LOD/ΔT core ───────────────────────────────────────────────────────
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
      lodNowH13Seconds: EPOCH_PARAMS.lodNowH13Seconds,
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      solarMassLossFracPerYear: EPOCH_PARAMS.solarMassLossFracPerYear,
      precessionSolarShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
    },
    moonDistanceMetresAtAge: recession.distanceMetresAtAge,
    moiFactorAtAge: earthMoiFactorAtAge,
    precessionPeriodJ2000YearsFn: certifiedAxialPrecessionJ2000Years,
    nodalPeriodYearsFn: () => 1296000 / s3ArcsecPerYr,
    cycleLodSumAt: dtCycleLodCorrectionSum,
    swingLodAt: resonatorSwingLodCorrection,
    swingLodRateAt: resonatorSwingLodRate,
    moonDistanceSlopeMetresPerMaAtAge: recession.slopeMetresPerMaAtAge,
  });

  // ── Layer 0 primitives ────────────────────────────────────────────────────
  const l0 = createEpochPrimitives({ params: EPOCH_PARAMS, alphaAtAgeMa: earthMoiFactorAtAge, moonDistanceMetresAtAge: recession.distanceMetresAtAge });

  // ── The ONE deep e and the lunar month chain ──────────────────────────────
  const deepEcc = createDeepEccChannel(deps.deepModes);
  /** [g(t)/g₀]^s — the e_E-channel modulation; ≡ 1 at J2000. @param {number} tMa @param {number} s @returns {number} */
  const eCompModulation = (tMa, s) => deepEcc.modulation(tMa, s);

  // The Moon's J2000 periods on the IAU inputs — ONE home (B3): the star-referenced
  // apsidal/nodal anchors the month chain rides, and the days forms the twins publish.
  const moonPeriods = computeMoonPeriodsJ2000({
    moonSiderealMonthDays: moonSiderealMonth,
    moonApsidalPrecessionDaysInput: C.moonReference.moonApsidalPrecessionDaysInputICRF,
    moonNodalPrecessionDaysInput: C.moonReference.moonNodalPrecessionDaysInputICRF,
    axialPrecessionJ2000Days, meanSiderealYearDays, meanSolarYearDays,
  });
  const { moonApsidalJ2000Seconds, moonNodalJ2000Seconds, moonSiderealMonthJ2000Seconds } = moonPeriods;

  /** @param {number} tMa @returns {number|null} */
  const meanLodSecondsAtAge = (tMa) => deepLod.lodSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number} */
  const meanSiderealYearSecondsAtAge = (tMa) => deepLod.siderealYearSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const meanLunisolarPrecessionPeriodYearsAtAge = (tMa) => deepLod.lunisolarPrecessionPeriodYearsAtAge(tMa);

  const moonChain = createMoonMonthChain({
    constants: {
      aMoonNowMetres: EPOCH_PARAMS.moonDistanceNowM,
      gmEarthMoonM3PerS2: EPOCH_PARAMS.gmEarthMoonM3S2,
      massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
      moonSiderealMonthInputDays: moonSiderealMonthInput,
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      moonApsidalJ2000Seconds,
      moonNodalJ2000Seconds,
      moonSiderealMonthJ2000Seconds,
      sPerigee: MOON_ECC_SENSITIVITY_PERIGEE, sNode: MOON_ECC_SENSITIVITY_NODE,
    },
    fns: {
      meanLodSecondsAtAge,
      meanSiderealYearSecondsAtAge,
      precessionPeriodYearsAtAge: meanLunisolarPrecessionPeriodYearsAtAge,
      modulation: eCompModulation,
      distanceMetresAtAge: recession.distanceMetresAtAge,
    },
  });

  // ── The ΔT integrator with the flag-keyed cache and the SEQUENTIAL adds ───
  /** @type {Map<string, number>} */
  const deltaTCache = new Map();
  /** ΔT in SI seconds at age tMa, RELATIVE TO J2000 (0 at tMa = 0); the raw Simpson
   *  integral plus the post-integration terms the flags switch, added one by one in
   *  the twins' order (pre-summing would change the FP association). @param {number} tMa @returns {number} */
  const meanDeltaTSecondsAtAge = (tMa) => {
    if (tMa === 0) return 0;
    const f = flagsAt();
    const resonatorDeltaT = f.resonatorDeltaT ?? f.resonator;
    const cacheKey = `${f.bond ? 'B' : '_'}${f.hallstatt ? 'H' : '_'}${f.jose5 ? 'J' : '_'}${f.jose4 ? 'W' : '_'}${resonatorDeltaT ? 'R' : '_'}:${tMa}`;
    const hit = deltaTCache.get(cacheKey);
    if (hit !== undefined) return hit;
    let result = deepLod.deltaTRawSecondsAtAge(tMa);
    const yearY = 2000 - tMa * 1e6;
    if (f.bond) result += cycleDeltaT('bond', yearY);
    if (f.hallstatt) result += cycleDeltaT('hallstatt', yearY);
    if (f.jose5) result += cycleDeltaT('jose5', yearY);
    if (f.jose4) result += cycleDeltaT('jose4', yearY);
    if (resonatorDeltaT) result += dtCycles.swingDeltaTSecondsAt(yearY);
    if (deltaTCache.size >= 512) deltaTCache.delete(/** @type {string} */ (deltaTCache.keys().next().value));
    deltaTCache.set(cacheKey, result);
    return result;
  };

  // ── The scene-anchored readers (t_Ma from the scene epoch) ───────────────
  /** @param {number} year @returns {number} */
  const ageFromSceneYear = (year) => (ageAnchorYear - year) / 1e6;
  /** The solar day's ecliptic missing-motion term on the nodal period (the identifier is historical). @param {number} year @returns {number} */
  const h5Correction = (year) => deepLod.eclipticLodCorrectionSecondsAtAge(ageFromSceneYear(year)) ?? 0;
  /** The kinematic day of date: the Layer-0 tidal mean LOD, the J2000 day past tidal lock. @param {number} year @returns {number} */
  const computeLodKinematicSecondsAtEpoch = (year) => l0.lodSeconds(year) ?? meanLengthOfDay;
  /** The Layer-4 solar day: kinematic + ecliptic term + the cycle stack. @param {number} year @returns {number} */
  const computeLodRealSecondsAtEpoch = (year) => computeLodKinematicSecondsAtEpoch(year) + h5Correction(year) + dtCycleLodCorrectionSum(year);

  // ── Driver 2 and the per-planet family ────────────────────────────────────
  /** @param {number} tMa @returns {number} */
  const meanAuAtAge = (tMa) => massLossScaledLinearAtAge(tMa, currentAUDistance, EPOCH_PARAMS.solarMassLossFracPerYear);
  const planetAuRatios = deps.planetAuRatios ?? {};
  /** @param {string} planetName @param {number} tMa @returns {number|null} */
  const meanPlanetSemiMajorAxisAtAge = (planetName, tMa) => {
    if (planetName === 'earth') return meanAuAtAge(tMa);
    const ratio = planetAuRatios[planetName];
    if (ratio === undefined) return null;
    return massLossScaledLinearAtAge(tMa, ratio * currentAUDistance, EPOCH_PARAMS.solarMassLossFracPerYear);
  };

  // ── The stellar and sidereal days ─────────────────────────────────────────
  /** @param {number} tMa @returns {number|null} */
  const meanSiderealDayAtAge = (tMa) => {
    const T_sid_s = meanSiderealYearSecondsAtAge(tMa);
    const LOD_s = meanLodSecondsAtAge(tMa);
    if (LOD_s === null) return null;
    const Tp = meanLunisolarPrecessionPeriodYearsAtAge(tMa) ?? certifiedAxialPrecessionJ2000Years();
    return T_sid_s / (T_sid_s / LOD_s + 1 + 1 / Tp);
  };
  /** The browser's form: no projection of the precession offset. @param {number} tMa @returns {number|null} */
  const meanStellarDayAtAge = (tMa) => {
    const T_sid_s = meanSiderealYearSecondsAtAge(tMa);
    const LOD_s = meanLodSecondsAtAge(tMa);
    if (LOD_s === null) return null;
    return T_sid_s / (T_sid_s / LOD_s + 1);
  };
  /** The Node twin's form: the precession offset projected onto the equator. @param {number} tMa @returns {number|null} */
  const meanStellarDayProjectedAtAge = (tMa) => {
    const T_sid_s = meanSiderealYearSecondsAtAge(tMa);
    const LOD_s = meanLodSecondsAtAge(tMa);
    if (LOD_s === null) return null;
    const sid = meanSiderealDayAtAge(tMa);
    const Tp = meanLunisolarPrecessionPeriodYearsAtAge(tMa) ?? certifiedAxialPrecessionJ2000Years();
    const unproj = T_sid_s / (T_sid_s / LOD_s + 1);
    const sidTp = T_sid_s / (T_sid_s / LOD_s + 1 + 1 / Tp);
    return /** @type {number} */ (sid) + (unproj - sidTp) * (deps.stellarDayRaProjection ?? 1);
  };

  return Object.freeze({
    // the derived scalars
    meanSolarYearDays, meanSiderealYearDays, meanSiderealYearSeconds, meanLengthOfDay,
    meanTropicalYearJ2000Seconds, siTropicalYearDays, axialPrecessionJ2000Years, axialPrecessionJ2000Days,
    G_CONSTANT, MASS_RATIO_EARTH_MOON, currentAUDistance, earthMoiFactorJ2000, moonDistanceKm, moonSiderealMonthInput,
    moonOrbitalShift, moonDistanceCorrected, GM_EARTH_MOON_SYSTEM, GM_EARTH_ALONE, GM_MOON_ALONE, GM_SUN_PLUS_EARTH, GM_SUN, M_SUN,
    moonApsidalJ2000Seconds, moonNodalJ2000Seconds, moonSiderealMonthJ2000Seconds, moonPeriods,
    certifiedAxialPrecessionJ2000Years, precessionRateJ2000ArcsecPerYr,
    EPOCH_PARAMS, ageAnchorYear,
    // the pieces
    alphaGia, earthMoiFactorAtAge, withLatticeAlpha, j2RatioAtYear, iEarthAtAge,
    recession, dtCycles, s3ArcsecPerYr, deepLod, l0, deepEcc, eCompModulation, moonChain,
    // the family
    meanMoonDistanceMetresAtAge: recession.distanceMetresAtAge,
    meanMoonDistanceAtAge: moonChain.distanceKmAtAge,
    meanLodSecondsAtAge,
    meanLodHoursAtAge: deepLod.lodHoursAtAge,
    meanLunisolarPrecessionRateArcsecPerYrAtAge: deepLod.lunisolarPrecessionRateArcsecPerYrAtAge,
    meanLunisolarPrecessionPeriodYearsAtAge,
    meanAuAtAge, meanSiderealYearSecondsAtAge,
    meanTropicalYearSecondsAtAge: deepLod.tropicalYearSecondsAtAge,
    meanTropicalYearDaysAtAge: deepLod.tropicalYearDaysAtAge,
    meanYearInDaysAtAge: deepLod.yearInDaysAtAge,
    meanDeltaTSecondsAtAge,
    bondCycleDeltaTCorrection: (/** @type {number} */ year) => cycleDeltaT('bond', year),
    hallstattCycleDeltaTCorrection: (/** @type {number} */ year) => cycleDeltaT('hallstatt', year),
    jose5CycleDeltaTCorrection: (/** @type {number} */ year) => cycleDeltaT('jose5', year),
    jose4CycleDeltaTCorrection: (/** @type {number} */ year) => cycleDeltaT('jose4', year),
    bondCycleLodCorrection: (/** @type {number} */ year) => cycleLod('bond', year),
    hallstattCycleLodCorrection: (/** @type {number} */ year) => cycleLod('hallstatt', year),
    jose5CycleLodCorrection: (/** @type {number} */ year) => cycleLod('jose5', year),
    jose4CycleLodCorrection: (/** @type {number} */ year) => cycleLod('jose4', year),
    dtCycleLodCorrectionSum,
    resonatorSwingDeltaTCorrection, resonatorSwingLodCorrection, resonatorSwingLodRate,
    meanLodSecondsWithCorrectionsAtAge: deepLod.lodSecondsWithCorrectionsAtAge,
    dLodDtDecompositionAtAge: deepLod.dLodDtDecompositionAtAge,
    h5Correction, computeLodKinematicSecondsAtEpoch, computeLodRealSecondsAtEpoch,
    meanSolarDeltaAAtAge: moonChain.solarDeltaAKmAtAge,
    meanMoonDistanceCorrectedAtAge: moonChain.distanceCorrectedKmAtAge,
    meanMoonSiderealMonthAtAge: moonChain.siderealMonthSecondsAtAge,
    meanSynodicMonthAtAge: moonChain.synodicMonthSecondsAtAge,
    meanTropicalMonthAtAge: moonChain.tropicalMonthSecondsAtAge,
    meanLunarPerigeePrecessionAtAge: moonChain.perigeePrecessionSecondsAtAge,
    meanLunarNodePrecessionAtAge: moonChain.nodePrecessionSecondsAtAge,
    meanAnomalisticMonthAtAge: moonChain.anomalisticMonthSecondsAtAge,
    meanNodalMonthAtAge: moonChain.nodalMonthSecondsAtAge,
    meanApsidalMeetsNodalAtAge: moonChain.apsidalMeetsNodalSecondsAtAge,
    meanLunarLevelingCycleAtAge: moonChain.lunarLevelingSecondsAtAge,
    meanStellarDayAtAge, meanStellarDayProjectedAtAge, meanSiderealDayAtAge,
    meanPlanetSemiMajorAxisAtAge,
    /** @param {number} tMa @param {number} periodJ2000Seconds @returns {number} */
    meanPlanetOrbitalPeriodAtAge: (tMa, periodJ2000Seconds) => driver2PeriodSecondsAtAge(tMa, periodJ2000Seconds, EPOCH_PARAMS.solarMassLossFracPerYear),
    /** @param {number} tMa @param {number} periodJ2000Seconds @returns {number} */
    meanEarthPlanetSynodicPeriodAtAge: (tMa, periodJ2000Seconds) => synodicPeriodSeconds(driver2PeriodSecondsAtAge(tMa, periodJ2000Seconds, EPOCH_PARAMS.solarMassLossFracPerYear), meanSiderealYearSecondsAtAge(tMa)),
  });
}
