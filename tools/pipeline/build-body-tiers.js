#!/usr/bin/env node
/**
 * build-body-tiers.js — plan 27 step F: the Moon's, Mercury's and Saturn's look by age.
 *
 * ONE generator, ONE tier table per body — public/textures/<body>/manifest.json, the same
 * form as the Earth's (tools/pipeline/build-earth-tiers.js), read by the scene's
 * makeSurfaceTiers and checked by tools/verify/surface-tiers.js. Ages in Myr before J2000 (the
 * engine axis); a body's map is SWAPPED at a boundary (no cross-fade: none of these maps fills
 * the screen the way the Earth's does in the eclipse views), the rings shown or hidden.
 *
 *   The Moon — five tiers, oldest first:
 *     magma ocean       generated illustration from the genesis edge to 4,350 Ma — the lunar
 *                       magma ocean's flotation crust forms within ~10–200 Myr of the Moon's
 *                       formation (Elkins-Tanton, Burgess & Yin 2011, EPSL 304, 326–336).
 *     pre-maria crust   DERIVED from the present-day map: the maria raised to the highlands'
 *                       albedo under a blurred low-albedo mask (the basins' outlines stay) —
 *                       to 3,800 Ma, before the main mare flooding.
 *     maria one third / two thirds of their present darkness — the mare basalts erupt mainly
 *                       3.9–3.1 Ga (Hiesinger et al. 2011, GSA Special Paper 477, 1–51), shown
 *                       in two steps at 3,800–3,550 and 3,550–3,300 Ma.
 *     present-day map   from 3,300 Ma on (public/Moon.jpg, Solar System Scope, CC BY 4.0).
 *   Mercury — two tiers: a generated early crust from the edge to 4,100 Ma (the oldest
 *     preserved surfaces date from 4.0–4.1 Ga: Marchi et al. 2013, Nature 499, 59–61), then the
 *     present-day map (public/Mercury.jpg, Solar System Scope, CC BY 4.0).
 *   Saturn — the same map throughout; the RINGS hidden before 400 Ma. Their age is a measured
 *     band, not a value: ≤ a few hundred Myr from the micrometeoroid pollution (Kempf et al.
 *     2023, Science Advances 9, eadf8537), 10–100 Myr from the ring mass (Iess et al. 2019,
 *     Science 364, eaat2965); Hyodo, Genda & Madeira (2024, Nature Geoscience) argue the
 *     pollution clock allows old rings. The 400-Ma boundary is the pollution bound's upper edge.
 *
 * Usage: node tools/pipeline/build-body-tiers.js --write [--rebuild]
 *   --rebuild    re-render every generated and derived map even if present
 * Needs ImageMagick 6 (`convert`, `identify`) on the PATH. The ages above are the illustration's
 * boundaries chosen inside the published ranges; the model does not model surfaces.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { run, makeNoise, mix3, clamp01, smooth, writeWebp, renderSphereMap, readImageRgb } = require('./lib/procedural-sphere');
/** @typedef {import('./lib/procedural-sphere').Recipe} Recipe */

const ROOT = path.resolve(__dirname, '..', '..');
const TEX = path.join(ROOT, 'public', 'textures');
const OUT_W = 2048, OUT_H = 1024;
const WEBP_QUALITY = '85';
const SEED = 20261104;
const FUTURE_EDGE_MA = -1e9;
const DEEP_END_MA = 5000;   // past the navigable genesis edge (4,429 Ma); the gate checks the coverage

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const REBUILD = argv.includes('--rebuild');
if (!WRITE) {
  console.error('Usage: node tools/pipeline/build-body-tiers.js --write [--rebuild]');
  process.exit(1);
}

