#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Derive perihelionPhaseOffset analytically from precession phases
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

// The geometric perihelion direction depends on the eccentricity offset vector
// direction at J2000. The offset is (-eccentricityBase*100, 0, 0) in EP1's
// pivot frame. To find its world direction, we need:
//   1. EP1's orbit rotation at pos=0
//   2. All parent rotations above EP1

// But all layers above EP1 are small tilts (earthRAAngle, earthInvPlaneInclination)
// that primarily affect Y-axis, not the XZ-plane direction. The dominant
// contribution to the offset direction is EP1's rotation.

// EP1 startPos:
const startModelYearWithCorrection = C.startmodelYear + C.correctionDays / C.meanSolarYearDays;
const ep1StartPos = (C.balancedYear - startModelYearWithCorrection) / (C.H / 16) * 360;

// At pos=0, EP1.orbit.ry = -ep1StartPos * d2r
const ep1AngleAtJ2000 = -ep1StartPos * d2r;

console.log('EP1 startPos:', ep1StartPos.toFixed(4) + '°');
console.log('EP1 angle at J2000:', (ep1AngleAtJ2000 * r2d).toFixed(4) + '°');
console.log('EP1 angle mod 360:', (((ep1AngleAtJ2000 * r2d) % 360 + 360) % 360).toFixed(4) + '°');

// The eccentricity offset is at (-eccentricityBase*100, 0, 0) in EP1's pivot.
// After EP1 rotates by ep1AngleAtJ2000, the offset in EP1's parent frame is:
//   x' = -eccentricityBase*100 * cos(ep1Angle)
//   z' = eccentricityBase*100 * sin(ep1Angle)  (Y-rotation: x'=x*cos+z*sin, z'=-x*sin+z*cos)
// Wait — the offset is the POSITION of EP2.container, which is INSIDE EP1.orbit.
// So it gets rotated by EP1.orbit.ry.

// Direction of offset in EP1 parent frame:
const offsetDirInParent = Math.atan2(
  -C.eccentricityBase * 100 * Math.cos(ep1AngleAtJ2000),  // x component after rotation
  C.eccentricityBase * 100 * Math.sin(ep1AngleAtJ2000)    // z component after rotation
);

console.log('Offset direction in EP1 parent:', (offsetDirInParent * r2d).toFixed(4) + '°');

// But we also need to account for the earth.container rotation (90° around Y)
// and all parent layer rotations. The earth.container has ry = PI/2.
// Earth layers: earth → earthInclinationPrecession → earthEclipticPrecession →
//   earthObliquityPrecession → earthPerihelionPrecession1

// All intermediate layers rotate around Y (precession). Their rotations at pos=0:
const earthAngle = 0; // earth startPos = 0, speed = -2pi/(H/13), at pos=0: 0
const earthContainerRot = Math.PI / 2; // hardcoded 90° rotation
const inclPrecStartPos = (C.balancedYear - startModelYearWithCorrection) / (C.H / 3) * 360;
const eclipPrecStartPos = (C.balancedYear - startModelYearWithCorrection) / (C.H / 5) * 360;
const obliqPrecStartPos = -((C.balancedYear - startModelYearWithCorrection) / (C.H / 8) * 360);

const inclPrecAngle = -inclPrecStartPos * d2r;
const eclipPrecAngle = -eclipPrecStartPos * d2r;
const obliqPrecAngle = -obliqPrecStartPos * d2r;

console.log('\nParent layer angles at pos=0:');
console.log('  earth container ry: 90° (hardcoded)');
console.log('  earth orbit ry:', (earthAngle * r2d).toFixed(4) + '°');
console.log('  inclPrec orbit ry:', (inclPrecAngle * r2d).toFixed(4) + '°');
console.log('  eclipPrec orbit ry:', (eclipPrecAngle * r2d).toFixed(4) + '°');
console.log('  obliqPrec orbit ry:', (obliqPrecAngle * r2d).toFixed(4) + '°');
console.log('  ep1 orbit ry:', (ep1AngleAtJ2000 * r2d).toFixed(4) + '°');

