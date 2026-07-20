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
const fs = require('fs');
const path = require('path');

// ─── Physical constants (literature-anchored, not framework-derived) ──────

const EARTH_DIAMETER_KM = 12756.27;                                  // IERS WGS84
const R_EARTH_M = (EARTH_DIAMETER_KM / 2) * 1000;
const EARTH_MOI_FACTOR = 0.3306947;                                  // IERS Conventions 2010 (α at J2000)

// ─── Climate-driven α(t) — Option 4-climate refinement (2026-07) ─────────
// Replaces the earlier |t|-symmetric Peltier 3-mode viscoelastic form (which
// had a slope discontinuity at J2000) with a direct coupling to the L1
// orbital layer of the canonical Climate Formula (LR04 post-MPT regime).
// Kept in lock-step with src/script.js earthMoiFactorAtAge and with the
// Holistic mirror src/lib/orbital/deepTime.ts. Loads coefficients from the
// shared JSON source to eliminate manual dual-copy sync.
const ALPHA_CLIMATE_REGIME_KEY = 'lr04-post-mpt';
const ALPHA_CLIMATE_SCALE      = -3.93e-7;   // per ‰; calibrated so dα/dt at J2000 = -1.35e-11/yr.
                                             //  Cox & Chao 2002 dJ₂/dt = -2.7e-11/yr / conversion factor 2.0
                                             //  (Peltier ICE-6G LOD-coupling range; was 1.5 per Cheng-Tapley-Ries 2013).
                                             //  Empirical L-5b|R| optimum with LLR α₁ landed at this GIA coupling —
                                             //  physically defensible via the model-dependent J₂→α conversion uncertainty.
                                             //  Prior value: -5.24e-7 (dα/dt = -1.8e-11/yr, factor 1.5).
const _CLIMATE_JSON_PATH       = path.join(__dirname, '..', '..', 'public', 'input', 'climate-formula-coefficients.json');
const CLIMATE_FORMULA_COEFFS   = JSON.parse(fs.readFileSync(_CLIMATE_JSON_PATH, 'utf8'));

// Solar physics — Driver 2 mass loss
const L_SUN_W              = 3.828e26;                                // IAU 2015 nominal solar luminosity (W)
const SOLAR_WIND_KG_PER_S  = 1.6e9;                                   // Ulysses/ACE/Wind measurements
const C_SI_M_PER_S         = C.speedOfLight ? C.speedOfLight * 1000 : 299792458;  // m/s
const DM_DT_TOTAL_KG_S     = L_SUN_W / (C_SI_M_PER_S * C_SI_M_PER_S) + SOLAR_WIND_KG_PER_S;

// Farhat 2022 LSQ polynomial coefficients — Moon distance evolution
// a_Moon(t)/a_now = 1 + α₁·t + α₃·t³ + α₄·t⁴  (no α₂; preserves modern Wells rate)
const ALPHA_1 = -9.9375895103e-05;   // /Ma  — anchored to modern LLR direct observation
                                     //  da/dt(J2000) = 3.82 cm/yr (Dickey 1994 / Chapront 2002).
                                     //  Validates against Wells 1963 coral rings (400.06 vs 400 days/yr
                                     //  at 380 Ma, 0.01% error) and Wu 2024 cyclostratigraphy (411.5 vs
                                     //  412 days/yr at 500 Ma, 0.12%). Places Moon at rigid Roche at
                                     //  ~4.498 Ga — matches giant-impact-4.5-Ga standard.
                                     //  Prior value: -8.8658188951e-05 (Wells 1989 DERIVED rate 3.43 cm/yr,
                                     //  a theoretical Phanerozoic-average value; the direct paleontological
                                     //  data itself supports the LLR rate, not the Wells 1989 derivation).
const ALPHA_3 = -6.4186463489e-12;   // /Ma³  (LSQ fit to Farhat 2022 deep-time anchors)
const ALPHA_4 = +1.3619800519e-16;   // /Ma⁴  (LSQ fit to Farhat 2022 deep-time anchors)

// ─── J2000 anchors derived from framework constants ───────────────────────

const HOLISTIC_YEAR_J2000        = C.H;
const MEAN_SIDEREAL_YEAR_J2000_S = C.meanSiderealYearSeconds;
// LOD anchor via H/13 identity: T_sid_sec / T_sid_days_framework where
// T_sid_days_framework = T_trop × H/(H−13). Under H=335,317 this gives
// 86399.99968 s at J2000 — matches simulator src/script.js:LOD_NOW_H13_S.
const LOD_NOW_H13_S              = C.meanSiderealYearSeconds / C.meanSiderealYearDaysKinematic;
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

