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
  // Mars's pre-Noachian crust: the basaltic crust in Mars's own rust, the melt mostly under it
  'mars-crust': coolingCrust({ crustDark: [78, 46, 34], crustLight: [150, 96, 66], lavaDark: [150, 40, 12], lavaBright: [240, 160, 70], ember: [130, 38, 16], glow: 0.35, scale: 1.4 }),
};
/** Each generated map's seed: the body's own. @type {Record<string, number>} */
const SEEDS = { 'moon-magma': SEED, 'mercury-crust': SEED + 1, 'mars-crust': SEED + 2 };

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

// ── 2b. The derived Moon maps without the young ray systems (plan 27 step G2) ─────────────────
// Tycho's rays (the crater is 109 ± 4 Ma: Stöffler & Ryder 2001) and Copernicus's (~800 Ma)
// are the brightest features of the near side and appear on today's map at every age. A ray
// system is a bright MID-SCALE excess over its region (streaks 1–10° wide; a global high-pass
// cannot tell them from crater rims, measured 2026-11-05), so each is suppressed as the positive
// band-pass (8-px blur minus 60-px blur) inside a weight that tapers with the angular distance
// from its crater; the fine detail (rims, wrinkle ridges) and the regional albedo stay. The map's
// longitude convention (measured on Grimaldi, Crisium, Serenitatis dark and Tycho bright): east
// positive, u = (lon + 180) / 360. The maria tiers derive from the no-rays map (they are older
// than any ray system).
const RAY_SYSTEMS = {
  tycho: { latDeg: -43.3, lonDeg: -11.4, innerDeg: 35, outerDeg: 50, ageMa: 108 },
  copernicus: { latDeg: 9.6, lonDeg: -20.1, innerDeg: 14, outerDeg: 22, ageMa: 800 },
  kepler: { latDeg: 8.1, lonDeg: -38.0, innerDeg: 7, outerDeg: 11, ageMa: 800 },
  aristarchus: { latDeg: 23.7, lonDeg: -47.4, innerDeg: 7, outerDeg: 11, ageMa: 450 },
};
const RAY_BAND_BLUR = [8, 60];
/** Derive the ray-suppressed maps from the present-day map. @param {string} modern @param {{ systems: string[], out: string }[]} steps */
function deriveRaySuppressedMaps(modern, steps) {
  const rgb = readImageRgb(modern, OUT_W, OUT_H);
  const n = OUT_W * OUT_H;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2]) / 255;
  const Lfine = blur(L, RAY_BAND_BLUR[0]), Lcoarse = blur(L, RAY_BAND_BLUR[1]);
  const d2r = Math.PI / 180;
  const angDist = (/** @type {number} */ lat1, /** @type {number} */ lon1, /** @type {number} */ lat2, /** @type {number} */ lon2) =>
    Math.acos(Math.min(1, Math.sin(lat1 * d2r) * Math.sin(lat2 * d2r) + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.cos((lon1 - lon2) * d2r))) / d2r;
  for (const s of steps) {
    const out = Buffer.alloc(n * 3);
    let changed = 0;
    for (let j = 0; j < OUT_H; j++) {
      const lat = 90 - (j + 0.5) / OUT_H * 180;
      for (let i = 0; i < OUT_W; i++) {
        const lon = (i + 0.5) / OUT_W * 360 - 180;
        const k = j * OUT_W + i;
        let w = 0;
        for (const name of s.systems) { const r = RAY_SYSTEMS[name]; w = Math.max(w, 1 - smooth(r.innerDeg, r.outerDeg, angDist(lat, lon, r.latDeg, r.lonDeg))); }
        const band = Math.max(0, Lfine[k] - Lcoarse[k]);
        const drop = band * w * 0.9;
        const f = L[k] > 0.02 ? Math.max(0, L[k] - drop) / L[k] : 1;
        if (drop > 0.02) changed++;
        out[k * 3] = clamp01(rgb[k * 3] * f / 255) * 255;
        out[k * 3 + 1] = clamp01(rgb[k * 3 + 1] * f / 255) * 255;
        out[k * 3 + 2] = clamp01(rgb[k * 3 + 2] * f / 255) * 255;
      }
    }
    console.log(`${path.basename(s.out)}: rays of ${s.systems.join(', ')} suppressed on ${(changed / n * 100).toFixed(1)} % of the map`);
    writeWebp(out, OUT_W, OUT_H, s.out, WEBP_QUALITY);
  }
}

