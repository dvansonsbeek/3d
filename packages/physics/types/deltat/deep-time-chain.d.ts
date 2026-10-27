/**
 * The ΔT stack's switches. `resonator` gates the swing's δLOD terms; the
 * swing's ΔT term is gated by `resonatorDeltaT` when given (the Node twin
 * gates it on BOTH env vars, DT_CORRECTIONS and DT_RESONATOR), else by
 * `resonator`. The four cycles' δLOD terms follow their flags only when
 * `cycleLodFollowsFlags` is true (the browser's research toggles switch a
 * cycle's ΔT and δLOD together); the Node twin sums them unconditionally.
 * Their ΔT terms always follow their flags. Identical with every flag ON.
 * @typedef {{bond: boolean, hallstatt: boolean, jose5: boolean, jose4: boolean, resonator: boolean, resonatorDeltaT?: boolean, cycleLodFollowsFlags?: boolean}} DeltaTFlags
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
 *   `moonDistanceArtifact` the MOON_DISTANCE_ARTIFACT — the cited distance
 *   AND mean-obliquity columns, plan 12 option A / §8 (a) (injected so a
 *   counterfactual context can replace any of them); `ageAnchorYear` the
 *   scene epoch (default constants.timeReference.sceneEpochYear);
 *   `flagsAt` the ΔT stack's switches (default all ON); `planetAuRatios`
 *   the planets' J2000 semi-major axes in AU (for the per-planet family);
 *   `stellarDayRaProjection` cos ε₀-class factor for the projected stellar day.
 */
