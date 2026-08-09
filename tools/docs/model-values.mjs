/**
 * MODEL VALUES REGISTRY — the shared definition of every number the prose
 * quotes, and how to render it.
 *
 * THIS IS THE PIECE BOTH REPOS SHARE. The renderers cannot be shared: the
 * website resolves keys through MDX + `<V k="…"/>` at build time, while
 * `3d/docs/*.md` is static markdown read on GitHub and must carry the digits
 * literally. What they must agree on is the VALUE — one definition, one
 * derivation, one rounding. That is this file.
 *
 * Trajectory (§2i, Phases 20/21): this registry moves into the published
 * `@hum/physics` package, and the website's `src/data/model-values.compute.ts`
 * imports it instead of computing from synced copies of the constants. Until
 * then it lives here and reads the engine directly — which is already one copy
 * fewer than the alternative, because the engine IS the original.
 *
 * ADDING A KEY. Give it a `get()` that derives from the engine or a tracked
 * artifact — never a typed literal, or the registry becomes the thing that
 * goes stale. If a value cannot be derived outside the browser, do NOT add it:
 * leave the doc manual and say so, rather than bake a guess into automation.
 *
 * KEY NAMES AND RENDERING ARE THE WEBSITE'S CONTRACT. When the site imports
 * this registry it stops computing these numbers, so any name or precision we
 * choose differently silently changes what every page displays. Match
 * `model-values.generated.json` exactly — `tools/docs/parity-model-values.mjs`
 * measures it. Keys the site does not define are fine; keys it defines
 * DIFFERENTLY are a defect in this file until proven otherwise.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const C = require(join(ROOT, 'tools', 'lib', 'constants.js'));
/** Lazy deep-time engine (loads the ΔT/LOD chain on first key that needs it). */
const dtl = () => require(join(ROOT, 'tools', 'lib', 'deep-time.js'));
const model = rd('public/input/model-parameters.json');
const astro = rd('public/input/astro-reference.json');
const dtFit = rd('data/deltaT-4flag-fit.json');

/** `1234567.89` -> `1,234,567.89` (the form the prose uses for H). */
const thousands = (n, dp = 0) => {
  const [i, f] = Number(n).toFixed(dp).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
};

/** One named cycle of the H lattice: `<name>Years` = H/divisor and
 *  `<name>Formula` = "335,317 / divisor". `dp` undefined means the website
 *  rounds to whole years and prefixes `~`. */
const hDivisor = (name, divisor, note, dp) => ({
  [`${name}Years`]: {
    get: () => C.H / divisor,
    render: (v) => (dp === undefined ? `~${thousands(Math.round(v))}` : thousands(v, dp)),
    unit: 'yr',
    note: `${note} — H/${divisor}`,
  },
  [`${name}Formula`]: {
    get: () => C.H,
    render: (v) => `${thousands(v)} / ${divisor}`,
  },
});

/** The website's scientific-notation convention: mantissa × 10 with unicode
 *  superscript exponent (e.g. -3.93 × 10⁻⁷). Replicates its fmtSci exactly. */
const fmtSci = (n, mantissaDecimals = 1) => {
  if (!Number.isFinite(n) || n === 0) return String(n);
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  const supMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const expStr = String(exp).split('').map((c) => supMap[c] ?? c).join('');
  return `${mantissa.toFixed(mantissaDecimals)} × 10${expStr}`;
};

/** The website's signed-percent convention: below the rendering threshold the
 *  string is "< 0.01"-style rather than a misleading "+0.00". */
const fmtSignedPct = (n, decimals = 2) => {
  const abs = Math.abs(n);
  if (abs < 10 ** -decimals) return `< 0.${'0'.repeat(decimals - 1)}1`;
  return `${n >= 0 ? '+' : '-'}${abs.toFixed(decimals)}`;
};

/**
 * key -> { get, render, unit, note }
 *   get()    derives the raw number
 *   render() the exact string the prose should contain
 * Both renderers (this repo's markdown baker, the website's V component)
 * must produce the same string for the same key.
 */
