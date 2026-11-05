#!/usr/bin/env node
/**
 * build-earth-tiers.js — plan 27 step E: the Earth's look by age.
 *
 * ONE generator, ONE output table. The scene's Earth day map is chosen by the TT age of the
 * scene epoch from the TIER TABLE this script writes to public/textures/earth/manifest.json
 * (the browser's updateEra and its "Surface" read-out read that one file; the gate
 * tools/verify/earth-tiers.js checks it against the files on disk). Three kinds of map:
 *
 *   cited        — Scotese, C.R. (2016), PALEOMAP PaleoAtlas for GPlates and the PaleoData
 *                  Plotter Program, PALEOMAP Project — the 90 painted paleogeographic rasters
 *                  (3600 × 1800, 0–750 Ma) in Scotese_PaleoAtlas_v3.zip of the Zenodo record
 *                  10.5281/zenodo.5460860 (Scotese & Wright 2018), whose License.txt states
 *                  CC BY 4.0. Prepared here: the small file-name label painted over (a median
 *                  filter over its box), rolled by 180° to the scene's Pacific-centred seam,
 *                  re-encoded at 2048 × 1024 WebP. The present-day map of the set is NOT used
 *                  (the satellite map stays); its 21-ka map replaces the simulator's former
 *                  LGM map, whose source was unrecorded.
 *   illustration — the tiers older than the atlas (the Hadean genesis, the steam atmosphere,
 *                  the rain-out, the ocean world, the Archean, the Proterozoic) and the three
 *                  Snowball episodes, GENERATED here
 *                  from seeded 3-D value noise on the sphere with the parameters below —
 *                  reproducible, no third-party rights, and labelled as illustration on every
 *                  surface: the model does not model continents (plan 27 §1).
 *   modern       — public/Earth.jpg as today (Solar System Scope, CC BY 4.0).
 *
 * Usage: node tools/pipeline/build-earth-tiers.js --write [--src DIR] [--fetch] [--rebuild]
 *   --src DIR    directory holding Scotese_PaleoAtlas_v3.zip (default data/.cache/paleoatlas,
 *                gitignored; fetched by this script when absent or with --fetch)
 *   --rebuild    re-encode every atlas map and re-render every generated map even if present
 * Needs ImageMagick 6 (`convert`, `identify`) and `unzip` on the PATH.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'textures', 'earth');
const ATLAS_DIR = path.join(OUT_DIR, 'paleoatlas');
const DEEP_DIR = path.join(OUT_DIR, 'generated');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const DEFAULT_SRC = path.join(ROOT, 'data', '.cache', 'paleoatlas');

const ZIP_NAME = 'Scotese_PaleoAtlas_v3.zip';
const ZIP_URL = 'https://zenodo.org/records/5460860/files/Scotese_PaleoAtlas_v3.zip?download=1';
const ZIP_SHA256 = '7bf15709970645465df17542e20f9e2e9ed01d20797f38513ed83621e4ace2a0';   // measured 2026-11-03
const ZIP_RASTER_DIR = 'Scotese PaleoAtlas_v3/PALEOMAP PaleoAtlas Rasters v3/';
const SOURCE_W = 3600, SOURCE_H = 1800;
const OUT_W = 2048, OUT_H = 1024;
const WEBP_QUALITY = '85';
// The file-name label every atlas raster carries at its bottom-left (measured on the 0, 165
// and 750 Ma maps: x 170–350, y 1695–1715 of 3600 × 1800); the box is replaced by its own
// median (31 × 31) — thin text vanishes, the painted ocean stays.
const LABEL_BOX = { w: 230, h: 34, x: 150, y: 1688 };

// ── The tier table (the one home) ───────────────────────────────────────────────────────────
// Ages in Myr before J2000 (the engine axis). Each atlas slice covers from the midpoint to the
// previous slice to the midpoint to the next; the generated tiers and the Snowball episodes
// are cut in by age. `fadeMyr` is the cross-fade at a tier's YOUNGER edge (toward the next
// younger tier's map). The LGM → modern boundary and its 300-yr fade are the scene's former
// JD_DAY_BOUNDARY / TRANSITION_DAYS (JD −5,756,193 = 22,472 yr before J2000).
const LGM_END_MA = (2451545 + 5756193) / 365.25 / 1e6;
const LGM_FADE_MYR = 109572 / 365.25 / 1e6;
const GENERATED_TIERS = [
  // id, label, fromMa, toMa, fadeMyr at the younger edge, the render recipe, the cloud and the
  // atmosphere factors (the scene's cloud shell and its blue atmosphere shell scaled by them,
  // following the cross-fade; 1 unless stated — the magma ocean has neither water clouds nor
  // a blue sky)
  // plan 27 step G3: `skyTint` is the atmosphere shell's colour — today's blue where absent; before
  // the Great Oxidation Event (2.4 Ga; the Archean tier's younger fade at 2,500 is where it
  // turns) the sky was anoxic, at times under an orange organic haze (Zahnle et al. 2006; Arney
  // et al. 2016), and the ocean held dissolved ferrous iron (the banded iron formations) — the
  // Archean and ocean-world recipes paint a greener sea; the steam tiers a grey sky
  { id: 'proterozoic', label: 'Proterozoic (generated)', fromMa: 780, toMa: 2500, fadeMyr: 20, recipe: 'proterozoic', clouds: 1, atmosphere: 1 },
  { id: 'archean', label: 'Archean cratons under an anoxic, hazy sky over an iron-green sea (generated)', fromMa: 2500, toMa: 3500, fadeMyr: 40, recipe: 'archean', clouds: 1, atmosphere: 1, skyTint: [0.85, 0.58, 0.28] },
  { id: 'ocean-world', label: 'Early ocean world — an iron-green sea under an anoxic sky (generated)', fromMa: 3500, toMa: 4400, fadeMyr: 60, recipe: 'ocean-world', clouds: 1, atmosphere: 1, skyTint: [0.82, 0.62, 0.35] },
  // The water was in the planet all along (chondritic building blocks: Alexander et al. 2012,
  // Piani et al. 2020) and condensed, it did not arrive — the two tiers between the magma ocean
  // and the ocean world show where it is meanwhile (owner 2026-11-05: "where did all the water
  // come from all of a sudden?"). The magma ocean crystallises in 1–4 Myr (Hamano et al. 2013;
  // Elkins-Tanton 2012), outgassing a steam atmosphere of a few hundred bar that blankets the
  // cooling crust; once the surface drops below ~500 K the steam rains out in millennia and
  // the surface is clement within ~10 Myr of the impact (Zahnle et al. 2007; Sleep, Zahnle &
  // Neuhoff 2001); the Jack Hills zircons show liquid water by 4,400 Ma (Wilde et al. 2001;
  // Valley et al. 2014). The spans below are a READING of those papers on the model's
  // genesis (4,429 Ma), illustrative like every generated tier, and say so in their labels.
  { id: 'rain-out', label: 'The first oceans raining out of the steam atmosphere onto the new crust — a reading of Zahnle 2007 and Wilde 2001 (generated)', fromMa: 4400, toMa: 4415, fadeMyr: 5, recipe: 'rain-out', clouds: 1, atmosphere: 0.8, skyTint: [0.78, 0.74, 0.66] },
  { id: 'steam', label: 'Steam atmosphere over the solidifying crust — a reading of Hamano 2013 and Zahnle 2007 (generated)', fromMa: 4415, toMa: 4427, fadeMyr: 3, recipe: 'steam', clouds: 1, atmosphere: 0.5, skyTint: [0.8, 0.78, 0.74] },
  { id: 'genesis', label: 'Hadean magma ocean after the Moon-forming impact (generated)', fromMa: 4427, toMa: 5000, fadeMyr: 1, recipe: 'genesis', clouds: 0, atmosphere: 0 },
];
// Snowball Earth episodes (global glaciations; one generated white map for all three):
// Makganyene 2,300–2,220 Ma (Kopp et al. 2005), Sturtian 717–659 Ma and Marinoan 645–635 Ma
// (Rooney et al. 2015). Cut into whatever tier they fall in.
const SNOWBALL_SPANS = [
  { id: 'snowball-marinoan', label: 'Marinoan Snowball Earth (generated)', fromMa: 635, toMa: 645 },
  { id: 'snowball-sturtian', label: 'Sturtian Snowball Earth (generated)', fromMa: 659, toMa: 717 },
  { id: 'snowball-makganyene', label: 'Makganyene Snowball Earth (generated)', fromMa: 2220, toMa: 2300 },
];
const SNOWBALL_FADE_MYR = 2;
// plan 27 step I: half the atlas's own 5-Myr spacing — the Earth is always a blend of the two
// nearest reconstructions and the continents move continuously instead of stepping (0.5 Myr
// was shorter than a 1-Myr time step: picture x one step, picture y the next — the owner)
const ATLAS_FADE_MYR = 2.5;
const SEED = 20261103;

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const REBUILD = argv.includes('--rebuild');
const srcIdx = argv.indexOf('--src');
const SRC = srcIdx >= 0 ? path.resolve(argv[srcIdx + 1]) : DEFAULT_SRC;
if (!WRITE) {
  console.error('Usage: node tools/pipeline/build-earth-tiers.js --write [--src DIR] [--fetch] [--rebuild]');
  process.exit(1);
}

const sha256 = (/** @type {string} */ file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');
// the generated maps' machinery (noise, colour helpers, the sphere renderer) has ONE home,
// shared with build-body-tiers.js
const { run, makeNoise, mix3, clamp01, smooth, renderSphereMap, readImageRgb, writeWebp } = require('./lib/procedural-sphere');
/** @typedef {import('./lib/procedural-sphere').Recipe} Recipe */

