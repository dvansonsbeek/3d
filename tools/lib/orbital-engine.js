// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL ENGINE — Time-dependent orbital element functions
// Extracted from src/script.js for the Node tools.
//
// All functions here compute orbital ELEMENTS (eccentricity, obliquity,
// inclination, year lengths, perihelion longitude, precession, day length)
// as functions of time. They do NOT compute scene graph positions.
//
// Organized by category:
//   OBLIQUITY → ECCENTRICITY → ARGUMENT OF PERIHELION →
//   LONGITUDE OF PERIHELION → PRECESSION → YEAR LENGTH → DAY LENGTH
// (The planets' elements of date have one home, the N-body chain.)
//
// Consumers: the solar-measurements exporter and the verify/explore scripts.
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
// perf: cached lazy requirer (see tools/lib/scene-graph.js) — per-call
// `require()` re-runs module resolution (~30 µs each); lazy order preserved.
const _modCache = Object.create(null);
const _req = (p) => _modCache[p] || (_modCache[p] = require(p));

// ═══════════════════════════════════════════════════════════════════════════
// OBLIQUITY
// ═══════════════════════════════════════════════════════════════════════════

// The published obliquity of date is the hybrid ε(t) of the one-source
// movement (deep-orbital-history.js createOneSourceMovement().epsDeg —
// scene-graph injects it).

// The planets' obliquity rides the spin channel (ONE home
// @essrt/physics/planets/spin-channel, the same construction the package
// model and the browser use): α from the planet's own torques, the spin
// integrated on its own ζ plane history from the IAU J2000 pole. Built
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

// A planet's axial tilt of date has one home,
// `model.planets.spin(k).obliquityDegAtYear(y)` — the spin channel reproduces
// the IAU J2000 axial tilts the model anchors on (Mercury 0.0340°, Mars
// 25.1916°, Saturn 26.7312°).

// ═══════════════════════════════════════════════════════════════════════════
// ECCENTRICITY
// ═══════════════════════════════════════════════════════════════════════════

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
  // the ONE scaffold geometry (constants.js derived) — the chain's J2000 a
  const d = C.derived[planetName];
  return d ? d.orbitDistance : 0;
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

// ═══════════════════════════════════════════════════════════════════════════
// PRECESSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute axial precession (in years per full cycle).
 *
 * Source: src/script.js `computeAxialPrecessionYears` — ONE function, the day
 * length is the argument. Pass LOD explicitly; defaults to C.meanLengthOfDay
 * for the non-deep-time case (matches production).
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
 * Stellar day length in seconds. Production (src/script.js, constants.js) defines:
 *   meanStellarday = (meanSiderealday / T_p) / (meanSolarYearDays + 1)
 *                    × STELLAR_DAY_RA_PROJECTION + meanSiderealday
 * T_p is the axial precession period in years — precession in LONGITUDE, along
 * the ecliptic. The sidereal→stellar offset depends on precession in RIGHT
 * ASCENSION, along the equator, so the term carries cos(ε) (m = p·cos ε).
 * Without it the offset reads ~9.12 ms instead of ~8.37 ms; see docs/11
 * § "Stellar−Sidereal Offset".
 *
 * @returns {number} stellar day in seconds
 */
function computeStellarDay(t_Ma) {
  if (t_Ma === undefined || t_Ma === 0) return C.meanStellarDay;
  return dtm().meanStellarDayAtAge(t_Ma);
}

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

let _cardinalPkgM = null;
function _cardinalPkg() {
  if (_cardinalPkgM !== null) return _cardinalPkgM;
  let artifact;
  try { artifact = require('../../data/nbody-secular-series.json'); } catch { artifact = undefined; }
  _cardinalPkgM = _req('@essrt/physics').createModel(undefined, artifact ? { secularSeriesArtifact: artifact } : undefined);
  return _cardinalPkgM;
}

/**
 * The RA (in degrees) at which a cardinal point occurs — the package model's
 * cardinal surface (createModel().cardinal.raDeg): at a crossing the RA is the
 * target longitude by construction (λ = 0/90/180/270 ⇒ RA = 0/90/180/270).
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
 * The cardinal-point year length — the interval between successive crossings
 * of the one certified Sun (SI days), from the package model's cardinal surface.
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} year length in days
 */
function computeSolsticeYearLength(year, type) { return _cardinalPkg().cardinal.yearLengthDays(year, type); }

module.exports = {
  // Obliquity
  computePlanetObliquity,
  planetSpinChannel: _planetSpin,   // plan 11 step 3: the scene twin places each planet's pole from the channel's ŝ(t)

  // Eccentricity
  computeSemiMajorAxis,
  computePerihelionAphelionDistance,

  // Argument of Perihelion
  computeArgumentOfPerihelion,
  computeArgumentOfPerihelionInvPlane,

  // Precession
  computeAxialPrecessionYears,
  computePerihelionPrecession,
  computeObliquityPrecession,
  computeEclipticPrecession,

  // Year Length (deep-time.js *YearDaysOfDate carry the year lengths of date in days)
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
