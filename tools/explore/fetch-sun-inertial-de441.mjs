#!/usr/bin/env node
// JPL HORIZONS: GEOMETRIC geocentric Sun vectors in the FIXED J2000 ecliptic frame (ICRF),
// DE441, on a 30-day grid — an INERTIAL referee for the Sun's sidereal motion with NO
// precession theory on the reference side (Horizons' of-date longitude carries its own
// frame model, IAU76/80 + Owen beyond ±200 yr; this one does not).
//
//   node tools/explore/fetch-sun-inertial-de441.mjs [fromYear] [toYear]
//   → tools/explore/sun-inertial-de441.local.json (gitignored; ~1 min to refetch)
//
// Horizons: COMMAND=10, CENTER=500@399, EPHEM_TYPE=VECTORS, REF_PLANE=ECLIPTIC,
// REF_SYSTEM=ICRF, VEC_TABLE=1 (position), VEC_CORR=NONE (geometric), TDB time axis
// (TDB − TT < 2 ms). Consumers: sun-inertial-vs-de441.cjs, lamdot-nodes-vs-de441.cjs.
// Third-party data used, not redistributed (data/PROVENANCE.md discipline).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = Number(process.argv[2] || -9000), TO = Number(process.argv[3] || 9000);
const OUT = join(HERE, 'sun-inertial-de441.local.json');
const J2000 = 2451545.0, STEP_D = 30, CHUNK = 5000;
const jdOfYear = (y) => J2000 + (y - 2000) * 365.25;
async function chunk(jd0, jd1) {
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
    + `&COMMAND='10'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500@399'`
    + `&START_TIME='JD ${jd0}'&STOP_TIME='JD ${jd1}'&STEP_SIZE='${STEP_D} d'`
    + `&REF_PLANE='ECLIPTIC'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='AU-D'&CSV_FORMAT='YES'`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE');
      if (a < 0 || b < 0) throw new Error(`no ephemeris block: ${text.slice(0, 400)}`);
      const rows = [];
      for (const line of text.slice(a + 5, b).split('\n')) {
        const c = line.split(',').map((s) => s.trim());
        if (c.length < 5) continue;
        const jd = Number(c[0]), x = Number(c[2]), y = Number(c[3]), z = Number(c[4]);
        if (Number.isFinite(jd) && Number.isFinite(x)) rows.push([jd, x, y, z]);
      }
      return rows;
    } catch (e) { process.stderr.write(`  attempt ${attempt} failed: ${e.message}\n`); await new Promise((r) => setTimeout(r, 4000 * attempt)); }
  }
  throw new Error('Horizons fetch failed');
}
const rows = [];
for (let y = FROM; y < TO; y += CHUNK) {
  const y1 = Math.min(y + CHUNK, TO);
  process.stderr.write(`  fetching ${y}..${y1} … `);
  const r = await chunk(jdOfYear(y), jdOfYear(y1) - 1e-6);
  process.stderr.write(`${r.length} rows\n`);
  rows.push(...r);
}
rows.sort((p, q) => p[0] - q[0]);
writeFileSync(OUT, JSON.stringify({ meta: { source: 'JPL Horizons API (DE441)', ephemType: 'VECTORS', center: '500@399', refPlane: 'ECLIPTIC', refSystem: 'ICRF', vecCorr: 'NONE (geometric)', stepDays: STEP_D, timeScale: 'TDB', yearFrom: FROM, yearTo: TO }, columns: ['jdTDB', 'xAU', 'yAU', 'zAU'], rows }));
console.log(`wrote ${OUT}: ${rows.length} rows, ${FROM}..${TO}`);
