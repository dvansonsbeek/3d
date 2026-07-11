// ═══════════════════════════════════════════════════════════════════════════
// DEEP-TIME CHAIN — ESSRT Architecture α (port of src/script.js mean*AtAge)
//
// Pure functions that return deep-time-aware values as functions of t_Ma
// (millions of years before J2000; positive = past, negative = future).
//
// At t_Ma = 0 every function returns the J2000 anchor value bit-exactly.
//
// Source: src/script.js lines 4490-5543 (ESSRT Architecture α 2026-06).
// Mirrors the production chain with NO state mutation — safe for the dashboard
// to call thousands of times per export.
//
// Implementation note (per IP-dashboard-deep-time-alignment.md Q1):
// dual-source is accepted. This module is the Node-side copy; src/script.js
// has the equivalent browser-inline copy. Keep formulas in sync.
//
// Doc reference: docs/99-expanding-solar-system-resonance-theory.md
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');

// ─── Physical constants (literature-anchored, not framework-derived) ──────

const EARTH_DIAMETER_KM = 12756.27;                                  // IERS WGS84
const R_EARTH_M = (EARTH_DIAMETER_KM / 2) * 1000;
const EARTH_MOI_FACTOR = 0.3306947;                                  // IERS Conventions 2010 (α at J2000)

// Glacial Isostatic Adjustment — Cox & Chao 2002 + Peltier ICE-5G(VM2) modes
const EARTH_MOI_FACTOR_RATE_YR = -1.8e-11;                           // dα/dt today, per year (sum of all modes)
const GIA_MODES = [
  { tau:  1500, frac: 0.15 },   // M₁ — upper mantle
  { tau:  5000, frac: 0.55 },   // M₂ — transition zone (dominant for continental ice loads)
  { tau: 14000, frac: 0.30 },   // M₃ — lower mantle (slow, deep-time tail)
];
const GIA_MODE_AMPLITUDES = GIA_MODES.map(m => -EARTH_MOI_FACTOR_RATE_YR * m.frac * m.tau);

// Solar physics — Driver 2 mass loss
const L_SUN_W              = 3.828e26;                                // IAU 2015 nominal solar luminosity (W)
const SOLAR_WIND_KG_PER_S  = 1.6e9;                                   // Ulysses/ACE/Wind measurements
const C_SI_M_PER_S         = C.speedOfLight ? C.speedOfLight * 1000 : 299792458;  // m/s
const DM_DT_TOTAL_KG_S     = L_SUN_W / (C_SI_M_PER_S * C_SI_M_PER_S) + SOLAR_WIND_KG_PER_S;

// Farhat 2022 LSQ polynomial coefficients — Moon distance evolution
// a_Moon(t)/a_now = 1 + α₁·t + α₃·t³ + α₄·t⁴  (no α₂; preserves modern Wells rate)
const ALPHA_1 = -8.8658188951e-05;   // /Ma   (modern recession, Wells 0.00526 hr/Ma anchor)
const ALPHA_3 = -6.4186463489e-12;   // /Ma³  (LSQ fit to Farhat 2022 deep-time anchors)
const ALPHA_4 = +1.3619800519e-16;   // /Ma⁴  (LSQ fit to Farhat 2022 deep-time anchors)

// ─── J2000 anchors derived from framework constants ───────────────────────

const HOLISTIC_YEAR_J2000        = C.H;
const MEAN_SIDEREAL_YEAR_J2000_S = C.meanSiderealYearSeconds;
const LOD_NOW_H13_S              = C.meanSiderealYearSeconds / C.meanSiderealYearDays;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * C.meanLengthOfDay;
const SI_TROPICAL_YEAR_DAYS      = MEAN_TROPICAL_YEAR_J2000_S / 86400;

const SOLAR_MASS_LOSS_FRAC_PER_YR = DM_DT_TOTAL_KG_S * MEAN_SIDEREAL_YEAR_J2000_S / C.M_SUN;

// Earth mass, moments
const M_EARTH_ALONE = C.GM_EARTH_ALONE / C.G_CONSTANT;
const M_MOON_ALONE  = C.GM_MOON_ALONE  / C.G_CONSTANT;
const I_EARTH_J2000 = EARTH_MOI_FACTOR * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;

