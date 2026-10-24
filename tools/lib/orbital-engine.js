// ═══════════════════════════════════════════════════════════════════════════
// ORBITAL ENGINE — the Node tools' Earth-and-planet element readers
// Extracted from src/script.js for the Node tools.
//
// What is left here after plan 18 T2 (thirteen exports nobody read were
// deleted, two of them the retired 13/8 and 13/5 period ratios):
//   OBLIQUITY   — a planet's axial tilt of date from the spin channel
//   PRECESSION  — the axial precession period from a year/day pair
//   YEAR LENGTH — the tropical year as the mean of the four cardinal years
//   CARDINAL    — the cardinal instants, their RA and year lengths, read from
//                 the package model's cardinal surface
// (The planets' elements of date have one home, the N-body chain; the
// Earth's e/ε/ϖ of date the one-source movement the scene graph injects.)
//
// Consumers: scene-graph.js (the spin channel), the solar-measurements
// exporter, the fixtures, the cross-engine test and the explore scripts.
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

// ═══════════════════════════════════════════════════════════════════════════
// YEAR LENGTH (Earth only)
// ═══════════════════════════════════════════════════════════════════════════

/** Compute tropical year length in days as mean of 4 cardinal point year lengths.
 *  This is the physically correct definition: the mean return time to solstices/equinoxes. */
function computeLengthOfSolarYear(year) {
  return (computeSolsticeYearLength(year, 'SS') +
          computeSolsticeYearLength(year, 'WS') +
          computeSolsticeYearLength(year, 'VE') +
          computeSolsticeYearLength(year, 'AE')) / 4;
}

// ═══════════════════════════════════════════════════════════════════════════
// CARDINAL INSTANTS (Earth only) — the package model's cardinal surface:
// the crossings of the ONE certified Sun (@essrt/physics/cardinal), the
// governed secular series injected when the artifact is present.
// ═══════════════════════════════════════════════════════════════════════════

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
 * The Julian Day (UT) of a cardinal point of the calendar year — the package
 * model's cardinal surface (createModel().cardinal.jd).
 *
 * @param {number} year - calendar year
 * @param {'SS'|'WS'|'VE'|'AE'} [type='SS'] - cardinal point type
 * @returns {number} Julian Day of the cardinal point
 */
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
  planetSpinChannel: _planetSpin,   // the scene twin places each planet's pole from the channel's ŝ(t)

  // Precession
  computeAxialPrecessionYears,

  // Year Length (deep-time.js *YearDaysOfDate carry the year lengths of date in days)
  computeLengthOfSolarYear,

  // Cardinal instants (the names say "Solstice"; the type argument covers the equinoxes too)
  computeSolsticeRA,
  computeSolsticeJD,
  computeSolsticeYearLength,
};
