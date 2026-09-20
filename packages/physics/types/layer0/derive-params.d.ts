export function deriveEpochParams(raw: RawEpochConstants): import("./index.js").EpochParams;
export type RawEpochConstants = {
    /**
     * IAU 2015 nominal (W)
     */
    solarLuminosityW: number;
    /**
     * Ulysses/ACE/Wind
     */
    solarWindKgPerS: number;
    /**
     * km/s (fallback 299792458 m/s if falsy)
     */
    speedOfLightKmPerS: number;
    alpha1PerMa: number;
    alpha3PerMa3: number;
    alpha4PerMa4: number;
    /**
     * H
     */
    holisticYearJ2000: number;
    meanSiderealYearSeconds: number;
    meanSiderealYearDaysKinematic: number;
    /**
     * M_SUN
     */
    sunMassKg: number;
    gmEarthAloneKm3S2: number;
    gmMoonAloneKm3S2: number;
    gravitationalConstantKm3KgS2: number;
    earthMoiFactorJ2000: number;
    earthDiameterKm: number;
    moonDistanceKm: number;
    moonOrbitalEccentricity: number;
    gmEarthMoonSystemKm3S2: number;
    /**
     * GM☉ (km³/s²) — the solar precession torque
     */
    gmSunKm3S2: number;
    /**
     * 1 AU (km)
     */
    astronomicalUnitKm: number;
    earthOrbitalEccentricityJ2000: number;
    moonEclipticInclinationJ2000Deg: number;
};
