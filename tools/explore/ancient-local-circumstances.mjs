// ANCIENT LOCAL CIRCUMSTANCES + MULTI-CANDIDATE DATE SCAN (plan §12i
// queue item 2 — the ancient-record review).
//
// The audit-26 measured site-to-centerline distance, which is the WRONG
// INSTRUMENT for most ancient records: chronicle/diary records claim a
// LOCAL CIRCUMSTANCE (totality, "stars came out", magnitude in digits) —
// not proximity to a computed centerline. This tool tests what the record
// CLAIMS, with the 20.3g location tier (package-clean: IAU GMST +
// standard frame mapping — INDEPENDENT of the scene scaffold, so it also
// separates scene-mapping questions from record questions).
//
// For each event: every solar eclipse in the dating-uncertainty window is
// evaluated at the documented site; candidates with local magnitude
// >= 0.60 are ranked. The traditionally-assigned date is marked. This
// operationalizes the "could it have been a DIFFERENT date?" question
// (the browser's multi-match button, package-side and magnitude-ranked).
//
// Day-side pre-filter: the site must be within 100 deg of the sub-solar
// point at greatest (an eclipse is only observable on the day side).
//
// FIRST-RUN RESULTS (pre-ṅ-closure stack; the current shipped-stack
// values live in docs/107-ancient-record-review.md — the adjudications
// below all held, and Thucydides' near-tie flipped marginally to the
// traditional −430):
//  · Cairo 993 + 1004 (Ibn Yunus first-hand): deep partials at the
//    traditional dates, mag 0.961 / 0.989 — CONSISTENT with records of
//    measured partial phases; their audit "geographic" class was the
//    wrong instrument, not a discrepancy.
//  · Cairo 978 + 979 (Said al-Andalusi, second-hand): NO eclipse of
//    their own in ±3 yr reaches mag 0.6 at Cairo — both windows' best
//    match is the SAME 977-12-13 event (0.610): duplicate/misdated
//    entries of the 977 eclipse. Cairo 985: nothing in its year; best
//    nearby is 982-09-20 (0.622) — likely misdated ~3 yr. The huge
//    audit gaps on exactly these rows are IDENTIFICATION errors in the
//    second-hand record chain — first-hand records validate.
//  · Babylon −135: scanning ±25 yr finds NO candidate total at Babylon;
//    the traditional diary date IS the best match (0.959; −124 at 0.967
//    the only comparable). A date-shift does NOT rescue totality — the
//    diary date stands, and the remaining ~0.04 magnitude shortfall
//    (~150–250 km cross-track) is the size of the location tier's OWN
//    ancient Sun-longitude budget (~50″ ≈ 100 km at −2.1 kyr), i.e.
//    compatible with the record within our error budget. The scene
//    audit's 1,411 km remains a scene-mapping reconciliation item.
//  · Thales (0.991) and Plutarch (0.979): traditional dates clearly
//    best. Thucydides: near-tie between −430 (0.845, traditional) and
//    −435 (0.847) — an honest ambiguity historians also debate.
//
//   node tools/explore/ancient-local-circumstances.mjs
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';

const model = createModel(DEFAULT_CONSTANTS);
const D2R = Math.PI / 180;

const EVENTS = [
  { name: 'Babylon -135 (diary, TOTAL: "stars visible")', lat: 32.54, lon: 44.42, year: -135, window: 25, tradJd: 1671853.76 },
  { name: 'Thales -584 (Herodotus, near-total evening)', lat: 39.0, lon: 35.0, year: -584, window: 30, tradJd: 1507900.10 },
  { name: 'Thucydides -430 (crescent + stars, Athens)', lat: 37.97, lon: 23.72, year: -430, window: 10, tradJd: 1564215.11 },
  { name: 'Plutarch +71 (near-total, Aegean)', lat: 38.0, lon: 25.0, year: 71, window: 15, tradJd: 1747068.89 },
  { name: 'Cairo 977 (Ibn Yunus)', lat: 30.05, lon: 31.24, year: 977, window: 3, tradJd: 2078253.85 },
  { name: 'Cairo 978 (Said)', lat: 30.05, lon: 31.24, year: 978, window: 3, tradJd: 2078431.01 },
  { name: 'Cairo 979 (Said)', lat: 30.05, lon: 31.24, year: 979, window: 3, tradJd: 2078785.13 },
  { name: 'Cairo 985 (Said)', lat: 30.05, lon: 31.24, year: 985, window: 3, tradJd: 2081030.09 },
  { name: 'Cairo 993 (Ibn Yunus)', lat: 30.05, lon: 31.24, year: 993, window: 3, tradJd: 2083982.84 },
  { name: 'Cairo 1004 (Ibn Yunus)', lat: 30.05, lon: 31.24, year: 1004, window: 3, tradJd: 2087792.05 },
];

function jdToJulianDate(jd) {
  const J = jd + 0.5, Z = Math.floor(J), F = J - Z;
  const B = Z + 1524, C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const dayFull = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(dayFull)).padStart(2, '0')}`;
}
function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  return ((280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360 + 360) % 360;
}
function daySideAngleDeg(jd, latDeg, lonDeg) {
  const lam = model.eclipse.sunLonDegAtJD(jd) * D2R;
  const eps = model.earth.obliquityDeg(model.time.yearFromJD(jd)) * D2R;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
  const ssLat = dec, ssLon = (ra / D2R - gmstDeg(jd)) * D2R;
  const a = latDeg * D2R, b = lonDeg * D2R;
  return Math.acos(Math.max(-1, Math.min(1,
    Math.sin(a) * Math.sin(ssLat) + Math.cos(a) * Math.cos(ssLat) * Math.cos(b - ssLon)))) / D2R;
}

for (const ev of EVENTS) {
  const a = model.time.jdFromYear(ev.year - ev.window);
  const b = model.time.jdFromYear(ev.year + ev.window);
  const candidates = [];
  for (let s = a; s < b; s += 3650) {
    candidates.push(...model.eclipse.findSolarInRange(s, Math.min(s + 3650, b)));
  }
  const hits = [];
  for (const c of candidates) {
    if (daySideAngleDeg(c.jd, ev.lat, ev.lon) > 100) continue;
    const lc = model.eclipse.solarLocalCircumstances(c.jd, ev.lat, ev.lon);
    if (lc.kind === 'none' || lc.magnitude < 0.6) continue;
    hits.push({ jd: c.jd, ...lc });
  }
  hits.sort((x, y) => y.magnitude - x.magnitude);
  console.log(`\n${ev.name} — window ±${ev.window} yr, ${candidates.length} eclipses scanned, ${hits.length} with local mag ≥ 0.6:`);
  for (const h of hits.slice(0, 8)) {
    const trad = Math.abs(h.jd - ev.tradJd) < 2 ? '  ◄ TRADITIONAL DATE' : '';
    console.log(`  ${jdToJulianDate(h.jd)}  ${h.kind.padEnd(7)} mag ${h.magnitude.toFixed(3)}${h.centralDurationSeconds !== null ? `  central ${h.centralDurationSeconds.toFixed(0)} s` : ''}${trad}`);
  }
}
