/** @param {import('./planet-records.js').Ctx} ctx @returns the bindings the later slices read */
export function assemblePlanetSpinChannel(ctx: import("./planet-records.js").Ctx): {
    planetSpin: (k: string) => Readonly<{
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
};
export type Ctx = import("./planet-records.js").Ctx & ReturnType<typeof assemblePlanetSpinChannel>;