// Total Y-rotation accumulated: earthContainer + earth + inclPrec + eclipPrec + obliqPrec + ep1
// (ignoring small tilts in X/Z)
const totalYrot = earthContainerRot + earthAngle + inclPrecAngle + eclipPrecAngle + obliqPrecAngle + ep1AngleAtJ2000;
console.log('\nTotal Y-rotation:', (totalYrot * r2d).toFixed(4) + '°');
console.log('Total Y-rotation mod 360:', (((totalYrot * r2d) % 360 + 360) % 360).toFixed(4) + '°');

// The eccentricity offset (-eccentricityBase*100, 0, 0) in EP1.pivot frame,
// after all parent Y-rotations, becomes world direction:
// Just rotate the (-1, 0, 0) vector by total Y rotation:
const offsetWorldAngle = Math.atan2(-Math.cos(totalYrot), Math.sin(totalYrot));
console.log('Offset world angle (analytical):', (offsetWorldAngle * r2d).toFixed(4) + '°');

// The geometric perihelion (Sun closest) is toward the offset (bary is offset from Earth
// in this direction, Sun is closest when on the near side).
// Wait — actually the bary is displaced FROM Earth by this offset. The Sun orbits
// the bary. The Sun is closest when it's at the angle OPPOSITE to the offset
// from the bary's perspective... no. Let me think again.
//
// Earth is near origin. Bary is displaced by eccentricityBase in some direction.
// Sun orbits bary at 1 AU. Sun closest to Earth when Sun is BETWEEN Earth and bary,
// i.e., Sun angle from bary = direction from bary TOWARD Earth.
// Direction from bary toward Earth = OPPOSITE of offset direction.
// So geometric perihelion (Sun world angle from bary) = offset world angle + 180°

const geomPeriWorld = offsetWorldAngle + Math.PI;
console.log('Geometric perihelion (world):', (geomPeriWorld * r2d).toFixed(4) + '°');

// From the scene graph analysis: bary-to-Earth direction was 11.9187°
// And the frame rotation R = 180.2497°

// The bary frame rotation = totalYrot plus the direction flip from the orbit setup
// The Sun's angle in the bary frame θ relates to world angle by:
// world_angle = θ + frame_rotation
// So: θ_perihelion = geomPeriWorld - frameRotation

// The frame rotation is the totalYrot (all parent rotations)
// But we need to be careful: the Sun's pivot is at (orbitRadius, 0, 0) = (100, 0, 0),
// and orbit.ry = θ. After Y-rotation by θ, the local position becomes:
//   x' = 100 * cos(θ)
//   z' = -100 * sin(θ)
// The world angle = atan2(x', z') = atan2(cos(θ), -sin(θ))
// For θ=0: world_local_angle = atan2(1, 0) = 90°
// So there's a 90° offset between θ and the local direction!
//
// More precisely: in the bary frame, world_local_angle = 90° - θ (mod 360)
// Then in world frame: world_angle = world_local_angle + totalYrot
// So: world_angle = 90° - θ + totalYrot
// → θ = 90° - world_angle + totalYrot

// Wait, EP2.orbit also rotates. The bary is inside EP2.pivot. EP2 has its own rotation.
// Let me include EP2's rotation too.
const ep2StartPos = -ep1StartPos;
const ep2AngleAtJ2000 = -ep2StartPos * d2r;
console.log('  ep2 orbit ry:', (ep2AngleAtJ2000 * r2d).toFixed(4) + '°');

// Barycenter is under EP2.pivot. EP2 orbit rotation affects the barycenter's frame.
// Barycenter has speed=0, startPos=0, so its orbit doesn't rotate.
// So the bary frame = EP2.orbit rotated frame.

const totalYrotIncludingEP2 = totalYrot + ep2AngleAtJ2000;
console.log('Total Y-rotation incl EP2:', (totalYrotIncludingEP2 * r2d).toFixed(4) + '°');
console.log('mod 360:', (((totalYrotIncludingEP2 * r2d) % 360 + 360) % 360).toFixed(4) + '°');

