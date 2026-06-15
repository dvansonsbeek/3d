/**
 * Validate the Phase 0 + Phase 1 deep-time chain just inserted into
 * src/script.js by loading the relevant section in isolation under Node.
 *
 * Phase 1 adds:
 *   - 5 epoch anchors converted `const` → `let` so they can be mutated by
 *     recomputeEpochAnchors(t_Ma).
 *   - J2000 snapshot constants frozen at module load so the mean*AtAge()
 *     functions keep computing FROM J2000 even after the globals mutate.
 *
 * Round-trip test at the end mutates the globals via recomputeEpochAnchors,
 * then re-checks mean*AtAge(0) still returns J2000 values — proving the
 * snapshots are doing their job.
 *
 * Run with:  node scripts/test_phase0_inline.js
 */

// ── Mirror the script.js global anchors (Phase 1: now `let` not `const`) ──
// (Phase 2 also flips: currentAUDistance, moonDistance, moonOrbitalShift,
//  moonDistanceCorrected, moonSiderealMonth, moonAnomalisticMonth, moonNodalMonth,
//  moonSynodicMonth, moonTropicalMonth, moonNodalPrecessionindaysEarth,
//  moonApsidalPrecessionindaysEarth)
let holisticyearLength               = 335317;
const inputmeanlengthsolaryearindays = 365.2422;
let meansolaryearlengthinDays        =
  Math.round(inputmeanlengthsolaryearindays * (holisticyearLength / 8))
    / (holisticyearLength / 8);

let   currentAUDistance      = 149597870.698828;
const speedOfLight           = 299792.458;
const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput    = 27.21222082;
let   moonDistance           = 384399.07;
const moonOrbitalEccentricityBase = 0.054900489;

const siderealYearJ2000           = 365.25636301;
let   meansiderealyearlengthinSeconds = siderealYearJ2000 * 86400;
let   meansiderealyearlengthinDays    =
  meansolaryearlengthinDays * (holisticyearLength / 13)
    / ((holisticyearLength / 13) - 1);
let   meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;

// Mass/GM section (all const — independent of epoch)
const G_CONSTANT          = 6.6743e-20;
const MASS_RATIO_EARTH_MOON = 81.30056816;
let   moonSiderealMonth   = (holisticyearLength * meansolaryearlengthinDays)
    / Math.round((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput);
let   moonAnomalisticMonth = (holisticyearLength * meansolaryearlengthinDays)
    / (Math.round((holisticyearLength * meansolaryearlengthinDays) / moonAnomalisticMonthInput) - 1);
let   moonNodalMonth      = (holisticyearLength * meansolaryearlengthinDays)
    / Math.round((holisticyearLength * meansolaryearlengthinDays) / moonNodalMonthInput);
let   moonSynodicMonth    = (holisticyearLength * meansolaryearlengthinDays)
    / (Math.round((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput) - 1 + 13 - holisticyearLength);
let   moonTropicalMonth   = (holisticyearLength * meansolaryearlengthinDays)
    / (Math.round((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput) - 1 + 13);
let   moonNodalPrecessionindaysEarth =
      (moonSiderealMonth / (moonSiderealMonth - moonNodalMonth)) * moonNodalMonth;
let   moonApsidalPrecessionindaysEarth =
      (1 / ((moonAnomalisticMonth / moonSiderealMonth) - 1)) * moonAnomalisticMonth;
let   moonOrbitalShift    = moonDistance * (1 / (MASS_RATIO_EARTH_MOON + 1))
    * (moonSiderealMonth / meansiderealyearlengthinDays);
let   moonDistanceCorrected = moonDistance + moonOrbitalShift;

// (Phase 8 mock declarations moved AFTER HOLISTIC_YEAR_J2000 — see below)

// === Phase 6.7 — sDay/sYear family ===
let   sDay    = 1 / meansolaryearlengthinDays;
let   sYear   = sDay * 365;
let   sMonth  = sDay * 30;
let   sWeek   = sDay * 7;
let   sHour   = sDay / 24;
let   sMinute = sHour / 60;
let   sSecond = sMinute / 60;
const SDAY_J2000    = sDay;
const SYEAR_J2000   = sYear;
const SMONTH_J2000  = sMonth;
const SWEEK_J2000   = sWeek;
const SHOUR_J2000   = sHour;
const SMINUTE_J2000 = sMinute;
const SSECOND_J2000 = sSecond;
function recomputeTimeUnitsForEpoch(t_Ma) {
  sDay    = 1 / meansolaryearlengthinDays;
  sYear   = sDay * 365;
  sMonth  = sDay * 30;
  sWeek   = sDay * 7;
  sHour   = sDay / 24;
  sMinute = sHour / 60;
  sSecond = sMinute / 60;
  return true;
}

// === Phase 6.5 — H alias + Moon ICRF helpers + PERI_HARMONICS ===
// Mock subset of Moon helpers; full set tested in script.js context.
let   H = holisticyearLength;
// PERI_HARMONICS sample (5 rows; the real table has 28)
const PERI_HARMONICS = [
  [H/3, -0.131811,  0.007264],
  [H/5, -0.003219,  0.000012],
  [H/8,  0.120192, -0.007799],
  [H/13, 0.011620,  0.000536],
  [H/16, 4.835748, -0.021962],
];
const PERI_HARMONICS_J2000_PERIODS = PERI_HARMONICS.map(r => r[0]);
// Moon ICRF samples
let   moonFullMoonCycleEarth          = 411.78443029;  // J2000 anchor (synthetic — exact formula depends on full Phase 2 mock)
let   moonFullMoonCycleICRF           = (holisticyearLength * meansolaryearlengthinDays) /
                                        ((holisticyearLength * meansolaryearlengthinDays / moonFullMoonCycleEarth) + 13);
let   moonApsidalMeetsNodalindays     = 5997.5;        // J2000 anchor (synthetic)
let   moonLunarLevelingCycleindays    = 161960.7;      // J2000 anchor (synthetic)

function rebuildPeriHarmonicsForEpoch(t_Ma) {
  const r = holisticyearLength / HOLISTIC_YEAR_J2000;
  for (let i = 0; i < PERI_HARMONICS.length; i++) {
    PERI_HARMONICS[i][0] = PERI_HARMONICS_J2000_PERIODS[i] * r;
  }
  return true;
}
function recomputeMoonDerivedForEpoch(t_Ma) {
  // Subset that we can mock without full Phase 2 chain
  const Hdays = holisticyearLength * meansolaryearlengthinDays;
  moonFullMoonCycleICRF = Hdays / ((Hdays / moonFullMoonCycleEarth) + 13);
  return true;
}

// === Phase 6 supporting J2000 anchor constants (stay const) ===
const perihelionalignmentYear      = 1246.03125;
const temperatureGraphMostLikely   = 14.5;
const systemResetN                 = 7;
const startmodelYearH              = 2000.5;
const correctionDaysH              = -0.828832119703292;
const correctionSun                = 0.4955138066654289;
const startmodelJD                 = 2451716.5;
const ASTRO_REFERENCE              = { perihelionPassageJ2000_JD: 2451547.5 };
const startmodelyearwithCorrection = startmodelYearH + (correctionDaysH / meansolaryearlengthinDays);

// === Phase 6 let-converted derived anchors ===
let   perihelionCycleLength  = holisticyearLength / 16;
let   balancedYear           = perihelionalignmentYear - (temperatureGraphMostLikely * (holisticyearLength / 16));
let   _eccentricityAnchor    = balancedYear - systemResetN * holisticyearLength;
let   perihelionPhaseOffset  = (((startmodelyearwithCorrection - balancedYear) / (holisticyearLength / 16) * 360
  + correctionSun + 360 * (startmodelJD - ASTRO_REFERENCE.perihelionPassageJ2000_JD) / meansolaryearlengthinDays) % 360 + 360) % 360;
let   meanearthRotationsinDays  = meansolaryearlengthinDays + 1;
let   earthPerihelionICRFYears  = holisticyearLength / 3;
let   meanSiderealday           = (meansolaryearlengthinDays / (meansolaryearlengthinDays + 1)) * meanlengthofday;
let   meanStellarday            = (meanSiderealday / (holisticyearLength / 13)) / (meansolaryearlengthinDays + 1) + meanSiderealday;
let   perihelionCoinRotationMs  = (meanlengthofday / (holisticyearLength / 16)) / meansolaryearlengthinDays * 1000;
let   perihelionCoinRotationYearlySeconds = perihelionCoinRotationMs * meansolaryearlengthinDays / 1000;
let   axialCoinRotationMs       = (meanSiderealday / (holisticyearLength / 13)) / (meansolaryearlengthinDays + 1) * 1000;
let   axialCoinRotationYearlySeconds = axialCoinRotationMs * (meansolaryearlengthinDays + 1) / 1000;
let   meanAnomalisticYearinDays = (meansolaryearlengthinDays / (perihelionCycleLength - 1)) + meansolaryearlengthinDays;
const ECC_CYCLE_SCALE            = { earth: perihelionCycleLength };
const eccentricityBase           = 0.015385784721782658;
const eccentricityAmplitude      = 0.0013561739066062727;

// Mirror computeEccentricityEarth (the per-frame consumer)
function computeEccentricityEarth(currentYear, balYr, periCyc, eccB, eccA) {
  const θ = ((currentYear - balYr) / periCyc) * 2 * Math.PI;
  return Math.sqrt(eccB * eccB + eccA * eccA - 2 * eccB * eccA * Math.cos(θ));
}

// Phase 6 recompute (mirror of script.js function)
function recomputeDerivedAnchorsForEpoch(t_Ma) {
  perihelionCycleLength = holisticyearLength / 16;
  balancedYear          = perihelionalignmentYear - (temperatureGraphMostLikely * perihelionCycleLength);
  _eccentricityAnchor   = balancedYear - systemResetN * holisticyearLength;
  perihelionPhaseOffset = (((startmodelyearwithCorrection - balancedYear) / perihelionCycleLength * 360
    + correctionSun
    + 360 * (startmodelJD - ASTRO_REFERENCE.perihelionPassageJ2000_JD) / meansolaryearlengthinDays) % 360 + 360) % 360;
  ECC_CYCLE_SCALE.earth = perihelionCycleLength;
  meanearthRotationsinDays  = meansolaryearlengthinDays + 1;
  earthPerihelionICRFYears  = holisticyearLength / 3;
  meanSiderealday           = (meansolaryearlengthinDays / (meansolaryearlengthinDays + 1)) * meanlengthofday;
  meanStellarday            = (meanSiderealday / (holisticyearLength / 13)) / (meansolaryearlengthinDays + 1) + meanSiderealday;
  perihelionCoinRotationMs  = (meanlengthofday / (holisticyearLength / 16)) / meansolaryearlengthinDays * 1000;
  perihelionCoinRotationYearlySeconds = perihelionCoinRotationMs * meansolaryearlengthinDays / 1000;
  axialCoinRotationMs       = (meanSiderealday / (holisticyearLength / 13)) / (meansolaryearlengthinDays + 1) * 1000;
  axialCoinRotationYearlySeconds = axialCoinRotationMs * (meansolaryearlengthinDays + 1) / 1000;
  meanAnomalisticYearinDays = (meansolaryearlengthinDays / (perihelionCycleLength - 1)) + meansolaryearlengthinDays;
  return true;
}
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistanceCorrected, 3))
    / Math.pow(moonSiderealMonth * meanlengthofday, 2);
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
const M_EARTH_ALONE  = GM_EARTH_ALONE / G_CONSTANT;
const GM_MOON_ALONE  = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1);
const M_MOON_ALONE   = GM_MOON_ALONE / G_CONSTANT;
const meanAUDistance = currentAUDistance;
const GM_SUN_PLUS_EARTH = (4 * Math.PI * Math.PI * Math.pow(meanAUDistance, 3))
    / Math.pow(meansiderealyearlengthinSeconds, 2);
