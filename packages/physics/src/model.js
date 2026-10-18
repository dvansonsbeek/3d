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
import { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear } from './planets/keplerian-chain.cjs';
import { createSecularSeriesOverride } from './planets/secular-series.cjs';
import { computeEquatorNodeOriginSFrameDeg, convertNodeSFrameToEquatorOriginDeg } from './planets/inv-plane-frame.cjs';
import { createYearLengths, computeMeanTropicalYearJ2000Days, ONE_FAMILY_WINDOW_YEARS } from './earth/year-lengths.cjs';
import { createDeepOrbitalHistory } from './earth/deep-orbital-history.cjs';
import { CHAIN_ARTIFACT } from './planets/chain-artifact.js';
import { createPlanetSpinChannelFromArtifacts, computeObliquityJ2000Deg } from './planets/spin-channel.cjs';
import { PLANET_DISPLAY_NAMES } from './planets/display-names.cjs';
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
import { createSunPlanetaryCompletion, computeCarrierRatesDegPerCy } from './eclipse/sun-planetary-completion.cjs';
import { createEclipseFinders } from './eclipse/finders.cjs';
import { createBesselian } from './eclipse/besselian.cjs';
import { driver2PeriodSecondsAtAge } from './planets/orbit-chain.cjs';

/**
 * RA-day-offset Fourier amplitudes (ms). KNOWN EXCEPTION carried over from
 * the reference adapters: these are fit results that live as literals in the
 * engine too — packaging them into FITTED_COEFFICIENTS is the remaining
 * §7a-step-1b move; until then this is their single packaged home.
 */
// (Plan 07 R10 moved the RA day offset's two cosine amplitudes from literals
// here into F.RA_DAY_OFFSET_MS; plan 09 step 5b deleted that family — it was
// the equation of time's window term of an instrument, not a motion.)

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
 * @param {{ giaEllipticityOfDate?: boolean }} [options]
 *   `giaEllipticityOfDate: false` builds the one-source history WITHOUT the J₂(t)/J₂₀ factor of date
 *   (the ice-driven GIA channel, which rides the climate formula's own post-MPT layer): the orbital
 *   FORCING alone. The T1 exporter derives the climate lines' obliquity rate on it, so the lines
 *   cannot depend on their own fit (v23.0; measured 3e-5 of the rate, 2–3 yr of period). Default true =
 *   the shipped physics (v15.0), bit-identical to before this parameter existed.
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon) — type inferred so ReturnType stays precise
 */
