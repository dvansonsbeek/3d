#!/usr/bin/env node
/**
 * Saturn (and Jupiter) drift analysis — compare model positions against
 * actual JPL Horizons data at opposition dates and the 2020 great conjunction.
 */

const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const jpl = require('../lib/horizons-client.js');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

// Convert equatorial RA/Dec to ecliptic longitude/latitude
function equatorialToEcliptic(raDeg, decDeg, obliquityDeg) {
  const eps = obliquityDeg * d2r;
  const a = raDeg * d2r;
  const d = decDeg * d2r;
  const sinLam = Math.sin(a) * Math.cos(eps) + Math.tan(d) * Math.sin(eps);
  const cosLam = Math.cos(a);
  let lam = Math.atan2(sinLam, cosLam) * r2d;
  if (lam < 0) lam += 360;
  const sinBet = Math.sin(d) * Math.cos(eps) - Math.cos(d) * Math.sin(eps) * Math.sin(a);
  const bet = Math.asin(sinBet) * r2d;
  return { lon: lam, lat: bet };
}

const target = process.argv[2] || 'saturn';

// Dates to check: oppositions + great conjunction
const dates = {
  saturn: [
    { label: 'Opp 2015', jd: 2457165.5 },  // May 23
    { label: 'Opp 2016', jd: 2457542.5 },  // Jun 03
    { label: 'Opp 2017', jd: 2457919.5 },  // Jun 15
    { label: 'Opp 2018', jd: 2458296.5 },  // Jun 27
    { label: 'Opp 2019', jd: 2458673.5 },  // Jul 09
    { label: 'Opp 2020', jd: 2459050.5 },  // Jul 20
    { label: 'GC 2020 ', jd: 2459205.5 },  // Dec 21
    { label: 'Opp 2021', jd: 2459427.5 },  // Aug 02
    { label: 'Opp 2022', jd: 2459805.5 },  // Aug 14
    { label: 'Opp 2023', jd: 2460183.5 },  // Aug 27
    { label: 'Opp 2024', jd: 2460561.5 },  // Sep 08
  ],
  jupiter: [
    { label: 'Opp 2010', jd: 2455461.5 },  // Sep 21
    { label: 'Opp 2011', jd: 2455864.5 },  // Oct 29
    { label: 'Opp 2012', jd: 2456265.5 },  // Dec 03
    { label: 'Opp 2014', jd: 2456663.5 },  // Jan 05
    { label: 'Opp 2015', jd: 2457060.5 },  // Feb 06
    { label: 'Opp 2016', jd: 2457456.5 },  // Mar 08
    { label: 'Opp 2017', jd: 2457851.5 },  // Apr 07
    { label: 'Opp 2018', jd: 2458247.5 },  // May 09
    { label: 'Opp 2019', jd: 2458644.5 },  // Jun 10
    { label: 'Opp 2020', jd: 2459044.5 },  // Jul 14
    { label: 'Opp 2021', jd: 2459446.5 },  // Aug 20
    { label: 'Opp 2022', jd: 2459849.5 },  // Sep 26
    { label: 'Opp 2023', jd: 2460252.5 },  // Nov 03
    { label: 'Opp 2024', jd: 2460651.5 },  // Dec 07
  ],
};

const obliquity = C.ASTRO_REFERENCE.obliquityJ2000_deg;

