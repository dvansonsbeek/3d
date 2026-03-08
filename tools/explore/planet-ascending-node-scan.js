#!/usr/bin/env node
/**
 * Scan ascending node values for Type III planets to minimize ecliptic latitude errors.
 * Uses actual JPL Horizons data for comparison.
 */

const sg = require('../lib/scene-graph.js');
const C = require('../lib/constants.js');
const jpl = require('../lib/horizons-client.js');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

const target = process.argv[2] || 'saturn';

function equatorialToEcliptic(raDeg, decDeg, obliquityDeg) {
  const eps = obliquityDeg * d2r;
  const a = raDeg * d2r, d = decDeg * d2r;
  const sinLam = Math.sin(a) * Math.cos(eps) + Math.tan(d) * Math.sin(eps);
  let lam = Math.atan2(sinLam, Math.cos(a)) * r2d;
  if (lam < 0) lam += 360;
  const sinBet = Math.sin(d) * Math.cos(eps) - Math.cos(d) * Math.sin(eps) * Math.sin(a);
  return { lon: lam, lat: Math.asin(sinBet) * r2d };
}

// Dates to check
const dates = {
  saturn: [
    2457165.5, 2457542.5, 2457919.5, 2458296.5, 2458673.5,
    2459050.5, 2459205.5, 2459427.5, 2459805.5, 2460183.5, 2460561.5,
  ],
  jupiter: [
    2455461.5, 2455864.5, 2456265.5, 2456663.5, 2457060.5,
    2457456.5, 2457851.5, 2458247.5, 2458644.5, 2459044.5,
    2459446.5, 2459849.5, 2460252.5, 2460651.5,
  ],
};

const obliquity = 23.4393;

