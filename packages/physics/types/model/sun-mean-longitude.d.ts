/** @param {import('./lunar-theory.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleSunMeanLongitude(ctx: import("./lunar-theory.js").Ctx): {
    sunL0Deg: any;
    sunTropicalRateDegPerCy: number;
    sunMeanLongitudeDegAt: ((year: number) => number) & {
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
export type Ctx = import("./lunar-theory.js").Ctx & ReturnType<typeof assembleSunMeanLongitude>;