export function assembleModel(C, F, laws = {}, secularSeriesArtifact = /** @type {any} */ (null), options = {}) {
  // ── Derived constants (constants.js §9 order) ─────────────────────────────
  // (plan 09 step 7b: `foundational.holisticyearLength` — the unit H — is no
  // longer read here; the unit function left the physics with it)
  // Plan 09: the mean solar year in days (the calendar's year axis) is the
  // J2000 mean tropical year DERIVED in one home from the IAU sidereal year
  // and p_A per Julian year (year-lengths.cjs); the Meeus & Savoie 1992 input
  // 365.2421897 left the registry, the device's rounding onto 1/(H/8) before it.
  const meanSolarYearDays = computeMeanTropicalYearJ2000Days(C.yearLengthRef.siderealYear, C.earthOrbital.generalPrecessionJ2000_arcsecPerYr);
  // Plan 11 step 5: the scene epoch's ONE home — astro-reference
  // timeReference.sceneEpochJD / sceneEpochYear (moved verbatim from the
  // deleted foundational block); correctionDays is deleted, so the SI-year
  // axis below anchors on the epoch itself.
  const startmodelYear = C.timeReference.sceneEpochYear;
  const startmodelJD = C.timeReference.sceneEpochJD;
  // Plan 07 R10: the correction combs measure their phase from J2000. The
  // former origin — perihelionalignmentYear − temperatureGraphMostLikely ×
  // H/16 = −302,635, the "balanced year" — was rotated out of every fitted
  // (sin, cos) pair exactly (tools/fit/reorigin-combs-j2000.mjs; measured
  // bit-identical on every surface over ±300 kyr); it is no longer an input.
  // Plan 09 step 5b: the J2000 comb origin's last reader (the RA day offset
  // comb) left with that device; no comb phase is evaluated here any more.

  const meanSiderealYearDays = C.yearLengthRef.siderealYear;
  const meanSiderealYearSeconds = meanSiderealYearDays * 86400;
  // Plan 09: the J2000 day length ω₀ is the SI day (an input); the device's
  // H/13 kinematic-sidereal-days construction (86,399.99968 s) is deleted.
  const meanLengthOfDay = C.yearLengthRef.solarDay;
  const meanTropicalYearJ2000Seconds = meanSolarYearDays * meanLengthOfDay;
  // Plan 09: THE J2000 precession anchor p₀ in days (Julian years) — the IAU
  // 2006 general precession; the Moon's star-referenced periods read it.
  const axialPrecessionJ2000Days = (1296000 / C.earthOrbital.generalPrecessionJ2000_arcsecPerYr) * 365.25;

  // Plan 07 R5/R6/R9: `earthtiltMean`, `earthInvPlaneInclinationAmplitude`
  // and `eccentricityAmplitude` were read here only to invert the K and ψ
  // constants from Earth's calibration and to build the H/3 inclination
  // device. With both laws retired nothing in this module reads them — they
  // remain on C.earth as the K device's J2000 pose inputs (the scene's wheel
  // geometry at the chain anchor epoch) and for the registry's record keys.
  // (Plan 09: the 16-harmonic solstice-obliquity comb — SOLSTICE_OBLIQUITY_
  // MEAN_FITTED / _HARMONICS, the frozen era record — is deleted; the model's
  // ONE obliquity of date is the one-source hybrid, `oneSourceM.epsAt`.)

  const G_CONSTANT = C.physicalConstants.G_CONSTANT;
  const MASS_RATIO_EARTH_MOON = C.physicalConstants.MASS_RATIO_EARTH_MOON;
  const currentAUDistance = C.physicalConstants.currentAUDistance;
  const earthMoiFactorJ2000 = C.physicalConstants.earthMoiFactorJ2000;
  const moonDistanceKm = C.moonReference.moonDistance;
  const moonSiderealMonthInput = C.moonReference.moonSiderealMonthInput;

  // Plan 09: the Moon's sidereal month is the IAU input itself (the device's
  // eighth-integer-per-8H count read it back 7.8 ms long; deleted).
  const moonSiderealMonth = moonSiderealMonthInput;

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
    // the channel's second observable, J₂(t)/J₂₀ — scaled on the OBSERVED
    // dJ₂/dt; consumed by the spin integration below (the precession of date)
    j2RateJ2000PerYr: C.deepTime.j2RateJ2000PerYr,
    j2J2000: C.physicalConstants.earthJ2,
  });

  // Exact-argument memo (mirrors src/script.js + tools/lib/deep-time.js —
  // the round-5 perf campaign): same tMa → bit-identical value; bounded by
  // wholesale clear. (Plan 09 step 7a: the lattice-α pin branch left with
  // the ∫dt/H_era phase table, the one table this model built under it.)
  /** @type {Map<number, number>} */
  const alphaMemo = new Map();
  /** @param {number} tMa @returns {number} */
  const earthMoiFactorAtAge = (tMa) => {
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
    meanSiderealYearSeconds,
    lodJ2000Seconds: meanLengthOfDay,   // plan 09: ω₀ = the SI day (was the H/13 kinematic day)
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
    // p₀'s period — the tropical year of date's equinox term (plan 09 step 5d)
    axialPrecessionJ2000Years: certifiedAxialPrecessionJ2000Years(),
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

  /** THE REALIZED POLE RATE OVER A WINDOW, ″/yr — the mean over [yearFrom, yearTo] of the rate the spin
   *  integration actually turns the pole at: the inertial secular rate of date × the solar-torque factor at
   *  e(t) × J₂(t)/J₂₀ × cos ε(t)/cos ε₀ (ds/dt = α (ŝ·n̂)(ŝ×n̂): the azimuthal rate about n̂ is α cos ε).
   *  Measured (2026-10): the dominant obliquity line of the model's own ε(t) over the last 5 Myr sits at
   *  this mean minus |s₃| (40,938 fitted vs 40,936 predicted), NOT at the J2000 beat (41,098) — the pole
   *  turned faster in the past (spin +0.06 ″/yr over 5 Myr, lower mean obliquity +0.05, higher mean
   *  eccentricity +0.015); La2004's own series reads the same (40,917). The climate records' preferred
   *  "+0.12…+0.20 ″/yr on the obliquity lines" is this window mean (50.515 over the LR04 record).
   *  Calls the one-source history and the deep-time LOD declared below (evaluated at call time).
   *  `ellipticity: false` leaves the J₂(t)/J₂₀ factor out: that factor is the ice-driven GIA channel, which
   *  rides the climate formula's own post-MPT layer — the one piece that would make the climate LINES
   *  depend on their own fit (measured: its LR04-window mean moved 1 − 3e-5 → 1 across one refit,
   *  1.4e-3 ″/yr, 1 yr of period). The line derivation (the T1 exporter) excludes it; the published
   *  realized period and the hybrid verdict's gate keep the full rate.
   *  @param {number} yearFrom @param {number} yearTo @param {number} [stepYears=500]
   *  @param {{ellipticity?: boolean}} [opts] @returns {number} */
  const spinAxisInertialRateMeanArcsecPerYr = (yearFrom, yearTo, stepYears = 500, opts = {}) => {
    const useEllipticity = opts.ellipticity !== false;
    const lo = Math.min(yearFrom, yearTo), hi = Math.max(yearFrom, yearTo);
    const cosEps0 = Math.cos(oneSourceM.epsAt(2000) * Math.PI / 180);
    const kInertial = certifiedAxialPrecessionJ2000Years() / oneSourceM.axialPrecessionYearsLunisolarJ2000;
    let sum = 0, n = 0;
    for (let y = lo; y <= hi; y += stepYears) {
      const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(y));
      const psiDot = (r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r) * kInertial;
      const f = oneSourceM.precessionOfDateFactorsAt(y);
      sum += psiDot * f.solarTorque * (useEllipticity ? f.ellipticity : 1) * Math.cos(oneSourceM.epsAt(y) * Math.PI / 180) / cosEps0;
      n++;
    }
    return sum / n;
  };

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
      lodNowH13Seconds: EPOCH_PARAMS.lodNowH13Seconds,
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      solarMassLossFracPerYear: EPOCH_PARAMS.solarMassLossFracPerYear,
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
    cycleLodSumAt: dtCycleLodCorrectionSum,
    swingLodAt: (year) => dtCycles.swingLodSecondsAt(year),
    swingLodRateAt: (year) => dtCycles.swingLodRateAt(year),
    lEmAtAgeKgm2S: solarBudget.lEmAtAgeKgm2S,
  });

  // (Plan 09 step 7a: the integrated ∫dt/H_era phase table and its counter
  // `cyclesBetween` — the frozen era clock's own convention H_era =
  // H₀·LOD/LOD₀, plan 06 D8's second named counter, which every FROZEN comb
  // read — are DELETED with the last comb; `epoch.cyclesBetween` left the
  // surface with them, no reader remained. Step 5b: `phaseRadians` left with
  // the RA day offset comb.)

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
  // Plan 09: the obliquity of date is the one-source hybrid everywhere — the
  // eclipse tier (besselian deps) read the retired 16-harmonic comb here.
  /** @param {number} year @returns {number} */
  const obliquityDeg = (year) => oneSourceM.epsAt(year);
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
  // observed −4.20e-5 while this law reads −4.31e-5 (Phase-0 record: the
  // H/3-law candidate instrument, deleted at plan 09 step 7e — docs/109 §22;
  // JPL Sun 1.49″, registry 0.80″, syzygy 3.72″). Consumers (engine-switch decision (ii) restatement,
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
  // cardinal braid) reads the one-source series below (plan 06 layer B —
  // the two agree within 4.2e-5 in-era). The laws hook deliberately does
  // NOT reach this channel.
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
  // (Plan 07 R5/R9: Earth's H/3 inclination cosine and −H/5 linear node — the
  // K device — stood here; `inclinationDeg`/`ascendingNodeDeg` are now the
  // one-source construction defined with the planets' chain evaluators below.)

  // ── Year/day lengths ──────────────────────────────────────────────────────
  // Plan 09: the three year-length combs (TROPICAL/SIDEREAL/ANOMALISTIC_
  // YEAR_HARMONICS on the frozen era clock's bases) and their evaluators
  // are deleted. The year lengths of date in DAYS are the published SI year
  // lengths over the kinematic day of date; the kinematic day of date is the
  // Layer-0 tidal mean LOD, exactly ω₀ (the SI day) at J2000 — the former
  // "sidereal seconds over comb days" carried the λ̇ ripple of the sidereal
  // year as a day-length ripple (≤ 0.1 ms in the era, 0.66 ms at ±26 kyr).
  /** THE J2000 precession anchor p₀ (plan 09): the IAU 2006 general
   * precession in longitude at J2000 (astro-reference.json
   * earthOrbital.generalPrecessionJ2000_arcsecPerYr = 50.28796195 ″/yr),
   * stated as the period 1,296,000/p_A = 25,771.575 Julian years. ONE home:
   * the composed clock's p₀, the hybrid's self-anchor and the lunisolar
   * surface all read it. Before plan 09 it was the retired year combs' beat
   * at 2000 (plan 06 S5: 25,771.395 yr, 8 ppm faster); the H/13 reading
   * (25,793.6) was the fit anchor's, not a period. The identifier keeps its
   * name. @returns {number} */
  function certifiedAxialPrecessionJ2000Years() {
    return 1296000 / C.earthOrbital.generalPrecessionJ2000_arcsecPerYr;
  }
  /** Kinematic day of date (Layer 0 tidal mean LOD; ω₀ at J2000). Past the
   *  tidal-lock asymptote the chain is null — the J2000 day stands in, as
   *  the retired comb base did. @param {number} year @returns {number} */
  const dayLengthSeconds = (year) => deepLod.lodSecondsAtAge(yearToTMa(year)) ?? meanLengthOfDay;
  /** Sidereal year of date in days of the epoch — the published SI sidereal
   *  year (the λ̇ channel inside the one-family window, the mass-loss law
   *  beyond) over the kinematic day of date. @param {number} year @returns {number} */
  const siderealYearDays = (year) => publishedSiderealYearSecondsAtYear(year) / dayLengthSeconds(year);
  /** Anomalistic year of date in days of the epoch — the published SI
   *  anomalistic year (one-family inside its window; NaN beyond, where the
   *  movement's apsidal line is not resolved). @param {number} year @returns {number} */
  const anomalisticYearDays = (year) => {
    const s = Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS ? yearLengthsM.anomalisticYearSecondsAtYear(year) : NaN;
    return s / dayLengthSeconds(year);
  };
  // (Plan 09 step 5b: raDayOffsetMs — the fitted RA_DAY_OFFSET_MS comb, a −14.194 ms
  // mean + lines on H/16 and H/8 — and measuredSolarDaySeconds = dayLength + that
  // offset are deleted. The quantity was the equation of time's window term of the
  // Framework-Verification instrument: 365 solar noons counted from the June
  // solstice end 0.2422 d short of the tropical year, so the mean noon-to-noon
  // interval differs from the mean solar day by −(0.2422/365)·dEoT/dt at the
  // solstice — the e·cos(90° − ϖ) term on the perihelion-of-date cycle (the comb's
  // "H/16" line, 5.6 ms vs 5.2 first-order) and the tan²(ε/2) term on the obliquity
  // cycle (the "H/8" line, 1.7 vs 1.4). A property of the window, not of the sky:
  // the physical day of date is dayLengthSeconds; the equation of time is the
  // certified Sun's. docs/11 § "The retired RA day offset".)

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
  // The ONE-SOURCE movement: the hybrid's ε(t) (plan 06 Phase 3 S3b — THE
  // published obliquity) and the one-family year lengths, on the same
  // per-tier sampler.
  const oneSourceM = (() => {
    const AEarth = /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements.earth;
    // The ψ̇ anchor: the IAU 2006 general precession p_A (plan 09; 25,771.575
    // yr — the ONE home certifiedAxialPrecessionJ2000Years, twins in
    // tools-lib and the browser). History: plan 06 S5 anchored it on the
    // certified year combs' beat at 2000 (25,771.4); before that the device's
    // mean pair (meanSiderealYearDays/meanSolarYearDays → 25,796) anchored
    // this movement's realized precession 25 yr off — the hidden split behind
    // the API's 365.242204 tropical mean (found in the owner's
    // one-implementation drive).
    const axial0 = certifiedAxialPrecessionJ2000Years();   // S5: the ONE home
    // D6 → Phase 3 (plan 06): the deep-time ψ̇(t) the hybrid precesses on is
    // the COMPOSED lunisolar rate — its period of date T_p(t) read directly
    // (plan 09 step 5c; it was period₀·H(t)/H₀ on the unit, the same number
    // to 2e-16 since the unit scales with T_p). Not the frozen era clock's
    // H_era (which misses the lunar 1/a³ growth: 70.9 vs Lantink 2022's
    // 108.6 ± 8.5 ″/yr at 2.46 Ga; the composed rate reads 104.5).
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
      axialPrecessionYearsAtYearFn: (yr) => deepLod.lunisolarPrecessionPeriodYearsAtAge((startmodelYear - yr) / 1e6) ?? axial0,
      // THE PRECESSION OF DATE (plan 06 §9 item 10): on top of the secular
      // law above, the solar torque at the eccentricity of date and the
      // oblateness of date from the GIA channel — both exactly 1 at J2000,
      // so the unit H(t) and the J2000 anchor are untouched. The channel is
      // read PURE (alphaGia, not the lattice-pin-aware earthMoiFactorAtAge):
      // the samplers are cached, their values must be pure in year.
      solarTorqueShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
      // options.giaEllipticityOfDate === false: the orbital forcing alone (the T1 line derivation).
      dynamicalEllipticityRatioAtYearFn: options.giaEllipticityOfDate === false ? undefined : alphaGia.j2RatioAt,
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
    // The anomalistic year rides THIS movement's own apsidal line (the
    // scene's perihelion) — the factory owns the construction; the planet
    // chain's secular tangent is no longer a member (year-lengths.cjs).
    const yearLengths = createYearLengths({
      sampleAt,
      massLossSiderealSecondsAtYearFn: (year) => deepLod.siderealYearSecondsAtAge(yearToTMa(year)),
    });
    return {
      yearLengths,
      /** The one-source sample at a decimal year (the engine year) — ε, e, ϖ of date, the Earth-orbit normal (the fields the frame of date and the invariable-plane elements read). @param {number} year */
      sampleAt,
      /** EXPERIMENT accessors: the series' e and equinox-referenced ϖ of date. @param {number} year @returns {number} */
      eAt: (year) => sampleAt(year).e,
      /** @param {number} year @returns {number} */
      periOfDateDegAt: (year) => sampleAt(year).periOfDateDeg,
      /** The hybrid's obliquity at a decimal year, degrees — the banked series inside its span, the α(t)-coupled ζ-tail integration beyond (the deep sampler grows ~0.1 s/Myr). @param {number} year @returns {number} */
      epsAt: (year) => sampleAt(year).epsDeg,
      /** The precession of date's two factors at a decimal year (the factory's own — ONE home). @param {number} year @returns {{solarTorque: number, ellipticity: number}} */
      precessionOfDateFactorsAt: (year) => hist.precessionOfDateFactorsAt(year - 2000),
      /** The spin axis's INERTIAL precession period at J2000, years — the self-anchored
       *  lunisolar rate the hybrid integrates ŝ on (deep-orbital-history D4e): the general
       *  precession anchor plus the planetary mean the ecliptic's own motion carries. */
      axialPrecessionYearsLunisolarJ2000: hist.axialPrecessionYearsLunisolarJ2000,
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

  /** Layer-4 solar day of date in SI seconds — LOD_real, the shipped
   *  observable (the tweakpane Solar Day row, the registry's lodRealPhysical,
   *  the Framework Verification panel's day): the kinematic day of date + the
   *  ecliptic missing-motion term on the nodal period + the calibrated ΔT
   *  cycle stack incl. the core-mantle swing. Twin of tools/lib
   *  computeLodRealSecondsAtEpoch and the browser's _vfpSolarDaySecondsOfDate
   *  (86,400.001780 s at 2000). @param {number} year @returns {number} */
  const lodRealSeconds = (year) =>
    dayLengthSeconds(year)
    + (deepLod.eclipticLodCorrectionSecondsAtAge(yearToTMa(year)) ?? 0)
    + dtCycleLodCorrectionSum(year);
  /** Mean sidereal day of date in SI seconds — on LOD_real (plan 08 storyline
   *  sweep, 2026-10-09: the published day bases are the SI day of exactly
   *  86,400 s, the IAU constants, and LOD_real; this rode the KINEMATIC day
   *  before, 1.7 ms below the simulator's readout at J2000). One rotation
   *  more against the equinox than there are solar days in a year.
   *  @param {number} year @returns {number} */
  const siderealDaySeconds = (year) => {
    const Y = tropicalYearDays(year);
    return (lodRealSeconds(year) * Y) / (Y + 1);
  };
  /** Mean stellar day of date in SI seconds — the sidereal day plus the
   *  equinox's daily regression projected onto the equator (on LOD_real, like
   *  the sidereal day). @param {number} year @returns {number} */
  const stellarDaySeconds = (year) => {
    const tMa = yearToTMa(year);
    // S5 (plan 06): one equinox turn per T_p(t) — the composed lunisolar
    // period (its certified J2000 anchor past the chain's domain), NOT the
    // unit's counter H(t)/13 (0.086 % slow; 7 µs on the 8.37 ms offset).
    const TpRaw = deepLod.lunisolarPrecessionPeriodYearsAtAge(tMa);
    const Tp = TpRaw === null ? certifiedAxialPrecessionJ2000Years() : TpRaw;
    const syD = tropicalYearDays(year);
    const sidDay = siderealDaySeconds(year);
    // Layer A (plan 06): the RA projection reads the published ε (the one-source
    // hybrid), not the K comb — the browser's _sceneEpsTargetDeg twin; 1e-8 s.
    const raProjection = Math.cos((oneSourceM.epsAt(year) * Math.PI) / 180);
    return (sidDay / Tp / (syD + 1)) * raProjection + sidDay;
  };

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
  // Exact-argument memo (the alphaMemo pattern above): the cardinal Newton
  // solve asks for ΔT at the SAME jd twice per step (jdTTFromUT in the
  // apparent Sun and again under the planetary completion) — measured 8.8 →
  // 5.6 ms per panel year (8 solves) at modern epochs, values bit-identical.
  /** @type {Map<number, number>} */
  const dtMemo = new Map();
  /** @param {number} tMa @returns {number} */
  const meanDeltaTSecondsAtAge = (tMa) => {
    if (tMa === 0) return 0;
    const hit = dtMemo.get(tMa);
    if (hit !== undefined) return hit;
    let result = deepLod.deltaTRawSecondsAtAge(tMa);
    const yearY = 2000 - tMa * 1e6;
    result += dtCycles.cycleDeltaTSecondsAt('bond', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('hallstatt', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose5', yearY);
    result += dtCycles.cycleDeltaTSecondsAt('jose4', yearY);
    result += dtCycles.swingDeltaTSecondsAt(yearY);
    if (dtMemo.size >= 8192) dtMemo.clear();
    dtMemo.set(tMa, result);
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

  // (plan 07 R6: eccentricityAmplitudeK — the K constant inverted from
  // Earth's calibration — and the t2000 phase offset it fed went with the
  // eccentricity law; plan 07 R5: PSI — ψ = 3·A_earth·√(m_E/m_☉) — and the
  // inclination law it fed went the same way. systemResetN is kept where
  // other consumers read it.)

  // Plan 07 R1/R8: the internal PLANET_RECORDS — the device record the
  // fitters once read (the H·num/den perihelion period from
  // perihelionEclipticFraction, fibonacciD, antiPhase, inclinationCycleAnchor,
  // the −8H/N node period) — had no reader left after R6/R5 and is gone with
  // its JSON inputs. What remains is the PUBLISHED record below.
  /** @type {Record<string, Record<string, any>>} */
  const PUBLISHED_PLANET_RECORDS = {};    // what model.planets.record() serves (R8)
  for (const k of PLANET_KEYS) {
    const ar = C.planetOrbitalElements[k];
    // Plan 06 Phase 7 commit 2: the K device's integer axial and obliquity
    // fractions are retired; the obliquity is the DERIVED J2000 obliquity of
    // the spin channel (the IAU pole against the chain's J2000 plane, acute
    // form) — from the governed artifacts, no fractions. (The g-mode beat the
    // K law's period rode left with the internal record at plan 07 R1/R8.)
    const obliquityDerived = computeObliquityJ2000Deg({
      spin: C.planetSpinPhysical[k],
      anchorInclEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].inclEclipticDeg,
      anchorAscNodeEclipticDeg: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements[k].ascNodeEclipticDeg,
      obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
    });
    const obliquityMean = Math.min(obliquityDerived, 180 - obliquityDerived);   // acute form of the derived J2000 obliquity
    // R8 (plan 07): what `model.planets.record()` PUBLISHES is the structural
    // record, not the device. The internal record that kept the ψ/K law
    // outputs for the fitting pipeline went piecewise: the K half at R6, the ψ
    // half at R5, the lattice inputs at R1/R8 (nothing read it by then).
    // Nothing outside needs the device, and serving it made /v1/bodies
    // contradict the model's own chain on the SAME quantities: Mercury's node
    // cycle 298,060 yr against the chain's 232,001, Jupiter's perihelion period
    // 68,783 against 304,456, Neptune's 670,634 against 2,136,796. The two
    // views are separated here: internal keeps the device for the fitters,
    // published carries the structural inputs and the chain.
    //   · kept as-is — the REFERENCE inputs (IAU J2000 ϖ, Souami & Souchay
    //     node and inclination, DE440 e, the period input, the axial tilt) and
    //     `obliquityMean`, which is engine-DERIVED (the spin channel against
    //     the chain's J2000 plane), not a device value.
    //   · repointed, the quantity surviving as a chain eigenmode — the two
    //     PERIODS, now 1,296,000/g and 1,296,000/s. Signs kept as before:
    //     apsidal prograde positive, nodal regression negative.
    //   · dropped, the quantity BEING the device — ascendingNodeCyclesIn8H,
    //     fibonacciD, antiPhase, inclinationCycleAnchor, wobblePeriod (lattice
    //     inputs and the device's beat), and the inclination/eccentricity
    //     mean+amplitude+phase triples, which presume a single oscillation the
    //     chain does not have. Their honest replacement is the value AT AN
    //     EPOCH, which `/v1/bodies` already serves in its `at[]` rows.
    const chainModes = /** @type {any} */ (CHAIN_ARTIFACT);
    const gArc = chainModes.g[k] && chainModes.g[k].arcsecPerYr;
    const sArc = chainModes.s[k] && chainModes.s[k].arcsecPerYr;
    PUBLISHED_PLANET_RECORDS[k] = Object.freeze({
      name: PLANET_DISPLAY_NAMES[k],   // presentation — planets/display-names, the deleted JSON's last leaf (plan 11 step 6)
      solarYearInput: ar.solarYearInput,
      longitudePerihelion: ar.longitudePerihelion,
      ascendingNodeInvPlane: ar.ascendingNodeInvPlaneClosedForm,   // the closed-form verified J2000 node — astro-reference since plan 11 step 2
      invPlaneInclinationJ2000: ar.invPlaneInclinationJ2000,
      orbitalEccentricityJ2000: ar.orbitalEccentricityJ2000,
      axialTiltJ2000: ar.axialTiltJ2000,
      obliquityMean,
      perihelionEclipticYears: gArc ? 1296000 / gArc : undefined,
      ascendingNodePeriod: sArc ? 1296000 / sArc : undefined,
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

  // The planets' elements of date ride THE CHAIN — the only planet path the
  // simulator renders (K5) — with the D5 series handover beyond each planet's
  // measured boundary when the series artifact is supplied: the mirror of the
  // browser's _kcElementsOfDate → _kcSeriesSecularEl. Until v16.2 the API
  // served the retired device here (the record's linear lattice rates:
  // perihelionEclipticYears, ascendingNodePeriod = −8H/N, the balanced-year
  // inclination oscillation) — a published surface disagreeing with the
  // simulator (owner-found audit, 2026-10). Those forms
  // (planets/orientation.cjs) now serve only the structural record and the
  // browser's no-chain bodies (Pluto, Halley, Eros). The chain's argument is
  // dynamical time; the API's decimal year is taken as that argument (ΔT on a
  // secular element is far below its stated accuracy).
  let planetChains = /** @type {any} */ (null);
  let planetSeriesOverride = /** @type {any} */ (null);
  let planetNodeOriginSSDeg = /** @type {number|null} */ (null);
  /** @param {string} k @param {number} year */
  const planetChainElementsAt = (k, year) => {
    if (!planetChains) planetChains = buildPlanetChainsFromArtifactData(/** @type {any} */ (CHAIN_ARTIFACT));
    const el = computePlanetElementsAtYear(year, planetChains[k], planetChains);
    const seriesArt = /** @type {any} */ (secularSeriesArtifact);
    if (!seriesArt) return el;
    if (!planetSeriesOverride) {
      planetSeriesOverride = createSecularSeriesOverride({
        series: seriesArt,
        anchorElements: /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements,
        invariablePlane: /** @type {any} */ (CHAIN_ARTIFACT).invariablePlane,
        planetZModes: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZ,
        planetZetaModes: /** @type {any} */ (DEEP_MODES_ARTIFACT).planetZeta,
      });
    }
    return planetSeriesOverride.applyToElements(k, year, el);
  };
  /** Ecliptic longitude of perihelion, J2000 ecliptic and equinox (the chain's ϖ). @param {string} k @param {number} year @returns {number} */
  const planetPerihelionDeg = (k, year) => planetChainElementsAt(k, year).lonPeriEclipticDeg;
  /** The S&S longitude origin as an s-frame longitude (J2000-fixed, derived). @returns {number} */
  const nodeOriginSSDeg = () => {
    if (planetNodeOriginSSDeg === null) {
      planetNodeOriginSSDeg = computeEquatorNodeOriginSFrameDeg(/** @type {any} */ (CHAIN_ARTIFACT).invariablePlane, C.earthOrbital.obliquityJ2000_deg);
    }
    return planetNodeOriginSSDeg;
  };
  /** Ascending node on the model's invariable plane, from the plane's ascending node on the ICRF equator (the Souami & Souchay 2012 origin; derived conversion, inv-plane-frame). @param {string} k @param {number} year @returns {number} */
  const planetAscNodeDeg = (k, year) => convertNodeSFrameToEquatorOriginDeg(planetChainElementsAt(k, year).ascNodeInvPlaneDeg, nodeOriginSSDeg());
  /** Inclination to the model's invariable plane (exact orbit-normal rotation). @param {string} k @param {number} year @returns {number} */
  const planetInclinationDeg = (k, year) => planetChainElementsAt(k, year).inclInvPlaneDeg;
  /** Orbital eccentricity of date, from the same chain elements (R8): the
   *  honest replacement for the record's retired base + amplitude + phase
   *  triple, which presumed a single oscillation the chain's multi-mode
   *  e-vector does not have. @param {string} k @param {number} year @returns {number} */
  const planetEccentricity = (k, year) => planetChainElementsAt(k, year).e;

  // ── Earth's invariable-plane elements of date (plan 07 R5/R9) ─────────────
  // ONE published i_inv / Ω_inv everywhere — the mirror of the browser's
  // inclInvPlaneModel / ascNodeInvPlaneModel (identical ops): the engine's
  // own Earth-orbit normal of date (the one-source sampler — the banked
  // secular series inside ±10 Myr, the mode tail beyond) against the
  // artifact's invariable plane, the node expressed in the Souami & Souchay
  // longitude origin through the same derived conversion the planets' node
  // takes. The H/3 cosine on the fixed apsidal carrier and the −H/5 linear
  // node that served here until R5 were the K device: 1.578677° against
  // 1.578422° at J2000, 1.24° against 1.91° at −100 kyr, and 112° against
  // 94° of node there. Doc 05 banks the one-source reading at rms 0.003°
  // vs La2010 over −500 kyr. Argument: the engine year (dynamical time,
  // Julian from J2000 TT — the sampler's own coordinate, as the chain's).
  const invPlaneGeometry = (() => {
    const ip = /** @type {{ inclEclipticDeg: number, ascNodeEclipticDeg: number }} */ (/** @type {any} */ (CHAIN_ARTIFACT).invariablePlane);
    const D2R = Math.PI / 180;
    const si = Math.sin(ip.inclEclipticDeg * D2R), ci = Math.cos(ip.inclEclipticDeg * D2R);
    const nInv = [si * Math.sin(ip.ascNodeEclipticDeg * D2R), -si * Math.cos(ip.ascNodeEclipticDeg * D2R), ci];
    const xIp = [Math.cos(ip.ascNodeEclipticDeg * D2R), Math.sin(ip.ascNodeEclipticDeg * D2R), 0];
    const yIp = [nInv[1] * xIp[2] - nInv[2] * xIp[1], nInv[2] * xIp[0] - nInv[0] * xIp[2], nInv[0] * xIp[1] - nInv[1] * xIp[0]];
    return { ascNodeEclipticDeg: ip.ascNodeEclipticDeg, nInv, xIp, yIp };
  })();
  /** The engine Earth-orbit normal of date, J2000 ecliptic frame. @param {number} year @returns {number[]} */
  const earthOrbitNormalJ2000At = (year) => {
    const s = oneSourceM.sampleAt(year);
    return [s.orbitNormalX, s.orbitNormalY, Math.sqrt(Math.max(0, 1 - s.orbitNormalX * s.orbitNormalX - s.orbitNormalY * s.orbitNormalY))];
  };
  /** Earth's inclination of date to the model's invariable plane, degrees. @param {number} year @returns {number} */
  const inclinationDeg = (year) => {
    const nE = earthOrbitNormalJ2000At(year), nInv = invPlaneGeometry.nInv;
    const d = nE[0] * nInv[0] + nE[1] * nInv[1] + nE[2] * nInv[2];
    return Math.acos(Math.min(1, Math.max(-1, d))) / (Math.PI / 180);
  };
  /** Earth's ascending node of date on the invariable plane, S&S origin, degrees in [0, 360). @param {number} year @returns {number} */
  const ascendingNodeDeg = (year) => {
    const D2R = Math.PI / 180;
    const { ascNodeEclipticDeg, nInv, xIp, yIp } = invPlaneGeometry;
    const nE = earthOrbitNormalJ2000At(year);
    let N = [nInv[1] * nE[2] - nInv[2] * nE[1], nInv[2] * nE[0] - nInv[0] * nE[2], nInv[0] * nE[1] - nInv[1] * nE[0]];
    const L = Math.hypot(N[0], N[1], N[2]);
    N = [N[0] / L, N[1] / L, N[2] / L];
    const sFrameDeg = ((Math.atan2(N[0] * yIp[0] + N[1] * yIp[1] + N[2] * yIp[2],
      N[0] * xIp[0] + N[1] * xIp[1] + N[2] * xIp[2]) / D2R + ascNodeEclipticDeg) % 360 + 360) % 360;
    return convertNodeSFrameToEquatorOriginDeg(sFrameDeg, nodeOriginSSDeg());
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
  const yearFromJD = (jd) => startmodelYear + (jd - startmodelJD) / siTropicalYearDays;
  /** JD(TT) at a model year (SI axis). @param {number} year @returns {number} */
  const jdFromYear = (year) => startmodelJD + (year - startmodelYear) * siTropicalYearDays;

  // ── Lunar theory: the shared-chain assembly (§7a slice-2b) ────────────────
  // Wiring mirrors the engine call sites exactly — tools/lib/deep-time.js
  // (ecc channel, month chain, J2000 precession anchors),
  // tools/lib/scene-graph.js (chain-cycles, arguments, series) and
  // tools/verify/eclipse-audit.js (finders). Deep-time and framework-native
  // are hardwired ON here: they are the shipped defaults; the A/B env
  // toggles (SG_DEEP_TIME/MOON_ARGS_PURE_MEEUS) stay an engine concern.
  const j2000JD = 2451545.0;
  const julianCenturyDays = 36525;

  // J2000 Moon precession anchors (plan 09: the IAU inputs themselves). The
  // legacy-'ICRF'-named inputs hold the EQUINOX-OF-DATE observables (Meeus/
  // IERS 3231.50 d / 6798.38 d); the star-referenced (inertial) periods
  // follow by removing the equinox's own precession, 1/T_E = 1/T_I ∓ 1/T_p
  // (perigee advances, node regresses), T_p the J2000 precession anchor.
  // The retired era device counted these as eighth-integers per 8H and read
  // the periods back as totalDaysInH/N (the ∓13 was H/13 cycles per H).
  const moonApsidalOfDateJ2000Seconds = C.moonReference.moonApsidalPrecessionDaysInputICRF * 86400;
  const moonNodalOfDateJ2000Seconds = C.moonReference.moonNodalPrecessionDaysInputICRF * 86400;
  const moonApsidalJ2000Seconds = 1 / (1 / moonApsidalOfDateJ2000Seconds - 1 / (axialPrecessionJ2000Days * 86400));
  const moonNodalJ2000Seconds = 1 / (1 / moonNodalOfDateJ2000Seconds + 1 / (axialPrecessionJ2000Days * 86400));
  const moonSiderealMonthJ2000Seconds = moonSiderealMonth * 86400;
  // (Plan 09 step 5c: the per-H of-date cycle counts and the month chain's H²
  // scaling of the of-date periods are deleted; the of-date perigee/node are
  // the chain's count compositions.)

  // Derived months on the IAU inputs (constants.js §Moon derived months)
  const moonTropicalMonthDays = 1 / (1 / moonSiderealMonth + 1 / axialPrecessionJ2000Days);
  const moonAnomalisticMonthDays = 1 / (1 / moonSiderealMonth - 86400 / moonApsidalJ2000Seconds);
  const moonSynodicMonthDays = moonSiderealMonth * meanSiderealYearDays / (meanSiderealYearDays - moonSiderealMonth);

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
      meanSiderealYearJ2000Seconds: meanSiderealYearSeconds,
      moonApsidalJ2000Seconds,
      moonNodalJ2000Seconds,
      moonSiderealMonthJ2000Seconds,
      sPerigee: MOON_ECC_SENSITIVITY_PERIGEE,
      sNode: MOON_ECC_SENSITIVITY_NODE,
    },
    fns: {
      meanLodSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.lodSecondsAtAge(tMa),
      meanSiderealYearSecondsAtAge: /** @param {number} tMa */ (tMa) => deepLod.siderealYearSecondsAtAge(tMa),
      // plan 09 step 5c: the tropical month's equinox turn is one per T_p(t)
      precessionPeriodYearsAtAge: /** @param {number} tMa */ (tMa) => deepLod.lunisolarPrecessionPeriodYearsAtAge(tMa),
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
    tropicalYearJ2000Seconds: meanTropicalYearJ2000Seconds,   // the SI tick (plan 09 step 7c′)
    isDeepTime: () => true,
  });
  /** @param {number} tMa @returns {number|null} */
  const nodalMonthPeriodFn = (tMa) => moonChain.nodalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const tropicalMonthPeriodFn = (tMa) => moonChain.tropicalMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const anomalisticMonthPeriodFn = (tMa) => moonChain.anomalisticMonthSecondsAtAge(tMa);
  /** @param {number} tMa @returns {number|null} */
  const siderealMonthPeriodFn = (tMa) => moonChain.siderealMonthSecondsAtAge(tMa);
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
  /** The Moon's sidereal (star-referenced) orbits — the series' A3 argument (plan 09 step 5c). @param {number} a @param {number} b @returns {number|null} */
  const mcSidereal = (a, b) => chainCycles.cyclesBetween(siderealMonthPeriodFn, a, b);
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
      // Plan 09: the arguments' Sun IS the one certified Sun — the mean
      // longitude that integrates the one-family tropical year (the eclipse
      // finder's Sun) and the series' mean perihelion of date (unwrapped),
      // both on the TT Julian-year axis. The former "model timeline" Sun
      // (360° per mean solar year plus the integral of the retired year
      // combs) sat 0.2° behind the IAU mean Sun at −2000 — the combs could
      // not carry the tropical year's secular drift. Twins: scene-graph.js,
      // script.js.
      sunMeanLonDegAtJdTT: /** @param {number} jdTT @returns {number} */ (jdTT) => sunMeanLongitudeDegAt(2000 + (jdTT - j2000JD) / 365.25),
      sunPerihelionLonDegAtJdTT: /** @param {number} jdTT @returns {number} */ (jdTT) => sunPerihelionDegAt(2000 + (jdTT - j2000JD) / 365.25),
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      nodalOfDateCyclesBetween: mcNodalOfDate,
      isDeepTime: () => true,
      isFrameworkNative: () => true,
      // (d′) of-date rate completion: the DYNAMICAL axial precession (the
      // tweakpane day-form identity — real at J2000, epoch-valid) and the
      // KINEMATIC pair's beat the chains embed. MATCHED TRIPLE with the
      // tools-lib and browser wirings.
      // Plan 09: the dynamical rate of date is the published precession
      // period's (the one-family beat inside its window, the composed clock
      // beyond) — the retired year combs' day-form beat read 60 % of the
      // secular drift. Degrees per Julian year.
      pDynDegPerYearAt: /** @param {number} year */ (year) => 360 / publishedAxialPrecessionYearsAtYear(year),
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
  // (plan 09 step 7c: on the channel's Julian-year axis — the N-body series'
  // time; the device's rounded tropical-year input read the axis 2e-5 short)
  const fwEFactor = (dDays) => deepEcc.eFactorAt(dDays / 365.25);

  // D2 derived additional-argument rates (deg/cy, from the J2000 month inputs;
  // the derivation record derive-a1a2a3.js was deleted at plan 09 step 7e — docs/109 §22)
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
      // against the MODEL-START anchor (startmodelYear, the browser's
      // J2000_CALENDAR_YEAR — NOT this model's 2000.0 yearToTMa convention:
      // the 0.5-yr difference is 4.95e-11 of distance and failed the
      // bit-exact parity gate; plan 11 step 5 dropped the −0.83-d correction
      // from the anchor, both twins alike). Falls back to the J2000 constant
      // without a jd (legacy call shape) or past the domain.
      getMoonDistanceKm: /** @param {number} [jdTT] */ (jdTT) => {
        if (jdTT === undefined) return moonDistanceKm;
        const d = moonDistanceMetresAtAge((startmodelYear - yearFromJD(jdTT)) / 1e6);
        return d === null ? moonDistanceKm : d / 1000;
      },
      getEccentricityBase: () => C.moonReference.moonOrbitalEccentricityBase,
      deltaTSeconds: /** @param {number} jd */ (jd) => (jdTTFromUT(jd) - jd) * 86400,
      jdToSIyear: yearFromJD,
      tropicalOrbitsBetween: mcTropical,
      apsidalOfDateCyclesBetween: mcApsidalOfDate,
      siderealOrbitsBetween: mcSidereal,
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
  // Plan 09: the lunar arguments' Sun perihelion of date is the eclipse
  // Sun's mean perihelion (`sunPerihelionDegAt`) read DIRECTLY, wrapped.
  // Every consumer wraps the argument it enters (M = Lsun − ϖ − 180) or
  // differences it over ±25 days (the rate anchors, wrapped to ±180°), so
  // no continuous angle is needed. MEASURED: a 100-yr unwrapping ladder
  // (two series reads per rung, 53,400 rungs at −5.34 Myr) cost the cold
  // deep jump 1,062 s — 343× the in-table jump against the perf gate's 8× —
  // for a value the consumers reduced mod 360 anyway.

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
  // PLAN 06 I3 — the carriers are the model's own banked J2000 sidereal mean
  // motions (the embedded sun-completion artifact; ONE home,
  // computeCarrierRatesDegPerCy — the former record-based arithmetic sat
  // 4.1″/yr off for Venus, 1.7″/yr for Jupiter: 83° of the Venus–Earth
  // argument at ±9000 yr), Earth the framework sidereal year, the Moon
  // elongation from the sidereal month/year identity. The long-period rows
  // ride the embedded e-vectors of date, and the lunar equation rides the
  // framework's own Moon elongation of date (ṅ included) — the constant-rate
  // carrier ran ~29° off it at ±9000 yr.
  const carrierRatesDegPerCy = computeCarrierRatesDegPerCy({ meanSiderealYearDays, moonSiderealMonthDays: moonSiderealMonthInput });
  const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({
    embWobbleArcsec,
    carrierRatesDegPerCy,
    moonElongationDegAtT: /** @param {number} T */ (T) => moonArgs.argsAt(j2000JD + T * julianCenturyDays).D,
  });
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
  /** The published sidereal year of date, SI seconds — the one-family λ̇
   *  channel inside the window, the mass-loss law beyond (plan 09: the
   *  `lengths` surface's days ride it). @param {number} year @returns {number} */
  const publishedSiderealYearSecondsAtYear = (year) => {
    if (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS) return yearLengthsM.siderealYearSecondsAtYear(year);
    return deepLod.siderealYearSecondsAtAge(yearToTMa(year));
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
    // The Moon-Kepler mass chain — the J2000 derivation docs 24 / the website's
    // "mass from the Moon" page narrate, published from the one place that
    // computes it (physics 22.1.0; the pages used to carry its numbers as
    // hand-typed literals): Kepler III on the Moon's orbit with the
    // solar-tidal shift Δa = a·μ·m (μ the Moon's mass fraction, m the lunar
    // small parameter T_M/T_sidereal-year), the Earth/Moon split on the
    // DE440 mass ratio, and GM_Sun from Earth's heliocentric orbit minus
    // GM_Earth. Every value is the J2000 snapshot the rest of the model runs
    // on; the of-date Moon distance is the recession history (epoch.*).
    massChain: Object.freeze({
      moonDistanceKm,
      moonSiderealMonthDays: moonSiderealMonth,
      siderealYearDays: meanSiderealYearDays,
      dayLengthSeconds: meanLengthOfDay,
      massRatioEarthMoon: MASS_RATIO_EARTH_MOON,
      lunarSmallParameter: moonSiderealMonth / meanSiderealYearDays,
      moonMassFraction: 1 / (MASS_RATIO_EARTH_MOON + 1),
      solarTidalShiftKm: moonOrbitalShift,
      moonDistanceCorrectedKm: moonDistanceCorrected,
      gmEarthMoonSystemKm3S2: GM_EARTH_MOON_SYSTEM,
      gmEarthKm3S2: GM_EARTH_ALONE,
      gmMoonKm3S2: GM_MOON_ALONE,
      gmSunPlusEarthKm3S2: GM_SUN_PLUS_EARTH,
      gmSunKm3S2: GM_SUN,
      sunMassKg: M_SUN,
      earthMassKg: GM_EARTH_ALONE / G_CONSTANT,
      gravitationalConstantKm3KgS2: G_CONSTANT,
    }),
    // Plan 09: the ONE certified Sun's mean elements of date — the lunar
    // arguments of every runtime build their Sun from these two (the Node
    // scene twin and the browser read them here; the "model timeline" Sun on
    // the retired year combs is gone).
    sun: Object.freeze({
      /** Mean longitude of date, degrees, unwrapped — L0 + 360·∫dt/T_trop (the one-family tropical year). @param {number} year @returns {number} */
      meanLongitudeDegAt: sunMeanLongitudeDegAt,
      /** The Sun's mean perihelion longitude of date (Earth's ϖ, mean elements), degrees, wrapped to [0, 360). @param {number} year @returns {number} */
      perihelionLongitudeDegAt: sunPerihelionDegAt,
    }),
    epoch: Object.freeze({
      yearToTMa,
      // (plan 09 step 7b: `hAtYear` — the unit H(t) on a published surface, the
      // API's `epoch.h` — is deleted; the deep-time clock is axialPrecessionYearsAtYear)
      // The Layer-2 mean day of date — the tidal + GIA base the deep-time law
      // gives at any age (86,399.9997 s at J2000): the day the paleo anchors
      // and the ΔT integrand ride. NOT the observable solar day of date —
      // that is lodRealSecondsAtYear below (plan 08 storyline sweep).
      lodSecondsAtYear: /** @param {number} year @returns {number|null} */ (year) => deepLod.lodSecondsAtAge(yearToTMa(year)),
      // LOD_real of date — the Layer-4 observable (the simulator's Solar Day,
      // the registry's lodRealPhysical): the kinematic day + the ecliptic term
      // + the calibrated ΔT cycle stack. 86,400.001780 s at J2000.
      lodRealSecondsAtYear: /** @param {number} year @returns {number} */ (year) => lodRealSeconds(year),
      alphaAtYear: /** @param {number} year @returns {number} */ (year) => earthMoiFactorAtAge(yearToTMa(year)),
      moonDistanceKmAtYear: /** @param {number} year @returns {number} */ (year) => moonDistanceMetresAtAge(yearToTMa(year)) / 1000,
      // D6: OF-DATE — mass-loss law / the banked planetary λ̇ ratio
      // (identical at J2000 where the ratio ≡ 1 by construction)
      siderealYearSecondsAtYear: /** @param {number} year @returns {number} */ (year) => yearLengthsM.siderealYearSecondsAtYear(year),
      deltaTSecondsAtYear: deltaTSeconds,
      // Plan 06 Phase 3 S2 — THE published of-date precession period is the
      // one-family route (B): the hybrid's own equinox regression against
      // the λ̇-corrected sidereal year (~25,771 yr at J2000 ≈ IAU), inside
      // the banked tiers (|Δyear| ≤ ONE_FAMILY_WINDOW_YEARS); beyond, the
      // composed lunisolar period on the same J2000 anchor (S5; the
      // of-date wobble is unresolved there). The comb family's beat (the
      // frozen era clock's kinematic-day device) is deleted at plan 09; the
      // lunar chain's (d′) rate completion (pDynDegPerYearAt) rides THIS
      // published period — a MATCHED TRIPLE with the eclipse gates (M0(a)
      // measured a 3–15 min lunar-timing shift when it moved; the records
      // were re-baselined on the plan 09 move).
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
      /** THE PRECESSION OF DATE — the solar-torque factor 1 + f_S·([(1 − e²)/(1 − e₀²)]^(−3/2) − 1) at the eccentricity of date (1 at J2000; +3.2·10⁻⁴ on the million-year mean). The spin integration multiplies it into the secular rate. @param {number} year @returns {number} */
      solarTorqueFactorOfDateAtYear: (year) => oneSourceM.precessionOfDateFactorsAt(year).solarTorque,
      /** THE PRECESSION OF DATE — J₂(t)/J₂₀, the oblateness of date from the GIA channel (ψ̇ ∝ J₂; 1 at J2000, bounded ±5·10⁻⁴; dJ₂/dt at J2000 = the observed satellite rate). @param {number} year @returns {number} */
      ellipticityRatioOfDateAtYear: (year) => oneSourceM.precessionOfDateFactorsAt(year).ellipticity,
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
      /** THE SPIN AXIS'S INERTIAL PRECESSION RATE OF DATE, ″/yr — the composed rate scaled by the
       *  hybrid's self-anchor factor (the inertial-to-general ratio at J2000, the multiplicative form
       *  the obliquity integration itself applies): 50.385 at J2000 (series-driven). The obliquity beat and the
       *  obliquity lines ride THIS rate; the general precession (meanRateArcsecPerYrAtYear) is the
       *  equinox along the ecliptic of date. @param {number} year @returns {number} */
      spinAxisInertialRateArcsecPerYrAtYear: (year) => {
        const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
        const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
        return psiDot * (certifiedAxialPrecessionJ2000Years() / oneSourceM.axialPrecessionYearsLunisolarJ2000);
      },
      /** The obliquity beat 2π/(ψ̇ᵢₙ(t) − |s₃|), years — the SHIPPED deep-time obliquity period at an INSTANT
       *  (falsification leg 1; 41,098 at J2000). ψ̇ᵢₙ is the spin axis's INERTIAL rate (above): the equator
       *  against the ecliptic's nodal mode in the inertial frame, the rate the hybrid obliquity integration
       *  self-anchors on — not the general precession, which reads the beat 0.3 % long (41,224). v23.0: a
       *  dated record sees the beat of the pole rate's mean over its own window, with the pole's of-date
       *  factors (obliquityPeriodRealizedYears below: 40,927 over the LR04 record, the climate formula's p+s₀
       *  line; La2004's own series reads 40,900 on the same window — compare realized with realized, never
       *  this instant with Laskar's long-window precession frequency 50.476). @param {number} year @returns {number} */
      obliquityBeatYearsAtYear: (year) => {
        const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
        const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
        const psiDotInertial = psiDot * (certifiedAxialPrecessionJ2000Years() / oneSourceM.axialPrecessionYearsLunisolarJ2000);
        return 1296000 / (psiDotInertial - s3ArcsecPerYr);
      },
      /** THE REALIZED POLE RATE OVER A WINDOW, ″/yr — see the one home above (the mean of the inertial rate of
       *  date with its three of-date factors); the rate the obliquity lines of a record spanning the window carry. */
      spinAxisInertialRateMeanArcsecPerYr,
      /** THE REALIZED OBLIQUITY PERIOD OVER A WINDOW, years — 1,296,000/(⟨ψ̇ᵢₙ⟩_window − |s₃|): the period a record
       *  spanning [yearFrom, yearTo] sees (40,930 over the LR04 record 0–5.32 Ma, 41,018 over the last Myr); the
       *  J2000 beat (obliquityBeatYearsAtYear) is its instantaneous limit.
       *  @param {number} yearFrom @param {number} yearTo @returns {number} */
      obliquityPeriodRealizedYears: (yearFrom, yearTo) => 1296000 / (spinAxisInertialRateMeanArcsecPerYr(yearFrom, yearTo) - s3ArcsecPerYr),
      /** The apsidal (perihelion vs the stars) period of date, JULIAN years — the ONE movement's own apsidal rate (the scene's perihelion; anom/(anom − sid) of the one family, ≡ 360°/apsidalRateFixedArcsecPerJulianYr), inside the published window only; null beyond. Before 2026-09 this rode the planet chain's secular tangent, which parted from the scene's perihelion passages by seconds of anomalistic year within a few millennia (year-lengths.cjs). @param {number} year @returns {number|null} */
      apsidalPeriodYearsAtYear: (year) => (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS ? yearLengthsM.inclinationPrecessionYearsAtYear(year) : null),
      /** T_aps(t) / T_p(t) — the apsidal period in of-date precession periods (4.33 at J2000, a reading; 0.84 … 9.9 across ±26 kyr, measured); null beyond the published window. @param {number} year @returns {number|null} */
      apsidalPerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        return yearLengthsM.inclinationPrecessionYearsAtYear(year) / publishedAxialPrecessionYearsAtYear(year);
      },
      /** T_peri(t) = 1/(1/T_p + 1/T_aps) — the perihelion-of-date period (equinox precession + inertial perihelion motion, frame arithmetic at every epoch), JULIAN years, on the of-date T_p — ≡ the one family's anom/(anom − trop); null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePeriodYearsAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = yearLengthsM.inclinationPrecessionYearsAtYear(year);
        return 1 / (1 / tp + 1 / taps);
      },
      /** T_peri(t) / T_p(t) (0.812 at J2000 — the J2000 reading); null beyond the published window. @param {number} year @returns {number|null} */
      periOfDatePerPrecessionAtYear: (year) => {
        if (Math.abs(year - 2000) > ONE_FAMILY_WINDOW_YEARS) return null;
        const tp = publishedAxialPrecessionYearsAtYear(year), taps = yearLengthsM.inclinationPrecessionYearsAtYear(year);
        return (1 / (1 / tp + 1 / taps)) / tp;
      },
      /** The published of-date window, years from 2000. */
      publishedWindowYears: ONE_FAMILY_WINDOW_YEARS,
      /** THE SPIN AXIS'S INERTIAL PRECESSION PERIOD at J2000, years (25,722 in the shipped,
       *  series-driven configuration) — the rate the hybrid obliquity integration self-anchors
       *  ŝ on (earth/deep-orbital-history, D4e): the general-precession anchor p₀ PLUS the
       *  planetary mean the N-body ecliptic's own motion carries (+0.097 ″/yr ≡ IAU's planetary
       *  precession ψ_A − p_A; the bare 18-mode table anchors 0.18 — the g₂-gap trap: pass the
       *  secular series). Two rates, two uses — the obliquity line frequencies p + s_i (the
       *  spin axis against the ecliptic's nodal modes, in the inertial frame) carry THIS
       *  rate; the climatic-precession lines p + g_i (the perihelion from the equinox along
       *  the ecliptic of date) carry p₀. */
      spinAxisInertialPeriodYearsJ2000: oneSourceM.axialPrecessionYearsLunisolarJ2000,
      /** The same as a rate, ″/yr (50.385 at J2000 with the series; p₀ = 50.288 is the general precession). */
      spinAxisInertialRateArcsecPerYrJ2000: 1296000 / oneSourceM.axialPrecessionYearsLunisolarJ2000,
    }),
    earth: Object.freeze({
      perihelionLongitudeDeg: earthPerihelionDeg,
      // Plan 06 Phase 3 S3b: THE published obliquity is the hybrid — one
      // torque law integrated on the dynamical orbit plane of the N-body
      // chain, zero fitted constants (≡ La2004 to ≤ 4″ over ±50 kyr). The
      // fitted 16-harmonic K comb that sat beside it as `obliquityCombDeg`
      // (a device fitted to the scene's own wheel geometry, 1.27° off
      // La2004 at −20 kyr) is deleted with the frozen era device (plan 09).
      obliquityDeg: /** @param {number} year @returns {number} */ (year) => oneSourceM.epsAt(year),
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
      siderealYearDays,
      anomalisticYearDays,
      dayLengthSeconds,
      lodRealSeconds,
      siderealDaySeconds,
      stellarDaySeconds,
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
      record: /** @param {string} k @returns {Record<string, any>|undefined} */ (k) => PUBLISHED_PLANET_RECORDS[k],
      perihelionLongitudeDeg: planetPerihelionDeg,
      ascendingNodeInvPlaneDeg: planetAscNodeDeg,
      invPlaneInclinationDeg: planetInclinationDeg,
      eccentricity: planetEccentricity,
      spin: planetSpin,
    }),
  });
}
