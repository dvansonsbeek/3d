// THE DELTA-T-FREE MATCHER (reconstructed keeper — the constraint-cascade
// instrument that uniquely validated the ancient identifications).
//
// For each totality-claim record, with deltaT COMPLETELY FREE and the
// chronology loosened ±200 yr: every total/hybrid candidate's umbra
// ground track (computed ONCE under the model deltaT) is slid on the
// longitude dial (deltaT ↔ pure longitude shift at the GMST rate), and
// every dial-window bringing the track over the site yields a
// REQUIRED-deltaT. The cascade then applies, in order: latitude
// reachability → lunar-corpus consistency (|z| ≤ 2 at the candidate's
// own epoch — the identification-robust axis) → the record's own
// calendar month → the record's own time of day (computed under each
// candidate's OWN required deltaT — self-consistent).
//
// FIRST-RUN RESULTS (recorded in the plan): Babylon −135 → exactly ONE
// survivor, the traditional date (reqΔT 10,787, z −0.5, local 9.3 h =
// the diary's morning; the Skoda-class −302 alternative dies on time of
// day). Bur-Sagale −762 → traditional dominant (z 0.9, latMiss 1 km).
// Lu −708 → traditional among best; needs the Annals' sexagenary day
// (chronology-free 1-in-60) to be unique. Thales −584 → traditional
// TOP-RANKED (z 0.1; local 16.4 h matches the battle-toward-dusk
// narrative) among 15 (no month/hour recorded — honest ambiguity).
// Henry 1133 → fails as a totality claim BECAUSE it never was one
// (totality was in Scotland; England saw a deep crescent) — reclassify
// to magnitude-type. SOLVER LESSON: curved tracks pass a site's
// latitude on MULTIPLE segments — enumerate all dial-windows, never
// only the global minimum (the single-window version made Thales look
// impossible at z 9.5).
//
// NOTE (the ṅ campaign): required-deltaT values shift by ½Δṅ·T² when
// the lunar secular is aligned to Driver 1 — re-run after that campaign
// and compare against the pre-registered expectations.
//
//   node tools/explore/u2-dt-free-matcher.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const model = createModel(DEFAULT_CONSTANTS);
const steph = JSON.parse(readFileSync(join(ROOT, 'public/input/lunar-eclipses-stephenson-2016.json'), 'utf8'));
const D2R = Math.PI / 180;
const OMEGA = 360.98564736629 / 86400;      // deg of rotation per second
const R_E_KM = DEFAULT_CONSTANTS.bodyDiametersKm.earth / 2;

const RECORDS = [
  { name: 'Babylon -135 (diary: total, stars; late Addaru = spring; morning)',
    lat: 32.54, lon: 44.42, year: -135, months: [3, 5], hours: [5.5, 12.5], trad: '-135-04-15' },
  { name: 'Bur-Sagale -762 (Eponym Canon: eclipse in Sivan = May/Jun; Nineveh)',
    lat: 36.36, lon: 43.16, year: -762, months: [5, 6], hours: null, trad: '-762-06-15' },
  { name: 'Lu -708 (Annals: month 7, day 1, "total"; Qufu)',
    lat: 35.60, lon: 117.0, year: -708, months: [6, 8], hours: null, trad: '-708-07-17' },
  { name: 'Thales -584 (Herodotus: day became night; NO month/hour recorded)',
    lat: 39.0, lon: 35.0, year: -584, months: null, hours: null, trad: '-584-05-28' },
];

