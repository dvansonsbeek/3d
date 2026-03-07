#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// DERIVE EoC CONSTANTS — Can eocEccentricity and perihelionPhaseOffset
// be computed from existing model constants?
// ═══════════════════════════════════════════════════════════════════════════

const { buildSceneGraph, moveModel } = require('../lib/scene-graph');
const C = require('../lib/constants');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;
const sDay = 1 / C.meanSolarYearDays;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  DERIVATION OF eocEccentricity AND perihelionPhaseOffset');
console.log('═══════════════════════════════════════════════════════════════\n');

const graph = buildSceneGraph();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: Determine the "bary frame rotation" — how is the barycenter's
// coordinate frame rotated relative to the world frame?
//
// The Sun is at orbital angle θ_bary in the bary frame, but at some
// different world angle. The frame rotation R is the difference.
// ═══════════════════════════════════════════════════════════════════════════

console.log('─── Step 1: Bary frame rotation ───\n');

const pos0 = 0; // model start = June 21, 2000
moveModel(graph, pos0);

const sunWP = graph.sunNodes.pivot.getWorldPosition();
const baryWP = graph.barycenter.pivot.getWorldPosition();
const earthWP = graph.earthNodes.rotAxis.getWorldPosition();

// Sun's world angle from barycenter
const sunWorldAngle = Math.atan2(sunWP[0] - baryWP[0], sunWP[2] - baryWP[2]);

// Sun's orbital angle in bary frame at pos=0
const sunBaryAngle = -C.correctionSun * d2r; // θ = speed*pos - startPos*d2r = 0 - correctionSun*d2r

// Frame rotation: how much the bary frame is rotated relative to world
// worldAngle = baryAngle + R  →  R = worldAngle - baryAngle
const frameRotation = sunWorldAngle - sunBaryAngle;

console.log('  Sun world angle from bary (pos=0):', (sunWorldAngle * r2d).toFixed(4) + '°');
console.log('  Sun bary angle (pos=0):            ', (sunBaryAngle * r2d).toFixed(4) + '°');
console.log('  Frame rotation R:                  ', (frameRotation * r2d).toFixed(4) + '°');
console.log('  Frame rotation R (mod 360):        ', (((frameRotation * r2d) % 360 + 360) % 360).toFixed(4) + '°');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: Geometric perihelion direction
//
// The eccentricity offset makes the Earth-Sun distance vary. The perihelion
// (minimum distance) occurs when the Sun is between Earth and barycenter.
// The geometric perihelion direction (in world frame) = direction from bary
// toward Earth = opposite of (Earth-to-bary) vector.
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 2: Geometric perihelion direction ───\n');

// Direction from bary toward Earth (= geometric perihelion direction for Sun)
const baryToEarthX = earthWP[0] - baryWP[0];
const baryToEarthZ = earthWP[2] - baryWP[2];
const geomPeriWorld = Math.atan2(baryToEarthX, baryToEarthZ); // world angle

// Convert to bary orbital frame
const geomPeriBary = geomPeriWorld - frameRotation;

console.log('  Bary-to-Earth direction (world): ', (geomPeriWorld * r2d).toFixed(4) + '°');
console.log('  Geometric perihelion (bary frame):', (geomPeriBary * r2d).toFixed(4) + '°');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: Verify by finding actual model perihelion
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 3: Verify via model perihelion search ───\n');

const periJDref = 2451547.042; // observed perihelion Jan 3.542, 2000
let minDist = Infinity;
let periJDFound = 0;

for (let i = 0; i < 100000; i++) {
  const jd = periJDref - 15 + (30 * i / 100000);
  const pos = sDay * (jd - C.startmodelJD);
  moveModel(graph, pos);
  const s = graph.sunNodes.pivot.getWorldPosition();
  const e = graph.earthNodes.rotAxis.getWorldPosition();
  const dx = s[0]-e[0], dy = s[1]-e[1], dz = s[2]-e[2];
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (dist < minDist) { minDist = dist; periJDFound = jd; }
}

