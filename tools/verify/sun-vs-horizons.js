#!/usr/bin/env node
/**
 * SUN AND CARDINAL INSTANTS vs JPL HORIZONS — the observation-class reference
 * over ±3000 years (plan 06 I1; replaces Meeus ch. 27 as the era reference).
 *
 *   node tools/verify/sun-vs-horizons.js            reproduce + compare against the recorded artifact
 *   node tools/verify/sun-vs-horizons.js --write    (re)write data/sun-vs-horizons-summary.json
 *
 * REFERENCE. data/jpl-sun-ecliptic-longitude-tt.json: Horizons' APPARENT
 * geocentric ecliptic longitude of the Sun (aberration, nutation, light-time
 * included; QUANTITIES=31) on a 10-day grid, −3000..+3000, TIME SCALE TT
 * (TIME_TYPE=TT on every request — fetched by
 * tools/explore/fetch-jpl-sun-longitude-tt.mjs). Because the reference is TT,
 * the model is evaluated on its OWN TT clock: for each reference instant the
 * UT model-JD whose model-TT equals it is found (fixed point on the model's
 * ΔT) and the model's apparent Sun read there — no ΔT enters the comparison.
 *
 * TWO COMPARISONS.
 *   1. THE SUN — model apparent longitude (eclipse.sunApparentLonDegAtJD:
 *      the completed certified Sun − the derived aberration constant + the
 *      leading nutation terms on the model's own arguments) minus Horizons,
 *      arcsec, per century (mean, sd, n) and pooled; the modern registry
 *      window 1970–2049 is reported on THIS (TT) definition beside the
 *      registry instrument's (UT cache + bridge) figure — two definitions,
 *      both recorded, never mixed.
 *   2. THE CARDINAL INSTANTS — Horizons' own equinox/solstice instants
 *      (the crossings of its apparent longitude through 0/90/180/270,
 *      refined by a Newton step on the local cubic through the four
 *      bracketing grid points — ≈0.5 s on a 10-day grid) minus the model's
 *      (cardinal.jd, UT → TT on the model's ΔT), minutes, per century.
 *
 * Reproduction check: plain run recomputes and compares (1e-6″ / 1e-6 min).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { ROOT, buildInputsBlock } = require('../lib/artifact-inputs');

const OUT = path.join(ROOT, 'data', 'sun-vs-horizons-summary.json');
const CACHE = path.join(ROOT, 'data', 'jpl-sun-ecliptic-longitude-tt.json');
const WRITE = process.argv.includes('--write');
const INPUT_FILES = [
  'data/jpl-sun-ecliptic-longitude-tt.json',
  'data/nbody-secular-series.json',
  'tools/explore/fetch-jpl-sun-longitude-tt.mjs',
  'packages/physics/src/model.js',
  'packages/physics/src/eclipse/finders.cjs',
  'packages/physics/src/eclipse/sun-planetary-completion.cjs',
  'packages/physics/src/earth/year-lengths.cjs',
  'tools/verify/sun-vs-horizons.js',
];

const req = createRequire(path.join(ROOT, 'package.json'));
const { createModel } = req('@essrt/physics');
const series = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-secular-series.json'), 'utf8'));
const model = createModel(undefined, { secularSeriesArtifact: series });
const J2000 = 2451545.0, AS = 3600;
const wrap180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const dTs = (jd) => model.eclipse.deltaTSecondsAtJD(jd);
/** the UT model-JD whose model-TT equals jdTT (fixed point; ΔT varies slowly) */
const utForTT = (jdTT) => { let ut = jdTT - dTs(jdTT) / 86400; ut = jdTT - dTs(ut) / 86400; return jdTT - dTs(ut) / 86400; };
const modelApparentAtTT = (jdTT) => model.eclipse.sunApparentLonDegAtJD(utForTT(jdTT));

const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
const rows = cache.rows;   // [jdTT, lonDeg, latDeg]
const yearOf = (jd) => 2000 + (jd - J2000) / 365.25;

