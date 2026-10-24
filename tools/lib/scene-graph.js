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

// ═══════════════════════════════════════════════════════════════════════════
// Framework-native lunar fundamental arguments — mirror of src/script.js
// (_FW_MOON / _fwMoonArgs / _moonArgsAt). One
// argument source everywhere: the fitting/verification world now runs the
// same skeleton as production (docs/66 §1). Pure-Meeus A/B reference via
// env MOON_ARGS_PURE_MEEUS=1 (matches the browser console flag flip).
// ═══════════════════════════════════════════════════════════════════════════
const MOON_ARGS_FRAMEWORK_NATIVE = !process.env.MOON_ARGS_PURE_MEEUS;

// D2 derived additional-argument rates (deg/cy, from the J2000 month inputs —
// mirrors src/script.js FW_A2_RATE/FW_A3_RATE; derivation record docs/109 §22)
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
        // The arguments' obliquity carrier reads the PUBLISHED ε (the one-source
        // movement) — the browser's _sceneEpsTargetDeg / the package model's
        // oneSourceM.epsAt twin.
        computeObliquityEarth: (y) => _oneSourceM().epsDeg(y),
        // The arguments' Sun is the ONE certified Sun — the package model's mean
        // longitude (unwrapped) and mean perihelion of date (wrapped; the
        // arguments wrap M) — the same surface the package model wires. TT
        // Julian-year axis.
        sunMeanLonDegAtJdTT: /** @param {number} jdTT */ (jdTT) => _e5Tier().sun.meanLongitudeDegAt(2000 + (jdTT - C.j2000JD) / 365.25),
        sunPerihelionLonDegAtJdTT: /** @param {number} jdTT */ (jdTT) => _e5Tier().sun.perihelionLongitudeDegAt(2000 + (jdTT - C.j2000JD) / 365.25),
        jdToSIyear: _jdToSIyearTools,
        tropicalOrbitsBetween: _mcTropical,
        apsidalOfDateCyclesBetween: _mcApsidalOfDate,
        nodalOfDateCyclesBetween: _mcNodalOfDate,
        isDeepTime: () => DEEP_TIME_ENABLED,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
        // (d′) of-date rate completion — MATCHED TRIPLE with the package model
        // and the browser: the dynamical rate is the published precession
        // period's (the one-family beat inside its window, the composed clock
        // beyond; degrees per Julian year).
        pDynDegPerYearAt: /** @param {number} year */ (year) => 360 / _e5Tier().epoch.axialPrecessionYearsAtYear(year),
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

// ── Stage B deep-time branch (mirror of src/script.js _fwMoonArgsDeep) ─────
// Always-chains: secular phases from the factored-law month/precession chains
// under SG_DEEP_TIME=1 (the same functions that phase the deep-time layers).
// Snapshot mode (default) keeps the certified polynomial skeleton.
// SI-year coordinate: MUST mirror the browser's _jdToSIyear exactly, which
// divides by SI_TROPICAL_YEAR_DAYS = MEAN_TROPICAL_YEAR_J2000_S/86400
// (≈ 365.24189 — NOT the 365.2422 input constant).
const _SI_TROP_DAYS = DT.MEAN_TROPICAL_YEAR_J2000_S / 86400;
const _jdToSIyearTools = (jd) => C.startmodelYear + (jd - C.startmodelJD) / _SI_TROP_DAYS;   // anchored on the scene epoch itself (plan 11 step 5: the correction is deleted)
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
      tropicalYearJ2000Seconds: C.meanSolarYearDays * C.meanLengthOfDay,   // the SI tick (plan 09 step 7c′)
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
// ONE L′ clock for the ring's Moon (mirrors src/script.js
// moonArgumentOfLatitudeCyclesBetween, identical ops): the moon layer's
// in-plane angle is the arguments' F = L′ − Ω, counted from the anchor.
const _mcArgF = (a, b) => {
  const F = (y) => _moonArgsM().argsAt(DT.siYearToJD(y)).F;
  return ((((F(b) - F(a)) % 360) + 360) % 360) / 360;
};
const _mcTropical      = (a, b) => _moonChainCyclesTools(DT.meanTropicalMonthAtAge, a, b);
const _mcAnomalistic   = (a, b) => _moonChainCyclesTools(DT.meanAnomalisticMonthAtAge, a, b);
const _mcSidereal      = (a, b) => _moonChainCyclesTools(DT.meanMoonSiderealMonthAtAge, a, b);   // the series' star-referenced A3 (plan 09 step 5c)
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
// (the apsidal-meets-nodal pair layers are engine-placed at zero;
// _mcApsidalOfDate / _mcNodalOfDate serve the lunar chain's cycle counters above.)

// The Moon's scene RA/Dec: ecliptic → equatorial only (mirror of src/script.js
// _moonApparent; @essrt/physics moon/apparent.cjs). Phase 8.2-7: the
// conversion lives ONCE in the package (S8: obliquity stays engine-injected —
// this engine recomputes it for the scene year at the call site).
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
const _TT_BRIDGE_SECONDS = _req('@essrt/physics').FITTED_COEFFICIENTS.DT_ANCHOR.deltaTStartSeconds;   // plan 14: the fit's own artifact
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
          const d = DTmod.meanMoonDistanceMetresAtAge((C.startmodelYear - _jdToSIyearTools(jdTT)) / 1e6);
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
        siderealOrbitsBetween: _mcSidereal,
        jupiterOrbitsBetween: _mcJupiter,
        isDeepTime: () => DEEP_TIME_ENABLED,
        isFrameworkNative: () => MOON_ARGS_FRAMEWORK_NATIVE,
      },
    });
  }
  return _moonSeriesMTools;
}

