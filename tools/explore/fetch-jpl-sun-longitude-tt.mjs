#!/usr/bin/env node
// Fetch the JPL Horizons apparent geocentric ecliptic longitude and latitude
// of the Sun, ±3000 years around J2000, on a regular 10-day grid, in TT —
// the observation-class reference for the Sun and the cardinal instants
// (plan 06 I1; replaces Meeus ch. 27 as the ancient-era reference).
//
// TIME SCALE — EXPLICIT. TIME_TYPE='TT' is passed on every request. (The
// older 1,600-epoch Sun cache was fetched with a JD TLIST and no TIME_TYPE,
// which Horizons defaults to UT — verified by re-query; that cache stays UT
// and its instrument bridges it; this one is TT so the model is evaluated on
// its own TT clock and no ΔT enters the comparison.)
//
// Horizons: COMMAND=10 (Sun), CENTER=500@399 (geocentre), EPHEM_TYPE=OBSERVER,
// QUANTITIES=31 (observer ecliptic lon/lat, apparent: aberration + nutation
// + light-time), CAL_FORMAT=JD, CSV. Ephemeris DE441 for the Sun over this
// span (Horizons' default long-span planetary ephemeris).
//
// The 10-day grid supports cubic interpolation of the longitude to ≈0.02″
// (the equation of centre's fourth derivative over a 10-day cell), i.e. the
// equinox and solstice instants to ≈0.5 s — the consumer generator does that.
//
// Output: data/jpl-sun-ecliptic-longitude-tt.json  { meta, rows: [[jdTT, lonDeg, latDeg], …] }
// Usage: node tools/explore/fetch-jpl-sun-longitude-tt.mjs [--from -3000] [--to 3000] [--step 10]
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'jpl-sun-ecliptic-longitude-tt.json');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FROM = arg('--from', -3000), TO = arg('--to', 3000), STEP_D = arg('--step', 10);
const J2000 = 2451545.0;
const jdOfYear = (y) => J2000 + (y - 2000) * 365.25;          // Julian-year grid anchors (TT)
const CHUNK_YEARS = 1500;                                       // ≈ 54,800 rows per request (< Horizons' 90,024 limit)

async function fetchChunk(jdStart, jdStop) {
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
    + `&COMMAND='10'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'`
    + `&START_TIME='JD ${jdStart}'&STOP_TIME='JD ${jdStop}'&STEP_SIZE='${STEP_D} d'`
    + `&QUANTITIES='31'&TIME_TYPE='TT'&CAL_FORMAT='JD'&CSV_FORMAT='YES'`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status} for JD ${jdStart}..${jdStop}`);
  const text = await res.text();
  const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE');
  if (a < 0 || b < 0) throw new Error(`Horizons: no ephemeris block for JD ${jdStart}..${jdStop}: ${text.slice(0, 300)}`);
  const rows = [];
  for (const line of text.slice(a + 5, b).split('\n')) {
    const c = line.split(',').map((s) => s.trim());
    if (c.length < 5 || !c[0]) continue;
    // CSV columns with CAL_FORMAT=JD: JD, (solar/lunar presence flags), ObsEcLon, ObsEcLat
    const jd = Number(c[0]), lon = Number(c[3]), lat = Number(c[4]);
    if (Number.isFinite(jd) && Number.isFinite(lon) && Number.isFinite(lat)) rows.push([jd, lon, lat]);
  }
  return rows;
}

const rows = [];
for (let y = FROM; y < TO; y += CHUNK_YEARS) {
  const y1 = Math.min(y + CHUNK_YEARS, TO);
  const jd0 = jdOfYear(y), jd1 = jdOfYear(y1) - 1e-6;        // half-open: the next chunk starts at jdOfYear(y1)
  process.stderr.write(`  fetching ${y}..${y1} (JD ${jd0.toFixed(1)}..${jd1.toFixed(1)}) … `);
  const r = await fetchChunk(jd0, jd1);
  process.stderr.write(`${r.length} rows\n`);
  rows.push(...r);
}
rows.sort((p, q) => p[0] - q[0]);
mkdirSync(join(ROOT, 'data'), { recursive: true });
const out = {
  _description: 'JPL Horizons apparent geocentric ecliptic longitude/latitude of the Sun (QUANTITIES=31: aberration, nutation, light-time included), geocentre 500@399, on a regular grid, TIME SCALE TT (TIME_TYPE=TT on every request). The observation-class reference for the model\'s Sun and its cardinal instants over ±3000 yr (plan 06 I1). Public domain (JPL/NASA). Regenerate: node tools/explore/fetch-jpl-sun-longitude-tt.mjs',
  meta: { source: 'JPL Horizons API', command: '10 (Sun)', center: '500@399', ephemType: 'OBSERVER', quantities: '31 (ObsEcLon, ObsEcLat; apparent)', timeType: 'TT', calFormat: 'JD', yearFrom: FROM, yearTo: TO, stepDays: STEP_D, n: rows.length, jdFirst: rows[0]?.[0], jdLast: rows[rows.length - 1]?.[0], fetchedWith: 'tools/explore/fetch-jpl-sun-longitude-tt.mjs' },
  columns: ['jdTT', 'apparentEclipticLongitudeDeg', 'apparentEclipticLatitudeDeg'],
  rows,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`✓ wrote ${OUT} — ${rows.length} rows, ${FROM}..${TO}, step ${STEP_D} d, TT`);
