#!/usr/bin/env node
/**
 * import-gaia-neighbours — the stars that ARRIVE (plan 28 §D, doc 111 §1.48).
 *
 * The sky of 20 or 50 Myr from now is mostly not today's naked-eye stars: a relative speed of 20 km/s carries
 * a star 400 pc in 20 Myr, so the bright sky of that epoch is made of stars that today sit hundreds of parsecs
 * away, fainter than the Hipparcos catalogue's V 8. Gaia DR3 supplies them: this script reads the six-
 * dimensional superset — every Gaia DR3 star within 1.5 kpc (parallax > 0.667 mas, parallax/error > 5) with
 * a radial velocity, brighter than absolute magnitude M_G 2 (the stars a naked-eye sky is made of at any
 * epoch; 1.15 million rows, fetched in 32 synchronous chunks keyed on random_index because the archive caps
 * a synchronous result at 65,536 rows and an anonymous asynchronous job at 60 s), joined to the Hipparcos-2
 * cross-match — and keeps the stars that EVER reach V 8 within ±50 Myr on their Galactic orbits (ONE home
 * packages/physics/src/sky/galactic-orbits.cjs: the second-order epicycle about each body's own guiding
 * centre, the Sun on its own), sampled every 0.5 Myr. A star our Hipparcos catalogue already carries
 * (stars.json) is skipped: that record moves it. A star whose relative orbit's radial amplitude exceeds the
 * model's reach is left out and counted.
 *
 * V and B−V for the Gaia-only stars come from G and BP−RP through cubic polynomials FITTED HERE on the rows
 * that match a Hipparcos star of our catalogue (V and B−V from the Hipparcos Catalogue): data-derived, no
 * remembered coefficients; recorded in the manifest with their rms (0.013 mag in V − G, 0.035 in B−V) and
 * their fit range. The colour only tints a sprite; V sets the sprite's size and the visibility cut.
 *
 * Writes public/input/stars-gaia.bin (Float32 columns, little-endian: raDeg, decDeg, distPc, pmRaMasYr,
 * pmDecMasYr, rvKmS, vmag, bv — the astrometry at the Gaia epoch J2016.0, NOT propagated: the scene moves
 * each star on its orbit) and public/input/stars-gaia.json (the manifest: counts, the binary's sha256, the
 * source's canonical sha256 and query, the colour relations, the cuts). Gate: tools/verify/star-catalogue.js.
 *
 * THE FAINT BACKGROUND (the follow-up, doc 111 §1.48): the stars fainter than M_G 2 that reach V 8 come from within
 * 160 pc (M_G 2) to 40 pc (M_G 5); a second superset, data/.cache/stars/gaia-neighbours-faint.csv (M_G 2–5 within
 * 1.5 kpc, pre-filtered server-side by the straight line's closest approach — tools/pipeline/fetch-gaia-neighbours.js
 * says how), is read beside the bright one when present, so the faint background is complete to about ±20 Myr
 * (the line's reach) and thins beyond. Each superset is recorded with its own query and canonical hash.
 *
 * Usage: node tools/pipeline/import-gaia-neighbours.js --write [--pin]
 *   The cached sources (gitignored; fetched by tools/pipeline/fetch-gaia-neighbours.js --set bright|faint) are
 *   checked against their recorded canonical sha256; --pin adopts a new hash (printed).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const O = require(path.join(ROOT, 'packages/physics/src/sky/galactic-orbits.cjs'));

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
if (!WRITE) { console.error('Usage: node tools/pipeline/import-gaia-neighbours.js --write [--pin]'); process.exit(1); }

const CACHE = path.join(ROOT, 'data', '.cache', 'stars', 'gaia-neighbours.csv');
const CACHE_FAINT = path.join(ROOT, 'data', '.cache', 'stars', 'gaia-neighbours-faint.csv');
const OUT_BIN = path.join(ROOT, 'public', 'input', 'stars-gaia.bin');
const OUT_JSON = path.join(ROOT, 'public', 'input', 'stars-gaia.json');
const HIP_CATALOGUE = path.join(ROOT, 'public', 'input', 'stars.json');

const EPOCH_YEAR = 2016.0;              // Gaia DR3's reference epoch (J2016.0, ICRS)
const V_LIMIT = 8.0, V_MARGIN = 0.05;   // the catalogue's V cut, with the sampling's margin (0.5 Myr between samples)
const SAMPLE_YEARS = 5e5;
const WINDOW_YEARS = O.LOCAL_GALACTIC_KINEMATICS.catalogueRegimeYears;
const COLOUR_FIT_RANGE = [-0.6, 3.5];   // BP−RP range the relations are fitted and applied on (clamped beyond)
const COLUMNS = ['raDeg', 'decDeg', 'distPc', 'pmRaMasYr', 'pmDecMasYr', 'rvKmS', 'vmag', 'bv'];

const SOURCE = {
  title: 'Gaia DR3 (Gaia Collaboration 2023, A&A 674, A1): gaia_source within 1.5 kpc with radial velocities, brighter than M_G 2, joined to hipparcos2_best_neighbour — ESA, hosted by the Gaia archive',
  licence: 'CC BY-SA 3.0 IGO (ESA/Gaia/DPAC) — attribution required',
  url: 'https://gea.esac.esa.int/tap-server/tap/sync',
  query: 'SELECT g.source_id, g.ra, g.dec, g.parallax, g.parallax_error, g.pmra, g.pmdec, g.radial_velocity, g.radial_velocity_error, g.phot_g_mean_mag, g.bp_rp, x.original_ext_source_id AS hip FROM gaiadr3.gaia_source AS g LEFT OUTER JOIN gaiadr3.hipparcos2_best_neighbour AS x ON x.source_id = g.source_id WHERE g.random_index BETWEEN <lo> AND <hi> AND g.parallax > 0.667 AND g.parallax_over_error > 5 AND g.radial_velocity IS NOT NULL AND g.pmra IS NOT NULL AND g.parallax < POWER(10, (12 - g.phot_g_mean_mag)/5)   — 64 chunks of random_index covering 0..1811709770, concatenated (tools/pipeline/fetch-gaia-neighbours.js --set bright)',
  sha256: 'd5174950e7fd081552317e603c3a0aef8d8c7ee8d970ba36d94b11aadc1e2a1d',
};
const SOURCE_FAINT = {
  title: 'Gaia DR3 (the same release): gaia_source within 1.5 kpc with radial velocities, M_G 2 to 5, pre-filtered by the straight line\'s closest approach (≤ 2 r(M) within ±30 Myr, or within 2 r(M) today; r(M) the V-8 distance with a 1-mag colour margin), joined to hipparcos2_best_neighbour — the faint background, complete to about ±20 Myr',
  licence: 'CC BY-SA 3.0 IGO (ESA/Gaia/DPAC) — attribution required',
  url: 'https://gea.esac.esa.int/tap-server/tap/sync',
  query: 'tools/pipeline/fetch-gaia-neighbours.js --set faint (the WHERE clause is the script\'s SETS.faint.where; chunks on random_index, each verified against the archive\'s COUNT)',
  sha256: '0000000000000000000000000000000000000000000000000000000000000000',
};

const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');
/** The canonical hash: the data lines (no '#' comments, no blank lines), sorted. @param {string} text */
const canonicalSha256 = (text) => crypto.createHash('sha256').update(text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).sort().join('\n')).digest('hex');

