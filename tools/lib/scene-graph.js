// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH ENGINE — Standalone position calculator for the solar system
// Replicates the Three.js hierarchy from script.js without any rendering.
//
// Usage:
//   const { computePlanetPosition } = require('./scene-graph');
//   const pos = computePlanetPosition('mars', 2451716.5);
//   // → { ra, dec, distAU, sunDistAU }  (ra/dec in radians)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
const OE = require('./orbital-engine');
const DT = require('./deep-time');
const MEEUS_LUNAR = JSON.parse(require('fs').readFileSync(
  require('path').resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json'), 'utf8'));

// ═══════════════════════════════════════════════════════════════════════════
// FRAMEWORK-NATIVE SUN ECLIPTIC LONGITUDE — analytical utility
// ═══════════════════════════════════════════════════════════════════════════
// Reproduces what the scene graph computes for Sun at any JD, without needing
// to run moveModel. Kepler + framework harmonics, no Meeus polynomial. Used
// by diagnostic tools and available for external consumers.
// See docs/hidden/IP-framework-native-sun-ecliptic-longitude.md.

// ─── Mode-aware phase cycles helper ────────────────────────────────────────
// In snapshot mode (DEEP_TIME_ENABLED=false): (year - anchor) × N / H_J2000
// In integrated mode: DT.cyclesBetweenYears (integrates ∫N/H(t)dt properly)
// Both agree at J2000; diverge at deep time per framework's H(t) drift.

// Euclidean gcd — used by the H-lattice filter in sunLongitudeCorrection.
function _gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b !== 0) { const t = b; b = a % b; a = t; } return a; }

function _phaseCycles(year, divisor_N) {
  if (DEEP_TIME_ENABLED) {
    return DT.cyclesBetweenYears(C.balancedYear, year, divisor_N);
  }
  return (year - C.balancedYear) * divisor_N / C.H;
}

