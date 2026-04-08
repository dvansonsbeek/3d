// ═══════════════════════════════════════════════════════════════
// PATH 2 FEASIBILITY CHECK
//
// Two questions before committing to free phase angles:
//
// (Q1) Is there an "approximate balanced year" within 8H where the
//      JPL-best phase configuration is most closely approached?
//      The configuration is a generic 7-D point on the phase torus
//      that the system's 1-D trajectory generally won't hit exactly.
//      We measure the closest approach in two metrics:
//        - max per-planet phase distance to ϖ_ICRF(t) (sup-norm)
//        - sum of squared phase distances (L2-norm)
//      and report the year where each is minimized.
//
// (Q2) Does vector balance hold continuously under the JPL-best
//      phase configuration with rigid shared rotation at -H/5?
//      We re-use the simulator math: |V(t)| / Σ|L sin i| over
//      ±200 kyr around J2000.
//
// We test the best 3 candidates from preset-anchor-search.js View B
// (combined score) so we see how the answers depend on which
// preset we pick.
//
// Usage: node tools/explore/path2-feasibility-check.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;
const BY = C.balancedYear;

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// Build per-planet ICRF data
const genPrecRate = 1 / (H / 13);
const planetIcrf = {};
for (const k of PLANETS) {
  const p = C.planets[k];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  planetIcrf[k] = {
    rate: 360 / icrfPeriod,    // deg/yr (signed)
    periJ2000: p.longitudePerihelion,
  };
}

// Load survivors
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'jpl-feasible-presets.json'), 'utf8'));

// Pick best 3 by combined (trend + structural distance) score
const CONFIG1 = {
  mercury: { d: 21, antiPhase: false }, venus: { d: 34, antiPhase: false },
  mars: { d: 5, antiPhase: false }, jupiter: { d: 5, antiPhase: false },
  saturn: { d: 3, antiPhase: true }, uranus: { d: 21, antiPhase: false },
  neptune: { d: 34, antiPhase: false },
};
function structDist(s) {
  let n = 0;
  for (const k of PLANETS) {
    if (s.config[k].d !== CONFIG1[k].d) n++;
    if (s.config[k].antiPhase !== CONFIG1[k].antiPhase) n++;
  }
  return n;
}
const ALPHA = 5;
const ranked = data.survivors
  .map(s => ({ ...s, dist: structDist(s) }))
  .sort((a, b) => (a.total_trend_err_arcsec + ALPHA * a.dist) - (b.total_trend_err_arcsec + ALPHA * b.dist));

const TEST = [ranked[0], ranked[1], ranked[2]];

// ─── Q1: closest-approach year for each candidate ───
function phaseAt(year, key) {
  return ((planetIcrf[key].periJ2000 + planetIcrf[key].rate * (year - 2000)) % 360 + 360) % 360;
}
function angDiff(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function closestApproach(survivor) {
  // For an "anti-phase" planet, the extremum is at ϖ = phase ± 180° (cosine = -1).
  // To put every planet at its extremum simultaneously, we want
  // ϖ_i(t) = phase_i (cos = +1) OR phase_i + 180° (cos = -1).
  // For the alignment metric, we use whichever target is closer.
  const targets = {};
  for (const k of PLANETS) targets[k] = survivor.best_phases[k].phase_deg;

  let bestL2 = Infinity, bestL2year = 0, bestL2dists = null;
  let bestSup = Infinity, bestSupYear = 0, bestSupDists = null;

  // Sweep one full 8H period in 100-yr steps (≈ 27,000 samples — fast)
  for (let year = BY; year <= BY + 8 * H; year += 100) {
    let sumSq = 0, supVal = 0;
    const dists = {};
    for (const k of PLANETS) {
      const p = phaseAt(year, k);
      const t = targets[k];
      // Two extremum options: t (cos=+1) or t+180 (cos=-1). Take the closer.
      const d1 = Math.abs(angDiff(p, t));
      const d2 = Math.abs(angDiff(p, t + 180));
      const d = Math.min(d1, d2);
      dists[k] = d;
      sumSq += d * d;
      if (d > supVal) supVal = d;
    }
    const l2 = Math.sqrt(sumSq / PLANETS.length);
    if (l2 < bestL2) { bestL2 = l2; bestL2year = year; bestL2dists = { ...dists }; }
    if (supVal < bestSup) { bestSup = supVal; bestSupYear = year; bestSupDists = { ...dists }; }
  }
  return { bestL2, bestL2year, bestL2dists, bestSup, bestSupYear, bestSupDists };
}

// ─── Q2: vector balance over time ───
const earthMean = C.earthInvPlaneInclinationMean;
const earthAmp  = C.earthInvPlaneInclinationAmplitude;
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthPeriLongJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const earthOmegaJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthIcrfRate = 360 / (H / 3);
const earthL = C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2));

function planetL(key) {
  const a = C.derived[key].orbitDistance;
  const e = C.eccJ2000[key];
  return C.massFraction[key] * Math.sqrt(a * (1 - e * e));
}

function inclAt(survivor, key, year) {
  if (key === 'earth') {
    const peri = earthPeriLongJ2000 + earthIcrfRate * (year - 2000);
    return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
  }
  const cfg = survivor.config[key];
  const bp = survivor.best_phases[key];
  const sign = cfg.antiPhase ? -1 : 1;
  const peri = planetIcrf[key].periJ2000 + planetIcrf[key].rate * (year - 2000);
  return bp.mean_deg + sign * bp.amp_deg * Math.cos((peri - bp.phase_deg) * DEG2RAD);
}

