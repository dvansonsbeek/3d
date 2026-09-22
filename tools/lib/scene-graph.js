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
// perf: cached lazy requirer. A bare `require()` inside a per-call function
// re-runs module RESOLUTION every call (~30 µs: internalModuleStat +
// package.json reads) — measured 65% of computeSunPositionFast's 0.25 ms,
// which made the Step-6a export ~13 h instead of ~2 h. The laziness (circular
// import order) is preserved; the module object is identical, so bit-exact.
const _modCache = Object.create(null);
const _req = (p) => _modCache[p] || (_modCache[p] = require(p));
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
  const L0_j2000_deg = C.ASTRO_REFERENCE.sunMeanLongitudeJ2000_deg;   // Sun mean lon at J2000 (astro-reference.json — was a duplicated 280.46646 literal, value-identical)
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

  // ── Eccentricity: the model's ONE law (unification) — the H/3 line with
  // base' derived from e(J2000); twin of src/script.js _eclSunLon and of
  // packages/physics model.js eccentricityAt. (The H/16 law-of-cosines form
  // that used to sit here belongs to ϖ, not e — doc 108.)
  const e = OE.computeEccentricityEarth(year);

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
const { driver2PeriodSecondsAtAge } = _req('@essrt/physics/planets/orbit-chain');
for (const _pk of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const T0 = C.planets[_pk].solarYearInput * 86400;
  // 8.3 L6: Driver 2 shared; one period fn per planet (stable identity for
  // the chain-cycles tables).
  const periodFn = (t_Ma) => driver2PeriodSecondsAtAge(t_Ma, T0, DT.SOLAR_MASS_LOSS_FRAC_PER_YR);
  _mcPlanet[_pk] = (a, b) => _moonChainCyclesTools(periodFn, a, b);
}
const _mcJupiter = _mcPlanet.jupiter;   // the deep-time A2 argument feed (unchanged identity semantics)

// Phase 8.2-5: the argument skeleton lives ONCE in
// @essrt/physics/moon/arguments (the _FW_MOON bundle, the Sun secular
// deviations — now on the browser's CALENDAR year coordinate, closing S3 —
// the two bounded Lp carriers with the anchor-const e0 (this mirror used
// _fwEarthEcc(0)), and both argument branches). This engine injects its own
// chain wrappers; env toggles ride along.
const { createMoonArguments, jdToDecimalYear } = _req('@essrt/physics/moon/arguments');
let _moonArgsMTools = null;
function _moonArgsM() {
  if (_moonArgsMTools === null) {
    const DTmod = DT;   // perf: the top-level binding — no per-call module resolution
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
        // Decision (ii): the lunar chain reads the ONE deep e end to end
        eccE0: DTmod._deepEcc().e0,
      },
      fns: {
        eccAt: (tYr) => DTmod._deepEcc().eccAt(tYr),
        channelIntegral: (T, s) => DTmod._deepEcc().channelIntegral(T, s),
        // Layer A / item 3c (plan 06): the arguments' obliquity carrier reads the
        // PUBLISHED ε (the one-source movement), not the K comb — the browser's
        // _sceneEpsTargetDeg / model.js oneSourceM.epsAt twin.
        computeObliquityEarth: (y) => _oneSourceM().epsDeg(y),
        jdToSIyear: _jdToSIyearTools,
        tropicalOrbitsBetween: _mcTropical,
        apsidalOfDateCyclesBetween: _mcApsidalOfDate,
        nodalOfDateCyclesBetween: _mcNodalOfDate,
        cyclesBetween: DTmod.cyclesBetweenYears,
        isDeepTime: () => DEEP_TIME_ENABLED,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
        // (d′) of-date rate completion — MATCHED TRIPLE with model.js and
        // the browser: dynamical (tweakpane day-form) + kinematic beats.
        pDynDegPerYearAt: /** @param {number} year */ (year) => {
          const sid = DTmod.computeSiderealYearDaysDirect(year);
          const sol = DTmod.computeSolarYearDaysDirect(year);
          return 360 * (sid - sol) / sid;
        },
        pKinDegPerYearAt: /** @param {number} year */ (year) => {
          const t = (C.startmodelYear - year) / 1e6;
          const sid = DTmod.meanSiderealYearSecondsAtAge(t);
          const trop = DTmod.meanTropicalYearSecondsAtAge(t);
          return (sid === null || trop === null) ? 0 : 360 * (sid - trop) / sid;
        },
      },
    });
  }
  return _moonArgsMTools;
}

/** Phase-aware channel-rate integral — delegates to the shared
 *  @essrt/physics moon eccentricity channel (8.2-2). This mirror once
 *  recomputed g₀ from _fwEarthEcc(0), which under integrated phase is not
 *  exactly the anchor (the R3 drift correction); the channel's g₀ const is
 *  the browser's convention and now the only one. */
function _fwChannelIntegralTools(T, s) {
  return DT._deepEcc().channelIntegral(T, s);   // decision (ii): the ONE deep e
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
// @essrt/physics/chain-cycles. This mirror previously diverged from the
// browser on THREE points, all closed by the shared module:
//   S5  — no snapshot branch / periodFn(0) memo / fallback cache here;
//   S12 — the age anchor was a literal 2000 where the browser uses
//         startmodelYear (2000.5, the scene's t_Ma convention);
//   (the table still anchors C(2000) = 0 — grid anchor ≠ age anchor,
//   deliberately, cf. the phase machinery's anchor pair).
const { createChainCycleIntegrator } = _req('@essrt/physics/chain-cycles');
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

// The Moon's scene RA/Dec: ecliptic → equatorial only (plan 06 R3 item 1 —
// the "D5 derived optics" aberration layer and the fitted RA/Dec patches
// left; mirror of src/script.js _moonApparent, record in
// @essrt/physics moon/apparent.cjs). Phase 8.2-7: the conversion lives ONCE
// in the package (S8: obliquity stays engine-injected — this engine
// recomputes it for the scene year at the call site).
const { createMoonApparent } = _req('@essrt/physics/moon/apparent');
let _moonApparentMTools = null;
function _moonApparentM() {
  if (_moonApparentMTools === null) _moonApparentMTools = createMoonApparent();
  return _moonApparentMTools;
}

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
  // Plan 06 R3 item 2 — THE SCENE CLOCK IS TRUE TT: the model's absolute ΔT
  // is deltaTStart + curve (the published ΔT surface; the besselian and the
  // registry instruments add the same bridge). The curve alone is the
  // eclipse FINDERS' certified axis, which had leaked into the scene: at true
  // UT the scene Moon sat 30″ west (0.549″/s × 54.55 s), the Sun 2.2″, and
  // the retired moonMeeusLpCorrection (+32.75″) had compensated it here.
  const t_Ma = (C.startmodelYear - jdToDecimalYear(jd)) / 1e6;
  const dT = DT.meanDeltaTSecondsAtAge(t_Ma);
  return Number.isFinite(dT) ? jd + _TT_BRIDGE_SECONDS / 86400 + dT / 86400 : jd;
}
/** deltaTStart — the ΔT trend anchor at J2000 (astro-reference earthOrbital),
 *  read from the package constants (the one home every runtime shares). */
