// FQ-7-SUN — the instrument-owned Sun accuracy metric (registry keys
// frameworkSunVsJplRmsArcsec / meeusCh25SunVsJplRmsArcsec).
//
// Until this landing both keys were hand-recorded (E4/E5 session
// measurements, leading-nutation bridge, Sun-only). This instrument
// DEFINES the metric reproducibly:
//   window   the modern all-phase window 1970–2049 (the Moon gate's
//            window), taken from the 1,600-epoch Sun cache;
//   truth    JPL apparent ecliptic longitude minus the FULL leading
//            nutation family (−17.20 sinΩ, +0.21 sin2Ω, −1.32 sin2lE,
//            −0.23 sin(2F+2Ω)) — the frame-correct bridge to a
//            MEAN-of-date Sun;
//   value    sd of (Sun − truth) in arcsec (mean removed — the constant
//            is the anchor convention, attributed elsewhere).
// Two Suns on the same instrument: the certified chain (framework Sun +
// planetary completion) and the bare Meeus Ch. 25 finder form.
//
// Usage: node tools/explore/fq7s-sun-registry-metric.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const SG = require('./tools/lib/scene-graph.js');
const DT = require('./tools/lib/deep-time.js');
const TL = require('./tools/lib/constants.js');
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
const { createSunPlanetaryCompletion } = require('@essrt/physics/eclipse/sun-planetary-completion');
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const model = createModel();
const D2R = Math.PI / 180, AS = 3600, J2000 = 2451545.0;
const NU = C.physicalConstants.nutationLeadingTermsArcsec;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;

// the bare Meeus Ch. 25 finder (e3b-native-sun baseDeps pattern, no frameworkSun)
const MS = SG._moonSeriesForProbe();
const AR = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8'));
const BD = AR.bodyDiametersKm;
const meeus = createEclipseFinders({
  moonLonDegAt: (jd) => MS.truncatedLonDeg(jd),
  moonBetaDegAt: (jd) => MS.truncatedBetaDeg(jd),
  moonDistanceKmAt: (jd) => MS.truncatedDistanceKm(jd),
  deltaTSecondsAt: (jd) => DT.frameworkDeltaT(jd),
  getSynodicMonthDays: () => TL.moonSynodicMonth,
  getSunDistanceKm: () => TL.currentAUDistance,
  constants: {
    rEarthMetres: (BD.earth / 2) * 1000,
    moonDiameterKm: BD.moon,
    sunDiameterKm: BD.sun,
    j2000JD: TL.j2000JD,
    julianCenturyDays: TL.julianCenturyDays,
  },
});

// the certified completion, wired as model.js does
const H = C.foundational.holisticyearLength;
const meanSolarYearDays = Math.round(C.foundational.inputmeanlengthsolaryearindays * (H / 8)) / (H / 8);
const embWobbleArcsec = (C.moonReference.moonDistance / (C.physicalConstants.MASS_RATIO_EARTH_MOON + 1) / C.physicalConstants.currentAUDistance) * (648000 / Math.PI);
const degPerCy = (cpd) => 360 * 36525 * cpd;
const carrierRatesDegPerCy = {
  planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => k ? degPerCy(1 / C.planetOrbitalElements[k].solarYearInput) : degPerCy(1 / meanSolarYearDays)),
  moonElongation: degPerCy(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
};
const { sunPlanetaryCompletionDeg } = createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy });

const cache = JSON.parse(readFileSync(HERE + 'd2-sun-jpl-cache.local.json', 'utf8'));
const JD_LO = J2000 + (1970 - 2000) * 365.25, JD_HI = J2000 + (2049 - 2000) * 365.25;
const rC = [], rM = [], rMc = [];
// Plan 06 R1 — THE CLOCK: the cache instants are TT (Horizons ephemeris
// time). The former bridge added ΔT_start and let the finders apply the
// model ΔT again, so the comparison drifted with the model's ΔT extrapolation
// across the window; a Sun whose year carried NO secular drift (the era
// clock's) happened to cancel most of that trend and read 0.79″ where the
// physical year read 1.29″ — a cancellation, not a fit quality. Evaluate
// both Suns at the UT whose model-TT is the cache instant (fixed point on the
// model's ΔT), so the model ΔT drops out of the comparison.
const utForTT = (jdTT) => { let ut = jdTT - model.eclipse.deltaTSecondsAtJD(jdTT) / 86400; ut = jdTT - model.eclipse.deltaTSecondsAtJD(ut) / 86400; return jdTT - model.eclipse.deltaTSecondsAtJD(ut) / 86400; };
for (const [jd, jplLon] of cache.rows) {
  if (jd < JD_LO || jd > JD_HI) continue;
  const jb = utForTT(jd);
  const T = (jd - J2000) / 36525;
  const om = (NU.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
  const Dm = (297.8501921 + 445267.1114034 * T) * D2R;
  const F = (93.2720950 + 483202.0175233 * T) * D2R;
  const dPsi = (NU.psiOmega * Math.sin(om) + 0.2062 * Math.sin(2 * om) - 1.3187 * Math.sin(2 * F - 2 * Dm + 2 * om) - 0.2274 * Math.sin(2 * F + 2 * om)) / 3600;
  const truth = jplLon - dPsi;
  rC.push(wrap(model.eclipse.sunLonDegAtJD(jb) - sunPlanetaryCompletionDeg(T) - truth) * AS);
  rM.push(wrap(meeus.sunLonDegAt(jb) - truth) * AS);
  rMc.push(wrap(meeus.sunLonDegAt(jb) - sunPlanetaryCompletionDeg(T) - truth) * AS);   // the Meeus BASIS, same derived completion (the registry's reference meaning)
}
const sd = (v) => { const m = v.reduce((a, q) => a + q, 0) / v.length; return Math.sqrt(v.reduce((a, q) => a + (q - m) ** 2, 0) / v.length); };
console.log(`modern window 1970–2049, n ${rC.length}, full-nutation bridge, cache instants as TT (R1 clock fix), mean removed:`);
console.log(`  frameworkSunVsJplRmsArcsec  ${sd(rC).toFixed(2)}″   (certified chain: framework Sun + completion)`);
console.log(`  meeusCh25SunVsJplRmsArcsec  ${sd(rMc).toFixed(2)}″   (Meeus Ch. 25 basis + the same derived completion — the registry's reference meaning)`);
console.log(`  (bare Meeus Ch. 25, no completion: ${sd(rM).toFixed(2)}″)`);
