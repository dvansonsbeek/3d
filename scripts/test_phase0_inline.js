/**
 * Validate the Phase 0 deep-time chain just inserted into src/script.js
 * by loading the relevant constant section and the new functions in
 * isolation under Node.  Uses the same arithmetic as the inline block.
 *
 * Run with:  node scripts/test_phase0_inline.js
 */

// ── Replicate the script.js anchor constants needed by Phase 0 ──
const holisticyearLength               = 335317;
const inputmeanlengthsolaryearindays   = 365.2422;
const meansolaryearlengthinDays        =
  Math.round(inputmeanlengthsolaryearindays * (holisticyearLength / 8))
    / (holisticyearLength / 8);

const currentAUDistance      = 149597870.698828;
const speedOfLight           = 299792.458;
const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput    = 27.21222082;
const moonDistance           = 384399.07;
const moonOrbitalEccentricityBase = 0.054900489;

const siderealYearJ2000      = 365.25636301;        // from astro-reference.json
const meansiderealyearlengthinSeconds = siderealYearJ2000 * 86400;
const meansiderealyearlengthinDays    =
  meansolaryearlengthinDays * (holisticyearLength / 13)
    / ((holisticyearLength / 13) - 1);
const meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;

// Mass/GM section
const G_CONSTANT          = 6.6743e-20;
const MASS_RATIO_EARTH_MOON = 81.30056816;
const moonSiderealMonth   = (holisticyearLength * meansolaryearlengthinDays)
    / Math.round((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput);
const moonOrbitalShift    = moonDistance * (1 / (MASS_RATIO_EARTH_MOON + 1))
    * (moonSiderealMonth / meansiderealyearlengthinDays);
const moonDistanceCorrected = moonDistance + moonOrbitalShift;
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistanceCorrected, 3))
    / Math.pow(moonSiderealMonth * meanlengthofday, 2);
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
const M_EARTH_ALONE  = GM_EARTH_ALONE / G_CONSTANT;
const GM_MOON_ALONE  = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1);
const M_MOON_ALONE   = GM_MOON_ALONE / G_CONSTANT;
// Sun side (rough — uses meanAUDistance / Kepler)
const meanAUDistance = currentAUDistance;
const GM_SUN_PLUS_EARTH = (4 * Math.PI * Math.PI * Math.pow(meanAUDistance, 3))
    / Math.pow(meansiderealyearlengthinSeconds, 2);
const GM_SUN = GM_SUN_PLUS_EARTH - GM_EARTH_ALONE;
const M_SUN  = GM_SUN / G_CONSTANT;

const diameters = { earthDiameter: 12756.27 };

// Planet AU ratios (just Mercury for sanity)
const mercurySolarYearCount = Math.round((holisticyearLength * meansolaryearlengthinDays) / 87.96952);
const mercuryOrbitDistance  = (((holisticyearLength / mercurySolarYearCount) ** 2) ** (1 / 3));