/** Least squares cubic through (x, y), by normal equations. @param {number[]} xs @param {number[]} ys */
function polyfit3(xs, ys) {
  const n = 4; const A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
  for (let i = 0; i < xs.length; i++) { const p = [1, xs[i], xs[i] ** 2, xs[i] ** 3]; for (let j = 0; j < n; j++) { b[j] += p[j] * ys[i]; for (let k = 0; k < n; k++) A[j][k] += p[j] * p[k]; } }
  for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  const c = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * c[j]; c[i] = s / A[i][i]; }
  return c;
}
const evalPoly = (/** @type {number[]} */ c, /** @type {number} */ x) => c[0] + x * (c[1] + x * (c[2] + x * c[3]));
/** A cubic fitted with three passes of 3σ clipping; returns the coefficients, the rms and the count. @param {Array<[number, number]>} pts */
function fitClipped(pts) {
  let sel = pts, c = [0, 0, 0, 0], sd = 0;
  for (let pass = 0; pass < 3; pass++) {
    c = polyfit3(sel.map((p) => p[0]), sel.map((p) => p[1]));
    const res = sel.map((p) => p[1] - evalPoly(c, p[0])); sd = Math.sqrt(res.reduce((s, v) => s + v * v, 0) / res.length);
    sel = sel.filter((p, i) => Math.abs(res[i]) < 3 * sd);
  }
  return { coefficients: c.map((v) => Math.round(v * 1e6) / 1e6), rms: Math.round(sd * 1e4) / 1e4, n: sel.length };
}