const _TT_BRIDGE_SECONDS = _req('@essrt/physics').DEFAULT_CONSTANTS.earthOrbital.deltaTStart;
/** The finder-axis JD for a true-UT JD (the package's finder-axis APIs add the
 *  curve themselves; the bridge is the caller's — mirror of the besselian's jb). */
function _finderAxisJdTools(jdUT) { return jdUT + _TT_BRIDGE_SECONDS / 86400; }
/** The FINDERS' curve-only ΔT (seconds) at a JD — the certified eclipse-finder
 *  convention (mirror of the browser's _eclDeltaT); no bridge. */
function _finderCurveDeltaTTools(jd) {
  if (!DEEP_TIME_ENABLED) return 0;
  const dT = DT.meanDeltaTSecondsAtAge((C.startmodelYear - jdToDecimalYear(jd)) / 1e6);
  return Number.isFinite(dT) ? dT : 0;
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

// Phase 8.2-6: the Meeus Ch. 47 series lives ONCE in @essrt/physics/moon/series.
const { createMoonSeries } = _req('@essrt/physics/moon/series');
let _moonSeriesMTools = null;
function _moonSeriesM() {
  if (_moonSeriesMTools === null) {
    const DTmod = DT;   // perf: the top-level binding — no per-call module resolution
    _moonSeriesMTools = createMoonSeries({
      constants: {
        moonL: MEEUS_LUNAR.longitudeTerms.terms,
        moonB: MEEUS_LUNAR.latitudeTerms.terms,
        moonR: MEEUS_LUNAR.distanceTerms.terms,
        moonRMeanKm: MEEUS_LUNAR.distanceTerms.meanKm,
        moonDistanceJ2000Km: C.moonDistance,
        j2000JD: C.j2000JD, julianCenturyDays: C.julianCenturyDays,
        moonMeeusLpCorrectionDeg: C.moonMeeusLpCorrection,
        fwA2RateDegPerCy: _FW_A2_RATE, fwA3RateDegPerCy: _FW_A3_RATE,
      },
      fns: {
        argsAt: _moonArgsAtTools,
        eFactorForD: _fwEFactorTools,
        eFactorAtJdTT: (jdTT, T, T2) => _fwEFactorTools(jdTT - C.j2000JD, T, T2),
        // 20.3d(i): the Driver-1 ratio at the EVALUATED epoch (per-jd pure
        // evaluator, matched with the browser and package getters;
        // bit-equal to C.moonDistance at year 2000). Snapshot mode
        // (SG_DEEP_TIME=0) keeps the J2000 constant — prior bit-parity.
        getMoonDistanceKm: (jdTT) => {
          if (!DEEP_TIME_ENABLED || jdTT === undefined) return C.moonDistance;
          const d = DTmod.meanMoonDistanceMetresAtAge((C.startModelYearWithCorrection - _jdToSIyearTools(jdTT)) / 1e6);
          return d === null ? C.moonDistance : d / 1000;
        },
        getEccentricityBase: () => C.moonOrbitalEccentricity,
        // The TRUNCATED finder forms keep the FINDERS' certified curve-only axis
        // (mirror of the browser's _eclDeltaT; the package finders read the same
        // convention) — the true-TT bridge of R3 item 2 belongs to the SCENE walk
        // (_jdTTToolsFromUT at the sceneEvalAt call site), never here.
        deltaTSeconds: (jd) => _finderCurveDeltaTTools(jd),
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
  // Decision (ii): the ONE deep e (its eFactorAt divides by the e0 anchor
  // const — exact at J2000 by the anchored-remainder construction).
  return DT._deepEcc().eFactorAt(d_days / C.inputMeanSolarYear);
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
    this.extraMatrix = null;               // one-source tilt hook (see updateWorldMatrix)
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  updateWorldMatrix() {
    this.localMatrix.compose(this.px, this.py, this.pz, this.rx, this.ry, this.rz);
    // One-source tilt correction hook (C-4b): an optional PRE-multiplied
    // local matrix — the exact Node twin of the browser's wrapper Group
    // (a parent-frame rotation about this node's origin). null when the
    // one-source option is off; nothing else ever sets it.
    if (this.extraMatrix) {
      this.localMatrix.multiplyMatrices(this.extraMatrix, this.localMatrix);
    }
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
// @essrt/physics/sun/longitude-correction (J2000-fixed deps — the fitted
// convention). This engine's TWO former inline copies (moveModel + the
// fast animator) both delegate through this lazy factory.
const { createSunLongitudeCorrection } = _req('@essrt/physics/sun/longitude-correction');
// SW-1 EXPERIMENT (scene-wheel Sun unification): E5_WHEEL_SUN=1 makes the
// moveModel Sun node ride the CERTIFIED tier Sun via one δ term (see the
// moveModel sun block); computeSunPositionFast is deliberately untouched
// (the Step-6a fit instrument — SW-0 measured the fits invariant anyway).
const _E5_WHEEL_SUN = process.env.E5_WHEEL_SUN !== '0';   // default ON (mirrors the browser flag); E5_WHEEL_SUN=0 restores legacy
// FQ-3 W1 (plan §12i FQ-3): exact-Kepler wheel Sun. The raw wheel realizes
// the split composition (parent center-offset + half-EoC at e−base/2),
// which sits 279.0″ annual + 8.96″ semi from full Kepler — the content the
// fitted SUN_LONGITUDE_HARMONICS were absorbing (W0 attribution: the match
// is exact to 0.1″, incl. the 61.8″ quadrature from the realized offset
// direction). With this flag ON the sun node applies the DERIVED corrector
// Δ = EoC_full(e) − EoC_half(e−base/2) − geoTerm(offset vector, live parent
// phases) in θ-space with the first-order Jacobian, and the fitted
// harmonics are retired from this display path (registry constants stay;
// computeSunPositionFast is the declared Step-6a instrument and keeps the
// legacy geometric wheel). Zero fitted constants; every input is the
// branch's own live value, so the form holds in both epoch modes.
const _FQ3_EXACT_SUN = process.env.FQ3_EXACT_SUN !== '0'; // default ON; FQ3_EXACT_SUN=0 restores the fitted-correction path
let _e5TierM = null;
function _e5Tier() {
  if (!_e5TierM) {
    // Plan 06 R1 (measured): createModel() WITHOUT the shipped secular-series
    // artifact builds the hybrid on the ζ-mode tail — a DIFFERENT certified
    // Sun from the API's and the audit's (75″ at 0 AD, 168″ at −1000, 377″ at
    // −2500 in λ; the recorded 3c trap, third instance). The overlay's target
    // Sun is the shipped configuration.
    let artifact;
    try { artifact = require('../../data/nbody-secular-series.json'); } catch { artifact = undefined; }
    _e5TierM = _req('@essrt/physics').createModel(undefined, artifact ? { secularSeriesArtifact: artifact } : undefined);
  }
  return _e5TierM;
}
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
    // ECCENTRICITY UNIFICATION (D6): the Earth wobble circle (radius
    // eccentricityAmplitude·100, H/13) is RETIRED — its partner, the second
    // eccentricity arm on the barycenter, is gone, so the "wobble centre" no
    // longer cancels anything: measured from it the perihelion advanced 8%
    // too fast (anomalistic year 365.2611 d vs IAU 365.2596; A/e ≈ 8.8%),
    // while from Earth the one-law scene reproduces IAU (365.25962 d,
    // 1.7180 °/cy). With radius 0 the wobble centre IS Earth, so every
    // instrument that reads "from the wobble centre" (getWobbleSunDistAU, the
    // Step-6a export, the report's Method B) is Earth-frame by construction.
    // eccentricityAmplitude survives only as the Law-4 K calibration input.
    orbitRadius: 0,
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
    _dtCycleN: 3, _dtCycleSign: +1,   // Phase 9.12: H/3 apsidal precession (historical name: inclination), prograde
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
    orbitCentera: -C.eccentricityBaseDerived * 100, orbitCenterb: 0, orbitCenterc: 0,   // the one law's mean offset base' (unification)
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360),
    speed: -Math.PI * 2 / (H / 16),
    _dtCycleN: 16, _dtCycleSign: -1,   // Phase 9.12: H/16 perihelion precession inner, retrograde

  });
  earthPeriPrec1.pivot.addChild(earthPeriPrec2.container);

  // ECCENTRICITY UNIFICATION (plan IP-eccentricity-unification, Phase 2):
  // the second eccentricity arm (radius A, net rotation −H/13 through the
  // chain = co-rotating with the axial precession) is RETIRED — |e| is
  // frame-invariant and the model's one law is base'(1 + cos θ₃/2), whose
  // modulation the wheel evaluates analytically every frame (dynEcc.earth).
  // The barycenter node is now the Sun's orbit centre itself.
  const barycenter = makePrecessionNode('barycenter', {
    orbitRadius: 0,
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

// ═══════════════════════════════════════════════════════════════════════════
// ONE-SOURCE MOVEMENT (C-4b) — the CSV re-base mode. When enabled, Earth's
// scene ε(t) and e(t) come from the SAME construction the browser's
// ?hybridSpin runs (tools/lib/deep-orbital-history.createOneSourceMovement:
// banked engine series inside ±10 Myr, deep mode tail beyond, α(t) on the
// SECULAR H(t) scaling): e substitutes at the two scene-driving sites
// (moveModel dynEcc.earth / computeSunPositionFast earthEcc — the geometric
// PeriPrec2 offset and the Sun EoC inherit it), and ε is driven
// geometrically by the extraMatrix twin of the browser's tilt-correction
// wrapper (rotation about the node line û = a×n by ε_geom − ε_target,
// pulled into the rotAxis parent frame; Earth sits at the origin —
// orbitRadius 0 — so the pure rotation IS the wrapper). Historically an
// option (default off, the K device byte-identical); since plan 06 S3c the
// default and since item 3 the ONLY Node scene — see the block below.
// ═══════════════════════════════════════════════════════════════════════════
// Plan 06 Phase 3 S3c — the Node scene renders the one-source movement (ONE
// scene in every runtime, the browser's D4 default). Measured at the flip:
// eclipse audit and lunar alignment identical; the tools-lib fixture moved
// 1e-7 in-era and up to 46 % at the ±100 Myr probes — the Node deep-time
// scene joining the simulator's.
// Plan 06 item 3 (the deferred K-device roles): the series artifact is a
// TRACKED file, so its absence is a broken checkout, not a mode — an absent
// artifact is a loud error, never a silently different (K-device) scene. The
// SG_ONE_SOURCE switch and the setOneSourceMovement setter are gone with the
// K branches they selected; the browser's K device remains only its pre-load
// fallback (until the async artifact arrives), a path Node never has.
let _osmInstance;   // undefined = unresolved · else {epsDeg, e, periOfDateDeg, …}
function _oneSourceM() {
  if (_osmInstance === undefined) {
    const M = require('./deep-orbital-history.js').createOneSourceMovement();
    if (!M) throw new Error('scene-graph: data/nbody-secular-series.json is absent — the one-source movement is the only Node scene (plan 06 item 3); restore the tracked artifact');
    _osmInstance = M;
  }
  return _osmInstance;
}
// The sampling year: the browser's _yearForObliquity convention exactly —
// SI-year mapping in deep-time mode, the linear tropical count otherwise.
function _osmYearForJD(jd, linearYear) {
  return DEEP_TIME_ENABLED ? _jdToSIyearTools(jd) : linearYear;
}
// The tilt correction (mirror of src/script.js updatePredictions' wrapper
// block): read the K geometry (rotAxis world Y vs barycenter-pivot world Y —
// no scale anywhere, so the matrix Y columns ARE the rotated unit vectors),
// rotate about û = a×n by (ε_geom − ε_target) in world, expressed in the
// parent frame as Rpᵀ·K·Rp. COST CONTRACT (the Step-6a exporter runs this
// per probe): the caller clears extraMatrix BEFORE its own full
// updateWorldMatrix (that pass IS the reset — see the clears at the top of
// moveModel / computeSunPositionFast), and the final recompute touches only
// the rotAxis LEAF — the Sun and barycenter are NOT under rotAxis (measured;
// rotAxis has no children), so nothing else changes. Self-clears when off.
// D4c — THE APSIDAL-WHEEL FLIP: the last scene-K element. The wheel pair
// (earthPeriPrec1/2, the constant-rate H/16 device) keeps its K animation,
// and under the one-source option a RELATIVE correction rotates it onto the
// engine's ϖ(t): Δrel = Δϖ_engine − Δphase_K, both measured from J2000 —
// zero at J2000 by construction (era continuity; the anchor is captured at
// runtime, no pasted numbers). Applied to θ_p1 (+) and θ_p2 (−, the exact
// mirror — preserving the barycenter frame's net-zero rotation) AND to the
// Sun's EoC mean-anomaly phase (the offset direction and the EoC phase must
// never disagree — the 6c anomalistic blowup was that disagreement,
// measured). Deep-time-ON only: the K phase term uses the integrated ∫1/H
// wheel form; under SG_DEEP_TIME=0 the wheel stays K (the documented
// snapshot-mode caveat class). Wrapped ϖ is safe — the wheel angle enters
// only trigonometrically (S¹), so 360° branch jumps are invisible.
let _osmPeriAnchor = null;   // {engDeg, cyc} at J2000, captured once
function _osmPeriDeltaRad(jd, currentYear) {
  if (!DEEP_TIME_ENABLED) return 0;
  const M = _oneSourceM();
  if (!_osmPeriAnchor) {
    const y2000 = C.startModelYearWithCorrection + _posFromJDTools(2451545.0);
    _osmPeriAnchor = {
      engDeg: M.periOfDateDeg(_osmYearForJD(2451545.0, y2000)),
      cyc: DT.cyclesBetweenYears(C.balancedYear, y2000, 16) ?? 0,
    };
  }
  const dEng = (M.periOfDateDeg(_osmYearForJD(jd, currentYear)) - _osmPeriAnchor.engDeg) * d2r;
  const cycNow = DT.cyclesBetweenYears(C.balancedYear, currentYear, 16);
  const dK = ((cycNow ?? 0) - _osmPeriAnchor.cyc) * 2 * Math.PI;   // PeriPrec1 sign +1
  return dEng - dK;
}

// D4d — THE EQUINOX-PHASE FLIP (the actual last scene-K element, found by
// the tropical-year-vs-CSV comparison: the C-3 wrapper preserved the node
// line BY DESIGN, so the scene's axial-precession phase stayed on the K
// H/13 wheel — measured as ±45-60 s of mean-tropical-year structure in the
// deep bands vs the hybrid's own equinox). Same relative construction as
// the D4c apsidal flip: Δψ = Δλ_eq,hybrid − Δphase_K(H/13), both measured
// from J2000 (runtime anchor, zero at J2000 by construction; the K wheel
// is RETROGRADE, sign −1, exactly the earth _dtCycleN=13 device). Applied
// as an azimuth rotation about the sun-plane normal BEFORE the ε
// correction about the resulting node line. Deep-time-ON only.
// D4d-rev (the K-reference correction, measured): the K term must be the K
// scene's FULL geometric equinox motion — the analytic H/13 wheel alone
// under-subtracts the K plane-wheels' node contribution (the K-analog
// planetary term, measured 0.057″/yr = the residual −1.2 s of tropical
// year). So the K reference is now READ FROM THE GEOMETRY: the azimuth of
// the uncorrected node line û = a×n against the fixed world-x reference
// projected into the plane, J2000-anchored by a one-time guarded capture
// (a nested pure-K evaluation at J2000 — corrections are off while
// capturing, and the capture runs BEFORE the caller's own animation so the
// graph state is naturally restored by it).
let _osmEqxGeoAnchor = null;    // {lamK2000Rad, hyb2000Deg}
let _osmEqxFrameHybRad = null;  // per-frame wrapped hybrid equinox advance since J2000 (rad)
let _osmCapturing = false;
function _osmNodeAzimuthRad(ax, ay, az, nx, ny, nz) {
  let ux = ay * nz - az * ny, uy = az * nx - ax * nz, uz = ax * ny - ay * nx;
  const ul = Math.hypot(ux, uy, uz);
  if (ul < 1e-12) return 0;
  ux /= ul; uy /= ul; uz /= ul;
  // world-x projected into the plane as the azimuth origin
  let xx = 1 - nx * nx, xy = -nx * ny, xz = -nx * nz;
  const xl = Math.hypot(xx, xy, xz);
  xx /= xl; xy /= xl; xz /= xl;
  const yx = ny * xz - nz * xy, yy = nz * xx - nx * xz, yz = nx * xy - ny * xx;
  return Math.atan2(ux * yx + uy * yy + uz * yz, ux * xx + uy * xy + uz * xz);
}
function _osmEqxPrep(jd, currentYear) {
  if (!DEEP_TIME_ENABLED || _osmCapturing) { _osmEqxFrameHybRad = null; return; }
  const M = _oneSourceM();
  if (!_osmEqxGeoAnchor) {
    _osmCapturing = true;
    try {
      computeSunPositionFast(2451545.0);   // pure-K J2000 state (all one-source corrections guarded off)
      const g = getGraph();
      const ae = g.earthNodes.rotAxis.worldMatrix.e, ne = g.barycenter.pivot.worldMatrix.e;
      const lamK2000 = _osmNodeAzimuthRad(ae[4], ae[5], ae[6], ne[4], ne[5], ne[6]);
      const y2000 = C.startModelYearWithCorrection + _posFromJDTools(2451545.0);
      _osmEqxGeoAnchor = {
        lamK2000Rad: lamK2000,
        hyb2000Deg: M.equinoxLonJ2000Deg(_osmYearForJD(2451545.0, y2000)),
      };
    } finally { _osmCapturing = false; }
  }
  const dHybDeg = ((M.equinoxLonJ2000Deg(_osmYearForJD(jd, currentYear)) - _osmEqxGeoAnchor.hyb2000Deg + 540) % 360) - 180;
  _osmEqxFrameHybRad = dHybDeg * d2r;
}

const _OSM_MAT = new Mat4();   // reused scratch — all 9 rotation entries rewritten per call
function _applyOneSourceTiltCorr(graph, year) {
  if (_osmCapturing) return;   // the J2000 anchor capture reads PURE-K geometry
  const ra = graph.earthNodes.rotAxis;
  const M = _oneSourceM();
  if (ra.extraMatrix) {
    // Defensive: a caller that did not pre-clear — restore the K geometry
    // for the read below (leaf-only; parent matrices are current).
    ra.extraMatrix = null; ra.updateWorldMatrix();
  }
  const ae = ra.worldMatrix.e, ne = graph.barycenter.pivot.worldMatrix.e;
  let ax = ae[4], ay = ae[5], az = ae[6];
  { const s = Math.hypot(ax, ay, az); ax /= s; ay /= s; az /= s; }
  let nx = ne[4], ny = ne[5], nz = ne[6];
  { const s = Math.hypot(nx, ny, nz); nx /= s; ny /= s; nz /= s; }
  const epsGeom = Math.acos(Math.min(1, Math.max(-1, ax * nx + ay * ny + az * nz)));
  const epsTarget = M.epsDeg(year) * Math.PI / 180;
  // D4d: the azimuth correction FIRST — rotate the axis about the sun-plane
  // normal n by Δψ (the hybrid-vs-K equinox phase). The angle to n is
  // invariant under this rotation, so εGeom needs no recompute; only the
  // node line moves. R_total = R_tilt(û′) · R_azimuth(n).
  const rod = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, /** @type {number} */ th) => {
    const c = Math.cos(th), s = Math.sin(th), t = 1 - c;
    return [
      [t * x * x + c,     t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c,     t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  };
  // D4d-rev: Δψ assembled HERE — the hybrid advance (from prep) minus the
  // K scene's FULL geometric equinox advance, both J2000-anchored. λ_K is
  // read from the PRE-correction axis (ax,ay,az are still uncorrected).
  let azRad = 0;
  if (_osmEqxFrameHybRad !== null && _osmEqxGeoAnchor) {
    let dK = _osmNodeAzimuthRad(ax, ay, az, nx, ny, nz) - _osmEqxGeoAnchor.lamK2000Rad;
    dK = Math.atan2(Math.sin(dK), Math.cos(dK));
    const d = _osmEqxFrameHybRad - dK;
    azRad = Math.atan2(Math.sin(d), Math.cos(d));
  }
  let A = null;
  if (azRad !== 0) {
    A = rod(nx, ny, nz, azRad);
    const ax2 = A[0][0] * ax + A[0][1] * ay + A[0][2] * az;
    const ay2 = A[1][0] * ax + A[1][1] * ay + A[1][2] * az;
    const az2 = A[2][0] * ax + A[2][1] * ay + A[2][2] * az;
    ax = ax2; ay = ay2; az = az2;
  }
  let ux = ay * nz - az * ny, uy = az * nx - ax * nz, uz = ax * ny - ay * nx;
  const ul = Math.hypot(ux, uy, uz);
  if (ul * ul <= 1e-12) return;
  ux /= ul; uy /= ul; uz /= ul;
  const th = epsGeom - epsTarget;
  let K = rod(ux, uy, uz, th);
  if (A) {
    // K_total = K_tilt · K_azimuth
    const KT = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) KT[i][j] += K[i][k] * A[k][j];
    K = KT;
  }
  // Parent world rotation Rp (row-major from the column-major Mat4)
  const pe = ra.parent.worldMatrix.e;
  const Rp = [
    [pe[0], pe[4], pe[8]],
    [pe[1], pe[5], pe[9]],
    [pe[2], pe[6], pe[10]],
  ];
  // X = Rpᵀ · K · Rp
  const KR = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) KR[i][j] += K[i][k] * Rp[k][j];
  const X = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) X[i][j] += Rp[k][i] * KR[k][j];
  const e = _OSM_MAT.e;
  e[0] = X[0][0]; e[1] = X[1][0]; e[2] = X[2][0];
  e[4] = X[0][1]; e[5] = X[1][1]; e[6] = X[2][1];
  e[8] = X[0][2]; e[9] = X[1][2]; e[10] = X[2][2];
  ra.extraMatrix = _OSM_MAT;
  ra.updateWorldMatrix();   // leaf-only: nothing else is under rotAxis
}

function moveModel(graph, pos) {
  // One-source cost contract: clear the tilt correction BEFORE the animation
  // pass so the full updateWorldMatrix at the end of this function doubles as
  // the correction's reset read (see _applyOneSourceTiltCorr). No-op when off.
  if (graph.earthNodes.rotAxis.extraMatrix) graph.earthNodes.rotAxis.extraMatrix = null;
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
  // Unification: Earth's per-frame eccentricity is the ONE law (H/3 line);
  // the H/16 law-of-cosines form below serves only the planets' wobble laws.
  // One-source movement (C-4b): under the option, Earth's e(t) substitutes
  // from the banked engine series (the browser _sceneEccTargetAt twin) — the
  // PeriPrec2 geometric offset and the Sun's EoC inherit it below.
  const _osmM = _oneSourceM();
  const dynEcc = { earth: _osmM.e(_osmYearForJD(_jdFromPosTools(pos), currentYear)) };
  // D4c: the apsidal-wheel correction — applied to the wheel pair after the
  // layers animate, and to the Sun's EoC phase.
  const _periDelta = _osmPeriDeltaRad(_jdFromPosTools(pos), currentYear);
  // D4d-rev: the equinox prep (hybrid advance + the one-time J2000 K-anchor
  // capture) runs BEFORE this call's own animation, so the capture's nested
  // evaluation leaves no stale state behind.
  _osmEqxPrep(_jdFromPosTools(pos), currentYear);
  // Unification: the geometric eccentricity offset (the PeriPrec2 centre)
  // carries the one law's e(t) EVERY FRAME. The planet chains replicate the
  // Sun geometrically (centre offset + circle, no equation of centre), so
  // they must inherit the FULL vector e(t)·û(ϖ) — a constant base' left them
  // 0.0012 AU short (Venus −80″ mean vs JPL, measured). The Sun node then
  // needs only the remaining half of its EoC (split below) and the FQ-3
  // corrector closes it exactly on the same realized offset.
  graph.earthPeriPrec2.container.px = -dynEcc.earth * 100;
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
    // SW-1 EXPERIMENT (E5_WHEEL_SUN=1): the wheel Sun rides the CERTIFIED
    // tier Sun via ONE δ term ADDED ON TOP of the untouched legacy stack:
    //   δ(jd) = λ_certified(jd) − λ_twin(jd)
    // where λ_twin = _frameworkSunLon, the validated analytic reproduction
    // of this scene's own Sun (UT clock, deep-time midpoint mSY, full
    // Kepler EoC — 0.08° fidelity at Y+20000). The legacy geometry (split
    // ellipse: parent center-offset + partial EoC − fitted correction)
    // stays byte-identical, so δ shifts the WORLD longitude by exactly the
    // certified-vs-twin difference — a full-EoC replacement was measured
    // to double-count the parents' geometric ellipse share (~e·sin M, 1°).
    const _e5SunNode = _E5_WHEEL_SUN && nodes === graph.sunNodes;
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      let e;
      if (def._eccentricityKey && dynEcc[def._eccentricityKey] !== undefined) {
        e = def._eocDerived
          ? dynEcc[def._eccentricityKey] / 2   // Sun: eoc = e(t)/2 (the geometric offset e(t)·û(ϖ) supplies the other half)
          : dynEcc[def._eccentricityKey] * def._eocFraction;        // Planets: eoc = e_dynamic × fraction
      } else {
        e = def.eccentricity;                                        // Moon, Pluto, etc: static
      }
      // D4c: the Sun's mean-anomaly phase rides the SAME engine ϖ(t) as the
      // wheel (the _eocDerived guard keeps the planets on their own phases).
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos
        + (def._eocDerived ? _periDelta : 0);
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      nodes._meanAnomaly = M; // Store for parallax correction use
      if (_FQ3_EXACT_SUN && nodes === graph.sunNodes && def._eocDerived) {
        // FQ-3 W1 — exact-Kepler wheel Sun (see the flag comment above).
        // Δλ = EoC_full(e) − EoC_half(e−base/2) − geoTerm: the mean
        // longitude cancels in this difference, so no anchor or frame
        // constant enters. The offset vector is the wheel's own realized
        // geometry, −base·û(θ_p1) + amp·û(θ_p1+θ_p2), read from the
        // already-animated parent phases (integrated-phase correct in
        // deep-time mode by construction); common-ancestor rotations
        // cancel in the relative angle. Node-ry angles are λ-handed
        // (the E5 δ block adds λ-space deltas to θ directly), so the
        // relative angle needs NO handedness flip — only the raw
        // world-frame atan2(z,x) extraction runs opposite λ.
        const eF = dynEcc.earth;   // the full e(t) of the one law (node e is its half)
        const e2F = eF * eF, e3F = e2F * eF, e4F = e3F * eF;
        const eocFull = (2 * eF - e3F / 4) * Math.sin(M)
          + (1.25 * e2F - (11 / 24) * e4F) * Math.sin(2 * M)
          + ((13 / 12) * e3F) * Math.sin(3 * M)
          + ((103 / 96) * e4F) * Math.sin(4 * M);
        const eocHalf = 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
        const th1 = graph.earthPeriPrec1.orbit.ry;
        const th2 = th1 + graph.earthPeriPrec2.orbit.ry;
        // Unification: the realized offset is the single arm −e(t)·û(θ_p1)
        // (the A arm is retired; th2 stays the barycenter frame the Sun's
        // annual angle is measured in).
        const ox = -dynEcc.earth * Math.cos(th1);
        const oy = -dynEcc.earth * Math.sin(th1);
        const dOff = Math.hypot(ox, oy);
        const dphi = Math.atan2(oy, ox) - (th2 + θ);
        const geo = Math.atan2(dOff * Math.sin(dphi), 1 + dOff * Math.cos(dphi));
        const Jac = 1 - (dOff * Math.cos(dphi) + dOff * dOff)
          / (1 + 2 * dOff * Math.cos(dphi) + dOff * dOff);
        θ += (eocFull - eocHalf - geo) / Jac;
        nodes._fq3Applied = true;
      } else if (nodes === graph.sunNodes) {
        nodes._fq3Applied = false;
      }
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
    if (SUN_HARM_ENABLED && nodes === graph.sunNodes && C.SUN_LONGITUDE_HARMONICS
        && !nodes._fq3Applied) {
      // 9-1 S-P8: the filtered harmonic stack lives ONCE in @essrt/physics/
      // sun/longitude-correction (J2000-fixed deps — the fitted convention).
      // Recover JD via epoch-consistent mSY so pos→jd round-trip is exact.
      // FQ-3 W1: superseded on this path when the exact-Kepler corrector
      // applied above (the fitted terms absorbed exactly the split error
      // the corrector now removes at the geometry level).
      θ -= _sunLonCorr().correctionDegAt(_jdFromPosTools(pos)) * d2r;
    }
    if (_e5SunNode) {
      // SW-1 (adopted form): δ = λ_certified − λ_twin, added on top of the
      // untouched legacy stack. MEASURED: in-window wheel−certified drops
      // to ~2.6″ annual sd; deep time collapses from 1,000–6,000″ to a
      // ≤~100″ annual residue (the fitted correction's 365.25-day axis
      // dephasing vs the true year — bounded, visually invisible against
      // the Sun's 32′ disc; the exact-cancellation variant traded it for
      // an in-window error and was reverted — see the SW campaign record).
      // CLOCK-CONVENTION WINDOW (both endpoints DERIVED, not fitted —
      // measured in the SW Phase-B analysis): the certified Sun lives on
      // the TT clock (the corpus-validated E4/E5 convention); this scene's
      // wheels are deliberately UT (see _frameworkSunLon's header). The
      // window is the transition between the two clock regimes:
      //   3,000 yr  = the certification boundary — where eclipse truth
      //               (the ancient corpus) ends;
      //   20,000 yr = where a TT-clock Sun becomes ~10°+ inconsistent
      //               with the UT scene (rate·ΔT — the twin's own
      //               documented 12° at Y+20000).
      // Alternatives measured and rejected: a UT-assembled δ loses the
      // corpus-era accuracy (0.19° at −135); no window loses the deep
      // display consistency. The cos² shape only avoids a visible jump.
      const _jdE5 = _jdFromPosTools(pos);
      const _ayE5 = Math.abs(2000 + (_jdE5 - C.j2000JD) / 365.25 - 2000);
      const _wE5 = _ayE5 <= 3000 ? 1
        : _ayE5 >= 20000 ? 0
        : Math.cos((_ayE5 - 3000) / (20000 - 3000) * Math.PI / 2) ** 2;
      if (_wE5 > 0) {
        // K8b follow-up (mirrors src/script.js): the wheel Sun rides the
        // COMPLETED certified Sun — finder Sun minus the derived
        // planetary-completion table (70 framework-carrier terms + the
        // 6.44″ Earth-around-EMB "lunar equation"). Finders stay bare;
        // the besselian keeps its own subtraction — no double count.
        // Plan 06 layer B (measured): δ = λ_cert − λ_REALIZED — the wheel's
        // own longitude of date read from the scene in the frame every
        // validated surface uses: the Sun's RA/Dec in the CORRECTED axis
        // frame (the tilt correction applied here first, so the axis is this
        // frame's, not the previous one's), converted with the scene ε. The
        // former analytic twin (_frameworkSunLon: K e law, H/16 ϖ, its own
        // mean-longitude clock) parted from the wheel by 84″ around 500 AD,
        // 250″ at −500 and 810″ at −2500 — a leak the rendered Sun carried
        // 1:1 — while matching only near 1500–2500 where it was measured.
        // NOT the sun-plane node line: that construction moved the Sun and
        // the frame bridge's planets ~55″ at J2000 and tripled the planets'
        // JPL RMS (the node of the K sun-plane on the equator is not the
        // equinox the RA frame realizes; the two part by 1,400″ at −3000).
        // The twin remains only where the one-source prep is unavailable.
        const _lamCertDeg = _e5Tier().eclipse.sunLonCompletedDegAtJD(_finderAxisJdTools(_jdE5));   // R3 item 2: true TT (the bridge is the caller's)
        let _dE5;
        if (_osmEqxFrameHybRad !== null && _osmEqxGeoAnchor && !nodes.isEllipse) {
          const _yE5 = _osmYearForJD(_jdE5, currentYear);
          const epsR = _oneSourceM().epsDeg(_yE5) * d2r;
          // The node angle θ and the geocentric longitude differ by the
          // offset-ellipse Jacobian (dλ/dθ = 1 ± e·…), so a large δ applied
          // to θ lands λ short by ~e·δ (58″ at −3000): two Newton passes —
          // read λ, step θ, re-read, step the remainder.
          for (let pass = 0; pass < 2; pass++) {
            nodes.orbit.ry = θ;
            graph.root.updateWorldMatrix();
            _applyOneSourceTiltCorr(graph, _yE5);
            const sWP = nodes.pivot.getWorldPosition();
            const loc = graph.earthNodes.rotAxis.worldToLocal(sWP[0], sWP[1], sWP[2]);
            const sph = cartesianToSpherical(loc[0], loc[1], loc[2]);
            const raR = thetaToRaDeg(sph.theta) * d2r, decR = phiToDecDeg(sph.phi) * d2r;
            const lamRealizedDeg = Math.atan2(Math.sin(raR) * Math.cos(epsR) + Math.tan(decR) * Math.sin(epsR), Math.cos(raR)) / d2r;
            _dE5 = _lamCertDeg - lamRealizedDeg;
            θ += _wE5 * (((((_dE5 + 540) % 360) + 360) % 360) - 180) * d2r;
          }
        } else {
          _dE5 = _lamCertDeg - _frameworkSunLon(_jdE5);
          θ += _wE5 * (((((_dE5 + 540) % 360) + 360) % 360) - 180) * d2r;
        }
      }
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
      // Phase 8.2-6: the full evaluation lives in @essrt/physics/moon/series
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

  // D4c: rotate the apsidal wheel pair onto the engine ϖ(t) (Δrel is 0 at
  // J2000 and when the option is off). θ_p2 mirrors θ_p1 exactly, keeping
  // the barycenter frame's net rotation zero — every consumer downstream
  // (the geometric offset direction, FQ-3, earthPeriEcl, the Type II/III
  // planet corrections, the perihelion markers) inherits the flip.
  if (_periDelta !== 0) {
    graph.earthPeriPrec1.orbit.ry += _periDelta;
    graph.earthPeriPrec2.orbit.ry -= _periDelta;
  }

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

  // One-source movement (C-4b + D4d): drive the visible tilt to the series
  // ε AND the axis azimuth to the hybrid equinox phase (assembled inside
  // the correction from the prep at the top of this function). No-op when off.
  _applyOneSourceTiltCorr(graph, _osmYearForJD(currentJD, currentYear));
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
  // fit-mutated values (the Moon's RA/Dec conversion has none since R3 item 1)
  // and _chainCyclesM memoizes Float64Array integral
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

// ── P5 — the engine-D Keplerian chain (the ONLY planet path since the K5
// excision) ── Renders the seven planets from the engine-D-driven Keplerian
// chain (tools/lib/keplerian-chain.js — anchors + era-typed window rates,
// ALL from the governed artifact). Earth, Moon and Sun stay on the engine-K
// hierarchy. The ecliptic-J2000 → scene-world rotation R is DERIVED at
// runtime from the scene's own Earth triad (never a pasted matrix —
// tools/explore/k3-frame-probe.mjs is the measured record: inertial frame,
// −68.23° azimuth convention, pole 1.6′ mean-plane offset, residuals ≤9″
// annual + 0.55″/yr longitude-convention drift). The chain renders the
// engine raw — no observation-fitted correction rides it (the
// source-of-truth doctrine); the legacy geometric planet chains and their
// fitted stack were EXCISED with K5.
let _kcModule = null, _kcChains = null, _kcR = null, _kcREps = null;
function _kc() { if (!_kcModule) _kcModule = require('./keplerian-chain.js'); return _kcModule; }
function _kcHelioAU(target, jd) {
  const KCm = _kc();
  if (!_kcChains) _kcChains = KCm.buildPlanetChainsFromArtifact();
  const year = KCm.ANCHOR_EPOCH_YEAR + (jd - KCm.ANCHOR_EPOCH_JD) / 365.25;
  let el = KCm.computePlanetElementsAtYear(year, _kcChains[target], _kcChains);
  // D5/one-source: beyond a planet's measured handover boundary the secular
  // elements substitute from the banked engine series (the SAME
  // @essrt/physics module the browser runs — cross-engine parity); inside
  // the boundary this is a no-op. NB the browser ADDITIONALLY applies the
  // D5b relative-plane DISPLAY rotation (mounting on the visible sun
  // plane); this mirror stays in the raw engine J2000 frame — the physics
  // content, not the display placement.
  const ov = KCm.secularSeriesOverride();
  if (ov) el = ov.applyToElements(target, year, el);
  const p = KCm.computeHeliocentricEclipticFromElements(el);
  return [p.xAU, p.yAU, p.zAU];
}
// The ecliptic-J2000 → scene-world rotation R, derived at runtime from the
// scene's own FRAMES at the chain anchor epoch (never a pasted matrix):
//   ẑ = the sun-plane normal (the plane the chain's ecliptic maps onto),
//   x̂ = the CORRECTED axis frame's RA = 0 direction projected onto that
//       plane (the longitude origin the wheel Sun's δ block realizes and
//       every RA/Dec instrument reads through),
//   ŷ = ẑ × x̂.
// Plan 06 R3 (measured): the former TRIAD form matched the chain Earth's
// heliocentric direction to the scene's Earth–Sun direction at two instants
// — a BODY match. It absorbed the chain Earth's +3.5″ offset from the
// certified Sun at J2000 (the chain carries no lunar equation) into every
// planet's placement, and in the browser also whatever Sun the FIRST FRAME
// rendered (the analytic twin, +11.6″ from the certified Sun before the
// series artifact arrives) — the Standard-Model overlay's Sun read 8.2″
// there with the certified Sun 0.8″ from VSOP. Frames carry no body
// position: R moves 2.96″ about the pole and 0.39″ in tilt against the
// triad form here. NOT the sun-plane's node on the equator as the origin:
// that is 51.6″ from the RA frame's equinox at J2000 (the recorded K
// sun-plane finding — docs/41). Mirror: src/script.js _kcDeriveFrameR —
// identical ops.
function _kcFrameR(graph) {
  if (_kcR) return _kcR;
  const KCm = _kc();
  const jd1 = KCm.ANCHOR_EPOCH_JD;
  _syncEpochForJD(jd1);
  const pos = _posFromJDTools(jd1);
  moveModel(graph, pos);
  // the CORRECTED axis at the anchor (the frame every validated RA/Dec
  // surface reads through; self-clearing, a no-op when the option is off)
  _applyOneSourceTiltCorr(graph, _osmYearForJD(jd1, C.startModelYearWithCorrection + pos));
  const ne = graph.barycenter.pivot.worldMatrix.e, ae = graph.earthNodes.rotAxis.worldMatrix.e;
  let nx = ne[4], ny = ne[5], nz = ne[6];
  { const s = Math.hypot(nx, ny, nz); nx /= s; ny /= s; nz /= s; }
  let xx = ae[8], xy = ae[9], xz = ae[10];                 // rotAxis local +Z = RA 0 (theta = atan2(x, z))
  { const s = Math.hypot(xx, xy, xz); xx /= s; xy /= s; xz /= s; }
  // The second bridge (browser twin _kcREps): the RA frame's ε-tilted
  // ecliptic — the plane the scene Moon is placed in (its (λ, β) go through
  // the scene ε into RA/Dec in rotAxis). Same x̂ (RA 0, unprojected); pole =
  // the axis tilted by the scene ε toward RA 270°: ẑ = cos ε·Ŷ − sin ε·X̂.
  // The sun plane and this plane part by 20.5″ at J2000 (docs/41).
  {
    let ax = ae[4], ay = ae[5], az = ae[6];
    { const s = Math.hypot(ax, ay, az); ax /= s; ay /= s; az /= s; }
    let bx = ae[0], by = ae[1], bz = ae[2];                // local +X = RA 90°
    { const s = Math.hypot(bx, by, bz); bx /= s; by /= s; bz /= s; }
    const eps = Math.acos(Math.min(1, Math.max(-1, ax * nx + ay * ny + az * nz)));
    let zx = Math.cos(eps) * ax - Math.sin(eps) * bx, zy = Math.cos(eps) * ay - Math.sin(eps) * by, zz = Math.cos(eps) * az - Math.sin(eps) * bz;
    { const s = Math.hypot(zx, zy, zz); zx /= s; zy /= s; zz /= s; }
    const yex = zy * xz - zz * xy, yey = zz * xx - zx * xz, yez = zx * xy - zy * xx;   // ŷ = ẑ × x̂
    _kcREps = [[xx, yex, zx], [xy, yey, zy], [xz, yez, zz]];
  }
  // the sun-plane bridge: RA 0 projected onto the plane
  const d = xx * nx + xy * ny + xz * nz;
  xx -= d * nx; xy -= d * ny; xz -= d * nz;
  { const s = Math.hypot(xx, xy, xz); xx /= s; xy /= s; xz /= s; }
  const yx = ny * xz - nz * xy, yy = nz * xx - nx * xz, yz = nx * xy - ny * xx;   // ŷ = ẑ × x̂
  _kcR = [[xx, yx, nx], [xy, yy, ny], [xz, yz, nz]];
  return _kcR;
}

function computePlanetPosition(target, jd) {
  const graph = getGraph();

  // Flag path: derive the frame rotation BEFORE the main animate (the triad
  // probe re-animates the graph to its own epochs).
  if (!_kcR && target !== 'moon' && target !== 'sun') _kcFrameR(graph);

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
    // engine-D-driven position: sun + 100·R·helio (scene units, 100/AU),
    // with LIGHT-TIME (astrometric; K4.6 measured the uncorrected gap
    // decoding exactly as motion × delay): re-evaluate the planet at
    // jd − τ, τ = geocentric distance / c — c and AU from the model's
    // single homes. Proper physics, not a correction fit.
    const R = _kcR;
    const sun = graph.sunNodes.pivot.getWorldPosition();
    const earthW = graph.earthNodes.rotAxis.getWorldPosition();
    const toWorld = (hv) => [
      sun[0] + 100 * (R[0][0] * hv[0] + R[0][1] * hv[1] + R[0][2] * hv[2]),
      sun[1] + 100 * (R[1][0] * hv[0] + R[1][1] * hv[1] + R[1][2] * hv[2]),
      sun[2] + 100 * (R[2][0] * hv[0] + R[2][1] * hv[1] + R[2][2] * hv[2]),
    ];
    const wp = toWorld(_kcHelioAU(target, jd));
    const dKm = Math.hypot(wp[0] - earthW[0], wp[1] - earthW[1], wp[2] - earthW[2]) / 100 * C.currentAUDistance;
    const tauDays = dKm / C.speedOfLight / 86400;
    targetWP = toWorld(_kcHelioAU(target, jd - tauDays));
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

  // The observation-fitted post-hoc corrections (parallax 15/18/24-param,
  // gravitation, elongation) were EXCISED with the legacy planet chains
  // (K5): the chain renders the engine raw, and the correction sets only
  // ever carried the seven chain planets. K4.6b measured the cost of a
  // correction leaking onto the chain while both paths coexisted
  // (Saturn 109″ / Mars 89″ double-count — k46c-scene-share.mjs is the
  // record).

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
    // live in @essrt/physics/moon/apparent. S8: this engine RECOMPUTES the
    // obliquity for the scene year (the browser passes its live scene value).
    const _ov = _moonApparentM().overrideRaDec({
      lonDeg: graph.moonNodes._meeusLonDeg,
      betRad: graph.moonNodes._meeusLatDeg * d2r,
      meeusT: graph.moonNodes._meeusT,
      obliquityDeg: _oneSourceM().epsDeg(currentYear),   // Phase 3 S3b: the published ε
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
  // One-source cost contract: clear the tilt correction BEFORE the animation
  // pass (the full updateWorldMatrix below doubles as its reset read).
  if (graph.earthNodes.rotAxis.extraMatrix) graph.earthNodes.rotAxis.extraMatrix = null;
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);

  // Compute Earth eccentricity for EoC — epoch-consistent mSY for round-trip.
  // pos IS the tropical-year count from startmodelJD (see the block at
  // computePositions): startModelYearWithCorrection + pos, one convention.
  const currentYear = C.startModelYearWithCorrection + pos;
  // One-source movement (C-4b): under the option e(t) substitutes from the
  // banked engine series (mirrors the moveModel site; the EoC below inherits).
  const _osmM = _oneSourceM();
  const earthEcc = _osmM.e(_osmYearForJD(jd, currentYear));   // the banked engine series (the ONE movement)
  // D4c: the apsidal-wheel correction (mirrors moveModel).
  const _periDelta = _osmPeriDeltaRad(jd, currentYear);
  // D4d-rev: equinox prep before this call's own animation (mirrors moveModel).
  _osmEqxPrep(jd, currentYear);
  graph.earthPeriPrec2.container.px = -earthEcc * 100;   // geometric offset = full e(t) (mirrors moveModel)

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
        ? earthEcc / 2   // Sun: eoc = e(t)/2 (the geometric offset supplies the other half; unification)
        : def.eccentricity;
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos
        + (def._eocDerived ? _periDelta : 0);   // D4c: the engine-ϖ phase (mirrors moveModel)
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }
    // Phase Z-B (2026-06): Sun longitude harmonics applied to SUN NODE only.
    // Mirror of the moveModel() Sun-only block above. 9-1 S-P8: both blocks
    // delegate to @essrt/physics/sun/longitude-correction.
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
  // D4c: the apsidal wheel pair onto the engine ϖ(t) (mirrors moveModel).
  if (_periDelta !== 0) {
    graph.earthPeriPrec1.orbit.ry += _periDelta;
    graph.earthPeriPrec2.orbit.ry -= _periDelta;
  }
  animateFast(graph.sunNodes, graph.sunNodes.def);

  // Update world matrices from root
  graph.root.updateWorldMatrix();

  // One-source movement (C-4b + D4d): the tilt + azimuth correction goes on
  // BEFORE the extraction — sun ra/dec here are read from the graph
  // geometry via rotAxis.worldToLocal, so the axis must already carry the
  // series ε and the hybrid equinox phase (assembled inside the correction
  // from the prep at the top of this function).
  _applyOneSourceTiltCorr(graph, _osmYearForJD(jd, currentYear));

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
  _frameworkSunLonProbe: (jd) => _frameworkSunLon(jd),   // research probes: the E5 twin (wheel-versus-twin decomposition)
  _injectKeplerChains: (chains) => { _kcChains = chains; },   // research probes (K4.5 acceptance): override the flag path's chains (null → reload from the artifact)
  _kcDebugR: () => _kcR,   // research probes (K4b parity): the derived frame bridge (sun plane)
  _kcDebugREps: () => _kcREps,   // research probes: the RA-frame ε-ecliptic bridge (the scene Moon's plane)
  _moonSeriesForProbe: () => _moonSeriesM(),   // research probes: the shared Meeus series (incl. the truncated eclipse-finder forms)
};