// Moon constants
const A_MOON_NOW_M    = C.moonDistance * 1000;
const E_FACTOR_MOON   = Math.sqrt(1 - C.moonOrbitalEccentricity * C.moonOrbitalEccentricity);
const GM_EM_M3S2      = C.GM_EARTH_MOON_SYSTEM * 1e9; // km³/s² → m³/s²
const L_TOTAL_EM_KGM2_S = (I_EARTH_J2000 * 2 * Math.PI / LOD_NOW_H13_S)
                        + (M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * A_MOON_NOW_M) * E_FACTOR_MOON);
const A_LOCK_M        = (L_TOTAL_EM_KGM2_S / (M_MOON_ALONE * Math.sqrt(GM_EM_M3S2) * E_FACTOR_MOON)) ** 2;

// J2000 Moon precession anchors (Option C+ — observational anchors, Earth frame = ICRF ∓ H/13)
const TOTAL_DAYS_IN_H_J2000 = C.H * C.meanSolarYearDays;
const N_apsidalI_J2000 = Math.round(TOTAL_DAYS_IN_H_J2000 / C.moonApsidalPrecessionDaysInputICRF);
const N_nodalI_J2000   = Math.round(TOTAL_DAYS_IN_H_J2000 / C.moonNodalPrecessionDaysInputICRF);
const N_apsidalE_J2000 = N_apsidalI_J2000 - 13;
const N_nodalE_J2000   = N_nodalI_J2000 + 13;

const _moonApsidalEarthDays = TOTAL_DAYS_IN_H_J2000 / N_apsidalE_J2000;
const _moonNodalEarthDays   = TOTAL_DAYS_IN_H_J2000 / N_nodalE_J2000;
const MOON_APSIDAL_J2000_S = _moonApsidalEarthDays * LOD_NOW_H13_S;  // ≈ 8.85 yr
const MOON_NODAL_J2000_S   = _moonNodalEarthDays   * LOD_NOW_H13_S;  // ≈ 18.60 yr
const MOON_SIDEREAL_MONTH_J2000_S = C.moonSiderealMonthInput * LOD_NOW_H13_S;

// Per-planet semi-major axes at J2000 (km). AU-ratio via Kepler 3rd law:
// a = (T²)^(1/3) where T = H / round(H × meanSolarYear / solarYearInput).
// Matches orbital-engine.js computeSemiMajorAxis().
function _planetAuRatio(name) {
  if (name === 'earth') return 1.0;
  const p = C.planets && C.planets[name];
  if (!p || !p.solarYearInput) return 0;
  const orbitCount = Math.round(C.H * C.meanSolarYearDays / p.solarYearInput);
  const T = C.H / orbitCount;
  return Math.pow(T * T, 1 / 3);
}
const _planetA_J2000 = {};
for (const k of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']) {
  _planetA_J2000[k] = _planetAuRatio(k) * C.currentAUDistance;
}

// ─── α(t): viscoelastic GIA — earthMoiFactorAtAge ────────────────────────
// Symmetric: GIA modes saturate in both past AND future. Linear extrapolation
// would be unphysical at deep time (modern dα/dt is GIA-driven, not secular).
// Kept in lock-step with src/script.js per the dual-source invariant.
function earthMoiFactorAtAge(t_Ma) {
  const t_abs_yr = Math.abs(t_Ma) * 1e6;
  let alpha_excess = 0;
  for (let i = 0; i < GIA_MODES.length; i++) {
    alpha_excess += GIA_MODE_AMPLITUDES[i] * (1 - Math.exp(-t_abs_yr / GIA_MODES[i].tau));
  }
  return EARTH_MOI_FACTOR + alpha_excess;
}

function iEarthAtAge(t_Ma) {
  return earthMoiFactorAtAge(t_Ma) * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;
}

// ─── LAYER 2 — Moon distance ──────────────────────────────────────────────
function meanMoonDistanceMetresAtAge(t_Ma) {
  const t = t_Ma;
  return A_MOON_NOW_M * (1 + ALPHA_1*t + ALPHA_3*t*t*t + ALPHA_4*t*t*t*t);
}

function meanMoonDistanceAtAge(t_Ma) {
  return meanMoonDistanceMetresAtAge(t_Ma) / 1000;
}

