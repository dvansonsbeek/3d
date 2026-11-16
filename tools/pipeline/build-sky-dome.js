#!/usr/bin/env node
/**
 * build-sky-dome — the Milky Way dome's texture (plan 28 §A; doc 111 §1.47).
 *
 * The dome is a photograph of the DIFFUSE Galaxy in the Galactic frame — the band, the bulge,
 * the dust lanes, the Magellanic Clouds — with the stars taken out, so the only stars in the
 * scene are the catalogue's (the sprites that move with their proper motions in plan 28 §B/C);
 * a photographed star would stay where it is at every epoch while its sprite moves away.
 *
 * Source (cited, licensed): ESO's 360° Milky Way panorama, eso0932a, credit ESO/S. Brunier,
 * CC BY 4.0 (https://www.eso.org/public/copyright/) — an equirectangular all-sky image in
 * GALACTIC coordinates: the Galactic plane along the equator, the Galactic centre at the centre
 * column (https://www.eso.org/public/images/eso0932a/). Measured through three's sphere mapping
 * before this script existed: the band plane 0.66° from the image equator, the bulge's
 * brightness maximum at u = 0.508 (the bulge's dust asymmetry; the frame is the published one),
 * the Magellanic Clouds at the mirrored longitudes — the image is authored as seen from INSIDE,
 * which three's inside-sphere mapping mirrors, so the scene draws it with repeat.x = −1.
 *
 * Derivation (a CHANGE to the licensed work, stated here, in the manifest and in PROVENANCE.md as
 * CC BY 4.0 requires): at the source's own 6000 × 3000, every pixel CLIPPED to its local
 * background — the 9 × 9 median taken at half resolution (an 18-px window at full size, wider than
 * the brightest stars' halos: a full-resolution 9 × 9 median followed Sirius's halo and left its
 * core) plus a margin of 4 % of the range, by a per-pixel minimum (`-compose Darken`), then a
 * Gaussian of σ 0.6 px. A resolved star is a peak far above its local background and is flattened
 * to it (Sirius, Canopus and the planets in the photograph become faint smudges); the band's
 * grain — the UNRESOLVED stellar background that gives the Milky Way its texture, not stars a
 * catalogue would duplicate — and the dust lanes sit within the margin and stay. Measured on the
 * way here (doc 111 §1.47): a median alone (9 × 9, an opening, a blur) removed the grain with the
 * stars and left a foggy, blotchy dome; at 4096 × 2048 the default view magnified the texture
 * 1.6× and the grain read as noise, a σ 1 blur turned it into smudge — the source's resolution
 * with the slightest softening reads as the Milky Way. WebP quality 88, 0.38 MB. The dome's
 * BRIGHTNESS is a rendering choice set in the scene (the material's colour), not here.
 *
 * Usage: node tools/pipeline/build-sky-dome.js --write [--fetch]
 *   The source JPEG is fetched to the gitignored data/.cache/sky/ when absent (or with --fetch)
 *   and checked against its recorded sha256 — a changed source refuses. Writes
 *   public/textures/sky/derived/milkyway-diffuse.webp and public/textures/sky/manifest.json
 *   (a STATIC manifest — no tier table: the dome is one map at every epoch until plan 28 §E
 *   turns it with the Sun's Galactic orbit); the gate tools/verify/surface-tiers.js checks the
 *   file against the manifest's hash and the manifest's licence record.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
if (!WRITE) {
  console.error('Usage: node tools/pipeline/build-sky-dome.js --write [--fetch]');
  process.exit(1);
}

const SRC_URL = 'https://www.eso.org/public/archives/images/large/eso0932a.jpg';
const SRC_PAGE = 'https://www.eso.org/public/images/eso0932a/';
const SRC_SHA256 = '60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179';
const CACHE_DIR = path.join(ROOT, 'data', '.cache', 'sky');
const SRC_FILE = path.join(CACHE_DIR, 'eso0932a-large.jpg');
const OUT_DIR = path.join(ROOT, 'public', 'textures', 'sky');
const OUT_FILE = path.join(OUT_DIR, 'derived', 'milkyway-diffuse.webp');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const WIDTH = 6000, HEIGHT = 3000;   // the source's own size — at 4096 the default view magnified the texture 1.6× and its grain read as noise
/** The recipe, verbatim (ImageMagick 6 arguments between the input and the output). */
const RECIPE = ['(', '+clone', '-resize', '50%', '-statistic', 'Median', '9x9', '-resize', '200%', '-evaluate', 'Add', '4%', ')', '-compose', 'Darken', '-composite', '-gaussian-blur', '0x0.6', '-define', 'webp:method=6', '-quality', '88'];

