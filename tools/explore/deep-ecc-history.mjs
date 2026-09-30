#!/usr/bin/env node
// EARTH'S ECCENTRICITY THROUGH DEEP TIME — the SHIPPED value (createModel().earth.eccentricity,
// the engine's own N-body secular series) against the Laskar 2010 solution, with the
// ~405-kyr long-eccentricity beat the rock record carries marked on the model curve.
// ONE home for the website's figure 109_earth_deep_ecc.svg (npm run figures:nbody).
//
//   node tools/explore/deep-ecc-history.mjs [out=<svg path>] [from=-1000000] [to=200000]
//   ESSRT_SITE_DIR=<holisticuniverse checkout>  →  writes public/img/109_earth_deep_ecc.svg there
//
// Reference: public/input/la2010-orbital-elements.json (La2010a, −500 kyr..0, 1-kyr grid) —
// a secular solution, i.e. theory-vs-theory (doc 109's rule); the measured referee is the
// rock metronome, quoted on the page from the registry, never from this figure.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createModel } from '@essrt/physics';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const SITE = process.env.ESSRT_SITE_DIR;
const OUT = KV.out || (SITE ? SITE.replace(/\/$/, '') + '/public/img/109_earth_deep_ecc.svg' : ROOT + 'tools/explore/deep-ecc-history.local.svg');
const FROM = Number(KV.from || -1000000), TO = Number(KV.to || 200000), STEP = 500;

// The SHIPPED surface reads the banked series — createModel() WITHOUT the
// artifact is a different evaluator (the 18-term mode-table tail: measured
// RMS 3.62e-3 against La2010a where the series reads 2.5e-5; plan 06 R1's
// trap, which this figure carried until the series was passed here).
const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8')) });
const la = JSON.parse(readFileSync(ROOT + 'public/input/la2010-orbital-elements.json', 'utf8'));
const laRows = la.data.map((r) => [r.year, r.eccentricity]);   // year: 0 = J2000 epoch of the file (years before present)

// samples
const mdl = []; for (let y = FROM; y <= TO; y += STEP) mdl.push([y, model.earth.eccentricity(2000 + y)]);
// the ENVELOPE maxima (for the beat marks): the local maxima of the ~100-kyr
// peaks themselves — the ~405-kyr beat is the envelope, not the peaks
const peaks = []; for (let i = 1; i < mdl.length - 1; i++) if (mdl[i][1] > mdl[i - 1][1] && mdl[i][1] >= mdl[i + 1][1]) peaks.push(mdl[i]);
const ENV_HALF = 150000;   // an envelope maximum is the highest peak within ±150 kyr
const maxima = peaks.filter(([y, e]) => peaks.every(([y2, e2]) => Math.abs(y2 - y) > ENV_HALF || e2 <= e));
// agreement with La2010 over its span
let sum2 = 0, n = 0, maxAbs = 0;
for (const [y, e] of laRows) { if (y < FROM || y > TO) continue; const em = model.earth.eccentricity(2000 + y); const d = em - e; sum2 += d * d; n++; maxAbs = Math.max(maxAbs, Math.abs(d)); }
const rms = Math.sqrt(sum2 / n);