// ── 1. the Sun ──────────────────────────────────────────────────────────────
const stats = (a) => { const n = a.length; if (!n) return { n: 0, mean: null, sd: null }; const m = a.reduce((s, v) => s + v, 0) / n; return { n, mean: m, sd: Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / n) }; };
const byCentury = new Map();
const all = [], win = [];
for (const [jd, lonH] of rows) {
  const d = wrap180(modelApparentAtTT(jd) - lonH) * AS;
  all.push(d);
  const y = yearOf(jd);
  if (y >= 1970 && y < 2050) win.push(d);
  const c = Math.floor(y / 100) * 100;
  if (!byCentury.has(c)) byCentury.set(c, []);
  byCentury.get(c).push(d);
}
const sunPerCentury = [...byCentury.entries()].sort((a, b) => a[0] - b[0]).map(([c, a]) => ({ century: c, ...stats(a) }));
const sunAll = stats(all), sunWin = stats(win);
const perMillennium = [];
for (let m0 = -3000; m0 < 3000; m0 += 1000) { const a = []; for (const [c, v] of byCentury) if (c >= m0 && c < m0 + 1000) a.push(...v); perMillennium.push({ from: m0, to: m0 + 1000, ...stats(a) }); }

// ── 2. the cardinal instants ─────────────────────────────────────────────────
const TARGETS = { VE: 0, SS: 90, AE: 180, WS: 270 };
/** Horizons crossing of `target` inside the grid cell [i, i+1] (lon unwrapped
 *  locally), refined by Newton on the Lagrange cubic through points i−1..i+2. */
function horizonsCrossingJD(i, target) {
  const P = [rows[i - 1], rows[i], rows[i + 1], rows[i + 2]];
  const t0 = P[0][0];
  const x = P.map((p) => p[0] - t0);
  // unwrap around the cell's mean so the cubic sees a monotone longitude
  const base = P[1][1];
  const yv = P.map((p) => base + wrap180(p[1] - base));
  const tgt = base + wrap180(target - base);
  const L = (t) => { let s = 0; for (let j = 0; j < 4; j++) { let l = yv[j]; for (let k = 0; k < 4; k++) if (k !== j) l *= (t - x[k]) / (x[j] - x[k]); s += l; } return s; };
  const dL = (t, h = 1e-3) => (L(t + h) - L(t - h)) / (2 * h);
  // start: linear interpolation inside the cell
  let t = x[1] + (tgt - yv[1]) / (yv[2] - yv[1]) * (x[2] - x[1]);
  for (let k = 0; k < 8; k++) { const f = L(t) - tgt; t -= f / dL(t); if (Math.abs(f) < 1e-10) break; }
  return t0 + t;
}
const cardByCentury = new Map();
const cardAll = [];
for (let i = 1; i < rows.length - 2; i++) {
  const a = rows[i][1], b = rows[i + 1][1];
  for (const [type, target] of Object.entries(TARGETS)) {
    const da = wrap180(a - target), db = wrap180(b - target);
    if (!(da < 0 && db >= 0 && (db - da) < 40)) continue;            // ascending crossing inside the cell
    const jdH = horizonsCrossingJD(i, target);
    const yH = yearOf(jdH);
    // the model's instant for the calendar year of the Horizons instant
    const year = Math.round(yH - 0.5 + (target / 360));               // VE ≈ .22, SS ≈ .47, AE ≈ .72, WS ≈ .97 of the year
    const jdM_UT = model.cardinal.jd(year, type);
    const jdM_TT = jdM_UT + dTs(jdM_UT) / 86400;
    // guard: the model instant must be the same event (within 60 d), else the year label is off by one
    let dMin = (jdM_TT - jdH) * 1440;
    if (Math.abs(dMin) > 60 * 1440) { const alt = model.cardinal.jd(year + (dMin < 0 ? 1 : -1), type); dMin = (alt + dTs(alt) / 86400 - jdH) * 1440; }
    cardAll.push(dMin);
    const c = Math.floor(yH / 100) * 100;
    if (!cardByCentury.has(c)) cardByCentury.set(c, []);
    cardByCentury.get(c).push(dMin);
  }
}
const cardPerCentury = [...cardByCentury.entries()].sort((a, b) => a[0] - b[0]).map(([c, a]) => ({ century: c, ...stats(a) }));
const cardAllStats = stats(cardAll);
const cardPerMillennium = [];
for (let m0 = -3000; m0 < 3000; m0 += 1000) { const a = []; for (const [c, v] of cardByCentury) if (c >= m0 && c < m0 + 1000) a.push(...v); cardPerMillennium.push({ from: m0, to: m0 + 1000, ...stats(a) }); }