const sha256 = (/** @type {string} */ file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');
const SSS = { source: 'Solar System Scope textures (https://www.solarsystemscope.com/textures/)', licence: 'CC BY 4.0' };

// ── 1. The generated maps ───────────────────────────────────────────────────────────────────
/** A cooling crust threaded by glowing fractures — the Earth genesis recipe's structure in a
 *  body's own colours and plate scale (each body renders on its own seed, so no two share a
 *  pattern). @param {{crustDark: number[], crustLight: number[], lavaDark: number[], lavaBright: number[], ember: number[], glow: number, scale: number}} k
 *  @returns {Recipe} */
const coolingCrust = (k) => (u, v, p, N) => {
  const s = k.scale;
  const crust = N.fbm(p[0] * 2.5 * s, p[1] * 2.5 * s, p[2] * 2.5 * s, 6);
  const region = N.fbm(p[0] * 1.3 * s + 9, p[1] * 1.3 * s + 9, p[2] * 1.3 * s + 9, 3);
  const r = 1 - Math.abs(2 * N.fbm(p[0] * 4.5 * s + 3, p[1] * 4.5 * s + 3, p[2] * 4.5 * s + 3, 5) - 1);
  const glow = smooth(0.90, 0.99, r) * (0.35 + 0.65 * smooth(0.35, 0.7, region)) * k.glow;
  const base = mix3(k.crustDark, k.crustLight, crust);
  const lava = mix3(k.lavaDark, k.lavaBright, smooth(0.93, 1.0, r));
  const hot = mix3(base, lava, glow);
  const ember = smooth(0.62, 0.85, region) * smooth(0.55, 0.75, crust) * 0.35 * k.glow;
  const warm = mix3(hot, k.ember, ember);
  const haze = N.fbm(p[0] * 20, p[1] * 20, p[2] * 20, 3);
  return mix3(warm, [warm[0] * 0.8, warm[1] * 0.8, warm[2] * 0.8], (haze - 0.5) * 0.5 + 0.25);
};
/** @type {Record<string, Recipe>} */
const RECIPES = {
  // the lunar magma ocean: a pale anorthositic flotation crust over glowing melt
  'moon-magma': coolingCrust({ crustDark: [52, 48, 46], crustLight: [118, 112, 104], lavaDark: [170, 44, 14], lavaBright: [255, 196, 86], ember: [150, 42, 16], glow: 1, scale: 1 }),
  // Mercury's early crust: darker, smaller plates, the melt mostly under the surface — a faint glow only
  'mercury-crust': coolingCrust({ crustDark: [36, 34, 34], crustLight: [84, 80, 78], lavaDark: [140, 36, 12], lavaBright: [230, 150, 60], ember: [120, 34, 14], glow: 0.45, scale: 1.7 }),
};
/** Each generated map's seed: the body's own. @type {Record<string, number>} */
const SEEDS = { 'moon-magma': SEED, 'mercury-crust': SEED + 1 };

// ── 2. The derived Moon maps: the maria raised toward the highlands' albedo ─────────────────
// The present-day map's blurred luminance is bimodal (measured at 1024 × 512, box blur 6 px):
// the maria 0.28–0.46, the highlands 0.52–0.76, the valley at 0.46–0.50. The maria mask is a
// smooth step over that valley on the blurred luminance; inside it the luminance is raised by
// (1 − f) of the way to the highlands' mean, f the fraction of the present darkness kept
// (0, 1/3, 2/3), with a little seeded mottling so the raised floors are not flat. The fine
// detail (rims, rays, wrinkle ridges) stays: the raise is a local offset, not a repaint.
const MARIA_MASK = { lo: 0.44, hi: 0.52 };
const BLUR_PX = 12;   // at 2048 × 1024

/** Box-blur a luminance field: wrapped in x (the seam), clamped in y. @param {Float32Array} src @param {number} R */
function blur(src, R) {
  const tmp = new Float32Array(OUT_W * OUT_H), out = new Float32Array(OUT_W * OUT_H);
  for (let j = 0; j < OUT_H; j++) for (let i = 0; i < OUT_W; i++) { let s = 0; for (let d = -R; d <= R; d++) s += src[j * OUT_W + ((i + d + OUT_W) % OUT_W)]; tmp[j * OUT_W + i] = s / (2 * R + 1); }
  for (let j = 0; j < OUT_H; j++) for (let i = 0; i < OUT_W; i++) { let s = 0; for (let d = -R; d <= R; d++) { const jj = Math.min(OUT_H - 1, Math.max(0, j + d)); s += tmp[jj * OUT_W + i]; } out[j * OUT_W + i] = s / (2 * R + 1); }
  return out;
}

/** Derive the maria-raised maps from the present-day Moon map. @param {string} modern @param {{ f: number, out: string }[]} steps */
function deriveMariaMaps(modern, steps) {
  const rgb = readImageRgb(modern, OUT_W, OUT_H);
  const n = OUT_W * OUT_H;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]) / 255;
  const Lb = blur(L, BLUR_PX);
  const mask = new Float32Array(n);
  let hSum = 0, hN = 0;
  for (let i = 0; i < n; i++) { mask[i] = 1 - smooth(MARIA_MASK.lo, MARIA_MASK.hi, Lb[i]); if (mask[i] < 0.05) { hSum += L[i]; hN++; } }
  const highland = hSum / hN;
  const N = makeNoise(SEED + 7);
  const mottle = new Float32Array(n);
  for (let j = 0; j < OUT_H; j++) {
    const v = (j + 0.5) / OUT_H, lat = (0.5 - v) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < OUT_W; i++) {
      const lon = ((i + 0.5) / OUT_W - 0.5) * 2 * Math.PI;
      mottle[j * OUT_W + i] = (N.fbm(cl * Math.cos(lon) * 6, sl * 6, cl * Math.sin(lon) * 6, 4) - 0.5) * 0.08;
    }
  }
  let mariaFrac = 0; for (let i = 0; i < n; i++) mariaFrac += mask[i]; mariaFrac /= n;
  console.log(`maria mask covers ${(mariaFrac * 100).toFixed(1)} % of the map; highland mean luminance ${highland.toFixed(3)}`);
  for (const s of steps) {
    const out = Buffer.alloc(n * 3);
    for (let i = 0; i < n; i++) {
      const raise = mask[i] * (highland + mottle[i] - Lb[i]) * (1 - s.f) * 255;
      out[i * 3] = clamp01((rgb[i * 3] + raise) / 255) * 255;
      out[i * 3 + 1] = clamp01((rgb[i * 3 + 1] + raise) / 255) * 255;
      out[i * 3 + 2] = clamp01((rgb[i * 3 + 2] + raise) / 255) * 255;
    }
    writeWebp(out, OUT_W, OUT_H, s.out, WEBP_QUALITY);
  }
}