export const VALUES = {
  H: {
    get: () => C.H,
    render: (v) => thousands(v),
    note: 'Earth Fundamental Cycle in years',
  },
  HPlain: {
    get: () => C.H,
    render: (v) => String(v),
    note: 'H without thousands separators (code contexts)',
  },
  deltaTStart: {
    get: () => dtFit.optimum.deltaTStart,
    render: (v) => Number(v).toFixed(2),
    unit: 's',
    note: 'ΔT trend anchor at J2000, joint-fit optimum',
  },
  usnoLodJ2000: {
    get: () => dtFit.optimum.usno_target_lod_s,
    render: (v) => thousands(v, 4),
    unit: 's',
    note: 'USNO Earth Orientation Center J2000 LOD anchor — the joint fit\'s hard-equality closure target',
  },
  deltaTEspenakRmsSeconds: {
    get: () => dtFit.optimum.espenak_rms_s,
    render: (v) => Number(v).toFixed(1),
    unit: 's',
    note: 'joint-fit RMS over the Espenak window. NOT the validate-resonator sweep figure (different window) — the two differ and have been confused before',
  },
  // ── Layer-4 solar-day family (§12h) — engine twins of the tweakpane ─────
  // Website contract: lodRealPhysical / lodH5Only / stackNetLodJ2000Ms in
  // model-values.compute.ts (the dayLength.ts port). All in the DISPLAY basis
  // (lodKinematic = IAU sidereal seconds / FOURIER sidereal days at 2000);
  // the fit's closure target `usnoLodJ2000` is expressed in the MEASURED-
  // anchor basis (IAU seconds / fc.YEAR_LENGTH_J2000_ANCHOR.sidereal). The
  // two bases differ by 0.32 ms at J2000 — the measured-vs-Fourier sidereal-
  // length spread, not an error — and the gate inside lodRealPhysical holds
  // that identity to 1e-8 s on every docs build.
  lodRealPhysical: {
    get: () => {
      const v = dtl().computeLodRealSecondsAtEpoch(2000);
      // §12h basis-consistency gate: display-basis composite + basis spread
      // must land exactly on the fit's closure target. Ties the engine, the
      // 6d anchor (fitted-coefficients.json) and the joint fit
      // (deltaT-4flag-fit.json) together — fires if any is reshipped without
      // the others. Tolerance covers the fitter's 86400-approx h5 and its
      // linear-algebra Σ vs the runtime Σ (measured ~8e-10 s). Assumes the
      // shipped flag set: running docs under DT_*_DISABLED= envs fails here
      // by design — the doc numbers assert the shipped world.
      const fc = rd('public/input/fitted-coefficients.json');
      const lodKinMeasured = C.meanSiderealYearSeconds / fc.YEAR_LENGTH_J2000_ANCHOR.sidereal;
      const lodKinFourier = dtl().computeLodKinematicSecondsAtEpoch(2000);
      const closes = v + (lodKinMeasured - lodKinFourier);
      const target = dtFit.optimum.usno_target_lod_s;
      if (Math.abs(closes - target) > 1e-8) {
        throw new Error('model-values: lodRealPhysical basis-consistency gate FAILED: '
          + `display composite ${v} + basis spread ${lodKinMeasured - lodKinFourier} `
          + `= ${closes}, but the joint fit's USNO closure target is ${target}. `
          + 'The engine, the 6d year-length anchor and the ΔT joint fit have desynced.');
      }
      return v;
    },
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer-4 physical solar day at J2000 (tweakpane Solar Day, display basis) — closes on usnoLodJ2000 in the fit\'s measured-day basis',
  },
  lodH5Only: {
    get: () => dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000),
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'raw H/5 kinematic solar day at J2000 (no ΔT cycles) — intermediate, not the physical readout',
  },
  stackNetLodJ2000Ms: {
    get: () => dtl().dtCycleLodCorrectionSum(2000) * 1000,
    render: (v) => fmtSignedPct(v, 2),
    unit: 'ms',
    note: '4-flag stack + Core-mantle swing δLOD sum at J2000 — basis-independent (= lodRealPhysical − lodH5Only)',
  },
  h5LodCorrectionMs: {
    get: () => dtl().h5Correction(2000) * 1000,
    render: (v) => Number(v).toFixed(3),
    unit: 'ms',
    note: 'H/5 ecliptic missing-motion LOD correction at J2000',
  },
  // Ours-only: doc 99 quotes the Layer-2-vs-Layer-4 display gap.
  layer2MinusLayer4GapMs: {
    get: () => {
      const tMa = (C.startmodelYear - 2000) / 1e6;
      const layer2 = dtl().meanLodSecondsAtAge(tMa) + dtl().h5Correction(2000);
      return (layer2 - dtl().computeLodRealSecondsAtEpoch(2000)) * 1000;
    },
    render: (v) => Number(v).toFixed(2),
    unit: 'ms',
    note: 'Layer 2 (tidal+GIA physics baseline + H/5) minus Layer 4 (shipped observable) at J2000',
  },
  // Ours-only: doc 99's solar-day layer table. Layer 1 (climate-MEAN α) stays
  // manual — its α-mean chain (meanLodSecondsAtAgeMeanAlpha) is browser-only.
  solarDayLayer2J2000: {
    get: () => {
      const tMa = (C.startmodelYear - 2000) / 1e6;
      return dtl().meanLodSecondsAtAge(tMa) + dtl().h5Correction(2000);
    },
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer 2 solar day at J2000: tidal + GIA physics baseline + H/5 (browser solarDayLayer2 at year 2000)',
  },
  solarDayLayer3J2000: {
    get: () => dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000)
             + (dtl().dtCycleLodCorrectionSum(2000) - dtl().resonatorSwingLodCorrection(2000)),
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer 3 solar day at J2000: kinematic + H/5 + 4-flag cycles WITHOUT the Core-mantle swing (browser solarDayLayer3 at year 2000)',
  },
  meanObliquity: {
    get: () => model.earth.earthtiltMean,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'earthtiltMean — solved so the scene reproduces the obliquity anchor at the June-2000 solstice',
  },
  eccentricityBase: {
    get: () => model.earth.eccentricityBase,
    render: (v) => Number(v).toFixed(6),
    note: 'Earth eccentricity base (locked by the Law 5 balance constraint)',
  },
  correctionSun: {
    get: () => model.foundational.correctionSun,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'Sun orbital starting angle',
  },
  // ── The H-divisor family ────────────────────────────────────────────────
  // Each named cycle is H/divisor. The website's convention, reproduced
  // exactly: a `~` prefix on the rounded ones, and axial precession alone
  // carried to 2dp (it is the one compared against the IAU figure).
  holisticYear: { get: () => C.H, render: (v) => thousands(v), note: 'alias of H' },
  grandHolisticOctave: {
    get: () => 8 * C.H,
    render: (v) => thousands(v),
    note: 'Solar System Resonance Cycle, 8H',
  },
  grandHolisticOctaveFormula: {
    get: () => C.H,
    render: (v) => `8 × ${thousands(v)}`,
  },
  ...hDivisor('inclPrec', 3, 'inclination precession'),
  ...hDivisor('eclPrec', 5, 'ecliptic precession'),
  ...hDivisor('obliqCycle', 8, 'obliquity cycle'),
  ...hDivisor('axialPrec', 13, 'axial precession', 2),
  ...hDivisor('periPrec', 16, 'perihelion precession'),
  // Two cycles the website also surfaces at the other rounding.
  axialPrecRound: {
    get: () => C.H / 13,
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'axial precession, whole years (axialPrecYears carries 2dp)',
  },
  periPrecYearsExact: {
    get: () => C.H / 16,
    render: (v) => thousands(v, 2),
    unit: 'yr',
  },
  // Bare divisors and multiples of H, rounded to whole years.
  ...Object.fromEntries([2, 21, 34].map((d) => [`hDiv${d}`, {
    get: () => C.H / d,
    render: (v) => thousands(Math.round(v)),
    unit: 'yr',
    note: `H/${d}`,
  }])),
  ...Object.fromEntries([['twoH', 2], ['threeH', 3], ['eightH', 8], ['thirteenH', 13]]
    .map(([name, m]) => [name, {
      get: () => m * C.H,
      render: (v) => thousands(v),
      unit: 'yr',
      note: `${m}H`,
    }])),

  // ── Precession/obliquity rates ──────────────────────────────────────────
  // The pure-lattice rates: a full circle of arcseconds per cycle period,
  // 1,296,000 × divisor / H, at 3dp — the website's exact form.
  ...Object.fromEntries([
    ['inclRateICRF', 3], ['inclRateEcl', 5], ['obliqRateEcl', 8],
    ['axialRateICRF', 13], ['periRate', 16],
  ].map(([name, d]) => [name, {
    get: () => (1296000 * d) / C.H,
    render: (v) => Number(v).toFixed(3),
    unit: '″/yr',
    note: `lattice rate, 1,296,000·${d}/H`,
  }])),
  obliquityRateJ2000: {
    get: () => {
      const oe = require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
      return ((oe.computeObliquityEarth(2001) - oe.computeObliquityEarth(1999)) / 2) * 3600;
    },
    render: (v) => Number(v).toFixed(4),
    unit: '″/yr',
    note: 'central difference of the fitted obliquity formula at J2000 — engine matches the website exactly',
  },
  // J2000-instantaneous precession rates. UNITS LESSON (measured, 2026-08):
  // the engine's computeLengthOfSiderealYear counts the year in LOD-days
  // (deep-time base T_sid_s/LOD_s — correct for the tweakpane mirror), while
  // computeLengthOfSolarYear counts SI-JD days. Feeding that mix into
  // sid/(sid−sol) inflates the denominator by 1e-4 and gives 50.294 against
  // the IAU-confirmed 50.289 (period 25,771 yr). The ratio needs ONE day
  // unit, so the sidereal term is re-based onto the IAU SI-day mean here.
  // SI days ≠ LOD days — the first naming rule, as arithmetic.
  axialRateJ2000: {
    get: () => {
      const oe = require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
      const dt = require(join(ROOT, 'tools', 'lib', 'deep-time.js'));
      const sidSI = oe.computeLengthOfSiderealYear(2000)
        - dt.meanSiderealYearSecondsAtAge(0) / dt.meanLodSecondsAtAge(0)
        + C.meanSiderealYearDays;
      const sol = oe.computeLengthOfSolarYear(2000);
      return (1296000 * (sidSI - sol)) / sidSI;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '″/yr',
    note: 'axial precession rate at J2000 from the Fourier year lengths, consistent SI-day basis',
  },
  // The website pins this as a literal '61.889' "to avoid a visible number
  // shift" — measured here: the current formula REPRODUCES the pin at 3dp,
  // so it can derive on both sides. anom/(anom−sol), same day unit each.
  periRateJ2000: {
    get: () => {
      const oe = require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
      const anom = oe.computeLengthOfAnomalisticYearDays(2000);
      const sol = oe.computeLengthOfSolarYear(2000);
      return (1296000 * (anom - sol)) / anom;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '″/yr',
    note: 'perihelion (climatic) precession rate at J2000 — replaces the website\'s stability pin',
  },
  // ── Earth figure (display) ──────────────────────────────────────────────
  // Derived from the PARALLAX radius, not the IAU nominal equatorial radius:
  // two distinct quantities, both shipped in astro-reference (see
  // _earthRadiiNote there). The parallax radius is the matched pair of
  // currentAUDistance via the appendix chain and is what the website's
  // EARTH_RADIUS_KM carries; the equatorial nominal (6378.1366) serves the
  // J2 figure-of-Earth term. Resolved with Dennis 2026-08 after the earlier
  // "one constant must win" framing turned out to be a unit conflation.
  earthRadius: {
    get: () => astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },
  earthDiameter: {
    get: () => 2 * astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },
  earthCircumference: {
    get: () => 2 * Math.PI * astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },

  // ── Earth eccentricity family ───────────────────────────────────────────
  // base and amplitude are the fitted pair (model-parameters); the rest are
  // derived: mean = √(base² + amp²) — the RMS of the two-component cycle, the
  // same formula the website's EARTH_ECC_MEAN uses — and min/max = base ∓ amp,
  // which the website types as prose ('~0.0140'/'~0.0167') but we derive.
  j2000Eccentricity: {
    get: () => astro.earthOrbital.earthEccentricityJ2000,
    render: (v) => Number(v).toFixed(8),
    note: 'JPL DE440 observed reference — a calibration input, not a fit product',
  },
  eccentricityDerivedMean: {
    get: () => Math.hypot(model.earth.eccentricityBase, model.earth.eccentricityAmplitude),
    render: (v) => Number(v).toFixed(7),
  },
  eccentricityMin: {
    get: () => model.earth.eccentricityBase - model.earth.eccentricityAmplitude,
    render: (v) => `~${Number(v).toFixed(4)}`,
  },
  eccentricityMax: {
    get: () => model.earth.eccentricityBase + model.earth.eccentricityAmplitude,
    render: (v) => `~${Number(v).toFixed(4)}`,
  },
  eccentricityAmplitude: {
    get: () => model.earth.eccentricityAmplitude,
    render: (v) => Number(v).toFixed(6),
    note: 'fitted pair with eccentricityBase',
  },

  // ── Earth–Sun distances and insolation (from the AU chain + eccentricity) ─
  // AU = currentAUDistance — the parallax-chain value astro-reference ships
  // (matched pair of earthParallaxRadiusKm). Distances use the OBSERVED
  // e(J2000); the insolation extremes use the model's base ∓ amplitude, i.e.
  // 1/√(1−e²) − 1 at the eccentricity-cycle extremes.
  earthSunOffsetKm: {
    get: () => Math.round(astro.earthOrbital.earthEccentricityJ2000 * astro.physicalConstants.currentAUDistance),
    render: (v) => thousands(v),
    unit: 'km',
    note: 'a × e — the wobble-center offset',
  },
  earthPerihelionDistanceKm: {
    get: () => Math.round(astro.physicalConstants.currentAUDistance * (1 - astro.earthOrbital.earthEccentricityJ2000)),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthAphelionDistanceKm: {
    get: () => Math.round(astro.physicalConstants.currentAUDistance * (1 + astro.earthOrbital.earthEccentricityJ2000)),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthApsidalDifferenceKm: {
    get: () => Math.round(2 * astro.earthOrbital.earthEccentricityJ2000 * astro.physicalConstants.currentAUDistance),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthPeriApoFluxRatioPct: {
    get: () => {
      const e = astro.earthOrbital.earthEccentricityJ2000;
      return ((1 + e) / (1 - e)) ** 2 * 100 - 100;
    },
    render: (v) => Number(v).toFixed(1),
    unit: '%',
  },
  earthInsolationIncreaseMaxPct: {
    get: () => {
      const e = model.earth.eccentricityBase + model.earth.eccentricityAmplitude;
      return (1 / Math.sqrt(1 - e * e) - 1) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
  },
  earthInsolationIncreaseMinPct: {
    get: () => {
      const e = model.earth.eccentricityBase - model.earth.eccentricityAmplitude;
      return (1 / Math.sqrt(1 - e * e) - 1) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
  },
  earthInsolationDifferencePct: {
    get: () => {
      const hi = model.earth.eccentricityBase + model.earth.eccentricityAmplitude;
      const lo = model.earth.eccentricityBase - model.earth.eccentricityAmplitude;
      return ((1 / Math.sqrt(1 - hi * hi)) - (1 / Math.sqrt(1 - lo * lo))) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
  },

  // ── Per-planet eccentricities ───────────────────────────────────────────
  // 3d SHIPS these (model-parameters: orbitalEccentricityBase locked by the
  // Law 5 balance constraint, orbitalEccentricityJ2000 the JPL observation);
  // the website RE-DERIVES its bases from the K constant + phase machinery.
  // Parity across this family is therefore a live check that the website's
  // Law-4/5 re-implementation still lands on the shipped values.
  // Decimal places per planet vary DELIBERATELY on the site (venus/earth/mars
  // 1dp in VsJ2000 because the deviations are large; the rest 2dp).
  ...Object.fromEntries(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
    .flatMap((p) => [
      // NB: these live on the engine's composed constants (C.planets — the
      // K-derivation output), NOT in raw model-parameters.json.
      [`${p}EccBase`, {
        get: () => C.planets[p].orbitalEccentricityBase,
        render: (v) => Number(v).toFixed(5),
      }],
      [`${p}EccJ2000`, {
        get: () => C.planets[p].orbitalEccentricityJ2000,
        render: (v) => Number(v).toFixed(5),
        note: 'JPL observed',
      }],
      [`${p}EccVsJ2000`, {
        get: () => (C.planets[p].orbitalEccentricityBase
          / C.planets[p].orbitalEccentricityJ2000 - 1) * 100,
        render: (v) => fmtSignedPct(v, { venus: 1, mars: 1 }[p] ?? 2),
        unit: '%',
      }],
    ])),
  earthEccBase: {
    get: () => model.earth.eccentricityBase,
    render: (v) => Number(v).toFixed(5),
  },
  earthEccVsJ2000: {
    get: () => (model.earth.eccentricityBase / astro.earthOrbital.earthEccentricityJ2000 - 1) * 100,
    render: (v) => fmtSignedPct(v, 1),
    unit: '%',
  },
  earthEccJ2000VsBasePct: {
    get: () => (astro.earthOrbital.earthEccentricityJ2000 / model.earth.eccentricityBase - 1) * 100,
    render: (v) => Number(v).toFixed(1),
    unit: '%',
    note: 'how far the J2000 observation sits above the oscillation midpoint',
  },

  // ── Per-planet inclinations and ascending nodes ─────────────────────────
  // InclEcl: the J2000 ecliptic inclination (composed constants).
  // OmegaSS: Souami & Souchay (2012) Table 2 invariable-plane nodes — the
  //   website TYPES these as literals; we derive them from astro-reference's
  //   ascendingNodesSouamiSouchay block (same digits, one source).
  // OmegaDelta: the model's invariable-plane node minus the S&S reference —
  //   the "verified delta" the site quotes per planet.
  ...Object.fromEntries(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
    .flatMap((p) => [
      [`${p}InclEcl`, {
        get: () => C.planets[p].eclipticInclinationJ2000,
        render: (v) => Number(v).toFixed(3),
        unit: '°',
      }],
      [`${p}OmegaSS`, {
        get: () => astro.ascendingNodesSouamiSouchay[p],
        render: (v) => Number(v).toFixed(2),
        unit: '°',
        note: 'Souami & Souchay 2012, external reference',
      }],
      [`${p}OmegaDelta`, {
        get: () => C.planets[p].ascendingNodeInvPlane - astro.ascendingNodesSouamiSouchay[p],
        render: (v) => fmtSignedPct(v, 2),
        unit: '°',
      }],
    ])),

  // ── Obliquity family ────────────────────────────────────────────────────
  // Two distinct means, per the model's taxonomy: earthtiltMean (the solved
  // scene parameter, "axial tilt" family) and SOLSTICE_OBLIQUITY_MEAN (the
  // fitted Fourier mean of the 16-term solstice-obliquity series,
  // "pythagorean" on the site). Min/max are the envelope of the full series
  // over one H (10,000 samples, same as the website's _obliqEnvelope — the
  // series is H-periodic, so the phase origin cancels in the extrema).
  pythagoreanMeanObliquity: {
    get: () => C.SOLSTICE_OBLIQUITY_MEAN,
    render: (v) => Number(v).toFixed(3),
    unit: '°',
  },
  meanObliquityVsJ2000Diff: {
    get: () => Math.abs(astro.earthOrbital.obliquityJ2000_deg - model.earth.earthtiltMean),
    render: (v) => Number(v).toFixed(3),
    unit: '°',
  },
  obliquityAmplitude: {
    get: () => 2 * model.earth.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'peak-to-peak of the inclination-driven component, 2A',
  },
  ...(() => {
    const envelope = () => {
      const steps = 10000;
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < steps; i++) {
        const c = i / steps;
        let obliq = C.SOLSTICE_OBLIQUITY_MEAN;
        for (const [div, sinC, cosC] of C.SOLSTICE_OBLIQUITY_HARMONICS) {
          const phase = 2 * Math.PI * c * div;
          obliq += sinC * Math.sin(phase) + cosC * Math.cos(phase);
        }
        if (obliq < min) min = obliq;
        if (obliq > max) max = obliq;
      }
      return { min, max };
    };
    let cached;
    const env = () => (cached ??= envelope());
    return {
      obliquityMin: { get: () => env().min, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMax: { get: () => env().max, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMinRound: { get: () => env().min, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMaxRound: { get: () => env().max, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityRangeInline: {
        // get() must return a number for resolveAll's sanity guard; render
        // reads both extrema from the cached envelope directly.
        get: () => env().min,
        render: () => `~${env().min.toFixed(2)}° – ~${env().max.toFixed(2)}°`,
      },
    };
  })(),
  axialTiltMin: {
    get: () => model.earth.earthtiltMean - model.earth.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(2),
    unit: '°',
  },
  axialTiltMax: {
    get: () => model.earth.earthtiltMean + model.earth.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(2),
    unit: '°',
  },

  // ── Cycle timing (phase-dependent scans) ────────────────────────────────
  // These ask WHEN, not how much — extremum searches over the runtime
  // evaluators. The obliquity/inclination evaluators were probed pointwise
  // against the website's before adding (22.5147 at year 13664; inclination
  // max near −23204), so the scans agree end-to-end.
  ...(() => {
    const oe = () => require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
    let obliqScan, inclScan;
    const nextObliqMin = () => {
      if (!obliqScan) {
        const f = oe().computeObliquityEarth;
        let mn = Infinity, mnYr = 0;
        for (let y = 2000; y <= 35000; y++) {
          const o = f(y);
          if (o < mn) { mn = o; mnYr = y; }
        }
        obliqScan = { mn, mnYr };
      }
      return obliqScan;
    };
    const lastInclMax = () => {
      if (!inclScan) {
        const f = oe().computeInclinationEarth;
        let mx = -Infinity, mxYr = 0;
        for (let y = 2000; y >= -120000; y--) {
          const i = f(y);
          if (i > mx) { mx = i; mxYr = y; }
        }
        inclScan = { mx, mxYr };
      }
      return inclScan;
    };
    return {
      obliquityNextMin: { get: () => nextObliqMin().mn, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityNextMinYear: { get: () => nextObliqMin().mnYr, render: (v) => thousands(v) },
      inclinationLastMaxYear: {
        get: () => lastInclMax().mxYr,
        render: (v) => (v < 0 ? `${thousands(-v)} BC` : thousands(v)),
        note: 'most recent past maximum of Earth\'s invariable-plane inclination',
      },
    };
  })(),
  // ── Precession family (11-2m) — the formerly deferred scan keys ─────────
  // Browser-route ratios (script.js :56309/:56339/:56340): seconds = direct
  // Fourier days × o.lodKinematic, so lodKinematic cancels and the DAYS
  // routes decide the values — the direct Step 6d fits on the integrated
  // axis (deep-time.js compute*DaysDirect, bit-proven against the live
  // page). Porting these surfaced the fourth WEBSITE defect: its forecast
  // scan used the cardinal-mean solar year + snapshot-phase sidereal Fourier
  // and read 25,314 @ 12,411 where the simulator computes 25,312 @ 12,440
  // (site routes corrected in dayYear.ts/precession.ts, snapshot
  // regenerated). The full-cycle envelope and J2000 rates were robust to the
  // route difference; only the ±35 kyr forecast extrema moved.
  ...(() => {
    const precAt = (y) => {
      const d = dtl().computeYearDaysDirectAll(y);
      const lodKin = C.meanSiderealYearSeconds / d.sidereal;
      const sidS = d.sidereal * lodKin;
      const solS = d.tropical * lodKin;
      const anomS = d.anomalistic * lodKin;
      return { a: sidS / (sidS - solS), p: anomS / (anomS - solS), i: anomS / (anomS - sidS) };
    };
    let forecast = null, cycle = null;
    const axialForecast = () => {
      if (!forecast) {
        let mn = Infinity, mnYr = 0, mx = -Infinity, mxYr = 0;
        for (let y = 2000; y <= 35000; y++) {
          const a = precAt(y).a;
          if (a < mn) { mn = a; mnYr = y; }
          if (a > mx) { mx = a; mxYr = y; }
        }
        forecast = { mn, mnYr, mx, mxYr };
      }
      return forecast;
    };
    const cycleScan = () => {
      if (!cycle) {
        let aMn = Infinity, aMx = -Infinity, pMn = Infinity, pMx = -Infinity, iMn = Infinity, iMx = -Infinity;
        for (let y = 2000; y <= 2000 + C.H; y++) {
          const r = precAt(y);
          if (r.a < aMn) aMn = r.a;
          if (r.a > aMx) aMx = r.a;
          if (r.p < pMn) pMn = r.p;
          if (r.p > pMx) pMx = r.p;
          if (r.i < iMn) iMn = r.i;
          if (r.i > iMx) iMx = r.i;
        }
        cycle = { aMn, aMx, pMn, pMx, iMn, iMx };
      }
      return cycle;
    };
    const wholeYears = (v) => thousands(Math.round(v));
    return {
      axialPrecMinPeriod: { get: () => axialForecast().mn, render: wholeYears, unit: 'yr', note: 'next forecast minimum of the axial precession period (scan 2000..+35000)' },
      axialPrecMinYear:   { get: () => axialForecast().mnYr, render: (v) => thousands(v) },
      axialPrecMaxPeriod: { get: () => axialForecast().mx, render: wholeYears, unit: 'yr' },
      axialPrecMaxYear:   { get: () => axialForecast().mxYr, render: (v) => thousands(v) },
      axialPrecCycleMin:  { get: () => cycleScan().aMn, render: wholeYears, unit: 'yr', note: 'axial precession period extrema over one full H' },
      axialPrecCycleMax:  { get: () => cycleScan().aMx, render: wholeYears, unit: 'yr' },
      periPrecCycleMin:   { get: () => cycleScan().pMn, render: wholeYears, unit: 'yr' },
      periPrecCycleMax:   { get: () => cycleScan().pMx, render: wholeYears, unit: 'yr' },
      inclPrecCycleMin:   { get: () => cycleScan().iMn, render: wholeYears, unit: 'yr' },
      inclPrecCycleMax:   { get: () => cycleScan().iMx, render: wholeYears, unit: 'yr' },
      axialPrecJ2000:     { get: () => precAt(2000).a, render: wholeYears, unit: 'yr', note: 'instantaneous J2000 axial precession period (direct-route ratio)' },
      periPrecJ2000:      { get: () => precAt(2000).p, render: wholeYears, unit: 'yr' },
      inclPrecJ2000:      { get: () => precAt(2000).i, render: wholeYears, unit: 'yr' },
    };
  })(),

  // ── Obliquity reference tables (11-2n) — Model vs La2004 vs Chapront ────
  // Model values from the engine's computeObliquityEarth; La2004 values
  // DERIVED from the tracked artifact public/input/la2004-orbital-solution
  // .json (1-kyr grid, years-from-J2000 axis, linear interpolation at the
  // three off-grid epochs) — the website typed all twelve as literals citing
  // exactly that file; Chapront (2002) citation values from astro-reference's
  // obliquityChapront2002 block (the 11-2i Souami pattern: citations live in
  // the tracked reference JSON, one source).
  ...(() => {
    const laskarObliquityDeg = (calYear) => {
      const rows = new Map(rd('public/input/la2004-orbital-solution.json').data
        .map((r) => [r.year, r.obliquity]));
      const t = calYear - 2000;
      if (rows.has(t)) return rows.get(t);
      const lo = Math.floor(t / 1000) * 1000;
      const hi = lo + 1000;
      if (!rows.has(lo) || !rows.has(hi)) {
        throw new Error(`model-values: La2004 grid has no bracket for calendar year ${calYear}`);
      }
      return rows.get(lo) + ((t - lo) / 1000) * (rows.get(hi) - rows.get(lo));
    };
    const oeOb = (y) => require(join(ROOT, 'tools', 'lib', 'orbital-engine.js')).computeObliquityEarth(y);
    const refs = [
      { year: -10000, key: '10000BC', chapront: 'deg10000BC' },
      { year: -9233,  key: '9233BC' },
      { year: -1000,  key: '1000BC' },
      { year: 2000,   key: '2000AD' },
      { year: 2050,   key: '2050AD' },
      { year: 3000,   key: '3000AD' },
      { year: 5000,   key: '5000AD' },
      { year: 7000,   key: '7000AD' },
      { year: 10000,  key: '10000AD', chapront: 'deg10000AD' },
      { year: 11725,  key: '11725AD' },
      { year: 12000,  key: '12000AD' },
      { year: 20000,  key: '20000AD' },
    ];
    const out = {};
    for (const r of refs) {
      out[`obliqModel${r.key}`] = {
        get: () => oeOb(r.year),
        render: (v) => Number(v).toFixed(4),
        unit: '°',
      };
      out[`obliqLaskar${r.key}`] = {
        get: () => laskarObliquityDeg(r.year),
        render: (v) => Number(v).toFixed(4),
        unit: '°',
        note: 'La2004 obliquity from the tracked artifact (interpolated where off-grid)',
      };
      if (r.chapront) {
        out[`obliqChapront${r.key}`] = {
          get: () => astro.obliquityChapront2002[r.chapront],
          render: (v) => Number(v).toFixed(4),
          unit: '°',
          note: 'Chapront, Chapront-Touze & Francou (2002) citation value',
        };
      }
    }
    out.obliquityCurrent = {
      get: () => oeOb(2000),
      render: (v) => Number(v).toFixed(4),
      unit: '°',
    };
    return out;
  })(),

  // Next turning points of the millennial LOD cycle — sign-change scan of the
  // 4-flag + swing δLOD sum, mirroring the website's forward scan (descending
  // phase at J2000, so trough first, then peak).
  ...(() => {
    let turns = null;
    const stackTurns = () => {
      if (!turns) {
        let prev = dtl().dtCycleLodCorrectionSum(2000);
        let prevSign = 0, trough = 0, peak = 0;
        for (let y = 2001; y <= 6000 && (trough === 0 || peak === 0); y++) {
          const v = dtl().dtCycleLodCorrectionSum(y);
          const s = Math.sign(v - prev);
          if (prevSign !== 0 && s !== 0 && s !== prevSign) {
            if (prevSign < 0 && trough === 0) trough = y - 1;
            else if (prevSign > 0 && trough !== 0 && peak === 0) peak = y - 1;
          }
          if (s !== 0) prevSign = s;
          prev = v;
        }
        turns = { trough, peak };
      }
      return turns;
    };
    return {
      stackNextTroughYear: { get: () => stackTurns().trough, render: (v) => thousands(v) },
      stackNextPeakYear:   { get: () => stackTurns().peak, render: (v) => thousands(v) },
    };
  })(),

  // ── Earth invariable-plane inclination family (11-2o) ───────────────────
  // The MEAN is DERIVED in both runtimes — J2000 inclination minus
  // amplitude·cos(perihelionLong − cycleAnchor), the engine's
  // earthInvPlaneInclinationMean (the website types the result, 1.48113, as
  // a literal). Amplitude from model-parameters; J2000 / node / anchor from
  // astro-reference earthOrbital (the node is the Souami & Souchay value).
  earthInclMean: {
    get: () => C.earthInvPlaneInclinationMean,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'derived: earthInclinationJ2000 − amplitude·cos(perihelionLongJ2000 − cycleAnchor)',
  },
  earthInclAmplitude: {
    get: () => C.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
  },
  earthInclAmp: {
    get: () => C.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'alias of earthInclAmplitude (both shipped by the website)',
  },
  earthInclD: {
    get: () => 3,
    render: (v) => String(v),
    note: 'H-lattice divisor of the inclination cycle (H/3) — structural integer',
  },
  earthInclMin: {
    get: () => C.earthInvPlaneInclinationMean - C.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(3),
    unit: '°',
  },
  earthInclMax: {
    get: () => C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude,
    render: (v) => Number(v).toFixed(3),
    unit: '°',
  },
  earthInclJ2000: {
    get: () => astro.earthOrbital.earthInclinationJ2000_deg,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
  },
  earthAscNodeJ2000: {
    get: () => astro.earthOrbital.earthAscendingNodeInvPlane,
    render: (v) => Number(v).toFixed(2),
    unit: '°',
    note: 'Souami & Souchay invariable-plane ascending node',
  },
  earthInclCycleAnchor: {
    get: () => astro.earthOrbital.earthInclinationCycleAnchor,
    render: (v) => Number(v).toFixed(2),
    unit: '°',
  },

  // ── Year/day-length family (11-2p) — the unit-trap tier ─────────────────
  // Every quantity pinned to its exact browser twin. MEAN family: the
  // H/13-identity constants (kinematic day basis — meanLengthOfDay, NOT the
  // SI day and NOT Layer-4 LOD_real). J2000 family: the direct Step 6d
  // Fourier evaluations, seconds = days × lodKinematic (the tweakpane's
  // convention, preserving the sidereal round-trip identity).
  // stellarDayJ2000 uses OF-DATE obliquity at 2000 (script.js:56318) —
  // porting it surfaced the fifth website defect: its J2000 constant used
  // the MEAN-ε RA projection, one final digit below the simulator's readout
  // (86,164.098895 vs .098896; fixed website-side, snapshot regenerated).
  ...(() => {
    const meanSiderealDaySeconds = () =>
      (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay;
    const meanStellarDaySeconds = () => {
      const raProjMean = Math.cos((C.SOLSTICE_OBLIQUITY_MEAN * Math.PI) / 180);
      const d = meanSiderealDaySeconds();
      return (d / (C.H / 13)) / (C.meanSolarYearDays + 1) * raProjMean + d;
    };
    const siderealDayJ2000Seconds = () => {
      const sol = dtl().computeSolarYearDaysDirect(2000);
      return (sol * dtl().computeLodKinematicSecondsAtEpoch(2000)) / (sol + 1);
    };
    return {
      meanSolarYearDays:     { get: () => C.meanSolarYearDays, render: (v) => thousands(v, 7), unit: 'd' },
      meanSolarYearDaysFull: { get: () => C.meanSolarYearDays, render: (v) => thousands(v, 12), unit: 'd', note: 'full-precision form for derivation contexts' },
      inputSolarYearDays:    { get: () => model.foundational.inputmeanlengthsolaryearindays, render: (v) => String(v), unit: 'd', note: 'the mean-tropical-year INPUT parameter' },
      daysPerPeriPrec:       { get: () => Math.round((C.H / 16) * C.meanSolarYearDays), render: (v) => thousands(v), note: 'days per perihelion-precession cycle, (H/16)·mSY' },
      solarYearJ2000Days:    { get: () => dtl().computeSolarYearDaysDirect(2000), render: (v) => thousands(v, 7), unit: 'd' },
      solarYearJ2000Seconds: { get: () => dtl().computeSolarYearDaysDirect(2000) * dtl().computeLodKinematicSecondsAtEpoch(2000), render: (v) => thousands(v, 2), unit: 's', note: 'tweakpane predictions.solarYearSeconds = days × lodKinematic' },
      meanSiderealYearDays:  { get: () => C.meanSiderealYearDaysKinematic, render: (v) => thousands(v, 7), unit: 'd', note: 'framework H/13-kinematic mean — NOT the IAU 365.256363004 Fourier baseline' },
      siderealYearSeconds:   { get: () => C.meanSiderealYearSeconds, render: (v) => thousands(v, 2), unit: 's', note: 'IAU sidereal year in SI seconds (31,558,149.7635)' },
      siderealYearJ2000Days: { get: () => dtl().computeSiderealYearDaysDirect(2000), render: (v) => thousands(v, 8), unit: 'd' },
      anomalisticYearDays:   { get: () => C.meanAnomalisticYearDays, render: (v) => thousands(v, 7), unit: 'd' },
      anomalisticYearSeconds: { get: () => C.meanAnomalisticYearDays * C.meanLengthOfDay, render: (v) => thousands(v, 2), unit: 's' },
      anomalisticYearJ2000Days: { get: () => dtl().computeAnomalisticYearDaysDirect(2000), render: (v) => thousands(v, 7), unit: 'd' },
      anomalisticYearJ2000Seconds: { get: () => dtl().computeAnomalisticYearDaysDirect(2000) * dtl().computeLodKinematicSecondsAtEpoch(2000), render: (v) => thousands(v, 2), unit: 's' },
      siderealSolarDiffSeconds: {
        get: () => {
          const lodKin = dtl().computeLodKinematicSecondsAtEpoch(2000);
          return dtl().computeSiderealYearDaysDirect(2000) * lodKin
               - dtl().computeSolarYearDaysDirect(2000) * lodKin;
        },
        render: (v) => thousands(v, 1),
        unit: 's',
        note: 'sidereal − tropical year at J2000, both in lodKinematic seconds',
      },
      siderealSolarMeanDiffSeconds: {
        get: () => (C.meanSiderealYearDaysKinematic - C.meanSolarYearDays) * C.meanLengthOfDay,
        render: (v) => thousands(v, 2),
        unit: 's',
      },
      meanSolarDaySeconds:    { get: () => C.meanLengthOfDay, render: (v) => thousands(v, 6), unit: 's', note: 'LOD_mean, the H/13-identity kinematic day' },
      meanSiderealDaySeconds: { get: meanSiderealDaySeconds, render: (v) => thousands(v, 7), unit: 's' },
      meanStellarDaySeconds:  { get: meanStellarDaySeconds, render: (v) => thousands(v, 7), unit: 's' },
      stellarSiderealDayDiffMs: {
        get: () => (meanStellarDaySeconds() - meanSiderealDaySeconds()) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'the RA-projected (m = p·cos ε) offset — compare IAU 8.373 ms',
      },
      axialCoinRotationMs: {
        get: () => (meanSiderealDaySeconds() / (C.H / 13)) / (C.meanSolarYearDays + 1) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'UNPROJECTED ecliptic-lattice count (one extra sidereal day per axial cycle) — deliberately not the 8.37 ms projected offset',
      },
      siderealDayJ2000: { get: siderealDayJ2000Seconds, render: (v) => thousands(v, 6), unit: 's' },
      stellarDayJ2000: {
        get: () => {
          const sol = dtl().computeSolarYearDaysDirect(2000);
          const d = siderealDayJ2000Seconds();
          const oe = require(join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
          const raProj = Math.cos((oe.computeObliquityEarth(2000) * Math.PI) / 180);
          return (d / (C.H / 13)) / (sol + 1) * raProj + d;
        },
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'OF-DATE obliquity projection at 2000 — the simulator readout (script.js:56318)',
      },
    };
  })(),

  // ── dLOD/dt decomposition + J2000 day identities (11-2q) ────────────────
  // The channels come LIVE from the engine's dLodDtDecompositionAtAge at
  // t_Ma = −5e-7 (model epoch 2000.5 — the same convention
  // export-to-holistic.js Section 7 syncs the website's DLOD_* literals
  // from), so the registry replaces the synced-literal chain with the
  // derivation itself. Nets are the engine's own net_L2/L3/L4, not sums of
  // rounded channels — verified to render identically. solarDayJ2000 is the
  // SI day definition (86400 exactly), NOT lodRealPhysical.
  ...(() => {
    let dlod = null;
    const dl = () => { if (!dlod) dlod = dtl().dLodDtDecompositionAtAge(-5e-7); return dlod; };
    const signed2 = (v) => fmtSignedPct(v, 2);
    return {
      dLodDtTidalJ2000:      { get: () => dl().tidal, render: signed2, unit: 'ms/cy', note: 'Moon-recession tidal baseline (Farhat 2022 / LLR α₁)' },
      dLodDtGiaJ2000:        { get: () => dl().gia, render: signed2, unit: 'ms/cy', note: 'GIA channel (L1-orbital α(t))' },
      dLodDtAllCyclesJ2000:  { get: () => dl().stack, render: signed2, unit: 'ms/cy', note: 'Σ d/dt of the 4-flag stack' },
      dLodDtResonatorJ2000:  { get: () => dl().resonator, render: signed2, unit: 'ms/cy', note: 'Core-mantle swing (analytic rate)' },
      dLodDtNetSecularJ2000: { get: () => dl().net_L2, render: signed2, unit: 'ms/cy', note: 'tidal + GIA ≈ IERS +1.75' },
      dLodDtNetL3J2000:      { get: () => dl().net_L3, render: signed2, unit: 'ms/cy' },
      dLodDtNetFullJ2000:    { get: () => dl().net_L4, render: signed2, unit: 'ms/cy', note: 'the shipped Layer-4 observable rate' },
      iersObservedDLodDt: {
        get: () => astro.knownValues.iersObservedDLodDtMsPerCy,
        render: signed2,
        unit: 'ms/cy',
        note: 'IERS observed secular LOD rate — citation, the model comparator',
      },
      solarDayJ2000: {
        get: () => 86400,
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'the SI day definition — NOT lodRealPhysical (Layer-4 actual LOD)',
      },
      eclipticSiderealDayJ2000: {
        get: () => {
          const sol = dtl().computeSolarYearDaysDirect(2000);
          const sidDay = (sol * dtl().computeLodKinematicSecondsAtEpoch(2000)) / (sol + 1);
          const meanSidDay = (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay;
          const axialCoinMs = (meanSidDay / (C.H / 13)) / (C.meanSolarYearDays + 1) * 1000;
          return sidDay + axialCoinMs / 1000;
        },
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'sidereal day + the UNPROJECTED per-day precession (ecliptic-longitude counterpart of the stellar day)',
      },
      stackOvershootMs: {
        get: () => ((dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000))
                    - dtl().computeLodRealSecondsAtEpoch(2000)) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'raw H/5 kinematic minus Layer 4 — |stackNetLodJ2000Ms|, kept in lockstep by derivation',
      },
    };
  })(),

  // ── Eclipse audit + LOD-climate + 8H cycle periods (11-2r) ──────────────
  // The eclipse and correlation numbers are MEASURED CAMPAIGN RESULTS with
  // no engine derivation; their tracked homes are the two new data/ summary
  // JSONs (provenance in each _description — the website typed all of them
  // as literals). The framework-vs-NASA gap keys and percentages are DERIVED
  // from the artifact so a re-run flows through. The 8H cycle periods are
  // structural lattice integers over C.H — zero-fit.
  ...(() => {
    const ecl = rd('data/eclipse-audit-summary.json');
    const clim = rd('data/lod-climate-correlation-summary.json');
    const L = ecl.lunar, S = ecl.solar;
    return {
      lunarResidualRmsSeconds:   { get: () => L.frameworkMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      lunarResidualMinutes:      { get: () => L.frameworkMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualSecondsModel: { get: () => S.frameworkMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      solarResidualMinutes:      { get: () => S.frameworkMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      nasaLunarResidualSeconds:  { get: () => L.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      nasaLunarResidualMinutes:  { get: () => L.nasaMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualSecondsNasa:  { get: () => S.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      nasaSolarResidualMinutes:  { get: () => S.nasaMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      lunarEventsBeatingNasa:    { get: () => L.eventsBeatingNasa, render: (v) => thousands(v) },
      lunarEventsTotal:          { get: () => L.eventsTotal, render: (v) => thousands(v) },
      lunarEventsRawTotal:       { get: () => L.eventsRawTotal, render: (v) => thousands(v), note: 'raw count before the NASA-polynomial validity filter' },
      lunarBeatingNasaPct:       { get: () => 100 * L.eventsBeatingNasa / L.eventsTotal, render: (v) => Number(v).toFixed(1), unit: '%' },
      solarEventsBeatingNasa:    { get: () => S.eventsBeatingNasa, render: (v) => thousands(v) },
      solarEventsTotal:          { get: () => S.eventsTotal, render: (v) => thousands(v) },
      solarBeatingNasaPct:       { get: () => 100 * S.eventsBeatingNasa / S.eventsTotal, render: (v) => Number(v).toFixed(1), unit: '%' },
      lunarResidualGapAboveNasaSeconds: { get: () => L.frameworkMeanAbsResidualSeconds - L.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      lunarResidualGapAboveNasaMinutes: { get: () => (L.frameworkMeanAbsResidualSeconds - L.nasaMeanAbsResidualSeconds) / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualGapAboveNasaSeconds: { get: () => S.frameworkMeanAbsResidualSeconds - S.nasaMeanAbsResidualSeconds, render: (v) => fmtSignedPct(v, 0), unit: 's' },
      bondIrdCorrelation:            { get: () => clim.bondIrdPearsonR, render: (v) => fmtSignedPct(v, 2), note: 'out-of-sample Pearson r vs Bond 2001 IRD — shipped as open correspondence, NOT validation (fails the docs/103 null tests)' },
      gisp2CorrelationForComparison: { get: () => clim.gisp2PearsonR, render: (v) => fmtSignedPct(v, 2) },
      signConventionHitsWindow:      { get: () => clim.signConventionHits, render: (v) => String(v) },
      signConventionTotalWindow:     { get: () => clim.signConventionTotal, render: (v) => String(v) },
      validatedWindowStartBC:        { get: () => -clim.validatedWindowStartYear, render: (v) => thousands(v), note: 'rendered as the BC year number' },
      validatedWindowEndAD:          { get: () => clim.validatedWindowEndYear, render: (v) => thousands(v) },
      bondYr:      { get: () => Math.round(C.H * 8 / 1830), render: (v) => thousands(v), unit: 'yr', note: '8H/1830 — Bond 2001 ~1470 yr N-Atlantic IRD (gcd 61)' },
      hallstattYr: { get: () => Math.round(C.H * 8 / 1104), render: (v) => thousands(v), unit: 'yr', note: '8H/1104 = H/138 — Hallstatt solar-activity cycle (gcd 23)' },
      joseFiveYr:  { get: () => Math.round(C.H * 8 / 2989), render: (v) => thousands(v), unit: 'yr', note: '8H/2989 — 5 × Charvátová Jose 179 (gcd 61)' },
      joseFourYr:  { get: () => Math.round(C.H * 8 / 3749), render: (v) => thousands(v), unit: 'yr', note: '8H/3749 — 4 × Charvátová Jose 179 (gcd 23)' },
    };
  })(),

  // ── GIA α(t) constants + audit-26 + Babylon −135 (11-2s) ────────────────
  // alphaJ2000 from astro physicalConstants; the calibrated scale LIVE from
  // the engine (deep-time.js ALPHA_CLIMATE_SCALE — the value
  // export-to-holistic syncs to the website); Cox & Chao dJ2/dt and the
  // Peltier factor from the new giaCoxChaoPeltier citation block, with
  // dAlphaDtJ2000 DERIVED (= dJ2Dt / factor) so the calibration identity
  // auto-holds. The audit-26 verdict counts and the Babylon −135 case study
  // are campaign measurements — recorded in eclipse-audit-summary.json's
  // audit26/babylon135 sections (same maintenance note + planned generator),
  // with the alignment/scan-reach/total rollups derived.
  ...(() => {
    const ecl = rd('data/eclipse-audit-summary.json');
    const a26 = ecl.audit26, b135 = ecl.babylon135;
    const alignment = () => a26.confirmed + a26.offPeak;
    const scanReach = () => alignment() + a26.regional + a26.dtRegional;
    return {
      alphaJ2000:         { get: () => astro.physicalConstants.earthMoiFactorJ2000, render: (v) => String(v), note: 'IERS Conventions 2010 Earth moment-of-inertia factor' },
      alphaClimateScale:  { get: () => dtl().ALPHA_CLIMATE_SCALE, render: (v) => fmtSci(v, 2), unit: 'per ‰', note: 'calibrated so dα/dt(J2000) matches Cox & Chao — live from the engine' },
      dAlphaDtJ2000:      { get: () => astro.giaCoxChaoPeltier.dJ2DtPerYr / astro.giaCoxChaoPeltier.j2ToAlphaFactor, render: (v) => fmtSci(v, 2), unit: '/yr', note: 'DERIVED: dJ₂/dt ÷ Peltier factor, so the identity auto-holds' },
      coxChaoDJ2Dt:       { get: () => astro.giaCoxChaoPeltier.dJ2DtPerYr, render: (v) => fmtSci(v, 1), unit: '/yr', note: 'Cox & Chao 2002 satellite gravimetry — citation' },
      giaJ2ToAlphaFactor: { get: () => astro.giaCoxChaoPeltier.j2ToAlphaFactor, render: (v) => Number(v).toFixed(1), note: 'Peltier ICE-6G LOD-coupling axisymmetric-GIA factor — citation' },
      solarAudit26Confirmed:  { get: () => a26.confirmed, render: (v) => thousands(v) },
      solarAudit26OffPeak:    { get: () => a26.offPeak, render: (v) => thousands(v) },
      solarAudit26Regional:   { get: () => a26.regional, render: (v) => thousands(v) },
      solarAudit26DTRegional: { get: () => a26.dtRegional, render: (v) => thousands(v) },
      solarAudit26Geographic: { get: () => a26.geographic, render: (v) => thousands(v) },
      solarAudit26Alignment:  { get: alignment, render: (v) => thousands(v), note: 'derived: confirmed + off-peak' },
      solarAudit26ScanReach:  { get: scanReach, render: (v) => thousands(v), note: 'derived: alignment + regional + ΔT-regional' },
      solarAudit26Total:      { get: () => scanReach() + a26.geographic, render: (v) => thousands(v), note: 'derived rollup of the five verdict categories' },
      babylon135BestGapKm:   { get: () => b135.bestGapKm, render: (v) => String(v), unit: 'km' },
      babylon135BestDeltaUT: { get: () => b135.bestDeltaUT, render: (v) => String(v) },
      babylon135FrameworkUT: { get: () => b135.frameworkUT, render: (v) => String(v) },
      babylon135DocumentedUT: { get: () => b135.documentedUT, render: (v) => String(v) },
    };
  })(),

  // ── Scene anchors + Moon months (11-2t) ─────────────────────────────────
  // Anchor years/JDs and offsets from the engine constants (porting these
  // surfaced the SIXTH website defect: its hardcoded PERI_ALIGN_JD 2,176,152
  // sat one day below the simulator's constant 2,176,153 — the raw value
  // lands on a 0.5 rounding boundary and the sim's FP evaluation is the
  // shipped convention; fixed website-side, both dependent keys moved). The
  // ecc-extremum years are H/16 phase arithmetic off the perihelion
  // alignment year. Moon months from the engine's H-lattice month chain.
  ...(() => {
    const HDIV16 = () => C.H / 16;
    return {
      meanSolarDay: { get: () => C.meanLengthOfDay, render: (v) => '~' + thousands(v, 0), unit: 's', note: 'prose approximation' },
      siderealDay:  { get: () => (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay, render: (v) => '~' + thousands(v, 2), unit: 's' },
      stellarDay: {
        get: () => {
          const d = (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay;
          return (d / (C.H / 13)) / (C.meanSolarYearDays + 1) * Math.cos((C.SOLSTICE_OBLIQUITY_MEAN * Math.PI) / 180) + d;
        },
        render: (v) => '~' + thousands(v, 2),
        unit: 's',
      },
      oneAU: { get: () => C.currentAUDistance, render: (v) => thousands(v, 6), unit: 'km', note: 'the model-derived AU' },
      balancedYear:     { get: () => C.balancedYear, render: (v) => thousands(v) },
      balancedYearBC:   { get: () => Math.abs(C.balancedYear), render: (v) => thousands(v) + ' BC' },
      periAlignYear:    { get: () => C.perihelionalignmentYear, render: (v) => String(v) },
      periAlignYearRound: { get: () => C.perihelionalignmentYear, render: (v) => Number(v).toFixed(2) },
      periAlignJD:      { get: () => C.perihelionalignmentJD, render: (v) => thousands(v), unit: 'JD' },
      eccNextMax:  { get: () => Math.round(C.perihelionalignmentYear + HDIV16()), render: (v) => thousands(v), note: 'perihelion alignment + H/16' },
      eccNextMin:  { get: () => Math.round(C.perihelionalignmentYear + HDIV16() / 2), render: (v) => thousands(v) },
      eccPrevMin:  { get: () => Math.round(Math.abs(C.perihelionalignmentYear - HDIV16() / 2)), render: (v) => thousands(v) },
      eccPrevMinBC: { get: () => Math.round(Math.abs(C.perihelionalignmentYear - HDIV16() / 2)), render: (v) => thousands(v) + ' BC' },
      eccPrevMinJD: { get: () => C.perihelionalignmentJD - (HDIV16() * C.meanSolarYearDays / 2), render: (v) => thousands(v, 1), unit: 'JD' },
      nextBalancedYear: { get: () => C.balancedYear + C.H, render: (v) => thousands(v) },
      tempGraphMostLikely: { get: () => C.temperatureGraphMostLikely, render: (v) => String(v), note: 'temperature-graph phase pick (14.5 H/16 cycles)' },
      balancedYearOffset: { get: () => Math.round(C.temperatureGraphMostLikely * HDIV16()), render: (v) => thousands(v), unit: 'yr' },
      anchorYearOffset:   { get: () => Math.abs(C.balancedYear), render: (v) => thousands(v), unit: 'yr' },
      systemResetYearBC:  { get: () => Math.abs(C.balancedYear - 7 * C.H), render: (v) => thousands(v) + ' BC', note: 'balancedYear − 7H (the System Reset anchor)' },
      moonDiameter:       { get: () => astro.bodyDiametersKm.moon, render: (v) => thousands(v, 1), unit: 'km' },
      moonOrbitalRadius:  { get: () => C.moonDistance, render: (v) => thousands(v, 2), unit: 'km' },
      moonOrbitalCircumference: { get: () => 2 * Math.PI * C.moonDistance, render: (v) => thousands(v, 2), unit: 'km' },
      siderealMonth:    { get: () => C.moonSiderealMonth, render: (v) => thousands(v, 10), unit: 'd' },
      synodicMonth:     { get: () => C.moonSynodicMonth, render: (v) => thousands(v, 10), unit: 'd' },
      anomalisticMonth: { get: () => C.moonAnomalisticMonth, render: (v) => thousands(v, 10), unit: 'd' },
      draconicMonth:    { get: () => C.moonNodalMonth, render: (v) => thousands(v, 10), unit: 'd' },
      tropicalMonth:    { get: () => C.moonTropicalMonth, render: (v) => thousands(v, 10), unit: 'd' },
      fullMoonCycleICRF: { get: () => C.moonFullMoonCycleICRF, render: (v) => thousands(v, 10), unit: 'd' },
    };
  })(),

  // ── Sun-wobble radii + Moon precession lattice (11-2u) ──────────────────
  // Radii: eccentricity base/amplitude × the model AU. Moon precession:
  // the H-lattice counts N = round(8·H·mSY / precessionDaysInput)/8, with
  // periods H/N and the Lunar Precession Invariant H²/N (T × H = const) —
  // all from engine constants; the ICRF/Earth day-values are the engine's
  // month-chain outputs.
  ...(() => {
    const TOTAL_DAYS = () => C.H * C.meanSolarYearDays;
    const nApsidal = () => Math.round(8 * TOTAL_DAYS() / C.moonApsidalPrecessionDaysInputICRF) / 8;
    const nNodal = () => Math.round(8 * TOTAL_DAYS() / C.moonNodalPrecessionDaysInputICRF) / 8;
    return {
      wobbleCenterKm:    { get: () => Math.round(model.earth.eccentricityAmplitude * C.currentAUDistance), render: (v) => thousands(v), unit: 'km', note: 'eccentricity amplitude × model AU' },
      perihelionPointKm: { get: () => Math.round(model.earth.eccentricityBase * C.currentAUDistance), render: (v) => thousands(v), unit: 'km', note: 'eccentricity base × model AU' },
      fullMoonCycleEarth:      { get: () => C.moonFullMoonCycleEarth, render: (v) => thousands(v, 2), unit: 'd', note: 'observed supermoon cycle' },
      fullMoonCycleEarthExact: { get: () => C.moonFullMoonCycleEarth, render: (v) => thousands(v, 10), unit: 'd' },
      draconicYearICRF:  { get: () => C.moonDraconicYearICRF, render: (v) => thousands(v, 10), unit: 'd', note: 'H/13-frame lattice partner' },
      draconicYearEarth: { get: () => C.moonDraconicYearEarth, render: (v) => thousands(v, 10), unit: 'd', note: 'observed eclipse year' },
      apsidalPrecICRF:      { get: () => C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 2), unit: 'yr' },
      apsidalPrecICRFexact: { get: () => C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      apsidalPrecEarth:     { get: () => C.moonApsidalPrecessionDaysEarth / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      nodalPrecICRF:        { get: () => C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 1), unit: 'yr' },
      nodalPrecICRFexact:   { get: () => C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      nodalPrecEarth:       { get: () => C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      moonApsidalCyclesPerH: { get: nApsidal, render: (v) => thousands(v, 1).replace(/\.0$/, ''), note: 'N = round(8·H·mSY/T_apsidal)/8 — eighth-integer lattice count' },
      moonNodalCyclesPerH:   { get: nNodal, render: (v) => thousands(v, 3).replace(/0+$/, '').replace(/\.$/, '') },
      moonApsidalPeriodYr:   { get: () => C.H / nApsidal(), render: (v) => thousands(v, 3), unit: 'yr' },
      moonNodalPeriodYr:     { get: () => C.H / nNodal(), render: (v) => thousands(v, 3), unit: 'yr' },
      lunarPrecInvariantApsidalYrSq: { get: () => C.H * C.H / nApsidal(), render: (v) => thousands(v, 0), unit: 'yr²', note: 'T_apsidal × H — the Lunar Precession Invariant' },
      lunarPrecInvariantNodalYrSq:   { get: () => C.H * C.H / nNodal(), render: (v) => thousands(v, 0), unit: 'yr²' },
      moonLevelingCycle: { get: () => C.moonLunarLevelingCycleDays / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 2), unit: 'yr' },
    };
  })(),

  // ── Moon inclination + Cassini obliquity labs (11-2v) ───────────────────
  // The dynamical inclination and Brown/ELP constant from astro moonReference
  // (the DYNAMICAL 5.1573 vs the theory constant 5.1454 — documented
  // partners, not interchangeable); GRAIL/LLR gravity from the new
  // moonGrailWilliams2014 citation block; the Cassini lab results from
  // data/cassini-moontilt-results.json (both generator scripts exist and
  // reproduce the ε values — only --write is missing, see the plan's
  // follow-up list; pct ratios as published).
  ...(() => {
    const cas = rd('data/cassini-moontilt-results.json');
    return {
      moonEclipticInclination: { get: () => astro.moonReference.moonEclipticInclinationJ2000, render: (v) => String(v), unit: '°', note: 'dynamical mean osculating inclination (v4 E3c)' },
      moonInclinationConstantBrownELP: { get: () => astro.moonReference.moonInclinationConstantBrownELP, render: (v) => String(v), unit: '°', note: 'Brown/ELP latitude sinF normalization constant' },
      moonObliquityEcliptic: { get: () => astro.moonReference.moonObliquityEclipticJ2000, render: (v) => String(v), unit: '°', note: 'measured lunar spin-to-ecliptic obliquity' },
      moonJ2Grail:  { get: () => astro.moonGrailWilliams2014.j2E6, render: (v) => String(v), note: 'lunar J₂ ×10⁻⁶ (GRAIL; Williams 2014)' },
      moonC22Grail: { get: () => astro.moonGrailWilliams2014.c22E6, render: (v) => String(v), note: 'lunar C₂₂ ×10⁻⁶ (GRAIL; Williams 2014)' },
      moonCMR2:     { get: () => astro.moonGrailWilliams2014.cMR2, render: (v) => String(v), note: 'lunar polar moment C/MR² (GRAIL+LLR)' },
      cassiniObliquityDerived:    { get: () => cas.rigidEllipse.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'rigid-figure torque-averaged Cassini equilibrium' },
      cassiniObliquityPct:        { get: () => cas.rigidEllipse.pctOfMeasured, render: (v) => Number(v).toFixed(1), unit: '%' },
      cassiniObliquityCoupled:    { get: () => cas.coupledAverage.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'coupled average over the real ELP orbit' },
      cassiniObliquityCoupledPct: { get: () => cas.coupledAverage.pctOfMeasured, render: (v) => Number(v).toFixed(2), unit: '%' },
      cassiniObliquityEuler:      { get: () => cas.eulerIntegration.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'full Euler integration — no averaging assumption' },
      cassiniObliquityEulerPct:   { get: () => cas.eulerIntegration.pctOfMeasured, render: (v) => Number(v).toFixed(2), unit: '%' },
    };
  })(),

  // ── Input constants + Meeus/Sun validation stats (11-2w) ────────────────
  // Inputs from the engine constants and astro-reference; the eccDot pair
  // renders in exponent form with the site's unicode leading minus; the
  // validation statistics live in knownValues (recorded campaign snapshots,
  // per its _description). meeusLongitude/LatitudeTerms are the Meeus 47.A/B
  // CANONICAL counts (structural, like earthInclD): the tracked longitude
  // table carries 59 rows because the canonical 60th is the
  // zero-longitude-coefficient distance-only term.
  ...(() => {
    const uMinus = (s) => s.replace(/^-/, '−');
    return {
      moonOrbitalEccentricity:     { get: () => C.moonOrbitalEccentricity, render: (v) => Number(v).toFixed(4) },
      moonOrbitalEccentricityFull: { get: () => C.moonOrbitalEccentricity, render: (v) => String(v) },
      inputMeanSolarYear:    { get: () => model.foundational.inputmeanlengthsolaryearindays, render: (v) => Number(v).toFixed(4), unit: 'd' },
      siderealYearInputDays: { get: () => C.meanSiderealYearSeconds / 86400, render: (v) => Number(v).toFixed(9), unit: 'd', note: 'IAU J2000 sidereal year input' },
      massRatioEarthMoon:    { get: () => C.MASS_RATIO_EARTH_MOON, render: (v) => String(v), note: 'DE440 SPICE kernel' },
      llrTidalGamma:         { get: () => astro.knownValues.llrTidalGammaArcsecPerCy2, render: (v) => uMinus(Number(v).toFixed(2)), unit: '″/cy²', note: 'LLR tidal acceleration (α₁ chain anchor)' },
      earthEccDotJ2000:      { get: () => astro.earthOrbital.earthEccentricityDotJ2000, render: (v) => uMinus(Number(v).toExponential()), unit: '/cy' },
      earthEccDotDotJ2000:   { get: () => astro.earthOrbital.earthEccentricityDotDotJ2000, render: (v) => uMinus(Number(v).toExponential()), unit: '/cy²' },
      inclinationCycleAnchorEarth: { get: () => astro.earthOrbital.earthInclinationCycleAnchor, render: (v) => Number(v).toFixed(2), unit: '°', note: 'e_E line phase anchor (alias of earthInclCycleAnchor)' },
      earthPerihelionLongitudeJ2000: { get: () => astro.earthOrbital.earthPerihelionLongitudeJ2000, render: (v) => Number(v).toFixed(3), unit: '°' },
      sunMeanLongitudeJ2000: { get: () => astro.earthOrbital.sunMeanLongitudeJ2000_deg, render: (v) => String(v), unit: '°', note: 'D5 aberration anchor' },
      moonSiderealMonthInput: { get: () => C.moonSiderealMonthInput, render: (v) => Number(v).toFixed(8), unit: 'd', note: 'the one dynamical lunar input' },
      moonAxialTilt: { get: () => C.moonTilt, render: (v) => String(v), unit: '°', note: 'to orbit plane' },
      moonApsidalPrecessionDaysInput: { get: () => C.moonApsidalPrecessionDaysInputICRF, render: (v) => thousands(v, 3), unit: 'd' },
      moonNodalPrecessionDaysInput:   { get: () => C.moonNodalPrecessionDaysInputICRF, render: (v) => thousands(v, 2), unit: 'd' },
      moonKeplerEffectiveDistance: { get: () => astro.knownValues.moonKeplerEffectiveDistanceKm, render: (v) => thousands(v), unit: 'km', note: 'DLT-1 §3 three-body a (vs two-body 384,748)' },
      a1RateDegPerCy: { get: () => astro.knownValues.meeusA1RateDegPerCy, render: (v) => String(v), unit: '°/cy', note: 'Meeus A1 rate (18V−16E−M′ resonance) — duplicated from script.js:26562' },
      meeusLongitudeTerms: { get: () => 60, render: (v) => String(v), note: 'Meeus 47.A canonical count — tracked table carries 59 (60th is the distance-only term)' },
      meeusLatitudeTerms:  { get: () => 60, render: (v) => String(v), note: 'Meeus 47.B canonical count' },
      meeusEclipsesTestCount: { get: () => astro.knownValues.meeusEclipsesTestCount, render: (v) => String(v) },
      meeusEclipseRMS:        { get: () => astro.knownValues.meeusEclipseRmsMinutes, render: (v) => Number(v).toFixed(2), unit: 'min' },
      meeusParallaxResidual:  { get: () => astro.knownValues.meeusParallaxResidualArcsec, render: (v) => Number(v).toFixed(2), unit: '″' },
      meeusPearsonR:          { get: () => astro.knownValues.meeusPearsonR, render: (v) => String(v) },
      meeusJPLDecRMS:         { get: () => astro.knownValues.meeusJplDecRmsDeg, render: (v) => Number(v).toFixed(2), unit: '°' },
      sunModelDecRMS:    { get: () => astro.knownValues.sunModelDecRmsDeg, render: (v) => String(v), unit: '°' },
      sunModelTrueError: { get: () => astro.knownValues.sunModelTrueErrorDeg, render: (v) => String(v), unit: '°' },
      sunTropicalYearDiff: { get: () => astro.knownValues.sunTropicalYearDiffSeconds, render: (v) => fmtSignedPct(v, 2), unit: 's' },
      sunSiderealYearDiff: { get: () => astro.knownValues.sunSiderealYearDiffSeconds, render: (v) => fmtSignedPct(v, 2), unit: 's' },
      sunDiameter: { get: () => astro.bodyDiametersKm.sun, render: (v) => thousands(v), unit: 'km' },
      sunOrbitalCircumference: { get: () => 2 * Math.PI * C.currentAUDistance, render: (v) => thousands(v, 2), unit: 'km', note: '2π × model AU' },
      arcsecInCircle: { get: () => 360 * 3600, render: (v) => thousands(v), note: 'structural: 360 × 3600' },
    };
  })(),

  // ── Parallax chain + wobble-circle geometry (11-2x) ─────────────────────
  // The parallax-chain members from astro physicalConstants (solarParallax is
  // the IAU 1976 defining constant; arcsecDisplacement is the historical
  // primitive the website builds its AU from — displacement × 648000/π =
  // currentAUDistance to 0.2 mm, see the chain note). The apo family is the
  // wobble circle: radius = eccentricity amplitude × model AU, swept once
  // per H/13 axial cycle.
  ...(() => {
    const APR = () => (180 * 3600) / Math.PI;
    const apoRadius = () => model.earth.eccentricityAmplitude * C.currentAUDistance;
    return {
      arcsecPerRadian:    { get: APR, render: (v) => thousands(v, 9), note: 'structural: 180·3600/π' },
      arcsecDisplacement: { get: () => astro.physicalConstants.arcsecDisplacementKm, render: (v) => thousands(v, 12), unit: 'km', note: '1-arcsec displacement at 1 AU — the historical parallax-chain primitive' },
      oneParsec:          { get: () => C.currentAUDistance * APR(), render: (v) => thousands(v, 1), unit: 'km' },
      solarParallax:      { get: () => astro.physicalConstants.solarParallaxArcsec, render: (v) => String(v), unit: '″', note: 'IAU 1976 defining constant' },
      apoRadius:        { get: apoRadius, render: (v) => thousands(v, 2), unit: 'km' },
      apoDiameter:      { get: () => 2 * apoRadius(), render: (v) => thousands(v, 2), unit: 'km' },
      apoCircumference: { get: () => 2 * Math.PI * apoRadius(), render: (v) => thousands(v, 2), unit: 'km' },
      apoSpeed:         { get: () => (2 * Math.PI * apoRadius()) / ((C.H / 13) * 24 * 365.25), render: (v) => thousands(v, 10), unit: 'km/h', note: 'wobble-circle speed over the H/13 cycle (Julian-year hours)' },
      apoSpeedKmYear:   { get: () => (2 * Math.PI * apoRadius()) / (C.H / 13), render: (v) => thousands(v, 0), unit: 'km/yr' },
    };
  })(),

  // ── IPO circle + Fibonacci-law constants + mainstream comparisons (11-2y) ─
  // IPO mirrors the apo family with the eccentricity BASE and the H/3
  // inclination cycle (not H/13). ψ and K come LIVE from the engine's
  // Fibonacci-law derivations (C.PSI, C.eccentricityAmplitudeK — Law 4's
  // K = 3.4143e-6 is a CLAUDE.md reference value). The mainstream* family
  // is conventional-theory literature for the comparison tables, tracked in
  // knownValues; the invariable plane's own ecliptic node joins the Souami
  // block.
  ...(() => {
    const ipoRadius = () => model.earth.eccentricityBase * C.currentAUDistance;
    return {
      ipoRadius:        { get: ipoRadius, render: (v) => thousands(v, 2), unit: 'km' },
      ipoDiameter:      { get: () => 2 * ipoRadius(), render: (v) => thousands(v, 2), unit: 'km' },
      ipoCircumference: { get: () => 2 * Math.PI * ipoRadius(), render: (v) => thousands(v, 2), unit: 'km' },
      ipoSpeed:         { get: () => (2 * Math.PI * ipoRadius()) / ((C.H / 3) * 24 * 365.25), render: (v) => thousands(v, 10), unit: 'km/h', note: 'perihelion-point speed over the H/3 inclination cycle' },
      ipoSpeedKmYear:   { get: () => (2 * Math.PI * ipoRadius()) / (C.H / 3), render: (v) => thousands(v, 0), unit: 'km/yr' },
      psiFormula: { get: () => 'd_E × amp_E × √m_E (from Earth)', render: (v) => String(v), note: 'structural formula label (Law 3)' },
      psiValue:   { get: () => C.PSI, render: (v) => `${(v * 1e3).toFixed(4)} × 10⁻³` },
      psiDecimal: { get: () => C.PSI, render: (v) => Number(v).toFixed(6) },
      kValue:     { get: () => C.eccentricityAmplitudeK, render: (v) => `${(v * 1e6).toFixed(4)} × 10⁻⁶`, note: 'Law 4 K — reference value 3.4143e-6' },
      invPlaneAscNode: { get: () => astro.ascendingNodesSouamiSouchay.invariablePlaneOnEclipticDeg, render: (v) => String(v), unit: '°', note: 'the invariable plane\'s node on the ecliptic (Souami & Souchay 2012)' },
      mainstreamAxialPrec:  { get: () => astro.knownValues.mainstreamAxialPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamPeriPrec:   { get: () => astro.knownValues.mainstreamPeriPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamObliqCycle: { get: () => astro.knownValues.mainstreamObliqCycleKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamInclCycle:  { get: () => astro.knownValues.mainstreamInclCycleKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamApsidalPrec: { get: () => astro.knownValues.mainstreamApsidalPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamObliqRange: {
        get: () => astro.knownValues.mainstreamObliqRangeMinDeg,
        render: (v) => `~${v}° to ~${astro.knownValues.mainstreamObliqRangeMaxDeg}°`,
      },
      mainstreamAxialPrecExact:  { get: () => astro.knownValues.mainstreamAxialPrecExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamPeriPrecExact:   { get: () => astro.knownValues.mainstreamPeriPrecExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamObliqCycleExact: { get: () => astro.knownValues.mainstreamObliqCycleExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamInclCycleExact:  { get: () => astro.knownValues.mainstreamInclCycleExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamApsidalPrecExact: { get: () => astro.knownValues.mainstreamApsidalPrecExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
    };
  })(),

  // ── Planet perihelion lattice + J2000 eccentricities (11-2z) ────────────
  // Everything derives from the STORED per-planet lattice fraction
  // (model-parameters `perihelionEclipticFraction: [num, den]`, signed for
  // ecliptic-retrograde — the same data the engine derives
  // perihelionEclipticYears from): period = H·num/den, rate = 360/period
  // (signed), and the formula label by one rule (|num|=1 → H/den; den=1 →
  // numH; else numH/den, '−' prefix when retrograde). Eccentricities from
  // the per-planet JPL DE440 J2000 elements (Earth from astro earthOrbital).
  ...(() => {
    const periFraction = (planet) => (planet === 'pluto'
      ? model.additionalBodies.pluto.perihelionEclipticFraction
      : model.planets[planet].perihelionEclipticFraction);
    const periLabel = ([num, den]) => {
      const sign = num < 0 ? '−' : '';
      const n = Math.abs(num);
      if (n === 1) return `${sign}H/${den}`;
      if (den === 1) return `${sign}${n}H`;
      return `${sign}${n}H/${den}`;
    };
    const out = {};
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      const periodYears = () => {
        const [num, den] = periFraction(planet);
        return (C.H * Math.abs(num)) / den;
      };
      out[`${planet}PeriPeriod`] = {
        get: periodYears,
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
      };
      out[`${planet}PeriFormula`] = { get: () => periLabel(periFraction(planet)), render: (v) => String(v) };
      if (planet !== 'pluto') {
        out[`${planet}PeriRate`] = {
          get: () => {
            const [num, den] = periFraction(planet);
            return Math.sign(num) * 360 / ((C.H * Math.abs(num)) / den);
          },
          render: (v) => thousands(v, 6),
          unit: '°/yr',
        };
      }
    }
    // Earth's rate uses the H/16 effective period, not a peri divisor above.
    out.earthPeriRate = { get: () => 360 / (C.H / 16), render: (v) => thousands(v, 6), unit: '°/yr', note: 'H/16 effective period' };
    const eccSources = {
      mercury: () => C.planets.mercury.orbitalEccentricityJ2000,
      venus:   () => C.planets.venus.orbitalEccentricityJ2000,
      earth:   () => astro.earthOrbital.earthEccentricityJ2000,
      mars:    () => C.planets.mars.orbitalEccentricityJ2000,
      jupiter: () => C.planets.jupiter.orbitalEccentricityJ2000,
      saturn:  () => C.planets.saturn.orbitalEccentricityJ2000,
      uranus:  () => C.planets.uranus.orbitalEccentricityJ2000,
      neptune: () => C.planets.neptune.orbitalEccentricityJ2000,
    };
    for (const [planet, get] of Object.entries(eccSources)) {
      out[`${planet}EccJ2000`] = { get, render: (v) => Number(v).toFixed(5), note: 'JPL DE440 J2000 element' };
    }
    return out;
  })(),

  // ── ICRF perihelion periods (11-2aa) ────────────────────────────────────
  // Structural identity, verified against all eight site divisors: the ICRF
  // perihelion rate is the ecliptic rate minus the H/13 axial frame term —
  // in eighths-of-8H, n8_ICRF = n8_ecliptic − 104. Derives entirely from the
  // stored perihelionEclipticFraction (Earth from its structural H/16
  // effective period, n8 = 128 → 8H/24 = H/3); no new data.
  ...(() => {
    const n8Ecliptic = (planet) => {
      if (planet === 'earth') return 128;   // H/16 effective period
      const [num, den] = model.planets[planet].perihelionEclipticFraction;
      return (8 * den / Math.abs(num)) * Math.sign(num);
    };
    const out = {};
    for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}PeriPeriodICRF`] = {
        get: () => (8 * C.H) / Math.abs(n8Ecliptic(planet) - 104),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: 'ecliptic lattice rate − H/13 frame term',
      };
    }
    return out;
  })(),

  // ── Semi-major axes (11-2aa) — Kepler over the quantized year inputs ────
  // a = (T_planet / mSY)^(2/3), T from the tracked per-planet solarYearInput
  // (the model's quantized orbital period in days); Earth 1.0 by definition.
  ...(() => {
    const out = { earthSemiMajor: { get: () => 1, render: (v) => Number(v).toFixed(4), unit: 'AU', note: 'by definition' } };
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}SemiMajor`] = {
        get: () => Math.pow(C.planets[planet].solarYearInput / C.meanSolarYearDays, 2 / 3),
        render: (v) => Number(v).toFixed(4),
        unit: 'AU',
        note: 'Kepler: (solarYearInput / mSY)^(2/3)',
      };
    }
    return out;
  })(),

  // Ours-only: the docs need a comma-free H for code contexts, and the IAU
  // 2006 obliquity anchor which the website does not surface as a key.
  obliquityJ2000Deg: {
    get: () => astro.earthOrbital.obliquityJ2000_deg,
    render: (v) => Number(v).toFixed(6),
    unit: '°',
    note: 'IAU 2006 obliquity at J2000 (84381.406″)',
  },
};

/**
 * DELIBERATELY ABSENT — values the prose quotes that cannot yet be derived
 * outside the browser. Listed so their absence is a recorded decision rather
 * than an oversight, and so nobody "helpfully" adds them as literals.
 *
 * Currently EMPTY. The founding entries (lodReal / rawH5Kinematic /
 * layer2MinusLayer4Gap) lifted into VALUES as lodRealPhysical / lodH5Only /
 * stackNetLodJ2000Ms / layer2MinusLayer4GapMs after the §12h strangler
 * extraction (tools/lib/deep-time.js `computeLodRealSecondsAtEpoch`,
 * bit-identical to the tweakpane) resolved the 0.32 ms fit-vs-display gap as
 * a day-basis spread — measured-anchor vs Fourier-direct sidereal days at
 * 2000. The basis identity is now enforced on every docs build by the gate
 * inside lodRealPhysical's get().
 */
export const NOT_DERIVABLE = [];

/** key -> rendered string, for the renderers to substitute. */
export function resolveAll() {
  const out = new Map();
  for (const [key, spec] of Object.entries(VALUES)) {
    const raw = spec.get();
    const okString = typeof raw === 'string' && raw.length > 0;   // e.g. the Babylon UT strings
    if (!okString && (raw === undefined || raw === null || Number.isNaN(Number(raw)))) {
      throw new Error(`model-values: key "${key}" resolved to ${raw} — the engine or artifact it reads has moved`);
    }
    out.set(key, spec.render(raw));
  }
  return out;
}