// ─── LAYER 1 — Angular-momentum-conservation LOD ──────────────────────────
function meanLodSecondsAtAge(t_Ma) {
  const a = meanMoonDistanceMetresAtAge(t_Ma);
  if (a <= 0 || a >= A_LOCK_M) return null;
  return (2 * Math.PI * iEarthAtAge(t_Ma)) /
         (L_TOTAL_EM_KGM2_S - M_MOON_ALONE * Math.sqrt(GM_EM_M3S2 * a) * E_FACTOR_MOON);
}

function meanLodHoursAtAge(t_Ma) {
  const s = meanLodSecondsAtAge(t_Ma);
  return (s === null) ? null : s / 3600;
}

// ─── STEP 2 — H(t) ────────────────────────────────────────────────────────
function meanHAtAge(t_Ma) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  return HOLISTIC_YEAR_J2000 * LOD_s / LOD_NOW_H13_S;
}

// ─── Driver 2 — AU and year_s ─────────────────────────────────────────────
function meanAuAtAge(t_Ma) {
  if (t_Ma === 0) return C.currentAUDistance;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return C.currentAUDistance * (1 - mass_loss_fraction);
}

function meanSiderealYearSecondsAtAge(t_Ma) {
  if (t_Ma === 0) return MEAN_SIDEREAL_YEAR_J2000_S;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return MEAN_SIDEREAL_YEAR_J2000_S * (1 - 2 * mass_loss_fraction);
}

function meanTropicalYearSecondsAtAge(t_Ma) {
  const sidSec = meanSiderealYearSecondsAtAge(t_Ma);
  const Ht = meanHAtAge(t_Ma);
  if (Ht === null) return sidSec * (1 - 13 / HOLISTIC_YEAR_J2000);
  return sidSec * (1 - 13 / Ht);
}

function meanTropicalYearDaysAtAge(t_Ma) {
  const seconds = meanTropicalYearSecondsAtAge(t_Ma);
  return seconds === null ? null : seconds / 86400;
}

function meanYearInDaysAtAge(t_Ma) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  return meanTropicalYearSecondsAtAge(t_Ma) / LOD_s;
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-Milankovitch 8H-lattice ΔT corrections (3-flag stack, mirrors src/script.js)
// ═════════════════════════════════════════════════════════════════════════════
// Three framework-native harmonic corrections applied post-integration on top
// of the pure-tidal ΔT below. Each has a zero-fit structural period (drops
// out of the 8H lattice arithmetic) and a fitted amplitude/phase (constrained
// physical prior). Each anchored to 0 at year 2000; Holocene taper (±4500
// full, ±6000 zero) prevents unbounded extrapolation. Details in
// docs/102-gia-alpha-lunar-validation.md.
//
//   Bond      8H/1830 = 1466 yr — 74 × Jupiter-Saturn synodic; gcd=61
//   Hallstatt 8H/1104 = H/138 = 2430 yr — H's 23-factor
//   Jose5     8H/2989 ≈ 897 yr — H's 61-factor, 5×Jose 179

const EIGHT_H = 8 * HOLISTIC_YEAR_J2000;

const BOND_LATTICE_N = 1830;
const BOND_PERIOD_YR = EIGHT_H / BOND_LATTICE_N;
const BOND_OMEGA = 2 * Math.PI / BOND_PERIOD_YR;
const BOND_COS_COEFF_S = 165.92681616414058;
const BOND_SIN_COEFF_S = 336.8127054187615;

const HALLSTATT_LATTICE_N = 1104;
const HALLSTATT_PERIOD_YR = EIGHT_H / HALLSTATT_LATTICE_N;
const HALLSTATT_OMEGA = 2 * Math.PI / HALLSTATT_PERIOD_YR;
const HALLSTATT_COS_COEFF_S = -9.173518918513707;
const HALLSTATT_SIN_COEFF_S = 79.47230052446999;

const JOSE5_LATTICE_N = 2989;
const JOSE5_PERIOD_YR = EIGHT_H / JOSE5_LATTICE_N;
const JOSE5_OMEGA = 2 * Math.PI / JOSE5_PERIOD_YR;
const JOSE5_COS_COEFF_S = -48.48068102537258;
const JOSE5_SIN_COEFF_S = -12.23207126025995;

