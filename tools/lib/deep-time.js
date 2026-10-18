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
// perf: cached lazy requirer (see tools/lib/scene-graph.js) — per-call
// `require()` re-runs module resolution (~30 µs each); lazy order preserved.
const _modCache = Object.create(null);
const _req = (p) => _modCache[p] || (_modCache[p] = require(p));

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
const _CLIMATE_JSON_PATH       = path.join(__dirname, '..', '..', 'public', 'input', 'climate-formula-coefficients.json');
const CLIMATE_FORMULA_COEFFS   = JSON.parse(fs.readFileSync(_CLIMATE_JSON_PATH, 'utf8'));
// The GIA channel — the LAGGED response of the polar moment to the L1 ice
// history: ONE home in @essrt/physics/climate/l1-orbital (createAlphaGiaChannel).
// k is DERIVED from the Cox–Chao rate (the assembled deepTime block's
// alphaGiaRateJ2000PerYr = astro-reference giaCoxChaoPeltier dJ2/dt ÷ factor),
// τ is the relaxation time measured against the historical ΔT record
// (alphaGiaRelaxationKyr, the banked record data/deep-time-fitted.json; plan 06
// D7). Same construction in model.js, src/script.js and the website's essrt.ts.
const _alphaGia = (() => {
  const r = CLIMATE_FORMULA_COEFFS.regimes[ALPHA_CLIMATE_REGIME_KEY];
  return _req('@essrt/physics/climate/l1-orbital').createAlphaGiaChannel({
    l1Terms: r.L1,
    yStdDenormalization: r.denormalization.y_std,
    relaxationKyr: C.ALPHA_GIA_RELAXATION_KYR,
    alphaGiaRateJ2000PerYr: C.ALPHA_GIA_RATE_J2000_PER_YR,
    alphaJ2000: C.EARTH_MOI_FACTOR,
    // the channel's second observable, J₂(t)/J₂₀ — scaled on the OBSERVED dJ₂/dt
    j2RateJ2000PerYr: C.J2_RATE_J2000_PER_YR,
    j2J2000: C.earthJ2,
  });
})();
/** J₂(t)/J₂₀ of the GIA channel at a calendar year — PURE in year (never the
 *  lattice-α pin: the spin integration's samplers are cached). The precession
 *  of date multiplies it into the precession constant (deep-orbital-history). */
const j2RatioAtYear = (year) => _alphaGia.j2RatioAt(year);
// the derived coupling, per ‰ — kept under its historical export name for the registry
const ALPHA_CLIMATE_SCALE      = _alphaGia.kPerPermille;

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
// Homes (plan 11 step 1, read through the generated module's assembled deepTime
// block): α₁ is the LLR-anchored INPUT astro-reference moonReference
// .moonRecessionAlpha1PerMa (da/dt(J2000) = 3.82 cm/yr, Dickey 1994 / Chapront
// 2002); α₃/α₄ are the LSQ fit to the Farhat 2022 deep-time anchors, banked in
// data/deep-time-fitted.json with their provenance.
const ALPHA_1 = C.ALPHA_1;           // /Ma
const ALPHA_3 = C.ALPHA_3;           // /Ma³
const ALPHA_4 = C.ALPHA_4;           // /Ma⁴

// ─── J2000 anchors derived from framework constants ───────────────────────

const MEAN_SIDEREAL_YEAR_J2000_S = C.meanSiderealYearSeconds;
// Plan 09: the J2000 day length ω₀ is the SI day (C.meanLengthOfDay = 86,400,
// an input). The identifier keeps its name; the H/13 identity it once named
// (86,399.99968 s) is deleted. Mirrors src/script.js LOD_NOW_H13_S.
const LOD_NOW_H13_S              = C.meanLengthOfDay;
const MEAN_TROPICAL_YEAR_J2000_S = C.meanSolarYearDays * C.meanLengthOfDay;
const SI_TROPICAL_YEAR_DAYS      = MEAN_TROPICAL_YEAR_J2000_S / 86400;

const SOLAR_MASS_LOSS_FRAC_PER_YR = DM_DT_TOTAL_KG_S * MEAN_SIDEREAL_YEAR_J2000_S / C.M_SUN;