// =================================================================
// PHASE 0 BLOCK — copied verbatim from src/script.js insertion
// =================================================================

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
  return holisticyearLength * LOD_s / LOD_NOW_H13_S;
}
function meanAuAtAge(t_Ma) {
  if (t_Ma === 0) return currentAUDistance;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return currentAUDistance * (1 - mass_loss_fraction);
}
function meanSiderealYearSecondsAtAge(t_Ma) {
  if (t_Ma === 0) return meansiderealyearlengthinSeconds;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return meansiderealyearlengthinSeconds * (1 - 2 * mass_loss_fraction);
}
function meanTropicalYearSecondsAtAge(t_Ma) {
  const tropical_now_s = meansolaryearlengthinDays * meanlengthofday;
  if (t_Ma === 0) return tropical_now_s;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return tropical_now_s * (1 - 2 * mass_loss_fraction);
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

// =================================================================
// CHECKS
// =================================================================

const checks = [];
function check(label, actual, expected, tol_rel = 1e-6, tol_abs = null) {
  const diff = Math.abs(actual - expected);
  const rel  = diff / Math.abs(expected || 1);
  // exact match passes immediately; otherwise tol_abs (if non-zero) wins, else tol_rel
  const pass = (actual === expected)
    ? true
    : (tol_abs ? diff < tol_abs : rel < tol_rel);
  checks.push({label, actual, expected, diff, rel, pass});
}

console.log('=== J2000 anchors at t_Ma = 0 ===\n');

check('holisticyearLength',                holisticyearLength,                  335317);
check('meanHAtAge(0)',                     meanHAtAge(0),                       335317);
check('meanLodSecondsAtAge(0)',            meanLodSecondsAtAge(0),              LOD_NOW_H13_S, 1e-12);
check('meanAuAtAge(0)',                    meanAuAtAge(0),                      currentAUDistance, 0, 0);
check('meanSiderealYearSecondsAtAge(0)',   meanSiderealYearSecondsAtAge(0),     meansiderealyearlengthinSeconds, 0, 0);
// Tropical year at 0 uses meanlengthofday (≈ LOD_NOW_H13) — 0.12 s below the
// 365.2422036 × 86400 nominal because LOD_NOW_H13 is 3.7 ppb below 86400.
check('meanTropicalYearSecondsAtAge(0)',   meanTropicalYearSecondsAtAge(0),     meansolaryearlengthinDays * meanlengthofday);
check('meanMoonDistanceAtAge(0)',          meanMoonDistanceAtAge(0),            moonDistance, 0, 0);

// Compare derived month against IAU input
check('Moon T_sidereal d at 0',
      meanMoonSiderealMonthAtAge(0) / meanlengthofday,
      27.321662, 5e-5);
check('Anomalistic year d at 0',
      meanAnomalisticYearSecondsAtAge(0) / meanlengthofday,
      365.259633, 5e-5);
check('Stellar day s at 0',
      meanStellarDayAtAge(0),
      86164.0997, null, 1.0);   // doc says 86164.0997, allow ~1s tolerance
check('Sidereal day s at 0',
      meanSiderealDayAtAge(0),
      86164.0905, null, 1.0);

// Diagnostic
console.log(`  LOD_NOW_H13_S          = ${LOD_NOW_H13_S.toFixed(6)} s   (target ≈ 86399.999677)`);
console.log(`  TOTAL_DAYS_IN_H        = ${TOTAL_DAYS_IN_H.toFixed(3)}    (target ≈ 122,471,920)`);
console.log(`  A_LOCK_M (km)          = ${(A_LOCK_M/1000).toFixed(0)}   (target ≈ 555,623)`);
console.log(`  I_EARTH                = ${I_EARTH.toExponential(4)}   (target ≈ 8.034 × 10³⁷)`);
console.log(`  L_TOTAL_EM_KGM2_S      = ${L_TOTAL_EM_KGM2_S.toExponential(4)}   (target ≈ 3.473 × 10³⁴)`);
console.log(`  SOLAR_MASS_LOSS_FRAC   = ${SOLAR_MASS_LOSS_FRAC_PER_YR.toExponential(4)}   (target ≈ 9.30 × 10⁻¹⁴)`);
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

// Days/year diagnostic at Devonian
const daysPerYrDev = meanYearInDaysAtAge(380);
console.log(`  Days/year at Devonian  = ${daysPerYrDev.toFixed(3)}    (target ≈ 396.21, Wells 1963 ~400)`);
console.log(`  T_Moon at Devonian (s) = ${tsmDev.toFixed(0)}    (target ≈ 2,240,855)`);
console.log();

// === Report ===
console.log('═══════════════ RESULTS ═══════════════\n');
let pass = 0, fail = 0;
for (const c of checks) {
  const flag = c.pass ? '✓' : '✗';
  const relStr = isFinite(c.rel) ? ` rel ${c.rel.toExponential(2)}` : '';
  console.log(`  ${flag}  ${c.label.padEnd(36)} ${c.actual.toFixed(6).padStart(20)}    (target ${c.expected.toFixed(6)}${relStr})`);
  if (c.pass) pass++; else fail++;
}
console.log();
console.log(`${pass} passed, ${fail} failed of ${checks.length} checks.`);
process.exit(fail === 0 ? 0 : 1);