const HOLOCENE_TAPER_FULL_HALFWIDTH_YR = 4500;
const HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR = 6000;

function holoceneTaper(year) {
  const dy = Math.abs(year - 2000);
  if (dy <= HOLOCENE_TAPER_FULL_HALFWIDTH_YR) return 1.0;
  if (dy >= HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR) return 0.0;
  const u = (dy - HOLOCENE_TAPER_FULL_HALFWIDTH_YR)
          / (HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR - HOLOCENE_TAPER_FULL_HALFWIDTH_YR);
  return 0.5 * (1.0 + Math.cos(Math.PI * u));
}

const BOND_DT_RAW_AT_J2000      = BOND_COS_COEFF_S      * Math.cos(BOND_OMEGA      * 2000) + BOND_SIN_COEFF_S      * Math.sin(BOND_OMEGA      * 2000);
const HALLSTATT_DT_RAW_AT_J2000 = HALLSTATT_COS_COEFF_S * Math.cos(HALLSTATT_OMEGA * 2000) + HALLSTATT_SIN_COEFF_S * Math.sin(HALLSTATT_OMEGA * 2000);
const JOSE5_DT_RAW_AT_J2000     = JOSE5_COS_COEFF_S     * Math.cos(JOSE5_OMEGA     * 2000) + JOSE5_SIN_COEFF_S     * Math.sin(JOSE5_OMEGA     * 2000);

function bondCycleDeltaTCorrection(year) {
  const taper = holoceneTaper(year);
  if (taper <= 0) return 0;
  const raw = BOND_COS_COEFF_S * Math.cos(BOND_OMEGA * year)
            + BOND_SIN_COEFF_S * Math.sin(BOND_OMEGA * year);
  return taper * (raw - BOND_DT_RAW_AT_J2000);
}
function hallstattCycleDeltaTCorrection(year) {
  const taper = holoceneTaper(year);
  if (taper <= 0) return 0;
  const raw = HALLSTATT_COS_COEFF_S * Math.cos(HALLSTATT_OMEGA * year)
            + HALLSTATT_SIN_COEFF_S * Math.sin(HALLSTATT_OMEGA * year);
  return taper * (raw - HALLSTATT_DT_RAW_AT_J2000);
}
function jose5CycleDeltaTCorrection(year) {
  const taper = holoceneTaper(year);
  if (taper <= 0) return 0;
  const raw = JOSE5_COS_COEFF_S * Math.cos(JOSE5_OMEGA * year)
            + JOSE5_SIN_COEFF_S * Math.sin(JOSE5_OMEGA * year);
  return taper * (raw - JOSE5_DT_RAW_AT_J2000);
}

// ─── ΔT integrator (mirrors src/script.js meanDeltaTSecondsAtAge) ───────────
// Pure-tidal Simpson integration + post-integration 3-cycle H-lattice
// corrections (Bond + Hallstatt + Jose5) matching the shipped 3-flag stack.
// Positive on both sides of J2000; ΔT(0) = 0 exactly by anchor construction.
// This is FRAMEWORK'S OWN ΔT (LOD-based + lattice), NOT Espenak/Meeus.
const _DELTA_T_CACHE = new Map();
const _MAX_DELTA_T_CACHE = 512;

// DT_CORRECTIONS_DISABLED=1 in env: bypasses the 3-flag stack (pure-tidal only).
// Used by tools/fit/dt-corrections-fit.js to compute the raw framework residual
// before applying corrections. Mirrors SUN_HARMONICS_DISABLED=1 pattern.
const DT_CORRECTIONS_ENABLED = process.env.DT_CORRECTIONS_DISABLED !== '1';