// ── 1. The atlas ────────────────────────────────────────────────────────────────────────────
async function fetchZip() {
  fs.mkdirSync(SRC, { recursive: true });
  const zip = path.join(SRC, ZIP_NAME);
  if (argv.includes('--fetch') || !fs.existsSync(zip)) {
    console.log(`fetching ${ZIP_URL} …`);
    const res = await fetch(ZIP_URL, { headers: { 'User-Agent': 'essrt-import/1.0' } });
    if (!res.ok) throw new Error(`fetch ${ZIP_URL}: HTTP ${res.status}`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  }
  const h = sha256(zip);
  if (h !== ZIP_SHA256) throw new Error(`${zip}: sha256 ${h} ≠ the recorded ${ZIP_SHA256} — the source changed; re-measure before importing`);
  return zip;
}

/** @param {string} zip @returns {{ name: string, ageMa: number, label: string, src: string }[]} */
function extractRasters(zip) {
  const dir = path.join(SRC, 'rasters');
  fs.mkdirSync(dir, { recursive: true });
  const listed = run('unzip', ['-Z1', zip]).split('\n').filter((n) => n.startsWith(ZIP_RASTER_DIR) && n.endsWith('.jpg'));
  if (listed.length === 0) throw new Error('no rasters found in the zip');
  run('unzip', ['-o', '-q', zip, `${ZIP_RASTER_DIR}*.jpg`, '-d', dir]);
  const licence = run('unzip', ['-p', zip, 'License.txt']);
  if (!/Creative Commons Attribution 4\.0/.test(licence)) throw new Error('the zip\'s License.txt no longer states CC BY 4.0 — stop and re-check the rights');
  return listed.map((n) => {
    const base = path.basename(n, '.jpg');
    const m = /^Map\d+a\s*(.*)_(\d{3})$/.exec(base);
    if (!m) throw new Error(`unexpected raster name: ${base}`);
    return { name: base, label: m[1].trim(), ageMa: Number(m[2]), src: path.join(dir, n) };
  }).sort((a, b) => a.ageMa - b.ageMa);
}

/** Prepare one atlas raster: label patched, rolled 180°, resized, WebP. @param {string} src @param {string} out */
function prepareAtlasRaster(src, out) {
  const dims = run('identify', ['-format', '%w %h', src]).trim();
  if (dims !== `${SOURCE_W} ${SOURCE_H}`) throw new Error(`${src}: ${dims}, expected ${SOURCE_W} ${SOURCE_H}`);
  run('convert', [src,
    '(', '+clone', '-crop', `${LABEL_BOX.w}x${LABEL_BOX.h}+${LABEL_BOX.x}+${LABEL_BOX.y}`, '+repage', '-statistic', 'Median', '31x31', ')',
    '-geometry', `+${LABEL_BOX.x}+${LABEL_BOX.y}`, '-composite',
    '-roll', `+${SOURCE_W / 2}+0`,
    '-filter', 'Lanczos', '-resize', `${OUT_W}x${OUT_H}!`,
    '-quality', WEBP_QUALITY, '-define', 'webp:method=6', out]);
}

// ── 2. The generated tiers: seeded 3-D value noise on the sphere (lib/procedural-sphere) ────
/** A terrain field: land where h > sea; the land/shelf/ocean colouring shared by the three
 *  rocky tiers. @param {[number,number,number]} p @param {ReturnType<typeof makeNoise>} N
 *  @param {{freq: number, sea: number, shelf: number, land: number[], landHigh: number[], ocean: number[], deep: number[], shelfColor: number[]}} k */
function rockyWorld(p, N, k) {
  const h = N.fbm(p[0] * k.freq, p[1] * k.freq, p[2] * k.freq, 7);
  const detail = N.fbm(p[0] * 14 + 7, p[1] * 14 + 7, p[2] * 14 + 7, 4);
  if (h > k.sea) {
    const up = smooth(k.sea, k.sea + 0.18, h);
    return mix3(mix3(k.land, k.landHigh, up), [k.land[0] * 0.75, k.land[1] * 0.75, k.land[2] * 0.75], (detail - 0.5) * 0.6 + 0.3);
  }
  if (h > k.sea - k.shelf) return mix3(k.ocean, k.shelfColor, smooth(k.sea - k.shelf, k.sea, h));
  return mix3(k.deep, k.ocean, smooth(k.sea - 0.35, k.sea - k.shelf, h) * (0.8 + 0.4 * (detail - 0.5)));
}

/** @type {Record<string, Recipe>} */
const RECIPES = {
  // the Hadean after the impact: a dark cooling crust threaded by glowing fractures
  genesis: (u, v, p, N) => {
    const crust = N.fbm(p[0] * 2.5, p[1] * 2.5, p[2] * 2.5, 6);                       // cooled plates vs hot regions
    const region = N.fbm(p[0] * 1.3 + 9, p[1] * 1.3 + 9, p[2] * 1.3 + 9, 3);           // where the crust is still thin
    const r = 1 - Math.abs(2 * N.fbm(p[0] * 4.5 + 3, p[1] * 4.5 + 3, p[2] * 4.5 + 3, 5) - 1);   // ridged: 1 on the ridges
    const glow = smooth(0.90, 0.99, r) * (0.35 + 0.65 * smooth(0.35, 0.7, region));
    const base = mix3([22, 18, 18], [64, 52, 46], crust);
    const lava = mix3([170, 40, 12], [255, 200, 90], smooth(0.93, 1.0, r));
    const hot = mix3(base, lava, glow);
    const ember = smooth(0.62, 0.85, region) * smooth(0.55, 0.75, crust) * 0.35;      // dull red-hot plates
    const warm = mix3(hot, [150, 40, 14], ember);
    const haze = N.fbm(p[0] * 20, p[1] * 20, p[2] * 20, 3);
    return mix3(warm, [warm[0] * 0.8, warm[1] * 0.8, warm[2] * 0.8], (haze - 0.5) * 0.5 + 0.25);
  },
  // the solidifying crust under its steam blanket: the genesis crust, cooled and dimmed, seen
  // through a nearly opaque grey-white vapour deck (a hot Venus) — the water is in the air
  steam: (u, v, p, N) => {
    const crust = N.fbm(p[0] * 2.5, p[1] * 2.5, p[2] * 2.5, 6);
    const region = N.fbm(p[0] * 1.3 + 9, p[1] * 1.3 + 9, p[2] * 1.3 + 9, 3);
    const r = 1 - Math.abs(2 * N.fbm(p[0] * 4.5 + 3, p[1] * 4.5 + 3, p[2] * 4.5 + 3, 5) - 1);
    const glow = smooth(0.95, 1.0, r) * smooth(0.5, 0.8, region) * 0.3;                // the last glowing fractures
    const base = mix3(mix3([30, 27, 27], [62, 56, 52], crust), [150, 50, 20], glow);
    const deck = N.fbm(p[0] * 3.5 + 17, p[1] * 3.5 + 17, p[2] * 3.5 + 17, 6);            // the vapour deck's density
    const band = N.fbm(p[0] * 9 + 31, p[1] * 9 + 31, p[2] * 9 + 31, 4);                   // its finer structure
    const vapour = mix3([196, 196, 202], [236, 236, 240], band);
    return mix3(base, vapour, 0.55 + 0.45 * smooth(0.3, 0.7, deck));                    // 55–100 % cover: the dark crust shows in the thin patches
  },
  // the rain-out: the same terrain field the ocean world rises over (freq 4.5), water filling
  // the lows under a thinning vapour veil — the cross-fade into the ocean world raises the sea
  'rain-out': (u, v, p, N) => {
    const ground = rockyWorld(p, N, { freq: 4.5, sea: 0.5, shelf: 0.04, land: [56, 52, 50], landHigh: [98, 92, 86], ocean: [30, 48, 74], deep: [16, 30, 52], shelfColor: [48, 66, 92] });
    const deck = N.fbm(p[0] * 3.5 + 17, p[1] * 3.5 + 17, p[2] * 3.5 + 17, 6);
    const band = N.fbm(p[0] * 9 + 31, p[1] * 9 + 31, p[2] * 9 + 31, 4);
    const vapour = mix3([200, 200, 206], [236, 236, 240], band);
    return mix3(ground, vapour, 0.25 + 0.45 * smooth(0.4, 0.75, deck));                 // 25–70 % cover
  },
  // a global ocean with scattered volcanic islands (a few per cent of land); the sea iron-green
  // (ferrous iron in solution before the oxygenation: plan 27 step G3)
  'ocean-world': (u, v, p, N) => rockyWorld(p, N, { freq: 4.5, sea: 0.76, shelf: 0.05, land: [96, 84, 72], landHigh: [150, 132, 110], ocean: [28, 84, 92], deep: [12, 48, 58], shelfColor: [64, 128, 122] }),
  // small cratons in a global ocean, no vegetation, no ice; the sea iron-green before the GOE
  archean: (u, v, p, N) => rockyWorld(p, N, { freq: 2.6, sea: 0.68, shelf: 0.06, land: [122, 100, 74], landHigh: [170, 150, 118], ocean: [24, 78, 86], deep: [10, 44, 54], shelfColor: [62, 126, 118] }),
  // supercontinent-scale red-bed land, wide shallow seas, no vegetation
  proterozoic: (u, v, p, N) => rockyWorld(p, N, { freq: 1.8, sea: 0.58, shelf: 0.07, land: [152, 92, 60], landHigh: [190, 150, 104], ocean: [24, 60, 112], deep: [10, 30, 70], shelfColor: [74, 128, 168] }),
  // the same world under global ice: sea ice with faint fracture lines, land ice greyer
  snowball: (u, v, p, N) => {
    const h = N.fbm(p[0] * 1.8, p[1] * 1.8, p[2] * 1.8, 7);
    const mottle = N.fbm(p[0] * 12 + 5, p[1] * 12 + 5, p[2] * 12 + 5, 4);
    const crack = 1 - Math.abs(2 * N.fbm(p[0] * 4 + 11, p[1] * 4 + 11, p[2] * 4 + 11, 4) - 1);
    const ice = mix3([226, 232, 240], [246, 248, 252], mottle);
    const landIce = mix3([204, 208, 214], [228, 230, 234], mottle);
    const base = h > 0.58 ? landIce : mix3(ice, [176, 198, 226], smooth(0.955, 1.0, crack) * 0.8);
    const lat = Math.abs(p[1]);
    return mix3(base, [base[0] * 0.93, base[1] * 0.95, base[2]], 1 - lat);   // a slightly bluer equatorial sea-ice band
  },
};

// ── 2b. The derived future maps (plan 27 step H1): today's map with its vegetation gone, and that
// under the vapour deck with the seas darkened ──────────────────────────────────────────────
const FUTURE_BROWN = 'future-biosphere-end', FUTURE_GREENHOUSE = 'future-moist-greenhouse';
/** @param {string} modern the present-day map @param {string} outBrown @param {string} outGreenhouse */
function deriveFutureMaps(modern, outBrown, outGreenhouse) {
  const rgb = readImageRgb(modern, OUT_W, OUT_H);
  const n = OUT_W * OUT_H;
  const brown = Buffer.alloc(n * 3), green = Buffer.alloc(n * 3);
  const N = makeNoise(SEED + 11);
  for (let j = 0; j < OUT_H; j++) {
    const v = (j + 0.5) / OUT_H, lat = (0.5 - v) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < OUT_W; i++) {
      const k = j * OUT_W + i;
      const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // vegetation: green at or above red and blue (the satellite map's forests are dark olive:
      // g − max(r, b) of only 10–25 levels), not bright (ice), not blue (sea); water: blue above red
      const veg = smooth(-0.01, 0.05, (g - Math.max(r, b)) / 255) * (1 - smooth(0.6, 0.8, lum)) * (1 - smooth(0.0, 0.1, (b - r) / 255));
      const water = smooth(0.0, 0.15, (b - r) / 255) * (1 - smooth(0.5, 0.7, lum));
      // the biosphere's end: the greens to a bright ochre desert (a desert reflects more than a
      // forest: the luminance rises toward the Sahara's), the seas and the ice kept
      const ochre = [0.78, 0.66, 0.46];
      const l2 = Math.max(0.62, Math.min(1, lum * 1.9));
      const bro = [mix3([r, g, b], [ochre[0] * 255 * l2, ochre[1] * 255 * l2, ochre[2] * 255 * l2], veg)];
      brown[k * 3] = clamp01(bro[0][0] / 255) * 255; brown[k * 3 + 1] = clamp01(bro[0][1] / 255) * 255; brown[k * 3 + 2] = clamp01(bro[0][2] / 255) * 255;
      // the moist greenhouse: the brown Earth, its seas darkened (shrinking) under the vapour deck
      const px = cl * Math.cos(((i + 0.5) / OUT_W - 0.5) * 2 * Math.PI), py = sl, pz = cl * Math.sin(((i + 0.5) / OUT_W - 0.5) * 2 * Math.PI);
      const deck = N.fbm(px * 3.5 + 17, py * 3.5 + 17, pz * 3.5 + 17, 6);
      const band = N.fbm(px * 9 + 31, py * 9 + 31, pz * 9 + 31, 4);
      const vapour = mix3([196, 196, 202], [236, 236, 240], band);
      const sea = mix3(bro[0], [bro[0][0] * 0.55, bro[0][1] * 0.6, bro[0][2] * 0.7], water);
      const gh = mix3(sea, vapour, 0.5 + 0.5 * smooth(0.3, 0.7, deck));
      green[k * 3] = clamp01(gh[0] / 255) * 255; green[k * 3 + 1] = clamp01(gh[1] / 255) * 255; green[k * 3 + 2] = clamp01(gh[2] / 255) * 255;
    }
  }
  writeWebp(brown, OUT_W, OUT_H, outBrown, WEBP_QUALITY);
  writeWebp(green, OUT_W, OUT_H, outGreenhouse, WEBP_QUALITY);
}

