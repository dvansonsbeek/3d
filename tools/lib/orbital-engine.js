// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL ENGINE — Time-dependent orbital element functions
// Extracted from src/script.js for use by the optimization tools.
//
// All functions here compute orbital ELEMENTS (eccentricity, obliquity,
// inclination, year lengths, perihelion longitude, precession, day length)
// as functions of time. They do NOT compute scene graph positions.
//
// Organized by category:
//   OBLIQUITY → ECCENTRICITY → ARGUMENT OF PERIHELION →
//   LONGITUDE OF PERIHELION → PRECESSION → YEAR LENGTH → DAY LENGTH
// (The ASCENDING NODE and INCLINATION sections — the node integrator, the
// linear year-2000 node, Earth's H/3 inclination cosine, the ψ-law planet
// oscillation and the two-normal ecliptic inclinations — and the COMPOSITE
// computeEarthOrbitalElements left at plan 07 R5: the planets' elements of
// date have one home, the N-body chain.)
//
// Primary consumer: tools/optimize.js (the dashboard exporter that also
// consumed it is retired)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
// perf: cached lazy requirer (see tools/lib/scene-graph.js) — per-call
// `require()` re-runs module resolution (~30 µs each); lazy order preserved.
const _modCache = Object.create(null);
const _req = (p) => _modCache[p] || (_modCache[p] = require(p));

// ═══════════════════════════════════════════════════════════════════════════
// OBLIQUITY
// ═══════════════════════════════════════════════════════════════════════════

// Plan 09 (2026-10-11): the 16-harmonic obliquity comb (computeObliquityEarth)
// and its H/3–H/8 decomposition (computeObliquityIntegrals) left this engine.
// The published obliquity of date is the hybrid ε(t) of the one-source
// movement (deep-orbital-history.js createOneSourceMovement().epsDeg —
// scene-graph injects it); the comb was the frozen era record, measured
// 0.23″ off the hybrid at J2000 and 4,938″ at −26 kyr (era-device-readers).

