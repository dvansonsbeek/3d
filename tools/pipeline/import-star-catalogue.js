#!/usr/bin/env node
/**
 * import-star-catalogue — the bright-star catalogue with its full astrometric solution (plan 28 §B).
 *
 * Replaces the 310-star Yale extract by Hipparcos-2 (van Leeuwen 2007, the new reduction — ESA; hosted
 * by ESA's Gaia archive as public.hipparcos_newreduction) to V ≤ 8.0: positions at the catalogue
 * epoch J1991.25 (ICRS), parallaxes and proper motions, with the original Hipparcos catalogue's V,
 * B−V, HD and spectral type (ESA 1997; public.hipparcos), radial velocities from Gaia DR3 (the
 * hipparcos2_best_neighbour cross-match; Gaia Collaboration 2023) where Gaia has one and from the
 * Pulkovo compilation (Gontcharov 2006, VizieR III/252) otherwise, the HR numbers and Bayer/Flamsteed
 * designations from the Yale Bright Star Catalogue (Hoffleit & Warren 1991, VizieR V/50; by HD), and
 * the proper names from the IAU Working Group on Star Names' catalogue (IAU-CSN; by HIP).
 *
 * Two tiers in ONE file: V ≤ 6.5 is the naked-eye sky (8,870 stars — the named and lined layer the
 * scene moves with their space velocities, plan 28 §C); 6.5 < V ≤ 8.0 the faint background that
 * replaces the former 100,000 random points (real stars at real places; Hipparcos is complete to
 * V ≈ 7.3 and partial beyond — said so in the scene). No position is propagated here: the scene
 * propagates from the catalogue epoch, so the file carries the sources' numbers and nothing derived
 * but the distance and its flag.
 *
 * The constellation strokes (public/input/constellations.json) are re-keyed to HIP ids: every vertex
 * of the former RA/Dec stroke list is matched to the nearest catalogue star within 1°, brightest first;
 * a vertex no star matches keeps its J2000 direction as a fixed point (counted, printed).
 *
 * Usage: node tools/pipeline/import-star-catalogue.js --write [--fetch]
 *   The sources are fetched to the gitignored data/.cache/stars/ when absent (or with --fetch) and
 *   checked against their recorded CANONICAL sha256 (the data rows, sorted, comment and date lines
 *   dropped — a TAP result's row order and a VizieR file's header date are not the data); a changed
 *   source refuses. Writes public/input/stars.json (v2, columnar) and public/input/constellations.json
 *   (v2, HIP strokes), both with a _meta block (the sources, their hashes, the counts, the licences).
 *   Gate: tools/verify/star-catalogue.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
if (!WRITE) { console.error('Usage: node tools/pipeline/import-star-catalogue.js --write [--fetch]'); process.exit(1); }

const CACHE = path.join(ROOT, 'data', '.cache', 'stars');
const OUT_STARS = path.join(ROOT, 'public', 'input', 'stars.json');
const OUT_CONST = path.join(ROOT, 'public', 'input', 'constellations.json');
const EPOCH_YEAR = 1991.25;            // Hipparcos catalogue epoch (J1991.25, ICRS)
const V_NAKED_EYE = 6.5, V_LIMIT = 8.0;
const RV_MAX_ERROR_KMS = 5;            // a Gaia RV with a larger error is left to Pulkovo (or none)
const PLX_RELATIVE_MAX = 0.2;          // σ/π above this → the distance prior's posterior mode with the measured π and σ, flagged
const EDSD_SCALE_LENGTH_PC = 1350;     // the exponentially decreasing space density prior's scale length (Astraatmadja & Bailer-Jones 2016)
const VERTEX_MATCH_DEG = 1.0;

const GAIA_TAP = 'https://gea.esac.esa.int/tap-server/tap/sync';
const VIZIER_TSV = 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv';   // the CfA mirror (the Strasbourg host is unreachable from the build machine)
const SOURCES = {
  hipparcos: {
    file: 'hip-astrometry.csv', kind: 'tap',
    query: 'SELECT n.hip, n.ra, n.dec, n.plx, n.pm_ra, n.pm_de, n.e_plx, n.e_pm_ra, n.e_pm_de, n.hp_mag, h.vmag, h.b_v, h.e_b_v, h.hd, h.sptype FROM public.hipparcos_newreduction AS n JOIN public.hipparcos AS h ON h.hip = n.hip WHERE h.vmag <= 8.0 OR n.hp_mag <= 8.2',
    sha256: '3d7eee5208672ad54ce177c1a352dc68fce5307431838505acbb3a752e136462',
    title: 'Hipparcos, the New Reduction (van Leeuwen 2007, A&A 474, 653) joined with the Hipparcos Catalogue (ESA 1997, SP-1200) — ESA, hosted by the Gaia archive (public.hipparcos_newreduction, public.hipparcos)',
    licence: 'ESA — free use with citation (the Hipparcos and Tycho Catalogues, ESA SP-1200; van Leeuwen 2007)',
    url: GAIA_TAP,
  },
  gaiaRv: {
    file: 'gaia-rv.csv', kind: 'tap',
    query: 'SELECT x.original_ext_source_id AS hip, g.radial_velocity, g.radial_velocity_error, g.phot_g_mean_mag FROM gaiadr3.hipparcos2_best_neighbour AS x JOIN gaiadr3.gaia_source AS g ON g.source_id = x.source_id WHERE g.radial_velocity IS NOT NULL',
    sha256: '6fb6d4ea43e597507511ae3b67cc20808bdd4fde1ef944cc837236620d5f9f90',
    title: 'Gaia DR3 radial velocities for Hipparcos stars (Gaia Collaboration 2023, A&A 674, A1; Katz et al. 2023; the hipparcos2_best_neighbour cross-match)',
    licence: 'CC BY-SA 3.0 IGO (ESA/Gaia/DPAC) — attribution required',
    url: GAIA_TAP,
  },
  pulkovo: {
    file: 'pulkovo-iii252.tsv', kind: 'vizier',
    query: '-source=III/252/table8&-out.max=unlimited&-out=HIP,RV,e_RV',
    sha256: '199ffd5f76330e0b57d57754651d27821a3ced98283821fa92aa74f15f93aa88',
    title: 'Pulkovo radial velocities for 35,495 Hipparcos stars (Gontcharov 2006, Astron. Lett. 32, 759; VizieR III/252)',
    licence: 'VizieR catalogue — free use with citation',
    url: VIZIER_TSV,
  },
  bsc: {
    file: 'bsc5-v50.tsv', kind: 'vizier',
    query: '-source=V/50/catalog&-out.max=unlimited&-out=HR,Name,HD,SAO,Vmag,B-V,SpType,RAJ2000,DEJ2000',
    sha256: 'd6976e57e5d6a616fdba25a2c8d47f930d0f777a1371afad63bb16b15b44f417',
    title: 'The Bright Star Catalogue, 5th revised ed. (Hoffleit & Warren 1991; VizieR V/50) — the HR numbers and the Bayer/Flamsteed designations',
    licence: 'public domain (Yale; VizieR)',
    url: VIZIER_TSV,
  },
  iauNames: {
    file: 'IAU-CSN.txt', kind: 'file',
    query: 'https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt',
    sha256: '5e491bdfd0c91ed36e96f81ef4e55a753d180d76049db9818090296b71019355',
    title: 'IAU Catalog of Star Names (IAU-CSN), the Working Group on Star Names (WGSN); the official list https://www.iau.org/public/themes/naming_stars/',
    licence: 'CC BY 4.0 (IAU)',
    url: 'https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt',
  },
};

const rel = (/** @type {string} */ p) => path.relative(ROOT, p).split(path.sep).join('/');
/** The canonical hash: the data lines (no '#' comments, no blank lines), sorted. @param {string} text */
const canonicalSha256 = (text) => crypto.createHash('sha256').update(text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).sort().join('\n')).digest('hex');