/** Render one generated map to a WebP file. @param {string} recipe @param {string} out */
function renderGenerated(recipe, out) {
  const f = RECIPES[recipe];
  if (!f) throw new Error(`no recipe ${recipe}`);
  renderSphereMap(f, SEED, OUT_W, OUT_H, out, WEBP_QUALITY);
}

// ── 3. The tier table ───────────────────────────────────────────────────────────────────────
/** @typedef {{ id: string, label: string, fromMa: number, toMa: number, fadeMyr: number, file: string, source: 'scotese2016'|'generated'|'modern', kind: 'cited'|'illustration', clouds: number, atmosphere: number, ageMa?: number }} Tier */

/** Cut a span into a sorted, contiguous tier list (the span's tier replaces whatever it overlaps).
 *  @param {Tier[]} tiers @param {Tier} span */
function cutIn(tiers, span) {
  /** @type {Tier[]} */
  const out = [];
  for (const t of tiers) {
    if (t.toMa <= span.fromMa || t.fromMa >= span.toMa) { out.push(t); continue; }
    if (t.fromMa < span.fromMa) out.push({ ...t, toMa: span.fromMa });
    if (t.toMa > span.toMa) out.push({ ...t, fromMa: span.toMa, id: t.id, fadeMyr: SNOWBALL_FADE_MYR });
  }
  out.push(span);
  return out.sort((a, b) => a.fromMa - b.fromMa);
}