const periPos = sDay * (periJDFound - C.startmodelJD);
moveModel(graph, periPos);
const sunAtPeri = graph.sunNodes.pivot.getWorldPosition();
const baryAtPeri = graph.barycenter.pivot.getWorldPosition();

const sunAngleAtPeri = Math.atan2(
  sunAtPeri[0] - baryAtPeri[0], sunAtPeri[2] - baryAtPeri[2]
);

// Sun's bary-frame angle at perihelion (subtract frame rotation, adjusted for pos change)
// Frame rotation is constant (it's a static property of the hierarchy)
// Actually, at a different pos, the EP1/EP2 layers have rotated slightly, changing the frame.
// But H/16 ≈ 20938 years, so in ~0.5 years the frame rotation changes by 360°/20938 ≈ 0.017°.
// Negligible. Use the pos=0 frame rotation.
const sunBaryAtPeri = sunAngleAtPeri - frameRotation;

console.log('  Model perihelion JD:             ', periJDFound.toFixed(4));
console.log('  Reference perihelion JD:         ', periJDref);
console.log('  Timing error:                    ', ((periJDFound - periJDref) * 24).toFixed(2), 'hours');
console.log('  Min distance:                    ', (minDist / 100).toFixed(6), 'AU');
console.log('  Sun world angle at perihelion:   ', (sunAngleAtPeri * r2d).toFixed(4) + '°');
console.log('  Sun bary-frame angle at peri:    ', (sunBaryAtPeri * r2d).toFixed(4) + '°');
console.log('  Geometric perihelion (bary frame):', (geomPeriBary * r2d).toFixed(4) + '°');
console.log('  Match:', Math.abs(sunBaryAtPeri - geomPeriBary) < 0.02 ? 'YES (within 1°)' : 'NO — mismatch: ' + ((sunBaryAtPeri - geomPeriBary) * r2d).toFixed(4) + '°');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: Derive perihelionPhaseOffset
//
// The formula perihelionPhaseJ2000 should equal the Sun's bary-frame angle
// at perihelion. Currently:
//   perihelionPhaseJ2000 = -correctionSun*d2r - 2π*(JD_start - JD_peri)/yearDays + offset*d2r
//
// Without offset, this computes the Sun's MEAN angle at the reference peri date.
// The offset should compensate for:
// a) The difference between the reference peri date and the MODEL's geometric peri
// b) The EoC shifting the Sun's true angle relative to mean at perihelion (=0 at M=0)
//
// So the REQUIRED perihelionPhaseJ2000 = geometric perihelion in bary frame.
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 4: Derive perihelionPhaseOffset ───\n');

const formulaWithoutOffset = -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - periJDref) / C.meanSolarYearDays;

console.log('  Formula without offset:          ', (formulaWithoutOffset * r2d).toFixed(4) + '°');
console.log('  Required (geom peri bary frame): ', (geomPeriBary * r2d).toFixed(4) + '°');

let derivedOffset = (geomPeriBary - formulaWithoutOffset) * r2d;
// Normalize to [-180, 180]
while (derivedOffset > 180) derivedOffset -= 360;
while (derivedOffset < -180) derivedOffset += 360;

console.log('  Derived perihelionPhaseOffset:    ', derivedOffset.toFixed(4) + '°');
console.log('  Current hardcoded offset:        ', C.perihelionPhaseOffset + '°');
console.log('  Difference:                      ', (derivedOffset - C.perihelionPhaseOffset).toFixed(4) + '°');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: eocEccentricity
//
// Two sources of speed variation:
// A) Geometric parallax: observer offset d from orbit center, gives amplitude d/a
// B) Explicit EoC: amplitude 2·eoc
// Total should equal real Keplerian: amplitude 2·e_real
//
// The effective geometric eccentricity at J2000 is the actual Earth-bary
// distance, not just eccentricityBase (because eccentricityAmplitude adds to it
// depending on precession phase).
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 5: eocEccentricity derivation ───\n');

