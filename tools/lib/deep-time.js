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

const EARTH_DIAMETER_KM = C.EARTH_DIAMETER_KM;                       // single source: astro-reference bodyDiametersKm.earth (IERS WGS84)
const R_EARTH_M = (EARTH_DIAMETER_KM / 2) * 1000;
// α at J2000 (IERS Conventions 2010) — single source: astro-reference.json physicalConstants
const EARTH_MOI_FACTOR = C.EARTH_MOI_FACTOR;

// ─── Climate-driven α(t) — Option 4-climate refinement (2026-07) ─────────
// Replaces the earlier |t|-symmetric Peltier 3-mode viscoelastic form (which
// had a slope discontinuity at J2000) with a direct coupling to the L1
// orbital layer of the canonical Climate Formula (LR04 post-MPT regime).
// Kept in lock-step with src/script.js earthMoiFactorAtAge and with the
// Holistic mirror src/lib/orbital/deepTime.ts. Loads coefficients from the
// shared JSON source to eliminate manual dual-copy sync.
const ALPHA_CLIMATE_REGIME_KEY = 'lr04-post-mpt';
// per ‰; calibrated so dα/dt at J2000 = -1.35e-11/yr (Cox & Chao 2002 dJ₂/dt
// = -2.7e-11/yr ÷ conversion factor 2.0, Peltier ICE-6G LOD-coupling range).
// Single source: model-parameters.json deepTime.alphaClimateScalePerMille.
const ALPHA_CLIMATE_SCALE      = C.ALPHA_CLIMATE_SCALE;
const _CLIMATE_JSON_PATH       = path.join(__dirname, '..', '..', 'public', 'input', 'climate-formula-coefficients.json');
const CLIMATE_FORMULA_COEFFS   = JSON.parse(fs.readFileSync(_CLIMATE_JSON_PATH, 'utf8'));

// ΔT correction stack — read from JSON, the same way constants.js and the
// climate coefficients above already are. These used to be literals kept in step
// by export-dt-corrections.js patching this file; a sync ritual is not needed
// for a file that can simply read its own source of truth.
//
// FOUR channels. Jose5 and Jose4 are a coupled pair, so the superseded
// 3-flag artefact could not describe this stack — it is deleted.
const _DT_FIT_PATH = path.join(__dirname, '..', '..', 'data', 'deltaT-4flag-fit.json');
const _DT = JSON.parse(fs.readFileSync(_DT_FIT_PATH, 'utf8')).shipped_coefficients;

// The fourth driver (core-mantle swing) is fitted separately and lives in its
// own file — a 2-kick damped oscillation, not a sinusoid.
const _RES_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'core-mantle-resonator-stage1.json');
const _RES = JSON.parse(fs.readFileSync(_RES_JSON_PATH, 'utf8')).proposed_shipped_coefficients.resonator;

// Solar physics — Driver 2 mass loss (single source: astro-reference.json physicalConstants)
const L_SUN_W              = C.SOLAR_LUMINOSITY_W;                    // IAU 2015 nominal solar luminosity (W)
const SOLAR_WIND_KG_PER_S  = C.SOLAR_WIND_KG_PER_S;                   // Ulysses/ACE/Wind measurements
const C_SI_M_PER_S         = C.speedOfLight ? C.speedOfLight * 1000 : 299792458;  // m/s
const DM_DT_TOTAL_KG_S     = L_SUN_W / (C_SI_M_PER_S * C_SI_M_PER_S) + SOLAR_WIND_KG_PER_S;

// Farhat 2022 LSQ polynomial coefficients — Moon distance evolution
// a_Moon(t)/a_now = 1 + α₁·t + α₃·t³ + α₄·t⁴  (no α₂; preserves modern Wells rate)
// Single source: model-parameters.json deepTime.alpha1PerMa/alpha3PerMa3/alpha4PerMa4.
// α₁ is LLR-anchored (da/dt(J2000) = 3.82 cm/yr, Dickey 1994 / Chapront 2002);
// α₃/α₄ are the LSQ fit to the Farhat 2022 deep-time anchors. Provenance and
// validation history documented in the JSON _description and src/script.js.
const ALPHA_1 = C.ALPHA_1;           // /Ma
const ALPHA_3 = C.ALPHA_3;           // /Ma³
const ALPHA_4 = C.ALPHA_4;           // /Ma⁴

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

// J2000 Moon precession anchors (Option C+ — of-date observational anchors in
// the legacy-'ICRF'-named inputs; the *Earth/E values are star-referenced = ∓ H/13)
const TOTAL_DAYS_IN_H_J2000 = C.H * C.meanSolarYearDays;
const N_apsidalI_J2000 = Math.round(8 * TOTAL_DAYS_IN_H_J2000 / C.moonApsidalPrecessionDaysInputICRF) / 8;   // integer per 8H (mirrors src/script.js)
const N_nodalI_J2000   = Math.round(8 * TOTAL_DAYS_IN_H_J2000 / C.moonNodalPrecessionDaysInputICRF) / 8;     // integer per 8H
const N_apsidalE_J2000 = N_apsidalI_J2000 - 13;
const N_nodalE_J2000   = N_nodalI_J2000 + 13;

const _moonApsidalEarthDays = TOTAL_DAYS_IN_H_J2000 / N_apsidalE_J2000;
const _moonNodalEarthDays   = TOTAL_DAYS_IN_H_J2000 / N_nodalE_J2000;
const MOON_APSIDAL_J2000_S = _moonApsidalEarthDays * LOD_NOW_H13_S;  // ≈ 8.85 yr
const MOON_NODAL_J2000_S   = _moonNodalEarthDays   * LOD_NOW_H13_S;  // ≈ 18.60 yr
const MOON_SIDEREAL_MONTH_J2000_S = C.moonSiderealMonth * LOD_NOW_H13_S;   // 8H-quantized month (chain-anchor consistency, mirrors src/script.js)

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
// FACTOR exactly. Modern anchor: dα/dt at J2000 = -1.35e-11/yr from Cox & Chao
// 2002 dJ₂/dt = -2.7e-11/yr via J₂→α conversion factor 2.0 (Peltier ICE-6G range).
// Kept in lock-step with src/script.js earthMoiFactorAtAge and Holistic
// mirror src/lib/orbital/deepTime.ts. See doc 99 §prediction-7.
let _alphaClimateL1_J2000 = null;

function _evalClimateL1Orbital(year) {
  // 8.4-4: the L1 harmonic loop lives in @essrt/physics/climate/l1-orbital;
  // the regime selection stays here.
  const r = CLIMATE_FORMULA_COEFFS.regimes[ALPHA_CLIMATE_REGIME_KEY];
  return require('@essrt/physics/climate/l1-orbital').evalClimateL1OrbitalPermil(year, {
    l1Terms: r.L1,
    yStdDenormalization: r.denormalization.y_std,
    eightHKyr: CLIMATE_FORMULA_COEFFS.config.eight_H_kyr,
  });
}

// R2 — the α lattice reference. When BUILDING an H-lattice table α must be
// held at its J2000 reference (EARTH_MOI_FACTOR), or the lattice defines
// itself in terms of its own output: α(t) is exactly 8H-periodic and its MEAN
// over the build window sits ~+1.24e-6 above the IERS anchor, worth 141.6 d of
// cycle-count at cycle 0. The browser pins this (declared since R2 landed;
// accidentally via a TDZ before); Node integrated live α(t) and silently
// disagreed. Save/restore under try/finally so a throw mid-build cannot leave
// every α consumer pinned.
let _latticeAlphaRef = false;
function _withLatticeAlpha(build) {
  const prev = _latticeAlphaRef;
  _latticeAlphaRef = true;
  try { build(); } finally { _latticeAlphaRef = prev; }
}