// ─── Framework-native Sun ecliptic longitude (Kepler + framework harmonics) ─
// Returns Sun's ecliptic longitude in framework's ICRF (J2000-fixed) frame,
// in degrees [0, 360). Uses:
//   - Framework's tropical year (snapshot: fixed; integrated: mid-point of H(t) evolution)
//   - Framework's eccentricity harmonic (varies at H/16 perihelion cycle)
//   - Framework's perihelion precession (H/16)
//   - Kepler higher-order Equation of Center (to e⁴)
// NO Meeus polynomial. NO T²/T³ secular artifacts.
// Deep-time-safe: bounded at all epochs. Mode-aware via _phaseCycles.
function _frameworkSunLon(jd_ut) {
  const _d2r = Math.PI / 180;
  // Scene consistency: use jd_UT directly, no TT shift. Framework's scene Sun
  // advances linearly in UT time (2π per T_trop UT days). Applying ΔT would
  // put us at TT which mismatches scene by rate × ΔT (~12° drift at year 20000
  // where framework ΔT ≈ 1M seconds). Empirically verified: scene at Y=+20000
  // Jun 15 = 235.30°, no-ΔT formula = 235.22° (0.08° gap); with-ΔT was 246.65°.
  // Meeus's own _eclSunLon still applies ΔT internally (canonical for eclipse
  // detection where Sun-Moon geometry needs both bodies on the same TT clock).
  const year = C.jdToYear(jd_ut);

  // ── Mean longitude (linear rate; framework's tropical year) ────────────
  const days_from_j2000 = jd_ut - C.j2000JD;
  let T_tropical_days;
  if (DEEP_TIME_ENABLED) {
    // Midpoint approximation: (T_j2000 + T_now) / 2
    // At Devonian ~71 ppm drift → sub-arcsec Sun position error over span
    const t_Ma = (2000 - year) / 1e6;
    const T_now = DT.meanTropicalYearDaysAtAge(t_Ma);
    T_tropical_days = 0.5 * (C.meanSolarYearDays + (T_now || C.meanSolarYearDays));
  } else {
    T_tropical_days = C.meanSolarYearDays;
  }
  const L0_j2000_deg = 280.46646;   // Sun mean lon at J2000 (matches Meeus anchor)
  const L_deg = L0_j2000_deg + 360 * days_from_j2000 / T_tropical_days;

  // ── Perihelion longitude (H/16 cycle; framework's precession) ──────────
  // Sun's geocentric perihelion = Earth's heliocentric perihelion + 180°
  const perihelion_j2000_deg =
    (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 180) % 360;
  const cyclesNow_16   = _phaseCycles(year, 16);
  const cyclesJ2000_16 = _phaseCycles(2000, 16);
  const perihelion_deg = perihelion_j2000_deg
                       + 360 * (cyclesNow_16 - cyclesJ2000_16);

  // ── Mean anomaly ───────────────────────────────────────────────────────
  const M_rad = (L_deg - perihelion_deg) * _d2r;

  // ── Eccentricity (framework's law of cosines, matches computeEccentricityEarth) ──
  // e(t) = √(base² + amp² − 2·base·amp·cos(θ)) where θ = (year - balancedYear)/H_16 × 2π
  // NOT the additive form. At J2000 gives e ≈ 0.01671 (IAU) via specific phase.
  const perihelionPhase_rad = 2 * Math.PI * _phaseCycles(year, 16);
  const _base = C.eccentricityBase;
  const _amp  = C.eccentricityAmplitude;
  const e = Math.sqrt(_base * _base + _amp * _amp
                    - 2 * _base * _amp * Math.cos(perihelionPhase_rad));

  // ── Equation of Center (Kepler higher-order, to e⁴) ────────────────────
  const e2 = e * e, e3 = e2 * e, e4 = e3 * e;
  const _rad2deg = 180 / Math.PI;
  const C_eq_deg = ((2 * e - e3 / 4) * Math.sin(M_rad)
                 + (1.25 * e2 - 11 / 24 * e4) * Math.sin(2 * M_rad)
                 + (13 / 12 * e3) * Math.sin(3 * M_rad)
                 + (103 / 96 * e4) * Math.sin(4 * M_rad)) * _rad2deg;

  // ── Sun ecliptic longitude ─────────────────────────────────────────────
  // Result is in the same frame as framework's kinematic Sun (RA/Dec output
  // of computeSunPositionFast converted via IAU obliquity). No extra H/5
  // precession offset — framework's kinematic Sun's inertial position does
  // not accumulate H/5 in its RA/Dec output at the precision this replaces.
  const lambda = L_deg + C_eq_deg;
  return ((lambda % 360) + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// Framework-native lunar fundamental arguments — mirror of src/script.js
// (_FW_MOON / _fwMoonArgs / _fwSunSecularDeviations / _moonArgsAt). One
// argument source everywhere: the fitting/verification world now runs the
// same skeleton as production (docs/66 §1). Pure-Meeus A/B reference via
// env MOON_ARGS_PURE_MEEUS=1 (matches the browser console flag flip).
// ═══════════════════════════════════════════════════════════════════════════
const MOON_ARGS_FRAMEWORK_NATIVE = !process.env.MOON_ARGS_PURE_MEEUS;

// D2 derived additional-argument rates (deg/cy, J2000 8H-lattice months —
// mirrors src/script.js FW_A2_RATE/FW_A3_RATE; record: tools/explore/derive-a1a2a3.js)
const _FW_A2_RATE = 2 * (360 * 36525 / C.moonTropicalMonth)
                  - (360 * 36525 / C.moonAnomalisticMonth)
                  - 2 * (360 * 36525 / C.planets.jupiter.solarYearInput);
const _FW_A3_RATE = 360 * 36525 / C.moonSiderealMonth;

// Planet orbital chains (8.3-1 S-P2 — mirrors src/script.js
// mean<Planet>OrbitalCyclesBetween: Driver 2, T_p(t) = T_p0·(1 − massloss·t)²).
// Was Jupiter-only (the Moon A2 argument feed); the other six were MISSING —
// under SG_DEEP_TIME=1 the Node planets ran frozen J2000 speeds (the same
// gap class as the Phase 9.13 Moon mirror). One period fn per planet, stable
// identity, so the shared chain-cycles tables key correctly.
const _mcPlanet = {};
const { driver2PeriodSecondsAtAge } = require('@hum/physics/planets/orbit-chain');
for (const _pk of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const T0 = C.planets[_pk].solarYearInput * 86400;
  // 8.3 L6: Driver 2 shared; one period fn per planet (stable identity for
  // the chain-cycles tables).
  const periodFn = (t_Ma) => driver2PeriodSecondsAtAge(t_Ma, T0, DT.SOLAR_MASS_LOSS_FRAC_PER_YR);
  _mcPlanet[_pk] = (a, b) => _moonChainCyclesTools(periodFn, a, b);
}
const _mcJupiter = _mcPlanet.jupiter;   // the deep-time A2 argument feed (unchanged identity semantics)

// Phase 8.2-5: the argument skeleton lives ONCE in
// @hum/physics/moon/arguments (the _FW_MOON bundle, the Sun secular
// deviations — now on the browser's CALENDAR year coordinate, closing S3 —
// the two bounded Lp carriers with the anchor-const e0 (this mirror used
// _fwEarthEcc(0)), and both argument branches). This engine injects its own
// chain wrappers; env toggles ride along.
const { createMoonArguments, jdToDecimalYear } = require('@hum/physics/moon/arguments');
let _moonArgsMTools = null;
function _moonArgsM() {
  if (_moonArgsMTools === null) {
    const DTmod = require('./deep-time');
    const AR = C.ASTRO_REFERENCE;
    _moonArgsMTools = createMoonArguments({
      constants: {
        j2000JD: C.j2000JD, julianCenturyDays: 36525,
        holisticYearJ2000: C.H,
        balancedYearJ2000: C.balancedYear,
        meanSolarYearDays: C.meanSolarYearDays,
        meanAnomalisticYearDays: C.meanAnomalisticYearDays,
        tropicalYearHarmonics: C.TROPICAL_YEAR_HARMONICS,
        anomalisticYearHarmonics: C.ANOMALISTIC_YEAR_HARMONICS,
        eccentricityJ2000: AR.earthEccentricityJ2000,
        eccentricityDotJ2000: AR.earthEccentricityDotJ2000,
        eccentricityDotDotJ2000: AR.earthEccentricityDotDotJ2000,
        elpEarthFigureJ2ArcsecPerCy2: AR.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2,
        elpGeneralPrecessionPA_T2ArcsecPerCy2: AR.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976,
        eccE0: DTmod._moonEcc().e0,
      },
      fns: {
        eccAt: DTmod._fwEarthEcc,
        channelIntegral: (T, s) => DTmod._moonEcc().channelIntegral(T, s),
        computeObliquityEarth: OE.computeObliquityEarth,
        jdToSIyear: _jdToSIyearTools,
        tropicalOrbitsBetween: _mcTropical,
        apsidalOfDateCyclesBetween: _mcApsidalOfDate,
        nodalOfDateCyclesBetween: _mcNodalOfDate,
        cyclesBetween: DTmod.cyclesBetweenYears,
        isDeepTime: () => DEEP_TIME_ENABLED,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
      },
    });
  }
  return _moonArgsMTools;
}

/** Phase-aware channel-rate integral — delegates to the shared
 *  @hum/physics moon eccentricity channel (8.2-2). This mirror once
 *  recomputed g₀ from _fwEarthEcc(0), which under integrated phase is not
 *  exactly the anchor (the R3 drift correction); the channel's g₀ const is
 *  the browser's convention and now the only one. */
function _fwChannelIntegralTools(T, s) {
  return require('./deep-time')._moonEcc().channelIntegral(T, s);
}

// S3 closed: the shared module evaluates the Sun secular deviations on the
// browser's CALENDAR year coordinate (this mirror used the linear
// 2000 + d/inputMeanSolarYear approximation).
function _fwSunSecularDeviations(jd_tt) { return _moonArgsM().sunSecularDeviations(jd_tt); }

// ── Stage B deep-time branch (mirror of src/script.js _fwMoonArgsDeep) ─────
// Always-chains: secular phases from the factored-law month/precession chains
// under SG_DEEP_TIME=1 (the same functions that phase the deep-time layers).
// Snapshot mode (default) keeps the certified polynomial skeleton.
// SI-year coordinate: MUST mirror the browser's _jdToSIyear exactly, which
// divides by SI_TROPICAL_YEAR_DAYS = MEAN_TROPICAL_YEAR_J2000_S/86400
// (≈ 365.24189 — NOT the 365.2422 input constant).
const _SI_TROP_DAYS = DT.MEAN_TROPICAL_YEAR_J2000_S / 86400;
const _jdToSIyearTools = (jd) => C.startModelYearWithCorrection + (jd - C.startmodelJD) / _SI_TROP_DAYS;
// Chain-cycle integrator — Phase 8.2-4: lives ONCE in
// @hum/physics/chain-cycles. This mirror previously diverged from the
// browser on THREE points, all closed by the shared module:
//   S5  — no snapshot branch / periodFn(0) memo / fallback cache here;
//   S12 — the age anchor was a literal 2000 where the browser uses
//         startmodelYear (2000.5, the scene's t_Ma convention);
//   (the table still anchors C(2000) = 0 — grid anchor ≠ age anchor,
//   deliberately, cf. the phase machinery's anchor pair).
const { createChainCycleIntegrator } = require('@hum/physics/chain-cycles');
let _chainCyclesM = null;
function _chainCyclesT() {
  if (_chainCyclesM === null) {
    _chainCyclesM = createChainCycleIntegrator({
      ageAnchorYear: C.startmodelYear,
      tropicalYearSecondsAtAge: DT.meanTropicalYearSecondsAtAge,
      tropicalYearJ2000Seconds: C.meanSolarYearDays * C.meanLengthOfDay,
      isDeepTime: () => DEEP_TIME_ENABLED,
    });
  }
  return _chainCyclesM;
}
function _moonChainCyclesTools(periodFn, yearA, yearB) {
  return _chainCyclesT().cyclesBetween(periodFn, yearA, yearB);
}
// Named moon-chain wrappers (mirror of src/script.js meanMoon*Between family;
// used by both the deep-time argument branch and the layer integrator branch)
const _mcDraconic      = (a, b) => _moonChainCyclesTools(DT.meanNodalMonthAtAge, a, b);
const _mcTropical      = (a, b) => _moonChainCyclesTools(DT.meanTropicalMonthAtAge, a, b);
const _mcAnomalistic   = (a, b) => _moonChainCyclesTools(DT.meanAnomalisticMonthAtAge, a, b);
const _mcApsidalOfDate = (a, b) => {
  const t = _mcTropical(a, b), n = _mcAnomalistic(a, b);
  return (t === null || n === null) ? null : t - n;
};
const _mcNodalOfDate   = (a, b) => {
  const dr = _mcDraconic(a, b), t = _mcTropical(a, b);
  return (dr === null || t === null) ? null : dr - t;
};
// apsidal-meets-nodal pair: the two members carry equal-and-opposite signs
// with nothing between them, so ANY common integrator cancels exactly (the
// browser uses meanApsidalMeetsNodalAtAge; net-neutral here by construction)
const _mcApsidalMeetsNodal = _mcApsidalOfDate;

// D5 derived optics (mirrors src/script.js _sunGeoVecEqD5/_moonAberrationRaDec):
// annual aberration of the Moon direction from the framework speedOfLight +
// the Sun's velocity. FRAMEWORK-NATIVE Sun vector: e(T) from the anchored
// observed eccentricity + drift (ASTRO_REFERENCE), equation-of-center
// coefficients DERIVED from e via the Kepler series (2e − e³/4, (5/4)e²,
// (13/12)e³ — the same identity the D1 laboratory proved at 2 ppm), mean
// longitude rate = framework tropical year, mean anomaly rate = that minus
// the H/16 perihelion rate, R from currentAUDistance, ε from the framework
// obliquity (bounded at deep time). One J2000 anchor: the Sun's mean
// longitude (sunMeanLongitudeJ2000_deg, astro-reference.json).
// 8.2-7 note: this mirror carried micro-op differences from the browser
// (x/d2r vs x·180/π, x·d2r vs x·π/180 — different associativity, different
// last bits). The shared module uses the browser's forms; any tools drift
// is measured by the fixtures.
function _sunGeoVecEqD5Tools(jd) { return _moonApparentM().sunGeoVecEqD5(jd); }
// Phase 8.2-7: the D5 optics + RA/Dec override live ONCE in
// @hum/physics/moon/apparent (S8: obliquity stays engine-injected — this
// engine recomputes it for the scene year).
const { createMoonApparent } = require('@hum/physics/moon/apparent');
let _moonApparentMTools = null;
function _moonApparentM() {
  if (_moonApparentMTools === null) {
    const AR = C.ASTRO_REFERENCE;
    _moonApparentMTools = createMoonApparent({
      constants: {
        j2000JD: C.j2000JD, julianCenturyDays: 36525,
        sunMeanLongitudeJ2000Deg: AR.sunMeanLongitudeJ2000_deg,
        perihelionLongitudeJ2000Deg: AR.earthPerihelionLongitudeJ2000,
        eccentricityJ2000: AR.earthEccentricityJ2000,
        eccentricityDotJ2000: AR.earthEccentricityDotJ2000,
        d5RateLDegPerDay: 360 / C.meanSolarYearDays,
        d5RatePeriDegPerDay: 360 / ((C.H / 16) * C.meanSolarYearDays),
        speedOfLight: C.speedOfLight,
      },
      fns: {
        computeObliquityEarth: OE.computeObliquityEarth,
        getAuDistanceKm: () => C.currentAUDistance,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
        getCorrectionResidual: () => C.MOON_CORRECTION_RESIDUAL,
        getCorrectionLegacy: () => C.MOON_CORRECTION,
      },
    });
  }
  return _moonApparentMTools;
}
function _moonAberrationRaDecTools(jd, ra, dec) { return _moonApparentM().moonAberrationRaDec(jd, ra, dec); }

// UT→TT (mirror of src/script.js Phase 9.16): TT = UT + ΔT from the
// framework chain. Both the Meeus/args side AND the Moon-chain layers run on
// TT — one clock for the ring and the Moon at every epoch.
function _jdTTToolsFromUT(jd) {
  if (!DEEP_TIME_ENABLED) return jd;
  // Browser convention (script.js Moon-series UT→TT, Phase 9.16): t_Ma from
  // the CALENDAR decimal year vs J2000_CALENDAR_YEAR (= startmodelYear).
  // This mirror carried a linear 365.2425 approximation — ~5-6 s of ΔT and
  // ~1e-3° of Moon longitude adrift at the Babylonian epochs (measured
  // against the browser via the -135 decomposition probe; modern was fine).
  const t_Ma = (C.startmodelYear - jdToDecimalYear(jd)) / 1e6;
  const dT = DT.meanDeltaTSecondsAtAge(t_Ma);
  return Number.isFinite(dT) ? jd + dT / 86400 : jd;
}

// Bounded planetary Lp carrier mirror (src/script.js _fwLpPlanetaryCarrier):
// K_PL·∫₀ᵀ(e_E²−e_E²(J2000))dt′ — CHANNEL-ONLY normalization (v4 carrier
// split): K_PL derived lazily from the channel part of the record remainder
// (planetary +5.8665″ + the 0.077″ Meeus-tidal gap; k = −2332, inside the
// adiabatic −2370 ± 40); the figure+frame part (+1.30363″) lives in
// _fwLpObliquityCarrierTools below. No new constants.
// ATTRIBUTION (v4 K_PL budget, closed with zero free parameters — primary
// sources in astro-reference.json elpW1T2Decomposition_arcsecPerCy2, runnable
// at tools/explore/v4-kpl-budget.js): the remainder +7.247″/cy² = true
// planetary +5.8665 (e_E²-channel physics) + Earth-figure J2 +0.1925 +
// frame ṗ_A T² +1.11113 (equinox-of-date bridge; now DERIVED at 104% by the
// ṗ composition chain, v4-pdot-composer3.js) + 0.077 Meeus-era
// tidal-convention gap (Γ embedded −25.706 vs LLR −25.858).
// 8.2-5: shared carrier. This mirror used _fwEarthEcc(0) for e0² where the
// browser uses the channel's e0 anchor CONST — the shared module settles on
// the const (the R3-drift-aware convention).
function _fwLpPlanetaryCarrierTools(T) { return _moonArgsM().planetaryCarrier(T); }

// v4 carrier split — bounded obliquity-line carrier mirror (src/script.js
// _fwLpObliquityCarrier): the figure+frame remainder (+1.30363″/cy²) rides
// the framework obliquity cycle; C_OBL = 2·T2_OBL/ε̇₀; zero new fitted values.
function _fwLpObliquityCarrierTools(T) { return _moonArgsM().obliquityCarrier(T); }

function _fwMoonArgsDeepTools(jd) { return _moonArgsM().fwArgsDeep(jd); }

function _fwMoonArgs(jd_tt) { return _moonArgsM().fwArgs(jd_tt); }

/** Argument dispatcher mirror: framework-native by default, pure Meeus
 *  polynomials when MOON_ARGS_PURE_MEEUS=1.
 *  8.2-1 S2 alignment: the polynomials are Meeus's EXACT FRACTIONS, verbatim
 *  from src/script.js _moonArgsAt. The previous decimal coefficients from
 *  meeus-lunar-tables.json contained two outright errors (Lp T⁴ off by
 *  0.056%, F T⁴ in the 5th figure) — the fraction form is the original and
 *  the two engines now evaluate identical expressions. */
function _moonArgsAtTools(jd_tt) {
  return _moonArgsM().argsAt(jd_tt);   // framework-native / pure-Meeus dispatch (env toggle injected)
}

// Phase 8.2-6: the Meeus Ch. 47 series lives ONCE in @hum/physics/moon/series.
const { createMoonSeries } = require('@hum/physics/moon/series');
let _moonSeriesMTools = null;
function _moonSeriesM() {
  if (_moonSeriesMTools === null) {
    const DTmod = require('./deep-time');
    _moonSeriesMTools = createMoonSeries({
      constants: {
        moonL: MEEUS_LUNAR.longitudeTerms.terms,
        moonB: MEEUS_LUNAR.latitudeTerms.terms,
        j2000JD: C.j2000JD, julianCenturyDays: C.julianCenturyDays,
        moonMeeusLpCorrectionDeg: C.moonMeeusLpCorrection,
        fwA2RateDegPerCy: _FW_A2_RATE, fwA3RateDegPerCy: _FW_A3_RATE,
      },
      fns: {
        argsAt: _moonArgsAtTools,
        eFactorForD: _fwEFactorTools,
        eFactorAtJdTT: (jdTT, T, T2) => _fwEFactorTools(jdTT - C.j2000JD, T, T2),
        getMoonDistanceKm: () => C.moonDistance,
        getEccentricityBase: () => C.moonOrbitalEccentricity,
        deltaTSeconds: (jd) => (_jdTTToolsFromUT(jd) - jd) * 86400,
        jdToSIyear: _jdToSIyearTools,
        tropicalOrbitsBetween: _mcTropical,
        apsidalOfDateCyclesBetween: _mcApsidalOfDate,
        cyclesBetween: DTmod.cyclesBetweenYears,
        jupiterOrbitsBetween: _mcJupiter,
        isDeepTime: () => DEEP_TIME_ENABLED,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
      },
    });
  }
  return _moonSeriesMTools;
}

/** Bounded Meeus E-factor mirror: e_E(t)/e_E(J2000) from the fully-derived
 *  framework H/3 fluctuation line (kills the polynomial blow-up at deep time). */
function _fwEFactorTools(d_days, T, T2) {
  if (!MOON_ARGS_FRAMEWORK_NATIVE) {
    const EC = MEEUS_LUNAR.eccentricityCorrection;
    return 1 + EC.e1 * T + EC.e2 * T2;
  }
  // The shared channel's eFactorAt divides by its e0 anchor CONST, not
  // eccAt(0) — under integrated phase cycles(2000→2000) carries the R3
  // drift correction and is not exactly zero (8.2-1/8.2-2).
  return require('./deep-time')._moonEcc().eFactorAt(d_days / C.inputMeanSolarYear);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEEP-TIME MODE (Option B, mirrors browser DEEP_TIME_MODE_ENABLED)
// ═══════════════════════════════════════════════════════════════════════════
// When SG_DEEP_TIME=1, each computePlanetPosition / computeSunPositionFast
// call syncs a per-epoch snapshot of H, mSY, and derived quantities via
// meanHAtAge(t_Ma) / meanTropicalYearDaysAtAge(t_Ma). Object .speed values
// stay frozen at J2000 (matching browser scene-graph behavior); only the
// JD↔pos conversion and derived-year math pick up the epoch shift. Toggle
// OFF ⇒ bit-identical to prior J2000-only output. See doc
// IP-deep-time-scene-graph-fitpipeline.md §5-6.
// R1: deep time is ON by default, matching the browser scene — which IS the
// model. It used to default OFF, so Step 6a chained its event search with
// C.meanSolarYearDays while the scene used SI_TROPICAL_YEAR_DAYS: a 1.37e-6 d
// gap that put every measured year length 118 ms/yr out (measured directly as
// a linear ramp, −1.182 s at 1990 → +1.182 s at 2010), and 4–6 HOURS on the
// Babylonian eclipse set. Set SG_DEEP_TIME=0 to opt out (snapshot mode).
const DEEP_TIME_ENABLED = process.env.SG_DEEP_TIME !== '0';

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAL MATRIX4 (column-major, matches Three.js convention)
// ═══════════════════════════════════════════════════════════════════════════

class Mat4 {
  constructor() { this.e = new Float64Array(16); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; }

  identity() { this.e.fill(0); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; return this; }

  copy(m) { for (let i=0;i<16;i++) this.e[i]=m.e[i]; return this; }

  // C = A * B  (this = a * b)
  multiplyMatrices(a, b) {
    const ae = a.e, be = b.e, te = this.e;
    const a11=ae[0],a21=ae[1],a31=ae[2],a41=ae[3];
    const a12=ae[4],a22=ae[5],a32=ae[6],a42=ae[7];
    const a13=ae[8],a23=ae[9],a33=ae[10],a43=ae[11];
    const a14=ae[12],a24=ae[13],a34=ae[14],a44=ae[15];
    const b11=be[0],b21=be[1],b31=be[2],b41=be[3];
    const b12=be[4],b22=be[5],b32=be[6],b42=be[7];
    const b13=be[8],b23=be[9],b33=be[10],b43=be[11];
    const b14=be[12],b24=be[13],b34=be[14],b44=be[15];
    te[0]=a11*b11+a12*b21+a13*b31+a14*b41;
    te[4]=a11*b12+a12*b22+a13*b32+a14*b42;
    te[8]=a11*b13+a12*b23+a13*b33+a14*b43;
    te[12]=a11*b14+a12*b24+a13*b34+a14*b44;
    te[1]=a21*b11+a22*b21+a23*b31+a24*b41;
    te[5]=a21*b12+a22*b22+a23*b32+a24*b42;
    te[9]=a21*b13+a22*b23+a23*b33+a24*b43;
    te[13]=a21*b14+a22*b24+a23*b34+a24*b44;
    te[2]=a31*b11+a32*b21+a33*b31+a34*b41;
    te[6]=a31*b12+a32*b22+a33*b32+a34*b42;
    te[10]=a31*b13+a32*b23+a33*b33+a34*b43;
    te[14]=a31*b14+a32*b24+a33*b34+a34*b44;
    te[3]=a41*b11+a42*b21+a43*b31+a44*b41;
    te[7]=a41*b12+a42*b22+a43*b32+a44*b42;
    te[11]=a41*b13+a42*b23+a43*b33+a44*b43;
    te[15]=a41*b14+a42*b24+a43*b34+a44*b44;
    return this;
  }

  premultiply(m) { return this.multiplyMatrices(m, this); }
  multiply(m) { return this.multiplyMatrices(this, m); }

  makeTranslation(x, y, z) {
    this.identity(); this.e[12]=x; this.e[13]=y; this.e[14]=z; return this;
  }

  makeRotationX(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[5]=c; this.e[9]=-s; this.e[6]=s; this.e[10]=c; return this;
  }
  makeRotationY(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[8]=s; this.e[2]=-s; this.e[10]=c; return this;
  }
  makeRotationZ(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[4]=-s; this.e[1]=s; this.e[5]=c; return this;
  }

  // Compose from position (x,y,z) and Euler XYZ rotation (rx,ry,rz in radians)
  // Matches Three.js Object3D default Euler order 'XYZ'
  // From Three.js src/math/Euler.js makRotationFromEuler case 'XYZ':
  compose(px, py, pz, rx, ry, rz) {
    const a=Math.cos(rx), b=Math.sin(rx);
    const c=Math.cos(ry), d=Math.sin(ry);
    const e=Math.cos(rz), f=Math.sin(rz);
    const ae=a*e, af=a*f, be=b*e, bf=b*f;
    const te = this.e;
    te[0]=c*e;       te[4]=-c*f;       te[8]=d;           te[12]=px;
    te[1]=af+be*d;   te[5]=ae-bf*d;    te[9]=-b*c;        te[13]=py;
    te[2]=bf-ae*d;   te[6]=be+af*d;    te[10]=a*c;        te[14]=pz;
    te[3]=0;         te[7]=0;          te[11]=0;           te[15]=1;
    return this;
  }

  // Invert a 4x4 matrix (general case)
  getInverse(m) {
    const me = m.e, te = this.e;
    const n11=me[0],n21=me[1],n31=me[2],n41=me[3];
    const n12=me[4],n22=me[5],n32=me[6],n42=me[7];
    const n13=me[8],n23=me[9],n33=me[10],n43=me[11];
    const n14=me[12],n24=me[13],n34=me[14],n44=me[15];
    const t11=n23*n34*n42-n24*n33*n42+n24*n32*n43-n22*n34*n43-n23*n32*n44+n22*n33*n44;
    const t12=n14*n33*n42-n13*n34*n42-n14*n32*n43+n12*n34*n43+n13*n32*n44-n12*n33*n44;
    const t13=n13*n24*n42-n14*n23*n42+n14*n22*n43-n12*n24*n43-n13*n22*n44+n12*n23*n44;
    const t14=n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34;
    const det=n11*t11+n21*t12+n31*t13+n41*t14;
    if (det === 0) { this.identity(); return this; }
    const d = 1/det;
    te[0]=t11*d;
    te[1]=(n24*n33*n41-n23*n34*n41-n24*n31*n43+n21*n34*n43+n23*n31*n44-n21*n33*n44)*d;
    te[2]=(n22*n34*n41-n24*n32*n41+n24*n31*n42-n21*n34*n42-n22*n31*n44+n21*n32*n44)*d;
    te[3]=(n23*n32*n41-n22*n33*n41-n23*n31*n42+n21*n33*n42+n22*n31*n43-n21*n32*n43)*d;
    te[4]=t12*d;
    te[5]=(n13*n34*n41-n14*n33*n41+n14*n31*n43-n11*n34*n43-n13*n31*n44+n11*n33*n44)*d;
    te[6]=(n14*n32*n41-n12*n34*n41-n14*n31*n42+n11*n34*n42+n12*n31*n44-n11*n32*n44)*d;
    te[7]=(n12*n33*n41-n13*n32*n41+n13*n31*n42-n11*n33*n42-n12*n31*n43+n11*n32*n43)*d;
    te[8]=t13*d;
    te[9]=(n14*n23*n41-n13*n24*n41-n14*n21*n43+n11*n24*n43+n13*n21*n44-n11*n23*n44)*d;
    te[10]=(n12*n24*n41-n14*n22*n41+n14*n21*n42-n11*n24*n42-n12*n21*n44+n11*n22*n44)*d;
    te[11]=(n13*n22*n41-n12*n23*n41-n13*n21*n42+n11*n23*n42+n12*n21*n43-n11*n22*n43)*d;
    te[12]=t14*d;
    te[13]=(n13*n24*n31-n14*n23*n31+n14*n21*n33-n11*n24*n33-n13*n21*n34+n11*n23*n34)*d;
    te[14]=(n14*n22*n31-n12*n24*n31-n14*n21*n32+n11*n24*n32+n12*n21*n34-n11*n22*n34)*d;
    te[15]=(n12*n23*n31-n13*n22*n31+n13*n21*n32-n11*n23*n32-n12*n21*n33+n11*n22*n33)*d;
    return this;
  }

  // Transform a point (x,y,z) by this matrix, return [x,y,z]
  transformPoint(x, y, z) {
    const e = this.e;
    return [
      e[0]*x + e[4]*y + e[8]*z + e[12],
      e[1]*x + e[5]*y + e[9]*z + e[13],
      e[2]*x + e[6]*y + e[10]*z + e[14],
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPHERICAL COORDINATES (matches Three.js Spherical)
// ═══════════════════════════════════════════════════════════════════════════

function cartesianToSpherical(x, y, z) {
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r === 0) return { r: 0, theta: 0, phi: 0 };
  return {
    r,
    theta: Math.atan2(x, z),   // Three.js: theta = atan2(x, z)
    phi: Math.acos(Math.min(1, Math.max(-1, y / r))),  // Three.js: phi = acos(y/r)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH NODE
// ═══════════════════════════════════════════════════════════════════════════

// Each node represents a Three.js Object3D with:
//   position (x,y,z), rotation (x,y,z in radians), children
// The "local matrix" is composed from position + rotation.
// The "world matrix" = parent.worldMatrix * localMatrix.

class Node {
  constructor(name) {
    this.name = name;
    this.px = 0; this.py = 0; this.pz = 0;  // position
    this.rx = 0; this.ry = 0; this.rz = 0;  // rotation (radians)
    this.localMatrix = new Mat4();
    this.worldMatrix = new Mat4();
    this.children = [];
    this.parent = null;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  updateWorldMatrix() {
    this.localMatrix.compose(this.px, this.py, this.pz, this.rx, this.ry, this.rz);
    if (this.parent) {
      this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }
    for (const child of this.children) child.updateWorldMatrix();
  }

  getWorldPosition() {
    return [this.worldMatrix.e[12], this.worldMatrix.e[13], this.worldMatrix.e[14]];
  }

  worldToLocal(wx, wy, wz) {
    const inv = new Mat4().getInverse(this.worldMatrix);
    return inv.transformPoint(wx, wy, wz);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Replicate createPlanet's 3-level structure
// ═══════════════════════════════════════════════════════════════════════════
//
// In script.js, createPlanet(pd) builds:
//   containerObj (= orbitContainer) — applies orbitTiltA/B as rotation.x/z, orbitCenter as position
//     └─ orbitObj (= orbit)        — rotation.y = θ for circular orbits
//        └─ pivotObj (= pivot)     — position.x = a (semi-major axis)
//           └─ rotationAxis        — position = pivot.position, rotation.z = tilt, rotation.x = tiltb
//
// For circular orbits:  orbit.rotation.y = θ, pivot at (radius, 0, 0)
// For elliptic orbits:  orbit.rotation.y = 0, pivot.position = (a*cos(θ), 0, b*sin(θ))

function makeObjectNodes(name, def) {
  const d2r = Math.PI / 180;
  const container = new Node(name + '.container');
  container.rx = (def.orbitTilta || 0) * d2r;
  container.rz = (def.orbitTiltb || 0) * d2r;
  container.px = def.orbitCentera || 0;
  container.py = def.orbitCenterc || 0;
  container.pz = def.orbitCenterb || 0;

  const orbit = new Node(name + '.orbit');
  container.addChild(orbit);

  const a = def.orbitSemiMajor !== undefined ? def.orbitSemiMajor : def.orbitRadius;
  const b = def.orbitSemiMinor !== undefined ? def.orbitSemiMinor : def.orbitRadius;
  const isEllipse = a !== b;

  const pivot = new Node(name + '.pivot');
  if (!isEllipse) {
    pivot.px = a;  // will be rotated by orbit.ry
  }
  orbit.addChild(pivot);

  // rotationAxis is a SIBLING of pivot (both children of orbit), not a child of pivot.
  // It has the same position as pivot but additionally applies axial tilt.
  // This matches script.js createPlanet: orbit.add(pivot); orbit.add(rotationAxis);
  const rotAxis = new Node(name + '.rotationAxis');
  rotAxis.rz = (def.tilt || 0) * d2r;
  if (def.tiltb) rotAxis.rx = def.tiltb * d2r;
  if (!isEllipse) {
    rotAxis.px = a;  // same position as pivot
  }
  orbit.addChild(rotAxis);

  return { container, orbit, pivot, rotAxis, a, b, isEllipse, def };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD THE COMPLETE SCENE GRAPH
// ═══════════════════════════════════════════════════════════════════════════

// Pre-compute all the per-planet derived values we need
const H_J2000 = C.H;
const MSY_J2000 = C.meanSolarYearDays;
const d2r = Math.PI / 180;
const sDay_J2000 = 1 / MSY_J2000;
const correctionYears = C.correctionDays / MSY_J2000;
const startModelYearWithCorrection = C.startmodelYear + correctionYears;

// Per-JD epoch snapshot (Option B). When DEEP_TIME_ENABLED=false, always
// returns J2000 values; when true, memoizes a per-epoch snapshot of
// (H, mSY, sDay) keyed on t_Ma. The scene-setup speeds stay frozen at
// J2000; only downstream JD↔pos conversions and H-derived periods pick
// up the epoch shift. See IP-deep-time-scene-graph-fitpipeline.md §6.2.
let _epochCache = { t_Ma: 0, H: H_J2000, mSY: MSY_J2000, sDay: sDay_J2000 };

// ─── Scene time coordinate ↔ JD (R4) ───────────────────────────────────────
// `pos` is the count of tropical years since startmodelJD. Under deep time the
// year length varies, so the conversion must be the INTEGRAL of the rate:
//   jd(pos) = startmodelJD + ∫₀^pos meanTropicalYearDaysAtAge dy
// This REPLACES `pos = _epochCache.sDay × (jd − startmodelJD)` — the current
// rate times the whole elapsed span, which doubles the accumulated drift
// exactly for a drifting rate (Δt² growth: 3.313 d = 3.27° at the Step 6a
// window edge). Under SG_DEEP_TIME off the rate is constant, the linear form
// is exact, and it is kept bit-identical.
function _posFromJDTools(jd) {
  if (!DEEP_TIME_ENABLED) return sDay_J2000 * (jd - C.startmodelJD);
  const p = DT.posFromJD(jd);
  return p === null ? _epochCache.sDay * (jd - C.startmodelJD) : p;   // past tidal lock
}

function _jdFromPosTools(pos) {
  if (!DEEP_TIME_ENABLED) return C.startmodelJD + pos * MSY_J2000;
  const j = DT.jdFromPos(pos);
  return j === null ? C.startmodelJD + pos * _epochCache.mSY : j;
}

// 9-1 S-P8: the fitted sun-longitude harmonic stack lives ONCE in
// @hum/physics/sun/longitude-correction (J2000-fixed deps — the fitted
// convention). This engine's TWO former inline copies (moveModel + the
// fast animator) both delegate through this lazy factory.
const { createSunLongitudeCorrection } = require('@hum/physics/sun/longitude-correction');
let _sunLonCorrM = null;
function _sunLonCorr() {
  if (!_sunLonCorrM) {
    _sunLonCorrM = createSunLongitudeCorrection({
      hYears: C.H,
      balancedYear: C.balancedYear,
      j2000JD: C.j2000JD,
      meanDeg: C.SUN_LONGITUDE_MEAN || 0,
      harmonics: C.SUN_LONGITUDE_HARMONICS,
      nNodalJ2000: C.N_nodalI,
      nApsidalJ2000: C.N_apsidalI,
    });
  }
  return _sunLonCorrM;
}

function _syncEpochForJD(jd) {
  if (!DEEP_TIME_ENABLED) return _epochCache;
  // Approximate year from JD using J2000 mSY (self-consistent iteration
  // not needed at Step 6a's 1-year granularity — drift <10 s at ±150 kyr).
  const yearApprox = 2000 + (jd - C.j2000JD) * sDay_J2000;
  const t_Ma = (2000 - yearApprox) / 1e6;
  if (Math.abs(t_Ma - _epochCache.t_Ma) < 1e-9) return _epochCache;
  const H_t = DT.meanHAtAge(t_Ma);
  // Use meanTropicalYearDaysAtAge (T_trop_s / 86400, SI-anchored). This is
  // what the browser sets sDay to under DEEP_TIME_MODE_ENABLED
  // (src/script.js:6179):
  //   sDay = DEEP_TIME_MODE_ENABLED ? (1 / tropDays) : (1 / meansolaryearlengthinDays);
  //   const tropDays = meanTropicalYearDaysAtAge(t_Ma);
  // NOT meanYearInDaysAtAge (T_trop_s / LOD_s_at_epoch). meansolaryearlengthinDays
  // does mutate to meanYearInDaysAtAge, but that's for display/report
  // consumers, NOT for the scene's pos calculation. Using SI-anchored
  // tropDays here matches browser scene rendering at all epochs.
  const mSY_t = DT.meanTropicalYearDaysAtAge(t_Ma);
  if (H_t === null || mSY_t === null) return _epochCache;   // stay on last-good if past tidal lock
  _epochCache = { t_Ma, H: H_t, mSY: mSY_t, sDay: 1 / mSY_t };
  return _epochCache;
}

// Backwards-compatible aliases — code that references bare `H`/`sDay`
// at scene-setup time picks up the J2000 values (setup happens once at
// module load). Runtime paths use `_epochCache.H` / `_epochCache.mSY`
// / `_epochCache.sDay` and go through `_syncEpochForJD(jd)` first.
const H = H_J2000;
const sDay = sDay_J2000;

// Ascending node frame corrections from ASTRO_REFERENCE (see constants.js)
const ascNodeToolCorrection = C.ASTRO_REFERENCE.ascNodeTiltCorrection;

// Per-planet variables computed from constants (replicating script.js lines 1687-1770)
function getPlanetSceneData(key) {
  const p = C.planets[key];
  if (!p) return null;
  const d = C.derived[key];

  // Perihelion ecliptic years (already in constants)
  const perihelionEclipticYears = p.perihelionEclipticYears;

  // lowestPoint (Type I only)
  const lowestPoint = 180 - p.ascendingNode;

  // Orbit center for PerihelionFromEarth layer
  const longPeri = p.longitudePerihelion;
  const angleCorr = p.angleCorrection;
  const periDist = d.perihelionDistance;
  const periFromEarthA = Math.cos((longPeri + angleCorr + 90) * d2r) * periDist;
  const periFromEarthB = Math.cos((90 - (longPeri + angleCorr - 90)) * d2r) * periDist;

  // Ascending node corrected for planet-level tilt placement
  const correctedAscNode = p.ascendingNode + (ascNodeToolCorrection[key] || 0);

  // RealPerihelion tilts (ecliptic inclination decomposed via corrected ascending node)
  const realPeriTiltA = Math.cos((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;
  const realPeriTiltB = Math.sin((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;

  // Speed for RealPerihelionAtSun — differs by type
  let realPeriSpeed, realPeriStartPos;
  if (p.type === 'I') {
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = lowestPoint;
  } else if (p.type === 'II') {
    realPeriSpeed = -Math.PI * 2 + (2 * Math.PI * 2 / (H / d.solarYearCount));
    realPeriStartPos = p.startpos * 2;
  } else { // Type III
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = p.startpos * 2;
  }

  // Elliptic orbit radius — sign differs for anti-phase planets (negative in script.js)
  let elipticOrbitRadius = d.elipticOrbit;
  if (p.antiPhase) elipticOrbitRadius = -elipticOrbitRadius;

  // Planet orbital speed (Mars is negative, all others positive)
  const planetSpeed = (key === 'mars')
    ? -Math.PI * 2 / (H / d.solarYearCount)
    : Math.PI * 2 / (H / d.solarYearCount);

  // Orbit radius in scene units
  const orbitRadiusScene = d.orbitDistance * 100;

  return {
    key, p, d, perihelionEclipticYears, lowestPoint,
    periFromEarthA, periFromEarthB,
    realPeriTiltA, realPeriTiltB,
    realPeriSpeed, realPeriStartPos,
    elipticOrbitRadius, planetSpeed, orbitRadiusScene,
  };
}

function buildSceneGraph() {
  // Root
  const root = new Node('startingPoint');

  // ─── EARTH CHAIN ───────────────────────────────────────────────
  const earthDef = {
    orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitRadius: -C.eccentricityAmplitude * 100,
    tilt: -C.earthtiltMean,
    startPos: 0,
    speed: -Math.PI * 2 / (H / 13),
    _dtCycleN: 13, _dtCycleSign: -1,   // Phase 9.12: H/13 axial precession, retrograde
  };
  const earthNodes = makeObjectNodes('earth', earthDef);

  // Apply the static 90° rotation to earth.container (line 4993)
  earthNodes.container.ry = Math.PI / 2;

  root.addChild(earthNodes.container);

  // Earth precession layers (each is a "virtual" object with speed + tilt)
  function makePrecessionNode(name, def) {
    const n = makeObjectNodes(name, def);
    return n;
  }

  const earthInclPrec = makePrecessionNode('earthInclinationPrecession', {
    orbitRadius: 0, orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 3) * 360,
    speed: Math.PI * 2 / (H / 3),
    _dtCycleN: 3, _dtCycleSign: +1,   // Phase 9.12: H/3 inclination precession, prograde
  });
  earthNodes.pivot.addChild(earthInclPrec.container);

  const earthEclipPrec = makePrecessionNode('earthEclipticPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: -C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 5) * 360,
    speed: Math.PI * 2 / (H / 5),
    _dtCycleN: 5, _dtCycleSign: +1,   // Phase 9.12: H/5 ecliptic precession, prograde
  });
  earthInclPrec.pivot.addChild(earthEclipPrec.container);

  const earthObliqPrec = makePrecessionNode('earthObliquityPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 8) * 360),
    speed: -Math.PI * 2 / (H / 8),
    _dtCycleN: 8, _dtCycleSign: -1,   // Phase 9.12: H/8 obliquity precession, retrograde
  });
  earthEclipPrec.pivot.addChild(earthObliqPrec.container);

  const earthPeriPrec1 = makePrecessionNode('earthPerihelionPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: -C.earthRAAngle, orbitTiltb: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360,
    speed: Math.PI * 2 / (H / 16),
    _dtCycleN: 16, _dtCycleSign: +1,   // Phase 9.12: H/16 perihelion precession outer, prograde
  });
  earthObliqPrec.pivot.addChild(earthPeriPrec1.container);

  const earthPeriPrec2 = makePrecessionNode('earthPerihelionPrecession2', {
    orbitRadius: 0,
    orbitCentera: -C.eccentricityBase * 100, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360),
    speed: -Math.PI * 2 / (H / 16),
    _dtCycleN: 16, _dtCycleSign: -1,   // Phase 9.12: H/16 perihelion precession inner, retrograde

  });
  earthPeriPrec1.pivot.addChild(earthPeriPrec2.container);

  const barycenter = makePrecessionNode('barycenter', {
    orbitRadius: C.eccentricityAmplitude * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: 0, speed: 0,
  });
  earthPeriPrec2.pivot.addChild(barycenter.container);

  // Sun (under barycenter)
  const sunDef = {
    orbitRadius: 100, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: -7.155,
    startPos: C.correctionSun,
    speed: Math.PI * 2,
    eccentricity: C.eocEccentricity,
    _eccentricityKey: 'earth',
    _eocDerived: true,  // Sun EoC = e_dynamic - e_base/2
    perihelionPhaseJ2000: -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - C.perihelionRefJD) / C.meanSolarYearDays + C.perihelionPhaseOffset * d2r,
    perihelionPrecessionRate: Math.PI * 2 / C.perihelionCycleLength, // perihelion advances at H/16 rate
  };
  const sunNodes = makeObjectNodes('sun', sunDef);
  barycenter.pivot.addChild(sunNodes.container);

  // ─── MOON CHAIN (under earth.pivot) ────────────────────────────
  const moonApsidalPrec = makePrecessionNode('moonApsidalPrecession', {
    orbitRadius: -(C.moonDistance / C.currentAUDistance) * (C.moonOrbitalEccentricity * 100),
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, // apsidal precession rotates perigee within the orbital plane — no plane tilt
    tilt: 0,
    startPos: C.moonStartposApsidal,
    speed: (Math.PI * 2) / (C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays),  // of-date perigee advance (pairs with the canceller; sum unchanged)
    _dtMoonIntegrator: _mcApsidalOfDate, _dtMoonSign: +1,   // Phase 9.13 mirror
  });
  earthNodes.pivot.addChild(moonApsidalPrec.container);

  const moonApsNodalPrec1 = makePrecessionNode('moonApsidalNodalPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: C.moonStartposApsidal - C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
    _dtMoonIntegrator: _mcApsidalMeetsNodal, _dtMoonSign: -1,   // Phase 9.13 mirror (pair cancels)
  });
  moonApsidalPrec.pivot.addChild(moonApsNodalPrec1.container);

  const moonApsNodalPrec2 = makePrecessionNode('moonApsidalNodalPrecession2', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: -(C.moonStartposApsidal - C.moonStartposNodal),
    speed: (Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
    _dtMoonIntegrator: _mcApsidalMeetsNodal, _dtMoonSign: +1,   // Phase 9.13 mirror (pair cancels)
  });
  moonApsNodalPrec1.pivot.addChild(moonApsNodalPrec2.container);

  const moonLunarLevel = makePrecessionNode('moonLunarLevelingCycle', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: -C.moonStartposApsidal,  // apsidal canceller (phase + rate)
    speed: -(Math.PI * 2) / (C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays),  // apsidal canceller (of-date pair)
    _dtMoonIntegrator: _mcApsidalOfDate, _dtMoonSign: -1,   // Phase 9.13 mirror (canceller)
  });
  moonApsNodalPrec2.pivot.addChild(moonLunarLevel.container);

  const moonNodalPrec = makePrecessionNode('moonNodalPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0,  // inclination tilt lives on the moon def (below this layer's spin) so the nodal spin regresses the plane
    orbitTiltb: 0,
    tilt: 0,
    startPos: C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays),  // of-date regression (6798.3303 d)
    _dtMoonIntegrator: _mcNodalOfDate, _dtMoonSign: -1,   // Phase 9.13 mirror
  });
  moonLunarLevel.pivot.addChild(moonNodalPrec.container);

  const moonDef = {
    orbitRadius: (C.moonDistance / C.currentAUDistance) * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: Math.cos((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,  // 5.14° tilt lives here (below the nodal spin)
    orbitTiltb: Math.sin((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,
    tilt: -(C.moonEclipticInclinationJ2000 + C.moonObliquityEclipticJ2000),  // Cassini composition in the scene's own convention (mirrors src/script.js moon.tilt)
    startPos: C.moonStartposMoon,
    speed: (Math.PI * 2) / (1 / (C.meanSolarYearDays / C.moonNodalMonth)),  // draconitic (nodal-month) clock
    eccentricity: C.moonOrbitalEccentricity,
    lunarPerturbations: true,
    _dtMoonIntegrator: _mcDraconic, _dtMoonSign: +1,   // Phase 9.13 mirror (draconitic clock)
  };
  const moonNodes = makeObjectNodes('moon', moonDef);
  moonNodalPrec.pivot.addChild(moonNodes.container);

  // ─── PLANET CHAINS (under barycenter.pivot) ────────────────────
  const planetNodeMap = {};

  for (const key of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pd = getPlanetSceneData(key);
    if (!pd) continue;

    // Layer 1: PerihelionDurationEcliptic1
    const eclip1 = makePrecessionNode(key + 'PerihelionDurationEcliptic1', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2 / pd.perihelionEclipticYears,
    });
    barycenter.pivot.addChild(eclip1.container);

    // Layer 2: PerihelionFromEarth
    const periFromE = makePrecessionNode(key + 'PerihelionFromEarth', {
      orbitRadius: 0,
      orbitCentera: pd.periFromEarthA, orbitCenterb: pd.periFromEarthB, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2,
    });
    eclip1.pivot.addChild(periFromE.container);

    // Layer 3: PerihelionDurationEcliptic2
    const eclip2 = makePrecessionNode(key + 'PerihelionDurationEcliptic2', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: -Math.PI * 2 / pd.perihelionEclipticYears,
    });
    periFromE.pivot.addChild(eclip2.container);

    // Layer 4: RealPerihelionAtSun
    // NOTE: Orbital plane tilt is applied at the PLANET container level (below the
    // annual rotation), not here. Placing it here causes the tilt's latitude effect
    // to oscillate annually in the tilted frame; at opposition dates (which recur at
    // the synodic period), the combined angle changes by exactly -2pi, making the
    // sampled latitude constant. Moving the tilt below the annual rotation ensures
    // the latitude varies with the planet's sidereal orbital angle.
    const realPeri = makePrecessionNode(key + 'RealPerihelionAtSun', {
      orbitRadius: pd.elipticOrbitRadius,
      orbitCentera: 100, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0,
      tilt: 0,
      startPos: pd.realPeriStartPos,
      speed: pd.realPeriSpeed,
    });
    eclip2.pivot.addChild(realPeri.container);

    // Planet itself — orbital plane tilt applied here (below annual rotation)
    const planetDef = {
      orbitRadius: pd.orbitRadiusScene,
      orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: pd.realPeriTiltA, orbitTiltb: pd.realPeriTiltB,
      tilt: 0,  // tilt only affects axial spin, not position
      startPos: pd.p.startpos,
      speed: pd.planetSpeed,
      eccentricity: pd.p.orbitalEccentricityJ2000,
    };
    // Add equation of center (variable speed) for planets
    const periRefMap = {
      mercury: C.ASTRO_REFERENCE.mercuryPerihelionRef_JD,
      venus: C.ASTRO_REFERENCE.venusPerihelionRef_JD,
      mars: C.ASTRO_REFERENCE.marsPerihelionRef_JD,
      jupiter: C.ASTRO_REFERENCE.jupiterPerihelionRef_JD,
      saturn: C.ASTRO_REFERENCE.saturnPerihelionRef_JD,
      uranus: C.ASTRO_REFERENCE.uranusPerihelionRef_JD,
      neptune: C.ASTRO_REFERENCE.neptunePerihelionRef_JD,
    };
    if (periRefMap[key]) {
      const periPrecRate = Math.PI * 2 / pd.perihelionEclipticYears;
      const pos_peri = (periRefMap[key] - C.startmodelJD) / C.meanSolarYearDays;
      // Type III: per-planet EoC fraction to correct for double-counting with geometric offset
      planetDef.eccentricity = pd.p.orbitalEccentricityJ2000 * (pd.p.eocFraction ?? 0.5);
      planetDef._eccentricityKey = key;
      planetDef._eocFraction = pd.p.eocFraction ?? 0.5;
      // Use absolute planet speed for perihelion phase (script.js uses positive speed)
      const absPlanetSpeed = Math.PI * 2 / (H / pd.d.solarYearCount);
      planetDef.perihelionPhaseJ2000 = -pd.p.startpos * d2r
        + (absPlanetSpeed - periPrecRate) * pos_peri;
      planetDef.perihelionPrecessionRate = periPrecRate;
    }
    // 8.3-1 S-P2: deep-time orbital integrator tags (mirrors src/script.js
    // Phase P-B1..B7; sign from the def's own speed — Mars is −1 by the
    // scene-graph framing convention, not physics).
    planetDef._dtPlanetIntegrator = _mcPlanet[key];
    planetDef._dtPlanetSign = Math.sign(planetDef.speed);
    const planetNodes = makeObjectNodes(key, planetDef);
    realPeri.pivot.addChild(planetNodes.container);

    planetNodeMap[key] = {
      eclip1, periFromE, eclip2, realPeri,
      planet: planetNodes,
      sceneData: pd,
    };
  }

  return {
    root, earthNodes, sunNodes, moonNodes, barycenter,
    earthInclPrec, earthEclipPrec, earthObliqPrec,
    earthPeriPrec1, earthPeriPrec2,
    moonApsidalPrec, moonApsNodalPrec1, moonApsNodalPrec2,
    moonLunarLevel, moonNodalPrec,
    planetNodeMap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC ECLIPTIC INCLINATION — From invariable plane dynamics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the dynamic ecliptic inclination for a planet at a given time.
 *
 * Replicates the logic from script.js:
 *   computeInclinationEarth() — Earth's inv. plane inclination oscillation
 *   computePlanetInvPlaneInclinationDynamic() — planet's inv. plane oscillation
 *   updateDynamicInclinations() — normal vector dot product → ecliptic inclination
 *
 * @param {string} key — planet key (e.g. 'saturn')
 * @param {number} yearsSinceBalanced — years since the balanced year epoch
 * @returns {number} ecliptic inclination in degrees
 */
function computeDynamicEclipticInclination(key, yearsSinceBalanced) {
  // 8.3-1 S-P4: one Ω anchor — the canonical form now lives in
  // orbital-engine (computeEclipticInclinationFromBalanced); this body was
  // moved there VERBATIM and this mirror delegates with its exact argument.
  return OE.computeEclipticInclinationFromBalanced(key, yearsSinceBalanced);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE MODEL — Update all rotations/positions for a given pos
// ═══════════════════════════════════════════════════════════════════════════

function moveModel(graph, pos) {
  // Compute dynamic eccentricities for all planets (oscillate at H/16)
  // Uses _epochCache.mSY so the pos→JD→year round-trip is consistent with
  // the caller's pos = _epochCache.sDay × (jd - C.startmodelJD).
  // pos IS the tropical-year count from startmodelJD, so the year is simply
  // startModelYearWithCorrection + pos. The previous form reconstructed the JD
  // as `startmodelJD + pos*mSY` and divided by mSY again — algebraically the
  // same under a CONSTANT rate, but it mixes conventions now that pos comes
  // from the integrated conversion, and its epoch-local mSY made the offset
  // (startmodelJD - balancedJD)/mSY drift with epoch.
  const currentYear = C.startModelYearWithCorrection + pos;
  const dynEcc = { earth: OE.computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude) };
  for (const [key, p] of Object.entries(C.planets)) {
    if (p.eccentricityPhaseJ2000 !== undefined) {
      // 8.3-1 S-P1: the oscillation rides each planet's OWN wobble period
      // (the browser's certified form — anchor and period from the same
      // beat). This mirror used H/16 for every planet: exact at the anchor
      // by construction, wrong by the wobble/H16 ratio (1.3–6.7×) away from
      // it — invisible to the modern-window RMS gate, divergent at depth.
      // Node already computed p.wobblePeriod and simply didn't use it.
      const refYear = 2000 - (p.eccentricityPhaseJ2000 / 360) * p.wobblePeriod;
      dynEcc[key] = OE.computeEccentricity(currentYear, refYear, p.wobblePeriod, p.orbitalEccentricityBase, p.orbitalEccentricityAmplitude);
    }
  }

  // Update each "animated" object: orbit.ry = θ for circular, pivot.position for ellipse
  function animateObject(nodes, def) {
    let θ;
    // Phase 9.12 (B-full): Earth H-cycle precession objects tagged with
    // _dtCycleN / _dtCycleSign use integrated phase ∫1/H(t')dt' under
    // deep-time. Under toggle-off (or untagged), falls through to
    // J2000-snapshot form θ = speed × pos - startPos.
    // Mirrors src/script.js:48326-48337.
    if (DEEP_TIME_ENABLED && Number.isFinite(def._dtCycleN)) {
      const cycles = DT.cyclesBetweenYears(C.balancedYear, currentYear, def._dtCycleN);
      θ = (cycles !== null ? cycles : 0) * 2 * Math.PI * def._dtCycleSign;
    } else if (DEEP_TIME_ENABLED && def._dtMoonIntegrator) {
      // Phase 9.13 mirror (previously MISSING in tools — the moon layers ran
      // frozen J2000 speeds in deep-time mode while the browser ran the
      // chains; measured as a spurious ~9.6° Moon-vs-ring plane divergence
      // at +52 kyr in the moon-on-ring meter). Anchor + SI-year coordinate
      // mirror src/script.js moveModel (_mAnchor = STARTMODEL_YEAR_SI, UT).
      const _jdHere = _jdFromPosTools(pos);
      // TT clock (mirrors src/script.js): the Moon-chain layers run on the
      // SAME clock as the override arguments — the earlier UT convention made
      // the ring lag the Moon by precession-rate × ΔT at deep time.
      const _cyc = def._dtMoonIntegrator(C.startModelYearWithCorrection, _jdToSIyearTools(_jdTTToolsFromUT(_jdHere)));
      θ = (_cyc !== null ? _cyc : 0) * 2 * Math.PI * def._dtMoonSign - def.startPos * d2r;
    } else if (DEEP_TIME_ENABLED && def._dtPlanetIntegrator) {
      // 8.3-1 S-P2 (mirrors src/script.js Phase P-B0 dispatch): planet-chain
      // integral form, Driver 2 Kepler + mass loss, on the TT clock — the
      // same anchor/coordinate as the Moon branch above.
      const _jdHereP = _jdFromPosTools(pos);
      const _cycP = def._dtPlanetIntegrator(C.startModelYearWithCorrection, _jdToSIyearTools(_jdTTToolsFromUT(_jdHereP)));
      θ = (_cycP !== null ? _cycP : 0) * 2 * Math.PI * def._dtPlanetSign - def.startPos * d2r;
    } else {
      θ = def.speed * pos - def.startPos * d2r;
    }
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      let e;
      if (def._eccentricityKey && dynEcc[def._eccentricityKey] !== undefined) {
        e = def._eocDerived
          ? dynEcc[def._eccentricityKey] - C.eccentricityBase / 2   // Sun: eoc = e_dynamic - e_base/2
          : dynEcc[def._eccentricityKey] * def._eocFraction;        // Planets: eoc = e_dynamic × fraction
      } else {
        e = def.eccentricity;                                        // Moon, Pluto, etc: static
      }
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      nodes._meanAnomaly = M; // Store for parallax correction use
    }
    // Phase Z-B (2026-06): Sun longitude harmonics applied to SUN NODE only.
    // ────────────────────────────────────────────────────────────────────
    // The annual correction (~280" amplitude) closes the framework's
    // 200" Sun-vs-Meeus residual to ~7" (96% reduction). It is derived
    // from Earth-Sun geometry (framework eccentricityDerivedMean = 0.01545
    // vs Meeus IAU J2000 = 0.01671) and is NOT physically applicable to
    // planets — applying at the barycenter level rotates planets too,
    // degrading their baselines by 30-180" each.
    //
    // For Node-side scene-graph (this file), Sun-only is the correct fix:
    //   - No visualization concerns (the "black spot" visual bug only
    //     manifests in the browser scene)
    //   - Planet baselines stay pristine
    //   - Sun gets the full 96% Meeus improvement
    //
    // For src/script.js (browser scene), a different mechanism will be
    // needed to preserve visual integrity (e.g., barycenter-level + per-
    // planet inverse corrections, or accept the visual artifact in deep
    // zoom views). Mirror to script.js is deferred until that's resolved.
    //
    // Filter: only H-lattice-compliant terms.
    //   (a) year-multiples (integer year period),
    //   (b) small precession divisors 1..20 (Earth's Fibonacci named cycles
    //       H/3, H/5, H/8, H/13, H/16, etc.),
    //   (c) lunar precession divisors (auto-tracked from Meeus anchors via
    //       C.N_apsidalI, C.N_nodalI),
    //   (d) mid-range divisors that share a non-trivial prime factor with H
    //       (H = 3²·5·7451, so multiples of 3, 5, or 7451 qualify).
    // Everything else (gcd(d,H)=1 mid-range) is design-rule violating and
    // silently skipped.
    const SUN_HARM_ENABLED = process.env.SUN_HARMONICS_DISABLED !== '1';
    if (SUN_HARM_ENABLED && nodes === graph.sunNodes && C.SUN_LONGITUDE_HARMONICS) {
      // 9-1 S-P8: the filtered harmonic stack lives ONCE in @hum/physics/
      // sun/longitude-correction (J2000-fixed deps — the fitted convention).
      // Recover JD via epoch-consistent mSY so pos→jd round-trip is exact.
      const jd = _jdFromPosTools(pos);
      θ -= _sunLonCorr().correctionDegAt(jd) * d2r;
    }
    // Full Meeus Ch. 47 lunar perturbations (longitude + latitude, 60+60 terms)
    // Meeus formulas require T from standard J2000.0 (JD 2451545.0) in Julian centuries (36525 days)
    if (C.useVariableSpeed && def.lunarPerturbations) {
      // Recover JD via epoch-consistent mSY for pos→jd round-trip, then
      // UT→TT (mirrors src/script.js Phase 9.16): Meeus arguments are defined
      // in dynamical time — this shift was MISSING in the tools mirror (the
      // browser had it), which was the whole browser-vs-tools deep-time delta
      // (~4 yr of ΔT at +200 kyr → args differing by ~150° in ϖ).
      const d = _jdTTToolsFromUT(_jdFromPosTools(pos)) - C.j2000JD;
      // Phase 8.2-6: the full evaluation lives in @hum/physics/moon/series
      // (shared with the browser scene block — one implementation). The
      // engine keeps the pos→JD_TT conversion above and the node writes.
      const _sr = _moonSeriesM().sceneEvalAt(d);
      θ += _sr.thetaAddRad;
      nodes._meeusLatDeg = _sr.latDeg;
      nodes._meeusLonDeg = _sr.lonDeg;
      nodes._meeusT = _sr.T;
      // Series distance — exposed on the computePlanetPosition result so
      // meters can pair override angles with the OVERRIDE distance.
      nodes._meeusDistKm = _sr.distKm;
    }
    if (nodes.isEllipse) {
      const x = Math.cos(θ) * nodes.a;
      const z = Math.sin(θ) * nodes.b;
      nodes.pivot.px = x;
      nodes.pivot.pz = z;
      nodes.rotAxis.px = x;
      nodes.rotAxis.pz = z;
      nodes.orbit.ry = 0;
    } else {
      nodes.orbit.ry = θ;
    }
  }

  // Earth
  animateObject(graph.earthNodes, graph.earthNodes.def);

  // Earth precession layers
  const precLayers = [
    [graph.earthInclPrec, graph.earthInclPrec.def],
    [graph.earthEclipPrec, graph.earthEclipPrec.def],
    [graph.earthObliqPrec, graph.earthObliqPrec.def],
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateObject(nodes, def);

  // Sun
  animateObject(graph.sunNodes, graph.sunNodes.def);

  // Moon chain
  const moonLayers = [
    graph.moonApsidalPrec, graph.moonApsNodalPrec1, graph.moonApsNodalPrec2,
    graph.moonLunarLevel, graph.moonNodalPrec,
  ];
  for (const nodes of moonLayers) animateObject(nodes, nodes.def);
  animateObject(graph.moonNodes, graph.moonNodes.def);

  // Dynamic Earth ecliptic perihelion longitude (for geocentric elipticOrbit)
  const earthPeriPrec1Angle = graph.earthPeriPrec1.orbit.ry;
  const earthPeriEcl = ((earthPeriPrec1Angle + C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Compute yearsSinceBalanced for dynamic ecliptic inclination.
  // Uses _epochCache.mSY for pos→jd round-trip; yearsSinceBalanced then
  // uses the same mSY so the year count is epoch-consistent with the
  // caller's JD input.
  const currentJD = _jdFromPosTools(pos);
  const yearsSinceBalanced = (currentJD - C.balancedJD) / _epochCache.mSY;

  // Planets
  for (const key of Object.keys(graph.planetNodeMap)) {
    const pm = graph.planetNodeMap[key];
    animateObject(pm.eclip1, pm.eclip1.def);
    animateObject(pm.periFromE, pm.periFromE.def);
    animateObject(pm.eclip2, pm.eclip2.def);

    // Dynamic geocentric elipticOrbit for Type II + III planets
    if (pm.sceneData && (pm.sceneData.p.type === 'III' || pm.sceneData.p.type === 'II')) {
      const planetPrecAngle = pm.eclip1.orbit.ry;
      const planetPeriEcl = ((planetPrecAngle + pm.sceneData.p.longitudePerihelion * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const dw = earthPeriEcl - planetPeriEcl;
      let eo = 2 * dynEcc.earth * 100 * Math.sin(dw);
      if (pm.sceneData.p.antiPhase) eo = -eo;
      if (pm.sceneData.p.type === 'II') {
        // Type II: Mars orbit center offset + half Earth geocentric correction
        const eccDist = (dynEcc[key] || pm.sceneData.p.orbitalEccentricityJ2000) * pm.sceneData.d.orbitDistance * 100;
        eo = eccDist / 2 - eo / 2;
      }
      pm.realPeri.pivot.px = eo;
      pm.realPeri.rotAxis.px = eo;
    }

    // Dynamic orbital plane: update planet container tilt from dynamic ecliptic inclination
    // Uses dynamic ascending node (matching script.js updateOrbitalPlaneRotations)
    if (pm.sceneData && pm.sceneData.p.ascendingNodeInvPlane !== undefined) {
      const dynamicIncl = computeDynamicEclipticInclination(key, yearsSinceBalanced);
      const currentYear = C.startmodelYear + (currentJD - C.startmodelJD) / _epochCache.mSY;
      const dynamicAscNode = OE.calculateDynamicAscendingNodeFromTilts(
        pm.sceneData.p.orbitTilta, pm.sceneData.p.orbitTiltb, currentYear, key);
      const correctedAscNode = dynamicAscNode + (ascNodeToolCorrection[key] || 0);
      const angle = (-90 - correctedAscNode) * d2r;
      pm.planet.container.rx = Math.cos(angle) * -dynamicIncl * d2r;
      pm.planet.container.rz = Math.sin(angle) * -dynamicIncl * d2r;
    }

    animateObject(pm.realPeri, pm.realPeri.def);
    animateObject(pm.planet, pm.planet.def);
  }

  // Update all world matrices from root
  graph.root.updateWorldMatrix();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE PLANET POSITION — Main entry point
// ═══════════════════════════════════════════════════════════════════════════

// Cache the scene graph (built once, reused)
let _graph = null;
function getGraph() {
  if (!_graph) _graph = buildSceneGraph();
  return _graph;
}

/** Invalidate cached scene graph (forces rebuild on next use). */
function _invalidateGraph() {
  _graph = null;
  // §12g-5: the moon-series factory captures C.moonMeeusLpCorrection BY VALUE
  // at creation (measured: moon-eclipse-optimizer's mutations never reached
  // the series — the "after Lp" RMS line could not move and consecutive
  // --write runs oscillated between two Lp values instead of converging).
  // Dropping the series here re-wires it with the live constant; creation is
  // closure-only (the Meeus term arrays are module-level, not rebuilt).
  //
  // ONLY the series is dropped, deliberately. The other singletons capture no
  // fit-mutated values — MOON_CORRECTION reaches moonApparent through LIVE
  // getters already — and _chainCyclesM memoizes Float64Array integral
  // tables: a blanket reset here was measured to turn the ~1-min optimizer
  // step into a >10-min run by rebuilding those tables every iteration.
  _moonSeriesMTools = null;
}

/**
 * Compute geocentric RA/Dec for a planet or the Moon at a given Julian Day.
 *
 * @param {string} target - 'mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun'
 * @param {number} jd - Julian Day number
 * @returns {{ ra: number, dec: number, distAU: number, sunDistAU: number }}
 *   ra/dec in radians (Three.js spherical convention: theta/phi)
 */
// (Stage C ring lock REVERTED — mirrors src/script.js: the deep-time
// ring-vs-Moon misalignment was root-caused to the UT-vs-TT clock split
// between the Moon-chain layers and the override arguments; fixed at the
// source via the TT clock in the _dtMoonIntegrator branch and the series'
// UT→TT shift, after which the lock measured dA/dN ≈ 0 at every epoch and
// was removed.)

function computePlanetPosition(target, jd) {
  const graph = getGraph();

  // Sync epoch cache from this JD (no-op when DEEP_TIME_ENABLED=false).
  // Must precede pos computation so pos uses the epoch-appropriate mSY.
  _syncEpochForJD(jd);

  // Convert JD to pos via the integrated conversion (R4; script.js: posFromJD)
  const pos = _posFromJDTools(jd);

  // Animate all objects
  moveModel(graph, pos);

  // Get Earth reference frame (rotationAxis world matrix)
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();

  // Get target world position
  let targetWP;
  if (target === 'moon') {
    targetWP = graph.moonNodes.pivot.getWorldPosition();
  } else if (target === 'sun') {
    targetWP = graph.sunNodes.pivot.getWorldPosition();
  } else {
    const pm = graph.planetNodeMap[target];
    if (!pm) throw new Error(`Unknown target: ${target}`);
    targetWP = pm.planet.pivot.getWorldPosition();
  }

  // Get Sun world position for sun distance
  const sunWP = graph.sunNodes.pivot.getWorldPosition();

  // Distance from Earth
  const dx = targetWP[0] - earthRotAxisWP[0];
  const dy = targetWP[1] - earthRotAxisWP[1];
  const dz = targetWP[2] - earthRotAxisWP[2];
  const distAU = Math.sqrt(dx*dx + dy*dy + dz*dz) / 100;

  // Distance from Sun
  const sdx = targetWP[0] - sunWP[0];
  const sdy = targetWP[1] - sunWP[1];
  const sdz = targetWP[2] - sunWP[2];
  const sunDistAU = Math.sqrt(sdx*sdx + sdy*sdy + sdz*sdz) / 100;

  // Transform planet world position into Earth's equatorial frame
  // (same as earth.rotationAxis.worldToLocal(PLANET_POS) in script.js)
  const local = graph.earthNodes.rotAxis.worldToLocal(targetWP[0], targetWP[1], targetWP[2]);

  // Convert to spherical (matches Three.js Spherical.setFromVector3)
  const sph = cartesianToSpherical(local[0], local[1], local[2]);

  // Post-hoc RA/Dec corrections for geocentric parallax + precession drift (15/18/24-param)
  // Model: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + F*sin(2u) + G*cos(2u)
  //              + H*sin(3u) + I*cos(3u))/d + T*(J*sin(u) + K*cos(u))/d
  //              + L/s + M*sin(u)/d² + N*sin(2u)/s + O*cos(u)/s
  //              + P*T*sin(2u)/d + Q*T*cos(2u)/d + R*T*sin(u)/s
  //              + S*T/d + U*cos(u)/d² + V/s² + W*sin(u)/s² + X*cos(3u)/s + Y*sin(3u)/s
  //   where u = RA - ascendingNode(t), d = geocentric dist, s = sunDist, T = centuries from J2000
  if (target !== 'moon' && target !== 'sun') {
    const _p = C.planets[target];
    const _currentYear = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    const ascNode = OE.calculateDynamicAscendingNodeFromTilts(_p.orbitTilta, _p.orbitTiltb, _currentYear, target);
    const u = (sph.theta / d2r - ascNode) * d2r;
    const invD = 1 / distAU;
    const invS = 1 / sunDistAU;
    const T = (jd - C.j2000JD) / C.julianCenturyDays;  // centuries from J2000

    // Conjunction phase for Jupiter-Saturn interaction terms (AR-AW)
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    const conjPhase = 2 * Math.PI * (_yr - 2000) / C.tripleSynodicYears;

    // Sun mean longitude for eccentricity-offset terms (AX-BA)
    const _Lsun = (280.460 + 0.9856474 * (jd - C.j2000JD)) * d2r;

    // Planet mean anomaly for heliocentric orbital phase terms (BR-CA)
    // Uses dynamic M from EoC computation in animateObject (stored on planet node)
    // Only for inner planets (Mercury, Venus, Mars) — outer planets have too few M cycles
    const _useM = (target === 'mercury' || target === 'venus' || target === 'mars');
    let sinMplanet = 0, cosMplanet = 0, sin2Mplanet = 0, cos2Mplanet = 0;
    if (_useM) {
      const _pm = graph.planetNodeMap[target];
      const _Mplanet = _pm && _pm.planet._meanAnomaly != null ? _pm.planet._meanAnomaly : 0;
      sinMplanet = Math.sin(_Mplanet); cosMplanet = Math.cos(_Mplanet);
      sin2Mplanet = Math.sin(2 * _Mplanet); cos2Mplanet = Math.cos(2 * _Mplanet);
    }

    // Phase 8.3 L8: the fitted 80-slot basis lives ONCE in
    // @hum/physics/planets/corrections (browser association order — this
    // mirror carried invD2·invD where the basis uses the precomputed invD3
    // at five slots; any last-bit drift is measured by the fixtures).
    const _pState = { u, invD, invS, T, cp: conjPhase, Lsun: _Lsun,
                      sinM: sinMplanet, cosM: cosMplanet, sin2M: sin2Mplanet, cos2M: cos2Mplanet };
    const _evalParallax = require('@hum/physics/planets/corrections').evaluateParallaxBasis;
    const dc = C.ASTRO_REFERENCE.decCorrection[target];
    if (dc) {
      sph.phi += _evalParallax(dc, _pState) * d2r;
    }

    const rc = C.ASTRO_REFERENCE.raCorrection && C.ASTRO_REFERENCE.raCorrection[target];
    if (rc) {
      sph.theta -= _evalParallax(rc, _pState) * d2r;
    }
  }

  // Gravitation correction (per-planet synodic periods, planet-planet perturbations)
  // 8.3: term evaluation shared (@hum/physics/planets/corrections); applied
  // PER TERM here — order and sign are engine application semantics.
  const gravCorr = C.GRAVITATION_CORRECTION && C.GRAVITATION_CORRECTION[target];
  if (gravCorr) {
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    const _gravDeltas = require('@hum/physics/planets/corrections').gravitationTermDeltasDeg(gravCorr, _yr - 2000);
    for (const gt of _gravDeltas) {
      sph.theta -= gt.raDeg * d2r;
      sph.phi += gt.decDeg * d2r;
    }
  }

  // Elongation offset correction (elongation × Earth perihelion geometry)
  // Applied to inner planets: Venus, Mars
  // 8.3: the fitted 21-slot basis lives ONCE in @hum/physics/planets/
  // corrections, in the BROWSER association form (precomputed invD²) — this
  // mirror carried inline invD·invD at the six d² slots per table; the
  // fixture recorders measured the last-bit drift at extraction.
  const _elCorr = C.ELONGATION_CORRECTION && C.ELONGATION_CORRECTION[target];
  if (_elCorr) {
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    // Compute Sun RA for elongation
    const _sunSph = computePlanetPosition('sun', jd, graph);
    const _sunRA = _sunSph.ra;  // radians
    const _venusRA = sph.theta; // radians (already corrected by parallax + conjunction)
    const _elong = _venusRA - _sunRA;
    // Earth perihelion angle
    const _wE = (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 360 / (C.H / 16) * (_yr - 2000)) * d2r;
    const _vFromWE = _venusRA - _wE;
    // Planet-Earth synodic phase (exact from integer orbit count)
    const _plCount = Math.round(C.totalDaysInH / C.planets[target].solarYearInput);
    const _synVE = 1 / Math.abs(1 - _plCount / C.H);
    const _synPhase = 2 * Math.PI * (_yr - 2000) / _synVE;
    const _evalElong = require('@hum/physics/planets/corrections').evaluateElongationBasis;
    const _elState = { elongRad: _elong, vFromWERad: _vFromWE, synPhaseRad: _synPhase, invD: 1 / distAU };
    sph.theta -= _evalElong(_elCorr, _elState, 'ra') * d2r;
    sph.phi += _evalElong(_elCorr, _elState, 'dec') * d2r;
  }

  // Planet offset correction (time-dependent, fitted from Tier 1 observed data)
  // PLANET_OFFSET_CORRECTION removed — the inclination geometry residual for Mercury
  // is now handled by the 62p parallax BJ/BK terms (sin/cos(u-Lsun)/d²).
  // See docs/72-planet-offset-correction.md for the physics derivation.

  // Full Meeus Ch. 47 post-hoc correction: override both RA and Dec
  if (target === 'moon' && C.useVariableSpeed &&
      graph.moonNodes._meeusLonDeg !== undefined && graph.moonNodes._meeusLatDeg !== undefined) {
    // Use framework's authoritative obliquity (matches scene kinematic tilt).
    // Was: Meeus linear (obliquityJ2000_deg - 0.01300*T); framework harmonics
    // diverge by 11" at modern → sub-km Moon position effect at eclipse epochs.
    // Consistent with src/script.js Moon Meeus overlay fix (commit 5443a55).
    // NOTE (Stage C investigation): an empirical scene-basis conversion was
    // tested here (sun-plane and moon-base-plane variants) against the
    // moon-on-ring meter and FALSIFIED — the conversion frame is correct.
    // The ~9-10° plane divergence measured at the time was the then-missing
    // Phase 9.13 _dtMoonIntegrator mirror branch (added; planes now ≤1.0°),
    // and the residual phase misalignment was resolved by the TT clock
    // alignment (Moon-chain layers + args on one clock).
    const currentYear = C.balancedYear + (jd - C.balancedJD) / _epochCache.mSY;
    // Phase 8.2-7: ecl→eq + aberration + the fitted MOON_CORRECTION patch
    // live in @hum/physics/moon/apparent. S8: this engine RECOMPUTES the
    // obliquity for the scene year (the browser passes its live scene value).
    const _ov = _moonApparentM().overrideRaDec({
      lonDeg: graph.moonNodes._meeusLonDeg,
      betRad: graph.moonNodes._meeusLatDeg * d2r,
      meeusT: graph.moonNodes._meeusT,
      obliquityDeg: OE.computeObliquityEarth(currentYear),
    });

    // (Stage C note: a rigid ring-frame placement mirror was implemented and
    // measured to be an exact identity — frames are rigid; reverted.)
    sph.theta = _ov.raRad;
    sph.phi = Math.PI / 2 - _ov.decRad;
  }

  // Extract dynamic mean anomaly for inner planets (from EoC computation)
  let meanAnomaly = 0;
  if (target !== 'moon' && target !== 'sun') {
    const _pm = graph.planetNodeMap[target];
    if (_pm && _pm.planet._meanAnomaly != null) {
      meanAnomaly = _pm.planet._meanAnomaly;
    }
  }

  return {
    ra: sph.theta,   // radians
    dec: sph.phi,    // radians (Three.js phi convention)
    distAU,
    sunDistAU,
    meanAnomaly,     // radians (from EoC computation, heliocentric orbital phase)
    // Moon override only: the SERIES distance the browser places the Moon at
    // (km). distAU above stays the raw pivot distance — pair angles with
    // THIS for any override-vs-ring comparison (meter distance-pairing fix).
    meeusDistKm: (target === 'moon' && C.useVariableSpeed) ? graph.moonNodes._meeusDistKm : undefined,
  };
}

/**
 * Convert Three.js spherical dec (phi) to standard declination in degrees.
 * phi in [0, π] → dec in [-90°, +90°]
 */
function phiToDecDeg(phi) {
  const decRad = (phi <= 0) ? phi + Math.PI / 2 : Math.PI / 2 - phi;
  return decRad * (180 / Math.PI);
}

/**
 * Convert Three.js spherical RA (theta) to degrees [0, 360).
 */
function thetaToRaDeg(theta) {
  let deg = theta * (180 / Math.PI);
  return ((deg % 360) + 360) % 360;
}

/**
 * Convert Three.js spherical RA (theta) to hours [0, 24).
 */
function thetaToRaHours(theta) {
  if (theta < 0) theta += 2 * Math.PI;
  return theta * 12 / Math.PI;
}

/**
 * Get Sun's world-space angle (for sidereal year measurement).
 * Returns atan2(z, x) in degrees [0, 360).
 */
function getSunWorldAngle(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);
  moveModel(graph, pos);
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  let angle = Math.atan2(sunWP[2], sunWP[0]) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
}

/**
 * Get WobbleCenter-Sun distance in AU (for perihelion/aphelion detection).
 * Uses the fixed wobble center (scene origin) → Sun, NOT Earth → Sun.
 * This measures the true anomalistic orbit without axial-precession noise.
 */
function getWobbleSunDistAU(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);
  moveModel(graph, pos);
  // WobbleCenter is at the scene origin (0,0,0)
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  return Math.sqrt(sunWP[0]*sunWP[0] + sunWP[1]*sunWP[1] + sunWP[2]*sunWP[2]) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// FAST SUN POSITION — Only animates Earth precession + Sun node.
// Skips all planets, Moon, and dynamic ascending node computations.
// ~5-10x faster than computePlanetPosition('sun', jd).
// Use for cardinal point / year-length exports that scan Sun RA at high frequency.
// ═══════════════════════════════════════════════════════════════════════════

function computeSunPositionFast(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);

  // Compute Earth eccentricity for EoC — epoch-consistent mSY for round-trip.
  // pos IS the tropical-year count from startmodelJD (see the block at
  // computePositions): startModelYearWithCorrection + pos, one convention.
  const currentYear = C.startModelYearWithCorrection + pos;
  const earthEcc = OE.computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude);

  // Animate a single node: orbit.ry = θ (with EoC if applicable)
  function animateFast(nodes, def) {
    let θ;
    // Phase 9.12 (B-full): tagged Earth H-cycle precession objects use
    // integrated phase ∫1/H(t')dt' under deep-time. See animateObject in
    // moveModel() for the identical branch.
    if (DEEP_TIME_ENABLED && Number.isFinite(def._dtCycleN)) {
      const cycles = DT.cyclesBetweenYears(C.balancedYear, currentYear, def._dtCycleN);
      θ = (cycles !== null ? cycles : 0) * 2 * Math.PI * def._dtCycleSign;
    } else {
      θ = def.speed * pos - def.startPos * d2r;
    }
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      const e = def._eocDerived
        ? earthEcc - C.eccentricityBase / 2
        : def.eccentricity;
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }
    // Phase Z-B (2026-06): Sun longitude harmonics applied to SUN NODE only.
    // Mirror of the moveModel() Sun-only block above. 9-1 S-P8: both blocks
    // delegate to @hum/physics/sun/longitude-correction.
    const SUN_HARM_ENABLED = process.env.SUN_HARMONICS_DISABLED !== '1';
    if (SUN_HARM_ENABLED && nodes === graph.sunNodes && C.SUN_LONGITUDE_HARMONICS) {
      θ -= _sunLonCorr().correctionDegAt(jd) * d2r;
    }
    nodes.orbit.ry = θ;
  }

  // Animate Earth + precession chain + Sun only
  animateFast(graph.earthNodes, graph.earthNodes.def);
  const precLayers = [
    [graph.earthInclPrec, graph.earthInclPrec.def],
    [graph.earthEclipPrec, graph.earthEclipPrec.def],
    [graph.earthObliqPrec, graph.earthObliqPrec.def],
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateFast(nodes, def);
  animateFast(graph.sunNodes, graph.sunNodes.def);

  // Update world matrices from root
  graph.root.updateWorldMatrix();

  // Extract Sun position in Earth's equatorial frame
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();
  const sunWP = graph.sunNodes.pivot.getWorldPosition();

  const dx = sunWP[0] - earthRotAxisWP[0];
  const dy = sunWP[1] - earthRotAxisWP[1];
  const dz = sunWP[2] - earthRotAxisWP[2];
  const distAU = Math.sqrt(dx*dx + dy*dy + dz*dz) / 100;

  const local = graph.earthNodes.rotAxis.worldToLocal(sunWP[0], sunWP[1], sunWP[2]);
  const sph = cartesianToSpherical(local[0], local[1], local[2]);

  // World-angle (sidereal position) and wobble-center distance
  let worldAngle = Math.atan2(sunWP[2], sunWP[0]) * 180 / Math.PI;
  worldAngle = ((worldAngle % 360) + 360) % 360;
  const wobbleDistAU = Math.sqrt(sunWP[0]*sunWP[0] + sunWP[1]*sunWP[1] + sunWP[2]*sunWP[2]) / 100;

  return { ra: sph.theta, dec: sph.phi, distAU, sunDistAU: distAU, worldAngle, wobbleDistAU };
}

module.exports = {
  computePlanetPosition,
  computeSunPositionFast,
  getSunWorldAngle,
  getWobbleSunDistAU,
  phiToDecDeg,
  thetaToRaDeg,
  thetaToRaHours,
  buildSceneGraph,
  moveModel,
  _invalidateGraph,
  // Expose internals for testing
  Mat4,
  Node,
  cartesianToSpherical,
  _getGraphForProbe: () => getGraph(),   // research probes: the internal graph AFTER a computePlanetPosition call
  _moonSeriesForProbe: () => _moonSeriesM(),   // research probes: the shared Meeus series (incl. the truncated eclipse-finder forms)
};