// Measure actual Earth-bary distance at J2000
const offsetX = baryWP[0] - earthWP[0];
const offsetY = baryWP[1] - earthWP[1];
const offsetZ = baryWP[2] - earthWP[2];
const e_effective = Math.sqrt(offsetX*offsetX + offsetY*offsetY + offsetZ*offsetZ) / 100; // AU

console.log('  eccentricityBase:                ', C.eccentricityBase.toFixed(6));
console.log('  eccentricityAmplitude:           ', C.eccentricityAmplitude.toFixed(6));
console.log('  eccentricityDerivedMean:         ', C.eccentricityDerivedMean.toFixed(6));
console.log('  base + amplitude:                ', (C.eccentricityBase + C.eccentricityAmplitude).toFixed(6));
console.log('  Actual Earth-bary distance (J2000):', e_effective.toFixed(6), 'AU');

// The e_real should be the desired TOTAL eccentricity for the equation of center.
// This is eccentricityDerivedMean = sqrt(base² + amp²)
const e_real = C.eccentricityDerivedMean;

// Formula: e_geom_effective/1 + 2·eoc = 2·e_real
// → eoc = e_real - e_geom_effective/2
// But e_geom_effective VARIES with precession phase!
// For a stable derivation, use the mean geometric eccentricity.

// The geometric eccentricity has:
// - Fixed component: eccentricityBase (always present)
// - Oscillating component: eccentricityAmplitude (varies with H/3 - H/16 beat)
// The RMS of the total offset distance:
//   e_rms = sqrt(base² + amp²) = eccentricityDerivedMean
// But the MEAN distance is different from RMS for a vector sum.

// Actually, let's think about this differently.
// The eccentricity offset has two orthogonal components:
// - Along EP2 direction: eccentricityBase (constant at ~0.0154)
// - Along earth orbit: eccentricityAmplitude (constant at ~0.00137, but rotating)
// These are at varying angles. The mean of the distance over a full precession cycle is:
//   <d> = (1/2π) ∫₀²π sqrt(base² + amp² + 2·base·amp·cos(φ)) dφ
// This is approximately base + amp²/(2·base) for amp << base.

const meanDist = C.eccentricityBase + C.eccentricityAmplitude * C.eccentricityAmplitude / (2 * C.eccentricityBase);
console.log('\n  Mean geometric distance (analytical):', meanDist.toFixed(6), 'AU');
console.log('  = base + amp²/(2·base)');

// Option A: Use eccentricityDerivedMean as e_real, eccentricityBase as e_geom
// This is the user's preferred approach
const eocA = C.eccentricityDerivedMean - C.eccentricityBase / 2;

// Option B: Use e_real = e_derived, e_geom = actual distance at J2000 (epoch-dependent)
const eocB = C.eccentricityDerivedMean - e_effective / 2;

// Option C: Use e_real = e_derived, e_geom = mean distance over precession cycle
const eocC = C.eccentricityDerivedMean - meanDist / 2;

console.log('\n  Option A: eoc = eccentricityDerivedMean - eccentricityBase/2');
console.log('    = ' + C.eccentricityDerivedMean.toFixed(6) + ' - ' + (C.eccentricityBase/2).toFixed(6));
console.log('    = ' + eocA.toFixed(6));

console.log('\n  Option B: eoc = eccentricityDerivedMean - actualJ2000offset/2');
console.log('    = ' + C.eccentricityDerivedMean.toFixed(6) + ' - ' + (e_effective/2).toFixed(6));
console.log('    = ' + eocB.toFixed(6));

console.log('\n  Option C: eoc = eccentricityDerivedMean - meanGeomDist/2');
console.log('    = ' + C.eccentricityDerivedMean.toFixed(6) + ' - ' + (meanDist/2).toFixed(6));
console.log('    = ' + eocC.toFixed(6));