/** @param {{ name: string, ageMa: number, label: string, file: string }[]} atlas */
function buildTierTable(atlas) {
  /** @type {Tier[]} */
  // plan 27 step H1 — the future to the domain's edge: the Sun brightens ~10 % per Gyr; CO₂
  // drawdown starves C₃ plants at ~+0.6 to +0.9 Gyr (Caldeira & Kasting 1992; Franck et al. 2006)
  // and the moist greenhouse sets in near +1 Gyr (Leconte et al. 2013; Wolf & Toon 2015), the
  // domain's future edge. Two DERIVED tiers (from today's map: the greens desaturated to ochre;
  // then the same under a thickening vapour deck with the seas darkened), the mirror of the
  // genesis sequence, their spans a reading of those papers and said so; ages ahead are negative.
  let tiers = [
    { id: 'moist-greenhouse', label: 'The moist greenhouse — the oceans evaporating under a brightening Sun, a reading of Leconte 2013 and Wolf & Toon 2015 (derived)', fromMa: -1e9, toMa: -900, fadeMyr: 0, file: `public/textures/earth/generated/${FUTURE_GREENHOUSE}.webp`, source: 'derived', kind: 'illustration', clouds: 1, atmosphere: 0.8, skyTint: [0.8, 0.78, 0.74] },
    { id: 'biosphere-end', label: 'The end of the land biosphere — CO₂ starvation of the plants under a brightening Sun, a reading of Caldeira & Kasting 1992 and Franck 2006 (derived)', fromMa: -900, toMa: -600, fadeMyr: 50, file: `public/textures/earth/generated/${FUTURE_BROWN}.webp`, source: 'derived', kind: 'illustration', clouds: 1, atmosphere: 1 },
    { id: 'modern', label: 'Present-day Earth (satellite imagery)', fromMa: -600, toMa: LGM_END_MA, fadeMyr: 100, file: 'public/Earth.jpg', source: 'modern', kind: 'cited', clouds: 1, atmosphere: 1, present: true },
  ];
  // the atlas slices from the 21-ka map up: midpoints between neighbours; the 0 Ma map is unused
  const slices = atlas.filter((a) => a.ageMa > 0);
  for (let i = 0; i < slices.length; i++) {
    const a = slices[i];
    const fromMa = i === 0 ? LGM_END_MA : (slices[i - 1].ageMa + a.ageMa) / 2;
    const toMa = i === slices.length - 1 ? GENERATED_TIERS[0].fromMa : (a.ageMa + slices[i + 1].ageMa) / 2;
    tiers.push({ id: `scotese-${String(a.ageMa).padStart(3, '0')}`, label: `${a.label}, ${a.ageMa === 1 ? '21 ka' : a.ageMa + ' Ma'} (Scotese 2016 PaleoAtlas)`, fromMa, toMa, fadeMyr: i === 0 ? LGM_FADE_MYR : ATLAS_FADE_MYR, file: a.file, source: 'scotese2016', kind: 'cited', clouds: 1, atmosphere: 1, ageMa: a.ageMa });
  }
  for (const g of GENERATED_TIERS) tiers.push({ id: g.id, label: g.label, fromMa: g.fromMa, toMa: g.toMa, fadeMyr: g.fadeMyr, file: `public/textures/earth/generated/${g.recipe}.webp`, source: 'generated', kind: 'illustration', clouds: g.clouds, atmosphere: g.atmosphere, ...(g.skyTint ? { skyTint: g.skyTint } : {}) });
  tiers.sort((a, b) => a.fromMa - b.fromMa);
  for (const s of SNOWBALL_SPANS) tiers = cutIn(tiers, { ...s, fadeMyr: SNOWBALL_FADE_MYR, file: 'public/textures/earth/generated/snowball.webp', source: 'generated', kind: 'illustration', clouds: 1, atmosphere: 1 });
  for (let i = 0; i + 1 < tiers.length; i++) if (tiers[i].toMa !== tiers[i + 1].fromMa) throw new Error(`tier table not contiguous at ${tiers[i].id} → ${tiers[i + 1].id}`);
  return tiers;
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(ATLAS_DIR, { recursive: true });
  fs.mkdirSync(DEEP_DIR, { recursive: true });
  const zip = await fetchZip();
  const rasters = extractRasters(zip);
  console.log(`${rasters.length} atlas rasters (${rasters[0].ageMa}–${rasters[rasters.length - 1].ageMa} Ma)`);
  const atlas = [];
  for (const r of rasters) {
    if (r.ageMa === 0) continue;   // the present-day map is not used (the satellite map stays)
    const out = path.join(ATLAS_DIR, `scotese-${String(r.ageMa).padStart(3, '0')}Ma.webp`);
    if (REBUILD || !fs.existsSync(out)) { prepareAtlasRaster(r.src, out); process.stdout.write('.'); }
    atlas.push({ name: r.name, ageMa: r.ageMa, label: r.label, file: rel(out) });
  }
  console.log(`\natlas prepared (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const recipe of Object.keys(RECIPES)) {
    const out = path.join(DEEP_DIR, `${recipe}.webp`);
    if (REBUILD || !fs.existsSync(out)) { const t1 = Date.now(); renderGenerated(recipe, out); console.log(`rendered ${recipe} (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  }
  {
    const outBrown = path.join(DEEP_DIR, `${FUTURE_BROWN}.webp`), outGreenhouse = path.join(DEEP_DIR, `${FUTURE_GREENHOUSE}.webp`);
    if (REBUILD || !fs.existsSync(outBrown) || !fs.existsSync(outGreenhouse)) { const t1 = Date.now(); deriveFutureMaps(path.join(ROOT, 'public/Earth.jpg'), outBrown, outGreenhouse); console.log(`derived the future maps (${((Date.now() - t1) / 1000).toFixed(1)} s)`); }
  }
  const tiers = buildTierTable(atlas);
  /** @type {Record<string, { sha256: string, bytes: number, width: number, height: number }>} */
  const files = {};
  for (const f of new Set(tiers.map((t) => t.file))) {
    const abs = path.join(ROOT, f);
    const [w, h] = run('identify', ['-format', '%w %h', abs]).trim().split(' ').map(Number);
    files[f] = { sha256: sha256(abs), bytes: fs.statSync(abs).size, width: w, height: h };
  }
  const manifest = {
    _description: 'The Earth surface tier table — GENERATED by tools/pipeline/build-earth-tiers.js --write (plan 27 step E). The scene picks the day map by the TT age of its epoch from `tiers` (ages in Myr before J2000; each tier cross-fades to the next younger tier\'s map over `fadeMyr` at its younger edge; `clouds` and `atmosphere` scale the cloud shell and the blue atmosphere shell, both 0 over the magma ocean). `kind` names what a map IS: cited paleogeography (Scotese 2016, CC BY 4.0) or generated illustration (the model does not model continents). The gate tools/verify/earth-tiers.js checks the files against `files`.',
    generated_by: 'tools/pipeline/build-earth-tiers.js --write',
    sources: {
      scotese2016: {
        title: 'PALEOMAP PaleoAtlas for GPlates and the PaleoData Plotter Program (PaleoAtlas v3 rasters)',
        citation: 'Scotese, C.R., 2016. PALEOMAP PaleoAtlas for GPlates and the PaleoData Plotter Program, PALEOMAP Project. Distributed in the Zenodo record of Scotese, C.R. & Wright, N., 2018, PALEOMAP Paleodigital Elevation Models (PaleoDEMS) for the Phanerozoic.',
        doi: '10.5281/zenodo.5460860',
        zip: ZIP_NAME, zipSha256: ZIP_SHA256, url: ZIP_URL,
        licence: 'CC BY 4.0 (License.txt in the zip)',
        sourceSize: `${SOURCE_W} x ${SOURCE_H} JPEG`,
        preparation: `the bottom-left file-name label replaced by the 31x31 median of its ${LABEL_BOX.w}x${LABEL_BOX.h} box; rolled by 180° to the scene's Pacific-centred seam; Lanczos resize to ${OUT_W} x ${OUT_H}; WebP quality ${WEBP_QUALITY}. The political boundaries drawn on the originals are kept.`,
      },
      generated: {
        note: `procedural illustration rendered by this script from seeded 3-D value noise on the sphere (seed ${SEED}; the recipes' parameters are in the script) — no third-party rights; labelled "illustration" on every surface`,
        snowballEpisodes: SNOWBALL_SPANS.map((s) => ({ id: s.id, fromMa: s.fromMa, toMa: s.toMa })),
      },
      modern: { file: 'public/Earth.jpg', source: 'Solar System Scope textures (https://www.solarsystemscope.com/textures/)', licence: 'CC BY 4.0' },
      derived: { note: 'the present-day map with its vegetation desaturated to an ochre desert (the biosphere\'s end), and that under a seeded vapour deck with the seas darkened (the moist greenhouse) — derivatives of the CC BY 4.0 map, labelled "illustration"; the spans a reading of the literature below', derivedFrom: 'public/Earth.jpg', licence: 'CC BY 4.0 (derivative, attributed)' },
      literature: {
        caldeiraKasting1992: 'Caldeira, K. & Kasting, J.F., 1992. The life span of the biosphere revisited. Nature 360, 721–723 — C₃ photosynthesis ends at ~+0.5–0.9 Gyr as CO₂ is drawn down under the brightening Sun.',
        franck2006: 'Franck, S., Bounama, C. & von Bloh, W., 2006. Causes and timing of future biosphere extinctions. Biogeosciences 3, 85–92 — the land biosphere ends ~+0.8–1.2 Gyr.',
        leconte2013: 'Leconte, J., Forget, F., Charnay, B., Wordsworth, R. & Pottier, A., 2013. Increased insolation threshold for runaway greenhouse processes on Earth-like planets. Nature 504, 268–271 — the runaway at ~+1 Gyr.',
        wolfToon2015: 'Wolf, E.T. & Toon, O.B., 2015. The evolution of habitable climates under the brightening Sun. JGR Atmospheres 120, 5775–5794 — the moist greenhouse sets in at ~+1 Gyr.',
        zahnle2007: 'Zahnle, K., Arndt, N., Cockell, C., Halliday, A., Nisbet, E., Selsis, F. & Sleep, N.H., 2007. Emergence of a habitable planet. Space Science Reviews 129, 35–78 — the rock-vapour and steam atmospheres after the impact, the rain-out.',
        hamano2013: 'Hamano, K., Abe, Y. & Genda, H., 2013. Emergence of two types of terrestrial planet on solidification of magma ocean. Nature 497, 607–610 — the magma ocean crystallises in 1–4 Myr at 1 AU.',
        sleep2001: 'Sleep, N.H., Zahnle, K. & Neuhoff, P.S., 2001. Initiation of clement surface conditions on the earliest Earth. PNAS 98, 3666–3672 — clement conditions within ~10 Myr of the impact.',
        wilde2001: 'Wilde, S.A., Valley, J.W., Peck, W.H. & Graham, C.M., 2001. Evidence from detrital zircons for the existence of continental crust and oceans on the Earth 4.4 Gyr ago. Nature 409, 175–178 — liquid water by 4,400 Ma.',
        zahnle2006: 'Zahnle, K., Claire, M. & Catling, D., 2006. The loss of mass-independent fractionation in sulfur due to a Palaeoproterozoic collapse of atmospheric methane. Geobiology 4, 271–283 — the Archean methane haze.',
        arney2016: 'Arney, G. et al., 2016. The pale orange dot: the spectrum and habitability of hazy Archean Earth. Astrobiology 16, 873–899 — the orange organic haze.',
      },
    },
    size: { width: OUT_W, height: OUT_H },
    tiers,
    files,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
  const bytes = Object.values(files).reduce((s, f) => s + f.bytes, 0);
  console.log(`✓ wrote ${rel(MANIFEST)} — ${tiers.length} tiers, ${Object.keys(files).length} files, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

main().catch((e) => { console.error(e); process.exit(1); });
