export type KcElements = {
    aAU: number;
    e: number;
    inclEclipticDeg: number;
    ascNodeEclipticDeg: number;
    lonPeriEclipticDeg: number;
    meanLonEclipticDeg: number;
    meanMotionDegPerYr?: number;
    argPeriDeg?: number;
    meanAnomalyDeg?: number;
    inclInvPlaneDeg?: number;
    ascNodeInvPlaneDeg?: number;
};
export type KcInvariablePlane = {
    inclEclipticDeg: number;
    ascNodeEclipticDeg: number;
};
export type KcCosSinTerm = {
    omegaRadPerYr: number;
    cos: number;
    sin: number;
};
export type KcComplexTerm = {
    omegaRadPerYr: number;
    re: number;
    im: number;
};
export type KcPoissonCosSinTerm = {
    comps: Array<{
        planet: string;
        sLam?: number;
        sPom?: number;
    }>;
    cos: number;
    sin: number;
};
export type KcPoissonComplexTerm = {
    comps: Array<{
        planet: string;
        sLam?: number;
        sPom?: number;
    }>;
    re: number;
    im: number;
};
export type KcAffine = {
    off: number;
    slope?: number;
};
export type KcPeriodicTerms = {
    windowAffine?: {
        [x: string]: KcAffine;
    };
    mlonArcsec?: KcCosSinTerm[];
    aPpm?: KcCosSinTerm[];
    z?: KcComplexTerm[];
    zeta?: KcComplexTerm[];
    poissonMlonArcsec?: KcPoissonCosSinTerm[];
    poissonZ?: KcPoissonComplexTerm[];
};
export type KcPlanetChain = {
    anchor: KcElements;
    periRateArcsecCy: number;
    meanMotionDegPerYr: (number | null);
    windowRates?: {
        meanMotionDegPerYr?: number;
        nodeRateArcsecCy?: number;
        eccDotPerCy?: number;
        inclDotArcsecCy?: number;
    };
    secularModes?: ({
        z: KcComplexTerm[];
        zeta: KcComplexTerm[];
    } | null);
    periodicTerms?: (KcPeriodicTerms | undefined);
    invariablePlane?: (KcInvariablePlane | undefined);
};
export const ANCHOR_EPOCH_YEAR: 2000;
export const ANCHOR_EPOCH_JD: 2451545;
/** Full osculating elements from a heliocentric ecliptic-J2000 state vector.
 *  @param {number[]} rKm  heliocentric position, km
 *  @param {number[]} vKmS heliocentric velocity, km/s
 *  @param {number} muKm3S2 GM_Sun + GM_planet
 *  @param {number} auKm   the model's AU in km (caller's single home)
 *  @returns {{aAU:number,e:number,inclEclipticDeg:number,ascNodeEclipticDeg:number,
 *             argPeriDeg:number,lonPeriEclipticDeg:number,meanAnomalyDeg:number,
 *             meanLonEclipticDeg:number,meanMotionDegPerYr:number}} */
export function computeOsculatingElements(rKm: number[], vKmS: number[], muKm3S2: number, auKm: number): {
    aAU: number;
    e: number;
    inclEclipticDeg: number;
    ascNodeEclipticDeg: number;
    argPeriDeg: number;
    lonPeriEclipticDeg: number;
    meanAnomalyDeg: number;
    meanLonEclipticDeg: number;
    meanMotionDegPerYr: number;
};
/** Solve Kepler's equation E − e·sinE = M (radians), Newton iteration.
 *  @param {number} meanAnomalyRad @param {number} e @returns {number} */
export function solveKeplerRad(meanAnomalyRad: number, e: number): number;
/** Heliocentric ecliptic-J2000 position from elements-of-date.
 *  @param {{aAU:number,e:number,inclEclipticDeg:number,ascNodeEclipticDeg:number,
 *           lonPeriEclipticDeg:number,meanLonEclipticDeg:number}} el
 *  @returns {{xAU:number,yAU:number,zAU:number,rAU:number}} */
export function computeHeliocentricEclipticFromElements(el: {
    aAU: number;
    e: number;
    inclEclipticDeg: number;
    ascNodeEclipticDeg: number;
    lonPeriEclipticDeg: number;
    meanLonEclipticDeg: number;
}): {
    xAU: number;
    yAU: number;
    zAU: number;
    rAU: number;
};
/** Poisson argument θ (radians) at `year`: Σ comps of s_lam·λ̄ + s_pom·ϖ over
 *  the referenced planets — λ̄ from the linear skeleton, ϖ(t) from the
 *  multi-mode secular sum (d'Alembert-complete arguments; K4.7b — RECORD
 *  ONLY: the era solve measured Poisson columns negative, no terms are
 *  exported; the machinery stands as the campaign record).
 *  @param {number} year @param {Object<string,KcPlanetChain>} allChains
 *  @param {Array<{planet:string,sLam?:number,sPom?:number}>} comps
 *  @returns {number} */
export function computePoissonArgRad(year: number, allChains: {
    [x: string]: KcPlanetChain;
}, comps: Array<{
    planet: string;
    sLam?: number;
    sPom?: number;
}>): number;
/** Elements-of-date for one planet.
 *  @param {number} year decimal year (epoch parameter first, per naming rule)
 *  @param {KcPlanetChain} planetChain
 *  @param {Object<string,KcPlanetChain>=} allChains  full chain set — required
 *         only when planetChain.periodicTerms carries Poisson-argument terms
 *  @returns {KcElements} elements at `year` */
export function computePlanetElementsAtYear(year: number, planetChain: KcPlanetChain, allChains?: {
    [x: string]: KcPlanetChain;
} | undefined): KcElements;
/**
 * The SECULAR apsidal tangent of date — dϖ/dt of the chain's smooth
 * mode-sum, deg per year, J2000-ecliptic frame, ±150-yr central stencil
 * (the same rate family the panel's Prec. cell displays). The chain
 * carries no short-period content, so the tangent is stencil-stable
 * (measured: Earth 11.6160″/yr flat from ±1 to ±500 yr). ONE home: the
 * year-length factory's anomalistic construction and every panel surface
 * wire THIS, so the displayed apsidal beats agree by construction.
 * @param {number} year decimal calendar year (epoch parameter first, per naming rule)
 * @param {KcPlanetChain} planetChain the planet's chain (buildPlanetChainsFromArtifactData)
 * @param {Object<string,KcPlanetChain>=} allChains the full chain map
 * @returns {number} deg/yr, prograde positive
 */
export function computeApsidalSecularDegPerYr(year: number, planetChain: KcPlanetChain, allChains?: {
    [x: string]: KcPlanetChain;
} | undefined): number;
/** The chain's canonical constructor from a PARSED governed artifact (K2.1 →
 *  K4.6c): anchors (the engine-extracted t=0 elements), era-typed window
 *  rates, the K4.7 secular mode tables, and the K4.5/K4.7b periodic layer.
 *  @param {*} art  the governed engine-D artifact, parsed (deep JSON —
 *         shape enforced by the generator's assertions, not retyped here)
 *  @param {{skeletonOnly?:boolean}=} opts  skeletonOnly omits the periodic
 *         layer — REQUIRED by the extraction/solve instruments, which
 *         measure the residual AGAINST the skeleton; a terms-bearing chain
 *         there would extract its own output.
 *  @returns {Object<string,KcPlanetChain>} */
export function buildPlanetChainsFromArtifactData(art: any, opts?: {
    skeletonOnly?: boolean;
} | undefined): {
    [x: string]: KcPlanetChain;
};