async function main() {
  const jds = dates[target];
  if (!jds) { console.error(`No dates for: ${target}`); process.exit(1); }

  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`  ASCENDING NODE SCAN — ${target.toUpperCase()} (JPL Horizons)`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Fetch JPL reference positions
  console.log(`  Fetching ${jds.length} JPL positions...`);
  const jplPositions = await jpl.getPositions(target, jds);
  console.log(`  Done.\n`);

  // Pre-compute JPL ecliptic coords
  const jplEcl = jplPositions.map(p => equatorialToEcliptic(p.ra, p.dec, obliquity));

  const currentAscNode = C.planets[target].ascendingNode;
  console.log(`  Current ascending node: ${currentAscNode}°\n`);

  function computeError(ascNodeOffset) {
    sg._invalidateGraph();
    C.planets[target].ascendingNode = currentAscNode + ascNodeOffset;
    sg._invalidateGraph();

    let sumLat2 = 0, sumLon2 = 0, sumDec2 = 0;
    let sumLat = 0;

    for (let i = 0; i < jds.length; i++) {
      const pos = sg.computePlanetPosition(target, jds[i]);
      const modelRaDeg = sg.thetaToRaDeg(pos.ra);
      const modelDecDeg = sg.phiToDecDeg(pos.dec);
      const modelEcl = equatorialToEcliptic(modelRaDeg, modelDecDeg, obliquity);

      let dLon = modelEcl.lon - jplEcl[i].lon;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      const dLat = modelEcl.lat - jplEcl[i].lat;
      const dDec = modelDecDeg - jplPositions[i].dec;

      sumLon2 += dLon * dLon;
      sumLat2 += dLat * dLat;
      sumDec2 += dDec * dDec;
      sumLat += dLat;
    }

    C.planets[target].ascendingNode = currentAscNode;

    const n = jds.length;
    return {
      lonRMS: Math.sqrt(sumLon2 / n),
      latRMS: Math.sqrt(sumLat2 / n),
      decRMS: Math.sqrt(sumDec2 / n),
      latMean: sumLat / n,
    };
  }

  // Coarse scan: -60 to +60 degrees
  console.log('  --- Coarse scan (2° steps, -60° to +60°) ---');
  console.log('  Offset  | Lon RMS  | Lat RMS  | Dec RMS  | Lat Mean');
  console.log('  --------+----------+----------+----------+---------');

  let bestOffset = 0;
  let bestLatRMS = Infinity;

  for (let offset = -60; offset <= 60; offset += 2) {
    const err = computeError(offset);
    if (err.latRMS < bestLatRMS) {
      bestLatRMS = err.latRMS;
      bestOffset = offset;
    }
    if (offset % 10 === 0) {
      const marker = offset === bestOffset ? ' <<<' : '';
      console.log(`  ${(offset >= 0 ? '+' : '') + offset.toString().padStart(3)}°   | ${err.lonRMS.toFixed(3).padStart(6)}° | ${err.latRMS.toFixed(3).padStart(6)}° | ${err.decRMS.toFixed(3).padStart(6)}° | ${err.latMean.toFixed(3).padStart(6)}°${marker}`);
    }
  }

  // Print best if not on 10° boundary
  if (bestOffset % 10 !== 0) {
    const err = computeError(bestOffset);
    console.log(`  ${(bestOffset >= 0 ? '+' : '') + bestOffset.toString().padStart(3)}°   | ${err.lonRMS.toFixed(3).padStart(6)}° | ${err.latRMS.toFixed(3).padStart(6)}° | ${err.decRMS.toFixed(3).padStart(6)}° | ${err.latMean.toFixed(3).padStart(6)}° <<< (best coarse)`);
  }

  // Fine scan
  console.log(`\n  --- Fine scan (0.5° steps around ${bestOffset}°) ---`);
  console.log('  Offset  | Lon RMS  | Lat RMS  | Dec RMS  | Lat Mean');
  console.log('  --------+----------+----------+----------+---------');

  let fineBest = bestOffset;
  let fineBestLatRMS = Infinity;

  for (let offset = bestOffset - 8; offset <= bestOffset + 8; offset += 0.5) {
    const err = computeError(offset);
    if (err.latRMS < fineBestLatRMS) {
      fineBestLatRMS = err.latRMS;
      fineBest = offset;
    }
    console.log(`  ${(offset >= 0 ? '+' : '') + offset.toFixed(1).padStart(5)}° | ${err.lonRMS.toFixed(3).padStart(6)}° | ${err.latRMS.toFixed(3).padStart(6)}° | ${err.decRMS.toFixed(3).padStart(6)}° | ${err.latMean.toFixed(3).padStart(6)}°${offset === fineBest ? ' <<<' : ''}`);
  }

  // Ultra-fine
  console.log(`\n  --- Ultra-fine scan (0.1° steps around ${fineBest}°) ---`);
  console.log('  Offset  | Lon RMS  | Lat RMS  | Dec RMS  | New Node  | Lat Mean');
  console.log('  --------+----------+----------+----------+-----------+---------');

  let ultraBest = fineBest;
  let ultraBestLatRMS = Infinity;

  for (let offset = fineBest - 2; offset <= fineBest + 2; offset += 0.1) {
    const roundedOffset = Math.round(offset * 10) / 10;
    const err = computeError(roundedOffset);
    if (err.latRMS < ultraBestLatRMS) {
      ultraBestLatRMS = err.latRMS;
      ultraBest = roundedOffset;
    }
    const newVal = currentAscNode + roundedOffset;
    console.log(`  ${(roundedOffset >= 0 ? '+' : '') + roundedOffset.toFixed(1).padStart(5)}° | ${err.lonRMS.toFixed(3).padStart(6)}° | ${err.latRMS.toFixed(3).padStart(6)}° | ${err.decRMS.toFixed(3).padStart(6)}° | ${newVal.toFixed(2).padStart(8)}° | ${err.latMean.toFixed(3).padStart(6)}°${roundedOffset === ultraBest ? ' <<<' : ''}`);
  }

  const baseErr = computeError(0);
  const bestErr = computeError(ultraBest);

  console.log(`\n  ═══════════════════════════════════════════════════════════`);
  console.log(`  RESULT: Best ascending node offset = ${(ultraBest >= 0 ? '+' : '')}${ultraBest.toFixed(1)}°`);
  console.log(`  Current: ${currentAscNode}° → Suggested: ${(currentAscNode + ultraBest).toFixed(4)}°`);
  console.log(`  Lat RMS: ${baseErr.latRMS.toFixed(3)}° → ${bestErr.latRMS.toFixed(3)}°`);
  console.log(`  Dec RMS: ${baseErr.decRMS.toFixed(3)}° → ${bestErr.decRMS.toFixed(3)}°`);
  console.log(`  Lon RMS: ${baseErr.lonRMS.toFixed(3)}° → ${bestErr.lonRMS.toFixed(3)}° (should be unchanged)`);

  // Show detail at optimal
  console.log(`\n  --- Positions at optimal offset ---`);
  sg._invalidateGraph();
  C.planets[target].ascendingNode = currentAscNode + ultraBest;
  sg._invalidateGraph();

  console.log('  JD          | ΔLon (°) | ΔLat (°) | ΔDec (°)');
  console.log('  ------------+----------+----------+---------');
  for (let i = 0; i < jds.length; i++) {
    const pos = sg.computePlanetPosition(target, jds[i]);
    const modelRaDeg = sg.thetaToRaDeg(pos.ra);
    const modelDecDeg = sg.phiToDecDeg(pos.dec);
    const modelEcl = equatorialToEcliptic(modelRaDeg, modelDecDeg, obliquity);
    let dLon = modelEcl.lon - jplEcl[i].lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dLat = modelEcl.lat - jplEcl[i].lat;
    const dDec = modelDecDeg - jplPositions[i].dec;
    console.log(`  ${jds[i].toFixed(1)} | ${dLon.toFixed(3).padStart(7)}  | ${dLat.toFixed(3).padStart(7)}  | ${dDec.toFixed(3).padStart(7)}`);
  }

  // Restore
  C.planets[target].ascendingNode = currentAscNode;
  sg._invalidateGraph();

  console.log(`\n═══════════════════════════════════════════════════════════════`);
}

main().catch(e => { console.error(e); process.exit(1); });