function earthMoiFactorAtAge(t_Ma) {
  if (_latticeAlphaRef) return EARTH_MOI_FACTOR;
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
// Phase 8.2-3: the month/precession chain lives ONCE in
// @essrt/physics/moon/month-chain; this engine delegates, injecting its own
// layer-0/1 evaluators, J2000 anchors, and the shared ecc channel's
// modulation. Lazy so every module const exists at first use.
const { createMoonMonthChain } = require('@essrt/physics/moon/month-chain');
let _moonChainM = null;
function _moonChain() {
  if (_moonChainM === null) {
    _moonChainM = createMoonMonthChain({
      constants: {
        aMoonNowMetres: A_MOON_NOW_M,
        alpha1PerMa: ALPHA_1, alpha3PerMa3: ALPHA_3, alpha4PerMa4: ALPHA_4,
        gmEarthMoonM3PerS2: GM_EM_M3S2,
        massRatioEarthMoon: C.MASS_RATIO_EARTH_MOON,
        moonSiderealMonthInputDays: C.moonSiderealMonthInput,
        holisticYearJ2000: HOLISTIC_YEAR_J2000,
        meanSiderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
        nApsidalOfDateJ2000: N_apsidalI_J2000,
        nNodalOfDateJ2000: N_nodalI_J2000,
        moonApsidalJ2000Seconds: MOON_APSIDAL_J2000_S,
        moonNodalJ2000Seconds: MOON_NODAL_J2000_S,
        moonSiderealMonthJ2000Seconds: MOON_SIDEREAL_MONTH_J2000_S,
        sPerigee: _ECOMP_S_W, sNode: _ECOMP_S_N,
      },
      fns: {
        meanLodSecondsAtAge,
        meanSiderealYearSecondsAtAge,
        meanHAtAge,
        modulation: _eCompModulation,
        distanceMetresAtAge: _recessionHistory().distanceMetresAtAge,
      },
    });
  }
  return _moonChainM;
}

function meanMoonDistanceMetresAtAge(t_Ma) { return _moonChain().distanceMetresAtAge(t_Ma); }

function meanMoonDistanceAtAge(t_Ma) { return _moonChain().distanceKmAtAge(t_Ma); }

// ─── LAYER 1 — Angular-momentum-conservation LOD ──────────────────────────
// Driver 1½ (2026-08): the regime-aware recession history + the solar
// angular-momentum channels live ONCE in @essrt/physics/deltat/
// recession-history. The quartic stays bit-identical ≤ jointMa; the
// channels are explicit only beyond it. Lazy for module-const ordering.
const { createMoonRecessionHistory, createSolarChannelBudget } = require('@essrt/physics/deltat/recession-history');
let _recessionM = null;
function _recessionHistory() {
  if (!_recessionM) {
    const R = C.RECESSION_REGIME;
    _recessionM = createMoonRecessionHistory({
      aMoonNowMetres: A_MOON_NOW_M,
      alpha1PerMa: ALPHA_1, alpha3PerMa3: ALPHA_3, alpha4PerMa4: ALPHA_4,
      regime: {
        jointMa: R.jointMa, knotAgesMa: R.knotAgesMa,
        knotDistancesKm: R.knotDistancesKm, genesisMa: R.genesisMa,
        rocheLimitKm: R.rocheLimitKm,
      },
    });
  }
  return _recessionM;
}
let _solarBudgetM = null;
function _solarBudget() {
  if (!_solarBudgetM) {
    const R = C.RECESSION_REGIME;
    _solarBudgetM = createSolarChannelBudget({
      lTotalJ2000KgM2S: L_TOTAL_EM_KGM2_S,
      mMoonAloneKg: M_MOON_ALONE, gmEmM3PerS2: GM_EM_M3S2,
      eFactorMoon: E_FACTOR_MOON,
      beta0: R.solarOceanLeakBeta0,
      pumpStartMa: R.thermalPumpStartMa, pumpEndMa: R.thermalPumpEndMa,
      pumpFactor: R.thermalPumpFactor,
      jointMa: R.jointMa, genesisMa: R.genesisMa,
      distanceMetresAtAge: _recessionHistory().distanceMetresAtAge,
    });
  }
  return _solarBudgetM;
}

// 8.4-3: the deep-time LOD/ΔT core lives ONCE in @essrt/physics/deltat/
// deep-time. This engine injects its moon chain, its GIA α(t) (the
// lattice-α pin machinery stays engine-side in earthMoiFactorAtAge), the
// IAU Fourier evaluator, and its env-gated cycle sums. The ΔT cache and
// the sequential post-integration adds stay below.
const { createDeepTimeLod } = require('@essrt/physics/deltat/deep-time');
let _deepLodM = null;
function _deepLod() {
  if (!_deepLodM) {
    _deepLodM = createDeepTimeLod({
      constants: {
        lTotalEmKgm2S: L_TOTAL_EM_KGM2_S, mMoonAloneKg: M_MOON_ALONE,
        mEarthAloneKg: M_EARTH_ALONE, rEarthMetres: R_EARTH_M,
        gmEmM3PerS2: GM_EM_M3S2, eFactorMoon: E_FACTOR_MOON, aLockMetres: A_LOCK_M,
        aMoonNowMetres: A_MOON_NOW_M, alpha1PerMa: ALPHA_1,
        alpha3PerMa3: ALPHA_3, alpha4PerMa4: ALPHA_4,
        holisticYearJ2000: HOLISTIC_YEAR_J2000, lodNowH13Seconds: LOD_NOW_H13_S,
        meanSiderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
        solarMassLossFracPerYear: SOLAR_MASS_LOSS_FRAC_PER_YR,
        siderealYearDaysKinematicJ2000: C.meanSiderealYearDaysKinematic,
      },
      moonDistanceMetresAtAge: meanMoonDistanceMetresAtAge,
      moiFactorAtAge: earthMoiFactorAtAge,
      siderealYearDaysFourierAt: _evalSiderealYearFourierIAU,
      cycleLodSumAt: dtCycleLodCorrectionSum,
      swingLodAt: resonatorSwingLodCorrection,
      swingLodRateAt: resonatorSwingLodRate,
      lEmAtAgeKgm2S: _solarBudget().lEmAtAgeKgm2S,
    });
  }
  return _deepLodM;
}

function meanLodSecondsAtAge(t_Ma) { return _deepLod().lodSecondsAtAge(t_Ma); }

function meanLodHoursAtAge(t_Ma) { return _deepLod().lodHoursAtAge(t_Ma); }

// ─── Fourier evaluator for the sidereal-year length (IAU base) ────────────
// Mirrors src/script.js `evalYearFourier` in DEEP_TIME_MODE_ENABLED=false form.
// Uses the IAU baseline (C.meanSiderealYearDays = 365.256363004) so the derived
// "Actual" LOD matches the simulator tweakpane readout exactly at J2000.
function _evalSiderealYearFourierIAU(year) {
  // Phase D: INTEGRATED phase (2π·div·cycles), the same expression the browser
  // tweakpane evaluator this function claims to mirror now uses — the old
  // snapshot form 2π·t·div/H evaluated the cycle-fitted 6d coefficients on a
  // different axis than they were fitted on (the matched-pair error, caught by
  // the tools-lib fixture as a 13 µs drift in lod.realAtAge0).
  let result = C.meanSiderealYearDays;
  const cyc = cyclesBetweenYears(C.balancedYear, year, 1);
  if (cyc === null) return result;
  for (const [div, sinC, cosC] of C.SIDEREAL_YEAR_HARMONICS) {
    const phase = 2 * Math.PI * cyc * div;
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
function meanLodSecondsAtAgeActual(t_Ma) { return _deepLod().lodSecondsActualAtAge(t_Ma); }

// ─── STEP 2 — H(t) ────────────────────────────────────────────────────────
function meanHAtAge(t_Ma) { return _deepLod().hAtAge(t_Ma); }

// ─── Driver 2 — AU and year_s ─────────────────────────────────────────────
function meanAuAtAge(t_Ma) {
  // Phase 8.3 L6: the linear mass-loss law lives in @essrt/physics.
  return require('@essrt/physics/planets/orbit-chain')
    .massLossScaledLinearAtAge(t_Ma, C.currentAUDistance, SOLAR_MASS_LOSS_FRAC_PER_YR);
}

function meanSiderealYearSecondsAtAge(t_Ma) { return _deepLod().siderealYearSecondsAtAge(t_Ma); }

function meanTropicalYearSecondsAtAge(t_Ma) { return _deepLod().tropicalYearSecondsAtAge(t_Ma); }

function meanTropicalYearDaysAtAge(t_Ma) { return _deepLod().tropicalYearDaysAtAge(t_Ma); }

function meanYearInDaysAtAge(t_Ma) { return _deepLod().yearInDaysAtAge(t_Ma); }

// ═════════════════════════════════════════════════════════════════════════════
// Sub-Milankovitch 8H-lattice ΔT corrections (4-flag stack, mirrors src/script.js).
// "3-flag" throughout this file was stale: Bond, Hallstatt, Jose5 AND Jose4 are
// all implemented here, plus the core-mantle resonator — five functions, not three.
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

const BOND_LATTICE_N = _DT.bond.lattice_n;
const BOND_PERIOD_YR = EIGHT_H / BOND_LATTICE_N;
const BOND_OMEGA = 2 * Math.PI / BOND_PERIOD_YR;
const BOND_COS_COEFF_S = _DT.bond.cos_coeff_s;
const BOND_SIN_COEFF_S = _DT.bond.sin_coeff_s;

const HALLSTATT_LATTICE_N = _DT.hallstatt.lattice_n;
const HALLSTATT_PERIOD_YR = EIGHT_H / HALLSTATT_LATTICE_N;
const HALLSTATT_OMEGA = 2 * Math.PI / HALLSTATT_PERIOD_YR;
const HALLSTATT_COS_COEFF_S = _DT.hallstatt.cos_coeff_s;
const HALLSTATT_SIN_COEFF_S = _DT.hallstatt.sin_coeff_s;

const JOSE5_LATTICE_N = _DT.jose5.lattice_n;
const JOSE5_PERIOD_YR = EIGHT_H / JOSE5_LATTICE_N;
const JOSE5_OMEGA = 2 * Math.PI / JOSE5_PERIOD_YR;
const JOSE5_COS_COEFF_S = _DT.jose5.cos_coeff_s;
const JOSE5_SIN_COEFF_S = _DT.jose5.sin_coeff_s;

const JOSE4_LATTICE_N = _DT.jose4.lattice_n;
const JOSE4_PERIOD_YR = EIGHT_H / JOSE4_LATTICE_N;
const JOSE4_OMEGA = 2 * Math.PI / JOSE4_PERIOD_YR;
const JOSE4_COS_COEFF_S = _DT.jose4.cos_coeff_s;
const JOSE4_SIN_COEFF_S = _DT.jose4.sin_coeff_s;

// Cyclic-correction taper: full to ±300 kyr, fading to zero at ±400 kyr.
//
// The width is a SAFETY CHOICE, not a value derived from data. It is also not
// observationally consequential: the stack's ΔT contribution is a sum of
// bounded sinusoids (≤ ~±420 s at any age) while ΔT itself grows quadratically,
// so beyond ~10 kyr the stack is under 0.1% of ΔT and by −300 kyr under 1e-6 of
// it. Narrowing the taper would change nothing measurable.
//
// Archive support for cycle coherence beyond the 2.7-kyr Stephenson fit window
// is real but marginal (measured by scripts/lattice_harmonic_scan.py, against
// a 95th-percentile permutation threshold):
//   • EPICA CO2 (803 kyr) — all four flags clear the threshold, but every
//     R²ₕ is ~0.01, i.e. coherence at the noise margin.
//   • Steinhilber ¹⁰Be (9.4 kyr) — Hallstatt and Jose4 only. Jose4 was
//     *identified by* a Steinhilber+EPICA scan, so that hit is post-selection
//     and cannot count as independent confirmation.
//   • Cheng speleothem (640 kyr) — nothing, for any flag. LR04 unresolvable.
//   • Bond has the WEAKEST deep-time archive support of the four (it fails
//     Steinhilber outright); its evidence is in the ΔT record, not the archives.
// No flag is individually significant in the Stephenson ΔT record either — the
// four work collectively (see docs/hidden/IP-dt-stack-flag-audit.md Stage 3).
//
// Fade to zero at ±400 kyr preserves the "not extrapolating to Myr-scale H(t)
// drift" honest claim; H differs from H_J2000 by <1.5% at this range, so the
// fixed-period assumption is valid. Constant name kept for historical continuity though the
// window is no longer literally "Holocene".
// Single source: model-parameters.json deepTime.dtStackTaper*HalfwidthYr
// (mirrors src/script.js BOND_TAPER_* — same values, per-file legacy names).
const HOLOCENE_TAPER_FULL_HALFWIDTH_YR = C.DT_STACK_TAPER_FULL_HALFWIDTH_YR;
const HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR = C.DT_STACK_TAPER_TOTAL_HALFWIDTH_YR;

// 8.4-2: the taper, the four anchored cycle corrections, their δLOD twins,
// and the Core-mantle swing episode live ONCE in @essrt/physics/deltat/cycles.
// This engine injects its constant set (the fit-output data JSONs — the
// browser injects FIT.DT_STACK/FIT.DT_RESONATOR) and keeps its env-var
// gates. The factory is lazy: the RES_* scalars below it are read at first
// call, after module evaluation.
const { createDeltaTCycles } = require('@essrt/physics/deltat/cycles');
let _dtCyclesM = null;
function _dtCycles() {
  if (!_dtCyclesM) {
    _dtCyclesM = createDeltaTCycles({
      eightHYears: EIGHT_H,
      taperFullHalfwidthYears: HOLOCENE_TAPER_FULL_HALFWIDTH_YR,
      taperTotalHalfwidthYears: HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR,
      tropicalYearSecondsJ2000: MEAN_TROPICAL_YEAR_J2000_S,
      cycles: {
        bond:      { latticeN: BOND_LATTICE_N,      cosCoeffSeconds: BOND_COS_COEFF_S,      sinCoeffSeconds: BOND_SIN_COEFF_S },
        hallstatt: { latticeN: HALLSTATT_LATTICE_N, cosCoeffSeconds: HALLSTATT_COS_COEFF_S, sinCoeffSeconds: HALLSTATT_SIN_COEFF_S },
        jose5:     { latticeN: JOSE5_LATTICE_N,     cosCoeffSeconds: JOSE5_COS_COEFF_S,     sinCoeffSeconds: JOSE5_SIN_COEFF_S },
        jose4:     { latticeN: JOSE4_LATTICE_N,     cosCoeffSeconds: JOSE4_COS_COEFF_S,     sinCoeffSeconds: JOSE4_SIN_COEFF_S },
      },
      resonator: {
        t0LatticeN: RES_T0_LATTICE_N, q: RES_Q,
        kicks: [
          { tYear: RES_KICK1_T_YR, cosSeconds: RES_KICK1_COS_S, sinSeconds: RES_KICK1_SIN_S },
          { tYear: RES_KICK2_T_YR, cosSeconds: RES_KICK2_COS_S, sinSeconds: RES_KICK2_SIN_S },
        ],
        tones: [{ dn: RES_TONE1_DN, phiLockedRad: RES_TONE1_PHI_RAD, ampSeconds: RES_TONE1_AMP_S }],
      },
    });
  }
  return _dtCyclesM;
}

function holoceneTaper(year) { return _dtCycles().taperAt(year); }

function bondCycleDeltaTCorrection(year) { return _dtCycles().cycleDeltaTSecondsAt('bond', year); }
function hallstattCycleDeltaTCorrection(year) { return _dtCycles().cycleDeltaTSecondsAt('hallstatt', year); }
function jose5CycleDeltaTCorrection(year) { return _dtCycles().cycleDeltaTSecondsAt('jose5', year); }
function jose4CycleDeltaTCorrection(year) { return _dtCycles().cycleDeltaTSecondsAt('jose4', year); }

// ─── Implied LOD corrections from the 4-flag stack (Phase-8 physical consistency) ───
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

// 8.4-2: taper derivative and the per-cycle δLOD product rule live in the
// shared module (see the factory above).
function holoceneTaperDerivative(year) { return _dtCycles().taperDerivativeAt(year); }

function bondCycleLodCorrection(year) { return _dtCycles().cycleLodSecondsAt('bond', year); }
function hallstattCycleLodCorrection(year) { return _dtCycles().cycleLodSecondsAt('hallstatt', year); }
function jose5CycleLodCorrection(year) { return _dtCycles().cycleLodSecondsAt('jose5', year); }
function jose4CycleLodCorrection(year) { return _dtCycles().cycleLodSecondsAt('jose4', year); }

// ─── Core-mantle swing (Resonator driver) — DEFAULT ON (joint world) ────────
// Fifth ΔT component in a NEW functional class: a 2-kick EPISODE — windowed
// damped oscillation of the core's eigenmode (T₀ = 8H/685 ≈ 3,916 yr, Q = 1.80, in the
// published axiMC range) plus one drive tone at the bond−hallstatt difference
// frequency (8H/726) with phase LOCKED to the quadratic-mixing prediction
// φ_bond − φ_hallstatt. Exactly zero before the excitation kick (−800);
// actively terminated by the counter-kick (+1600, the push-pull recovered by
// the excitation inversion); decayed thereafter. Anchored to 0 at J2000 via
// raw_at_j2000 subtraction and wrapped in the same ±300/400-kyr taper as the
// flags (fades the small pre-episode constant at deep time).
//
// Constants synced from data/core-mantle-resonator-stage1.json (variant V5,
// physical-consistency selection rule) — that artifact IS the provenance and
// ships in this repo. The stage-1 derivation script does not: it ran against
// the pre-joint world and cannot reproduce these numbers (see docs/104 §6/§8
// for the narrative and the tracked result JSONs for the evidence).
//
// DEFAULT ON since the JOINT-world flip (2026-07-23): the resonator ships as
// the 4th driver, fitted JOINTLY with the flags (--joint mode in
// dt-corrections-fit.js; anchors USNO 86400.0014 / deltaTStart 56.05 moved
// with the coefficients — its δLOD(2000) is inside the USNO closure by
// construction). Opt-OUT via DT_RESONATOR_DISABLED=1 (mirrors the stack's
// DT_CORRECTIONS_DISABLED). The ΔT integrator additionally gates this
// component on DT_CORRECTIONS_ENABLED, so DT_CORRECTIONS_DISABLED=1 alone
// still yields the fully-raw pure-tidal residual for fitting.
const DT_RESONATOR_ENABLED = process.env.DT_RESONATOR_DISABLED !== '1';

// Scalar constants — read from data/core-mantle-resonator-stage1.json (_RES
// above), which reaches the website through the published packages
// (DT_RESONATOR in @essrt/physics; rendered values in @essrt/model-values).
// The eigenperiod is LATTICE-LABELED (T₀ = 8H/685 ≈ 3,916 yr): the shipped
// resonator is the combined effect of the lattice cycles, so under H(t)
// evolution the episode scales WITH its drivers (clock coherence). Physical
// caveat, recorded once: the bare axiMC eigenmode is core-material physics;
// the lattice label is the framework's clock-coherence convention for the
// shipped component (numeric difference ~1e-6 over the episode's life).
const RES_T0_LATTICE_N = _RES.T0_lattice_n;
const RES_Q           = _RES.Q;
const RES_KICK1_T_YR  = _RES.kick_epochs_year[0];
const RES_KICK1_COS_S = _RES.kick_coefficients_s[0].cos;
const RES_KICK1_SIN_S = _RES.kick_coefficients_s[0].sin;
const RES_KICK2_T_YR  = _RES.kick_epochs_year[1];
const RES_KICK2_COS_S = _RES.kick_coefficients_s[1].cos;
const RES_KICK2_SIN_S = _RES.kick_coefficients_s[1].sin;
const RES_TONE1_DN    = _RES.drive_tones[0].dn;
const RES_TONE1_PHI_RAD = _RES.drive_tones[0].phi_locked_rad;
const RES_TONE1_AMP_S = _RES.drive_tones[0].amp_s;

// 8.4-2: the resonator episode (raw/prime/second, tone compensation, J2000
// anchor) lives in @essrt/physics/deltat/cycles — see the factory above. Only
// the env-var gates remain here.

function resonatorSwingDeltaTCorrection(year) {
  if (!DT_RESONATOR_ENABLED) return 0;
  return _dtCycles().swingDeltaTSecondsAt(year);
}

function resonatorSwingLodCorrection(year) {
  if (!DT_RESONATOR_ENABLED) return 0;
  return _dtCycles().swingLodSecondsAt(year);
}

/** Analytic RATE of the resonator's δLOD contribution, d(δLOD)/dy in
 *  (s/day) per year — exact in the flat-taper region, central difference
 *  in the transition (shared module). */
function resonatorSwingLodRate(year) {
  if (!DT_RESONATOR_ENABLED) return 0;
  return _dtCycles().swingLodRateAt(year);
}

/**
 * LOD in seconds at t_Ma, WITH 4-flag correction stack applied (physical
 * consistency: this LOD's integral matches the corrected ΔT curve).
 * Use for display in dashboards / tweakpane. The pure-tidal
 * `meanLodSecondsAtAge` remains the physics-baseline function used by the
 * ΔT integrator and by year-length / precession derivations.
 */
function meanLodSecondsWithCorrectionsAtAge(t_Ma) {
  if (!DT_CORRECTIONS_ENABLED) return meanLodSecondsAtAge(t_Ma);
  return _deepLod().lodSecondsWithCorrectionsAtAge(t_Ma);
}

/** Sum of the cyclic δLOD contributions at calendar year (s): the 4-flag
 *  stack plus, when DT_RESONATOR_ENABLED=1, the Core-mantle swing episode.
 *  Mirrors src/script.js dtCycleLodCorrectionSum (Layer-3 composite). */
function dtCycleLodCorrectionSum(year) {
  return bondCycleLodCorrection(year)
       + hallstattCycleLodCorrection(year)
       + jose5CycleLodCorrection(year)
       + jose4CycleLodCorrection(year)
       + resonatorSwingLodCorrection(year);   // 0 unless DT_RESONATOR_ENABLED=1
}

// ─── Layer-4 solar-day composite — the browser tweakpane twin (§12h) ────────
// Strangler extraction of src/script.js:56288
//   `predictions.lodReal = o.lodKinematic + _h5 + _cycleSum`
// lifted VERBATIM (same ingredient functions, same addition order), so the
// headline solar-day number the docs quote is derivable outside the browser.
// Reproduces the tweakpane's J2000 reading (86400.001379 displayed) bit-for-
// bit — proven ingredient-by-ingredient against the live headless page via
// the __test__ surface (Object.is on every exposed ingredient).
//
// INTEGRATED AXIS, decided (the §12h axis decision): DEEP_TIME_MODE_ENABLED
// is `true` at script.js:88 — deep time IS the shipped default (the
// "production default false" comments at script.js:5418/8750 are stale), so
// the browser evaluates this composite with the epoch-aware Layer-0 base and
// INTEGRATED phase (R3 anchor rule), and the current 6d coefficients are
// cycle-fitted on that same axis (the matched pair — see
// _evalSiderealYearFourierIAU's Phase D note above). The snapshot form
// (kinematic const base + 2π·div·(year−balancedYear)/H) agrees at J2000 only
// to ~1 ULP — measured, NOT bit-identical — and diverges away from it, so it
// is deliberately NOT what this implements.
//
// THREE sidereal-year Fourier evaluators now exist in the engine; they are
// NOT interchangeable:
//   • _evalSiderealYearFourierIAU (above) — IAU base 365.256363004,
//     INTEGRATED phase; feeds lodSecondsActualAtAge and the fixtures'
//     `lod.realAtAge*` keys (the "Actual LOD" family — NOT this composite,
//     despite the fixture key's name).
//   • orbital-engine's evalYearFourier — difference form (subtracts the
//     year-2000 ripple; its `mean` is the value AT 2000).
//   • computeSiderealYearDaysDirect below — the browser's function of the
//     same name, verbatim: epoch-aware KINEMATIC base (Layer-0
//     tropDays·H_t/(H_t−13), the _epochYearDaysBase 'sidereal' recipe) +
//     integrated phase.

// Layer-0 instance for the epoch-aware base — same parameter bundle and α
// channel the browser's _L0 is built from (the layer0 identity gate pins the
// two constructions equal).
const { createEpochPrimitives } = require('@essrt/physics');
let _l0M = null;
function _l0() {
  if (!_l0M) _l0M = createEpochPrimitives({ params: EPOCH_PARAMS, alphaAtAgeMa: earthMoiFactorAtAge });
  return _l0M;
}

/** Browser twin of script.js _epochYearDaysBase (deep-time branch): the
 *  epoch-aware Fourier baseline for a year kind, or null past the tidal-lock
 *  asymptote (caller falls back to the J2000 constant). */
function _epochYearDaysBaseKind(kind, year) {
  const H_t = _l0().holisticH(year);
  const LOD_s = _l0().lodSeconds(year);
  const T_trop_s = _l0().tropicalYearSeconds(year);
  if (H_t === null || LOD_s === null || T_trop_s === null) return null;
  const tropDays = T_trop_s / LOD_s;
  if (kind === 'tropical')    return tropDays;
  if (kind === 'sidereal')    return tropDays * H_t / (H_t - 13);            // recomputeEpochAnchors' _kinematic recipe
  if (kind === 'anomalistic') return tropDays * (H_t / 16) / (H_t / 16 - 1); // browser/Node anomalisticYearDaysBase
  return null;
}

/** Browser twin of script.js evalYearFourier (deep-time branch, no `kind`):
 *  base + Σ harmonics on integrated phase. cycles(div) is computed as
 *  div × cycles(1) — bit-identical to the per-divisor call (the shared phase
 *  module returns divisorN × (integral − correction), and 1 × x === x), and
 *  hoists the ∫1/H work out of the harmonic loop for the scan keys. */
function _evalYearFourierBrowser(year, base, harmonics) {
  let result = base;
  const c1 = cyclesBetweenYears(C.balancedYear, year, 1);
  if (c1 === null) return result;   // mirrors the browser's per-term `continue`
  for (const [div, sinC, cosC] of harmonics) {
    const phase = div * c1 * 2 * Math.PI;
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

/** Browser twin of script.js computeSiderealYearDaysDirect (deep-time branch,
 *  the shipped default): sidereal year length in days at `year` — epoch-aware
 *  kinematic base plus the Step 6d SIDEREAL_YEAR_HARMONICS ripple on
 *  integrated phase. Past the tidal-lock asymptote the base falls back to the
 *  J2000 kinematic constant and the ripple is skipped. */
function computeSiderealYearDaysDirect(year) {
  const base = _epochYearDaysBaseKind('sidereal', year) ?? C.meanSiderealYearDaysKinematic;
  return _evalYearFourierBrowser(year, base, C.SIDEREAL_YEAR_HARMONICS);
}

/** Browser twin of script.js computeSolarYearDaysDirect: tropical year length
 *  in days — epoch-aware base + TROPICAL_YEAR_HARMONICS, integrated phase. */
function computeSolarYearDaysDirect(year) {
  const base = _epochYearDaysBaseKind('tropical', year) ?? C.meanSolarYearDays;
  return _evalYearFourierBrowser(year, base, C.TROPICAL_YEAR_HARMONICS);
}

/** Browser twin of the script.js anomalistic-days Fourier (:56327):
 *  anomalistic year length in days — epoch-aware base +
 *  ANOMALISTIC_YEAR_HARMONICS, integrated phase. */
function computeAnomalisticYearDaysDirect(year) {
  const base = _epochYearDaysBaseKind('anomalistic', year) ?? C.meanAnomalisticYearDays;
  return _evalYearFourierBrowser(year, base, C.ANOMALISTIC_YEAR_HARMONICS);
}

/** All three year-length Fourier evaluations at one year, with the Layer-0
 *  chain evaluated ONCE — value-identical to the three compute*DaysDirect
 *  calls (the base recipes below are a MATCHED PAIR with
 *  _epochYearDaysBaseKind and the Layer-0 cores: holisticHCore =
 *  holisticYearJ2000·lod/lodNow, siderealYearSecondsCore, tropical =
 *  sid·(1−13/H)). Exists because the α climate series inside every Layer-0
 *  LOD call dominates the cost (~27 µs) and the registry's full-H precession
 *  scans evaluate 3 × 335k years. Returns {sidereal, tropical, anomalistic}
 *  in days. */
function computeYearDaysDirectAll(year) {
  const LOD_s = _l0().lodSeconds(year);      // the one α evaluation
  let sidB, tropB, anomB;
  if (LOD_s === null) {
    sidB = C.meanSiderealYearDaysKinematic;
    tropB = C.meanSolarYearDays;
    anomB = C.meanAnomalisticYearDays;
  } else {
    const t = _l0().tMa(year);
    const H_t = EPOCH_PARAMS.holisticYearJ2000 * LOD_s / EPOCH_PARAMS.lodNowH13Seconds;
    const dm = EPOCH_PARAMS.solarMassLossFracPerYear * t * 1e6;
    const sidSec = EPOCH_PARAMS.siderealYearJ2000Seconds * (1 - dm) * (1 - dm);
    const T_trop_s = sidSec * (1 - 13 / H_t);
    const tropDays = T_trop_s / LOD_s;
    tropB = tropDays;
    sidB = tropDays * H_t / (H_t - 13);
    anomB = tropDays * (H_t / 16) / (H_t / 16 - 1);
  }
  return {
    sidereal:    _evalYearFourierBrowser(year, sidB, C.SIDEREAL_YEAR_HARMONICS),
    tropical:    _evalYearFourierBrowser(year, tropB, C.TROPICAL_YEAR_HARMONICS),
    anomalistic: _evalYearFourierBrowser(year, anomB, C.ANOMALISTIC_YEAR_HARMONICS),
  };
}

/** Browser twin of script.js h5Correction: H/5 ecliptic "missing motion" LOD
 *  correction (~3.527 ms at J2000) on the deep-time mean-LOD chain. */
function h5Correction(year) {
  const t_Ma = (C.startmodelYear - year) / 1e6;  // browser J2000_CALENDAR_YEAR = startmodelYear = 2000.5
  const lodMean = meanLodSecondsAtAge(t_Ma);
  if (lodMean === null) return 0;
  const H_local = meanHAtAge(t_Ma);
  if (H_local === null) return 0;
  const mSY_days = meanTropicalYearDaysAtAge(t_Ma);
  return lodMean / ((H_local / 5) * mSY_days);
}

/** Epoch-specific kinematic LOD — script.js `o.lodKinematic`: pure Layer-0
 *  sidereal-year seconds (Driver-2 aware — ≡ the IAU constant at J2000
 *  exactly, ×(1−Δm)² away from it; falls back to the constant past the
 *  tidal-lock asymptote) / Fourier sidereal days (≈ 86399.99999487 s at
 *  year 2000). The
 *  cardinal-point MEASURED route (IAU seconds / fc.YEAR_LENGTH_J2000_ANCHOR
 *  .sidereal = 86400.00031536 s) is a DIFFERENT quantity — the joint fit's
 *  USNO-closure basis; the 0.32 ms between them is the tweakpane-vs-fit-target
 *  spread, not an error (see the §12h note in tools/docs/model-values.mjs). */
function computeLodKinematicSecondsAtEpoch(year) {
  const sidSec = _l0().siderealYearSeconds(year) ?? C.meanSiderealYearSeconds;
  return sidSec / computeSiderealYearDaysDirect(year);
}

/** Layer-4 solar day in seconds (the shipped observable, tweakpane "Solar
 *  day"): kinematic LOD + H/5 ecliptic missing motion + calibrated ΔT cycle
 *  stack incl. Core-mantle swing. script.js:56288 verbatim;
 *  86400.00137950659 at year 2000. */
function computeLodRealSecondsAtEpoch(year) {
  return computeLodKinematicSecondsAtEpoch(year) + h5Correction(year) + dtCycleLodCorrectionSum(year);
}

/** dLOD/dt driver decomposition at t_Ma, in ms/century per channel.
 *  Mirrors src/script.js dLodDtDecompositionAtAge (tweakpane dLOD/dt
 *  decomposition sub-folder: Tidal baseline / GIA / All cycles /
 *  Tidal + GIA / Tidal + GIA + all cycles). Consumed by the model-values
 *  registry (dLodDt* keys), which reaches the website via
 *  @essrt/model-values. */
// 8.4-3: the driver decomposition lives in the shared module. NOTE its
// tidal/gia association: the module carries the browser's two-step form
// ((s/s → ms/cy) staged) — this mirror's chained one-liners computed the
// same operand order, verified before delegation.
function dLodDtDecompositionAtAge(t_Ma) {
  return _deepLod().dLodDtDecompositionAtAge(t_Ma);
}


// ─── ΔT integrator (mirrors src/script.js meanDeltaTSecondsAtAge) ───────────
// Pure-tidal Simpson integration + post-integration 3-cycle H-lattice
// corrections (Bond + Hallstatt + Jose5 + Jose4) matching the shipped 4-flag stack.
// Positive on both sides of J2000; ΔT(0) = 0 exactly by anchor construction.
// This is FRAMEWORK'S OWN ΔT (LOD-based + lattice), NOT Espenak/Meeus.
const _DELTA_T_CACHE = new Map();
const _MAX_DELTA_T_CACHE = 512;

// DT_CORRECTIONS_DISABLED=1 in env: bypasses the 4-flag stack (pure-tidal only).
// Used by tools/fit/dt-corrections-fit.js to compute the raw framework residual
// before applying corrections. Mirrors SUN_HARMONICS_DISABLED=1 pattern.
const DT_CORRECTIONS_ENABLED = process.env.DT_CORRECTIONS_DISABLED !== '1';

function meanDeltaTSecondsAtAge(t_Ma) {
  // ΔT(J2000) = 0 by convention (integration reference = J2000). Framework's
  // ΔT curve is offset from Stephenson-2016's absolute values by ~62 s (their
  // observed ΔT(J2000)), which is the constant offset expected between two
  // integration conventions. All differential (curvature) behavior matches.
  if (t_Ma === 0) return 0;
  const cacheKey = (DT_CORRECTIONS_ENABLED ? 'BHJW' : 'raw')
                 + (DT_RESONATOR_ENABLED ? '+R:' : ':') + t_Ma;
  const hit = _DELTA_T_CACHE.get(cacheKey);
  if (hit !== undefined) return hit;

  // 8.4-3: the Simpson integrator + H/5 integrand live in the shared module
  // (deltaTRawSecondsAtAge). The flag-keyed cache and the SEQUENTIAL
  // post-integration adds below stay here — pre-summing the corrections
  // would change the FP association.
  let result = _deepLod().deltaTRawSecondsAtAge(t_Ma);

  // Post-integration 4-cycle H-lattice corrections; anchored to 0 at J2000.
  // Skipped when DT_CORRECTIONS_DISABLED=1 (raw pure-tidal for fitting).
  if (DT_CORRECTIONS_ENABLED) {
    const yearY = 2000 - t_Ma * 1e6;
    result += bondCycleDeltaTCorrection(yearY);
    result += hallstattCycleDeltaTCorrection(yearY);
    result += jose5CycleDeltaTCorrection(yearY);
    result += jose4CycleDeltaTCorrection(yearY);
  }
  // Core-mantle swing episode (Resonator driver) — default ON (joint world).
  // Master-gated on DT_CORRECTIONS_ENABLED: fitting mode (DT_CORRECTIONS_
  // DISABLED=1) must see the fully-raw pure-tidal ΔT.
  if (DT_CORRECTIONS_ENABLED && DT_RESONATOR_ENABLED) {
    result += resonatorSwingDeltaTCorrection(2000 - t_Ma * 1e6);
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

// ─── Moon distance correction + Kepler month (8.2-3: shared chain) ────────
function meanSolarDeltaAAtAge(t_Ma, a_apparent_km) { return _moonChain().solarDeltaAKmAtAge(t_Ma, a_apparent_km); }

function meanMoonDistanceCorrectedAtAge(t_Ma) { return _moonChain().distanceCorrectedKmAtAge(t_Ma); }

function meanMoonSiderealMonthAtAge(t_Ma) { return _moonChain().siderealMonthSecondsAtAge(t_Ma); }

function meanSynodicMonthAtAge(t_Ma) { return _moonChain().synodicMonthSecondsAtAge(t_Ma); }

function meanTropicalMonthAtAge(t_Ma) { return _moonChain().tropicalMonthSecondsAtAge(t_Ma); }

// ─── Option C+ deep-time lunar precession (Brouwer-Clemence m² scaling) ──
function meanApsidalCyclesICRFAtAge(t_Ma) { return _moonChain().apsidalCyclesOfDateAtAge(t_Ma); }

function meanNodalCyclesICRFAtAge(t_Ma) { return _moonChain().nodalCyclesOfDateAtAge(t_Ma); }

function meanApsidalPrecessionSecondsICRFAtAge(t_Ma) { return _moonChain().apsidalPrecessionSecondsOfDateAtAge(t_Ma); }

function meanNodalPrecessionSecondsICRFAtAge(t_Ma) { return _moonChain().nodalPrecessionSecondsOfDateAtAge(t_Ma); }

// ─── Framework Earth-eccentricity composite (A/B RESEARCH ONLY) ──
// Mirror of src/script.js _ECOMP/_fwEarthEccComposite — SUPERSEDED as the
// production e_E by the fully-derived H/3 fluctuation line (_FW_ECC below),
// which carries the factored deep-time law rate(t) = [invariant mean] ×
// [g(t)/g₀]^s, g = (1−e²)^(−3/2). Retained for comparison experiments.
const _ECOMP = {
  c0: 0.02814222258,
  T:  [405000, 95804.8571, 99353.1852, 107301.44, 121933.4545, 127739.8095, 134126.8, 86533.4194, 223544.6667, 298059.5556],
  A:  [-0.01713360824, 0.003885798879, 0.003162499557, -0.002439315342, 0.0009946933865, -0.002804779985, 0.0007349600656, 0.002378093225, -0.0007624261717, 0.0005442620468],
  B:  [-0.0009600398502, -0.009349595921, 0.001151405217, -0.004809468603, 0.005451777722, 0.00162872882, -0.001835102032, 0.003606461969, -0.001298883291, -0.003982540754],
};
const _ECOMP_S_W = 2.407, _ECOMP_S_N = 1.018;   // channel sensitivities (single source: src/script.js _FW_MOON; both Meeus-effective — S_N 1.0→1.018 with the v4 frame-attribution batch)
const _ECOMP_G0 = Math.pow(1 - _fwEarthEccComposite(0) ** 2, -1.5);   // g at the composite's OWN J2000 anchor (KKT-constrained e(0) from the La2010 fit; A/B research only — production uses _FW_ECC_G0)
function _fwEarthEccComposite(t_yr) {
  let e = _ECOMP.c0;
  for (let i = 0; i < _ECOMP.T.length; i++) {
    const w = 2 * Math.PI * t_yr / _ECOMP.T[i];
    e += _ECOMP.A[i] * Math.cos(w) + _ECOMP.B[i] * Math.sin(w);
  }
  return e;
}

// ─── Framework H/3 fluctuation line (mirror of src/script.js _fwEarthEcc) ──
// ONE movement, FULLY DERIVED, zero solved values:
//   e(t) = eccentricityBase · (1 + cos θ_i(t) / 2)
// The H/3 wobble cycle that drives Earth's inclination (anchor 21.77°) also
// carries the Moon-channel eccentricity fluctuation: mean = base (Law 5),
// amplitude = base/2, phase = ϖ_ICRF(J2000) − 21.77° = 81.18° past max.
// Observed J2000 e (−0.86%) and ė (+1.7%) are PREDICTIONS, not inputs.
// Supersedes the Laskar-band composite (retained for A/B) and the
// fitted-phase line (solved φ = 78.6° hereby derived).
// Phase 8.2-2: the line lives ONCE in @essrt/physics/moon/ecc-channel (the
// 8.2-1 S1 alignment made the two engines bit-exact first, so this delegation
// is provably behaviour-preserving). This engine injects its own
// cyclesBetweenYears (always integrated here — DT has no snapshot toggle).
const { createMoonEccChannel } = require('@essrt/physics/moon/ecc-channel');
let _moonEccM = null;
function _moonEcc() {
  if (_moonEccM === null) {
    const AR = C.ASTRO_REFERENCE;
    _moonEccM = createMoonEccChannel({
      cyclesBetween: cyclesBetweenYears,
      eccentricityBase: C.eccentricityBase,
      perihelionLongitudeJ2000Deg: AR.earthPerihelionLongitudeJ2000,
      inclinationCycleAnchorDeg: AR.earthInclinationCycleAnchor,
    });
  }
  return _moonEccM;
}
function _fwEarthEcc(t_yr) { return _moonEcc().eccAt(t_yr); }

function _eCompModulation(t_Ma, s) {
  return _moonEcc().modulation(t_Ma, s);
}

/** Lunar perigee precession period in seconds (Brouwer-Clemence scaling ×
 *  e_E-line modulation on the fully-derived H/3 fluctuation — the factored
 *  deep-time law). */
function meanLunarPerigeePrecessionAtAge(t_Ma) { return _moonChain().perigeePrecessionSecondsAtAge(t_Ma); }

/** Lunar nodal precession period in seconds (Brouwer-Clemence scaling ×
 *  e_E-line modulation on the fully-derived H/3 fluctuation — the factored
 *  deep-time law). */
function meanLunarNodePrecessionAtAge(t_Ma) { return _moonChain().nodePrecessionSecondsAtAge(t_Ma); }

function meanAnomalisticMonthAtAge(t_Ma) { return _moonChain().anomalisticMonthSecondsAtAge(t_Ma); }

function meanNodalMonthAtAge(t_Ma) { return _moonChain().nodalMonthSecondsAtAge(t_Ma); }

// 8.2-3: the browser-only beat pair, gained by this engine via the shared
// chain. The scene-graph node aliasing (_mcApsidalMeetsNodal =
// _mcApsidalOfDate) is a SEPARATE, deliberate cancellation for the paired
// scene nodes — these are the real physical beats for direct callers.
function meanApsidalMeetsNodalAtAge(t_Ma) { return _moonChain().apsidalMeetsNodalSecondsAtAge(t_Ma); }

function meanLunarLevelingCycleAtAge(t_Ma) { return _moonChain().lunarLevelingSecondsAtAge(t_Ma); }

// ─── Anomalistic year + stellar/sidereal days ────────────────────────────
function meanAnomalisticYearSecondsAtAge(t_Ma) {
  const H_t      = meanHAtAge(t_Ma);
  const T_sid_s  = meanSiderealYearSecondsAtAge(t_Ma);
  const T_trop_s = T_sid_s * (H_t - 13) / H_t;
  return T_trop_s * H_t / (H_t - 16);
}

// Stellar day = sidereal day + the precession offset, PROJECTED onto the equator.
// NOTE the parametrisation here differs from src/script.js: there the sidereal day
// is the base and the stellar day adds the offset; here the unprojected stellar day
// falls out of T_sid/(T_sid/LOD + 1) while the sidereal day carries the +13/H
// precession term. Same answer before projection — but cos(ε) must be applied to
// the DIFFERENCE, not pattern-matched onto either formula.
//
// H/13 is precession in LONGITUDE (along the ecliptic); the sidereal→stellar offset
// depends on precession in RIGHT ASCENSION (along the equator), m = p·cos(ε).
// MEAN family, so OBLIQUITY_MEAN. Mirrors STELLAR_DAY_RA_PROJECTION in src/script.js.
function meanStellarDayAtAge(t_Ma) {
  const T_sid_s = meanSiderealYearSecondsAtAge(t_Ma);
  const LOD_s   = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  const sid       = meanSiderealDayAtAge(t_Ma);
  const unproj    = T_sid_s / (T_sid_s / LOD_s + 1);
  return sid + (unproj - sid) * C.STELLAR_DAY_RA_PROJECTION;
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
  // Phase 8.3 L6: same linear mass-loss law as meanAuAtAge (S-P11 resolved —
  // the engines shared this driver all along; units are the caller's).
  return require('@essrt/physics/planets/orbit-chain')
    .massLossScaledLinearAtAge(t_Ma, a_J2000, SOLAR_MASS_LOSS_FRAC_PER_YR);
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
const _CUMUL_INTEGRAL_YEAR_MAX =  500e6;   // +500 Myr (symmetric with past; was +1 Myr —
                                           // the asymmetry made cyclesBetweenYears null past
                                           // +1 Myr, dropping the Moon args to the Meeus
                                           // polynomial whose T⁴ tail reverses lunar motion
                                           // at year ~1.99e6; physics functions are already
                                           // exercised to ±1 Gyr by the paper figures)
const _CUMUL_INTEGRAL_STEP     = 10000;    // 10 kyr per cell (matches browser)

// Phase 7.1 — the table arithmetic lives in @essrt/physics/phase (ONE
// implementation for every engine; extracted verbatim from this file). This
// engine keeps only its CONFIG (the grid constants above, injected) and its
// OWN H(t) twin as the integrand — the twins dissolve into Layer 0 at
// Phase 8. R2 is honoured at construction: ensureTable() runs under
// _withLatticeAlpha, so every invH evaluation sees the constant MOI.
const { createPhaseMachinery } = require('@essrt/physics/phase');
let _phaseM = null;
function _phase() {
  if (_phaseM !== null) return _phaseM;
  _phaseM = createPhaseMachinery({
    holisticHAtAgeMa: (t_Ma) => meanHAtAge(t_Ma),
    tableAnchorYear: C.startmodelYear,
    driftRefYear: C.startModelYearWithCorrection,
    hJ2000: HOLISTIC_YEAR_J2000,
    yearMin: _CUMUL_INTEGRAL_YEAR_MIN,
    yearMax: _CUMUL_INTEGRAL_YEAR_MAX,
    stepYears: _CUMUL_INTEGRAL_STEP,
  });
  _withLatticeAlpha(() => _phaseM.ensureTable());   // R2: lattice tables pin α
  return _phaseM;
}
function _ensureCumulIntegralTable() { _phase(); }
// Grid geometry for the days/pos tables below (they share this grid but keep
// their own integrands until Phase 8 moves them).
function _cumulIntegralJ2000IdxGet() { return _phase().grid().j2000Idx; }
function _cumulIntegralLength() { return _phase().grid().length; }

// Phase 7.1 — the four functions below are one-line delegates to
// @essrt/physics/phase; their arithmetic (trapezoid convention, R3 call-shape
// anchor rule, the drift correction, and every comment that used to sit here)
// moved into the package verbatim. The R2 α-pin is honoured at construction
// (see _phase() above).
function _cumulIntegralAtYear(year) { return _phase().cumulAtYear(year); }

/** ∫_{yearA}^{yearB} 1/H(t') dt'. Returns null if either endpoint is outside
 *  the precomputed range (±500 Myr symmetric). */
function integralInverseHFromYears(yearA, yearB) { return _phase().integralBetween(yearA, yearB); }

function _getJ2000Drift(yearA) { return _phase().j2000Drift(yearA); }

/** Total cycles between two years for a cycle of period H/divisor_N.
 *  Integrated form always (toggle at caller). R3 call-shape anchor rule
 *  (see @essrt/physics/phase). Returns null past tidal-lock asymptote. */
function cyclesBetweenYears(yearA, yearB, divisor_N) { return _phase().cyclesBetween(yearA, yearB, divisor_N); }

/**
 * The Layer 0 parameter bundle (PHASE-B).
 *
 * `packages/physics/src/layer0` is pure and takes every constant as an
 * argument. This is where those arguments are derived — ONCE, from
 * `tools/lib/constants.js` — so the browser, the Node engine and the tests all
 * construct Layer 0 from the same numbers instead of each re-deriving them.
 * Re-derivation is exactly how the five implementations drifted apart.
 *
 * `epochYear` is 2000, NOT `startmodelYear` (2000.5). The shipped chain uses
 * `t_Ma = (2000 − year)/1e6` throughout; attempt-1's fitters used 2000.5. The
 * two are half a year apart and nothing flagged it.
 */
const EPOCH_PARAMS = Object.freeze({
  epochYear: 2000,
  alpha1PerMa: ALPHA_1,
  alpha3PerMa3: ALPHA_3,
  alpha4PerMa4: ALPHA_4,
  moonDistanceNowM: A_MOON_NOW_M,
  moonLockDistanceM: A_LOCK_M,
  totalAngularMomentumKgM2S: L_TOTAL_EM_KGM2_S,
  moonMassKg: M_MOON_ALONE,
  gmEarthMoonM3S2: GM_EM_M3S2,
  moonEccentricityFactor: E_FACTOR_MOON,
  earthMassKg: M_EARTH_ALONE,
  earthRadiusM: R_EARTH_M,
  holisticYearJ2000: HOLISTIC_YEAR_J2000,
  lodNowH13Seconds: LOD_NOW_H13_S,
  siderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
  solarMassLossFracPerYear: SOLAR_MASS_LOSS_FRAC_PER_YR,
});

// The α channel is injected into Layer 0 as `earthMoiFactorAtAge` directly —
// it already speaks the t_Ma axis Layer 0's atAgeMa cores use, so no wrapper.
// R2 (pinning α at its J2000 reference during a lattice-table build) is a
// Phase C change; today's behaviour is the live α(t) everywhere.

// ─── Year↔JD under deep time, and the H-balanced event finder ─────────────
//
// PHASE-B-DUPLICATE. These five are ported from `src/script.js`
// (`_jdToSIyear` :6156, `_yearAtCumulIntegral` :5250, `_ensureCumulDaysTable`
// :5357, `yearToJD` :5400, `findBalancedYearAtCycle` :5301). The browser copy
// is the original and stays authoritative until Phase B of
// `IP-deeptime-scene-graph-alignment_new.md` collapses both into
// `packages/physics` layer0. Grep PHASE-B-DUPLICATE to find every copy.
//
// They exist here because Step 6a's `Cycle` column cannot be computed without
// them, and that column is what stops `Model Year` — a chaining-step counter
// that means a tropical year for the cardinals and an anomalistic one for the
// apsides — from being used as a phase axis (R15).

/**
 * SI-tropical-year label for a JD, anchored at startModelYearWithCorrection.
 *
 * NOT a calendar year: the scene's precession rotations integrate on this axis
 * (`cyclesBetweenYears(anchor, _jdToSIyear(jd), N)`), so a fit on it agrees
 * with the runtime by construction. Using the calendar axis instead costs 63×
 * on the 6b obliquity fit and makes the basis invent H/4, H/7, H/10 (R13).
 * Round-trip bias `Y_SI − Y` is −11.0 yr at −302,635 and grows quadratically.
 *
 * @param {number} jd
 * @returns {number} SI-year label
 */
const _jdToSIyear = (jd) =>
  C.startModelYearWithCorrection + (jd - C.startmodelJD) / SI_TROPICAL_YEAR_DAYS;

/**
 * Inverse of `_cumulIntegralAtYear` — the year at a given cumulative ∫1/H dt.
 * @param {number} targetCumul
 * @returns {number|null} null outside the table domain
 */
function _yearAtCumulIntegral(targetCumul) { return _phase().yearAtCumul(targetCumul); }

/** ∫ daysPerYear dt from startmodelYear, on the same grid as the 1/H table. */
let _cumulDaysTable = null;

function _ensureCumulDaysTable() {
  if (_cumulDaysTable !== null) return;
  _withLatticeAlpha(_buildCumulDaysTable);   // R2: lattice tables pin α
}

function _buildCumulDaysTable() {
  _ensureCumulIntegralTable();
  const N = _cumulIntegralLength();
  const j2000Idx = _cumulIntegralJ2000IdxGet();
  _cumulDaysTable = new Float64Array(N);

  const daysPerYear = (year) => meanYearInDaysAtAge((C.startmodelYear - year) / 1e6);

  const gridYearAtJ2000Idx = _CUMUL_INTEGRAL_YEAR_MIN + j2000Idx * _CUMUL_INTEGRAL_STEP;
  const partialYearOffset = C.startmodelYear - gridYearAtJ2000Idx;
  _cumulDaysTable[j2000Idx] = -partialYearOffset * meanYearInDaysAtAge(0);

  let prev = daysPerYear(gridYearAtJ2000Idx);
  for (let i = j2000Idx + 1; i < N; i++) {
    const curr = daysPerYear(_CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP);
    _cumulDaysTable[i] = (prev !== null && curr !== null && !Number.isNaN(_cumulDaysTable[i - 1]))
      ? _cumulDaysTable[i - 1] + 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP
      : NaN;
    prev = curr;
  }

  prev = daysPerYear(gridYearAtJ2000Idx);
  for (let i = j2000Idx - 1; i >= 0; i--) {
    const curr = daysPerYear(_CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP);
    _cumulDaysTable[i] = (prev !== null && curr !== null && !Number.isNaN(_cumulDaysTable[i + 1]))
      ? _cumulDaysTable[i + 1] - 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP
      : NaN;
    prev = curr;
  }
}

/**
 * Calendar year → JD, integrating days-per-year from startmodelYear.
 *
 * Named `yearToJDDeepTime` because `constants.js` already exports a SNAPSHOT
 * `yearToJD` that is linear in `meanSolarYearDays`. The collision would have
 * been silent, and the two disagree by −465 d at −100 kyr.
 *
 * CARRIES A KNOWN 0.6 d ZERO-POINT OFFSET — measured here at −0.600 d, matching
 * the browser exactly. The anchor cell is seeded by linear extrapolation but
 * read back by interpolation across a 10-kyr cell. The sibling 1/H table was
 * normalised to read 0 at the anchor; this one never was (old plan §5d trap 1).
 *
 * DO NOT "fix" it in isolation. `balancedYearAtCycle` is the only consumer and
 * it round-trips through `cyclesBetweenYears`, which absorbs the offset — that
 * is why the bracket lands on −302635.004 / 32682.268 exactly. Normalising the
 * table without re-checking that round-trip moves the Step 6a window.
 *
 * @param {number} year
 * @returns {number|null} null outside the table domain
 */
function yearToJDDeepTime(year) {
  if (!Number.isFinite(year)) return null;
  _ensureCumulDaysTable();
  if (year < _CUMUL_INTEGRAL_YEAR_MIN || year > _CUMUL_INTEGRAL_YEAR_MAX) return null;
  const idx_f = (year - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP;
  const idx_lo = Math.floor(idx_f);
  const idx_hi = Math.min(idx_lo + 1, _cumulDaysTable.length - 1);
  const v_lo = _cumulDaysTable[idx_lo], v_hi = _cumulDaysTable[idx_hi];
  if (Number.isNaN(v_lo) || Number.isNaN(v_hi)) return null;
  return C.startmodelJD + v_lo + (idx_f - idx_lo) * (v_hi - v_lo);
}

/**
 * Calendar year of the k-th H-balanced event, k = 0 being `C.balancedYear`.
 *
 * The JD round-trip is deliberate, NOT a shortcut to bisecting
 * `cyclesBetweenYears` in calendar units: calendar-year delta = H_J2000
 * exactly, but SI-year delta does not — they differ by ~6.7 SI yr per H.
 * Dropping the round-trip returns the SI label instead of the calendar year.
 *
 * @param {number} cycleOffset integer cycle index; negative = past
 * @returns {number|null}
 */
function balancedYearAtCycle(cycleOffset) {
  const refCumul = _cumulIntegralAtYear(C.balancedYear);
  if (refCumul === null) return null;
  let Y = _yearAtCumulIntegral(refCumul + cycleOffset);
  if (Y === null) return null;
  for (let iter = 0; iter < 5; iter++) {
    const jd = yearToJDDeepTime(Y);
    if (jd === null) return Y;
    const Y_SI = _jdToSIyear(jd);
    if (!Number.isFinite(Y_SI)) return Y;
    const corrected = cyclesBetweenYears(C.balancedYear, Y_SI, 1);
    if (corrected === null) return Y;
    const error = corrected - cycleOffset;
    if (Math.abs(error) < 1e-12) break;
    Y = Y - error * C.H;
  }
  return Y;
}

// ─── Scene time coordinate ↔ JD (R4) ───────────────────────────────────────
// `pos` counts tropical years since startmodelJD. Under deep time the year
// length drifts, so the conversion is the INTEGRAL of the rate — replacing
// `pos = sDay·(jd − startmodelJD)`, which doubles the accumulated drift
// exactly for a drifting rate (Δt² growth: 3.313 d at the Step 6a window
// edge). Same algorithm as the browser twin in src/script.js, kept
// operation-for-operation so the two are bit-identical (Gate C). Node has no
// snapshot mode here: out-of-domain returns null and the CALLER falls back,
// mirroring how scene-graph.js guards every other deep-time read.
//
// Uses the REAL α(t), not the lattice reference: this is a physical time
// conversion, not a lattice cycle count.
let _cumulPosTable = null;
const _posDpy = (year) => meanTropicalYearDaysAtAge((C.startmodelYear - year) / 1e6);
let _posAnchorLo = null, _posAnchorDy0 = null;
function _posAnchorLoIdx() {
  if (_posAnchorLo === null) {
    _posAnchorLo = Math.floor((C.startmodelYear - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP);
    _posAnchorDy0 = C.startmodelYear - (_CUMUL_INTEGRAL_YEAR_MIN + _posAnchorLo * _CUMUL_INTEGRAL_STEP);
  }
  return _posAnchorLo;
}
function _posAnchorDy() { _posAnchorLoIdx(); return _posAnchorDy0; }

function _ensureCumulPosTable() {
  if (_cumulPosTable !== null) return;
  _ensureCumulIntegralTable();                  // grid geometry
  const N = _cumulIntegralLength();
  const j2000Idx = _cumulIntegralJ2000IdxGet();
  _cumulPosTable = new Float64Array(N);

  const dpy = _posDpy;

  const gridYearAtJ2000Idx = _CUMUL_INTEGRAL_YEAR_MIN + j2000Idx * _CUMUL_INTEGRAL_STEP;
  _cumulPosTable[j2000Idx] = -(C.startmodelYear - gridYearAtJ2000Idx) * dpy(C.startmodelYear);

  let prev = dpy(gridYearAtJ2000Idx);
  for (let i = j2000Idx + 1; i < N; i++) {
    const curr = dpy(_CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP);
    _cumulPosTable[i] = (prev !== null && curr !== null && !Number.isNaN(_cumulPosTable[i - 1]))
      ? _cumulPosTable[i - 1] + 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP : NaN;
    prev = curr;
  }
  prev = dpy(gridYearAtJ2000Idx);
  for (let i = j2000Idx - 1; i >= 0; i--) {
    const curr = dpy(_CUMUL_INTEGRAL_YEAR_MIN + i * _CUMUL_INTEGRAL_STEP);
    _cumulPosTable[i] = (prev !== null && curr !== null && !Number.isNaN(_cumulPosTable[i + 1]))
      ? _cumulPosTable[i + 1] - 0.5 * (prev + curr) * _CUMUL_INTEGRAL_STEP : NaN;
    prev = curr;
  }

  // Normalise so jdFromPos(0) === startmodelJD exactly. Without this the anchor
  // cell carries a partial-cell artifact (seeded by linear extrapolation, read
  // by interpolation across a 10-kyr cell) worth a constant 37 s.
  // Must use the SAME analytic sub-cell integration the reader uses.
  const lo0n = _posAnchorLoIdx(), dy0n = _posAnchorDy();
  const yLo0n = _CUMUL_INTEGRAL_YEAR_MIN + lo0n * _CUMUL_INTEGRAL_STEP;
  const v0 = _cumulPosTable[lo0n] + 0.5 * (_posDpy(yLo0n) + _posDpy(C.startmodelYear)) * dy0n;
  if (Number.isFinite(v0)) for (let i = 0; i < N; i++) _cumulPosTable[i] -= v0;
}

/** Scene time coordinate → Julian Date. pos = 0 returns startmodelJD exactly;
 *  null out of domain (caller falls back). */
function jdFromPos(pos) {
  if (!Number.isFinite(pos)) return null;
  _ensureCumulPosTable();
  // Years from the anchor cell's lower edge — never via the absolute index
  // fraction (idxF0 ~50,000 loses 1.1e-11, × STEP = 4e-5 d).
  const lo0 = _posAnchorLoIdx();
  const total = _posAnchorDy() + pos;
  const k = Math.floor(total / _CUMUL_INTEGRAL_STEP);
  const dyCell = total - k * _CUMUL_INTEGRAL_STEP;
  const lo = lo0 + k;
  if (lo < 0 || lo >= _cumulPosTable.length - 1) return null;
  const a = _cumulPosTable[lo];
  if (Number.isNaN(a)) return null;
  // Integrate analytically across the partial cell: linear interpolation returns
  // the cell's CHORD slope (the year length at the cell MIDPOINT), which on a
  // 10-kyr grid is 18.6 ms of year length at J2000.
  const yLo = _CUMUL_INTEGRAL_YEAR_MIN + lo * _CUMUL_INTEGRAL_STEP;
  const f0 = _posDpy(yLo), f1 = _posDpy(yLo + dyCell);
  if (f0 === null || f1 === null) return null;
  return C.startmodelJD + a + 0.5 * (f0 + f1) * dyCell;
}

/** Julian Date → scene time coordinate. Exact inverse of jdFromPos; null out
 *  of domain. Seeded from the linear estimate — this is on the hot path. */
function posFromJD(jd) {
  if (!Number.isFinite(jd)) return null;
  _ensureCumulPosTable();
  const N = _cumulPosTable.length;
  const target = jd - C.startmodelJD;
  let lo = 0, hi = N - 1;
  while (lo < N && Number.isNaN(_cumulPosTable[lo])) lo++;
  while (hi >= 0 && Number.isNaN(_cumulPosTable[hi])) hi--;
  if (lo >= hi) return null;
  if (target < _cumulPosTable[lo] || target > _cumulPosTable[hi]) return null;

  const guessYear = C.startmodelYear + target / SI_TROPICAL_YEAR_DAYS;
  let g = Math.floor((guessYear - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP);
  if (g < lo) g = lo; if (g > hi - 1) g = hi - 1;
  if (_cumulPosTable[g] <= target && _cumulPosTable[g + 1] >= target) {
    lo = g; hi = g + 1;
  } else {
    let span = 1, a = g, b = g;
    while (span < N) {
      a = Math.max(lo, g - span); b = Math.min(hi, g + span);
      if (_cumulPosTable[a] <= target && _cumulPosTable[b] >= target) break;
      span <<= 1;
    }
    lo = a; hi = b;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (_cumulPosTable[mid] <= target) lo = mid; else hi = mid;
    }
  }
  // Solve within the cell against the SAME analytic sub-integration jdFromPos
  // uses, so the two are exact inverses.
  const a2 = _cumulPosTable[lo];
  const yLo = _CUMUL_INTEGRAL_YEAR_MIN + lo * _CUMUL_INTEGRAL_STEP;
  const f0 = _posDpy(yLo);
  let dy = (_cumulPosTable[hi] === a2) ? 0
         : (target - a2) / (_cumulPosTable[hi] - a2) * _CUMUL_INTEGRAL_STEP * (hi - lo);
  for (let it = 0; it < 4; it++) {
    const f1 = _posDpy(yLo + dy);
    if (f1 === null) break;
    const g = a2 + 0.5 * (f0 + f1) * dy - target;
    if (Math.abs(g) < 1e-11) break;
    dy -= g / f1;
  }
  return (lo - _posAnchorLoIdx()) * _CUMUL_INTEGRAL_STEP - _posAnchorDy() + dy;
}

// ─── Exports ──────────────────────────────────────────────────────────────
module.exports = {
  // Framework e_E: H/3 fluctuation line (production) + Laskar-band composite (A/B research)
  _fwEarthEcc,
  // The shared @essrt/physics moon eccentricity channel (8.2-2) — scene-graph's
  // E-factor and channel-integral mirrors read it from here so the anchors
  // e0/g0 stay the channel's consts (never eccAt(0) — the R3 drift
  // correction makes cycles(2000→2000) nonzero).
  _moonEcc,
  _fwEarthEccComposite,
  // Layer 0 wiring (PHASE-B): the parameter bundle, so every consumer builds
  // the pure primitives from identical numbers. Inject `earthMoiFactorAtAge`
  // (exported above) as the α channel.
  EPOCH_PARAMS,
  // Year↔JD under deep time + the balanced-event finder (PHASE-B-DUPLICATE).
  // Step 6a's `Cycle` column needs all four; `SI_TROPICAL_YEAR_DAYS` is the
  // axis they share, exported so a caller cannot re-derive it differently.
  _jdToSIyear,
  _yearAtCumulIntegral,
  yearToJDDeepTime,
  balancedYearAtCycle,
  SI_TROPICAL_YEAR_DAYS,
  // pos↔JD under deep time (R4) — the integrated conversion; null out of
  // domain, caller falls back to the linear form.
  posFromJD,
  jdFromPos,
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
  dtCycleLodCorrectionSum,
  // Layer-4 solar-day composite (§12h strangler — browser tweakpane twin)
  computeSiderealYearDaysDirect, computeSolarYearDaysDirect, computeAnomalisticYearDaysDirect,
  computeYearDaysDirectAll,
  h5Correction, computeLodKinematicSecondsAtEpoch, computeLodRealSecondsAtEpoch,
  // Core-mantle swing (Resonator driver) — episode component, default ON (joint world)
  resonatorSwingDeltaTCorrection, resonatorSwingLodCorrection, resonatorSwingLodRate,
  DT_RESONATOR_ENABLED,
  meanLodSecondsWithCorrectionsAtAge,
  // dLOD/dt driver decomposition (tidal / GIA / all-cycles channels, ms/cy)
  dLodDtDecompositionAtAge,
  ALPHA_CLIMATE_SCALE,
  ALPHA_1,
  // Moon chain
  meanSolarDeltaAAtAge, meanMoonDistanceCorrectedAtAge,
  meanMoonSiderealMonthAtAge, meanSynodicMonthAtAge, meanTropicalMonthAtAge,
  meanApsidalCyclesICRFAtAge, meanNodalCyclesICRFAtAge,
  meanApsidalPrecessionSecondsICRFAtAge, meanNodalPrecessionSecondsICRFAtAge,
  meanLunarPerigeePrecessionAtAge, meanLunarNodePrecessionAtAge,
  meanAnomalisticMonthAtAge, meanNodalMonthAtAge,
  meanApsidalMeetsNodalAtAge, meanLunarLevelingCycleAtAge,   // 8.2-3: gained via the shared chain (were browser-only)
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