// ─── α(t): climate-driven — earthMoiFactorAtAge ──────────────────────────
// Binds α to the L1 orbital layer of the canonical Climate Formula (LR04
// post-MPT regime). One physical mechanism, two observables: the same L1
// signal that fits δ¹⁸O also drives α — via Milankovitch orbital forcing
// → ice sheet dynamics → GIA J₂/α → LOD. Preserves α_J2000 = EARTH_MOI_
// FACTOR exactly and Cox & Chao's dα/dt at J2000 = -1.8e-11/yr exactly.
// Kept in lock-step with src/script.js earthMoiFactorAtAge and Holistic
// mirror src/lib/orbital/deepTime.ts. See doc 99 §prediction-7.
let _alphaClimateL1_J2000 = null;

function _evalClimateL1Orbital(year) {
  const t_kyr_BP = (2000 - year) / 1000;
  const r        = CLIMATE_FORMULA_COEFFS.regimes[ALPHA_CLIMATE_REGIME_KEY];
  const EIGHT_H  = CLIMATE_FORMULA_COEFFS.config.eight_H_kyr;
  let L1_sum = 0;
  for (const c of r.L1) {
    const omega = 2 * Math.PI * c.n / EIGHT_H;
    L1_sum += c.a * Math.cos(omega * t_kyr_BP) + c.b * Math.sin(omega * t_kyr_BP);
  }
  return L1_sum * r.denormalization.y_std;
}