function omegaAt(key, year) {
  const om0 = key === 'earth' ? earthOmegaJ2000 : C.planets[key].ascendingNodeInvPlane;
  return om0 + sharedRate * (year - 2000);
}

function vectorResidual(survivor, year) {
  let Vx = 0, Vy = 0, sumLsi = 0;
  for (const k of ALL) {
    const i = inclAt(survivor, k, year) * DEG2RAD;
    const om = omegaAt(k, year) * DEG2RAD;
    const L = k === 'earth' ? earthL : planetL(k);
    const Lsi = L * Math.sin(i);
    Vx += Lsi * Math.cos(om);
    Vy += Lsi * Math.sin(om);
    sumLsi += Math.abs(Lsi);
  }
  return Math.sqrt(Vx * Vx + Vy * Vy) / sumLsi;
}

function vectorDriftSpan(survivor) {
  let mx = 0, mn = Infinity, j2k = 0;
  for (let year = 2000 - 200000; year <= 2000 + 200000; year += 1000) {
    const r = vectorResidual(survivor, year);
    if (r > mx) mx = r;
    if (r < mn) mn = r;
    if (year === 2000) j2k = r;
  }
  return { max: mx, min: mn, j2000: j2k };
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PATH 2 FEASIBILITY CHECK');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Testing top 3 candidates by combined (trend + Δstruct) score:');
console.log('');

for (let i = 0; i < TEST.length; i++) {
  const s = TEST[i];
  const dStr = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase?'A':'i'}`).join(' ');
  console.log(`─── Candidate ${i+1}: scenario ${s.scenario}, totErr ${s.total_trend_err_arcsec}″/cy, Δ${s.dist}/14 ───`);
  console.log(`  Config: ${dStr}`);
  console.log('');

  // Q1: closest approach
  const ca = closestApproach(s);
  console.log('  (Q1) Closest approach to a "synchronized extremum" within 8H:');
  console.log(`    L2 metric: ${ca.bestL2.toFixed(2)}° rms  at year ${Math.round(ca.bestL2year).toLocaleString()}`);
  console.log(`    sup metric: ${ca.bestSup.toFixed(2)}° max  at year ${Math.round(ca.bestSupYear).toLocaleString()}`);
  console.log(`    Per-planet distances at L2-best year:`);
  const planetsForCol = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
  console.log('      ' + planetsForCol.map(k => k.slice(0,2)).join('  '));
  console.log('      ' + planetsForCol.map(k => ca.bestL2dists[k].toFixed(0).padStart(3) + '°').join(' '));
  console.log('');

  // Q2: vector balance over time
  const vb = vectorDriftSpan(s);
  console.log('  (Q2) Vector balance over ±200 kyr (rigid rotation at −H/5):');
  console.log(`    J2000:  ${(vb.j2000 * 100).toFixed(4)} %`);
  console.log(`    min:    ${(vb.min   * 100).toFixed(4)} %`);
  console.log(`    max:    ${(vb.max   * 100).toFixed(4)} %`);
  const ratio = vb.max / vb.j2000;
  if (ratio < 1.5) {
    console.log(`    → drift: ${ratio.toFixed(1)}× J2000 — vector balance held`);
  } else if (ratio < 5) {
    console.log(`    → drift: ${ratio.toFixed(1)}× J2000 — modest`);
  } else {
    console.log(`    → drift: ${ratio.toFixed(1)}× J2000 — large (rigid model insufficient)`);
  }
  console.log('');
}

// ─── Reference: same Q2 for current Config #1 to anchor the comparison ───
console.log('─── REFERENCE: current model (Config #1, current phases) ───');
const ref = {
  config: CONFIG1,
  best_phases: {
    mercury:  { phase_deg:  99.52, mean_deg: 5.9912, amp_deg: PSI / (21 * Math.sqrt(C.massFraction.mercury)) },
    venus:    { phase_deg:  79.82, mean_deg: 2.1163, amp_deg: PSI / (34 * Math.sqrt(C.massFraction.venus)) },
    mars:     { phase_deg:  96.95, mean_deg: 2.2254, amp_deg: PSI / ( 5 * Math.sqrt(C.massFraction.mars)) },
    jupiter:  { phase_deg: 291.18, mean_deg: 0.3196, amp_deg: PSI / ( 5 * Math.sqrt(C.massFraction.jupiter)) },
    saturn:   { phase_deg: 120.38, mean_deg: 0.9826, amp_deg: PSI / ( 3 * Math.sqrt(C.massFraction.saturn)) },
    uranus:   { phase_deg:  21.33, mean_deg: 1.0151, amp_deg: PSI / (21 * Math.sqrt(C.massFraction.uranus)) },
    neptune:  { phase_deg: 354.04, mean_deg: 0.7271, amp_deg: PSI / (34 * Math.sqrt(C.massFraction.neptune)) },
  },
};
const refVB = vectorDriftSpan(ref);
const refCA = closestApproach(ref);
console.log(`  (Q1) Closest approach: L2 ${refCA.bestL2.toFixed(2)}° rms at year ${Math.round(refCA.bestL2year).toLocaleString()}`);
console.log(`  (Q2) Vector balance ±200 kyr: J2000 ${(refVB.j2000 * 100).toFixed(4)} %, max ${(refVB.max * 100).toFixed(4)} %  (${(refVB.max/refVB.j2000).toFixed(1)}×)`);
console.log('');
