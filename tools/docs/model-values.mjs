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
  // DEFERRED from this tier, with reasons (§12h rule: investigate, never force):
  //   axialRateJ2000   engine 50.294 vs website 50.289 — the kinematic-vs-IAU
  //                    sidereal-baseline split, 1.4e-6 d in (sid − sol).
  //                    Which baseline is CORRECT for this readout must be
  //                    decided, not averaged.
  //   periRateJ2000    a typed literal '61.889' in the website's own
  //                    compute.ts — no derivation exists on either side yet.
  //   earthCircumference / earthDiameter
  //                    radius constants differ: ours 6378.1366 km (IERS),
  //                    website 6378.137 km (WGS-84) — 0.01 km in the
  //                    circumference. One constant must win first.

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
 *   lodReal (Layer 4 solar day)  the shipped composite is assembled in
 *     src/script.js from `o.lodKinematic + h5 + dtCycleLodCorrectionSum`, and
 *     `o.lodKinematic` is scene state with no engine twin. The tweakpane reads
 *     86400.001379; the joint fit's closure target is 86400.0017. That 0.32 ms
 *     is UNEXPLAINED. Do not automate either number until it is resolved —
 *     baking the wrong one in is worse than leaving the doc manual.
 *   raw H/5 kinematic, Layer-2−Layer-4 gap  same dependency chain.
 */
export const NOT_DERIVABLE = ['lodReal', 'rawH5Kinematic', 'layer2MinusLayer4Gap'];

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