function earthMoiFactorAtAge(t_Ma) {
  if (_alphaClimateL1_J2000 === null) {
    _alphaClimateL1_J2000 = _evalClimateL1Orbital(2000);
  }
  const year  = 2000 - t_Ma * 1e6;
  const L1_at = _evalClimateL1Orbital(year);
  return EARTH_MOI_FACTOR - ALPHA_CLIMATE_SCALE * (L1_at - _alphaClimateL1_J2000);
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

// ─── Fourier evaluator for the sidereal-year length (IAU base) ────────────
// Mirrors src/script.js `evalYearFourier` in DEEP_TIME_MODE_ENABLED=false form.
// Uses the IAU baseline (C.meanSiderealYearDays = 365.256363004) so the derived
// "Actual" LOD matches the simulator tweakpane readout exactly at J2000.
function _evalSiderealYearFourierIAU(year) {
  const t = year - C.balancedYear;
  let result = C.meanSiderealYearDays;
  for (const [div, sinC, cosC] of C.SIDEREAL_YEAR_HARMONICS) {
    const phase = 2 * Math.PI * t / (C.H / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

/** ACTUAL LOD in seconds at given age, including Fourier fluctuations.
 *
 *  `actual(t) = mean(t) × Y_days_kinematic / Y_days_fourier(year_at_t)`
 *
 *  At J2000: matches simulator tweakpane readout exactly (via the IAU-based
 *  Fourier evaluator). For deep time: tidal LOD growth × Fourier ripple. */
function meanLodSecondsAtAgeActual(t_Ma) {
  const mean_t = meanLodSecondsAtAge(t_Ma);
  if (mean_t === null) return null;
  const year_at_t = 2000 - t_Ma * 1e6;
  const Y_days_fourier = _evalSiderealYearFourierIAU(year_at_t);
  return mean_t * C.meanSiderealYearDaysKinematic / Y_days_fourier;
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
const BOND_COS_COEFF_S = 135.99799341108618;
const BOND_SIN_COEFF_S = 246.2916701068097;

const HALLSTATT_LATTICE_N = 1104;
const HALLSTATT_PERIOD_YR = EIGHT_H / HALLSTATT_LATTICE_N;
const HALLSTATT_OMEGA = 2 * Math.PI / HALLSTATT_PERIOD_YR;
const HALLSTATT_COS_COEFF_S = 3.4311229577689573;
const HALLSTATT_SIN_COEFF_S = 79.92638735266766;

const JOSE5_LATTICE_N = 2989;
const JOSE5_PERIOD_YR = EIGHT_H / JOSE5_LATTICE_N;
const JOSE5_OMEGA = 2 * Math.PI / JOSE5_PERIOD_YR;
const JOSE5_COS_COEFF_S = -46.90713628513566;
const JOSE5_SIN_COEFF_S = 17.3124396180235;

const JOSE4_LATTICE_N = 3749;
const JOSE4_PERIOD_YR = EIGHT_H / JOSE4_LATTICE_N;
const JOSE4_OMEGA = 2 * Math.PI / JOSE4_PERIOD_YR;
const JOSE4_COS_COEFF_S = 45.29158371637972;
const JOSE4_SIN_COEFF_S = -12.79094364535659;

// Cyclic-correction taper widened 2026-07-12 from ±4.5/6 kyr Holocene window to
// ±300/400 kyr — cross-archive validation across Steinhilber ¹⁰Be (9.4 kyr),
// EPICA CO2 (800 kyr), and Cheng speleothem (640 kyr) supports cycle coherence
// well beyond the original 2.7-kyr Stephenson fit window. Fade to zero at
// ±400 kyr preserves the "not extrapolating to Myr-scale H(t) drift" honest
// claim; H differs from H_J2000 by <1.5% at this range, so the fixed-period
// assumption is valid. Constant name kept for historical continuity though the
// window is no longer literally "Holocene".
const HOLOCENE_TAPER_FULL_HALFWIDTH_YR = 300000;
const HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR = 400000;

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
const JOSE4_DT_RAW_AT_J2000    = JOSE4_COS_COEFF_S    * Math.cos(JOSE4_OMEGA    * 2000) + JOSE4_SIN_COEFF_S    * Math.sin(JOSE4_OMEGA    * 2000);

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
function jose4CycleDeltaTCorrection(year) {
  const taper = holoceneTaper(year);
  if (taper <= 0) return 0;
  const raw = JOSE4_COS_COEFF_S * Math.cos(JOSE4_OMEGA * year)
            + JOSE4_SIN_COEFF_S * Math.sin(JOSE4_OMEGA * year);
  return taper * (raw - JOSE4_DT_RAW_AT_J2000);
}

// ─── Implied LOD corrections from the 3-flag stack (Phase-8 physical consistency) ───
// The ΔT corrections are additive post-integration terms on the pure-tidal ΔT
// curve. Physically they imply corresponding sub-Milankovitch LOD variations
// via the LOD ↔ ΔT relationship (see docs/102 § "Companion 8H lattice harmonics"
// and tools/fit/README.md § Phase 8):
//
//   d/dy ΔT(y)  =  (LOD(y) − 86400) / 86400 · yearS(y)
//   ⇒ δLOD_i(y) = 86400 · d/dy[correction_i(y)] / yearS(y)
//
// These functions expose that implied δLOD so callers (dashboard export,
// browser tweakpane display) can render an LOD curve that is physically
// consistent with the corrected ΔT curve. They are NOT used by the ΔT
// integrator (which already handles the corrections via post-integration
// addition — using them there would double-count).
//
// Interior of the Holocene taper (|y−2000| ≤ 4500 yr) taper=1, taper'=0:
//   d/dy[correction_i] = ω_i · (B_i · cos(ω_i · y) − A_i · sin(ω_i · y))
// In the taper transition (4500 < |y−2000| < 6000):
//   product rule — taper'(y) · (raw(y) − raw(2000)) + taper(y) · raw'(y)
// Beyond ±6000: taper=0, δLOD=0.
//
// Peak magnitude (at Holocene coherence): Bond ≈ 4.4 ms, Hallstatt ≈ 0.6 ms,
// Jose5 ≈ 1.0 ms; combined ~5-10 ms peak-to-peak on top of the ~86400 s baseline.

function holoceneTaperDerivative(year) {
  const dy = Math.abs(year - 2000);
  if (dy <= HOLOCENE_TAPER_FULL_HALFWIDTH_YR) return 0;
  if (dy >= HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR) return 0;
  const width = HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR - HOLOCENE_TAPER_FULL_HALFWIDTH_YR;
  const u = (dy - HOLOCENE_TAPER_FULL_HALFWIDTH_YR) / width;
  // taper(y) = 0.5·(1 + cos(π·u)); d/dy = −0.5·π·sin(π·u) · (du/dy)
  // du/dy = (1/width) · sign(y − 2000)
  const sign = year >= 2000 ? 1 : -1;
  return -0.5 * Math.PI * Math.sin(Math.PI * u) / width * sign;
}

function _cycleLodCorrection(year, cos_coeff, sin_coeff, omega, raw_at_j2000) {
  const taper = holoceneTaper(year);
  if (taper <= 0) return 0;
  const raw       = cos_coeff * Math.cos(omega * year) + sin_coeff * Math.sin(omega * year);
  const raw_prime = omega * (sin_coeff * Math.cos(omega * year) - cos_coeff * Math.sin(omega * year));
  const taper_prime = holoceneTaperDerivative(year);
  // d/dy[correction(y)] = taper'(y)·(raw − raw@J2000) + taper(y)·raw'(y)
  const dCdy = taper_prime * (raw - raw_at_j2000) + taper * raw_prime;
  // Use J2000 tropical year length as denominator — variation within ±6000 yr
  // is ≤10^-8 relative, negligible at millisecond LOD scale.
  const yearS = MEAN_TROPICAL_YEAR_J2000_S;
  return 86400 * dCdy / yearS;
}

function bondCycleLodCorrection(year) {
  return _cycleLodCorrection(year, BOND_COS_COEFF_S, BOND_SIN_COEFF_S, BOND_OMEGA, BOND_DT_RAW_AT_J2000);
}
function hallstattCycleLodCorrection(year) {
  return _cycleLodCorrection(year, HALLSTATT_COS_COEFF_S, HALLSTATT_SIN_COEFF_S, HALLSTATT_OMEGA, HALLSTATT_DT_RAW_AT_J2000);
}
function jose5CycleLodCorrection(year) {
  return _cycleLodCorrection(year, JOSE5_COS_COEFF_S, JOSE5_SIN_COEFF_S, JOSE5_OMEGA, JOSE5_DT_RAW_AT_J2000);
}
function jose4CycleLodCorrection(year) {
  return _cycleLodCorrection(year, JOSE4_COS_COEFF_S, JOSE4_SIN_COEFF_S, JOSE4_OMEGA, JOSE4_DT_RAW_AT_J2000);
}

/**
 * LOD in seconds at t_Ma, WITH 3-flag correction stack applied (physical
 * consistency: this LOD's integral matches the corrected ΔT curve).
 * Use for display in dashboards / tweakpane. The pure-tidal
 * `meanLodSecondsAtAge` remains the physics-baseline function used by the
 * ΔT integrator and by year-length / precession derivations.
 */
function meanLodSecondsWithCorrectionsAtAge(t_Ma) {
  const tidal = meanLodSecondsAtAge(t_Ma);
  if (tidal === null) return null;
  if (!DT_CORRECTIONS_ENABLED) return tidal;
  const year = 2000 - t_Ma * 1e6;
  return tidal
       + bondCycleLodCorrection(year)
       + hallstattCycleLodCorrection(year)
       + jose5CycleLodCorrection(year)
       + jose4CycleLodCorrection(year);
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
  // ΔT(J2000) = 0 by convention (integration reference = J2000). Framework's
  // ΔT curve is offset from Stephenson-2016's absolute values by ~62 s (their
  // observed ΔT(J2000)), which is the constant offset expected between two
  // integration conventions. All differential (curvature) behavior matches.
  if (t_Ma === 0) return 0;
  const cacheKey = (DT_CORRECTIONS_ENABLED ? 'BHJW:' : 'raw:') + t_Ma;
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
    const lodMean = meanLodSecondsAtAge(tau);
    if (lodMean === null) return NaN;
    const yearS = meanTropicalYearSecondsAtAge(tau);
    // H/5 ecliptic "missing motion" — adds ~3.5 ms at J2000. Solar day is
    // measured against the Sun on the ecliptic (precesses at H/5); NOT against
    // the inclination frame (H/3). Formula corrected 2026-07-16; the H/3 form
    // was the wrong reference frame. See docs/hidden/IP-tweakpane-days-years-precession-restructure.md.
    // Mirrors src/script.js#meanDeltaTSecondsAtAge.
    const H_local  = meanHAtAge(tau);
    const mSY_days = meanTropicalYearDaysAtAge(tau);
    const lodReal  = lodMean + lodMean / ((H_local / 5) * mSY_days);
    const integrand = (86400 - lodReal) * yearS * 1e6 / 86400;
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * integrand;
  }
  let result = (sum * h) / 3;

  // Post-integration 4-cycle H-lattice corrections; anchored to 0 at J2000.
  // Skipped when DT_CORRECTIONS_DISABLED=1 (raw pure-tidal for fitting).
  if (DT_CORRECTIONS_ENABLED) {
    const yearY = 2000 - t_Ma * 1e6;
    result += bondCycleDeltaTCorrection(yearY);
    result += hallstattCycleDeltaTCorrection(yearY);
    result += jose5CycleDeltaTCorrection(yearY);
    result += jose4CycleDeltaTCorrection(yearY);
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
  meanLodSecondsAtAge, meanLodSecondsAtAgeActual, meanLodHoursAtAge,
  // Step 2
  meanHAtAge,
  // Driver 2
  meanAuAtAge, meanSiderealYearSecondsAtAge, meanTropicalYearSecondsAtAge,
  meanTropicalYearDaysAtAge, meanYearInDaysAtAge,
  // ΔT
  meanDeltaTSecondsAtAge, frameworkDeltaT,
  bondCycleDeltaTCorrection, hallstattCycleDeltaTCorrection, jose5CycleDeltaTCorrection, jose4CycleDeltaTCorrection,
  // Implied LOD corrections from the 4-flag ΔT stack (physical-consistency helper)
  bondCycleLodCorrection, hallstattCycleLodCorrection, jose5CycleLodCorrection, jose4CycleLodCorrection,
  meanLodSecondsWithCorrectionsAtAge,
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