// Plan 06 Phase 7 commit 2 — the planets' obliquity rides the spin channel
// (ONE home @essrt/physics/planets/spin-channel, the same construction the
// package model and the browser use): α from the planet's own torques, the
// spin integrated on its own ζ plane history from the IAU J2000 pole. Built
// lazily per planet from the governed artifacts.
let _planetSpinChannels = null;
function _planetSpin(planetName) {
  if (!_planetSpinChannels) _planetSpinChannels = new Map();
  let ch = _planetSpinChannels.get(planetName);
  if (!ch) {
    const { createPlanetSpinChannelFromArtifacts } = require('@essrt/physics/planets/spin-channel');
    const deepModes = JSON.parse(require('fs').readFileSync(
      require('path').resolve(__dirname, '..', '..', 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
    const planetZeta = {};
    for (const [k, m] of Object.entries(deepModes.modes)) planetZeta[k] = m.zeta;
    ch = createPlanetSpinChannelFromArtifacts({
      key: planetName,
      planetSpinPhysical: C.PLANET_SPIN_PHYSICAL,
      chainAnchorElements: C.CHAIN_DATA.j2000AnchorElements,
      planetZeta,
      massFractionOfSun: C.massFraction[planetName],
      gmSunKm3S2: C.GM_SUN,
      obliquityJ2000Deg: C.ASTRO_REFERENCE.obliquityJ2000_deg,
    });
    _planetSpinChannels.set(planetName, ch);
  }
  return ch;
}

/**
 * The planet's obliquity to its own orbit of date, degrees, from the spin
 * channel (angular-momentum sense: Venus ≈ 177°, Uranus ≈ 98°; Mercury's
 * Cassini lock returns its constant). `year` is the ENGINE year (Julian
 * years from J2000 on the chain's TT axis — the browser twin converts its
 * scene year first). Returns the J2000 tilt outside the channel's ±10-Myr
 * domain so a renderer never receives null. Mirror: src/script.js
 * computePlanetObliquity.
 *
 * @param {string} planetName - e.g. 'mercury', 'mars'
 * @param {number} year - engine year
 * @returns {number} obliquity in degrees
 */
function computePlanetObliquity(planetName, year) {
  const p = C.planets[planetName];
  if (!p || !C.PLANET_SPIN_PHYSICAL || !C.PLANET_SPIN_PHYSICAL[planetName]) return p ? p.axialTiltJ2000 : 0;
  const ch = _planetSpin(planetName);
  const eps = ch.obliquityDegAtYear(year);
  return eps === null ? ch.obliquityJ2000Deg : eps;
}

// Plan 07 R5: computeInclinationTiltRelative / computeAxialTiltAbsolute /
// computeAxialTiltRelative stood here. They were a closed cluster — each
// called only the next — exported but called by NOTHING: no consumer in
// src/, tools/, packages/ or test/, and no row in the 834-value tools-lib
// golden. They built a planet's axial tilt of date as
// obliquity(t) − [i_invPlane(t) − i_mean], with i(t) from the psi device and
// i_mean the device's near-J2000 mean, and their own comment asserted "at
// J2000: axialTiltJ2000 − 0" — which was never true, because the device's
// deviation at J2000 is A·cos(ϖ − anchor), not zero.
//
// Measured before removal: the construction disagreed with the IAU J2000
// axial tilts the model anchors on (Mercury 0.390° against 0.03°, Mars
// 25.394° against 25.19°, Saturn 26.791° against 26.73°), while the model's
// OWN spin channel — planets/spin-channel.cjs, each planet's torques on the
// chain's orbit — reproduces them (0.0340°, 25.1916°, 26.7312°). The quantity
// survives and has one home: `model.planets.spin(k).obliquityDegAtYear(y)`.

// ═══════════════════════════════════════════════════════════════════════════
// ECCENTRICITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Earth's orbital eccentricity for a given year.
 * Source: script.js computeEccentricityEarth() ~line 33358
 *
 * @param {number} currentYear - decimal year
 * @returns {number} eccentricity at that year
 */
function computeEccentricityEarth(currentYear) {
  // ECCENTRICITY UNIFICATION: Earth rides the model's ONE law — the H/3 line
  // of moon/ecc-channel.cjs with base' derived from e(J2000) (deep-time's
  // _fwEarthEcc, the same channel instance the lunar chain uses; the browser
  // twin is script.js _fwEarthEcc). The H/16 law-of-cosines form below
  // (computeEccentricity) remains for the PLANETS' wobble laws (D4).
  return dtm()._fwEarthEcc(currentYear - 2000);
}

/**
 * Generalized eccentricity formula for any planet.
 * e(t) = e₀ + (−A − (e₀ − e_base)·cos θ)·cos θ  where e₀ = √(e_base² + A²)
 * Source: script.js computeEccentricityEarth() ~line 33358
 */
function computeEccentricity(currentYear, balancedYear, cycleLength, base, amplitude) {
  // R6: the phase must be INTEGRATED under deep time, matching the browser's
  // computeEccentricityEarth (phaseAdvanceRadians). This was a plain linear
  // θ = 2π(year − anchor)/cycleLength, which made the two engines disagree on
  // the eccentricity VALUE at deep time while already agreeing on the
  // perihelion GEOMETRY (the scene rotates its precession objects via
  // cyclesBetweenYears). Same quantity, two conventions, inside one scene —
  // measured at 3e-14 at J2000, −1.10e-6 at −150 kyr, up to 7.4 s of
  // cardinal-point timing at deep time.
  //
  // The snapshot branch is algebraically identical to the old linear form:
  // (year − anchor) × (H/cycleLength) / H = (year − anchor)/cycleLength.
  // Flag polarity matches the scene-graph default (R1: deep time ON,
  // SG_DEEP_TIME=0 opts out into snapshot mode).
  const divisor_N = C.H / cycleLength;
  const snapshot = (currentYear - balancedYear) * divisor_N / C.H;
  let cycles = snapshot;
  if (process.env.SG_DEEP_TIME !== '0') {
    const c = dtm().cyclesBetweenYears(balancedYear, currentYear, divisor_N);
    if (c !== null) cycles = c;   // null past the tidal-lock asymptote → keep snapshot
  }
  // Phase 8.3 L3: the law of cosines lives ONCE in
  // @essrt/physics/planets/ecc-channel (this engine keeps its documented R6
  // snapshot-fallback dispatch above; cycles is always a number here).
  return _req('@essrt/physics/planets/ecc-channel').eccentricityFromCycles(cycles, base, amplitude);
}

/**
 * Compute perihelion and aphelion distances from eccentricity.
 * Perihelion = a × (1 - e), Aphelion = a × (1 + e)
 * where a = semi-major axis (AU).
 *
 * For Earth: a = 1.0 AU.
 * For planets: a = orbitDistance (Kepler 3rd law derived).
 *
 * @param {number} eccentricity - current eccentricity
 * @param {number} semiMajorAxis - semi-major axis in AU (default 1.0 for Earth)
 * @returns {object} { perihelion, aphelion } in AU
 */
/**
 * Compute semi-major axis from Kepler's 3rd law: a = (T²)^(1/3)
 * where T = H / orbitCount, orbitCount = round(H × meanSolarYear / solarYearInput).
 * Source: script.js ~line 1904 (e.g. mercuryOrbitDistance)
 *
 * @param {string} planetName - planet key or 'earth'
 * @returns {number} semi-major axis in AU
 */
function computeSemiMajorAxis(planetName) {
  if (planetName === 'earth') return 1.0;
  const p = C.planets[planetName];
  if (!p || !p.solarYearInput) return 0;
  const orbitCount = Math.round(C.H * C.meanSolarYearDays / p.solarYearInput);
  const T = C.H / orbitCount;
  return Math.pow(T * T, 1 / 3);
}

function computePerihelionAphelionDistance(eccentricity, semiMajorAxis = 1.0) {
  return {
    perihelion: semiMajorAxis * (1 - eccentricity),
    aphelion: semiMajorAxis * (1 + eccentricity),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ARGUMENT OF PERIHELION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute argument of perihelion (ecliptic): ω = ϖ - Ω
 * Source: script.js ~line 31914 (derived, not a standalone function)
 *
 * @param {number} lonPerihelion - Longitude of perihelion (degrees)
 * @param {number} ascendingNode - Ascending node longitude (degrees)
 * @returns {number} Argument of perihelion (0-360°)
 */
function computeArgumentOfPerihelion(lonPerihelion, ascendingNode) {
  return ((lonPerihelion - ascendingNode) % 360 + 360) % 360;
}

/**
 * Compute argument of perihelion on the invariable plane.
 * ω_inv = ϖ - Ω_inv
 *
 * @param {number} lonPerihelion - Longitude of perihelion (degrees)
 * @param {number} ascNodeInvPlane - Ascending node on invariable plane (degrees)
 * @returns {number} Argument of perihelion on inv. plane (0-360°)
 */
function computeArgumentOfPerihelionInvPlane(lonPerihelion, ascNodeInvPlane) {
  return ((lonPerihelion - ascNodeInvPlane) % 360 + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// LONGITUDE OF PERIHELION
// ═══════════════════════════════════════════════════════════════════════════

// (Plan 09 step 4: calcEarthPerihelionPredictive — the 25-term perihelion comb
// on H-divisors, 270° + the device wheel's J2000 phase + the H/16 mean rate +
// PERI_HARMONICS + PERI_OFFSET — and calcERD, its derivative, are deleted.
// Earth's perihelion of date is the series' ϖ in @essrt/physics,
// createModel().earth.perihelionLongitudeDeg (ecliptic of date); the scene's
// perihelion has followed the series since v16.0. Measured before deletion,
// comb − series: 0.03° at 2000, −1.6° at −4000, −20° at −26 kyr, −87° at
// −270 kyr — data/era-device-readers.json.)

// (Plan 07 R1: calcPlanetPerihelionLong and calcPerihelionLongICRF — the
// device's linear perihelion advance on the lattice period, delegating to
// the planets/predict module retired at plan 06 R8 — had no caller; gone.
// A planet's ϖ of date is the chain's: packages/physics model.js
// planetPerihelionDeg / src/script.js _kcPerihelionEclLonDeg.)

// ═══════════════════════════════════════════════════════════════════════════
// PRECESSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute axial precession (in years per full cycle).
 *
 * Source: src/script.js `computeAxialPrecessionYears` — ONE function, the day
 * length is the argument (year/day plan §2c: the unit is not a function
 * variant; the former "RealLOD" name and the SI-hardcoded twin are gone). An
 * earlier 2-arg version here hardcoded 86400 as LOD, which gave inconsistent
 * precession when called with meanLengthOfDay-based siderealYearSec (off by
 * ~22 yr at J2000, ~488 yr at deep time). Pass LOD explicitly; defaults to
 * C.meanLengthOfDay for the non-deep-time case (matches production).
 *
 * @param {number} siderealYearSec - sidereal year in seconds
 * @param {number} solarYearDays - solar year in days
 * @param {number} [lengthOfDay] - seconds per solar day (defaults to C.meanLengthOfDay)
 * @returns {number} axial precession period in years
 */
function computeAxialPrecessionYears(siderealYearSec, solarYearDays, lengthOfDay) {
  const lod = lengthOfDay !== undefined ? lengthOfDay : C.meanLengthOfDay;
  return siderealYearSec / (siderealYearSec - (solarYearDays * lod));
}

/**
 * Compute perihelion precession period (in years).
 * Derived from anomalistic and solar year: P_peri = T_anom / (T_anom - T_solar)
 * Source: script.js ~line 33237 (o.perihelionPrecessionRealLOD)
 *
 * @param {number} anomalisticYearSec - anomalistic year in seconds
 * @param {number} solarYearSec - solar year in seconds
 * @returns {number} perihelion precession period in years
 */
function computePerihelionPrecession(anomalisticYearSec, solarYearSec) {
  return anomalisticYearSec / (anomalisticYearSec - solarYearSec);
}

// (Plan 07 R1: computeInclinationPrecessionPeriod — Earth's H/3 and the
// planets' lattice apsidal period — had no caller; gone with the lattice.)

/**
 * Compute obliquity precession period (in years).
 * Uses Fibonacci ratio: P_obl = P_axial × 13/8
 * Source: script.js ~line 33230 (obliquityPrecessionRealLOD = axial * 13/8)
 *
 * @param {number} axialPrecession - axial precession period in years
 * @returns {number} obliquity precession period in years
 */
function computeObliquityPrecession(axialPrecession) {
  return axialPrecession * 13 / 8;
}

/**
 * Compute ecliptic precession period (in years).
 * Uses Fibonacci ratio: P_ecl = P_axial × 13/5
 * Source: script.js ~line 33231 (eclipticPrecessionRealLOD = axial * 13/5)
 *
 * @param {number} axialPrecession - axial precession period in years
 * @returns {number} ecliptic precession period in years
 */
function computeEclipticPrecession(axialPrecession) {
  return axialPrecession * 13 / 5;
}

// ═══════════════════════════════════════════════════════════════════════════
// YEAR LENGTH (Earth only)
// ═══════════════════════════════════════════════════════════════════════════

// Lazy, memoised deep-time accessor. This module is required by deep-time's
// own dependency chain, so a top-level require would be circular — the existing
// inline `dtm()` calls exist for the same reason.
let _dtMod = null;
const dtm = () => (_dtMod || (_dtMod = require('./deep-time')));   // perf: the ONE lazy resolution of deep-time (every in-function use goes through dtm())

// (Plan 09: the analytic deep-time year shapes, the difference-form Fourier
// evaluator and the comb-based year-length functions —
// computeLengthOfSimplifiedSolarYear, computeLengthOfSiderealYear,
// computeAnomalisticYearSecondsAtDayLength, computeLengthOfAnomalisticYearDays
// — are deleted with the three year-length combs. The year lengths of date in
// days are deep-time.js *YearDaysOfDate; the cardinal 4-mean below stays.)

/** Compute tropical year length in days as mean of 4 cardinal point year lengths.
 *  This is the physically correct definition: the mean return time to solstices/equinoxes. */
function computeLengthOfSolarYear(year) {
  return (computeSolsticeYearLength(year, 'SS') +
          computeSolsticeYearLength(year, 'WS') +
          computeSolsticeYearLength(year, 'VE') +
          computeSolsticeYearLength(year, 'AE')) / 4;
}

/**
 * Compute solar year length in seconds.
 * @param {number} solarYearDays - solar year in days
 * @param {number} lengthOfDay - seconds per solar day
 * @returns {number} solar year in seconds
 */
function computeLengthOfSolarYearSec(solarYearDays, lengthOfDay) {
  return solarYearDays * lengthOfDay;
}

/**
 * Compute sidereal year length in seconds.
 * This is a constant (the orbital period doesn't change).
 * @returns {number} sidereal year in seconds
 */
function computeLengthOfSiderealYearSec() {
  return C.meanSiderealYearSeconds;
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY LENGTH (Earth only)
// Source: script.js ~lines 33200-33224
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Length of day in seconds. Production (src/script.js:3333) defines:
 *   meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays
 * Both inputs are CONSTANTS at module load — LOD is constant across years in
 * non-deep-time mode. (For deep-time mode, src/script.js:5630 reassigns to
 * meanLodSecondsAtAge(t_Ma) — that function is browser-only.) Over ±300 kyr
 * the LOD varies by <2 s under deep-time evolution — negligible at this
 * scale — so we return the J2000 constant.
 *
 * Earlier version divided C.meanSiderealYearSeconds by the year-specific
 * (Fourier-oscillating) siderealYearDays, which produced ~0.3 ms spurious
 * variation that did not match production behavior.
 *
 * @returns {number} length of day in seconds
 */
function computeLengthOfDay(t_Ma) {
  if (t_Ma === undefined || t_Ma === 0) return C.meanLengthOfDay;
  return dtm().meanLodSecondsAtAge(t_Ma);
}

/**
 * Sidereal day length in seconds. Production (src/script.js:3334 inline,
 * constants.js:213) defines:
 *   meanSiderealday = (meanSolarYearDays / (meanSolarYearDays + 1)) * meanLengthOfDay
 * Constant across years. Earlier version `solarYearSec / (solarYearDays + 1)`
 * with per-year solarYearSec/Days values was algebraically equivalent only if
 * LOD is recomputed correctly — but coupled with the wrong LOD it introduced
 * spurious variation.
 *
 * @returns {number} sidereal day in seconds
 */
function computeSiderealDay(t_Ma) {
  if (t_Ma === undefined || t_Ma === 0) return C.meanSiderealDay;
  return dtm().meanSiderealDayAtAge(t_Ma);
}

/**
 * Stellar day length in seconds. Production (src/script.js:3335,
 * constants.js:214) defines:
 *   meanStellarday = (meanSiderealday / (H / 13)) / (meanSolarYearDays + 1)
 *                    × STELLAR_DAY_RA_PROJECTION + meanSiderealday
 * The H/13 factor is the axial precession period in years — precession in
 * LONGITUDE, along the ecliptic. The sidereal→stellar offset depends on
 * precession in RIGHT ASCENSION, along the equator, so the term carries
 * cos(ε) (m = p·cos ε). Without it the offset reads ~9.12 ms instead of
 * ~8.37 ms; see docs/11 § "Stellar−Sidereal Offset".
 *
 * Earlier version used `(siderealYearSec - solarYearSec) / (1/eccentricityAmplitude/13*16)`
 * which gave a divisor of ~907 instead of H/13 ≈ 25,794 — completely wrong
 * formula, off by factor ~28×. Stellar day was ~5 ms too low vs production.
 *
 * @returns {number} stellar day in seconds
 */
function computeStellarDay(t_Ma) {
  if (t_Ma === undefined || t_Ma === 0) return C.meanStellarDay;
  return dtm().meanStellarDayAtAge(t_Ma);
}

// (Plan 09 step 5b: computeRADayOffset — the fitted RA_DAY_OFFSET_MS comb, mean
// −14.194 ms/day + lines on H/16 and H/8, "confirmed by the 65-epoch multiepoch
// test" — and computeMeasuredSolarDay are deleted. The comb reproduced the
// Framework-Verification instrument's WINDOW term: 365 solar noons counted from
// the June solstice end 0.2422 d short of the tropical year, so the mean
// noon-to-noon interval differs from the mean solar day by −(0.2422/365)·dEoT/dt
// at the solstice; the two lines are that slope's e·cos(90° − ϖ) and tan²(ε/2)
// terms on the perihelion-of-date and obliquity cycles. A property of the
// window, not of the sky. docs/11 § "The retired RA day offset".)

/**
 * Compute stellar day minus sidereal day offset in seconds.
 * This offset arises from perihelion precession.
 *
 * @param {number} stellarDay - stellar day in seconds
 * @param {number} siderealDay - sidereal day in seconds
 * @returns {number} offset in seconds (stellar - sidereal)
 */
function computeStellarSiderealOffset(stellarDay, siderealDay) {
  return stellarDay - siderealDay;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLSTICE PREDICTION (Earth only)
// Fully derived from model parameters — zero fitted constants.
// See docs/14-solstice-prediction.md
// ═══════════════════════════════════════════════════════════════════════════

// Solstice RA: derived from earthRAAngle, inclination amplitude, and obliquity.
// All three project through the same 1/sin(ε) ecliptic-to-equatorial factor.
// The earthRAAngle sets the mean offset; the inclination amplitude sets the oscillation.
// Validated: RMSE = 0.089° (0.36 min RA) against 15,953 simulation data points.

// Cardinal Point JD: linear trend + 24 self-corrected harmonics (Fibonacci + combinations).
// Fitted from 15,953 observations (21-year steps) per cardinal point.
// Anchored at IAU J2000 values. Self-correcting: exact at year 2000.
// See docs/14-solstice-prediction.md

// Phase 7.2 — the entire §10/§10g cardinal family lives in
// @essrt/physics/cardinal (ONE implementation for every engine; extracted
// verbatim from this file). This engine injects its constants and its own
// twins; the four public functions below are one-line delegates. The
// self-correction (R11), the drift Simpson, the Ih closed form, the joint
// sidebands, the exact derivative — and every load-bearing comment that
// used to sit here — moved into the package.
// Plan 06 R1: the fitted cardinal-point model (CARDINAL_POINT_* on the frozen
// era clock) left the engines. The cardinal instants are the APPARENT
// crossings of the one Sun the package certifies and the scene renders —
// ONE home, `createModel().cardinal` (packages/physics/src/model.js); this
// engine's three public functions are one-line delegates. The package model
// is built on the shipped secular-series artifact (the API's configuration —
// createModel() WITHOUT it is a different hybrid, the recorded 3c trap).
let _cardinalPkgM = null;
function _cardinalPkg() {
  if (_cardinalPkgM !== null) return _cardinalPkgM;
  let artifact;
  try { artifact = require('../../data/nbody-secular-series.json'); } catch { artifact = undefined; }
  _cardinalPkgM = _req('@essrt/physics').createModel(undefined, artifact ? { secularSeriesArtifact: artifact } : undefined);
  return _cardinalPkgM;
}

/**
 * Compute the RA (in degrees) where a cardinal point occurs.
 * Fully derived — zero fitted constants.
 *
 * Formula: RA(t) = (baseRA − earthRAAngle/sin(ε)) + (A/sin(ε)) × [−sin(H/3) + sin(H/8)]
 *   where baseRA = 90° (SS), 270° (WS), 0° (VE), 180° (AE)
 *
 * RMSE: 0.089° (0.36 min RA) against 15,953 simulation data points.
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} RA in degrees
 */
function computeSolsticeRA(year, type) { return _cardinalPkg().cardinal.raDeg(year, type); }

/**
 * Compute the Julian Day when a cardinal point occurs.
 * Anchored at observed J2000 value for each cardinal point.
 *
 * Formula: JD = anchor + meanSolarYear × (year − 2000)
 *             + Σ harmonics(year − balanced) − Σ harmonics(2000 − balanced)
 *
 * 24 harmonics: 5 Fibonacci fundamentals + 19 combination/overtones.
 * RMSE: SS 0.10min, WS 0.06min, VE 0.05min, AE 0.05min over full H.
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} Julian Day of the cardinal point
 */
// ═══ §10 — ΣT_trop and the δ_X families: see @essrt/physics/cardinal ═════════
// (Phase 7.2 — the implementation, with its measured-cost table and every
// R5/R7/R8/R9 comment, moved into the package verbatim.)

function computeSolsticeJD(year, type) { return _cardinalPkg().cardinal.jd(year, type); }

/**
 * Compute the cardinal-point tropical year length (time between consecutive events).
 * Derivative of computeSolsticeJD() with respect to year.
 *
 * At J2000: SS=365.2417d (shortest, −46s), WS=365.2427d (longest, +45s).
 * The ±46s variation comes from perihelion precession (H/16).
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} year length in days
 */
function computeSolsticeYearLength(year, type) { return _cardinalPkg().cardinal.yearLengthDays(year, type); }

// (The planet PRECESSION PREDICTION block — the @essrt/physics/planets/predict
// feature basis, PREDICT_COEFFS × features, predictGeocentricPrecession /
// predictPrecessionFluctuation — left this engine at plan 06 R8: it
// reproduced the RETIRED geometric scene's exported Earth-frame RA rate. The
// rate is now the equatorial projection of the lattice motion —
// tools/docs/model-values.mjs predictiveMachinery and the browser's
// perihelionFrameBreakdown, identical ops.)

module.exports = {
  // Obliquity
  computePlanetObliquity,

  // Eccentricity
  computeEccentricity,
  computeEccentricityEarth,
  computeSemiMajorAxis,
  computePerihelionAphelionDistance,

  // (Ascending Node — the node integrator, the crossing finder and the linear
  // year-2000 node — left at plan 07 R5.)

  // Argument of Perihelion
  computeArgumentOfPerihelion,
  computeArgumentOfPerihelionInvPlane,

  // (Longitude of Perihelion — calcEarthPerihelionPredictive / calcERD, the
  // perihelion comb — left at plan 09 step 4.)

  // (Inclination — Earth's H/3 cosine, the ψ-law planet oscillation and the
  // two-normal ecliptic inclinations — left at plan 07 R5.)

  // Precession
  computeAxialPrecessionYears,
  computePerihelionPrecession,
  computeObliquityPrecession,
  computeEclipticPrecession,

  // Year Length (plan 09: the comb-based evaluators are deleted; deep-time.js
  // *YearDaysOfDate carry the year lengths of date in days)
  computeLengthOfSolarYear,
  computeLengthOfSolarYearSec,
  computeLengthOfSiderealYearSec,

  // Day Length
  computeLengthOfDay,
  computeSiderealDay,
  computeStellarDay,
  computeStellarSiderealOffset,

  // Solstice Prediction
  computeSolsticeRA,
  computeSolsticeJD,
  computeSolsticeYearLength,
};