/** Bounded Meeus E-factor mirror: e_E(t)/e_E(J2000) from the ONE deep e
 *  channel (kills the polynomial blow-up at deep time). */
function _fwEFactorTools(d_days, T, T2) {
  if (!MOON_ARGS_FRAMEWORK_NATIVE) {
    const EC = MEEUS_LUNAR.eccentricityCorrection;
    return 1 + EC.e1 * T + EC.e2 * T2;
  }
  // Decision (ii): the ONE deep e (its eFactorAt divides by the e0 anchor
  // const — exact at J2000 by the anchored-remainder construction).
  // on the channel's Julian-year axis (mirrors the package model's fwEFactor)
  return DT._deepEcc().eFactorAt(d_days / 365.25);
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
    this.worldRotOverride = null;          // R4 Earth frame: [X, Y, Z] world-frame unit columns (see updateWorldMatrix)
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  updateWorldMatrix() {
    this.localMatrix.compose(this.px, this.py, this.pz, this.rx, this.ry, this.rz);
    // R4 — THE ENGINE EARTH FRAME (mirror of the browser's quaternion write):
    // a node carrying `worldRotOverride` takes that WORLD rotation exactly,
    // position kept — its local rotation becomes Rpᵀ·W with Rp the parent's
    // world rotation. The K rotation composed above is superseded (the
    // device layers keep animating for their visuals; the physics frame is
    // placed from the engine). Nothing else sets it.
    if (this.worldRotOverride) {
      const W = this.worldRotOverride;
      const e = this.localMatrix.e;
      if (this.parent) {
        const p = this.parent.worldMatrix.e;
        // local column j = Rpᵀ · W[j]   (Rp rows are p[0],p[4],p[8] / p[1],p[5],p[9] / p[2],p[6],p[10])
        for (let j = 0; j < 3; j++) {
          const w = W[j];
          e[4 * j]     = p[0] * w[0] + p[1] * w[1] + p[2] * w[2];
          e[4 * j + 1] = p[4] * w[0] + p[5] * w[1] + p[6] * w[2];
          e[4 * j + 2] = p[8] * w[0] + p[9] * w[1] + p[10] * w[2];
        }
      } else {
        for (let j = 0; j < 3; j++) { e[4 * j] = W[j][0]; e[4 * j + 1] = W[j][1]; e[4 * j + 2] = W[j][2]; }
      }
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
const MSY_J2000 = C.meanSolarYearDays;
const d2r = Math.PI / 180;
const sDay_J2000 = 1 / MSY_J2000;

// Per-JD epoch snapshot (Option B). When DEEP_TIME_ENABLED=false, always
// returns J2000 values; when true, memoizes a per-epoch snapshot of
// (mSY, sDay) keyed on t_Ma. The scene-setup speeds stay frozen at
// J2000; only downstream JD↔pos conversions pick up the epoch shift.
// See IP-deep-time-scene-graph-fitpipeline.md §6.2.
let _epochCache = { t_Ma: 0, mSY: MSY_J2000, sDay: sDay_J2000 };

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

// R4: the Sun's display path is the certified longitude placed on the wheel
// (_applyEngineEarthFrame). The certified tier model:
let _e5TierM = null;
function _e5Tier() {
  if (!_e5TierM) {
    // Plan 06 R1 (measured): createModel() WITHOUT the shipped secular-series
    // artifact builds the hybrid on the ζ-mode tail — a DIFFERENT certified
    // Sun from the API's and the audit's (75″ at 0 AD, 168″ at −1000, 377″ at
    // −2500 in λ; the recorded 3c trap, third instance). The scene's target
    // Sun is the shipped configuration.
    let artifact;
    try { artifact = require('../../data/nbody-secular-series.json'); } catch { artifact = undefined; }
    _e5TierM = _req('@essrt/physics').createModel(undefined, artifact ? { secularSeriesArtifact: artifact } : undefined);
  }
  return _e5TierM;
}

function _syncEpochForJD(jd) {
  if (!DEEP_TIME_ENABLED) return _epochCache;
  // Approximate year from JD using J2000 mSY (self-consistent iteration
  // not needed at Step 6a's 1-year granularity — drift <10 s at ±150 kyr).
  const yearApprox = 2000 + (jd - C.j2000JD) * sDay_J2000;
  const t_Ma = (2000 - yearApprox) / 1e6;
  if (Math.abs(t_Ma - _epochCache.t_Ma) < 1e-9) return _epochCache;
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
  if (mSY_t === null) return _epochCache;   // stay on last-good if past tidal lock
  _epochCache = { t_Ma, mSY: mSY_t, sDay: 1 / mSY_t };
  return _epochCache;
}

// Backwards-compatible alias — code that references bare `sDay` at
// scene-setup time picks up the J2000 value (setup happens once at
// module load). Runtime paths use `_epochCache.mSY`
// / `_epochCache.sDay` and go through `_syncEpochForJD(jd)` first.
const sDay = sDay_J2000;

// Per-planet variables computed from constants (replicating script.js lines 1687-1770)
function getPlanetSceneData(key) {
  const p = C.planets[key];
  if (!p) return null;
  const d = C.derived[key];

  // Perihelion ecliptic years (already in constants)
  const perihelionEclipticYears = p.perihelionEclipticYears;

  // Orbit center for PerihelionFromEarth layer (the chain placement overwrites
  // this centre every frame, mirror src/script.js)
  const longPeri = p.longitudePerihelion;
  const periDist = d.perihelionDistance;
  const periFromEarthA = Math.cos((longPeri + 90) * d2r) * periDist;
  const periFromEarthB = Math.cos((90 - (longPeri - 90)) * d2r) * periDist;

  // Planet-container tilts (ecliptic inclination decomposed via the ascending node)
  const realPeriTiltA = Math.cos((-90 - p.ascendingNode) * d2r) * -p.eclipticInclinationJ2000;
  const realPeriTiltB = Math.sin((-90 - p.ascendingNode) * d2r) * -p.eclipticInclinationJ2000;

  // Planet orbital speed (Mars is negative, all others positive)
  const planetSpeed = (key === 'mars')
    ? -Math.PI * 2 / d.period
    : Math.PI * 2 / d.period;

  // Orbit radius in scene units
  const orbitRadiusScene = d.orbitDistance * 100;

  return {
    key, p, d, perihelionEclipticYears,
    periFromEarthA, periFromEarthB,
    realPeriTiltA, realPeriTiltB,
    planetSpeed, orbitRadiusScene,
  };
}

function buildSceneGraph() {
  // Root
  const root = new Node('startingPoint');

  // ─── EARTH CHAIN ───────────────────────────────────────────────
  const earthDef = {
    orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    // The Earth wobble circle has radius 0: the wobble centre IS Earth, so every
    // instrument that reads "from the wobble centre" (the Step-6a export, the
    // report's Method B) is Earth-frame by construction
    // (measured: a non-zero radius advanced the perihelion 8 % too fast —
    // anomalistic year 365.2611 d vs IAU 365.2596 — while from Earth the scene
    // reproduces IAU, 365.25962 d).
    orbitRadius: 0,
    // The axial wheel's rotation axis is ENGINE-PLACED every call (R4), so the
    // def's tilt and speed are the rest pose only, zero. The world frame is the
    // J2000 ecliptic (_chainR, @essrt/physics computeSceneWorldFrameJ2000).
    tilt: 0,
    startPos: 0,
    speed: 0,
  };
  const earthNodes = makeObjectNodes('earth', earthDef);

  root.addChild(earthNodes.container);

  // Earth precession layers (each is a "virtual" object with speed + tilt)
  function makePrecessionNode(name, def) {
    const n = makeObjectNodes(name, def);
    return n;
  }

  // The perihelion pair — ENGINE-PLACED (R4): _applyEngineEarthFrame sets both
  // nodes' angles to the series' ϖ of date and the inner node's offset arm to
  // the series' e of date every call; they rest at zero with the J2000
  // eccentricity until the engine frame places them.
  const earthPeriPrec1 = makePrecessionNode('earthPerihelionPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,   // plan 11 step 4: the scaffold's earthRAAngle tilt is gone — the container is world-placed
    tilt: 0,
    startPos: 0, speed: 0,
  });
  earthNodes.pivot.addChild(earthPeriPrec1.container);

  const earthPeriPrec2 = makePrecessionNode('earthPerihelionPrecession2', {
    orbitRadius: 0,
    orbitCentera: -C.ASTRO_REFERENCE.earthEccentricityJ2000 * 100, orbitCenterb: 0, orbitCenterc: 0,   // the offset arm's rest pose; R4 places it at the series' e of date
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: 0, speed: 0,
  });
  earthPeriPrec1.pivot.addChild(earthPeriPrec2.container);

  // |e| is frame-invariant: the barycenter node is the Sun's orbit centre
  // itself, and the one-source e(t) is evaluated every frame (dynEcc.earth).
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
    // _applyEngineEarthFrame sets the Sun's wheel angle from the certified
    // longitude every call, so this Kepler branch is the rest pose before the
    // first engine frame only.
    startPos: 0,
    speed: Math.PI * 2,
    eccentricity: C.eocEccentricity,
    _eccentricityKey: 'earth',
    _eocDerived: true,  // Sun EoC = e_dynamic - e_base/2
    perihelionPhaseJ2000: -2 * Math.PI * (C.startmodelJD - C.perihelionRefJD) / C.meanSolarYearDays,
    perihelionPrecessionRate: 0,
  };
  const sunNodes = makeObjectNodes('sun', sunDef);
  barycenter.pivot.addChild(sunNodes.container);

  // ─── MOON CHAIN (under earth.pivot) ────────────────────────────
  // The five stack layers are ENGINE-PLACED. Their angles are set every call
  // by _applyEngineEarthFrame from the lunar arguments (apsidal θ = ϖ − 90°,
  // canceller −θ, the inert pair 0, nodal θ = Ω − 180°; ϖ = L′ − M′, Ω = L′ − F
  // at the scene's TT) — the same arguments that place the rendered Moon. The
  // defs rest at zero.
  const moonApsidalPrec = makePrecessionNode('moonApsidalPrecession', {
    orbitRadius: -(C.moonDistance / C.currentAUDistance) * (C.moonOrbitalEccentricity * 100),   // the ring's eccentric offset a·e toward the apogee
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, // apsidal precession rotates perigee within the orbital plane — no plane tilt
    tilt: 0,
    startPos: 0, speed: 0,   // ENGINE-PLACED (the perigee direction of date)
  });
  earthNodes.pivot.addChild(moonApsidalPrec.container);

  const moonApsNodalPrec1 = makePrecessionNode('moonApsidalNodalPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: 0, speed: 0,   // ENGINE-PLACED (the inert pair rests at zero)
  });
  moonApsidalPrec.pivot.addChild(moonApsNodalPrec1.container);

  const moonApsNodalPrec2 = makePrecessionNode('moonApsidalNodalPrecession2', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: 0, speed: 0,   // ENGINE-PLACED (the inert pair rests at zero)
  });
  moonApsNodalPrec1.pivot.addChild(moonApsNodalPrec2.container);

  const moonLunarLevel = makePrecessionNode('moonLunarLevelingCycle', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: 0, speed: 0,   // ENGINE-PLACED (the apsidal canceller, −θ_apsidal)
  });
  moonApsNodalPrec2.pivot.addChild(moonLunarLevel.container);

  const moonNodalPrec = makePrecessionNode('moonNodalPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0,  // inclination tilt lives on the moon def (below this layer's spin) so the nodal spin regresses the plane
    orbitTiltb: 0,
    tilt: 0,
    startPos: 0, speed: 0,   // ENGINE-PLACED (the ascending node of date)
  });
  moonLunarLevel.pivot.addChild(moonNodalPrec.container);

  const moonDef = {
    orbitRadius: (C.moonDistance / C.currentAUDistance) * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: Math.cos((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,  // 5.14° tilt lives here (below the nodal spin)
    orbitTiltb: Math.sin((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,
    tilt: -(C.moonEclipticInclinationJ2000 + C.moonObliquityEclipticJ2000),  // Cassini composition in the scene's own convention (mirrors src/script.js moon.tilt)
    startPos: 0,   // plan 11 step 2: the start angle is deleted — the certified override places the Moon's direction and distance every call; this node's own angle is the twin's geometric pivot only
    speed: (Math.PI * 2) / (1 / (C.meanSolarYearDays / C.moonNodalMonth)),  // draconitic (nodal-month) clock
    eccentricity: C.moonOrbitalEccentricity,
    lunarPerturbations: true,
    _dtMoonIntegrator: _mcArgF, _dtMoonSign: +1,   // the arguments' F (was the draconitic-month count; Phase 9.13 mirror)
  };
  const moonNodes = makeObjectNodes('moon', moonDef);
  moonNodalPrec.pivot.addChild(moonNodes.container);

  // ─── PLANET CHAINS (under barycenter.pivot) ────────────────────
  const planetNodeMap = {};

  for (const key of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pd = getPlanetSceneData(key);
    if (!pd) continue;

    // The chain is barycenter → PerihelionFromEarth → RealPerihelionAtSun →
    // planet, the browser's exact wiring (the chain places the planets:
    // computePlanetPosition = sun + 100·R·helio).

    // Layer 1: PerihelionFromEarth
    const periFromE = makePrecessionNode(key + 'PerihelionFromEarth', {
      orbitRadius: 0,
      orbitCentera: pd.periFromEarthA, orbitCenterb: pd.periFromEarthB, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2,
    });
    barycenter.pivot.addChild(periFromE.container);

    // Planet itself — orbital plane tilt applied here
    const planetDef = {
      orbitRadius: pd.orbitRadiusScene,
      orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: pd.realPeriTiltA, orbitTiltb: pd.realPeriTiltB,
      tilt: 0,  // tilt only affects axial spin, not position
      startPos: 0,   // plan 11 step 3: the scaffold's fitted start angle is deleted — the chain places the planet, _applyEngineEarthFrame its pole
      speed: pd.planetSpeed,
      eccentricity: pd.p.orbitalEccentricityJ2000,   // the OBSERVED J2000 eccentricity, inert (plan 07 R6)
    };
    planetDef._dtPlanetIntegrator = _mcPlanet[key];
    planetDef._dtPlanetSign = Math.sign(planetDef.speed);
    const planetNodes = makeObjectNodes(key, planetDef);
    barycenter.pivot.addChild(planetNodes.container);

    planetNodeMap[key] = {
      periFromE,
      planet: planetNodes,
      sceneData: pd,
    };
  }

  return {
    root, earthNodes, sunNodes, moonNodes, barycenter,
    earthPeriPrec1, earthPeriPrec2,
    moonApsidalPrec, moonApsNodalPrec1, moonApsNodalPrec2,
    moonLunarLevel, moonNodalPrec,
    planetNodeMap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE MODEL — Update all rotations/positions for a given pos
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ONE-SOURCE MOVEMENT (C-4b) — Earth's scene ε(t) and e(t) come from the SAME
// construction the browser runs (tools/lib/deep-orbital-history
// .createOneSourceMovement: banked engine series inside ±10 Myr, deep mode
// tail beyond, α(t) on the composed precession): e drives the two scene sites
// (moveModel dynEcc.earth / computeSunPositionFast earthEcc — the geometric
// PeriPrec2 offset and the Sun EoC inherit it) and ε drives the frame, which
// is engine-placed (_applyEngineEarthFrame). The ONE Node scene (the browser's
// D4 default; measured at the flip: eclipse audit and lunar alignment
// identical, the tools-lib fixture moved 1e-7 in-era). The series artifact is
// a TRACKED file, so its absence is a broken checkout, not a mode — a loud
// error, never a silently different scene.
// ═══════════════════════════════════════════════════════════════════════════
let _osmInstance;   // undefined = unresolved · else {epsDeg, e, periOfDateDeg, …}
function _oneSourceM() {
  if (_osmInstance === undefined) {
    const M = require('./deep-orbital-history.js').createOneSourceMovement();
    if (!M) throw new Error('scene-graph: data/nbody-secular-series.json is absent — the one-source movement is the only Node scene (plan 06 item 3); restore the tracked artifact');
    _osmInstance = M;
  }
  return _osmInstance;
}
// R4b (plan 06, owner): THE ENGINE'S YEAR at a true-UT JD — the one argument
// every read of the one-source sample (ε, e, ϖ, the frame of date) takes in
// both twins: dynamical time (the scene's true TT — bridge + curve in
// deep-time mode, _jdTTToolsFromUT) in JULIAN years from J2000, the sampler's
// own coordinate (t = 0 at JD 2451545.0 TT; the chain planets use the same
// mapping). NOT the SI-year counter (_jdToSIyearTools: startmodel origin,
// 365.2422-d unit — 10.3 d off at J2000, 0.0078 d/yr drift) and NOT the UT
// year: at −5.34 Myr ΔT is 3,505 yr and
// the UT-sampled ε read 22.5347° where the TT frame read 22.6944° (the
// owner's measurement). Mirror of src/script.js _engineYearTT — identical ops.
function _osmYearForJD(jdUT) {
  return 2000 + (_jdTTToolsFromUT(jdUT) - C.j2000JD) / 365.25;
}
// R4 (plan 06 "one Earth frame"): the frame is PLACED from the engine
// (_applyEngineEarthFrame), never corrected relative to a scene pose; docs/41
// carries the measured reasons.

function moveModel(graph, pos) {
  // Compute dynamic eccentricities for all planets
  // Uses _epochCache.mSY so the pos→JD→year round-trip is consistent with
  // the caller's pos = _epochCache.sDay × (jd - C.startmodelJD).
  // Earth's per-frame eccentricity is the one-source series e(t) (the browser
  // _sceneEccTargetAt twin) — the PeriPrec2 geometric offset and the Sun's EoC
  // inherit it below.
  const _osmM = _oneSourceM();
  const dynEcc = { earth: _osmM.e(_osmYearForJD(_jdFromPosTools(pos))) };   // the engine year (true TT, Julian)
  // Unification: the geometric eccentricity offset (the PeriPrec2 centre)
  // carries the one law's e(t) EVERY FRAME. The planet chains replicate the
  // Sun geometrically (centre offset + circle, no equation of centre), so
  // they must inherit the FULL vector e(t)·û(ϖ) — a constant base' left them
  // 0.0012 AU short (Venus −80″ mean vs JPL, measured). The Sun node then
  // needs only the remaining half of its EoC (split below) and the FQ-3
  // corrector closes it exactly on the same realized offset.
  graph.earthPeriPrec2.container.px = -dynEcc.earth * 100;
  // `dynEcc` carries Earth alone — the planets are placed from the N-body
  // chain, which overwrites the wheels' Kepler motion entirely (measured: a
  // 0.25 shift in every eocFraction moved no position at any epoch).

  // Update each "animated" object: orbit.ry = θ for circular, pivot.position for ellipse
  function animateObject(nodes, def) {
    let θ;
    // Mirrors src/script.js moveModel.
    if (DEEP_TIME_ENABLED && def._dtMoonIntegrator) {
      // Phase 9.13 mirror (previously MISSING in tools — the moon layers ran
      // frozen J2000 speeds in deep-time mode while the browser ran the
      // chains; measured as a spurious ~9.6° Moon-vs-ring plane divergence
      // at +52 kyr in the moon-on-ring meter). Anchor + SI-year coordinate
      // mirror src/script.js moveModel (_mAnchor = STARTMODEL_YEAR_SI, UT).
      const _jdHere = _jdFromPosTools(pos);
      // TT clock (mirrors src/script.js): the Moon-chain layers run on the
      // SAME clock as the override arguments — the earlier UT convention made
      // the ring lag the Moon by precession-rate × ΔT at deep time.
      const _cyc = def._dtMoonIntegrator(C.startmodelYear, _jdToSIyearTools(_jdTTToolsFromUT(_jdHere)));
      θ = (_cyc !== null ? _cyc : 0) * 2 * Math.PI * def._dtMoonSign - def.startPos * d2r;
    } else if (DEEP_TIME_ENABLED && def._dtPlanetIntegrator) {
      // 8.3-1 S-P2 (mirrors src/script.js Phase P-B0 dispatch): planet-chain
      // integral form, Driver 2 Kepler + mass loss, on the TT clock — the
      // same anchor/coordinate as the Moon branch above.
      const _jdHereP = _jdFromPosTools(pos);
      const _cycP = def._dtPlanetIntegrator(C.startmodelYear, _jdToSIyearTools(_jdTTToolsFromUT(_jdHereP)));
      θ = (_cycP !== null ? _cycP : 0) * 2 * Math.PI * def._dtPlanetSign - def.startPos * d2r;
    } else {
      θ = def.speed * pos - def.startPos * d2r;
    }
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      let e;
      if (def._eccentricityKey && dynEcc[def._eccentricityKey] !== undefined) {
        // the Sun (the only node with an eccentricity key): eoc = e(t)/2 — the
        // geometric offset e(t)·û(ϖ) supplies the other half (the chain places the planets).
        e = dynEcc[def._eccentricityKey] / 2;
      } else {
        e = def.eccentricity;                                        // Moon, Pluto, etc: static
      }
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      nodes._meanAnomaly = M; // Store for parallax correction use
      // (the FQ-3 exact-Kepler corrector and the Sun's D4c phase delta are
      // retired with R4: the Sun's wheel angle is set from the certified
      // longitude in _applyEngineEarthFrame — this EoC branch now serves the
      // Moon, Pluto and the no-chain bodies only)
    }
    // (the fitted Sun longitude harmonics and the E5 δ block that followed the
    // EoC here are retired with R4 — the Sun's angle comes from the certified
    // longitude in _applyEngineEarthFrame)
    // Full Meeus Ch. 47 lunar perturbations (longitude + latitude, 60+60 terms)
    // Meeus formulas require T from standard J2000.0 (JD 2451545.0) in Julian centuries (36525 days)
    if (C.useVariableSpeed && def.lunarPerturbations) {
      // Recover JD via epoch-consistent mSY for pos→jd round-trip, then
      // UT→TT (mirrors src/script.js Phase 9.16): Meeus arguments are defined
      // in dynamical time — this shift was MISSING in the tools mirror (the
      // browser had it), which was the whole browser-vs-tools deep-time delta
      // (~4 yr of ΔT at +200 kyr → args differing by ~150° in ϖ).
      const _jdUTm = _jdFromPosTools(pos);
      const d = _jdTTToolsFromUT(_jdUTm) - C.j2000JD;
      // Scene-ring item 2 (mirrors src/script.js): the series distance on the
      // recession — the chain's a(t)/a₀ at the block's age (1 in snapshot mode).
      const _aRatio = DEEP_TIME_ENABLED
        ? DT.meanMoonDistanceAtAge((C.startmodelYear - jdToDecimalYear(_jdUTm)) / 1e6) / DT.meanMoonDistanceAtAge(0)
        : 1;
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
      nodes._meeusDistKm = _sr.distKm * _aRatio;
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
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateObject(nodes, def);

  // Sun (the K wheel; its angle is replaced by the certified longitude in
  // _applyEngineEarthFrame — the device animates, the engine places)
  animateObject(graph.sunNodes, graph.sunNodes.def);

  // Moon chain
  const moonLayers = [
    graph.moonApsidalPrec, graph.moonApsNodalPrec1, graph.moonApsNodalPrec2,
    graph.moonLunarLevel, graph.moonNodalPrec,
  ];
  for (const nodes of moonLayers) animateObject(nodes, nodes.def);
  animateObject(graph.moonNodes, graph.moonNodes.def);

  // The frame's JD (pos→jd round-trip through _epochCache.mSY) — the engine
  // frame placement below takes it.
  const currentJD = _jdFromPosTools(pos);

  // Planets
  for (const key of Object.keys(graph.planetNodeMap)) {
    const pm = graph.planetNodeMap[key];
    animateObject(pm.periFromE, pm.periFromE.def);

    animateObject(pm.planet, pm.planet.def);
  }

  // Update all world matrices from root
  graph.root.updateWorldMatrix();

  // R4: the Earth frame — sun plane, apsidal wheel, Sun and axis — placed
  // from the engine on top of the animated device (see _applyEngineEarthFrame).
  _applyEngineEarthFrame(graph, currentJD);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE PLANET POSITION — Main entry point
// ═══════════════════════════════════════════════════════════════════════════

// Cache the scene graph (built once, reused)
let _graph = null;
function getGraph() {
  if (!_graph) {
    _graph = buildSceneGraph();
    // (R4/plan 11 step 4: the frame bridge R is the J2000 ecliptic constant —
    // nothing is derived from the fresh graph.)
  }
  return _graph;
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

// ── P5 — the engine-D Keplerian chain (the ONLY planet path) ── Renders the
// seven planets from the engine-D-driven Keplerian chain
// (tools/lib/keplerian-chain.js — anchors + era-typed window rates, ALL from
// the governed artifact). Earth, Moon and Sun stay on the engine-K hierarchy.
// The chain renders the engine raw — no observation-fitted correction rides it
// (the source-of-truth doctrine). R — the scene's world frame — is the J2000
// ecliptic, ONE home @essrt/physics earth/frame-of-date (see _chainFrameR below).
let _chainModule = null, _chainChains = null;
const _chainR = _req('@essrt/physics/earth/frame-of-date').computeSceneWorldFrameJ2000();
function _kc() { if (!_chainModule) _chainModule = require('./keplerian-chain.js'); return _chainModule; }
function _chainHelioAU(target, jd) {
  const KCm = _kc();
  if (!_chainChains) _chainChains = KCm.buildPlanetChainsFromArtifact();
  // R9: the chain's argument is dynamical time — the ONE engine year (true
  // TT, Julian from J2000.0 TT = the KC anchor; browser twin
  // _chainElementsOfDate identical). At UT the planets lagged the Sun by ΔT of
  // mean motion (Mercury 9″ at 2000, 0.8° at −500).
  const year = _osmYearForJD(jd);
  let el = KCm.computePlanetElementsAtYear(year, _chainChains[target], _chainChains);
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
// The ecliptic-J2000 → scene-world rotation R: R IS the J2000 ecliptic frame
// (world Y the J2000 ecliptic pole; the J2000 equinox at the recorded view
// azimuth, 90° — the equinox along world +X; @essrt/physics earth/frame-of-date,
// ONE home for both twins). The R3/R4 history (why FRAMES and not a body
// triad, why no correction rides R) is in docs/41. Everything of date is
// placed from the engine THROUGH R by _applyEngineEarthFrame, so every
// physical reading, taken in the placed Earth frame, is R-invariant; only
// the view is R.
function _chainFrameR() { return _chainR; }

// ═══════════════════════════════════════════════════════════════════════════
// R4 — THE EARTH FRAME FROM THE ENGINE (plan 06; mirror of src/script.js
// _applyEngineEarthFrame — identical ops). The physics frame is PLACED, not
// corrected:
//   • the sun plane — the perihelion wheel's container takes the world
//     rotation [X = ĝ, Y = n̂, Z = ĝ × n̂] (equinox, ecliptic pole of date):
//     its own tilt and every parent wheel above it are superseded; the
//     outer/inner apsidal wheels turn ±ϖ(t) so the offset arm −e(t)·û(ϖ)
//     points where the engine says and the barycenter frame keeps its net
//     zero rotation; the Sun rides the wheel at the angle that realizes the
//     CERTIFIED longitude on the offset circle (exact, no scene read);
//   • the axis — rotAxis takes [X = ŝ × ĝ, Y = ŝ, Z = ĝ]: RA 0 IS the equinox
//     of date, the pole IS the engine's spin axis; ε and the equinox phase
//     need no correction because they are the frame.
// One clock: true TT for the year the engine is sampled at (the Moon block's
// convention) and for the certified longitude (the finder-axis API plus the
// bridge). Measured before this (plan 06 R3): the scene's sun plane and the RA
// frame's ecliptic parted by 20.5″ at J2000 and 10′ at −3000, the rendered
// Sun −19″/+19″ in declination against Horizons at the 2000 equinoxes —
// docs/41.
// ═══════════════════════════════════════════════════════════════════════════
const _FRAME = _req('@essrt/physics/earth/frame-of-date');
function _applyEngineEarthFrame(graph, jdUT) {
  const R = _chainFrameR();
  // The sampler's time coordinate is JULIAN years from J2000 TT (t = 0 at JD
  // 2451545.0 — the anchor elements; the chain planets use the same mapping).
  // NOT the scene's SI-year counter (_jdToSIyearTools: startmodel origin,
  // 365.2422-d unit): that coordinate sits 10.3 d off at J2000 and drifts
  // 0.0078 d/yr — fed to an ABSOLUTE equinox longitude it rotated the whole
  // frame of date by 1.417″ against the J2000 pose (measured).
  // One clock, one argument: the engine year (_osmYearForJD — R4b).
  const smp = _oneSourceM().sampleAt(_osmYearForJD(jdUT));
  const F = _FRAME.computeEarthFrameOfDate(smp);
  const toW = (v) => [
    R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
    R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
    R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2],
  ];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const n = toW(F.n), g = toW(F.g), s = toW(F.s);
  // the sun plane and the apsidal wheel. periOfDateDeg is EARTH's heliocentric
  // perihelion; the geocentric Sun's perihelion is +180°, and the wheel's arm
  // −e·û(θ_p1) must put the orbit centre toward the Sun's APHELION (measured:
  // the other sign leaves the Sun's direction exact but swaps its distance —
  // the planets, placed about that Sun, then read ~1° off).
  graph.earthPeriPrec1.container.worldRotOverride = [g, n, cross(g, n)];
  // the Moon stack's base — the ecliptic OF DATE (pole n, equinox g), placed
  // like the sun plane (scene-ring item 1; mirrors src/script.js — the ring's
  // plane read 0.5°…8.7° off the rendered series Moon on the flat J2000 base;
  // the stack's longitude zero is the scene convention's quarter turn from ĝ:
  // basis [X = n̂ × ĝ, Y = n̂, Z = ĝ]).
  graph.moonApsidalPrec.container.worldRotOverride = [cross(n, g), n, g];
  // the Moon RING's stack layers from the lunar arguments (mirror
  // src/script.js): in the stack's basis a layer angle θ carries the
  // longitude 90° + θ, the apsidal arm −a·e·X̂ points at the apogee, and the
  // Moon def's fixed tilt puts the ascending node at longitude 180° under
  // zero stack rotation (measured on this twin: the fitted J2000 phases read
  // the Meeus ϖ/Ω to 0.006° through exactly these relations). The clock is
  // the override's — true TT (bridge + curve), _jdTTToolsFromUT.
  const margs = _moonArgsAtTools(_jdTTToolsFromUT(jdUT));
  const thApsidal = (margs.Lp - margs.Mp) * d2r - Math.PI / 2;   // perigee at ϖ = L′ − M′
  graph.moonApsidalPrec.orbit.ry = thApsidal;
  graph.moonApsNodalPrec1.orbit.ry = 0;
  graph.moonApsNodalPrec2.orbit.ry = 0;
  graph.moonLunarLevel.orbit.ry = -thApsidal;                      // the canceller: the nodal layer's zero is the base's
  graph.moonNodalPrec.orbit.ry = (margs.Lp - margs.F) * d2r - Math.PI;   // ascending node at Ω = L′ − F
  const peri = (smp.periOfDateDeg + 180) * d2r;
  graph.earthPeriPrec1.orbit.ry = peri;
  graph.earthPeriPrec2.orbit.ry = -peri;
  graph.earthPeriPrec2.container.px = -smp.e * 100;
  // the Sun at the certified longitude (true TT: the finder-axis API adds the curve, the bridge is ours)
  const lam = _e5Tier().eclipse.sunLonCompletedDegAtJD(_finderAxisJdTools(jdUT)) * d2r;
  graph.sunNodes.orbit.ry = _FRAME.solveWheelAngleForLongitude(lam, smp.e, peri);
  // the axis
  graph.earthNodes.rotAxis.worldRotOverride = [cross(s, g), s, g];
  // the planets' poles (mirror src/script.js _chainPlacePlanetPole): each chain
  // planet's rotation axis takes [X = ŝ × ĝₚ, Y = ŝ, Z = ĝₚ] with ŝ(t) the spin
  // channel's pole of date and ĝₚ = unit(ŝ × n̂) the planet's own equinox on its
  // orbit plane of date, both through the frame bridge — the construction
  // Earth's axis takes above.
  const engineYear = _osmYearForJD(jdUT);
  const spinOf = _req('./orbital-engine.js').planetSpinChannel;
  for (const key of Object.keys(graph.planetNodeMap)) {
    const ch = spinOf(key);
    const sE = ch.spinAxisEclipticJ2000AtYear(engineYear);
    if (!sE) continue;   // beyond the channel's domain the axis keeps its last pose
    const nE = ch.orbitNormalEclipticJ2000AtYear(engineYear);
    const sW = toW(sE), gP = cross(sW, toW(nE));
    const gl = Math.hypot(gP[0], gP[1], gP[2]);
    const gW = [gP[0] / gl, gP[1] / gl, gP[2] / gl];
    graph.planetNodeMap[key].planet.rotAxis.worldRotOverride = [cross(sW, gW), sW, gW];
  }
  graph.root.updateWorldMatrix();
}

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
    // engine-D-driven position: sun + 100·R·helio (scene units, 100/AU),
    // with LIGHT-TIME (astrometric; K4.6 measured the uncorrected gap
    // decoding exactly as motion × delay): re-evaluate the planet at
    // jd − τ, τ = geocentric distance / c — c and AU from the model's
    // single homes. Proper physics, not a correction fit.
    const R = _chainR;
    const sun = graph.sunNodes.pivot.getWorldPosition();
    const earthW = graph.earthNodes.rotAxis.getWorldPosition();
    const toWorld = (hv) => [
      sun[0] + 100 * (R[0][0] * hv[0] + R[0][1] * hv[1] + R[0][2] * hv[2]),
      sun[1] + 100 * (R[1][0] * hv[0] + R[1][1] * hv[1] + R[1][2] * hv[2]),
      sun[2] + 100 * (R[2][0] * hv[0] + R[2][1] * hv[1] + R[2][2] * hv[2]),
    ];
    const wp = toWorld(_chainHelioAU(target, jd));
    const dKm = Math.hypot(wp[0] - earthW[0], wp[1] - earthW[1], wp[2] - earthW[2]) / 100 * C.currentAUDistance;
    const tauDays = dKm / C.speedOfLight / 86400;
    targetWP = toWorld(_chainHelioAU(target, jd - tauDays));
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
    // Phase 8.2-7: ecl→eq + aberration + the fitted MOON_CORRECTION patch
    // live in @essrt/physics/moon/apparent. S8: this engine RECOMPUTES the
    // obliquity for the scene epoch (the browser passes its live scene value,
    // o.obliquityEarth — the same engine-year read, R4b: the Moon's ecl→eq
    // conversion had ridden the UT-year ε, 0.16° from the rendered axis at
    // −5.34 Myr).
    const _ov = _moonApparentM().overrideRaDec({
      lonDeg: graph.moonNodes._meeusLonDeg,
      betRad: graph.moonNodes._meeusLatDeg * d2r,
      meeusT: graph.moonNodes._meeusT,
      obliquityDeg: _oneSourceM().epsDeg(_osmYearForJD(jd)),   // Phase 3 S3b: the published ε, at the engine year
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
  // computePositions). e(t) is the one-source series (mirrors the moveModel
  // site; the EoC below inherits).
  const _osmM = _oneSourceM();
  const earthEcc = _osmM.e(_osmYearForJD(jd));   // the banked engine series (the ONE movement), at the engine year
  graph.earthPeriPrec2.container.px = -earthEcc * 100;   // geometric offset = full e(t) (mirrors moveModel)

  // Animate a single node: orbit.ry = θ (with EoC if applicable)
  function animateFast(nodes, def) {
    // (plan 11 step 4: the K-device wheel branch is deleted with the wheels —
    // the snapshot form is the only form; the engine places the frame after)
    let θ = def.speed * pos - def.startPos * d2r;
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      const e = def._eocDerived
        ? earthEcc / 2   // Sun: eoc = e(t)/2 (the geometric offset supplies the other half; unification)
        : def.eccentricity;
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }
    nodes.orbit.ry = θ;
  }

  // Animate Earth + the perihelion pair + Sun only
  animateFast(graph.earthNodes, graph.earthNodes.def);
  const precLayers = [
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateFast(nodes, def);
  animateFast(graph.sunNodes, graph.sunNodes.def);

  // Update world matrices from root
  graph.root.updateWorldMatrix();

  // R4 (plan 06 finding 2): the fast path rides the SAME engine Earth frame as
  // the full scene — sun plane, apsidal wheel, the Sun at the certified
  // longitude, the axis (measured: the bare wheel Sun sat 8–18″ from the scene
  // Sun in 2000).
  _applyEngineEarthFrame(graph, jd);

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
  phiToDecDeg,
  thetaToRaDeg,
  moveModel,
  // Expose internals for testing
  Node,
  _getGraphForProbe: () => getGraph(),   // research probes: the internal graph AFTER a computePlanetPosition call
  _injectKeplerChains: (chains) => { _chainChains = chains; },   // research probes (K4.5 acceptance): override the flag path's chains (null → reload from the artifact)
  _moonSeriesForProbe: () => _moonSeriesM(),   // research probes: the shared Meeus series (incl. the truncated eclipse-finder forms)
  // The Moon SERIES inputs at a UT JD (lon/lat deg, dist km) — the cross-engine
  // gate's Moon rows.
  moonSeriesInputsAt: (jd) => { computePlanetPosition('moon', jd); const n = getGraph().moonNodes; return { lonDeg: n._meeusLonDeg, latDeg: n._meeusLatDeg, distKm: n._meeusDistKm }; },
};