// ── 3. The bodies ───────────────────────────────────────────────────────────────────────────
/** @typedef {{ id: string, label: string, fromMa: number, toMa: number, fadeMyr: number, file: string, source: string, kind: 'cited'|'illustration', rings?: boolean }} Tier */

const MOON_MODERN = 'public/Moon.jpg', MERCURY_MODERN = 'public/Mercury.jpg', SATURN_MODERN = 'public/Saturn.jpg', SATURN_RINGS = 'public/saturn-rings.png';
const BODIES = {
  moon: {
    description: 'The Moon\'s surface tier table — GENERATED by tools/pipeline/build-body-tiers.js --write (plan 27 step F). The scene swaps the Moon\'s map by the TT age of its epoch from `tiers` (ages in Myr before J2000). `kind` names what a map IS: the cited present-day map, or illustration — generated, or derived from the present-day map by raising the maria. The gate tools/verify/surface-tiers.js checks the files against `files`.',
    sources: {
      modern: { file: MOON_MODERN, ...SSS },
      derived: { note: 'the present-day map with the maria raised toward the highlands\' albedo under a blurred low-albedo mask (the method and its measured thresholds are in the script) — a derivative of the CC BY 4.0 map, labelled "illustration"', derivedFrom: MOON_MODERN, licence: 'CC BY 4.0 (derivative, attributed)' },
      generated: { note: `procedural illustration rendered by this script from seeded 3-D value noise on the sphere (seed ${SEED}) — no third-party rights; labelled "illustration"` },
      literature: {
        'elkins-tanton2011': 'Elkins-Tanton, L.T., Burgess, S. & Yin, Q.-Z., 2011. The lunar magma ocean: Reconciling the solidification process with lunar petrology and geochronology. EPSL 304, 326–336 — the flotation crust within ~10–200 Myr of formation.',
        hiesinger2011: 'Hiesinger, H., Head, J.W., Wolf, U., Jaumann, R. & Neukum, G., 2011. Ages and stratigraphy of lunar mare basalts: A synthesis. GSA Special Paper 477, 1–51 — most mare basalts 3.9–3.1 Ga, the youngest ~1.2 Ga.',
      },
    },
    tiers: /** @type {Tier[]} */ ([
      { id: 'modern', label: 'Present-day Moon', fromMa: FUTURE_EDGE_MA, toMa: 3300, fadeMyr: 0, file: MOON_MODERN, source: 'modern', kind: 'cited' },
      { id: 'maria-two-thirds', label: 'Mare flooding under way — the maria at two thirds of their present darkness (derived)', fromMa: 3300, toMa: 3550, fadeMyr: 0, file: 'public/textures/moon/derived/moon-maria-2of3.webp', source: 'derived', kind: 'illustration' },
      { id: 'maria-one-third', label: 'Mare flooding beginning — the maria at one third of their present darkness (derived)', fromMa: 3550, toMa: 3800, fadeMyr: 0, file: 'public/textures/moon/derived/moon-maria-1of3.webp', source: 'derived', kind: 'illustration' },
      { id: 'pre-maria', label: 'Highland crust before the mare flooding (derived)', fromMa: 3800, toMa: 4350, fadeMyr: 0, file: 'public/textures/moon/derived/moon-pre-maria.webp', source: 'derived', kind: 'illustration' },
      { id: 'magma-ocean', label: 'Lunar magma ocean under its forming crust (generated)', fromMa: 4350, toMa: DEEP_END_MA, fadeMyr: 0, file: 'public/textures/moon/generated/moon-magma.webp', source: 'generated', kind: 'illustration' },
    ]),
  },
  mercury: {
    description: 'Mercury\'s surface tier table — GENERATED by tools/pipeline/build-body-tiers.js --write (plan 27 step F). The scene swaps Mercury\'s map by the TT age of its epoch from `tiers` (ages in Myr before J2000). `kind` names what a map IS: the cited present-day map or generated illustration. The gate tools/verify/surface-tiers.js checks the files against `files`.',
    sources: {
      modern: { file: MERCURY_MODERN, ...SSS },
      generated: { note: `procedural illustration rendered by this script from seeded 3-D value noise on the sphere (seed ${SEED}) — no third-party rights; labelled "illustration"` },
      literature: { marchi2013: 'Marchi, S., Chapman, C.R., Fassett, C.I., Head, J.W., Bottke, W.F. & Strom, R.G., 2013. Global resurfacing of Mercury 4.0–4.1 billion years ago. Nature 499, 59–61 — the oldest preserved surfaces.' },
    },
    tiers: /** @type {Tier[]} */ ([
      { id: 'modern', label: 'Present-day Mercury', fromMa: FUTURE_EDGE_MA, toMa: 4100, fadeMyr: 0, file: MERCURY_MODERN, source: 'modern', kind: 'cited' },
      { id: 'early-crust', label: 'Early crust before the oldest preserved surfaces (generated)', fromMa: 4100, toMa: DEEP_END_MA, fadeMyr: 0, file: 'public/textures/mercury/generated/mercury-crust.webp', source: 'generated', kind: 'illustration' },
    ]),
  },
  saturn: {
    description: 'Saturn\'s tier table — GENERATED by tools/pipeline/build-body-tiers.js --write (plan 27 step F). The map is the same throughout; `rings` says whether the ring mesh is shown at the TT age of the epoch (ages in Myr before J2000). The rings\' age is a measured BAND (see sources.literature); the boundary is the pollution bound\'s upper edge. The gate tools/verify/surface-tiers.js checks the files against `files`.',
    sources: {
      modern: { file: SATURN_MODERN, rings: SATURN_RINGS, ...SSS },
      literature: {
        kempf2023: 'Kempf, S., Altobelli, N., Schmidt, J., Cuzzi, J.N., Estrada, P.R. & Srama, R., 2023. Micrometeoroid infall onto Saturn\'s rings constrains their age to no more than a few hundred million years. Science Advances 9, eadf8537 — ≤ ~400 Myr.',
        iess2019: 'Iess, L. et al., 2019. Measurement and implications of Saturn\'s gravity field and ring mass. Science 364, eaat2965 — 10–100 Myr from the ring mass.',
        hyodo2024: 'Hyodo, R., Genda, H. & Madeira, G., 2024. Saturn\'s rings may be older than they look (the pollution clock allows old rings). Nature Geoscience — the dissent; the age stays a band.',
      },
    },
    tiers: /** @type {Tier[]} */ ([
      { id: 'rings', label: 'Present-day Saturn with its rings', fromMa: FUTURE_EDGE_MA, toMa: 400, fadeMyr: 0, file: SATURN_MODERN, source: 'modern', kind: 'cited', rings: true },
      { id: 'no-rings', label: 'before its rings — their age is a band, ≤ 400 Myr (Kempf 2023) and disputed', fromMa: 400, toMa: DEEP_END_MA, fadeMyr: 0, file: SATURN_MODERN, source: 'modern', kind: 'cited', rings: false },
    ]),
  },
};

