// ═══════════════════════════════════════════════════════════════════════════
// ASTRONOMICAL REFERENCE DATA — External values from IAU, JPL, Meeus.
// These are observational/published values, not model parameters.
// The main constants.js attaches ascNodeTiltCorrection after planets are defined.
// ═══════════════════════════════════════════════════════════════════════════

const ASTRO_REFERENCE = {
  // --- Earth orbital parameters (J2000) ---
  juneSolstice2000_JD: 2451716.575,       // June 21, 2000 01:48 UTC
  obliquityJ2000_deg: 23.439291111,            // IAU 2006 / Meeus (Capitaine et al. 2003)
  obliquityRate_arcsecPerCentury: -46.836769,  // IAU 2006 linear term ε₀ = 84381.406"
  earthEccentricityJ2000: 0.01671022,
  earthPerihelionLongitudeJ2000: 102.947,  // degrees
  earthAscendingNodeInvPlane: 284.51,      // Souami & Souchay (2012)
  earthInclinationPhaseAngle: 203.3195,
  // earthInvPlanePrecessionYears — model-derived (H/3), attached by constants.js

  perihelionPassageJ2000_JD: 2451547.042,  // Earth perihelion 2000 (Jan 3.542) — same as perihelionRefJD in constants.js

  // --- Earth inclination to invariable plane ---
  earthInclinationJ2000_deg: 1.57869,

  // --- Planet perihelion passage references (JPL Horizons, phase-optimized) ---
  mercuryPerihelionRef_JD: 2460335.9,
  venusPerihelionRef_JD: 2455464.42,
  marsPerihelionRef_JD: 2456499.441,
  jupiterPerihelionRef_JD: 2464224.5,
  saturnPerihelionRef_JD: 2452875.9,
  uranusPerihelionRef_JD: 2439699.8,
  neptunePerihelionRef_JD: 2409432.4,

  // --- Lunar mean longitude coefficients (Meeus, Ch. 47) ---
  moonMeanAnomalyJ2000_deg: 134.9634,
  moonMeanAnomalyRate_degPerDay: 13.06499295,
  moonMeanElongationJ2000_deg: 297.8502,
  moonMeanElongationRate_degPerDay: 12.19074912,
  sunMeanAnomalyJ2000_deg: 357.5291,
  sunMeanAnomalyRate_degPerDay: 0.98560028,
  moonArgLatJ2000_deg: 93.2720993,
  moonArgLatRate_degPerCentury: 483202.0175273,
  moonMeanElongationJ2000Full_deg: 297.8502042,
  moonMeanElongationRate_degPerCentury: 445267.1115168,

  // --- Cardinal point J2000 dates (observed) ---
  // Used as anchors by the cardinal point JD harmonic formula.
  cardinalPointAnchors: {
    SS: 2451716.575,       // Jun 21, 2000 01:48 UTC
    WS: 2451900.067346,    // Dec 21, 2000 01:37 UTC
    VE: 2451623.737525,    // Mar 20, 2000 05:42 UTC
    AE: 2451810.304175,    // Sep 22, 2000 19:18 UTC
  },

  // --- Fields attached by constants.js at wiring time ---
  // ascNodeTiltCorrection: { ... }  — derived from planet data
  // decCorrection: { ... }          — fitted coefficients (from fitted-coefficients.js)
  // raCorrection: { ... }           — fitted coefficients (from fitted-coefficients.js)
  // earthInvPlanePrecessionYears     — model-derived (H/3)
};


// ─── External reference values for comparison ────────────────────────────

const yearLengthRef = {
  tropicalYearVE: 365.242374,
  tropicalYearSS: 365.241626,
  tropicalYearAE: 365.242018,
  tropicalYearWS: 365.242740,
  tropicalYearMean: 365.2421897,
  anomalisticYear: 365.259636,
  siderealYear: 365.256363,
  iauPrecessionJ2000: 25771.57634,
  tropicalYearRateSecPerCentury: -0.53,
  solarDay: 86400.0,
  siderealDay: 86164.09053083288,
  stellarDay: 86164.0989036905,
};

const knownValues = {
  jupiterSaturnConjunctionPeriod: 19.859, // years (great conjunction)
  moonSynodicMonth: 29.530589, // days
  moonTropicalMonth: 27.321582, // days (approx)
  moonAnomalisticMonth: 27.554550, // days
  moonDraconicMonth: 27.212221, // days
  moonNodalPrecessionYears: 18.613, // years
  moonApsidalPrecessionYears: 8.849, // years
  moonDraconicYear: 346.620, // days
  sarosDays: 6585.32, // days (223 synodic months)
  exeligmosDays: 19755.96, // days (3x Saros)
};

module.exports = { ASTRO_REFERENCE, yearLengthRef, knownValues };