// ── 2c. Mars (plan 27, the Mars item): the seas of the Noachian and the Hesperian from the MOLA
// topography ─────────────────────────────────────────────────────────────────────────────────
// The northern lowlands lie 4–5 km below the southern highlands. Carr & Head (2003) assess the
// two candidate shorelines: the Arabia level (~−2,090 m, the larger Noachian ocean, contested)
// and the Deuteronilus level (~−3,792 m, the smaller Hesperian body, the Vastitas Borealis
// Formation); Di Achille & Hynek (2010) place the deltas and valley networks at the Arabia level.
// The tiers fill today's map below each contour with a depth-shaded sea (the polar caps kept);
// the epochs' boundaries are Hartmann & Neukum (2001): Noachian/Hesperian 3.7 Ga, Hesperian/
// Amazonian 3.0 Ga, the Noachian's start ~4.1 Ga. The DEM is the MOLA MEGDR at 4 pixel/degree
// (NASA PDS, public domain; 1440 × 720 big-endian 16-bit metres above the areoid, the first
// column at 0°E — measured: Hellas −6,044 m, Olympus Mons 19,340 m), fetched into data/.cache
// and sha256-pinned; the map is east-positive centred on 0° (Syrtis Major dark, Arabia bright).
const MARS_MODERN = 'public/Mars.jpg';
const MOLA = {
  url: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/megt90n000cb.img',
  file: path.join(ROOT, 'data', '.cache', 'mola', 'megt90n000cb.img'),
  sha256: '25f16fb7aaf857898dcf98bc4f841341a24f8b9f7e98453ca083bc45d897ca2c',
  width: 1440, height: 720,
};
const MARS_SHORELINES = { arabia: -2090, deuteronilus: -3792 };   // metres, Carr & Head 2003
/** Fetch the MOLA grid when absent and check its hash. @returns {Int16Array} the elevations, row-major from 90°N, 0°E */
function loadMola() {
  fs.mkdirSync(path.dirname(MOLA.file), { recursive: true });
  if (!fs.existsSync(MOLA.file)) { console.log(`fetching ${MOLA.url}`); run('curl', ['-sS', '-L', '--max-time', '300', '-o', MOLA.file, MOLA.url]); }
  const h = sha256(MOLA.file);
  if (h !== MOLA.sha256) throw new Error(`${MOLA.file}: sha256 ${h} ≠ pinned ${MOLA.sha256}`);
  const buf = fs.readFileSync(MOLA.file);
  const z = new Int16Array(MOLA.width * MOLA.height);
  for (let k = 0; k < z.length; k++) z[k] = buf.readInt16BE(k * 2);
  return z;
}
/** Derive the sea maps from today's map and the DEM. @param {string} modern @param {Int16Array} dem @param {{ contourM: number, out: string }[]} steps */
function deriveMarsSeaMaps(modern, dem, steps) {
  const rgb = readImageRgb(modern, OUT_W, OUT_H);
  const n = OUT_W * OUT_H;
  /** the DEM at a map pixel (the map's u = (lon + 180)/360 east-positive; the DEM's u = lon/360): bilinear */
  const zAt = (/** @type {number} */ i, /** @type {number} */ j) => {
    const lon = ((i + 0.5) / OUT_W) * 360 - 180, lat = 90 - ((j + 0.5) / OUT_H) * 180;
    const x = (((lon % 360) + 360) % 360) / 360 * MOLA.width - 0.5, y = (90 - lat) / 180 * MOLA.height - 0.5;
    const x0 = Math.floor(x), y0 = Math.min(MOLA.height - 2, Math.max(0, Math.floor(y))), fx = x - x0, fy = Math.min(1, Math.max(0, y - y0));
    const c = (/** @type {number} */ xx, /** @type {number} */ yy) => dem[yy * MOLA.width + ((xx % MOLA.width) + MOLA.width) % MOLA.width];
    return (c(x0, y0) * (1 - fx) + c(x0 + 1, y0) * fx) * (1 - fy) + (c(x0, y0 + 1) * (1 - fx) + c(x0 + 1, y0 + 1) * fx) * fy;
  };
  for (const s of steps) {
    const out = Buffer.alloc(n * 3);
    let seaW = 0, totW = 0;
    for (let j = 0; j < OUT_H; j++) {
      const lat = 90 - ((j + 0.5) / OUT_H) * 180, cw = Math.cos(lat * Math.PI / 180);
      for (let i = 0; i < OUT_W; i++) {
        const k = j * OUT_W + i;
        const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const z = zAt(i, j);
        const depth = s.contourM - z;
        const cap = smooth(0.7, 0.85, lum) * smooth(70, 80, Math.abs(lat));   // today's polar caps stay
        const w = (1 - smooth(-120, 120, -depth)) * (1 - cap);              // sea below the contour, the shore antialiased over ±120 m
        const sea = mix3([64, 92, 112], [30, 44, 70], smooth(0, 1200, depth)); // the shelf lighter, the deep darker
        const px = mix3([r, g, b], sea, w);
        out[k * 3] = clamp01(px[0] / 255) * 255; out[k * 3 + 1] = clamp01(px[1] / 255) * 255; out[k * 3 + 2] = clamp01(px[2] / 255) * 255;
        seaW += w * cw; totW += cw;
      }
    }
    console.log(`${path.basename(s.out)}: sea below ${s.contourM} m covers ${(seaW / totW * 100).toFixed(1)} % of the surface`);
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
      derived: { note: 'the present-day map with its young ray systems suppressed (the positive band-pass inside a weight around each crater: Tycho, Aristarchus, Copernicus, Kepler) and, from that, the maria raised toward the highlands\' albedo under a blurred low-albedo mask (the methods and their measured thresholds are in the script) — derivatives of the CC BY 4.0 map, labelled "illustration"', derivedFrom: MOON_MODERN, licence: 'CC BY 4.0 (derivative, attributed)' },
      generated: { note: `procedural illustration rendered by this script from seeded 3-D value noise on the sphere (seed ${SEED}) — no third-party rights; labelled "illustration"` },
      literature: {
        'elkins-tanton2011': 'Elkins-Tanton, L.T., Burgess, S. & Yin, Q.-Z., 2011. The lunar magma ocean: Reconciling the solidification process with lunar petrology and geochronology. EPSL 304, 326–336 — the flotation crust within ~10–200 Myr of formation.',
        hiesinger2011: 'Hiesinger, H., Head, J.W., Wolf, U., Jaumann, R. & Neukum, G., 2011. Ages and stratigraphy of lunar mare basalts: A synthesis. GSA Special Paper 477, 1–51 — most mare basalts 3.9–3.1 Ga, the youngest ~1.2 Ga.',
        stofflerRyder2001: 'Stöffler, D. & Ryder, G., 2001. Stratigraphy and isotope ages of lunar geologic units: chronological standard for the inner solar system. Space Science Reviews 96, 9–54 — Tycho 109 ± 4 Ma, Copernicus ~800 Ma (the Copernican system), Aristarchus ~450 Ma.',
      },
    },
    tiers: /** @type {Tier[]} */ ([
      { id: 'modern', label: 'Present-day Moon', fromMa: FUTURE_EDGE_MA, toMa: 108, fadeMyr: 0, file: MOON_MODERN, source: 'modern', kind: 'cited', present: true },   // `present`: the tier the row reads as "today's map" (plan 27 step H: a future tier may sit before it)
      // plan 27 step G2: the young ray systems appear only after their impacts — Tycho 109 ± 4 Ma,
      // Aristarchus ~450 Ma, Copernicus and Kepler ~800 Ma (Stöffler & Ryder 2001); each tier's
      // fade at its younger edge is the rays brightening in over 10 Myr (an illustration: rays
      // form at once and fade over ~1 Gyr)
      { id: 'pre-tycho', label: 'Before Tycho — the Moon without its brightest ray system, 109 ± 4 Ma (derived)', fromMa: 108, toMa: 450, fadeMyr: 10, file: 'public/textures/moon/derived/moon-pre-tycho.webp', source: 'derived', kind: 'illustration' },
      { id: 'pre-aristarchus', label: 'Before Aristarchus — without the Tycho and Aristarchus rays, ~450 Ma (derived)', fromMa: 450, toMa: 800, fadeMyr: 10, file: 'public/textures/moon/derived/moon-pre-aristarchus.webp', source: 'derived', kind: 'illustration' },
      { id: 'no-rays', label: 'Before Copernicus and Kepler — the Moon without its young ray systems, ~800 Ma (derived)', fromMa: 800, toMa: 3300, fadeMyr: 10, file: 'public/textures/moon/derived/moon-no-rays.webp', source: 'derived', kind: 'illustration' },
      // plan 27 step I: `fadeMyr` is the cross-fade at a tier's YOUNGER edge toward the next
      // younger tier's map (the Earth's rule) — the mare flooding was gradual (Hiesinger 2011:
      // the basalts mainly 3.9–3.1 Ga), 50 Myr per step; the crust formed over the magma ocean
      // within ~10–200 Myr (Elkins-Tanton 2011), 20 Myr here
      { id: 'maria-two-thirds', label: 'Mare flooding under way — the maria at two thirds of their present darkness (derived)', fromMa: 3300, toMa: 3550, fadeMyr: 50, file: 'public/textures/moon/derived/moon-maria-2of3.webp', source: 'derived', kind: 'illustration' },
      { id: 'maria-one-third', label: 'Mare flooding beginning — the maria at one third of their present darkness (derived)', fromMa: 3550, toMa: 3800, fadeMyr: 50, file: 'public/textures/moon/derived/moon-maria-1of3.webp', source: 'derived', kind: 'illustration' },
      { id: 'pre-maria', label: 'Highland crust before the mare flooding (derived)', fromMa: 3800, toMa: 4350, fadeMyr: 50, file: 'public/textures/moon/derived/moon-pre-maria.webp', source: 'derived', kind: 'illustration' },
      { id: 'magma-ocean', label: 'Lunar magma ocean under its forming crust (generated)', fromMa: 4350, toMa: DEEP_END_MA, fadeMyr: 20, file: 'public/textures/moon/generated/moon-magma.webp', source: 'generated', kind: 'illustration' },
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
      { id: 'modern', label: 'Present-day Mercury', fromMa: FUTURE_EDGE_MA, toMa: 4100, fadeMyr: 0, file: MERCURY_MODERN, source: 'modern', kind: 'cited', present: true },
      { id: 'early-crust', label: 'Early crust before the oldest preserved surfaces (generated)', fromMa: 4100, toMa: DEEP_END_MA, fadeMyr: 50, file: 'public/textures/mercury/generated/mercury-crust.webp', source: 'generated', kind: 'illustration' },   // plan 27 step I: the fade into the present-day map
    ]),
  },
  mars: {
    description: 'Mars\'s tier table — GENERATED by tools/pipeline/build-body-tiers.js --write (plan 27, the Mars item). The scene cross-fades Mars\'s map by the TT age of its epoch from `tiers` (ages in Myr before J2000). `kind` names what a map IS: the cited present-day map, or illustration — derived from the present-day map and the MOLA topography (the seas below a cited shoreline contour), or generated. The gate tools/verify/surface-tiers.js checks the files against `files`.',
    sources: {
      modern: { file: MARS_MODERN, ...SSS },
      mola: { title: 'MOLA Mission Experiment Gridded Data Record (MEGDR), 4 pixel/degree topography, megt90n000cb', url: MOLA.url, sha256: MOLA.sha256, bytes: 2073600, format: `${MOLA.width} x ${MOLA.height} big-endian 16-bit metres above the areoid, the first column at 0°E, the first row at 90°N`, citation: 'Smith, D.E. et al., 2001. Mars Orbiter Laser Altimeter: Experiment summary after the first year of global mapping of Mars. JGR 106, 23689–23722.', licence: 'NASA PDS Geosciences Node — public domain (a US Government work)', cached: 'data/.cache/mola/ (gitignored; fetched and hash-checked by the script)' },
      derived: { note: 'the present-day map with a depth-shaded sea filled below a shoreline contour of the MOLA topography (the polar caps kept; the method is in the script) — a derivative of the CC BY 4.0 map, labelled "illustration"; the shorelines are a CONTESTED reading of the literature below', derivedFrom: MARS_MODERN, licence: 'CC BY 4.0 (derivative, attributed)' },
      generated: { note: `procedural illustration rendered by this script from seeded 3-D value noise on the sphere (seed ${SEED + 2}) — no third-party rights; labelled "illustration"` },
      literature: {
        carrHead2003: 'Carr, M.H. & Head, J.W., 2003. Oceans on Mars: An assessment of the observational evidence and possible fate. JGR 108, 5042 — the Arabia (~−2,090 m) and Deuteronilus (~−3,792 m) shoreline levels; the evidence assessed as suggestive, not conclusive.',
        diAchilleHynek2010: 'Di Achille, G. & Hynek, B.M., 2010. Ancient ocean on Mars supported by global distribution of deltas and valleys. Nature Geoscience 3, 459–463 — the deltas and valley networks at the Arabia level in the Noachian/early Hesperian.',
        hartmannNeukum2001: 'Hartmann, W.K. & Neukum, G., 2001. Cratering chronology and the evolution of Mars. Space Science Reviews 96, 165–194 — the Noachian/Hesperian boundary ~3.7 Ga, the Hesperian/Amazonian ~3.0 Ga, the Noachian from ~4.1 Ga.',
        tanaka2014: 'Tanaka, K.L. et al., 2014. Geologic map of Mars. USGS Scientific Investigations Map 3292 — the epochs\' surfaces.',
      },
    },
    tiers: /** @type {Tier[]} */ ([
      { id: 'modern', label: 'Present-day Mars — the Amazonian', fromMa: FUTURE_EDGE_MA, toMa: 3000, fadeMyr: 0, file: MARS_MODERN, source: 'modern', kind: 'cited', present: true },
      { id: 'hesperian-sea', label: 'The Hesperian — a northern sea below the Deuteronilus shoreline (−3,792 m, Carr & Head 2003), a contested reading (derived)', fromMa: 3000, toMa: 3700, fadeMyr: 150, file: 'public/textures/mars/derived/mars-hesperian-sea.webp', source: 'derived', kind: 'illustration' },
      { id: 'noachian-sea', label: 'The Noachian — a northern ocean below the Arabia shoreline (−2,090 m, Carr & Head 2003; Di Achille & Hynek 2010), a contested reading (derived)', fromMa: 3700, toMa: 4100, fadeMyr: 150, file: 'public/textures/mars/derived/mars-noachian-sea.webp', source: 'derived', kind: 'illustration' },
      { id: 'pre-noachian', label: 'The pre-Noachian — the early crust before the Noachian\'s recorded surfaces (generated)', fromMa: 4100, toMa: DEEP_END_MA, fadeMyr: 100, file: 'public/textures/mars/generated/mars-crust.webp', source: 'generated', kind: 'illustration' },
    ]),
  },
  saturn: {
    description: 'Saturn\'s tier table — GENERATED by tools/pipeline/build-body-tiers.js --write (plan 27 step F). The map is the same throughout; `rings` says whether the ring mesh is shown at the TT age of the epoch (ages in Myr before J2000). The rings\' age is a measured BAND (see sources.literature); the boundary is the pollution bound\'s upper edge. The gate tools/verify/surface-tiers.js checks the files against `files`.',
    sources: {
      modern: { file: SATURN_MODERN, rings: SATURN_RINGS, ...SSS },
      literature: {
        kempf2023: 'Kempf, S., Altobelli, N., Schmidt, J., Cuzzi, J.N., Estrada, P.R. & Srama, R., 2023. Micrometeoroid infall onto Saturn\'s rings constrains their age to no more than a few hundred million years. Science Advances 9, eadf8537 — ≤ ~400 Myr.',
        odonoghue2019: 'O\'Donoghue, J., Moore, L., Connerney, J., Melin, H., Stallard, T.S., Miller, S. & Baines, K.H., 2019. Observations of the chemical and thermal response of \'ring rain\' on Saturn\'s ionosphere. Icarus 322, 251–260 — the rings drain into the planet within ~100–300 Myr (the forward band of the `rings-gone` tier).',
        iess2019: 'Iess, L. et al., 2019. Measurement and implications of Saturn\'s gravity field and ring mass. Science 364, eaat2965 — 10–100 Myr from the ring mass.',
        hyodo2024: 'Hyodo, R., Genda, H. & Madeira, G., 2024. Saturn\'s rings may be older than they look (the pollution clock allows old rings). Nature Geoscience — the dissent; the age stays a band.',
      },
    },
    tiers: /** @type {Tier[]} */ ([
      // plan 27 step H2: the rings vanish ahead — Cassini's ring rain gives them 100–300 Myr
      // (O'Donoghue et al. 2019), a band; the present tier's fade at its younger edge (−200 Ma)
      // takes the rings out over +100 → +200 Myr ahead (ages ahead of today are negative)
      { id: 'rings-gone', label: 'after its rings — Cassini\'s ring rain gives them 100–300 Myr more (O\'Donoghue 2019), a band', fromMa: FUTURE_EDGE_MA, toMa: -200, fadeMyr: 0, file: SATURN_MODERN, source: 'modern', kind: 'cited', rings: false },
      { id: 'rings', label: 'Present-day Saturn with its rings', fromMa: -200, toMa: 400, fadeMyr: 100, file: SATURN_MODERN, source: 'modern', kind: 'cited', rings: true, present: true },
      { id: 'no-rings', label: 'before its rings — their age is a band, ≤ 400 Myr (Kempf 2023) and disputed', fromMa: 400, toMa: DEEP_END_MA, fadeMyr: 20, file: SATURN_MODERN, source: 'modern', kind: 'cited', rings: false },   // plan 27 step I: the rings' opacity ramps in over the fade (420 → 400 Ma) instead of switching on
    ]),
  },
};