function meanDeltaTSecondsAtAge(t_Ma) {
  if (t_Ma === 0) return 0;
  const cacheKey = (DT_CORRECTIONS_ENABLED ? 'BHJ:' : 'raw:') + t_Ma;
  const hit = _DELTA_T_CACHE.get(cacheKey);
  if (hit !== undefined) return hit;

  const absSpan = Math.abs(t_Ma);
  let n = Math.max(32, Math.ceil(absSpan * 10));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = t_Ma / n;

  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const tau = i * h;
    const lod = meanLodSecondsAtAge(tau);
    if (lod === null) return NaN;
    const yearS = meanTropicalYearSecondsAtAge(tau);
    const integrand = (86400 - lod) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  let result = (sum * h) / 3;

  // Post-integration 3-cycle H-lattice corrections; anchored to 0 at J2000.
  // Skipped when DT_CORRECTIONS_DISABLED=1 (raw pure-tidal for fitting).
  if (DT_CORRECTIONS_ENABLED) {
    const yearY = 2000 - t_Ma * 1e6;
    result += bondCycleDeltaTCorrection(yearY);
    result += hallstattCycleDeltaTCorrection(yearY);
    result += jose5CycleDeltaTCorrection(yearY);
  }

  if (_DELTA_T_CACHE.size >= _MAX_DELTA_T_CACHE) {
    const firstKey = _DELTA_T_CACHE.keys().next().value;
    _DELTA_T_CACHE.delete(firstKey);
  }
  _DELTA_T_CACHE.set(cacheKey, result);
  return result;
}

/** ΔT in seconds at a given JD. Wraps meanDeltaTSecondsAtAge for callers
 *  that have a JD instead of t_Ma. Mirrors src/script.js _eclDeltaT.
 *  Returns 0 if formula undefined (past tidal lock). */
function frameworkDeltaT(jd) {
  const decYear = C.jdToYear(jd);
  const t_Ma = (C.startmodelYear - decYear) / 1e6;
  const dT = meanDeltaTSecondsAtAge(t_Ma);
  return Number.isFinite(dT) ? dT : 0;
}

