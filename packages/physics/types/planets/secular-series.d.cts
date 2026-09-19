/**
 * @param {{
 *   series: {t0Yr: number,
 *            bodies: Object<string, {stepYr: number,
 *              zetaQ: ReadonlyArray<number>, zetaP: ReadonlyArray<number>,
 *              zQ: ReadonlyArray<number>, zP: ReadonlyArray<number>}>,
 *            verdict?: {planetHandover?: {rows?: Object<string, {pastKyr: number, futureKyr: number}>}}},
 *   anchorElements: Object<string, {e: number, lonPeriEclipticDeg: number,
 *     inclEclipticDeg: number, ascNodeEclipticDeg: number}>,
 *   invariablePlane?: {inclEclipticDeg: number, ascNodeEclipticDeg: number},
 *   planetZModes: Object<string, ReadonlyArray<{omegaRadPerYr:number,re:number,im:number}>>,
 *   planetZetaModes: Object<string, ReadonlyArray<{omegaRadPerYr:number,re:number,im:number}>>,
 * }} deps — the parsed series artifact, the chain's J2000 anchors + banked
 *   invariable plane, and the deep mode tables (the beyond-span tail).
 */
export function createSecularSeriesOverride({ series, anchorElements, invariablePlane, planetZModes, planetZetaModes }: {
    series: {
        t0Yr: number;
        bodies: {
            [x: string]: {
                stepYr: number;
                zetaQ: ReadonlyArray<number>;
                zetaP: ReadonlyArray<number>;
                zQ: ReadonlyArray<number>;
                zP: ReadonlyArray<number>;
            };
        };
        verdict?: {
            planetHandover?: {
                rows?: {
                    [x: string]: {
                        pastKyr: number;
                        futureKyr: number;
                    };
                };
            };
        };
    };
    anchorElements: {
        [x: string]: {
            e: number;
            lonPeriEclipticDeg: number;
            inclEclipticDeg: number;
            ascNodeEclipticDeg: number;
        };
    };
    invariablePlane?: {
        inclEclipticDeg: number;
        ascNodeEclipticDeg: number;
    };
    planetZModes: {
        [x: string]: ReadonlyArray<{
            omegaRadPerYr: number;
            re: number;
            im: number;
        }>;
    };
    planetZetaModes: {
        [x: string]: ReadonlyArray<{
            omegaRadPerYr: number;
            re: number;
            im: number;
        }>;
    };
}): {
    applyToElements: (nm: string, year: number, el: any) => any;
};
/** Anchored mode-sum: z(t) = Σ (re + i·im)·e^{iωt}, t years from J2000. */
export function modeSum(modes: ReadonlyArray<{
    omegaRadPerYr: number;
    re: number;
    im: number;
}>, t: number): number[];
