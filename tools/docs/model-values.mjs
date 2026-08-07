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
  deltaTStartSeconds: {
    get: () => dtFit.optimum.deltaTStart,
    render: (v) => Number(v).toFixed(3),
    unit: 's',
    note: 'ΔT trend anchor at J2000, joint-fit optimum',
  },
  usnoLodJ2000: {
    get: () => dtFit.optimum.usno_target_lod_s,
    render: (v) => Number(v).toFixed(4),
    unit: 's',
    note: 'USNO Earth Orientation Center J2000 LOD anchor — the joint fit\'s hard-equality closure target',
  },
  espenakRmsSeconds: {
    get: () => dtFit.optimum.espenak_rms_s,
    render: (v) => Number(v).toFixed(2),
    unit: 's',
    note: 'joint-fit RMS over the Espenak window. NOT the validate-resonator sweep figure (different window) — the two differ and have been confused before',
  },
  obliquityJ2000Deg: {
    get: () => astro.earthOrbital.obliquityJ2000_deg,
    render: (v) => Number(v).toFixed(6),
    unit: '°',
    note: 'IAU 2006 obliquity at J2000 (84381.406″)',
  },
  earthtiltMean: {
    get: () => model.earth.earthtiltMean,
    render: (v) => Number(v).toFixed(8),
    unit: '°',
    note: 'solved so the scene reproduces the obliquity anchor at the June-2000 solstice',
  },
  eccentricityBase: {
    get: () => model.earth.eccentricityBase,
    render: (v) => Number(v).toFixed(8),
    note: 'Earth eccentricity base (locked by the Law 5 balance constraint)',
  },
  correctionSun: {
    get: () => model.foundational.correctionSun,
    render: (v) => Number(v).toFixed(6),
    unit: '°',
    note: 'Sun orbital starting angle',
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