function main() {
  const t0 = Date.now();
  // generated maps
  for (const [name, dir] of [['moon-magma', 'moon'], ['mercury-crust', 'mercury']]) {
    const out = path.join(TEX, dir, 'generated', `${name}.webp`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (REBUILD || !fs.existsSync(out)) { const t1 = Date.now(); renderSphereMap(RECIPES[name], SEEDS[name], OUT_W, OUT_H, out, WEBP_QUALITY); console.log(`rendered ${name} (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  }
  // derived Moon maps
  const derivedDir = path.join(TEX, 'moon', 'derived');
  fs.mkdirSync(derivedDir, { recursive: true });
  const steps = [{ f: 0, out: path.join(derivedDir, 'moon-pre-maria.webp') }, { f: 1 / 3, out: path.join(derivedDir, 'moon-maria-1of3.webp') }, { f: 2 / 3, out: path.join(derivedDir, 'moon-maria-2of3.webp') }];
  if (REBUILD || steps.some((s) => !fs.existsSync(s.out))) { const t1 = Date.now(); deriveMariaMaps(path.join(ROOT, MOON_MODERN), steps); console.log(`derived the three Moon maps (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  // the tables
  for (const [body, b] of Object.entries(BODIES)) {
    const tiers = b.tiers;
    for (let i = 0; i + 1 < tiers.length; i++) if (tiers[i].toMa !== tiers[i + 1].fromMa) throw new Error(`${body}: tier table not contiguous at ${tiers[i].id} → ${tiers[i + 1].id}`);
    /** @type {Record<string, { sha256: string, bytes: number, width: number, height: number }>} */
    const files = {};
    const named = new Set(tiers.map((t) => t.file));
    if (body === 'saturn') named.add(SATURN_RINGS);
    for (const f of named) {
      const abs = path.join(ROOT, f);
      const [w, h] = run('identify', ['-format', '%w %h', abs]).trim().split(' ').map(Number);
      files[f] = { sha256: sha256(abs), bytes: fs.statSync(abs).size, width: w, height: h };
    }
    const manifest = { _description: b.description, generated_by: 'tools/pipeline/build-body-tiers.js --write', body, sources: b.sources, size: { width: OUT_W, height: OUT_H }, tiers, files };
    const out = path.join(TEX, body, 'manifest.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(manifest, null, 1) + '\n');
    const bytes = Object.values(files).reduce((s, f) => s + f.bytes, 0);
    console.log(`✓ wrote ${rel(out)} — ${tiers.length} tiers, ${Object.keys(files).length} files, ${(bytes / 1e6).toFixed(1)} MB`);
  }
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

main();