console.log('\n  Current hardcoded value:         ', C.eocEccentricity);

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: Verify total effect
//
// For each option, compute the total first-order amplitude and compare
// to the desired 2·e_real.
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 6: Total effect verification ───\n');
console.log('  Desired total amplitude: 2·e_real = ' + (2*e_real).toFixed(6) + ' rad (' + (2*e_real*r2d).toFixed(4) + '°)');
console.log();

function checkOption(label, eoc, e_geom) {
  const total = e_geom + 2 * eoc;
  const desired = 2 * e_real;
  const error = total - desired;
  console.log('  ' + label + ':');
  console.log('    e_geom + 2·eoc = ' + e_geom.toFixed(6) + ' + ' + (2*eoc).toFixed(6) + ' = ' + total.toFixed(6));
  console.log('    Error from desired: ' + (error * r2d * 3600).toFixed(1) + ' arcsec');
  console.log();
}

checkOption('A (base as e_geom)', eocA, C.eccentricityBase);
checkOption('B (J2000 dist as e_geom)', eocB, e_effective);
checkOption('C (mean dist as e_geom)', eocC, meanDist);
checkOption('Current (0.0085 with base)', C.eocEccentricity, C.eccentricityBase);

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: What matters — the actual Sun RA accuracy
//
// The real test: which eocEccentricity gives the best cardinal point timings?
// Let's compute the Sun's RA at the 4 cardinal points for year 2000 using
// different eoc values.
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n─── Step 7: Understanding the effective geometric eccentricity ───\n');

// The geometric eccentricity varies with precession phase. At J2000,
// we can check: what fraction of the precession cycle are we at?

const yrsFromBalanced = C.startmodelYear - C.balancedYear;
const H3phase = (yrsFromBalanced / (C.H / 3)) * 360; // Earth inclination precession
const H16phase = (yrsFromBalanced / (C.H / 16)) * 360; // Perihelion precession

console.log('  Years from balanced year:        ', yrsFromBalanced.toFixed(1));
console.log('  H/3 phase (inclination prec):    ', (H3phase % 360).toFixed(2) + '°');
console.log('  H/16 phase (perihelion prec):    ', (H16phase % 360).toFixed(2) + '°');

// The eccentricityAmplitude oscillation comes from the earth orbit (H/3 related)
// and the barycenter offset (under perihelion precession).
// Earth.orbitRadius = -eccentricityAmplitude*100, rotating at -H/13
// Barycenter.orbitRadius = +eccentricityAmplitude*100, static under EP2.pivot

// The angle between these two determines whether they add or subtract from eccentricityBase.
// At the balanced year, they should be aligned (adding maximally or subtracting).

console.log('\n  At J2000:');
console.log('    Earth orbit contribution:       -' + C.eccentricityAmplitude.toFixed(6) + ' AU (rotating at -H/13)');
console.log('    Barycenter orbit contribution:  +' + C.eccentricityAmplitude.toFixed(6) + ' AU (static in EP2 frame)');
console.log('    EP2 base offset:               -' + C.eccentricityBase.toFixed(6) + ' AU (fixed in EP1 frame)');
console.log('    Measured total offset:           ' + e_effective.toFixed(6) + ' AU');
console.log('    vs eccentricityBase:             ' + (e_effective - C.eccentricityBase).toFixed(6) + ' AU extra');

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY & RECOMMENDATION');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('  eocEccentricity:');
console.log('    Current hardcoded:   ', C.eocEccentricity);
console.log('    Derived (Option A):  ', eocA.toFixed(6));
console.log('    Formula: eccentricityDerivedMean - eccentricityBase / 2');
console.log('    = sqrt(eccentricityBase² + eccentricityAmplitude²) - eccentricityBase / 2');
console.log();
console.log('  perihelionPhaseOffset:');
console.log('    Current hardcoded:   ', C.perihelionPhaseOffset + '°');
console.log('    Derived:             ', derivedOffset.toFixed(4) + '°');
console.log('    Formula: geometric perihelion direction (bary frame) - Sun angle at reference perihelion');