const GM_SUN = GM_SUN_PLUS_EARTH - GM_EARTH_ALONE;
const M_SUN  = GM_SUN / G_CONSTANT;

const diameters = { earthDiameter: 12756.27 };
const MERCURY_SOLAR_YEAR_INPUT_D = 87.96952;     // J2000 IAU period in days
let   mercurySolarYearCount = Math.round((holisticyearLength * meansolaryearlengthinDays) / MERCURY_SOLAR_YEAR_INPUT_D);
let   mercuryOrbitDistance  = (((holisticyearLength / mercurySolarYearCount) ** 2) ** (1 / 3));

// ═══════════════════════════════════════════════════════════════════
// PHASE 0 + PHASE 1 BLOCK — copied verbatim from src/script.js
// ═══════════════════════════════════════════════════════════════════

const CANONICAL_TIDAL_RATE_HR_PER_MA = 0.00526;
const MODERN_TIDAL_RATE_HR_PER_MA    = 0.006;

const EARTH_MOI_FACTOR = 0.3306947;
const R_EARTH_M        = (diameters.earthDiameter / 2) * 1000;
const I_EARTH          = EARTH_MOI_FACTOR * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;

const L_SUN_W              = 3.828e26;
const SOLAR_WIND_KG_PER_S  = 1.6e9;
const C_SI_M_PER_S         = speedOfLight * 1000;
const dM_dt_radiation_kg_s = L_SUN_W / (C_SI_M_PER_S * C_SI_M_PER_S);
const dM_dt_total_kg_s     = dM_dt_radiation_kg_s + SOLAR_WIND_KG_PER_S;
const SOLAR_MASS_LOSS_FRAC_PER_YR =
      dM_dt_total_kg_s * meansiderealyearlengthinSeconds / M_SUN;

const LOD_NOW_H13_S = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;

// ── J2000 snapshots ──
const HOLISTIC_YEAR_J2000        = holisticyearLength;

// Phase 8 helpers (need meanHAtAge and HOLISTIC_YEAR_J2000)
const perihelionalignmentYearH8 = 1246.03125;
function integralInverseHFromYears(yearA, yearB, N = 1000) {
  if (yearA === yearB) return 0;
  const span = yearB - yearA;
  const h = span / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const year_i = yearA + i * h;
    const t_Ma = (2000.5 - year_i) / 1e6;
    const H_i = meanHAtAge(t_Ma);
    if (H_i === null) return null;
    const weight = (i === 0 || i === N) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += weight / H_i;
  }
  return sum * h / 3;
}
function cyclesBetweenYears(yearA, yearB, divisor_N) {
  const integral = integralInverseHFromYears(yearA, yearB);
  return integral === null ? null : divisor_N * integral;
}
function phaseAdvanceRadians(yearAnchor, year, divisor_N) {
  const cycles = cyclesBetweenYears(yearAnchor, year, divisor_N);
  return cycles === null ? null : cycles * 2 * Math.PI;
}
const BALANCED_YEAR_J2000_FIXED_H8 = perihelionalignmentYearH8 - 14.5 * (HOLISTIC_YEAR_J2000 / 16);
const PERIHELION_CYCLE_LENGTH_J2000_FIXED_H8 = HOLISTIC_YEAR_J2000 / 16;
function computeEccentricityEarthH8(currentYear, anchorYearJ2000, cycleLengthJ2000, eccB, eccA) {
  const divisor_N = HOLISTIC_YEAR_J2000 / cycleLengthJ2000;
  const phase = phaseAdvanceRadians(anchorYearJ2000, currentYear, divisor_N);
  if (phase === null) return Math.sqrt(eccB*eccB + eccA*eccA);
  return Math.sqrt(eccB*eccB + eccA*eccA - 2*eccB*eccA*Math.cos(phase));
}

const MEAN_SIDEREAL_YEAR_J2000_S = meansiderealyearlengthinSeconds;
const MEAN_TROPICAL_YEAR_J2000_S = meansolaryearlengthinDays * meanlengthofday;
const AU_J2000_KM                = currentAUDistance;
const MOON_DISTANCE_J2000_KM     = moonDistance;
const MERCURY_ORBIT_DISTANCE_J2000 = mercuryOrbitDistance;
const MERCURY_PERIOD_J2000_S       = MERCURY_SOLAR_YEAR_INPUT_D * 86400;
// Phase 5 J2000 snapshots defined later (after `planets` mock below)
const MOON_APSIDAL_J2000_S =
  (1 / ((moonAnomalisticMonthInput / moonSiderealMonthInput) - 1))
  * moonAnomalisticMonthInput * LOD_NOW_H13_S;
const MOON_NODAL_J2000_S =
  (moonSiderealMonthInput / (moonSiderealMonthInput - moonNodalMonthInput))
  * moonNodalMonthInput * LOD_NOW_H13_S;
const MOON_SIDEREAL_MONTH_J2000_S = moonSiderealMonthInput * LOD_NOW_H13_S;

const A_MOON_NOW_M    = moonDistance * 1000;
const E_FACTOR_MOON   = Math.sqrt(1 - moonOrbitalEccentricityBase * moonOrbitalEccentricityBase);
const GM_EM_M3S2      = GM_EARTH_MOON_SYSTEM * 1e9;
const L_TOTAL_EM_KGM2_S = (I_EARTH * 2 * Math.PI / LOD_NOW_H13_S)
                        + (M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * A_MOON_NOW_M) * E_FACTOR_MOON);
const A_LOCK_M        = (L_TOTAL_EM_KGM2_S / (M_MOON_ALONE * Math.sqrt(GM_EM_M3S2) * E_FACTOR_MOON)) ** 2;

const ALPHA_1 = -8.8658188951e-05;
const ALPHA_3 = -6.4186463489e-12;
const ALPHA_4 = +1.3619800519e-16;

const TOTAL_DAYS_IN_H = holisticyearLength * meansolaryearlengthinDays;