// The solar fraction of the J2000 precession torque and the model's J2000
// rate p₀ (plan 06 Phase 3): the unit H(t) ≡ 13·T_p,composed needs f_S in
// Layer 0 and the deep-time factory. ONE derivation: earth/precession-composed.
const PRECESSION_SOLAR_SHARE_J2000 = _req('@essrt/physics/earth/precession-composed').computeSolarTorqueShare({
  gmSunKm3S2: C.GM_SUN, auKm: C.currentAUDistance, earthEccentricity: C.ASTRO_REFERENCE.earthEccentricityJ2000,
  gmMoonKm3S2: C.GM_MOON_ALONE, moonDistanceKm: C.moonDistance, moonEccentricity: C.moonOrbitalEccentricity,
  moonInclinationDeg: C.moonEclipticInclinationJ2000,
});
// THE J2000 precession anchor p₀ (plan 09): the IAU 2006 general precession
// in longitude at J2000, as the period 1,296,000/p_A = 25,771.575 Julian
// years (astro-reference.json; C.axialPrecessionJ2000Years). ONE home: the
// composed clock's p₀ (deep-time factory dep below), the registry and the
// browser twin read it. Before plan 09 it was the retired year combs' beat
// at 2000 (plan 06 S5, 25,771.395 yr); the H/13 reading (25,793.6) was the
// fit anchor's, not a period. The identifier keeps its name.
function certifiedAxialPrecessionJ2000Years() { return C.axialPrecessionJ2000Years; }
/** The model's J2000 axial-precession rate, ″/yr (1,296,000/axial0; S5). */
function precessionRateJ2000ArcsecPerYr() { return 1296000 / certifiedAxialPrecessionJ2000Years(); }

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

// J2000 Moon precession anchors (plan 09: the IAU inputs themselves — the
// legacy-'ICRF'-named inputs hold the equinox-of-date observables 3231.50 d /
// 6798.38 d; the star-referenced periods remove the equinox's own precession,
// 1/T_E = 1/T_I ∓ 1/T_p. The era device's eighth-integer-per-8H counts and
// their totalDaysInH/N read-back are deleted.) Same operations as
// packages/physics model.js (the twin).
const MOON_APSIDAL_OFDATE_J2000_S = C.moonApsidalPrecessionDaysInputICRF * 86400;
const MOON_NODAL_OFDATE_J2000_S   = C.moonNodalPrecessionDaysInputICRF * 86400;
const MOON_APSIDAL_J2000_S = 1 / (1 / MOON_APSIDAL_OFDATE_J2000_S - 1 / (C.axialPrecessionJ2000Days * 86400));  // ≈ 8.85 yr, star-referenced
const MOON_NODAL_J2000_S   = 1 / (1 / MOON_NODAL_OFDATE_J2000_S + 1 / (C.axialPrecessionJ2000Days * 86400));    // ≈ 18.60 yr, star-referenced
const MOON_SIDEREAL_MONTH_J2000_S = C.moonSiderealMonth * 86400;
// (Plan 09 step 5c: the per-H of-date cycle counts and the month chain's H²
// scaling left; the of-date perigee/node are the chain's count compositions.)

// Per-planet semi-major axes at J2000 (km): the ONE scaffold geometry
// (constants.js derived — plan 09 step 7b: the chain's J2000 a for the seven
// chain planets; it was Kepler's a from the device's count-quantized period).
// Matches orbital-engine.js computeSemiMajorAxis().
function _planetAuRatio(name) {
  if (name === 'earth') return 1.0;
  const d = C.derived && C.derived[name];
  return d ? d.orbitDistance : 0;
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
// (the α evaluation lives in the package channel `_alphaGia` above)

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

// Exact-argument memo (mirrors src/script.js earthMoiFactorAtAge, the
// round-5 perf campaign — the browser measured this function at 35% of
// deep-time frame cost before its memo; the Node engine's deep-epoch
// consumers, e.g. the Step-6a exporter and the chain-cycle Simpson
// fallback, pay the same 33-term L1 sum per call). Same argument →
// bit-identical value: pure dedupe, not a grid (the sampler-purity trap
// class is about NEARBY arguments). The lattice-α pin above bypasses the
// memo entirely, so a table build can never poison it with the pinned
// anchor value. Bounded by wholesale clear.
/** @type {Map<number, number>} */
const _earthMoiMemo = new Map();
const _EARTH_MOI_MEMO_CAP = 8192;
function earthMoiFactorAtAge(t_Ma) {
  if (_latticeAlphaRef) return EARTH_MOI_FACTOR;
  const memoHit = _earthMoiMemo.get(t_Ma);
  if (memoHit !== undefined) return memoHit;
  const alpha = _alphaGia.alphaAt(2000 - t_Ma * 1e6);
  if (_earthMoiMemo.size >= _EARTH_MOI_MEMO_CAP) _earthMoiMemo.clear();
  _earthMoiMemo.set(t_Ma, alpha);
  return alpha;
}

function iEarthAtAge(t_Ma) {
  return earthMoiFactorAtAge(t_Ma) * M_EARTH_ALONE * R_EARTH_M * R_EARTH_M;
}

// ─── LAYER 2 — Moon distance ──────────────────────────────────────────────
// Phase 8.2-3: the month/precession chain lives ONCE in
// @essrt/physics/moon/month-chain; this engine delegates, injecting its own
// layer-0/1 evaluators, J2000 anchors, and the shared ecc channel's
// modulation. Lazy so every module const exists at first use.
const { createMoonMonthChain } = _req('@essrt/physics/moon/month-chain');
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
        meanSiderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
        moonApsidalJ2000Seconds: MOON_APSIDAL_J2000_S,
        moonNodalJ2000Seconds: MOON_NODAL_J2000_S,
        moonSiderealMonthJ2000Seconds: MOON_SIDEREAL_MONTH_J2000_S,
        sPerigee: _ECOMP_S_W, sNode: _ECOMP_S_N,
      },
      fns: {
        meanLodSecondsAtAge,
        meanSiderealYearSecondsAtAge,
        // plan 09 step 5c: the tropical month's equinox turn is one per T_p(t)
        precessionPeriodYearsAtAge: meanLunisolarPrecessionPeriodYearsAtAge,
        // Decision (ii): _eCompModulation now rides the ONE deep e
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
const { createMoonRecessionHistory, createSolarChannelBudget } = _req('@essrt/physics/deltat/recession-history');
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
const { createDeepTimeLod } = _req('@essrt/physics/deltat/deep-time');
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
        lodNowH13Seconds: LOD_NOW_H13_S,
        meanSiderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
        solarMassLossFracPerYear: SOLAR_MASS_LOSS_FRAC_PER_YR,
        precessionSolarShareJ2000: PRECESSION_SOLAR_SHARE_J2000,
      },
      moonDistanceMetresAtAge: meanMoonDistanceMetresAtAge,
      moiFactorAtAge: earthMoiFactorAtAge,
      // S5: the composed clock's J2000 anchor — the certified year laws' beat at 2000 (lazy)
      precessionPeriodJ2000YearsFn: certifiedAxialPrecessionJ2000Years,
      // Plan 06 T2 item: the ecliptic missing-motion term rides the nodal period (orbital), lazy
      nodalPeriodYearsFn: () => 1296000 / _s3ArcsecPerYr(),
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

