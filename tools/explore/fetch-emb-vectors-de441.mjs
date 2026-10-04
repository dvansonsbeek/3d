#!/usr/bin/env node
// JPL HORIZONS: DE441 heliocentric EMB state vectors (position + velocity), J2000 ecliptic (ICRF),
// 30-day grid, ±9000 yr — the reference for the osculating e-vector of the Earth–Moon barycentre
// (evector-vs-de441.cjs). The EMB (3) about the Sun (500@10), geometric, TDB axis.
//
//   node tools/explore/fetch-emb-vectors-de441.mjs [fromYear=-9000] [toYear=9000]
//   → tools/explore/emb-vectors-de441.local.json (gitignored; ~1 min to refetch)
//
// Third-party data used, not redistributed (data/PROVENANCE.md discipline).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = Number(process.argv[2] || -9000), TO = Number(process.argv[3] || 9000);
const OUT = join(HERE, 'emb-vectors-de441.local.json');
const J2000 = 2451545.0, STEP_D = 30, CHUNK = 5000;
const jdOfYear = (y) => J2000 + (y - 2000) * 365.25;
async function chunk(jd0, jd1) {
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?format=text'
    + `&COMMAND='3'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500@10'`
    + `&START_TIME='JD ${jd0}'&STOP_TIME='JD ${jd1}'&STEP_SIZE='${STEP_D} d'`
    + `&REF_PLANE='ECLIPTIC'&REF_SYSTEM='ICRF'&VEC_TABLE='2'&VEC_CORR='NONE'&OUT_UNITS='AU-D'&CSV_FORMAT='YES'`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text(); const a = text.indexOf('$$SOE'), b = text.indexOf('$$EOE');
      if (a < 0 || b < 0) throw new Error(`no ephemeris block: ${text.slice(0, 300)}`);
      const rows = [];
      for (const line of text.slice(a + 5, b).split('\n')) { const c = line.split(',').map((s) => s.trim()); if (c.length < 8) continue; const v = [c[0], c[2], c[3], c[4], c[5], c[6], c[7]].map(Number); if (v.every(Number.isFinite)) rows.push(v); }
      return rows;
    } catch (e) { process.stderr.write(`  attempt ${attempt} failed: ${e.message}\n`); await new Promise((r) => setTimeout(r, 4000 * attempt)); }
  }
  throw new Error('Horizons fetch failed');
}
const rows = [];
for (let y = FROM; y < TO; y += CHUNK) { const y1 = Math.min(y + CHUNK, TO); process.stderr.write(`  ${y}..${y1} … `); const r = await chunk(jdOfYear(y), jdOfYear(y1) - 1e-6); process.stderr.write(`${r.length}\n`); rows.push(...r); }
rows.sort((p, q) => p[0] - q[0]);
writeFileSync(OUT, JSON.stringify({ meta: { source: 'JPL Horizons DE441', target: '3 (EMB)', center: '500@10 (Sun)', frame: 'ecliptic J2000 ICRF', units: 'AU, AU/d, TDB', stepDays: STEP_D, yearFrom: FROM, yearTo: TO }, columns: ['jd', 'x', 'y', 'z', 'vx', 'vy', 'vz'], rows }));
console.log(`wrote ${OUT}: ${rows.length} rows`);