async function main() {
  const targetDates = dates[target];
  if (!targetDates) {
    console.error(`No dates for target: ${target}. Use 'saturn' or 'jupiter'.`);
    process.exit(1);
  }

  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`  ${target.toUpperCase()} DRIFT ANALYSIS (JPL Horizons)`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Fetch JPL positions
  const jds = targetDates.map(d => d.jd);
  console.log(`  Fetching ${jds.length} positions from JPL Horizons...`);
  const jplPositions = await jpl.getPositions(target, jds);
  console.log(`  Done.\n`);

  console.log('  Label     | Model RA   | JPL RA     | ΔRA (°)  | Model Dec  | JPL Dec    | ΔDec (°)  | Δλ (°)   | Δβ (°)');
  console.log('  ----------+------------+------------+----------+------------+------------+-----------+----------+-------');

  const errors = [];

  for (let i = 0; i < targetDates.length; i++) {
    const row = targetDates[i];
    const jplPos = jplPositions[i];

    const pos = sg.computePlanetPosition(target, row.jd);
    const modelRaDeg = sg.thetaToRaDeg(pos.ra);
    const modelDecDeg = sg.phiToDecDeg(pos.dec);
    const modelRaH = modelRaDeg / 15;

    const jplRaDeg = jplPos.ra;
    const jplDecDeg = jplPos.dec;
    const jplRaH = jplRaDeg / 15;

    // RA difference (handle wraparound)
    let dRA = modelRaDeg - jplRaDeg;
    if (dRA > 180) dRA -= 360;
    if (dRA < -180) dRA += 360;

    const dDec = modelDecDeg - jplDecDeg;

    // Convert both to ecliptic
    const modelEcl = equatorialToEcliptic(modelRaDeg, modelDecDeg, obliquity);
    const jplEcl = equatorialToEcliptic(jplRaDeg, jplDecDeg, obliquity);
    let dLon = modelEcl.lon - jplEcl.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dLat = modelEcl.lat - jplEcl.lat;

    errors.push({ label: row.label, jd: row.jd, dRA, dDec, dLon, dLat, modelEcl, jplEcl, distAU: pos.distAU });

    console.log(`  ${row.label} | ${modelRaH.toFixed(4)}h   | ${jplRaH.toFixed(4)}h   | ${dRA.toFixed(3).padStart(7)}  | ${modelDecDeg.toFixed(3).padStart(8)}° | ${jplDecDeg.toFixed(3).padStart(8)}° | ${dDec.toFixed(3).padStart(8)}  | ${dLon.toFixed(3).padStart(7)}  | ${dLat.toFixed(3).padStart(6)}`);
  }

  // Summary stats
  const rms = arr => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

  const raErrors = errors.map(e => e.dRA);
  const decErrors = errors.map(e => e.dDec);
  const lonErrors = errors.map(e => e.dLon);
  const latErrors = errors.map(e => e.dLat);

  console.log('\n  Summary:');
  console.log(`    RA  — Mean: ${mean(raErrors).toFixed(3)}°, RMS: ${rms(raErrors).toFixed(3)}°`);
  console.log(`    Dec — Mean: ${mean(decErrors).toFixed(3)}°, RMS: ${rms(decErrors).toFixed(3)}°`);
  console.log(`    Ecl.Lon — Mean: ${mean(lonErrors).toFixed(3)}°, RMS: ${rms(lonErrors).toFixed(3)}°`);
  console.log(`    Ecl.Lat — Mean: ${mean(latErrors).toFixed(3)}°, RMS: ${rms(latErrors).toFixed(3)}°`);

  // Drift trend
  console.log('\n  Ecl.Lon drift (Δλ vs time from J2000):');
  const jd_j2000 = 2451545.0;
  for (const e of errors) {
    const dt = (e.jd - jd_j2000) / 365.25;
    const bar = e.dLon > 0 ? '+'.repeat(Math.min(40, Math.round(Math.abs(e.dLon) * 20)))
                            : '-'.repeat(Math.min(40, Math.round(Math.abs(e.dLon) * 20)));
    console.log(`    ${e.label} (${dt.toFixed(1).padStart(5)}yr): ${e.dLon.toFixed(3).padStart(7)}° ${bar}`);
  }

  // Frame drift note
  const yearSpan = (errors[errors.length - 1].jd - errors[0].jd) / 365.25;
  const lonSlope = (lonErrors[lonErrors.length - 1] - lonErrors[0]) / yearSpan;
  console.log(`\n  Frame drift: ~50.3"/yr ecliptic longitude (J2000 → of-date)`);
  console.log(`  Observed lon slope: ${(lonSlope * 3600).toFixed(1)}"/yr over ${yearSpan.toFixed(1)} years`);
  console.log(`  After frame correction: ~${((lonSlope * 3600) - 50.3).toFixed(1)}"/yr\n`);

  console.log(`═══════════════════════════════════════════════════════════════`);
}

main().catch(e => { console.error(e); process.exit(1); });