function main() {
  if (!fs.existsSync(CACHE)) throw new Error(`${rel(CACHE)} is absent — fetch it first: node tools/pipeline/fetch-gaia-neighbours.js --set bright`);
  const text = fs.readFileSync(CACHE, 'utf8');
  const sha = canonicalSha256(text);
  const first = /^0+$/.test(SOURCE.sha256) || argv.includes('--pin');
  if (!first && sha !== SOURCE.sha256) throw new Error(`${rel(CACHE)}: canonical sha256 ${sha} ≠ the recorded ${SOURCE.sha256} — the source changed; re-measure before importing (or --pin to adopt)`);
  // the faint superset beside the bright one (absent: the bright alone, said in the manifest)
  const haveFaint = fs.existsSync(CACHE_FAINT);
  const textFaint = haveFaint ? fs.readFileSync(CACHE_FAINT, 'utf8') : '';
  const shaFaint = haveFaint ? canonicalSha256(textFaint) : null;
  if (haveFaint && !(/^0+$/.test(SOURCE_FAINT.sha256) || argv.includes('--pin')) && shaFaint !== SOURCE_FAINT.sha256) throw new Error(`${rel(CACHE_FAINT)}: canonical sha256 ${shaFaint} ≠ the recorded ${SOURCE_FAINT.sha256} — the source changed; re-measure before importing (or --pin to adopt)`);
  if (!haveFaint) console.log(`${rel(CACHE_FAINT)} is absent — the bright superset alone (fetch it: node tools/pipeline/fetch-gaia-neighbours.js --set faint)`);

  // the Hipparcos catalogue: its HIP set (skipped here) and its V, B−V for the colour relations
  const hipDoc = JSON.parse(fs.readFileSync(HIP_CATALOGUE, 'utf8'));
  const hci = Object.fromEntries(hipDoc.columns.map((c, i) => [c, i]));
  const hipRows = new Map(hipDoc.stars.map((r) => [r[hci.hip], r]));

  const lines = text.split('\n');
  const header = lines[0].split(',');
  const gi = Object.fromEntries(header.map((c, i) => [c, i]));
  for (const c of ['source_id', 'ra', 'dec', 'parallax', 'parallax_error', 'pmra', 'pmdec', 'radial_velocity', 'phot_g_mean_mag', 'bp_rp', 'hip']) if (!(c in gi)) throw new Error(`${rel(CACHE)}: column ${c} missing`);
  const nBright = lines.filter((l, i) => i > 0 && l).length;
  const faintStart = lines.length;   // the faint rows follow the bright ones in `lines`
  let nFaint = 0;
  if (haveFaint) {
    const fl = textFaint.split('\n');
    if (fl[0] !== lines[0]) throw new Error(`${rel(CACHE_FAINT)}: its columns differ from the bright superset's`);
    for (let i = 1; i < fl.length; i++) if (fl[i]) { lines.push(fl[i]); nFaint++; }
  }

  // pass 1: the colour relations on the matched rows
  const vg = [], bv = [];
  let nSuperset = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i]; if (!l) continue; nSuperset++;
    const c = l.split(','); const hip = Number(c[gi.hip]); if (!hip) continue;
    const r = hipRows.get(hip); if (!r || r[hci.bv] === null) continue;
    const bprp = Number(c[gi.bp_rp]), G = Number(c[gi.phot_g_mean_mag]);
    if (!Number.isFinite(bprp) || bprp < COLOUR_FIT_RANGE[0] || bprp > COLOUR_FIT_RANGE[1]) continue;
    vg.push([bprp, r[hci.vmag] - G]); bv.push([bprp, r[hci.bv]]);
  }
  const relVG = fitClipped(vg), relBV = fitClipped(bv);
  console.log(`superset ${nSuperset} rows; colour relations on ${vg.length} Hipparcos-matched rows: V − G rms ${relVG.rms} (n ${relVG.n}), B−V rms ${relBV.rms} (n ${relBV.n})`);

  // pass 2: the orbits — INTEGRATED (the potential's exact evaluator, the same the scene draws by), sampled every
  // 0.5 Myr out to ±50 Myr from the Gaia epoch; the Sun on the same schedule. The closed form's amplitude is
  // recorded as a diagnostic only: a first build selected by the closed form with its 15 % amplitude cut and lost
  // a third of the superset — the fast stars, the ones that arrive from farthest.
  const nHalf = Math.round(WINDOW_YEARS / SAMPLE_YEARS);
  const sunState = O.galactocentricState(null, EPOCH_YEAR);
  /** The sampled positions of a state: index 0..nHalf−1 the past (−0.5, −1, … Myr), nHalf..2nHalf−1 the future. @param {number[]} s0 */
  const sampleOrbit = (s0) => {
    const out = new Array(2 * nHalf);
    let s = s0; for (let i = 0; i < nHalf; i++) { s = O.integrateOrbitRK4(s, -SAMPLE_YEARS, 1); out[i] = s; }
    s = s0; for (let i = 0; i < nHalf; i++) { s = O.integrateOrbitRK4(s, SAMPLE_YEARS, 1); out[nHalf + i] = s; }
    return out;
  };
  const sunPath = sampleOrbit(sunState);
  const kept = [];
  let nInHip = 0, nBeyondAmplitude = 0, nNoColour = 0, nVisibleToday = 0, nNakedEyeEver = 0, nKeptFaint = 0;
  const clampC = (/** @type {number} */ x) => Math.max(COLOUR_FIT_RANGE[0], Math.min(COLOUR_FIT_RANGE[1], x));
  const t0 = Date.now();
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i]; if (!l) continue;
    const c = l.split(',');
    const hip = Number(c[gi.hip]);
    if (hip && hipRows.has(hip)) { nInHip++; continue; }
    const plx = Number(c[gi.parallax]), G = Number(c[gi.phot_g_mean_mag]), bprp = Number(c[gi.bp_rp]);
    if (!Number.isFinite(bprp)) { nNoColour++; continue; }
    const d = 1000 / plx;
    const vmag = G + evalPoly(relVG.coefficients, clampC(bprp));
    const bvv = evalPoly(relBV.coefficients, clampC(bprp));
    const absMag = vmag - 5 * Math.log10(d / 10);
    const a = { raDeg: Number(c[gi.ra]), decDeg: Number(c[gi.dec]), distPc: d, pmRaMasYr: Number(c[gi.pmra]), pmDecMasYr: Number(c[gi.pmdec]), rvKmS: Number(c[gi.radial_velocity]) };
    const h = O.heliocentricGalacticState(a);
    const el = O.orbitElements(h, EPOCH_YEAR);
    if (el.amplitudeFraction > O.RADIAL_AMPLITUDE_MAX) nBeyondAmplitude++;   // counted, kept: the integrator has no such limit
    const path = sampleOrbit(O.galactocentricState(h, EPOCH_YEAR));
    let minV = Infinity;
    for (let s = 0; s < 2 * nHalf; s++) {
      const p = path[s], q = sunPath[s];
      const dd = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const V = absMag + 5 * Math.log10(dd / 10);
      if (V < minV) minV = V;
    }
    if (vmag < minV) minV = vmag;   // the epoch itself
    if (minV > V_LIMIT + V_MARGIN) continue;
    if (vmag <= V_LIMIT) nVisibleToday++;
    if (minV <= 6.5) nNakedEyeEver++;
    if (i >= faintStart) nKeptFaint++;
    kept.push([a.raDeg, a.decDeg, d, a.pmRaMasYr, a.pmDecMasYr, a.rvKmS, vmag, bvv]);
    if (kept.length % 50000 === 0) console.log(`  … ${i} rows read, ${kept.length} kept (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  console.log(`kept ${kept.length} of ${nSuperset} (${nBright} bright + ${nFaint} faint rows; ${nKeptFaint} faint kept): ${nInHip} carried by the Hipparcos catalogue, ${nNoColour} without BP−RP (${nBeyondAmplitude} beyond the closed form's radial amplitude, kept — the integrator draws them); ${nVisibleToday} visible today (V ≤ ${V_LIMIT}), ${nNakedEyeEver} ever naked-eye (V ≤ 6.5); ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // write: Float32 columns, little-endian
  const n = kept.length;
  const buf = new Float32Array(COLUMNS.length * n);
  for (let k = 0; k < n; k++) for (let c = 0; c < COLUMNS.length; c++) buf[c * n + k] = kept[k][c];
  const bytes = Buffer.from(buf.buffer);
  fs.writeFileSync(OUT_BIN, bytes);
  const binSha = crypto.createHash('sha256').update(bytes).digest('hex');
  const doc = {
    _meta: {
      _comment: 'The stars that ARRIVE — GENERATED by tools/pipeline/import-gaia-neighbours.js --write (plan 28 §D). The Gaia DR3 six-dimensional stars within 1.5 kpc that ever reach V 8 within ±50 Myr on their Galactic orbits (ONE home packages/physics/src/sky/galactic-orbits.cjs), the stars of the Hipparcos catalogue (stars.json) excluded: the BRIGHT superset (M_G < 2, every star within 1.5 kpc) and, where `sourceFaint` is recorded, the FAINT one (M_G 2–5, pre-filtered server-side by the straight line\'s closest approach — complete to about ±20 Myr, thinning beyond; tools/pipeline/fetch-gaia-neighbours.js). The data are in stars-gaia.bin: Float32 little-endian COLUMN-MAJOR arrays, `columns` in order, `n` rows each — the astrometry at the Gaia epoch J2016.0, NOT propagated: the scene moves each star on its orbit. V and B−V are from G and BP−RP through the cubic polynomials in `colourRelations`, fitted here on the Hipparcos-matched rows. Gate: tools/verify/star-catalogue.js.',
      generated_by: 'tools/pipeline/import-gaia-neighbours.js --write',
      version: 1,
      epochYear: EPOCH_YEAR,
      frame: 'ICRS (J2000 axes) at epoch J2016.0',
      columns: COLUMNS,
      units: { raDeg: 'degrees', decDeg: 'degrees', distPc: 'parsecs (1000 / parallax; parallax/error > 5)', pmRaMasYr: 'milliarcseconds per Julian year, μα cos δ', pmDecMasYr: 'milliarcseconds per Julian year', rvKmS: 'km/s (positive receding)', vmag: 'Johnson V (from G and BP−RP)', bv: 'Johnson B−V (from BP−RP)' },
      n,
      binary: { file: 'public/input/stars-gaia.bin', sha256: binSha, bytes: bytes.length, layout: 'Float32 little-endian, column-major' },
      cuts: { vLimit: V_LIMIT, vMargin: V_MARGIN, windowYears: WINDOW_YEARS, sampleYears: SAMPLE_YEARS, absMagGMax: 2.0, maxDistancePc: 1500, parallaxOverErrorMin: 5, colourFitRange: COLOUR_FIT_RANGE,
        faint: haveFaint ? { absMagGRange: [2.0, 5.0], lineFilter: 'the straight line\'s closest approach ≤ 2 r(M) within |t_ca| ≤ 30 Myr, or d ≤ 2 r(M); r(M) = 10 pc × 10^((9 − M_G)/5)', completeToYears: 2e7 } : null },
      counts: { superset: nSuperset, supersetBright: nBright, supersetFaint: nFaint, carriedByHipparcosCatalogue: nInHip, beyondClosedFormAmplitude: nBeyondAmplitude, withoutColour: nNoColour, kept: n, keptFaint: nKeptFaint, visibleToday: nVisibleToday, nakedEyeEver: nNakedEyeEver },
      colourRelations: { vMinusG: relVG, bv: relBV, form: 'c0 + c1·x + c2·x² + c3·x³, x = BP−RP clamped to colourFitRange; fitted on the Gaia rows matching a star of stars.json (V, B−V from the Hipparcos Catalogue), three passes of 3σ clipping' },
      orbitModel: 'packages/physics/src/sky/galactic-orbits.cjs — the potential\'s exact evaluator (RK4, 0.5-Myr steps, the Sun on the same schedule); the closed form\'s amplitude counted as a diagnostic',
      source: { ...SOURCE, sha256: undefined, file: 'data/.cache/stars/gaia-neighbours.csv', sha256Canonical: sha, bytes: Buffer.byteLength(text) },
      sourceFaint: haveFaint ? { ...SOURCE_FAINT, sha256: undefined, file: 'data/.cache/stars/gaia-neighbours-faint.csv', sha256Canonical: shaFaint, bytes: Buffer.byteLength(textFaint) } : null,
    },
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(doc, null, 1) + '\n');
  console.log(`wrote ${rel(OUT_BIN)} (${bytes.length} bytes, sha256 ${binSha.slice(0, 12)}…), ${rel(OUT_JSON)}`);
  if (SOURCE.sha256 !== sha) console.log(`  pin (bright): sha256 '${sha}'`);
  if (haveFaint && SOURCE_FAINT.sha256 !== shaFaint) console.log(`  pin (faint): sha256 '${shaFaint}'`);
}

try { main(); } catch (e) { console.error(e.message || e); process.exit(1); }
