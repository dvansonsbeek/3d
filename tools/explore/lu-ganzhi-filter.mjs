// THE LU GANZHI FILTER (plan §12i queue item 2 — the ancient-record
// review, final measured piece).
//
// The Chunqiu (Spring and Autumn Annals of Lu) records eclipse days by
// their sexagenary (ganzhi) day names — a continuous 60-day cycle
// independent of any year chronology. That makes it a CHRONOLOGY-FREE
// 1-in-60 identification filter: whatever the year mapping, the eclipse
// day must carry the recorded ganzhi name.
//
// JD↔ganzhi anchor — VERIFIED, not assumed: two independent Chunqiu
// eclipse records (Stephenson 1997 Ch. 8 identifications; day names to
// be re-verified against the printed source before publication)
//   · −719 Feb 22, day jisi   (sexagenary #6)
//   · −708 Jul 17, day renchen (#29), total, first day of the month
// both yield the SAME offset K = 50 in
//   ganzhi# = ((localDayNumber + 50) mod 60)   (1..60, #1 = jiazi)
// with localDayNumber = floor(jd_UT + lon/360 + 0.5) at Lu (the local
// civil midnight-start day). A wrong recollection of either record
// would break the agreement 59 times in 60.
//
// RESULT (shipped stack): scanning ±30 yr around −708 for eclipses with
// local magnitude ≥ 0.6 at Lu (Qufu 35.60 N, 116.98 E) gives 20
// candidates; the renchen filter keeps 3 (−708 total 1.019 · −703
// partial 0.869 · −687 partial 0.697); the record's totality ("ji",
// complete) keeps exactly ONE — the traditional −708 Jul 17, on which
// the framework independently computes totality at the site. The
// traditional identification is UNIQUE under a chronology-free filter.
//
//   node tools/explore/lu-ganzhi-filter.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';

const model = createModel(DEFAULT_CONSTANTS);
const LU = { lat: 35.60, lon: 116.98 };

function jdFromJulianCal(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d - 1524.5;
}
function jdToJulianDate(jd) {
  const J = jd + 0.5, Z = Math.floor(J), F = J - Z;
  const B = Z + 1524, C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const dayFull = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(dayFull)).padStart(2, '0')}`;
}
const dayNumber = (jd) => Math.floor(jd + LU.lon / 360 + 0.5);
const ganzhi = (jd) => (((dayNumber(jd) + 50) % 60 + 60) % 60) || 60;

// 1. Anchor verification — both records must give the same offset.
console.log('1. JD↔ganzhi anchor verification (offset K in ganzhi# = (dayN + K) mod 60):');
const REFS = [
  { name: '−719 Feb 22, jisi (#6)', jd0: jdFromJulianCal(-719, 2, 22), gz: 6 },
  { name: '−708 Jul 17, renchen (#29)', jd0: jdFromJulianCal(-708, 7, 17), gz: 29 },
];
for (const r of REFS) {
  const evs = model.eclipse.findSolarInRange(r.jd0 - 5, r.jd0 + 5);
  for (const e of evs) {
    const K = ((r.gz - dayNumber(e.jd)) % 60 + 60) % 60;
    console.log(`   ${r.name}: model event ${jdToJulianDate(e.jd)} → K = ${K}`);
  }
}

// 2. The filter over the −708 candidate window.
console.log('\n2. Lu −708 candidate scan (±30 yr, local mag ≥ 0.6 at Qufu) under the renchen filter:');
const a = model.time.jdFromYear(-708 - 30), b = model.time.jdFromYear(-708 + 30);
const out = [];
for (let s = a; s < b; s += 3650) {
  for (const c of model.eclipse.findSolarInRange(s, Math.min(s + 3650, b))) {
    const lc = model.eclipse.solarLocalCircumstances(c.jd, LU.lat, LU.lon);
    if (lc.kind === 'none' || lc.magnitude === null || lc.magnitude < 0.6) continue;
    out.push({ jd: c.jd, mag: lc.magnitude, kind: lc.kind, g: ganzhi(c.jd) });
  }
}
out.sort((x, y) => y.mag - x.mag);
for (const o of out) {
  console.log(`   ${jdToJulianDate(o.jd)}  ${o.kind.padEnd(7)} mag ${o.mag.toFixed(3)}  ganzhi# ${String(o.g).padStart(2)}${o.g === 29 ? '  ◄ RENCHEN' : ''}`);
}
const renchen = out.filter((o) => o.g === 29);
const totalRenchen = renchen.filter((o) => o.kind === 'total');
console.log(`\n   ${out.length} candidates → renchen keeps ${renchen.length} → totality keeps ${totalRenchen.length}: ${totalRenchen.map((o) => jdToJulianDate(o.jd)).join(', ')}`);