// ── the figure ────────────────────────────────────────────────────────────────
const W = 1150, H = 432, L = 64, R = 24, T = 78, B = 52;
const COL = { model: '#b3542e', la: '#2e6fb3', grid: '#ececec', text: '#222', dim: '#666', bg: '#ffffff', beat: '#666' };   // white ground (owner: no cream)
const eMax = 0.062;
const X = (y) => L + (y - FROM) / (TO - FROM) * (W - L - R), Y = (e) => T + (1 - e / eMax) * (H - T - B);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, system-ui, sans-serif">`;
svg += `<rect width="${W}" height="${H}" fill="${COL.bg}"/>`;
svg += `<text x="${W / 2}" y="24" text-anchor="middle" font-size="17" font-weight="700" fill="${COL.text}">Earth's eccentricity through deep time — the model's own dynamics against Laskar 2010</text>`;
svg += `<text x="${W / 2}" y="40" text-anchor="middle" font-size="11" fill="${COL.dim}">Rust: the shipped model (the engine's own N-body secular series). Blue: La2010a over its −500-kyr span — theory against theory: RMS ${(rms * 1e5).toFixed(1)}·10⁻⁵, max ${(maxAbs * 1e5).toFixed(1)}·10⁻⁵ over ${n} points.</text>`;
svg += `<text x="${W / 2}" y="54" text-anchor="middle" font-size="11" fill="${COL.dim}">Ticks: the envelope maxima of the model curve and their spacing (which ~100-kyr peak tops the envelope sets it here; the long-eccentricity beat itself is measured in the ±10-Myr table).</text>`;
// grid + axes
for (let e = 0; e <= eMax + 1e-9; e += 0.01) { svg += `<line x1="${L}" y1="${Y(e).toFixed(1)}" x2="${W - R}" y2="${Y(e).toFixed(1)}" stroke="${COL.grid}" stroke-width="1"/><text x="${L - 6}" y="${(Y(e) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="${COL.dim}">${e.toFixed(2)}</text>`; }
for (let y = Math.ceil(FROM / 100000) * 100000; y <= TO; y += 100000) { svg += `<line x1="${X(y).toFixed(1)}" y1="${T}" x2="${X(y).toFixed(1)}" y2="${H - B}" stroke="${COL.grid}" stroke-width="1"/><text x="${X(y).toFixed(1)}" y="${H - B + 16}" text-anchor="middle" font-size="10" fill="${COL.dim}">${y === 0 ? 'J2000' : (y / 1000).toFixed(0)}</text>`; }
svg += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="${COL.dim}">kyr from J2000 (negative = past)</text>`;
svg += `<text transform="translate(16,${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="${COL.dim}">eccentricity e</text>`;
// La2010
let p = ''; laRows.filter(([y]) => y >= FROM && y <= TO).sort((a, b) => a[0] - b[0]).forEach(([y, e], i) => { p += (i ? 'L' : 'M') + X(y).toFixed(1) + ',' + Y(e).toFixed(1); });
svg += `<path d="${p}" fill="none" stroke="${COL.la}" stroke-width="2.2" opacity="0.85"/>`;
// model
p = ''; mdl.forEach(([y, e], i) => { p += (i ? 'L' : 'M') + X(y).toFixed(1) + ',' + Y(e).toFixed(1); });
svg += `<path d="${p}" fill="none" stroke="${COL.model}" stroke-width="1.6"/>`;
// beat ticks at the maxima, with the spacing written between successive ticks
for (let i = 0; i < maxima.length; i++) {
  const [y] = maxima[i];
  svg += `<line x1="${X(y).toFixed(1)}" y1="${T - 6}" x2="${X(y).toFixed(1)}" y2="${T + 6}" stroke="${COL.beat}" stroke-width="1.2"/>`;
  if (i > 0) { const [y0] = maxima[i - 1]; svg += `<text x="${((X(y0) + X(y)) / 2).toFixed(1)}" y="${T - 10}" text-anchor="middle" font-size="9.5" fill="${COL.beat}">${((y - y0) / 1000).toFixed(0)} kyr</text>`; }
}
// J2000 marker
svg += `<line x1="${X(0).toFixed(1)}" y1="${T}" x2="${X(0).toFixed(1)}" y2="${H - B}" stroke="${COL.dim}" stroke-width="1" stroke-dasharray="3,3"/>`;
svg += `<circle cx="${X(0).toFixed(1)}" cy="${Y(model.earth.eccentricity(2000)).toFixed(1)}" r="4" fill="${COL.model}"/>`;
// legend
svg += `<line x1="${W - R - 330}" y1="${T + 14}" x2="${W - R - 306}" y2="${T + 14}" stroke="${COL.model}" stroke-width="2"/><text x="${W - R - 300}" y="${T + 18}" font-size="11" fill="${COL.text}">model (shipped)</text>`;
svg += `<line x1="${W - R - 190}" y1="${T + 14}" x2="${W - R - 166}" y2="${T + 14}" stroke="${COL.la}" stroke-width="2.2"/><text x="${W - R - 160}" y="${T + 18}" font-size="11" fill="${COL.text}">La2010a (−500 kyr..0)</text>`;
svg += `<text x="${W - 12}" y="${H - 6}" text-anchor="end" font-size="9" fill="${COL.dim}">ESSRT · holisticuniverse.com — createModel().earth.eccentricity vs public/input/la2010-orbital-elements.json</text>`;
svg += '</svg>';
if (SITE && !existsSync(SITE)) { console.error(`ESSRT_SITE_DIR not found: ${SITE}`); process.exit(1); }
writeFileSync(OUT, svg);
console.log(`maxima (kyr): ${maxima.map(([y]) => (y / 1000).toFixed(0)).join(', ')} · spacings: ${maxima.slice(1).map(([y], i) => ((y - maxima[i][0]) / 1000).toFixed(0)).join(', ')} kyr`);
console.log(`vs La2010 over ${n} points: RMS ${(rms * 1e5).toFixed(2)}e-5 · max |Δ| ${(maxAbs * 1e5).toFixed(2)}e-5`);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(0)} kB)`);
