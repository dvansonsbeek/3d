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
import { createYearLengths, ONE_FAMILY_WINDOW_YEARS } from './earth/year-lengths.cjs';
import { createDeepOrbitalHistory } from './earth/deep-orbital-history.cjs';
import { CHAIN_ARTIFACT } from './planets/chain-artifact.js';
import { buildPlanetChainsFromArtifactData, computeApsidalSecularDegPerYr } from './planets/keplerian-chain.cjs';
import { computeSecularShape } from './planets/secular-shape.cjs';
import { createPlanetSpinChannelFromArtifacts, computeObliquityJ2000Deg } from './planets/spin-channel.cjs';
import { createDeltaTCycles } from './deltat/cycles.cjs';
import { createDeepTimeLod } from './deltat/deep-time.cjs';
import { createMoonRecessionHistory, createSolarChannelBudget } from './deltat/recession-history.cjs';
import { evalClimateL1OrbitalPermil, createAlphaGiaChannel } from './climate/l1-orbital.cjs';
import { createDeepEccChannel } from './moon/deep-ecc-channel.cjs';
import { DEEP_MODES_ARTIFACT } from './moon/deep-modes-artifact.cjs';
import { createMoonMonthChain } from './moon/month-chain.cjs';
import { createChainCycleIntegrator } from './chain-cycles/index.cjs';
import { createMoonArguments, jdToDecimalYear } from './moon/arguments.cjs';
import { createMoonSeries } from './moon/series.cjs';
import { createSunPlanetaryCompletion } from './eclipse/sun-planetary-completion.cjs';
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
export function assembleModel(C, F, laws = {}, secularSeriesArtifact = /** @type {any} */ (null)) {
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

  // ── α(t): the GIA channel — the LAGGED response to the L1 ice history, with the R2 lattice pin ──
  const CLIMATE = F.CLIMATE_FORMULA_COEFFS;
  const CLIMATE_REGIME = CLIMATE.regimes['lr04-post-mpt'];

  /** The climate formula's L1 (unlagged) — the orbital δ¹⁸O layer itself. @param {number} year @returns {number} */
  const evalClimateL1 = (year) => evalClimateL1OrbitalPermil(year, {
    l1Terms: CLIMATE_REGIME.L1,
    yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
  });
  // ONE home (climate/l1-orbital.cjs): k derived from the Cox–Chao rate, τ the
  // record-measured relaxation time (plan 06 D7). Same construction in
  // src/script.js, tools/lib/deep-time.js and the website's essrt.ts.
  const alphaGia = createAlphaGiaChannel({
    l1Terms: CLIMATE_REGIME.L1,
    yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
    relaxationKyr: C.deepTime.alphaGiaRelaxationKyr,
    alphaGiaRateJ2000PerYr: C.deepTime.alphaGiaRateJ2000PerYr,
    alphaJ2000: earthMoiFactorJ2000,
  });

  let latticeAlphaPin = false;
  // Exact-argument memo (mirrors src/script.js + tools/lib/deep-time.js —
  // the round-5 perf campaign): same tMa → bit-identical value; the pin
  // branch bypasses the memo; bounded by wholesale clear.
  /** @type {Map<number, number>} */
  const alphaMemo = new Map();
  /** @param {number} tMa @returns {number} */
  const earthMoiFactorAtAge = (tMa) => {
    if (latticeAlphaPin) return earthMoiFactorJ2000;
    let v = alphaMemo.get(tMa);
    if (v === undefined) {
      v = alphaGia.alphaAt(2000 - tMa * 1e6);
      if (alphaMemo.size >= 8192) alphaMemo.clear();
      alphaMemo.set(tMa, v);
    }
    return v;
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
    // the solar precession torque's inputs (plan 06 Phase 3: the unit H(t) = 13·T_p,composed)
    gmSunKm3S2: GM_SUN,
    astronomicalUnitKm: currentAUDistance,
    earthOrbitalEccentricityJ2000: C.earthOrbital.earthEccentricityJ2000,
    moonEclipticInclinationJ2000Deg: C.moonReference.moonEclipticInclinationJ2000,
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
  // Periods STATED IN YEARS (the fit files' period_yr / T0_yr): plan 06 T5
  // measured the former 8H/n labels chance-level; layer B item 3 removed the
  // divisor from every runtime. Twins: tools/lib/deep-time.js, src/script.js,
  // the website's essrt.ts.
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
      kicks: RES.kick_epochs_year.map(/** @param {number} t @param {number} i */ (t, i) => ({
        tYear: t,
        cosSeconds: RES.kick_coefficients_s[i].cos,
        sinSeconds: RES.kick_coefficients_s[i].sin,
      })),
      tones: RES.drive_tones.map(/** @param {{period_yr: number, phi_locked_rad: number, amp_s: number}} t */ (t) => ({ periodYears: t.period_yr, phiLockedRad: t.phi_locked_rad, ampSeconds: t.amp_s })),
    },
  });

  /** Layer-3/4 cyclic δLOD sum (all shipped channels ON). @param {number} year @returns {number} */
  const dtCycleLodCorrectionSum = (year) =>
    dtCycles.cycleLodSecondsAt('bond', year)
    + dtCycles.cycleLodSecondsAt('hallstatt', year)
    + dtCycles.cycleLodSecondsAt('jose5', year)
    + dtCycles.cycleLodSecondsAt('jose4', year)
    + dtCycles.swingLodSecondsAt(year);

  // Plan 06 S6 — |s₃|, the dominant nodal mode of Earth's orbit: the
  // largest-amplitude ζ mode of the banked deep secular modes (the recipe
  // the registry's `eclPrecYears`/`obliqCycleYears` and the browser's
  // obliquity-beat helper use). ONE home here; the deep-time factory's
  // ecliptic missing-motion term, the lunisolar surface and the API read it.
  const s3ArcsecPerYr = (() => {
    const z = DEEP_MODES_ARTIFACT.earthZeta
      .filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
      .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
    return Math.abs((z.omegaRadPerYr * 180) / Math.PI) * 3600;
  })();

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
      precessionSolarShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
    },
    moonDistanceMetresAtAge,
    moiFactorAtAge: earthMoiFactorAtAge,
    // S5: the composed clock's J2000 anchor — the certified year laws' beat
    // at 2000 (ONE home below, shared with the hybrid's self-anchor); lazy.
    precessionPeriodJ2000YearsFn: () => certifiedAxialPrecessionJ2000Years(),
    // Plan 06 T2 item: the solar day's ecliptic missing-motion term rides the
    // nodal period 1,296,000/|s₃| (orbital), not the spin unit's H/5.
    nodalPeriodYearsFn: () => 1296000 / s3ArcsecPerYr,
    siderealYearDaysFourierAt: (year) => evalSiderealYearFourierIAU(year),
    cycleLodSumAt: dtCycleLodCorrectionSum,
    swingLodAt: (year) => dtCycles.swingLodSecondsAt(year),
    swingLodRateAt: (year) => dtCycles.swingLodRateAt(year),
    lEmAtAgeKgm2S: solarBudget.lEmAtAgeKgm2S,
  });

  // ── Integrated ∫1/H(t)dt phase (R2 α-pin honoured while building) ─────────
  // The phase counter every FROZEN comb reads rides the frozen era clock's
  // own convention H_era = H₀·LOD/LOD₀ (plan 06 D8: two named counters — the
  // coefficients were fitted against this counter and ship with it), NOT the
  // unit H(t) = 13·T_p,composed that the physics publishes.
  const phaseM = createPhaseMachinery({
    holisticHAtAgeMa: (tMa) => deepLod.eraClockHAtAge(tMa),
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
  // Plan 06 layer B — the eclipse Sun onto the series. The PUBLISHED Earth
  // ϖ of date is the one-source series (the secular orbit; its J2000 element
  // ≡ La2004's — the same field the D4c apsidal wheel renders). The SUN's
  // equation of centre needs the MEAN elements of the era: the series plus the
  // derived mean offset of the osculating channel (F.EARTH_OSCULATING_MEAN_
  // OFFSET, tools/verify/earth-osculating-offset.js — the 1890–2110 mean of
  // osculating − secular from the Horizons-seeded nine-body run). Measured:
  // the fast osculating wobble is carried by the completion's direct terms and
  // double-counts if added; the window mean is what the Sun residual holds
  // (all-phase JPL sd 3.23″ → 1.59″; the former K law's Standish anchor
  // 1.58″). The former K perihelion Fourier law (H divisors) is retired here.
  const earthPerihelionDeg = (year) => oneSourceM.periOfDateDegAt(year);
  const SUN_OFF = F.EARTH_OSCULATING_MEAN_OFFSET;
  /** The eclipse Sun's ϖ of date (mean elements). @param {number} year @returns {number} */
  const sunPerihelionDegAt = laws.perihelionLongitudeDegAt ?? ((year) => oneSourceM.periOfDateDegAt(year) + SUN_OFF.dPomArcsec / 3600);
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
  // syzygy 3.72″). Consumers (engine-switch decision (ii) restatement,
  // plan 02 §8): the eclipse Sun (equation of centre), the besselian Sun
  // distance and the cardinal-point braid — the CLOCK-side machinery. The
  // LUNAR chain (E-factor, perigee/node modulation/T², argument Δe² and
  // of-date rates) rides the ONE deep e (deep-ecc-channel.cjs — the
  // engine's own ±10-Myr z-vector); this H/3 line is its epoch-local
  // tangent (E18), agreeing within 4.2e-5 across the historical era.
  // ONE implementation for all three runtimes: moon/ecc-channel.cjs (the
  // Node engine's deep-time.js and the browser's script.js instantiate the
  // same channel with the same inputs). Its phase counter runs from J2000
  // (θ₀ = ϖ_ICRF(J2000) − 21.77° = 81.178°, the System-Reset anchor in
  // anchor form — doc 66 §1); base' is derived inside from the observed
  // J2000 eccentricity.
  // (The H/3 eccentricity-law channel — createMoonEccChannel — left this
  // package with plan 06 layer B: the Sun's e is the one-source series plus
  // the derived mean offset above; the browser's scene Sun still reads the
  // law through its own _moonEcc until the cardinal points move.)
  // Engine-switch decision (ii) (plan 02 §8): the ONE deep e — the engine's
  // own ±10-Myr mode table, anchored form — feeds the ENTIRE lunar chain
  // (modulation, cycle counts, arguments eccAt/channelIntegral, E-factor).
  // The Sun/clock machinery (eclipse Sun EoC, besselian Sun distance,
  // cardinal braid) stays on the H/3 channel above — a certification
  // split, not a physics one (the two agree within 4.2e-5 in-era). The
  // laws hook deliberately does NOT reach this channel.
  const deepEcc = createDeepEccChannel(DEEP_MODES_ARTIFACT);
  /** @param {number} year @returns {number} */
  // Plan 06 layer B: the PUBLISHED Earth eccentricity is the one-source series
  // (|z|, the secular orbit); the SUN's e adds the derived mean offset (see
  // sunPerihelionDegAt). The former H/3 eccentricity law is retired here.
  const eccentricityAt = (year) => oneSourceM.eAt(year);
  /** The eclipse Sun's e (mean elements). @param {number} year @returns {number} */
  const sunEccentricityAt = laws.eccentricityAt ?? ((year) => oneSourceM.eAt(year) + SUN_OFF.dE);
  /** de/dyear of the Sun's e — the cardinal braid's equation-of-centre
   *  derivative rides it (±0.5-yr central difference; the constant offset
   *  cancels). @param {number} year @returns {number} */
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
  // The comb family's bases are the FROZEN era clock's forms (H_era; plan 06
  // D8) — the combs were fitted on them. The physical year lengths ride the
  // unit through yearLengths (family B) and the tidal-chain mean.
  /** @param {number} year @returns {number} */
  const tropicalYearDaysBase = (year) => {
    const days = deepLod.eraClockYearInDaysAtAge(yearToTMa(year));
    return days === null ? meanSolarYearDays : days;
  };
  /** THE J2000 precession anchor (plan 06 S5 — one J2000 precession
   * reading): the certified of-date year laws at 2000, sid/(sid − trop) =
   * 25,771.4 yr = 50.2883 ″/yr (IAU 50.2879 to 8×10⁻⁶) — identical to the
   * engine/browser Direct twins. ONE home: the composed clock's p₀, the
   * hybrid's self-anchor and the lunisolar surface all read it. The former
   * H/13 reading (25,793.6) is the fit anchor's, not a period. Memoized;
   * hoisted so the deep-time factory's lazy dep can name it.
   * @returns {number} */
  function certifiedAxialPrecessionJ2000Years() {
    if (certifiedAxial0Memo === undefined) {
      const sidLaw2000 = evalYearFourier(2000, siderealYearDaysBase(2000), F.SIDEREAL_YEAR_HARMONICS);
      const solLaw2000 = evalYearFourier(2000, tropicalYearDaysBase(2000), F.TROPICAL_YEAR_HARMONICS);
      certifiedAxial0Memo = sidLaw2000 / (sidLaw2000 - solLaw2000);
    }
    return certifiedAxial0Memo;
  }
  /** @type {number|undefined} */
  let certifiedAxial0Memo;
  /** @param {number} year @returns {number} */
  const anomalisticYearDaysBase = (year) => {
    const tMa = yearToTMa(year);
    const Ht = deepLod.eraClockHAtAge(tMa);
    const tropD = deepLod.eraClockYearInDaysAtAge(tMa);
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

  // ── Cardinal points (the fitted model retired, R1)──────────────────────────────────────────────────
  // Plan 06 R1: the fitted cardinal-point model (CARDINAL_POINT_* — the §10
  // derived form on the frozen era clock, fitted to the retired K scene's
  // events; measured 60–140 min from Meeus ch. 27 at 0..−1000 and 6–25 min
  // in 1500–2900) left this package. The instants are the CROSSINGS of the
  // one Sun the scene renders and the eclipse chain certifies — see
  // `cardinalCrossingJdUT` below the finders.
  // ── One-source cardinal structure (D4b) ───────────────────────────────────
  // The EoC layer (year lengths, crossing offsets, the e(t)-proportional
  // spread) on the one-source movement's own e(t)/ϖ(t) — the MODE tier (the
  // package's embedded deep-modes artifact; the banked-series tier is the
  // repo-data-bound instrument). Absolute dates deliberately absent — see
  // cardinal/one-source-structure.cjs. The mean year is SI SECONDS: the
  // sidereal year of date reduced by the SECULAR equinox precession
  // (axial0·H(t)/H₀ with H(t) the UNIT = 13·T_p,composed — plan 06 D6/Phase
  // 3, the movement's leg-1 convention, NOT the H/13 kinematic identity at
  // J2000; the two are a recorded 0.09% relation tension there).
  // THE ONE of-date year-length family (owner: "move to 1 implementation")
  // — createYearLengths owns tropical (equinox-rate mean, wobble included),
  // sidereal (the D6 λ̇ channel), anomalistic (the cardinal structure on
  // the SAME mean), all λ̇-corrected coherently, SI seconds, and the beats
  // of that pair. The internal laws, the kinematic beat constructions
  // (axialPrecessionYears*), the scene engine and the frozen era clock
  // stay on their own families as before.
  // S3 tier unification: when the caller injects the governed secular-
  // series artifact (createModel opts.secularSeriesArtifact — the API/Node
  // path; the npm package alone has no 8 MB series), the movement runs the
  // SERIES tier exactly like the browser — killing the mode-vs-series
  // value split (measured: 6 s on the anomalistic year at J2000).
  // The engine-D planet chains (ONE build; the one-family route's apsidal
  // tangent and the lunisolar surface's n_aps read the same instance).
  const kcChainsM = buildPlanetChainsFromArtifactData(CHAIN_ARTIFACT);
  // The ONE-SOURCE movement: the hybrid's ε(t) (plan 06 Phase 3 S3b — THE
  // published obliquity) and the one-family year lengths, on the same
  // per-tier sampler.
  const oneSourceM = (() => {
    const AEarth = /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements.earth;
    // The ψ̇ anchor: the CERTIFIED of-date laws at 2000 — identical to the
    // engine/browser (computeSiderealYearDaysDirect / computeSolarYearDays
    // Direct twins → 25,771.4). The FOUNDATIONAL mean pair used before
    // (meanSiderealYearDays/meanSolarYearDays → 25,796) anchored this
    // movement's realized precession 25 yr off the certified value — the
    // hidden split behind the API's 365.242204 tropical mean (found in the
    // owner's one-implementation drive).
    const axial0 = certifiedAxialPrecessionJ2000Years();   // S5: the ONE home
    // D6 → Phase 3 (plan 06): the deep-time ψ̇(t) the hybrid precesses on is
    // the COMPOSED lunisolar rate, and since Phase 3 the unit H(t) IS
    // 13 × that period (deltat/deep-time.cjs hAtAge), so the injection is
    // the plain period₀·H(t)/H₀ again — on the unit, not on the frozen
    // era clock's H_era (which misses the lunar 1/a³ growth: 70.9 vs
    // Lantink 2022's 108.6 ± 8.5 ″/yr at 2.46 Ga; the unit reads 104.5).
    const H0 = /** @type {number} */ (deepLod.hAtAge(0));
    const seriesArt = /** @type {any} */ (secularSeriesArtifact);
    const sb = seriesArt && seriesArt.bodies && seriesArt.bodies.earth;
    const hist = createDeepOrbitalHistory({
      zModes: DEEP_MODES_ARTIFACT.earthZ,
      zetaModes: DEEP_MODES_ARTIFACT.earthZeta,
      ...(sb ? {
        zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: sb.stepYr, q: sb.zetaQ, p: sb.zetaP },
        zSeries: { t0Yr: seriesArt.t0Yr, stepYr: sb.stepYr, q: sb.zQ, p: sb.zP },
      } : {}),
      anchorE: AEarth.e,
      anchorPeriEclipticDeg: AEarth.lonPeriEclipticDeg,
      anchorInclEclipticDeg: AEarth.inclEclipticDeg,
      anchorAscNodeEclipticDeg: AEarth.ascNodeEclipticDeg,
      axialPrecessionYearsJ2000: axial0,
      // Phase 3 S3b: the hybrid's initial condition is the OBSERVED J2000
      // mean obliquity — the IAU 2006 input constant (84381.406″), the same
      // anchor the browser's _deepHistSeries and the Node one-source movement
      // use. It was the K comb's own J2000 value, 0.233″ above IAU: a
      // rendering-device residual imported as the initial condition of the
      // physics (found when the package began publishing the hybrid).
      obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
      axialPrecessionYearsAtYearFn: (yr) => {
        const h = deepLod.hAtAge((startmodelYear - yr) / 1e6);
        return axial0 * (h === null ? 1 : h / H0);
      },
    });
    // PER-TIER ROUTING (the anomalistic-contamination fix): one sampler PER
    // grid tier, built on first entry and KEPT — a query always reads the
    // tier its own span selects. The former single grown sampler replaced
    // the 100-yr grid with the 1000/5000-yr one after any deep-time probe,
    // and the year-length rates (±0.5-yr central differences through the
    // grid) then returned grid-segment averages instead of local rates
    // (anomalistic of date +2.63 s / +19 s, visit-order dependent).
    const samplers = /** @type {Map<number|'deep', any>} */ (new Map());
    let deepRangeYr = 0;
    const gridStep = (/** @type {number} */ n) => (n <= 50000 ? 100 : n <= 2000000 ? 1000 : 5000);
    const tierSpan = (/** @type {number} */ n) => (n <= 50000 ? 50000 : n <= 2000000 ? 2000000 : Math.ceil(n * 1.25 / 5000) * 5000);
    const sampleAt = (/** @type {number} */ year) => {
      const t = year - 2000, need = Math.max(20000, Math.abs(t) * 1.25);
      const span = tierSpan(need);
      const key = span > 2000000 ? /** @type {'deep'} */ ('deep') : span;
      if (!samplers.has(key) || (key === 'deep' && span > deepRangeYr)) {
        if (key === 'deep') deepRangeYr = span;
        samplers.set(key, hist.build(span, -span, gridStep(span)));
      }
      return samplers.get(key).at(t);
    };
    // The anomalistic rides the chain's SECULAR apsidal tangent (the same
    // rate family the panel's Prec. cell shows) — ONE helper, keplerian-chain.
    const kcChains = kcChainsM;
    const yearLengths = createYearLengths({
      sampleAt,
      massLossSiderealSecondsAtYearFn: (year) => deepLod.siderealYearSecondsAtAge(yearToTMa(year)),
      apsidalSecularDegPerYrFn: (year) => computeApsidalSecularDegPerYr(year, kcChains.earth, kcChains),
    });
    return {
      yearLengths,
      /** EXPERIMENT accessors: the series' e and equinox-referenced ϖ of date. @param {number} year @returns {number} */
      eAt: (year) => sampleAt(year).e,
      /** @param {number} year @returns {number} */
      periOfDateDegAt: (year) => sampleAt(year).periOfDateDeg,
      /** The hybrid's obliquity at a decimal year, degrees — the banked series inside its span, the α(t)-coupled ζ-tail integration beyond (the deep sampler grows ~0.1 s/Myr). @param {number} year @returns {number} */
      epsAt: (year) => sampleAt(year).epsDeg,
    };
  })();
  const yearLengthsM = oneSourceM.yearLengths;
  /** THE one-family tropical year of date in SI seconds: route B inside the
   *  one-family window, the tidal-chain year beyond (plan 06 R1 — the Sun's
   *  mean longitude, the cardinal instants and the published year lengths
   *  all ride this one function). @param {number} year @returns {number} */
  const oneFamilyTropicalYearSeconds = (year) => (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS
    ? yearLengthsM.tropicalYearSecondsAtYear(year)
    : (deepLod.tropicalYearSecondsAtAge(yearToTMa(year)) ?? meanSolarYearDays * 86400));

  /** Tropical year of date in DAYS OF THE EPOCH (the kinematic day below) —
   *  the one-family SI year over the epoch's day length, so solarYearSeconds
   *  ≡ the one-family year. Plan 06 R1: formerly the fitted cardinal model's
   *  4-mean. @param {number} year @returns {number} */
  const tropicalYearDays = (year) => oneFamilyTropicalYearSeconds(year) / dayLengthSeconds(year);
  /** @param {number} year @returns {number} */
  const tropicalYearDirectDays = (year) => evalYearFourier(year, tropicalYearDaysBase(year), F.TROPICAL_YEAR_HARMONICS);

  /** @param {number} year @returns {number} */
  const solarYearSeconds = (year) => tropicalYearDays(year) * dayLengthSeconds(year);
  /** @param {number} year @returns {number} */
  const siderealDaySeconds = (year) => solarYearSeconds(year) / (tropicalYearDays(year) + 1);
  /** @param {number} year @returns {number} */
  const stellarDaySeconds = (year) => {
    const tMa = yearToTMa(year);
    // S5 (plan 06): one equinox turn per T_p(t) — the composed lunisolar
    // period (its certified J2000 anchor past the chain's domain), NOT the
    // unit's counter H(t)/13 (0.086 % slow; 7 µs on the 8.37 ms offset).
    const TpRaw = deepLod.lunisolarPrecessionPeriodYearsAtAge(tMa);
    const Tp = TpRaw === null ? certifiedAxialPrecessionJ2000Years() : TpRaw;
    const syS = solarYearSeconds(year);
    const syD = tropicalYearDays(year);
    const sidDay = siderealDaySeconds(year);
    // Layer A (plan 06): the RA projection reads the published ε (the one-source
    // hybrid), not the K comb — the browser's _sceneEpsTargetDeg twin; 1e-8 s.
    const raProjection = Math.cos((oneSourceM.epsAt(year) * Math.PI) / 180);
    return (syS / (syD + 1) / Tp / (syD + 1)) * raProjection + sidDay;
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
    // Plan 06 Phase 7 commit 2: the K device's integer axial and obliquity
    // fractions are retired. The eccentricity law's cycle period is the
    // chain's OWN g-mode beat (the dominant mode × largest companion of the
    // planet's eccentricity vector), its obliquity input the DERIVED J2000
    // obliquity of the spin channel (the IAU pole against the chain's J2000
    // plane, acute form) — both from the governed artifacts, no fractions.
    const wobble = computeSecularShape(/** @type {any} */ (CHAIN_ARTIFACT), k).beatYears;
    const il = FL.computeInclinationLaw({
      fibonacciD: mp.fibonacciD,
      massFrac: massFraction[k],
      invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
      longitudePerihelion: ar.longitudePerihelion,
      inclinationCycleAnchor: mp.inclinationCycleAnchor,
      antiPhase: mp.antiPhase || false,
    }, PSI);
    const obliquityDerived = computeObliquityJ2000Deg({
      spin: C.planetSpinPhysical[k],
      anchorInclEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].inclEclipticDeg,
      anchorAscNodeEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].ascNodeEclipticDeg,
      obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
    });
    const obliquityMean = Math.min(obliquityDerived, 180 - obliquityDerived);   // acute: the K law reads sin|ε|
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

  // ── The planets' spin channel (plan 06 Phase 7): the precession constant
  // from each planet's OWN torques (astro-reference planetSpinPhysical) on the
  // model's OWN orbit — the chain's J2000 a/e/plane and the deep ζ table —
  // integrated as dŝ/dt = α(ŝ·n̂)(ŝ×n̂) from the IAU J2000 pole. ONE home:
  // planets/spin-channel.cjs; built lazily per planet, pure in `year`.
  /** @type {Map<string, ReturnType<typeof createPlanetSpinChannelFromArtifacts>>} */
  const spinChannels = new Map();
  /** @param {string} k */
  const planetSpin = (k) => {
    if (!PLANET_KEYS.includes(k)) throw new Error(`planets.spin: unknown planet '${k}'`);
    let ch = spinChannels.get(k);
    if (!ch) {
      ch = createPlanetSpinChannelFromArtifacts({
        key: k,
        planetSpinPhysical: C.planetSpinPhysical,
        chainAnchorElements: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements,
        planetZeta: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZeta,
        massFractionOfSun: massFraction[k],
        gmSunKm3S2: GM_SUN,
        obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
      });
      spinChannels.set(k, ch);
    }
    return ch;
  };

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
  // the OF-DATE anchors (the H² counter's J2000 period — the Meeus/IERS
  // observables 3231.49 d / 6798.38 d)
  const moonApsidalOfDateJ2000Seconds = (totalDaysInH / nApsidalIJ2000) * meanLengthOfDay;
  const moonNodalOfDateJ2000Seconds = (totalDaysInH / nNodalIJ2000) * meanLengthOfDay;
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
      moonApsidalOfDateJ2000Seconds,
      moonNodalOfDateJ2000Seconds,
      moonSiderealMonthJ2000Seconds,
      sPerigee: MOON_ECC_SENSITIVITY_PERIGEE,
      sNode: MOON_ECC_SENSITIVITY_NODE,
    },
    fns: {
      meanLodSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.lodSecondsAtAge(tMa),
      meanSiderealYearSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.siderealYearSecondsAtAge(tMa),
      meanHAtAge: /** @param {number} tMa */ (tMa) => deepLod.hAtAge(tMa),
      // Decision (ii) (owner-approved MODEL CHANGE, plan 02 §8): the whole
      // lunar chain — this modulation, the integrated cycle counts it
      // drives, the arguments' eccAt/channelIntegral and the E-factor —
      // reads the ONE deep e. The era shift in the ancient eclipse stack is
      // accepted and rebaselined with its explanation (deep e is
      // La2004-corroborated in-era).
      modulation: /** @param {number} tMa @param {number} s */ (tMa, s) => deepEcc.modulation(tMa, s),
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

  // (The K snapshot-phase obliquity the lunar chain was certified against left
  // with layer A / item 3c: the arguments' carrier reads the published ε.)

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
      // Decision (ii): the lunar chain reads ONE deep e end to end
      eccE0: deepEcc.e0,
    },
    fns: {
      eccAt: /** @param {number} tYr */ (tYr) => deepEcc.eccAt(tYr),
      channelIntegral: /** @param {number} T @param {number} s */ (T, s) => deepEcc.channelIntegral(T, s),
      // Layer A / item 3c (plan 06): the arguments' obliquity carrier reads the
      // PUBLISHED ε (the one-source hybrid), not the K snapshot comb — one ε
      // everywhere. Twins: script.js (_sceneEpsTargetDeg), scene-graph.js.
      computeObliquityEarth: /** @param {number} year @returns {number} */ (year) => oneSourceM.epsAt(year),
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

  // Bounded Meeus E-factor from the ONE deep e (decision (ii); the
  // pure-Meeus polynomial A/B branch stays engine-local)
  /** @param {number} dDays @returns {number} */
  const fwEFactor = (dDays) => deepEcc.eFactorAt(dDays / C.foundational.inputmeanlengthsolaryearindays);

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
    // Plan 06 R1 — the Sun's mean longitude of date is the INTEGRAL of the
    // one-source tropical year: L(t) = L0 + 360·∫_{2000}^{t} dt′/T_trop(t′),
    // T_trop the route-B tropical year of date in SI seconds (the ONE
    // year-length family; the frozen era clock's tropicalYearDaysBase × LOD
    // and its comb ripple + torque term left here). MEASURED before the
    // move (tools/explore r1 probes, plan 06 record): the route-B tropical
    // year equals the IAU/Laskar drift expression to 0.1 s over −1000..+3000
    // while the era-clock year carried NO secular drift (+1.09 s flat), so
    // the former mean longitude wandered +12 min around 500 AD and diverged
    // −3.3 min/cy after 2100 against both Meeus ch. 27 and the one-source
    // integral — outside every eclipse and JPL gate. MODERN-WINDOW COST,
    // stated (plan 06 I1 corrected an earlier misreading of the cache's
    // clock): against the JPL Sun cache (UT instants, verified; the registry
    // instrument's bridge) the one-source Sun read 1.29″ sd in 1970–2049
    // where the era-clock Sun read 0.80″ — both carried ~0.02–0.03″/yr
    // trends against JPL over 1900–2100; accepted because over millennia
    // the era-clock Sun is minutes off. Plan 06 I2 located the trend: the
    // Earth–Mars–Jupiter long inequality (1783 yr, 6.3″) the smooth year
    // cannot carry — derived on the model's own N-body and shipped in the
    // planetary completion, the instrument reads 1.03″ (Horizons ±3000 yr:
    // modern-window mean +8.4 → +0.8″, per-millennium sd roughly halved).
    // NUMERICS (rate vs point value): a cumulative trapezoid table of
    // cycles, yearly inside ±20,000 yr and per century beyond, grown on
    // demand from 2000 in both directions and interpolated inside a cell —
    // never a rate multiplied by a span. Beyond the one-family window the
    // tidal-chain year continues the integrand (the scene overlay ends at
    // 20,000 yr; the finders refuse out-of-domain epochs upstream).
    const JULIAN_YEAR_S = 365.25 * 86400;
    const tropSec = oneFamilyTropicalYearSeconds;
    const FINE_SPAN = 20000, COARSE_STEP = 100;
    /** cycles from 2000 to 2000 ± i·step (fwd/bwd tiers) */
    /** @type {number[]} */ const fwdFine = [0];
    /** @type {number[]} */ const bwdFine = [0];
    /** @type {number[]} */ const fwdCoarse = [];
    /** @type {number[]} */ const bwdCoarse = [];
    /** UNSIGNED trapezoid cycles over the span between two years (Julian
     *  years → SI seconds over the one-family year); the caller applies the
     *  direction sign. @param {number} ya @param {number} yb @returns {number} */
    const segAbs = (ya, yb) => 0.5 * (Math.abs(yb - ya) * JULIAN_YEAR_S) * (1 / tropSec(ya) + 1 / tropSec(yb));
    /** signed cycles from 2000 to `year` @param {number} year @returns {number} */
    const cyclesTo = (year) => {
      const dy = year - 2000;
      const s = dy >= 0 ? 1 : -1, a = Math.abs(dy);
      // WARM THE SAMPLER TO THE TARGET FIRST (plan 06 R4, measured): the
      // table below grows outward in 1-yr / 100-yr steps, and every step
      // beyond ~1.6 Myr enlarged the one-family sampler's >2-Myr tier just
      // past its span, rebuilding the whole deep integration about every 32
      // steps — ~125 rebuilds and 22 s for the first deep-epoch call (the
      // scene's first jump to −5 Myr), 0.4 ms once built. One read at the
      // clamped target builds the tier at its final span; the grid stores
      // are endpoint-independent, so every value is bit-identical.
      tropSec(2000 + s * Math.min(a, ONE_FAMILY_WINDOW_YEARS));
      const fine = s > 0 ? fwdFine : bwdFine;
      const growFine = (/** @type {number} */ upto) => { while (fine.length <= upto) { const k = fine.length; fine.push(fine[k - 1] + s * segAbs(2000 + s * (k - 1), 2000 + s * k)); } };
      if (a <= FINE_SPAN) {
        const i = Math.floor(a), f = a - i;
        growFine(i + 1);
        return fine[i] + f * (fine[i + 1] - fine[i]);
      }
      growFine(FINE_SPAN);
      const coarse = s > 0 ? fwdCoarse : bwdCoarse;
      if (coarse.length === 0) coarse.push(fine[FINE_SPAN]);
      const c = (a - FINE_SPAN) / COARSE_STEP, ci = Math.floor(c), cf = c - ci;
      while (coarse.length <= ci + 1) { const k = coarse.length; const y0 = 2000 + s * (FINE_SPAN + (k - 1) * COARSE_STEP); coarse.push(coarse[k - 1] + s * segAbs(y0, y0 + s * COARSE_STEP)); }
      return coarse[ci] + cf * (coarse[ci + 1] - coarse[ci]);
    };
    return /** @param {number} year @returns {number} */ (year) => sunL0Deg + 360 * cyclesTo(year);
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
      eccentricityAt: sunEccentricityAt,
      perihelionLongitudeDegAt: sunPerihelionDegAt,
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
  // FQ-5 N3 — the completion's carriers are FRAMEWORK-derived from the
  // model's own planet period records (the Moon-elongation rate from the
  // sidereal month/year identity). Plan 06 I2 — the carriers are SIDEREAL
  // (measured): the records' solarYearInput are OF-DATE periods (their
  // rates sit +1.39..1.62°/cy above the VSOP sidereal mean motions — the
  // framework precession plus input rounding), and a perturbation argument
  // is inertial (D'Alembert: only Σk = 0 arguments are frame-free), so on
  // of-date carriers every Σk ≠ 0 argument drifted by Σk·ψ(t) — 42..52° at
  // −3000 for the table's Σk = −1 terms (their ancient scatter against
  // Horizons 6.4 → 4.4″ on sidereal carriers), and 6 % of frequency for the
  // 1783-yr long inequality (1683 yr on the of-date carriers). Constant-free:
  // the record rate minus the model's own J2000 precession p₀ =
  // 360·36525·(1/T_trop − 1/T_sid) for the planets, the framework sidereal
  // year for Earth; identical to the N3 carriers at J2000 (same phase
  // anchors), ≤ 1.4°·|Σk| apart at the 200-yr extraction window's edges
  // (the composed table reproduces the N3 one there: JPL 1900–2100
  // all-phase sd unchanged to 0.01″). The parity gate's fingerprint mirrors
  // this arithmetic (test/create-model-parity.test.mjs).
  const degPerCyOf = /** @param {number} cyclesPerDay */ (cyclesPerDay) => 360 * 36525 * cyclesPerDay;
  const carrierPrecessionDegPerCy = degPerCyOf(1 / meanSolarYearDays) - degPerCyOf(1 / meanSiderealYearDays);
  const carrierRatesDegPerCy = {
    planets: [
      degPerCyOf(1 / C.planetOrbitalElements.mercury.solarYearInput) - carrierPrecessionDegPerCy,
      degPerCyOf(1 / C.planetOrbitalElements.venus.solarYearInput) - carrierPrecessionDegPerCy,
      degPerCyOf(1 / meanSiderealYearDays),
      degPerCyOf(1 / C.planetOrbitalElements.mars.solarYearInput) - carrierPrecessionDegPerCy,
      degPerCyOf(1 / C.planetOrbitalElements.jupiter.solarYearInput) - carrierPrecessionDegPerCy,
      degPerCyOf(1 / C.planetOrbitalElements.saturn.solarYearInput) - carrierPrecessionDegPerCy,
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
    // plan 06 R3 item 1: the location tier on APPARENT places — the Sun's derived κ
    // (the same helper the cardinal instants use), the Moon's relative light-time
    // inside the besselian; the series-extension tail now lives in sceneEvalAt.
    sunAberrationDegAt: /** @param {number} year */ (year) => sunAberrationArcsecAt(year) / 3600,
    deltaTSecondsAt: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
    obliquityDegAt: obliquityDeg,
    eccentricityAt: sunEccentricityAt,
    perihelionLongitudeDegAt: sunPerihelionDegAt,
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
      speedOfLightKmS: C.physicalConstants.speedOfLight,
    },
  });

  // ── The assembled surface ─────────────────────────────────────────────────
  // Plan 06 Phase 3 S2 — THE published of-date precession period and mean
  // tropical year: the one-family route (B) inside the banked tiers
  // (|Δyear| ≤ ONE_FAMILY_WINDOW_YEARS), the composed lunisolar period
  // beyond (S5: on the derived J2000 anchor, so the two faces agree at
  // 25,771.4 at J2000 and the deep tail is the same clock scaled; the
  // tidal-chain year). Shared by `epoch` and `lunisolar`.
  /** @param {number} year @returns {number} */
  const publishedAxialPrecessionYearsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.axialPrecessionYearsAtYear(year);
    const p = deepLod.lunisolarPrecessionPeriodYearsAtAge(yearToTMa(year));
    return p === null ? certifiedAxialPrecessionJ2000Years() : p;
  };
  /** @param {number} year @returns {number} */
  const publishedTropicalYearSecondsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.tropicalYearSecondsAtYear(year);
    return deepLod.tropicalYearSecondsAtAge(yearToTMa(year));
  };
  // ── Cardinal instants (plan 06 R1) ─────────────────────────────────────
  /** The completed certified Sun (finder Sun − the derived planetary
   *  completion) at a UT model-JD — the same longitude the scene renders
   *  inside the overlay window; MEAN GEOMETRIC, mean equinox of date.
   *  @param {number} jdUT @returns {number} */
  const sunLonCompletedDegAtJdUT = (jdUT) => eclipseFinders.sunLonDegAt(jdUT)
    - sunPlanetaryCompletionDeg((jdTTFromUT(jdUT) - j2000JD) / julianCenturyDays);
  /** The APPARENT Sun the cardinal instants are defined on (an equinox is
   *  the apparent Sun crossing the equator — the USNO/Meeus instants are
   *  apparent): the completed geometric Sun minus the aberration constant,
   *  plus the nutation in longitude. Both derived, zero new constants —
   *  κ = 2π·a/(c·T_sid·√(1−e²)) from the AU, c, the one-family sidereal year
   *  and the Sun's e (20.50″ at J2000); Δψ from the four IAU 1980 leading
   *  terms on the model's OWN lunar node, mean Sun and mean Moon (the
   *  framework arguments), the same family the registry's JPL Sun
   *  instrument bridges with. @param {number} jdUT @returns {number} */
  /** The Sun's derived aberration constant of date, arcsec — κ = 2π·a/(c·T_sid·√(1−e²))
   *  from the AU, c, the one-family sidereal year and the Sun's e (20.50″ at
   *  J2000); ONE home for the cardinal instants and the eclipse location tier.
   *  @param {number} year @returns {number} */
  const sunAberrationArcsecAt = (year) => {
    const e = sunEccentricityAt(year);
    return (2 * Math.PI * currentAUDistance
      / (C.physicalConstants.speedOfLight * yearLengthsM.siderealYearSecondsAtYear(year) * Math.sqrt(1 - e * e)))
      * (648000 / Math.PI);
  };
  /** @param {number} jdUT @returns {number} */
  const sunApparentLonDegAtJdUT = (jdUT) => {
    const jdTT = jdTTFromUT(jdUT);
    const year = 2000 + (jdTT - j2000JD) / 365.25;
    const kappaArcsec = sunAberrationArcsecAt(year);
    const a = moonArgs.argsAt(jdTT);
    const d2r = Math.PI / 180;
    const Om = (a.Lp - a.F) * d2r, Ls = (a.Lp - a.D) * d2r, Lm = a.Lp * d2r;
    const NU = C.physicalConstants.nutationLeadingTermsArcsec;
    const dPsiArcsec = NU.psiOmega * Math.sin(Om) + NU.psi2Ls * Math.sin(2 * Ls)
      + NU.psi2Lm * Math.sin(2 * Lm) + NU.psi2Omega * Math.sin(2 * Om);
    return sunLonCompletedDegAtJdUT(jdUT) + (dPsiArcsec - kappaArcsec) / 3600;
  };
  /** @param {string} type @returns {number} */
  const cardinalTargetDeg = (type) => {
    const t = { VE: 0, SS: 90, AE: 180, WS: 270 }[type];
    if (t === undefined) throw new RangeError(`cardinal type must be VE|SS|AE|WS, got ${type}`);
    return t;
  };
  const CARDINAL_SI_YEAR_D = 365.2422;
  /** The crossing NEAREST a seed instant — the unique root within ±½ tropical
   *  year of the seed (the wrapped longitude difference is the Newton residual).
   *  Plan 06 R4c: the seed is a JD because the caller's year may live on a
   *  different axis than the model year — the simulator's cardinal panel
   *  labels its year with the displayed CALENDAR date (the Julian calendar
   *  before 1582, 365.25-d years) while `year` below is the model year (the SI
   *  axis, 365.2422-d count from J2000); the two part by 0.0078 d/yr, 114 yr at
   *  −5.34 Myr, where the panel showed the events of −5341772 for a date in
   *  −5341886 (owner). Seeding at the calendar year's midpoint returns that
   *  year's own events at every epoch. @param {number} jdSeedUT @param {string} type @returns {number} */
  const cardinalCrossingNearJdUT = (jdSeedUT, type) => {
    const target = cardinalTargetDeg(type);
    const RATE = 360 / CARDINAL_SI_YEAR_D;
    let jd = jdSeedUT;
    for (let i = 0; i < 20; i++) {
      const d = ((((sunApparentLonDegAtJdUT(jd) - target) + 540) % 360 + 360) % 360) - 180;
      jd -= d / RATE;
      if (Math.abs(d) < 1e-10) break;
    }
    return jd - C.earthOrbital.deltaTStart / 86400;
  };
  /** The TRUE-UT JD at which the APPARENT Sun's longitude of date equals
   *  the cardinal target in the given year — Newton on the crossing (the
   *  Sun's rate 360°/tropical year; a handful of steps from the tropical-year
   *  seed). Replaces the fitted cardinal model's instants (R1). Plan 06 R3
   *  item 2: the Newton root lives on the FINDER axis (the curve-only ΔT the
   *  eclipse finders certify), and the returned instant is that root minus the
   *  deltaTStart bridge — true UT = TT − (deltaTStart + curve), the same
   *  bridge the besselian and the registry instruments apply. Before this the
   *  published instants were 54.55 s (0.9 min) late. Against Horizons over
   *  ±3000 yr the remaining offset is the Sun's (plan 06 I2 measured).
   *  `year` is the MODEL year (the SI axis) — see cardinalCrossingNearJdUT.
   *  @param {number} year @param {string} type @returns {number} */
  const cardinalCrossingJdUT = (year, type) => {
    const target = cardinalTargetDeg(type);
    // seed: Jan 1.5 of the year (J2000 = 2000 Jan 1.5) + the mean date of the
    // March equinox (day 79.3) + the quarter-turns to the target
    const seed = j2000JD + (year - 2000) * CARDINAL_SI_YEAR_D + 79.3 + (target / 360) * CARDINAL_SI_YEAR_D;
    return cardinalCrossingNearJdUT(seed, type);
  };

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
      // D6: OF-DATE — mass-loss law / the banked planetary λ̇ ratio
      // (identical at J2000 where the ratio ≡ 1 by construction)
      siderealYearSecondsAtYear: /** @param {number} year @returns {number} */ (year) => yearLengthsM.siderealYearSecondsAtYear(year),
      deltaTSecondsAtYear: deltaTSeconds,
      cyclesBetween,
      // Plan 06 Phase 3 S2 — THE published of-date precession period is the
      // one-family route (B): the hybrid's own equinox regression against
      // the λ̇-corrected sidereal year (~25,771 yr at J2000 ≈ IAU), inside
      // the banked tiers (|Δyear| ≤ ONE_FAMILY_WINDOW_YEARS); beyond, the
      // composed lunisolar period on the same J2000 anchor (S5; the
      // of-date wobble is unresolved there). The comb family's beat
      // sid/(sid − tropicalYearDirectDays) — the frozen era clock's
      // kinematic-day device — is no longer published here; it still
      // anchors the lunar chain's (d′) rate completion (pDynDegPerYearAt,
      // a MATCHED TRIPLE with the eclipse gates: M0(a) measured a 3–15 min
      // lunar-timing shift if it moved).
      axialPrecessionYearsAtYear: publishedAxialPrecessionYearsAtYear,
      // The same publication rule for the mean tropical year of date (SI s):
      // one-family inside the window, the tidal-chain mean beyond.
      tropicalYearSecondsAtYear: publishedTropicalYearSecondsAtYear,
    }),
    // Plan 06 Phase 3 S3 → S5 — the lunisolar precession clock as a
    // first-class surface: Earth's spin clock, ONE home for its published
    // faces, spoken in PERIODS and their RATIOS — no unit, no integer.
    // ONE J2000 reading (S5): every face reads 25,771.4 yr at J2000 — the
    // of-date period (the published family, seamed at ±2 Myr) and the
    // composed mean T_p(t) (the deep-time clock, anchored on the same
    // derived value). The composition's terms; the apsidal period from the
    // engine-D chain's secular tangent; the two ratios the owner found
    // wandering by hand — T_aps/T_p (4.33 at J2000, 0.84 … 9.9 across
    // ±26 kyr) and T_peri/T_p with T_peri = 1/(1/T_p + 1/T_aps) the
    // perihelion-of-date period (0.812 at J2000) — on the of-date T_p.
    lunisolar: Object.freeze({
      /** The mean lunisolar precession period T_p(t), years — the composed torque rate's period on the derived J2000 anchor (25,771.4 at J2000). @param {number} year @returns {number} */
      meanPeriodYearsAtYear: (year) => { const p = deepLod.lunisolarPrecessionPeriodYearsAtAge(yearToTMa(year)); return p === null ? certifiedAxialPrecessionJ2000Years() : p; },
      /** The composed rate ψ̇(t) = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³], ″/yr (p₀ = 50.2883, derived). @param {number} year @returns {number} */
      meanRateArcsecPerYrAtYear: (year) => { const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year)); return r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r; },
      /** The of-date period — the one-family beat inside ±2 Myr, the composed mean beyond. @param {number} year @returns {number} */
      ofDatePeriodYearsAtYear: publishedAxialPrecessionYearsAtYear,
      /** f_S, the solar fraction of the J2000 precession torque. */
      solarShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
      /** (a₀/a_M(t))³ — the lunar torque's growth on the recession history. @param {number} year @returns {number} */
      lunarTorqueFactorAtYear: (year) => { const f = deepLod.lunarTorqueFactorAtAge(yearToTMa(year)); return f === null ? 1 : f; },
      /** f_S + (1 − f_S)(a₀/a_M)³ — the torque term the unit divides H_era by. @param {number} year @returns {number} */
      torqueTermAtYear: (year) => { const t = deepLod.precessionTorqueTermAtAge(yearToTMa(year)); return t === null ? 1 : t; },
      /** The hybrid's precession constant α = p₀ / cos ε₀, ″/yr (p₀ the derived J2000 rate, ε₀ the J2000 obliquity input; 54.81). */
      torqueConstantJ2000ArcsecPerYr: (1296000 / certifiedAxialPrecessionJ2000Years()) / Math.cos((C.earthOrbital.obliquityJ2000_deg * Math.PI) / 180),
      /** |s₃|, the dominant nodal mode of Earth's orbit — the largest-amplitude ζ mode of the banked deep secular modes, ″/yr (18.85; the obliquity beat's partner). ONE home for the registry, the browser and the API. */
      nodalModeS3ArcsecPerYr: s3ArcsecPerYr,
      /** The ecliptic (nodal) precession period 1,296,000/|s₃|, years (68,751) — an orbital quantity, fixed at every epoch at the two-body level. */
      nodalPeriodYears: 1296000 / s3ArcsecPerYr,
      /** The obliquity beat 2π/(ψ̇(t) − |s₃|), years — the SHIPPED deep-time obliquity period (falsification leg 1; 41,224 at J2000, on the composed rate). @param {number} year @returns {number} */
      obliquityBeatYearsAtYear: (year) => {
        const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
        const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
        return 1296000 / (psiDot - s3ArcsecPerYr);
      },
      /** The apsidal (perihelion vs the stars) period from the engine-D chain's secular tangent, years — inside the published window only (the tangent is an extrapolation beyond the banked series: it turns negative at −5 Myr); null beyond. @param {number} year @returns {number|null} */
      apsidalPeriodYearsAtYear: (year) => (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS ? 360 / computeApsidalSecularDegPerYr(year, kcChainsM.earth, kcChainsM) : null),
      /** T_aps(t) / T_p(t) — the apsidal period in of-date precession periods (4.33 at J2000, a reading; 0.84 … 9.9 across ±26 kyr, measured); null beyond the published window. @param {number} year @returns {number|null} */
      apsidalPerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        return (360 / computeApsidalSecularDegPerYr(year, kcChainsM.earth, kcChainsM)) / publishedAxialPrecessionYearsAtYear(year);
      },
      /** T_peri(t) = 1/(1/T_p + 1/T_aps) — the perihelion-of-date period (equinox precession + inertial perihelion motion, frame arithmetic at every epoch), years, on the of-date T_p; null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePeriodYearsAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = 360 / computeApsidalSecularDegPerYr(year, kcChainsM.earth, kcChainsM);
        return 1 / (1 / tp + 1 / taps);
      },
      /** T_peri(t) / T_p(t) (0.812 at J2000 — the J2000 reading); null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = 360 / computeApsidalSecularDegPerYr(year, kcChainsM.earth, kcChainsM);
        return (1 / (1 / tp + 1 / taps)) / tp;
      },
      /** The published of-date window, years from 2000. */
      publishedWindowYears: ONE_FAMILY_WINDOW_YEARS,
    }),
    earth: Object.freeze({
      perihelionLongitudeDeg: earthPerihelionDeg,
      // Plan 06 Phase 3 S3b: THE published obliquity is the hybrid — one
      // torque law integrated on the dynamical orbit plane of the N-body
      // chain, zero fitted constants (≡ La2004 to ≤ 4″ over ±50 kyr). The
      // fitted 16-harmonic K comb, a device fitted to the scene's own
      // wheel geometry (0.005″ to it, 1.27° off La2004 at −20 kyr), keeps
      // its name below as the frozen era clock's device: it anchors the
      // hybrid at J2000, the kinematic-day stack and the lunar arguments.
      obliquityDeg: /** @param {number} year @returns {number} */ (year) => oneSourceM.epsAt(year),
      obliquityCombDeg: obliquityDeg,
      eccentricity: eccentricityAt,
      inclinationDeg,
      ascendingNodeDeg,
    }),
    // The DEVICE family (plan 06 Phase 3 S2): the frozen era clock's comb
    // year lengths (A), its cardinal 4-mean (A′) and the kinematic-day stack
    // built on them (the ΔT stack's Layer 3/4 basis, USNO-anchored). NOT the
    // published year lengths — those are `yearLengths` (the one-family
    // route) and the seamed `epoch.*AtYear` surfaces above.
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
    // Plan 06 R1: the instants are the crossings of the ONE Sun (the
    // certified completed Sun the scene renders), UT model-JD; the RA at a
    // crossing is the target longitude by construction (λ = 0/90/180/270 ⇒
    // RA = 0/90/180/270, any obliquity); the per-type year length is the
    // interval between successive crossings (SI days).
    cardinal: Object.freeze({
      jd: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalCrossingJdUT(year, type),
      // R4c: the crossing nearest a UT instant (a JD seed — for callers whose
      // year coordinate is not the model year, e.g. a calendar year's midpoint).
      jdNearUT: /** @param {number} jdUT @param {string} type @returns {number} */ (jdUT, type) => cardinalCrossingNearJdUT(jdUT, type),
      raDeg: /** @param {number} year @param {string} type @returns {number} */ (year, type) => { void year; return cardinalTargetDeg(type); },
      yearLengthDays: /** @param {number} year @param {string} type @returns {number} */ (year, type) => cardinalCrossingJdUT(year + 1, type) - cardinalCrossingJdUT(year, type),
    }),
    // D4b: the one-source cardinal STRUCTURE — the EoC layer on the
    // movement's own e(t)/ϖ(t), valid at every epoch (mode tier). Absolute
    // dates deliberately absent; `cardinal` above stays the certified era
    // device for those.
    cardinalStructure: Object.freeze({
      // D6: year LENGTHS gain the λ̇ drift coherently (rate-form
      // correction — beats stay invariant); offsets/spreads keep the raw
      // form (μs-class / second-order there).
      yearLengthSeconds: /** @param {number} year @param {'VE'|'SS'|'AE'|'WS'} type @returns {number} */ (year, type) => yearLengthsM.cardinal.yearLengthSeconds(year, type),
      eocOffsetSeconds: /** @param {number} year @param {'VE'|'SS'|'AE'|'WS'} type @returns {number} */ (year, type) => yearLengthsM.cardinal.eocOffsetSeconds(year, type),
      spreadSeconds: /** @param {number} year */ (year) => yearLengthsM.cardinal.spreadSeconds(year),
      anomalisticYearSeconds: /** @param {number} year @returns {number} */ (year) => yearLengthsM.anomalisticYearSecondsAtYear(year),
    }),
    // THE ONE of-date year-length family + its beats (S2; SI seconds) —
    // the single surface the panel, charts, API and website consume.
    yearLengths: yearLengthsM,
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
      // The COMPLETED tier Sun (K8b follow-up, owner-approved injection):
      // the bare finder Sun minus the DERIVED planetary-completion table —
      // 70 framework-carrier terms plus the 6.44″ Earth-around-EMB wobble
      // (the "lunar equation"; eclipse/sun-planetary-completion.cjs, zero
      // fitted constants). The finders themselves deliberately stay bare
      // (their certified canon statistics were produced on the bare form;
      // besselian.cjs applies the same subtraction internally). This
      // surface exists for the SCENE tier's E5 wheel-Sun bridge, so the
      // rendered Sun carries the model's own derived apparent-class terms.
      // Clock: the completion argument rides TT centuries from the same
      // framework ΔT the besselian composition uses.
      sunLonCompletedDegAtJD: /** @param {number} jd @returns {number} */ (jd) =>
        eclipseFinders.sunLonDegAt(jd)
        - sunPlanetaryCompletionDeg((jdTTFromUT(jd) - j2000JD) / julianCenturyDays),
      /** The APPARENT Sun (completed geometric − the derived aberration constant + the leading nutation terms on the model's own arguments) — the quantity Horizons' observer ecliptic longitude is; the cardinal instants are its crossings (plan 06 R1/I1). @param {number} jdUT @returns {number} */
      sunApparentLonDegAtJD: /** @param {number} jdUT @returns {number} */ (jdUT) => sunApparentLonDegAtJdUT(jdUT),
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
        eccentricityAt: sunEccentricityAt,
        perihelionLongitudeDegAt: sunPerihelionDegAt,
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
      spin: planetSpin,
    }),
  });
}