const sha256 = (/** @type {string} */ file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');

async function fetchSource() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (argv.includes('--fetch') || !fs.existsSync(SRC_FILE)) {
    console.log(`fetching ${SRC_URL} …`);
    const res = await fetch(SRC_URL, { headers: { 'User-Agent': 'essrt-import/1.0' } });
    if (!res.ok) throw new Error(`fetch ${SRC_URL}: HTTP ${res.status}`);
    fs.writeFileSync(SRC_FILE, Buffer.from(await res.arrayBuffer()));
  }
  const h = sha256(SRC_FILE);
  if (h !== SRC_SHA256) throw new Error(`${rel(SRC_FILE)}: sha256 ${h} ≠ the recorded ${SRC_SHA256} — the source changed; re-measure before importing`);
  return SRC_FILE;
}

async function main() {
  const src = await fetchSource();
  const [sw, sh] = execFileSync('identify', ['-format', '%w %h', src], { encoding: 'utf8' }).trim().split(' ').map(Number);
  console.log(`source ${rel(src)}: ${sw}×${sh}, sha256 ${SRC_SHA256.slice(0, 12)}…`);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const t0 = Date.now();
  execFileSync('convert', [src, ...RECIPE, OUT_FILE], { stdio: 'inherit', maxBuffer: 64 << 20 });
  const [w, h] = execFileSync('identify', ['-format', '%w %h', OUT_FILE], { encoding: 'utf8' }).trim().split(' ').map(Number);
  if (w !== WIDTH || h !== HEIGHT) throw new Error(`${rel(OUT_FILE)}: ${w}×${h}, not ${WIDTH}×${HEIGHT}`);
  const bytes = fs.statSync(OUT_FILE).size;
  console.log(`wrote ${rel(OUT_FILE)}: ${w}×${h}, ${bytes} bytes, ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  const manifest = {
    _description: 'The Milky Way dome\'s texture — GENERATED by tools/pipeline/build-sky-dome.js --write (plan 28 §A). A STATIC manifest (no tier table): one map at every epoch, drawn in the Galactic frame through the catalogue stars\' J2000 frame (packages/physics/src/sky/galactic-frame.cjs), the texture\'s horizontal repeat −1 because the image is authored as seen from inside and three\'s inside-sphere mapping mirrors it. The gate tools/verify/surface-tiers.js checks the file against `files` and the source\'s licence record.',
    generated_by: 'tools/pipeline/build-sky-dome.js --write',
    body: 'sky',
    static: true,
    frame: {
      coordinates: 'Galactic (IAU 1958, at J2000): the equator is the Galactic plane, the centre column (u = 0.5) the Galactic centre, the top the north Galactic pole',
      authoredAsSeenFrom: 'inside',
      textureRepeatX: -1,
      measured: 'the band plane 0.66° from the image equator, the bulge\'s brightness maximum at u = 0.508 (the bulge\'s dust asymmetry; the published frame is used), the Magellanic Clouds at the mirrored Galactic longitudes under three\'s inside-sphere mapping (doc 111 §1.47)',
    },
    recipe: { tool: 'ImageMagick convert', arguments: RECIPE, size: [WIDTH, HEIGHT], what: 'every pixel clipped to its local background (a 9×9 median at half resolution, plus 4 % of the range): the resolved stars flattened, the unresolved grain and the dust lanes kept — so the only resolved stars in the scene are the catalogue\'s' },
    sources: {
      eso0932a: {
        title: 'The Milky Way panorama (360-degree panoramic image of the whole celestial sphere)',
        credit: 'ESO/S. Brunier',
        page: SRC_PAGE,
        url: SRC_URL,
        sha256: SRC_SHA256,
        bytes: fs.statSync(src).size,
        width: sw,
        height: sh,
        licence: 'CC BY 4.0',
        licenceUrl: 'https://www.eso.org/public/copyright/',
        changes: 'resized, the stars removed and the image blurred as the recipe records — a derivative, stated as CC BY 4.0 requires',
      },
    },
    files: { [rel(OUT_FILE)]: { sha256: sha256(OUT_FILE), bytes, width: w, height: h, source: 'eso0932a', kind: 'derived' } },
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`wrote ${rel(MANIFEST)}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