// In the bary frame, the Sun pivot is at (100, 0, 0). After orbit.ry = θ:
// local position: (100*cos(θ), 0, -100*sin(θ))
// atan2(x, z) = atan2(cos(θ), -sin(θ)) = π/2 - θ (approximately)
// So: Sun direction in bary's LOCAL frame = π/2 - θ

// After all parent rotations (totalYrotIncludingEP2 + bary rotation [=0]):
// Sun direction in WORLD frame = (π/2 - θ) + totalYrotIncludingEP2
// Actually, need to verify sign convention for Y-rotation accumulation.

// Let's just compute numerically what the frame rotation should be:
// At pos=0, θ_sun = -correctionSun * d2r
// Sun world angle from bary = 179.7386° (from scene graph measurement)
// θ_sun = -0.5112°
// So: 179.7386 = f(θ_sun, totalYrotIncludingEP2)
// If f(θ, R) = (90° - θ*r2d + R*r2d) mod 360... let's check:
const testAngle = (90 - (-C.correctionSun) + totalYrotIncludingEP2 * r2d);
console.log('\nTest: 90 - (-correctionSun) + totalYrot:', testAngle.toFixed(4) + '°');
console.log('mod 360:', (((testAngle) % 360 + 360) % 360).toFixed(4) + '°');
console.log('Expected: 179.7386°');

// Alternative: Y-rotation rotates atan2(x,z) by adding the angle
// Local sun direction from bary = atan2(100*cos(θ), -100*sin(θ))
const localSunDir = Math.atan2(Math.cos(-C.correctionSun * d2r), -Math.sin(-C.correctionSun * d2r));
console.log('Local sun dir:', (localSunDir * r2d).toFixed(4) + '°');
console.log('+ totalYrot:', ((localSunDir + totalYrotIncludingEP2) * r2d).toFixed(4) + '°');
const mod360v = ((localSunDir + totalYrotIncludingEP2) * r2d % 360 + 360) % 360;
console.log('mod 360:', mod360v.toFixed(4) + '°');

// The frame rotation R from the scene graph was 180.2497°
// R = worldAngle - baryAngle = worldAngle - θ_sun
// So worldAngle = θ_sun + R
// And R should equal the transformation from bary-frame angle to world angle

// Let me try: R = totalYrotIncludingEP2 + π/2
const R_analytical = totalYrotIncludingEP2 + Math.PI / 2;
console.log('\nR_analytical (totalYrot + π/2):', (R_analytical * r2d).toFixed(4) + '°');
console.log('R_analytical mod 360:', (((R_analytical * r2d) % 360 + 360) % 360).toFixed(4) + '°');
console.log('R from scene graph: 180.2497°');

// If R_analytical matches, then:
// geometric perihelion in bary frame = geomPeriWorld - R_analytical
// = offsetWorldAngle + π - R_analytical
// = offsetWorldAngle + π - totalYrotIncludingEP2 - π/2
// = offsetWorldAngle + π/2 - totalYrotIncludingEP2

// Required perihelionPhaseJ2000 = geomPeriBary
// formulaWithoutOffset = -correctionSun*d2r - 2π*(startmodelJD - 2451547.042)/yearDays
// perihelionPhaseOffset = geomPeriBary - formulaWithoutOffset

// Let's compute everything
const formulaWithoutOffset = -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - 2451547.042) / C.meanSolarYearDays;
console.log('\nformulaWithoutOffset:', (formulaWithoutOffset * r2d).toFixed(4) + '°');

const geomPeriBary = geomPeriWorld - R_analytical;
console.log('geomPeriBary:', (geomPeriBary * r2d).toFixed(4) + '°');

let derivedOffset = (geomPeriBary - formulaWithoutOffset) * r2d;
while (derivedOffset > 180) derivedOffset -= 360;
while (derivedOffset < -180) derivedOffset += 360;
console.log('Derived offset:', derivedOffset.toFixed(4) + '°');
console.log('Scene graph derived: -0.7941°');