const r2 = (v) => (v === null ? null : Math.round(v * 1e6) / 1e6);
const doc = {
  _description: 'The model\'s apparent Sun and its cardinal instants against JPL Horizons over ±3000 yr — GENERATED by tools/verify/sun-vs-horizons.js --write. Reference: data/jpl-sun-ecliptic-longitude-tt.json (Horizons apparent geocentric ecliptic longitude, 10-day grid, TT). The model is evaluated on its own TT clock (UT model-JD found for each TT instant), so no ΔT enters. Sun: model apparent (completed certified Sun − derived aberration + leading nutation) minus Horizons, arcsec. Cardinal: Horizons\' own crossings (cubic-refined on the grid) minus the model\'s cardinal.jd (→ TT), minutes. The observation-class reference of plan 06 I1; both statistics are reported in both directions.',
  reference: { file: 'data/jpl-sun-ecliptic-longitude-tt.json', timeScale: 'TT', stepDays: cache.meta.stepDays, n: rows.length, yearFrom: cache.meta.yearFrom, yearTo: cache.meta.yearTo },
  sun: {
    unit: 'arcsec (model − Horizons)',
    all: { n: sunAll.n, mean: r2(sunAll.mean), sd: r2(sunAll.sd) },
    window1970to2049: { n: sunWin.n, mean: r2(sunWin.mean), sd: r2(sunWin.sd), note: 'TT-clock definition; the registry key frameworkSunVsJplRmsArcsec is the UT-cache + bridge instrument (fq7s-sun-registry-metric.mjs) — two definitions, both recorded' },
    perMillennium: perMillennium.map((m) => ({ ...m, mean: r2(m.mean), sd: r2(m.sd) })),
    perCentury: sunPerCentury.map((c) => ({ ...c, mean: r2(c.mean), sd: r2(c.sd) })),
  },
  cardinal: {
    unit: 'minutes (model − Horizons, TT)',
    all: { n: cardAllStats.n, mean: r2(cardAllStats.mean), sd: r2(cardAllStats.sd) },
    perMillennium: cardPerMillennium.map((m) => ({ ...m, mean: r2(m.mean), sd: r2(m.sd) })),
    perCentury: cardPerCentury.map((c) => ({ ...c, mean: r2(c.mean), sd: r2(c.sd) })),
  },
  inputs: buildInputsBlock('node tools/verify/sun-vs-horizons.js --write', INPUT_FILES),
};

console.log(`Sun vs Horizons (TT), ${sunAll.n} instants −3000..+3000: mean ${sunAll.mean.toFixed(2)}″ sd ${sunAll.sd.toFixed(2)}″; 1970–2049: mean ${sunWin.mean.toFixed(2)}″ sd ${sunWin.sd.toFixed(2)}″`);
for (const m of perMillennium) console.log(`  ${String(m.from).padStart(6)}..${String(m.to).padStart(5)}  Sun mean ${m.mean.toFixed(2).padStart(8)}″ sd ${m.sd.toFixed(2).padStart(6)}″`);
console.log(`Cardinal instants vs Horizons, ${cardAllStats.n} events: mean ${cardAllStats.mean.toFixed(2)} min sd ${cardAllStats.sd.toFixed(2)} min`);
for (const m of cardPerMillennium) console.log(`  ${String(m.from).padStart(6)}..${String(m.to).padStart(5)}  cardinal mean ${m.mean.toFixed(2).padStart(7)} min sd ${m.sd.toFixed(2).padStart(6)} min (n ${m.n})`);

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
  console.log(`✓ wrote ${path.relative(ROOT, OUT)}`);
} else {
  if (!fs.existsSync(OUT)) { console.error('FAIL — no recorded artifact. First run: node tools/verify/sun-vs-horizons.js --write'); process.exit(1); }
  const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const ok = Math.abs(prev.sun.all.sd - doc.sun.all.sd) < 1e-6 && Math.abs(prev.sun.all.mean - doc.sun.all.mean) < 1e-6
    && Math.abs(prev.cardinal.all.mean - doc.cardinal.all.mean) < 1e-6 && Math.abs(prev.cardinal.all.sd - doc.cardinal.all.sd) < 1e-6;
  console.log(`${ok ? 'REPRODUCED' : 'DIVERGED'}  recorded Sun sd ${prev.sun.all.sd}″ / cardinal mean ${prev.cardinal.all.mean} min vs computed ${doc.sun.all.sd}″ / ${doc.cardinal.all.mean} min`);
  if (!ok) { console.error('Investigate; if this is a conscious re-measurement, run with --write.'); process.exit(1); }
  console.log('PASS');
}