export function createDeepTimeChain(deps: {
    constants: any;
    fitted: any;
    deepModes: any;
    moonDistanceArtifact: any;
    ageAnchorYear?: number;
    flagsAt?: () => DeltaTFlags;
    planetAuRatios?: Record<string, number>;
    stellarDayRaProjection?: number;
}): Readonly<{
    meanSolarYearDays: number;
    meanSiderealYearDays: any;
    meanSiderealYearSeconds: number;
    meanLengthOfDay: any;
    meanTropicalYearJ2000Seconds: number;
    siTropicalYearDays: number;
    axialPrecessionJ2000Years: number;
    axialPrecessionJ2000Days: number;
    G_CONSTANT: any;
    MASS_RATIO_EARTH_MOON: any;
    currentAUDistance: any;
    earthMoiFactorJ2000: any;
    moonDistanceKm: any;
    moonSiderealMonthInput: any;
    moonOrbitalShift: number;
    moonDistanceCorrected: number;
    GM_EARTH_MOON_SYSTEM: number;
    GM_EARTH_ALONE: number;
    GM_MOON_ALONE: number;
    GM_SUN_PLUS_EARTH: number;
    GM_SUN: number;
    M_SUN: number;
    moonApsidalJ2000Seconds: number;
    moonNodalJ2000Seconds: number;
    moonSiderealMonthJ2000Seconds: number;
    moonPeriods: {
        moonApsidalPrecessionDaysEarth: number;
        moonNodalPrecessionDaysEarth: number;
        moonApsidalJ2000Seconds: number;
        moonNodalJ2000Seconds: number;
        moonSiderealMonthJ2000Seconds: number;
        moonAnomalisticMonthDays: number;
        moonNodalMonthDays: number;
        moonSynodicMonthDays: number;
        moonTropicalMonthDays: number;
        moonFullMoonCycleEarthDays: number;
        moonFullMoonCycleICRFDays: number;
        moonApsidalMeetsNodalDays: number;
        moonLunarLevelingCycleDays: number;
        moonDraconicYearICRFDays: number;
        moonDraconicYearEarthDays: number;
    };
    certifiedAxialPrecessionJ2000Years: () => number;
    precessionRateJ2000ArcsecPerYr: () => number;
    EPOCH_PARAMS: import("../layer0/index.js").EpochParams;
    ageAnchorYear: any;
    alphaGia: {
        alphaAt: (year: number) => number;
        j2RatioAt: (year: number) => number;
        laggedL1PermilAt: (year: number) => number;
        kPerPermille: number;
        relaxationKyr: number;
        laggedL1Terms: Array<{
            period_kyr: number;
            a: number;
            b: number;
        }>;
    };
    earthMoiFactorAtAge: (tMa: number) => number;
    withLatticeAlpha: (build: () => void) => void;
    j2RatioAtYear: (year: number) => number;
    iEarthAtAge: (tMa: number) => number;
    recession: {
        distanceMetresAtAge: (tMa: number) => number | null;
        slopeMetresPerMaAtAge: (tMa: number) => number | null;
        ratioAtAge: (tMa: number) => number | null;
        spanMa: number;
    };
    meanObliquity: {
        meanObliquityDegAtAge: (tMa: number) => number | null;
        cosRatioAtAge: (tMa: number) => number | null;
        meanObliquityJ2000Deg: number;
        spanMa: number;
    };
    dtCycles: {
        taperAt: (year: number) => number;
        taperDerivativeAt: (year: number) => number;
        cycleDeltaTSecondsAt: (cycleKey: string, year: number) => number;
        cycleLodSecondsAt: (cycleKey: string, year: number) => number;
        swingDeltaTSecondsAt: (year: number) => number;
        swingLodSecondsAt: (year: number) => number;
        swingLodRateAt: (year: number) => number;
    };
    s3ArcsecPerYr: number;
    deepLod: {
        lodSecondsAtAge: (t_Ma: number) => number | null;
        lodSecondsAtAgeWithAlpha: (t_Ma: number, alpha: number) => number | null;
        lodHoursAtAge: (t_Ma: number) => number | null;
        lunisolarPrecessionRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
        lunisolarPrecessionPeriodYearsAtAge: (t_Ma: number) => number | null;
        lunisolarTorqueRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
        lunisolarTorquePeriodYearsAtAge: (t_Ma: number) => number | null;
        precessionObliquityFactorAtAge: (t_Ma: number) => number | null;
        lunarTorqueFactorAtAge: (tMa: number) => (number | null);
        precessionTorqueTermAtAge: (tMa: number) => (number | null);
        siderealYearSecondsAtAge: (t_Ma: number) => number;
        tropicalYearSecondsAtAge: (t_Ma: number) => number;
        tropicalYearDaysAtAge: (t_Ma: number) => number | null;
        tropicalYearSecondsFromLod: (t_Ma: number, LOD_s: number | null) => number;
        eclipticLodCorrectionSecondsAtAge: (t_Ma: number) => number | null;
        yearInDaysAtAge: (t_Ma: number) => number | null;
        deltaTRawSecondsAtAge: (t_Ma: number) => number;
        lodSecondsWithCorrectionsAtAge: (t_Ma: number) => number | null;
        dLodDtDecompositionAtAge: (t_Ma: number) => {
            tidal: number | null;
            gia: number | null;
            stack: number | null;
            resonator: number | null;
            net_L2: number | null;
            net_L3: number | null;
            net_L4: number | null;
        };
    };
    l0: import("../layer0/index.js").EpochPrimitives;
    deepEcc: {
        eccAt: (tYr: number) => number;
        eccRateAt: (tYr: number) => number;
        modulation: (tMa: number, s: number) => number;
        channelIntegral: (T: number, s: number) => number;
        eFactorAt: (tYr: number) => number;
        e0: number;
        g0: number;
    };
    eCompModulation: (tMa: number, s: number) => number;
    moonChain: {
        distanceMetresAtAge: (tMa: number) => number | null;
        distanceKmAtAge: (tMa: number) => number | null;
        solarDeltaAKmAtAge: (tMa: number, aApparentKm: number) => number | null;
        distanceCorrectedKmAtAge: (tMa: number) => number | null;
        siderealMonthSecondsAtAge: (tMa: number) => number | null;
        synodicMonthSecondsAtAge: (tMa: number) => number | null;
        tropicalMonthSecondsAtAge: (tMa: number) => number | null;
        perigeePrecessionSecondsAtAge: (tMa: number) => number | null;
        nodePrecessionSecondsAtAge: (tMa: number) => number | null;
        anomalisticMonthSecondsAtAge: (tMa: number) => number | null;
        nodalMonthSecondsAtAge: (tMa: number) => number | null;
        apsidalMeetsNodalSecondsAtAge: (tMa: number) => number | null;
        lunarLevelingSecondsAtAge: (tMa: number) => number | null;
    };
    moonEccSensitivities: Readonly<{
        perigeeEffective: number;
        nodeEffective: number;
        perigeePhysical: number;
        nodePhysical: number;
        kappaPerCy: number;
        frameT2DegPerCy2: number;
        generalPrecessionDegPerCy: number;
        perigeeRateOfDateDegPerCy: number;
        nodeRateOfDateDegPerCy: number;
        perigeeRateIcrfDegPerCy: number;
        nodeRateIcrfDegPerCy: number;
    }>;
    meanMoonDistanceMetresAtAge: (tMa: number) => number | null;
    meanMoonDistanceAtAge: (tMa: number) => number | null;
    meanLodSecondsAtAge: (tMa: number) => number | null;
    meanLodHoursAtAge: (t_Ma: number) => number | null;
    meanLunisolarPrecessionRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
    meanLunisolarPrecessionPeriodYearsAtAge: (tMa: number) => number | null;
    meanLunisolarTorqueRateArcsecPerYrAtAge: (t_Ma: number) => number | null;
    meanLunisolarTorquePeriodYearsAtAge: (t_Ma: number) => number | null;
    precessionObliquityFactorAtAge: (t_Ma: number) => number | null;
    meanObliquityCitedDegAtAge: (tMa: number) => number | null;
    meanAuAtAge: (tMa: number) => number;
    meanSiderealYearSecondsAtAge: (tMa: number) => number;
    meanTropicalYearSecondsAtAge: (t_Ma: number) => number;
    meanTropicalYearDaysAtAge: (t_Ma: number) => number | null;
    meanYearInDaysAtAge: (t_Ma: number) => number | null;
    meanDeltaTSecondsAtAge: (tMa: number) => number;
    bondCycleDeltaTCorrection: (year: number) => number;
    hallstattCycleDeltaTCorrection: (year: number) => number;
    jose5CycleDeltaTCorrection: (year: number) => number;
    jose4CycleDeltaTCorrection: (year: number) => number;
    bondCycleLodCorrection: (year: number) => number;
    hallstattCycleLodCorrection: (year: number) => number;
    jose5CycleLodCorrection: (year: number) => number;
    jose4CycleLodCorrection: (year: number) => number;
    dtCycleLodCorrectionSum: (year: number) => number;
    resonatorSwingDeltaTCorrection: (year: number) => number;
    resonatorSwingLodCorrection: (year: number) => number;
    resonatorSwingLodRate: (year: number) => number;
    meanLodSecondsWithCorrectionsAtAge: (t_Ma: number) => number | null;
    dLodDtDecompositionAtAge: (t_Ma: number) => {
        tidal: number | null;
        gia: number | null;
        stack: number | null;
        resonator: number | null;
        net_L2: number | null;
        net_L3: number | null;
        net_L4: number | null;
    };
    h5Correction: (year: number) => number;
    computeLodKinematicSecondsAtEpoch: (year: number) => number;
    computeLodRealSecondsAtEpoch: (year: number) => number;
    meanSolarDeltaAAtAge: (tMa: number, aApparentKm: number) => number | null;
    meanMoonDistanceCorrectedAtAge: (tMa: number) => number | null;
    meanMoonSiderealMonthAtAge: (tMa: number) => number | null;
    meanSynodicMonthAtAge: (tMa: number) => number | null;
    meanTropicalMonthAtAge: (tMa: number) => number | null;
    meanLunarPerigeePrecessionAtAge: (tMa: number) => number | null;
    meanLunarNodePrecessionAtAge: (tMa: number) => number | null;
    meanAnomalisticMonthAtAge: (tMa: number) => number | null;
    meanNodalMonthAtAge: (tMa: number) => number | null;
    meanApsidalMeetsNodalAtAge: (tMa: number) => number | null;
    meanLunarLevelingCycleAtAge: (tMa: number) => number | null;
    meanStellarDayAtAge: (tMa: number) => number | null;
    meanStellarDayProjectedAtAge: (tMa: number) => number | null;
    meanSiderealDayAtAge: (tMa: number) => number | null;
    meanPlanetSemiMajorAxisAtAge: (planetName: string, tMa: number) => number | null;
    /** @param {number} tMa @param {number} periodJ2000Seconds @returns {number} */
    meanPlanetOrbitalPeriodAtAge: (tMa: number, periodJ2000Seconds: number) => number;
    /** @param {number} tMa @param {number} periodJ2000Seconds @returns {number} */
    meanEarthPlanetSynodicPeriodAtAge: (tMa: number, periodJ2000Seconds: number) => number;
}>;
/**
 * The ΔT stack's switches. `resonator` gates the swing's δLOD terms; the
 * swing's ΔT term is gated by `resonatorDeltaT` when given (the Node twin
 * gates it on BOTH env vars, DT_CORRECTIONS and DT_RESONATOR), else by
 * `resonator`. The four cycles' δLOD terms follow their flags only when
 * `cycleLodFollowsFlags` is true (the browser's research toggles switch a
 * cycle's ΔT and δLOD together); the Node twin sums them unconditionally.
 * Their ΔT terms always follow their flags. Identical with every flag ON.
 */
export type DeltaTFlags = {
    bond: boolean;
    hallstatt: boolean;
    jose5: boolean;
    jose4: boolean;
    resonator: boolean;
    resonatorDeltaT?: boolean;
    cycleLodFollowsFlags?: boolean;
};