function main() {
  const t0 = Date.now();
  // generated maps
  for (const [name, dir] of [['moon-magma', 'moon'], ['mercury-crust', 'mercury'], ['mars-crust', 'mars']]) {
    const out = path.join(TEX, dir, 'generated', `${name}.webp`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (REBUILD || !fs.existsSync(out)) { const t1 = Date.now(); renderSphereMap(RECIPES[name], SEEDS[name], OUT_W, OUT_H, out, WEBP_QUALITY); console.log(`rendered ${name} (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  }
  // derived Moon maps
  const derivedDir = path.join(TEX, 'moon', 'derived');
  fs.mkdirSync(derivedDir, { recursive: true });
  // plan 27 step G2: the ray-suppressed maps first; the maria maps derive from the no-rays one
  const noRays = path.join(derivedDir, 'moon-no-rays.webp');
  const raySteps = [
    { systems: ['tycho'], out: path.join(derivedDir, 'moon-pre-tycho.webp') },
    { systems: ['tycho', 'aristarchus'], out: path.join(derivedDir, 'moon-pre-aristarchus.webp') },
    { systems: ['tycho', 'aristarchus', 'copernicus', 'kepler'], out: noRays },
  ];
  const steps = [{ f: 0, out: path.join(derivedDir, 'moon-pre-maria.webp') }, { f: 1 / 3, out: path.join(derivedDir, 'moon-maria-1of3.webp') }, { f: 2 / 3, out: path.join(derivedDir, 'moon-maria-2of3.webp') }];
  const raysStale = REBUILD || raySteps.some((s) => !fs.existsSync(s.out));
  if (raysStale) { const t1 = Date.now(); deriveRaySuppressedMaps(path.join(ROOT, MOON_MODERN), raySteps); console.log(`derived the three ray-suppressed Moon maps (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  if (raysStale || steps.some((s) => !fs.existsSync(s.out))) { const t1 = Date.now(); deriveMariaMaps(noRays, steps); console.log(`derived the three maria Moon maps from the no-rays map (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  // the Mars seas (plan 27, the Mars item): the MOLA grid fetched and hash-checked on demand
  const marsDerived = path.join(TEX, 'mars', 'derived');
  fs.mkdirSync(marsDerived, { recursive: true });
  const marsSteps = [{ contourM: MARS_SHORELINES.deuteronilus, out: path.join(marsDerived, 'mars-hesperian-sea.webp') }, { contourM: MARS_SHORELINES.arabia, out: path.join(marsDerived, 'mars-noachian-sea.webp') }];
  if (REBUILD || marsSteps.some((s) => !fs.existsSync(s.out))) { const t1 = Date.now(); deriveMarsSeaMaps(path.join(ROOT, MARS_MODERN), loadMola(), marsSteps); console.log(`derived the two Mars sea maps (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
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