function meanMoonDistanceMetresAtAge(t_Ma) {
  const t = t_Ma;
  return A_MOON_NOW_M * (1 + ALPHA_1*t + ALPHA_3*t*t*t + ALPHA_4*t*t*t*t);
}
function meanLodSecondsAtAge(t_Ma) {
  const a = meanMoonDistanceMetresAtAge(t_Ma);
  if (a <= 0 || a >= A_LOCK_M) return null;
  return (2 * Math.PI * I_EARTH) /
         (L_TOTAL_EM_KGM2_S - M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * a) * E_FACTOR_MOON);
}
function meanLodHoursAtAge(t_Ma) {
  const s = meanLodSecondsAtAge(t_Ma);
  return (s === null) ? null : s / 3600;
}
function meanHAtAge(t_Ma) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  return HOLISTIC_YEAR_J2000 * LOD_s / LOD_NOW_H13_S;
}
function meanAuAtAge(t_Ma) {
  if (t_Ma === 0) return AU_J2000_KM;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return AU_J2000_KM * (1 - mass_loss_fraction);
}
function meanSiderealYearSecondsAtAge(t_Ma) {
  if (t_Ma === 0) return MEAN_SIDEREAL_YEAR_J2000_S;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return MEAN_SIDEREAL_YEAR_J2000_S * (1 - 2 * mass_loss_fraction);
}
function meanTropicalYearSecondsAtAge(t_Ma) {
  if (t_Ma === 0) return MEAN_TROPICAL_YEAR_J2000_S;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return MEAN_TROPICAL_YEAR_J2000_S * (1 - 2 * mass_loss_fraction);
}
function meanYearInDaysAtAge(t_Ma) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  return meanTropicalYearSecondsAtAge(t_Ma) / LOD_s;
}
function meanSolarDeltaAAtAge(t_Ma, a_apparent_km) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  const T_sid_d_at_epoch = meanSiderealYearSecondsAtAge(t_Ma) / LOD_s;
  return a_apparent_km * (1 / (MASS_RATIO_EARTH_MOON + 1)) *
         (moonSiderealMonthInput / T_sid_d_at_epoch);
}
function meanMoonDistanceAtAge(t_Ma) {
  return meanMoonDistanceMetresAtAge(t_Ma) / 1000;
}
function meanMoonDistanceCorrectedAtAge(t_Ma) {
  const a_app = meanMoonDistanceAtAge(t_Ma);
  const dA    = meanSolarDeltaAAtAge(t_Ma, a_app);
  return (dA === null) ? null : a_app + dA;
}
function meanMoonSiderealMonthAtAge(t_Ma) {
  const a_corr_km = meanMoonDistanceCorrectedAtAge(t_Ma);
  if (a_corr_km === null) return null;
  return 2 * Math.PI * Math.sqrt(Math.pow(a_corr_km * 1000, 3) / GM_EM_M3S2);
}
function meanAnomalisticYearSecondsAtAge(t_Ma) {
  const H_t      = meanHAtAge(t_Ma);
  const T_sid_s  = meanSiderealYearSecondsAtAge(t_Ma);
  const T_trop_s = T_sid_s * (H_t - 13) / H_t;
  return T_trop_s * H_t / (H_t - 16);
}
function meanStellarDayAtAge(t_Ma) {
  const T_sid_s = meanSiderealYearSecondsAtAge(t_Ma);
  const LOD_s   = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  return T_sid_s / (T_sid_s / LOD_s + 1);
}
function meanSiderealDayAtAge(t_Ma) {
  const T_sid_s = meanSiderealYearSecondsAtAge(t_Ma);
  const LOD_s   = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  const H_t = meanHAtAge(t_Ma);
  return T_sid_s / (T_sid_s / LOD_s + 1 + 13 / H_t);
}
function meanSynodicMonthAtAge(t_Ma) {
  const T_sm = meanMoonSiderealMonthAtAge(t_Ma);
  if (T_sm === null) return null;
  const T_yr = meanSiderealYearSecondsAtAge(t_Ma);
  return T_sm * T_yr / (T_yr - T_sm);
}
function meanTropicalMonthAtAge(t_Ma) {
  const T_sm = meanMoonSiderealMonthAtAge(t_Ma);
  if (T_sm === null) return null;
  const T_yr = meanSiderealYearSecondsAtAge(t_Ma);
  const H_t  = meanHAtAge(t_Ma);
  return T_sm * (1 - 13 * T_sm / (H_t * T_yr));
}
function meanLunarPerigeePrecessionAtAge(t_Ma) {
  if (t_Ma === 0) return MOON_APSIDAL_J2000_S;
  const T_sm_t = meanMoonSiderealMonthAtAge(t_Ma);
  const T_yr_t = meanSiderealYearSecondsAtAge(t_Ma);
  if (T_sm_t === null) return null;
  return MOON_APSIDAL_J2000_S
    * Math.pow(T_yr_t / MEAN_SIDEREAL_YEAR_J2000_S, 2)
    * (MOON_SIDEREAL_MONTH_J2000_S / T_sm_t);
}
function meanLunarNodePrecessionAtAge(t_Ma) {
  if (t_Ma === 0) return MOON_NODAL_J2000_S;
  const T_sm_t = meanMoonSiderealMonthAtAge(t_Ma);
  const T_yr_t = meanSiderealYearSecondsAtAge(t_Ma);
  if (T_sm_t === null) return null;
  return MOON_NODAL_J2000_S
    * Math.pow(T_yr_t / MEAN_SIDEREAL_YEAR_J2000_S, 2)
    * (MOON_SIDEREAL_MONTH_J2000_S / T_sm_t);
}
function meanAnomalisticMonthAtAge(t_Ma) {
  const T_sm  = meanMoonSiderealMonthAtAge(t_Ma);
  const T_per = meanLunarPerigeePrecessionAtAge(t_Ma);
  if (T_sm === null || T_per === null) return null;
  return T_sm * T_per / (T_per - T_sm);
}
function meanNodalMonthAtAge(t_Ma) {
  const T_sm   = meanMoonSiderealMonthAtAge(t_Ma);
  const T_node = meanLunarNodePrecessionAtAge(t_Ma);
  if (T_sm === null || T_node === null) return null;
  return T_sm * T_node / (T_node + T_sm);
}
function recomputeEpochAnchors(t_Ma) {
  const H_t   = meanHAtAge(t_Ma);
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (H_t === null || LOD_s === null) return false;
  const T_sid_s  = meanSiderealYearSecondsAtAge(t_Ma);
  const T_trop_s = meanTropicalYearSecondsAtAge(t_Ma);
  holisticyearLength              = H_t;
  meanlengthofday                 = LOD_s;
  meansiderealyearlengthinSeconds = T_sid_s;
  meansiderealyearlengthinDays    = T_sid_s / LOD_s;
  meansolaryearlengthinDays       = T_trop_s / LOD_s;
  if (typeof recomputeTimeUnitsForEpoch === 'function') recomputeTimeUnitsForEpoch(t_Ma);  // Phase 6.7
  return true;
}
function meanMercurySemiMajorAxisAtAge(t_Ma) { return MERCURY_ORBIT_DISTANCE_J2000 * meanAuAtAge(t_Ma); }
function meanPlanetOrbitalPeriodAtAge(t_Ma, T_p_J2000_s) {
  if (t_Ma === 0) return T_p_J2000_s;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return T_p_J2000_s * Math.pow(1 - mass_loss_fraction, 2);
}
function recomputePlanetCyclesForEpoch(t_Ma) {
  const H_t = meanHAtAge(t_Ma);
  if (H_t === null) return false;
  const r = H_t / HOLISTIC_YEAR_J2000;
  planets.mercury.perihelionEclipticYears = PERIHELION_ECLIPTIC_YEARS_J2000.mercury * r;
  planets.mercury.axialPrecessionYears    = AXIAL_PRECESSION_YEARS_J2000.mercury    * r;
  planets.mercury.obliquityCycle          = OBLIQUITY_CYCLE_J2000.mercury           * r;
  mercuryWobblePeriod   = calcWobblePeriod(planets.mercury.perihelionEclipticYears, planets.mercury.axialPrecessionYears);
  mercuryObliquityCycle = planets.mercury.obliquityCycle;
  return true;
}
function recomputePlanetCountsForEpoch(t_Ma) {
  const H_t      = meanHAtAge(t_Ma);
  const T_yr_s_t = meanTropicalYearSecondsAtAge(t_Ma);
  if (H_t === null) return false;
  const H_s_t = H_t * T_yr_s_t;
  const T_p_t = meanPlanetOrbitalPeriodAtAge(t_Ma, MERCURY_PERIOD_J2000_S);
  mercurySolarYearCount = Math.round(H_s_t / T_p_t);
  mercuryOrbitDistance  = Math.pow(Math.pow(H_t / mercurySolarYearCount, 2), 1/3);
  return true;
}
function recomputeMoonAndAuForEpoch(t_Ma) {
  const a_app = meanMoonDistanceAtAge(t_Ma);
  if (a_app === null) return false;
  const a_corr_km = meanMoonDistanceCorrectedAtAge(t_Ma);
  const T_sm_s    = meanMoonSiderealMonthAtAge(t_Ma);
  const T_anom_s  = meanAnomalisticMonthAtAge(t_Ma);
  const T_nod_s   = meanNodalMonthAtAge(t_Ma);
  const T_syn_s   = meanSynodicMonthAtAge(t_Ma);
  const T_trop_s  = meanTropicalMonthAtAge(t_Ma);
  const LOD_s     = meanLodSecondsAtAge(t_Ma);
  moonDistance          = a_app;
  moonDistanceCorrected = a_corr_km;
  moonOrbitalShift      = a_corr_km - a_app;
  currentAUDistance     = meanAuAtAge(t_Ma);
  moonSiderealMonth     = T_sm_s   / LOD_s;
  moonAnomalisticMonth  = T_anom_s / LOD_s;
  moonNodalMonth        = T_nod_s  / LOD_s;
  moonSynodicMonth      = T_syn_s  / LOD_s;
  moonTropicalMonth     = T_trop_s / LOD_s;
  moonNodalPrecessionindaysEarth   = (moonSiderealMonth / (moonSiderealMonth - moonNodalMonth)) * moonNodalMonth;
  moonApsidalPrecessionindaysEarth = (1 / ((moonAnomalisticMonth / moonSiderealMonth) - 1)) * moonAnomalisticMonth;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════

const checks = [];
function check(label, actual, expected, tol_rel = 1e-6, tol_abs = null) {
  const diff = Math.abs(actual - expected);
  const rel  = diff / Math.abs(expected || 1);
  const pass = (actual === expected)
    ? true
    : (tol_abs ? diff < tol_abs : rel < tol_rel);
  checks.push({label, actual, expected, diff, rel, pass});
}

console.log('=== J2000 anchors at t_Ma = 0 ===\n');

check('holisticyearLength',                holisticyearLength,                  335317);
check('meanHAtAge(0)',                     meanHAtAge(0),                       335317);
check('meanLodSecondsAtAge(0)',            meanLodSecondsAtAge(0),              LOD_NOW_H13_S, 1e-12);
check('meanAuAtAge(0)',                    meanAuAtAge(0),                      currentAUDistance);
check('meanSiderealYearSecondsAtAge(0)',   meanSiderealYearSecondsAtAge(0),     meansiderealyearlengthinSeconds);
check('meanTropicalYearSecondsAtAge(0)',   meanTropicalYearSecondsAtAge(0),     meansolaryearlengthinDays * meanlengthofday);
check('meanMoonDistanceAtAge(0)',          meanMoonDistanceAtAge(0),            moonDistance);
check('Moon T_sidereal d at 0',
      meanMoonSiderealMonthAtAge(0) / meanlengthofday,
      27.321662, 5e-5);
check('Anomalistic year d at 0',
      meanAnomalisticYearSecondsAtAge(0) / meanlengthofday,
      365.259633, 5e-5);
check('Stellar day s at 0', meanStellarDayAtAge(0), 86164.0997, null, 1.0);
check('Sidereal day s at 0', meanSiderealDayAtAge(0), 86164.0905, null, 1.0);

console.log(`  LOD_NOW_H13_S          = ${LOD_NOW_H13_S.toFixed(6)} s   (target ≈ 86399.999677)`);
console.log(`  HOLISTIC_YEAR_J2000    = ${HOLISTIC_YEAR_J2000}   (target = 335,317)`);
console.log(`  MEAN_SIDEREAL_YEAR_J2000_S = ${MEAN_SIDEREAL_YEAR_J2000_S.toFixed(6)} s`);
console.log(`  TOTAL_DAYS_IN_H        = ${TOTAL_DAYS_IN_H.toFixed(3)}   (target ≈ 122,471,920)`);
console.log(`  MOON_APSIDAL_J2000_S   = ${(MOON_APSIDAL_J2000_S / (86400 * 365.25)).toFixed(4)} yr   (target ≈ 8.85)`);
console.log(`  MOON_NODAL_J2000_S     = ${(MOON_NODAL_J2000_S   / (86400 * 365.25)).toFixed(4)} yr   (target ≈ 18.60)`);
console.log();

console.log('=== Devonian (t_Ma = 380) — proper-physics formula ===\n');

const lodDev = meanLodSecondsAtAge(380);
const hDev   = meanHAtAge(380);
const moonDev= meanMoonDistanceAtAge(380);
const dADev  = meanSolarDeltaAAtAge(380, moonDev);
const moonDevC = meanMoonDistanceCorrectedAtAge(380);
const tsmDev = meanMoonSiderealMonthAtAge(380);
const auDev  = meanAuAtAge(380);

check('LOD (s) at 380 Ma',           lodDev,    79640.47, 1e-3);
check('LOD (hr) at 380 Ma',          lodDev / 3600, 22.122, 1e-3);
check('H (yr) at 380 Ma',            hDev,      309083.39, 1e-3);
check('Moon a (km) at 380 Ma',       moonDev,   371314.33, 1e-3);
check('Solar Δa (km) at 380 Ma',     dADev,     311.10, 1e-2);
check('Moon a_corr (km) at 380 Ma',  moonDevC,  371625.43, 1e-3);
check('AU at 380 Ma',                auDev,     149592585, 1e-3);

const daysPerYrDev = meanYearInDaysAtAge(380);
console.log(`  Days/year at Devonian  = ${daysPerYrDev.toFixed(3)}    (target ≈ 396.21, Wells 1963 ~400)`);
console.log(`  T_Moon at Devonian (s) = ${tsmDev.toFixed(0)}    (target ≈ 2,240,855)`);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — recomputeEpochAnchors round-trip
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 1 round-trip: globals mutate to Devonian, mean*AtAge still anchored to J2000 ===\n');

// Snapshot J2000 values before mutation
const H_pre   = holisticyearLength;
const LOD_pre = meanlengthofday;
const Ts_pre  = meansiderealyearlengthinSeconds;
const Td_pre  = meansiderealyearlengthinDays;
const Tt_pre  = meansolaryearlengthinDays;

// Step A — assert globals are J2000 BEFORE mutation
check('Pre-mutate: holisticyearLength',     H_pre, 335317);
check('Pre-mutate: meanlengthofday',        LOD_pre, LOD_NOW_H13_S, 1e-12);

// Step B — mutate globals to Devonian
const ok = recomputeEpochAnchors(380);
check('recomputeEpochAnchors(380) returned true', ok ? 1 : 0, 1);

check('Post-mutate: holisticyearLength',    holisticyearLength,             309083.39, 1e-3);
check('Post-mutate: meanlengthofday (s)',   meanlengthofday,                79640.47, 1e-3);
check('Post-mutate: meansiderealyearlengthinDays',
      meansiderealyearlengthinDays,        396.231, 1e-3);
check('Post-mutate: meansolaryearlengthinDays',
      meansolaryearlengthinDays,           396.214, 1e-3);

// Step C — CRITICAL: mean*AtAge(0) must STILL return J2000 values
// (this proves the J2000 snapshots are doing their job)
check('After mutate: meanHAtAge(0)',                    meanHAtAge(0),                    335317, 1e-9);
check('After mutate: meanLodSecondsAtAge(0)',           meanLodSecondsAtAge(0),           LOD_NOW_H13_S, 1e-12);
check('After mutate: meanSiderealYearSecondsAtAge(0)',  meanSiderealYearSecondsAtAge(0),  MEAN_SIDEREAL_YEAR_J2000_S);
check('After mutate: meanTropicalYearSecondsAtAge(0)',  meanTropicalYearSecondsAtAge(0),  MEAN_TROPICAL_YEAR_J2000_S);
check('After mutate: meanMoonDistanceAtAge(0)',         meanMoonDistanceAtAge(0),         moonDistance);

// Step D — mutate back to J2000; globals must restore exactly
recomputeEpochAnchors(0);
check('Round-trip: holisticyearLength',     holisticyearLength,             335317);
check('Round-trip: meanlengthofday',        meanlengthofday,                LOD_NOW_H13_S, 1e-12);
check('Round-trip: meansiderealyearlengthinSeconds',
      meansiderealyearlengthinSeconds,     Ts_pre);
check('Round-trip: meansiderealyearlengthinDays',
      meansiderealyearlengthinDays,        Td_pre, 1e-12);
check('Round-trip: meansolaryearlengthinDays',
      meansolaryearlengthinDays,           Tt_pre, 1e-12);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — recomputeMoonAndAuForEpoch round-trip
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 2 round-trip: Moon/AU globals mutate, deep-time functions still J2000-anchored ===\n');

// Snapshot J2000 values of all 11 Phase-2 lets
const AU_pre        = currentAUDistance;
const moonD_pre     = moonDistance;
const moonDC_pre    = moonDistanceCorrected;
const moonOS_pre    = moonOrbitalShift;
const moonSid_pre   = moonSiderealMonth;
const moonAnom_pre  = moonAnomalisticMonth;
const moonNod_pre   = moonNodalMonth;
const moonSyn_pre   = moonSynodicMonth;
const moonTrop_pre  = moonTropicalMonth;
const moonNodP_pre  = moonNodalPrecessionindaysEarth;
const moonApsP_pre  = moonApsidalPrecessionindaysEarth;

// Step A — Phase 2 setup: also call recomputeEpochAnchors(380) FIRST so
// meanlengthofday reflects Devonian (the new month-d divisions use it)
recomputeEpochAnchors(380);
const ok2 = recomputeMoonAndAuForEpoch(380);
check('recomputeMoonAndAuForEpoch(380) returned true', ok2 ? 1 : 0, 1);

// Step B — Moon + AU globals shifted to Devonian
check('Post-mutate: currentAUDistance',       currentAUDistance,      149592585, 1e-3);
check('Post-mutate: moonDistance (km)',       moonDistance,           371314.33, 1e-3);
check('Post-mutate: moonDistanceCorrected',   moonDistanceCorrected,  371625.43, 1e-3);
check('Post-mutate: moonSiderealMonth (Devonian days)',
      moonSiderealMonth,                       28.137, 1e-2);
// Devonian Moon synodic ~30.288 Devonian days
check('Post-mutate: moonSynodicMonth (Devonian days)',
      moonSynodicMonth,                        30.288, 1e-2);

// Step C — CRITICAL: deep-time functions STILL produce J2000 values at t_Ma=0
check('After Phase 2 mutate: meanAuAtAge(0)',         meanAuAtAge(0),                  AU_pre);
check('After Phase 2 mutate: meanMoonDistanceAtAge(0)', meanMoonDistanceAtAge(0),      moonD_pre);
check('After Phase 2 mutate: meanHAtAge(0)',          meanHAtAge(0),                   335317, 1e-9);

// Step D — round-trip back to J2000
recomputeEpochAnchors(0);
recomputeMoonAndAuForEpoch(0);
check('Round-trip: currentAUDistance',        currentAUDistance,      AU_pre);
check('Round-trip: moonDistance',             moonDistance,           moonD_pre);
check('Round-trip: moonDistanceCorrected',    moonDistanceCorrected,  moonDC_pre, 1e-9);
// moonOrbitalShift differs by ~1 cm (3e-8 rel) on round-trip: the original
// const uses the H-quantized moonSiderealMonth; meanSolarDeltaAAtAge uses
// the raw moonSiderealMonthInput (correct, because using the quantized
// value would couple the deep-time function to the mutating global).
check('Round-trip: moonOrbitalShift',         moonOrbitalShift,       moonOS_pre, 1e-7);
check('Round-trip: moonSiderealMonth',        moonSiderealMonth,      moonSid_pre, 1e-7);
check('Round-trip: moonAnomalisticMonth',     moonAnomalisticMonth,   moonAnom_pre, 1e-5);
check('Round-trip: moonNodalMonth',           moonNodalMonth,         moonNod_pre, 1e-5);
check('Round-trip: moonSynodicMonth',         moonSynodicMonth,       moonSyn_pre, 1e-5);
check('Round-trip: moonTropicalMonth',        moonTropicalMonth,      moonTrop_pre, 1e-5);
check('Round-trip: moonNodalPrecessionindaysEarth',
      moonNodalPrecessionindaysEarth,         moonNodP_pre, 1e-4);
check('Round-trip: moonApsidalPrecessionindaysEarth',
      moonApsidalPrecessionindaysEarth,       moonApsP_pre, 1e-4);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 2.5 — Per-planet count + AU-ratio mutation
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 2.5 round-trip: Mercury count/AU-ratio mutate, semi-major axis still J2000-anchored ===\n');

const mercN_pre = mercurySolarYearCount;
const mercAU_pre = mercuryOrbitDistance;

// Mutate to Devonian (need recomputeEpochAnchors first so H/year_s are at epoch)
recomputeEpochAnchors(380);
const ok25 = recomputePlanetCountsForEpoch(380);
check('recomputePlanetCountsForEpoch(380) returned true', ok25 ? 1 : 0, 1);

// Doc 99 says Mercury at Devonian: 1,283,366 (down from 1,392,228, −7.8%)
check('Phase 2.5: mercurySolarYearCount at Devonian',
      mercurySolarYearCount, 1283366, 1e-3);
// Mercury orbit AU ratio stays ≈ 0.387 (Driver 2 tiny drift)
check('Phase 2.5: mercuryOrbitDistance at Devonian (~unchanged)',
      mercuryOrbitDistance, mercAU_pre, 1e-3);
// CRITICAL — snapshot proof: meanMercurySemiMajorAxisAtAge(0) returns J2000 value
check('After Phase 2.5 mutate: meanMercurySemiMajorAxisAtAge(0)',
      meanMercurySemiMajorAxisAtAge(0),
      MERCURY_ORBIT_DISTANCE_J2000 * AU_J2000_KM);

// Devonian Mercury a_km should be ~57,907,130 (doc 99 §"Predicted planetary semi-major axes")
check('Phase 2.5: meanMercurySemiMajorAxisAtAge(380) (km)',
      meanMercurySemiMajorAxisAtAge(380),
      57907130, 1e-3);

// Round-trip
recomputeEpochAnchors(0);
recomputePlanetCountsForEpoch(0);
check('Phase 2.5 round-trip: mercurySolarYearCount', mercurySolarYearCount, mercN_pre);
check('Phase 2.5 round-trip: mercuryOrbitDistance',  mercuryOrbitDistance,  mercAU_pre, 1e-9);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 (safe subset) — Earth, Moon, Precession-object updaters
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 3 (safe subset) — Earth + Moon + precession object updaters ===\n');

// Mock the scene-graph objects with just the epoch-dependent fields the
// safe-subset updaters touch, plus the J2000 anchor scalars they need.
// NB: balancedYear, startmodelyearwithCorrection, eccentricityBase now
// declared earlier in the Phase 6 block; using those declarations here.
const earthtiltMean             = 23.41354;

const earth = {
  speed:         -Math.PI * 2 / (holisticyearLength / 13),
  rotationSpeed:  Math.PI * 2 * (meansolaryearlengthinDays + 1),
  size:          (diameters.earthDiameter / currentAUDistance) * 100,
};
const moon = {
  speed:       (Math.PI * 2) / (1 / (meansolaryearlengthinDays / moonTropicalMonth)),
  orbitRadius: (moonDistance / currentAUDistance) * 100,
  size:        (3474.8 / currentAUDistance) * 100,
};
diameters.moonDiameter = 3474.8;
const earthInclinationPrecession = {
  startPos: ((balancedYear - startmodelyearwithCorrection) / (holisticyearLength / 3)) * 360,
  speed:     Math.PI * 2 / (holisticyearLength / 3),
};
const earthEclipticPrecession = {
  startPos: ((balancedYear - startmodelyearwithCorrection) / (holisticyearLength / 5)) * 360,
  speed:     Math.PI * 2 / (holisticyearLength / 5),
};
const earthObliquityPrecession = {
  startPos: -((balancedYear - startmodelyearwithCorrection) / (holisticyearLength / 8)) * 360,
  speed:    -Math.PI * 2 / (holisticyearLength / 8),
};
const earthPerihelionPrecession1 = {
  startPos: ((balancedYear - startmodelyearwithCorrection) / (holisticyearLength / 16)) * 360,
  speed:     Math.PI * 2 / (holisticyearLength / 16),
};
const earthPerihelionPrecession2 = {
  startPos: -((balancedYear - startmodelyearwithCorrection) / (holisticyearLength / 16)) * 360,
  speed:    -Math.PI * 2 / (holisticyearLength / 16),
};

// Snapshot J2000 values for round-trip
const earthSpeed_pre        = earth.speed;
const earthRotSpeed_pre     = earth.rotationSpeed;
const earthSize_pre         = earth.size;
const moonSpeed_pre         = moon.speed;
const moonOrbitR_pre        = moon.orbitRadius;
const moonSize_pre          = moon.size;
const eInclSpeed_pre        = earthInclinationPrecession.speed;
const eEcliSpeed_pre        = earthEclipticPrecession.speed;
const eOblqSpeed_pre        = earthObliquityPrecession.speed;
const ePer1Speed_pre        = earthPerihelionPrecession1.speed;
const ePer2Speed_pre        = earthPerihelionPrecession2.speed;

// Phase 3 updater functions (mirror script.js Phase 3 block)
function updateEarthForEpoch() {
  earth.speed         = -Math.PI * 2 / (holisticyearLength / 13);
  earth.rotationSpeed = Math.PI * 2 * (meansolaryearlengthinDays + 1);
  earth.size          = (diameters.earthDiameter / currentAUDistance) * 100;
}
function updateMoonForEpoch() {
  moon.speed       = (Math.PI * 2) / (1 / (meansolaryearlengthinDays / moonTropicalMonth));
  moon.orbitRadius = (moonDistance / currentAUDistance) * 100;
  moon.size        = (diameters.moonDiameter / currentAUDistance) * 100;
}
function updateEarthPrecessionObjectsForEpoch() {
  const dY = balancedYear - startmodelyearwithCorrection;
  earthInclinationPrecession.startPos = (dY / (holisticyearLength / 3)) * 360;
  earthInclinationPrecession.speed    =  Math.PI * 2 / (holisticyearLength / 3);
  earthEclipticPrecession.startPos    = (dY / (holisticyearLength / 5)) * 360;
  earthEclipticPrecession.speed       =  Math.PI * 2 / (holisticyearLength / 5);
  earthObliquityPrecession.startPos   = -(dY / (holisticyearLength / 8)) * 360;
  earthObliquityPrecession.speed      = -Math.PI * 2 / (holisticyearLength / 8);
  earthPerihelionPrecession1.startPos = (dY / (holisticyearLength / 16)) * 360;
  earthPerihelionPrecession1.speed    =  Math.PI * 2 / (holisticyearLength / 16);
  earthPerihelionPrecession2.startPos = -(dY / (holisticyearLength / 16)) * 360;
  earthPerihelionPrecession2.speed    = -Math.PI * 2 / (holisticyearLength / 16);
}
function updateSafeObjectsForEpoch() {
  updateEarthForEpoch();
  updateMoonForEpoch();
  updateEarthPrecessionObjectsForEpoch();
}

// Mock Mercury (representative per-planet)
diameters.mercuryDiameter = 4879.40;
const planets = {
  mercury: {
    perihelionEclipticYears: holisticyearLength / (1 + 3/8),         // = +8H/11 ≈ 243,867
    axialPrecessionYears:   -(8 * holisticyearLength / 9),           // = -8H/9
    obliquityCycle:          holisticyearLength * 8 / 3,             // = +8H/3
  }
};
// Phase 5 cached helpers (let, so we can mutate)
function calcWobblePeriod(eclipticYr, axialYr) {
  const wobbleRate = Math.abs(1 / Math.abs(axialYr) - 1 / Math.abs(eclipticYr));
  return 1 / wobbleRate;
}
let mercuryWobblePeriod  = calcWobblePeriod(planets.mercury.perihelionEclipticYears, planets.mercury.axialPrecessionYears);
let mercuryObliquityCycle = planets.mercury.obliquityCycle;
// Phase 5 scene-graph perihelion-ecliptic nodes
const mercuryPerihelionDurationEcliptic1 = { speed:  Math.PI * 2 / planets.mercury.perihelionEclipticYears };
const mercuryPerihelionDurationEcliptic2 = { speed: -Math.PI * 2 / planets.mercury.perihelionEclipticYears };

// Phase 5 J2000 cycle snapshots (defined after planets mock per script.js ordering)
const PERIHELION_ECLIPTIC_YEARS_J2000 = { mercury: planets.mercury.perihelionEclipticYears };
const AXIAL_PRECESSION_YEARS_J2000    = { mercury: planets.mercury.axialPrecessionYears };
const OBLIQUITY_CYCLE_J2000           = { mercury: planets.mercury.obliquityCycle };
const mercury = {
  speed:        Math.PI * 2 / (holisticyearLength / mercurySolarYearCount),
  orbitRadius:  mercuryOrbitDistance * 100,
  size:         (diameters.mercuryDiameter / currentAUDistance) * 100,
  perihelionPrecessionRate: Math.PI * 2 / planets.mercury.perihelionEclipticYears,
};
const mercSpeed_pre  = mercury.speed;
const mercOrbitR_pre = mercury.orbitRadius;
const mercSize_pre   = mercury.size;
const mercPerihRate_pre = mercury.perihelionPrecessionRate;

function _hRatioJ2000OverNow() { return HOLISTIC_YEAR_J2000 / holisticyearLength; }
function updateMercuryForEpoch() {
  mercury.speed       = Math.PI * 2 / (holisticyearLength / mercurySolarYearCount);
  mercury.orbitRadius = mercuryOrbitDistance * 100;
  mercury.size        = (diameters.mercuryDiameter / currentAUDistance) * 100;
  mercury.perihelionPrecessionRate =
    (Math.PI * 2 / planets.mercury.perihelionEclipticYears) * _hRatioJ2000OverNow();
  mercuryPerihelionDurationEcliptic1.speed =  Math.PI * 2 / planets.mercury.perihelionEclipticYears;
  mercuryPerihelionDurationEcliptic2.speed = -Math.PI * 2 / planets.mercury.perihelionEclipticYears;
}
function updateAllObjectsForEpoch() {
  updateSafeObjectsForEpoch();
  updateMercuryForEpoch();
}

// Mutate globals to Devonian, then run Phase 3 updaters (including Mercury)
recomputeEpochAnchors(380);
recomputePlanetCountsForEpoch(380);
recomputeMoonAndAuForEpoch(380);
updateAllObjectsForEpoch();

// Mercury at Devonian — speed should drop a tiny amount (since H/N stays near-constant)
// and orbitRadius should drift only by Driver 2 (mass loss, ~35 ppm)
check('Phase3-planets Devonian: mercury.speed near-constant',
      mercury.speed,        mercSpeed_pre, 1e-3);
check('Phase3-planets Devonian: mercury.orbitRadius near-constant (Driver 2 ~35 ppm)',
      mercury.orbitRadius,  mercOrbitR_pre, 1e-3);
check('Phase3-planets Devonian: mercury.size > J2000 (AU shrunk)',
      mercury.size > mercSize_pre ? 1 : 0, 1);
// ESSRT perihelion-rate scaling: rate(Devonian) = rate(J2000) × H_J2000 / H_Devonian
// At Devonian: 335317 / 309083.39 = 1.0849 → rate up 8.49%
const expectedPerihRateDev = mercPerihRate_pre * (335317 / 309083.39);
check('Phase3-planets Devonian: mercury.perihelionPrecessionRate (8H/N scaling)',
      mercury.perihelionPrecessionRate, expectedPerihRateDev, 1e-6);
// Cross-check against doc 99 explicit value: Mercury Devonian perihelion = 224,788 yr
// → rate = 2π / 224788
const docPerihRateDev = (2 * Math.PI) / 224788;
check('Phase3-planets Devonian: mercury.perihelionPrecessionRate vs doc 99 224,788 yr',
      mercury.perihelionPrecessionRate, docPerihRateDev, 5e-5);

// Step A — Phase 3 object properties reflect Devonian
// Devonian H = 309,083 → |earth.speed| = 2π × 13 / H = 13/309083 × 2π
const earthSpeedDev_expected = -Math.PI * 2 / (309083.39 / 13);
check('Phase3 Devonian: earth.speed',        earth.speed,        earthSpeedDev_expected, 1e-6);
// Earth rotationSpeed at Devonian: meansolaryearlengthinDays ≈ 396.214
const earthRotSpeedDev_expected = Math.PI * 2 * (396.214317 + 1);
check('Phase3 Devonian: earth.rotationSpeed', earth.rotationSpeed, earthRotSpeedDev_expected, 1e-6);
// Earth size grows because Earth diameter is the same but AU drops by ~35 ppm
check('Phase3 Devonian: earth.size > J2000 (AU shrunk)',
      earth.size > earthSize_pre ? 1 : 0, 1);
// Moon orbitRadius — Moon closer in km, AU also slightly smaller, net Moon orbits at ~371314/149592585 vs 384399/149597870
const moonOrbitRDev_expected = (371314.327140 / 149592584.362448) * 100;
check('Phase3 Devonian: moon.orbitRadius',   moon.orbitRadius,   moonOrbitRDev_expected, 1e-6);
// Precession speeds — magnitudes scale as 1/H, so 335317/309083 ≈ 1.0849× faster at Devonian
const inclSpeedDev_expected = Math.PI * 2 / (309083.39 / 3);
check('Phase3 Devonian: earthInclinationPrecession.speed',
      earthInclinationPrecession.speed, inclSpeedDev_expected, 1e-6);
const oblqSpeedDev_expected = -Math.PI * 2 / (309083.39 / 8);
check('Phase3 Devonian: earthObliquityPrecession.speed',
      earthObliquityPrecession.speed, oblqSpeedDev_expected, 1e-6);

// Step B — round-trip back to J2000
recomputeEpochAnchors(0);
recomputePlanetCountsForEpoch(0);
recomputeMoonAndAuForEpoch(0);
updateAllObjectsForEpoch();
check('Phase3-planets round-trip: mercury.speed',       mercury.speed,       mercSpeed_pre,  1e-9);
check('Phase3-planets round-trip: mercury.orbitRadius', mercury.orbitRadius, mercOrbitR_pre, 1e-9);
check('Phase3-planets round-trip: mercury.size',        mercury.size,        mercSize_pre,   1e-9);
check('Phase3-planets round-trip: mercury.perihelionPrecessionRate',
      mercury.perihelionPrecessionRate, mercPerihRate_pre, 1e-9);
check('Phase3 round-trip: earth.speed',         earth.speed,         earthSpeed_pre,    1e-9);
check('Phase3 round-trip: earth.rotationSpeed', earth.rotationSpeed, earthRotSpeed_pre, 1e-9);
check('Phase3 round-trip: earth.size',          earth.size,          earthSize_pre,     1e-9);
check('Phase3 round-trip: moon.speed',          moon.speed,          moonSpeed_pre,     1e-7);
check('Phase3 round-trip: moon.orbitRadius',    moon.orbitRadius,    moonOrbitR_pre,    1e-9);
check('Phase3 round-trip: moon.size',           moon.size,           moonSize_pre,     1e-9);
check('Phase3 round-trip: earthInclinationPrecession.speed',
      earthInclinationPrecession.speed, eInclSpeed_pre, 1e-9);
check('Phase3 round-trip: earthEclipticPrecession.speed',
      earthEclipticPrecession.speed,    eEcliSpeed_pre, 1e-9);
check('Phase3 round-trip: earthObliquityPrecession.speed',
      earthObliquityPrecession.speed,   eOblqSpeed_pre, 1e-9);
check('Phase3 round-trip: earthPerihelionPrecession1.speed',
      earthPerihelionPrecession1.speed, ePer1Speed_pre, 1e-9);
check('Phase3 round-trip: earthPerihelionPrecession2.speed',
      earthPerihelionPrecession2.speed, ePer2Speed_pre, 1e-9);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 4 — setEpoch / setEpochByAge / mode enable + disable
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 4: setEpoch orchestrator + calendar-year API ===\n');

const J2000_CALENDAR_YEAR = 2000.5;
let currentEpoch_t_Ma = 0;
let DEEP_TIME_MODE_ENABLED = false;

function setEpochByAge(t_Ma) {
  if (Math.abs(t_Ma - currentEpoch_t_Ma) < 1e-9) return true;
  const ok = recomputeEpochAnchors(t_Ma);
  if (!ok) return false;
  H = holisticyearLength;                  // Phase 6.5 — H alias sync (mirrors script.js inline)
  recomputeDerivedAnchorsForEpoch(t_Ma);   // Phase 6
  recomputeMoonAndAuForEpoch(t_Ma);
  recomputeMoonDerivedForEpoch(t_Ma);      // Phase 6.5 Moon helpers
  recomputePlanetCountsForEpoch(t_Ma);
  recomputePlanetCyclesForEpoch(t_Ma);    // Phase 5
  rebuildPeriHarmonicsForEpoch(t_Ma);      // Phase 6.5 PERI_HARMONICS
  updateAllObjectsForEpoch();
  currentEpoch_t_Ma = t_Ma;
  return true;
}
function setEpoch(calendar_year) {
  const t_Ma = (J2000_CALENDAR_YEAR - calendar_year) / 1e6;
  return setEpochByAge(t_Ma);
}
function resetEpochToJ2000() { return setEpochByAge(0); }
function enableDeepTimeMode()  { DEEP_TIME_MODE_ENABLED = true;  }
function disableDeepTimeMode() { DEEP_TIME_MODE_ENABLED = false; resetEpochToJ2000(); }
function isDeepTimeMode()      { return DEEP_TIME_MODE_ENABLED;  }
function currentEpochTMa()     { return currentEpoch_t_Ma;       }

// Reset state for Phase 4 testing (previous round-trips left us at J2000 already)
resetEpochToJ2000();

// Phase 4a: calendar-year → t_Ma conversion
setEpoch(2000.5);          check('setEpoch(2000.5) → t_Ma',           currentEpochTMa(), 0);
setEpoch(-378e6 + 2000.5); check('setEpoch(-378e6+J2000) ≈ Devonian', currentEpochTMa(), 378);

// Phase 4b: globals reflect Devonian after setEpoch
check('Phase 4 Devonian: holisticyearLength',  holisticyearLength,    307939.93, 5e-3);
check('Phase 4 Devonian: mercury.speed',       mercury.speed,         mercSpeed_pre, 1e-3);
check('Phase 4 Devonian: earth.speed magnitude up',
      Math.abs(earth.speed) > Math.abs(earthSpeed_pre) ? 1 : 0, 1);

// Phase 4c: setEpochByAge direct API
setEpochByAge(180);     check('setEpochByAge(180): Jurassic t_Ma',    currentEpochTMa(), 180);
setEpochByAge(-200);    check('setEpochByAge(-200): +200 Myr future', currentEpochTMa(), -200);

// Phase 4d: round-trip to J2000 via resetEpochToJ2000()
resetEpochToJ2000();
check('After reset: holisticyearLength',       holisticyearLength,    335317);
check('After reset: currentAUDistance',        currentAUDistance,     AU_pre);
check('After reset: moonDistance',             moonDistance,          moonD_pre);
check('After reset: earth.speed',              earth.speed,           earthSpeed_pre,    1e-9);
check('After reset: mercury.perihelionPrecessionRate',
      mercury.perihelionPrecessionRate,        mercPerihRate_pre,     1e-9);

// Phase 4e: mode flag semantics
check('isDeepTimeMode() default',              isDeepTimeMode() ? 1 : 0, 0);
enableDeepTimeMode();
check('isDeepTimeMode() after enable',         isDeepTimeMode() ? 1 : 0, 1);
disableDeepTimeMode();
check('isDeepTimeMode() after disable',        isDeepTimeMode() ? 1 : 0, 0);
// disableDeepTimeMode also resets to J2000
check('disableDeepTimeMode also resets epoch', currentEpochTMa(), 0);

// Phase 4f: redundant-call short-circuit (no mutation if same epoch)
setEpochByAge(0);   // no-op, already there
setEpochByAge(0);   // no-op again
check('Redundant setEpochByAge(0): holisticyearLength unchanged',
      holisticyearLength, 335317);

// Phase 4g: outside-domain guard (past tidal-lock asymptote)
const farFutureSuccess = setEpochByAge(-4000);  // 4 Gyr in future, past A_LOCK
check('setEpochByAge(-4000) past lock returns false',
      farFutureSuccess ? 1 : 0, 0);
// Globals should be untouched (J2000)
check('After failed setEpoch: holisticyearLength still J2000',
      holisticyearLength, 335317);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 5 — Per-planet cycle scaling (Mercury representative)
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 5: per-planet 8H/N cycle scaling ===\n');

// Reset to J2000 for clean Phase 5 test state
resetEpochToJ2000();

const mercPeri_pre   = planets.mercury.perihelionEclipticYears;
const mercAxial_pre  = planets.mercury.axialPrecessionYears;
const mercObliq_pre  = planets.mercury.obliquityCycle;
const mercWobble_pre = mercuryWobblePeriod;
const mercSGperi1_pre = mercuryPerihelionDurationEcliptic1.speed;
const mercSGperi2_pre = mercuryPerihelionDurationEcliptic2.speed;

// Sanity J2000 anchors
check('Phase 5 J2000: mercury.perihelionEclipticYears = 8H/11',
      mercPeri_pre, 335317 * 8 / 11, 1e-9);
check('Phase 5 J2000: mercury.axialPrecessionYears = -8H/9',
      mercAxial_pre, -335317 * 8 / 9, 1e-9);
check('Phase 5 J2000: mercury.obliquityCycle = +8H/3',
      mercObliq_pre, 335317 * 8 / 3, 1e-9);

// Mutate to Devonian (positive past)
setEpochByAge(380);

// Phase 5 mutations: all cycles × (H_t/H_J2000) ≈ 0.9218
const r_dev = 309083.39 / 335317;
check('Phase 5 Devonian: mercury.perihelionEclipticYears',
      planets.mercury.perihelionEclipticYears, mercPeri_pre * r_dev, 1e-5);
check('Phase 5 Devonian: mercury.axialPrecessionYears',
      planets.mercury.axialPrecessionYears,    mercAxial_pre * r_dev, 1e-5);
check('Phase 5 Devonian: mercury.obliquityCycle',
      planets.mercury.obliquityCycle,           mercObliq_pre * r_dev, 1e-5);

// Wobble period: since peri and axial both × r, the beat freq also × r.
// → wobblePeriod = 1/wobbleRate also × r (the inverse-difference cancels)
const mercWobble_dev_expected = mercWobble_pre * r_dev;
check('Phase 5 Devonian: mercuryWobblePeriod (eccentricity cycle scales with H)',
      mercuryWobblePeriod, mercWobble_dev_expected, 1e-5);

// Scene-graph nodes: speed = 2π/period, so speed × (1/r) — faster at Devonian
check('Phase 5 Devonian: mercuryPerihelionDurationEcliptic1.speed',
      mercuryPerihelionDurationEcliptic1.speed, mercSGperi1_pre / r_dev, 1e-5);
check('Phase 5 Devonian: mercuryPerihelionDurationEcliptic2.speed',
      mercuryPerihelionDurationEcliptic2.speed, mercSGperi2_pre / r_dev, 1e-5);

// Cross-check against doc 99 explicit number: Mercury perihelion at Devonian = 224,788 yr
check('Phase 5 Devonian: mercury.perihelionEclipticYears vs doc 99 (224,788 yr)',
      planets.mercury.perihelionEclipticYears, 224788, 1e-3);

// Round-trip
resetEpochToJ2000();
check('Phase 5 round-trip: mercury.perihelionEclipticYears',
      planets.mercury.perihelionEclipticYears, mercPeri_pre, 1e-9);
check('Phase 5 round-trip: mercury.axialPrecessionYears',
      planets.mercury.axialPrecessionYears,    mercAxial_pre, 1e-9);
check('Phase 5 round-trip: mercury.obliquityCycle',
      planets.mercury.obliquityCycle,          mercObliq_pre, 1e-9);
check('Phase 5 round-trip: mercuryWobblePeriod',
      mercuryWobblePeriod, mercWobble_pre, 1e-9);
check('Phase 5 round-trip: mercuryPerihelionDurationEcliptic1.speed',
      mercuryPerihelionDurationEcliptic1.speed, mercSGperi1_pre, 1e-9);
check('Phase 5 round-trip: mercuryPerihelionDurationEcliptic2.speed',
      mercuryPerihelionDurationEcliptic2.speed, mercSGperi2_pre, 1e-9);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 6 — Tier 1 + Tier 2 derived-anchor mutation
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 6: derived-anchor mutation + per-frame eccentricity ===\n');

resetEpochToJ2000();

// Snapshot J2000 values
const perCyc_pre        = perihelionCycleLength;
const balYr_pre         = balancedYear;
const eccAnchor_pre     = _eccentricityAnchor;
const periPhase_pre     = perihelionPhaseOffset;
const eccCycleEarth_pre = ECC_CYCLE_SCALE.earth;
const meanSid_pre       = meanSiderealday;
const meanStl_pre       = meanStellarday;
const periCoin_pre      = perihelionCoinRotationMs;
const axCoin_pre        = axialCoinRotationMs;
const anomYr_pre        = meanAnomalisticYearinDays;
const earthIcrf_pre     = earthPerihelionICRFYears;
const earthRot_pre      = meanearthRotationsinDays;
const eccPreFrame       = computeEccentricityEarth(2024, balancedYear, perihelionCycleLength, eccentricityBase, eccentricityAmplitude);

// Sanity at J2000
check('Phase 6 J2000: perihelionCycleLength = H/16',
      perCyc_pre, 335317 / 16, 1e-9);
check('Phase 6 J2000: ECC_CYCLE_SCALE.earth matches perihelionCycleLength',
      eccCycleEarth_pre, perCyc_pre);
check('Phase 6 J2000: balancedYear formula',
      balYr_pre, 1246.03125 - 14.5 * (335317/16), 1e-9);
check('Phase 6 J2000: _eccentricityAnchor',
      eccAnchor_pre, balYr_pre - 7 * 335317, 1e-9);
check('Phase 6 J2000: earthPerihelionICRFYears = H/3',
      earthIcrf_pre, 335317 / 3, 1e-9);

// Mutate to Devonian
setEpochByAge(380);

// Tier 1 checks: math-critical anchors at Devonian
const H_dev = holisticyearLength;
check('Phase 6 Devonian: perihelionCycleLength = H_dev/16',
      perihelionCycleLength, H_dev / 16, 1e-9);
check('Phase 6 Devonian: balancedYear shifts',
      balancedYear, 1246.03125 - 14.5 * (H_dev/16), 1e-9);
check('Phase 6 Devonian: _eccentricityAnchor shifts',
      _eccentricityAnchor, balancedYear - 7 * H_dev, 1e-9);
check('Phase 6 Devonian: ECC_CYCLE_SCALE.earth tracks perihelionCycleLength',
      ECC_CYCLE_SCALE.earth, perihelionCycleLength);

// Critical: per-frame computeEccentricityEarth uses the new values
const eccDevFrame = computeEccentricityEarth(2024, balancedYear, perihelionCycleLength, eccentricityBase, eccentricityAmplitude);
check('Phase 6 Devonian: computeEccentricityEarth differs from J2000 (proves auto-pickup)',
      Math.abs(eccDevFrame - eccPreFrame) > 1e-6 ? 1 : 0, 1);

// Tier 2 checks: display anchors at Devonian
check('Phase 6 Devonian: earthPerihelionICRFYears = H_dev/3',
      earthPerihelionICRFYears, H_dev / 3, 1e-9);
check('Phase 6 Devonian: meanearthRotationsinDays = days_dev + 1',
      meanearthRotationsinDays, meansolaryearlengthinDays + 1, 1e-9);
check('Phase 6 Devonian: meanSiderealday derived from new days + LOD',
      meanSiderealday,
      (meansolaryearlengthinDays / (meansolaryearlengthinDays + 1)) * meanlengthofday, 1e-9);
check('Phase 6 Devonian: meanAnomalisticYearinDays uses new days + perihelionCycleLength',
      meanAnomalisticYearinDays,
      (meansolaryearlengthinDays / (perihelionCycleLength - 1)) + meansolaryearlengthinDays, 1e-9);
check('Phase 6 Devonian: meanStellarday',
      meanStellarday,
      (meanSiderealday / (H_dev / 13)) / (meansolaryearlengthinDays + 1) + meanSiderealday, 1e-9);

// Round-trip
resetEpochToJ2000();
check('Phase 6 round-trip: perihelionCycleLength',  perihelionCycleLength,  perCyc_pre,    1e-9);
check('Phase 6 round-trip: balancedYear',           balancedYear,           balYr_pre,     1e-9);
check('Phase 6 round-trip: _eccentricityAnchor',    _eccentricityAnchor,    eccAnchor_pre, 1e-9);
check('Phase 6 round-trip: perihelionPhaseOffset',  perihelionPhaseOffset,  periPhase_pre, 1e-9);
check('Phase 6 round-trip: ECC_CYCLE_SCALE.earth',  ECC_CYCLE_SCALE.earth,  eccCycleEarth_pre, 1e-9);
check('Phase 6 round-trip: meanSiderealday',        meanSiderealday,        meanSid_pre,   1e-9);
check('Phase 6 round-trip: meanStellarday',         meanStellarday,         meanStl_pre,   1e-9);
check('Phase 6 round-trip: perihelionCoinRotationMs', perihelionCoinRotationMs, periCoin_pre, 1e-9);
check('Phase 6 round-trip: axialCoinRotationMs',    axialCoinRotationMs,    axCoin_pre,    1e-9);
check('Phase 6 round-trip: meanAnomalisticYearinDays', meanAnomalisticYearinDays, anomYr_pre, 1e-9);
check('Phase 6 round-trip: earthPerihelionICRFYears',  earthPerihelionICRFYears, earthIcrf_pre, 1e-9);
check('Phase 6 round-trip: meanearthRotationsinDays', meanearthRotationsinDays, earthRot_pre, 1e-9);
const eccPostRoundTrip = computeEccentricityEarth(2024, balancedYear, perihelionCycleLength, eccentricityBase, eccentricityAmplitude);
check('Phase 6 round-trip: computeEccentricityEarth restored',
      eccPostRoundTrip, eccPreFrame, 1e-12);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 6.5 — H alias + Moon ICRF helpers + PERI_HARMONICS
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 6.5: H alias + Moon ICRF + PERI_HARMONICS rebuild ===\n');

resetEpochToJ2000();

const H_pre6_5            = H;
const moonFullICRF_pre    = moonFullMoonCycleICRF;
const periPer0_pre        = PERI_HARMONICS[0][0];   // = H/3
const periPer4_pre        = PERI_HARMONICS[4][0];   // = H/16
const periSinAmp0_pre     = PERI_HARMONICS[0][1];   // amplitudes stay (snapshot model)

// Sanity at J2000
check('Phase 6.5 J2000: H alias equals holisticyearLength', H_pre6_5, 335317);
check('Phase 6.5 J2000: PERI_HARMONICS[0][0] = H/3',         periPer0_pre, 335317 / 3, 1e-9);
check('Phase 6.5 J2000: PERI_HARMONICS[4][0] = H/16',        periPer4_pre, 335317 / 16, 1e-9);
check('Phase 6.5 J2000: PERI_HARMONICS_J2000_PERIODS[0] snapshot',
      PERI_HARMONICS_J2000_PERIODS[0], 335317 / 3, 1e-9);

// Mutate to Devonian
setEpochByAge(380);

const r_dev6_5 = holisticyearLength / 335317;

// H alias auto-updates
check('Phase 6.5 Devonian: H alias = holisticyearLength', H, holisticyearLength);
check('Phase 6.5 Devonian: H ≈ 309,400 yr', H, 309400, 0.01);

// PERI_HARMONICS periods scale by H_t/H_J2000, amplitudes stay
check('Phase 6.5 Devonian: PERI_HARMONICS[0][0] = H_dev/3',
      PERI_HARMONICS[0][0], holisticyearLength / 3, 1e-6);
check('Phase 6.5 Devonian: PERI_HARMONICS[4][0] = H_dev/16',
      PERI_HARMONICS[4][0], holisticyearLength / 16, 1e-6);
check('Phase 6.5 Devonian: PERI_HARMONICS[0][1] amplitude unchanged',
      PERI_HARMONICS[0][1], periSinAmp0_pre);
check('Phase 6.5 Devonian: PERI_HARMONICS[0][0] scales by r_dev',
      PERI_HARMONICS[0][0], periPer0_pre * r_dev6_5, 1e-6);

// Moon ICRF recomputed at deep time (matches the formula using updated Hdays).
// NB: ICRF stays close to Earth-frame value because of H × days/yr structural near-invariant
// (drifts ~70 ppm at Devonian per doc 99), so the absolute change is small (< 0.5 d).
const Hdays_dev = holisticyearLength * meansolaryearlengthinDays;
const expectedICRF = Hdays_dev / ((Hdays_dev / moonFullMoonCycleEarth) + 13);
check('Phase 6.5 Devonian: moonFullMoonCycleICRF matches recomputed formula',
      moonFullMoonCycleICRF, expectedICRF, 1e-9);

// Round-trip
resetEpochToJ2000();
check('Phase 6.5 round-trip: H alias',                H,                       H_pre6_5);
check('Phase 6.5 round-trip: PERI_HARMONICS[0][0]',   PERI_HARMONICS[0][0],    periPer0_pre, 1e-12);
check('Phase 6.5 round-trip: PERI_HARMONICS[4][0]',   PERI_HARMONICS[4][0],    periPer4_pre, 1e-12);
check('Phase 6.5 round-trip: PERI_HARMONICS[0][1] amplitude',
      PERI_HARMONICS[0][1], periSinAmp0_pre);
check('Phase 6.5 round-trip: moonFullMoonCycleICRF',  moonFullMoonCycleICRF,   moonFullICRF_pre, 1e-6);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 6.7 — Simulation time units + SYEAR_J2000 comparison-safety
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 6.7: sDay/sYear family + J2000 snapshots ===\n');

resetEpochToJ2000();

// Sanity at J2000
check('Phase 6.7 J2000: sDay = 1/days', sDay, 1/meansolaryearlengthinDays, 1e-12);
check('Phase 6.7 J2000: sYear = sDay × 365', sYear, sDay * 365, 1e-12);
check('Phase 6.7 J2000: SDAY_J2000 captured', SDAY_J2000, sDay);
check('Phase 6.7 J2000: SYEAR_J2000 captured', SYEAR_J2000, sYear);

const sDay_pre   = sDay;
const sYear_pre  = sYear;
const sMonth_pre = sMonth;
const sWeek_pre  = sWeek;
const sHour_pre  = sHour;
const sMin_pre   = sMinute;
const sSec_pre   = sSecond;

// Mutate to Devonian
setEpochByAge(380);

// At Devonian: days = 396.214 → sDay = 1/396.214 ≈ 0.00252
check('Phase 6.7 Devonian: sDay = 1/days_dev', sDay, 1 / meansolaryearlengthinDays, 1e-12);
check('Phase 6.7 Devonian: sDay shrunk ~7.8%', sDay, 0.002524, 0.01);
check('Phase 6.7 Devonian: sYear = sDay × 365', sYear, sDay * 365, 1e-12);
check('Phase 6.7 Devonian: sYear ≈ 0.921',     sYear, 0.921, 0.01);
check('Phase 6.7 Devonian: sMonth = sDay × 30', sMonth, sDay * 30, 1e-12);
check('Phase 6.7 Devonian: sWeek = sDay × 7',  sWeek,  sDay * 7, 1e-12);
check('Phase 6.7 Devonian: sHour = sDay/24',   sHour,  sDay / 24, 1e-12);
check('Phase 6.7 Devonian: sMinute = sHour/60', sMinute, sHour / 60, 1e-12);
check('Phase 6.7 Devonian: sSecond = sMinute/60', sSecond, sMinute / 60, 1e-12);

// SYEAR_J2000 stays at J2000 value (this is critical for === comparisons!)
check('Phase 6.7 Devonian: SYEAR_J2000 unchanged (frozen at module load)',
      SYEAR_J2000, sYear_pre);
check('Phase 6.7 Devonian: SDAY_J2000 unchanged',
      SDAY_J2000, sDay_pre);

// Simulated dropdown semantic: dropdown value === SYEAR_J2000 (captured at construction)
const simulatedDropdownYear = SYEAR_J2000;
// User clicks "1 year/sec" → speedFact = SYEAR_J2000 (frozen)
// At Devonian: comparison `speedFact === sYear` (LIVE) would FAIL because sYear shifted
// But `speedFact === SYEAR_J2000` (Phase 6.7 fix) SUCCEEDS
check('Phase 6.7 Devonian: speedFact === sYear (live) would FAIL',
      simulatedDropdownYear === sYear ? 1 : 0, 0);
check('Phase 6.7 Devonian: speedFact === SYEAR_J2000 (Phase 6.7 fix) SUCCEEDS',
      simulatedDropdownYear === SYEAR_J2000 ? 1 : 0, 1);

// Round-trip
resetEpochToJ2000();
check('Phase 6.7 round-trip: sDay',    sDay,    sDay_pre,    1e-12);
check('Phase 6.7 round-trip: sYear',   sYear,   sYear_pre,   1e-12);
check('Phase 6.7 round-trip: sMonth',  sMonth,  sMonth_pre,  1e-12);
check('Phase 6.7 round-trip: sWeek',   sWeek,   sWeek_pre,   1e-12);
check('Phase 6.7 round-trip: sHour',   sHour,   sHour_pre,   1e-12);
check('Phase 6.7 round-trip: sMinute', sMinute, sMin_pre,    1e-12);
check('Phase 6.7 round-trip: sSecond', sSecond, sSec_pre,    1e-12);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 8 — Integrated phase-advance (history-aware ESSRT)
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 8: integrated phase + frame-independence ===\n');

resetEpochToJ2000();

// Identity test: ∫_{y0}^{y0} = 0
check('Phase 8: integralInverseH(2000, 2000) = 0',
      integralInverseHFromYears(2000, 2000), 0);

// At constant H (modern), integralInverseH(0, 1) × H = 1
check('Phase 8: integralInverseH(2000, 2001) × H ≈ 1 (constant H)',
      integralInverseHFromYears(2000, 2001) * HOLISTIC_YEAR_J2000,
      1, 1e-9);

// Anchor identity: 14.5 cycles from balancedYear_FIXED to 1246 AD (3e-5 rel
// precision typical for N=1000 Simpson over multi-Myr spans; absolute error
// ~5e-4 cycles is sub-arcminute in eccentricity-phase angle — well below
// what affects the simulation visually)
const cycles_anchor_to_1246 = cyclesBetweenYears(BALANCED_YEAR_J2000_FIXED_H8, 1246.03125, 16);
check('Phase 8: cyclesBetweenYears(balanced, 1246) ≈ 14.5 (anchor definition)',
      cycles_anchor_to_1246, 14.5, 1e-4);

// Linear vs integrated agreement at modern (constant H)
const cycles_modern = cyclesBetweenYears(-302635, 2000, 16);
const cycles_modern_linear = (2000 - (-302635)) * 16 / HOLISTIC_YEAR_J2000;
check('Phase 8: cyclesBetweenYears(modern) ≈ linear form (constant H)',
      cycles_modern, cycles_modern_linear, 1e-4);

// FRAME INDEPENDENCE — the whole point of Phase 8
// Same year (-380M) gives same eccentricity regardless of observation epoch
const ecc_modern_obs   = computeEccentricityEarthH8(-380e6, BALANCED_YEAR_J2000_FIXED_H8, PERIHELION_CYCLE_LENGTH_J2000_FIXED_H8, eccentricityBase, eccentricityAmplitude);
setEpochByAge(380);
const ecc_devonian_obs = computeEccentricityEarthH8(-380e6, BALANCED_YEAR_J2000_FIXED_H8, PERIHELION_CYCLE_LENGTH_J2000_FIXED_H8, eccentricityBase, eccentricityAmplitude);
check('Phase 8: ecc at year -380M is frame-independent (modern frame == Devonian frame)',
      ecc_modern_obs, ecc_devonian_obs, 1e-12);

// Snapshot vs integrated at modern → should match to ppm
resetEpochToJ2000();
const ecc_modern_snapshot = computeEccentricityEarth(2024,
  perihelionalignmentYearH8 - 14.5 * (HOLISTIC_YEAR_J2000/16),
  HOLISTIC_YEAR_J2000 / 16,
  eccentricityBase, eccentricityAmplitude);
const ecc_modern_integrated = computeEccentricityEarthH8(2024,
  BALANCED_YEAR_J2000_FIXED_H8, PERIHELION_CYCLE_LENGTH_J2000_FIXED_H8,
  eccentricityBase, eccentricityAmplitude);
check('Phase 8: at modern epoch, snapshot ≈ integrated to ppm',
      ecc_modern_snapshot, ecc_modern_integrated, 1e-4);

// Doc 99 magnitude — at year -380M, integrated phase advance is ~18,898 cycles
// (vs J2000 snapshot's 18,118 or Devonian snapshot's 19,656)
const cycles_380M = cyclesBetweenYears(BALANCED_YEAR_J2000_FIXED_H8, -380e6, 16);
console.log(`  Phase 8 doc99 cross-check:`);
console.log(`    integrated cycles from balanced to year -380M = ${cycles_380M.toFixed(1)}`);
console.log(`    J2000 snapshot would give:  ${((-380e6 - BALANCED_YEAR_J2000_FIXED_H8) * 16 / HOLISTIC_YEAR_J2000).toFixed(1)}`);
console.log(`    Devonian snapshot would give: ${((-380e6 - (-278861)) * 16 / 309083).toFixed(1)} (approx)`);
console.log(`    (doc 99 quotes ~18,898 integrated, 18,118 modern-snapshot, 19,656 Devonian-snapshot)`);
// Both span values are NEGATIVE (yearB << yearA). Integrated should be MORE
// negative than J2000 snapshot but LESS negative than Devonian snapshot.
const cycles_j2000_snap = (-380e6 - BALANCED_YEAR_J2000_FIXED_H8) * 16 / HOLISTIC_YEAR_J2000;
const cycles_dev_snap   = (-380e6 - (-278861)) * 16 / 309083;
check('Phase 8: integrated cycle count is between J2000 and Devonian snapshots',
      (cycles_380M > cycles_dev_snap && cycles_380M < cycles_j2000_snap) ? 1 : 0, 1);
console.log();

// ═══════════════════════════════════════════════════════════════════
// PHASE 8.5 — Complete the snapshot→integrated migration
// (Verifies the Phase 8 helper pattern handles year-Fourier-driven calcs)
// ═══════════════════════════════════════════════════════════════════

console.log('=== Phase 8.5: year-Fourier + obliquity + solstice migrations ===\n');

resetEpochToJ2000();

// Mock the evalYearFourier-style Phase 8.5 call to verify the migration pattern works
function evalYearFourierH85(currentYear, mean, harmonics) {
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = phaseAdvanceRadians(BALANCED_YEAR_J2000_FIXED_H8, currentYear, div);
    if (phase === null) continue;
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

// Sample harmonics (mock SIDEREAL_YEAR_HARMONICS top 2 entries)
const _MOCK_HARMONICS = [
  [8,  0.0001234, -0.0000567],   // H/8 obliquity
  [3, -0.0000789,  0.0000123],   // H/3 inclination
];
const _MOCK_MEAN = 365.25636;     // sidereal year days

// Frame independence: same year-Fourier-driven value at year -380M observed from
// modern vs Devonian frame
resetEpochToJ2000();
const sidYr_modernFrame = evalYearFourierH85(-380e6, _MOCK_MEAN, _MOCK_HARMONICS);
setEpochByAge(380);
const sidYr_devonianFrame = evalYearFourierH85(-380e6, _MOCK_MEAN, _MOCK_HARMONICS);
check('Phase 8.5: evalYearFourier frame-independent (modern == Devonian)',
      sidYr_modernFrame, sidYr_devonianFrame, 1e-12);

// At J2000 epoch: integrated ≈ snapshot
resetEpochToJ2000();
const sidYr_currentFromIntegrated = evalYearFourierH85(2024, _MOCK_MEAN, _MOCK_HARMONICS);
// Snapshot equivalent for comparison
const t_snapshot = 2024 - (-302635);  // year - balancedYear
let sidYr_snapshot = _MOCK_MEAN;
for (const [div, sinC, cosC] of _MOCK_HARMONICS) {
  const phase = 2 * Math.PI * t_snapshot / (HOLISTIC_YEAR_J2000 / div);
  sidYr_snapshot += sinC * Math.sin(phase) + cosC * Math.cos(phase);
}
check('Phase 8.5: at year 2024 snapshot ≈ integrated to 1e-4',
      sidYr_currentFromIntegrated, sidYr_snapshot, 1e-4);
console.log();

// === Report ===
console.log('═══════════════ RESULTS ═══════════════\n');
let pass = 0, fail = 0;
for (const c of checks) {
  const flag = c.pass ? '✓' : '✗';
  const relStr = isFinite(c.rel) ? ` rel ${c.rel.toExponential(2)}` : '';
  console.log(`  ${flag}  ${c.label.padEnd(48)} ${c.actual.toFixed(6).padStart(20)}    (target ${c.expected.toFixed(6)}${relStr})`);
  if (c.pass) pass++; else fail++;
}
console.log();
console.log(`${pass} passed, ${fail} failed of ${checks.length} checks.`);
process.exit(fail === 0 ? 0 : 1);
