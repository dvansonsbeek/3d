/**
 * procedural-sphere.js — the ONE home of the generated surface maps' machinery (plan 27 steps
 * E and F): seeded 3-D value noise on the unit sphere, the small colour helpers, an
 * equirectangular renderer that writes a WebP through ImageMagick, and a reader that hands an
 * existing map's pixels to a derivation. Used by tools/pipeline/build-earth-tiers.js (the
 * Earth) and tools/pipeline/build-body-tiers.js (the Moon, Mercury, Saturn's rings).
 *
 * A recipe is `(u, v, p, N) → [r, g, b]` on 0–255: `u, v` the map coordinates (u 0 → 1 west
 * to east from the seam, v 0 → 1 north to south), `p` the unit-sphere point, `N` the noise.
 * Reproducible: the same seed and recipe give the same bytes (the tier gates hash them).
 */

'use strict';

const fs = require('fs');
const { execFileSync } = require('child_process');

/** Run an ImageMagick (or other) command and return its stdout as text. @param {string} cmd @param {string[]} args */
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });

/** Seeded 3-D value noise with a fractal sum. @param {number} seed */
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return s / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const lattice = (/** @type {number} */ ix, /** @type {number} */ iy, /** @type {number} */ iz) => perm[(perm[(perm[ix & 255] + iy) & 255] + iz) & 255] / 255;
  const fade = (/** @type {number} */ t) => t * t * (3 - 2 * t);
  /** @param {number} x @param {number} y @param {number} z */
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const c = (/** @type {number} */ dx, /** @type {number} */ dy, /** @type {number} */ dz) => lattice(ix + dx + 1024, iy + dy + 1024, iz + dz + 1024);
    const x00 = c(0, 0, 0) + fx * (c(1, 0, 0) - c(0, 0, 0)), x10 = c(0, 1, 0) + fx * (c(1, 1, 0) - c(0, 1, 0));
    const x01 = c(0, 0, 1) + fx * (c(1, 0, 1) - c(0, 0, 1)), x11 = c(0, 1, 1) + fx * (c(1, 1, 1) - c(0, 1, 1));
    const y0 = x00 + fy * (x10 - x00), y1 = x01 + fy * (x11 - x01);
    return y0 + fz * (y1 - y0);
  }
  /** fractal sum, normalised to ~[0, 1] @param {number} x @param {number} y @param {number} z @param {number} octaves */
  function fbm(x, y, z, octaves) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < octaves; o++) { sum += amp * noise(x, y, z); norm += amp; x *= 2.02; y *= 2.02; z *= 2.02; amp *= 0.5; }
    return sum / norm;
  }
  return { noise, fbm };
}

/** @typedef {(u: number, v: number, p: [number, number, number], N: ReturnType<typeof makeNoise>) => [number, number, number]} Recipe */
const mix3 = (/** @type {number[]} */ a, /** @type {number[]} */ b, /** @type {number} */ t) => /** @type {[number, number, number]} */ ([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
const clamp01 = (/** @type {number} */ t) => t < 0 ? 0 : t > 1 ? 1 : t;
const smooth = (/** @type {number} */ e0, /** @type {number} */ e1, /** @type {number} */ x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** Write an RGB buffer (width × height × 3) as a WebP through ImageMagick.
 *  @param {Buffer} rgb @param {number} width @param {number} height @param {string} out @param {string} quality */
function writeWebp(rgb, width, height, out, quality) {
  const ppm = out.replace(/\.webp$/, '.ppm');
  fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), rgb]));
  run('convert', [ppm, '-quality', quality, '-define', 'webp:method=6', out]);
  fs.unlinkSync(ppm);
}

/** Render one recipe over the whole sphere to a WebP file.
 *  @param {Recipe} recipe @param {number} seed @param {number} width @param {number} height @param {string} out @param {string} quality */
function renderSphereMap(recipe, seed, width, height, out, quality) {
  const N = makeNoise(seed);
  const buf = Buffer.alloc(width * height * 3);
  for (let j = 0; j < height; j++) {
    const v = (j + 0.5) / height, lat = (0.5 - v) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < width; i++) {
      const u = (i + 0.5) / width, lon = (u - 0.5) * 2 * Math.PI;
      const c = recipe(u, v, [cl * Math.cos(lon), sl, cl * Math.sin(lon)], N);
      const o = (j * width + i) * 3;
      buf[o] = clamp01(c[0] / 255) * 255; buf[o + 1] = clamp01(c[1] / 255) * 255; buf[o + 2] = clamp01(c[2] / 255) * 255;
    }
  }
  writeWebp(buf, width, height, out, quality);
}

/** An existing map's pixels as an RGB buffer at the given size (resampled by ImageMagick).
 *  @param {string} file @param {number} width @param {number} height */
function readImageRgb(file, width, height) {
  return execFileSync('convert', [file, '-filter', 'Lanczos', '-resize', `${width}x${height}!`, '-depth', '8', 'rgb:-'], { maxBuffer: 256 << 20 });
}

module.exports = { run, makeNoise, mix3, clamp01, smooth, writeWebp, renderSphereMap, readImageRgb };