// (Plan 09: the IAU-base sidereal-year comb evaluator and the "Actual LOD"
// it fed — the tidal mean × the comb's ripple — are deleted with the comb.)

// (Plan 09 step 7b: STEP 2 — the unit H(t), `meanHAtAge` — is deleted; the
// deep-time clock is the composed lunisolar precession period below.)

// ─── The lunisolar precession clock (plan 06 D6 → Phase 3) ────────────────
// H(t) is the UNIT: 13 × the composed lunisolar precession period
// ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] (ONE formula home:
// @essrt/physics/earth/precession-composed, built inside the deep-time
// factory), p₀ the derived J2000 rate (S5: 25,771.4 yr, NOT H₀/13 —
// the unit scales with the period, H(t)/T_p(t) = 13.011, a fit constant).
// (Plan 09 step 7a: the frozen era clock's counter H_era = H₀·LOD/LOD₀ and
// its year twins — plan 06 D8's second named counter, exported for the
// devices fitted against it — are deleted with the last comb.)
function meanLunisolarPrecessionRateArcsecPerYrAtAge(t_Ma) { return _deepLod().lunisolarPrecessionRateArcsecPerYrAtAge(t_Ma); }
function meanLunisolarPrecessionPeriodYearsAtAge(t_Ma) { return _deepLod().lunisolarPrecessionPeriodYearsAtAge(t_Ma); }

