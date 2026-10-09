#!/usr/bin/env node
/**
 * Plan 07 R10 — re-origin the correction combs from the fitted phase origin
 * t₀ (the "balanced year", perihelionalignmentYear − temperatureGraphMostLikely
 * × H/16 = −302,635) to J2000, by rotating every fitted (sin, cos) pair.
 *
 * THE MATHS (exact, no refit — measured first, plan 07 §9k item 2: every
 * surface of the package model bit-identical before/after over ±300 kyr).
 * A comb term s·sin φ + c·cos φ with φ measured from t₀ reads, with the
 * phase measured from J2000 instead, φ_old = φ_new + δ_d, δ_d = 2π·d·c0,
 * c0 = (2000 − t₀)/H (the linear-t consumers' own constant; the phase
 * table's cyclesBetween(t₀, 2000, 1) agrees to 1.1e-12 cycles). Then
 *   s' = s·cos δ − c·sin δ,   c' = s·sin δ + c·cos δ.
 * The cardinal eccentricity terms ride order·φ₁₆ (δ = order·δ₁₆); the §10g
 * joint sidebands ride order·λ_X − 2π·div·c (δ = −δ_div — the COUNTER-
 * rotating sign is load-bearing, CLAUDE.md); the derived H-slope intercept
 * h0 + h1·c becomes h0 + h1·c0 on the new count. The RA day offset's two
 * cosine amplitudes (hard-coded in three runtimes + the website) gain their
 * sine partners here as a fitted family of their own, ONE home.
 *
 * WHY A SCRIPT. A number a doc cannot reproduce from an artifact is written
 * BY the script (CLAUDE.md); this one is the reproduction of every rotated
 * value from the shipped set and the two inputs that defined t₀.
 *
 * Usage:  node tools/fit/reorigin-combs-j2000.mjs --write   (refuses to run
 *         twice: the file records its phase origin)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FC = join(ROOT, 'public/input/fitted-coefficients.json');
const WRITE = process.argv.includes('--write');

const fc = JSON.parse(readFileSync(FC, 'utf8'));
const mp = JSON.parse(readFileSync(join(ROOT, 'public/input/model-parameters.json'), 'utf8'));
const ar = JSON.parse(readFileSync(join(ROOT, 'public/input/astro-reference.json'), 'utf8'));

if (fc._phaseOrigin === 'J2000') {
  console.error('REFUSING: fitted-coefficients.json already records its phase origin as J2000 — a second rotation would double it.');
  process.exit(1);
}
const H = mp.foundational.holisticyearLength;
const tGML = mp.foundational.temperatureGraphMostLikely;
const periAlign = ar.earthOrbital.perihelionalignmentYear;
if (typeof tGML !== 'number' || typeof periAlign !== 'number' || typeof H !== 'number') {
  console.error('REFUSING: the inputs that defined t₀ (holisticyearLength, temperatureGraphMostLikely, perihelionalignmentYear) are not all present.');
  process.exit(1);
}
const t0 = periAlign - tGML * (H / 16);
const c0 = (2000 - t0) / H;
const delta = (div) => 2 * Math.PI * div * c0;
const rot = (s, c, d) => [s * Math.cos(d) - c * Math.sin(d), s * Math.sin(d) + c * Math.cos(d)];
let pairs = 0;
const rotTriplets = (arr) => { for (const t of arr) { const [s2, c2] = rot(t[1], t[2], delta(t[0])); t[1] = s2; t[2] = c2; pairs++; } };

for (const k of ['TROPICAL_YEAR_HARMONICS', 'SIDEREAL_YEAR_HARMONICS', 'ANOMALISTIC_YEAR_HARMONICS', 'PERI_HARMONICS_RAW', 'SOLSTICE_OBLIQUITY_HARMONICS', 'SUN_LONGITUDE_HARMONICS']) {
  if (!Array.isArray(fc[k])) { console.error(`REFUSING: ${k} missing`); process.exit(1); }
  rotTriplets(fc[k]);
}
for (const type of Object.keys(fc.CARDINAL_POINT_HARMONICS)) rotTriplets(fc.CARDINAL_POINT_HARMONICS[type]);
for (const type of Object.keys(fc.CARDINAL_POINT_ECC_TERMS)) {
  for (const t of fc.CARDINAL_POINT_ECC_TERMS[type]) { const [s2, c2] = rot(t.sin, t.cos, t.order * delta(16)); t.sin = s2; t.cos = c2; pairs++; }
}
for (const t of fc.CARDINAL_POINT_JOINT_TERMS.terms) { const [s2, c2] = rot(t.sin, t.cos, -delta(t.div)); t.sin = s2; t.cos = c2; pairs++; }
const D = fc.CARDINAL_POINT_DERIVED;
const h0Old = D.h0;
D.h0 = D.h0 + D.h1 * c0;

// The RA day offset family — the former literals −14.194 − 5.640·cos φ₁₆ − 1.684·cos φ₈
// (ms/day, phase from t₀) as [div, sin, cos] on the J2000 phase, ONE home.
const RA_MEAN = -14.194, RA_ECC = -5.640, RA_OBL = -1.684;
fc.RA_DAY_OFFSET_MS = {
  mean: RA_MEAN,
  terms: [[16, ...rot(0, RA_ECC, delta(16))], [8, ...rot(0, RA_OBL, delta(8))]],
  note: 'ms/day; the eccentricity (div 16) and obliquity (div 8) coin-rotation lines of the RA day offset, phase from J2000 (plan 07 R10 — were cosine literals on the t₀ phase in three runtimes + the website)',
};
pairs += 2;
fc._phaseOrigin = 'J2000';
fc._phaseOriginNote = `Plan 07 R10: every comb's phase is measured from J2000. The former origin t₀ = ${periAlign} − ${tGML} × H/16 = ${t0} (c0 = ${c0} anchor units before J2000) was rotated out exactly by tools/fit/reorigin-combs-j2000.mjs — no coefficient was refitted; t₀ is no longer an input.`;

console.log(`t₀ = ${t0} · c0 = ${c0} · δ₁ = ${delta(1)} rad · rotated ${pairs} pairs · CARDINAL_POINT_DERIVED.h0 ${h0Old} → ${D.h0}`);
if (WRITE) {
  writeFileSync(FC, JSON.stringify(fc, null, 2) + '\n');
  console.log(`✓ wrote ${FC}`);
} else {
  console.log('(dry run — pass --write to rewrite public/input/fitted-coefficients.json)');
}
