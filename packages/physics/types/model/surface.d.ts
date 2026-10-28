/** @param {import('./cardinal-instants.js').Ctx} ctx @returns the published surface (frozen) */
export function assembleSurface(ctx: import("./cardinal-instants.js").Ctx): Readonly<{
    time: Readonly<{
        yearFromJD: (jd: number) => number;
        jdFromYear: (year: number) => number;
        siTropicalYearDays: number;
    }>;
    massChain: Readonly<{
        moonDistanceKm: any;
        moonSiderealMonthDays: any;
        siderealYearDays: any;
        dayLengthSeconds: any;
        massRatioEarthMoon: any;
        lunarSmallParameter: number;
        moonMassFraction: number;
        solarTidalShiftKm: number;
        moonDistanceCorrectedKm: number;
        gmEarthMoonSystemKm3S2: number;
        gmEarthKm3S2: number;
        gmMoonKm3S2: number;
        gmSunPlusEarthKm3S2: number;
        gmSunKm3S2: number;
        sunMassKg: number;
        earthMassKg: number;
        gravitationalConstantKm3KgS2: any;
    }>;
    sun: Readonly<{
        /** Mean longitude of date, degrees, unwrapped — L0 + 360·∫dt/T_trop (the one-family tropical year). @param {number} year @returns {number} */
        meanLongitudeDegAt: (year: number) => number;
        /** The Sun's mean perihelion longitude of date (Earth's ϖ, mean elements), degrees, wrapped to [0, 360). @param {number} year @returns {number} */
        perihelionLongitudeDegAt: (year: number) => number;
    }>;
    epoch: Readonly<{
        yearToTMa: (year: number) => number;
        lodSecondsAtYear: (year: number) => number | null;
        lodRealSecondsAtYear: (year: number) => number;
        alphaAtYear: (year: number) => number;
        moonDistanceKmAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        deltaTSecondsAtYear: (year: number) => number;
        axialPrecessionYearsAtYear: (year: number) => number;
        tropicalYearSecondsAtYear: (year: number) => number;
    }>;
    lunisolar: Readonly<{
        /** The mean lunisolar precession period T_p(t), years — 1,296,000/the precession RATE of date (25,771.6 at J2000): THE published deep-time clock. @param {number} year @returns {number} */
        meanPeriodYearsAtYear: (year: number) => number;
        /** THE PRECESSION RATE OF DATE ψ̇(t) = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] × cos ε̄(t)/cos ε̄(0), ″/yr — the constant's scaling on the spin and the lunar torque times the cited mean obliquity's cosine (p₀ = 50.2880, the IAU 2006 input). @param {number} year @returns {number} */
        meanRateArcsecPerYrAtYear: (year: number) => number;
        /** THE PRECESSION CONSTANT OF DATE as a rate on the J2000 obliquity, ″/yr — the spin and torque scaling alone (the hybrid obliquity integration's integrand: its own ŝ·n̂ carries the cosine). @param {number} year @returns {number} */
        torqueRateArcsecPerYrAtYear: (year: number) => number;
        /** 1,296,000/the torque rate, years. @param {number} year @returns {number} */
        torquePeriodYearsAtYear: (year: number) => number;
        /** cos ε̄(t)/cos ε̄(0) — the rate of date's obliquity factor on the constant (1 at J2000; 1.0075 at the Devonian, 1.0245 at 2.46 Ga). @param {number} year @returns {number} */
        precessionObliquityFactorAtYear: (year: number) => number;
        /** THE CITED MEAN OBLIQUITY OF DATE ε̄(t), degrees — Farhat et al. 2022's own column of the Earth–Moon history (a Myr-scale MEAN: 23.25° at age 0 against the J2000 instant 23.44°; 22.23° Devonian, 19.73° at 2.46 Ga); read as the shape cos ε̄(t)/cos ε̄(0) on the precession rate. NaN beyond the input's span (4,429 Ma); forward of J2000 the J2000 slope is held. @param {number} year @returns {number} */
        meanObliquityCitedDegAtYear: (year: number) => number;
        /** The of-date period — the one-family beat inside ±2 Myr, the composed mean beyond. @param {number} year @returns {number} */
        ofDatePeriodYearsAtYear: (year: number) => number;
        /** f_S, the solar fraction of the J2000 precession torque. */
        solarShareJ2000: number;
        /** THE PRECESSION OF DATE — the solar-torque factor 1 + f_S·([(1 − e²)/(1 − e₀²)]^(−3/2) − 1) at the eccentricity of date (1 at J2000; +3.2·10⁻⁴ on the million-year mean). The spin integration multiplies it into the secular rate. @param {number} year @returns {number} */
        solarTorqueFactorOfDateAtYear: (year: number) => number;
        /** THE PRECESSION OF DATE — J₂(t)/J₂₀, the oblateness of date from the GIA channel (ψ̇ ∝ J₂; 1 at J2000, bounded ±5·10⁻⁴; dJ₂/dt at J2000 = the observed satellite rate). @param {number} year @returns {number} */
        ellipticityRatioOfDateAtYear: (year: number) => number;
        /** (a₀/a_M(t))³ — the lunar torque's growth on the recession history. @param {number} year @returns {number} */
        lunarTorqueFactorAtYear: (year: number) => number;
        /** f_S + (1 − f_S)(a₀/a_M)³ — the torque term of the composed precession rate. @param {number} year @returns {number} */
        torqueTermAtYear: (year: number) => number;
        /** The hybrid's precession constant α = p₀ / cos ε₀, ″/yr (p₀ the derived J2000 rate, ε₀ the J2000 obliquity input; 54.81). */
        torqueConstantJ2000ArcsecPerYr: number;
        /** |s₃|, the dominant nodal mode of Earth's orbit — the largest-amplitude ζ mode of the banked deep secular modes, ″/yr (18.85; the obliquity beat's partner). ONE home for the registry, the browser and the API. */
        nodalModeS3ArcsecPerYr: number;
        /** The ecliptic (nodal) precession period 1,296,000/|s₃|, years (68,751) — an orbital quantity, fixed at every epoch at the two-body level. */
        nodalPeriodYears: number;
        /** THE SPIN AXIS'S INERTIAL PRECESSION RATE OF DATE, ″/yr — the composed rate scaled by the
         *  hybrid's self-anchor factor (the inertial-to-general ratio at J2000, the multiplicative form
         *  the obliquity integration itself applies): 50.385 at J2000 (series-driven). The obliquity beat and the
         *  obliquity lines ride THIS rate; the general precession (meanRateArcsecPerYrAtYear) is the
         *  equinox along the ecliptic of date. @param {number} year @returns {number} */
        spinAxisInertialRateArcsecPerYrAtYear: (year: number) => number;
        /** The obliquity beat 2π/(ψ̇ᵢₙ(t) − |s₃|), years — the SHIPPED deep-time obliquity period at an INSTANT
         *  (falsification leg 1; 41,098 at J2000). ψ̇ᵢₙ is the spin axis's INERTIAL rate (above): the equator
         *  against the ecliptic's nodal mode in the inertial frame, the rate the hybrid obliquity integration
         *  self-anchors on — not the general precession, which reads the beat 0.3 % long (41,224). v23.0: a
         *  dated record sees the beat of the pole rate's mean over its own window, with the pole's of-date
         *  factors (obliquityPeriodRealizedYears below: 40,927 over the LR04 record, the climate formula's p+s₀
         *  line; La2004's own series reads 40,900 on the same window — compare realized with realized, never
         *  this instant with Laskar's long-window precession frequency 50.476). @param {number} year @returns {number} */
        obliquityBeatYearsAtYear: (year: number) => number;
        /** THE REALIZED POLE RATE OVER A WINDOW, ″/yr — see the one home above (the mean of the inertial rate of
         *  date with its three of-date factors); the rate the obliquity lines of a record spanning the window carry. */
        spinAxisInertialRateMeanArcsecPerYr: (yearFrom: number, yearTo: number, stepYears?: number, opts?: {
            ellipticity?: boolean;
        }) => number;
        /** THE REALIZED OBLIQUITY PERIOD OVER A WINDOW, years — 1,296,000/(⟨ψ̇ᵢₙ⟩_window − |s₃|): the period a record
         *  spanning [yearFrom, yearTo] sees (40,930 over the LR04 record 0–5.32 Ma, 41,018 over the last Myr); the
         *  J2000 beat (obliquityBeatYearsAtYear) is its instantaneous limit.
         *  @param {number} yearFrom @param {number} yearTo @returns {number} */
        obliquityPeriodRealizedYears: (yearFrom: number, yearTo: number) => number;
        /** The apsidal (perihelion vs the stars) period of date, JULIAN years — the ONE movement's own apsidal rate (the scene's perihelion; anom/(anom − sid) of the one family, ≡ 360°/apsidalRateFixedArcsecPerJulianYr), inside the published window only; null beyond. Before 2026-09 this rode the planet chain's secular tangent, which parted from the scene's perihelion passages by seconds of anomalistic year within a few millennia (year-lengths.cjs). @param {number} year @returns {number|null} */
        apsidalPeriodYearsAtYear: (year: number) => number | null;
        /** T_aps(t) / T_p(t) — the apsidal period in of-date precession periods (4.33 at J2000, a reading; 0.84 … 9.9 across ±26 kyr, measured); null beyond the published window. @param {number} year @returns {number|null} */
        apsidalPerPrecessionAtYear: (year: number) => number | null;
        /** T_peri(t) = 1/(1/T_p + 1/T_aps) — the perihelion-of-date period (equinox precession + inertial perihelion motion, frame arithmetic at every epoch), JULIAN years, on the of-date T_p — ≡ the one family's anom/(anom − trop); null beyond the published window. @param {number} year @returns {number|null} */
        periOfDatePeriodYearsAtYear: (year: number) => number | null;
        /** T_peri(t) / T_p(t) (0.812 at J2000 — the J2000 reading); null beyond the published window. @param {number} year @returns {number|null} */
        periOfDatePerPrecessionAtYear: (year: number) => number | null;
        /** The published of-date window, years from 2000. */
        publishedWindowYears: 2000000;
        /** THE SPIN AXIS'S INERTIAL PRECESSION PERIOD at J2000, years (25,722 in the shipped,
         *  series-driven configuration) — the rate the hybrid obliquity integration self-anchors
         *  ŝ on (earth/deep-orbital-history, D4e): the general-precession anchor p₀ PLUS the
         *  planetary mean the N-body ecliptic's own motion carries (+0.097 ″/yr ≡ IAU's planetary
         *  precession ψ_A − p_A; the bare 18-mode table anchors 0.18 — the g₂-gap trap: pass the
         *  secular series). Two rates, two uses — the obliquity line frequencies p + s_i (the
         *  spin axis against the ecliptic's nodal modes, in the inertial frame) carry THIS
         *  rate; the climatic-precession lines p + g_i (the perihelion from the equinox along
         *  the ecliptic of date) carry p₀. */
        spinAxisInertialPeriodYearsJ2000: number;
        /** The same as a rate, ″/yr (50.385 at J2000 with the series; p₀ = 50.288 is the general precession). */
        spinAxisInertialRateArcsecPerYrJ2000: number;
    }>;
    earth: Readonly<{
        perihelionLongitudeDeg: (year: number) => number;
        obliquityDeg: (year: number) => number;
        /** The hybrid's own domain, [yearFrom, yearTo] — the banked ζ series' span, ±10 Myr about J2000 (the published surfaces serve `obliquityDeg` inside it only; null without a series, i.e. a bare createModel()). */
        obliquityHybridDomainYears: [number, number] | null;
        /** The cited mean obliquity of date ε̄(t) (Farhat et al. 2022's column), degrees — a Myr-scale mean; NaN beyond 4,429 Ma. @param {number} year @returns {number} */
        meanObliquityCitedDeg: (year: number) => number;
        eccentricity: (year: number) => number;
        inclinationDeg: (year: number) => number;
        ascendingNodeDeg: (year: number) => number;
    }>;
    lengths: Readonly<{
        tropicalYearDays: (year: number) => number;
        siderealYearDays: (year: number) => number;
        anomalisticYearDays: (year: number) => number;
        dayLengthSeconds: (year: number) => number;
        lodRealSeconds: (year: number) => number;
        siderealDaySeconds: (year: number) => number;
        stellarDaySeconds: (year: number) => number;
    }>;
    cardinal: Readonly<{
        jd: (year: number, type: string) => number;
        jdNearUT: (jdUT: number, type: string) => number;
        raDeg: (year: number, type: string) => number;
        yearLengthDays: (year: number, type: string) => number;
    }>;
    cardinalStructure: Readonly<{
        yearLengthSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
        eocOffsetSeconds: (year: number, type: "VE" | "SS" | "AE" | "WS") => number;
        spreadSeconds: (year: number) => {
            VE: number;
            SS: number;
            AE: number;
            WS: number;
            meanSeconds: number;
        };
        anomalisticYearSeconds: (year: number) => number;
    }>;
    yearLengths: Readonly<{
        tropicalYearSecondsAtYear: (year: number) => number;
        siderealYearSecondsAtYear: (year: number) => number;
        anomalisticYearSecondsAtYear: (year: number) => number;
        axialPrecessionYearsAtYear: (y: number) => number;
        perihelionPrecessionYearsAtYear: (y: number) => number;
        inclinationPrecessionYearsAtYear: (y: number) => number;
        generalPrecessionArcsecPerJulianYr: (y: number) => number;
        apsidalRateFixedArcsecPerJulianYr: (y: number) => number;
        cardinal: Readonly<{
            yearLengthSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
            eocOffsetSeconds: (y: number, type: "VE" | "SS" | "AE" | "WS") => number;
            spreadSeconds: (y: number) => {
                VE: number;
                SS: number;
                AE: number;
                WS: number;
                meanSeconds: number;
            };
        }>;
        planetaryRelAtYear: (year: number) => number;
    }>;
    moon: Readonly<{
        distanceKmAtYear: (year: number) => number;
        siderealMonthDaysAtYear: (year: number) => number;
        synodicMonthDays: number;
        eccSensitivities: Readonly<{
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
        lonDegAtJD: (jd: number) => number;
        betaDegAtJD: (jd: number) => number;
        distanceKmAtJD: (jd: number) => number;
        recordCumulativeBank: (limitYears: number) => {
            chains: {
                draconic: {
                    fwd: number[];
                    bwd: number[];
                    segmentYears: number;
                } | null;
                tropical: {
                    fwd: number[];
                    bwd: number[];
                    segmentYears: number;
                } | null;
                anomalistic: {
                    fwd: number[];
                    bwd: number[];
                    segmentYears: number;
                } | null;
                sidereal: {
                    fwd: number[];
                    bwd: number[];
                    segmentYears: number;
                } | null;
                jupiter: {
                    fwd: number[];
                    bwd: number[];
                    segmentYears: number;
                } | null;
            };
            carriers: Record<string, {
                fwd: number[];
                bwd: number[];
            }>;
            segmentYears: number;
            chainLimitYears: number;
        };
    }>;
    eclipse: Readonly<{
        sunLonDegAtJD: (jd: number) => number;
        sunLonCompletedDegAtJD: (jd: number) => number;
        /** The APPARENT Sun (completed geometric − the derived aberration constant + the leading nutation terms on the model's own arguments) — the quantity Horizons' observer ecliptic longitude is; the cardinal instants are its crossings. @param {number} jdUT @returns {number} */
        sunApparentLonDegAtJD: (jdUT: number) => number;
        findLunarInRange: (jdStart: number, jdEnd: number) => {
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            magnitudeUmbral: number;
            magnitudePenumbral: number;
        }[];
        findSolarInRange: (jdStart: number, jdEnd: number) => {
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        }[];
        deltaTSecondsAtJD: (jd: number) => number;
        /** The ΔT trend anchor at J2000 (seconds): the TT − UT bridge every finder axis adds to a
         *  true-UT JD. The joint ΔT fit's output, shipped in its own artifact (FIT.DT_ANCHOR —
         *  plan 14: never a constants-file input), exposed here so no consumer reaches into the
         *  constants for it. */
        ttBridgeSeconds: any;
        frameworkSunDeps: Readonly<{
            sunMeanLongitudeJ2000Deg: any;
            tropicalRateDegPerCy: number;
            eccentricityAt: (year: number) => number;
            perihelionLongitudeDegAt: (year: number) => number;
            meanLongitudeDegAt: (year: number) => number;
        }>;
        umbraGroundAtJD: (jd: number) => {
            latDeg: number;
            lonDeg: number;
        } | null;
        /** THE ONE GMST — mean sidereal time at Greenwich, degrees, at a UT JD (eclipse/besselian.cjs computeGmstDeg; the observer tier's hour angle). @param {number} jdUT @returns {number} */
        gmstDegAtJD: (jdUT: number) => number;
        solarLocalCircumstances: (jdGreatest: number, latDeg: number, lonDeg: number) => {
            kind: "none" | "partial" | "annular" | "total";
            magnitude: number;
            maxJd: number;
            contacts: {
                c1: number | null;
                c2: number | null;
                c3: number | null;
                c4: number | null;
            };
            centralDurationSeconds: number | null;
        };
    }>;
    climate: Readonly<{
        l1OrbitalPermil: (year: number) => number;
    }>;
    planets: Readonly<{
        keys: readonly string[];
        record: (k: string) => Record<string, any> | undefined;
        perihelionLongitudeDeg: (k: string, year: number) => number;
        ascendingNodeInvPlaneDeg: (k: string, year: number) => number;
        invPlaneInclinationDeg: (k: string, year: number) => number;
        eccentricity: (k: string, year: number) => number;
        spin: (k: string) => Readonly<{
            key: string;
            cassiniLocked: boolean;
            momentOfInertiaFactor: number;
            momentOfInertiaFactorClass: string;
            alphaArcsecPerYr: number;
            satelliteQuadrupole: number;
            satelliteAngularMomentum: number;
            spinRetrograde: boolean;
            meanMotionRadPerYr: number;
            obliquityJ2000Deg: number;
            spinPrecessionRateArcsecPerYrJ2000: number | null;
            axialPrecessionPeriodYearsJ2000: number | null;
            obliquityDegAtYear: (year: number) => number | null;
            spinPrecessionRateArcsecPerYrAtYear: (year: number) => number | null;
            obliquityEnvelopeDeg: (year: number, spanYr: number) => {
                minDeg: number;
                meanDeg: number;
                maxDeg: number;
            } | null;
            spinAxisEclipticJ2000AtYear: (year: number) => number[] | null;
            orbitNormalEclipticJ2000AtYear: (year: number) => number[];
            stepYr: number;
            maxSpanYr: 10000000;
        }>;
    }>;
}>;