// ─── Moon distance correction + Kepler month ──────────────────────────────
function meanSolarDeltaAAtAge(t_Ma, a_apparent_km) {
  const LOD_s = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  const T_sid_d_at_epoch = meanSiderealYearSecondsAtAge(t_Ma) / LOD_s;
  return a_apparent_km * (1 / (C.MASS_RATIO_EARTH_MOON + 1)) *
         (C.moonSiderealMonthInput / T_sid_d_at_epoch);
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

// ─── Option C+ deep-time lunar precession (Brouwer-Clemence m² scaling) ──
function meanApsidalCyclesICRFAtAge(t_Ma) {
  const H_t = meanHAtAge(t_Ma);
  if (H_t === null) return null;
  return N_apsidalI_J2000 * Math.pow(H_t / HOLISTIC_YEAR_J2000, 2);
}

function meanNodalCyclesICRFAtAge(t_Ma) {
  const H_t = meanHAtAge(t_Ma);
  if (H_t === null) return null;
  return N_nodalI_J2000 * Math.pow(H_t / HOLISTIC_YEAR_J2000, 2);
}

function meanApsidalPrecessionSecondsICRFAtAge(t_Ma) {
  const N = meanApsidalCyclesICRFAtAge(t_Ma);
  const H_t = meanHAtAge(t_Ma);
  const T_yr_s = meanSiderealYearSecondsAtAge(t_Ma);
  if (N === null || H_t === null) return null;
  return H_t * T_yr_s / N;
}

function meanNodalPrecessionSecondsICRFAtAge(t_Ma) {
  const N = meanNodalCyclesICRFAtAge(t_Ma);
  const H_t = meanHAtAge(t_Ma);
  const T_yr_s = meanSiderealYearSecondsAtAge(t_Ma);
  if (N === null || H_t === null) return null;
  return H_t * T_yr_s / N;
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

// ─── Anomalistic year + stellar/sidereal days ────────────────────────────
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

// ─── Per-planet semi-major axes (Driver 2 — solar mass loss) ──────────────
function meanPlanetSemiMajorAxisAtAge(planetName, t_Ma) {
  const a_J2000 = _planetA_J2000[planetName];
  if (a_J2000 === undefined) return null;
  if (t_Ma === 0) return a_J2000;
  const mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6;
  return a_J2000 * (1 - mass_loss_fraction);
}

const meanMercurySemiMajorAxisAtAge = t => meanPlanetSemiMajorAxisAtAge('mercury', t);
const meanVenusSemiMajorAxisAtAge   = t => meanPlanetSemiMajorAxisAtAge('venus',   t);
const meanEarthSemiMajorAxisAtAge   = t => meanAuAtAge(t);
const meanMarsSemiMajorAxisAtAge    = t => meanPlanetSemiMajorAxisAtAge('mars',    t);
const meanJupiterSemiMajorAxisAtAge = t => meanPlanetSemiMajorAxisAtAge('jupiter', t);
const meanSaturnSemiMajorAxisAtAge  = t => meanPlanetSemiMajorAxisAtAge('saturn',  t);
const meanUranusSemiMajorAxisAtAge  = t => meanPlanetSemiMajorAxisAtAge('uranus',  t);
const meanNeptuneSemiMajorAxisAtAge = t => meanPlanetSemiMajorAxisAtAge('neptune', t);

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATED PHASE — cumulative ∫1/H(t')dt' machinery
// Port of src/script.js lines 5752-6017. Used for Phase 9.12
// integrated-phase rendering of Earth H-cycle precession objects.
// ═══════════════════════════════════════════════════════════════════════════

const _CUMUL_INTEGRAL_YEAR_MIN = -500e6;   // -500 Myr
const _CUMUL_INTEGRAL_YEAR_MAX =  1.0e6;   // +1 Myr
const _CUMUL_INTEGRAL_STEP     = 10000;    // 10 kyr per cell (matches browser)

let _cumulIntegralTable    = null;
let _cumulIntegralJ2000Idx = -1;

function _ensureCumulIntegralTable() {
  if (_cumulIntegralTable !== null) return;
  const N = Math.ceil((_CUMUL_INTEGRAL_YEAR_MAX - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP) + 1;
  const table = new Float64Array(N);
  const j2000Idx = Math.round((C.startmodelYear - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP);

  const invH = (year) => {
    const t_Ma = (C.startmodelYear - year) / 1e6;
    const H = meanHAtAge(t_Ma);
    return H === null ? null : 1 / H;
  };

  table[j2000Idx] = 0;
  let prev = invH(_CUMUL_INTEGRAL_YEAR_MIN + j2000Idx * _CUMUL_INTEGRAL_STEP);
  for (let i = j2000Idx + 1; i < N; i++) {
    const year_i = _CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP;
    const curr = invH(year_i);
    table[i] = (prev !== null && curr !== null)
      ? table[i - 1] + 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP
      : NaN;
    prev = curr;
  }
  prev = invH(_CUMUL_INTEGRAL_YEAR_MIN + j2000Idx * _CUMUL_INTEGRAL_STEP);
  for (let i = j2000Idx - 1; i >= 0; i--) {
    const year_i = _CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP;
    const curr = invH(year_i);
    table[i] = (prev !== null && curr !== null)
      ? table[i + 1] - 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP
      : NaN;
    prev = curr;
  }
  _cumulIntegralTable    = table;
  _cumulIntegralJ2000Idx = j2000Idx;
}

function _cumulIntegralAtYear(year) {
  _ensureCumulIntegralTable();
  if (year < _CUMUL_INTEGRAL_YEAR_MIN || year > _CUMUL_INTEGRAL_YEAR_MAX) return null;
  const idx_f = (year - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP;
  const idx_lo = Math.floor(idx_f);
  const idx_hi = Math.min(idx_lo + 1, _cumulIntegralTable.length - 1);
  const v_lo = _cumulIntegralTable[idx_lo];
  const v_hi = _cumulIntegralTable[idx_hi];
  if (Number.isNaN(v_lo) || Number.isNaN(v_hi)) return null;
  return v_lo + (idx_f - idx_lo) * (v_hi - v_lo);
}

/** ∫_{yearA}^{yearB} 1/H(t') dt'. Returns null if either endpoint is outside
 *  [-500 Myr, +1 Myr] or past the tidal-lock asymptote. */
function integralInverseHFromYears(yearA, yearB) {
  if (yearA === yearB) return 0;
  const cA = _cumulIntegralAtYear(yearA);
  const cB = _cumulIntegralAtYear(yearB);
  if (cA === null || cB === null) return null;
  return cB - cA;
}

// Phase 9.10b drift correction: for a harmonic anchored at yearA, the
// integrated form differs from the snapshot form at J2000 by a small
// constant (~3.7 ppm × interval). Subtracting the drift at anchor makes
// the two forms agree at startModelYearWithCorrection, restoring
// snapshot-fitted harmonic calibration at J2000 without changing the
// integrated form's shape at deep time.
const _J2000_DRIFT_CACHE = new Map();
function _getJ2000Drift(yearA) {
  if (_J2000_DRIFT_CACHE.has(yearA)) return _J2000_DRIFT_CACHE.get(yearA);
  const integral = integralInverseHFromYears(yearA, C.startModelYearWithCorrection);
  if (integral === null) { _J2000_DRIFT_CACHE.set(yearA, 0); return 0; }
  const snapshot = (C.startModelYearWithCorrection - yearA) / HOLISTIC_YEAR_J2000;
  const drift = integral - snapshot;
  _J2000_DRIFT_CACHE.set(yearA, drift);
  return drift;
}

/** Total cycles between two years for a cycle of period H/divisor_N.
 *  Integrated form always (toggle at caller). Applies Phase 9.10b drift
 *  correction relative to whichever endpoint is farther from J2000.
 *  Returns null past tidal-lock asymptote. */
function cyclesBetweenYears(yearA, yearB, divisor_N) {
  const integral = integralInverseHFromYears(yearA, yearB);
  if (integral === null) return null;
  const distA = Math.abs(yearA - C.startModelYearWithCorrection);
  const distB = Math.abs(yearB - C.startModelYearWithCorrection);
  const correction = (distA >= distB) ? _getJ2000Drift(yearA) : -_getJ2000Drift(yearB);
  return divisor_N * (integral - correction);
}

// ─── Exports ──────────────────────────────────────────────────────────────
module.exports = {
  // Anchor constants (for callers that need them)
  HOLISTIC_YEAR_J2000,
  MEAN_SIDEREAL_YEAR_J2000_S,
  MEAN_TROPICAL_YEAR_J2000_S,
  LOD_NOW_H13_S,
  A_MOON_NOW_M,
  A_LOCK_M,
  N_apsidalI_J2000,
  N_nodalI_J2000,
  MOON_APSIDAL_J2000_S,
  MOON_NODAL_J2000_S,
  MOON_SIDEREAL_MONTH_J2000_S,
  SOLAR_MASS_LOSS_FRAC_PER_YR,
  // Earth physical
  earthMoiFactorAtAge, iEarthAtAge,
  // Layer 2 + Layer 1
  meanMoonDistanceMetresAtAge, meanMoonDistanceAtAge,
  meanLodSecondsAtAge, meanLodHoursAtAge,
  // Step 2
  meanHAtAge,
  // Driver 2
  meanAuAtAge, meanSiderealYearSecondsAtAge, meanTropicalYearSecondsAtAge,
  meanTropicalYearDaysAtAge, meanYearInDaysAtAge,
  // ΔT
  meanDeltaTSecondsAtAge, frameworkDeltaT,
  // Moon chain
  meanSolarDeltaAAtAge, meanMoonDistanceCorrectedAtAge,
  meanMoonSiderealMonthAtAge, meanSynodicMonthAtAge, meanTropicalMonthAtAge,
  meanApsidalCyclesICRFAtAge, meanNodalCyclesICRFAtAge,
  meanApsidalPrecessionSecondsICRFAtAge, meanNodalPrecessionSecondsICRFAtAge,
  meanLunarPerigeePrecessionAtAge, meanLunarNodePrecessionAtAge,
  meanAnomalisticMonthAtAge, meanNodalMonthAtAge,
  // Earth derivations
  meanAnomalisticYearSecondsAtAge,
  meanStellarDayAtAge, meanSiderealDayAtAge,
  // Per-planet
  meanPlanetSemiMajorAxisAtAge,
  meanMercurySemiMajorAxisAtAge, meanVenusSemiMajorAxisAtAge,
  meanEarthSemiMajorAxisAtAge,   meanMarsSemiMajorAxisAtAge,
  meanJupiterSemiMajorAxisAtAge, meanSaturnSemiMajorAxisAtAge,
  meanUranusSemiMajorAxisAtAge,  meanNeptuneSemiMajorAxisAtAge,
  // Integrated phase (Phase 9.12)
  integralInverseHFromYears, cyclesBetweenYears,
};