// ─── Driver 2 — AU and year_s ─────────────────────────────────────────────
function meanAuAtAge(t_Ma) {
  // Phase 8.3 L6: the linear mass-loss law lives in @essrt/physics.
  return _req('@essrt/physics/planets/orbit-chain')
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
//   Bond      1,466 yr — the millennial Bond rhythm (Bond 2001 ~1470 yr)
//   Hallstatt 2,430 yr — the solar-activity Hallstatt cycle
//   Jose5       897 yr — 5 × the 179-yr Jose period
// Fitted periods STATED IN YEARS (the fit file's `period_yr`): plan 06 T5
// measured the former 8H/n divisor labels chance-level, and layer B item 3
// removed the divisor from every runtime — the period is the number.

const BOND_PERIOD_YR = _DT.bond.period_yr;
const BOND_OMEGA = 2 * Math.PI / BOND_PERIOD_YR;
const BOND_COS_COEFF_S = _DT.bond.cos_coeff_s;
const BOND_SIN_COEFF_S = _DT.bond.sin_coeff_s;

const HALLSTATT_PERIOD_YR = _DT.hallstatt.period_yr;
const HALLSTATT_OMEGA = 2 * Math.PI / HALLSTATT_PERIOD_YR;
const HALLSTATT_COS_COEFF_S = _DT.hallstatt.cos_coeff_s;
const HALLSTATT_SIN_COEFF_S = _DT.hallstatt.sin_coeff_s;

const JOSE5_PERIOD_YR = _DT.jose5.period_yr;
const JOSE5_OMEGA = 2 * Math.PI / JOSE5_PERIOD_YR;
const JOSE5_COS_COEFF_S = _DT.jose5.cos_coeff_s;
const JOSE5_SIN_COEFF_S = _DT.jose5.sin_coeff_s;

const JOSE4_PERIOD_YR = _DT.jose4.period_yr;
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
// Single source: data/deltaT-4flag-fit.json shipped_taper — the stack's own
// artifact, written by its fitter (plan 11 step 1) and assembled into the
// generated deepTime block (mirrors src/script.js BOND_TAPER_* — same values,
// per-file legacy names).
const HOLOCENE_TAPER_FULL_HALFWIDTH_YR = C.DT_STACK_TAPER_FULL_HALFWIDTH_YR;
const HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR = C.DT_STACK_TAPER_TOTAL_HALFWIDTH_YR;

// 8.4-2: the taper, the four anchored cycle corrections, their δLOD twins,
// and the Core-mantle swing episode live ONCE in @essrt/physics/deltat/cycles.
// This engine injects its constant set (the fit-output data JSONs — the
// browser injects FIT.DT_STACK/FIT.DT_RESONATOR) and keeps its env-var
// gates. The factory is lazy: the RES_* scalars below it are read at first
// call, after module evaluation.
const { createDeltaTCycles } = _req('@essrt/physics/deltat/cycles');
let _dtCyclesM = null;
function _dtCycles() {
  if (!_dtCyclesM) {
    _dtCyclesM = createDeltaTCycles({
      taperFullHalfwidthYears: HOLOCENE_TAPER_FULL_HALFWIDTH_YR,
      taperTotalHalfwidthYears: HOLOCENE_TAPER_TOTAL_HALFWIDTH_YR,
      tropicalYearSecondsJ2000: MEAN_TROPICAL_YEAR_J2000_S,
      cycles: {
        bond:      { periodYears: BOND_PERIOD_YR,      cosCoeffSeconds: BOND_COS_COEFF_S,      sinCoeffSeconds: BOND_SIN_COEFF_S },
        hallstatt: { periodYears: HALLSTATT_PERIOD_YR, cosCoeffSeconds: HALLSTATT_COS_COEFF_S, sinCoeffSeconds: HALLSTATT_SIN_COEFF_S },
        jose5:     { periodYears: JOSE5_PERIOD_YR,     cosCoeffSeconds: JOSE5_COS_COEFF_S,     sinCoeffSeconds: JOSE5_SIN_COEFF_S },
        jose4:     { periodYears: JOSE4_PERIOD_YR,     cosCoeffSeconds: JOSE4_COS_COEFF_S,     sinCoeffSeconds: JOSE4_SIN_COEFF_S },
      },
      resonator: {
        t0Years: RES_T0_YR, q: RES_Q,
        kicks: [
          { tYear: RES_KICK1_T_YR, cosSeconds: RES_KICK1_COS_S, sinSeconds: RES_KICK1_SIN_S },
          { tYear: RES_KICK2_T_YR, cosSeconds: RES_KICK2_COS_S, sinSeconds: RES_KICK2_SIN_S },
        ],
        tones: [{ periodYears: RES_TONE1_PERIOD_YR, phiLockedRad: RES_TONE1_PHI_RAD, ampSeconds: RES_TONE1_AMP_S }],
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
// damped oscillation of the core's eigenmode (T₀ = 3,916 yr, Q = 1.80, in the
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
// The eigenperiod T₀ = 3,916 yr and the drive tone's period are STATED IN
// YEARS from the file (T0_yr, drive_tones[].period_yr) — the former 8H/685
// label left the runtime with layer B item 3 (plan 06 T5: the divisor
// labels carry no information). Physical caveat, recorded once: the bare
// axiMC eigenmode is core-material physics; the fitted T₀ is the shipped
// component's convention.
const RES_T0_YR       = _RES.T0_yr;
const RES_Q           = _RES.Q;
const RES_KICK1_T_YR  = _RES.kick_epochs_year[0];
const RES_KICK1_COS_S = _RES.kick_coefficients_s[0].cos;
const RES_KICK1_SIN_S = _RES.kick_coefficients_s[0].sin;
const RES_KICK2_T_YR  = _RES.kick_epochs_year[1];
const RES_KICK2_COS_S = _RES.kick_coefficients_s[1].cos;
const RES_KICK2_SIN_S = _RES.kick_coefficients_s[1].sin;
const RES_TONE1_PERIOD_YR = _RES.drive_tones[0].period_yr;   // the bond−hallstatt beat, in years
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
// the browser evaluates this composite with the epoch-aware Layer-0 base
// (R3 anchor rule). Plan 09: the kinematic day of date is the Layer-0 tidal
// mean (computeLodKinematicSecondsAtEpoch below); the three sidereal-year
// Fourier evaluators that used to coexist here (the IAU-base integrated-phase
// form behind the "Actual LOD" family, orbital-engine's difference form, the
// browser's kinematic-base computeSiderealYearDaysDirect) are deleted with
// the combs.

// Layer-0 instance for the epoch-aware base — same parameter bundle and α
// channel the browser's _L0 is built from (the layer0 identity gate pins the
// two constructions equal).
const { createEpochPrimitives } = _req('@essrt/physics');
let _l0M = null;
function _l0() {
  if (!_l0M) _l0M = createEpochPrimitives({ params: EPOCH_PARAMS, alphaAtAgeMa: earthMoiFactorAtAge });
  return _l0M;
}

// Plan 09: the three year-length combs (TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_
// HARMONICS on the frozen era clock's bases — _epochYearDaysBaseKind,
// _evalYearFourierBrowser, compute*YearDaysDirect, computeYearDaysDirectAll)
// are deleted. The year lengths of date in DAYS are the published SI year
// lengths over the kinematic day of date (the one-source movement's
// yearLengths; deep-orbital-history.js), and the kinematic day of date is
// the Layer-0 tidal mean LOD — exactly ω₀ (the SI day) at J2000.

/** Sidereal year of date in days of the epoch — the published SI sidereal
 *  year (the one-family λ̇ channel inside its window, the mass-loss law
 *  beyond) over the kinematic day of date. Browser twin: script.js
 *  siderealYearDaysOfDate. */
function siderealYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.siderealYearSecondsAtYear(year)
    : (_l0().siderealYearSeconds(year) ?? C.meanSiderealYearSeconds);
  return s / computeLodKinematicSecondsAtEpoch(year);
}

/** Tropical year of date in days of the epoch — the published SI tropical
 *  year over the kinematic day of date. */
function tropicalYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.tropicalYearSecondsAtYear(year)
    : meanTropicalYearSecondsAtAge((C.startmodelYear - year) / 1e6);
  return s / computeLodKinematicSecondsAtEpoch(year);
}

/** Anomalistic year of date in days of the epoch — the one-family
 *  anomalistic year inside its window; NaN beyond. */
function anomalisticYearDaysOfDate(year) {
  const M = _oneSourceYearLengths();
  const s = M && Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS_DT ? M.anomalisticYearSecondsAtYear(year) : NaN;
  return s / computeLodKinematicSecondsAtEpoch(year);
}

const ONE_FAMILY_WINDOW_YEARS_DT = _req('@essrt/physics/earth/year-lengths').ONE_FAMILY_WINDOW_YEARS;
let _oneSourceYearLengthsM = null;
/** The one-source movement's year-length family (lazy; null when the
 *  governed series is absent). */
function _oneSourceYearLengths() {
  if (_oneSourceYearLengthsM === null) {
    const DOH = require('./deep-orbital-history.js');
    const M = DOH.createOneSourceMovement();
    _oneSourceYearLengthsM = M ? M.yearLengths : false;
  }
  return _oneSourceYearLengthsM || null;
}

/** Twin of script.js h5Correction: the solar day's ecliptic "missing motion"
 *  LOD correction (~3.44 ms at J2000) on the deep-time mean-LOD chain. The
 *  identifier keeps its historical name; since the plan 06 T2 restatement the
 *  divisor is the nodal period 1,296,000/|s₃| (orbital, constant at every
 *  epoch), not the spin unit's H/5 — ONE home in the shared factory. */
function h5Correction(year) {
  const t_Ma = (C.startmodelYear - year) / 1e6;  // browser J2000_CALENDAR_YEAR = startmodelYear = 2000.5
  return _deepLod().eclipticLodCorrectionSecondsAtAge(t_Ma) ?? 0;
}

/** |s₃|, ″/yr — the dominant nodal mode of Earth's orbit (the largest-amplitude
 *  ζ mode of the banked deep secular modes; the recipe the physics model, the
 *  registry and the browser share). Lazy + memoized. */
let _s3ArcsecPerYrMemo = null;
function _s3ArcsecPerYr() {
  if (_s3ArcsecPerYrMemo === null) {
    const z = DEEP_MODES_ARTIFACT.earthZeta
      .filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
      .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
    _s3ArcsecPerYrMemo = Math.abs((z.omegaRadPerYr * 180) / Math.PI) * 3600;
  }
  return _s3ArcsecPerYrMemo;
}

/** Epoch-specific kinematic LOD — script.js `o.lodKinematic`: the Layer-0
 *  tidal mean length of day of date, ω₀ (the SI day) at J2000 exactly; the
 *  J2000 day stands in past the tidal-lock asymptote. Plan 09: ONE J2000 day
 *  basis — the former "IAU sidereal seconds over comb days" quotient (which
 *  carried the sidereal year's λ̇ ripple as a day-length ripple) and the
 *  cardinal MEASURED route (86400.00032 s, the joint fit's old closure basis,
 *  0.32 ms apart) are gone; the ΔT joint fit closes on this basis. */
function computeLodKinematicSecondsAtEpoch(year) {
  return _l0().lodSeconds(year) ?? C.meanLengthOfDay;
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

// (Plan 09 step 5c: the H² "cycles per H" / of-date period wrappers
// (mean*ICRFAtAge) left with the counter law; no reader remained.)

// The Moon eccentricity channel's Meeus-effective sensitivities (single source:
// src/script.js _FW_MOON; S_N 1.0→1.018 with the v4 frame-attribution batch).
const _ECOMP_S_W = 2.407, _ECOMP_S_N = 1.018;

// (Plan 09 step 6: the H/3 eccentricity law — `_moonEcc`/`_fwEarthEcc`/
// `_fwEarthEccRate` on @essrt/physics/moon/ecc-channel — and the Laskar-band
// research composite `_ECOMP`/`_fwEarthEccComposite` are deleted. Earth's
// eccentricity of date is the N-body series on every path; the ONE deep e
// below feeds the entire lunar chain, as decision (ii) placed it.)
const { createDeepEccChannel } = _req('@essrt/physics/moon/deep-ecc-channel');
const { DEEP_MODES_ARTIFACT } = _req('@essrt/physics/moon/deep-modes-artifact');
let _deepEccM = null;
function _deepEcc() {
  if (_deepEccM === null) _deepEccM = createDeepEccChannel(DEEP_MODES_ARTIFACT);
  return _deepEccM;
}

/** e_E-channel rate modulation [g(t)/g₀]^s at age t_Ma — the ONE deep e
 *  (decision (ii); was the H/3 fluctuation line). ≡ 1 at J2000. */
function _eCompModulation(t_Ma, s) {
  return _deepEcc().modulation(t_Ma, s);
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

// ─── Stellar/sidereal days ───────────────────────────────────────────────
// (Plan 09 step 5d: `meanAnomalisticYearSecondsAtAge` — the H/16 device
// identity T_sid·(H − 13)/(H − 16) — is deleted; the anomalistic year of
// date is the one-family law `yearLengths.anomalisticYearSecondsAtYear`.)

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
//
// S5 (plan 06): the precession turn in the OFFSET is one per T_p(t) — the
// composed lunisolar period (J2000 anchor 25,771.4 yr; certified past the
// chain's domain), not the unit's counter H(t)/13 (0.086 % slow — 7 µs on
// the 8.37 ms offset; the IAU offset is 8.373 ms). The sidereal day itself
// keeps its calendar-tier form (the browser's tropical-year twin), so the
// offset is taken between the star-referenced day and the T_p-referenced
// equinox day, then added to the shipped sidereal day.
function meanStellarDayAtAge(t_Ma) {
  const T_sid_s = meanSiderealYearSecondsAtAge(t_Ma);
  const LOD_s   = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  const sid       = meanSiderealDayAtAge(t_Ma);
  const Tp        = meanLunisolarPrecessionPeriodYearsAtAge(t_Ma) ?? certifiedAxialPrecessionJ2000Years();
  const unproj    = T_sid_s / (T_sid_s / LOD_s + 1);
  const sidTp     = T_sid_s / (T_sid_s / LOD_s + 1 + 1 / Tp);
  return sid + (unproj - sidTp) * C.STELLAR_DAY_RA_PROJECTION;
}

function meanSiderealDayAtAge(t_Ma) {
  const T_sid_s = meanSiderealYearSecondsAtAge(t_Ma);
  const LOD_s   = meanLodSecondsAtAge(t_Ma);
  if (LOD_s === null) return null;
  // plan 09 step 5c: the equinox's turn is one per T_p(t) (was the counter's 13/H(t), 0.086 % slow)
  const Tp = meanLunisolarPrecessionPeriodYearsAtAge(t_Ma) ?? certifiedAxialPrecessionJ2000Years();
  return T_sid_s / (T_sid_s / LOD_s + 1 + 1 / Tp);
}

// ─── Per-planet semi-major axes (Driver 2 — solar mass loss) ──────────────
function meanPlanetSemiMajorAxisAtAge(planetName, t_Ma) {
  const a_J2000 = _planetA_J2000[planetName];
  if (a_J2000 === undefined) return null;
  // Phase 8.3 L6: same linear mass-loss law as meanAuAtAge (S-P11 resolved —
  // the engines shared this driver all along; units are the caller's).
  return _req('@essrt/physics/planets/orbit-chain')
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
// THE DEEP-TIME GRID — the pos table's and the deep calendar's (matches browser)
// ═══════════════════════════════════════════════════════════════════════════

const _CUMUL_INTEGRAL_YEAR_MIN = -500e6;   // -500 Myr
const _CUMUL_INTEGRAL_YEAR_MAX =  500e6;   // +500 Myr (symmetric with past; was +1 Myr —
                                           // the asymmetry dropped the Moon args to the Meeus
                                           // polynomial past +1 Myr, whose T⁴ tail reverses
                                           // lunar motion at year ~1.99e6; physics functions
                                           // are already exercised to ±1 Gyr by the paper figures)
const _CUMUL_INTEGRAL_STEP     = 10000;    // 10 kyr per cell (matches browser)

// Grid geometry for the pos table below (the deep calendar computes the same
// two numbers). Plan 09 step 7a: until then the grid was the ∫dt/H_era phase
// table's (`@essrt/physics/phase`, Phase 7.1 — the port of the browser's
// integrated-phase machinery) and this engine exported the frozen era clock's
// counters `cyclesBetweenYears` / `integralInverseHFromYears`; the combs that
// read them are gone, the counters with them.
function _cumulIntegralJ2000IdxGet() { return Math.round((C.startmodelYear - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP); }
function _cumulIntegralLength() { return Math.ceil((_CUMUL_INTEGRAL_YEAR_MAX - _CUMUL_INTEGRAL_YEAR_MIN) / _CUMUL_INTEGRAL_STEP) + 1; }

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
  lodNowH13Seconds: LOD_NOW_H13_S,
  siderealYearJ2000Seconds: MEAN_SIDEREAL_YEAR_J2000_S,
  solarMassLossFracPerYear: SOLAR_MASS_LOSS_FRAC_PER_YR,
  precessionSolarShareJ2000: PRECESSION_SOLAR_SHARE_J2000,
  // p₀ — the tropical year of date's equinox term (plan 09 step 5d); the SAME
  // expression the deep-time factory's composed module resolves (bit-identical twins)
  precessionRateJ2000ArcsecPerYr: 1296000 / certifiedAxialPrecessionJ2000Years(),
});

// The α channel is injected into Layer 0 as `earthMoiFactorAtAge` directly —
// it already speaks the t_Ma axis Layer 0's atAgeMa cores use, so no wrapper.
// R2 (pinning α at its J2000 reference during a lattice-table build) is a
// Phase C change; today's behaviour is the live α(t) everywhere.

// ─── Year↔JD under deep time ───────────────────────────────────────────────
//
// ONE implementation, `@essrt/physics/phase/deep-calendar` (the year/day
// collapse — formerly the PHASE-B-DUPLICATE family hand-mirrored from
// `src/script.js`). Both engines build the calendar from their own grid,
// days-per-year source and lattice-α pin, and delegate. (Plan 09 step 5d:
// the H-balanced event finder left; Step 6a reports a plain year window.
// Step 7a: its `Cycle` column left with the counters.)
const { createDeepCalendar } = _req('@essrt/physics/phase/deep-calendar');
let _deepCalM = null;
function _deepCal() {
  if (_deepCalM !== null) return _deepCalM;
  _deepCalM = createDeepCalendar({
    meanYearInDaysAtAgeMa: meanYearInDaysAtAge,
    withLatticeAlpha: _withLatticeAlpha,
    startModelJD: C.startmodelJD,
    startModelYear: C.startmodelYear,
    startModelYearWithCorrection: C.startmodelYear,   // plan 11 step 5: the SI-year label anchors on the epoch itself (the correction is deleted)
    siTropicalYearDays: SI_TROPICAL_YEAR_DAYS,
    yearMin: _CUMUL_INTEGRAL_YEAR_MIN,
    yearMax: _CUMUL_INTEGRAL_YEAR_MAX,
    stepYears: _CUMUL_INTEGRAL_STEP,
  });
  return _deepCalM;
}

/**
 * SI-tropical-year label for a JD, anchored at the scene epoch (startmodelYear
 * at startmodelJD; plan 11 step 5) — NOT a calendar year (the scene's lunar
 * and planet integrators count on this axis; R13). One home: the deep calendar.
 * @param {number} jd
 * @returns {number} SI-year label
 */
const _jdToSIyear = (jd) => _deepCal().jdToSIyear(jd);
/** The exact inverse (the Moon layers' argument clock reads the lunar
 *  arguments at the JD of the SI year the dispatch passes). ONE home.
 *  @param {number} ySI @returns {number} JD */
function siYearToJD(ySI) { return _deepCal().siYearToJD(ySI); }

/**
 * Calendar year → JD, integrating days-per-year from startmodelYear.
 *
 * Named `yearToJDDeepTime` because `constants.js` already exports a SNAPSHOT
 * `yearToJD` that is linear in `meanSolarYearDays`. The collision would have
 * been silent, and the two disagree by −465 d at −100 kyr. The known 0.6-d
 * zero-point offset and why it must not be "fixed" in isolation: see the
 * deep-calendar module header.
 *
 * @param {number} year
 * @returns {number|null} null outside the table domain
 */
function yearToJDDeepTime(year) { return _deepCal().yearToJD(year); }

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
  const N = _cumulIntegralLength();             // grid geometry
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
  // The ONE deep e (the engine's own ±10-Myr mode table) — the lunar chain's
  // eccentricity source. (Plan 09 step 6: the H/3 fluctuation line
  // `_fwEarthEcc`/`_fwEarthEccRate`/`_moonEcc` and the Laskar-band research
  // composite `_fwEarthEccComposite` are deleted.)
  _deepEcc,
  // Layer 0 wiring (PHASE-B): the parameter bundle, so every consumer builds
  // the pure primitives from identical numbers. Inject `earthMoiFactorAtAge`
  // (exported above) as the α channel.
  EPOCH_PARAMS,
  // Year↔JD under deep time (PHASE-B-DUPLICATE). Step 6a's `Cycle` column
  // needs the SI axis; `SI_TROPICAL_YEAR_DAYS` is exported so a caller cannot
  // re-derive it differently. (Plan 09 step 5d: the balanced-event finder and
  // the ∫1/H table's inverse are gone.)
  _jdToSIyear,
  siYearToJD,
  yearToJDDeepTime,
  SI_TROPICAL_YEAR_DAYS,
  // pos↔JD under deep time (R4) — the integrated conversion; null out of
  // domain, caller falls back to the linear form.
  posFromJD,
  jdFromPos,
  // Anchor constants (for callers that need them)
  MEAN_SIDEREAL_YEAR_J2000_S,
  MEAN_TROPICAL_YEAR_J2000_S,
  LOD_NOW_H13_S,
  A_MOON_NOW_M,
  A_LOCK_M,
  MOON_APSIDAL_J2000_S,
  MOON_NODAL_J2000_S,
  MOON_SIDEREAL_MONTH_J2000_S,
  SOLAR_MASS_LOSS_FRAC_PER_YR,
  // Earth physical
  earthMoiFactorAtAge, iEarthAtAge,
  // Layer 2 + Layer 1
  meanMoonDistanceMetresAtAge, meanMoonDistanceAtAge,
  meanLodSecondsAtAge, meanLodHoursAtAge,
  // (plan 09 step 7b: Step 2's meanHAtAge — the unit — is deleted)
  // The lunisolar precession clock (plan 06 Phase 3): the unit's rate/period
  // (plan 09 step 7a: the frozen era clock's counter + bases left with the last comb)
  meanLunisolarPrecessionRateArcsecPerYrAtAge, meanLunisolarPrecessionPeriodYearsAtAge,
  PRECESSION_SOLAR_SHARE_J2000, precessionRateJ2000ArcsecPerYr, certifiedAxialPrecessionJ2000Years,
  j2RatioAtYear,
  // Driver 2
  meanAuAtAge, meanSiderealYearSecondsAtAge, meanTropicalYearSecondsAtAge,
  meanTropicalYearDaysAtAge, meanYearInDaysAtAge,
  // ΔT
  meanDeltaTSecondsAtAge, frameworkDeltaT,
  bondCycleDeltaTCorrection, hallstattCycleDeltaTCorrection, jose5CycleDeltaTCorrection, jose4CycleDeltaTCorrection,
  // Implied LOD corrections from the 4-flag ΔT stack (physical-consistency helper)
  bondCycleLodCorrection, hallstattCycleLodCorrection, jose5CycleLodCorrection, jose4CycleLodCorrection,
  dtCycleLodCorrectionSum,
  // Layer-4 solar-day composite (§12h strangler — browser tweakpane twin);
  // the year lengths of date in days of the epoch (plan 09: on the published
  // SI year lengths over the kinematic day of date)
  siderealYearDaysOfDate, tropicalYearDaysOfDate, anomalisticYearDaysOfDate,
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
  meanLunarPerigeePrecessionAtAge, meanLunarNodePrecessionAtAge,
  meanAnomalisticMonthAtAge, meanNodalMonthAtAge,
  meanApsidalMeetsNodalAtAge, meanLunarLevelingCycleAtAge,   // 8.2-3: gained via the shared chain (were browser-only)
  // Earth derivations
  meanStellarDayAtAge, meanSiderealDayAtAge,
  // Per-planet
  meanPlanetSemiMajorAxisAtAge,
  meanMercurySemiMajorAxisAtAge, meanVenusSemiMajorAxisAtAge,
  meanEarthSemiMajorAxisAtAge,   meanMarsSemiMajorAxisAtAge,
  meanJupiterSemiMajorAxisAtAge, meanSaturnSemiMajorAxisAtAge,
  meanUranusSemiMajorAxisAtAge,  meanNeptuneSemiMajorAxisAtAge,
  // (plan 09 step 7a: the integrated-phase counters integralInverseHFromYears /
  //  cyclesBetweenYears — Phase 9.12 — are deleted with the last comb)
};
