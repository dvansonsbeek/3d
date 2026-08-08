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
    if (raw === undefined || raw === null || Number.isNaN(Number(raw))) {
      throw new Error(`model-values: key "${key}" resolved to ${raw} — the engine or artifact it reads has moved`);
    }
    out.set(key, spec.render(raw));
  }
  return out;
}
