/**
 * Assemble the model surfaces from a resolved constants context + fitted
 * coefficients. Internal: `createModel` in index.js composes this with the
 * §2d context validation and counterfactual hashing — call that, not this.
 *
 * @param {Readonly<Record<string, any>>} C  the frozen constants context
 * @param {Readonly<Record<string, any>>} F  the fitted coefficients
 * @param {import('./model/context.js').Laws} [laws]  research overrides for Earth's orbit laws
 *   (model/context.js); default {} = the shipped laws, bit-identical to before this parameter existed
 * @param {any} [secularSeriesArtifact]  the governed N-body secular series (the API/Node path; the
 *   npm package alone has no 8 MB series)
 * @param {import('./model/context.js').Options} [options]  `giaEllipticityOfDate: false` = the orbital
 *   forcing alone (model/context.js); default true = the shipped physics, bit-identical to before
 * @returns the assembled surfaces (epoch, earth, lengths, cardinal, moon, …) — type inferred so ReturnType stays precise
 */
export function assembleModel(C: Readonly<Record<string, any>>, F: Readonly<Record<string, any>>, laws?: import("./model/context.js").Laws, secularSeriesArtifact?: any, options?: import("./model/context.js").Options): Readonly<{
    time: Readonly<{
        yearFromJD: (jd: number) => number;
        jdFromYear: (year: number) => number;
        siTropicalYearDays: number;
        engineYearFromJDUT: (jdUT: number) => number;
        positionYearToJDUT: (year: number) => (number | null);
        jdUTToPositionYear: (jdUT: number) => (number | null);
        positionYearToJDTT: (year: number) => (number | null);
        jdTTToPositionYear: (jd: number) => (number | null);
        yearToJDUT: (year: number) => (number | null);
        jdUTToYear: (jdUT: number) => (number | null);
        yearToJDTT: (year: number) => (number | null);
        jdTTToYear: (jd: number) => (number | null);
        navigableYearRange: () => {
            yearMin: number;
            yearMax: number;
        };
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
        meanLongitudeDegAt: ((year: number) => number) & {
            recordSunCumulativeBank: (limitYears: number | {
                past: number;
                future: number;
            }) => {
                fwd: number[];
                bwd: number[];
            };
            sunSeatStatus: () => {
                fwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
                bwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
            };
        };
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
        meanPeriodYearsAtYear: (year: number) => number;
        meanRateArcsecPerYrAtYear: (year: number) => number;
        torqueRateArcsecPerYrAtYear: (year: number) => number;
        torquePeriodYearsAtYear: (year: number) => number;
        precessionObliquityFactorAtYear: (year: number) => number;
        meanObliquityCitedDegAtYear: (year: number) => number;
        ofDatePeriodYearsAtYear: (year: number) => number;
        solarShareJ2000: number;
        solarTorqueFactorOfDateAtYear: (year: number) => number;
        ellipticityRatioOfDateAtYear: (year: number) => number;
        lunarTorqueFactorAtYear: (year: number) => number;
        torqueTermAtYear: (year: number) => number;
        torqueConstantJ2000ArcsecPerYr: number;
        nodalModeS3ArcsecPerYr: number;
        nodalPeriodYears: number;
        spinAxisInertialRateArcsecPerYrAtYear: (year: number) => number;
        obliquityBeatYearsAtYear: (year: number) => number;
        spinAxisInertialRateMeanArcsecPerYr: (yearFrom: number, yearTo: number, stepYears?: number, opts?: {
            ellipticity?: boolean;
        }) => number;
        obliquityPeriodRealizedYears: (yearFrom: number, yearTo: number) => number;
        apsidalPeriodYearsAtYear: (year: number) => number | null;
        apsidalPerPrecessionAtYear: (year: number) => number | null;
        periOfDatePeriodYearsAtYear: (year: number) => number | null;
        periOfDatePerPrecessionAtYear: (year: number) => number | null;
        publishedWindowYears: 2000000;
        spinAxisInertialPeriodYearsJ2000: number;
        spinAxisInertialRateArcsecPerYrJ2000: number;
    }>;
    earth: Readonly<{
        perihelionLongitudeDeg: (year: number) => number;
        obliquityDeg: (year: number) => number;
        obliquityHybridDomainYears: [number, number] | null;
        obliquityBandAt: (year: number) => {
            minDeg: number;
            maxDeg: number;
            periodYears: number;
        };
        sceneObliquityDeg: (year: number) => number;
        sceneObliquityBandAt: (year: number) => {
            centreDeg: number;
            minDeg: number;
            maxDeg: number;
            hybridMeanDeg: number;
        };
        hybridBeatBandAt: (year: number) => {
            meanDeg: number;
            minDeg: number;
            maxDeg: number;
        };
        hybridBeatNodeAt: (k: number) => {
            meanDeg: number;
            minDeg: number;
            maxDeg: number;
        };
        hybridBeatNodeRange: [number, number] | null;
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
        axialTiltAtYear: (year: number) => {
            obliquityToOrbitDeg: number;
            obliquityToLaplacePoleDeg: number;
            state: number;
            moonDistanceRE: number;
            band: {
                minDeg: number | null;
                maxDeg: number | null;
            };
        } | null;
        axialTiltTransition: () => {
            ageMa: number;
            moonDistanceRE: number;
            lastState1Deg: number;
            state2Deg: number;
            bandAgeMa: {
                earliest: number;
                latest: number;
            };
        } | null;
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
            sun: {
                meanLongitude: {
                    fwd: number[];
                    bwd: number[];
                };
            };
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
            channel: {
                windowCenturies: number;
                segmentCenturies: number;
                exponents: {
                    s: number;
                    edge: {
                        fwd: number;
                        bwd: number;
                    };
                    fwd: number[];
                    bwd: number[];
                }[];
            };
            segmentYears: number;
            chainLimitYears: number;
        };
        bankSeatStatus: () => {
            sun: {
                meanLongitude: {
                    fwd: {
                        banked: number;
                        edge: number;
                        bankEdge: number | null;
                    };
                    bwd: {
                        banked: number;
                        edge: number;
                        bankEdge: number | null;
                    };
                };
            };
            chains: Record<string, {
                fwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
                bwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
            } | null>;
            carriers: Record<string, {
                fwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
                bwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
            }>;
            channel: {
                s: number;
                fwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
                bwd: {
                    banked: number;
                    edge: number;
                    bankEdge: number | null;
                };
            }[];
        };
    }>;
    eclipse: Readonly<{
        sunLonDegAtJD: (jd: number) => number;
        sunLonCompletedDegAtJD: (jd: number) => number;
        sunApparentLonDegAtJD: (jdUT: number) => number;
        findLunarInRange: (jdStart: number, jdEnd: number, opts?: {
            stepDays?: number;
        }) => {
            jd: number;
            jdOpposition: number;
            beta: number;
            leastDistanceDeg: number;
            moonDistance_km: number;
            type: string;
            magnitudeUmbral: number;
            magnitudePenumbral: number;
        }[];
        findSolarInRange: (jdStart: number, jdEnd: number, opts?: {
            stepDays?: number;
        }) => {
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        }[];
        formula: {
            meanSyzygyCountAt: (jdTT: number, kind: EclipseKind) => number | null;
            meanSyzygy: (k: number, kind: EclipseKind, jdTTSeed?: number) => {
                jdTT: number;
                jdUT: number;
            } | null;
            syzygy: (k: number, kind: EclipseKind, jdTTSeed?: number) => {
                k: number;
                jdMeanTT: number;
                jdMeanUT: number;
                jdTT: number;
                jdUT: number;
            } | null;
            eclipseAt: (k: number, kind: EclipseKind, jdTTSeed?: number) => EclipseOfDate | null;
            syzygiesInRange: (jdUTStart: number, jdUTEnd: number, kind: EclipseKind) => EclipseOfDate[];
            eclipsesInRange: (jdUTStart: number, jdUTEnd: number, kind: EclipseKind) => import("./eclipse/formula.cjs").EclipseOfDate[];
            nextEclipseAfter: (jdUT: number, kind: EclipseKind, opts?: {
                maxSyzygies?: number;
            }) => EclipseOfDate | null;
            statisticsAt: (jdTT: number) => {
                eclipseYearDays: number;
                nodeRegressionDays: number;
                seasonsPerYear: number;
                synodicMonthsPerYear: number;
                inclinationDeg: number;
                laplaceTiltDeg: number;
                approximate: boolean;
                lunar: {
                    limitDeg: {
                        penumbral: number;
                        partial: number;
                        total: number;
                    };
                    sinFLimit: {
                        penumbral: number;
                        partial: number;
                        total: number;
                    };
                    perYear: {
                        any: number;
                        umbral: number;
                        total: number;
                    };
                };
                solar: {
                    limitDeg: {
                        partial: number;
                        central: number;
                    };
                    sinFLimit: {
                        partial: number;
                        central: number;
                    };
                    perYear: {
                        any: number;
                        central: number;
                    };
                };
            } | null;
            recurrencesAt: (jdTT: number, opts?: Parameters<typeof import("./index.js").recurrencesOfDate>[1]) => {
                node: Recurrence[];
                anomaly: Recurrence[];
                year: Recurrence[];
            } | null;
            regimeAt: (jdTT: number) => "certified" | "reproducible";
            argumentsAt: (jdTT: number) => {
                Lp: number;
                D: number;
                M: number;
                Mp: number;
                F: number;
            };
            periodsAt: (jdTT: number) => (import("./eclipse/formula.cjs").PeriodsOfDate & {
                moonDistanceKm: number;
                inclinationDeg: number;
                laplaceTiltDeg: number;
            }) | null;
            elongationResidualDegAt: (jdUT: number, kind: EclipseKind) => number;
            certifiedWindowYears: Readonly<{
                min: -1999;
                max: 3000;
            }> | {
                min: number;
                max: number;
            };
        };
        deltaTSecondsAtJD: (jd: number) => number;
        ttBridgeSeconds: any;
        frameworkSunDeps: Readonly<{
            sunMeanLongitudeJ2000Deg: any;
            tropicalRateDegPerCy: number;
            eccentricityAt: (year: number) => number;
            perihelionLongitudeDegAt: (year: number) => number;
            meanLongitudeDegAt: ((year: number) => number) & {
                recordSunCumulativeBank: (limitYears: number | {
                    past: number;
                    future: number;
                }) => {
                    fwd: number[];
                    bwd: number[];
                };
                sunSeatStatus: () => {
                    fwd: {
                        banked: number;
                        edge: number;
                        bankEdge: number | null;
                    };
                    bwd: {
                        banked: number;
                        edge: number;
                        bankEdge: number | null;
                    };
                };
            };
        }>;
        umbraGroundAtJD: (jd: number) => {
            latDeg: number;
            lonDeg: number;
        } | null;
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
        shadowRadiiAtJD: (jdUT: number) => {
            penumbraKm: number;
            umbraKm: number;
            gamma: number;
            moonDistanceKm: number;
        };
        firstSolarEclipseAfterJD: (jdStart: number, opts?: {
            maxDays?: number;
        }) => {
            ground: {
                latDeg: number;
                lonDeg: number;
            } | null;
            ageMa: number;
            synodicMonthDays: number;
            penumbraKm: number;
            umbraKm: number;
            gamma: number;
            moonDistanceKm: number;
            jd: number;
            beta: number;
            moonDistance_km: number;
            type: string;
            moonAppR_topo: number;
            sunAppR: number;
            moonSunRatio: number;
        } | null;
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
/**
 * Compose the slices in order THROUGH the named one (its file name), merging each slice's result into the
 * shared context and filling the forward bindings — the composer's own walk, also the parity test's
 * counterfactual and the residual-spectra sweep's context (they stop early or read the context itself).
 * @param {any} inputs  { C, F, laws, secularSeriesArtifact, options, late }
 * @param {string} throughFile  the last slice to apply, e.g. 'published-periods' or 'cardinal-instants'
 */
export function composeThrough(inputs: any, throughFile: string): any;
/**
 * THE SLICE ORDER — ONE home (plan 15; the one-home fix of the plan-34 cascade, where the residual-spectra
 * sweep's hand-written twin of this list failed on a slice added here). Each entry is the slice's assembler, its
 * file under model/ (the generators hash the files: tools/lib/artifact-inputs.js modelSourceFiles), and the
 * forward bindings it fills the moment it returns (model/context.js). The Sun's mean-longitude table is its own
 * slice before the eclipse tier: the lunar bank hashes it and not the eclipse slice (modelSourceFilesExcluding).
 * The surface is the last slice and is RETURNED, not merged (assembleModel above); composeThrough stops before it.
 * @type {ReadonlyArray<{ name: string, file: string, assemble: (c: any) => any, after?: (c: any, late: any) => void }>}
 */
export const MODEL_SLICES: ReadonlyArray<{
    name: string;
    file: string;
    assemble: (c: any) => any;
    after?: (c: any, late: any) => void;
}>;