async function fetchSource(key) {
  const S = SOURCES[key];
  const file = path.join(CACHE, S.file);
  fs.mkdirSync(CACHE, { recursive: true });
  if (argv.includes('--fetch') || !fs.existsSync(file)) {
    console.log(`fetching ${key} …`);
    let res;
    if (S.kind === 'tap') {
      const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', MAXREC: '200000', QUERY: S.query });
      res = await fetch(S.url, { method: 'POST', body, headers: { 'User-Agent': 'essrt-import/1.0' } });
    } else if (S.kind === 'vizier') {
      res = await fetch(`${S.url}?${S.query}`, { headers: { 'User-Agent': 'essrt-import/1.0' } });
    } else {
      res = await fetch(S.query, { headers: { 'User-Agent': 'essrt-import/1.0' } });
    }
    if (!res.ok) throw new Error(`fetch ${key}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const text = fs.readFileSync(file, 'utf8');
  const h = canonicalSha256(text);
  const first = /^0+$|placeholder/.test(S.sha256) || S.sha256.length !== 64 || argv.includes('--pin');
  if (!first && h !== S.sha256) throw new Error(`${rel(file)}: canonical sha256 ${h} ≠ the recorded ${S.sha256} — the source changed; re-measure before importing (or --pin to adopt)`);
  return { text, sha256: h, bytes: fs.statSync(file).size };
}

/** VizieR asu-tsv: '#' comments, a header line, a units line, a dashes line, then tab-separated rows. */
function parseVizierTsv(text) {
  const lines = text.split('\n').filter((l) => l.length && !l.startsWith('#'));
  const header = lines[0].split('\t').map((s) => s.trim());
  const rows = [];
  for (const l of lines.slice(3)) {
    const cells = l.split('\t').map((s) => s.trim());
    if (cells.length < header.length) continue;
    rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i]])));
  }
  return rows;
}
function parseCsv(text) {
  const lines = text.split('\n').filter((l) => l.length);
  const header = lines[0].split(',');
  return lines.slice(1).map((l) => { const c = l.split(','); return Object.fromEntries(header.map((h, i) => [h, c[i] === undefined || c[i] === '' ? null : c[i]])); });
}
const num = (/** @type {string | null} */ s) => (s === null || s === undefined || s === '' ? null : Number(s));

/**
 * The distance where the parallax is poor (σ/π > 0.2) or non-positive: the MODE of the posterior under the
 * exponentially decreasing space density prior, P(r) ∝ r² e^{−r/L} · exp(−(ϖ − 1/r)² / 2σ²) (Bailer-Jones 2015,
 * PASP 127, 994, eq. 17–19; L = 1.35 kpc after Astraatmadja & Bailer-Jones 2016, ApJ 832, 137), with the star's
 * OWN measured parallax and error — never a photometric guess: the former main-sequence placement from V and
 * B−V put every distant giant (the orange two thirds of the flagged stars) within 10–50 pc of the Sun, a clump
 * the 3-D view showed at once. The mode is found on a log grid over 0.1 pc – 100 kpc and refined by golden
 * section; for a good parallax it is within (σ/π)² of 1/ϖ, which is why the good ones keep 1/ϖ itself.
 * @param {number} plxMas @param {number} ePlxMas
 */
function edsdDistanceModePc(plxMas, ePlxMas) {
  const w = plxMas / 1000, s = ePlxMas / 1000, L = EDSD_SCALE_LENGTH_PC;   // arcsec, arcsec, pc
  const lnP = (/** @type {number} */ r) => 2 * Math.log(r) - r / L - ((w - 1 / r) ** 2) / (2 * s * s);
  let bestR = 1, best = -Infinity;
  for (let k = 0; k <= 2000; k++) { const r = 10 ** (-1 + k * 6 / 2000); const p = lnP(r); if (p > best) { best = p; bestR = r; } }
  let a = bestR / 1.01, b = bestR * 1.01; const g = (Math.sqrt(5) - 1) / 2;
  for (let it = 0; it < 80; it++) { const c = b - g * (b - a), d = a + g * (b - a); if (lnP(c) > lnP(d)) b = d; else a = c; }
  return (a + b) / 2;
}

/** BSC 'Name' — "21Alp And", "Alp And", "33    Psc", "Kap TrA": the Flamsteed number, the Bayer abbreviation (with a superscript digit sometimes: "The1 Eri"), the constellation. */
function parseBscName(name) {
  const m = name.trim().match(/^(\d+)?\s*([A-Za-z]{2,3}\d?)?\s*([A-Z][A-Za-z]{2})$/);
  if (!m) return null;
  return { flamsteed: m[1] ? Number(m[1]) : null, bayer: m[2] || null, con: m[3] };
}

async function main() {
  const src = {};
  for (const k of Object.keys(SOURCES)) src[k] = await fetchSource(k);

  // ── Hipparcos ────────────────────────────────────────────────────────────────
  const hipRows = parseCsv(src.hipparcos.text);
  /** @type {Map<number, any>} */
  const stars = new Map();
  for (const r of hipRows) {
    const hip = Number(r.hip);
    const vmag = num(r.vmag) ?? num(r.hp_mag);
    if (vmag === null || vmag > V_LIMIT) continue;
    const ra = num(r.ra), dec = num(r.dec), plx = num(r.plx), pmra = num(r.pm_ra), pmde = num(r.pm_de), ePlx = num(r.e_plx);
    if (![ra, dec, plx, pmra, pmde].every(Number.isFinite)) continue;
    stars.set(hip, { hip, ra, dec, plx, ePlx, pmra, pmde, vmag, bv: num(r.b_v), hd: r.hd ? Number(r.hd) : null, sptype: r.sptype || null, rv: null, rvFlag: 0 });
  }
  // ── radial velocities: Gaia DR3 first (within the error bound), Pulkovo otherwise ─────────
  let nGaia = 0, nPulkovo = 0;
  for (const r of parseCsv(src.gaiaRv.text)) {
    const s = stars.get(Number(r.hip)); if (!s) continue;
    const rv = num(r.radial_velocity), err = num(r.radial_velocity_error);
    if (rv === null || !(err !== null && err <= RV_MAX_ERROR_KMS)) continue;
    s.rv = rv; s.rvFlag = 1; nGaia++;
  }
  for (const r of parseVizierTsv(src.pulkovo.text)) {
    const s = stars.get(Number(r.HIP)); if (!s || s.rv !== null) continue;
    const rv = num(r.RV); if (rv === null || !Number.isFinite(rv)) continue;
    s.rv = rv; s.rvFlag = 2; nPulkovo++;
  }
  // ── distances ───────────────────────────────────────────────────────────────
  let nPlx = 0, nPrior = 0, nDefault = 0;
  for (const s of stars.values()) {
    if (s.plx > 0 && s.ePlx !== null && s.ePlx / s.plx <= PLX_RELATIVE_MAX) { s.distPc = 1000 / s.plx; s.distFlag = 0; nPlx++; }
    else if (s.ePlx !== null && s.ePlx > 0) { s.distPc = edsdDistanceModePc(s.plx, s.ePlx); s.distFlag = 1; nPrior++; }
    else { s.distPc = 500; s.distFlag = 2; nDefault++; }
  }
  // ── designations: the BSC by HD; the IAU names by HIP ───────────────────────
  /** @type {Map<number, {hr: number, name: string}>} */
  const bscByHd = new Map();
  for (const r of parseVizierTsv(src.bsc.text)) { const hd = Number(r.HD); if (Number.isFinite(hd) && hd > 0) bscByHd.set(hd, { hr: Number(r.HR), name: r.Name }); }
  let nBsc = 0, nBayer = 0;
  for (const s of stars.values()) {
    const b = s.hd ? bscByHd.get(s.hd) : undefined;
    if (!b) continue;
    s.hr = b.hr; nBsc++;
    const d = parseBscName(b.name);
    if (d) { s.bayer = d.bayer; s.flamsteed = d.flamsteed; s.con = d.con; if (d.bayer || d.flamsteed) nBayer++; }
  }
  let nNamed = 0, nIau = 0;
  for (const line of src.iauNames.text.split('\n')) {
    if (!line.trim() || line.startsWith('#') || line.startsWith('$')) continue;
    nIau++;
    const name = line.slice(0, 18).trim();                       // column (1), ASCII — fixed-width safe
    const t = line.trim().split(/\s+/);
    let i = t.length - 1; while (i > 0 && !/^\d{4}-\d\d-\d\d$/.test(t[i])) i--;   // the Date column; notes may follow
    const hip = Number(t[i - 4]);
    if (!Number.isFinite(hip)) continue;
    const s = stars.get(hip); if (!s) continue;
    if (!s.name) { s.name = name; nNamed++; }
  }
  // ── the constellation strokes re-keyed to HIP ───────────────────────────────
  const oldConst = JSON.parse(fs.readFileSync(OUT_CONST, 'utf8'));
  const legacy = oldConst.rightAscension ? oldConst : (oldConst._legacy || null);
  if (!legacy) throw new Error('constellations.json: no RA/Dec vertex list to re-key (neither v1 nor a _legacy block)');
  const bright = [...stars.values()].filter((s) => s.vmag <= V_NAKED_EYE).sort((a, b) => a.vmag - b.vmag);
  const D2R = Math.PI / 180;
  const unitOf = (raRad, decRad) => [Math.cos(decRad) * Math.cos(raRad), Math.cos(decRad) * Math.sin(raRad), Math.sin(decRad)];
  const brightUnits = bright.map((s) => unitOf(s.ra * D2R, s.dec * D2R));
  const cosTol = Math.cos(VERTEX_MATCH_DEG * D2R);
  const matchVertex = (raRad, decRad) => {
    const u = unitOf(raRad, decRad);
    let best = -1, bestDot = cosTol;
    for (let i = 0; i < bright.length; i++) {
      const v = brightUnits[i]; const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      if (d > bestDot) { bestDot = d; best = i; }
    }
    return best;
  };
  /** @type {Array<Array<number | {raDeg: number, decDeg: number}>>} */
  const strokes = [];
  let stroke = [], nVertices = 0, nUnmatched = 0;
  for (const idx of legacy.asterismIndices) {
    if (idx === -1) { if (stroke.length > 1) strokes.push(stroke); stroke = []; continue; }
    const raRad = legacy.rightAscension[idx], decRad = legacy.declination[idx];
    if (!Number.isFinite(raRad) || !Number.isFinite(decRad)) continue;
    nVertices++;
    const i = matchVertex(raRad, decRad);
    if (i >= 0) stroke.push(bright[i].hip);
    else { nUnmatched++; stroke.push({ raDeg: Math.round(raRad / D2R * 1e4) / 1e4, decDeg: Math.round(decRad / D2R * 1e4) / 1e4 }); }
  }
  if (stroke.length > 1) strokes.push(stroke);

  // ── write ───────────────────────────────────────────────────────────────────
  const columns = ['hip', 'raDeg', 'decDeg', 'plxMas', 'pmRaMasYr', 'pmDecMasYr', 'rvKmS', 'vmag', 'bv', 'distPc', 'distFlag', 'rvFlag'];
  const r4 = (x) => Math.round(x * 1e4) / 1e4, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1e3) / 1e3;
  const sorted = [...stars.values()].sort((a, b) => a.hip - b.hip);
  const rows = sorted.map((s) => [s.hip, r4(s.ra), r4(s.dec), r2(s.plx), r2(s.pmra), r2(s.pmde), s.rv === null ? null : r2(s.rv), r2(s.vmag), s.bv === null ? null : r3(s.bv), r3(s.distPc), s.distFlag, s.rvFlag]);
  /** @type {Record<string, any>} */
  const names = {};
  for (const s of sorted) if (s.name || s.hr) names[s.hip] = { ...(s.name ? { name: s.name } : {}), ...(s.hr ? { hr: s.hr } : {}), ...(s.bayer ? { bayer: s.bayer } : {}), ...(s.flamsteed ? { flamsteed: s.flamsteed } : {}), ...(s.con ? { con: s.con } : {}) };
  const nNaked = sorted.filter((s) => s.vmag <= V_NAKED_EYE).length;
  const nakedWithRv = sorted.filter((s) => s.vmag <= V_NAKED_EYE && s.rv !== null).length;
  const bright45 = sorted.filter((s) => s.vmag <= 4.5), bright45Rv = bright45.filter((s) => s.rv !== null).length;
  const sourcesMeta = Object.fromEntries(Object.entries(SOURCES).map(([k, S]) => [k, { title: S.title, licence: S.licence, url: S.url, query: S.query, file: `data/.cache/stars/${S.file}`, sha256Canonical: src[k].sha256, bytes: src[k].bytes }]));
  const starsDoc = {
    _meta: {
      _comment: 'The bright-star catalogue — GENERATED by tools/pipeline/import-star-catalogue.js --write (plan 28 §B). Columnar: `columns` names the fields of every row of `stars`. Positions are ICRS at the catalogue epoch (J1991.25) — NOT propagated: the scene propagates each star from this epoch with its space velocity (plan 28 §C). distFlag: 0 the parallax (σ/π ≤ 0.2), 1 the posterior mode under the exponentially decreasing space density prior with the measured parallax and error (Bailer-Jones 2015; L = 1.35 kpc — the parallax is poor or non-positive, flagged), 2 no parallax error (500 pc). rvFlag: 0 no radial velocity (the transverse motion only), 1 Gaia DR3, 2 Pulkovo. Gate: tools/verify/star-catalogue.js.',
      generated_by: 'tools/pipeline/import-star-catalogue.js --write',
      version: 2,
      epochYear: EPOCH_YEAR,
      frame: 'ICRS (J2000 axes) at epoch J1991.25',
      units: { raDeg: 'degrees', decDeg: 'degrees', plxMas: 'milliarcseconds', pmRaMasYr: 'milliarcseconds per Julian year, μα cos δ', pmDecMasYr: 'milliarcseconds per Julian year', rvKmS: 'km/s (positive receding)', vmag: 'Johnson V', bv: 'Johnson B−V', distPc: 'parsecs' },
      cuts: { vLimit: V_LIMIT, nakedEyeV: V_NAKED_EYE, rvMaxErrorKmS: RV_MAX_ERROR_KMS, plxRelativeMax: PLX_RELATIVE_MAX, edsdScaleLengthPc: EDSD_SCALE_LENGTH_PC },
      counts: { stars: rows.length, nakedEye: nNaked, nakedEyeWithRv: nakedWithRv, brighterThan45: bright45.length, brighterThan45WithRv: bright45Rv, rvGaia: nGaia, rvPulkovo: nPulkovo, distParallax: nPlx, distPrior: nPrior, distDefault: nDefault, bsc: nBsc, bayerOrFlamsteed: nBayer, iauNamesInFile: nIau, named: nNamed },
      sources: sourcesMeta,
    },
    columns,
    stars: rows,
    names,
  };
  const constDoc = {
    _meta: {
      _comment: 'The constellation strokes keyed to HIP ids — GENERATED by tools/pipeline/import-star-catalogue.js --write (plan 28 §B): every vertex of the former J2000 RA/Dec stroke list matched to the nearest naked-eye catalogue star within 1° (brightest first); a vertex without a star keeps its fixed J2000 direction {raDeg, decDeg}. The scene draws each stroke through its stars\' CURRENT directions (plan 28 §C), so the lines follow the proper motions and dissolve with the shapes. The former vertex list is kept under _legacy for re-keying.',
      generated_by: 'tools/pipeline/import-star-catalogue.js --write',
      version: 2,
      counts: { strokes: strokes.length, vertices: nVertices, fixedVertices: nUnmatched },
      vertexMatchDeg: VERTEX_MATCH_DEG,
    },
    strokes,
    _legacy: { rightAscension: legacy.rightAscension, declination: legacy.declination, asterismIndices: legacy.asterismIndices },
  };
  fs.writeFileSync(OUT_STARS, JSON.stringify(starsDoc) + '\n');
  fs.writeFileSync(OUT_CONST, JSON.stringify(constDoc) + '\n');
  console.log(`stars: ${rows.length} to V ${V_LIMIT} (${nNaked} to V ${V_NAKED_EYE}, ${nakedWithRv} of them with a radial velocity; V ≤ 4.5: ${bright45Rv}/${bright45.length} with RV) · RV Gaia ${nGaia}, Pulkovo ${nPulkovo} · distance plx ${nPlx}, prior mode ${nPrior}, default ${nDefault} · BSC ${nBsc} (Bayer/Flamsteed ${nBayer}) · IAU names ${nNamed} of ${nIau}`);
  console.log(`constellations: ${strokes.length} strokes, ${nVertices} vertices, ${nUnmatched} without a star within ${VERTEX_MATCH_DEG}°`);
  console.log(`wrote ${rel(OUT_STARS)} (${fs.statSync(OUT_STARS).size} bytes), ${rel(OUT_CONST)} (${fs.statSync(OUT_CONST).size} bytes)`);
  for (const [k, S] of Object.entries(SOURCES)) if (S.sha256 !== src[k].sha256) console.log(`  pin ${k}: sha256 '${src[k].sha256}'`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
