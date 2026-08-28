#!/usr/bin/env node
/**
 * PERIHELION-PROJECTION CLOSURE GATE (plan IP-mercury-anomaly-projection, P1 / T2)
 * ==================================================================================
 *
 * The Earth-frame perihelion rate the model measures for every planet (right
 * ascension in the scene's equatorial frame — the export's '<Planet> Perihelion
 * ICRF' column, reproduced at J2000 by the shipped predict basis) must equal
 * the ecliptic advance PROJECTED into that frame plus the obliquity-rate term:
 *
 *   rate_RA  =  rate_ecl · dα/dλ(λ_m, ε)  +  ∂α/∂ε(λ_m, ε) · ε̇  +  κ
 *
 *   dα/dλ = cos ε / (cos²λ + sin²λ cos²ε)            (β = 0)
 *   ∂α/∂ε = −sin λ cos λ sin ε / (cos²λ + sin²λ cos²ε)
 *   λ_m   = the scene marker's longitude = IAU λ + angleCorrection
 *   κ     = the small of-date coupling (Mercury +0.63 ″/cy; measured, see doc 13 §1.8)
 *
 * Measured on the Step-3 export (Node scene mirror, snapshot mode): Mercury
 * 531.44 × 1.08175 + 4.31 + 0.63 = 579.9 vs 579.87 exported; the same closure
 * holds for all seven planets to < 1 ″/cy. This gate pins that decomposition
 * against the shipped predict arrays at 1900/2000/2100 so the "Mercury anomaly
 * = the equatorial projection of the 531.44 ″/cy advance" statement can never
 * drift silently from what the model actually computes. Tolerance 1.0 ″/cy per
 * planet-epoch (the measured closure residuals are ≤ 0.7).
 *
 *   node tools/verify/perihelion-projection-closure.js      # exit 1 on any breach
 */
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const C = require(path.join(ROOT, 'tools', 'lib', 'constants.js'));
const OE = require(path.join(ROOT, 'tools', 'lib', 'orbital-engine.js'));

const TOL = 1.0;                       // ″/cy
const EPOCHS = [1900, 2000, 2100];
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const D2R = Math.PI / 180;

const raSlope = (lam, eps) => Math.cos(eps) / (Math.cos(lam) ** 2 + Math.sin(lam) ** 2 * Math.cos(eps) ** 2);
const dAlphaDeps = (lam, eps) => -Math.sin(lam) * Math.cos(lam) * Math.sin(eps) / (Math.cos(lam) ** 2 + Math.sin(lam) ** 2 * Math.cos(eps) ** 2);

// The marker's longitude of date at `year`: IAU λ + angleCorrection, advanced at the
// ecliptic rate from J2000 (the same linear motion the scene chain applies).
function markerLongitudeRad(p, year) {
  const P = C.planets[p];
  const rateDegPerYr = 360 / P.perihelionEclipticYears;
  return (P.longitudePerihelion + P.angleCorrection + rateDegPerYr * (year - 2000)) * D2R;
}

let failures = 0;
console.log('perihelion-projection closure — Earth-frame rate ≡ ecliptic advance × dα/dλ + ∂α/∂ε·ε̇ (+κ)');
console.log('  planet    epoch   measured     projected   obliq-term   residual');
for (const p of PLANETS) {
  const eclRate = 1296000 / C.planets[p].perihelionEclipticYears * 100;
  for (const y of EPOCHS) {
    const eps = OE.computeObliquityEarth(y) * D2R;
    const epsRate = (OE.computeObliquityEarth(y + 50) - OE.computeObliquityEarth(y - 50)) * 3600;   // ″/cy
    const lam = markerLongitudeRad(p, y);
    const measured = eclRate + OE.predictPrecessionFluctuation(y, p);                 // the shipped Earth-frame rate
    const projected = eclRate * raSlope(lam, eps);
    const obliqTerm = dAlphaDeps(lam, eps) * epsRate;
    const kappa = measured - projected - obliqTerm;
    const ok = Math.abs(kappa) <= TOL;
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${p.padEnd(8)} ${y}  ${measured.toFixed(2).padStart(10)}  ${projected.toFixed(2).padStart(10)}  ${obliqTerm.toFixed(2).padStart(10)}  ${kappa.toFixed(2).padStart(8)}`);
  }
}
if (failures) {
  console.error(`FAIL — ${failures} planet-epoch(s) breach the ${TOL} ″/cy closure; the decomposition no longer describes the shipped Earth-frame rate.`);
  process.exit(1);
}
console.log('PASS — the Earth-frame perihelion rates are the equatorial projection of the ecliptic advances (+ the obliquity-rate term) for all seven planets.');