const dtModelAbs = (jd) => DEFAULT_CONSTANTS.earthOrbital.deltaTStart + model.eclipse.deltaTSecondsAtJD(jd);
function jdToDate(jd) {
  const J = jd + 0.5, Z = Math.floor(J), F = J - Z;
  const B = Z + 1524, C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const dayFull = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  return { s: `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(dayFull)).padStart(2, '0')}`, month };
}
const gcKm = (la1, lo1, la2, lo2) => {
  const f1 = la1 * D2R, f2 = la2 * D2R, df = (la2 - la1) * D2R, dl = (lo2 - lo1) * D2R;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R_E_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
function lunarBand(year, half = 80) {
  const sel = steph.entries.filter((e) => e.dt_observed_sec != null
    && /^S0[124579]$/.test(e.source_table) && Math.abs(e.year - year) <= half);
  if (sel.length < 3) return null;
  const m = sel.reduce((s, e) => s + e.dt_observed_sec, 0) / sel.length;
  const sd = Math.sqrt(sel.reduce((s, e) => s + (e.dt_observed_sec - m) ** 2, 0) / (sel.length - 1));
  return { n: sel.length, mean: m, sd };
}

for (const R of RECORDS) {
  const a = model.time.jdFromYear(R.year - 200);
  const b = model.time.jdFromYear(R.year + 200);
  const cands = [];
  for (let s = a; s < b; s += 3650) cands.push(...model.eclipse.findSolarInRange(s, Math.min(s + 3650, b)));
  const central = cands.filter((c) => c.type === 'Total' || c.type === 'Hybrid');
  const rows = [];
  for (const c of central) {
    const track = [];
    for (let dt = -2.5 / 24; dt <= 2.5 / 24; dt += 2 / 1440) {
      const u = model.eclipse.umbraGroundAtJD(c.jd + dt);
      if (u) track.push(u);
    }
    if (track.length < 5) continue;
    // ALL dial-windows (multi-segment tracks!)
    const pts = track.map((p) => {
      let dLon = R.lon - p.lonDeg;
      dLon = ((dLon + 540) % 360) - 180;
      return { delta: dLon / OMEGA, dKm: gcKm(R.lat, R.lon, p.latDeg, R.lon) };
    }).filter((p) => p.dKm <= 350).sort((x, y) => x.delta - y.delta);
    const windows = [];
    for (const p of pts) {
      const w = windows[windows.length - 1];
      if (w && p.delta - w.last < 900) { w.last = p.delta; if (p.dKm < w.dKm) { w.dKm = p.dKm; w.delta = p.delta; } }
      else windows.push({ delta: p.delta, last: p.delta, dKm: p.dKm });
    }
    const d = jdToDate(c.jd);
    const jdTT = c.jd + dtModelAbs(c.jd) / 86400;
    const band = lunarBand(Math.round(model.time.yearFromJD(c.jd)));
    for (const w of windows) {
      const required = dtModelAbs(c.jd) + w.delta;
      if (required < -2000 || required > 46000) continue;
      const z = band ? (required - band.mean) / band.sd : null;
      const utMax = jdTT - required / 86400;
      const localHour = (((utMax + 0.5) % 1) * 24 + R.lon / 15 + 24) % 24;
      rows.push({ date: d.s, month: d.month, required, dKm: w.dKm, z, localHour });
    }
  }
  const s2 = rows.filter((r) => r.z !== null && Math.abs(r.z) <= 2);
  const s3 = R.months ? s2.filter((r) => r.month >= R.months[0] && r.month <= R.months[1]) : s2;
  const s4 = R.hours ? s3.filter((r) => r.localHour >= R.hours[0] && r.localHour <= R.hours[1]) : s3;
  console.log(`\n${R.name}`);
  console.log(`  cascade: ${central.length} central → windows ${rows.length} → lunar-z≤2 ${s2.length} → month ${s3.length} → hour ${s4.length}`);
  s4.sort((x, y) => Math.abs(x.z) - Math.abs(y.z));
  for (const r of s4.slice(0, 8)) {
    const mark = r.date === R.trad ? '  ◄ TRADITIONAL' : '';
    console.log(`    ${r.date}  reqΔT ${r.required.toFixed(0).padStart(6)} s  z=${r.z.toFixed(1).padStart(5)}  latMiss ${r.dKm.toFixed(0).padStart(3)} km  localH ${r.localHour.toFixed(1)}${mark}`);
  }
}
